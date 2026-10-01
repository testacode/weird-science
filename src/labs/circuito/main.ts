import '../../ui/kit.css'
import './circuito.css'
import { interruptorAvanzado } from '../../ui/avanzado'
import { fila, grupo, interruptor, metrica, modal, segmentado } from '../../ui/componentes'
import { h } from '../../ui/dom'
import { hud } from '../../ui/hud'
import { grafico } from '../../ui/grafico'
import { interruptorPreguntas, prediccion } from '../../ui/prediccion'
import { AVISO_CORTO, COMO_FUNCIONA, GANCHO, num, relato } from './contenido'
import { crearEscena, type Accion } from './escena'
import { CONFIG_INICIAL, MAX_LAMPARAS, VOLTAJES, resolver, type Config } from './model'
import { preguntaPara, type Pregunta, type Respuesta } from './prediccion'

/** Segundos que muestra el gráfico antes de volver a empezar. */
const VENTANA_SEG = 30
const MUESTREO_SEG = 0.25
/** Cuánto se espera, con el cambio ya hecho, antes de revelar si acertó la predicción. */
const ESPERA_REVELAR_MS = 2400

const copia = (c: Config): Config => ({ ...c, sacadas: [...c.sacadas] })
const lab = document.querySelector<HTMLElement>('#lab')!
let config = copia(CONFIG_INICIAL)
let r = resolver(config)
const escena = crearEscena(lab)

// --- HUD izquierdo: título, métricas, relato en vivo, aviso y gráfico ---
const gancho = h('p', { class: 'gancho' })
gancho.innerHTML = GANCHO
const mVoltaje = metrica('Voltaje')
const mCorriente = metrica('Corriente')
const mPotencia = metrica('Potencia')
const mResistencia = metrica('R equiv.')
mVoltaje.el.classList.add('c-marca')
mCorriente.el.classList.add('c-cielo')
mPotencia.el.classList.add('c-ambar')
mResistencia.el.classList.add('avanzado')
const ahora = h('div', { class: 'panel ahora' })
const aviso = h('div', { class: 'panel aviso', hidden: true })
aviso.innerHTML = AVISO_CORTO
const curva = grafico(
  [
    { id: 'lamparas', nombre: 'Lámparas', color: 'ambar' },
    { id: 'calor', nombre: 'Calor perdido', color: 'magenta' },
  ],
  { titulo: 'Potencia en vivo', unidadX: ' s', unidadY: 'W', alto: 100 },
)
let tGrafico = 0
let ultimoPunto = 0
function puntoGrafico() {
  curva.agregar(tGrafico, { lamparas: r.potenciaLamparas, calor: r.calor })
  ultimoPunto = tGrafico
}
function reiniciarGrafico() {
  curva.limpiar({ xMax: VENTANA_SEG, yMax: 1 })
  tGrafico = 0
  puntoGrafico()
}
lab.append(
  hud('izq',
    h('a', { href: '../../', class: 'etiqueta' }, '← Weird Science'),
    h('h1', { class: 'titulo' }, h('small', {}, 'Lab del circuito eléctrico'), h('span', {}, 'Pila, cable y lamparita')),
    gancho,
    h('div', { class: 'metricas' }, mVoltaje.el, mCorriente.el, mPotencia.el, mResistencia.el),
    ahora,
    aviso,
    curva.el,
  ),
)

// --- Controles ---
const ayuda = modal()
const voltaje = segmentado(VOLTAJES.map((v) => ({ valor: String(v), texto: `${num(v)} V` })), String(config.voltaje), (v) => pedir({ voltaje: Number(v) as Config['voltaje'] }))
const conexion = segmentado<Config['conexion']>([{ valor: 'serie', texto: 'Serie' }, { valor: 'paralelo', texto: 'Paralelo' }], config.conexion, (v) => pedir({ conexion: v }))
const cantidad = segmentado(
  Array.from({ length: MAX_LAMPARAS }, (_, i) => ({ valor: String(i + 1), texto: String(i + 1) })),
  String(config.cantidad),
  (v) => pedir({ cantidad: Number(v) }),
)
const llave = segmentado([{ valor: 'cerrado', texto: 'Cerrado' }, { valor: 'abierto', texto: 'Abierto' }], 'cerrado', (v) => pedir({ cerrado: v === 'cerrado' }))
const corto = interruptor('Cortocircuito', false, (si) => pedir({ corto: si }))
const botonSacar = h('button', { class: 'boton', type: 'button', onclick: () => sacarUna() }, 'Sacar una lamparita')
const botonPoner = h('button', { class: 'boton', type: 'button', onclick: () => pedir({ sacadas: [false, false, false] }) }, 'Poner todas')


// --- Predecí antes de correr: la pregunta va antes del cambio; el cambio se hace al responder ---
const pred = prediccion<Respuesta, { nueva: Config; pregunta: Pregunta }>(() => {
  if (!pred.datos) return
  const { nueva, pregunta } = pred.datos
  const antes = r
  aplicar(nueva)
  const resultado = pregunta.resolver(antes, r)
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
  // Cualquier cambio retira la tarjeta (y su reveal programado): la respuesta no coincidiría con lo que se ve.
  pred.ocultar()
  let nueva = { ...copia(config), ...cambio }
  if (cambio.cantidad !== undefined && cambio.cantidad !== config.cantidad) nueva = { ...nueva, sacadas: [false, false, false] }
  const pregunta = preguntaPara(config, nueva)
  if (!pregunta || !pred.preguntar(pregunta.texto, pregunta.opciones, { nueva, pregunta })) return aplicar(nueva)
  sincronizar()
}
function sacarUna() {
  const i = config.sacadas.slice(0, config.cantidad).lastIndexOf(false)
  if (i >= 0) pedir({ sacadas: config.sacadas.map((s, k) => s || k === i) })
}
function alternarLampara(i: number) {
  pedir({ sacadas: config.sacadas.map((s, k) => (k === i ? !s : s)) })
}
function reiniciar() {
  pred.ocultar()
  aplicar(copia(CONFIG_INICIAL))
  reiniciarGrafico()
}

function sincronizar() {
  voltaje.set(String(config.voltaje))
  conexion.set(config.conexion)
  cantidad.set(String(config.cantidad))
  llave.set(config.cerrado ? 'cerrado' : 'abierto')
  corto.set(config.corto)
  const sacadas = config.sacadas.slice(0, config.cantidad).filter(Boolean).length
  botonSacar.disabled = sacadas === config.cantidad
  botonPoner.disabled = sacadas === 0
}

let relatoPrevio = ''
function aplicar(nueva: Config) {
  config = nueva
  r = resolver(config)
  sincronizar()
  const lamparas = r.lamparas.map((l, i) =>
    `Lamparita ${i + 1} · ${config.sacadas[i] ? 'sacada' : l.brillo > 0.02 ? `${num(l.brillo * 100, 0)} %` : 'apagada'}`,
  )
  escena.aplicar(config, r, { pila: `Pila ${num(config.voltaje)} V`, lamparas, interruptor: 'Interruptor · tocalo' })

  const primera = r.lamparas.find((l) => l.presente) ?? r.lamparas[0]
  mVoltaje.set(num(config.voltaje), 'V')
  mCorriente.set(num(r.corriente, r.corriente >= 10 ? 1 : 2), 'A')
  mPotencia.set(num(primera.potencia, 2), 'W')
  mResistencia.set(Number.isFinite(r.rExterna) ? num(r.rExterna, r.rExterna >= 100 ? 0 : 1) : '∞', 'Ω')
  const texto = relato(config, r)
  if (texto !== relatoPrevio) ahora.innerHTML = relatoPrevio = texto
  aviso.hidden = !config.corto
}

escena.onTocar((a: Accion) => (a.tipo === 'interruptor' ? pedir({ cerrado: !config.cerrado }) : alternarLampara(a.indice)))

lab.append(
  hud('der',
    h('div', { class: 'panel consola' },
      h('div', { class: 'fila' },
        h('button', { class: 'boton', type: 'button', onclick: reiniciar }, '↺ Restablecer'),
        h('button', { class: 'boton', type: 'button', 'aria-label': 'Cómo funciona', onclick: () => ayuda.abrir(COMO_FUNCIONA) }, '?')),
      grupo('Pila', voltaje.el),
      fila('Conexión', conexion.el),
      fila('Lamparitas', cantidad.el),
      fila('Interruptor', llave.el),
      grupo('Romper el sistema', h('div', { class: 'grupo' },
        h('div', { class: 'romper' }, botonSacar, botonPoner),
        corto.el)),
      interruptorAvanzado(),
      interruptorPreguntas(),
    ),
    pred.el,
  ),
  ayuda.el,
)

aplicar(config)
reiniciarGrafico()

let anterior = performance.now()
function cuadro(t: number) {
  tGrafico += Math.min((t - anterior) / 1000, 0.1)
  anterior = t
  if (tGrafico - ultimoPunto >= MUESTREO_SEG) {
    if (tGrafico >= VENTANA_SEG) reiniciarGrafico()
    else puntoGrafico()
  }
  escena.dibujar(t / 1000)
  requestAnimationFrame(cuadro)
}
requestAnimationFrame(cuadro)
