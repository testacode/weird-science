// Piezas 3D del eco, en el sistema del eje del sonido: x = hacia la superficie, y = hacia arriba (hacia un costado en el sonar), z = profundidad.
// El piso de la maqueta de aire queda en y = −1,6.

import * as THREE from 'three'
import type { SuperficieId } from './model'

/** Altura (mundo) de la fuente en el sonar: el agua llega un poco más arriba. */
export const Y_MAR = 3.3
const ANCHO_MAR = 8.6
const PISO = -1.6

const material = (color: number, rugoso = 0.85) => new THREE.MeshStandardMaterial({ color, roughness: rugoso, metalness: 0.05 })
function caja(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color))
  m.position.set(x, y, z)
  return m
}

export function crearPersona() {
  const g = new THREE.Group()
  const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.8, 6, 16), material(0x5ec8ff))
  cuerpo.position.y = -0.92
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), material(0xf0c9a0))
  const nariz = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 12), material(0xe3b189))
  nariz.rotation.z = -Math.PI / 2
  nariz.position.set(0.3, -0.02, 0)
  g.add(cuerpo, cabeza, nariz)
  return g
}

/** El barco se arma "parado" y se contragira para que quede derecho aunque el eje del sonar apunte hacia abajo. */
export function crearBarco() {
  const g = new THREE.Group()
  g.add(caja(1.7, 0.4, 0.8, 0xe8e6d6), caja(0.6, 0.4, 0.5, 0x5ec8ff, -0.2, 0.4), caja(0.04, 0.5, 0.04, 0xc6f35e, -0.2, 0.85))
  const sonda = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 12), material(0x93a8a0))
  sonda.position.set(0.3, -0.35, 0)
  g.add(sonda)
  g.rotation.z = Math.PI / 2
  g.position.x = -0.45
  return g
}

/** El mar: un prisma azul translúcido entre la superficie y el fondo; `ajustar` lo estira hasta el fondo, que está a `largo` de la fuente. */
export function crearMar(yFuente: number) {
  const grupo = new THREE.Group()
  const arriba = yFuente + 0.35
  const agua = new THREE.Mesh(
    new THREE.BoxGeometry(ANCHO_MAR, 1, 4.2),
    new THREE.MeshStandardMaterial({ color: 0x2f7fd0, transparent: true, opacity: 0.16, depthWrite: false, roughness: 0.3 }),
  )
  const superficie = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_MAR, 4.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x7fc4ff, transparent: true, opacity: 0.35, depthWrite: false }))
  superficie.position.y = arriba
  grupo.add(agua, superficie)
  grupo.visible = false
  return {
    grupo,
    ajustar(largo: number) {
      const abajo = yFuente - largo
      agua.scale.y = arriba - abajo
      agua.position.y = (arriba + abajo) / 2
    },
  }
}

function pared() {
  const g = new THREE.Group()
  g.add(caja(0.6, 3.6, 6, 0x8c8378, 0.3, PISO + 1.8))
  for (const y of [0.4, 1.4, 2.2]) g.add(caja(0.62, 0.05, 6.02, 0x5d564d, 0.3, PISO + y))
  for (const z of [-2, 0, 2]) g.add(caja(0.62, 3.6, 0.05, 0x5d564d, 0.3, PISO + 1.8, z))
  return g
}

function cortina() {
  const g = new THREE.Group()
  const tela = material(0xa3305a, 0.95)
  for (let i = 0; i < 14; i++) {
    const pliegue = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 3.7, 14), tela)
    pliegue.position.set(0.2 + (i % 2) * 0.12, PISO + 1.85, -2.9 + i * 0.45)
    g.add(pliegue)
  }
  g.add(caja(0.08, 0.08, 6.4, 0xc9d3d8, 0.2, PISO + 3.75))
  return g
}

function acantilado() {
  const g = new THREE.Group()
  const colores = [0x6d6a5a, 0x7a7566, 0x5f5c4f, 0x857f6d]
  for (let i = 0; i < 9; i++) {
    const alto = 5.2 + (i % 4) * 0.5
    const grueso = 0.9 + (i % 3) * 0.4
    g.add(caja(grueso, alto, 0.95, colores[i % 4], grueso / 2 + (i % 2) * 0.15, PISO + alto / 2, -3.6 + i * 0.9))
  }
  return g
}

function fondo() {
  const g = new THREE.Group()
  g.add(caja(0.6, ANCHO_MAR, 4.2, 0xd1b87a, 0.3, 0))
  const roca = material(0x6b6f66)
  for (const [y, z, r] of [[-2.4, 0.8, 0.28], [-0.6, -1, 0.22], [1.8, 0.5, 0.3], [3, -0.9, 0.2]] as const) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r), roca)
    m.position.set(-r * 0.4, y, z)
    g.add(m)
  }
  return g
}

/** Las cuatro superficies; `mostrar` deja una y `mover` la pone a `x` de la fuente. */
export function crearMuros() {
  const por: Record<SuperficieId, THREE.Group> = { pared: pared(), cortina: cortina(), acantilado: acantilado(), fondo: fondo() }
  const grupo = new THREE.Group()
  grupo.add(...Object.values(por))
  return {
    grupo,
    mostrar(id: SuperficieId) {
      for (const [k, v] of Object.entries(por)) v.visible = k === id
    },
    mover(x: number) {
      grupo.position.x = x
    },
  }
}
