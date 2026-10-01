/** Una referencia: texto (HTML propio) y, si se consultó en línea, el link. */
export interface Fuente {
  texto: string
  url?: string
}

/** Sección "Fuentes" para el final de "¿Cómo funciona?": de dónde salen los datos del lab (detalle en docs/fuentes.md). */
export function fuentes(lista: Fuente[]): string {
  const items = lista.map((f) => {
    const nombre = `Abrir la fuente: ${f.texto.replace(/<[^>]+>/g, '').split(':')[0]}`
    return `<li>${f.texto}${f.url ? ` <a href="${f.url}" target="_blank" rel="noopener" aria-label="${nombre}" title="${nombre}">↗</a>` : ''}</li>`
  })
  return `<h3>Fuentes</h3><ul class="fuentes">${items.join('')}</ul>`
}
