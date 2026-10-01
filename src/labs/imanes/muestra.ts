// La muestra de prueba del modo "materiales": un cubo del material elegido, apoyado en la mesada.
import * as THREE from 'three'
import type { Pildora } from '../../escena/pildoras'
import { ESC, aX } from './geometria'
import { LADO_MUESTRA, MATERIALES, type Config } from './model'

export function crearMuestra(scene: THREE.Scene, crearRotulo: (texto: string) => Pildora) {
  const lado = LADO_MUESTRA * ESC
  const material = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.6 })
  const cubo = new THREE.Mesh(new THREE.BoxGeometry(lado, lado, lado), material)
  cubo.position.y = lado / 2
  scene.add(cubo)
  const rotulo = crearRotulo('')
  let id = ''

  return {
    actualizar(c: Config) {
      const visible = c.modo === 'material'
      cubo.visible = visible
      rotulo.el.hidden = !visible
      if (!visible) return
      const m = MATERIALES[c.material]
      if (id !== c.material) {
        id = c.material
        material.color.set(m.color)
        material.metalness = m.ferro || c.material === 'aluminio' || c.material === 'cobre' ? 0.65 : 0.05
        rotulo.texto(m.ejemplo ? `${m.nombre} · ${m.ejemplo}` : m.nombre)
      }
      const x = aX(c.gap + LADO_MUESTRA / 2)
      cubo.position.x = x
      rotulo.ancla.set(x, 0.1, 1.1)
    },
  }
}
