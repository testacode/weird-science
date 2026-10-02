import '../../ui/kit.css'
import './mezclas.css'
import { interruptorAvanzado } from '../../ui/avanzado'
import { grupo, interruptor, metrica, modal, segmentado } from '../../ui/componentes'
import { deslizador } from '../../ui/deslizador'
import { h } from '../../ui/dom'
import { numero } from '../../ui/formato'
import { grafico } from '../../ui/grafico'
import { hud } from '../../ui/hud'
import { interruptorPreguntas, prediccion } from '../../ui/prediccion'
import { COMO_FUNCIONA, GANCHO, num, relato } from './contenido'
import { ESPECIES, MEZCLAS, METODOS, mezclaDe, metodoDe, type MetodoId, type MezclaId } from './datos'
import { crearEscena } from './escena'
import { T_MECHERO, leer, relojPara, simular, veredictoDe, type Config, type Corrida, type Lectura } from './model'
import { preguntaPara, type Pregunta, type Respuesta } from './prediccion'

/** Segundos reales que se espera, con la mezcla ya en la estación, antes de que el modelo empiece a correr. */
const ESPERA_S = 1.6
const PUNTOS_GRAFICO = 120
const COLOR_VEREDICTO = { funciona: 'c-marca', parcial: 'c-ambar', no: 'c-magenta' } as const

type Fase = 'listo' | 'espera' | 'corriendo' | 'terminado'

const lab = document.querySelector<HTMLElement>('#lab')!
// Arranca con la idea errónea clásica: filtrar agua salada.
let config: Config = { mezcla: 'agua-sal', metodo: 'filtro', sobresaturar: false, tMechero: T_MECHERO.inicial }
let corrida: Corrida = simular(config)
let fase: Fase = 'listo'
let t = 0
let espera = 0
const escena = crearEscena(lab)

// --- HUD izquierdo: título, métricas, tarjeta "ahora" y gráfico ---
const gancho = h('p', { class: 'gancho' })
gancho.innerHTML = GANCHO
const mPureza = metrica('Pureza')
const mTiempo = metrica('Tiempo')
const mTipo = metrica('Mezcla')
const mPropiedad = metrica('Propiedad')
mPropiedad.el.classList.add('avanzado')
const filaRecuperado = (i: number) => {
  const nombre = h('span')
  const barra = h('i')
  const valor = h('b')
  return { el: h('div', { class: 'recuperado' }, nombre, h('div', { class: 'barra' }, barra), valor), nombre, barra, valor, i }
}
const filas = [filaRecuperado(0), filaRecuperado(1)]
const textoAhora = h('div')
const ahora = h('div', { class: 'panel ahora' }, h('div', { class: 'recuperados' }, ...filas.map((f) => f.el)), textoAhora)

/**
 * Las series (una por componente) y la unidad del tiempo cambian solo con la mezcla o la unidad: ahí se usa `cambiar()`.
 * Para todo lo demás (método, mechero, sal) alcanza con `limpiar()`.
 */
const curva = grafico([], { alto: 110 })
let claveCurva = ''
let ultimoPunto = 0
/** La destilación dura minutos u horas: su eje va en minutos. */
const escalaTiempo = () => (config.metodo === 'destilacion' ? 1 / 60 : 1)
function armarGrafico() {
  const escalaT = escalaTiempo()
  const especies = mezclaDe(config.mezcla).partes.map((p) => p.especie)
  const total = (e: string) => corrida.porciones.filter((p) => p.especie === e).reduce((s, p) => s + p.masa, 0)
  const escala = { xMax: corrida.duracion * escalaT, yMax: Math.max(...especies.map(total)) }
  const clave = `${config.mezcla}|${escalaT}`
  if (clave === claveCurva) curva.limpiar(escala)
  else {
    claveCurva = clave
    curva.cambiar(especies.map((e) => ({ id: e, nombre: ESPECIES[e].nombre, color: ESPECIES[e].color })), {
      titulo: 'Gramos recuperados', unidadX: escalaT < 1 ? ' min' : ' s', unidadY: 'g', ...escala,
    })
  }
  ultimoPunto = -1
  agregarPunto(leer(corrida, 0))
}
function agregarPunto(l: Lectura) {
  curva.agregar(l.t * escalaTiempo(), Object.fromEntries(l.recuperado.map((r) => [r.especie, r.g])))
  ultimoPunto = l.t
}

lab.append(
  hud('izq',
    h('a', { href: '../../', class: 'etiqueta' }, '← Weird Science'),
    h('h1', { class: 'titulo' }, h('small', {}, 'Lab de mezclas y separación'), h('span', {}, 'Separá lo que está mezclado')),
    gancho,
    h('div', { class: 'metricas' }, mPureza.el, mTiempo.el, mTipo.el, mPropiedad.el),
    ahora,
    curva.el,
  ),
)

// --- Consola ---
const ayuda = modal()
// Separar sin responder deja la pregunta de lado: si no, se podría contestar después de ver el resultado.
const botonSeparar = h('button', { class: 'boton boton-marca', type: 'button', onclick: () => (pred.ocultar(), separar()) }, 'Separar')
const reloj = h('span', { class: 'etiqueta' })
const pred = prediccion<Respuesta, { pregunta: Pregunta; config: Config }>(() => separar(), {
  // A la mitad de la separación ya se ve el resultado.
  listo: () => fase !== 'listo' && t >= corrida.duracion * 0.5,
  resolver: (d) => d.pregunta.resolver(d.config),
})

const selectorMezcla = segmentado<MezclaId>(MEZCLAS.map((m) => ({ valor: m.id, texto: m.nombre })), config.mezcla, (m) =>
  cambiar({ mezcla: m, sobresaturar: m === 'agua-sal' ? config.sobresaturar : false }))
const selectorMetodo = segmentado<MetodoId>(METODOS.map((m) => ({ valor: m.id, texto: m.nombre })), config.metodo, (m) => cambiar({ metodo: m }))
const mechero = deslizador({
  titulo: 'Mechero', min: T_MECHERO.min, max: T_MECHERO.max, paso: T_MECHERO.paso, valor: config.tMechero, color: 'var(--ambar)', clase: 'mechero',
  formato: (v) => `${v} °C`, alCambiar: (v) => cambiar({ tMechero: v }),
})
const sobresaturar = interruptor('Sobresaturar con sal', false, (si) =>
  cambiar({ sobresaturar: si, mezcla: si ? 'agua-sal' : config.mezcla }))

/** Pone todos los controles en el estado de `config` (también cuando el cambio vino de un botón de "romper"). */
function mostrarControles() {
  selectorMezcla.set(config.mezcla)
  selectorMetodo.set(config.metodo)
  sobresaturar.set(config.sobresaturar)
  mechero.set(config.tMechero)
  mechero.input.disabled = fase !== 'listo'
  mechero.el.hidden = config.metodo !== 'destilacion'
  botonSeparar.disabled = fase !== 'listo'
}

/** Un cambio de mezcla, método, sal o mechero reinicia el experimento con la pregunta que corresponde. */
function cambiar(cambio: Partial<Config>) {
  config = { ...config, ...cambio }
  reiniciar()
}
function reiniciar() {
  corrida = simular(config)
  fase = 'listo'
  t = 0
  escena.preparar(corrida)
  armarGrafico()
  const pregunta = preguntaPara(config)
  pred.preguntar(pregunta.texto, pregunta.opciones, { pregunta, config })
  mostrarControles()
}
function separar() {
  if (fase !== 'listo') return
  fase = 'espera'
  espera = ESPERA_S
  mostrarControles()
}

lab.append(
  hud('der',
    h('div', { class: 'panel consola' },
      h('div', { class: 'fila' }, botonSeparar, h('button', { class: 'boton', type: 'button', onclick: reiniciar }, '↺ Otra vez'),
        h('button', { class: 'boton', type: 'button', 'aria-label': 'Cómo funciona', onclick: () => ayuda.abrir(COMO_FUNCIONA) }, '?')),
      grupo('Mezcla', selectorMezcla.el),
      grupo('Método de separación', selectorMetodo.el),
      mechero.el,
      reloj,
      grupo('Romper el sistema', h('div', { class: 'grupo' },
        h('button', { class: 'boton', type: 'button', onclick: () => cambiar({ mezcla: 'agua-sal', metodo: 'filtro', sobresaturar: false }) }, 'Filtrar agua salada'),
        sobresaturar.el)),
      interruptorAvanzado(),
      interruptorPreguntas(),
    ),
    pred.el,
  ),
  ayuda.el,
)

function tiempo(s: number) {
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s - hh * 3600) / 60)
  const ss = String(Math.floor(s % 60)).padStart(2, '0')
  return hh ? `${hh}:${String(mm).padStart(2, '0')}:${ss}` : `${mm}:${ss}`
}

let relatoPrevio = ''
function actualizarHud(l: Lectura) {
  const v = l.pureza == null ? null : veredictoDe(l.pureza)
  mPureza.set(l.pureza == null ? '—' : num(l.pureza, 0), l.pureza == null ? '' : '%')
  mPureza.el.classList.remove('c-marca', 'c-ambar', 'c-magenta')
  if (v && l.terminado) mPureza.el.classList.add(COLOR_VEREDICTO[v])
  mTiempo.set(tiempo(l.t))
  mTipo.set(corrida.tipo.homogenea ? 'Homogénea' : 'Heterogénea')
  mPropiedad.set(metodoDe(config.metodo).propiedad)
  l.recuperado.forEach((r, k) => {
    const f = filas[k]
    f.nombre.textContent = ESPECIES[r.especie].nombre
    f.nombre.style.color = ESPECIES[r.especie].color
    f.barra.style.width = `${r.total > 0 ? (r.g / r.total) * 100 : 0}%`
    f.barra.style.background = ESPECIES[r.especie].color
    f.valor.textContent = `${numero(r.g, 1)} / ${numero(r.total, 0)} g`
  })
  const texto = relato(corrida, l, fase !== 'listo', config.tMechero)
  if (texto !== relatoPrevio) textoAhora.innerHTML = relatoPrevio = texto
  const velocidad = relojPara(corrida)
  reloj.textContent = fase === 'listo' ? `Duración ${tiempo(corrida.duracion)} · reloj ×${num(velocidad, 0)}` : `Tiempo ${tiempo(l.t)} · reloj ×${num(velocidad, 0)}`
}

let anterior = performance.now()
function cuadro(ahoraMs: number) {
  const dt = Math.min(Math.max(0, ahoraMs - anterior) / 1000, 0.1)
  anterior = ahoraMs
  if (fase === 'espera') {
    espera -= dt
    if (espera <= 0) fase = 'corriendo'
  } else if (fase === 'corriendo') {
    t = Math.min(corrida.duracion, t + dt * relojPara(corrida))
    if (t >= corrida.duracion) {
      fase = 'terminado'
      mostrarControles()
    }
  }
  const lectura = leer(corrida, t)
  if (fase !== 'listo' && lectura.t - ultimoPunto >= corrida.duracion / PUNTOS_GRAFICO) agregarPunto(lectura)
  if (fase === 'terminado' && ultimoPunto < corrida.duracion) agregarPunto(lectura)
  pred.revisar()
  actualizarHud(lectura)
  escena.dibujar({ lectura, iniciado: fase !== 'listo', ahora: ahoraMs }, config.tMechero)
  requestAnimationFrame(cuadro)
}

reiniciar()
requestAnimationFrame(cuadro)
