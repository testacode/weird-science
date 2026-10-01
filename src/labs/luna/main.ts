import '../../ui/kit.css'
import './luna.css'
import { interruptorAvanzado } from '../../ui/avanzado'
import { grupo, interruptor, metrica, modal, segmentado } from '../../ui/componentes'
import { h } from '../../ui/dom'
import { grafico } from '../../ui/grafico'
import { hud } from '../../ui/hud'
import { prediccion } from '../../ui/prediccion'
import { COMO_FUNCIONA, GANCHO, PIE_AVANZADO, num, pieVista, relato, type Situacion } from './contenido'
import { crearEscena, type Vista } from './escena'
import { lineaDeTiempo } from './linea'
import {
  CONFIG_NORMAL, MES_SINODICO, diaDelCiclo, eclipse, elongacion, fase, idFase, ideaSombra, iluminada, latitudLunar, numeroDeCiclo,
  proximoEclipse, NOMBRES, type Config, type Hemisferio,
} from './model'
import { T_REVELAR, preguntaPara, type Pregunta, type Respuesta } from './prediccion'

/** Días del ciclo por segundo real a velocidad 1× (un ciclo en ~20 s). */
const DIAS_POR_SEGUNDO = 1.5
/** Durante un eclipse el reloj se frena: dura ~3,5 h y a velocidad normal pasaría en una décima de segundo. */
const DIAS_POR_SEGUNDO_ECLIPSE = 0.04
const TAM_INSET = 160
/** Cada cuántos días se suma un punto al gráfico. */
const MUESTREO_DIAS = 0.25

const lab = document.querySelector<HTMLElement>('#lab')!
let config: Config = { ...CONFIG_NORMAL }
let hem: Hemisferio = 'sur'
let t = 0
let velocidad = 1
let corriendo = false
const avanzadoActivo = () => !document.body.classList.contains('sin-avanzado')

const escena = crearEscena(lab, TAM_INSET)

// --- Gráfico: % iluminada vs día. La curva siempre llega hasta el día actual. ---
const seriesCurva = () => [
  { id: 'real', nombre: config.sombraTierra ? 'Observada' : 'Iluminada', color: 'ambar' },
  ...(config.sombraTierra ? [{ id: 'idea', nombre: 'Idea errónea', color: 'magenta' as const }] : []),
]
const OPCIONES_CURVA = { titulo: '% iluminada según el día', unidadX: ' d', unidadY: '%', xMax: MES_SINODICO, yMax: 100 }
const curva = grafico(seriesCurva(), OPCIONES_CURVA)
let curvaDia = -1
let curvaCiclo = 0
function valoresCurva(dia: number) {
  const g = (360 * dia) / MES_SINODICO
  return { real: iluminada(elongacion(g)) * 100, ...(config.sombraTierra && { idea: ideaSombra(g).iluminada * 100 }) }
}
function reconstruirCurva(dia: number) {
  curva.limpiar()
  const paso = Math.max(0.5, dia / 40)
  for (let x = 0; x < dia; x += paso) curva.agregar(x, valoresCurva(x))
  curva.agregar(dia, valoresCurva(dia))
  curvaDia = dia
}
function actualizarCurva(dia: number, ciclo: number) {
  if (ciclo !== curvaCiclo || dia < curvaDia || dia - curvaDia > 1) {
    curvaCiclo = ciclo
    reconstruirCurva(dia)
  } else if (dia - curvaDia >= MUESTREO_DIAS) {
    curva.agregar(dia, valoresCurva(dia))
    curvaDia = dia
  }
}

// --- HUD izquierdo ---
const gancho = h('p', { class: 'gancho' })
gancho.innerHTML = GANCHO
const mDia = metrica('Día')
const mIluminada = metrica('Iluminada')
const mFase = metrica('Fase')
const mAngulo = metrica('Ángulo')
mAngulo.el.classList.add('avanzado')
const ahora = h('div', { class: 'panel ahora' })
// --- Vista desde la Tierra (círculos) ---
const pie = h('p', { class: 'pie' })
const pieAvanzado = h('p', { class: 'pie-av avanzado' }, PIE_AVANZADO)
const etiquetaReal = h('span', { class: 'etiqueta' }, 'Vista desde la Tierra')
const vistaReal = h('div', { class: 'vista' }, etiquetaReal, h('div', { class: 'disco' }, escena.lienzoReal), pie, pieAvanzado)
const vistaIdea = h('div', { class: 'vista idea', hidden: true },
  h('span', { class: 'etiqueta' }, 'Si fuera la sombra de la Tierra'),
  h('div', { class: 'disco' }, escena.lienzoIdea),
  h('p', { class: 'pie' }, 'Así se vería con esa idea'),
)
lab.append(
  hud('izq',
    h('a', { href: '../../', class: 'etiqueta' }, '← Weird Science'),
    h('h1', { class: 'titulo' }, h('small', {}, 'Lab de astronomía'), h('span', {}, 'Fases de la Luna')),
    gancho,
    h('div', { class: 'metricas' }, mDia.el, mIluminada.el, mFase.el, mAngulo.el),
    ahora,
    curva.el,
    h('div', { class: 'vistas' }, vistaReal, vistaIdea),
  ),
)

// --- Línea de tiempo ---
function irAlDia(dia: number) {
  t = (numeroDeCiclo(t) - 1) * MES_SINODICO + dia
  revisarPrediccion(false)
}
const tiempo = lineaDeTiempo(hem, irAlDia)
lab.append(h('div', { class: 'hud-linea' }, tiempo.el))

// --- Consola de controles ---
const ayuda = modal()
const botonPlay = h('button', { class: 'boton boton-marca', type: 'button', onclick: () => alternar() }, '▶ Seguir')
const reloj = h('span', { class: 'etiqueta' })

// --- Predecí antes de correr: arranca pausado hasta que el usuario elige (o salta la pregunta) ---
const pred = prediccion<Respuesta, { pregunta: Pregunta; config: Config }>(() => seguir(true))
function seguir(va: boolean) {
  corriendo = va
  botonPlay.textContent = va ? '⏸ Pausa' : '▶ Seguir'
}
function predecir() {
  const pregunta = preguntaPara(config)
  pred.preguntar(pregunta.texto, pregunta.opciones, { pregunta, config })
  corriendo = false
  botonPlay.textContent = '▶ Saltar'
}
/** Al llegar a la primera Luna llena se revela la respuesta, calculada con el modelo. */
function revisarPrediccion(desdeElJuego: boolean) {
  const datos = pred.datos
  if (!datos || t < T_REVELAR) return
  if (desdeElJuego) {
    t = T_REVELAR
    seguir(false)
  }
  const r = datos.pregunta.resolver(datos.config)
  pred.revelar(r.correcta, r.explicacion)
}
function alternar() {
  if (pred.pendiente) {
    pred.ocultar()
    return seguir(true)
  }
  seguir(!corriendo)
}
function reiniciar() {
  t = 0
  predecir()
}

function cambiarConfig(clave: keyof Config, valor: boolean) {
  config = { ...config, [clave]: valor }
  if (clave === 'sombraTierra') {
    vistaIdea.hidden = !valor
    etiquetaReal.textContent = valor ? 'Lo que se observa' : 'Vista desde la Tierra'
    curva.cambiar(seriesCurva(), OPCIONES_CURVA)
    curvaCiclo = 0
  } else reiniciar()
}
const interruptorConfig = (texto: string, clave: keyof Config, clases = '') => interruptor(texto, false, (si) => cambiarConfig(clave, si), clases)
const idea = interruptorConfig('¿Y si las fases fueran la sombra de la Tierra?', 'sombraTierra')
const plana = interruptorConfig('Órbita sin inclinación', 'sinInclinacion', 'avanzado')
// Con la info avanzada apagada no hay eclipses ni inclinación: si estaba rota, se arregla.
new MutationObserver(() => {
  if (!avanzadoActivo() && config.sinInclinacion) {
    plana.set(false)
    cambiarConfig('sinInclinacion', false)
  }
}).observe(document.body, { attributes: true, attributeFilter: ['class'] })

const irAlEclipse = h('button', {
  class: 'boton avanzado', type: 'button',
  onclick: () => {
    const llena = proximoEclipse(t, config)
    if (llena === null) return
    t = llena - 0.14
    revisarPrediccion(false)
    seguir(true)
  },
}, 'Ir al próximo eclipse de Luna')

lab.append(
  hud('der',
    h('div', { class: 'panel consola' },
      h('div', { class: 'fila' }, botonPlay, h('button', { class: 'boton', type: 'button', onclick: reiniciar }, '↺ Otra vez'),
        h('button', { class: 'boton', type: 'button', 'aria-label': 'Cómo funciona', onclick: () => ayuda.abrir(COMO_FUNCIONA) }, '?')),
      grupo('Velocidad', segmentado([{ valor: '0.5', texto: '½×' }, { valor: '1', texto: '1×' }, { valor: '3', texto: '3×' }], '1', (v) => (velocidad = Number(v))).el),
      reloj,
      grupo('Vista', segmentado<Vista>([{ valor: 'cenital', texto: 'Desde arriba' }, { valor: 'costado', texto: 'De costado' }], 'cenital', escena.irA).el),
      grupo('Hemisferio', segmentado<Hemisferio>([{ valor: 'sur', texto: 'Sur' }, { valor: 'norte', texto: 'Norte' }], hem, (v) => {
        hem = v
        escena.setHemisferio(v === 'sur')
        tiempo.setHemisferio(v)
      }).el),
      grupo('Romper el sistema', h('div', { class: 'grupo' }, idea.el, plana.el)),
      irAlEclipse,
      interruptorAvanzado(),
    ),
    pred.el,
  ),
  ayuda.el,
)

function situacion(): Situacion {
  const g = fase(t)
  const elong = elongacion(g)
  return { id: idFase(g), fase: g, elong, iluminada: iluminada(elong), hem, config, eclipse: eclipse(t, config), latitud: latitudLunar(t, config), idea: ideaSombra(g) }
}

let relatoPrevio = ''
let piePrevio = ''
function actualizarHud(s: Situacion, lento: boolean, ritmo: number) {
  const dia = diaDelCiclo(t)
  mDia.set(num(dia, 1), 'd')
  mIluminada.set(num(s.iluminada * 100), '%')
  mFase.set(NOMBRES[s.id])
  mAngulo.set(num(s.elong), '°')
  tiempo.set(dia, numeroDeCiclo(t))
  reloj.textContent = !corriendo ? 'Tiempo detenido' : lento ? 'Eclipse en cámara lenta' : `1 día de la Luna = ${num(1 / ritmo, 1)} s`
  const texto = relato(s)
  if (texto !== relatoPrevio) ahora.innerHTML = relatoPrevio = texto
  const textoPie = pieVista(hem, s)
  if (textoPie !== piePrevio) pie.textContent = piePrevio = textoPie
  actualizarCurva(dia, numeroDeCiclo(t))
}

let anterior = performance.now()
function cuadro(ahoraMs: number) {
  const dt = Math.min((ahoraMs - anterior) / 1000, 0.1)
  anterior = ahoraMs
  let ritmo = DIAS_POR_SEGUNDO * velocidad
  const lento = corriendo && eclipse(t, config).magnitud > -0.2
  if (lento) ritmo = Math.min(ritmo, DIAS_POR_SEGUNDO_ECLIPSE * velocidad)
  if (corriendo) {
    t += dt * ritmo
    revisarPrediccion(true)
  }
  const s = situacion()
  actualizarHud(s, lento, ritmo)
  escena.dibujar({ t, fase: s.fase, config, eclipse: s.eclipse, idea: s.idea, sur: hem === 'sur', avanzado: avanzadoActivo() })
  requestAnimationFrame(cuadro)
}

predecir()
requestAnimationFrame(cuadro)
