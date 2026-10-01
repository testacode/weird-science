import { h } from './dom'

export interface OpcionesLinea {
  /** Texto chico de la cabecera ("Día del año · arrastralo"). */
  etiqueta: string
  /** El valor a la derecha de la cabecera: lo actualiza el lab. */
  valor: (string | Node)[]
  max: number
  paso: number
  aria: string
  alArrastrar: (v: number) => void
}

/**
 * Línea de tiempo arrastrable (va dentro de `.hud-linea`, abajo entre los dos HUD).
 * El lab agrega debajo sus marcas para saltar a fechas clave.
 */
export function lineaArrastrable({ etiqueta, valor, max, paso, aria, alArrastrar }: OpcionesLinea, ...debajo: HTMLElement[]) {
  const rango = h('input', { type: 'range', min: '0', max: String(max), step: String(paso), value: '0', 'aria-label': aria })
  let arrastrando = false
  rango.addEventListener('input', () => alArrastrar(Number(rango.value)))
  rango.addEventListener('pointerdown', () => (arrastrando = true))
  const soltar = () => (arrastrando = false)
  window.addEventListener('pointerup', soltar)
  window.addEventListener('pointercancel', soltar)
  rango.addEventListener('lostpointercapture', soltar)

  const el = h('div', { class: 'panel linea' },
    h('div', { class: 'linea-cabecera' }, h('span', { class: 'etiqueta' }, etiqueta), h('span', { class: 'linea-valor' }, ...valor)),
    rango,
    ...debajo,
  )
  return {
    el,
    /** Mueve el control sin pisar el arrastre del usuario. */
    set(v: number) {
      if (!arrastrando) rango.value = String(v)
      rango.style.setProperty('--p', `${(v / max) * 100}%`)
    },
  }
}
