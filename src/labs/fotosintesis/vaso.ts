import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { VASO } from './constantes'

const AGUA_POCO = new THREE.Color(0x2a6a86)
const AGUA_MUCHO = new THREE.Color(0x3fb4ea)

/** Mesada, piso, vaso de vidrio con agua y luces de acento. */
export function crearVaso(scene: THREE.Scene) {
  const mesada = new THREE.Mesh(new RoundedBoxGeometry(12.5, 0.5, 3.8, 4, 0.12), new THREE.MeshStandardMaterial({ color: 0x0f1917, roughness: 0.6, metalness: 0.2 }))
  mesada.position.set(2.3, -0.25, 0.2)
  const borde = new THREE.Mesh(new THREE.BoxGeometry(12.3, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: 0xc6f35e }))
  borde.position.set(2.3, -0.005, 2.08)
  const piso = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x0a1413, roughness: 0.9 }))
  piso.rotation.x = -Math.PI / 2
  piso.position.y = -0.52
  scene.add(mesada, borde, piso)

  const vidrio = new THREE.MeshPhysicalMaterial({
    color: 0xdfffee, transparent: true, opacity: 0.09, roughness: 0.04, clearcoat: 1, envMapIntensity: 0.35, depthWrite: false, side: THREE.DoubleSide,
  })
  const pared = new THREE.Mesh(new THREE.CylinderGeometry(VASO.radio, VASO.radio, VASO.alto, 56, 1, true), vidrio)
  pared.position.y = VASO.alto / 2
  const fondo = new THREE.Mesh(new THREE.CylinderGeometry(VASO.radio, VASO.radio, 0.12, 56), vidrio)
  fondo.position.y = 0.06
  const labio = new THREE.Mesh(new THREE.TorusGeometry(VASO.radio, 0.035, 10, 64), new THREE.MeshStandardMaterial({ color: 0x7fa090, roughness: 0.3, metalness: 0.1, envMapIntensity: 0.4 }))
  labio.rotation.x = Math.PI / 2
  labio.position.y = VASO.alto
  scene.add(pared, fondo, labio)

  const aguaMat = new THREE.MeshPhysicalMaterial({ color: AGUA_POCO, transparent: true, opacity: 0.16, roughness: 0.1, envMapIntensity: 0.3, depthWrite: false })
  const agua = new THREE.Mesh(new THREE.CylinderGeometry(VASO.radio - 0.04, VASO.radio - 0.04, VASO.nivel, 56), aguaMat)
  agua.position.y = VASO.nivel / 2 + 0.1
  const superficie = new THREE.Mesh(
    new THREE.CircleGeometry(VASO.radio - 0.04, 56),
    new THREE.MeshBasicMaterial({ color: 0x9fe0ff, transparent: true, opacity: 0.14, depthWrite: false }),
  )
  superficie.rotation.x = -Math.PI / 2
  superficie.position.y = VASO.nivel + 0.1
  scene.add(agua, superficie)

  const sol = new THREE.DirectionalLight(0xffffff, 0.4)
  sol.position.set(-3, 8, 6)
  const cielo = new THREE.PointLight(0x5ec8ff, 14, 22)
  cielo.position.set(-4, 3, 4)
  scene.add(sol, cielo)

  return {
    /** Con más CO₂ disuelto el agua se ve un poco más celeste (sutil, solo ayuda a la lectura). */
    actualizar(co2: number) {
      aguaMat.color.lerpColors(AGUA_POCO, AGUA_MUCHO, co2 / 100)
    },
  }
}
