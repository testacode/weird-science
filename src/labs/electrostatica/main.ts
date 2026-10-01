import '../../ui/kit.css'
import './electrostatica.css'
import { interruptorAvanzado } from '../../ui/avanzado'
import { fila, grupo, metrica, modal, segmentado } from '../../ui/componentes'
import { deslizador } from '../../ui/deslizador'
import { h } from '../../ui/dom'
import { hud } from '../../ui/hud'
import { interruptorPreguntas, prediccion } from '../../ui/prediccion'
import { COMO_FUNCIONA, GANCHO, cargaPartes, cientificaPartes, fuerzaPartes, mayus, num, relato } from './contenido'
import { crearCurva } from './curva'
import { crearEscena } from './escena'
import {
  CONFIG_INICIAL, DIST_PREGUNTA_PAPEL, MATERIALES, PARES, RANGOS, electrones, materialDe, resolver,
  type Config, type Experimento, type Lado, type ParId,
} from './model'
import { preguntaPara, type Intencion, type Pregunta, type Respuesta } from './prediccion'

/** Duración del frotado y de lo que se mueve de a poco (ms). */
const FROTE_MS = 3800
const DISTANCIA_MS = 650
/** Tramo del frotado en que los objetos están en contacto y pasan carga (fracción del total). */
const CONTACTO = { desde: 0.14, hasta: 0.86 }
const REFRESCO_MS = 80

const copiar = (c: Config): Config => ({ ...c, dist: { ...c.dist } })
let config = copiar(CONFIG_INICIAL)
const lab = document.querySelector<HTMLElement>('#lab')!
const escena = crearEscena(lab)

// --- HUD izquierdo ---
const gancho = h('p', { class: 'gancho' })
gancho.innerHTML = GANCHO
const mCarga = metrica('Carga')
const mDistancia = metrica('Distancia')
const mEfecto = metrica('Fuerza')
const mElectrones = metrica('Electrones')
mCarga.el.classList.add('c-ambar')
mEfecto.el.classList.add('c-marca')
mElectrones.el.classList.add('avanzado')
const etiqueta = (m: { el: HTMLElement }, texto: string) => (m.el.querySelector('.etiqueta')!.textContent = texto)
const ahora = h('div', { class: 'panel ahora' })
const curva = crearCurva()
lab.append(
  hud('izq',
    h('a', { href: '../../', class: 'etiqueta' }, '← Weird Science'),
    h('h1', { class: 'titulo' }, h('small', {}, 'Lab de electrostática'), h('span', {}, 'Cargas y fuerzas')),
    gancho,
    h('div', { class: 'metricas' }, mCarga.el, mDistancia.el, mEfecto.el, mElectrones.el),
    ahora,
    curva.el,
  ),
)

// --- Controles ---
const ayuda = modal()
const PARES_A: ParId[] = ['globo-pelo', 'vidrio-seda', 'pvc-lana']
const PARES_B: ParId[] = ['globo-lana', 'vidrio-pelo', 'seda-lana']
const opcionesPar = (ids: ParId[]) => ids.map((id) => ({ valor: id, texto: `${MATERIALES[PARES[id].a].nombre} · ${MATERIALES[PARES[id].b].nombre}` }))
const paresA = segmentado<ParId>(opcionesPar(PARES_A), config.par, (v) => cambiarPar(v))
const paresB = segmentado<ParId>(opcionesPar(PARES_B), config.par, (v) => cambiarPar(v))
const botonFrotar = h('button', { class: 'boton boton-marca', type: 'button', onclick: () => pedir('frotar') }, 'Frotar')
const botonDescargar = h('button', { class: 'boton', type: 'button', onclick: () => cambiarPar(config.par) }, 'Descargar')
const experimento = segmentado<Experimento>(
  [{ valor: 'cargas', texto: 'Cargas' }, { valor: 'papelitos', texto: 'Papelitos' }, { valor: 'electroscopio', texto: 'Electroscopio' }],
  config.experimento, (v) => cambiarExperimento(v),
)
const cual = segmentado<Lado>([{ valor: 'a', texto: 'A' }, { valor: 'b', texto: 'B' }], config.cual, (v) => cambiarConfig({ cual: v }))
const otro = segmentado<Config['otro']>([{ valor: 'opuesto', texto: 'El otro' }, { valor: 'igual', texto: 'Otro igual' }], config.otro, (v) => cambiarConfig({ otro: v }))
const filaOtro = fila('Acercarle', otro.el)
const slider = (exp: Experimento, titulo: string, paso: number) =>
  deslizador({ titulo, ...RANGOS[exp], paso, valor: config.dist[exp], formato: (v) => `${num(v, 1)} cm`, alCambiar: (v) => cambiarDistancia(exp, v) })
const distancias = {
  cargas: slider('cargas', 'Distancia entre objetos', 0.5),
  papelitos: slider('papelitos', 'Altura del objeto', 0.1),
  electroscopio: slider('electroscopio', 'Distancia a la perilla', 0.5),
}
const botonDoble = h('button', { class: 'boton', type: 'button', onclick: () => pedir('duplicar') }, 'Alejar al doble')
const botonAcercar = h('button', { class: 'boton', type: 'button', onclick: () => pedir('acercar') }, `Acercar a ${num(DIST_PREGUNTA_PAPEL, 1)} cm`)
const botonReponer = h('button', { class: 'boton', type: 'button', onclick: () => escena.papeles.reponer() }, 'Reponer papelitos')
const porExperimento: Record<Experimento, HTMLElement[]> = {
  cargas: [filaOtro, distancias.cargas.el, botonDoble],
  papelitos: [distancias.papelitos.el, h('div', { class: 'fila' }, botonAcercar, botonReponer)],
  electroscopio: [distancias.electroscopio.el],
}

// --- Predecí antes de correr: la pregunta va antes de la acción; la acción se hace al responder ---
type Datos = { pregunta: Pregunta; intencion: Intencion }
let frote: { t0: number } | null = null
let animacion: { exp: Experimento; desde: number; hasta: number; t0: number } | null = null
const pred = prediccion<Respuesta, Datos>(() => pred.datos && ejecutar(pred.datos.intencion), {
  // Saltar (o apagar las preguntas): la acción se hace igual, sin predicción.
  saltar: (d) => d && ejecutar(d.intencion),
  textoSaltar: 'Saltar y hacerlo igual',
  listo: ({ intencion }) =>
    intencion === 'frotar' ? !frote : intencion === 'duplicar' ? !animacion && escena.asentada() : escena.papeles.pegados >= escena.papeles.total * 0.8,
})
/** Cuando lo que se ve coincide con lo que se corrige, se revela (se llama en cada cuadro). */
function revelar() {
  if (!pred.listo || !pred.datos) return
  const { correcta, explicacion } = pred.datos.pregunta.resolver()
  pred.revelar(correcta, explicacion)
}
/** Si la config cambia, la pregunta abierta (o ya respondida y sin revelar) deja de valer. */
const descartarPendiente = () => (pred.pendiente || pred.enCurso) && pred.ocultar()

function pedir(intencion: Intencion) {
  terminarAnimacion()
  descartarPendiente()
  const pregunta = preguntaPara(config, intencion, escena.papeles.pegados > 0)
  if (!pregunta) return ejecutar(intencion)
  if (pred.preguntar(pregunta.texto, pregunta.opciones, { pregunta, intencion })) sincronizar()
}
function ejecutar(intencion: Intencion) {
  if (intencion === 'frotar') frote = { t0: performance.now() }
  else animarDistancia(intencion === 'duplicar' ? config.dist.cargas * 2 : DIST_PREGUNTA_PAPEL)
  sincronizar()
}

// --- Cambios de config ---
function aplicar(nueva: Config, animando = false) {
  config = nueva
  refrescar(animando)
}
function cambiarConfig(cambio: Partial<Config>) {
  terminarAnimacion()
  descartarPendiente()
  if (cambio.cual) escena.papeles.reponer()
  aplicar({ ...config, ...cambio })
  sincronizar()
}
/** Elegir un par (o descargar el mismo): los dos objetos vuelven a estar neutros. */
function cambiarPar(par: ParId) {
  frote = null
  escena.papeles.reponer()
  cambiarConfig({ par, frote: 0 })
}
function cambiarExperimento(exp: Experimento) {
  cambiarConfig({ experimento: exp })
}
function cambiarDistancia(exp: Experimento, v: number) {
  terminarAnimacion()
  descartarPendiente()
  aplicar({ ...config, dist: { ...config.dist, [exp]: v } })
}
function animarDistancia(hasta: number) {
  const exp = config.experimento
  animacion = { exp, desde: config.dist[exp], hasta: Math.min(Math.max(hasta, RANGOS[exp].min), RANGOS[exp].max), t0: performance.now() }
}
/** Corta la animación llevando la distancia a su valor final. */
function terminarAnimacion() {
  if (!animacion) return
  config = { ...config, dist: { ...config.dist, [animacion.exp]: animacion.hasta } }
  animacion = null
}
function reiniciar() {
  frote = null
  animacion = null
  descartarPendiente()
  escena.papeles.reponer()
  aplicar(copiar(CONFIG_INICIAL))
  sincronizar()
}

// --- Estado -> pantalla ---
/** Controles: se actualizan cuando cambia algo discreto, no en cada cuadro. */
function sincronizar() {
  paresA.set(config.par)
  paresB.set(config.par)
  experimento.set(config.experimento)
  cual.set(config.cual)
  otro.set(config.otro)
  ;(['a', 'b'] as const).forEach((lado, i) => (cual.el.children[i].textContent = mayus(MATERIALES[materialDe(config, lado)].nombre)))
  const opuesto = materialDe(config, config.cual === 'a' ? 'b' : 'a')
  otro.el.children[0].textContent = `Con ${MATERIALES[opuesto].det}`
  for (const exp of Object.keys(porExperimento) as Experimento[]) porExperimento[exp].forEach((el) => (el.hidden = exp !== config.experimento))
  for (const exp of Object.keys(distancias) as Experimento[]) distancias[exp].set(config.dist[exp])
  botonFrotar.toggleAttribute('disabled', config.frote > 0 || frote !== null)
  botonDescargar.toggleAttribute('disabled', config.frote === 0 && frote === null)
  botonDoble.toggleAttribute('disabled', config.dist.cargas * 2 > RANGOS.cargas.max)
  botonAcercar.toggleAttribute('disabled', config.dist.papelitos <= DIST_PREGUNTA_PAPEL)
  refrescar()
}

let relatoPrevio = ''
let ultimaCurva = 0
let clavePrevia = ''
/** Lo que se lee: métricas, relato y curva. Va en cada cambio y en cada cuadro de una animación. */
function refrescar(animando = false) {
  const r = resolver(config)
  const exp = config.experimento
  const [carga, unidadCarga] = cargaPartes(r.q)
  mCarga.set(`${r.q > 0 ? '+' : r.q < 0 ? '−' : ''}${carga}`, unidadCarga)
  etiqueta(mDistancia, exp === 'papelitos' ? 'Altura' : 'Distancia')
  mDistancia.set(num(config.dist[exp], 1), 'cm')
  etiqueta(mEfecto, { cargas: 'Fuerza', papelitos: 'Atracción', electroscopio: 'Hojas' }[exp])
  if (exp === 'cargas') mEfecto.set(...fuerzaPartes(r.fuerza))
  else if (exp === 'papelitos') mEfecto.set(num(r.vecesPeso, r.vecesPeso >= 10 ? 0 : 1), '× peso')
  else mEfecto.set(num(r.angulo * 2, 0), '°')
  const [mantisa, potencia] = cientificaPartes(electrones(r.q))
  mElectrones.set(mantisa, potencia)
  const texto = relato(config, r, frote !== null, escena.papeles.pegados)
  if (texto !== relatoPrevio) ahora.innerHTML = relatoPrevio = texto
  const t = performance.now()
  const clave = `${exp}-${config.par}-${config.cual}-${config.otro}-${config.frote}-${config.dist[exp]}`
  if (clave === clavePrevia || (animando && t - ultimaCurva < REFRESCO_MS)) return
  clavePrevia = clave
  ultimaCurva = t
  curva.pintar(config)
}

lab.append(
  hud('der',
    h('div', { class: 'panel consola' },
      h('div', { class: 'fila' },
        h('button', { class: 'boton', type: 'button', onclick: reiniciar }, '↺ Restablecer'),
        h('button', { class: 'boton', type: 'button', 'aria-label': 'Cómo funciona', onclick: () => ayuda.abrir(COMO_FUNCIONA) }, '?')),
      grupo('Qué frotás', h('div', { class: 'grupo' }, paresA.el, paresB.el)),
      h('div', { class: 'fila' }, botonFrotar, botonDescargar),
      grupo('Experimento', experimento.el),
      fila('Objeto de prueba', cual.el),
      ...Object.values(porExperimento).flat(),
      interruptorAvanzado(),
      interruptorPreguntas(),
    ),
    pred.el,
  ),
  ayuda.el,
)

sincronizar()

let pegadosPrevio = 0
function cuadro(t: number) {
  const ahoraMs = performance.now()
  if (frote) {
    const p = Math.min((ahoraMs - frote.t0) / FROTE_MS, 1)
    const carga = Math.min(Math.max((p - CONTACTO.desde) / (CONTACTO.hasta - CONTACTO.desde), 0), 1)
    config = { ...config, frote: carga * carga * (3 - 2 * carga) }
    if (p >= 1) {
      frote = null
      config = { ...config, frote: 1 }
      sincronizar()
    } else refrescar(true)
  }
  if (animacion) {
    const p = Math.min((ahoraMs - animacion.t0) / DISTANCIA_MS, 1)
    const e = p * p * (3 - 2 * p)
    const { exp, desde, hasta } = animacion
    if (p >= 1) animacion = null
    aplicar({ ...config, dist: { ...config.dist, [exp]: desde + (hasta - desde) * e } }, true)
    if (!animacion) sincronizar()
  }
  revelar()
  if (escena.papeles.pegados !== pegadosPrevio) {
    pegadosPrevio = escena.papeles.pegados
    refrescar()
  }
  escena.aplicar({ c: config, r: resolver(config), frote: frote ? Math.min((ahoraMs - frote.t0) / FROTE_MS, 1) : null })
  escena.dibujar(t)
  requestAnimationFrame(cuadro)
}
requestAnimationFrame(cuadro)

