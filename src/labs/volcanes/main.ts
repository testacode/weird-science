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
/** Composición que se muestra (cono, métrica y barra de erupción): se congela mientras espera la pregunta de la erupción, para no adelantar la respuesta. */
let vista = { silice: config.silice, gas: config.gas }

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
    // Cada borde trae su magma típico (el transformante no tiene: conserva el actual). Cargarlo no abre otra pregunta: la del borde ya es una.
    const tipico = FUSION[b].tipico
    config = { ...config, borde: b, ...(tipico ? PRESETS[tipico] : {}) }
    estado = estadoInicial()
    escena.cambiarBorde(b)
    sincronizar()
    preguntar(preguntaVolcanes(config))
  },
)
const notaBorde = h('p', { class: 'nota-borde' })
/** El magma de referencia elegido, o `otro` si se movió algún deslizador (así cualquier referencia se puede volver a elegir). */
const presetActivo = (c: Config): TipoMagma | 'otro' =>
  (Object.keys(PRESETS) as TipoMagma[]).find((t) => PRESETS[t].silice === c.silice && PRESETS[t].gas === c.gas) ?? 'otro'
const magma = segmentado<TipoMagma | 'otro'>(
  [{ valor: 'basaltico', texto: 'Basalto' }, { valor: 'andesitico', texto: 'Andesita' }, { valor: 'riolitico', texto: 'Riolita' }],
  presetActivo(config),
  (t) => {
    if (t === 'otro') return
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

/** Deja los controles iguales que `config`. El resto (métricas, notas) lo sigue `actualizarHud`. */
function sincronizar() {
  borde.set(config.borde)
  magma.set(presetActivo(config))
  silice.set(config.silice)
  gas.set(config.gas)
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

const NOTA_BORDE = { divergente: 'Borde divergente: dorsal oceánica', convergente: 'Borde convergente: subducción', transformante: 'Borde transformante: falla' }
const NOTA_TIPICO = { basaltico: 'basalto', andesitico: 'andesita', riolitico: 'riolita' }

let hudClave = ''
let relatoPrevio = ''
let ultimoRelato = 0
/** Con una pregunta abierta nada de lo que se ve da la respuesta: origen, erupción y "sin magma" quedan en "?". Solo toca el DOM si algo cambió. */
function actualizarHud(t: number) {
  const espera = pred.pendiente
  const f = FUSION[config.borde]
  const hayMagma = f.produccion > 0
  const clave = [config.borde, config.silice, config.gas, vista.silice, vista.gas, espera].join('|')
  if (clave !== hudClave) {
    hudClave = clave
    const conMagma = hayMagma || espera
    const e = explosividad(vista.silice, vista.gas)
    decide.hidden = !conMagma
    grupoMagma.hidden = !conMagma
    sinMagma.hidden = conMagma
    notaBorde.textContent = NOTA_BORDE[config.borde] + (f.tipico && !espera ? `. Magma típico: ${NOTA_TIPICO[f.tipico]}` : '')
    mOrigen.set(espera ? '?' : hayMagma ? num(f.origenKm, 0) : '—', !espera && hayMagma ? 'km' : '')
    mTemp.set(conMagma ? num(temperatura(config.silice), 0) : '—', conMagma ? '°C' : '')
    mVisc.set(conMagma ? `10<sup>${exp10(logViscosidad(config.silice))}</sup>` : '—', conMagma ? 'Pa·s' : '')
    mErupcion.set(espera ? '?' : hayMagma ? NOMBRE_ERUPCION[tipoErupcion(e)] : '—')
    barras.visc.style.width = `${Math.max(viscosidadNormal(config.silice) * 100, 2)}%`
    barras.gas.style.width = `${Math.max((config.gas / LIMITES.gas[1]) * 100, 2)}%`
    barras.expl.style.width = espera ? '0' : `${Math.max(e * 100, 2)}%`
    valores.visc.textContent = `10^${exp10(logViscosidad(config.silice))}`
    valores.gas.textContent = `${num(config.gas, 1)}%`
    valores.expl.textContent = espera ? '?' : num(e, 2)
  }
  if (t - ultimoRelato < 150) return
  ultimoRelato = t
  const texto = relato(estado, config, espera)
  if (texto !== relatoPrevio) ahora.innerHTML = relatoPrevio = texto
}

let anterior = performance.now()
function cuadro(t: number) {
  const dt = Math.max(0, Math.min((t - anterior) / 1000, 0.1))
  anterior = t
  const espera = pred.pendiente
  const esperaErupcion = espera && pred.datos?.pregunta.id === 'erupcion'
  if (!esperaErupcion) vista = { silice: config.silice, gas: config.gas }
  if (!espera) estado = paso(estado, config, dt)
  revelar()
  actualizarHud(t)
  escena.dibujar(estado, vista, dt, !espera || esperaErupcion)
  requestAnimationFrame(cuadro)
}
requestAnimationFrame(cuadro)
