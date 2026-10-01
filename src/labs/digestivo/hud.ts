// HUD izquierdo: título, métricas, relato en vivo, gráfico y leyenda de pH.
import { h } from '../../ui/dom'
import { grafico } from '../../ui/grafico'
import { metrica } from '../../ui/componentes'
import { GANCHO, RELATO, relatoFinal, type Comida } from './contenido'
import { HORAS_TOTALES, KCAL_POR_GRAMO, MACROS, SEGMENTOS, kcalAbsorbidas, phSegmento, type Config, type Estado } from './model'

/** Cada cuántas horas simuladas se suma un punto al gráfico. */
const MUESTREO_HORAS = 0.05

function horas(hs: number) {
  const hh = Math.floor(hs)
  const mm = Math.round((hs - hh) * 60)
  return hh > 0 ? `${hh}<small>h</small> ${mm}` : `${mm}`
}

export function crearHud(lab: HTMLElement, extra: HTMLElement[] = []) {
  const gancho = h('p', { class: 'gancho' })
  gancho.innerHTML = GANCHO
  const mTiempo = metrica('Tiempo')
  const mEnergia = metrica('Energía')
  const mPh = metrica('pH')
  const mDigerido = metrica('Digerido')
  mPh.el.classList.add('avanzado')
  const ahora = h('div', { class: 'panel ahora' })
  const curva = grafico(
    [
      { id: 'carbos', nombre: 'Carbos', color: 'ambar' },
      { id: 'proteinas', nombre: 'Proteínas', color: 'magenta' },
      { id: 'grasas', nombre: 'Grasas', color: 'cielo' },
    ],
    { titulo: 'Gramos absorbidos', unidadX: ' h', unidadY: 'g' },
  )
  lab.append(
    h('div', { class: 'hud hud-izq' },
      h('a', { href: '../../', class: 'etiqueta' }, '← Weird Science'),
      h('h1', { class: 'titulo' }, h('small', {}, 'Lab del sistema digestivo'), h('span', {}, 'De la boca a la sangre')),
      gancho,
      h('div', { class: 'metricas' }, mTiempo.el, mEnergia.el, mPh.el, mDigerido.el),
      ahora,
      curva.el,
      ...extra,
    ),
  )

  let ultimoPunto = 0
  let relatoPrevio = ''
  return {
    /** Con varios bocados el último termina más tarde que `HORAS_TOTALES`: el eje X crece con los datos. */
    reiniciarCurva(comida: Comida, bocados: number) {
      curva.limpiar({ xMax: bocados === 1 ? HORAS_TOTALES : undefined, yMax: Math.max(...MACROS.map((m) => comida.gramos[m])) })
      curva.agregar(0, { carbos: 0, proteinas: 0, grasas: 0 })
      ultimoPunto = 0
    },
    /** Suma un punto al gráfico cuando pasó suficiente tiempo simulado (o al terminar). */
    muestrear(e: Estado) {
      if (e.horas - ultimoPunto < MUESTREO_HORAS && !(e.terminado && e.horas > ultimoPunto)) return
      const n = e.nutrientes
      curva.agregar(e.horas, { carbos: n.carbos.absorbido, proteinas: n.proteinas.absorbido, grasas: n.grasas.absorbido })
      ultimoPunto = e.horas
    },
    /** `e` es el estado agregado de todos los bocados. */
    actualizar(e: Estado, config: Config, comida: Comida) {
      const ph = phSegmento(e.segmento, config)
      mTiempo.set(horas(e.horas), 'min')
      mEnergia.set(kcalAbsorbidas(e.nutrientes).toFixed(0), 'kcal')
      mPh.set(ph.toFixed(1))
      const total = MACROS.reduce((s, m) => s + comida.gramos[m], 0)
      const roto = MACROS.reduce((s, m) => s + e.nutrientes[m].digerido + e.nutrientes[m].absorbido, 0)
      mDigerido.set(((roto / total) * 100).toFixed(0), '%')

      const kcalTotal = MACROS.reduce((t, m) => t + comida.gramos[m] * KCAL_POR_GRAMO[m], 0)
      const g = e.nutrientes.grasas
      const relato = e.terminado
        ? relatoFinal(kcalAbsorbidas(e.nutrientes), kcalTotal, g.intacto + g.digerido)
        : RELATO[SEGMENTOS[e.segmento].id](SEGMENTOS[e.segmento], e, config, ph)
      if (relato !== relatoPrevio) ahora.innerHTML = relatoPrevio = relato
    },
  }
}
