// Burbuja de zoom al intestino delgado: una mini escena con vellosidades (en rosa), el capilar
// de cada una (en rojo) y los nutrientes ya digeridos entrando hacia la sangre.
// Va en su propio canvas redondo con su propio renderer; solo dibuja mientras se ve.
import * as THREE from 'three'
import { h } from '../../ui/dom'
import { MACROS, type Macro } from './model'
import { cuotas, pintar } from './particulas'

const TAM = 230
const PARTICULAS = 72
const BASE_Y = -1.45
const ENTRA = 0.4
const FILAS = [
  { z: 0, xs: [-1.8, -0.9, 0, 0.9, 1.8], color: 0xff9db4, brillo: 0.5 },
  { z: -1.1, xs: [-1.35, -0.45, 0.45, 1.35], color: 0xc9708a, brillo: 0.3 },
]

interface Vello { x: number; z: number; punta: number; fase: number; grupo: THREE.Group }
interface Nutriente { macro: Macro; rango: number; vello: number; fase: number; vel: number; dx: number }

export function crearVellosidades(contenedor: HTMLElement) {
  const canvas = h('canvas', { 'aria-hidden': 'true' })
  const el = h('div', { class: 'zoom', role: 'img', 'aria-label': 'Zoom a las vellosidades del intestino delgado' },
    h('div', { class: 'lente' }, canvas),
    h('div', { class: 'rotulo' }, h('b', {}, 'Zoom: vellosidades'), h('span', { class: 'avanzado' }, ' · capilares en rojo')),
  )
  contenedor.append(el)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(TAM, TAM, false)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0b1816)
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 30)
  camera.position.set(0, -0.2, 6.5)
  const luz = new THREE.DirectionalLight(0xffffff, 2)
  luz.position.set(2, 4, 5)
  scene.add(new THREE.AmbientLight(0xffffff, 1.1), luz)

  const pared = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 4), new THREE.MeshStandardMaterial({ color: 0x8a3446, roughness: 0.8 }))
  pared.position.y = BASE_Y - 0.6
  const material = (color: number, e: number) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: e, roughness: 0.5 })
  const sangre = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 8, 16), material(0xd1303f, 0.7))
  sangre.rotation.z = Math.PI / 2
  sangre.position.y = BASE_Y - 0.5
  scene.add(pared, sangre)

  const vellos: Vello[] = FILAS.flatMap((fila, r) =>
    fila.xs.map((x, i): Vello => {
      const punta = 0.95 - r * 0.15 + 0.15 * Math.sin(i * 2.1 + r)
      const alto = punta - BASE_Y
      const grupo = new THREE.Group()
      grupo.position.set(x, BASE_Y, fila.z)
      const cuerpo = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.27, alto - 0.54, 6, 16),
        new THREE.MeshStandardMaterial({ color: fila.color, emissive: fila.color, emissiveIntensity: 0.12, roughness: 0.55, transparent: true, opacity: 0.6, depthWrite: false }),
      )
      cuerpo.position.y = alto / 2
      const capilar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, alto - 0.3, 10), material(0xff4a4a, fila.brillo + 0.3))
      capilar.position.y = (alto - 0.3) / 2
      grupo.add(cuerpo, capilar)
      scene.add(grupo)
      return { x, z: fila.z, punta, fase: i * 1.3 + r, grupo }
    }),
  )

  const bolitas = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), PARTICULAS)
  bolitas.frustumCulled = false
  scene.add(bolitas)
  let nutrientes: Nutriente[] = []
  const matriz = new THREE.Matrix4()
  const pos = new THREE.Vector3()
  const escala = new THREE.Vector3()
  const giro = new THREE.Quaternion()

  /** Los nutrientes se reparten entre macros según lo que se comió. */
  function setComida(gramos: Record<Macro, number>) {
    const n = cuotas(gramos, PARTICULAS)
    nutrientes = []
    for (const m of MACROS) {
      for (let i = 0; i < n[m]; i++) {
        nutrientes.push({ macro: m, rango: i / n[m], vello: nutrientes.length % vellos.length, fase: Math.random(), vel: 0.16 + Math.random() * 0.06, dx: (Math.random() - 0.5) * 0.7 })
      }
    }
    pintar(bolitas, nutrientes.map((p) => p.macro))
  }

  let visible = false
  return {
    setComida,
    /** `actividad[m]` (0..1) sale del modelo: cuánto de ese macronutriente está digerido y listo para absorberse. */
    actualizar(mostrar: boolean, actividad: Record<Macro, number>, t: number) {
      if (mostrar !== visible) {
        visible = mostrar
        el.classList.toggle('visible', mostrar)
      }
      if (!visible) return
      const angulo = vellos.map((v) => {
        const a = 0.05 * Math.sin(t * 0.9 + v.fase)
        v.grupo.rotation.z = a
        return a
      })
      nutrientes.forEach((p, i) => {
        const v = vellos[p.vello]
        if (p.rango >= actividad[p.macro]) {
          bolitas.setMatrixAt(i, matriz.makeScale(0, 0, 0))
          return
        }
        const u = (t * p.vel + p.fase) % 1
        let tam = 0.085
        if (u < ENTRA) {
          const s = u / ENTRA
          pos.set(v.x + p.dx * (1 - s), 2.3 + (v.punta + 0.05 - 2.3) * s, v.z)
        } else {
          const s = (u - ENTRA) / (1 - ENTRA)
          const altura = (v.punta - 0.2 - BASE_Y) * (1 - s)
          pos.set(v.x - altura * Math.sin(angulo[p.vello]), BASE_Y + altura * Math.cos(angulo[p.vello]), v.z)
          tam *= 1 - 0.6 * s
        }
        matriz.compose(pos, giro, escala.setScalar(tam))
        bolitas.setMatrixAt(i, matriz)
      })
      bolitas.instanceMatrix.needsUpdate = true
      renderer.render(scene, camera)
    },
  }
}
