import { interruptorAvanzado } from '../../ui/avanzado'
import { fila, grupo, segmentado } from '../../ui/componentes'
import { deslizador } from '../../ui/deslizador'
import { h } from '../../ui/dom'
import { numero } from '../../ui/formato'
import { interruptorPreguntas } from '../../ui/prediccion'
import { REF_VOZ, SUPERFICIES, TEMPERATURA, VOLUMEN, superficie, type Config, type Modo, type SuperficieId } from './model'

export interface Manejadores {
  /** Un cambio de la config pasa por acá. */
  pedir: (cambio: Partial<Config>) => void
  gritar: () => void
  estimar: (metros: number) => void
  comprobar: () => void
  otraDistancia: () => void
  oir: () => void
  reiniciar: () => void
  alternar: () => void
  ayuda: () => void
}

/** Lo que la consola necesita saber además de la config. */
export interface Vista {
  corriendo: boolean
  estimacion: number
  /** Ya se puede comprobar: el eco volvió y todavía no se comprobó. */
  puedeComprobar: boolean
}

/** Dónde cae el volumen respecto de las dos referencias de DPA (conversación 58 dB, grito 76 dB). */
const referenciaVolumen = (v: number) => (v <= REF_VOZ.conversacion + 2 ? '≈ conversación' : v <= REF_VOZ.grito + 4 ? '≈ grito' : 'más que un grito')

/** Consola de controles. `sincronizar` deja lo que se ve igual que la config (también cuando el cambio vino de otro lado). */
export function crearControles(inicial: Config, m: Manejadores) {
  const botonPlay = h('button', { class: 'boton boton-marca', type: 'button', onclick: m.alternar }, '⏸ Pausa')

  const lugar = segmentado<SuperficieId>(SUPERFICIES.map((s) => ({ valor: s.id, texto: s.id === 'fondo' ? 'Mar (sonar)' : s.nombre })), inicial.superficie, (v) => m.pedir({ superficie: v }))
  lugar.el.classList.add('compacto')
  const modo = segmentado<Modo>([{ valor: 'explorar', texto: 'Explorar' }, { valor: 'medir', texto: 'Medir' }], inicial.modo, (v) => m.pedir({ modo: v }))
  const botonGritar = h('button', { class: 'boton boton-gritar', type: 'button', onclick: m.gritar }, '¡Gritar!')

  // Los rangos de distancia cambian con la superficie: el deslizador se vuelve a armar.
  const cajaDistancia = h('div')
  const cajaEstimacion = h('div')
  let distancia = deslizador({ titulo: '', min: 0, max: 1, paso: 1, valor: 0, alCambiar: () => {} })
  let estimacion = distancia
  let armadoPara: SuperficieId | null = null
  function armarDistancias(id: SuperficieId, c: Config, v: Vista) {
    armadoPara = id
    const r = superficie(id).distancia
    distancia = deslizador({
      titulo: 'Distancia a la superficie', min: r.min, max: r.max, paso: r.paso, valor: c.distancia, color: 'var(--ambar)',
      formato: (x) => `${numero(x, 0)} m`, alCambiar: (x) => m.pedir({ distancia: x }),
    })
    estimacion = deslizador({
      titulo: 'Tu estimación', min: r.min, max: r.max, paso: 1, valor: v.estimacion, color: 'var(--magenta)',
      formato: (x) => `${numero(x, 0)} m`, alCambiar: m.estimar,
    })
    cajaDistancia.replaceChildren(distancia.el)
    cajaEstimacion.replaceChildren(estimacion.el)
  }
  const botonComprobar = h('button', { class: 'boton boton-marca', type: 'button', onclick: m.comprobar }, 'Comprobar')
  const botonOtra = h('button', { class: 'boton', type: 'button', onclick: m.otraDistancia }, 'Otra distancia')
  const filaMedir = h('div', { class: 'fila' }, botonComprobar, botonOtra)

  const volumen = deslizador({
    titulo: 'Volumen (a 1 m)', min: VOLUMEN.min, max: VOLUMEN.max, paso: 1, valor: inicial.volumen, color: 'var(--cielo)',
    formato: (x) => `${x} dB`, nota: referenciaVolumen, alCambiar: (x) => m.pedir({ volumen: x }),
  })
  const temperatura = deslizador({
    titulo: 'Temperatura del aire', min: TEMPERATURA.min, max: TEMPERATURA.max, paso: 1, valor: inicial.temperatura,
    formato: (x) => `${x} °C`, nota: (x) => `${numero(331.4 + 0.6 * x, 0)} m/s`, alCambiar: (x) => m.pedir({ temperatura: x }),
  })
  const botonOir = h('button', { class: 'boton', type: 'button', onclick: m.oir }, '🔊 Oír en tiempo real')

  const el = h('div', { class: 'panel consola' },
    h('div', { class: 'fila' }, botonPlay, h('button', { class: 'boton', type: 'button', onclick: m.reiniciar }, '↺ Otra vez'),
      h('button', { class: 'boton', type: 'button', 'aria-label': 'Cómo funciona', onclick: m.ayuda }, '?')),
    grupo('Superficie', lugar.el),
    fila('Modo', modo.el),
    botonGritar,
    cajaDistancia,
    cajaEstimacion,
    filaMedir,
    volumen.el,
    temperatura.el,
    botonOir,
    interruptorAvanzado(),
    interruptorPreguntas(),
  )

  return {
    el,
    sincronizar(c: Config, v: Vista) {
      if (armadoPara !== c.superficie) armarDistancias(c.superficie, c, v)
      lugar.set(c.superficie)
      modo.set(c.modo)
      distancia.set(c.distancia)
      estimacion.set(v.estimacion)
      volumen.set(c.volumen)
      temperatura.set(c.temperatura)
      const medir = c.modo === 'medir'
      const agua = superficie(c.superficie).medio === 'agua'
      cajaDistancia.hidden = medir
      cajaEstimacion.hidden = !medir
      filaMedir.hidden = !medir
      botonComprobar.disabled = !v.puedeComprobar
      temperatura.el.hidden = agua
      botonOir.hidden = agua
      botonGritar.textContent = agua ? '¡Ping!' : '¡Gritar!'
      botonPlay.textContent = v.corriendo ? '⏸ Pausa' : '▶ Seguir'
    },
  }
}
