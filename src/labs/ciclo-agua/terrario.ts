import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { ALTO, COLOR, MEDIO_X, MEDIO_Z } from './constantes'

const METAL = new THREE.MeshStandardMaterial({ color: 0x1d2a27, roughness: 0.4, metalness: 0.6 })
const X_LAMPARA = 0.25
const Y_FOCO = 5.5

/** Mesada, terrario de vidrio cerrado con su tapa, lámpara-Sol y luces de acento. */
export function crearTerrario(scene: THREE.Scene) {
  const mesada = new THREE.Mesh(new RoundedBoxGeometry(12.5, 0.5, 4.6, 4, 0.12), new THREE.MeshStandardMaterial({ color: 0x0f1917, roughness: 0.6, metalness: 0.2 }))
  mesada.position.set(0.4, -0.37, 0.2)
  const borde = new THREE.Mesh(new THREE.BoxGeometry(12.3, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: 0xc6f35e }))
  borde.position.set(0.4, -0.125, 2.5)
  const piso = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x0a1413, roughness: 0.9 }))
  piso.rotation.x = -Math.PI / 2
  piso.position.y = -0.64
  const base = new THREE.Mesh(new THREE.BoxGeometry(MEDIO_X * 2 + 0.3, 0.12, MEDIO_Z * 2 + 0.3), METAL)
  base.position.y = -0.06
  scene.add(mesada, borde, piso, base)

  // Vidrio transparente (no "transmission"): la lluvia, las nubes y el vapor se ven nítidos a través.
  const caja = new THREE.BoxGeometry(MEDIO_X * 2 + 0.08, ALTO, MEDIO_Z * 2 + 0.08)
  const vidrio = new THREE.Mesh(caja, new THREE.MeshPhysicalMaterial({
    color: 0xdfffee, transparent: true, opacity: 0.06, roughness: 0.04, clearcoat: 1, envMapIntensity: 0.35, depthWrite: false, side: THREE.DoubleSide,
  }))
  vidrio.position.y = ALTO / 2
  const aristas = new THREE.LineSegments(new THREE.EdgesGeometry(caja), new THREE.LineBasicMaterial({ color: 0x9fd6c4, transparent: true, opacity: 0.55 }))
  aristas.position.y = ALTO / 2
  const tapa = new THREE.Mesh(new THREE.BoxGeometry(MEDIO_X * 2 + 0.3, 0.12, MEDIO_Z * 2 + 0.3), new THREE.MeshStandardMaterial({
    color: 0x9fd9c9, roughness: 0.3, metalness: 0.4, transparent: true, opacity: 0.35,
  }))
  tapa.position.y = ALTO + 0.06
  scene.add(vidrio, aristas, tapa)

  // Lámpara-Sol: columna, brazo, pantalla, foco y haz de luz.
  const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 5.9, 12), METAL)
  poste.position.set(4.9, 2.95, -0.6)
  const largoBrazo = 4.9 - X_LAMPARA
  const brazo = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, largoBrazo, 12), METAL)
  brazo.rotation.z = Math.PI / 2
  brazo.position.set(X_LAMPARA + largoBrazo / 2, 5.9, -0.6)
  const pantalla = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.55, 0.3, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x2a3a36, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide }))
  pantalla.position.set(X_LAMPARA, 5.78, 0)
  const soporte = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), METAL)
  soporte.position.set(X_LAMPARA, 5.95, -0.3)
  soporte.rotation.x = 0.9
  scene.add(poste, brazo, pantalla, soporte)

  const apagado = new THREE.Color(0x2a2218)
  const encendido = new THREE.Color(COLOR.sol)
  const focoMat = new THREE.MeshBasicMaterial({ color: encendido, toneMapped: false })
  const foco = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), focoMat)
  foco.position.set(X_LAMPARA, Y_FOCO, 0)
  const haz = new THREE.Mesh(new THREE.ConeGeometry(2.6, 4.7, 40, 1, true), new THREE.MeshBasicMaterial({
    color: COLOR.sol, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }))
  haz.position.set(X_LAMPARA, Y_FOCO - 2.35, 0)
  // Direccional: ilumina parejo (una luz puntual a pocas unidades quema las nubes).
  const luzSol = new THREE.DirectionalLight(0xffe6b8, 0)
  luzSol.position.set(1.5, 6, 3)
  const luzCielo = new THREE.PointLight(0x5ec8ff, 10, 22)
  luzCielo.position.set(-6, 3, 5)
  scene.add(foco, haz, luzSol, luzCielo)

  return {
    /** Posición del foco, para anclar la pastilla. */
    foco: foco.position,
    /** `sol` de 0 a 1 (ya suavizado). Apagar baja la intensidad a 0: `visible = false` recompila los shaders. */
    actualizar(sol: number) {
      focoMat.color.copy(apagado).lerp(encendido, sol).multiplyScalar(0.4 + 1.2 * sol)
      ;(haz.material as THREE.MeshBasicMaterial).opacity = 0.04 * sol
      luzSol.intensity = 3 * sol
      scene.environmentIntensity = 0.25 + 0.4 * sol
    },
  }
}
