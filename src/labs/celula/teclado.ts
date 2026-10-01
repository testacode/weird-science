// Atajos de teclado del lab. La lista se muestra en el modal "¿Cómo funciona?".
import { instalarAtajos, type Atajo } from '../../ui/teclado'

export const ATAJOS = {
  alternar: { teclas: [' '], etiqueta: 'Espacio', texto: 'Play / pausa' },
  velocidad: { teclas: ['1', '2', '3'], etiqueta: '1 · 2 · 3', texto: 'Velocidad ½× · 1× · 3×' },
  reiniciar: { teclas: ['r'], etiqueta: 'R', texto: 'Otra célula' },
  celula: { teclas: ['c'], etiqueta: 'C', texto: 'Glóbulo rojo / célula vegetal' },
  membrana: { teclas: ['m'], etiqueta: 'M', texto: 'Membrana selectiva: sí / no' },
  pared: { teclas: ['p'], etiqueta: 'P', texto: 'Pared celular: sí / no (vegetal)' },
  ayuda: { teclas: ['?'], etiqueta: '?', texto: 'Abrir o cerrar «¿Cómo funciona?»' },
  atajos: { teclas: ['h'], etiqueta: 'H', texto: 'Ver u ocultar estos atajos' },
} satisfies Record<string, Atajo>

export interface AccionesTeclado {
  alternar(): void
  velocidad(indice: number): void
  reiniciar(): void
  celula(): void
  membrana(): void
  pared(): void
  ayuda(): void
  atajos(): void
}

export function instalarTeclado(a: AccionesTeclado) {
  instalarAtajos([
    { ...ATAJOS.alternar, accion: a.alternar },
    { ...ATAJOS.velocidad, accion: (tecla) => a.velocidad(Number(tecla) - 1) },
    { ...ATAJOS.reiniciar, accion: a.reiniciar },
    { ...ATAJOS.celula, accion: a.celula },
    { ...ATAJOS.membrana, accion: a.membrana },
    { ...ATAJOS.pared, accion: a.pared },
    // Con la ayuda abierta, `?` la cierra.
    { ...ATAJOS.ayuda, accion: a.ayuda, conModal: true },
    // Con la lista de atajos abierta, `H` la cierra.
    { ...ATAJOS.atajos, accion: a.atajos, conModal: true },
  ])
}
