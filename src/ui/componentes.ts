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
  const set = (v: T) => botones.forEach((b, i) => b.setAttribute('aria-pressed', String(opciones[i].valor === v)))
  const elegir = (v: T) => {
    set(v)
    alElegir(v)
  }
  return { el: h('div', { class: 'segmentado', role: 'group' }, ...botones), set }
}

export function grupo(titulo: string, contenido: HTMLElement): HTMLElement {
  return h('div', { class: 'grupo' }, h('span', { class: 'etiqueta' }, titulo), contenido)
}

/** Tarjeta de métrica con valor actualizable. */
export function metrica(nombre: string): { el: HTMLElement; set: (valor: string, unidad?: string) => void } {
  const valor = h('b')
  const el = h('div', { class: 'panel metrica' }, h('span', { class: 'etiqueta' }, nombre), valor)
  return {
    el,
    set: (v, unidad = '') => {
      valor.innerHTML = unidad ? `${v}<small>${unidad}</small>` : v
    },
  }
}

/** Modal nativo (<dialog>) con contenido HTML reemplazable. */
export function modal(): { el: HTMLDialogElement; abrir: (html: string) => void } {
  const cuerpo = h('div', { class: 'panel' })
  const el = h('dialog', { class: 'modal', onclick: (e: Event) => e.target === el && el.close() }, cuerpo)
  return {
    el,
    abrir: (html) => {
      cuerpo.innerHTML = `${html}<p><button class="boton" type="button">Cerrar</button></p>`
      cuerpo.querySelector('button:last-of-type')?.addEventListener('click', () => el.close())
      el.showModal()
    },
  }
}
