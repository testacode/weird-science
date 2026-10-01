import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { crearEscenario } from '../../escena/escenario'
import { crearPildoras } from '../../escena/pildoras'
import { crearLuna, crearSol, crearTierra } from './cuerpos'
import { crearInset, type Sombra } from './inset'
import { INCLINACION, latitudLunar, nodoRespectoDelSol, type Config, type Eclipse, type IdeaSombra } from './model'

const RAD = Math.PI / 180
// Escala didáctica: todo está muy agrandado y más cerca que en la realidad (se aclara en "Qué es real").
const R_ORBITA = 3
const R_TIERRA = 0.66
const R_LUNA = 0.24
const R_SOL = 0.5
const SOL_X = -5.2
const MESADA_Y = -1
/** La inclinación de 5° apenas se vería: en la maqueta se dibuja ×3. El modelo usa los 5,145° reales. */
const EXAGERACION = 3
const INTENSIDAD_SOL = 4

export type Vista = 'cenital' | 'costado'
const CENTRO = new THREE.Vector3(-1.55, 0, 0.8)
const VISTAS: Record<Vista, THREE.Vector3> = {
  cenital: new THREE.Vector3(0, 18, 1.6),
  costado: new THREE.Vector3(0, 2.8, 17.6),
}

export interface Cuadro {
  t: number
  /** Fase en grados (0-360). */
  fase: number
  config: Config
  eclipse: Eclipse
  idea: IdeaSombra
  sur: boolean
  avanzado: boolean
}

export function crearEscena(contenedor: HTMLElement, tamInset: number) {
  const { scene, camera, renderer, render } = crearEscenario(contenedor)
  camera.layers.enable(1) // capa 1: lo que se ve en la maqueta pero no desde la Tierra
  const solo = <T extends THREE.Object3D>(o: T) => (o.traverse((x) => x.layers.set(1)), o)

  camera.position.copy(VISTAS.cenital).add(CENTRO)
  const controles = new OrbitControls(camera, renderer.domElement)
  controles.target.copy(CENTRO)
  controles.enableDamping = true
  controles.enablePan = false
  controles.minDistance = 8
  controles.maxDistance = 22
  controles.maxPolarAngle = Math.PI * 0.52

  // Luces: el Sol es la única fuente fuerte (en el plano de la órbita) y el ambiente es apenas la "luz de la Tierra".
  const sol = new THREE.DirectionalLight(0xfff3dc, INTENSIDAD_SOL)
  sol.position.set(SOL_X, 0, 0)
  const frente = new THREE.DirectionalLight(0xffffff, 0)
  scene.add(sol, sol.target, frente, new THREE.AmbientLight(0x9fb8d0, 0.1))

  // Mesada
  const mesada = new THREE.Mesh(
    new THREE.CylinderGeometry(4.7, 4.7, 0.3, 96),
    new THREE.MeshStandardMaterial({ color: 0x17221f, emissive: 0x0f2622, roughness: 0.55, metalness: 0.3 }),
  )
  mesada.position.set(-1.35, MESADA_Y - 0.15, 0)
  const grilla = new THREE.PolarGridHelper(R_ORBITA + 1.1, 16, 6, 64, 0x3d625a, 0x2c4640)
  grilla.position.y = MESADA_Y + 0.005
  scene.add(solo(mesada), solo(grilla))

  const lampara = solo(crearSol(R_SOL, MESADA_Y))
  lampara.position.set(SOL_X, 0, 0)
  const tierra = crearTierra(R_TIERRA)
  const luna = crearLuna(R_LUNA)
  scene.add(lampara, tierra.grupo, luna.mesh)

  // Guías (solo en la maqueta): plano de la órbita terrestre, órbita lunar, ejes y ángulo.
  const linea = (color: number, opacity: number, puntos: number) =>
    solo(new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: puntos }, () => new THREE.Vector3())), new THREE.LineBasicMaterial({ color, transparent: true, opacity })))
  const ecliptica = solo(new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(Array.from({ length: 96 }, (_, i) => new THREE.Vector3(Math.cos(i / 96 * 2 * Math.PI) * R_ORBITA, 0, Math.sin(i / 96 * 2 * Math.PI) * R_ORBITA))),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16 }),
  ))
  const PUNTOS_ORBITA = 180
  const orbita = linea(0xc6f35e, 0.55, PUNTOS_ORBITA)
  const ejeSol = solo(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(SOL_X, 0, 0), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xffc857, transparent: true, opacity: 0.35 })))
  const ejeLuna = linea(0xffffff, 0.4, 2)
  const arco = linea(0xffffff, 0.9, 40)
  const nodos = [0, 1].map(() => solo(new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }))))
  const cono = solo(new THREE.Mesh(
    new THREE.CylinderGeometry(R_TIERRA, R_TIERRA, 3.4, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff5fa2, transparent: true, opacity: 0.17, side: THREE.DoubleSide, depthWrite: false }),
  ))
  cono.rotation.z = Math.PI / 2
  cono.position.x = 1.7
  scene.add(ecliptica, orbita, ejeSol, ejeLuna, arco, ...nodos, cono)

  const inset = crearInset({ scene, luna, sol, frente, intensidadSol: INTENSIDAD_SOL, tam: tamInset })

  // Etiquetas HTML ancladas a los objetos.
  const pildoras = crearPildoras(contenedor, camera)
  pildoras.crear('Sol', { clase: 'p-sol', ancla: new THREE.Vector3(SOL_X, 0, 0), dy: 38 })
  pildoras.crear('Tierra', { clase: 'p-tierra', dy: 46 })
  const pLuna = pildoras.crear('Luna', { clase: 'p-luna', dy: 28 })
  const pAngulo = pildoras.crear('', { clase: 'p-angulo avanzado' })
  const pNodos = nodos.map(() => pildoras.crear('nodo', { clase: 'p-nodo avanzado', dy: -16 }))
  const pSombra = pildoras.crear('Sombra de la Tierra (idea)', { clase: 'p-idea', ancla: new THREE.Vector3(1.9, 0, 0), dy: -52 })

  // Cambio de vista: la cámara se desliza en coordenadas esféricas alrededor del centro.
  let tween: { desde: THREE.Spherical; hasta: THREE.Spherical; inicio: number } | null = null
  const esferica = (v: THREE.Vector3) => new THREE.Spherical().setFromVector3(v.clone().sub(CENTRO))
  const DURACION_MS = 900
  function irA(vista: Vista) {
    tween = { desde: esferica(camera.position), hasta: esferica(VISTAS[vista].clone().add(CENTRO)), inicio: performance.now() }
    controles.target.copy(CENTRO)
  }
  const esf = new THREE.Spherical()
  function moverCamara() {
    if (!tween) return
    const k = Math.min((performance.now() - tween.inicio) / DURACION_MS, 1)
    const s = k * k * (3 - 2 * k)
    esf.set(
      THREE.MathUtils.lerp(tween.desde.radius, tween.hasta.radius, s),
      THREE.MathUtils.lerp(tween.desde.phi, tween.hasta.phi, s),
      THREE.MathUtils.lerp(tween.desde.theta, tween.hasta.theta, s),
    )
    camera.position.setFromSpherical(esf).add(CENTRO)
    if (k === 1) tween = null
  }

  tierra.ponerObservador(true)
  const lunaPos = new THREE.Vector3()
  const sombraReal: Sombra = { dx: 0, dy: 0, fuerza: 0, cobre: 1, suavidad: 0.08 }
  const sombraIdea: Sombra = { dx: 0, dy: 0, fuerza: 1, cobre: 0, suavidad: 0.03 }
  const sobre = (grados: number, radio: number, y = 0) => {
    const a = (180 + grados) * RAD
    return new THREE.Vector3(radio * Math.cos(a), y, -radio * Math.sin(a))
  }

  return {
    lienzoReal: inset.real,
    lienzoIdea: inset.idea,
    irA,
    setHemisferio: (sur: boolean) => tierra.ponerObservador(sur),
    dibujar(c: Cuadro) {
      const lat = latitudLunar(c.t, c.config)
      const beta = lat * EXAGERACION * RAD
      lunaPos.copy(sobre(c.fase, R_ORBITA * Math.cos(beta), R_ORBITA * Math.sin(beta)))
      luna.mesh.position.copy(lunaPos)
      luna.mesh.lookAt(0, 0, 0)
      tierra.girar(c.t * Math.PI * 2 * 0.3)

      // Órbita lunar: el plano inclinado y sus nodos giran de a poco respecto del Sol.
      const nodo = nodoRespectoDelSol(c.t)
      const pos = orbita.geometry.attributes.position
      for (let i = 0; i < PUNTOS_ORBITA; i++) {
        const g = (i / (PUNTOS_ORBITA - 1)) * 360
        const b = c.config.sinInclinacion ? 0 : INCLINACION * Math.sin((g - nodo) * RAD) * EXAGERACION * RAD
        const p = sobre(g, R_ORBITA * Math.cos(b), R_ORBITA * Math.sin(b))
        pos.setXYZ(i, p.x, p.y, p.z)
      }
      pos.needsUpdate = true
      nodos.forEach((n, i) => {
        n.visible = c.avanzado && !c.config.sinInclinacion
        n.position.copy(sobre(nodo + i * 180, R_ORBITA))
        pNodos[i].ancla.copy(n.position)
        pNodos[i].el.hidden = !n.visible
      })

      // Ejes y ángulo Sol-Tierra-Luna (elongación).
      ejeLuna.geometry.attributes.position.setXYZ(1, lunaPos.x, lunaPos.y, lunaPos.z)
      ejeLuna.geometry.attributes.position.needsUpdate = true
      const elong = c.fase <= 180 ? c.fase : 360 - c.fase
      const sentido = c.fase <= 180 ? 1 : -1
      const arcoPos = arco.geometry.attributes.position
      for (let i = 0; i < 40; i++) {
        const p = sobre(sentido * (i / 39) * elong, 1.15)
        arcoPos.setXYZ(i, p.x, p.y, p.z)
      }
      arcoPos.needsUpdate = true
      arco.visible = c.avanzado
      ecliptica.visible = c.avanzado
      pAngulo.ancla.copy(sobre(sentido * elong * 0.5, 1.75))
      pAngulo.texto(`${elong.toFixed(0)}°`)

      cono.visible = c.config.sombraTierra
      pSombra.el.hidden = !cono.visible
      pLuna.ancla.copy(lunaPos)
      const hay = c.eclipse.tipo !== 'ninguno'
      pLuna.el.classList.toggle('eclipse', hay)
      pLuna.texto(hay ? 'Luna · eclipse' : 'Luna')

      Object.assign(sombraReal, { dx: c.eclipse.dx, dy: c.eclipse.dy, fuerza: c.eclipse.magnitud > -0.3 ? 1 : 0 })
      luna.setSombra(sombraReal.dx, sombraReal.dy, sombraReal.fuerza, 1, sombraReal.suavidad)
      moverCamara()
      controles.update()
      pildoras.ubicar()
      render()
      sombraIdea.dx = c.idea.dx
      inset.dibujar(lunaPos, c.sur, sombraReal, c.config.sombraTierra ? sombraIdea : null)
    },
  }
}
