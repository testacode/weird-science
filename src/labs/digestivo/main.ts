import '../../ui/kit.css'
import { interruptorAvanzado } from '../../ui/avanzado'
import { grupo, metrica, modal, segmentado } from '../../ui/componentes'
import { h } from '../../ui/dom'
import { grafico } from '../../ui/grafico'
import { prediccion } from '../../ui/prediccion'
import { COMIDAS, COMO_FUNCIONA, GANCHO, RELATO, relatoFinal, type Comida } from './contenido'
import { crearEscena } from './escena'
import {
  HORAS_TOTALES, KCAL_POR_GRAMO, MACROS, PASO_HORAS, SEGMENTOS, estadoInicial, kcalAbsorbidas, paso, phSegmento, type Config,
} from './model'
import { preguntaPara, referencia, type Pregunta, type Respuesta } from './prediccion'

/** Segundos reales que tarda cada órgano a velocidad 1×: el reloj se acelera distinto en cada uno. */
const SEGUNDOS_POR_TRAMO = 7
/** Cada cuántas horas simuladas se suma un punto al gráfico. */
const MUESTREO_HORAS = 0.05

const lab = document.querySelector<HTMLElement>('#lab')!
let comida: Comida = COMIDAS[0]
let config: Config = { bilis: true, acidoGastrico: true }
let estado = estadoInicial(comida.gramos)
let velocidad = 1
let corriendo = true

const escena = crearEscena(lab, SEGMENTOS.map((s) => s.nombre))
escena.setComida(comida.gramos)

// --- HUD izquierdo: título, métricas y relato en vivo ---
const gancho = h('p', { class: 'gancho' })
gancho.innerHTML = GANCHO
const mTiempo = metrica('Tiempo')
const mEnergia = metrica('Energía')
const mPh = metrica('pH')
const mDigerido = metrica('Digerido')
mPh.el.classList.add('avanzado')
const ahora = h('div', { class: 'panel ahora' })
const curva = grafico(
  [
    { id: 'carbos', nombre: 'Carbos', color: 'ambar' },
    { id: 'proteinas', nombre: 'Proteínas', color: 'magenta' },
    { id: 'grasas', nombre: 'Grasas', color: 'cielo' },
  ],
  { titulo: 'Gramos absorbidos', unidadX: ' h', unidadY: 'g' },
)
let ultimoPunto = 0
function reiniciarCurva() {
  const mayor = Math.max(...MACROS.map((m) => comida.gramos[m]))
  curva.limpiar({ xMax: HORAS_TOTALES, yMax: mayor })
  curva.agregar(0, { carbos: 0, proteinas: 0, grasas: 0 })
  ultimoPunto = 0
}
function sumarPunto() {
  const n = estado.nutrientes
  curva.agregar(estado.horas, { carbos: n.carbos.absorbido, proteinas: n.proteinas.absorbido, grasas: n.grasas.absorbido })
  ultimoPunto = estado.horas
}
lab.append(
  h('div', { class: 'hud hud-izq' },
    h('a', { href: '../../', class: 'etiqueta' }, '← Weird Science'),
    h('h1', { class: 'titulo' }, h('small', {}, 'Lab del sistema digestivo'), h('span', {}, 'De la boca a la sangre')),
    gancho,
    h('div', { class: 'metricas' }, mTiempo.el, mEnergia.el, mPh.el, mDigerido.el),
    ahora,
    curva.el,
  ),
)

// --- Consola de controles ---
const ayuda = modal()
const botonPlay = h('button', { class: 'boton boton-marca', type: 'button', onclick: () => alternar() }, '⏸ Pausa')
const reloj = h('span', { class: 'etiqueta' })

// --- Predecí antes de correr: al romper algo, la simulación espera la predicción ---
let pregunta: Pregunta | null = null
const pred = prediccion<Respuesta>(() => seguir(true))
function seguir(va: boolean) {
  corriendo = va
  botonPlay.textContent = va ? '⏸ Pausa' : '▶ Seguir'
}
function predecir() {
  pregunta = preguntaPara(config)
  if (!pregunta) return pred.ocultar()
  pred.preguntar(pregunta.texto, pregunta.opciones)
  corriendo = false
  botonPlay.textContent = '▶ Saltar'
}
function revelar() {
  if (!pregunta || !pred.enCurso) return
  const r = pregunta.resolver(estado, referencia(comida.gramos))
  pred.revelar(r.correcta, r.explicacion)
}

function alternar() {
  if (pred.pendiente) {
    pred.ocultar()
    pregunta = null
    return seguir(true)
  }
  if (estado.terminado) return reiniciar()
  corriendo = !corriendo
  botonPlay.textContent = corriendo ? '⏸ Pausa' : '▶ Seguir'
}
function reiniciar() {
  estado = estadoInicial(comida.gramos)
  escena.setComida(comida.gramos)
  reiniciarCurva()
  seguir(true)
  predecir()
}
/** Romper algo (o tocar los controles con una predicción a la vista) reinicia el tránsito. */
function cambiarConfig(clave: keyof Config, valor: boolean) {
  config = { ...config, [clave]: valor }
  if (preguntaPara(config) || pregunta) reiniciar()
}
function interruptor(texto: string, clave: keyof Config) {
  const s = segmentado(
    [{ valor: 'si', texto: 'Sí' }, { valor: 'no', texto: 'No' }],
    config[clave] ? 'si' : 'no',
    (v) => cambiarConfig(clave, v === 'si'),
  )
  return { el: h('div', { class: 'interruptor' }, h('span', {}, texto), s.el), set: (on: boolean) => s.set(on ? 'si' : 'no') }
}
const bilis = interruptor('Bilis (vesícula)', 'bilis')
const acido = interruptor('Ácido gástrico', 'acidoGastrico')
escena.onVesicula(() => {
  cambiarConfig('bilis', !config.bilis)
  bilis.set(config.bilis)
})

lab.append(
  h('div', { class: 'hud hud-der' },
    h('div', { class: 'panel consola' },
      h('div', { class: 'fila' }, botonPlay, h('button', { class: 'boton', type: 'button', onclick: reiniciar }, '↺ Otra vez'),
        h('button', { class: 'boton', type: 'button', 'aria-label': 'Cómo funciona', onclick: () => ayuda.abrir(COMO_FUNCIONA) }, '?')),
      grupo('Velocidad', segmentado([{ valor: '0.5', texto: '½×' }, { valor: '1', texto: '1×' }, { valor: '3', texto: '3×' }], '1', (v) => (velocidad = Number(v))).el),
      reloj,
      grupo('Comida', segmentado(COMIDAS.map((c) => ({ valor: c.id, texto: c.nombre })), comida.id, (id) => {
        comida = COMIDAS.find((c) => c.id === id)!
        reiniciar()
      }).el),
      grupo('Romper el sistema', h('div', { class: 'grupo' }, bilis.el, acido.el)),
      interruptorAvanzado(),
    ),
    pred.el,
  ),
  ayuda.el,
)

reiniciarCurva()

function horas(hs: number) {
  const hh = Math.floor(hs)
  const mm = Math.round((hs - hh) * 60)
  return hh > 0 ? `${hh}<small>h</small> ${mm}` : `${mm}`
}

let relatoPrevio = ''
function actualizarHud(horasPorSegundo: number) {
  mTiempo.set(horas(estado.horas), 'min')
  mEnergia.set(kcalAbsorbidas(estado.nutrientes).toFixed(0), 'kcal')
  mPh.set(phSegmento(estado.segmento, config).toFixed(1))
  const n = estado.nutrientes
  const total = MACROS.reduce((s, m) => s + comida.gramos[m], 0)
  const roto = MACROS.reduce((s, m) => s + n[m].digerido + n[m].absorbido, 0)
  mDigerido.set(((roto / total) * 100).toFixed(0), '%')
  reloj.textContent = corriendo && !estado.terminado ? `Reloj acelerado ×${Math.round(horasPorSegundo * 3600).toLocaleString('es-AR')}` : 'Reloj detenido'

  const s = SEGMENTOS[estado.segmento]
  const kcalTotal = MACROS.reduce((t, m) => t + comida.gramos[m] * KCAL_POR_GRAMO[m], 0)
  const g = estado.nutrientes.grasas
  const relato = estado.terminado
    ? relatoFinal(kcalAbsorbidas(estado.nutrientes), kcalTotal, g.intacto + g.digerido)
    : RELATO[s.id](s, estado, config, phSegmento(estado.segmento, config))
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
    if (estado.horas - ultimoPunto >= MUESTREO_HORAS || (estado.terminado && estado.horas > ultimoPunto)) sumarPunto()
    if (estado.terminado) {
      corriendo = false
      botonPlay.textContent = '↺ Repetir'
      revelar()
    }
  }
  actualizarHud(horasPorSegundo)
  escena.dibujar(estado, config, t / 1000)
  requestAnimationFrame(cuadro)
}
requestAnimationFrame(cuadro)
