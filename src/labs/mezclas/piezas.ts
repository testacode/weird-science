// Piezas de vidrio y soportes de laboratorio que comparten las estaciones.
import * as THREE from 'three'

const v2 = (pares: number[][]) => pares.map(([r, y]) => new THREE.Vector2(r, y))

// Vidrio transparente (no "transmission"): las partículas se ven nítidas a través (ver GOTCHAS).
export const vidrio = (opacidad = 0.1, color = 0x7fa89a) =>
  new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity: opacidad, roughness: 0.1, envMapIntensity: 0.4, specularIntensity: 0.05, depthWrite: false, side: THREE.DoubleSide })

export const metal = (color = 0x1d2a27) => new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6 })

/** Pieza de revolución a partir de un perfil [radio, y]. */
export function torneado(perfil: number[][], material: THREE.Material, segmentos = 48) {
  return new THREE.Mesh(new THREE.LatheGeometry(v2(perfil), segmentos), material)
}

/** Vaso de precipitados con pico: radio interior `r`, alto `h`, apoyado en y = 0. */
export function vasoPrecipitados(r: number, h: number) {
  const perfil = [[0, 0], [r * 0.85, 0], [r + 0.05, 0.08], [r + 0.07, h], [r + 0.14, h + 0.05], [r + 0.02, h + 0.05], [r - 0.04, h], [r - 0.04, 0.1], [0, 0.06]]
  return torneado(perfil, vidrio(), 56)
}

/** Aro de soporte y brazo que sale de un pie de soporte universal en `xPie`. */
export function soporte(xPie: number, altoVarilla: number, yAro: number, xAro: number, radioAro: number) {
  const g = new THREE.Group()
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.9), metal())
  base.position.set(xPie, 0.05, -0.2)
  const varilla = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, altoVarilla, 12), metal(0x93a8a0))
  varilla.position.set(xPie, altoVarilla / 2, -0.2)
  const brazo = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, Math.abs(xAro - xPie), 10), metal(0x93a8a0))
  brazo.rotation.z = Math.PI / 2
  brazo.position.set((xPie + xAro) / 2, yAro, -0.1)
  const aro = new THREE.Mesh(new THREE.TorusGeometry(radioAro, 0.04, 8, 40), metal(0x93a8a0))
  aro.rotation.x = Math.PI / 2
  aro.position.set(xAro, yAro, 0)
  g.add(base, varilla, brazo, aro)
  return g
}
