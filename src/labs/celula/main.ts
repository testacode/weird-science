import '../../ui/kit.css'
import './celula.css'
import { numero } from '../../ui/formato'
import { hud as columnaHud } from '../../ui/hud'
import { prediccion } from '../../ui/prediccion'
import { PCT_MAX, VELOCIDADES, crearControles, pctDe, solucionDe } from './controles'
import { CELULAS, estadoInicial, leer, paso, type Celula, type Entorno } from './model'
import { crearEscena } from './escena'
import { MUESTREO_PANTALLA_S, crearHud } from './hud'
import { preguntaPara, type Pregunta, type Respuesta } from './prediccion'
import { instalarTeclado } from './teclado'

const lab = document.querySelector<HTMLElement>('#lab')!
let ent: Entorno = { celula: 'globulo', pct: pctDe('globulo', 'agua'), selectiva: true, pared: true }
let est = estadoInicial()
let velocidad = 1
let corriendo = false
/** Tiempo de la célula en el que se sumó el último punto al gráfico; con la célula rota se corta el gráfico. */
let ultimoPunto = 0
let graficoCortado = false
/** Lo que muestra la pantalla en este cuadro: decide cuándo se puede revelar. */
let lectura = leer(est, ent)

const escena = crearEscena(lab)
const hud = crearHud(lab)
const pred = prediccion<Respuesta, { pregunta: Pregunta; ent: Entorno }>(() => seguir(true), {
  saltar: () => seguir(true),
  listo: () => lectura.listo,
  resolver: (d) => d.pregunta.resolver(d.ent),
})
const controles = crearControles(ent, velocidad, {
  alternar,
  reiniciar: nueva,
  velocidad: cambiarVelocidad,
  celula: cambiarCelula,
  solucion: (s) => cambiarEntorno({ pct: pctDe(ent.celula, s) }),
  pct: cambiarPct,
  selectiva: (si) => cambiarEntorno({ selectiva: si }),
  pared: (si) => cambiarEntorno({ pared: si }),
})
lab.append(columnaHud('der', controles.el, pred.el), controles.ayuda.el)

// --- Predecí antes de correr: con una célula nueva, la simulación espera la predicción ---
function seguir(va: boolean) {
  corriendo = va
  controles.botonPlay.textContent = va ? '⏸ Pausa' : '▶ Seguir'
}
function predecir() {
  const pregunta = preguntaPara(ent)
  if (!pred.preguntar(pregunta.texto, pregunta.opciones, { pregunta, ent })) return
  corriendo = false
  controles.botonPlay.textContent = '▶ Saltar'
}

function alternar() {
  if (pred.pendiente) return pred.saltar()
  seguir(!corriendo)
}
/** Célula nueva en reposo, en la solución y con la membrana de `ent`. */
function nueva() {
  est = estadoInicial()
  escena.reiniciar(ent)
  hud.reiniciarCurva(ent)
  ultimoPunto = 0
  graficoCortado = false
  lectura = leer(est, ent)
  hud.muestrear(0, ent, lectura)
  seguir(true)
  predecir()
}
/** Cambiar la solución o romper algo arranca con una célula nueva y su pregunta. */
function cambiarEntorno(cambio: Partial<Entorno>) {
  ent = { ...ent, ...cambio }
  controles.set.pct(ent.celula, ent.pct)
  controles.set.selectiva(ent.selectiva)
  controles.set.pared(ent.pared)
  nueva()
}
function cambiarCelula(celula: Celula) {
  const tipica = solucionDe(ent.celula, ent.pct)
  controles.set.celula(celula)
  cambiarEntorno({ celula, pct: tipica ? pctDe(celula, tipica) : Math.min(ent.pct, PCT_MAX) })
}
/** El deslizador no reinicia: la célula reacciona en vivo. La pregunta abierta ya no corresponde y se descarta. */
function cambiarPct(pct: number) {
  ent = { ...ent, pct }
  controles.set.pct(ent.celula, pct)
  pred.ocultar()
  if (!corriendo) seguir(true)
}
function cambiarVelocidad(v: number) {
  velocidad = v
  controles.set.velocidad(v)
}

instalarTeclado({
  alternar,
  reiniciar: nueva,
  velocidad: (i) => cambiarVelocidad(VELOCIDADES[i]),
  celula: () => cambiarCelula(ent.celula === 'globulo' ? 'vegetal' : 'globulo'),
  membrana: () => cambiarEntorno({ selectiva: !ent.selectiva }),
  pared: () => ent.celula === 'vegetal' && cambiarEntorno({ pared: !ent.pared }),
  ayuda: () => (controles.ayuda.abierto ? controles.ayuda.cerrar() : controles.abrirAyuda()),
  atajos: () => (controles.ayuda.abierto ? controles.ayuda.cerrar() : controles.abrirAtajos()),
})

nueva()

let anterior = performance.now()
function cuadro(t: number) {
  const dtReal = Math.max(0, Math.min((t - anterior) / 1000, 0.1))
  anterior = t
  const p = CELULAS[ent.celula]
  if (corriendo) est = paso(est, ent, dtReal * velocidad * p.ritmo)
  lectura = leer(est, ent)
  if (corriendo && !graficoCortado && est.t - ultimoPunto >= MUESTREO_PANTALLA_S * p.ritmo * velocidad) {
    hud.muestrear(est.t, ent, lectura)
    ultimoPunto = est.t
    graficoCortado = est.rota
  }
  pred.revisar()
  controles.reloj.textContent = corriendo
    ? p.ritmo * velocidad < 1 ? `Cámara lenta ×${numero(1 / (p.ritmo * velocidad), 1)}` : `Reloj acelerado ×${numero(p.ritmo * velocidad, 1)}`
    : 'Reloj detenido'
  hud.actualizar(ent, lectura)
  escena.dibujar(ent, lectura, dtReal)
  requestAnimationFrame(cuadro)
}
requestAnimationFrame(cuadro)
