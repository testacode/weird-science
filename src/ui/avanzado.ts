import { interruptor } from './componentes'

const CLAVE = 'ws-avanzado'

/** Marca un fragmento de HTML como "info avanzada": se oculta cuando el filtro está apagado. */
export function av(html: string): string {
  return `<span class="avanzado">${html}</span>`
}

function leer(): boolean {
  try {
    return localStorage.getItem(CLAVE) !== 'no'
  } catch {
    return true
  }
}

function aplicar(activo: boolean) {
  document.body.classList.toggle('sin-avanzado', !activo)
}

/**
 * Interruptor "Info avanzada: Sí/No" para la consola de controles. Se guarda en
 * localStorage y vale para todos los labs. Lo marcado con la clase `avanzado` (o con `av()`)
 * se oculta por CSS cuando está en No.
 */
export function interruptorAvanzado(): HTMLElement {
  const inicial = leer()
  aplicar(inicial)
  return interruptor('Info avanzada', inicial, (si) => {
    aplicar(si)
    try {
      localStorage.setItem(CLAVE, si ? 'si' : 'no')
    } catch {
      // sin localStorage (modo privado): el filtro sigue funcionando en esta pestaña.
    }
  }).el
}
