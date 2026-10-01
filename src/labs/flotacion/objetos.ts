import * as THREE from 'three'
import { COLOR_OBJETO } from './constantes'
import { ORDEN_OBJETOS, dimensiones, type Config, type Estado, type IdObjeto } from './model'
import { ESCALA, mundoY } from './pecera'

// Cada objeto se modela de tamaño 1 × 1 × 1 centrado en el origen; `actualizar` lo escala a sus dimensiones reales.

const std = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra })

function conBordes(malla: THREE.Mesh, color: number): THREE.Group {
  const borde = new THREE.LineSegments(new THREE.EdgesGeometry(malla.geometry), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 }))
  const g = new THREE.Group()
  g.add(malla, borde)
  return g
}

/** Ruido determinista barato para que la piedra no sea una esfera perfecta. */
function irregular(geometria: THREE.BufferGeometry, fuerza: number) {
  const p = geometria.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    const n = Math.sin(v.x * 9.1 + v.y * 4.7) * Math.cos(v.z * 7.3 - v.y * 3.1)
    v.multiplyScalar(1 + n * fuerza)
    p.setXYZ(i, v.x, v.y, v.z)
  }
  geometria.computeVertexNormals()
  return geometria
}

/** Huevo: esfera con la punta de arriba más angosta. */
function huevo(geometria: THREE.BufferGeometry) {
  const p = geometria.attributes.position
  for (let i = 0; i < p.count; i++) {
    const k = 1 - 0.16 * p.getY(i)
    p.setXYZ(i, p.getX(i) * k, p.getY(i), p.getZ(i) * k)
  }
  geometria.computeVertexNormals()
  return geometria
}

/** Planta del casco (proa hacia +x) por fuera y por dentro; el alto es 1. */
const EXTERIOR: [number, number][] = [[-0.5, -0.5], [0.15, -0.5], [0.5, 0], [0.15, 0.5], [-0.5, 0.5]]
const INTERIOR: [number, number][] = [[-0.45, -0.45], [0.12, -0.45], [0.43, 0], [0.12, 0.45], [-0.45, 0.45]]
const vectores = (pts: [number, number][]) => pts.map(([x, y]) => new THREE.Vector2(x, y))

/** Casco de barquito: paredes y piso de acero, y la forma del líquido que entra (de la base hacia arriba). */
function casco() {
  const paredes = new THREE.Shape(vectores(EXTERIOR))
  paredes.holes.push(new THREE.Path(vectores([...INTERIOR].reverse())))
  // La planta está en el plano XY y se extruye en Z: se acuesta para que la extrusión suba.
  const extruir = (s: THREE.Shape, depth: number) => new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }).rotateX(-Math.PI / 2)
  const acero = std(COLOR_OBJETO.barco, { metalness: 0.85, roughness: 0.35, side: THREE.DoubleSide })
  const grupo = new THREE.Group()
  const muros = new THREE.Mesh(extruir(paredes, 1).translate(0, -0.5, 0), acero)
  const piso = new THREE.Mesh(extruir(new THREE.Shape(vectores(EXTERIOR)), 0.06).translate(0, -0.5, 0), acero)
  grupo.add(muros, piso)
  return { grupo, dentro: extruir(new THREE.Shape(vectores(INTERIOR)), 0.94) }
}

export function crearObjetos(scene: THREE.Scene) {
  const grupos = {} as Record<IdObjeto, THREE.Object3D>
  grupos.madera = conBordes(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), std(COLOR_OBJETO.madera, { roughness: 0.85 })), 0x6b4524)
  grupos.hielo = conBordes(
    new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), std(COLOR_OBJETO.hielo, { transparent: true, opacity: 0.75, roughness: 0.5, envMapIntensity: 0.25, depthWrite: false })),
    0xdff6ff,
  )
  grupos.hielo.children[0].renderOrder = 2
  grupos.plastico = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 40), new THREE.MeshPhysicalMaterial({ color: COLOR_OBJETO.plastico, roughness: 0.35, clearcoat: 0.6 }))
  grupos.piedra = new THREE.Mesh(irregular(new THREE.IcosahedronGeometry(0.5, 3), 0.07), std(COLOR_OBJETO.piedra, { roughness: 0.9, flatShading: true }))
  grupos.metal = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 48), std(COLOR_OBJETO.metal, { metalness: 0.9, roughness: 0.32, envMapIntensity: 0.6 }))
  grupos.huevo = new THREE.Mesh(huevo(new THREE.SphereGeometry(0.5, 40, 30)), std(COLOR_OBJETO.huevo, { roughness: 0.6, envMapIntensity: 0.5 }))

  // Barquito: casco hueco, líquido que entra y agujero (marcado en magenta, el color del peso que se agrega).
  const { grupo: barco, dentro } = casco()
  const liquidoDentro = new THREE.Mesh(dentro, new THREE.MeshBasicMaterial({ color: 0x4cb4e6, transparent: true, opacity: 0.55, depthWrite: false }))
  liquidoDentro.renderOrder = 2
  liquidoDentro.position.y = -0.44
  const agujero = new THREE.Group()
  const aro = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.075, 24), new THREE.MeshBasicMaterial({ color: 0xff5fa2, toneMapped: false, side: THREE.DoubleSide }))
  agujero.add(new THREE.Mesh(new THREE.CircleGeometry(0.05, 24), new THREE.MeshBasicMaterial({ color: 0x07100f })), aro)
  agujero.position.set(-0.05, -0.34, 0.508)
  agujero.scale.y = 1 / 0.55
  barco.add(liquidoDentro, agujero)
  grupos.barco = barco

  for (const id of ORDEN_OBJETOS) {
    grupos[id].visible = false
    scene.add(grupos[id])
  }
  const color = new THREE.Color()

  return {
    actualizar(c: Config, e: Estado, colorLiquido: THREE.Color) {
      const dim = dimensiones(c)
      for (const id of ORDEN_OBJETOS) grupos[id].visible = id === c.objeto
      const g = grupos[c.objeto]
      g.position.set(0, mundoY(e.y), 0)
      g.scale.set(dim.ancho * ESCALA, dim.alto * ESCALA, dim.ancho * ESCALA)
      g.rotation.y = c.objeto === 'barco' ? -0.5 : c.objeto === 'madera' || c.objeto === 'hielo' ? 0.4 : 0
      if (c.objeto !== 'barco') return
      liquidoDentro.visible = e.lleno > 0.005
      liquidoDentro.scale.y = Math.max(e.lleno, 0.001)
      color.copy(colorLiquido)
      ;(liquidoDentro.material as THREE.MeshBasicMaterial).color.copy(color)
      agujero.visible = c.agujero
    },
  }
}
