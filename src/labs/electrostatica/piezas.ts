// Los seis materiales como objetos 3D chicos (todo entra en ~3 cm), colgados de un hilo.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { MatId } from './model'

export interface Pieza {
  grupo: THREE.Group
  /** Distancia del centro al punto más bajo (cm): ahí se pegan los papelitos. */
  bajo: number
  /** Medio espesor en z: sirve para apoyar un objeto contra otro al frotar. */
  semiZ: number
  /** Radio de la cáscara donde se dibujan los signos de carga. */
  cascara: number
}

const estandar = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.05, ...extra })

function globo(): Omit<Pieza, 'grupo'> & { malla: THREE.Object3D[] } {
  const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(1.4, 32, 24), new THREE.MeshPhysicalMaterial({ color: 0xe5584b, roughness: 0.25, clearcoat: 0.8 }))
  cuerpo.scale.y = 1.1
  const nudo = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 12), estandar(0xc9443a))
  nudo.position.y = 1.55
  return { malla: [cuerpo, nudo], bajo: 1.54, semiZ: 1.4, cascara: 2.1 }
}

function pelo(): Omit<Pieza, 'grupo'> & { malla: THREE.Object3D[] } {
  const n = 70
  const hebras = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.02, 3, 5), estandar(0x6b4a2f, { roughness: 0.7 }), n)
  const m = new THREE.Object3D()
  for (let i = 0; i < n; i++) {
    const ang = i * 2.399963
    const r = 0.55 * Math.sqrt(i / n)
    // Las hebras salen juntas de arriba y se abren apenas hacia abajo.
    m.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r)
    m.rotation.set(Math.sin(ang) * 0.12, 0, -Math.cos(ang) * 0.12)
    m.updateMatrix()
    hebras.setMatrixAt(i, m.matrix)
  }
  return { malla: [hebras], bajo: 1.5, semiZ: 0.8, cascara: 2 }
}

const paño = (ancho: number, espesor: number, color: number, extra: THREE.MeshStandardMaterialParameters) =>
  new THREE.Mesh(new RoundedBoxGeometry(ancho, 2.4, espesor, 3, Math.min(espesor / 2, 0.2)), estandar(color, extra))

function lana() {
  const cuerpo = paño(3.2, 1.2, 0xc8793b, { roughness: 0.95 })
  const franja = paño(3.25, 0.4, 0x8f4f27, { roughness: 0.95 })
  franja.scale.set(1, 0.25, 1.05)
  return { malla: [cuerpo, franja], bajo: 1.2, semiZ: 0.6, cascara: 2.2 }
}

const seda = () => ({ malla: [paño(3.2, 0.45, 0xb9a3e6, { roughness: 0.2, metalness: 0.3 })], bajo: 1.2, semiZ: 0.22, cascara: 2.2 })

function barra(color: number, extra: THREE.MeshStandardMaterialParameters) {
  return { malla: [new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 3, 24), estandar(color, extra))], bajo: 1.5, semiZ: 0.6, cascara: 2 }
}
const vidrio = () => barra(0xbfeaff, { roughness: 0.05, metalness: 0, transparent: true, opacity: 0.4, depthWrite: false })
const pvc = () => barra(0xb9c2c9, { roughness: 0.55 })

const FABRICAS: Record<MatId, () => Omit<Pieza, 'grupo'> & { malla: THREE.Object3D[] }> = { globo, pelo, lana, seda, vidrio, pvc }

export function crearPieza(id: MatId): Pieza {
  const { malla, ...medidas } = FABRICAS[id]()
  const grupo = new THREE.Group()
  grupo.add(...malla)
  return { grupo, ...medidas }
}
