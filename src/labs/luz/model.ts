// Modelo de la luz: reflexión y refracción de un rayo en el plano de la maqueta (x horizontal, y vertical).
//
//   Reflexión   θ_reflexión = θ_incidencia, medidos desde la normal (la perpendicular a la superficie)
//   Refracción  n1 · sen θ1 = n2 · sen θ2                                  (ley de Snell)
//   Crítico     θc = asen(n2 / n1), solo si n1 > n2: más allá no sale nada (reflexión total interna)
//   Reparto     ecuaciones de Fresnel (luz sin polarizar): cuánta luz se refleja y cuánta pasa
//   Profundidad aparente (mirando con un ángulo α desde la normal): d_aparente = d · tan β / tan α, con sen β = sen α · n_aire / n
//
// Un solo rayo y un solo límite plano: no hay segundos rebotes ni dispersión de colores (todo a ≈ 589 nm).
// Unidades del mundo: 1 unidad = 10 cm. Los ángulos de la API están en grados.

/** Largo (cm) de una unidad del mundo. */
export const UNIDAD_CM = 10

/** Índices de refracción a ≈ 589 nm (ver docs/fuentes.md). */
export const N_AIRE = 1.000277
export const MEDIOS = {
  aire: { nombre: 'Aire', n: N_AIRE },
  agua: { nombre: 'Agua', n: 1.3333 },
  aceite: { nombre: 'Aceite', n: 1.469 },
  vidrio: { nombre: 'Vidrio', n: 1.5233 },
  diamante: { nombre: 'Diamante', n: 2.4173 },
} as const
export type IdMedio = keyof typeof MEDIOS | 'inventado'
export const ORDEN_MEDIOS: IdMedio[] = ['aire', 'agua', 'aceite', 'vidrio', 'diamante', 'inventado']
/** Rango del índice del medio inventado (parámetro de la maqueta, no un material real). */
export const N_INVENTADO = { min: 1, max: 2.5 }

/** Velocidad de la luz en el vacío, m/s (exacta por definición). */
export const C_LUZ = 299_792_458

export type Escena = 'espejo' | 'refraccion' | 'lapiz'
export type Desde = 'aire' | 'medio'

export interface Config {
  escena: Escena
  medio: IdMedio
  /** Índice del medio cuando es "inventado". */
  nInventado: number
  /** Dónde está el láser: en el aire o adentro del medio (solo en la escena de refracción). */
  desde: Desde
  /** Ángulo del láser respecto de la normal, en grados. */
  angulo: number
  /** Giro del espejo, en grados (antihorario). */
  espejo: number
  /** Desde dónde mira el ojo respecto de la vertical, en grados (escena del lápiz). */
  ojo: number
}

export const ANGULO_MAX = 85
export const OJO_MAX = 65
export const CONFIG_INICIAL: Config = { escena: 'refraccion', medio: 'agua', nInventado: 1.8, desde: 'aire', angulo: 45, espejo: 0, ojo: 20 }

// --- Geometría de la maqueta (unidades del mundo) ---
export type Punto = readonly [number, number]
/** Altura de la superficie del medio sobre la mesada y mitad del ancho de la pecera. */
export const SUPERFICIE_Y = 2.7
export const PECERA_X = 3.4
export const PISO_Y = 0.1
/** Punto de incidencia en la pecera y en el espejo. */
export const O_PECERA: Punto = [0, SUPERFICIE_Y]
export const O_ESPEJO: Punto = [0, 1.7]
/** Distancia del láser al punto de incidencia y largo de los rayos que salen. */
export const DIST_LASER = 2.5
export const LARGO_SALIDA = 3
/** El lápiz: inclinación respecto de la vertical y largos de la parte sumergida y la que asoma. */
export const LAPIZ = { inclinacion: 30, sumergido: 2, afuera: 1.4 }
/** Distancia del ojo al punto donde la mirada sale del medio. */
export const DIST_OJO = 3.2

export type TipoRayo = 'laser' | 'mirada'
export interface Tramo {
  de: Punto
  a: Punto
  /** Fracción de la luz del láser que lleva (0 a 1). */
  intensidad: number
  tipo: TipoRayo
}

const rad = (g: number) => (g * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI
const suma = (p: Punto, d: readonly [number, number], t: number): Punto => [p[0] + d[0] * t, p[1] + d[1] * t]

export const indice = (c: Pick<Config, 'medio' | 'nInventado'>): number => (c.medio === 'inventado' ? c.nInventado : MEDIOS[c.medio].n)
export const nombreMedio = (c: Pick<Config, 'medio'>): string => (c.medio === 'inventado' ? 'Medio inventado' : MEDIOS[c.medio].nombre)

/** Velocidad de la luz en un medio de índice n, en km/s. */
export const velocidad = (n: number) => C_LUZ / n / 1000

export interface Interfaz {
  /** Ángulo de refracción en grados, o `null` si hay reflexión total. */
  refraccion: number | null
  /** Ángulo crítico en grados, o `null` si el rayo pasa a un medio más denso. */
  critico: number | null
  /** Fracción de la luz que se refleja (Fresnel, sin polarizar). 1 con reflexión total. */
  reflectancia: number
}

/** Qué le pasa a un rayo que llega con `incidencia` grados desde un medio de índice n1 a uno de índice n2. */
export function interfaz(n1: number, n2: number, incidencia: number): Interfaz {
  const critico = n1 > n2 ? deg(Math.asin(n2 / n1)) : null
  const sen2 = (n1 / n2) * Math.sin(rad(incidencia))
  if (sen2 > 1) return { refraccion: null, critico, reflectancia: 1 }
  const t1 = rad(incidencia)
  const t2 = Math.asin(sen2)
  const [c1, c2] = [Math.cos(t1), Math.cos(t2)]
  const rs = ((n1 * c1 - n2 * c2) / (n1 * c1 + n2 * c2)) ** 2
  const rp = ((n1 * c2 - n2 * c1) / (n1 * c2 + n2 * c1)) ** 2
  return { refraccion: deg(t2), critico, reflectancia: (rs + rp) / 2 }
}

export interface ResEspejo {
  escena: 'espejo'
  incidencia: number
  reflexion: number
  /** Ángulo del rayo reflejado respecto de la vertical del mundo (positivo hacia la derecha). */
  reflejadoMundo: number
  /** Cuánto giró el rayo reflejado por haber girado el espejo. */
  giroRayo: number
  tramos: Tramo[]
}

/** Rayo reflejado por un espejo plano girado `giro` grados: r = d − 2 (d·n) n. Devuelve el rayo y la normal. */
function reflejar(d: Punto, giro: number): { r: Punto; normal: Punto } {
  const normal: Punto = [-Math.sin(rad(giro)), Math.cos(rad(giro))]
  const dn = d[0] * normal[0] + d[1] * normal[1]
  return { r: [d[0] - 2 * dn * normal[0], d[1] - 2 * dn * normal[1]], normal }
}
const anguloMundo = (r: Punto) => deg(Math.atan2(r[0], r[1]))

export function trazarEspejo(c: Config): ResEspejo {
  const d: Punto = [Math.sin(rad(c.angulo)), -Math.cos(rad(c.angulo))]
  const { r, normal } = reflejar(d, c.espejo)
  const reflejadoMundo = anguloMundo(r)
  return {
    escena: 'espejo',
    incidencia: deg(Math.acos(Math.min(1, -(d[0] * normal[0] + d[1] * normal[1])))),
    reflexion: deg(Math.acos(Math.min(1, r[0] * normal[0] + r[1] * normal[1]))),
    reflejadoMundo,
    giroRayo: anguloMundo(reflejar(d, 0).r) - reflejadoMundo,
    tramos: [
      { de: suma(O_ESPEJO, d, -DIST_LASER), a: O_ESPEJO, intensidad: 1, tipo: 'laser' },
      { de: O_ESPEJO, a: suma(O_ESPEJO, r, LARGO_SALIDA), intensidad: 1, tipo: 'laser' },
    ],
  }
}

export interface ResRefraccion extends Interfaz {
  escena: 'refraccion'
  n1: number
  n2: number
  incidencia: number
  tramos: Tramo[]
}

/** Largo que puede recorrer desde `o` en la dirección `d` sin salir de la pecera (los rayos hacia abajo); en el aire, el largo de salida. */
function largoHasta(o: Punto, d: readonly [number, number]): number {
  if (d[1] >= 0) return LARGO_SALIDA
  const tPiso = (PISO_Y - o[1]) / d[1]
  const tPared = d[0] > 0 ? (PECERA_X - o[0]) / d[0] : Infinity
  return Math.min(tPiso, tPared)
}

/** Láser en el aire o adentro del medio, apuntando al punto de incidencia en la superficie de la pecera. */
export function trazarRefraccion(c: Config): ResRefraccion {
  const [n1, n2] = c.desde === 'aire' ? [N_AIRE, indice(c)] : [indice(c), N_AIRE]
  const f = interfaz(n1, n2, c.angulo)
  const baja = c.desde === 'aire' ? -1 : 1
  const s = Math.sin(rad(c.angulo))
  const co = Math.cos(rad(c.angulo))
  const entrante: [number, number] = [s, baja * co]
  const reflejado: [number, number] = [s, -baja * co]
  const tramos: Tramo[] = [
    { de: suma(O_PECERA, entrante, -DIST_LASER), a: O_PECERA, intensidad: 1, tipo: 'laser' },
    { de: O_PECERA, a: suma(O_PECERA, reflejado, largoHasta(O_PECERA, reflejado)), intensidad: f.reflectancia, tipo: 'laser' },
  ]
  if (f.refraccion !== null) {
    const t2 = rad(f.refraccion)
    const pasa: [number, number] = [Math.sin(t2), baja * Math.cos(t2)]
    tramos.push({ de: O_PECERA, a: suma(O_PECERA, pasa, largoHasta(O_PECERA, pasa)), intensidad: 1 - f.reflectancia, tipo: 'laser' })
  }
  return { escena: 'refraccion', n1, n2, incidencia: c.angulo, tramos, ...f }
}

export interface ResLapiz {
  escena: 'lapiz'
  n: number
  /** Profundidad real y aparente de la punta del lápiz, en cm. */
  profundidad: number
  aparente: number
  /** Cociente aparente / real: lo que se "achica" lo sumergido al mirarlo desde ese ángulo. */
  factor: number
  /** Ángulo de la mirada dentro del medio, en grados. */
  anguloAdentro: number
  puntaReal: Punto
  puntaAparente: Punto
  extremo: Punto
  salida: Punto
  ojo: Punto
  tramos: Tramo[]
}

/** Lápiz clavado en el medio visto por un ojo lejano que mira con `ojo` grados desde la vertical. */
export function trazarLapiz(c: Config): ResLapiz {
  const n = indice(c)
  const alfa = rad(c.ojo)
  const beta = Math.asin(Math.min(1, (N_AIRE * Math.sin(alfa)) / n))
  const factor = c.ojo < 0.01 ? N_AIRE / n : Math.tan(beta) / Math.tan(alfa)
  const fi = rad(LAPIZ.inclinacion)
  const puntaReal = suma(O_PECERA, [Math.sin(fi), -Math.cos(fi)], LAPIZ.sumergido)
  const prof = SUPERFICIE_Y - puntaReal[1]
  const salida: Punto = [puntaReal[0] + prof * Math.tan(beta), SUPERFICIE_Y]
  const ojo = suma(salida, [Math.sin(alfa), Math.cos(alfa)], DIST_OJO)
  return {
    escena: 'lapiz',
    n,
    profundidad: prof * UNIDAD_CM,
    aparente: prof * factor * UNIDAD_CM,
    factor,
    anguloAdentro: deg(beta),
    puntaReal,
    puntaAparente: [puntaReal[0], SUPERFICIE_Y - prof * factor],
    extremo: suma(O_PECERA, [-Math.sin(fi), Math.cos(fi)], LAPIZ.afuera),
    salida,
    ojo,
    tramos: [
      { de: puntaReal, a: salida, intensidad: 1, tipo: 'mirada' },
      { de: salida, a: ojo, intensidad: 1, tipo: 'mirada' },
    ],
  }
}

export type Resultado = ResEspejo | ResRefraccion | ResLapiz

export function resolver(c: Config): Resultado {
  return c.escena === 'espejo' ? trazarEspejo(c) : c.escena === 'refraccion' ? trazarRefraccion(c) : trazarLapiz(c)
}

/** Ángulo del láser al meterlo adentro del medio: pasado el crítico, para que se vea qué pasa ahí. */
export function anguloAdentro(c: Config): number {
  const { critico } = interfaz(indice(c), N_AIRE, 0)
  return critico === null ? c.angulo : Math.min(ANGULO_MAX, Math.round(critico + 11))
}

/** El medio es (prácticamente) igual al aire: el rayo no se dobla y la maqueta se vuelve invisible. */
export const esAire = (c: Config) => Math.abs(indice(c) - N_AIRE) < 0.005

/** Puntos de la curva "ángulo que sale según el que entra", de 0 hasta `hasta` grados (se corta en el crítico). */
export function curva(c: Config, hasta: number): { x: number; refraccion: number }[] {
  const [n1, n2] = c.desde === 'aire' ? [N_AIRE, indice(c)] : [indice(c), N_AIRE]
  const puntos: { x: number; refraccion: number }[] = []
  for (let x = 0; x <= hasta; x++) {
    const r = interfaz(n1, n2, x).refraccion
    if (r === null) break
    puntos.push({ x, refraccion: r })
  }
  return puntos
}
