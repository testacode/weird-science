// pH de cada tramo -> color del vidrio, y la leyenda con la escala.
import * as THREE from 'three'
import { h } from '../../ui/dom'

const PH_MIN = 1
const PH_MAX = 9
/** Rojo ácido, ámbar, neutro verdoso y azul básico. */
const PARADAS: [number, string][] = [[1, '#ff3b2f'], [3, '#ff9a2e'], [5, '#f2d86b'], [7, '#9dffc6'], [9, '#5aa6ff']]
const colores = PARADAS.map(([, hex]) => new THREE.Color(hex))

export function colorPh(ph: number, destino = new THREE.Color()): THREE.Color {
  const x = Math.min(Math.max(ph, PH_MIN), PH_MAX)
  // Tramo [j, j+1] que contiene a x (el último incluye el extremo superior).
  const siguiente = PARADAS.findIndex(([p]) => p > x)
  const j = siguiente === -1 ? PARADAS.length - 2 : Math.max(siguiente - 1, 0)
  const t = (x - PARADAS[j][0]) / (PARADAS[j + 1][0] - PARADAS[j][0])
  return destino.copy(colores[j]).lerp(colores[j + 1], t)
}

const porcentaje = (ph: number) => `${((ph - PH_MIN) / (PH_MAX - PH_MIN)) * 100}%`

/** Escala de pH como leyenda del vidrio, marcada como info avanzada. `set` mueve el indicador al pH actual. */
export function leyendaPh() {
  const barra = h('div', { class: 'ph-barra' })
  barra.style.background = `linear-gradient(90deg, ${PARADAS.map(([p, hex]) => `${hex} ${porcentaje(p)}`).join(', ')})`
  const marca = h('i', { class: 'ph-marca' })
  barra.append(marca)
  const el = h('div', { class: 'panel ph-leyenda avanzado' },
    h('span', { class: 'etiqueta' }, 'Escala de pH · color del vidrio'),
    barra,
    h('div', { class: 'ph-ticks' }, h('span', {}, '1 ácido'), h('span', {}, '7 neutro'), h('span', {}, '9 básico')),
  )
  return {
    el,
    set(ph: number) {
      marca.style.left = porcentaje(Math.min(Math.max(ph, PH_MIN), PH_MAX))
    },
  }
}
