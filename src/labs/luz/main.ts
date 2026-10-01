import '../../ui/kit.css'
import './luz.css'
import { metrica, modal } from '../../ui/componentes'
import { h } from '../../ui/dom'
import { grafico, type Serie } from '../../ui/grafico'
import { hud } from '../../ui/hud'
import { prediccion } from '../../ui/prediccion'
import { crearConsola, ESCENAS } from './consola'
import { COMO_FUNCIONA, GANCHO, num, relato } from './contenido'
import { crearEscena } from './escena'
import {
  CONFIG_INICIAL, OJO_MAX, curva, esAire, ojoMax, resolver, trazarEspejo, trazarLapiz, type Config, type Resultado,
} from './model'
import { preguntaPara, type Pregunta, type Respuesta } from './prediccion'
import { instalarTeclado } from './teclado'

/** Cuánto se espera, con el cambio ya hecho, antes de revelar si acertó la predicción. */
const ESPERA_REVELAR_MS = 2400

const lab = document.querySelector<HTMLElement>('#lab')!
let config: Config = { ...CONFIG_INICIAL }
let r: Resultado = resolver(config)
const escena = crearEscena(lab)

// --- HUD izquierdo: título, métricas (cambian con la escena), relato en vivo y gráfico ---
const gancho = h('p', { class: 'gancho' })
gancho.innerHTML = GANCHO
const metricas = {
  espejo: [metrica('Incidencia'), metrica('Reflexión'), metrica('Espejo giró'), metrica('Rayo giró')],
  refraccion: [metrica('Incidencia'), metrica('Refracción'), metrica('Se refleja'), metrica('Crítico')],
  lapiz: [metrica('Real'), metrica('Parece'), metrica('Achique'), metrica('Índice n')],
}
const colores = [['c-ambar', 'c-magenta'], ['c-ambar', 'c-cielo', 'c-magenta'], ['c-cielo', 'c-cielo']]
Object.values(metricas).forEach((fila, i) => fila.forEach((m, k) => colores[i][k] && m.el.classList.add(colores[i][k])))
metricas.espejo[3].el.classList.add('c-magenta')
metricas.refraccion[3].el.classList.add('avanzado')
metricas.lapiz[2].el.classList.add('avanzado')
metricas.lapiz[3].el.classList.add('avanzado')
const filaMetricas = h('div', { class: 'metricas' })
const ahora = h('div', { class: 'panel ahora' })
const curvaGrafico = grafico([], { alto: 110 })

lab.append(
  hud('izq',
    h('a', { href: '../../', class: 'etiqueta' }, '← Weird Science'),
    h('h1', { class: 'titulo' }, h('small', {}, 'Lab de la luz'), h('span', {}, 'Reflejo y refracción')),
    gancho,
    filaMetricas,
    ahora,
    curvaGrafico.el,
  ),
)

// --- Gráfico: se dibuja hasta donde está el control, así el extremo de la curva es el estado actual ---
let escenaGrafico: Config['escena'] | null = null
const SERIES: Record<Config['escena'], Serie[]> = {
  espejo: [{ id: 'espejo', nombre: 'Espejo giró', color: 'ambar' }, { id: 'rayo', nombre: 'Rayo giró', color: 'magenta' }],
  refraccion: [{ id: 'sinDesvio', nombre: 'Sin doblarse', color: 'ambar' }, { id: 'refraccion', nombre: 'Refracción', color: 'cielo' }],
  lapiz: [{ id: 'real', nombre: 'Real', color: 'ambar' }, { id: 'parece', nombre: 'Parece', color: 'cielo' }],
}
function dibujarGrafico() {
  if (config.escena !== escenaGrafico) {
    escenaGrafico = config.escena
    const escalas = {
      espejo: { titulo: 'Cuánto gira el rayo', unidadX: '° del espejo', unidadY: '°', xMax: 20, yMax: 40 },
      refraccion: { titulo: 'Ángulo que sale según el que entra', unidadX: '°', unidadY: '°', xMax: 90, yMax: 90, yTecho: 90 },
      lapiz: { titulo: 'Profundidad de la punta según desde dónde se mira', unidadX: '°', unidadY: 'cm', xMax: OJO_MAX, yMax: 20 },
    }
    curvaGrafico.cambiar(SERIES[config.escena], escalas[config.escena])
  } else curvaGrafico.limpiar()
  if (config.escena === 'espejo') {
    for (let x = 0; x <= config.espejo; x++) curvaGrafico.agregar(x, { espejo: x, rayo: trazarEspejo({ ...config, espejo: x }).giroRayo })
  } else if (config.escena === 'refraccion') {
    for (const p of curva(config, config.angulo)) curvaGrafico.agregar(p.x, { sinDesvio: p.x, refraccion: p.refraccion })
  } else {
    for (let x = 0; x <= config.ojo; x++) {
      const t = trazarLapiz({ ...config, ojo: x })
      curvaGrafico.agregar(x, { real: t.profundidad, parece: t.aparente })
    }
  }
}

// --- Predecí antes de correr: la pregunta va antes del cambio; el cambio se hace al responder ---
const ayuda = modal()
const pred = prediccion<Respuesta, { nueva: Config; pregunta: Pregunta }>(() => {
  if (!pred.datos) return
  const { nueva, pregunta } = pred.datos
  aplicar(nueva)
  const resultado = pregunta.resolver()
  pred.revelarEn(ESPERA_REVELAR_MS, () => pred.revelar(resultado.correcta, resultado.explicacion))
}, {
  // Saltar (o apagar las preguntas): el cambio se hace igual, sin predicción.
  saltar: () => {
    const nueva = pred.datos?.nueva
    if (nueva) aplicar(nueva)
  },
  textoSaltar: 'Saltar y hacerlo igual',
})

/** Todo cambio pasa por acá: si corresponde una predicción, primero se pregunta; si no, se aplica. */
function pedir(cambio: Partial<Config>) {
  if ((Object.keys(cambio) as (keyof Config)[]).every((k) => cambio[k] === config[k])) return
  // La config cambió: la tarjeta (pendiente, en curso o revelada) y su reveal programado no valen más.
  pred.ocultar()
  let nueva = { ...config, ...cambio }
  // El ojo no puede mirar tan de costado que la luz salga por afuera de la pecera.
  if (nueva.escena === 'lapiz') nueva = { ...nueva, ojo: Math.min(nueva.ojo, ojoMax(nueva)) }
  const pregunta = preguntaPara(config, nueva)
  if (!pregunta || !pred.preguntar(pregunta.texto, pregunta.opciones, { nueva, pregunta })) return aplicar(nueva)
  consola.sincronizar(config)
}
function reiniciar() {
  pred.ocultar()
  aplicar({ ...CONFIG_INICIAL })
}

const consola = crearConsola({ cambiar: pedir, reiniciar, ayuda: () => ayuda.abrir(COMO_FUNCIONA) }, config)
lab.append(hud('der', consola.el, pred.el), ayuda.el)

const grados = (v: number) => num(v, 1)
let relatoPrevio = ''
function aplicar(nueva: Config) {
  config = nueva
  r = resolver(config)
  consola.sincronizar(config)
  filaMetricas.replaceChildren(...metricas[config.escena].map((m) => m.el))
  if (r.escena === 'espejo') {
    const [i, f, e, g] = metricas.espejo
    i.set(grados(r.incidencia), '°')
    f.set(grados(r.reflexion), '°')
    e.set(grados(config.espejo), '°')
    g.set(grados(r.giroRayo), '°')
  } else if (r.escena === 'refraccion') {
    const [i, f, p, c] = metricas.refraccion
    i.set(grados(r.incidencia), '°')
    f.set(r.refraccion === null ? '—' : grados(r.refraccion), r.refraccion === null ? '' : '°')
    p.set(num(r.reflectancia * 100, r.reflectancia < 0.1 ? 1 : 0), '%')
    const sinCritico = r.critico === null || esAire(config)
    c.set(sinCritico ? '—' : grados(r.critico ?? 0), sinCritico ? '' : '°')
  } else {
    const [real, parece, achique, n] = metricas.lapiz
    real.set(num(r.profundidad, 1), 'cm')
    parece.set(num(r.aparente, 1), 'cm')
    achique.set(`× ${num(r.factor, 2)}`)
    n.set(num(r.n, 3))
  }
  const texto = relato(config, r)
  if (texto !== relatoPrevio) ahora.innerHTML = relatoPrevio = texto
  dibujarGrafico()
}

instalarTeclado({
  escena: (i) => ESCENAS[i] && pedir({ escena: ESCENAS[i].valor }),
  reiniciar,
  ayuda: () => (ayuda.abierto ? ayuda.cerrar() : ayuda.abrir(COMO_FUNCIONA)),
})

aplicar(config)

function cuadro() {
  escena.dibujar(config, r)
  requestAnimationFrame(cuadro)
}
requestAnimationFrame(cuadro)
