// Modelo simplificado de la circulación de una persona adulta (~70 kg). Pura: sin Three.js ni DOM.
//
// Gasto cardíaco:    Q = FC · VS                          (lo que bombea el ventrículo izquierdo, L/min)
// Volumen sistólico: VS = VFD − VFS                       (el ventrículo se llena hasta el VFD y se vacía hasta el VFS)
// Válvula con fuga:  llega al cuerpo = Q · (1 − FR)       (FR: fracción regurgitante, lo que vuelve a la aurícula)
// Tabique con paso:  al cuerpo Qs = Q · (1 − f), a los pulmones Qp = Q   (f: parte del latido que cruza el agujero, de izquierda a derecha)
// O₂ que se entrega: DO₂ = Qs · CaO₂,  CaO₂ = 1,34 · Hb · SaO₂      (Fick: VO₂ = Qs · (CaO₂ − CvO₂))
// Extracción:        E = VO₂ / DO₂, hasta un máximo EXTRACCION_MAXIMA; sat. venosa SvO₂ = SaO₂ · (1 − E)
// Mezcla de la sangre venosa: τ = volumen de sangre / Qs; la SvO₂ del cuerpo sigue a su valor de equilibrio con esa demora.

export type Actividad = 'reposo' | 'caminar' | 'correr'
export type Defecto = 'ninguno' | 'valvula' | 'tabique'

export interface Config {
  /** Latidos por minuto. */
  frecuencia: number
  /** Volumen sistólico: mL que expulsa el ventrículo en cada latido. */
  volumen: number
  actividad: Actividad
  defecto: Defecto
  /** Fracción regurgitante (válvula) o parte del latido que pasa por el agujero (tabique), de 0 a 1. */
  gravedad: number
}

export const CONFIG_INICIAL: Config = { frecuencia: 70, volumen: 70, actividad: 'reposo', defecto: 'ninguno', gravedad: 0.4 }
/** Rangos de los deslizadores: con 200 /min y 120 mL el gasto llega a 24 L/min, el máximo de una persona joven (20–25 L/min). */
export const LIMITES = { frecuencia: [40, 200], volumen: [40, 120], gravedad: [0.2, 0.7] } as const

/** O₂ que consume el cuerpo, en mL/min: ≈ 1, 3 y 9 METs de una persona de 70 kg (1 MET ≈ 3,5 mL/kg/min; Compendium 2024). */
export const ACTIVIDADES: Record<Actividad, { nombre: string; vo2: number }> = {
  reposo: { nombre: 'Reposo', vo2: 250 },
  caminar: { nombre: 'Caminar', vo2: 750 },
  correr: { nombre: 'Correr', vo2: 2200 },
}

/** Hemoglobina (g/L) y mL de O₂ por g de hemoglobina: con SaO₂ de 98 % son ≈ 197 mL de O₂ por litro de sangre arterial. */
const HEMOGLOBINA = 150
const O2_POR_HB = 1.34
/** Saturación de la sangre que sale de los pulmones (normal: 96–100 %). */
export const SAO2 = 0.98
export const CAO2 = O2_POR_HB * HEMOGLOBINA * SAO2
/** Parte del O₂ de la sangre que el cuerpo puede sacar como máximo: en el pico del esfuerzo la sangre vuelve con ≈ 22 mL/L de los ≈ 200. */
export const EXTRACCION_MAXIMA = 0.89
/** Litros de sangre del cuerpo. */
export const VOLUMEN_SANGRE = 5
/** Volumen que queda en el ventrículo al terminar de vaciarse (mL); el VFD es VFS + VS. */
export const VFS = 50
/** Cuántos segundos del cuerpo pasan por cada segundo real (así los cambios de la sangre se ven en segundos y no en minutos). */
export const ACELERACION = 6

/** Duración de la sístole ventricular (s): 0,3 s a 75 /min y se acorta menos que el ciclo (ajuste propio: 0,3 · √(RR / 0,8 s)). */
export const sistole = (fc: number) => 0.3 * Math.sqrt(60 / fc / 0.8)

/** Frecuencia y volumen típicos para una actividad, por interpolación entre el reposo y el esfuerzo máximo (ajuste: valores centrales de la fuente). */
const GASTO_REPOSO = (CONFIG_INICIAL.frecuencia * CONFIG_INICIAL.volumen) / 1000
const VO2_MAXIMO = 3250
const GASTO_MAXIMO = 22.5
const FC_MAXIMA = 190
export function tipico(a: Actividad): { frecuencia: number; volumen: number } {
  const fraccion = (ACTIVIDADES[a].vo2 - ACTIVIDADES.reposo.vo2) / (VO2_MAXIMO - ACTIVIDADES.reposo.vo2)
  const gasto = GASTO_REPOSO + (GASTO_MAXIMO - GASTO_REPOSO) * fraccion
  const frecuencia = Math.round(CONFIG_INICIAL.frecuencia + (FC_MAXIMA - CONFIG_INICIAL.frecuencia) * fraccion)
  return { frecuencia, volumen: Math.round((gasto * 1000) / frecuencia) }
}

export interface Estado {
  /** Segundos del cuerpo desde el inicio. */
  t: number
  /** Saturación de la sangre que vuelve de los tejidos (0 a 1). */
  svo2: number
}

export interface Derivados {
  /** Lo que bombea el ventrículo izquierdo (L/min), lo que llega al cuerpo (Qs) y lo que pasa por los pulmones (Qp). */
  bombea: number
  cuerpo: number
  pulmones: number
  /** Relación entre el flujo de los pulmones y el del cuerpo (1 = sano). */
  qpqs: number
  /** mL de cada latido que vuelven a la aurícula (válvula) o cruzan el agujero (tabique). */
  regurgitado: number
  cortocircuito: number
  /** VFD, VFS y fracción de eyección del ventrículo izquierdo. */
  vfd: number
  fe: number
  /** O₂ que pide el cuerpo, y el máximo que puede entregarle esta sangre (mL/min). */
  vo2: number
  entrega: number
  /** Parte del O₂ de la sangre que el cuerpo tendría que sacar para cubrir lo que pide (puede pasar de 1). */
  extraccion: number
  /** La sangre que llega alcanza para lo que pide el cuerpo. */
  alcanza: boolean
  /** Sangre mínima que tiene que llegar al cuerpo (L/min) y lo que tendría que bombear el ventrículo con este defecto. */
  necesario: number
  necesarioBombeo: number
  /** Saturación venosa de equilibrio y saturación de la sangre que va a los pulmones (sube si el agujero le suma sangre oxigenada). */
  svoMeta: number
  /** Saturación de la sangre que sale hacia el cuerpo: con el paso de izquierda a derecha no cambia (la mezcla es del lado derecho). */
  satArterial: number
  satPulmonar: number
  sistole: number
}

export function derivados(c: Config, e: Estado): Derivados {
  const rf = c.defecto === 'valvula' ? c.gravedad : 0
  const f = c.defecto === 'tabique' ? c.gravedad : 0
  const bombea = (c.frecuencia * c.volumen) / 1000
  const cuerpo = bombea * (1 - rf - f)
  const pulmones = bombea * (1 - rf)
  const vo2 = ACTIVIDADES[c.actividad].vo2
  const entrega = cuerpo * CAO2 * EXTRACCION_MAXIMA
  const extraccion = vo2 / (cuerpo * CAO2)
  const necesario = vo2 / (CAO2 * EXTRACCION_MAXIMA)
  const vfd = VFS + c.volumen
  return {
    bombea, cuerpo, pulmones, qpqs: pulmones / cuerpo,
    regurgitado: c.volumen * rf, cortocircuito: c.volumen * f,
    vfd, fe: c.volumen / vfd,
    vo2, entrega, extraccion, alcanza: entrega >= vo2,
    necesario, necesarioBombeo: necesario / (1 - rf - f),
    svoMeta: SAO2 * (1 - Math.min(extraccion, EXTRACCION_MAXIMA)),
    satArterial: SAO2,
    // Lo que llega a los pulmones es la sangre venosa del cuerpo más la oxigenada que cruzó el agujero.
    satPulmonar: (cuerpo * e.svo2 + bombea * f * SAO2) / pulmones,
    sistole: sistole(c.frecuencia),
  }
}

/** Estado en equilibrio para una config. */
export function estadoEn(c: Config): Estado {
  return { t: 0, svo2: derivados(c, { t: 0, svo2: 0 }).svoMeta }
}

/** Avanza `dt` segundos del cuerpo. Pura: devuelve un estado nuevo. */
export function paso(e: Estado, c: Config, dt: number): Estado {
  const d = derivados(c, e)
  const tau = (60 * VOLUMEN_SANGRE) / Math.max(d.cuerpo, 0.5)
  return { t: e.t + dt, svo2: d.svoMeta + (e.svo2 - d.svoMeta) * Math.exp(-dt / tau) }
}

/** Cómo se llama el grado de la fuga de la válvula (grados por fracción regurgitante, Wikipedia). */
export function gradoFuga(rf: number): string {
  return rf < 0.2 ? 'leve' : rf < 0.4 ? 'moderada' : rf <= 0.6 ? 'moderada a grave' : 'grave'
}

/** Cómo se llama el tamaño del agujero según Qp:Qs (< 1,5 pequeño, 1,5 a 3 moderado, > 3 grande). */
export function tamanoAgujero(qpqs: number): string {
  return qpqs < 1.5 ? 'pequeño' : qpqs <= 3 ? 'moderado' : 'grande'
}

/** Volumen del ventrículo izquierdo (mL) en una fase del latido (0 a 1, 0 = empieza la sístole). Solo para el dibujo y el gráfico. */
export function volumenVentriculo(fase: number, fc: number, vs: number): number {
  const fs = (sistole(fc) * fc) / 60
  const vfd = VFS + vs
  if (fase < fs) return vfd - vs * Math.sin(((fase / fs) * Math.PI) / 2)
  // Diástole: llenado rápido al principio y una última contracción de la aurícula (último 20 %).
  const x = (fase - fs) / (1 - fs)
  const llenado = x < 0.8 ? 0.85 * (1 - (1 - x / 0.8) ** 2) : 0.85 + (0.15 * (x - 0.8)) / 0.2
  return VFS + vs * llenado
}
