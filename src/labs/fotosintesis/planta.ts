import * as THREE from 'three'
import { CLOROFILA_HEX, PLANTA } from './constantes'

const HOJAS_POR_VERTICILO = 3
const VERTICILOS = 34

/** Rama de Elodea: tallo curvo con hojas en verticilos (una sola InstancedMesh) y piedritas de peso. */
export function crearPlanta(scene: THREE.Scene) {
  const curva = new THREE.CatmullRomCurve3([
    PLANTA.base, new THREE.Vector3(0.07, 0.95, 0.04), new THREE.Vector3(-0.05, 1.6, -0.03), PLANTA.corte,
  ])
  const tallo = new THREE.Mesh(new THREE.TubeGeometry(curva, 40, 0.035, 8), new THREE.MeshStandardMaterial({ color: 0x3f8f3a, roughness: 0.6 }))
  scene.add(tallo)

  const hojaMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, emissive: CLOROFILA_HEX, emissiveIntensity: 0 })
  const hojas = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), hojaMat, VERTICILOS * HOJAS_POR_VERTICILO)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const dir = new THREE.Vector3()
  const pos = new THREE.Vector3()
  const verde = new THREE.Color()
  let i = 0
  for (let w = 0; w < VERTICILOS; w++) {
    const t = 0.04 + (w / (VERTICILOS - 1)) * 0.96
    const punto = curva.getPointAt(t)
    for (let k = 0; k < HOJAS_POR_VERTICILO; k++) {
      const ang = w * 0.9 + (k * Math.PI * 2) / HOJAS_POR_VERTICILO
      const elev = 0.3 + Math.random() * 0.35
      dir.set(Math.cos(ang) * Math.cos(elev), Math.sin(elev), Math.sin(ang) * Math.cos(elev)).normalize()
      const largo = 0.17 + Math.random() * 0.1 + t * 0.04
      pos.copy(punto).addScaledVector(dir, largo)
      q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir)
      m.compose(pos, q, new THREE.Vector3(largo, 0.028, 0.055))
      hojas.setMatrixAt(i, m)
      hojas.setColorAt(i, verde.setHSL(0.27 + Math.random() * 0.06, 0.6, 0.2 + Math.random() * 0.12))
      i++
    }
  }
  scene.add(hojas)

  const piedra = new THREE.MeshStandardMaterial({ color: 0x59615e, roughness: 0.9 })
  for (let p = 0; p < 7; p++) {
    const r = 0.12 + Math.random() * 0.1
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), piedra)
    const ang = (p / 7) * Math.PI * 2
    mesh.position.set(Math.cos(ang) * 0.35, 0.14 + r * 0.4, Math.sin(ang) * 0.35)
    mesh.scale.y = 0.6
    scene.add(mesh)
  }

  return {
    /** Brillo de las hojas según qué tan activa está la fotosíntesis (0 a 1). */
    brillar(actividad: number) {
      hojaMat.emissiveIntensity = actividad * 0.22
    },
  }
}
