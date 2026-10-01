// Atajos de teclado del lab. La lista se muestra en el modal "¿Cómo funciona?".
import { instalarAtajos, type Atajo } from '../../ui/teclado'

export const ATAJOS = {
  escena: { teclas: ['1', '2', '3'], etiqueta: '1 · 2 · 3', texto: 'Espejo · Refracción · Lápiz' },
  reiniciar: { teclas: ['r'], etiqueta: 'R', texto: 'Restablecer' },
  ayuda: { teclas: ['?'], etiqueta: '?', texto: 'Abrir o cerrar «¿Cómo funciona?»' },
} satisfies Record<string, Atajo>

export interface AccionesTeclado {
  escena(indice: number): void
  reiniciar(): void
  ayuda(): void
}

export function instalarTeclado(a: AccionesTeclado) {
  instalarAtajos([
    { ...ATAJOS.escena, accion: (tecla) => a.escena(Number(tecla) - 1) },
    { ...ATAJOS.reiniciar, accion: a.reiniciar },
    // Con la ayuda abierta, `?` la cierra.
    { ...ATAJOS.ayuda, accion: a.ayuda, conModal: true },
  ])
}
