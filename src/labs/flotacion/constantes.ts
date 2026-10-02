import type { IdLiquido, IdObjeto } from './model'

/** Color de cada objeto en la maqueta y en la muestra de su botón (no son los colores de las fuerzas). */
export const COLOR_OBJETO: Record<IdObjeto, number> = {
  madera: 0xa9692f,
  hielo: 0x6fb8d6,
  plastico: 0xe8504a,
  piedra: 0x5f6965,
  metal: 0x66717b,
  barco: 0x5b7690,
  huevo: 0xc4935c,
}

/** Colores con significado: peso (magenta) y empuje (cielo), iguales en flechas, métricas, gráfico y texto. */
export const COLOR_PESO = 0xff5fa2
export const COLOR_EMPUJE = 0x5ec8ff

/** Cada líquido tiene su color: agua celeste, salada más profunda, aceite ámbar, alcohol lila. */
export const COLOR_LIQUIDO: Record<IdLiquido, number> = { agua: 0x35a4de, aceite: 0xffc857, alcohol: 0xb9a8ff }
export const COLOR_AGUA_SALADA = 0x2f95b8

