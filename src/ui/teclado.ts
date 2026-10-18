export interface Atajo {
  /** Valores de `KeyboardEvent.key` en minúscula que lo disparan. La barra espaciadora es `' '`. */
  teclas: string[]
  /** Cómo se muestra la tecla en la ayuda: "Espacio", "1 · 2 · 3". */
  etiqueta: string
  texto: string
}

export interface AtajoActivo extends Atajo {
  /** Recibe la tecla apretada (útil cuando varias teclas comparten atajo). */
  accion: (tecla: string) => void
  /** Funciona también con un modal abierto (p. ej. la tecla que abre y cierra la ayuda). */
  conModal?: boolean
}

/** Lista de atajos para el modal de ayuda (HTML). */
export function listaAtajos(atajos: Atajo[]): string {
  return `<ul class="atajos">${atajos.map((a) => `<li><kbd>${a.etiqueta}</kbd> ${a.texto}</li>`).join('')}</ul>`
}

/** Inputs que no reciben texto: con uno enfocado (un deslizador tras tocarlo) los atajos siguen andando. */
const SIN_TEXTO = ['range', 'checkbox', 'radio', 'button', 'submit', 'reset', 'color', 'file']

function escribiendo(): boolean {
  const el = document.activeElement
  if (!(el instanceof HTMLElement)) return false
  if (el instanceof HTMLInputElement) return !SIN_TEXTO.includes(el.type)
  return el.isContentEditable || ['TEXTAREA', 'SELECT'].includes(el.tagName)
}

/** Con un botón, link o input activable (checkbox, radio…) enfocado, la barra espaciadora es suya (lo activa). El deslizador no la usa. */
function controlEnfocado(): boolean {
  const el = document.activeElement
  if (el instanceof HTMLInputElement) return el.type !== 'range' && SIN_TEXTO.includes(el.type)
  return el instanceof HTMLElement && ['BUTTON', 'A', 'SUMMARY'].includes(el.tagName)
}

const hayModal = () => document.querySelector('dialog[open]') !== null

/**
 * Atajos de teclado para toda la ventana. Ignora Cmd/Ctrl/Alt, lo que se escribe en un campo y la
 * repetición de una tecla sostenida. Con un modal abierto solo andan los atajos `conModal`.
 */
export function instalarAtajos(atajos: AtajoActivo[], modalAbierto: () => boolean = hayModal) {
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || escribiendo()) return
    const tecla = e.key.toLowerCase()
    const atajo = atajos.find((a) => a.teclas.includes(tecla))
    if (!atajo || (!atajo.conModal && modalAbierto())) return
    if (tecla === ' ') {
      if (controlEnfocado()) return
      e.preventDefault()
    }
    if (!e.repeat) atajo.accion(tecla)
  })
}
