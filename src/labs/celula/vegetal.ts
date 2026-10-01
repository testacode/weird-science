// Célula vegetal: pared celular (verde) con el protoplasto adentro. Con poca agua el protoplasto se despega de la pared (plasmólisis).
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { Cuerpo } from './cuerpo'

/** Medidas del protoplasto en reposo (v = 1) y de la pared que lo envuelve. */
const TAMANO = 0.85
const PROTOPLASTO = new THREE.Vector3(2.3, 1.5, 1.5).multiplyScalar(TAMANO)
const PARED = new THREE.Vector3(2.46, 1.66, 1.66).multiplyScalar(TAMANO)

const translucido = (color: number, opacity: number, lado: THREE.Side = THREE.FrontSide) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.6, envMapIntensity: 0.25, transparent: true, opacity, side: lado, depthWrite: false })

export function crearVegetal() {
  const grupo = new THREE.Group()
  const caja = (v: THREE.Vector3, radio: number, material: THREE.Material) => {
    const malla = new THREE.Mesh(new RoundedBoxGeometry(v.x, v.y, v.z, 5, radio), material)
    malla.renderOrder = 2
    return malla
  }

  const matProto = translucido(0x18a5b8, 0.7)
  const protoplasto = new THREE.Group()
  const membrana = caja(PROTOPLASTO, 0.3, matProto)
  const vacuola = caja(new THREE.Vector3(1.55, 0.78, 0.78).multiplyScalar(TAMANO), 0.26, translucido(0x2a5fe0, 0.6))
  const nucleo = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), new THREE.MeshStandardMaterial({ color: 0xffc857, roughness: 0.5 }))
  nucleo.position.set(-0.78, 0.38, 0.32).multiplyScalar(TAMANO)
  protoplasto.add(membrana, vacuola, nucleo)
  for (let i = 0; i < 7; i++) {
    const cloroplasto = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshStandardMaterial({ color: 0x5ee06a, emissive: 0x0a2a0d }))
    cloroplasto.scale.set(1.5, 0.8, 1)
    const lado = i % 2 ? 1 : -1
    cloroplasto.position.set(-0.8 + i * 0.27, lado * 0.5, lado * 0.42).multiplyScalar(TAMANO)
    protoplasto.add(cloroplasto)
  }

  const pared = new THREE.Group()
  pared.add(caja(PARED, 0.34, translucido(0x3f8f4c, 0.1)), caja(PARED, 0.34, translucido(0x3f8f4c, 0.3, THREE.BackSide)))
  // El marco de la pared: aristas lima para que se vea el hueco cuando el protoplasto se despega.
  const marco = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(PARED.x, PARED.y, PARED.z)), new THREE.LineBasicMaterial({ color: 0xb7f06a }))
  pared.add(marco)
  grupo.add(protoplasto, pared)

  let s = 1
  const cuerpo: Cuerpo = {
    hx: PROTOPLASTO.x, hy: PROTOPLASTO.y, hz: PROTOPLASTO.z,
    f: (x, y, z) => Math.max(Math.abs(x) / (PROTOPLASTO.x / 2 * s), Math.abs(y) / (PROTOPLASTO.y / 2 * s), Math.abs(z) / (PROTOPLASTO.z / 2 * s)) ** 2,
  }

  /** `v` es el volumen relativo del protoplasto. La pared solo se estira al hincharse (v > 1). */
  function actualizar(v: number, conPared: boolean, rota: boolean) {
    s = Math.cbrt(v)
    protoplasto.scale.setScalar(s)
    pared.visible = conPared
    pared.scale.setScalar(Math.cbrt(Math.max(1, v)))
    protoplasto.visible = !rota
  }
  actualizar(1, true, false)
  return { grupo, cuerpo, actualizar }
}
