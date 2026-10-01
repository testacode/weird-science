// Órganos anexos al tubo: hígado, vesícula, páncreas y sus conductos al duodeno.
import * as THREE from 'three'
import { DESP_HIGADO, DESP_PANCREAS, DESP_TRAMO } from './explosion'
import { HIGADO, VESICULA } from './tubo'

const v = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z)
const DUODENO_BILIS = v(0.3, 0.8, 0.05)
const DUODENO_PANCREAS = v(0.27, 0.62, 0.05)
const PANCREAS = v(0.75, 0.62, -0.25)
const DELGADO = 3

/** Cabeza gruesa junto al duodeno y cola fina hacia la derecha: lóbulos de esferas achatadas. */
const LOBULOS = [[0, 0, 0.21], [0.3, 0.04, 0.2], [0.6, 0.08, 0.18], [0.9, 0.12, 0.16], [1.2, 0.17, 0.13], [1.45, 0.22, 0.1]]

export function crearOrganos(scene: THREE.Scene) {
  const higado = new THREE.Mesh(
    new THREE.SphereGeometry(1, 40, 24),
    new THREE.MeshPhysicalMaterial({ color: 0xa33a4a, transmission: 0.55, roughness: 0.3, thickness: 1 }),
  )
  higado.scale.set(1.05, 0.5, 0.55)
  const vesicula = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 32, 16),
    new THREE.MeshStandardMaterial({ color: 0x4fd67a, emissive: 0x4fd67a, emissiveIntensity: 0.45, roughness: 0.3 }),
  )
  const conductoBilis = new THREE.Mesh(new THREE.BufferGeometry(), vesicula.material)

  const materialPancreas = new THREE.MeshStandardMaterial({ color: 0x9c6a2e, emissive: 0xffa43a, emissiveIntensity: 0.05, roughness: 0.55 })
  const pancreas = new THREE.Group()
  for (const [x, y, r] of LOBULOS) {
    const lobulo = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 14), materialPancreas)
    lobulo.position.set(x, y, 0)
    lobulo.scale.set(1.35, 1, 0.8)
    pancreas.add(lobulo)
  }
  const conductoPancreas = new THREE.Mesh(new THREE.BufferGeometry(), materialPancreas)
  scene.add(higado, vesicula, conductoBilis, pancreas, conductoPancreas)

  /** Posición actual del hígado (con la explosión): hacia ahí vuelan los nutrientes absorbidos. */
  const centroHigado = HIGADO.clone()
  const tmp = new THREE.Vector3()
  const conducto = (a: THREE.Vector3, b: THREE.Vector3, radio: number) => {
    const medio = tmp.lerpVectors(a, b, 0.5).clone().add(v(0, -0.15, 0.1))
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, medio, b]), 40, radio, 8)
  }
  let fPrevio = -1

  return {
    higado,
    vesicula,
    materialPancreas,
    centroHigado,
    actualizar(f: number) {
      higado.position.copy(HIGADO).addScaledVector(DESP_HIGADO, f)
      vesicula.position.copy(VESICULA).addScaledVector(DESP_HIGADO, f)
      pancreas.position.copy(PANCREAS).addScaledVector(DESP_PANCREAS, f)
      centroHigado.copy(higado.position)
      if (f === fPrevio) return
      fPrevio = f
      const duodeno = (p: THREE.Vector3) => p.clone().addScaledVector(DESP_TRAMO[DELGADO], f)
      conductoBilis.geometry.dispose()
      conductoBilis.geometry = conducto(vesicula.position, duodeno(DUODENO_BILIS), 0.035)
      conductoPancreas.geometry.dispose()
      conductoPancreas.geometry = conducto(pancreas.position, duodeno(DUODENO_PANCREAS), 0.04)
    },
  }
}
