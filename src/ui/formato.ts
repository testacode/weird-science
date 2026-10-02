/** Color de three.js (0xRRGGBB) como color CSS ("#rrggbb"). */
export const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`

/** Número en formato es-AR: coma decimal, punto de miles y signo menos tipográfico ("−0,5"). */
export function numero(n: number, decimales = 1): string {
  // Un negativo que redondea a cero no lleva signo.
  const v = Math.abs(n) < 0.5 * 10 ** -decimales ? 0 : n
  return v.toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).replace('-', '−')
}
