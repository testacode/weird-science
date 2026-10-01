// Modelo simplificado de la ventilación de una persona adulta (~70 kg). Pura: sin Three.js ni DOM.
//
// Ventilación:       VE = f · VT                   (aire por minuto, L/min)
//                    VA = f · (VT − VD)            (lo que llega a los alvéolos; el espacio muerto VD no intercambia gases)
// Aire que entra:    PIO₂ = 0,2093 · (Pb − 47)     (21 % de O₂; 47 mmHg es el vapor de agua de las vías aéreas)
// Presión del aire:  Pb(h) = 760 · (1 − 2,25577e-5 · h)^5,25588 mmHg      (atmósfera estándar)
// O₂ alveolar:       V · dPAO₂/dt = VA · (PIO₂ − PAO₂) − 0,863 · VO₂ · (PAO₂ − PV) / (98 − PV)
//                    (lavado del alvéolo menos lo que absorbe la sangre; la absorción es proporcional al gradiente con la
//                    sangre venosa: se llega a 98 mmHg en reposo y se frena cuando el alvéolo se acerca a PV, sin piso duro)
// CO₂ de la sangre:  C · dPaCO₂/dt = VCO₂ − VA · PaCO₂ / 0,863                (reservorio del cuerpo menos lo que se exhala)
// O₂ de la sangre:   dPaO₂/dt = (PAO₂ − PaO₂) / τ                             (la sangre tarda en enterarse)
// Saturación:        SpO₂ = x^n / (1 + x^n), con x = PaO₂ / P50              (curva de Hill de la hemoglobina)
//
// Con VA = 0 (aguantar la respiración) no hay estado estacionario: se integra el balance de masa y listo.

export type Actividad = 'reposo' | 'caminar' | 'correr'

export interface Config {
  /** Respiraciones por minuto. */
  frecuencia: number
  /** Volumen corriente: litros por respiración. */
  volumen: number
  actividad: Actividad
  /** Altura sobre el nivel del mar, en metros. */
  altura: number
  aguanta: boolean
}

export const CONFIG_INICIAL: Config = { frecuencia: 12, volumen: 0.5, actividad: 'reposo', altura: 0, aguanta: false }
export const LIMITES = { frecuencia: [6, 50], volumen: [0.25, 2.5] } as const

/** Alturas del control: llano, sierra y montaña (m). */
export const ALTURAS = { llano: 0, sierra: 2000, montana: 4000 } as const

/** O₂ que consume el cuerpo, en mL/min: ≈ 1, 3 y 9 METs de una persona de 70 kg (1 MET ≈ 3,5 mL/kg/min; Compendium 2024).
 *  Caminar es un paso tranquilo: a paso moderado (4,5–5,5 km/h) el Compendium da 3,8 METs. */
export const ACTIVIDADES: Record<Actividad, { nombre: string; vo2: number }> = {
  reposo: { nombre: 'Reposo', vo2: 250 },
  caminar: { nombre: 'Caminar', vo2: 750 },
  correr: { nombre: 'Correr', vo2: 2200 },
}

/** Espacio muerto anatómico (L): tráquea y bronquios, el aire que ahí se queda no llega a los alvéolos. */
export const ESPACIO_MUERTO = 0.15
/** Capacidad residual funcional (L): el aire que queda en los pulmones al terminar de exhalar. */
const CRF = 2.5
/** Aire extra (L) que se toma antes de aguantar la respiración: los pulmones quedan casi llenos (≈ 5,5 L en total). */
const INSPIRACION_LLENA = 3
/** Convierte mL de gas (a 0 °C) en mmHg·L a 37 °C. */
const K = 0.863
/** Cociente respiratorio: se produce 0,8 de CO₂ por cada O₂ que se consume. */
const RQ = 0.8
const FIO2 = 0.2093
/** Fracción de CO₂ del aire (≈ 0,04 %). */
export const FICO2 = 0.0004
const VAPOR = 47
/** PO₂ de la sangre venosa a la que la absorción de O₂ se frena (mmHg; ajustada, más baja que los 40 de reposo porque baja con el esfuerzo y la altura). */
const PO2_VENOSA = 25
/** PAO₂ de referencia (mmHg): con ella la sangre absorbe justo el O₂ que el cuerpo pide en reposo. */
const PAO2_REF = 98
/** Presión de O₂ a la que la hemoglobina está al 50 % y pendiente de la curva. */
/** Límites de lo normal: PaCO₂ de 45 mmHg y PAO₂ de 60 mmHg (a partir de ahí la saturación cae rápido). */
const PACO2_LIMITE = 45
const PAO2_MINIMA = 60
const P50 = 26.8
const N_HILL = 2.7
/** mL de CO₂ que el cuerpo guarda por cada mmHg de PaCO₂ (ajustado para que en apnea suba unos 7 mmHg/min). */
const C_CO2 = 30
/** Segundos del cuerpo que tarda la sangre en seguir al O₂ alveolar. */
const TAU_SANGRE = 20
/** PaCO₂ a partir del cual el cerebro obliga a respirar (mmHg, orden de magnitud). */
export const QUIEBRE_CO2 = 50
/** Límites del modelo para PaCO₂ (mmHg): hiperventilar voluntariamente llega a unos 15 y por encima de 80 el modelo ya no vale. */
const CO2_MIN = 15
const CO2_MAX = 80

/** Cuántos segundos del cuerpo pasan por cada segundo real (así los cambios se ven en segundos y no en minutos). */
export const ACELERACION = 6

/** Aire (L/min) que equivale a lo que la sangre absorbe por cada mmHg de PAO₂ sobre PV: el O₂ absorbido es `absorcion · (PAO₂ − PV)`. */
const absorcion = (vo2: number) => (K * vo2) / (PAO2_REF - PO2_VENOSA)

export const presion = (altura: number) => 760 * (1 - 2.25577e-5 * altura) ** 5.25588
export const presionO2 = (altura: number) => FIO2 * (presion(altura) - VAPOR)
export const saturacion = (po2: number) => {
  const x = (Math.max(po2, 0) / P50) ** N_HILL
  return (100 * x) / (1 + x)
}

export interface Estado {
  /** Segundos del cuerpo desde el inicio. */
  t: number
  /** PO₂ alveolar y PCO₂ de la sangre (mmHg). */
  pao2: number
  paco2: number
  /** PO₂ de la sangre arterial (mmHg). */
  sangre: number
}

export interface Derivados {
  /** Aire por minuto y aire que llega a los alvéolos (L/min). */
  ve: number
  va: number
  /** O₂ que pide el cuerpo y CO₂ que produce (mL/min). */
  vo2: number
  vco2: number
  /** PO₂ del aire que entra (mmHg) y presión del aire (mmHg). */
  pio2: number
  presion: number
  spo2: number
  /** Aire (L/min) que hace falta, con la frecuencia actual, para tener CO₂ normal y saturación de 90 % o más. */
  necesario: number
  /** El aire que llega a los alvéolos alcanza para eso. */
  alcanza: boolean
  /** Aire que sale, % de cada gas (`null` mientras se aguanta la respiración). */
  sale: { o2: number; co2: number } | null
}

export function derivados(c: Config, e: Estado): Derivados {
  const ve = c.aguanta ? 0 : c.frecuencia * c.volumen
  const va = c.aguanta ? 0 : c.frecuencia * Math.max(c.volumen - ESPACIO_MUERTO, 0)
  const vo2 = ACTIVIDADES[c.actividad].vo2
  const vco2 = RQ * vo2
  const pb = presion(c.altura)
  const pio2 = presionO2(c.altura)
  // Aire alveolar mínimo: el que mantiene el CO₂ en el límite normal (45 mmHg) y el O₂ alveolar en 60 mmHg (saturación ≈ 90 %).
  const vaNecesario = Math.max((K * vco2) / PACO2_LIMITE, (absorcion(vo2) * (PAO2_MINIMA - PO2_VENOSA)) / Math.max(pio2 - PAO2_MINIMA, 1))
  // Aire mixto que sale: lo del alvéolo (va/ve) mezclado con el del espacio muerto, que sale tal como entró.
  const alveolar = ve > 0 ? va / ve : 0
  const aire = pb - VAPOR
  return {
    ve, va, vo2, vco2, pio2, presion: pb,
    spo2: saturacion(e.sangre),
    necesario: vaNecesario + c.frecuencia * ESPACIO_MUERTO,
    alcanza: va >= vaNecesario,
    sale: ve > 0 ? { o2: 100 * (alveolar * (e.pao2 / aire) + (1 - alveolar) * FIO2), co2: 100 * alveolar * (e.paco2 / aire) } : null,
  }
}

/** Estado en equilibrio para una config (aguantando no hay equilibrio: se parte del de respirar normal). */
export function estadoEn(c: Config): Estado {
  if (c.aguanta) return estadoEn({ ...c, aguanta: false })
  const va = c.frecuencia * Math.max(c.volumen - ESPACIO_MUERTO, 0)
  const { vo2 } = ACTIVIDADES[c.actividad]
  const pao2 = (va * presionO2(c.altura) + absorcion(vo2) * PO2_VENOSA) / (va + absorcion(vo2))
  return { t: 0, pao2, paco2: Math.min(Math.max((K * RQ * vo2) / va, CO2_MIN), CO2_MAX), sangre: pao2 }
}

/** Avanza `dt` segundos del cuerpo. Pura: devuelve un estado nuevo. */
export function paso(e: Estado, c: Config, dt: number): Estado {
  const min = dt / 60
  const va = c.aguanta ? 0 : c.frecuencia * Math.max(c.volumen - ESPACIO_MUERTO, 0)
  const { vo2 } = ACTIVIDADES[c.actividad]
  const vco2 = RQ * vo2
  // Respirando, el alvéolo es la CRF más media respiración; aguantando, se supone que se tomó una buena bocanada antes.
  const volumenAlveolar = CRF + (c.aguanta ? INSPIRACION_LLENA : c.volumen / 2)

  // Con VA = 0 la fórmula sigue andando: el alvéolo solo cede O₂ a la sangre y tiende a PV.
  const g = absorcion(vo2)
  const a = (va + g) / volumenAlveolar
  const meta = (va * presionO2(c.altura) + g * PO2_VENOSA) / (va + g)
  const pao2 = meta + (e.pao2 - meta) * Math.exp(-a * min)

  let paco2: number
  if (va > 0) {
    const a = va / (K * C_CO2)
    const meta = (K * vco2) / va
    paco2 = meta + (e.paco2 - meta) * Math.exp(-a * min)
  } else {
    paco2 = e.paco2 + (vco2 / C_CO2) * min
  }
  paco2 = Math.min(Math.max(paco2, CO2_MIN), CO2_MAX)

  const sangre = pao2 + (e.sangre - pao2) * Math.exp(-dt / TAU_SANGRE)
  return { t: e.t + dt, pao2, paco2, sangre }
}

/** Corre la simulación `segundos` del cuerpo con una config fija (para calcular respuestas de la predicción). */
export function simular(c: Config, segundos: number, desde: Estado): Estado {
  let e = desde
  for (let i = 0; i < Math.round(segundos); i++) {
    e = paso(e, c, 1)
    if (c.aguanta && e.paco2 >= QUIEBRE_CO2) break
  }
  return e
}

/** El cerebro obliga a respirar: aguantar ya no se puede. */
export const quiebra = (e: Estado, c: Config) => c.aguanta && e.paco2 >= QUIEBRE_CO2
