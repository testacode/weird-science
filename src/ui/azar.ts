/** Copia de `lista` en orden al azar (Fisher-Yates, sin sesgo). */
export function mezclar<T>(lista: T[]): T[] {
  const m = [...lista]
  for (let i = m.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[m[i], m[j]] = [m[j], m[i]]
  }
  return m
}
