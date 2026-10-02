import './ui/kit.css'
import './inicio.css'
import { EJES, LABS, TEMAS, type Eje, type Lab, type Tema } from './labs'
import { segmentado } from './ui/componentes'
import { h } from './ui/dom'

// Posters de `scripts/posters.sh`: solo se piden los que existen (un lab nuevo sin poster queda con texto).
const POSTERS = import.meta.glob<string>('./posters/*.webp', { eager: true, import: 'default' })

const raiz = document.querySelector<HTMLElement>('#inicio')!
const catalogo = h('div', { class: 'catalogo' })

function tarjeta(lab: Lab) {
  const src = lab.listo && POSTERS[`./posters/${lab.slug}.webp`]
  const poster = src && h('img', { class: 'poster', src, alt: '', loading: 'lazy', width: '640', height: '360' })
  const contenido = [
    poster,
    h('span', { class: 'etiqueta' }, lab.nap),
    h('h3', {}, lab.titulo),
    h('p', {}, lab.bajada),
    !lab.listo && h('span', { class: 'pronto' }, 'Próximamente'),
  ]
  return lab.listo
    ? h('a', { class: 'panel tarjeta', href: `labs/${lab.slug}/` }, ...contenido)
    : h('div', { class: 'panel tarjeta apagada' }, ...contenido)
}

const seccion = (titulo: string, labs: Lab[]) =>
  h('section', { class: 'eje' }, h('h2', {}, titulo), h('div', { class: 'grilla' }, ...labs.map(tarjeta)))

/** Los ejes de los NAP (como en la escuela) o los recorridos transversales por tema (un lab puede estar en varios). */
type Vista = 'ejes' | 'temas'
const ejes = Object.keys(EJES) as Eje[]
/** Los labs en el orden de los ejes: así salen también dentro de cada tema. */
const porEje = ejes.flatMap((eje) => LABS.filter((l) => l.eje === eje))
const grupos = (vista: Vista): [string, Lab[]][] =>
  vista === 'ejes'
    ? ejes.map((eje) => [EJES[eje], porEje.filter((l) => l.eje === eje)])
    : (Object.keys(TEMAS) as Tema[]).map((tema) => [TEMAS[tema], porEje.filter((l) => l.temas.includes(tema))])

let actual: Vista | null = null
function mostrar(vista: Vista) {
  if (vista === actual) return
  actual = vista
  catalogo.replaceChildren(...grupos(vista).filter(([, labs]) => labs.length).map(([titulo, labs]) => seccion(titulo, labs)))
}
// La vista va en el hash (#temas, para compartirla) y en localStorage (el link "← Weird Science" de los labs vuelve sin hash).
const CLAVE = 'ws-vista'
function vistaGuardada(): Vista {
  if (location.hash === '#temas') return 'temas'
  try {
    return localStorage.getItem(CLAVE) === 'temas' && !location.hash ? 'temas' : 'ejes'
  } catch {
    return 'ejes'
  }
}
const selector = segmentado<Vista>([{ valor: 'ejes', texto: 'Por eje (NAP)' }, { valor: 'temas', texto: 'Por tema' }], vistaGuardada(), (v) => {
  history.replaceState(history.state, '', `${location.pathname}${location.search}${v === 'temas' ? '#temas' : ''}`)
  try {
    localStorage.setItem(CLAVE, v)
  } catch {
    // sin localStorage: vale el hash
  }
  mostrar(v)
})
selector.el.classList.add('vistas')
selector.el.setAttribute('aria-label', 'Ordenar los labs')
window.addEventListener('hashchange', () => {
  const v = vistaGuardada()
  selector.set(v)
  mostrar(v)
})
mostrar(vistaGuardada())

raiz.append(
  h('header', { class: 'cabecera' },
    h('h1', { class: 'titulo' }, h('small', {}, 'Labs 3D de ciencias'), h('span', {}, 'Weird Science')),
    h('p', { class: 'gancho' }, 'Modelos que funcionan de verdad: tocá, rompé y mirá qué pasa. Ordenados según los Núcleos de Aprendizaje Prioritarios.'),
  ),
  selector.el,
  catalogo,
)
