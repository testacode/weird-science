import * as THREE from 'three'
import type { ColorLuz } from './model'

/** Color real de la lámpara para cada opción. */
export const LUZ_HEX: Record<ColorLuz, number> = { blanca: 0xfff3dc, roja: 0xff4136, azul: 0x4b7dff, verde: 0x34ff6b }
/** La luz blanca que rebota en la hoja sale verde: la clorofila se quedó con el rojo y el azul. */
export const REBOTE_HEX = 0x7dff8a
export const BURBUJA_HEX = 0x8fdcff
export const CO2_HEX = 0xff5fa2
export const CLOROFILA_HEX = 0x8dff5a

/** Geometría de la maqueta (1 unidad ≈ 5 cm, pero la lámpara está comprimida para que entre en pantalla). */
export const VASO = { radio: 1.25, alto: 4.1, nivel: 3.5 }
export const PLANTA = { base: new THREE.Vector3(0, 0.3, 0), corte: new THREE.Vector3(0.04, 2.25, 0) }
export const ALTURA_LAMPARA = 1.4
/** Posición x del cabezal de la lámpara para una distancia en cm. */
export const lamparaX = (cm: number) => 1.6 + (cm - 10) * 0.075
