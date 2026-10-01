import { h } from './dom'

/**
 * Columna del HUD (`izq` o `der`). Si no entra en la ventana hace scroll, y una franja "más" al pie
 * avisa que hay contenido abajo. Los hijos que se agreguen después también se vigilan.
 */
export function hud(lado: 'izq' | 'der', ...hijos: HTMLElement[]): HTMLElement {
  const el = h('div', { class: `hud hud-${lado}` }, ...hijos)
  const revisar = () => el.classList.toggle('mas-abajo', el.scrollTop + el.clientHeight < el.scrollHeight - 2)
  const tamanos = new ResizeObserver(revisar)
  const vigilarHijos = () => {
    tamanos.observe(el)
    for (const hijo of el.children) tamanos.observe(hijo)
  }
  vigilarHijos()
  new MutationObserver(vigilarHijos).observe(el, { childList: true })
  el.addEventListener('scroll', revisar, { passive: true })
  return el
}
