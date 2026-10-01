// Geometría del circuito sobre la mesada: por dónde van los cables y dónde se apoya cada pieza.
// Cada arista sigue el camino de los electrones (del polo − al polo +) y sabe qué corriente la recorre.
import * as THREE from 'three'
import type { Conexion, Resultado, Voltaje } from './model'

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/** Pila a la izquierda; el cable de atrás (z negativo) va al +, el de adelante al −. */
export const XB = -3.6
export const ZB = -2.3
export const ZF = 2.3
const XR = 3.9
/** Altura del cable apoyado en la mesada y de los bornes de la pila. */
const WY = 0.14
export const BY = 0.36
export const X_CORTO = -4.9
/** Donde va el interruptor, sobre el cable de adelante. */
export const X_INTERRUPTOR = -2.75
export const xLampara = (i: number, n: number) => 0.5 + (i - (n - 1) / 2) * 2.4

/** Media longitud de la pila en z (cada pila grande mide 0,9; la de 9 V es más corta). */
export const mediaLargoPila = (voltaje: Voltaje) => (voltaje === 9 ? 0.8 : (voltaje / 1.5) * 0.45 + 0.2)

/** Curva poligonal parametrizada por longitud de arco: `getPoint(t)` avanza a ritmo constante. */
export class Poli extends THREE.Curve<THREE.Vector3> {
  readonly largo: number
  private readonly puntos: THREE.Vector3[]
  private readonly acum: number[] = [0]

  constructor(puntos: THREE.Vector3[]) {
    super()
    this.puntos = puntos
    for (let i = 1; i < puntos.length; i++) this.acum.push(this.acum[i - 1] + puntos[i].distanceTo(puntos[i - 1]))
    this.largo = this.acum[this.acum.length - 1]
  }

  override getPoint(t: number, destino = new THREE.Vector3()): THREE.Vector3 {
    const s = Math.min(Math.max(t, 0), 1) * this.largo
    let i = 1
    while (i < this.acum.length - 1 && this.acum[i] < s) i++
    const tramo = this.acum[i] - this.acum[i - 1] || 1e-9
    return destino.lerpVectors(this.puntos[i - 1], this.puntos[i], (s - this.acum[i - 1]) / tramo)
  }
}

/** Redondea las esquinas de una poligonal con curvas cuadráticas. */
function redondear(pts: THREE.Vector3[], radio = 0.4, pasos = 6): THREE.Vector3[] {
  const salida = [pts[0]]
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, p, b] = [pts[i - 1], pts[i], pts[i + 1]]
    const d = Math.min(radio, a.distanceTo(p) / 2, b.distanceTo(p) / 2)
    const p1 = p.clone().addScaledVector(a.clone().sub(p).normalize(), d)
    const p2 = p.clone().addScaledVector(b.clone().sub(p).normalize(), d)
    for (let k = 0; k <= pasos; k++) salida.push(new THREE.QuadraticBezierCurve3(p1, p, p2).getPoint(k / pasos))
  }
  salida.push(pts[pts.length - 1])
  return salida
}

export interface Arista {
  curva: Poli
  /** Corriente que recorre la arista, según el modelo. */
  corriente: (r: Resultado) => number
  peligro?: boolean
}

const arista = (pts: THREE.Vector3[], corriente: Arista['corriente'], peligro = false): Arista => ({
  curva: new Poli(redondear(pts)),
  corriente,
  peligro,
})

export function trazado(conexion: Conexion, cantidad: number, voltaje: Voltaje, corto: boolean): Arista[] {
  const hl = mediaLargoPila(voltaje)
  const menos = v(XB, BY, hl)
  const mas = v(XB, BY, -hl)
  const salidaMenos = v(XB, WY, hl + 0.35)
  const salidaMas = v(XB, WY, -hl - 0.35)
  const xs = Array.from({ length: cantidad }, (_, i) => xLampara(i, cantidad))
  const aristas: Arista[] = []

  if (conexion === 'serie') {
    aristas.push(arista(
      [menos, salidaMenos, v(XB, WY, ZF), v(XR, WY, ZF), v(XR, WY, ZB), v(XB, WY, ZB), salidaMas, mas],
      (r) => r.corrienteCarga,
    ))
  } else {
    // Dos rieles (adelante −, atrás +) y una lamparita en cada escalón. La corriente de un tramo
    // del riel es la suma de lo que todavía falta repartir (primera ley de Kirchhoff).
    const rama = (r: Resultado, desde: number) => r.lamparas.slice(desde, cantidad).reduce((s, l) => s + l.corriente, 0)
    aristas.push(arista([menos, salidaMenos, v(XB, WY, ZF), v(xs[0], WY, ZF)], (r) => r.corrienteCarga))
    xs.forEach((x, i) => {
      aristas.push(arista([v(x, WY, ZF), v(x, WY, ZB)], (r) => r.lamparas[i].corriente))
      if (i < cantidad - 1) {
        aristas.push(arista([v(x, WY, ZF), v(xs[i + 1], WY, ZF)], (r) => rama(r, i + 1)))
        aristas.push(arista([v(xs[i + 1], WY, ZB), v(x, WY, ZB)], (r) => rama(r, i + 1)))
      }
    })
    aristas.push(arista([v(xs[0], WY, ZB), v(XB, WY, ZB), salidaMas, mas], (r) => r.corrienteCarga))
  }
  if (corto) {
    aristas.push(arista(
      [menos, salidaMenos, v(X_CORTO, WY, hl + 0.35), v(X_CORTO, WY, -hl - 0.35), salidaMas, mas],
      (r) => r.corrienteCorto,
      true,
    ))
  }
  return aristas
}
