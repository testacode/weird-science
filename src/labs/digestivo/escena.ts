import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { crearEscenario } from '../../escena/escenario'
import { MAX_BOCADOS } from './bocados'
import { DESP_HIGADO, DESP_PANCREAS, DESP_TRAMO, despEnTubo } from './explosion'
import { MACROS, phSegmento, posicionEnTubo, type Config, type Estado, type Macro } from './model'
import { crearOrganos } from './organos'
import { crearParticulas } from './particulas'
import { colorPh } from './ph'
import { crearRotulos } from './rotulos'
import { TRAMOS, puntoEnTubo } from './tubo'
import { crearVellosidades } from './vellosidades'

/** Cuánto se aleja la cámara con la vista explotada, para que entre todo. */
const ALEJAR_EXPLOTADA = 0.14
const VIDRIO = new THREE.Color(0xdffff0)
/** Qué tanto manda el pH sobre el color del vidrio (0 = blanco verdoso, 1 = color puro). */
const FUERZA_PH = 0.85
/** El vidrio también emite un poco de su color de pH, si no el tinte se pierde contra el fondo oscuro. */
const BRILLO_PH = 0.34
const BRILLO_ACTIVO = 0.12
const DELGADO = 3
const suavizar = (dt: number, ritmo: number) => 1 - Math.exp(-dt * ritmo)

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
    color: VIDRIO, transmission: 1, roughness: 0.1, thickness: 0.35, ior: 1.4, emissive: VIDRIO, emissiveIntensity: 0.15,
  })
  const tubos = TRAMOS.map((t) => {
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(t.curva, 160, t.radio, 28, false), vidrio.clone())
    scene.add(mesh)
    return mesh
  })
  // En la vista explotada, una línea tenue une el final de cada órgano con el principio del siguiente.
  const uniones = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array((TRAMOS.length - 1) * 6), 3)),
    new THREE.LineBasicMaterial({ color: 0xc6f35e, transparent: true }),
  )
  uniones.frustumCulled = false
  scene.add(uniones)

  const organos = crearOrganos(scene)

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

  const particulas = crearParticulas(scene, organos.centroHigado)
  const vellosidades = crearVellosidades(contenedor)

  // Etiquetas: primero los tramos del tubo, después los anexos.
  const iPancreas = TRAMOS.length + 2
  const rotulos = crearRotulos(contenedor, camera, [
    ...TRAMOS.map((t, i) => ({ texto: nombres[i], ancla: t.ancla, desp: DESP_TRAMO[i] })),
    { texto: 'Hígado', ancla: new THREE.Vector3(-2.35, 2.55, 0), desp: DESP_HIGADO },
    { texto: 'Vesícula · tocala', ancla: new THREE.Vector3(-1.75, 1.45, 0.3), desp: DESP_HIGADO },
    { texto: 'Páncreas', ancla: new THREE.Vector3(2.2, 0.35, -0.3), desp: DESP_PANCREAS },
  ], MAX_BOCADOS)

  // Click sobre la vesícula (sin confundirlo con arrastrar la cámara).
  const rayo = new THREE.Raycaster()
  const puntero = new THREE.Vector2()
  let alTocarVesicula = () => {}
  let inicio = { x: 0, y: 0 }
  const tocaVesicula = (e: PointerEvent) => {
    puntero.set((e.offsetX / contenedor.clientWidth) * 2 - 1, -(e.offsetY / contenedor.clientHeight) * 2 + 1)
    rayo.setFromCamera(puntero, camera)
    return rayo.intersectObject(organos.vesicula).length > 0
  }
  renderer.domElement.addEventListener('pointerdown', (e) => (inicio = { x: e.clientX, y: e.clientY }))
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) < 5 && tocaVesicula(e)) alTocarVesicula()
  })
  renderer.domElement.addEventListener('pointermove', (e) => {
    renderer.domElement.style.cursor = tocaVesicula(e) ? 'pointer' : ''
  })

  // Vista explotada: `f` va de 0 (normal) a 1 (explotada) con suavizado exponencial.
  let f = 0
  let objetivo = 0
  let alejado = 1
  let relojPrevio = performance.now()
  let brillo = 0.05
  let primerCuadro = true
  let gramos: Record<Macro, number> = { carbos: 1, proteinas: 1, grasas: 1 }
  const destino = new THREE.Color()
  const base = new THREE.Vector3()
  const fin = new THREE.Vector3()

  function ubicarUniones() {
    const a = uniones.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < TRAMOS.length - 1; i++) {
      TRAMOS[i].curva.getPointAt(1, base).addScaledVector(DESP_TRAMO[i], f)
      TRAMOS[i + 1].curva.getPointAt(0, fin).addScaledVector(DESP_TRAMO[i + 1], f)
      a.setXYZ(i * 2, base.x, base.y, base.z)
      a.setXYZ(i * 2 + 1, fin.x, fin.y, fin.z)
    }
    a.needsUpdate = true
    ;(uniones.material as THREE.LineBasicMaterial).opacity = 0.5 * f
    uniones.visible = f > 0.01
  }

  return {
    setComida(g: Record<Macro, number>, cantidad: number) {
      gramos = g
      particulas.setComida(g, cantidad)
      vellosidades.setComida(g)
    },
    setVista: (explotada: boolean) => (objetivo = explotada ? 1 : 0),
    onVesicula: (cb: () => void) => (alTocarVesicula = cb),
    /** `estados[i]` es el bocado i (solo los que ya entraron). `ahora` es el reloj de animación (se frena en pausa). */
    dibujar(estados: Estado[], config: Config, ahora: number) {
      const dt = Math.min((performance.now() - relojPrevio) / 1000, 0.1)
      relojPrevio += dt * 1000
      f += (objetivo - f) * suavizar(dt, 5)
      if (Math.abs(objetivo - f) < 0.001) f = objetivo
      const k = 1 + ALEJAR_EXPLOTADA * f
      camera.position.sub(controles.target).multiplyScalar(k / alejado).add(controles.target)
      alejado = k

      const viajando = estados.filter((e) => !e.terminado)
      const activos = new Set(viajando.map((e) => e.segmento))
      const enDelgado = activos.has(DELGADO)
      tubos.forEach((t, i) => {
        t.position.copy(DESP_TRAMO[i]).multiplyScalar(f)
        colorPh(phSegmento(i, config), destino).lerp(VIDRIO, 1 - FUERZA_PH)
        // Los colores oscuros (rojo, azul) necesitan más emisión que el verde neutro para leerse igual de claros.
        const luminancia = destino.r * 0.3 + destino.g * 0.59 + destino.b * 0.11
        t.material.emissiveIntensity = BRILLO_PH - 0.22 * luminancia + (activos.has(i) ? BRILLO_ACTIVO : 0)
        const paso = primerCuadro ? 1 : suavizar(dt, 4)
        t.material.color.lerp(destino, paso)
        t.material.emissive.lerp(destino, paso)
      })
      primerCuadro = false
      ubicarUniones()

      organos.actualizar(f)
      organos.vesicula.material.emissiveIntensity = config.bilis ? 0.45 : 0.02
      organos.vesicula.material.color.set(config.bilis ? 0x4fd67a : 0x2a3a30)
      brillo += ((enDelgado ? 0.5 : 0.05) - brillo) * suavizar(dt, 4)
      organos.materialPancreas.emissiveIntensity = brillo

      particulas.ubicar(estados, f, ahora)
      rotulos.etiquetas(new Set<number>([...activos, ...(enDelgado ? [iPancreas] : [])]), f)
      rotulos.enzimas(
        Array.from({ length: MAX_BOCADOS }, (_, i) => {
          const e = estados[i]
          if (!e || e.terminado) return null
          const posicion = posicionEnTubo(e)
          return { segmento: e.segmento, punto: puntoEnTubo(posicion).add(despEnTubo(posicion, f)) }
        }),
        config,
      )
      const actividad = {} as Record<Macro, number>
      for (const m of MACROS) {
        const digerido = estados.reduce((s, e) => s + e.nutrientes[m].digerido, 0)
        actividad[m] = Math.min(1, (digerido / gramos[m]) * 4)
      }
      vellosidades.actualizar(enDelgado, actividad, ahora)
      controles.update()
      render()
    },
  }
}
