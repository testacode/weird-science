import '../../ui/kit.css'
import { grupo, metrica, modal, segmentado, selectorNivel } from '../../ui/componentes'
import { h } from '../../ui/dom'
import { alCambiarNivel, leerNivel } from '../../ui/nivel'
import { COMIDAS, COMO_FUNCIONA, GANCHO, RELATO, relatoFinal, type Comida } from './contenido'
import { crearEscena } from './escena'
import {
  KCAL_POR_GRAMO, MACROS, PASO_HORAS, SEGMENTOS, estadoInicial, kcalAbsorbidas, paso, phSegmento, type Config,
} from './model'

/** Segundos reales que tarda cada órgano a velocidad 1×: el reloj se acelera distinto en cada uno. */
const SEGUNDOS_POR_TRAMO = 7

const lab = document.querySelector<HTMLElement>('#lab')!
let nivel = leerNivel()
let comida: Comida = COMIDAS[0]
let config: Config = { bilis: true, acidoGastrico: true }
let estado = estadoInicial(comida.gramos)
let velocidad = 1
let corriendo = true

const escena = crearEscena(lab, SEGMENTOS.map((s) => s.nombre))
escena.setComida(comida.gramos)

// --- HUD izquierdo: título, métricas y relato en vivo ---
const gancho = h('p', { class: 'gancho' })
const mTiempo = metrica('Tiempo')
const mEnergia = metrica('Energía')
const mTercera = metrica('')
const ahora = h('div', { class: 'panel ahora' })
lab.append(
  h('div', { class: 'hud hud-izq' },
    h('a', { href: '../../', class: 'etiqueta' }, '← Weird Science'),
    h('h1', { class: 'titulo' }, h('small', {}, 'Lab del sistema digestivo'), h('span', {}, 'De la boca a la sangre')),
    gancho,
    h('div', { class: 'metricas' }, mTiempo.el, mEnergia.el, mTercera.el),
    ahora,
  ),
)

// --- Consola de controles ---
const ayuda = modal()
const botonPlay = h('button', { class: 'boton boton-marca', type: 'button', onclick: () => alternar() }, '⏸ Pausa')
const reloj = h('span', { class: 'etiqueta' })
function alternar() {
  if (estado.terminado) return reiniciar()
  corriendo = !corriendo
  botonPlay.textContent = corriendo ? '⏸ Pausa' : '▶ Seguir'
}
function reiniciar() {
  estado = estadoInicial(comida.gramos)
  escena.setComida(comida.gramos)
  corriendo = true
  botonPlay.textContent = '⏸ Pausa'
}
function interruptor(texto: string, clave: keyof Config) {
  const s = segmentado(
    [{ valor: 'si', texto: 'Sí' }, { valor: 'no', texto: 'No' }],
    config[clave] ? 'si' : 'no',
    (v) => (config = { ...config, [clave]: v === 'si' }),
  )
  return { el: h('div', { class: 'interruptor' }, h('span', {}, texto), s.el), set: (on: boolean) => s.set(on ? 'si' : 'no') }
}
const bilis = interruptor('Bilis (vesícula)', 'bilis')
const acido = interruptor('Ácido gástrico', 'acidoGastrico')
escena.onVesicula(() => {
  config = { ...config, bilis: !config.bilis }
  bilis.set(config.bilis)
})

lab.append(
  h('div', { class: 'hud hud-der panel' },
    h('div', { class: 'fila' }, botonPlay, h('button', { class: 'boton', type: 'button', onclick: reiniciar }, '↺ Otra vez'),
      h('button', { class: 'boton', type: 'button', 'aria-label': 'Cómo funciona', onclick: () => ayuda.abrir(COMO_FUNCIONA[nivel]) }, '?')),
    grupo('Velocidad', segmentado([{ valor: '0.5', texto: '½×' }, { valor: '1', texto: '1×' }, { valor: '3', texto: '3×' }], '1', (v) => (velocidad = Number(v))).el),
    reloj,
    grupo('Comida', segmentado(COMIDAS.map((c) => ({ valor: c.id, texto: c.nombre })), comida.id, (id) => {
      comida = COMIDAS.find((c) => c.id === id)!
      reiniciar()
    }).el),
    grupo('Romper el sistema', h('div', { class: 'grupo' }, bilis.el, acido.el)),
    selectorNivel(),
  ),
  ayuda.el,
)

function aplicarNivel(n: typeof nivel) {
  nivel = n
  gancho.innerHTML = GANCHO[n]
  mTercera.el.querySelector('.etiqueta')!.textContent = n === 'secundaria' ? 'pH' : 'Digerido'
}
aplicarNivel(nivel)
alCambiarNivel(aplicarNivel)

function horas(hs: number) {
  const hh = Math.floor(hs)
  const mm = Math.round((hs - hh) * 60)
  return hh > 0 ? `${hh}<small>h</small> ${mm}` : `${mm}`
}

let relatoPrevio = ''
function actualizarHud(horasPorSegundo: number) {
  mTiempo.set(horas(estado.horas), 'min')
  mEnergia.set(kcalAbsorbidas(estado.nutrientes).toFixed(0), 'kcal')
  if (nivel === 'secundaria') {
    mTercera.set(phSegmento(estado.segmento, config).toFixed(1))
  } else {
    const n = estado.nutrientes
    const total = MACROS.reduce((s, m) => s + comida.gramos[m], 0)
    const roto = MACROS.reduce((s, m) => s + n[m].digerido + n[m].absorbido, 0)
    mTercera.set(((roto / total) * 100).toFixed(0), '%')
  }
  reloj.textContent = corriendo && !estado.terminado ? `Reloj acelerado ×${Math.round(horasPorSegundo * 3600).toLocaleString('es-AR')}` : 'Reloj detenido'

  const s = SEGMENTOS[estado.segmento]
  const kcalTotal = MACROS.reduce((t, m) => t + comida.gramos[m] * KCAL_POR_GRAMO[m], 0)
  const g = estado.nutrientes.grasas
  const relato = estado.terminado
    ? relatoFinal(nivel, kcalAbsorbidas(estado.nutrientes), kcalTotal, g.intacto + g.digerido)
    : RELATO[nivel][s.id](s, estado, config, phSegmento(estado.segmento, config))
  if (relato !== relatoPrevio) ahora.innerHTML = relatoPrevio = relato
}

let anterior = performance.now()
function cuadro(t: number) {
  const dtReal = Math.min((t - anterior) / 1000, 0.1)
  anterior = t
  const horasPorSegundo = (SEGMENTOS[estado.segmento].horas / SEGUNDOS_POR_TRAMO) * velocidad
  if (corriendo) {
    let restante = dtReal * horasPorSegundo
    while (restante > 0 && !estado.terminado) {
      const dt = Math.min(restante, PASO_HORAS)
      estado = paso(estado, config, dt)
      restante -= dt
    }
    if (estado.terminado) {
      corriendo = false
      botonPlay.textContent = '↺ Repetir'
    }
  }
  actualizarHud(horasPorSegundo)
  escena.dibujar(estado, config, t / 1000)
  requestAnimationFrame(cuadro)
}
requestAnimationFrame(cuadro)
