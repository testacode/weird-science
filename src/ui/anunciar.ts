/** Región `aria-live` oculta a la vista. Se crea vacía al cargar el módulo: los lectores ignoran una región que nace ya con texto. */
const region = document.createElement('div')
region.className = 'solo-lector'
region.setAttribute('aria-live', 'polite')
document.body.append(region)

let cuadro = 0

/** Avisa a los lectores de pantalla algo que aparece sin mover el foco. El texto entra en el próximo cuadro, con la región ya registrada. */
export function anunciar(texto: string) {
  cancelAnimationFrame(cuadro)
  region.textContent = ''
  cuadro = requestAnimationFrame(() => (region.textContent = texto))
}

/** Vacía la región (y cancela un aviso pendiente): lo anunciado ya no está en pantalla. */
export function silenciar() {
  cancelAnimationFrame(cuadro)
  region.textContent = ''
}
