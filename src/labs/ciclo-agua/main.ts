import '../../ui/kit.css'
import './ciclo-agua.css'
import { av, interruptorAvanzado } from '../../ui/avanzado'
import { grupo, metrica, modal, segmentado } from '../../ui/componentes'
import { deslizador } from '../../ui/deslizador'
import { h } from '../../ui/dom'
import { grafico } from '../../ui/grafico'
import { hud } from '../../ui/hud'
import { prediccion } from '../../ui/prediccion'
import { COMO_FUNCIONA, GANCHO, RESERVORIO_TEXTO, num, relato } from './contenido'
import { crearEscena } from './escena'
import {
  CONFIG_INICIAL, LIMITES, RESERVORIOS, TOTAL, efectiva, estadoEnMarcha, estadoInicial, flujos, paso, saturacion, tBaja,
  total, type Config, type Estado, type Reservorio, DT_MONTANA } from './model'
import { AGUA, VENTANA_H, preguntaRota, type Pregunta, type Respuesta } from './prediccion'

/** Horas del terrario por cada segundo real, según la velocidad elegida. */
const HORAS_POR_SEG: Record<string, number> = { '1': 3, '4': 12, '12': 36 }
const PASO_MAX_H = 0.25
/** Ancho del gráfico en días del terrario; al llegar se vuelve a empezar. */
const VENTANA_GRAFICO_D = 5
const MUESTREO_H = 0.5

const lab = document.querySelector<HTMLElement>('#lab')!
let config: Config = { ...CONFIG_INICIAL }
let estado: Estado = estadoInicial()
/** Estado desde el que arrancó la corrida actual: la respuesta de la predicción se calcula desde acá. */
let arranque: Estado = estado
let velocidad = '1'
let corriendo = true

const escena = crearEscena(lab)

// --- HUD izquierdo: título, métricas, relato en vivo, dónde está el agua y gráfico ---
const gancho = h('p', { class: 'gancho' })
gancho.innerHTML = GANCHO
const mHumedad = metrica('Humedad')
const mLluvia = metrica('Lluvia')
const mEscurre = metrica('Escurre')
const mTotal = metrica('Agua total')
mHumedad.el.classList.add('c-nube')
mLluvia.el.classList.add('c-cielo')
mEscurre.el.classList.add('c-rio')
mTotal.el.classList.add('avanzado')
const ahora = h('div', { class: 'panel ahora' })

const filas = {} as Record<Reservorio, { barra: HTMLElement; valor: HTMLElement }>
const reservorios = h('div', { class: 'panel reservorios' },
  h('span', { class: 'etiqueta' }, '¿Dónde está el agua?'),
  ...RESERVORIOS.map((r) => {
    const barra = h('i')
    const valor = h('span', { class: 'valor' })
    filas[r] = { barra, valor }
    return h('div', { class: `reservorio ${RESERVORIO_TEXTO[r].clase}` },
      h('span', { class: 'nombre' }, RESERVORIO_TEXTO[r].nombre), h('span', { class: 'barra' }, barra), valor)
  }),
)

// Cuánta agua sube, cuánta llueve y cuánta escurre: cuando sube y llueve se igualan, el ciclo está en equilibrio.
const curva = grafico([
  { id: 'evap', nombre: 'Evaporación', color: 'var(--nube)' },
  { id: 'lluvia', nombre: 'Lluvia', color: 'cielo' },
  { id: 'escurre', nombre: 'Escorrentía', color: 'var(--rio)' },
], { titulo: 'Cuánta agua se mueve · últimos 5 días', unidadX: ' d', unidadY: 'mm/h', yMax: 2.5, xMax: VENTANA_GRAFICO_D })
// Ventana que se desliza: siempre los últimos días, en vez de vaciarse y arrancar de cero.
let historial: { h: number; v: Record<string, number> }[] = []
let ultimoPunto = 0
function redibujarCurva() {
  const desde = historial[0]?.h ?? 0
  curva.limpiar()
  for (const p of historial) curva.agregar((p.h - desde) / 24, p.v)
}
function reiniciarCurva() {
  historial = []
  ultimoPunto = estado.horas
  curva.limpiar()
  muestrear()
}
function muestrear() {
  const f = flujos(estado, config)
  const punto = { h: estado.horas, v: { evap: f.evap + f.trans, lluvia: f.prec, escurre: f.escorr } }
  historial.push(punto)
  ultimoPunto = estado.horas
  const limite = estado.horas - VENTANA_GRAFICO_D * 24
  if (historial[0].h < limite) {
    historial = historial.filter((p) => p.h >= limite)
    redibujarCurva()
  } else curva.agregar((punto.h - historial[0].h) / 24, punto.v)
}

lab.append(
  hud('izq',
    h('a', { href: '../../', class: 'etiqueta' }, '← Weird Science'),
    h('h1', { class: 'titulo' }, h('small', {}, 'Lab del ciclo del agua'), h('span', {}, 'El agua que vuelve')),
    gancho,
    h('div', { class: 'metricas' }, mHumedad.el, mLluvia.el, mEscurre.el, mTotal.el),
    ahora,
    reservorios,
    curva.el,
  ),
)

// --- Predecí antes de correr: al empezar o al romper algo, el experimento espera la predicción ---
const ayuda = modal()
const botonPlay = h('button', { class: 'boton boton-marca', type: 'button', onclick: () => alternar() }, '⏸ Pausa')
const reloj = h('span', { class: 'etiqueta' })
const pred = prediccion<Respuesta, { pregunta: Pregunta; config: Config; arranque: Estado }>(() => seguir(true))

function seguir(va: boolean) {
  corriendo = va
  botonPlay.textContent = va ? '⏸ Pausa' : '▶ Seguir'
}
function reiniciar(desde: Estado) {
  estado = arranque = desde
  reiniciarCurva()
  seguir(true)
}
function preguntar(pregunta: Pregunta) {
  pred.preguntar(pregunta.texto, pregunta.opciones, { pregunta, config, arranque })
  corriendo = false
  botonPlay.textContent = '▶ Saltar'
}
function revelar() {
  const datos = pred.datos
  if (!datos || !pred.enCurso || !datos.pregunta.listo(estado, datos.config)) return
  const r = datos.pregunta.resolver(datos.config, datos.arranque)
  pred.revelar(r.correcta, r.explicacion)
}
/** Si algo está roto, el ciclo ya venía andando; si no, arranca de cero y pregunta por el agua total. */
function empezar() {
  const rota = preguntaRota(config)
  reiniciar(rota ? estadoEnMarcha(config) : estadoInicial(config))
  preguntar(rota ?? AGUA)
}
function alternar() {
  if (pred.pendiente) {
    pred.ocultar()
    return seguir(true)
  }
  seguir(!corriendo)
}

/**
 * Único lugar donde cambia `config`. Si lo que se rompió es nuevo, el ciclo arranca "en marcha" y pregunta;
 * si se mueve cualquier otro control mientras hay una pregunta abierta, se descarta.
 */
function aplicar(parcial: Partial<Config>) {
  const antes = preguntaRota(config)?.id
  config = { ...config, ...parcial }
  const despues = preguntaRota(config)
  sincronizar()
  if (despues && despues.id !== antes) return empezar()
  const esperaba = pred.pendiente
  pred.ocultar()
  if (esperaba) seguir(true)
  muestrear()
}

// --- Consola de controles ---
function interruptor(texto: string, activo: boolean, alElegir: (si: boolean) => void) {
  const s = segmentado([{ valor: 'si', texto: 'Sí' }, { valor: 'no', texto: 'No' }], activo ? 'si' : 'no', (v) => alElegir(v === 'si'))
  return { el: h('div', { class: 'interruptor' }, h('span', {}, texto), s.el), set: (on: boolean) => s.set(on ? 'si' : 'no') }
}
const pct = (v: number) => `${num(v * 100, 0)}%`
function rango(clave: keyof typeof LIMITES) {
  return { min: LIMITES[clave][0], max: LIMITES[clave][1] }
}

const sol = deslizador({
  titulo: 'Sol', clase: 'sol', color: 'var(--ambar)', ...rango('sol'), paso: 0.05, valor: config.sol,
  formato: pct, nota: (v) => `aire ${num(tBaja(v), 0)} °C`, alCambiar: (v) => aplicar({ sol: v }),
})
const aire = deslizador({
  titulo: 'Temp. en altura', clase: 'aire', color: 'var(--nube)', ...rango('tAlta'), paso: 1, valor: config.tAlta,
  formato: (v) => `${num(v, 0)} °C`, nota: (v) => (v - (config.montana ? DT_MONTANA : 0) >= tBaja(efectiva(config).sol) ? 'sin nubes' : av(`satura ${num(saturacion(v), 1)} g/m³`)),
  alCambiar: (v) => aplicar({ tAlta: v }),
})
const plantas = deslizador({
  titulo: 'Plantas', clase: 'plantas', color: 'var(--marca)', ...rango('plantas'), paso: 0.05, valor: config.plantas,
  formato: pct, alCambiar: (v) => aplicar({ plantas: v }),
})
const relieve = segmentado([{ valor: 'llanura', texto: 'Llanura' }, { valor: 'montana', texto: 'Montaña' }], 'llanura', (v) => aplicar({ montana: v === 'montana' }))
const apagarSol = interruptor('Apagar el Sol', false, (si) => aplicar({ solApagado: si }))
const talar = interruptor('Talar las plantas', false, (si) => aplicar({ talado: si }))

/** Deja todo lo que se ve en pantalla igual que `config`. */
function sincronizar() {
  relieve.set(config.montana ? 'montana' : 'llanura')
  apagarSol.set(config.solApagado)
  talar.set(config.talado)
  sol.input.disabled = config.solApagado
  plantas.input.disabled = config.talado
  aire.set(config.tAlta)
}
sincronizar()

lab.append(
  hud('der',
    h('div', { class: 'panel consola' },
      h('div', { class: 'fila' }, botonPlay, h('button', { class: 'boton', type: 'button', onclick: empezar }, '↺ Otra vez'),
        h('button', { class: 'boton', type: 'button', 'aria-label': 'Cómo funciona', onclick: () => ayuda.abrir(COMO_FUNCIONA) }, '?')),
      h('div', { class: 'grupo' }, reloj, segmentado([{ valor: '1', texto: '1×' }, { valor: '4', texto: '4×' }, { valor: '12', texto: '12×' }], velocidad, (v) => (velocidad = v)).el),
      sol.el, aire.el, plantas.el,
      h('div', { class: 'interruptor' }, h('span', {}, 'Relieve'), relieve.el),
      grupo('Romper el sistema', h('div', { class: 'grupo' }, apagarSol.el, talar.el)),
      interruptorAvanzado(),
    ),
    pred.el,
  ),
  ayuda.el,
)

reiniciarCurva()
preguntar(AGUA)

function dia(horas: number) {
  return `día ${Math.floor(horas / 24) + 1}, ${String(Math.floor(horas % 24)).padStart(2, '0')} h`
}

let relatoPrevio = ''
let ultimoRelato = 0
function actualizarHud(f: ReturnType<typeof flujos>, t: number) {
  mHumedad.set(num(f.humedad * 100, 0), '%')
  mLluvia.set(num(f.prec), 'mm/h')
  mEscurre.set(num(f.escorr), 'mm/h')
  mTotal.set(num(total(estado), 1), 'mm')
  for (const r of RESERVORIOS) {
    filas[r].barra.style.width = `${Math.max((estado[r] / TOTAL) * 100, 0.5)}%`
    filas[r].valor.textContent = `${num((estado[r] / TOTAL) * 100, 0)}%`
  }
  const midiendo = pred.enCurso && pred.datos?.pregunta.id !== 'sol' ? ` · midiendo ${num(Math.min(estado.horas, VENTANA_H) / 24, 1)} de ${num(VENTANA_H / 24, 0)} días` : ''
  reloj.textContent = `Velocidad · ${dia(estado.horas)}${corriendo ? '' : ' · detenido'}${midiendo}`
  if (t - ultimoRelato < 150) return
  ultimoRelato = t
  const texto = relato(estado, config, f)
  if (texto !== relatoPrevio) ahora.innerHTML = relatoPrevio = texto
}

let anterior = performance.now()
function cuadro(t: number) {
  const dtReal = Math.min((t - anterior) / 1000, 0.1)
  anterior = t
  if (corriendo) {
    let restante = dtReal * HORAS_POR_SEG[velocidad]
    while (restante > 0) {
      const dt = Math.min(restante, PASO_MAX_H)
      estado = paso(estado, config, dt)
      restante -= dt
    }
    if (estado.horas - ultimoPunto >= MUESTREO_H) muestrear()
    revelar()
  }
  const f = flujos(estado, config)
  actualizarHud(f, t)
  escena.dibujar(estado, config, f, t / 1000, corriendo)
  requestAnimationFrame(cuadro)
}
requestAnimationFrame(cuadro)
