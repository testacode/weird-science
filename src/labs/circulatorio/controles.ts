import { interruptorAvanzado } from '../../ui/avanzado'
import { interruptorPreguntas } from '../../ui/prediccion'
import { grupo, segmentado } from '../../ui/componentes'
import { deslizador } from '../../ui/deslizador'
import { h } from '../../ui/dom'
import { numero } from '../../ui/formato'
import { ACTIVIDADES, LIMITES, gradoFuga, tamanoAgujero, type Actividad, type Config, type Defecto } from './model'

export interface Manejadores {
  pedir: (cambio: Partial<Config>) => void
  /** Pone la frecuencia y el volumen típicos de la actividad elegida. */
  tipico: () => void
  reiniciar: () => void
  alternar: () => void
  ayuda: () => void
}

const DEFECTOS: { valor: Defecto; texto: string }[] = [
  { valor: 'ninguno', texto: 'Sano' },
  { valor: 'valvula', texto: 'Válvula con fuga' },
  { valor: 'tabique', texto: 'Tabique con agujero' },
]

/** Consola de controles. `sincronizar` deja lo que se ve igual que la config (también cuando el cambio vino de otro lado). */
export function crearControles(inicial: Config, m: Manejadores) {
  const botonPlay = h('button', { class: 'boton boton-marca', type: 'button', onclick: m.alternar }, '⏸ Pausa')
  const reloj = h('span', { class: 'etiqueta' })
  let defecto = inicial.defecto

  const frecuencia = deslizador({
    titulo: 'Frecuencia', min: LIMITES.frecuencia[0], max: LIMITES.frecuencia[1], paso: 1, valor: inicial.frecuencia,
    formato: (v) => `${v} por min`, nota: (v) => (v >= 60 && v <= 100 ? 'en reposo' : ''), alCambiar: (v) => m.pedir({ frecuencia: v }),
  })
  const volumen = deslizador({
    titulo: 'Volumen de cada latido', min: LIMITES.volumen[0], max: LIMITES.volumen[1], paso: 1, valor: inicial.volumen,
    formato: (v) => `${v} mL`, nota: (v) => (Math.abs(v - 70) <= 10 ? 'en reposo' : ''), alCambiar: (v) => m.pedir({ volumen: v }),
  })
  const actividad = segmentado<Actividad>(
    (Object.keys(ACTIVIDADES) as Actividad[]).map((a) => ({ valor: a, texto: ACTIVIDADES[a].nombre })), inicial.actividad, (a) => m.pedir({ actividad: a }),
  )
  const botonTipico = h('button', { class: 'boton', type: 'button', onclick: m.tipico }, 'Valores típicos de esta actividad')
  const tipoDefecto = segmentado<Defecto>(DEFECTOS, inicial.defecto, (v) => m.pedir({ defecto: v }))
  const gravedad = deslizador({
    titulo: 'Gravedad', min: LIMITES.gravedad[0] * 100, max: LIMITES.gravedad[1] * 100, paso: 5, valor: inicial.gravedad * 100, clase: 'gravedad',
    formato: (v) => (defecto === 'valvula' ? `vuelve el ${v} %` : defecto === 'tabique' ? `pasa el ${v} %` : '—'),
    nota: (v) => (defecto === 'valvula' ? gradoFuga(v / 100) : defecto === 'tabique' ? `${tamanoAgujero(1 / (1 - v / 100))}, Qp:Qs ${numero(1 / (1 - v / 100), 1)}:1` : ''),
    alCambiar: (v) => m.pedir({ gravedad: v / 100 }),
  })

  const grupoActividad = grupo('Actividad', h('div', { class: 'grupo' }, actividad.el, botonTipico))
  grupoActividad.classList.add('act')
  const grupoRomper = grupo('Romper el sistema', h('div', { class: 'grupo' }, tipoDefecto.el, gravedad.el))
  grupoRomper.classList.add('romper')

  const el = h('div', { class: 'panel consola' },
    h('div', { class: 'fila' }, botonPlay, h('button', { class: 'boton', type: 'button', onclick: m.reiniciar }, '↺ Restablecer'),
      h('button', { class: 'boton', type: 'button', 'aria-label': 'Cómo funciona', onclick: m.ayuda }, '?')),
    reloj,
    frecuencia.el,
    volumen.el,
    grupoActividad,
    grupoRomper,
    interruptorAvanzado(),
    interruptorPreguntas(),
  )

  return {
    el,
    sincronizar(c: Config, corriendo: boolean) {
      defecto = c.defecto
      frecuencia.set(c.frecuencia)
      volumen.set(c.volumen)
      actividad.set(c.actividad)
      tipoDefecto.set(c.defecto)
      gravedad.set(Math.round(c.gravedad * 100))
      gravedad.input.disabled = c.defecto === 'ninguno'
      grupoRomper.classList.toggle('sin-defecto', c.defecto === 'ninguno')
      botonPlay.textContent = corriendo ? '⏸ Pausa' : '▶ Seguir'
    },
    /** Texto del reloj del cuerpo (cambia en cada cuadro). */
    reloj: (texto: string) => (reloj.textContent = texto),
  }
}
