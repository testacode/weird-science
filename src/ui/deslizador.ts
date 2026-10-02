import { h } from './dom'

export interface OpcionesDeslizador {
  titulo: string
  min: number
  max: number
  paso: number
  valor: number
  /** Texto del valor a la derecha del título. Sin `formato`, el número tal cual. */
  formato?: (v: number) => string
  /** Nota chica al lado del valor (HTML propio del lab). */
  nota?: (v: number) => string
  /** Color de acento de la pista y la perilla (cualquier color CSS). Sin valor, el lima del kit. */
  color?: string
  /** Clase extra para estilos propios del lab. */
  clase?: string
  alCambiar: (v: number) => void
}

/**
 * Deslizador con título, valor vivo y nota opcional. `set` lo mueve sin disparar `alCambiar`.
 * `rango` cambia los límites y el paso (y reubica el valor); `rotulo`, el título.
 */
export function deslizador(o: OpcionesDeslizador) {
  const formato = o.formato ?? String
  let { min, max } = o
  const titulo = h('span', { class: 'etiqueta' }, o.titulo)
  const lectura = h('b')
  const nota = h('small')
  const input = h('input', {
    type: 'range', min: String(o.min), max: String(o.max), step: String(o.paso), value: String(o.valor), 'aria-label': o.titulo,
    onInput: () => {
      const v = Number(input.value)
      pintar(v)
      o.alCambiar(v)
    },
  })
  function pintar(v: number) {
    lectura.textContent = formato(v)
    if (o.nota) nota.innerHTML = o.nota(v)
    input.style.setProperty('--p', `${((v - min) / (max - min)) * 100}%`)
  }
  const el = h('div', { class: `deslizador ${o.clase ?? ''}`.trim() },
    h('div', { class: 'cabeza' }, titulo, h('span', {}, lectura, o.nota && nota)),
    input,
  )
  if (o.color) el.style.setProperty('--acento', o.color)
  pintar(o.valor)
  return {
    el,
    input,
    set(v: number) {
      input.value = String(v)
      // Lo que quedó en el input (el navegador lo ajusta al rango y al paso).
      pintar(Number(input.value))
    },
    rango(nuevoMin: number, nuevoMax: number, paso: number) {
      min = nuevoMin
      max = nuevoMax
      Object.assign(input, { min: String(min), max: String(max), step: String(paso) })
      pintar(Number(input.value))
    },
    rotulo(t: string) {
      titulo.textContent = t
      input.setAttribute('aria-label', t)
    },
  }
}
