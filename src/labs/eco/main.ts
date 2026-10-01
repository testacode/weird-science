import '../../ui/kit.css'
import './eco.css'
import { metrica, modal } from '../../ui/componentes'
import { h } from '../../ui/dom'
import { grafico, type Serie } from '../../ui/grafico'
import { hud } from '../../ui/hud'
import { prediccion } from '../../ui/prediccion'
import { crearAudio } from './audio'
import { COMO_FUNCIONA, GANCHO, ms, num, relato, textoOido, type Medicion } from './contenido'
import { crearControles } from './controles'
import { crearEscena } from './escena'
import {
  CONFIG_INICIAL, ESTADO_INICIAL, claseSegura, clasificar, distanciaAlAzar, ecoPasado, medioDe, nivelEco, nivelEn, paso, ruido, superficie, tiempoEco, tiempoFinal, velocidad,
  type Clase, type Config, type Estado,
} from './model'
import { armar, resolver, type Datos, type Respuesta, type Tipo } from './prediccion'

const lab = document.querySelector<HTMLElement>('#lab')!
let config: Config = { ...CONFIG_INICIAL }
let estado: Estado = ESTADO_INICIAL
let corriendo = true
let medir: Medicion = { estimacion: 0, comprobada: false }
/** El grito anterior: sirve para la pregunta de "más fuerte". */
let ultimo: Config | null = null
/** Tipos de pregunta ya hechos desde el último "Otra vez" (el eco se pregunta una vez por cada resultado posible). */
const preguntadas = new Set<Tipo>()
const clasesPreguntadas = new Set<Clase>()

const escena = crearEscena(lab)
const audio = crearAudio()

// --- HUD izquierdo: título, métricas, relato en vivo y sonómetro ---
const gancho = h('p', { class: 'gancho' })
gancho.innerHTML = GANCHO
const mIda = metrica('Ida-vuelta')
const mVel = metrica('Velocidad')
const mEco = metrica('Eco')
const mOido = metrica('Se oye')
mIda.el.classList.add('c-magenta')
mVel.el.classList.add('c-cielo')
const ahora = h('div', { class: 'panel ahora' })

const SERIES: Serie[] = [{ id: 'nivel', nombre: 'Lo que oís', color: 'cielo' }, { id: 'ruido', nombre: 'Ruido de fondo', color: '#93a8a0' }]
const curva = grafico(SERIES, { titulo: 'Sonómetro a tu lado', unidadX: ' ms', unidadY: ' dB', yMax: 100, yMin: 0, yTecho: 100, alto: 130 })
let ultimoX = -1
function graficar() {
  curva.cambiar(SERIES, { titulo: 'Sonómetro a tu lado', unidadX: ' ms', unidadY: ' dB', xMax: tiempoFinal(config) * 1000, yMax: 100, yMin: 0, yTecho: 100 })
  ultimoX = -1
}
/** Suma puntos hasta el instante actual, de a 8 ms como mucho: la campana del pulso (30 ms) se dibuja bien aunque la animación sea lenta. */
function graficarHasta(t: number) {
  if (ultimoX >= t) return
  let x = Math.max(ultimoX, 0)
  if (ultimoX < 0) curva.agregar(0, { nivel: nivelEn(config, 0), ruido: ruido(config) })
  while (x < t) {
    x = Math.min(t, x + 0.008)
    curva.agregar(x * 1000, { nivel: nivelEn(config, x), ruido: ruido(config) })
  }
  ultimoX = t
}

lab.append(
  hud('izq',
    h('a', { href: '../../', class: 'etiqueta' }, '← Weird Science'),
    h('h1', { class: 'titulo' }, h('small', {}, 'Lab del eco'), h('span', {}, 'Ida y vuelta')),
    gancho,
    h('div', { class: 'metricas' }, mIda.el, mVel.el, mEco.el, mOido.el),
    ahora,
    curva.el,
  ),
)

// --- Predecí antes de correr: la pregunta va antes del grito y el grito sale al responder ---
const ayuda = modal()
const pred = prediccion<Respuesta, Datos>(() => {
  const d = pred.datos
  if (d) lanzar(d.tipo)
}, {
  // Saltar (o apagar las preguntas): se grita igual, sin predicción.
  saltar: (d) => d && lanzar(d.tipo),
  textoSaltar: 'Saltar y gritar igual',
  listo: (d) => ecoPasado(estado, d.config),
})
function revelar() {
  const d = pred.datos
  if (!pred.listo || !d) return
  const r = resolver(d)
  pred.revelar(r.correcta, r.explicacion)
  mostrarTarjeta()
}
/** Qué se pregunta antes de este grito (o `null` si va directo). */
function elegir(): Datos | null {
  if (config.modo !== 'explorar') return null
  if (!preguntadas.has('mismo')) return { tipo: 'mismo', config: { ...config } }
  const u = ultimo
  if (u && !preguntadas.has('volumen') && config.volumen - u.volumen >= 10 && u.superficie === config.superficie && u.distancia === config.distancia && u.temperatura === config.temperatura) {
    return { tipo: 'volumen', config: { ...config }, previo: { volumen: u.volumen, tiempo: tiempoEco(u) } }
  }
  if (medioDe(config) === 'aire' && !clasesPreguntadas.has(clasificar(config)) && claseSegura(config)) return { tipo: 'eco', config: { ...config } }
  return null
}

function lanzar(tipo?: Tipo) {
  if (tipo) {
    preguntadas.add(tipo)
    if (tipo === 'eco') clasesPreguntadas.add(clasificar(config))
  }
  ultimo = { ...config }
  estado = { t: 0 }
  corriendo = true
  graficar()
  sincronizar()
}
function gritar() {
  if (pred.enCurso) return lanzar()
  if (pred.pendiente) pred.ocultar()
  const d = elegir()
  if (!d) return lanzar()
  const p = armar(d)
  if (pred.preguntar(p.texto, p.opciones, d)) mostrarTarjeta()
}
/** La tarjeta queda abajo de la consola: se acerca para que se vea la pregunta y el veredicto. */
function mostrarTarjeta() {
  pred.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

// --- Cambios de la config ---
const rango = (c: Config) => superficie(c.superficie).distancia
function nuevoDesafio() {
  config = { ...config, distancia: distanciaAlAzar(config.superficie) }
  medir = { estimacion: Math.round((rango(config).min + rango(config).max) / 2), comprobada: false }
}
function pedir(cambio: Partial<Config>) {
  // Un cambio de lugar o de modo deja vieja hasta la pregunta ya respondida; con un deslizador, la explicación se sigue leyendo.
  if (pred.pendiente || pred.enCurso || cambio.superficie || cambio.modo) pred.ocultar()
  const previa = config
  config = { ...config, ...cambio }
  if (cambio.superficie && cambio.superficie !== previa.superficie) config.distancia = rango(config).inicial
  if (cambio.modo === 'explorar' && previa.modo === 'medir') config.distancia = rango(config).inicial
  estado = ESTADO_INICIAL
  if (config.modo === 'medir' && (previa.modo !== 'medir' || cambio.superficie)) nuevoDesafio()
  graficar()
  sincronizar()
}
function reiniciar() {
  pred.ocultar()
  preguntadas.clear()
  clasesPreguntadas.clear()
  ultimo = null
  config = { ...CONFIG_INICIAL }
  estado = ESTADO_INICIAL
  corriendo = true
  medir = { estimacion: 0, comprobada: false }
  graficar()
  sincronizar()
}
const puedeComprobar = () => config.modo === 'medir' && !medir.comprobada && ecoPasado(estado, config)
function sincronizar() {
  controles.sincronizar(config, { corriendo, estimacion: medir.estimacion, puedeComprobar: puedeComprobar() })
}

const controles = crearControles(config, {
  pedir, gritar, reiniciar,
  alternar: () => {
    corriendo = !corriendo
    sincronizar()
  },
  ayuda: () => ayuda.abrir(COMO_FUNCIONA),
  estimar: (m) => {
    medir = { estimacion: m, comprobada: false }
    sincronizar()
  },
  comprobar: () => {
    medir = { ...medir, comprobada: true }
    sincronizar()
  },
  otraDistancia: () => {
    estado = ESTADO_INICIAL
    nuevoDesafio()
    graficar()
    sincronizar()
  },
  oir: () => {
    audio.reproducir(config.volumen, nivelEco(config), tiempoEco(config), ruido(config))
  },
})
lab.append(hud('der', controles.el, pred.el), ayuda.el)
medir.estimacion = Math.round((rango(config).min + rango(config).max) / 2)
sincronizar()
graficar()

// --- Cuadro a cuadro ---
let relatoPrevio = ''
let ultimoRelato = 0
let comprobabaAntes = false
function actualizarHud(t: number) {
  const llego = estado.t !== null && estado.t >= tiempoEco(config)
  const modoMedir = config.modo === 'medir'
  mIda.set(estado.t === null ? '—' : ms(Math.min(estado.t, tiempoEco(config))))
  mVel.set(num(velocidad(config), 0), 'm/s')
  mEco.set(llego ? num(nivelEco(config), 0) : '—', llego ? 'dB' : '')
  mOido.set(textoOido(config, estado))
  const puede = puedeComprobar()
  if (puede !== comprobabaAntes) {
    comprobabaAntes = puede
    sincronizar()
  }
  if (t - ultimoRelato < 100) return
  ultimoRelato = t
  const texto = relato(config, estado, modoMedir ? medir : null)
  if (texto !== relatoPrevio) ahora.innerHTML = relatoPrevio = texto
}

let anterior = performance.now()
function cuadro(t: number) {
  const dt = Math.max(0, Math.min((t - anterior) / 1000, 0.1))
  anterior = t
  if (corriendo) estado = paso(estado, config, dt)
  if (estado.t !== null) graficarHasta(estado.t)
  revelar()
  actualizarHud(t)
  escena.dibujar(config, estado, config.modo !== 'medir' || medir.comprobada)
  requestAnimationFrame(cuadro)
}
requestAnimationFrame(cuadro)
