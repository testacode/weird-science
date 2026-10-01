import '../../ui/kit.css'
import './fotosintesis.css'
import { interruptorAvanzado } from '../../ui/avanzado'
import { grupo, interruptor, metrica, modal, segmentado } from '../../ui/componentes'
import { deslizador } from '../../ui/deslizador'
import { h } from '../../ui/dom'
import { grafico } from '../../ui/grafico'
import { hud } from '../../ui/hud'
import { prediccion } from '../../ui/prediccion'
import { COMO_FUNCIONA, FACTORES, GANCHO, burbujas, num, relato } from './contenido'
import { crearEscena } from './escena'
import { LUZ_HEX } from './constantes'
import {
  CONFIG_INICIAL, LIMITES, P_MAX, estadoInicial, glucosaMg, paso, tasas, type ColorLuz, type Config, type Factor,
} from './model'
import { VENTANA_MIN, preguntaPara, type Pregunta, type Respuesta } from './prediccion'

/** Minutos del experimento por cada segundo real, según la velocidad elegida. */
const MIN_POR_SEG = 1 / 60
/** Ancho del gráfico en minutos del experimento; al llegar se vuelve a empezar. */
const VENTANA_GRAFICO = 5
const MUESTREO_MIN = 0.05

const lab = document.querySelector<HTMLElement>('#lab')!
let config: Config = { ...CONFIG_INICIAL }
let estado = estadoInicial()
let velocidad = 4
let corriendo = true

const escena = crearEscena(lab)

// --- HUD izquierdo: título, métricas, relato en vivo, qué frena y gráfico ---
const gancho = h('p', { class: 'gancho' })
gancho.innerHTML = GANCHO
const mBurbujas = metrica('Burbujas')
const mGlucosa = metrica('Glucosa')
const mLimita = metrica('Limita')
const mAbsorbida = metrica('Absorbida')
mBurbujas.el.classList.add('c-cielo')
mGlucosa.el.classList.add('c-ambar')
mAbsorbida.el.classList.add('c-luz')
const ahora = h('div', { class: 'panel ahora' })

const filas: Record<Factor, { fila: HTMLElement; barra: HTMLElement; valor: HTMLElement }> = {} as never
const COLOR_FACTOR: Record<Factor, string> = { luz: 'var(--luz)', co2: 'var(--magenta)', temp: 'var(--texto)' }
const factores = h('div', { class: 'panel factores' },
  h('span', { class: 'etiqueta' }, '¿Qué frena a la planta?'),
  ...(['luz', 'co2', 'temp'] as Factor[]).map((f) => {
    const barra = h('i')
    const valor = h('span', { class: 'valor' })
    const fila = h('div', { class: 'factor' },
      h('span', { class: 'nombre' }, FACTORES[f].corto, h('span', { class: 'tag' }, 'FRENA')),
      h('span', { class: 'barra' }, barra), valor)
    fila.style.setProperty('--color', COLOR_FACTOR[f])
    filas[f] = { fila, barra, valor }
    return fila
  }),
)

// El balance (fabrica − gasta) baja de 0 cuando la respiración le gana a la fotosíntesis.
const curva = grafico([{ id: 'balance', nombre: 'Balance', color: 'cielo' }], {
  titulo: 'Balance de O₂ (fabrica − gasta)', unidadX: ' min', unidadY: 'µmol/min', yMin: -1,
})
let origenGrafico = 0
let ultimoPunto = 0
function reiniciarCurva() {
  origenGrafico = 0
  ultimoPunto = 0
  curva.limpiar({ xMax: VENTANA_GRAFICO, yMax: P_MAX })
  muestrear()
}
function muestrear() {
  if (estado.minutos - origenGrafico > VENTANA_GRAFICO) {
    origenGrafico = estado.minutos
    curva.limpiar()
  }
  curva.agregar(estado.minutos - origenGrafico, { balance: tasas(config).neto })
  ultimoPunto = estado.minutos
}

lab.append(
  hud('izq',
    h('a', { href: '../../', class: 'etiqueta' }, '← Weird Science'),
    h('h1', { class: 'titulo' }, h('small', {}, 'Lab de fotosíntesis'), h('span', {}, 'Luz, agua y aire')),
    gancho,
    h('div', { class: 'metricas' }, mBurbujas.el, mGlucosa.el, mLimita.el, mAbsorbida.el),
    ahora,
    factores,
    curva.el,
  ),
)

// --- Predecí antes de correr: al romper algo, el experimento espera la predicción ---
const ayuda = modal()
const botonPlay = h('button', { class: 'boton boton-marca', type: 'button', onclick: () => alternar() }, '⏸ Pausa')
const reloj = h('span', { class: 'etiqueta' })
const pred = prediccion<Respuesta, { pregunta: Pregunta; config: Config }>(() => seguir(true))

function seguir(va: boolean) {
  corriendo = va
  botonPlay.textContent = va ? '⏸ Pausa' : '▶ Seguir'
}
function reiniciar() {
  estado = estadoInicial()
  escena.reiniciar()
  reiniciarCurva()
  seguir(true)
}
function preguntar(pregunta: Pregunta | null) {
  if (!pregunta) return pred.ocultar()
  pred.preguntar(pregunta.texto, pregunta.opciones, { pregunta, config })
  corriendo = false
  botonPlay.textContent = '▶ Saltar'
}
function revelar() {
  const datos = pred.datos
  if (!datos || !pred.enCurso) return
  const r = datos.pregunta.resolver(datos.config)
  pred.revelar(r.correcta, r.explicacion)
}
/** Repite el experimento con los mismos controles; si hay algo roto, vuelve a preguntar. */
function otraVez() {
  reiniciar()
  preguntar(preguntaPara(config))
}
function alternar() {
  if (pred.pendiente) {
    pred.ocultar()
    return seguir(true)
  }
  corriendo = !corriendo
  botonPlay.textContent = corriendo ? '⏸ Pausa' : '▶ Seguir'
}

/**
 * Único lugar donde cambia `config`. Si lo que se rompió es nuevo, reinicia el experimento y pregunta;
 * si se mueve cualquier otro control mientras hay una pregunta abierta, se descarta.
 */
function aplicar(parcial: Partial<Config>) {
  const antes = preguntaPara(config)?.id
  config = { ...config, ...parcial }
  const despues = preguntaPara(config)
  sincronizar()
  // Solo el color y la luz abren preguntas (si no, pasar el CO₂ por 0 reiniciaría el experimento).
  if (despues && despues.id !== antes && ('color' in parcial || 'encendida' in parcial)) {
    reiniciar()
    return preguntar(despues)
  }
  const esperaba = pred.pendiente
  pred.ocultar()
  if (esperaba) seguir(true)
  muestrear()
}

// --- Consola de controles ---

const distancia = deslizador({
  titulo: 'Distancia de la lámpara', clase: 'luz', color: 'var(--luz)', ...rango('distancia'), paso: 1, valor: config.distancia,
  formato: (v) => `${v} cm`,
  nota: (v) => `llega ${num(tasas({ ...config, distancia: v, encendida: true }).llega, 0)}%`,
  alCambiar: (v) => aplicar({ distancia: v }),
})
const co2 = deslizador({
  titulo: 'CO₂ disuelto', clase: 'co2', color: 'var(--magenta)', ...rango('co2'), paso: 5, valor: config.co2,
  formato: (v) => (v === 0 ? 'nada' : v <= 30 ? 'poco' : v <= 70 ? 'medio' : 'mucho'),
  nota: (v) => (v === 30 ? 'agua de la canilla' : v === 100 ? 'con bicarbonato' : ''),
  alCambiar: (v) => aplicar({ co2: v }),
})
const temperatura = deslizador({
  titulo: 'Temperatura del agua', color: 'var(--texto)', ...rango('temperatura'), paso: 1, valor: config.temperatura,
  formato: (v) => `${v} °C`, alCambiar: (v) => aplicar({ temperatura: v }),
})
function rango(clave: keyof typeof LIMITES) {
  return { min: LIMITES[clave][0], max: LIMITES[clave][1] }
}

const COLORES_UI: { valor: ColorLuz; texto: string }[] = [
  { valor: 'blanca', texto: 'Blanca' }, { valor: 'roja', texto: 'Roja' }, { valor: 'azul', texto: 'Azul' }, { valor: 'verde', texto: 'Verde' },
]
const color = segmentado(COLORES_UI, config.color, (c) => aplicar({ color: c }))
color.el.classList.add('colores')
color.el.querySelectorAll('button').forEach((b, i) => b.style.setProperty('--muestra', `#${LUZ_HEX[COLORES_UI[i].valor].toString(16).padStart(6, '0')}`))

const apagar = interruptor('Apagar la luz', false, (si) => aplicar({ encendida: !si }))
/** Deja todo lo que se ve en pantalla igual que `config` (también cuando el cambio vino de otro control). */
function sincronizar() {
  color.set(config.color)
  apagar.set(!config.encendida)
  document.documentElement.style.setProperty('--luz', `#${LUZ_HEX[config.color].toString(16).padStart(6, '0')}`)
}
sincronizar()

lab.append(
  hud('der',
    h('div', { class: 'panel consola' },
      h('div', { class: 'fila' }, botonPlay, h('button', { class: 'boton', type: 'button', onclick: otraVez }, '↺ Otra vez'),
        h('button', { class: 'boton', type: 'button', 'aria-label': 'Cómo funciona', onclick: () => ayuda.abrir(COMO_FUNCIONA) }, '?')),
      h('div', { class: 'grupo' }, reloj, segmentado([{ valor: '1', texto: '1×' }, { valor: '4', texto: '4×' }, { valor: '12', texto: '12×' }], '4', (v) => (velocidad = Number(v))).el),
      distancia.el, co2.el, temperatura.el,
      grupo('Color de la luz', color.el),
      grupo('Romper el sistema', h('div', { class: 'grupo' }, apagar.el)),
      interruptorAvanzado(),
    ),
    pred.el,
  ),
  ayuda.el,
)

reiniciarCurva()

const minSeg = (min: number) => `${Math.floor(min)}:${String(Math.floor((min % 1) * 60)).padStart(2, '0')}`

let relatoPrevio = ''
function actualizarHud() {
  const d = tasas(config)
  mBurbujas.set(burbujas(d.burbujasMin), '/min')
  mGlucosa.set(num(glucosaMg(estado), 2), 'mg')
  mLimita.set(FACTORES[d.limita].corto)
  mLimita.el.className = `panel metrica ${FACTORES[d.limita].clase}`
  mAbsorbida.set(num(d.absorbida, 0), '%')
  const valores: Record<Factor, number> = { luz: d.fLuz, co2: d.fCo2, temp: d.fTemp }
  for (const f of ['luz', 'co2', 'temp'] as Factor[]) {
    filas[f].barra.style.width = `${Math.max(valores[f] * 100, 0.5)}%`
    filas[f].valor.textContent = `${num(valores[f] * 100, 0)}%`
    filas[f].fila.classList.toggle('frena', f === d.limita)
  }
  const midiendo = pred.enCurso ? ` · midiendo ${minSeg(Math.min(estado.minutos, VENTANA_MIN))} de ${minSeg(VENTANA_MIN)}` : ''
  reloj.textContent = `Velocidad · experimento ${minSeg(estado.minutos)}${corriendo ? '' : ' · detenido'}${midiendo}`
  const texto = relato(estado, config, d)
  if (texto !== relatoPrevio) ahora.innerHTML = relatoPrevio = texto
}

let anterior = performance.now()
function cuadro(t: number) {
  const dtReal = Math.min((t - anterior) / 1000, 0.1)
  anterior = t
  if (corriendo) {
    let restante = dtReal * velocidad * MIN_POR_SEG
    while (restante > 0) {
      const dt = Math.min(restante, 1 / 60)
      estado = paso(estado, config, dt)
      restante -= dt
    }
    if (estado.minutos - ultimoPunto >= MUESTREO_MIN) muestrear()
    if (pred.enCurso && estado.minutos >= VENTANA_MIN) revelar()
  }
  actualizarHud()
  escena.dibujar(estado, config, tasas(config), t / 1000)
  requestAnimationFrame(cuadro)
}
requestAnimationFrame(cuadro)
