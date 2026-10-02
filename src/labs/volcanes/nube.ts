// Partículas con tamaño y color propios (puntos con sprite suave). Una `Nube` simula su pool a mano:
// el dueño de cada tipo de partícula decide cómo se mueve en `mover`.
import * as THREE from 'three'

export interface Particula {
  x: number; y: number; z: number
  vx: number; vy: number
  edad: number; vida: number
  tam: number
  r: number; g: number; b: number; a: number
  /** Qué clase de partícula es (lo interpreta el dueño). */
  tipo: number
  /** Parámetros libres del tipo (posición a lo largo de un camino, lado, etc.). */
  u: number; v: number
}

const nueva = (): Particula => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, edad: 0, vida: 0, tam: 0, r: 1, g: 1, b: 1, a: 1, tipo: 0, u: 0, v: 0 })

function sprite(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  const ctx = c.getContext('2d')!
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

const VERTEX = `
attribute float aTam; attribute vec4 aColor; uniform float escala; varying vec4 vColor;
void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aTam * escala / -mv.z;
  gl_Position = projectionMatrix * mv;
}`
const FRAGMENT = `
uniform sampler2D mapa; varying vec4 vColor;
void main() { gl_FragColor = vec4(vColor.rgb, vColor.a * texture2D(mapa, gl_PointCoord).a); }`

/** `aditiva`: suma luz (brasas, lava, magma; el bloom las hace brillar). Sin ella, mezcla normal (humo y ceniza). */
export function crearNube(scene: THREE.Scene, max: number, aditiva: boolean) {
  const pool = Array.from({ length: max }, nueva)
  const posiciones = new Float32Array(max * 3)
  const colores = new Float32Array(max * 4)
  const tamanos = new Float32Array(max)
  const geometria = new THREE.BufferGeometry()
  geometria.setAttribute('position', new THREE.BufferAttribute(posiciones, 3))
  geometria.setAttribute('aColor', new THREE.BufferAttribute(colores, 4))
  geometria.setAttribute('aTam', new THREE.BufferAttribute(tamanos, 1))
  const material = new THREE.ShaderMaterial({
    uniforms: { mapa: { value: sprite() }, escala: { value: 800 } },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: aditiva ? THREE.AdditiveBlending : THREE.NormalBlending,
  })
  const puntos = new THREE.Points(geometria, material)
  puntos.frustumCulled = false
  puntos.renderOrder = aditiva ? 3 : 2
  scene.add(puntos)
  let cursor = 0

  return {
    /** Una partícula nueva (o `null` si el pool está lleno). Los campos que no se pasan quedan en blanco. */
    emitir(datos: Partial<Particula>): Particula | null {
      for (let k = 0; k < max; k++) {
        const p = pool[(cursor + k) % max]
        if (p.edad < p.vida) continue
        cursor = (cursor + k + 1) % max
        Object.assign(p, nueva(), datos)
        return p
      }
      return null
    },
    /** Avanza todas las vivas con `mover` y vuelca el resultado a la GPU. */
    paso(dt: number, mover: (p: Particula, dt: number) => void) {
      pool.forEach((p, i) => {
        const viva = p.edad < p.vida
        if (viva) {
          p.edad += dt
          if (p.edad < p.vida) mover(p, dt)
        }
        const ok = viva && p.edad < p.vida
        posiciones[i * 3] = p.x
        posiciones[i * 3 + 1] = p.y
        posiciones[i * 3 + 2] = p.z
        colores[i * 4] = p.r
        colores[i * 4 + 1] = p.g
        colores[i * 4 + 2] = p.b
        colores[i * 4 + 3] = ok ? p.a : 0
        tamanos[i] = ok ? p.tam : 0
      })
      geometria.attributes.position.needsUpdate = true
      geometria.attributes.aColor.needsUpdate = true
      geometria.attributes.aTam.needsUpdate = true
    },
    /** Píxeles por unidad a distancia 1, para que el tamaño sea en unidades de la escena (se recalcula al cambiar el tamaño). */
    escala(valor: number) {
      material.uniforms.escala.value = valor
    },
    limpiar() {
      pool.forEach((p) => (p.edad = p.vida))
    },
  }
}
export type Nube = ReturnType<typeof crearNube>

/** Rampa 0 → 1 entre a y b. */
export const rampa = (v: number, a: number, b: number) => THREE.MathUtils.smoothstep(v, a, b)
