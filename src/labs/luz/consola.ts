// Consola de controles: escena, ángulo del láser, medio, "romper el sistema" e info avanzada.

import { interruptorAvanzado } from '../../ui/avanzado'
import { interruptorPreguntas } from '../../ui/prediccion'
import { fila, grupo, segmentado } from '../../ui/componentes'
import { deslizador } from '../../ui/deslizador'
import { h } from '../../ui/dom'
import { num } from './contenido'
import { ANGULO_MAX, MEDIOS, N_AIRE, sinDesvio, N_INVENTADO, OJO_MAX, ORDEN_MEDIOS, type Config, type Desde, type Escena, type IdMedio } from './model'
import { COLOR_MEDIO } from './maqueta'

export interface Acciones {
  cambiar: (parcial: Partial<Config>) => void
  reiniciar: () => void
  ayuda: () => void
}

export const ESCENAS: { valor: Escena; texto: string }[] = [
  { valor: 'espejo', texto: 'Espejo' },
  { valor: 'refraccion', texto: 'Refracción' },
  { valor: 'lapiz', texto: 'Lápiz' },
]
const GIROS = [0, 10, 20]

export function crearConsola(a: Acciones, inicial: Config) {
  const escena = segmentado(ESCENAS, inicial.escena, (v) => a.cambiar({ escena: v }))
  const angulo = deslizador({
    titulo: 'Ángulo del láser (desde la normal)', min: 0, max: ANGULO_MAX, paso: 1, valor: inicial.angulo, color: 'var(--ambar)',
    formato: (v) => `${num(v, 0)}°`, alCambiar: (v) => a.cambiar({ angulo: v }),
  })
  const ojo = deslizador({
    titulo: 'Desde dónde mira el ojo', min: 0, max: OJO_MAX, paso: 1, valor: inicial.ojo, color: 'var(--cielo)',
    formato: (v) => (v === 0 ? 'de arriba' : `${num(v, 0)}°`), alCambiar: (v) => a.cambiar({ ojo: v }),
  })
  const desde = segmentado<Desde>([{ valor: 'aire', texto: 'En el aire' }, { valor: 'medio', texto: 'Adentro del medio' }], inicial.desde, (v) => a.cambiar({ desde: v }))
  const medios = segmentado<IdMedio>(
    ORDEN_MEDIOS.map((id) => ({ valor: id, texto: id === 'inventado' ? 'Inventado' : MEDIOS[id].nombre })),
    inicial.medio, (v) => a.cambiar({ medio: v }),
  )
  medios.el.classList.add('medios')
  medios.el.querySelectorAll('button').forEach((b, i) => b.style.setProperty('--muestra', `#${COLOR_MEDIO[ORDEN_MEDIOS[i]].toString(16).padStart(6, '0')}`))
  const giro = segmentado(GIROS.map((g) => ({ valor: String(g), texto: g === 0 ? 'Derecho' : `${g}°` })), String(inicial.espejo), (v) => a.cambiar({ espejo: Number(v) }))
  const nInventado = deslizador({
    titulo: 'Índice inventado', min: N_INVENTADO.min, max: N_INVENTADO.max, paso: 0.01, valor: inicial.nInventado, color: 'var(--magenta)',
    formato: (v) => num(v, 2), nota: (v) => (sinDesvio(v, N_AIRE) ? 'como el aire' : ''), alCambiar: (v) => a.cambiar({ nInventado: v, medio: 'inventado' }),
  })

  const filaDesde = fila('Láser', desde.el, 'laser')
  const grupoEspejo = grupo('Girar el espejo', giro.el)
  const grupoMedio = grupo('Medio', medios.el)
  const grupoRomper = grupo('Romper el sistema', h('div', { class: 'grupo' }, grupoEspejo, nInventado.el))

  const el = h('div', { class: 'panel consola' },
    h('div', { class: 'fila' },
      h('button', { class: 'boton', type: 'button', onclick: a.reiniciar }, '↺ Restablecer'),
      h('button', { class: 'boton', type: 'button', 'aria-label': 'Cómo funciona', onclick: a.ayuda }, '?')),
    grupo('Escena', escena.el),
    angulo.el,
    ojo.el,
    filaDesde,
    grupoMedio,
    grupoRomper,
    interruptorAvanzado(),
    interruptorPreguntas(),
  )

  return {
    el,
    /** Deja todo lo que se ve en la consola igual que `config`, también cuando el cambio vino de otro control. */
    sincronizar(c: Config) {
      escena.set(c.escena)
      angulo.set(c.angulo)
      ojo.set(c.ojo)
      desde.set(c.desde)
      medios.set(c.medio)
      giro.set(String(c.espejo))
      nInventado.set(c.nInventado)
      angulo.el.hidden = c.escena === 'lapiz'
      ojo.el.hidden = c.escena !== 'lapiz'
      filaDesde.hidden = c.escena !== 'refraccion'
      grupoMedio.hidden = c.escena === 'espejo'
      grupoEspejo.hidden = c.escena !== 'espejo'
      nInventado.el.hidden = c.escena === 'espejo'
    },
  }
}
