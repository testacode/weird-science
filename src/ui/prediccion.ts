import { h } from './dom'
import { interruptor, type Opcion } from './componentes'

const CLAVE = 'ws-preguntas'
/** Predicciones vivas: al apagar las preguntas, cada una salta la que tenga abierta. */
const abiertas = new Set<() => void>()

/** "Predecí antes de correr" encendido (default) o apagado (modo libre). Se guarda en localStorage para todos los labs. */
export function preguntasActivas(): boolean {
  try {
    return localStorage.getItem(CLAVE) !== 'no'
  } catch {
    return true
  }
}

/** Interruptor "Preguntas: Sí/No" para la consola. Apagarlo salta la pregunta abierta y deja usar el lab sin predecir. */
export function interruptorPreguntas(): HTMLElement {
  return interruptor('Preguntas', preguntasActivas(), (si) => {
    try {
      localStorage.setItem(CLAVE, si ? 'si' : 'no')
    } catch {
      // sin localStorage (modo privado): vale para esta pestaña.
    }
    if (!si) abiertas.forEach((saltar) => saltar())
  }).el
}

export interface OpcionesPrediccion<D> {
  /** Qué hace el lab si se saltea la pregunta (botón o modo libre): seguir corriendo, aplicar el cambio pendiente… Lee `datos` antes de que se borren. */
  saltar?: () => void
  /** Si se da, la tarjeta muestra un botón con este texto que llama a `saltar` (función: según la pregunta; `null` = sin botón). */
  textoSaltar?: string | ((datos: D | null) => string | null)
}

/**
 * Tarjeta "Predecí antes de correr": pregunta con 2-4 opciones. El usuario elige, la
 * simulación corre y al final `revelar` dice si acertó, con una explicación corta (HTML propio).
 * Flujo: preguntar → (alElegir) → revelar. `ocultar` la saca sin revelar.
 * `datos` guarda lo que el lab necesita para resolver (la pregunta y la config para la que se armó),
 * congelado al preguntar: el reveal no puede salir con una config distinta. Si la config cambia, el lab llama a `ocultar`.
 * Se guarda por referencia: el lab no debe mutar lo que pasa (reemplazar la config, no editarla).
 * Con las preguntas apagadas (`interruptorPreguntas`), `preguntar` no muestra nada y devuelve `false`: el lab sigue de largo.
 * `revelarEn` deja el reveal en manos de la tarjeta: `ocultar` o una pregunta nueva lo cancelan.
 */
export function prediccion<T extends string, D = undefined>(alElegir?: (v: T) => void, { saltar, textoSaltar }: OpcionesPrediccion<D> = {}) {
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
  function ocultar() {
    window.clearTimeout(timer)
    elegida = null
    respondida = false
    datos = null
    el.hidden = true
  }
  /** Saltea la pregunta abierta: primero el lab (todavía ve `datos`), después se oculta. */
  function saltarAhora() {
    if (!pendiente()) return
    saltar?.()
    ocultar()
  }
  abiertas.add(saltarAhora)

  return {
    el,
    /** Muestra la pregunta y deja elegir de nuevo. Devuelve `false` (y no muestra nada) si las preguntas están apagadas. */
    preguntar(pregunta: string, opcionesNuevas: Opcion<T>[], ...[datosNuevos]: D extends undefined ? [] : [D]): boolean {
      ocultar()
      if (!preguntasActivas()) return false
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
      return true
    },
    /** Programa el reveal: se cancela solo si la tarjeta se oculta o llega otra pregunta. */
    revelarEn(ms: number, fn: () => void) {
      window.clearTimeout(timer)
      timer = window.setTimeout(fn, ms)
    },
    /** Cierra la tarjeta diciendo si acertó. `explicacion` es HTML propio del lab. */
    revelar(correcta: T, explicacion: string) {
      if (respondida || el.hidden) return
      window.clearTimeout(timer)
      respondida = true
      datos = null
      const acerto = elegida === correcta
      marcar(botones, lista, correcta)
      el.classList.add(elegida === null ? 'sin-respuesta' : acerto ? 'acierto' : 'error')
      const veredicto = elegida === null ? 'Sin predicción' : acerto ? '¡Acertaste!' : 'No era esa'
      resultado.innerHTML = `<p class="veredicto">${veredicto}</p><p>${explicacion}</p>`
    },
    ocultar,
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
      return !el.hidden && elegida !== null && !respondida
    },
  }
}
