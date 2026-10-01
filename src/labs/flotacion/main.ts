import '../../ui/kit.css'
import './flotacion.css'
import { metrica, modal } from '../../ui/componentes'
import { h } from '../../ui/dom'
import { grafico } from '../../ui/grafico'
import { hud } from '../../ui/hud'
import { prediccion } from '../../ui/prediccion'
import { crearConsola } from './consola'
import { COMO_FUNCIONA, GANCHO, newtons, num, relato } from './contenido'
import { crearEscena } from './escena'
import {
  CONFIG_INICIAL, derivar, estadoInicial, paso, reescalar, terminado, type Config, type Estado,
} from './model'
import { preguntaPara, type Pregunta, type Respuesta } from './prediccion'

/** Segundos del modelo por segundo real: cámara lenta para poder mirar cómo se acomoda. */
const RITMO = 0.5
/** Ancho del gráfico en segundos del modelo; al llegar se vuelve a empezar. */
const VENTANA_GRAFICO = 15
const MUESTREO_S = 0.05

const lab = document.querySelector<HTMLElement>('#lab')!
let config: Config = { ...CONFIG_INICIAL }
let estado: Estado = estadoInicial(config)
let corriendo = true
/** Falta soltar el objeto: está esperando la respuesta de una predicción. */
let soltado = true

const escena = crearEscena(lab)

// --- HUD izquierdo: título, métricas, relato en vivo y gráfico ---
const gancho = h('p', { class: 'gancho' })
gancho.innerHTML = GANCHO
const mPeso = metrica('Peso')
const mEmpuje = metrica('Empuje')
const mSumergido = metrica('Sumergido')
const mDensidad = metrica('Dens. rel.')
mPeso.el.classList.add('c-magenta')
mEmpuje.el.classList.add('c-cielo')
mSumergido.el.classList.add('c-marca')
mDensidad.el.classList.add('avanzado')
const ahora = h('div', { class: 'panel ahora' })

const curva = grafico(
  [{ id: 'peso', nombre: 'Peso', color: 'magenta' }, { id: 'empuje', nombre: 'Empuje', color: 'cielo' }],
  { titulo: 'Fuerzas en el tiempo', unidadX: ' s', unidadY: 'N', alto: 110 },
)
let origenGrafico = 0
let ultimoPunto = 0
function muestrear() {
  if (estado.t - origenGrafico > VENTANA_GRAFICO) {
    origenGrafico = estado.t
    curva.limpiar()
  }
  const d = derivar(config, estado)
  curva.agregar(estado.t - origenGrafico, { peso: d.peso, empuje: d.empuje })
  ultimoPunto = estado.t
}
function reiniciarCurva() {
  origenGrafico = estado.t
  curva.limpiar({ xMax: VENTANA_GRAFICO, yMax: derivar(config, estado).peso * 1.3 })
  muestrear()
}

lab.append(
  hud('izq',
    h('a', { href: '../../', class: 'etiqueta' }, '← Weird Science'),
    h('h1', { class: 'titulo' }, h('small', {}, 'Lab de flotación'), h('span', {}, 'Peso y empuje')),
    gancho,
    h('div', { class: 'metricas' }, mPeso.el, mEmpuje.el, mSumergido.el, mDensidad.el),
    ahora,
    curva.el,
  ),
)

// --- Predecí antes de correr: al elegir algo para romper, el objeto espera la respuesta antes de soltarse ---
const ayuda = modal()
const pred = prediccion<Respuesta, { pregunta: Pregunta; config: Config }>(() => seguir(true))

function seguir(va: boolean) {
  corriendo = va
  if (va) soltado = true
  consola.setPlay(va ? '⏸ Pausa' : '▶ Seguir')
}
/** Vuelve a soltar el objeto desde arriba con los controles actuales. */
function soltar(esperando = false) {
  estado = estadoInicial(config)
  reiniciarCurva()
  soltado = !esperando
  seguir(!esperando)
  if (esperando) consola.setPlay('▶ Soltar')
}
function revelar() {
  const datos = pred.datos
  if (!datos || !pred.enCurso) return
  const r = datos.pregunta.resolver(datos.config)
  pred.revelar(r.correcta, r.explicacion)
  pred.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}
function alternar() {
  if (pred.pendiente) {
    pred.ocultar()
    return seguir(true)
  }
  seguir(!corriendo)
}

/**
 * Único lugar donde cambia `config`. Si lo que eligió es nuevo y hay algo que predecir, el objeto queda arriba esperando la
 * respuesta; si se mueve otro control con una pregunta abierta, se descarta.
 */
function aplicar(parcial: Partial<Config>) {
  // Volver a tocar la opción ya elegida no cambia nada (ni descarta una pregunta abierta).
  if ((Object.keys(parcial) as (keyof Config)[]).every((k) => parcial[k] === config[k])) return
  const antes = config
  config = { ...config, ...parcial }
  if (parcial.agujero) config.objeto = 'barco'
  if (config.objeto !== 'barco') config.agujero = false
  consola.sincronizar(config)

  const nueva = preguntaPara(config)
  const yaPreguntada = nueva?.id === preguntaPara(antes)?.id || (nueva?.id === 'barco' && antes.objeto === 'barco')
  if (nueva && !yaPreguntada) {
    soltar(true)
    pred.preguntar(nueva.texto, nueva.opciones, { pregunta: nueva, config })
    return pred.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }
  const esperaba = pred.pendiente
  pred.ocultar()
  if (esperaba) seguir(true)
  if (config.objeto !== antes.objeto || config.planeta !== antes.planeta) return soltar()
  if (config.volumen !== antes.volumen) estado = reescalar(antes, config, estado)
}

const consola = crearConsola({ cambiar: aplicar, soltar: () => (pred.ocultar(), soltar()), alternar, ayuda: () => ayuda.abrir(COMO_FUNCIONA) }, config)
lab.append(hud('der', consola.el, pred.el), ayuda.el)
consola.sincronizar(config)
reiniciarCurva()

let relatoPrevio = ''
function actualizarHud(d: ReturnType<typeof derivar>) {
  mPeso.set(newtons(d.peso), 'N')
  mEmpuje.set(newtons(d.empuje), 'N')
  mSumergido.set(num(d.sumergido * 100, 0), '%')
  mDensidad.set(num(d.rhoObjeto / d.rhoLiquido, 2))
  consola.setReloj(`Cámara lenta · ${num(estado.t, 1)} s${corriendo ? (pred.enCurso ? ' · midiendo' : '') : ' · detenido'}`)
  const texto = relato(config, estado, d, soltado)
  if (texto !== relatoPrevio) ahora.innerHTML = relatoPrevio = texto
}

let anterior = performance.now()
function cuadro(t: number) {
  const dtReal = Math.min((t - anterior) / 1000, 0.1)
  anterior = t
  if (corriendo) {
    let restante = dtReal * RITMO
    while (restante > 1e-9) {
      const dt = Math.min(restante, 1 / 240)
      estado = paso(config, estado, dt)
      restante -= dt
    }
    if (estado.t - ultimoPunto >= MUESTREO_S) muestrear()
    if (pred.enCurso && terminado(config, estado)) revelar()
  }
  const d = derivar(config, estado)
  actualizarHud(d)
  escena.dibujar(config, estado, d, t / 1000)
  requestAnimationFrame(cuadro)
}
requestAnimationFrame(cuadro)
