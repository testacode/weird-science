import { interruptorAvanzado } from '../../ui/avanzado'
import { interruptorPreguntas } from '../../ui/prediccion'
import { grupo, interruptor, segmentado } from '../../ui/componentes'
import { deslizador } from '../../ui/deslizador'
import { h } from '../../ui/dom'
import { numero } from '../../ui/formato'
import { ACTIVIDADES, ALTURAS, LIMITES, presion, type Actividad, type Config } from './model'

export interface Manejadores {
  pedir: (cambio: Partial<Config>) => void
  reiniciar: () => void
  alternar: () => void
  ayuda: () => void
}


/** Consola de controles. `sincronizar` deja lo que se ve igual que la config (también cuando el cambio vino de otro lado). */
export function crearControles(inicial: Config, m: Manejadores) {
  const botonPlay = h('button', { class: 'boton boton-marca', type: 'button', onclick: m.alternar }, '⏸ Pausa')
  const reloj = h('span', { class: 'etiqueta' })

  const frecuencia = deslizador({
    titulo: 'Frecuencia', min: LIMITES.frecuencia[0], max: LIMITES.frecuencia[1], paso: 1, valor: inicial.frecuencia,
    formato: (v) => `${v} por min`, nota: (v) => (v >= 12 && v <= 20 ? 'en reposo' : ''), alCambiar: (v) => m.pedir({ frecuencia: v }),
  })
  const volumen = deslizador({
    titulo: 'Profundidad', min: LIMITES.volumen[0], max: LIMITES.volumen[1], paso: 0.05, valor: inicial.volumen,
    formato: (v) => `${numero(v, 2)} L`, nota: (v) => (Math.abs(v - 0.5) < 0.03 ? 'en reposo' : ''), alCambiar: (v) => m.pedir({ volumen: v }),
  })
  const actividad = segmentado<Actividad>(
    (Object.keys(ACTIVIDADES) as Actividad[]).map((a) => ({ valor: a, texto: ACTIVIDADES[a].nombre })), inicial.actividad, (a) => m.pedir({ actividad: a }),
  )
  const altura = segmentado(
    [{ valor: String(ALTURAS.llano), texto: 'Llano' }, { valor: String(ALTURAS.sierra), texto: 'Sierra' }, { valor: String(ALTURAS.montana), texto: 'Montaña' }],
    String(inicial.altura), (v) => m.pedir({ altura: Number(v) }),
  )
  const notaAltura = h('small', { class: 'nota-altura' })
  const aguanta = interruptor('Aguantar la respiración', inicial.aguanta, (si) => m.pedir({ aguanta: si }))
  const montana = interruptor('Subir a 4.000 m', inicial.altura === ALTURAS.montana, (si) => m.pedir({ altura: si ? ALTURAS.montana : ALTURAS.llano }))

  const grupoActividad = grupo('Actividad', actividad.el)
  grupoActividad.classList.add('act')

  const el = h('div', { class: 'panel consola' },
    h('div', { class: 'fila' }, botonPlay, h('button', { class: 'boton', type: 'button', onclick: m.reiniciar }, '↺ Restablecer'),
      h('button', { class: 'boton', type: 'button', 'aria-label': 'Cómo funciona', onclick: m.ayuda }, '?')),
    reloj,
    frecuencia.el,
    volumen.el,
    grupoActividad,
    grupo('Altura sobre el nivel del mar', h('div', { class: 'grupo' }, altura.el, notaAltura)),
    grupo('Romper el sistema', h('div', { class: 'grupo' }, aguanta.el, montana.el)),
    interruptorAvanzado(),
    interruptorPreguntas(),
  )

  return {
    el,
    sincronizar(c: Config, corriendo: boolean) {
      frecuencia.set(c.frecuencia)
      volumen.set(c.volumen)
      actividad.set(c.actividad)
      altura.set(String(c.altura))
      aguanta.set(c.aguanta)
      montana.set(c.altura === ALTURAS.montana)
      notaAltura.textContent = `${numero(c.altura, 0)} m · cada bocanada trae el ${numero((presion(c.altura) / presion(0)) * 100, 0)} % del O₂ del llano`
      botonPlay.textContent = corriendo ? '⏸ Pausa' : '▶ Seguir'
    },
    /** Texto del reloj del cuerpo (cambia en cada cuadro). */
    reloj: (texto: string) => (reloj.textContent = texto),
  }
}
