// Consola de controles (arriba a la derecha). Devuelve los `set` de cada control para que
// el teclado y el click en la vesícula mantengan la botonera sincronizada.
import { interruptorAvanzado } from '../../ui/avanzado'
import { grupo, interruptor, modal, segmentado } from '../../ui/componentes'
import { h } from '../../ui/dom'
import type { Bocados } from './bocados'
import { COMIDAS, COMO_FUNCIONA, type Comida, AYUDA_ATAJOS } from './contenido'
import type { Config } from './model'

export type Vista = 'normal' | 'explotada'
export const VELOCIDADES = [0.5, 1, 3]
const NOMBRE_VELOCIDAD = ['½×', '1×', '3×']

export interface Acciones {
  alternar(): void
  reiniciar(): void
  velocidad(v: number): void
  config(clave: keyof Config, valor: boolean): void
  vista(v: Vista): void
  bocados(n: Bocados): void
  comida(id: Comida['id']): void
}

export interface Inicial {
  comida: Comida
  config: Config
  velocidad: number
  vista: Vista
  bocados: Bocados
}


export function crearControles(ini: Inicial, a: Acciones) {
  const ayuda = modal()
  const botonPlay = h('button', { class: 'boton boton-marca', type: 'button', onclick: a.alternar }, '⏸ Pausa')
  const reloj = h('span', { class: 'etiqueta' })
  const abrirAyuda = () => ayuda.abrir(COMO_FUNCIONA)
  const abrirAtajos = () => ayuda.abrir(AYUDA_ATAJOS)

  const interruptorConfig = (texto: string, clave: keyof Config) => interruptor(texto, Boolean(ini.config[clave]), (si) => a.config(clave, si))
  const bilis = interruptorConfig('Bilis (vesícula)', 'bilis')
  const acido = interruptorConfig('Ácido gástrico', 'acidoGastrico')
  const velocidad = segmentado(
    VELOCIDADES.map((v, i) => ({ valor: String(v), texto: NOMBRE_VELOCIDAD[i] })),
    String(ini.velocidad),
    (v) => a.velocidad(Number(v)),
  )
  const vista = segmentado<Vista>(
    [{ valor: 'normal', texto: 'Normal' }, { valor: 'explotada', texto: 'Explotada' }],
    ini.vista,
    a.vista,
  )
  const bocados = segmentado<`${Bocados}`>(
    [{ valor: '1', texto: '1' }, { valor: '3', texto: '3' }],
    `${ini.bocados}`,
    (v) => a.bocados(Number(v) as Bocados),
  )

  const el = h('div', { class: 'panel consola' },
    h('div', { class: 'fila' }, botonPlay, h('button', { class: 'boton', type: 'button', onclick: a.reiniciar }, '↺ Otra vez'),
      h('button', { class: 'boton', type: 'button', 'aria-label': 'Cómo funciona', title: 'Cómo funciona (?)', onclick: abrirAyuda }, '?')),
    grupo('Velocidad', velocidad.el),
    reloj,
    grupo('Comida', segmentado(COMIDAS.map((c) => ({ valor: c.id, texto: c.nombre })), ini.comida.id, (id) => a.comida(id)).el),
    grupo('Bocados', bocados.el),
    grupo('Vista', vista.el),
    grupo('Romper el sistema', h('div', { class: 'grupo' }, bilis.el, acido.el)),
    interruptorAvanzado(),
    h('button', { class: 'boton boton-atajos', type: 'button', onclick: abrirAtajos }, '⌨ Atajos de teclado (H)'),
  )

  return {
    el,
    ayuda,
    abrirAyuda,
    abrirAtajos,
    botonPlay,
    reloj,
    set: {
      velocidad: (v: number) => velocidad.set(String(v)),
      bilis: bilis.set,
      acido: acido.set,
      vista: vista.set,
      bocados: (n: Bocados) => bocados.set(`${n}`),
    },
  }
}
