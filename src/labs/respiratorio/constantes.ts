import * as THREE from 'three'

// Colores con significado (los mismos en escena, texto y controles): cielo = O₂, magenta = CO₂,
// lima = aire que entra y sale, ámbar = lo que pide el cuerpo, rojo = sangre.
export const CIELO_HEX = 0x5ec8ff
export const MAGENTA_HEX = 0xff5fa2
/** Nitrógeno y el resto del aire: gris, apagado (no participa del intercambio). */
export const AIRE_HEX = 0x8fa39b
export const MARCA_HEX = 0xc6f35e

const SANGRE_VIVA = new THREE.Color(0xff4a4a)
const SANGRE_OSCURA = new THREE.Color(0x6d1226)
/** Rojo vivo con la hemoglobina llena de O₂ (≥ 97 %) y oscuro cuando falta (≤ 70 %). */
export function colorSangre(spo2: number, destino = new THREE.Color()): THREE.Color {
  return destino.copy(SANGRE_OSCURA).lerp(SANGRE_VIVA, THREE.MathUtils.clamp((spo2 - 70) / 27, 0, 1))
}

/** Latidos por minuto que se dibujan (solo la maqueta: el corazón no está en el modelo). */
export const LATIDOS = { reposo: 70, caminar: 100, correr: 150 } as const
