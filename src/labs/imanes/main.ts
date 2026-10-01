import '../../ui/kit.css'
import './imanes.css'
import { interruptorAvanzado } from '../../ui/avanzado'
import { fila, grupo, metrica, modal, segmentado } from '../../ui/componentes'
import { deslizador } from '../../ui/deslizador'
import { h } from '../../ui/dom'
import { grafico, type Serie } from '../../ui/grafico'
import { hud } from '../../ui/hud'
import { interruptorPreguntas, prediccion } from '../../ui/prediccion'
import { COMO_FUNCIONA, GANCHO, campoPartes, fuerzaPartes, num, relato } from './contenido'
import { crearEscena } from './escena'
import { smooth } from './geometria'
import {
  CONFIG_INICIAL, GAP_MAX, GAP_MIN, MATERIALES, SEP_MAX, TEMP_MAX, TEMP_MIN, TIPOS, magnetizacion, resolver,
  type CampoVista, type Config, type MaterialId, type Modo, type Polo, type TipoId,
} from './model'
import { preguntaPara, type Intencion, type Pregunta, type Respuesta } from './prediccion'

/** Cuánto se espera, con el cambio ya hecho, antes de revelar si acertó la predicción. */
const ESPERA_REVELAR_MS = 2400
const DURACION_MS = 650
const PUNTOS_CURVA = 36
/** Tope (veces el rozamiento) del gráfico de materiales: sin él, la atracción cerca del imán (cientos de veces) aplasta el umbral en 1. */
const TECHO_UMBRAL = 10
/** Mínimo entre repintados de la curva y el relato mientras algo se mueve (ms). */
const REFRESCO_MS = 80

let config: Config = { ...CONFIG_INICIAL }
const lab = document.querySelector<HTMLElement>('#lab')!
const escena = crearEscena(lab)

// --- HUD izquierdo: título, métricas, relato en vivo y gráfico de la fuerza ---
const gancho = h('p', { class: 'gancho' })
gancho.innerHTML = GANCHO
const mFuerza = metrica('Fuerza')
const mCampo = metrica('Campo')
const mDistancia = metrica('Distancia')
const mMagnetizacion = metrica('Imanación')
mFuerza.el.classList.add('c-ambar')
mCampo.el.classList.add('c-marca')
mMagnetizacion.el.classList.add('avanzado')
const ahora = h('div', { class: 'panel ahora' })
const curva = grafico([{ id: 'fuerza', nombre: 'Fuerza', color: 'ambar' }], { titulo: 'Fuerza según la distancia', unidadX: ' cm', unidadY: 'mN', alto: 100 })
lab.append(
  hud('izq',
    h('a', { href: '../../', class: 'etiqueta' }, '← Weird Science'),
    h('h1', { class: 'titulo' }, h('small', {}, 'Lab de imanes'), h('span', {}, 'Polos y campos')),
    gancho,
    h('div', { class: 'metricas' }, mFuerza.el, mCampo.el, mDistancia.el, mMagnetizacion.el),
    ahora,
    curva.el,
  ),
)

// --- Controles ---
const ayuda = modal()
const modo = segmentado<Modo>([{ valor: 'dos', texto: 'Dos imanes' }, { valor: 'material', texto: 'Materiales' }], config.modo, (v) => pedir({ modo: v }))
const tipo = segmentado<TipoId>([{ valor: 'ferrita', texto: 'Ferrita' }, { valor: 'neodimio', texto: 'Neodimio' }], config.tipo, (v) => pedir({ tipo: v }))
const distanciaDos = deslizador({ titulo: 'Distancia entre imanes', min: GAP_MIN, max: GAP_MAX, paso: 0.1, valor: config.gap, formato: (v) => `${num(v, 1)} cm`, alCambiar: (v) => pedir({ gap: v }) })
const distanciaMat = deslizador({ titulo: 'Distancia del cubo al imán', min: 0, max: GAP_MAX, paso: 0.1, valor: config.gap, formato: (v) => `${num(v, 1)} cm`, alCambiar: (v) => pedir({ gap: v }) })
const botonDoble = h('button', { class: 'boton doble', type: 'button', onclick: () => pedir({ gap: config.gap * 2 }, 'duplicar') }, 'Alejar al doble')
const materialesA = segmentado<MaterialId>((['hierro', 'acero', 'niquel', 'cobalto'] as const).map((id) => ({ valor: id, texto: MATERIALES[id].nombre })), config.material, (v) => pedir({ material: v }))
const materialesB = segmentado<MaterialId>((['aluminio', 'cobre', 'plastico'] as const).map((id) => ({ valor: id, texto: MATERIALES[id].nombre })), config.material, (v) => pedir({ material: v }))
const polo = segmentado<Polo>([{ valor: 'N', texto: 'N' }, { valor: 'S', texto: 'S' }], config.polo, (v) => pedir({ polo: v }))
const filaPolo = fila('Polo de A hacia B', polo.el)
const vista = segmentado<CampoVista>([{ valor: 'brujulas', texto: 'Brújulas' }, { valor: 'limaduras', texto: 'Limaduras' }, { valor: 'nada', texto: 'Nada' }], config.vista, (v) => pedir({ vista: v }))
const piezas = segmentado<string>([{ valor: '1', texto: 'Entero' }, { valor: '2', texto: 'En 2' }, { valor: '4', texto: 'En 4' }], '1', (v) => pedir({ piezas: Number(v) as Config['piezas'] }))
const separacion = deslizador({ titulo: 'Separar las partes', min: 0, max: SEP_MAX, paso: 0.1, valor: 0, formato: (v) => `${num(v, 1)} cm`, alCambiar: (v) => pedir({ sep: v }) })
const temperatura = deslizador({
  titulo: 'Temperatura de A', min: TEMP_MIN, max: TEMP_MAX, paso: 5, valor: TEMP_MIN, color: 'var(--magenta)', formato: (v) => `${v} °C`,
  nota: () => `Curie ${TIPOS[config.tipo].curie} °C`, alCambiar: (v) => pedir({ temp: v }),
})
const soloDos = [distanciaDos.el, botonDoble]
const soloMaterial = [distanciaMat.el, grupo('Material de prueba', h('div', { class: 'grupo' }, materialesA.el, materialesB.el))]

// --- Predecí antes de correr: la pregunta va antes del cambio; el cambio se hace al responder ---
const pred = prediccion<Respuesta, { nueva: Config; pregunta: Pregunta }>(() => {
  if (!pred.datos) return
  const { nueva, pregunta } = pred.datos
  aplicarSuave(nueva)
  const resultado = pregunta.resolver(nueva)
  pred.revelarEn(ESPERA_REVELAR_MS, () => pred.revelar(resultado.correcta, resultado.explicacion))
}, {
  // Saltar (o apagar las preguntas): el cambio se hace igual, sin predicción.
  saltar: (d) => d && aplicarSuave(d.nueva),
  textoSaltar: 'Saltar y hacerlo igual',
})
/** Si la config cambia, la pregunta abierta (o ya respondida y sin revelar) deja de valer: se oculta (y se cancela el reveal). */
function descartarPendiente() {
  if (pred.pendiente || pred.enCurso) pred.ocultar()
}

/** Corta la animación llevando gap y sep a su valor final: lo que se pida después parte de ahí, no de un punto a mitad de camino. */
function terminarAnimacion() {
  if (!animacion) return
  config = { ...config, ...animacion.hasta }
  animacion = null
}

/** Todo cambio pasa por acá: si corresponde una predicción, primero se pregunta; si no, se aplica. */
function pedir(cambio: Partial<Config>, intencion?: Intencion) {
  // Cambiar solo lo que se mira no toca la pregunta ni la animación.
  if (Object.keys(cambio).every((k) => k === 'vista')) return aplicar({ ...config, ...cambio })
  terminarAnimacion()
  descartarPendiente()
  let nueva: Config = { ...config, ...cambio }
  if (cambio.tipo && cambio.tipo !== config.tipo) nueva = { ...nueva, temp: TEMP_MIN, tMax: TEMP_MIN, piezas: 1, sep: 0 }
  if (cambio.temp !== undefined) nueva.tMax = Math.max(config.tMax, cambio.temp)
  if (nueva.piezas === 1) nueva.sep = 0
  if (nueva.modo === 'dos') nueva.gap = Math.max(nueva.gap, GAP_MIN)
  const pregunta = preguntaPara(config, nueva, intencion)
  if (!pregunta) return intencion ? aplicarSuave(nueva) : aplicar(nueva)
  const conAjuste = { ...nueva, ...pregunta.ajuste }
  if (pred.preguntar(pregunta.texto, pregunta.opciones, { nueva: conAjuste, pregunta })) sincronizar()
}
function reiniciar() {
  animacion = null
  descartarPendiente()
  aplicar({ ...CONFIG_INICIAL })
}

// --- Animación de lo que cambia de a poco (distancia y separación de las partes) ---
let animacion: { desde: Pick<Config, 'gap' | 'sep'>; hasta: Pick<Config, 'gap' | 'sep'>; t0: number } | null = null
function aplicarSuave(nueva: Config) {
  const desde = { gap: config.gap, sep: config.sep }
  aplicar({ ...nueva, ...desde })
  if (nueva.gap !== desde.gap || nueva.sep !== desde.sep) animacion = { desde, hasta: { gap: nueva.gap, sep: nueva.sep }, t0: performance.now() }
}

// --- Estado → pantalla ---
function sincronizar() {
  modo.set(config.modo)
  tipo.set(config.tipo)
  polo.set(config.polo)
  vista.set(config.vista)
  piezas.set(String(config.piezas))
  materialesA.set(config.material)
  materialesB.set(config.material)
  distanciaDos.set(config.gap)
  distanciaMat.set(config.gap)
  separacion.set(config.sep)
  separacion.input.disabled = config.piezas === 1
  temperatura.set(config.temp)
  const dos = config.modo === 'dos'
  soloDos.forEach((el) => (el.hidden = !dos))
  soloMaterial.forEach((el) => (el.hidden = dos))
  botonDoble.toggleAttribute('disabled', config.gap * 2 > GAP_MAX || magnetizacion(config) === 0)
  filaPolo.firstElementChild!.textContent = dos ? 'Polo de A hacia B' : 'Polo hacia el cubo'
}

let claveCurva = ''
function pintarCurva() {
  const dos = config.modo === 'dos'
  const xMin = dos ? GAP_MIN : 0
  const tope = Math.abs(resolver(config, xMin).fuerza)
  const factor = dos && tope < 1 ? 1e3 : 1
  const unidad = dos ? (factor === 1 ? 'N' : 'mN') : '×'
  const clave = `${config.modo}-${config.tipo}-${config.material}-${unidad}`
  const series: Serie[] = dos
    ? [{ id: 'fuerza', nombre: 'Fuerza', color: 'ambar' }]
    : [{ id: 'fuerza', nombre: 'Fuerza ÷ rozamiento', color: 'ambar' }, { id: 'roz', nombre: 'Rozamiento', color: 'var(--apagado)' }]
  if (clave !== claveCurva) {
    claveCurva = clave
    curva.cambiar(series, { titulo: dos ? 'Fuerza según la distancia' : 'Atracción según la distancia', unidadX: ' cm', unidadY: unidad, xMax: GAP_MAX, yMax: dos ? 1e-9 : 4, yTecho: dos ? undefined : TECHO_UMBRAL })
  }
  curva.limpiar({ xMax: GAP_MAX, yMax: dos ? Math.max(tope * factor, 1e-9) : 4 })
  const hasta = Math.max(config.gap, xMin + 0.01)
  for (let i = 0; i <= PUNTOS_CURVA; i++) {
    const g = xMin + ((hasta - xMin) * i) / PUNTOS_CURVA
    const r = resolver(config, g)
    curva.agregar(g, dos ? { fuerza: Math.abs(r.fuerza) * factor } : { fuerza: Math.max(r.relativa, 0), roz: 1 })
  }
}

let relatoPrevio = ''
let ultimoRefresco = 0
/** `animando`: solo cambian gap y sep (tween o deslizamiento); camino liviano: sin sincronizar todos los controles y con curva y relato espaciados. */
function aplicar(nueva: Config, animando = false) {
  config = nueva
  if (animando) {
    distanciaDos.set(config.gap)
    distanciaMat.set(config.gap)
    separacion.set(config.sep)
  } else sincronizar()
  escena.aplicar(config)
  const r = resolver(config)
  mFuerza.set(...fuerzaPartes(r.fuerza))
  mCampo.set(...campoPartes(r.campo))
  mDistancia.set(num(config.gap, 1), 'cm')
  mMagnetizacion.set(num(r.magnetizacion * 100, 0), '%')
  const t = performance.now()
  if (animando && t - ultimoRefresco < REFRESCO_MS) return
  ultimoRefresco = t
  const texto = relato(config)
  if (texto !== relatoPrevio) ahora.innerHTML = relatoPrevio = texto
  pintarCurva()
}

lab.append(
  hud('der',
    h('div', { class: 'panel consola' },
      h('div', { class: 'fila' },
        h('button', { class: 'boton', type: 'button', onclick: reiniciar }, '↺ Restablecer'),
        h('button', { class: 'boton', type: 'button', 'aria-label': 'Cómo funciona', onclick: () => ayuda.abrir(COMO_FUNCIONA) }, '?')),
      grupo('Experimento', modo.el),
      fila('Imán', tipo.el),
      ...soloDos,
      ...soloMaterial,
      filaPolo,
      fila('Ver el campo', vista.el),
      grupo('Romper el sistema', h('div', { class: 'grupo' },
        fila('Partir el imán A', piezas.el),
        separacion.el,
        temperatura.el)),
      interruptorAvanzado(),
      interruptorPreguntas(),
    ),
    pred.el,
  ),
  ayuda.el,
)

aplicar(config)

let anterior = performance.now()
function cuadro(t: number) {
  const dt = Math.min(Math.max((t - anterior) / 1000, 0), 0.1)
  anterior = t
  if (animacion) {
    const p = Math.min((performance.now() - animacion.t0) / DURACION_MS, 1)
    const e = smooth(0, 1, p)
    const { desde, hasta } = animacion
    if (p >= 1) animacion = null
    aplicar({ ...config, gap: desde.gap + (hasta.gap - desde.gap) * e, sep: desde.sep + (hasta.sep - desde.sep) * e }, p < 1)
  } else if (config.modo === 'material' && config.gap > 0) {
    // La muestra se desliza hacia el imán mientras la atracción le gane al rozamiento (velocidad ilustrativa, no real).
    const { relativa } = resolver(config)
    if (relativa >= 1) {
      const gap = Math.max(0, config.gap - (2 + 3 * Math.log10(1 + relativa)) * dt)
      aplicar({ ...config, gap }, gap > 0)
    }
  }
  escena.dibujar(t / 1000)
  requestAnimationFrame(cuadro)
}
requestAnimationFrame(cuadro)
