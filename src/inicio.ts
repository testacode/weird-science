import './ui/kit.css'
import './inicio.css'
import { EJES, LABS, type Eje } from './labs'
import { h } from './ui/dom'

const raiz = document.querySelector<HTMLElement>('#inicio')!
const catalogo = h('div', { class: 'catalogo' })

function tarjeta(lab: (typeof LABS)[number]) {
  const contenido = [
    h('span', { class: 'etiqueta' }, lab.nap),
    h('h3', {}, lab.titulo),
    h('p', {}, lab.bajada),
    !lab.listo && h('span', { class: 'pronto' }, 'Próximamente'),
  ]
  return lab.listo
    ? h('a', { class: 'panel tarjeta', href: `labs/${lab.slug}/` }, ...contenido)
    : h('div', { class: 'panel tarjeta apagada' }, ...contenido)
}

catalogo.append(
  ...(Object.keys(EJES) as Eje[]).map((eje) =>
    h('section', { class: 'eje' },
      h('h2', {}, EJES[eje]),
      h('div', { class: 'grilla' }, ...LABS.filter((l) => l.eje === eje).map(tarjeta)),
    ),
  ),
)

raiz.append(
  h('header', { class: 'cabecera' },
    h('h1', { class: 'titulo' }, h('small', {}, 'Labs 3D de ciencias'), h('span', {}, 'Weird Science')),
    h('p', { class: 'gancho' }, 'Modelos que funcionan de verdad: tocá, rompé y mirá qué pasa. Ordenados según los Núcleos de Aprendizaje Prioritarios.'),
  ),
  catalogo,
)
