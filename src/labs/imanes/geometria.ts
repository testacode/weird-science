// Del modelo (cm, y hacia el norte) a la maqueta (unidades de la escena, z hacia el frente).
import { LADO } from './model'

/** Unidades de escena por cm. */
export const ESC = 0.4
/** El centro de la maqueta cae en x = 3 cm: entre el extremo de A y el lugar típico de B. */
const X_CENTRO = 3
export const aX = (x: number) => (x - X_CENTRO) * ESC
export const aZ = (y: number) => -y * ESC
/** Alto (y de escena) de un imán apoyado en la mesada. */
export const ALTO_IMAN = LADO * ESC

/** N = magenta, S = cielo: el mismo color en el imán, las pastillas, el texto y las agujas. */
export const COLOR_N = 0xff5fa2
export const COLOR_S = 0x5ec8ff
export const GRIS_SIN_IMAN = 0x59645f
