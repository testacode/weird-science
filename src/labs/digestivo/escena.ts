import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { crearEscenario } from '../../escena/escenario'
import { MACROS, posicionEnTubo, type Config, type Estado, type Macro, type Nutrientes } from './model'
import { HIGADO, TRAMOS, VESICULA, puntoEnTubo, radioEnTubo } from './tubo'

const COLOR: Record<Macro, number> = { carbos: 0xd99a1e, proteinas: 0xd6337a, grasas: 0x2f9fd8 }
const PARTICULAS = 96
const VUELO_SEG = 1.4

interface Particula {
  macro: Macro
  rango: number
  desfase: number
  offset: THREE.Vector3
  absorbidaEn: number | null
  desde: THREE.Vector3
}

export function crearEscena(contenedor: HTMLElement, nombres: string[]) {
  const { scene, camera, renderer, render } = crearEscenario(contenedor)
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
  camera.position.set(0.8, 0.4, 15.5)
  const controles = new OrbitControls(camera, renderer.domElement)
  controles.target.set(0.8, 0.4, 0)
  controles.enableDamping = true
  controles.minDistance = 6
  controles.maxDistance = 18
  controles.maxPolarAngle = Math.PI * 0.62

  const vidrio = new THREE.MeshPhysicalMaterial({
    color: 0xdffff0, transmission: 1, roughness: 0.1, thickness: 0.35, ior: 1.4, emissive: 0xc6f35e, emissiveIntensity: 0,
  })
  const tubos = TRAMOS.map((t) => {
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(t.curva, 160, t.radio, 28, false), vidrio.clone())
    scene.add(mesh)
    return mesh
  })

  const higado = new THREE.Mesh(
    new THREE.SphereGeometry(1, 40, 24),
    new THREE.MeshPhysicalMaterial({ color: 0xa33a4a, transmission: 0.55, roughness: 0.3, thickness: 1 }),
  )
  higado.position.copy(HIGADO)
  higado.scale.set(1.05, 0.5, 0.55)
  const vesicula = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 32, 16),
    new THREE.MeshStandardMaterial({ color: 0x4fd67a, emissive: 0x4fd67a, emissiveIntensity: 0.45, roughness: 0.3 }),
  )
  vesicula.position.copy(VESICULA)
  const conducto = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([VESICULA, new THREE.Vector3(-0.1, 1.2, 0.2), new THREE.Vector3(0.3, 0.8, 0.05)]), 40, 0.035, 8),
    vesicula.material,
  )
  scene.add(higado, vesicula, conducto)

  const mesada = new THREE.Mesh(new RoundedBoxGeometry(7.5, 0.45, 3.2, 4, 0.12), new THREE.MeshStandardMaterial({ color: 0x17221f, roughness: 0.55, metalness: 0.3 }))
  mesada.position.set(0, -4.6, 0)
  const borde = new THREE.Mesh(new THREE.BoxGeometry(7.3, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: 0xc6f35e }))
  borde.position.set(0, -4.4, 1.6)
  const piso = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: 0x0a1413, roughness: 0.9 }))
  piso.rotation.x = -Math.PI / 2
  piso.position.y = -4.85
  scene.add(mesada, borde, piso)

  const luz = new THREE.DirectionalLight(0xffffff, 1.6)
  luz.position.set(4, 8, 6)
  const ambar = new THREE.PointLight(0xffc857, 30, 20)
  ambar.position.set(-5, 1, 3)
  const cielo = new THREE.PointLight(0x5ec8ff, 30, 20)
  cielo.position.set(5, -1, 3)
  scene.add(luz, ambar, cielo)

  // Partículas de comida: una sola InstancedMesh, color por macronutriente.
  const bolitas = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ toneMapped: false }), PARTICULAS)
  bolitas.frustumCulled = false
  scene.add(bolitas)
  let particulas: Particula[] = []
  const matriz = new THREE.Matrix4()
  const pos = new THREE.Vector3()
  const escala = new THREE.Vector3()
  const giro = new THREE.Quaternion()

  function setComida(gramos: Record<Macro, number>) {
    const total = MACROS.reduce((s, m) => s + gramos[m], 0)
    particulas = []
    for (const m of MACROS) {
      const n = Math.round((gramos[m] / total) * PARTICULAS)
      for (let i = 0; i < n && particulas.length < PARTICULAS; i++) {
        particulas.push({
          macro: m, rango: i / n, desfase: (Math.random() - 0.5) * 0.02,
          offset: new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 0.6), absorbidaEn: null, desde: new THREE.Vector3(),
        })
      }
    }
    bolitas.count = particulas.length
    particulas.forEach((p, i) => bolitas.setColorAt(i, new THREE.Color(COLOR[p.macro])))
    if (bolitas.instanceColor) bolitas.instanceColor.needsUpdate = true
  }

  function ubicarParticulas(n: Nutrientes, posicion: number, ahora: number) {
    const radio = radioEnTubo(posicion)
    particulas.forEach((p, i) => {
      const pool = n[p.macro]
      const total = pool.intacto + pool.digerido + pool.absorbido
      const fAbs = pool.absorbido / total
      const fDig = pool.digerido / total
      puntoEnTubo(posicion + p.desfase, pos).addScaledVector(p.offset, radio)
      let tam = p.rango < fAbs + fDig ? 0.055 : 0.11
      if (p.rango < fAbs) {
        if (p.absorbidaEn === null) {
          p.absorbidaEn = ahora
          p.desde.copy(pos)
        }
        const t = Math.min((ahora - p.absorbidaEn) / VUELO_SEG, 1)
        pos.lerpVectors(p.desde, HIGADO, t).y += Math.sin(t * Math.PI) * 0.8
        tam = t >= 1 ? 0 : 0.06
      } else p.absorbidaEn = null
      matriz.compose(pos, giro, escala.setScalar(tam))
      bolitas.setMatrixAt(i, matriz)
    })
    bolitas.instanceMatrix.needsUpdate = true
  }

  // Etiquetas HTML ancladas a cada órgano.
  const pildoras = TRAMOS.map((t, i) => {
    const el = document.createElement('div')
    el.className = 'pildora'
    el.textContent = nombres[i]
    contenedor.append(el)
    return { el, ancla: t.ancla }
  })
  const proyectado = new THREE.Vector3()
  function ubicarPildoras(activo: number) {
    pildoras.forEach(({ el, ancla }, i) => {
      proyectado.copy(ancla).project(camera)
      el.style.left = `${(proyectado.x * 0.5 + 0.5) * contenedor.clientWidth}px`
      el.style.top = `${(-proyectado.y * 0.5 + 0.5) * contenedor.clientHeight}px`
      el.classList.toggle('activa', i === activo)
    })
  }

  // Click sobre la vesícula (sin confundirlo con arrastrar la cámara).
  const rayo = new THREE.Raycaster()
  const puntero = new THREE.Vector2()
  let alTocarVesicula = () => {}
  let inicio = { x: 0, y: 0 }
  const tocaVesicula = (e: PointerEvent) => {
    puntero.set((e.offsetX / contenedor.clientWidth) * 2 - 1, -(e.offsetY / contenedor.clientHeight) * 2 + 1)
    rayo.setFromCamera(puntero, camera)
    return rayo.intersectObject(vesicula).length > 0
  }
  renderer.domElement.addEventListener('pointerdown', (e) => (inicio = { x: e.clientX, y: e.clientY }))
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) < 5 && tocaVesicula(e)) alTocarVesicula()
  })
  renderer.domElement.addEventListener('pointermove', (e) => {
    renderer.domElement.style.cursor = tocaVesicula(e) ? 'pointer' : ''
  })

  return {
    setComida,
    onVesicula: (cb: () => void) => (alTocarVesicula = cb),
    dibujar(estado: Estado, config: Config, ahora: number) {
      tubos.forEach((t, i) => {
        t.material.emissiveIntensity = i === estado.segmento && !estado.terminado ? 0.12 : 0
      })
      vesicula.material.emissiveIntensity = config.bilis ? 0.45 : 0.02
      vesicula.material.color.set(config.bilis ? 0x4fd67a : 0x2a3a30)
      ubicarParticulas(estado.nutrientes, posicionEnTubo(estado), ahora)
      ubicarPildoras(estado.segmento)
      controles.update()
      render()
    },
  }
}
