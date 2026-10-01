import { h } from './dom'

export interface Opcion<T extends string> {
  valor: T
  texto: string
}

/** Botonera segmentada: una opción activa a la vez. */
export function segmentado<T extends string>(
  opciones: Opcion<T>[],
  inicial: T,
  alElegir: (v: T) => void,
): { el: HTMLElement; set: (v: T) => void } {
  const botones = opciones.map((o) =>
    h('button', { type: 'button', 'aria-pressed': String(o.valor === inicial), onclick: () => elegir(o.valor) }, o.texto),
  )
  let actual = inicial
  const set = (v: T) => {
    actual = v
    botones.forEach((b, i) => b.setAttribute('aria-pressed', String(opciones[i].valor === v)))
  }
  // Volver a tocar la opción ya elegida no es un cambio: no avisa (si no, los labs reinician o descartan preguntas).
  const elegir = (v: T) => {
    if (v === actual) return
    set(v)
    alElegir(v)
  }
  return { el: h('div', { class: 'segmentado', role: 'group' }, ...botones), set }
}

/** Fila de la consola: texto a la izquierda y un control a la derecha. */
export function fila(texto: string, control: HTMLElement, clases = ''): HTMLElement {
  return h('div', { class: `interruptor ${clases}`.trim() }, h('span', {}, texto), control)
}

/** Interruptor Sí/No con su texto. */
export function interruptor(texto: string, activo: boolean, alElegir: (si: boolean) => void, clases = '') {
  const s = segmentado([{ valor: 'si', texto: 'Sí' }, { valor: 'no', texto: 'No' }], activo ? 'si' : 'no', (v) => alElegir(v === 'si'))
  return { el: fila(texto, s.el, clases), set: (si: boolean) => s.set(si ? 'si' : 'no') }
}

export function grupo(titulo: string, contenido: HTMLElement): HTMLElement {
  return h('div', { class: 'grupo' }, h('span', { class: 'etiqueta' }, titulo), contenido)
}

/** Tamaño mínimo (px) al que se achica el valor de una métrica antes de pasar a dos líneas. */
const MIN_VALOR = 12

/** Achica el valor si no entra en la tarjeta ("Gibosa creciente"); si ni así entra, lo parte en dos líneas. */
function ajustar(valor: HTMLElement) {
  valor.style.fontSize = ''
  valor.classList.remove('dos-lineas')
  if (valor.scrollWidth <= valor.clientWidth) return
  const base = parseFloat(getComputedStyle(valor).fontSize)
  valor.style.fontSize = `${Math.max(MIN_VALOR, Math.floor((base * valor.clientWidth) / valor.scrollWidth))}px`
  if (valor.scrollWidth > valor.clientWidth) valor.classList.add('dos-lineas')
}

/** Tarjeta de métrica con valor actualizable. Un valor largo se achica para no desbordar. */
export function metrica(nombre: string): { el: HTMLElement; set: (valor: string, unidad?: string) => void } {
  const valor = h('b')
  const el = h('div', { class: 'panel metrica' }, h('span', { class: 'etiqueta' }, nombre), valor)
  // La fuente es monoespaciada: si el largo del texto no cambió, el ancho tampoco (no hace falta medir).
  let largo = -1
  return {
    el,
    set: (v, unidad = '') => {
      valor.innerHTML = unidad ? `${v}<small>${unidad}</small>` : v
      const nuevo = valor.textContent?.length ?? 0
      if (nuevo === largo || !valor.clientWidth) return
      largo = nuevo
      ajustar(valor)
    },
  }
}

/** Modal nativo (<dialog>) con contenido HTML reemplazable. */
export function modal() {
  const cuerpo = h('div', { class: 'panel' })
  const el = h('dialog', { class: 'modal', onclick: (e: Event) => e.target === el && el.close() }, cuerpo)
  return {
    el,
    abrir(html: string) {
      cuerpo.innerHTML = `${html}<p><button class="boton" type="button">Cerrar</button></p>`
      cuerpo.querySelector('button:last-of-type')?.addEventListener('click', () => el.close())
      el.showModal()
    },
    cerrar: () => el.close(),
    get abierto() {
      return el.open
    },
  }
}
