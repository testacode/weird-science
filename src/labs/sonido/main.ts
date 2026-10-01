import '../../ui/kit.css'
import './sonido.css'
import { metrica, modal } from '../../ui/componentes'
import { h } from '../../ui/dom'
import { grafico, type Serie } from '../../ui/grafico'
import { hud } from '../../ui/hud'
import { prediccion } from '../../ui/prediccion'
import { crearAudio } from './audio'
import { COMO_FUNCIONA, GANCHO, num, relato, textoNivel, textoOido } from './contenido'
import { crearControles } from './controles'
import { crearEscena } from './escena'
import {
  CONFIG_INICIAL, ESTADO_INICIAL, MEDIOS, T_EMISION, formatoAire, frecuenciaOida, llegada, nivelAire, nota, oido, paso, senal, tiempoFinal, type Config, type MedioId,
} from './model'
import { preguntaPara, type Datos, type Pregunta, type Respuesta } from './prediccion'
import { F_VISUAL } from './onda'

const lab = document.querySelector<HTMLElement>('#lab')!
let config: Config = { ...CONFIG_INICIAL }
let estado = ESTADO_INICIAL
let corriendo = true
/** Tipos de pregunta ya hechos desde el último "Otra vez": cada una se pregunta una vez, después se hace directo. */
const preguntadas = new Set<Pregunta['tipo']>()

const escena = crearEscena(lab)
const audio = crearAudio()

// --- HUD izquierdo: título, métricas, relato en vivo y gráfico ---
const gancho = h('p', { class: 'gancho' })
gancho.innerHTML = GANCHO
const mTono = metrica('Tono')
const mNivel = metrica('Nivel (aire)')
const mAire = metrica('Aire')
const mOido = metrica('Se oye')
mTono.el.classList.add('c-cielo')
mNivel.el.classList.add('c-ambar')
const ahora = h('div', { class: 'panel ahora' })

const SERIE_TONO: Serie[] = [{ id: 'v', nombre: 'Vibración de la fuente', color: 'ambar' }]
const SERIES_GOLPE: Serie[] = [{ id: 'aire', nombre: 'Aire', color: 'cielo' }, { id: 'agua', nombre: 'Agua', color: '#3f8cff' }, { id: 'acero', nombre: 'Acero', color: '#c9d3d8' }]
const curva = grafico(SERIE_TONO, { titulo: 'Vibración de la fuente · 4 ciclos', unidadX: ' ms', yMax: 1, yMin: -1, alto: 130 })
let ultimoT = -1
let retraso = 0
/** El tono se dibuja de una (4 ciclos): se junta lo que se mueva en 120 ms para no redibujar con cada paso del deslizador. */
function graficarTono() {
  clearTimeout(retraso)
  retraso = window.setTimeout(() => {
    if (config.modo !== 'tono') return
    const xMax = 4000 / config.frecuencia
    curva.cambiar(SERIE_TONO, { titulo: 'Vibración de la fuente · 4 ciclos', unidadX: ' ms', xMax, yMax: 1, yMin: -1 })
    for (let i = 0; i <= 64; i++) curva.agregar((i / 64) * xMax, { v: config.amplitud * Math.sin(2 * Math.PI * config.frecuencia * ((i / 64) * xMax / 1000)) })
  }, 120)
}
/** El golpe se va dibujando a medida que avanza la animación; vale 1 la amplitud de la fuente. */
function graficarGolpe() {
  clearTimeout(retraso)
  curva.cambiar(SERIES_GOLPE, { titulo: 'Presión en cada micrófono', unidadX: ' ms', xMax: tiempoFinal(config.distancia) * 1000, yMax: 1, yMin: -1 })
  ultimoT = -1
}
function graficar() {
  if (config.modo === 'tono') graficarTono()
  else graficarGolpe()
}

lab.append(
  hud('izq',
    h('a', { href: '../../', class: 'etiqueta' }, '← Weird Science'),
    h('h1', { class: 'titulo' }, h('small', {}, 'Lab del sonido'), h('span', {}, 'Vibrar y viajar')),
    gancho,
    h('div', { class: 'metricas' }, mTono.el, mNivel.el, mAire.el, mOido.el),
    ahora,
    curva.el,
  ),
)

// --- Predecí antes de correr: la pregunta va antes del cambio y el cambio se hace al responder ---
const ayuda = modal()
const pred = prediccion<Respuesta, { pregunta: Pregunta; datos: Datos }>(() => {
  const d = pred.datos
  if (d) hacer(d.pregunta.tipo)
}, {
  // Saltar (o apagar las preguntas): se hace igual, sin predicción.
  saltar: (d) => d && hacer(d.pregunta.tipo),
  textoSaltar: 'Saltar y hacerlo igual',
})
function descartarPendiente() {
  if (pred.pendiente) pred.ocultar()
}
/** Hace lo que se estaba por predecir. */
function hacer(tipo: Pregunta['tipo']) {
  preguntadas.add(tipo)
  if (tipo === 'golpe') lanzarGolpe()
  else {
    aplicar({ ...config, bomba: true })
    seguir(true)
  }
}
/** Pregunta antes de hacer `tipo` (con las preguntas apagadas, el kit lo hace directo vía `saltar`). */
function preguntar(tipo: Pregunta['tipo']) {
  const p = preguntaPara(tipo)
  pred.preguntar(p.texto, p.opciones, { pregunta: p, datos: { distancia: config.distancia, amplitud: config.amplitud, frecuencia: frecuenciaOida(config) } })
}
function revelar() {
  const d = pred.datos
  if (!d || !pred.enCurso || !d.pregunta.listo(config, estado)) return
  const r = d.pregunta.resolver(d.datos)
  pred.revelar(r.correcta, r.explicacion)
}
/** Un cambio que se contradice con lo que la pregunta abierta supone la descarta. */
function invalidar(cambio: Partial<Config>) {
  const tipo = pred.datos?.pregunta.tipo
  if (!tipo) return
  if ((tipo === 'golpe' && ('distancia' in cambio || 'modo' in cambio)) || (tipo === 'bomba' && ('amplitud' in cambio || 'frecuencia' in cambio || 'modo' in cambio || cambio.bomba === false))) {
    pred.ocultar()
  }
}

function lanzarGolpe() {
  estado = { ...estado, golpe: 0 }
  graficarGolpe()
  seguir(true)
}
function seguir(va: boolean) {
  corriendo = va
  controles.sincronizar(config, corriendo)
}
function aplicar(nueva: Config) {
  const previa = config
  config = nueva
  if (nueva.modo !== previa.modo) {
    estado = { ...estado, golpe: null }
    graficar()
  } else if (nueva.modo === 'tono' && (nueva.frecuencia !== previa.frecuencia || nueva.amplitud !== previa.amplitud)) {
    graficarTono()
  } else if (nueva.modo === 'golpe' && nueva.distancia !== previa.distancia) {
    // Con otra distancia, lo que está dibujado ya no vale: hay que volver a golpear.
    estado = { ...estado, golpe: null }
    graficarGolpe()
  }
  controles.sincronizar(config, corriendo)
}

/** Todo cambio de los controles pasa por acá: la bomba pregunta antes (una vez); el resto se aplica. */
function pedir(cambio: Partial<Config>) {
  invalidar(cambio)
  if (cambio.bomba && !config.bomba && !preguntadas.has('bomba') && config.amplitud > 0 && !pred.enCurso) {
    descartarPendiente()
    preguntar('bomba')
    return controles.sincronizar(config, corriendo)
  }
  aplicar({ ...config, ...cambio })
  // Un cambio que arranca la bomba la deja correr aunque el reloj estuviera en pausa.
  if (cambio.bomba) seguir(true)
}
function golpe() {
  if (preguntadas.has('golpe') || pred.enCurso) return lanzarGolpe()
  descartarPendiente()
  preguntar('golpe')
}
function reiniciar() {
  pred.ocultar()
  preguntadas.clear()
  config = { ...CONFIG_INICIAL }
  estado = ESTADO_INICIAL
  seguir(true)
  graficar()
}

const controles = crearControles(config, {
  pedir, golpe, reiniciar, ayuda: () => ayuda.abrir(COMO_FUNCIONA),
  alternar: () => seguir(!corriendo),
  // Si Web Audio falla, el interruptor vuelve a No (tocar Sí de nuevo no avisaría: el kit ignora el mismo valor).
  sonido: (si) => {
    if (!audio.activar(si) && si) controles.sonido(false)
  },
})
lab.append(hud('der', controles.el, pred.el), ayuda.el)
controles.sincronizar(config, corriendo)
graficar()

// --- Cuadro a cuadro ---
let relatoPrevio = ''
let ultimoRelato = 0
function actualizarHud(t: number) {
  const nivel = nivelAire(config.amplitud, estado.aire)
  const n = nota(config.frecuencia)
  mTono.set(config.modo === 'tono' ? num(config.frecuencia, 0) : '—', config.modo === 'tono' ? `Hz${n ? ` · ${n.exacta ? '' : '≈ '}${n.nombre}` : ''}` : '')
  mNivel.set(textoNivel(nivel), 'dB')
  const aire = formatoAire(estado.aire)
  mAire.set(aire.valor, aire.unidad)
  mOido.set(textoOido(config, estado))
  controles.reloj(config.modo === 'tono' ? `Cámara lenta ×${num(config.frecuencia / F_VISUAL, 0)}${corriendo ? '' : ' · en pausa'}` : corriendo ? '' : 'En pausa')
  if (t - ultimoRelato < 100) return
  ultimoRelato = t
  const texto = relato(config, estado)
  if (texto !== relatoPrevio) ahora.innerHTML = relatoPrevio = texto
}

function sonar(previo: number | null) {
  if (!audio.activo) return
  const nivel = nivelAire(config.amplitud, estado.aire)
  audio.tono(config.frecuencia, nivel, config.modo === 'tono' && corriendo && oido(frecuenciaOida(config), nivel) === 'si')
  if (config.modo !== 'golpe' || estado.golpe === null || previo === null) return
  for (const m of MEDIOS) {
    const cuando = T_EMISION + llegada(m.id, config.distancia)
    if (previo < cuando && estado.golpe >= cuando) audio.clic(m.id, nivelAire(config.amplitud, m.id === 'aire' ? estado.aire : 1))
  }
}

let anterior = performance.now()
function cuadro(t: number) {
  const dt = Math.max(0, Math.min((t - anterior) / 1000, 0.1))
  anterior = t
  const previo = estado.golpe
  if (corriendo) estado = paso(estado, config, dt)
  if (config.modo === 'golpe' && estado.golpe !== null && estado.golpe !== ultimoT) {
    ultimoT = estado.golpe
    const rel = (id: MedioId) => (config.amplitud > 0 ? senal(id, config, estado.aire, estado.golpe!) / config.amplitud : 0)
    curva.agregar(estado.golpe * 1000, { aire: rel('aire'), agua: rel('agua'), acero: rel('acero') })
  }
  revelar()
  sonar(previo)
  actualizarHud(t)
  escena.dibujar(config, estado, corriendo, t)
  requestAnimationFrame(cuadro)
}
requestAnimationFrame(cuadro)
