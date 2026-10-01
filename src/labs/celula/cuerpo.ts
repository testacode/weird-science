/** El espacio que ocupa la célula, para que las partículas la respeten. Coordenadas locales (el origen es el centro de la célula). */
export interface Cuerpo {
  /** Menor que 1 adentro, mayor que 1 afuera. */
  f(x: number, y: number, z: number): number
  /** Semiejes de la caja que lo contiene. */
  hx: number
  hy: number
  hz: number
}

/** Geometría del vaso (mundo): la célula flota en el centro. */
export const VASO = { radio: 1.9, base: 0.3, tope: 3.4, liquido: 3.05, centroY: 1.7 }
