// Modelo de flotación: un cuerpo que se mueve solo en vertical dentro de un líquido quieto.
//
//   Peso      P = m · g
//   Empuje    E = ρ_líquido · V_sumergido · g            (principio de Arquímedes)
//   Dinámica  m · a = E − P − c · v                      (c: roce con el líquido, solo con el cuerpo adentro)
//
// Equilibrio: si ρ_cuerpo < ρ_líquido flota con una fracción sumergida = ρ_cuerpo / ρ_líquido, y esa fracción
// no depende de g ni del tamaño. Si no, se hunde hasta el fondo, que sostiene la diferencia P − E.
// El barquito es un casco de acero hueco: su densidad es la media del conjunto metal + aire (+ agua si se agujerea).
// Unidades del SI: metros, kilos, newtons, segundos.

export const PLANETAS = {
  tierra: { nombre: 'Tierra', lugar: 'la Tierra', g: 9.8 },
  marte: { nombre: 'Marte', lugar: 'Marte', g: 3.71 },
  luna: { nombre: 'Luna', lugar: 'la Luna', g: 1.62 },
} as const
export type Planeta = keyof typeof PLANETAS

export type IdLiquido = 'agua' | 'aceite' | 'alcohol'
export type IdObjeto = 'madera' | 'hielo' | 'plastico' | 'piedra' | 'metal' | 'barco' | 'huevo'

/** Densidades en kg/m³. */
const RHO_AGUA = 1000
const RHO_ACEITE = 920
const RHO_ALCOHOL = 790
const RHO_ACERO = 7850
/** Fracción del volumen del casco que es chapa de acero (el resto es aire): densidad media = 0,08 · 7.850 = 628 kg/m³. */
export const FRAC_ACERO = 0.08

/** Sal disuelta: % en masa. Ajuste lineal de la tabla de densidad de salmuera: ρ ≈ 1.000 + 7,4 · % (0 a 26 %). */
export const SAL_MAX = 26
export const SAL_MAR = 3.5
const K_SAL = 7.4

export interface Config {
  objeto: IdObjeto
  liquido: IdLiquido
  /** % de sal en masa; solo cuenta si el líquido es agua. */
  sal: number
  /** Volumen del objeto en cm³ (en el barco, el volumen exterior del casco). */
  volumen: number
  planeta: Planeta
  agujero: boolean
}

export const CONFIG_INICIAL: Config = { objeto: 'madera', liquido: 'agua', sal: 0, volumen: 200, planeta: 'tierra', agujero: false }
export const VOLUMEN = { min: 80, max: 400, base: 200 }

export interface Objeto {
  id: IdObjeto
  nombre: string
  /** Densidad media en kg/m³. */
  densidad: number
  /** `prisma`: caja o cilindro (el volumen sumergido crece lineal con la profundidad). `elipsoide`: esfera estirada. */
  forma: 'prisma' | 'elipsoide'
  /** Alto / ancho. */
  aspecto: number
  /** Volumen = factor · ancho² · alto (caja 1, cilindro π/4, elipsoide π/6). */
  factor: number
  hueco?: boolean
}

export const OBJETOS: Record<IdObjeto, Objeto> = {
  madera: { id: 'madera', nombre: 'Madera', densidad: 500, forma: 'prisma', aspecto: 1, factor: 1 }, // pino: 350–600 según la especie
  hielo: { id: 'hielo', nombre: 'Hielo', densidad: 917, forma: 'prisma', aspecto: 1, factor: 1 }, // a 0 °C
  plastico: { id: 'plastico', nombre: 'Plástico', densidad: 950, forma: 'prisma', aspecto: 0.4, factor: Math.PI / 4 }, // polietileno (tapita): 940–970
  piedra: { id: 'piedra', nombre: 'Piedra', densidad: 2700, forma: 'elipsoide', aspecto: 0.85, factor: Math.PI / 6 }, // granito: 2.600–2.800
  metal: { id: 'metal', nombre: 'Metal macizo', densidad: RHO_ACERO, forma: 'prisma', aspecto: 0.8, factor: Math.PI / 4 }, // acero
  barco: { id: 'barco', nombre: 'Barquito', densidad: FRAC_ACERO * RHO_ACERO, forma: 'prisma', aspecto: 0.55, factor: 1, hueco: true },
  huevo: { id: 'huevo', nombre: 'Huevo', densidad: 1080, forma: 'elipsoide', aspecto: 1.3, factor: Math.PI / 6 }, // crudo: ~1.030–1.090 según frescura
}
export const ORDEN_OBJETOS: IdObjeto[] = ['madera', 'hielo', 'plastico', 'piedra', 'metal', 'barco', 'huevo']

export function densidadLiquido(c: Pick<Config, 'liquido' | 'sal'>): number {
  if (c.liquido === 'aceite') return RHO_ACEITE
  if (c.liquido === 'alcohol') return RHO_ALCOHOL
  return RHO_AGUA + K_SAL * c.sal
}

/** Líquido con el que arranca la pecera, para el rótulo: dulce, salada, aceite o alcohol. */
export function nombreLiquido(c: Pick<Config, 'liquido' | 'sal'>): string {
  if (c.liquido === 'aceite') return 'Aceite'
  if (c.liquido === 'alcohol') return 'Alcohol'
  return c.sal > 0 ? 'Agua salada' : 'Agua dulce'
}

// --- Pecera (metros) ---
/** Altura del líquido sobre el fondo. */
export const NIVEL = 0.2
/** Altura del borde de la pecera. */
export const ALTO_PECERA = 0.26
/** Con qué altura sobre el nivel se suelta el objeto. */
const ALTURA_SOLTAR = 0.04

// --- Dinámica ---
/** Razón de amortiguación del cuerpo flotando (0,6: un rebote chico y se acomoda). */
const ZETA = 0.6
/** Roce mínimo (1/s) con el cuerpo todo sumergido, donde ya no hay resorte de empuje. */
const ROCE_MIN = 10
/** Área del agujero del barco (m²: 0,8 cm²) y coeficiente de descarga (Torricelli). */
const A_AGUJERO = 0.8e-4
const CD = 0.6
/** Segundos quieto antes de dar el experimento por terminado. */
export const QUIETO_S = 1
/** Tope de tiempo del modelo para una simulación (s). */
export const T_MAX = 90

export interface Dimensiones {
  /** m³ */
  v: number
  ancho: number
  alto: number
  /** kg del cuerpo vacío. */
  masa: number
  /** m³ de aire del casco (donde entra el agua). 0 si es macizo. */
  vCavidad: number
}

export function dimensiones(c: Config): Dimensiones {
  const o = OBJETOS[c.objeto]
  const v = c.volumen * 1e-6
  const ancho = Math.cbrt(v / (o.factor * o.aspecto))
  return { v, ancho, alto: ancho * o.aspecto, masa: o.densidad * v, vCavidad: o.hueco ? (1 - FRAC_ACERO) * v : 0 }
}

export interface Estado {
  /** Altura del centro del objeto sobre el fondo de la pecera (m). */
  y: number
  v: number
  /** Fracción de la cavidad del casco llena de líquido (0 a 1). */
  lleno: number
  /** Segundos del modelo desde que se soltó. */
  t: number
  /** Ya tocó el líquido alguna vez. */
  toco: boolean
  /** Segundos seguidos en reposo. */
  quieto: number
}

export function estadoInicial(c: Config): Estado {
  return { y: NIVEL + ALTURA_SOLTAR + dimensiones(c).alto / 2, v: 0, lleno: 0, t: 0, toco: false, quieto: 0 }
}

/** Al cambiar el tamaño con el objeto en la pecera, se mantiene la altura de su base. */
export function reescalar(antes: Config, despues: Config, e: Estado): Estado {
  const base = Math.max(e.y - dimensiones(antes).alto / 2, 0)
  return { ...e, y: base + dimensiones(despues).alto / 2 }
}

/** Fracción del volumen sumergida cuando la profundidad es `x` (0 a 1) de la altura. */
const sumergida = (o: Objeto, x: number) => (o.forma === 'elipsoide' ? x * x * (3 - 2 * x) : x)

export type Fase = 'aire' | 'sube' | 'flota' | 'hunde' | 'fondo'

export interface Derivados {
  g: number
  masa: number
  peso: number
  empuje: number
  /** Fracción del volumen que está bajo el líquido (0 a 1). */
  sumergido: number
  /** Densidad media del conjunto (con el agua que entró, si hay). */
  rhoObjeto: number
  rhoLiquido: number
  /** Fracción sumergida en equilibrio si flota (ρ_obj/ρ_líq, tope 1). */
  equilibrio: number
  flota: boolean
  fase: Fase
  /** Fuerza del fondo de la pecera cuando el objeto está apoyado. */
  apoyo: number
  /** kg de agua dentro del casco. */
  aguaDentro: number
}

function fuerzas(c: Config, e: Estado) {
  const d = dimensiones(c)
  const o = OBJETOS[c.objeto]
  const g = PLANETAS[c.planeta].g
  const rho = densidadLiquido(c)
  const x = Math.min(Math.max((NIVEL - (e.y - d.alto / 2)) / d.alto, 0), 1)
  const aguaDentro = rho * e.lleno * d.vCavidad
  const masa = d.masa + aguaDentro
  const empuje = rho * d.v * sumergida(o, x) * g
  return { d, o, g, rho, x, aguaDentro, masa, empuje, peso: masa * g }
}

export function derivar(c: Config, e: Estado): Derivados {
  const { d, o, g, rho, x, aguaDentro, masa, empuje, peso } = fuerzas(c, e)
  const rhoObjeto = masa / d.v
  const enFondo = e.y <= d.alto / 2 + 1e-6
  const flota = rhoObjeto < rho
  // Si flota y está todo sumergido, todavía sube: su equilibrio siempre deja una parte afuera.
  const subiendo = x >= 0.999
  const fase: Fase = !e.toco ? 'aire' : flota ? (subiendo ? 'sube' : 'flota') : enFondo ? 'fondo' : 'hunde'
  return {
    g, masa, peso, empuje, rhoObjeto, rhoLiquido: rho, flota, fase, aguaDentro,
    sumergido: sumergida(o, x),
    equilibrio: Math.min(rhoObjeto / rho, 1),
    apoyo: enFondo && !flota ? Math.max(peso - empuje, 0) : 0,
  }
}

/** Avanza `dt` segundos del modelo (semi-implícito; usar pasos de ~1/240 s). */
export function paso(c: Config, e: Estado, dt: number): Estado {
  const { d, o, g, rho, x, masa, empuje, peso } = fuerzas(c, e)
  const anet = (empuje - peso) / masa
  // Roce que lo deja casi crítico al flotar: c/m = 2·ζ·ω con ω² = ρ_líq·g / (ρ_obj·alto); entra con el cuerpo en el líquido.
  const omega = Math.sqrt((rho * g) / ((masa / d.v) * d.alto))
  const roce = Math.max(2 * ZETA * omega, ROCE_MIN) * Math.min(1, 4 * x)
  let v = e.v + (anet - roce * e.v) * dt
  let y = e.y + v * dt
  const piso = d.alto / 2
  const enFondo = y <= piso
  if (enFondo) {
    y = piso
    if (v < 0) v = 0
  }
  const toco = e.toco || x > 0
  // Quieto de verdad: apoyado en el fondo, o flotando en la superficie con peso y empuje equilibrados.
  // Un cuerpo que sube o baja muy despacio a media agua tiene velocidad terminal chica pero no está en reposo.
  const enSuperficie = x < 0.999 && Math.abs(empuje - peso) < 0.02 * peso
  const reposo = toco && Math.abs(v) < 0.003 && (enFondo || enSuperficie)

  // Torricelli: el agujero está en el fondo del casco; entra líquido mientras afuera haya más columna que adentro.
  let lleno = e.lleno
  if (c.agujero && o.hueco && lleno < 1) {
    const cabeza = Math.max(x * d.alto - lleno * d.alto, 0)
    lleno = Math.min(lleno + (CD * A_AGUJERO * Math.sqrt(2 * g * cabeza) * dt) / d.vCavidad, 1)
  }
  return { y, v, lleno, t: e.t + dt, toco, quieto: reposo ? e.quieto + dt : 0 }
}

/** El experimento terminó: quedó en reposo (y, si el casco está agujereado, ya se hundió) o se acabó el tiempo. */
export function terminado(c: Config, e: Estado): boolean {
  if (e.t >= T_MAX) return true
  if (e.quieto < QUIETO_S) return false
  // El casco agujereado se llena de a poco y puede quedar casi equilibrado un rato: termina recién al tocar el fondo.
  return !(c.agujero && OBJETOS[c.objeto].hueco) || derivar(c, e).fase === 'fondo'
}

/** Suelta el objeto y corre el modelo hasta que termina. Es lo que usa la predicción para saber la respuesta. */
export function simular(c: Config, desde: Estado = estadoInicial(c)): { estado: Estado; derivados: Derivados } {
  let e = desde
  while (!terminado(c, e)) e = paso(c, e, 1 / 240)
  return { estado: e, derivados: derivar(c, e) }
}

/** Peso del objeto en la Tierra con el volumen base: sirve para dar la misma escala a las flechas de un objeto. */
export function pesoReferencia(id: IdObjeto): number {
  return OBJETOS[id].densidad * VOLUMEN.base * 1e-6 * PLANETAS.tierra.g
}
