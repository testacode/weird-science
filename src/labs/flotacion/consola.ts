// Consola de controles: objeto, líquido, sal, tamaño, "romper el sistema" e info avanzada.

import { av, interruptorAvanzado } from '../../ui/avanzado'
import { grupo, interruptor, segmentado } from '../../ui/componentes'
import { deslizador } from '../../ui/deslizador'
import { h } from '../../ui/dom'
import { hex } from '../../ui/formato'
import { interruptorPreguntas } from '../../ui/prediccion'
import { COLOR_LIQUIDO, COLOR_OBJETO } from './constantes'
import { newtons, num } from './contenido'
import {
  OBJETOS, ORDEN_OBJETOS, PLANETAS, SAL_MAR, SAL_MAX, VOLUMEN, dimensiones, densidadLiquido,
  type Config, type IdObjeto, type Planeta,
} from './model'

export interface Acciones {
  cambiar: (parcial: Partial<Config>) => void
  soltar: () => void
  alternar: () => void
  ayuda: () => void
}

type Tipo = 'dulce' | 'salada' | 'aceite' | 'alcohol'
const tipoDe = (c: Config): Tipo => (c.liquido === 'agua' ? (c.sal > 0 ? 'salada' : 'dulce') : c.liquido)


export function crearConsola(a: Acciones, inicial: Config) {
  let config = inicial
  const objeto = segmentado(
    ORDEN_OBJETOS.map((id) => ({ valor: id, texto: OBJETOS[id].nombre, muestra: hex(COLOR_OBJETO[id]) })),
    inicial.objeto, (v: IdObjeto) => a.cambiar({ objeto: v }),
  )
  objeto.el.classList.add('objetos')
  const liquido = segmentado<Tipo>(
    [
      { valor: 'dulce', texto: 'Agua dulce', muestra: hex(COLOR_LIQUIDO.agua) },
      { valor: 'salada', texto: 'Agua salada', muestra: hex(COLOR_LIQUIDO.agua) },
      { valor: 'aceite', texto: 'Aceite', muestra: hex(COLOR_LIQUIDO.aceite) },
      { valor: 'alcohol', texto: 'Alcohol', muestra: hex(COLOR_LIQUIDO.alcohol) },
    ],
    tipoDe(inicial),
    (v) => a.cambiar(v === 'dulce' ? { liquido: 'agua', sal: 0 } : v === 'salada' ? { liquido: 'agua', sal: config.sal > 0 ? config.sal : SAL_MAR } : { liquido: v }),
  )
  liquido.el.classList.add('liquidos')
  const sal = deslizador({
    titulo: 'Agregar sal', min: 0, max: SAL_MAX, paso: 0.5, valor: inicial.sal, color: 'var(--cielo)', clase: 'sal',
    formato: (v) => `${num(v, 1)} %`,
    nota: (v) => `${v === SAL_MAR ? 'como el mar · ' : ''}${av(`ρ ${num(densidadLiquido({ liquido: 'agua', sal: v }), 0)}`)}`,
    alCambiar: (v) => a.cambiar({ liquido: 'agua', sal: v }),
  })
  const tamano = deslizador({
    titulo: 'Tamaño del objeto', min: VOLUMEN.min, max: VOLUMEN.max, paso: 20, valor: inicial.volumen,
    formato: (v) => `${num(v, 0)} cm³`,
    nota: (v) => `pesa ${newtons(dimensiones({ ...config, volumen: v }).masa * PLANETAS[config.planeta].g)} N`,
    alCambiar: (v) => a.cambiar({ volumen: v }),
  })
  const agujero = interruptor('Barco agujereado', false, (si) => a.cambiar({ agujero: si }))
  const planeta = segmentado<Planeta>(
    (Object.keys(PLANETAS) as Planeta[]).map((p) => ({ valor: p, texto: PLANETAS[p].nombre })), inicial.planeta, (v) => a.cambiar({ planeta: v }),
  )

  const botonPlay = h('button', { class: 'boton boton-marca', type: 'button', onclick: a.alternar }, '⏸ Pausa')
  const reloj = h('span', { class: 'etiqueta' })
  const el = h('div', { class: 'panel consola' },
    h('div', { class: 'fila' }, botonPlay, h('button', { class: 'boton', type: 'button', onclick: a.soltar }, '↧ Soltar de nuevo'),
      h('button', { class: 'boton', type: 'button', 'aria-label': 'Cómo funciona', onclick: a.ayuda }, '?')),
    reloj,
    grupo('Objeto', objeto.el),
    grupo('Líquido', liquido.el),
    sal.el,
    tamano.el,
    grupo('Romper el sistema', h('div', { class: 'grupo' },
      agujero.el,
      h('div', { class: 'grupo' }, h('span', {}, 'Cambiar de planeta'), planeta.el))),
    interruptorAvanzado(),
    interruptorPreguntas(),
  )

  return {
    el,
    /** Deja todo lo que se ve en la consola igual que `config`, también cuando el cambio vino de otro control. */
    sincronizar(c: Config) {
      config = c
      objeto.set(c.objeto)
      liquido.set(tipoDe(c))
      sal.set(c.sal)
      sal.input.disabled = c.liquido !== 'agua'
      tamano.set(c.volumen)
      agujero.set(c.agujero)
      planeta.set(c.planeta)
    },
    setPlay: (texto: string) => (botonPlay.textContent = texto),
    setReloj: (texto: string) => (reloj.textContent = texto),
  }
}
