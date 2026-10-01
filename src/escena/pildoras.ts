import * as THREE from 'three'

/** Distancia mínima (px) entre una pastilla y el borde de la pantalla. */
const MARGEN = 6
/** Hasta cuántos px fuera de la pantalla puede estar el punto anclado y la pastilla sigue visible (pegada al borde). */
const TOLERANCIA = 80

export interface OpcionesPildora {
  clase?: string
  ancla?: THREE.Vector3
  /** Corrimiento en px desde el punto proyectado. */
  dx?: number
  dy?: number
  /** `centro`: centrada en el punto. `izquierda`: el borde izquierdo en el punto (rótulo al costado). */
  origen?: 'centro' | 'izquierda'
  /** Varias líneas, una por hijo (`el.replaceChildren(...)`). */
  multilinea?: boolean
}

export interface Pildora {
  el: HTMLDivElement
  /** Punto 3D que sigue. Se puede mover (`ancla.copy(...)`) antes de `ubicar()`. */
  ancla: THREE.Vector3
  dx: number
  dy: number
  texto: (t: string) => void
}

/**
 * Pastillas HTML (`.pildora`) ancladas a puntos de la maqueta. `ubicar()` las proyecta con la cámara y
 * las mantiene dentro de la pantalla. Si el punto queda lejos de la pantalla (o detrás de la cámara), se ocultan.
 */
export function crearPildoras(contenedor: HTMLElement, camera: THREE.Camera) {
  const lista: (Pildora & { origen: 'centro' | 'izquierda' })[] = []
  const proyectado = new THREE.Vector3()
  return {
    crear(texto = '', { clase = '', ancla = new THREE.Vector3(), dx = 0, dy = 0, origen = 'centro', multilinea = false }: OpcionesPildora = {}): Pildora {
      const el = document.createElement('div')
      el.className = ['pildora', multilinea && 'multilinea', clase].filter(Boolean).join(' ')
      el.textContent = texto
      contenedor.append(el)
      const p = { el, ancla, dx, dy, origen, texto: (t: string) => (el.textContent = t) }
      lista.push(p)
      return p
    },
    /** Llamar en cada cuadro, después de mover la cámara y las anclas. */
    ubicar() {
      const ancho = contenedor.clientWidth
      const alto = contenedor.clientHeight
      // Primero todas las lecturas de tamaño y después todas las escrituras: una sola pasada de layout.
      const medidas = lista.map((p) => [p.el.offsetWidth, p.el.offsetHeight])
      lista.forEach((p, i) => {
        const [w, h] = medidas[i]
        if (!w) return
        proyectado.copy(p.ancla).project(camera)
        const x = (proyectado.x * 0.5 + 0.5) * ancho
        const y = (-proyectado.y * 0.5 + 0.5) * alto
        const afuera = proyectado.z > 1 || x < -TOLERANCIA || x > ancho + TOLERANCIA || y < -TOLERANCIA || y > alto + TOLERANCIA
        p.el.style.visibility = afuera ? 'hidden' : ''
        if (afuera) return
        const izq = p.origen === 'izquierda' ? x + p.dx : x + p.dx - w / 2
        const arriba = y + p.dy - h / 2
        p.el.style.left = `${THREE.MathUtils.clamp(izq, MARGEN, ancho - w - MARGEN)}px`
        p.el.style.top = `${THREE.MathUtils.clamp(arriba, MARGEN, alto - h - MARGEN)}px`
      })
    },
  }
}
