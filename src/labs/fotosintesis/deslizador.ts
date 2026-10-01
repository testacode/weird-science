import { h } from '../../ui/dom'

/** Deslizador con título, valor vivo y una nota opcional (HTML propio). */
export function deslizador(opciones: {
  titulo: string
  clase: string
  min: number
  max: number
  paso: number
  valor: number
  formato: (v: number) => string
  nota?: (v: number) => string
  alCambiar: (v: number) => void
}) {
  const { titulo, clase, min, max, paso, valor, formato, nota, alCambiar } = opciones
  const lectura = h('b')
  const sub = h('small')
  const input = h('input', {
    type: 'range', min: String(min), max: String(max), step: String(paso), value: String(valor), 'aria-label': titulo,
    onInput: () => {
      const v = Number(input.value)
      pintar(v)
      alCambiar(v)
    },
  })
  function pintar(v: number) {
    lectura.textContent = formato(v)
    if (nota) sub.innerHTML = nota(v)
  }
  pintar(valor)
  const el = h('div', { class: `desliz ${clase}` }, h('div', { class: 'cabeza' }, h('span', { class: 'etiqueta' }, titulo), h('span', {}, lectura, nota && sub)), input)
  return { el, set: (v: number) => { input.value = String(v); pintar(v) } }
}
