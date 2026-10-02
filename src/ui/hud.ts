import { h } from './dom'

/** Aire entre lo que se muestra y el borde de la columna (px). */
const MARGEN = 10

/**
 * Desplaza solo la columna del HUD (no la página) para que se vea `el`. Si ya se ve, no hace nada;
 * si es más alto que la columna, queda a la vista su comienzo.
 * Mide en el próximo cuadro (el lab ya terminó de mostrar u ocultar controles) y con las fuentes cargadas (al abrir el lab cambian los altos).
 */
export function asomar(el: HTMLElement) {
  void document.fonts.ready.then(() => requestAnimationFrame(() => {
    const columna = el.closest<HTMLElement>('.hud')
    if (!columna || el.hidden) return
    const c = columna.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    // Con scroll, la franja "más ↓" tapa el pie de la columna.
    const franja = columna.scrollHeight > columna.clientHeight ? parseFloat(getComputedStyle(columna).getPropertyValue('--franja')) || 0 : 0
    const arriba = c.top + MARGEN
    const abajo = c.bottom - franja - MARGEN
    if (r.top >= c.top && r.bottom <= c.bottom - franja) return
    let delta = r.top < c.top ? r.top - arriba : Math.min(r.bottom - abajo, r.top - arriba)
    // Cerca del fondo, ir hasta el final: ahí la franja desaparece y no hace falta reservarle lugar.
    const resto = columna.scrollHeight - columna.clientHeight - columna.scrollTop
    if (delta > 0 && resto - delta < franja) delta = resto
    const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches
    columna.scrollBy({ top: delta, behavior: sinMovimiento ? 'auto' : 'smooth' })
  }))
}

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
