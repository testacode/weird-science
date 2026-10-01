import { h } from './dom'

/**
 * Columna del HUD (`izq` o `der`). Si no entra en la ventana hace scroll, y una franja "más" al pie
 * avisa que hay contenido abajo. Los hijos que se agreguen después también se vigilan.
 */
export function hud(lado: 'izq' | 'der', ...hijos: HTMLElement[]): HTMLElement {
  const el = h('div', { class: `hud hud-${lado}` }, ...hijos)
  const revisar = () => el.classList.toggle('mas-abajo', el.scrollTop + el.clientHeight < el.scrollHeight - 2)
  const tamanos = new ResizeObserver(revisar)
  tamanos.observe(el)
  for (const hijo of el.children) tamanos.observe(hijo)
  // Los paneles que se sacan dejan de vigilarse (si no, el observer los retiene en memoria).
  new MutationObserver((cambios) => {
    for (const c of cambios) {
      c.removedNodes.forEach((n) => n instanceof Element && tamanos.unobserve(n))
      c.addedNodes.forEach((n) => n instanceof Element && tamanos.observe(n))
    }
    revisar()
  }).observe(el, { childList: true })
  el.addEventListener('scroll', revisar, { passive: true })
  return el
}
