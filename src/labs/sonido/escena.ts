import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { encuadrarEntreHuds } from '../../escena/encuadre'
import { crearEscenario } from '../../escena/escenario'
import { crearPildoras } from '../../escena/pildoras'
import { numero } from '../../ui/formato'
import { AIRE_MIN, MEDIOS, P_ATM, T_EMISION, llegada, longitudOnda, type Config, type Estado, type MedioId } from './model'
import { F_VISUAL } from './onda'
import { L_U, crearTubo } from './tubo'

/** Ancho de la maqueta que tiene que entrar en el hueco libre entre los dos HUD. */
const ANCHO_MAQUETA = 11.4
const Y: Record<MedioId, number> = { aire: 3.4, agua: 1.7, acero: 0 }
const num = numero
/** Corrimiento del banco a la izquierda: a la derecha del tubo va la bomba, que pesa más que la caja de la fuente. */
const BANCO_X = 0.35
/** Dónde cae en la escena el extremo izquierdo de los tubos. */
const X0 = -L_U / 2 - BANCO_X

/** Cuánto aire queda en el tubo: en % hasta el 1 %, y en pascales después. */
function textoAire(aire: number): string {
  if (aire > 0.01) return `Aire ${num(aire * 100, aire > 0.1 ? 0 : 1)} %`
  const pa = aire * P_ATM
  return `Aire ${num(pa, pa < 10 ? 1 : 0)} Pa`
}

export function crearEscena(contenedor: HTMLElement) {
  const { scene, camera, renderer, render } = crearEscenario(contenedor, { bloom: 0.15, niebla: { cerca: 24, lejos: 55 } })
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
  const controles = new OrbitControls(camera, renderer.domElement)
  controles.target.set(0, 1.7, 0)
  controles.enableDamping = true
  controles.minDistance = 7
  controles.maxDistance = 26
  controles.maxPolarAngle = Math.PI * 0.55
  encuadrarEntreHuds(camera, contenedor, ({ libre, alto }) => {
    const dist = Math.max(13, ANCHO_MAQUETA / ((Math.max(libre, 200) / alto) * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))))
    camera.position.set(0, 4, dist)
  })

  // Todo el banco queda centrado: el tubo va de −L/2 a L/2.
  const banco = new THREE.Group()
  banco.position.x = X0
  scene.add(banco)

  const fondo = new THREE.Mesh(new THREE.BoxGeometry(44, 6.6, 0.12), new THREE.MeshStandardMaterial({ color: 0x0f1b19, roughness: 0.7, metalness: 0.2 }))
  fondo.position.set(L_U / 2, 1.7, -0.95)
  const borde = new THREE.Mesh(new THREE.BoxGeometry(44, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: 0xc6f35e }))
  borde.position.set(L_U / 2, -1.6, -0.88)
  const piso = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x0a1413, roughness: 0.9 }))
  piso.rotation.x = -Math.PI / 2
  piso.position.y = -1.65
  scene.add(piso)
  banco.add(fondo, borde)

  const tubos = MEDIOS.map((m) => crearTubo(m.id, Y[m.id]))
  banco.add(...tubos.map((t) => t.grupo))

  // --- Bomba de vacío conectada al tubo de aire, con su manómetro (la aguja sigue el logaritmo de la presión) ---
  const metal = new THREE.MeshStandardMaterial({ color: 0x24332f, roughness: 0.4, metalness: 0.6 })
  const bomba = new THREE.Group()
  bomba.position.set(L_U + 0.95, Y.aire, 0)
  const cuerpoBomba = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), metal)
  const cuello = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.35, 16).rotateZ(Math.PI / 2), metal)
  cuello.position.x = -0.6
  const luzBomba = new THREE.MeshStandardMaterial({ color: 0x1d2a27, emissive: 0xffc857, emissiveIntensity: 0 })
  const piloto = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), luzBomba)
  piloto.position.set(0.25, 0.3, 0.46)
  const esfera = new THREE.Mesh(new THREE.CircleGeometry(0.24, 32), new THREE.MeshBasicMaterial({ color: 0x0a1413 }))
  esfera.position.set(-0.1, -0.05, 0.455)
  const aguja = new THREE.Group()
  aguja.position.set(-0.1, -0.05, 0.47)
  const palito = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.2, 0.01), new THREE.MeshBasicMaterial({ color: 0xffc857 }))
  palito.position.y = 0.09
  aguja.add(palito)
  bomba.add(cuerpoBomba, cuello, piloto, esfera, aguja)
  banco.add(bomba)

  // --- Luces ---
  const luz = new THREE.DirectionalLight(0xffffff, 1.4)
  luz.position.set(4, 8, 8)
  const ambar = new THREE.PointLight(0xffc857, 25, 24)
  ambar.position.set(-8, 2, 4)
  const cielo = new THREE.PointLight(0x5ec8ff, 25, 24)
  cielo.position.set(8, 0, 4)
  scene.add(luz, ambar, cielo)

  // --- Pastillas ancladas ---
  const pildoras = crearPildoras(contenedor, camera)
  const rotulos = Object.fromEntries(MEDIOS.map((m) => [m.id, pildoras.crear('', { ancla: new THREE.Vector3(X0 - 0.2, Y[m.id] + 0.95, 0), origen: 'izquierda' })])) as Record<MedioId, ReturnType<typeof pildoras.crear>>
  const micros = Object.fromEntries(MEDIOS.map((m) => [m.id, pildoras.crear('', { ancla: new THREE.Vector3(0, Y[m.id] - 0.95, 0), clase: 'p-mic' })])) as Record<MedioId, ReturnType<typeof pildoras.crear>>
  const pBomba = pildoras.crear('', { ancla: new THREE.Vector3(X0 + L_U + 0.95, Y.aire + 0.95, 0) })

  let fase = 0
  let anterior = performance.now()
  return {
    /** `corriendo` congela la fase del tono; la agitación sigue (las partículas no se paran nunca). */
    dibujar(c: Config, e: Estado, corriendo: boolean, ahora: number) {
      const dt = Math.min((ahora - anterior) / 1000, 0.1)
      anterior = ahora
      if (corriendo) fase += 2 * Math.PI * F_VISUAL * dt
      for (const t of tubos) t.dibujar(c, e, fase, ahora / 1000)

      for (const m of MEDIOS) {
        const lambda = longitudOnda(m.id, c.frecuencia)
        rotulos[m.id].texto(`${m.nombre} · ${num(m.v, 0)} m/s${c.modo === 'tono' ? ` · λ ${num(lambda, lambda < 1 ? 2 : 1)} m` : ''}`)
        const mic = micros[m.id]
        mic.ancla.set(tubos.find((t) => t.id === m.id)!.micX() + X0, Y[m.id] - 0.95, 0)
        const tLleg = llegada(m.id, c.distancia)
        const llego = e.golpe !== null && e.golpe >= T_EMISION + tLleg
        mic.texto(c.modo === 'tono' ? `${num(c.distancia, 1)} m` : `${num(c.distancia, 1)} m · ${llego ? 'llegó a' : 'llega a'} ${num(tLleg * 1000, 1)} ms`)
      }
      pBomba.el.hidden = !c.bomba && e.aire > 0.9999
      pBomba.texto(textoAire(e.aire))
      pBomba.el.classList.toggle('activa', c.bomba)
      luzBomba.emissiveIntensity = c.bomba && e.aire > AIRE_MIN * 1.05 ? 1.2 : 0
      const marca = Math.log10(Math.max(e.aire, AIRE_MIN) / AIRE_MIN) / Math.log10(1 / AIRE_MIN)
      aguja.rotation.z = 0.75 * Math.PI - 1.5 * Math.PI * marca
      pildoras.ubicar()
      controles.update()
      render()
    },
  }
}
