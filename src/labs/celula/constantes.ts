// Constantes del modelo. Cada una dice si es un dato verificado (detalle en docs/fuentes.md) o un parámetro de ajuste.

// --- Datos verificados ---
/** Masa molar del NaCl (g/mol). */
export const MASA_MOLAR_NACL = 58.44
/** Coeficiente osmótico del NaCl: corrige el comportamiento no ideal (el suero 0,9 % da 286 y no 308 mOsm/L). */
export const PHI_NACL = 0.93
/** Suero fisiológico: 0,9 % m/V de NaCl, "casi isotónico" con la sangre (≈ 285–290 mOsm). */
export const PCT_SUERO = 0.9
/** Glóbulo rojo: volumen medio 90 fL y, sin estirar la membrana, esfera de 150 fL. */
export const VOLUMEN_GR_FL = 90
export const VOLUMEN_ESFERA_GR_FL = 150
/** Fracción del volumen que no responde a la ósmosis (valor aparente de Boyle–van't Hoff). */
export const FRACCION_INACTIVA_GR = 0.5
/** Volumen (× el normal) al que la membrana ya no aguanta: la esfera de 150 fL. */
export const V_ROTURA = VOLUMEN_ESFERA_GR_FL / VOLUMEN_GR_FL
/** Hemólisis en agua pura: la célula tarda unos 0,6 s en romperse (Anderson y Lovrien, 1977). */
export const SEGUNDOS_HEMOLISIS_AGUA = 0.6

// --- Parámetros del modelo (aproximados o de ajuste) ---
/** Concentración de NaCl (% m/V) que deja a una célula de cebolla justo al borde de la plasmólisis: orden de magnitud (≈ 0,2 mol/L), sin verificar en navegador. */
export const PCT_PLASMOLISIS_VEGETAL = 1.17
/** Módulo de elasticidad de la pared relativo a la presión osmótica de la célula (≈ 10 MPa / 0,9 MPa): orden de magnitud. */
export const RIGIDEZ_PARED = 11
/** Constante de permeabilidad al agua (1/s) del glóbulo: ajustada para que el estallido en agua pura tarde ≈ SEGUNDOS_HEMOLISIS_AGUA. */
export const K_AGUA_GLOBULO = 1.8
/** Ídem para la célula vegetal: parámetro de ajuste, sin dato. */
export const K_AGUA_VEGETAL = 0.3
/** Permeabilidad (1/s) de una membrana que deja pasar el soluto: parámetro de ajuste. */
export const K_SOLUTO = 4.0
/** Segundos de la célula que pasan por cada segundo en pantalla a 1×. */
export const RITMO_GLOBULO = 0.12
export const RITMO_VEGETAL = 0.6

/** Osmolaridad (mOsm/L) de una solución de NaCl al `pct` % m/V: 2 iones × coeficiente osmótico. */
export function osmolaridad(pct: number): number {
  return ((pct * 10) / MASA_MOLAR_NACL) * 2 * PHI_NACL * 1000
}
