import type * as THREE from 'three'

export interface Hueco {
  ancho: number
  alto: number
  /** Px que ocupa el HUD izquierdo desde el borde (margen incluido); 0 si no hay. */
  izq: number
  der: number
  /** Ancho libre entre los dos HUD. */
  libre: number
}

/** Px desde el borde que tapa un HUD lateral. Un HUD más ancho que media pantalla no es lateral (va abajo). */
function lateral(contenedor: HTMLElement, selector: string, lado: 'izq' | 'der'): number {
  const el = contenedor.querySelector<HTMLElement>(selector)
  if (!el) return 0
  const r = el.getBoundingClientRect()
  const caja = contenedor.getBoundingClientRect()
  if (!r.width || r.width > caja.width / 2) return 0
  return lado === 'izq' ? r.right - caja.left : caja.right - r.left
}

/**
 * Centra la maqueta en el hueco libre entre `.hud-izq` y `.hud-der` con `camera.setViewOffset`, según
 * el ancho real de los HUD. Se reaplica al cambiar la ventana o el ancho de un HUD (también cuando
 * aparecen después de crear la escena). `alEncuadrar` recibe el hueco para ajustar la distancia de la
 * cámara; no se llama si solo cambió el alto de un HUD, así no pisa el zoom del usuario.
 */
export function encuadrarEntreHuds(camera: THREE.PerspectiveCamera, contenedor: HTMLElement, alEncuadrar?: (hueco: Hueco) => void) {
  let previo = ''
  function aplicar() {
    const ancho = contenedor.clientWidth
    const alto = contenedor.clientHeight
    const izq = lateral(contenedor, '.hud-izq', 'izq')
    const der = lateral(contenedor, '.hud-der', 'der')
    const clave = `${ancho}x${alto}:${izq}:${der}`
    if (clave === previo) return
    previo = clave
    camera.setViewOffset(ancho, alto, -(izq - der) / 2, 0, ancho, alto)
    alEncuadrar?.({ ancho, alto, izq, der, libre: Math.max(ancho - izq - der, 0) })
  }
  const tamanos = new ResizeObserver(aplicar)
  const vigilar = () => {
    tamanos.observe(contenedor)
    contenedor.querySelectorAll('.hud-izq, .hud-der').forEach((el) => tamanos.observe(el))
  }
  vigilar()
  new MutationObserver(vigilar).observe(contenedor, { childList: true })
  aplicar()
}
