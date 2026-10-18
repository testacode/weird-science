let region: HTMLElement | null = null

/** Avisa a los lectores de pantalla (región `aria-live` oculta a la vista) algo que aparece sin mover el foco. */
export function anunciar(texto: string) {
  if (!region) {
    region = document.createElement('div')
    region.className = 'solo-lector'
    region.setAttribute('aria-live', 'polite')
    document.body.append(region)
  }
  region.textContent = texto
}
