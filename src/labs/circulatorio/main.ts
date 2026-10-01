import '../../ui/kit.css'
import './circulatorio.css'
import { metrica, modal } from '../../ui/componentes'
import { h } from '../../ui/dom'
import { grafico } from '../../ui/grafico'
import { hud } from '../../ui/hud'
import { prediccion } from '../../ui/prediccion'
import { COMO_FUNCIONA, GANCHO, aviso, num, relato } from './contenido'
import { crearControles } from './controles'
import { crearEscena } from './escena'
import { ACELERACION, CONFIG_INICIAL, derivados, estadoEn, paso, tipico, type Config } from './model'
import { PREGUNTA_INICIAL, preguntaPara, type Foto, type Pregunta, type Respuesta } from './prediccion'

/** Segundos del cuerpo que muestra el gráfico antes de volver a empezar, y cada cuánto se toma un punto. */
const VENTANA_GRAFICO = 240
const MUESTREO = 2

const lab = document.querySelector<HTMLElement>('#lab')!
let config: Config = { ...CONFIG_INICIAL }
let estado = estadoEn(config)
let corriendo = true

const escena = crearEscena(lab, estado.svo2)

// --- HUD izquierdo: título, métricas, relato en vivo, aviso y gráfico ---
const gancho = h('p', { class: 'gancho' })
gancho.innerHTML = GANCHO
const mFrecuencia = metrica('Latidos/min')
const mBombea = metrica('Bombea')
const mCuerpo = metrica('Al cuerpo')
const mSat = metrica('Sat. venosa')
mFrecuencia.el.classList.add('c-marca')
mBombea.el.classList.add('c-marca')
mCuerpo.el.classList.add('c-sangre')
mSat.el.classList.add('c-venosa')
const ahora = h('div', { class: 'panel ahora' })
const alerta = h('div', { class: 'panel aviso', hidden: true })
const curva = grafico(
  [{ id: 'bombea', nombre: 'Bombea', color: 'marca' }, { id: 'llega', nombre: 'Llega al cuerpo', color: 'var(--sangre)' }, { id: 'falta', nombre: 'Hace falta', color: 'ambar' }],
  { titulo: 'Sangre por minuto', unidadX: ' s', unidadY: ' L/min', yMax: 25, alto: 110 },
)
let origenGrafico = 0
let ultimoPunto = 0
function muestrear() {
  if (estado.t - origenGrafico > VENTANA_GRAFICO) {
    origenGrafico = estado.t
    curva.limpiar()
  }
  const d = derivados(config, estado)
  curva.agregar(estado.t - origenGrafico, { bombea: d.bombea, llega: d.cuerpo, falta: d.necesario })
  ultimoPunto = estado.t
}
function reiniciarCurva() {
  origenGrafico = estado.t
  curva.limpiar({ xMax: VENTANA_GRAFICO, yMax: 25 })
  muestrear()
}
lab.append(
  hud('izq',
    h('a', { href: '../../', class: 'etiqueta' }, '← Weird Science'),
    h('h1', { class: 'titulo' }, h('small', {}, 'Lab del sistema circulatorio'), h('span', {}, 'Corazón y sangre')),
    gancho,
    h('div', { class: 'metricas' }, mFrecuencia.el, mBombea.el, mCuerpo.el, mSat.el),
    ahora,
    alerta,
    curva.el,
  ),
)

// --- Predecí antes de correr: la pregunta va antes del cambio (la primera no cambia nada); el cambio se hace al responder y se revela tras unos segundos ---
const ayuda = modal()
let enCurso: { pregunta: Pregunta; antes: Foto; t0: number } | null = null
const foto = (): Foto => ({ c: config, e: estado })
const saltar = h('button', { class: 'boton saltar', type: 'button', hidden: true, onclick: () => {
  const cambio = pred.datos?.cambio
  descartarPendiente()
  if (cambio) aplicar({ ...config, ...cambio })
} }, 'Saltar y hacerlo igual')
const pred = prediccion<Respuesta, { cambio: Partial<Config>; pregunta: Pregunta }>(() => {
  if (!pred.datos) return
  // El cambio se arma sobre la config de ahora (si en el medio cambió otra cosa, se conserva).
  const { cambio, pregunta } = pred.datos
  saltar.hidden = true
  const antes = foto()
  aplicar({ ...config, ...cambio })
  enCurso = { pregunta, antes, t0: estado.t }
})
function descartarPendiente() {
  if (!pred.pendiente) return
  saltar.hidden = true
  pred.ocultar()
}
function revelar() {
  if (!enCurso) return
  const r = enCurso.pregunta.resolver(enCurso.antes, foto())
  enCurso = null
  pred.revelar(r.correcta, r.explicacion)
}

/** Al abrir el lab (y al restablecer) se pregunta por la sangre que bombea el corazón, sin cambiar nada: el cuerpo ya está en reposo. */
function preguntarInicial() {
  pred.preguntar(PREGUNTA_INICIAL.texto, PREGUNTA_INICIAL.opciones, { cambio: {}, pregunta: PREGUNTA_INICIAL })
}

/** Todo cambio de los controles pasa por acá: si corresponde una predicción, primero se pregunta; si no, se aplica. */
function pedir(cambio: Partial<Config>) {
  descartarPendiente()
  const nueva = { ...config, ...cambio }
  const pregunta = preguntaPara(foto(), nueva)
  if (!pregunta) {
    if (enCurso) {
      enCurso = null
      pred.ocultar()
    }
    return aplicar(nueva)
  }
  enCurso = null
  pred.preguntar(pregunta.texto, pregunta.opciones, { cambio, pregunta })
  saltar.hidden = false
  controles.sincronizar(config, corriendo)
}

function aplicar(nueva: Config) {
  config = nueva
  controles.sincronizar(config, corriendo)
  muestrear()
}
function reiniciar() {
  descartarPendiente()
  enCurso = null
  corriendo = true
  config = { ...CONFIG_INICIAL }
  estado = estadoEn(config)
  controles.sincronizar(config, corriendo)
  reiniciarCurva()
  preguntarInicial()
}
function alternar() {
  corriendo = !corriendo
  controles.sincronizar(config, corriendo)
}

const controles = crearControles(config, { pedir, tipico: () => pedir(tipico(config.actividad)), reiniciar, alternar, ayuda: () => ayuda.abrir(COMO_FUNCIONA) })
lab.append(hud('der', controles.el, pred.el, saltar), ayuda.el)
controles.sincronizar(config, corriendo)
reiniciarCurva()
preguntarInicial()

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
let relatoPrevio = ''
let avisoPrevio = ''
function actualizarHud() {
  const d = derivados(config, estado)
  mFrecuencia.set(num(config.frecuencia, 0), '/min')
  mBombea.set(num(d.bombea, 1), 'L')
  mCuerpo.set(num(d.cuerpo, 1), 'L')
  mSat.set(num(estado.svo2 * 100, 0), '%')
  controles.reloj(`Tiempo del cuerpo ${mmss(estado.t)} · ×${ACELERACION}${corriendo ? '' : ' · en pausa'}`)
  const texto = relato(config, d, estado)
  if (texto !== relatoPrevio) ahora.innerHTML = relatoPrevio = texto
  const alto = aviso(d) ?? ''
  if (alto !== avisoPrevio) {
    alerta.innerHTML = avisoPrevio = alto
    alerta.hidden = !alto
  }
  return d
}

let anterior = performance.now()
function cuadro(t: number) {
  const dt = Math.max(0, Math.min((t - anterior) / 1000, 0.1))
  anterior = t
  if (corriendo) {
    let resto = dt * ACELERACION
    while (resto > 0) {
      const dtCuerpo = Math.min(resto, 1)
      estado = paso(estado, config, dtCuerpo)
      resto -= dtCuerpo
    }
    if (estado.t - ultimoPunto >= MUESTREO) muestrear()
    if (enCurso && estado.t - enCurso.t0 >= enCurso.pregunta.ventana) revelar()
  }
  const d = actualizarHud()
  escena.dibujar(config, d, estado, corriendo ? dt : 0)
  requestAnimationFrame(cuadro)
}
requestAnimationFrame(cuadro)
