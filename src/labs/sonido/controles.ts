import { interruptorAvanzado } from '../../ui/avanzado'
import { fila, grupo, interruptor, segmentado } from '../../ui/componentes'
import { deslizador } from '../../ui/deslizador'
import { h } from '../../ui/dom'
import { numero } from '../../ui/formato'
import { DISTANCIA, FRECUENCIA, LENTAS, ajustarANota, nivelAire, nota, type Config, type Modo } from './model'

export interface Manejadores {
  /** Un cambio de la config pasa por acá: si corresponde una predicción, primero se pregunta. */
  pedir: (cambio: Partial<Config>) => void
  golpe: () => void
  sonido: (si: boolean) => void
  reiniciar: () => void
  alternar: () => void
  ayuda: () => void
}

// La frecuencia se mueve en escala logarítmica (las notas se separan por razones, no por diferencias): el deslizador lleva un índice de 0 a 1000.
const PASOS = 1000
const aIndice = (f: number) => (PASOS * Math.log(f / FRECUENCIA.min)) / Math.log(FRECUENCIA.max / FRECUENCIA.min)
// Cerca de una nota (±0,15 semitonos) se clava en ella: así el La4 de 440 Hz se puede volver a elegir.
const deIndice = (i: number) => ajustarANota(Number((FRECUENCIA.min * (FRECUENCIA.max / FRECUENCIA.min) ** (i / PASOS)).toPrecision(3)))

/** Consola de controles. `sincronizar` deja lo que se ve igual que la config (también cuando el cambio vino de otro lado). */
export function crearControles(inicial: Config, m: Manejadores) {
  const botonPlay = h('button', { class: 'boton boton-marca', type: 'button', onclick: m.alternar }, '⏸ Pausa')
  const reloj = h('span', { class: 'etiqueta' })

  const modo = segmentado<Modo>([{ valor: 'tono', texto: 'Tono' }, { valor: 'golpe', texto: 'Golpe' }], inicial.modo, (v) => m.pedir({ modo: v }))
  const botonGolpe = h('button', { class: 'boton boton-golpe', type: 'button', onclick: m.golpe }, '¡Golpe!')
  const frecuencia = deslizador({
    titulo: 'Frecuencia (tono)', min: 0, max: PASOS, paso: 1, valor: aIndice(inicial.frecuencia), color: 'var(--cielo)',
    formato: (i) => `${numero(deIndice(i), 0)} Hz`,
    nota: (i) => {
      const n = nota(deIndice(i))
      return n ? `${n.exacta ? '' : '≈ '}${n.nombre}` : ''
    },
    alCambiar: (i) => m.pedir({ frecuencia: deIndice(i) }),
  })
  const amplitud = deslizador({
    titulo: 'Volumen (amplitud)', min: 0, max: 100, paso: 1, valor: inicial.amplitud * 100, color: 'var(--ambar)',
    formato: (v) => `${v} %`, nota: (v) => `${numero(nivelAire(v / 100, 1), 0)} dB`, alCambiar: (v) => m.pedir({ amplitud: v / 100 }),
  })
  const distancia = deslizador({
    titulo: 'Distancia al micrófono', min: DISTANCIA.min, max: DISTANCIA.max, paso: 0.5, valor: inicial.distancia,
    formato: (v) => `${numero(v, 1)} m`, alCambiar: (v) => m.pedir({ distancia: v }),
  })
  const lenta = segmentado(LENTAS.map((n) => ({ valor: String(n), texto: `÷${n}` })), String(inicial.lenta), (v) => m.pedir({ lenta: Number(v) }))
  const filaLenta = fila('Cámara lenta', lenta.el)
  const sonido = interruptor('Sonido (parlantes)', false, m.sonido)
  const bomba = interruptor('Bomba de vacío en el tubo de aire', inicial.bomba, (si) => m.pedir({ bomba: si }))

  const el = h('div', { class: 'panel consola' },
    h('div', { class: 'fila' }, botonPlay, h('button', { class: 'boton', type: 'button', onclick: m.reiniciar }, '↺ Otra vez'),
      h('button', { class: 'boton', type: 'button', 'aria-label': 'Cómo funciona', onclick: m.ayuda }, '?')),
    reloj,
    fila('Fuente', modo.el),
    botonGolpe,
    frecuencia.el,
    amplitud.el,
    distancia.el,
    filaLenta,
    sonido.el,
    grupo('Romper el sistema', bomba.el),
    interruptorAvanzado(),
  )

  return {
    el,
    sincronizar(c: Config, corriendo: boolean) {
      modo.set(c.modo)
      frecuencia.set(aIndice(c.frecuencia))
      amplitud.set(c.amplitud * 100)
      distancia.set(c.distancia)
      lenta.set(String(c.lenta))
      bomba.set(c.bomba)
      frecuencia.el.hidden = c.modo !== 'tono'
      botonGolpe.hidden = filaLenta.hidden = c.modo !== 'golpe'
      botonPlay.textContent = corriendo ? '⏸ Pausa' : '▶ Seguir'
    },
    sonido: (si: boolean) => sonido.set(si),
    /** Texto del reloj (cambia en cada cuadro). */
    reloj: (texto: string) => {
      reloj.textContent = texto
      reloj.hidden = !texto
    },
  }
}
