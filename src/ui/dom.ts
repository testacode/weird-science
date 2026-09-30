type Hijo = Node | string | null | undefined | false

/** Crea un elemento con atributos e hijos. Los atributos `on*` se registran como listeners. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | boolean | EventListener> = {},
  ...hijos: Hijo[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const [clave, valor] of Object.entries(attrs)) {
    if (typeof valor === 'function') el.addEventListener(clave.slice(2).toLowerCase(), valor)
    else if (valor === true) el.setAttribute(clave, '')
    else if (valor !== false) el.setAttribute(clave, valor)
  }
  for (const hijo of hijos) if (hijo) el.append(hijo)
  return el
}
