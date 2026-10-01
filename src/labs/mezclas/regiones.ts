// Dónde puede estar una partícula: regiones (recipientes) y las rutas que unen una con otra.
import * as THREE from 'three'
import type { Lectura } from './model'

export interface Region {
  x: number
  z: number
  y0: number
  alto: number
  /** mL que llenan la región hasta el tope (visual, no el volumen real del recipiente). */
  capMl: number
  /** Radio de la región a la fracción `f` (0-1) de su altura. */
  radio: (f: number) => number
  /** Partículas pegadas a un cuerpo (el imán): racimo colgando de (x, y0, z), sin capas. */
  pegado?: boolean
}

/** Punto de paso: las partículas lo cruzan con una dispersión lateral `d`. */
export interface Paso {
  p: THREE.Vector3
  d: number
}
export const paso = (x: number, y: number, z: number, d = 0): Paso => ({ p: new THREE.Vector3(x, y, z), d })

export interface Estacion {
  grupo: THREE.Group
  origen: Region
  salida: Region
  /** Cómo llegan las partículas desde el vaso hasta la región de origen (después de salir de la boca del vaso). */
  entrada: Paso[]
  /** Cómo llegan desde el origen hasta la región de salida. */
  rutaSalida: Paso[]
  rotulos: { estacion: string; origen: string; salida: string }
  anclas: { estacion: THREE.Vector3; origen: THREE.Vector3; salida: THREE.Vector3; temp?: THREE.Vector3 }
  /** Movimiento propio de la estación (llave, llama, imán). */
  animar?: (e: { lectura: Lectura | null; iniciado: boolean; dt: number; ahora: number; tMechero: number }) => void
}

export const cilindro = (radio: number): Region['radio'] => () => radio

/** Radio de una región que sigue un perfil [y, radio] interpolado. */
export function porPerfil(perfil: number[][], y0: number, alto: number): Region['radio'] {
  return (f) => {
    const y = y0 + f * alto
    for (let i = 1; i < perfil.length; i++) {
      if (y <= perfil[i][0]) {
        const [ya, ra] = perfil[i - 1]
        const [yb, rb] = perfil[i]
        return ra + ((rb - ra) * (y - ya)) / (yb - ya)
      }
    }
    return perfil[perfil.length - 1][1]
  }
}
