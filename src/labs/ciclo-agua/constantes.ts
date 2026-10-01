import * as THREE from 'three'

/** Medio ancho y medio fondo del terrario (unidades del mundo) y alto hasta la tapa. */
export const MEDIO_X = 4
export const MEDIO_Z = 1.7
export const ALTO = 4.8

/** Un color por cosa, el mismo en la escena, el texto y los controles (los hex coinciden con las variables de `ciclo-agua.css`). */
export const COLOR = { sol: 0xffc857, agua: 0x5ec8ff, nube: 0xd6defa, rio: 0x3de0c0, tierra: 0xc98a5a, planta: 0xc6f35e }

/** Altura de la superficie del mar según el agua que tiene (% del total). */
export const nivelMar = (mar: number) => 0.3 + 0.009 * mar

/** Por dónde baja el río: de la cima de la ladera (t = 0) a la costa (t = 1). */
export function puntoRio(t: number, salida = new THREE.Vector3()): THREE.Vector3 {
  return salida.set(1.9 - 3.1 * t, 0, 0.55 * Math.sin(t * 3.4 + 0.4))
}

/** Número pseudoaleatorio estable (para que la maqueta se vea igual cada vez). */
export function semilla(n: number) {
  let s = n
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}
