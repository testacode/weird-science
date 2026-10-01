import '../../ui/kit.css'
import './digestivo.css'
import { hud as columnaHud } from '../../ui/hud'
import { prediccion } from '../../ui/prediccion'
import { agregado, avanzar, nuevoFlujo, ritmoReloj, todosTerminaron, type Bocados } from './bocados'
import { COMIDAS, type Comida } from './contenido'
import { crearControles, VELOCIDADES, type Vista } from './controles'
import { crearEscena } from './escena'
import { crearHud } from './hud'
import { SEGMENTOS, phSegmento, type Config } from './model'
import { leyendaPh } from './ph'
import { preguntaPara, referencia, type Pregunta, type Respuesta } from './prediccion'
import { instalarTeclado } from './teclado'

const lab = document.querySelector<HTMLElement>('#lab')!
let comida: Comida = COMIDAS[0]
let config: Config = { bilis: true, acidoGastrico: true }
let bocados: Bocados = 1
let velocidad = 1
let vista: Vista = 'normal'
let corriendo = true
let flujo = nuevoFlujo(comida.gramos, bocados)
/** Reloj de animación: se frena con la pausa (vuelo de nutrientes, zoom). */
let animacion = 0

const escena = crearEscena(lab, SEGMENTOS.map((s) => s.nombre))
escena.setComida(comida.gramos, bocados)
const escalaPh = leyendaPh()
const hud = crearHud(lab, [escalaPh.el])
const pred = prediccion<Respuesta>(() => seguir(true))
const controles = crearControles({ comida, config, velocidad, vista, bocados }, {
  alternar,
  reiniciar,
  velocidad: cambiarVelocidad,
  config: cambiarConfig,
  vista: cambiarVista,
  bocados: cambiarBocados,
  comida: cambiarComida,
})
lab.append(columnaHud('der', controles.el, pred.el), controles.ayuda.el)
hud.reiniciarCurva(comida, bocados)

// --- Predecí antes de correr: al romper algo, la simulación espera la predicción ---
let pregunta: Pregunta | null = null
function seguir(va: boolean) {
  corriendo = va
  controles.botonPlay.textContent = va ? '⏸ Pausa' : '▶ Seguir'
}
function predecir() {
  pregunta = preguntaPara(config)
  if (!pregunta) return pred.ocultar()
  pred.preguntar(pregunta.texto, pregunta.opciones)
  corriendo = false
  controles.botonPlay.textContent = '▶ Saltar'
}
function revelar() {
  if (!pregunta || !pred.enCurso) return
  const r = pregunta.resolver(agregado(flujo), referencia(comida.gramos))
  pred.revelar(r.correcta, r.explicacion)
}

function alternar() {
  if (pred.pendiente) {
    pred.ocultar()
    pregunta = null
    return seguir(true)
  }
  if (todosTerminaron(flujo)) return reiniciar()
  seguir(!corriendo)
}
function reiniciar() {
  flujo = nuevoFlujo(comida.gramos, bocados)
  escena.setComida(comida.gramos, bocados)
  hud.reiniciarCurva(comida, bocados)
  seguir(true)
  predecir()
}
/** Romper algo (o tocar los controles con una predicción a la vista) reinicia el tránsito. */
function cambiarConfig(clave: keyof Config, valor: boolean) {
  config = { ...config, [clave]: valor }
  if (clave === 'bilis') controles.set.bilis(valor)
  else controles.set.acido(valor)
  if (preguntaPara(config) || pregunta) reiniciar()
}
function cambiarVelocidad(v: number) {
  velocidad = v
  controles.set.velocidad(v)
}
function cambiarBocados(n: Bocados) {
  bocados = n
  controles.set.bocados(n)
  reiniciar()
}
function cambiarComida(id: Comida['id']) {
  comida = COMIDAS.find((c) => c.id === id)!
  reiniciar()
}
function cambiarVista(v: Vista) {
  vista = v
  escena.setVista(v === 'explotada')
  controles.set.vista(v)
}
escena.onVesicula(() => cambiarConfig('bilis', !config.bilis))

instalarTeclado({
  alternar,
  reiniciar,
  velocidad: (i) => cambiarVelocidad(VELOCIDADES[i]),
  bilis: () => cambiarConfig('bilis', !config.bilis),
  acido: () => cambiarConfig('acidoGastrico', !config.acidoGastrico),
  vista: () => cambiarVista(vista === 'normal' ? 'explotada' : 'normal'),
  ayuda: () => (controles.ayuda.abierto ? controles.ayuda.cerrar() : controles.abrirAyuda()),
})

let anterior = performance.now()
function cuadro(t: number) {
  const dtReal = Math.min((t - anterior) / 1000, 0.1)
  anterior = t
  if (corriendo) {
    animacion += dtReal
    avanzar(flujo, config, dtReal, velocidad)
  }
  const estado = agregado(flujo)
  if (corriendo) {
    hud.muestrear(estado)
    if (todosTerminaron(flujo)) {
      corriendo = false
      controles.botonPlay.textContent = '↺ Repetir'
      revelar()
    }
  }
  escalaPh.set(phSegmento(estado.segmento, config))
  controles.reloj.textContent =
    corriendo && !estado.terminado
      ? `Reloj acelerado ×${Math.round(ritmoReloj(flujo, velocidad) * 3600).toLocaleString('es-AR')}`
      : 'Reloj detenido'
  hud.actualizar(estado, config, comida)
  escena.dibujar(flujo.estados, config, animacion)
  requestAnimationFrame(cuadro)
}
requestAnimationFrame(cuadro)
