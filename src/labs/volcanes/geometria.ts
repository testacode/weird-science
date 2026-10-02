// Geometría del corte de cada borde. Unidades de la escena: el eje vertical está a escala (K por km);
// el ancho no lo está (un borde real mide cientos de km). El plano del corte es z = 0 y el bloque se extiende hacia atrás.
import { PROFUNDIDAD, type Borde } from './model'

export const K = 0.03
export const W = 5
export const D = 2.6
export const y = (km: number) => -km * K

export type Pt = [number, number]

export interface Capa {
  puntos: Pt[]
  color: number
  /** Brillo propio: la astenósfera está caliente. */
  brillo?: number
}

export interface Geo {
  capas: Capa[]
  /** Caja de agua: de x0 a x1, de y0 a 0. */
  agua: { x0: number; x1: number; y0: number } | null
  /** Dónde está y hasta dónde puede correr la lava (x mínimo y máximo). */
  volcan: { x: number; base: number; izq: number; der: number } | null
  /** Zona donde se funde la roca. */
  fusion: Pt[]
  /** Camino del magma desde la zona de fusión hasta el cráter. */
  conducto: Pt[]
  camara: { x: number; y: number; rx: number; ry: number } | null
  /** Flechas del movimiento de las placas: posición y dirección (unitaria). */
  flechas: { p: [number, number, number]; dir: [number, number, number] }[]
  /** Dónde nace un sismo: devuelve un punto del corte. */
  sismo: () => Pt
}

const COLOR = { oceanica: 0x2c3a3c, continental: 0x7d6c52, manto: 0x5c4636, astenosfera: 0x7a2c12, placa: 0x35586a }
const aleatorio = (a: number, b: number) => a + Math.random() * (b - a)
export const CORTEZA_O = PROFUNDIDAD.cortezaOceanica * K
export const CORTEZA_C = PROFUNDIDAD.cortezaContinental * K
export const LITOSFERA = PROFUNDIDAD.litosfera * K
export const FONDO_Y = y(PROFUNDIDAD.corte)

function elipse(cx: number, cy: number, rx: number, ry: number, n = 28): Pt[] {
  return Array.from({ length: n }, (_, i) => [cx + rx * Math.cos((i / n) * 2 * Math.PI), cy + ry * Math.sin((i / n) * 2 * Math.PI)] as Pt)
}

/** La astenósfera es todo el fondo del bloque: va primero y las placas se dibujan encima. */
const astenosfera = (): Capa => ({ puntos: [[-W, FONDO_Y], [W, FONDO_Y], [W, -0.3], [-W, -0.3]], color: COLOR.astenosfera, brillo: 0.12 })

export const FONDO_MAR = -0.3
/** La litósfera se engrosa con la raíz cuadrada de la distancia a la dorsal (se enfría y se hunde). */
export const baseDorsal = (x: number) => FONDO_MAR - CORTEZA_O - (LITOSFERA - CORTEZA_O) * Math.sqrt(Math.abs(x) / W)

function divergente(): Geo {
  const fondo = FONDO_MAR
  const base = baseDorsal
  const lado = (s: 1 | -1): Capa[] => {
    const xs = Array.from({ length: 13 }, (_, i) => W - ((W - 0.12) * i) / 12)
    return [
      { puntos: [[s * 0.12, fondo], [s * W, fondo], [s * W, fondo - CORTEZA_O], [s * 0.12, fondo - CORTEZA_O]], color: COLOR.oceanica },
      { puntos: [[s * 0.12, fondo - CORTEZA_O], [s * W, fondo - CORTEZA_O], ...xs.map((x) => [s * x, base(x)] as Pt)], color: COLOR.manto },
    ]
  }
  return {
    capas: [astenosfera(), ...lado(-1), ...lado(1)],
    agua: { x0: -W, x1: W, y0: fondo },
    volcan: { x: 0, base: fondo, izq: -W + 0.1, der: W - 0.1 },
    fusion: [[0, fondo - CORTEZA_O - 0.2], [1.7, y(120)], [-1.7, y(120)]],
    conducto: [[0, y(100)], [0, y(40)], [0, fondo - 0.5]],
    camara: { x: 0, y: fondo - 0.5, rx: 0.34, ry: 0.15 },
    flechas: [{ p: [-2.6, 0.12, -0.5], dir: [-1, 0, 0] }, { p: [2.6, 0.12, -0.5], dir: [1, 0, 0] }],
    sismo: () => [aleatorio(-0.5, 0.5), aleatorio(fondo - 0.1, fondo - 0.45)],
  }
}

export const XT = -2.4
const TOPE = 0.15
/** Superficie de la placa que se hunde: baja a 45° desde la fosa. */
const placa = (x: number) => -0.3 - Math.max(0, x - XT)

function convergente(): Geo {
  const grosor = LITOSFERA * 0.8
  const bajo = FONDO_Y
  const fin = XT + (-bajo - 0.3)
  const delgada = 1.414 * grosor
  const cuerpo: Pt[] = [[-W, -0.3], [XT, -0.3], [fin, bajo], [fin - delgada, bajo], [XT - 0.414 * grosor, -0.3 - grosor], [-W, -0.3 - grosor]]
  const xCont = (yy: number) => XT + (-0.3 - yy)
  const xVolcan = 1.05
  return {
    capas: [
      astenosfera(),
      { puntos: cuerpo, color: COLOR.placa },
      { puntos: [[-W, -0.3], [XT, -0.3], [fin, bajo], [fin - 0.16, bajo], [XT, -0.46], [-W, -0.46]], color: COLOR.oceanica },
      { puntos: [[XT, -0.3], [-1.7, TOPE], [W, TOPE], [W, -CORTEZA_C], [xCont(-CORTEZA_C), -CORTEZA_C]], color: COLOR.continental },
      { puntos: [[xCont(-CORTEZA_C), -CORTEZA_C], [W, -CORTEZA_C], [W, -LITOSFERA], [xCont(-LITOSFERA), -LITOSFERA]], color: COLOR.manto },
    ],
    agua: { x0: -W, x1: -1.85, y0: -0.3 },
    volcan: { x: xVolcan, base: TOPE, izq: -1.6, der: W - 0.1 },
    fusion: elipse(0.95, y(105), 1.05, 0.42),
    conducto: [[0.95, y(95)], [1.0, y(60)], [xVolcan, y(20)], [xVolcan, -CORTEZA_C * 0.5]],
    camara: { x: xVolcan, y: -CORTEZA_C * 0.55, rx: 0.5, ry: 0.2 },
    flechas: [{ p: [-3.7, 0.12, -0.5], dir: [1, 0, 0] }, { p: [3.7, 0.4, -0.5], dir: [-1, 0, 0] }],
    sismo: () => {
      // Dentro de la placa, sin pasar el fondo del corte.
      const x = aleatorio(XT, XT + (-0.3 - FONDO_Y - 1))
      return [x, placa(x) - aleatorio(0.05, 0.9)]
    },
  }
}

function transformante(): Geo {
  const lado = (s: 1 | -1): Capa[] => [
    { puntos: [[s * 0.04, 0], [s * W, 0], [s * W, -CORTEZA_C], [s * 0.04, -CORTEZA_C]], color: COLOR.continental },
    { puntos: [[s * 0.04, -CORTEZA_C], [s * W, -CORTEZA_C], [s * W, -LITOSFERA], [s * 0.04, -LITOSFERA]], color: COLOR.manto },
  ]
  return {
    capas: [astenosfera(), { puntos: [[-0.04, 0], [0.04, 0], [0.04, -LITOSFERA], [-0.04, -LITOSFERA]], color: 0x1d1a18 }, ...lado(-1), ...lado(1)],
    agua: null,
    volcan: null,
    fusion: [],
    conducto: [],
    camara: null,
    flechas: [{ p: [-2.4, 0.1, 0.4], dir: [0, 0, 1] }, { p: [2.4, 0.1, -1.6], dir: [0, 0, -1] }],
    sismo: () => [aleatorio(-0.15, 0.15), -aleatorio(0.05, 15 * K)],
  }
}

export const GEO: Record<Borde, () => Geo> = { divergente, convergente, transformante }
