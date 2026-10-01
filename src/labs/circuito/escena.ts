import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { crearEscenario } from '../../escena/escenario'
import { MAX_LAMPARAS, type Config, type Resultado } from './model'
import { COLOR_MARCA, crearInterruptor, crearLamparita, crearPila } from './piezas'
import { BY, X_CORTO, X_INTERRUPTOR, XB, ZB, ZF, mediaLargoPila, trazado, xLampara, type Arista } from './trazado'

const COLOR_ELECTRON = new THREE.Color(0x5ec8ff).multiplyScalar(1.6)
const COLOR_MAGENTA = 0xff5fa2
const MAX_ELECTRONES = 400
const ELECTRONES_POR_UNIDAD = 2.6
/** Unidades por segundo por amperio, con tope: el corto no puede ser una mancha. */
const VELOCIDAD_POR_AMPERIO = 6
const VELOCIDAD_MAX = 16
/** Ancho (en unidades de la mesada) que tiene que entrar entre los dos HUD. */
const ANCHO_MAQUETA = 9.8
const ANCHO_HUD = 770
const ELEVACION = (46 * Math.PI) / 180

const FILAMENTO_FRIO = new THREE.Color(0x3a2a20)
const LUZ_BAJA = new THREE.Color(0xff5a1a)
const LUZ_ALTA = new THREE.Color(0xffc566)
const LUZ_BLANCA = new THREE.Color(0xfff2d0)

interface Pildora {
  el: HTMLElement
  ancla: THREE.Vector3
}

export type Accion = { tipo: 'lampara'; indice: number } | { tipo: 'interruptor' }

export function crearEscena(contenedor: HTMLElement) {
  const { scene, camera, renderer, render } = crearEscenario(contenedor)
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
  // La cámara queda más lejos que en el digestivo: el niebla por defecto apagaría la maqueta.
  if (scene.fog instanceof THREE.Fog) Object.assign(scene.fog, { near: 32, far: 70 })

  const objetivo = new THREE.Vector3(-0.9, 0.5, 0.2)
  const controles = new OrbitControls(camera, renderer.domElement)
  controles.target.copy(objetivo)
  controles.enableDamping = true
  controles.enablePan = false
  controles.minDistance = 7
  controles.maxDistance = 30
  controles.maxPolarAngle = Math.PI * 0.46
  let movida = false
  controles.addEventListener('start', () => (movida = true))
  function encuadrar() {
    const tan = Math.tan((camera.fov * Math.PI) / 360)
    const libre = Math.max(contenedor.clientWidth - ANCHO_HUD, 380)
    const d = Math.max((ANCHO_MAQUETA * contenedor.clientHeight) / (libre * 2 * tan), 12)
    camera.position.copy(objetivo).add(new THREE.Vector3(0, Math.sin(ELEVACION), Math.cos(ELEVACION)).multiplyScalar(d))
  }
  encuadrar()
  window.addEventListener('resize', () => !movida && encuadrar())

  // --- Mesada y luces ---
  const mesada = new THREE.Mesh(new RoundedBoxGeometry(15, 0.5, 8.6, 4, 0.12), new THREE.MeshStandardMaterial({ color: 0x17221f, roughness: 0.55, metalness: 0.3 }))
  mesada.position.set(-0.4, -0.25, 0)
  const borde = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: COLOR_MARCA }))
  borde.position.set(-0.4, -0.02, 4.3)
  const piso = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x0a1413, roughness: 0.9 }))
  piso.rotation.x = -Math.PI / 2
  piso.position.y = -0.55
  const luz = new THREE.DirectionalLight(0xffffff, 1.2)
  luz.position.set(4, 9, 6)
  const cielo = new THREE.PointLight(0x5ec8ff, 25, 22)
  cielo.position.set(5, 3, 4)
  scene.add(mesada, borde, piso, luz, cielo)

  // --- Piezas ---
  let voltajePila: number | null = null
  let pila = new THREE.Group()
  scene.add(pila)
  const interruptor = crearInterruptor()
  interruptor.grupo.position.set(X_INTERRUPTOR, 0, ZF)
  interruptor.grupo.userData.accion = { tipo: 'interruptor' } satisfies Accion
  scene.add(interruptor.grupo)
  const lamparas = Array.from({ length: MAX_LAMPARAS }, (_, i) => {
    const l = crearLamparita()
    l.grupo.userData.accion = { tipo: 'lampara', indice: i } satisfies Accion
    scene.add(l.grupo)
    return { ...l, presente: true, brillo: 0, objetivo: 0, quita: 0, quitaObjetivo: 0 }
  })
  const clickeables = [interruptor.grupo, ...lamparas.map((l) => l.grupo)]

  // --- Cables y electrones (una InstancedMesh para todos) ---
  const cables = new THREE.Group()
  scene.add(cables)
  const materialCable = new THREE.MeshStandardMaterial({ color: 0x5d6e69, roughness: 0.4, metalness: 0.6 })
  const materialCorto = new THREE.MeshStandardMaterial({ color: COLOR_MAGENTA, roughness: 0.4, emissive: COLOR_MAGENTA, emissiveIntensity: 0.25 })
  const electrones = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), MAX_ELECTRONES)
  electrones.frustumCulled = false
  scene.add(electrones)
  let aristas: Arista[] = []
  let velocidades: number[] = []
  let arista: number[] = []
  let avance: number[] = []
  let claveTrazado = ''

  function reconstruirCables(config: Config) {
    cables.children.forEach((m) => (m as THREE.Mesh).geometry.dispose())
    cables.clear()
    aristas = trazado(config.conexion, config.cantidad, config.voltaje, config.corto)
    arista = []
    avance = []
    aristas.forEach((a, k) => {
      const m = new THREE.Mesh(new THREE.TubeGeometry(a.curva, Math.ceil(a.curva.largo * 10), 0.065, 8, false), a.peligro ? materialCorto : materialCable)
      cables.add(m)
      const n = Math.max(2, Math.round(a.curva.largo * ELECTRONES_POR_UNIDAD))
      for (let i = 0; i < n && arista.length < MAX_ELECTRONES; i++) {
        arista.push(k)
        avance.push(((i + Math.random() * 0.3) / n) * a.curva.largo)
      }
    })
    electrones.count = arista.length
    for (let i = 0; i < arista.length; i++) electrones.setColorAt(i, COLOR_ELECTRON)
    if (electrones.instanceColor) electrones.instanceColor.needsUpdate = true
  }

  // --- Etiquetas HTML ancladas a las piezas ---
  const crearPildora = (clase = '') => {
    const el = document.createElement('div')
    el.className = `pildora ${clase}`
    contenedor.append(el)
    return el
  }
  const pildoras = {
    pila: crearPildora(),
    mas: crearPildora(),
    menos: crearPildora(),
    interruptor: crearPildora(),
    lamparas: lamparas.map(() => crearPildora('luz')),
    corto: crearPildora('peligro'),
  }
  pildoras.mas.textContent = '+'
  pildoras.menos.textContent = '−'
  pildoras.corto.textContent = 'Sin carga'
  const anclas = {
    pila: new THREE.Vector3(XB, 1.35, 0), mas: new THREE.Vector3(), menos: new THREE.Vector3(),
    interruptor: new THREE.Vector3(X_INTERRUPTOR, 1.1, ZF), corto: new THREE.Vector3(X_CORTO + 0.5, 0.5, 0),
  }
  const anclaLampara = lamparas.map(() => new THREE.Vector3())
  const todas: Pildora[] = [
    { el: pildoras.pila, ancla: anclas.pila }, { el: pildoras.mas, ancla: anclas.mas }, { el: pildoras.menos, ancla: anclas.menos },
    { el: pildoras.interruptor, ancla: anclas.interruptor }, { el: pildoras.corto, ancla: anclas.corto },
    ...pildoras.lamparas.map((el, i) => ({ el, ancla: anclaLampara[i] })),
  ]
  const proyectado = new THREE.Vector3()
  function ubicarPildoras() {
    for (const { el, ancla } of todas) {
      proyectado.copy(ancla).project(camera)
      el.style.left = `${(proyectado.x * 0.5 + 0.5) * contenedor.clientWidth}px`
      el.style.top = `${(-proyectado.y * 0.5 + 0.5) * contenedor.clientHeight}px`
    }
  }

  // --- Click sobre el interruptor y las lamparitas (sin confundirlo con arrastrar la cámara) ---
  const rayo = new THREE.Raycaster()
  const puntero = new THREE.Vector2()
  let alTocar: (a: Accion) => void = () => {}
  let inicio = { x: 0, y: 0 }
  function accionEn(e: PointerEvent): Accion | null {
    puntero.set((e.offsetX / contenedor.clientWidth) * 2 - 1, -(e.offsetY / contenedor.clientHeight) * 2 + 1)
    rayo.setFromCamera(puntero, camera)
    const hit = rayo.intersectObjects(clickeables, true)[0]
    for (let o: THREE.Object3D | null = hit?.object ?? null; o; o = o.parent) if (o.userData.accion) return o.userData.accion as Accion
    return null
  }
  renderer.domElement.addEventListener('pointerdown', (e) => (inicio = { x: e.clientX, y: e.clientY }))
  renderer.domElement.addEventListener('pointerup', (e) => {
    const a = Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) < 5 ? accionEn(e) : null
    if (a) alTocar(a)
  })
  renderer.domElement.addEventListener('pointermove', (e) => {
    renderer.domElement.style.cursor = accionEn(e) ? 'pointer' : ''
  })

  let anguloPalanca = 0
  let anguloObjetivo = 0
  const matriz = new THREE.Matrix4()
  const pos = new THREE.Vector3()
  const giro = new THREE.Quaternion()
  const escala = new THREE.Vector3()
  const colorLuz = new THREE.Color()
  let previo = 0

  return {
    onTocar: (cb: (a: Accion) => void) => (alTocar = cb),
    /** Aplica un cambio de configuración: reconstruye lo que haga falta y fija los objetivos de animación. */
    aplicar(config: Config, r: Resultado, textos: { pila: string; lamparas: string[]; interruptor: string }) {
      if (config.voltaje !== voltajePila) {
        scene.remove(pila)
        pila.traverse((o) => o instanceof THREE.Mesh && o.geometry.dispose())
        pila = crearPila(config.voltaje)
        pila.position.x = XB
        scene.add(pila)
        voltajePila = config.voltaje
        const hl = mediaLargoPila(config.voltaje)
        anclas.mas.set(XB, BY + 0.6, -hl - 0.1)
        anclas.menos.set(XB, BY + 0.6, hl + 0.1)
      }
      const clave = `${config.conexion}-${config.cantidad}-${config.voltaje}-${config.corto}`
      if (clave !== claveTrazado) {
        reconstruirCables(config)
        claveTrazado = clave
      }
      velocidades = aristas.map((a) => Math.min(a.corriente(r) * VELOCIDAD_POR_AMPERIO, VELOCIDAD_MAX))
      lamparas.forEach((l, i) => {
        // El grupo siempre queda visible: sacar una PointLight de la escena recompilaría los shaders.
        l.presente = i < config.cantidad
        l.grupo.children.forEach((c) => c !== l.luz && (c.visible = l.presente))
        const x = xLampara(i, config.cantidad)
        const z = config.conexion === 'serie' ? ZB : 0
        l.grupo.position.set(x, 0, z)
        anclaLampara[i].set(x, (config.conexion === 'serie' ? 2.15 : 2.5) + (i % 2) * 0.75, z)
        l.objetivo = r.lamparas[i].brillo
        l.quitaObjetivo = config.sacadas[i] ? 1 : 0
        pildoras.lamparas[i].textContent = textos.lamparas[i]
        pildoras.lamparas[i].classList.toggle('activa', r.lamparas[i].brillo > 0.02)
        pildoras.lamparas[i].style.display = i < config.cantidad ? '' : 'none'
      })
      anguloObjetivo = config.cerrado ? 0 : 0.75
      pildoras.pila.textContent = textos.pila
      pildoras.interruptor.textContent = textos.interruptor
      pildoras.corto.style.display = config.corto ? '' : 'none'
    },
    dibujar(ahora: number) {
      const dt = Math.min(ahora - previo, 0.1)
      previo = ahora
      const suavizar = (tau: number) => 1 - Math.exp(-dt / tau)

      lamparas.forEach((l) => {
        l.brillo += (l.objetivo - l.brillo) * suavizar(0.18)
        l.quita += (l.quitaObjetivo - l.quita) * suavizar(0.12)
        const b = Math.min(l.brillo, 4)
        const t = Math.min(b / 1.2, 1)
        colorLuz.copy(LUZ_BAJA).lerp(LUZ_ALTA, t).lerp(LUZ_BLANCA, Math.min(Math.max(b - 1.3, 0) / 1.5, 1))
        l.vidrio.emissive.copy(colorLuz)
        l.vidrio.emissiveIntensity = b < 0.005 ? 0 : 0.04 + Math.pow(b, 0.75) * 0.45
        l.filamento.color.copy(FILAMENTO_FRIO).lerp(colorLuz, Math.min(b * 3, 1)).multiplyScalar(1 + b)
        l.luz.color.copy(colorLuz)
        l.luz.intensity = Math.pow(b, 0.8) * 9 * (1 - l.quita)
        l.bombilla.visible = l.presente && l.quita < 0.98
        l.bombilla.position.y = 0.3 + l.quita * 1.2
        l.bombilla.scale.setScalar(Math.max(1 - l.quita, 0.001))
      })

      anguloPalanca += (anguloObjetivo - anguloPalanca) * suavizar(0.08)
      interruptor.palanca.rotation.z = anguloPalanca

      for (let i = 0; i < arista.length; i++) {
        const a = aristas[arista[i]]
        avance[i] = (avance[i] + velocidades[arista[i]] * dt) % a.curva.largo
        a.curva.getPoint(avance[i] / a.curva.largo, pos)
        matriz.compose(pos, giro, escala.setScalar(0.085))
        electrones.setMatrixAt(i, matriz)
      }
      electrones.instanceMatrix.needsUpdate = true

      ubicarPildoras()
      controles.update()
      render()
    },
  }
}
