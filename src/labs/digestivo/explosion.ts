// Vista explotada: cuánto se separa cada órgano de su lugar normal (con factor 1).
import * as THREE from 'three'
import { v } from './tubo'

/** Un desplazamiento por tramo del tubo, en el mismo orden que TRAMOS. */
export const DESP_TRAMO = [v(-1.1, 0.25, 0.2), v(-0.35, 0.2), v(0.95, 0.1, 0.3), v(-0.9, -0.5, 0.2), v(3.0, -0.3, -0.2)]
export const DESP_HIGADO = v(-0.7, 0.9, 0.1)
export const DESP_PANCREAS = v(1.2, -0.45, -0.3)

/** Los últimos tramos de cada órgano se mezclan con el desplazamiento del siguiente: las partículas cruzan el hueco. */
const VENTANA = 0.07

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

/** Desplazamiento (ya escalado por `f`) para una posición global 0..1 sobre el tubo. */
export function despEnTubo(posicion: number, f: number, destino = new THREE.Vector3()): THREE.Vector3 {
  const escalada = Math.min(Math.max(posicion, 0), 0.9999) * DESP_TRAMO.length
  const i = Math.floor(escalada)
  destino.copy(DESP_TRAMO[i])
  if (i < DESP_TRAMO.length - 1) destino.lerp(DESP_TRAMO[i + 1], suave(1 - VENTANA, 1, escalada - i))
  return destino.multiplyScalar(f)
}
