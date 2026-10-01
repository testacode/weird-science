import { h } from './dom'
import type { Opcion } from './componentes'

/**
 * Tarjeta "Predecí antes de correr": pregunta con 2-4 opciones. El usuario elige, la
 * simulación corre y al final `revelar` dice si acertó, con una explicación corta (HTML propio).
 * Flujo: preguntar → (alElegir) → revelar. `ocultar` la saca sin revelar.
 * `datos` guarda lo que el lab necesita para resolver (la pregunta y la config para la que se armó),
 * congelado al preguntar: el reveal no puede salir con una config distinta. Si la config cambia, el lab llama a `ocultar`.
 * Se guarda por referencia: el lab no debe mutar lo que pasa (reemplazar la config, no editarla).
 */
export function prediccion<T extends string, D = undefined>(alElegir?: (v: T) => void) {
  let elegida: T | null = null
  let respondida = false
  let datos: D | null = null
  const titulo = h('span', { class: 'etiqueta' }, 'Predecí antes de correr')
  const texto = h('p', { class: 'pregunta' })
  const opciones = h('div', { class: 'opciones' })
  const resultado = h('div', { class: 'resultado', 'aria-live': 'polite' })
  const el = h('div', { class: 'panel prediccion', hidden: true }, titulo, texto, opciones, resultado)

  function marcar(botones: HTMLButtonElement[], lista: Opcion<T>[], correcta: T | null) {
    botones.forEach((b, i) => {
      b.disabled = true
      b.classList.toggle('elegida', lista[i].valor === elegida)
      b.classList.toggle('correcta', lista[i].valor === correcta)
    })
  }

  let botones: HTMLButtonElement[] = []
  let lista: Opcion<T>[] = []

  return {
    el,
    /** Muestra la pregunta y deja elegir de nuevo. */
    preguntar(pregunta: string, opcionesNuevas: Opcion<T>[], ...[datosNuevos]: D extends undefined ? [] : [D]) {
      elegida = null
      respondida = false
      datos = datosNuevos ?? null
      lista = opcionesNuevas
      texto.textContent = pregunta
      resultado.innerHTML = ''
      el.className = 'panel prediccion'
      botones = lista.map((o) =>
        h('button', { type: 'button', class: 'boton', onclick: () => {
          if (elegida !== null) return
          elegida = o.valor
          marcar(botones, lista, null)
          resultado.innerHTML = '<p class="nota">Anotado. Mirá qué pasa…</p>'
          alElegir?.(o.valor)
        } }, o.texto),
      )
      opciones.replaceChildren(...botones)
      el.hidden = false
    },
    /** Cierra la tarjeta diciendo si acertó. `explicacion` es HTML propio del lab. */
    revelar(correcta: T, explicacion: string) {
      if (respondida || el.hidden) return
      respondida = true
      datos = null
      const acerto = elegida === correcta
      marcar(botones, lista, correcta)
      el.classList.add(elegida === null ? 'sin-respuesta' : acerto ? 'acierto' : 'error')
      const veredicto = elegida === null ? 'Sin predicción' : acerto ? '¡Acertaste!' : 'No era esa'
      resultado.innerHTML = `<p class="veredicto">${veredicto}</p><p>${explicacion}</p>`
    },
    ocultar() {
      elegida = null
      respondida = false
      datos = null
      el.hidden = true
    },
    /** Lo que se pasó al preguntar; `null` si no hay pregunta abierta o el lab no usa datos (para el estado, `pendiente`/`enCurso`). */
    get datos() {
      return datos
    },
    /** Hay una pregunta esperando respuesta. */
    get pendiente() {
      return !el.hidden && elegida === null && !respondida
    },
    /** Hay una predicción hecha y todavía sin revelar. */
    get enCurso() {
      return !el.hidden && elegida !== null && !respondida
    },
  }
}
