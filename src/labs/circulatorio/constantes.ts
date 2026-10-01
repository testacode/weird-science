import * as THREE from 'three'

// Colores con significado (los mismos en escena, texto y controles): rojo = sangre con oxígeno, azul = sangre que volvió de los tejidos
// (sin mucho O₂), lima = latidos, ámbar = lo que pide el cuerpo, magenta = el defecto.
export const ROJO_HEX = 0xff3b3b
export const AZUL_HEX = 0x4d7dff
export const MARCA_HEX = 0xc6f35e
export const AMBAR_HEX = 0xffc857
export const MAGENTA_HEX = 0xff5fa2

const ROJO = new THREE.Color(ROJO_HEX)
const AZUL = new THREE.Color(AZUL_HEX)
/** Azul con la sangre venosa (≤ 72 % de saturación) y rojo con la arterial (98 %); en el medio, lo mezclado. */
export function colorSangre(sat: number, destino = new THREE.Color()): THREE.Color {
  return destino.copy(AZUL).lerp(ROJO, THREE.MathUtils.smoothstep(sat, 0.72, 0.98))
}
