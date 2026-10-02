import '../../ui/kit.css'
import './volcanes.css'
import { interruptorAvanzado } from '../../ui/avanzado'
import { grupo, metrica, modal, segmentado } from '../../ui/componentes'
import { deslizador } from '../../ui/deslizador'
import { h } from '../../ui/dom'
import { hud } from '../../ui/hud'
import { interruptorPreguntas, prediccion } from '../../ui/prediccion'
import { COMO_FUNCIONA, GANCHO, NOMBRE_ERUPCION, NOMBRE_MAGMA, exp10, num, relato } from './contenido'
import { crearEscena, viscosidadNormal } from './escena'
import {
  CONFIG_INICIAL, FUSION, LIMITES, PRESETS, claridad, estadoInicial, explosividad, logViscosidad, paso, temperatura,
  tipoErupcion, tipoMagma, type Borde, type Config, type Estado, type TipoMagma,
} from './model'
import { preguntaErupcion, preguntaOrigen, preguntaVolcanes, type Pregunta, type Respuesta } from './prediccion'

/** Solo se pregunta por la erupción si la respuesta queda clara (lejos de los cortes de la explosividad). */
const CLARIDAD_MINIMA = 0.15

const lab = document.querySelector<HTMLElement>('#lab')!
let config: Config = { ...CONFIG_INICIAL }
let estado: Estado = estadoInicial()

const escena = crearEscena(lab)

// --- HUD izquierdo: título, métricas, relato en vivo y qué decide la erupción ---
const gancho = h('p', { class: 'gancho' })
gancho.innerHTML = GANCHO
const mOrigen = metrica('Se funde a')
const mTemp = metrica('Temperatura')
const mVisc = metrica('Viscosidad')
const mErupcion = metrica('Erupción')
mOrigen.el.classList.add('c-ambar')
mTemp.el.classList.add('avanzado')
mErupcion.el.classList.add('c-marca')
const ahora = h('div', { class: 'panel ahora' })

const barra = () => h('i')
const barras = { visc: barra(), gas: barra(), expl: barra() }
const valores = { visc: h('span', { class: 'valor' }), gas: h('span', { class: 'valor' }), expl: h('span', { class: 'valor' }) }
const filaBarra = (clase: string, nombre: string, k: keyof typeof barras) =>
  h('div', { class: `barra-fila ${clase}` }, h('span', { class: 'nombre' }, nombre), h('span', { class: 'barra' }, barras[k]), valores[k])
const decide = h('div', { class: 'panel decide' },
  h('span', { class: 'etiqueta' }, '¿Fluye o explota?'),
  filaBarra('c-cielo', 'Viscosidad', 'visc'),
  filaBarra('c-cielo', 'Agua disuelta', 'gas'),
  filaBarra('c-ambar', 'Explosividad', 'expl'),
)

lab.append(
  hud('izq',
    h('a', { href: '../../', class: 'etiqueta' }, '← Weird Science'),
    h('h1', { class: 'titulo' }, h('small', {}, 'Lab de volcanes y placas'), h('span', {}, 'Fuego desde el manto')),
    gancho,
    h('div', { class: 'metricas' }, mOrigen.el, mTemp.el, mVisc.el, mErupcion.el),
    ahora,
    decide,
  ),
)

// --- Predecí antes de correr: mientras la pregunta espera, el experimento queda quieto ---
const ayuda = modal()
const pred = prediccion<Respuesta, { pregunta: Pregunta }>(undefined, {
  textoSaltar: 'Saltar y ver qué pasa',
  listo: (d) => d.pregunta.listo(estado),
})

function preguntar(pregunta: Pregunta) {
  pred.preguntar(pregunta.texto, pregunta.opciones, { pregunta })
}
function revelar() {
  const datos = pred.datos
  if (!pred.listo || !datos) return
  const r = datos.pregunta.resolver()
  pred.revelar(r.correcta, r.explicacion)
}

/** Empieza de cero con la pregunta del origen del magma (o la de volcanes, si el borde no tiene magma). */
function empezar() {
  pred.ocultar()
  estado = estadoInicial()
  escena.cambiarBorde(config.borde)
  preguntar(FUSION[config.borde].produccion > 0 ? preguntaOrigen(config) : preguntaVolcanes(config))
}

// --- Consola de controles ---
const borde = segmentado<Borde>(
  [{ valor: 'divergente', texto: 'Se separan' }, { valor: 'convergente', texto: 'Chocan' }, { valor: 'transformante', texto: 'Se rozan' }],
  config.borde,
  (b) => {
    pred.ocultar()
    config = { ...config, borde: b }
    estado = estadoInicial()
    escena.cambiarBorde(b)
    sincronizar()
    preguntar(preguntaVolcanes(config))
  },
)
const notaBorde = h('p', { class: 'nota-borde' })
const magma = segmentado<TipoMagma>(
  [{ valor: 'basaltico', texto: 'Basalto' }, { valor: 'andesitico', texto: 'Andesita' }, { valor: 'riolitico', texto: 'Riolita' }],
  tipoMagma(config.silice),
  (t) => {
    pred.ocultar()
    config = { ...config, ...PRESETS[t] }
    estado = { ...estado, erupcion: 0 }
    sincronizar()
    if (claridad(explosividad(config.silice, config.gas)) >= CLARIDAD_MINIMA) preguntar(preguntaErupcion(config))
  },
)
function ajustar(parcial: Partial<Config>) {
  pred.ocultar()
  config = { ...config, ...parcial }
  sincronizar()
}
const silice = deslizador({
  titulo: 'Sílice (SiO₂)', clase: 'silice', color: 'var(--cielo)', min: LIMITES.silice[0], max: LIMITES.silice[1], paso: 0.5, valor: config.silice,
  formato: (v) => `${num(v, 1)} %`, nota: (v) => NOMBRE_MAGMA[tipoMagma(v)], alCambiar: (v) => ajustar({ silice: v }),
})
const gas = deslizador({
  titulo: 'Agua disuelta', clase: 'gas', color: 'var(--ambar)', min: LIMITES.gas[0], max: LIMITES.gas[1], paso: 0.1, valor: config.gas,
  formato: (v) => `${num(v, 1)} %`, alCambiar: (v) => ajustar({ gas: v }),
})
const sinMagma = h('p', { class: 'nota' }, 'Sin magma no hay composición que elegir.')
const grupoMagma = grupo('Magma', h('div', { class: 'grupo' }, magma.el, silice.el, gas.el))

/** Deja todo lo que se ve en pantalla igual que `config`. */
function sincronizar() {
  borde.set(config.borde)
  magma.set(tipoMagma(config.silice))
  silice.set(config.silice)
  gas.set(config.gas)
  const hayMagma = FUSION[config.borde].produccion > 0
  grupoMagma.hidden = !hayMagma
  sinMagma.hidden = hayMagma
  notaBorde.textContent = { divergente: 'Borde divergente: dorsal oceánica', convergente: 'Borde convergente: subducción', transformante: 'Borde transformante: falla' }[config.borde]
}
sincronizar()

lab.append(
  hud('der',
    h('div', { class: 'panel consola' },
      h('div', { class: 'fila' }, h('button', { class: 'boton boton-marca', type: 'button', onclick: empezar }, '↺ Otra vez'),
        h('button', { class: 'boton', type: 'button', 'aria-label': 'Cómo funciona', onclick: () => ayuda.abrir(COMO_FUNCIONA) }, '?')),
      grupo('Las placas...', h('div', { class: 'grupo' }, borde.el, notaBorde)),
      grupoMagma,
      sinMagma,
      interruptorAvanzado(),
      interruptorPreguntas(),
    ),
    pred.el,
  ),
  ayuda.el,
)

preguntar(preguntaOrigen(config))

let relatoPrevio = ''
let ultimoRelato = 0
function actualizarHud(t: number) {
  const f = FUSION[config.borde]
  const e = explosividad(config.silice, config.gas)
  const hayMagma = f.produccion > 0
  decide.hidden = !hayMagma
  mOrigen.set(hayMagma ? num(f.origenKm, 0) : '—', hayMagma ? 'km' : '')
  mTemp.set(hayMagma ? num(temperatura(config.silice), 0) : '—', hayMagma ? '°C' : '')
  mVisc.set(hayMagma ? `10<sup>${exp10(logViscosidad(config.silice))}</sup>` : '—', hayMagma ? 'Pa·s' : '')
  mErupcion.set(hayMagma ? NOMBRE_ERUPCION[tipoErupcion(e)] : '—')
  barras.visc.style.width = `${Math.max(viscosidadNormal(config.silice) * 100, 2)}%`
  barras.gas.style.width = `${Math.max((config.gas / LIMITES.gas[1]) * 100, 2)}%`
  barras.expl.style.width = `${Math.max(e * 100, 2)}%`
  valores.visc.textContent = `10^${exp10(logViscosidad(config.silice))}`
  valores.gas.textContent = `${num(config.gas, 1)}%`
  valores.expl.textContent = num(e, 2)
  if (t - ultimoRelato < 150) return
  ultimoRelato = t
  const texto = relato(estado, config)
  if (texto !== relatoPrevio) ahora.innerHTML = relatoPrevio = texto
}

let anterior = performance.now()
function cuadro(t: number) {
  const dt = Math.max(0, Math.min((t - anterior) / 1000, 0.1))
  anterior = t
  if (!pred.pendiente) estado = paso(estado, config, dt)
  revelar()
  actualizarHud(t)
  escena.dibujar(estado, config, t / 1000)
  requestAnimationFrame(cuadro)
}
requestAnimationFrame(cuadro)
