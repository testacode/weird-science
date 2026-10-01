// Modelo simplificado del ciclo del agua en un terrario cerrado. Unidad de agua: mm de lámina
// (el agua que cubriría el piso del terrario). El agua total vale siempre TOTAL: cada flujo mueve
// agua de un reservorio a otro y nunca crea ni destruye. Unidad de tiempo: horas del terrario.
//
// Reservorios:  mar · vapor (aire) · nubes · suelo (con el subsuelo) · río
//
// Temperatura del aire de abajo: T_baja = 15 + 15 · sol  (°C; la lámpara calienta)
// Aire saturado:  cap(T) = CAP_REF · ρs(T) / ρs(20 °C), con ρs de la fórmula de Magnus
//   (a 20 °C el aire saturado lleva 17,3 g de vapor por m³; a 10 °C, 9,4 g/m³)
// Evaporación:    E  = K_E · sol · (cap(T_baja) − vapor) / CAP_REF      (del mar; sin sol no hay)
// Transpiración:  Tr = K_T · plantas · sol · (cap(T_baja) − vapor) / CAP_REF · humedad del suelo
// Condensación:   C  = K_C · max(0, vapor − cap(T_alta))                 (arriba el aire está frío)
//   con montaña el aire sube y se enfría ΔT más (6,5 °C por km de ascenso, aprox.)
// Precipitación:  P  = K_P · max(0, nubes − umbral)                      (las gotas deben juntarse)
// En el suelo:    escorrentía = Cr · lluvia sobre tierra; el resto se infiltra mientras haya lugar
// Retorno:        río → mar y suelo → mar (agua subterránea)

export interface Config {
  /** Intensidad de la lámpara-Sol, de 0 a 1. */
  sol: number
  /** Temperatura del aire en altura, °C. */
  tAlta: number
  /** Cobertura de plantas, de 0 a 1. */
  plantas: number
  montana: boolean
  /** Romper el sistema. */
  solApagado: boolean
  talado: boolean
}

export const CONFIG_INICIAL: Config = { sol: 0.6, tAlta: 8, plantas: 0.6, montana: false, solApagado: false, talado: false }
export const LIMITES = { sol: [0.2, 1], tAlta: [0, 24], plantas: [0, 1] } as const

export const TOTAL = 100
export const CAP_REF = 8
export const S_MAX = 25
export const N_UMBRAL = 1.5
/** Debajo de esta lluvia (mm/h) se considera que dejó de llover. */
export const LLUVIA_MIN = 0.05
const K_E = 10
const K_T = 4
const K_C = 0.5
const K_RE = 0.3
const K_P = 0.25
const K_RIO = 0.2
const K_SUBTERRANEA = 0.03
const T_BASE = 15
const T_SOL = 15
export const DT_MONTANA = 6
const PASO_MAX = 0.25

export type Reservorio = 'mar' | 'vapor' | 'nubes' | 'suelo' | 'rio'
export const RESERVORIOS: Reservorio[] = ['mar', 'vapor', 'nubes', 'suelo', 'rio']

export interface Estado extends Record<Reservorio, number> {
  horas: number
  /** Acumulados desde el reinicio, en mm: lo que llovió y lo que escurrió por la superficie. */
  lluvia: number
  escorrentia: number
}

/** Arranque en frío: sin nubes y con el aire casi saturado (80%) para esa config, así no hay un pico de evaporación al empezar. */
export function estadoInicial(c: Config = CONFIG_INICIAL): Estado {
  const vapor = Math.round(0.8 * capacidad(tBaja(efectiva(c).sol)) * 10) / 10
  return { mar: TOTAL - vapor - 11, vapor, nubes: 0, suelo: 8, rio: 3, horas: 0, lluvia: 0, escorrentia: 0 }
}

export const total = (e: Estado) => RESERVORIOS.reduce((s, r) => s + e[r], 0)

/** Config con las roturas aplicadas: es lo que realmente usa el modelo. */
export const efectiva = (c: Config) => ({ sol: c.solApagado ? 0 : c.sol, plantas: c.talado ? 0 : c.plantas, montana: c.montana, tAlta: c.tAlta })

/** Gramos de vapor por m³ de aire saturado a `t` °C (Magnus): 17,3 a 20 °C, 9,4 a 10 °C. */
export const saturacion = (t: number) => (217 * 6.112 * Math.exp((17.62 * t) / (243.12 + t))) / (t + 273.15)

/** Vapor que puede llevar el aire saturado a la temperatura `t` (°C), en mm de lámina. */
export const capacidad = (t: number) => (CAP_REF * saturacion(t)) / saturacion(20)

export const tBaja = (sol: number) => T_BASE + T_SOL * sol

export interface Flujos {
  tBaja: number
  /** Temperatura a la que se enfría el aire que sube (con montaña, más fría). */
  tArriba: number
  capBaja: number
  capArriba: number
  /** Humedad relativa del aire de abajo, 0 a 1. */
  humedad: number
  /** mm/h */
  evap: number
  trans: number
  cond: number
  reevap: number
  prec: number
  /** Coeficiente de escorrentía: fracción de la lluvia sobre tierra que no se infiltra. */
  cr: number
  /** Fracción de la lluvia que cae directo al mar y fracción de la que cae sobre la ladera. */
  fMar: number
  fLadera: number
  /** mm/h que pasan a río e infiltración (lluvia sobre tierra, sin contar el límite del suelo). */
  escorr: number
  infil: number
  rio: number
  subterranea: number
}

export function flujos(e: Estado, c: Config): Flujos {
  const { sol, plantas, montana, tAlta } = efectiva(c)
  const tb = tBaja(sol)
  const tArriba = tAlta - (montana ? DT_MONTANA : 0)
  const capBaja = capacidad(tb)
  const capArriba = Math.min(capacidad(tArriba), capBaja)
  const deficit = Math.max(0, capBaja - e.vapor) / CAP_REF
  const humedadSuelo = Math.min(1, e.suelo / (0.3 * S_MAX))
  const prec = K_P * Math.max(0, e.nubes - N_UMBRAL)
  const fMar = montana ? 0.15 : 0.3
  const tierra = prec * (1 - fMar)
  const [pelado, cubierto] = montana ? [0.65, 0.2] : [0.35, 0.05]
  const crSeco = pelado + (cubierto - pelado) * plantas
  const lleno = e.suelo / S_MAX
  const cr = crSeco + (1 - crSeco) * lleno * lleno
  return {
    tBaja: tb, tArriba, capBaja, capArriba,
    humedad: Math.min(1, e.vapor / capBaja),
    evap: K_E * sol * deficit,
    trans: K_T * plantas * sol * deficit * humedadSuelo,
    cond: K_C * Math.max(0, e.vapor - capArriba),
    reevap: K_RE * e.nubes * Math.max(0, 1 - e.vapor / capArriba),
    prec, cr, fMar, fLadera: montana ? 0.6 : 0,
    escorr: cr * tierra, infil: (1 - cr) * tierra,
    rio: K_RIO * e.rio, subterranea: K_SUBTERRANEA * e.suelo,
  }
}

function mover(e: Estado, de: Reservorio, a: Reservorio, mm: number): number {
  const cant = Math.max(0, Math.min(mm, e[de]))
  e[de] -= cant
  e[a] += cant
  return cant
}

/** Avanza `dt` horas. Pura: devuelve un estado nuevo. Cada transferencia sale de un reservorio y entra en otro. */
export function paso(previo: Estado, c: Config, dt = PASO_MAX): Estado {
  const e = { ...previo }
  const f = flujos(e, c)
  mover(e, 'mar', 'vapor', f.evap * dt)
  mover(e, 'suelo', 'vapor', f.trans * dt)
  mover(e, 'vapor', 'nubes', f.cond * dt)
  mover(e, 'nubes', 'vapor', f.reevap * dt)
  const lluvia = Math.min(f.prec * dt, e.nubes)
  e.nubes -= lluvia
  e.lluvia += lluvia
  const tierra = lluvia * (1 - f.fMar)
  e.mar += lluvia - tierra
  const infil = Math.min(S_MAX - e.suelo, (1 - f.cr) * tierra)
  e.suelo += Math.max(0, infil)
  e.rio += tierra - Math.max(0, infil)
  e.escorrentia += tierra - Math.max(0, infil)
  mover(e, 'rio', 'mar', f.rio * dt)
  mover(e, 'suelo', 'mar', f.subterranea * dt)
  e.horas += dt
  return e
}

/** Corre la simulación `horas` con una config fija; sirve para calcular las respuestas de la predicción. */
export function simular(c: Config, horas: number, desde = estadoInicial()): Estado {
  let e = desde
  for (let t = 0; t < horas - 1e-9; t += PASO_MAX) e = paso(e, c, Math.min(PASO_MAX, horas - t))
  return e
}

/** Horas que tarda en dejar de llover desde `desde` con la config `c` (tope `max`). */
export function horasHastaSinLluvia(c: Config, desde: Estado, max = 240): number {
  let e = desde
  while (e.horas - desde.horas < max && flujos(e, c).prec >= LLUVIA_MIN) e = paso(e, c)
  return e.horas - desde.horas
}

/** Estado "con el ciclo andando": cuatro días con el Sol prendido y sin talar, contadores en cero. Es desde donde se rompe algo. */
export function estadoEnMarcha(c: Config): Estado {
  const sana = { ...c, solApagado: false, talado: false }
  const e = simular(sana, 96, estadoInicial(sana))
  return { ...e, horas: 0, lluvia: 0, escorrentia: 0 }
}
