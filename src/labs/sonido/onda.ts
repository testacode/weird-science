// Cómo se ven moverse las partículas: campos de desplazamiento y de compresión de una onda longitudinal.
// Es visualización: el desplazamiento está exagerado (el real es de micrómetros) y la frecuencia, en cámara lenta.

import { PULSO_S, T_EMISION } from './model'

/** Unidades de la escena por metro: los 10 m del tubo miden 8,4. */
export const U_POR_M = 0.84
/** Frecuencia con la que se ve vibrar un tono (Hz de pantalla); la real se muestra como "cámara lenta ×N". */
export const F_VISUAL = 1.5
/** Desplazamiento máximo dibujado, en unidades de la escena. */
const DESPLAZ_MAX = 0.3
/** El pulso de un golpe es ancho en el agua y el acero: necesita más recorrido para que se note la compresión. */
const DESPLAZ_MAX_GOLPE = 0.7
/** Compresión máxima (variación relativa de la densidad) que se dibuja con la fuente al 100 %. */
const COMPRESION_MAX = 0.85
/** La compresión dibujada crece con la raíz de la amplitud: así una fuente suave todavía se ve (el real es proporcional y minúsculo). */
const kappa = (amplitud: number) => COMPRESION_MAX * Math.sqrt(amplitud)

/** Desplazamiento (`dx`, unidades) y compresión relativa (`c`, + comprime, − se separa) de la partícula en reposo en `x0`. */
export const campo = { dx: 0, c: 0 }

/** Cuánto se ve la onda de un tono: se apaga cuando la longitud de onda es menor que unas pocas separaciones entre partículas. */
export function visibilidad(lambdaU: number, separacion: number): number {
  return Math.min(1, Math.max(0, (lambdaU / separacion - 4) / 6))
}

/** Tono: ξ = a·sin(2π·f_visual·t − k·x). `fase` = 2π·f_visual·t. */
export function tono(x0: number, v: number, f: number, amplitud: number, fase: number, vis: number) {
  const lambdaU = (v / f) * U_POR_M
  const k = (2 * Math.PI) / lambdaU
  const a = Math.min((kappa(amplitud) * lambdaU) / (2 * Math.PI), DESPLAZ_MAX) * vis
  const phi = fase - k * x0
  campo.dx = a * Math.sin(phi)
  campo.c = a * k * Math.cos(phi)
}

/** Golpe: ξ = a·exp(−τ²/2σ²) con τ = t − t_emisión − x/v. La compresión va adelante del pico y la rarefacción detrás. */
export function golpe(x0: number, v: number, amplitud: number, t: number) {
  const vU = v * U_POR_M
  const sigmaX = PULSO_S * vU
  const tau = t - T_EMISION - x0 / vU
  const g = Math.exp((-tau * tau) / (2 * PULSO_S * PULSO_S))
  const a = Math.min((kappa(amplitud) * sigmaX) / 0.607, DESPLAZ_MAX_GOLPE)
  campo.dx = a * g
  campo.c = -(a * tau * g) / (PULSO_S * PULSO_S * vU)
}
