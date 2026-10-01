import '../../ui/kit.css'
import './estaciones.css'
import { interruptorAvanzado } from '../../ui/avanzado'
import { grupo, metrica, modal, segmentado } from '../../ui/componentes'
import { deslizador } from '../../ui/deslizador'
import { h } from '../../ui/dom'
import { grafico } from '../../ui/grafico'
import { hud } from '../../ui/hud'
import { prediccion } from '../../ui/prediccion'
import { COMO_FUNCIONA, GANCHO, num, relato } from './contenido'
import { crearEscena } from './escena'
import { crearInset } from './inset'
import { lineaDeTiempo } from './linea'
import { CIUDADES, INCLINACION, NOMBRE_ESTACION, YEAR, diaDelAnio, fecha, ideaDistancia, rangoAnual, resumen, type IdCiudad } from './model'
import { preguntaPara, type Pregunta, type Respuesta } from './prediccion'

/** Días del año por segundo real a velocidad 1× (un año en ~20 s). */
const DIAS_POR_SEGUNDO = 18
type ModoGrafico = 'luz' | 'energia'

const lab = document.querySelector<HTMLElement>('#lab')!
let ciudad = CIUDADES['buenos-aires']
let eps = INCLINACION
let idea = false
let modoGrafico: ModoGrafico = 'luz'
let t = 0
let velocidad = 1
let corriendo = false
const avanzadoActivo = () => !document.body.classList.contains('sin-avanzado')

const escena = crearEscena(lab)
const inset = crearInset()

// --- Gráfico: horas de luz (o energía) vs día del año, el año completo, con una marca en el día de hoy. ---
/** El kit dibuja el eje con estos márgenes (src/ui/grafico.ts); la marca de "hoy" se alinea con ellos. */
const MARGEN_GRAFICO = { izq: 34, der: 8, arriba: 6, abajo: 18 }
/** Cada cuántos días se toma una muestra de la curva. */
const MUESTREO_DIAS = 4

function valoresCurva(x: number) {
  const r = resumen(x, ciudad, eps)
  return modoGrafico === 'luz' ? { obs: r.horas } : { obs: r.energiaVsPromedio, ...(idea && { idea: ideaDistancia(x) }) }
}
/** Dibuja el año completo con la escala de la ciudad y la inclinación actuales. */
function llenarCurva(g: ReturnType<typeof grafico>) {
  g.limpiar({ yMax: rangoAnual(ciudad.lat, eps, modoGrafico === 'luz' ? 'horas' : 'energia').max })
  for (let x = 0; x < YEAR; x += MUESTREO_DIAS) g.agregar(x, valoresCurva(x))
  g.agregar(YEAR, valoresCurva(YEAR))
}
function crearCurva() {
  const luz = modoGrafico === 'luz'
  const series = luz
    ? [{ id: 'obs', nombre: 'Horas de luz', color: 'ambar' }]
    : [{ id: 'obs', nombre: ciudad.nombre, color: 'ambar' }, ...(idea ? [{ id: 'idea', nombre: 'Idea: distancia', color: 'magenta' }] : [])]
  const g = grafico(series, {
    titulo: luz ? 'Horas de luz según el día del año' : 'Energía por m² (% del promedio anual)',
    unidadX: ' d', unidadY: luz ? ' h' : ' %', xMax: YEAR, yMax: 0, alto: 104,
  })
  llenarCurva(g)
  g.el.append(marcaHoy)
  return g
}
const marcaHoy = h('span', { class: 'marca-hoy' })
let curva = crearCurva()
/** Cambió la ciudad o el tipo de gráfico (cambian las series): se arma de nuevo. */
function rehacerCurva() {
  const vieja = curva.el
  curva = crearCurva()
  vieja.replaceWith(curva.el)
}
function ubicarMarca(d: number) {
  const lienzo = curva.el.querySelector<HTMLElement>('canvas')
  if (!lienzo?.clientHeight) return
  const { izq, der, arriba, abajo } = MARGEN_GRAFICO
  marcaHoy.style.left = `${lienzo.offsetLeft + izq + (d / YEAR) * (lienzo.clientWidth - izq - der)}px`
  marcaHoy.style.top = `${lienzo.offsetTop + arriba}px`
  marcaHoy.style.height = `${lienzo.clientHeight - arriba - abajo}px`
}

// --- HUD izquierdo ---
const gancho = h('p', { class: 'gancho' })
gancho.innerHTML = GANCHO
const mEstacion = metrica('Estación')
const mAltura = metrica('Altura Sol')
const mHoras = metrica('Horas luz')
const mDist = metrica('Distancia')
mEstacion.el.classList.add('m-ciudad')
mAltura.el.classList.add('m-sol')
mHoras.el.classList.add('m-sol')
mDist.el.classList.add('m-tierra')
const ahora = h('div', { class: 'panel ahora' })
const modo = segmentado<ModoGrafico>([{ valor: 'luz', texto: 'Horas de luz' }, { valor: 'energia', texto: 'Energía' }], modoGrafico, (v) => {
  modoGrafico = v
  rehacerCurva()
})
lab.append(
  hud('izq',
    h('a', { href: '../../', class: 'etiqueta' }, '← Weird Science'),
    h('h1', { class: 'titulo' }, h('small', {}, 'Lab de la Tierra'), h('span', {}, 'Las estaciones')),
    gancho,
    h('div', { class: 'metricas' }, mEstacion.el, mAltura.el, mHoras.el, mDist.el),
    ahora,
    h('div', { class: 'modo-grafico' }, modo.el),
    curva.el,
  ),
  h('div', { class: 'hud-inset' }, inset.el),
)

// --- Línea de tiempo ---
function irAlDia(dia: number) {
  // Se queda en la vuelta más cercana al tiempo actual, así arrastrar no cambia de año por accidente.
  t = dia + YEAR * Math.round((t - dia) / YEAR)
  revisarPrediccion(false)
}
/** Las marcas de fecha van hacia adelante: a la próxima vez que llega ese día, sin volver al año anterior. */
function irALaFecha(dia: number) {
  t = dia + YEAR * Math.ceil((t - dia) / YEAR - 1e-9)
  revisarPrediccion(false)
}
const tiempo = lineaDeTiempo(irAlDia, irALaFecha)
lab.append(h('div', { class: 'hud-linea' }, tiempo.el))

// --- Predecí antes de correr: arranca pausado hasta que el usuario elige (o salta la pregunta) ---
const ayuda = modal()
const botonPlay = h('button', { class: 'boton boton-marca', type: 'button', onclick: () => alternar() }, '▶ Seguir')
let pregunta: Pregunta | null = null
let tRevela = 0
const pred = prediccion<Respuesta>(() => seguir(true))
function seguir(va: boolean) {
  corriendo = va
  botonPlay.textContent = va ? '⏸ Pausa' : '▶ Seguir'
}
function predecir() {
  pregunta = preguntaPara(eps, idea)
  t = pregunta.inicio
  tRevela = pregunta.revela >= pregunta.inicio ? pregunta.revela : pregunta.revela + YEAR
  pred.preguntar(pregunta.texto, pregunta.opciones)
  corriendo = false
  botonPlay.textContent = '▶ Saltar'
}
/** Al llegar a la fecha clave se revela la respuesta, calculada con el modelo. */
function revisarPrediccion(desdeElJuego: boolean) {
  if (!pregunta || !(pred.enCurso || pred.pendiente) || t < tRevela) return
  if (desdeElJuego) {
    t = tRevela
    seguir(false)
  }
  const r = pregunta.resolver(eps)
  pred.revelar(r.correcta, r.explicacion)
  // En pantallas bajas la tarjeta queda debajo de la consola: se desplaza solo el HUD (con scrollIntoView se movería toda la página).
  const columna = pred.el.parentElement!
  const { offsetTop: arriba, offsetHeight: alto } = pred.el
  const entra = arriba >= columna.scrollTop && arriba + alto <= columna.scrollTop + columna.clientHeight
  if (!entra) columna.scrollTo({ top: Math.max(0, Math.min(arriba + alto - columna.clientHeight + 56, arriba - 10)), behavior: 'smooth' })
}
/** La pregunta se armó para otra inclinación: se retira (la respuesta no coincidiría con lo que se vio). */
function descartarPregunta() {
  if (!pregunta || !(pred.pendiente || pred.enCurso)) return
  pred.ocultar()
  pregunta = null
  seguir(corriendo)
}
function alternar() {
  if (pred.pendiente) {
    pred.ocultar()
    pregunta = null
    return seguir(true)
  }
  seguir(!corriendo)
}
function reiniciar() {
  predecir()
  rehacerCurva()
}

// --- Consola de controles ---
const ciudades = segmentado<IdCiudad>(
  (Object.keys(CIUDADES) as IdCiudad[]).map((id) => ({ valor: id, texto: CIUDADES[id].nombre })),
  ciudad.id,
  (id) => {
    ciudad = CIUDADES[id]
    rehacerCurva()
  },
)
function interruptor(texto: string, activo: boolean, alElegir: (v: boolean) => void) {
  const s = segmentado([{ valor: 'si', texto: 'Sí' }, { valor: 'no', texto: 'No' }], activo ? 'si' : 'no', (v) => alElegir(v === 'si'))
  return { el: h('div', { class: 'interruptor' }, h('span', {}, texto), s.el), set: (v: boolean) => s.set(v ? 'si' : 'no') }
}
const inclinacion = deslizador({
  titulo: 'Inclinación del eje', min: 0, max: 45, paso: 0.01, valor: eps, color: 'var(--cielo)', clase: 'avanzado',
  formato: (v) => `${num(v, 2)}°`,
  alCambiar: (v) => {
    eps = v
    ejeDerecho.set(v === 0)
    descartarPregunta()
    llenarCurva(curva)
  },
})
const ideaDistanciaSwitch = interruptor('¿Y si fuera por la distancia al Sol?', false, (v) => {
  idea = v
  gancho.hidden = v // con la comparación en pantalla, el gancho sobra y el HUD izquierdo no entra en 720 px
  if (v) {
    modoGrafico = 'energia'
    modo.set('energia')
  }
  reiniciar()
})
const ejeDerecho = interruptor('Eje sin inclinación', false, (v) => {
  eps = v ? 0 : INCLINACION
  inclinacion.set(eps)
  reiniciar()
})
// Con la info avanzada apagada no hay slider: una inclinación a medida (ni 0° ni 23,44°) vuelve a la real.
new MutationObserver(() => {
  if (!avanzadoActivo() && eps !== 0 && eps !== INCLINACION) {
    eps = INCLINACION
    inclinacion.set(eps)
    descartarPregunta()
    llenarCurva(curva)
  }
}).observe(document.body, { attributes: true, attributeFilter: ['class'] })

lab.append(
  hud('der',
    h('div', { class: 'panel consola' },
      h('div', { class: 'fila' }, botonPlay, h('button', { class: 'boton', type: 'button', onclick: reiniciar }, '↺ Otra vez'),
        h('button', { class: 'boton', type: 'button', 'aria-label': 'Cómo funciona', onclick: () => ayuda.abrir(COMO_FUNCIONA) }, '?')),
      h('div', { class: 'interruptor' }, h('span', {}, 'Velocidad'), segmentado([{ valor: '0.5', texto: '½×' }, { valor: '1', texto: '1×' }, { valor: '3', texto: '3×' }], '1', (v) => (velocidad = Number(v))).el),
      h('div', { class: 'grupo ciudades' }, h('span', { class: 'etiqueta' }, 'Ciudad'), ciudades.el),
      inclinacion.el,
      grupo('Romper el sistema', h('div', { class: 'grupo' }, ideaDistanciaSwitch.el, ejeDerecho.el)),
      interruptorAvanzado(),
    ),
    pred.el,
  ),
  ayuda.el,
)

let relatoPrevio = ''
function actualizarHud(d: number) {
  const r = resumen(d, ciudad, eps)
  mEstacion.set(r.estacion === 'sin' ? 'Ninguna' : NOMBRE_ESTACION[r.estacion])
  mAltura.set(r.altura > 0 ? num(r.altura, 1) : '—', r.altura > 0 ? '°' : '')
  mHoras.set(num(r.horas, 1), 'h')
  mDist.set(num(r.distancia, 1), 'M km')
  mDist.el.classList.toggle('m-idea', idea)
  tiempo.set(d)
  const texto = relato({ d, ciudad, eps, idea, r, bsas: idea ? resumen(d, CIUDADES['buenos-aires'], eps) : r, madrid: idea ? resumen(d, CIUDADES.madrid, eps) : r })
  if (texto !== relatoPrevio) ahora.innerHTML = relatoPrevio = texto
  inset.dibujar({ ciudad: ciudad.nombre, fecha: fecha(d).corta, r })
  ubicarMarca(d)
  return r
}

let anterior = performance.now()
function cuadro(ahoraMs: number) {
  const dt = Math.min((ahoraMs - anterior) / 1000, 0.1)
  anterior = ahoraMs
  if (corriendo) {
    t += dt * DIAS_POR_SEGUNDO * velocidad
    revisarPrediccion(true)
  }
  const d = diaDelAnio(t)
  const r = actualizarHud(d)
  escena.dibujar({ d, ciudad, eps, idea, avanzado: avanzadoActivo(), distancia: r.distancia })
  requestAnimationFrame(cuadro)
}

predecir()
requestAnimationFrame(cuadro)
