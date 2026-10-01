import * as THREE from 'three'

/** Maqueta esquemática (1 unidad ≈ 5 cm): el lado derecho de la persona queda a la izquierda de la pantalla, como si te mirara. */
export const CAMARA_X = 0.95
export const ATRIO_Y = 2.25
export const VENTRICULO_Y = 0.62
/** Altura de las válvulas entre aurícula y ventrículo, y del agujero del tabique. */
export const VALVULA_Y = 1.64
export const AGUJERO_Y = 0.75

/** Cada tramo del camino de la sangre, en el orden en que lo recorre. */
export type Zona = 'ad' | 'vd' | 'arteriaPulmonar' | 'pulmon' | 'venaPulmonar' | 'ai' | 'vi' | 'aorta' | 'cuerpo' | 'vena'
const ORDEN: Zona[] = ['ad', 'vd', 'arteriaPulmonar', 'pulmon', 'venaPulmonar', 'ai', 'vi', 'aorta', 'cuerpo', 'vena']

const v = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z)

/** Lecho de capilares: un zigzag entre dos puntos (el pulmón y el cuerpo se dibujan cada uno como un solo lecho). */
function zigzag(desde: THREE.Vector3, hasta: THREE.Vector3, tramos: number, amplitud: number): THREE.Vector3[] {
  return Array.from({ length: tramos + 1 }, (_, i) => {
    const p = desde.clone().lerp(hasta, i / tramos)
    if (i > 0 && i < tramos) {
      const lado = i % 2 ? 1 : -1
      p.y += lado * amplitud
      p.z += lado * 0.2
    }
    return p
  })
}

const PUNTOS: Record<Zona, THREE.Vector3[]> = {
  ad: [v(-1.6, ATRIO_Y), v(-CAMARA_X, ATRIO_Y), v(-CAMARA_X, 1.95), v(-CAMARA_X, VALVULA_Y)],
  vd: [v(-CAMARA_X, VALVULA_Y), v(-CAMARA_X, VENTRICULO_Y), v(-0.55, 1.0, 0.25), v(-0.4, 1.35, 0.4)],
  arteriaPulmonar: [v(-0.4, 1.35, 0.4), v(-0.15, 2.2, 0.75), v(0, 3.2, 0.75), v(-0.5, 3.9, 0.6), v(-1.9, 4.3, 0.1)],
  pulmon: zigzag(v(-1.9, 4.3, 0.1), v(1.9, 4.3, 0.1), 8, 0.4),
  venaPulmonar: [v(1.9, 4.3, 0.1), v(1.6, 3.6, 0.1), v(CAMARA_X, 3.0), v(CAMARA_X, 2.55)],
  ai: [v(CAMARA_X, 2.55), v(CAMARA_X, ATRIO_Y), v(CAMARA_X, 1.95), v(CAMARA_X, VALVULA_Y)],
  vi: [v(CAMARA_X, VALVULA_Y), v(CAMARA_X, 0.7), v(1.2, 0.55), v(1.55, 0.65)],
  aorta: [v(1.55, 0.65), v(2.3, 0.65), v(2.8, 0.2), v(2.8, -2.2), v(2.45, -2.9)],
  cuerpo: zigzag(v(2.45, -2.9), v(-2.45, -2.9), 10, 0.4),
  vena: [v(-2.45, -2.9), v(-2.8, -2.2), v(-2.8, 1.6), v(-2.7, 2.2), v(-2.2, ATRIO_Y), v(-1.6, ATRIO_Y)],
}

export interface Tramo {
  zona: Zona
  curva: THREE.CatmullRomCurve3
  largo: number
  /** Distancia recorrida hasta el principio del tramo. */
  inicio: number
}

let acumulado = 0
const TRAMOS: Tramo[] = ORDEN.map((zona) => {
  const curva = new THREE.CatmullRomCurve3(PUNTOS[zona], false, 'centripetal')
  const tramo = { zona, curva, largo: curva.getLength(), inicio: acumulado }
  acumulado += tramo.largo
  return tramo
})
export const LARGO = acumulado
export const tramo = (z: Zona) => TRAMOS.find((t) => t.zona === z)!

/** Tramo en que está una distancia `s` del recorrido y la posición en él (0 a 1). */
export function ubicar(s: number): { tramo: Tramo; u: number } {
  let t = TRAMOS[TRAMOS.length - 1]
  for (const candidato of TRAMOS) if (s >= candidato.inicio) t = candidato
  return { tramo: t, u: THREE.MathUtils.clamp((s - t.inicio) / t.largo, 0, 1) }
}

export function posicion(s: number, destino = new THREE.Vector3()): THREE.Vector3 {
  const { tramo: t, u } = ubicar(s)
  return t.curva.getPointAt(u, destino)
}
