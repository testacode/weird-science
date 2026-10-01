// Atajos de teclado. La lista se muestra en el modal "¿Cómo funciona?".
export const ATAJOS = [
  { tecla: 'Espacio', texto: 'Play / pausa' },
  { tecla: '1 · 2 · 3', texto: 'Velocidad ½× · 1× · 3×' },
  { tecla: 'R', texto: 'Reiniciar' },
  { tecla: 'B', texto: 'Bilis: sí / no' },
  { tecla: 'A', texto: 'Ácido gástrico: sí / no' },
  { tecla: 'E', texto: 'Vista normal / explotada' },
  { tecla: '?', texto: 'Abrir o cerrar esta ayuda' },
]

export interface AccionesTeclado {
  alternar(): void
  velocidad(indice: number): void
  reiniciar(): void
  bilis(): void
  acido(): void
  vista(): void
  ayuda(): void
  /** Hay un diálogo abierto: solo `?` hace algo. */
  modalAbierto(): boolean
}

function escribiendo(): boolean {
  const el = document.activeElement
  return el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

/** Con un botón o link enfocado, la barra espaciadora es suya (lo activa): no la usamos para play/pausa. */
function controlEnfocado(): boolean {
  const el = document.activeElement
  return el instanceof HTMLElement && ['BUTTON', 'A', 'SUMMARY'].includes(el.tagName)
}

export function instalarTeclado(a: AccionesTeclado) {
  const valida = (e: KeyboardEvent) => !(e.metaKey || e.ctrlKey || e.altKey || escribiendo())
  window.addEventListener('keydown', (e) => {
    if (!valida(e)) return
    const k = e.key.toLowerCase()
    if (k === '?') return a.ayuda()
    if (a.modalAbierto()) return
    if (e.key === ' ') {
      if (controlEnfocado()) return
      e.preventDefault()
      return e.repeat ? undefined : a.alternar()
    }
    if (e.repeat) return
    if (k >= '1' && k <= '3') a.velocidad(Number(k) - 1)
    else if (k === 'r') a.reiniciar()
    else if (k === 'b') a.bilis()
    else if (k === 'a') a.acido()
    else if (k === 'e') a.vista()
  })
}
