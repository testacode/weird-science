import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { CLOROFILA_HEX, PLANTA } from './constantes'

export const CENTRO_LUPA = new THREE.Vector3(3.2, 4.45, -0.2)
const RADIO = 1.05
const CLOROPLASTOS: [number, number, number][] = [
  [-0.42, 0.22, 0.05], [-0.1, 0.3, -0.08], [0.3, 0.26, 0.08], [0.46, -0.05, -0.05],
  [0.28, -0.3, 0.06], [-0.18, -0.3, -0.04], [-0.46, -0.1, 0.07],
]

/** Burbuja de zoom: una célula de la hoja con cloroplastos que se encienden cuando trabajan. */
export function crearLupa(scene: THREE.Scene, camera: THREE.Camera) {
  const grupo = new THREE.Group()
  grupo.position.copy(CENTRO_LUPA)
  const esfera = new THREE.Mesh(
    new THREE.SphereGeometry(RADIO, 40, 24),
    new THREE.MeshPhysicalMaterial({ color: 0xdfffee, transparent: true, opacity: 0.1, roughness: 0.05, clearcoat: 1, depthWrite: false }),
  )
  const aro = new THREE.Mesh(new THREE.TorusGeometry(RADIO, 0.02, 8, 72), new THREE.MeshBasicMaterial({ color: 0xc6f35e, toneMapped: false }))
  const pared = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.95, 0.4, 3, 0.14), new THREE.MeshStandardMaterial({ color: 0x6fae5a, transparent: true, opacity: 0.4, roughness: 0.5, depthWrite: false }))
  const vacuola = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshStandardMaterial({ color: 0x5ec8ff, transparent: true, opacity: 0.22, roughness: 0.2, depthWrite: false }))
  vacuola.scale.set(0.3, 0.2, 0.12)
  grupo.add(esfera, aro, pared, vacuola)

  const mat = new THREE.MeshStandardMaterial({ color: 0x2f9e3f, roughness: 0.4, emissive: CLOROFILA_HEX, emissiveIntensity: 0 })
  const granaMat = new THREE.MeshStandardMaterial({ color: 0x1c6b2c, roughness: 0.5 })
  const cloroplastos = CLOROPLASTOS.map(([x, y, z], i) => {
    const c = new THREE.Group()
    const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), mat)
    cuerpo.scale.set(0.17, 0.095, 0.095)
    c.add(cuerpo)
    for (const gx of [-0.06, 0.02, 0.1]) {
      const g = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 10), granaMat)
      g.position.set(gx - 0.02, 0, 0.05)
      g.rotation.x = Math.PI / 2
      c.add(g)
    }
    c.position.set(x, y, z)
    c.rotation.z = (i - 3) * 0.4
    grupo.add(c)
    return c
  })

  // Hilo que conecta la hoja con el zoom.
  const origen = new THREE.Vector3(PLANTA.corte.x + 0.15, PLANTA.corte.y - 0.1, 0)
  const hacia = CENTRO_LUPA.clone().sub(origen).normalize()
  const hilo = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([origen, CENTRO_LUPA.clone().addScaledVector(hacia, -RADIO)]),
    new THREE.LineBasicMaterial({ color: 0xc6f35e, transparent: true, opacity: 0.35 }),
  )
  scene.add(grupo, hilo)

  return {
    /** `actividad` de 0 a 1; `ahora` en segundos. */
    actualizar(actividad: number, ahora: number) {
      mat.emissiveIntensity = actividad * 0.9
      aro.quaternion.copy(camera.quaternion)
      cloroplastos.forEach((c, i) => {
        c.position.y = CLOROPLASTOS[i][1] + Math.sin(ahora * 0.8 + i) * 0.03
        c.rotation.y = Math.sin(ahora * 0.5 + i * 2) * 0.5 * (0.3 + actividad)
      })
    },
  }
}
