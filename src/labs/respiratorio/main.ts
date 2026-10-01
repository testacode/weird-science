import '../../ui/kit.css'
import './respiratorio.css'
import { metrica, modal } from '../../ui/componentes'
import { h } from '../../ui/dom'
import { grafico } from '../../ui/grafico'
import { hud } from '../../ui/hud'
import { prediccion } from '../../ui/prediccion'
import { COMO_FUNCIONA, GANCHO, aviso, num, relato, type Motivo } from './contenido'
import { crearControles } from './controles'
import { crearEscena } from './escena'
import { ACELERACION, CONFIG_INICIAL, QUIEBRE_CO2, derivados, estadoEn, paso, quiebra, type Config } from './model'
import { PREGUNTA_INICIAL, preguntaPara, type Foto, type Pregunta, type Respuesta } from './prediccion'

/** Segundos del cuerpo que muestra el gráfico antes de volver a empezar, y cada cuánto se toma un punto. */
const VENTANA_GRAFICO = 240
const MUESTREO = 2

const lab = document.querySelector<HTMLElement>('#lab')!
let config: Config = { ...CONFIG_INICIAL }
let estado = estadoEn(config)
let corriendo = true
/** El cerebro acaba de obligar a respirar, o no deja empezar a aguantar (se avisa hasta el próximo cambio). */
let motivo: Motivo | null = null

const escena = crearEscena(lab)

// --- HUD izquierdo: título, métricas, relato en vivo, aviso y gráfico ---
const gancho = h('p', { class: 'gancho' })
gancho.innerHTML = GANCHO
const mFrecuencia = metrica('Resp./min')
const mAire = metrica('Aire/min')
const mSat = metrica('Sat. O₂')
const mCo2 = metrica('CO₂ sangre')
mFrecuencia.el.classList.add('c-marca')
mAire.el.classList.add('c-marca')
mSat.el.classList.add('c-cielo')
mCo2.el.classList.add('c-magenta', 'avanzado')
const ahora = h('div', { class: 'panel ahora' })
const alerta = h('div', { class: 'panel aviso', hidden: true })
const curva = grafico(
  [{ id: 'sat', nombre: 'Saturación O₂ %', color: 'cielo' }, { id: 'co2', nombre: 'CO₂ mmHg', color: 'magenta' }],
  { titulo: 'Sangre en vivo', unidadX: ' s', yMax: 100, alto: 110 },
)
let origenGrafico = 0
let ultimoPunto = 0
function muestrear() {
  if (estado.t - origenGrafico > VENTANA_GRAFICO) {
    origenGrafico = estado.t
    curva.limpiar()
  }
  const d = derivados(config, estado)
  curva.agregar(estado.t - origenGrafico, { sat: d.spo2, co2: estado.paco2 })
  ultimoPunto = estado.t
}
function reiniciarCurva() {
  origenGrafico = estado.t
  curva.limpiar({ xMax: VENTANA_GRAFICO, yMax: 100 })
  muestrear()
}
lab.append(
  hud('izq',
    h('a', { href: '../../', class: 'etiqueta' }, '← Weird Science'),
    h('h1', { class: 'titulo' }, h('small', {}, 'Lab del sistema respiratorio'), h('span', {}, 'Aire y sangre')),
    gancho,
    h('div', { class: 'metricas' }, mFrecuencia.el, mAire.el, mSat.el, mCo2.el),
    ahora,
    alerta,
    curva.el,
  ),
)

// --- Predecí antes de correr: la pregunta va antes del cambio (la primera, sobre el aire que sale, no cambia nada); el cambio se hace al responder y se revela tras unos segundos ---
const ayuda = modal()
let pendiente: { cambio: Partial<Config>; pregunta: Pregunta } | null = null
let enCurso: { pregunta: Pregunta; antes: Foto; t0: number } | null = null
const foto = (): Foto => ({ c: config, e: estado })
const saltar = h('button', { class: 'boton saltar', type: 'button', hidden: true, onclick: () => {
  const cambio = pendiente?.cambio
  descartarPendiente()
  if (cambio) aplicar({ ...config, ...cambio })
} }, 'Saltar y hacerlo igual')
const pred = prediccion<Respuesta>(() => {
  if (!pendiente) return
  // El cambio se arma sobre la config de ahora (si en el medio el cerebro soltó la respiración, no se vuelve a aguantar).
  const { cambio, pregunta } = pendiente
  pendiente = null
  saltar.hidden = true
  const antes = foto()
  aplicar({ ...config, ...cambio })
  enCurso = { pregunta, antes, t0: estado.t }
})
function descartarPendiente() {
  if (!pendiente) return
  pendiente = null
  saltar.hidden = true
  pred.ocultar()
}
function revelar() {
  if (!enCurso) return
  const r = enCurso.pregunta.resolver(enCurso.antes, foto())
  enCurso = null
  if (r) pred.revelar(r.correcta, r.explicacion)
  else pred.ocultar()
}

/** Al abrir el lab (y al restablecer) se pregunta por el aire que sale, sin cambiar nada: el cuerpo ya está en reposo. */
function preguntarInicial() {
  pendiente = { cambio: {}, pregunta: PREGUNTA_INICIAL }
  pred.preguntar(PREGUNTA_INICIAL.texto, PREGUNTA_INICIAL.opciones)
}

/** Todo cambio de los controles pasa por acá: si corresponde una predicción, primero se pregunta; si no, se aplica. */
function pedir(cambio: Partial<Config>) {
  descartarPendiente()
  const nueva = { ...config, ...cambio }
  if (!config.aguanta && nueva.aguanta && estado.paco2 >= QUIEBRE_CO2) {
    // Con el CO₂ así de alto el cerebro no deja empezar a aguantar.
    motivo = { tipo: 'imposible', co2: estado.paco2 }
    return controles.sincronizar(config, corriendo)
  }
  const pregunta = preguntaPara(config, nueva)
  if (!pregunta) {
    if (enCurso) {
      enCurso = null
      pred.ocultar()
    }
    return aplicar(nueva)
  }
  enCurso = null
  pendiente = { cambio, pregunta }
  pred.preguntar(pregunta.texto, pregunta.opciones)
  saltar.hidden = false
  controles.sincronizar(config, corriendo)
}

function aplicar(nueva: Config) {
  if (config.aguanta && !nueva.aguanta) escena.exhalar()
  config = nueva
  motivo = null
  controles.sincronizar(config, corriendo)
  muestrear()
}
function reiniciar() {
  descartarPendiente()
  enCurso = null
  corriendo = true
  config = { ...CONFIG_INICIAL }
  estado = estadoEn(config)
  motivo = null
  controles.sincronizar(config, corriendo)
  reiniciarCurva()
  preguntarInicial()
}
function alternar() {
  corriendo = !corriendo
  controles.sincronizar(config, corriendo)
}

const controles = crearControles(config, { pedir, reiniciar, alternar, ayuda: () => ayuda.abrir(COMO_FUNCIONA) })
lab.append(hud('der', controles.el, pred.el, saltar), ayuda.el)
controles.sincronizar(config, corriendo)
reiniciarCurva()
preguntarInicial()

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
let relatoPrevio = ''
let avisoPrevio = ''
function actualizarHud() {
  const d = derivados(config, estado)
  mFrecuencia.set(num(config.aguanta ? 0 : config.frecuencia, 0), '/min')
  mAire.set(num(d.ve, 1), 'L')
  mSat.set(num(d.spo2, 0), '%')
  mCo2.set(num(estado.paco2, 0), 'mmHg')
  controles.reloj(`Tiempo del cuerpo ${mmss(estado.t)} · ×${ACELERACION}${corriendo ? '' : ' · en pausa'}`)
  const texto = relato(config, d, estado)
  if (texto !== relatoPrevio) ahora.innerHTML = relatoPrevio = texto
  const alto = aviso(config, d, estado, motivo) ?? ''
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
      if (quiebra(estado, config)) {
        // El cerebro obliga a respirar: se suelta la respiración y, si había una predicción en curso, se revela.
        aplicar({ ...config, aguanta: false })
        motivo = { tipo: 'quiebre', co2: estado.paco2 }
        revelar()
        break
      }
    }
    if (estado.t - ultimoPunto >= MUESTREO) muestrear()
    if (enCurso && estado.t - enCurso.t0 >= enCurso.pregunta.ventana) revelar()
  }
  const d = actualizarHud()
  escena.dibujar(config, d, estado, corriendo ? dt : 0)
  requestAnimationFrame(cuadro)
}
requestAnimationFrame(cuadro)
