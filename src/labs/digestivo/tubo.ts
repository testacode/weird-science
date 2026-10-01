// Geometría del tubo digestivo: un camino por segmento, en el mismo orden que SEGMENTOS.
import * as THREE from 'three'

export const v = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z)

function serpentina(): THREE.Vector3[] {
  const puntos = [v(0.35, 1.25, 0), v(0.25, 0.45, 0.05)]
  const filas = 6
  for (let i = 0; i < filas; i++) {
    const y = 0.25 - i * 0.48
    const derecha = i % 2 === 0
    puntos.push(v(derecha ? 1.15 : -1.15, y, 0.15 * Math.sin(i)))
    puntos.push(v(derecha ? 1.15 : -1.15, y - 0.24, -0.1))
  }
  puntos.push(v(-1.35, -2.7, 0))
  return puntos
}

export interface Tramo {
  curva: THREE.CatmullRomCurve3
  radio: number
  /** Punto donde se ancla la etiqueta HTML. */
  ancla: THREE.Vector3
}

export const TRAMOS: Tramo[] = [
  { curva: new THREE.CatmullRomCurve3([v(-0.7, 5, 0.1), v(-0.2, 5.05, 0.1), v(0, 4.8, 0)]), radio: 0.2, ancla: v(-0.9, 5.3) },
  { curva: new THREE.CatmullRomCurve3([v(0, 4.8, 0), v(0.05, 3.8, 0), v(0.05, 2.9, 0)]), radio: 0.1, ancla: v(-0.45, 3.9) },
  {
    curva: new THREE.CatmullRomCurve3([v(0.05, 2.9, 0), v(0.55, 2.75, 0.05), v(1.25, 2.3, 0.05), v(1.2, 1.55, 0), v(0.35, 1.25, 0)]),
    radio: 0.4,
    ancla: v(1.95, 2.35),
  },
  { curva: new THREE.CatmullRomCurve3(serpentina()), radio: 0.12, ancla: v(0, -2.95) },
  {
    curva: new THREE.CatmullRomCurve3([
      v(-1.35, -2.7, 0), v(-1.95, -2.4, 0.2), v(-2.05, -0.6, 0.3), v(-1.9, 0.9, 0.35), v(0, 1.0, 0.55),
      v(1.9, 0.9, 0.35), v(2.05, -1.2, 0.3), v(1.6, -2.9, 0.25), v(0.5, -3.3, 0.2), v(0.1, -3.9, 0.1),
    ]),
    radio: 0.22,
    ancla: v(2.65, -1),
  },
]

export const HIGADO = v(-0.95, 2.35, -0.25)
export const VESICULA = v(-0.55, 1.75, 0.3)

/** Punto sobre todo el tubo para una posición global 0..1 (cada tramo ocupa 1/5). */
export function puntoEnTubo(posicion: number, destino = new THREE.Vector3()): THREE.Vector3 {
  const escalada = Math.min(Math.max(posicion, 0), 0.9999) * TRAMOS.length
  const indice = Math.floor(escalada)
  return TRAMOS[indice].curva.getPointAt(escalada - indice, destino)
}

export function radioEnTubo(posicion: number): number {
  const indice = Math.min(Math.floor(Math.max(posicion, 0) * TRAMOS.length), TRAMOS.length - 1)
  return TRAMOS[indice].radio
}
