// Rótulos HTML que siguen a la escena: etiquetas de órganos y píldoras de enzima activa.
import * as THREE from 'three'
import { crearPildoras } from '../../escena/pildoras'
import { h } from '../../ui/dom'
import { enzimasActivas } from './enzimas'
import type { Config } from './model'

export interface Etiqueta {
  texto: string
  ancla: THREE.Vector3
  /** Desplazamiento de la vista explotada del órgano al que pertenece. */
  desp: THREE.Vector3
}

const CLASE_MACRO = { carbos: 'c-ambar', proteinas: 'c-magenta', grasas: 'c-cielo' }
/** Separación vertical (px) entre las píldoras de enzima de bocados distintos. */
const SEPARACION_ENZIMAS = 58

export function crearRotulos(contenedor: HTMLElement, camera: THREE.Camera, etiquetas: Etiqueta[], bocados: number) {
  const pildoras = crearPildoras(contenedor, camera)
  const rotulos = etiquetas.map((e) => ({ ...e, p: pildoras.crear(e.texto) }))

  // Una píldora de enzima por bocado, marcada como info avanzada, al costado del bocado.
  const enzimas = Array.from({ length: bocados }, (_, i) => {
    const p = pildoras.crear('', { clase: 'enzima avanzado', multilinea: true, origen: 'izquierda', dx: 22, dy: -i * SEPARACION_ENZIMAS })
    p.el.hidden = true
    return { p, clave: '' }
  })

  return {
    /** `activas`: índices de etiquetas que se resaltan. */
    etiquetas(activas: Set<number>, f: number) {
      rotulos.forEach(({ p, ancla, desp }, i) => {
        p.ancla.copy(ancla).addScaledVector(desp, f)
        p.el.classList.toggle('activa', activas.has(i))
      })
    },
    /** `bolos[i]`: dónde está el bocado i y en qué tramo, o `null` si no corresponde mostrarlo. */
    enzimas(bolos: ({ punto: THREE.Vector3; segmento: number } | null)[], config: Config) {
      enzimas.forEach((slot, i) => {
        const bolo = bolos[i]
        const lista = bolo ? enzimasActivas(bolo.segmento, config) : []
        slot.p.el.hidden = !bolo || lista.length === 0
        if (slot.p.el.hidden || !bolo) return
        const clave = lista.map((e) => `${e.nombre}${e.frenada}`).join('|')
        if (clave !== slot.clave) {
          slot.clave = clave
          slot.p.el.replaceChildren(
            ...lista.map((e) => h('span', { class: CLASE_MACRO[e.macro] }, e.frenada ? `${e.nombre} (frenada)` : e.nombre)),
          )
        }
        slot.p.ancla.copy(bolo.punto)
      })
    },
    /** Proyecta todos los rótulos: va después de `etiquetas` y `enzimas`. */
    ubicar: pildoras.ubicar,
  }
}
