// HUD izquierdo: título, métricas, relato en vivo, gráfico y leyenda de partículas.
import { metrica } from '../../ui/componentes'
import { h } from '../../ui/dom'
import { numero } from '../../ui/formato'
import { grafico } from '../../ui/grafico'
import { hud } from '../../ui/hud'
import { GANCHO, relato } from './contenido'
import { CELULAS, conPared, type Entorno, type Lectura } from './model'

/** Cada cuántos segundos de pantalla se suma un punto al gráfico. */
export const MUESTREO_PANTALLA_S = 0.3

function estadoDe(ent: Entorno, l: Lectura): string {
  if (l.rota) return 'Estalló'
  // Con pared, la presión de turgencia es lo que distingue "turgente" de "normal" aunque el volumen casi no cambie.
  if (conPared(ent) && l.presion > 0.05) return 'Turgente'
  if (l.forma === 'hincha') return 'Hinchada'
  if (l.forma === 'achica') return ent.celula === 'globulo' ? 'Crenado' : conPared(ent) ? 'Plasmolizada' : 'Achicada'
  return 'Normal'
}

export function crearHud(lab: HTMLElement) {
  const gancho = h('p', { class: 'gancho' })
  gancho.innerHTML = GANCHO
  const mVolumen = metrica('Volumen')
  const mEstado = metrica('Estado')
  const mSolucion = metrica('Solución')
  const ahora = h('div', { class: 'panel ahora' })
  const curva = grafico(
    [{ id: 'dentro', nombre: 'Adentro', color: 'cielo' }, { id: 'fuera', nombre: 'Afuera', color: 'ambar' }],
    { titulo: 'Sal adentro y afuera', unidadX: ' s', unidadY: '%', alto: 120 },
  )
  const leyenda = h('div', { class: 'leyenda-particulas panel' },
    h('span', { class: 'c-cielo' }, '● Agua'), h('span', { class: 'c-ambar' }, '● Sal'), h('span', { class: 'c-magenta' }, '● Moléculas grandes'))
  lab.append(
    hud('izq',
      h('a', { href: '../../', class: 'etiqueta' }, '← Weird Science'),
      h('h1', { class: 'titulo' }, h('small', {}, 'Lab de la célula'), h('span', {}, 'Ósmosis')),
      gancho,
      h('div', { class: 'metricas' }, mVolumen.el, mEstado.el, mSolucion.el),
      ahora,
      curva.el,
      leyenda,
    ),
  )

  let relatoPrevio = ''
  return {
    reiniciarCurva(ent: Entorno) {
      curva.limpiar({ yMax: Math.max(ent.pct, CELULAS[ent.celula].pctIso) })
    },
    muestrear(t: number, ent: Entorno, l: Lectura) {
      curva.agregar(t, { dentro: l.pctDentro, fuera: ent.pct })
    },
    actualizar(ent: Entorno, l: Lectura) {
      mVolumen.set(numero(l.v, 2), '×')
      mEstado.set(estadoDe(ent, l))
      mSolucion.set(!ent.selectiva ? 'Hipo (la sal pasa)' : { hipo: 'Hipotónica', iso: 'Isotónica', hiper: 'Hipertónica' }[l.tonicidad])
      const texto = relato(ent, l)
      if (texto !== relatoPrevio) ahora.innerHTML = relatoPrevio = texto
    },
  }
}
