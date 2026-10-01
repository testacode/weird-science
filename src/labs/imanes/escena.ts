import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { encuadrarEntreHuds } from '../../escena/encuadre'
import { crearEscenario } from '../../escena/escenario'
import { crearPildoras } from '../../escena/pildoras'
import { crearCampo } from './campo'
import { aX, aZ } from './geometria'
import { crearImanes } from './imanes3d'
import { crearMuestra } from './muestra'
import type { Config } from './model'

/** Ancho (unidades de escena) que tiene que entrar entre los dos HUD: de A partido y separado a B lejos. */
const ANCHO_MAQUETA = 11.4
const MARGEN_HUECO = 20
const ELEVACION = (54 * Math.PI) / 180
const COLOR_MARCA = 0xc6f35e

export function crearEscena(contenedor: HTMLElement) {
  const { scene, camera, renderer, render } = crearEscenario(contenedor, { bloom: 0.12, niebla: { cerca: 32, lejos: 70 } })
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture

  const objetivo = new THREE.Vector3(0, 0, 0.15)
  const controles = new OrbitControls(camera, renderer.domElement)
  controles.target.copy(objetivo)
  controles.enableDamping = true
  controles.enablePan = false
  controles.minDistance = 7
  controles.maxDistance = 30
  controles.maxPolarAngle = Math.PI * 0.46
  let movida = false
  controles.addEventListener('start', () => (movida = true))
  // Con la cámara movida por el usuario, solo se recentra el cuadro (sin pisarle el zoom).
  encuadrarEntreHuds(camera, contenedor, ({ libre, alto }) => {
    if (movida) return
    const tan = Math.tan((camera.fov * Math.PI) / 360)
    const d = Math.max((ANCHO_MAQUETA * alto) / (Math.max(libre - MARGEN_HUECO, 380) * 2 * tan), 12)
    camera.position.copy(objetivo).add(new THREE.Vector3(0, Math.sin(ELEVACION), Math.cos(ELEVACION)).multiplyScalar(d))
  })

  // --- Mesada, regla y luces ---
  const mesada = new THREE.Mesh(new RoundedBoxGeometry(15, 0.5, 8.4, 4, 0.12), new THREE.MeshStandardMaterial({ color: 0x17221f, roughness: 0.55, metalness: 0.3 }))
  mesada.position.set(0, -0.25, 0)
  const piso = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x0a1413, roughness: 0.9 }))
  piso.rotation.x = -Math.PI / 2
  piso.position.y = -0.55
  const luz = new THREE.DirectionalLight(0xffffff, 0.8)
  luz.position.set(4, 9, 6)
  const cielo = new THREE.PointLight(0x5ec8ff, 18, 24)
  cielo.position.set(5, 3, 4)
  scene.add(mesada, piso, luz, cielo)

  // Regla: una marca por cm sobre el borde de adelante, con 0 en el extremo derecho del imán A.
  const zRegla = aZ(-7.6)
  const marcas = Array.from({ length: 29 }, (_, i) => -12 + i)
  const regla = new THREE.InstancedMesh(new THREE.BoxGeometry(0.02, 0.01, 1), new THREE.MeshBasicMaterial({ color: COLOR_MARCA }), marcas.length)
  const m4 = new THREE.Matrix4()
  marcas.forEach((cm, i) => {
    const grande = cm % 5 === 0
    m4.compose(new THREE.Vector3(aX(cm), 0.006, zRegla), new THREE.Quaternion(), new THREE.Vector3(1, 1, grande ? 0.3 : 0.14))
    regla.setMatrixAt(i, m4)
  })
  scene.add(regla)

  // --- Piezas, campo y rótulos ---
  const rotulos = crearPildoras(contenedor, camera)
  for (const cm of [0, 5, 10, 15]) rotulos.crear(`${cm} cm`, { ancla: new THREE.Vector3(aX(cm), 0.02, zRegla + 0.45), clase: 'regla' })
  const imanes = crearImanes(scene, rotulos)
  const muestra = crearMuestra(scene, (t) => rotulos.crear(t, { clase: 'muestra' }))
  const campo = crearCampo(scene)

  let previo = 0
  return {
    aplicar(c: Config) {
      imanes.actualizar(c)
      muestra.actualizar(c)
      campo.actualizar(c)
    },
    dibujar(ahora: number) {
      const dt = Math.min(Math.max(ahora - previo, 0), 0.1)
      previo = ahora
      campo.animar(dt)
      rotulos.ubicar()
      controles.update()
      render()
    },
  }
}
