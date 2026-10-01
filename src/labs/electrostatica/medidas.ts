// Indicadores sobre la maqueta: flechas de fuerza (lima) y la cota con su rótulo.
import * as THREE from 'three'
import { crearPildoras } from '../../escena/pildoras'

const MARCA = 0xc6f35e
const EJE_X = new THREE.Vector3(1, 0, 0)

export function crearMedidas(scene: THREE.Scene, contenedor: HTMLElement, camera: THREE.Camera) {
  // Una flecha por objeto en "cargas".
  const flechas = [0, 1].map(() => {
    const g = new THREE.Group()
    const mat = new THREE.MeshBasicMaterial({ color: MARCA, toneMapped: false })
    const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1, 8).rotateZ(-Math.PI / 2).translate(0.5, 0, 0), mat)
    const punta = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.7, 12).rotateZ(-Math.PI / 2), mat)
    g.add(palo, punta)
    g.visible = false
    scene.add(g)
    return { g, palo, punta }
  })

  // Cota: línea de medida con su rótulo (distancia entre centros, altura o distancia a la perilla).
  const rotulos = crearPildoras(contenedor, camera)
  const rotuloCota = rotulos.crear('', { clase: 'cota' })
  const lineaCota = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 0.05).translate(0.5, 0, 0), new THREE.MeshBasicMaterial({ color: 0x93a8a0, toneMapped: false }))
  scene.add(lineaCota)
  const direccion = new THREE.Vector3()

  return {
    /** Flecha `i` desde `desde` hacia +x (`sentido` 1) o -x (-1), de `largo` cm. */
    flecha(i: number, desde: THREE.Vector3, sentido: number, largo: number) {
      const { g, palo, punta } = flechas[i]
      g.visible = true
      g.position.copy(desde)
      g.scale.x = sentido
      palo.scale.x = Math.max(largo - 0.7, 0.05)
      punta.position.x = largo - 0.35
    },
    ocultarFlechas() {
      flechas.forEach((f) => (f.g.visible = false))
    },
    /** Pone la cota entre dos puntos; con `null` la oculta. */
    cota(desde: THREE.Vector3 | null, hasta?: THREE.Vector3, texto = '') {
      lineaCota.visible = desde !== null
      rotuloCota.el.hidden = desde === null
      if (!desde || !hasta) return
      lineaCota.position.copy(desde)
      lineaCota.quaternion.setFromUnitVectors(EJE_X, direccion.copy(hasta).sub(desde).normalize())
      lineaCota.scale.x = desde.distanceTo(hasta)
      rotuloCota.ancla.copy(desde).add(hasta).multiplyScalar(0.5)
      rotuloCota.texto(texto)
    },
    /** Una vez por cuadro, después de mover la cámara. */
    ubicar: () => rotulos.ubicar(),
  }
}
