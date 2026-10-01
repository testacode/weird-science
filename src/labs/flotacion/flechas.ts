import * as THREE from 'three'

const GROSOR = 0.035
const LARGO_CABEZA = 0.22

/**
 * Flecha vertical 3D que se dibuja encima de la maqueta (sin test de profundidad: así también se ve a través del
 * líquido y de la mesada). `poner` ubica la base y el largo; `dir` 1 apunta arriba y -1 abajo.
 */
export function crearFlecha(scene: THREE.Scene, color: number) {
  const material = new THREE.MeshBasicMaterial({ color, toneMapped: false, depthTest: false, transparent: true, opacity: 0.95 })
  const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(GROSOR, GROSOR, 1, 12), material)
  const cabeza = new THREE.Mesh(new THREE.ConeGeometry(GROSOR * 3, LARGO_CABEZA, 16), material)
  cuerpo.renderOrder = cabeza.renderOrder = 10
  const grupo = new THREE.Group()
  grupo.add(cuerpo, cabeza)
  scene.add(grupo)
  return {
    /** Punto de la punta (mundo) tras `poner`. */
    punta: new THREE.Vector3(),
    poner(x: number, yBase: number, z: number, largo: number, dir: 1 | -1) {
      grupo.visible = largo > 0.03
      this.punta.set(x, yBase + dir * largo, z)
      const cab = Math.min(largo, LARGO_CABEZA)
      const tallo = Math.max(largo - cab, 0.0001)
      cuerpo.scale.y = tallo
      cuerpo.position.set(x, yBase + dir * (tallo / 2), z)
      cabeza.scale.y = cab / LARGO_CABEZA
      cabeza.rotation.x = dir === 1 ? 0 : Math.PI
      cabeza.position.set(x, yBase + dir * (tallo + cab / 2), z)
    },
  }
}
