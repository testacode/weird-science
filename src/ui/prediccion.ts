import { h } from './dom'
import { interruptor, type Opcion } from './componentes'
import { asomar } from './hud'

const CLAVE = 'ws-preguntas'
/** Predicciones de la página: al apagar las preguntas, cada una salta la que tenga abierta. */
const abiertas = new Set<() => void>()

function leer(): boolean {
  try {
    return localStorage.getItem(CLAVE) !== 'no'
  } catch {
    return true
  }
}
/** En memoria: sin localStorage (bloqueado o modo privado) el modo libre igual vale en esta pestaña. */
let activas = leer()

/** "Predecí antes de correr" encendido (default) o apagado (modo libre). Se guarda en localStorage para todos los labs. */
export function preguntasActivas(): boolean {
  return activas
}

/** Interruptor "Preguntas: Sí/No" para la consola. Apagarlo salta la pregunta abierta y deja usar el lab sin predecir. */
export function interruptorPreguntas(): HTMLElement {
  const s = interruptor('Preguntas', activas, (si) => {
    activas = si
    try {
      localStorage.setItem(CLAVE, si ? 'si' : 'no')
    } catch {
      // sin localStorage: vale para esta pestaña (queda en memoria).
    }
    if (!si) abiertas.forEach((saltar) => saltar())
  })
  // Volver con "Atrás" (bfcache) o cambiarlo en otra pestaña: el interruptor sigue al valor guardado.
  const resincronizar = () => {
    activas = leer()
    s.set(activas)
  }
  window.addEventListener('pageshow', resincronizar)
  window.addEventListener('storage', (e) => e.key === CLAVE && resincronizar())
  return s.el
}

export interface OpcionesPrediccion<D, T extends string = string> {
  /**
   * Qué hace el lab cuando no se predice: botón "Saltar", apagar las preguntas con una abierta, o preguntar en modo libre.
   * Seguir corriendo, aplicar el cambio pendiente… Recibe los datos de la pregunta.
   */
  saltar?: (datos: D | null) => void
  /** Si se da, la tarjeta muestra un botón con este texto que llama a `saltar` (función: según la pregunta; `null` = sin botón). */
  textoSaltar?: string | ((datos: D | null) => string | null)
  /** Si lo que se ve ya coincide con lo que se va a corregir (llegó al equilibrio, terminó el golpe…). Sin `listo`, en cuanto hay una predicción hecha. Ver `pred.revisar`. */
  listo?: (datos: D) => boolean
  /** Qué era lo correcto para la pregunta congelada en `datos`, y por qué (HTML). Ver `pred.revisar`. */
  resolver?: (datos: D) => { correcta: T; explicacion: string }
}

/**
 * Tarjeta "Predecí antes de correr": pregunta con 2-4 opciones. El usuario elige, la
 * simulación corre y al final `revelar` dice si acertó, con una explicación corta (HTML propio).
 * Flujo: preguntar → (alElegir) → revelar. `ocultar` la saca sin revelar.
 * `datos` guarda lo que el lab necesita para resolver (la pregunta y la config para la que se armó),
 * congelado al preguntar: el reveal no puede salir con una config distinta. Si la config cambia, el lab llama a `ocultar`.
 * Se guarda por referencia: el lab no debe mutar lo que pasa (reemplazar la config, no editarla).
 * Con las preguntas apagadas (`interruptorPreguntas`), `preguntar` no muestra nada, llama a `saltar` y devuelve `false`.
 * `revelarEn` deja el reveal en manos de la tarjeta: `ocultar` o una pregunta nueva lo cancelan.
 * Labs que revelan desde el loop: opciones `listo` y `resolver`, y `pred.revisar()` en el loop (`resolver` corre una sola vez, al revelar).
 */
export function prediccion<T extends string, D = undefined>(alElegir?: (v: T) => void, { saltar, textoSaltar, listo: criterio, resolver }: OpcionesPrediccion<D, T> = {}) {
  let elegida: T | null = null
  let respondida = false
  let datos: D | null = null
  let timer = 0
  const titulo = h('span', { class: 'etiqueta' }, 'Predecí antes de correr')
  const texto = h('p', { class: 'pregunta' })
  const opciones = h('div', { class: 'opciones' })
  const resultado = h('div', { class: 'resultado', 'aria-live': 'polite' })
  const botonSaltar = textoSaltar ? h('button', { type: 'button', class: 'boton saltar', onclick: () => saltarAhora() }) : null
  const el = h('div', { class: 'panel prediccion', hidden: true }, titulo, texto, opciones, ...(botonSaltar ? [botonSaltar] : []), resultado)

  function marcar(botones: HTMLButtonElement[], lista: Opcion<T>[], correcta: T | null) {
    botones.forEach((b, i) => {
      b.disabled = true
      b.classList.toggle('elegida', lista[i].valor === elegida)
      b.classList.toggle('correcta', lista[i].valor === correcta)
    })
  }

  let botones: HTMLButtonElement[] = []
  let lista: Opcion<T>[] = []

  const pendiente = () => !el.hidden && elegida === null && !respondida
  const enCurso = () => !el.hidden && elegida !== null && !respondida
  function ocultar() {
    window.clearTimeout(timer)
    elegida = null
    respondida = false
    datos = null
    el.hidden = true
  }
  /** Saltea la pregunta abierta: se oculta primero (el lab puede abrir otra) y el lab sigue con los datos que tenía. */
  function saltarAhora() {
    if (!pendiente()) return
    const d = datos
    ocultar()
    saltar?.(d)
  }
  function revelar(correcta: T, explicacion: string) {
    if (respondida || el.hidden) return
    window.clearTimeout(timer)
    respondida = true
    datos = null
    const acerto = elegida === correcta
    marcar(botones, lista, correcta)
    el.classList.add(elegida === null ? 'sin-respuesta' : acerto ? 'acierto' : 'error')
    const veredicto = elegida === null ? 'Sin predicción' : acerto ? '¡Acertaste!' : 'No era esa'
    resultado.innerHTML = `<p class="veredicto">${veredicto}</p><p>${explicacion}</p>`
    asomar(resultado)
  }
  const listoParaRevelar = () => enCurso() && (!criterio || criterio(datos as D))
  abiertas.add(saltarAhora)

  return {
    el,
    /** Muestra la pregunta y deja elegir de nuevo. Con las preguntas apagadas no muestra nada, llama a `saltar` y devuelve `false`. */
    preguntar(pregunta: string, opcionesNuevas: Opcion<T>[], ...[datosNuevos]: D extends undefined ? [] : [D]): boolean {
      ocultar()
      if (!activas) {
        saltar?.(datosNuevos ?? null)
        return false
      }
      datos = datosNuevos ?? null
      lista = opcionesNuevas
      texto.textContent = pregunta
      resultado.innerHTML = ''
      el.className = 'panel prediccion'
      botones = lista.map((o) =>
        h('button', { type: 'button', class: 'boton', onclick: () => {
          if (elegida !== null) return
          elegida = o.valor
          if (botonSaltar) botonSaltar.hidden = true
          marcar(botones, lista, null)
          resultado.innerHTML = '<p class="nota">Anotado. Mirá qué pasa…</p>'
          alElegir?.(o.valor)
        } }, o.texto),
      )
      opciones.replaceChildren(...botones)
      if (botonSaltar) {
        const t = typeof textoSaltar === 'function' ? textoSaltar(datos) : textoSaltar
        botonSaltar.textContent = t ?? ''
        botonSaltar.hidden = !t
      }
      el.hidden = false
      // Con la columna del HUD en scroll, la tarjeta puede quedar abajo, fuera de vista.
      asomar(el)
      return true
    },
    /** Programa el reveal: se cancela solo si la tarjeta se oculta o llega otra pregunta. */
    revelarEn(ms: number, fn: () => void) {
      window.clearTimeout(timer)
      timer = window.setTimeout(fn, ms)
    },
    /** Cierra la tarjeta diciendo si acertó. `explicacion` es HTML propio del lab. */
    revelar,
    /** Llamar desde el loop: con una predicción hecha y `listo`, revela con `resolver` (sin `resolver` no hace nada). */
    revisar() {
      if (!resolver || !listoParaRevelar()) return
      const r = resolver(datos as D)
      revelar(r.correcta, r.explicacion)
    },
    ocultar,
    /** Saltea la pregunta abierta, como el botón "Saltar". */
    saltar: saltarAhora,
    /** Lo que se pasó al preguntar; `null` si no hay pregunta abierta o el lab no usa datos (para el estado, `pendiente`/`enCurso`). */
    get datos() {
      return datos
    },
    /** Hay una pregunta esperando respuesta. */
    get pendiente() {
      return pendiente()
    },
    /** Hay una predicción hecha y todavía sin revelar. */
    get enCurso() {
      return enCurso()
    },
  }
}
