// Electroscopio de hojas: base, frasco de vidrio, varilla con perilla y dos hojas de oro que se abren.
import * as THREE from 'three'

/** Posición (cm) de la perilla en la escena. */
export const PERILLA = new THREE.Vector3(-10, 11.6, 0)
const PIVOTE_Y = 5.4
const LARGO_HOJA = 3.4

export function crearElectroscopio(scene: THREE.Scene) {
  const grupo = new THREE.Group()
  grupo.position.set(PERILLA.x, 0, 0)
  const metal = new THREE.MeshStandardMaterial({ color: 0xcfd6dc, metalness: 0.9, roughness: 0.25 })
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.8, 0.6, 32), new THREE.MeshStandardMaterial({ color: 0x1d2b28, roughness: 0.5 }))
  base.position.y = 0.3
  const frasco = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 8.6, 32, 1, true),
    new THREE.MeshPhysicalMaterial({ color: 0xbfeaff, roughness: 0.05, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
  )
  frasco.position.y = 4.9
  const varilla = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, PERILLA.y - PIVOTE_Y, 12), metal)
  varilla.position.y = (PERILLA.y + PIVOTE_Y) / 2
  const perilla = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 18), metal)
  perilla.position.y = PERILLA.y
  const oro = new THREE.MeshStandardMaterial({ color: 0xf2c14e, emissive: 0x7a5a12, metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide })
  // Cada hoja se dibuja de frente (un rectángulo que cuelga del pivote); la de la izquierda es el espejo de la otra.
  const hojas = [0.55, -0.55].map((x) => new THREE.Mesh(new THREE.BoxGeometry(1.1, LARGO_HOJA, 0.05).translate(x, -LARGO_HOJA / 2, 0), oro))
  hojas.forEach((h) => h.position.set(0, PIVOTE_Y, 0))
  grupo.add(base, frasco, varilla, perilla, ...hojas)
  scene.add(grupo)

  let angulo = 0
  const punta = new THREE.Vector3()
  return {
    grupo,
    /** Apertura actual de cada hoja (grados). */
    get angulo() {
      return angulo
    },
    /** Acerca la apertura a `objetivo` (grados) con un suavizado. */
    actualizar(objetivo: number, dt: number) {
      angulo += (objetivo - angulo) * (1 - Math.exp(-dt * 7))
      const rad = (angulo * Math.PI) / 180
      hojas[0].rotation.z = rad
      hojas[1].rotation.z = -rad
    },
    /** Punto de la hoja (0: derecha, 1: izquierda) a la altura `t` (0 pivote, 1 punta), en coordenadas de la escena. */
    puntoHoja(i: 0 | 1, t: number): THREE.Vector3 {
      const rad = ((i === 0 ? angulo : -angulo) * Math.PI) / 180
      return punta.set(PERILLA.x + Math.sin(rad) * LARGO_HOJA * t, PIVOTE_Y - Math.cos(rad) * LARGO_HOJA * t, 0.8)
    },
  }
}
