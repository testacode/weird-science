// Modelo de las fases y los eclipses de Luna. Simulación pura, sin Three.js.
// El tiempo `t` son días desde una Luna nueva. Supuestos: órbitas circulares, Sol muy lejano
// (rayos paralelos) y una Luna que avanza a ritmo constante.

export const MES_SINODICO = 29.530588 // de Luna nueva a Luna nueva
export const MES_SIDERAL = 27.321662 // una vuelta respecto de las estrellas
export const MES_DRACONICO = 27.212221 // de nodo a nodo (para los eclipses)
export const INCLINACION = 5.145 // grados entre la órbita de la Luna y la de la Tierra

const RAD = Math.PI / 180
const DISTANCIA_KM = 384400
const RADIO_LUNA_KM = 1737.4
const RADIO_UMBRA_KM = 4600 // radio de la sombra de la Tierra a la distancia de la Luna

/** Radio angular de la Luna y de la sombra de la Tierra vistos desde la Tierra, en grados. */
export const RADIO_LUNA = Math.asin(RADIO_LUNA_KM / DISTANCIA_KM) / RAD
export const RADIO_UMBRA = Math.asin(RADIO_UMBRA_KM / DISTANCIA_KM) / RAD
/** Cuántas Lunas entran en el radio de la sombra de la Tierra a esa distancia (~2,65). */
export const UMBRA_EN_LUNAS = RADIO_UMBRA_KM / RADIO_LUNA_KM

/** Argumento de latitud de la Luna en t = 0. Elegido para que el primer eclipse caiga en la 6.ª Luna llena. */
const ARGUMENTO_INICIAL = 14.7

export interface Config {
  /** Concepción errónea: "las fases son la sombra de la Tierra". */
  sombraTierra: boolean
  /** Rotura: una órbita sin los 5° de inclinación. */
  sinInclinacion: boolean
}
export const CONFIG_NORMAL: Config = { sombraTierra: false, sinInclinacion: false }

const mod = (x: number, n: number) => ((x % n) + n) % n
const envolver180 = (g: number) => mod(g + 180, 360) - 180

/** Día de Luna llena dentro del ciclo: donde la elongación llega a 180°. */
export const DIA_LLENA = (180 / 360) * MES_SINODICO

export const diaDelCiclo = (t: number) => mod(t, MES_SINODICO)
export const numeroDeCiclo = (t: number) => Math.floor(t / MES_SINODICO) + 1
/** Fase: ángulo (0-360°) que la Luna se adelantó al Sol visto desde la Tierra. */
export const fase = (t: number) => (360 * diaDelCiclo(t)) / MES_SINODICO
/** Elongación θ: ángulo Sol-Tierra-Luna, de 0° (Luna nueva) a 180° (Luna llena). */
export const elongacion = (grados: number) => (grados <= 180 ? grados : 360 - grados)
/** Fracción de la cara visible que está iluminada: (1 − cos θ) / 2. */
export const iluminada = (elong: number) => (1 - Math.cos(elong * RAD)) / 2

export type IdFase =
  | 'nueva' | 'creciente' | 'cuartoCreciente' | 'gibosaCreciente'
  | 'llena' | 'gibosaMenguante' | 'cuartoMenguante' | 'menguante'

export const NOMBRES: Record<IdFase, string> = {
  nueva: 'Luna nueva',
  creciente: 'Creciente',
  cuartoCreciente: 'Cuarto creciente',
  gibosaCreciente: 'Gibosa creciente',
  llena: 'Luna llena',
  gibosaMenguante: 'Gibosa menguante',
  cuartoMenguante: 'Cuarto menguante',
  menguante: 'Menguante',
}

/** Las fases principales valen ±1 día; entre ellas, creciente/gibosa y menguante. */
const MARGEN_PRINCIPAL = (360 / MES_SINODICO) * 1
export function idFase(grados: number): IdFase {
  const cerca = (objetivo: number) => Math.abs(envolver180(grados - objetivo)) <= MARGEN_PRINCIPAL
  if (cerca(0)) return 'nueva'
  if (cerca(90)) return 'cuartoCreciente'
  if (cerca(180)) return 'llena'
  if (cerca(270)) return 'cuartoMenguante'
  if (grados < 90) return 'creciente'
  if (grados < 180) return 'gibosaCreciente'
  if (grados < 270) return 'gibosaMenguante'
  return 'menguante'
}

export const esCreciente = (grados: number) => grados > 0 && grados < 180

export type Hemisferio = 'sur' | 'norte'
/** Lado iluminado visto desde la Tierra: en el norte la Luna creciente brilla a la derecha; en el sur, a la izquierda. */
export function ladoIluminado(grados: number, hem: Hemisferio): 'izquierda' | 'derecha' {
  const derechaEnElNorte = esCreciente(grados)
  return derechaEnElNorte === (hem === 'norte') ? 'derecha' : 'izquierda'
}
/** Letra a la que se parece la Luna entre cuartos (C: brilla a la izquierda; D: a la derecha). */
export function letraDeLaForma(grados: number, hem: Hemisferio): 'C' | 'D' | null {
  const id = idFase(grados)
  if (id === 'nueva' || id === 'llena' || id === 'cuartoCreciente' || id === 'cuartoMenguante') return null
  return ladoIluminado(grados, hem) === 'izquierda' ? 'C' : 'D'
}

export type Lado = 'mismo' | 'opuesto' | 'recto'
/** Dónde está la Luna respecto del Sol, mirando desde la Tierra, según la elongación. */
export function ladoRespectoDelSol(elong: number): Lado {
  if (elong < 45) return 'mismo'
  return elong > 135 ? 'opuesto' : 'recto'
}

// --- Inclinación y eclipses ---

/** Argumento de latitud (grados desde el nodo ascendente): sube 360° cada mes dracónico. */
export const argumentoLatitud = (t: number) => mod(ARGUMENTO_INICIAL + (360 * t) / MES_DRACONICO, 360)
/** Latitud eclíptica de la Luna en grados (positiva = al norte del plano de la órbita terrestre). */
export const latitudLunar = (t: number, c: Config) => (c.sinInclinacion ? 0 : INCLINACION * Math.sin(argumentoLatitud(t) * RAD))
/** Dónde están los nodos (cruces del plano) respecto de la dirección al Sol: gira una vuelta por año de eclipses (346,6 d). */
export const nodoRespectoDelSol = (t: number) => fase(t) - argumentoLatitud(t)

export interface Eclipse {
  tipo: 'ninguno' | 'parcial' | 'total'
  /** Magnitud en la umbra: <0 sin eclipse, 0-1 parcial, ≥1 total. */
  magnitud: number
  /** Distancia del centro de la Luna al eje de la sombra, en grados. */
  distancia: number
  /** Centro de la sombra respecto del de la Luna, en radios lunares (x: derecha en la vista del norte; y: norte). */
  dx: number
  dy: number
}

/** Eclipse de Luna en el instante `t`: la Luna cruza la sombra de la Tierra si queda a menos de ~0,94° de su eje. */
export function eclipse(t: number, c: Config): Eclipse {
  const dLon = envolver180(fase(t) - 180)
  const lat = latitudLunar(t, c)
  const distancia = Math.hypot(dLon, lat)
  const magnitud = (RADIO_UMBRA + RADIO_LUNA - distancia) / (2 * RADIO_LUNA)
  return {
    tipo: magnitud >= 1 ? 'total' : magnitud > 0 ? 'parcial' : 'ninguno',
    magnitud,
    distancia,
    dx: dLon / RADIO_LUNA,
    dy: -lat / RADIO_LUNA,
  }
}

/** Instante de la próxima Luna llena con eclipse después de `t` (con un poco de aire para verlo llegar), o null. */
export function proximoEclipse(t: number, c: Config, adelanto = 0.14): number | null {
  for (let k = Math.max(0, Math.floor(t / MES_SINODICO)); k < Math.floor(t / MES_SINODICO) + 60; k++) {
    const llena = (k + 0.5) * MES_SINODICO
    if (llena - adelanto > t && eclipse(llena, c).tipo !== 'ninguno') return llena
  }
  return null
}

// --- La concepción errónea: "las fases son la sombra de la Tierra" ---

/** Fracción del disco lunar tapada por un círculo de radio `radio` (en radios lunares) a distancia `d` del centro. */
function fraccionTapada(d: number, radio: number): number {
  if (d >= radio + 1) return 0
  if (d <= radio - 1) return 1
  const a = Math.acos((d * d + 1 - radio * radio) / (2 * d))
  const b = Math.acos((d * d + radio * radio - 1) / (2 * d * radio))
  const lente = a + radio * radio * b - 0.5 * Math.sqrt((-d + radio + 1) * (d + radio - 1) * (d - radio + 1) * (d + radio + 1))
  return lente / Math.PI
}

export interface IdeaSombra {
  /** Centro de la sombra respecto de la Luna, en radios lunares. */
  dx: number
  tapada: number
  /** Fracción iluminada que predice la idea. */
  iluminada: number
}

/**
 * Cómo se vería si la fase fuera la sombra de la Tierra: la sombra (del tamaño real respecto de la Luna)
 * barre el disco de a poco. Queda centrada, tapándola entera, cuando la Luna está alineada con la Tierra y el Sol
 * (fase 180°): la idea predice la Luna llena apagada y la nueva brillante, al revés de lo observado.
 */
export function ideaSombra(grados: number): IdeaSombra {
  const alcance = UMBRA_EN_LUNAS + 1
  const dx = ((grados - 180) / 180) * alcance
  const tapada = fraccionTapada(Math.abs(dx), UMBRA_EN_LUNAS)
  return { dx, tapada, iluminada: 1 - tapada }
}
