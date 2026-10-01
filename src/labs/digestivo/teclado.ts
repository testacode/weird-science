// Atajos de teclado del lab. La lista se muestra en el modal "¿Cómo funciona?".
import { instalarAtajos, type Atajo } from '../../ui/teclado'

export const ATAJOS = {
  alternar: { teclas: [' '], etiqueta: 'Espacio', texto: 'Play / pausa' },
  velocidad: { teclas: ['1', '2', '3'], etiqueta: '1 · 2 · 3', texto: 'Velocidad ½× · 1× · 3×' },
  reiniciar: { teclas: ['r'], etiqueta: 'R', texto: 'Reiniciar' },
  bilis: { teclas: ['b'], etiqueta: 'B', texto: 'Bilis: sí / no' },
  acido: { teclas: ['a'], etiqueta: 'A', texto: 'Ácido gástrico: sí / no' },
  vista: { teclas: ['e'], etiqueta: 'E', texto: 'Vista normal / explotada' },
  ayuda: { teclas: ['?'], etiqueta: '?', texto: 'Abrir o cerrar esta ayuda' },
} satisfies Record<string, Atajo>

export interface AccionesTeclado {
  alternar(): void
  velocidad(indice: number): void
  reiniciar(): void
  bilis(): void
  acido(): void
  vista(): void
  ayuda(): void
}

export function instalarTeclado(a: AccionesTeclado) {
  instalarAtajos([
    { ...ATAJOS.alternar, accion: a.alternar },
    { ...ATAJOS.velocidad, accion: (tecla) => a.velocidad(Number(tecla) - 1) },
    { ...ATAJOS.reiniciar, accion: a.reiniciar },
    { ...ATAJOS.bilis, accion: a.bilis },
    { ...ATAJOS.acido, accion: a.acido },
    { ...ATAJOS.vista, accion: a.vista },
    // Con la ayuda abierta, `?` la cierra.
    { ...ATAJOS.ayuda, accion: a.ayuda, conModal: true },
  ])
}
