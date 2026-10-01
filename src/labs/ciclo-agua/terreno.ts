import * as THREE from 'three'
import { MEDIO_X, MEDIO_Z } from './constantes'

const NX = 96
const NZ = 24
const NIVELES = [1, 0.8, 0.45, 0]
/** Colores de los cortes del suelo, de arriba (humus) a abajo (roca). */
const CORTE = [0x3b2c20, 0x5a4636, 0x6e6256, 0x45494b].map((c) => new THREE.Color(c))
const ARENA = new THREE.Color(0x66624a)
const TIERRA = new THREE.Color(0x6b4f37)
const PASTO = new THREE.Color(0x4f8a3c)
const ROCA = new THREE.Color(0x7a746e)

const paso = THREE.MathUtils.smoothstep

/** Altura del terreno en (x, z): costa que sube del fondo del mar, llanura en pendiente suave y, con `m` = 1, una montaña. */
export function alturaTerreno(x: number, z: number, m: number): number {
  const base = 0.15 + 1.1 * paso(x, -2.4, -0.7) + 0.1 * Math.max(0, x + 0.7)
  const monte = 1.9 * m * Math.exp(-(((x - 1.9) / 1.15) ** 2)) * (0.9 + 0.1 * Math.cos(z * 1.3))
  return base + monte + (x > -0.8 ? 0.03 * Math.sin(x * 2.3 + z * 1.7) : 0)
}

/** Suelo de la maqueta: superficie con relieve, y un "corte" por los costados (el frente deja ver el subsuelo). */
export function crearTerreno(scene: THREE.Scene) {
  let m = 0
  let verde = 0
  let humedad = 0

  const plano = new THREE.PlaneGeometry(MEDIO_X * 2, MEDIO_Z * 2, NX, NZ).rotateX(-Math.PI / 2)
  const pos = plano.getAttribute('position')
  const colores = new Float32Array(pos.count * 3)
  plano.setAttribute('color', new THREE.BufferAttribute(colores, 3))
  const suelo = new THREE.Mesh(plano, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }))
  scene.add(suelo)

  // Costados: un anillo de puntos alrededor del suelo, con 4 niveles de color de arriba a abajo.
  const borde: [number, number][] = []
  for (let i = 0; i <= NX; i++) borde.push([-MEDIO_X + (i * 2 * MEDIO_X) / NX, MEDIO_Z])
  for (let k = 1; k <= NZ; k++) borde.push([MEDIO_X, MEDIO_Z - (k * 2 * MEDIO_Z) / NZ])
  for (let i = NX - 1; i >= 0; i--) borde.push([-MEDIO_X + (i * 2 * MEDIO_X) / NX, -MEDIO_Z])
  for (let k = NZ - 1; k >= 1; k--) borde.push([-MEDIO_X, -MEDIO_Z + (k * 2 * MEDIO_Z) / NZ])
  const costado = new THREE.BufferGeometry()
  const cPos = new Float32Array(borde.length * NIVELES.length * 3)
  const cCol = new Float32Array(borde.length * NIVELES.length * 3)
  const indices: number[] = []
  borde.forEach(([x, z], i) => {
    NIVELES.forEach((_, l) => {
      cPos.set([x, 0, z], (i * NIVELES.length + l) * 3)
      CORTE[l].toArray(cCol, (i * NIVELES.length + l) * 3)
    })
    const j = (i + 1) % borde.length
    for (let l = 0; l < NIVELES.length - 1; l++) {
      const a = i * NIVELES.length + l
      const b = j * NIVELES.length + l
      indices.push(a, a + 1, b, b, a + 1, b + 1)
    }
  })
  costado.setAttribute('position', new THREE.BufferAttribute(cPos, 3))
  costado.setAttribute('color', new THREE.BufferAttribute(cCol, 3))
  costado.setIndex(indices)
  scene.add(new THREE.Mesh(costado, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide })))

  const altura = (x: number, z: number) => alturaTerreno(x, z, m)

  function dibujarRelieve() {
    for (let i = 0; i < pos.count; i++) pos.setY(i, altura(pos.getX(i), pos.getZ(i)))
    pos.needsUpdate = true
    plano.computeVertexNormals()
    borde.forEach(([x, z], i) => {
      const h = altura(x, z)
      const ys = [h, Math.max(h - 0.28, h * 0.7), h * 0.4, 0]
      ys.forEach((y, l) => (cPos[(i * NIVELES.length + l) * 3 + 1] = y))
    })
    costado.getAttribute('position').needsUpdate = true
    costado.computeVertexNormals()
  }

  const c = new THREE.Color()
  function pintar() {
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const h = pos.getY(i)
      const pasto = verde * (1 - paso(h, 2.0, 2.7)) * paso(x, -1.2, -0.7)
      c.copy(TIERRA).lerp(PASTO, pasto * 0.85).lerp(ROCA, paso(h, 2.1, 2.9))
      c.lerp(ARENA, 1 - paso(h, 0.6, 1.3))
      c.multiplyScalar(1 - 0.3 * humedad)
      c.toArray(colores, i * 3)
    }
    plano.getAttribute('color').needsUpdate = true
  }

  dibujarRelieve()
  pintar()

  return {
    altura,
    /** `relieve` de 0 a 1; `pasto` (plantas) y `mojado` (suelo) de 0 a 1. Solo recalcula lo que cambió. */
    actualizar(relieve: number, pasto: number, mojado: number) {
      const cambioRelieve = Math.abs(relieve - m) > 1e-4
      const cambioColor = Math.abs(pasto - verde) > 0.02 || Math.abs(mojado - humedad) > 0.02
      if (cambioRelieve) {
        m = relieve
        dibujarRelieve()
      }
      if (cambioColor || cambioRelieve) {
        verde = pasto
        humedad = mojado
        pintar()
      }
    },
  }
}
