import '../../ui/kit.css'
import './estilos.css'
import { interruptorAvanzado } from '../../ui/avanzado'
import { grupo, interruptor, metrica, modal, segmentado } from '../../ui/componentes'
import { deslizador } from '../../ui/deslizador'
import { h } from '../../ui/dom'
import { grafico } from '../../ui/grafico'
import { hud } from '../../ui/hud'
import { interruptorPreguntas, prediccion } from '../../ui/prediccion'
import { COMO_FUNCIONA, GANCHO, etiquetaEstado, num, relato } from './contenido'
import { crearEscena } from './escena'
import {
  POTENCIA_INICIAL_W, SUSTANCIAS, T_TOPE_CALOR, T_TOPE_FRIO, estadoInicial, leer, paso, velocidadMedia, type Config, type Lectura, type Sustancia,
} from './model'
import { preguntaPara, type Pregunta, type Respuesta } from './prediccion'

/** Segundos simulados por segundo real, según la velocidad elegida. */
const SEGUNDOS_POR_SEGUNDO: Record<string, number> = { '0.5': 10, '1': 20, '3': 60, '10': 200 }
/** Cada cuántos segundos simulados se suma un punto al gráfico (más espaciado en corridas largas). */
const MUESTREO_S = 1
const PUNTOS_APROX = 400
const PASO_MAX_S = 0.5

type Modo = 'enfriar' | 'apagada' | 'calentar'

const lab = document.querySelector<HTMLElement>('#lab')!
let sus = SUSTANCIAS[0]
let config: Config = { tapa: false, latente: true }
let estado = estadoInicial(sus)
/** Lo que muestra la pantalla en este cuadro: decide cuándo se puede revelar. */
let lectura: Lectura = leer(estado, sus, config)
let modo: Modo = 'calentar'
let magnitud = POTENCIA_INICIAL_W
let velocidad = '1'
let corriendo = true
const potencia = () => (modo === 'calentar' ? magnitud : modo === 'enfriar' ? -magnitud : 0)

const escena = crearEscena(lab)

// --- HUD izquierdo: título, métricas, relato en vivo y gráfico ---
const gancho = h('p', { class: 'gancho' })
gancho.innerHTML = GANCHO
const mTemp = metrica('Temperatura')
const mEstado = metrica('Estado')
const mEnergia = metrica('Energía')
const mVel = metrica('Velocidad')
mVel.el.classList.add('avanzado')

const fSolido = h('i', { class: 'f-solido' })
const fLiquido = h('i', { class: 'f-liquido' })
const fGas = h('i', { class: 'f-gas' })
const pSolido = h('b')
const pLiquido = h('b')
const pGas = h('b')
const textoAhora = h('div')
const ahora = h('div', { class: 'panel ahora' },
  h('div', { class: 'fases' },
    h('div', { class: 'fases-barra' }, fSolido, fLiquido, fGas),
    h('div', { class: 'fases-leyenda' },
      h('span', { class: 'c-cielo' }, 'Sólido ', pSolido),
      h('span', { class: 'c-marca' }, 'Líquido ', pLiquido),
      h('span', { class: 'c-magenta' }, 'Gas ', pGas)),
  ),
  textoAhora,
)

const curva = grafico([{ id: 'temp', nombre: 'Temperatura', color: 'ambar' }], {
  titulo: 'Temperatura en el tiempo', unidadX: ' s', unidadY: '°C', alto: 140,
})
let ultimoPunto = 0
/** El eje Y va del tope de frío al de calor de la placa: queda fijo durante toda la corrida. */
function reiniciarCurva() {
  curva.limpiar({ yMin: sus.tFusion - T_TOPE_FRIO, yMax: sus.tEbullicion + T_TOPE_CALOR })
  lectura = leer(estado, sus, config)
  curva.agregar(0, { temp: lectura.temp })
  ultimoPunto = 0
}

lab.append(
  hud('izq',
    h('a', { href: '../../', class: 'etiqueta' }, '← Weird Science'),
    h('h1', { class: 'titulo' }, h('small', {}, 'Lab de estados de la materia'), h('span', {}, 'Partículas que se calientan')),
    gancho,
    h('div', { class: 'metricas' }, mTemp.el, mEstado.el, mEnergia.el, mVel.el),
    ahora,
    curva.el,
  ),
)

// --- Consola de controles ---
const ayuda = modal()
const botonPlay = h('button', { class: 'boton boton-marca', type: 'button', onclick: () => alternar() }, '⏸ Pausa')
const reloj = h('span', { class: 'etiqueta' })

// --- Predecí antes de correr: cada vez que se empieza de nuevo, la simulación espera la predicción ---
const pred = prediccion<Respuesta, { pregunta: Pregunta; sus: Sustancia; config: Config }>(() => seguir(true), {
  saltar: () => seguir(true),
  listo: (d) => d.pregunta.listo(lectura),
})
function seguir(va: boolean) {
  corriendo = va
  botonPlay.textContent = va ? '⏸ Pausa' : '▶ Seguir'
}
function predecir() {
  const pregunta = preguntaPara(sus, config)
  if (!pred.preguntar(pregunta.texto, pregunta.opciones, { pregunta, sus, config })) return
  corriendo = false
  botonPlay.textContent = '▶ Saltar'
}
function revelar() {
  const datos = pred.datos
  if (!pred.listo || !datos) return
  // La potencia solo cambia los segundos de la explicación: se usa la de ahora.
  const r = datos.pregunta.resolver({ sus: datos.sus, config: datos.config, potencia: potencia() > 0 ? potencia() : POTENCIA_INICIAL_W })
  pred.revelar(r.correcta, r.explicacion)
}

function alternar() {
  if (pred.pendiente) return pred.saltar()
  seguir(!corriendo)
}

// --- Placa: modo + potencia ---
const potenciaPlaca = deslizador({
  titulo: 'Potencia', clase: 'potencia', min: 100, max: 1000, paso: 50, valor: magnitud,
  formato: (v) => (modo === 'apagada' ? 'placa apagada' : `${v} W`),
  alCambiar: (v) => (magnitud = v),
})
function mostrarPotencia() {
  potenciaPlaca.set(magnitud)
  potenciaPlaca.el.classList.toggle('enfria', modo === 'enfriar')
  potenciaPlaca.el.classList.toggle('apagada', modo === 'apagada')
}
const selectorModo = segmentado<Modo>(
  [{ valor: 'enfriar', texto: 'Enfriar' }, { valor: 'apagada', texto: 'Apagada' }, { valor: 'calentar', texto: 'Calentar' }],
  modo,
  (v) => {
    modo = v
    mostrarPotencia()
  },
)

function reiniciar() {
  estado = estadoInicial(sus)
  escena.reiniciar()
  modo = 'calentar'
  magnitud = POTENCIA_INICIAL_W
  selectorModo.set(modo)
  mostrarPotencia()
  reiniciarCurva()
  seguir(true)
  predecir()
}
/** Romper algo reinicia el experimento con la pregunta que corresponde. */
function cambiarConfig(clave: keyof Config, valor: boolean) {
  config = { ...config, [clave]: valor }
  reiniciar()
}
const interruptorConfig = (texto: string, clave: keyof Config) => interruptor(texto, Boolean(config[clave]), (si) => cambiarConfig(clave, si)).el

lab.append(
  hud('der',
    h('div', { class: 'panel consola' },
      h('div', { class: 'fila' }, botonPlay, h('button', { class: 'boton', type: 'button', onclick: reiniciar }, '↺ Otra vez'),
        h('button', { class: 'boton', type: 'button', 'aria-label': 'Cómo funciona', onclick: () => ayuda.abrir(COMO_FUNCIONA) }, '?')),
      grupo('Placa', h('div', { class: 'grupo' }, selectorModo.el, potenciaPlaca.el)),
      grupo('Sustancia', segmentado(SUSTANCIAS.map((s) => ({ valor: s.id, texto: s.nombre })), sus.id, (id) => {
        sus = SUSTANCIAS.find((s) => s.id === id)!
        reiniciar()
      }).el),
      grupo('Velocidad', segmentado([{ valor: '0.5', texto: '½×' }, { valor: '1', texto: '1×' }, { valor: '3', texto: '3×' }, { valor: '10', texto: '10×' }], velocidad, (v) => (velocidad = v)).el),
      reloj,
      grupo('Romper el sistema', h('div', { class: 'grupo' }, interruptorConfig('Tapa de olla a presión', 'tapa'), interruptorConfig('Calor latente', 'latente'))),
      interruptorAvanzado(),
      interruptorPreguntas(),
    ),
    pred.el,
  ),
  ayuda.el,
)

mostrarPotencia()
reiniciarCurva()
predecir()

function tiempo(s: number) {
  const mm = Math.floor(s / 60)
  return `${mm}:${String(Math.floor(s - mm * 60)).padStart(2, '0')}`
}

let relatoPrevio = ''
let ultimoRelato = 0
function actualizarHud(l: Lectura, t: number) {
  const p = potencia()
  mTemp.set(num(l.temp), '°C')
  mEstado.set(etiquetaEstado(l, p))
  mEnergia.set(num(estado.energia / 1000), 'kJ')
  mVel.set(num(velocidadMedia(l.tempK, sus), 0), 'm/s')
  for (const [barra, texto, f] of [[fSolido, pSolido, l.fs], [fLiquido, pLiquido, l.fl], [fGas, pGas, l.fg]] as const) {
    barra.style.flexBasis = `${f * 100}%`
    texto.textContent = `${Math.round(f * 100)}%`
  }
  reloj.textContent = corriendo ? `Tiempo ${tiempo(estado.t)} · reloj ×${SEGUNDOS_POR_SEGUNDO[velocidad]}` : `Tiempo ${tiempo(estado.t)} · reloj detenido`

  if (t - ultimoRelato < 100) return
  ultimoRelato = t
  const texto = relato(l, { sus, config, potencia: p })
  if (texto !== relatoPrevio) textoAhora.innerHTML = relatoPrevio = texto
}

let anterior = performance.now()
function cuadro(t: number) {
  const dtReal = Math.min((t - anterior) / 1000, 0.1)
  anterior = t
  if (corriendo) {
    let restante = dtReal * SEGUNDOS_POR_SEGUNDO[velocidad]
    while (restante > 0) {
      const dt = Math.min(restante, PASO_MAX_S)
      estado = paso(estado, sus, config, potencia(), dt)
      restante -= dt
    }
  }
  lectura = leer(estado, sus, config)
  if (estado.t - ultimoPunto >= Math.max(MUESTREO_S, estado.t / PUNTOS_APROX)) {
    curva.agregar(estado.t, { temp: lectura.temp })
    ultimoPunto = estado.t
  }
  revelar()
  actualizarHud(lectura, t)
  escena.dibujar(lectura, sus, config, potencia(), t)
  requestAnimationFrame(cuadro)
}
requestAnimationFrame(cuadro)
