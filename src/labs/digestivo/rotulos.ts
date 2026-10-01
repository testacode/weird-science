// Rótulos HTML que siguen a la escena: etiquetas de órganos y píldoras de enzima activa.
import * as THREE from 'three'
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

export function crearRotulos(contenedor: HTMLElement, camera: THREE.Camera, etiquetas: Etiqueta[], bocados: number) {
  const proyectado = new THREE.Vector3()
  const base = new THREE.Vector3()
  function proyectar(p: THREE.Vector3) {
    proyectado.copy(p).project(camera)
    return { x: (proyectado.x * 0.5 + 0.5) * contenedor.clientWidth, y: (-proyectado.y * 0.5 + 0.5) * contenedor.clientHeight }
  }

  const pildoras = etiquetas.map((e) => ({ ...e, el: h('div', { class: 'pildora' }, e.texto) }))
  contenedor.append(...pildoras.map((p) => p.el))

  // Una píldora de enzima por bocado, marcada como info avanzada.
  const enzimas = Array.from({ length: bocados }, () => ({ el: h('div', { class: 'pildora enzima avanzado', hidden: true }), clave: '' }))
  contenedor.append(...enzimas.map((e) => e.el))

  return {
    /** `activas`: índices de etiquetas que se resaltan. */
    etiquetas(activas: Set<number>, f: number) {
      pildoras.forEach(({ el, ancla, desp }, i) => {
        const { x, y } = proyectar(base.copy(ancla).addScaledVector(desp, f))
        el.style.left = `${x}px`
        el.style.top = `${y}px`
        el.classList.toggle('activa', activas.has(i))
      })
    },
    /** `bolos[i]`: dónde está el bocado i y en qué tramo, o `null` si no corresponde mostrarlo. */
    enzimas(bolos: ({ punto: THREE.Vector3; segmento: number } | null)[], config: Config) {
      enzimas.forEach((slot, i) => {
        const bolo = bolos[i]
        const lista = bolo ? enzimasActivas(bolo.segmento, config) : []
        slot.el.hidden = !bolo || lista.length === 0
        if (slot.el.hidden || !bolo) return
        const clave = lista.map((e) => `${e.nombre}${e.frenada}`).join('|')
        if (clave !== slot.clave) {
          slot.clave = clave
          slot.el.replaceChildren(
            ...lista.map((e) => h('span', { class: CLASE_MACRO[e.macro] }, e.frenada ? `${e.nombre} (frenada)` : e.nombre)),
          )
        }
        const { x, y } = proyectar(bolo.punto)
        slot.el.style.left = `${x}px`
        slot.el.style.top = `${y - i * 58}px`
      })
    },
  }
}
