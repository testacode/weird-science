import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { encuadrarEntreHuds } from '../../escena/encuadre'
import { crearEscenario, FONDO } from '../../escena/escenario'
import { crearPildoras, type OpcionesPildora } from '../../escena/pildoras'
import { numero } from '../../ui/formato'
import { crearAire } from './aire'
import { crearAlveolo } from './alveolo'
import { GEO, crearPulmones } from './pulmones'
import { ACTIVIDADES, FICO2, type Config, type Derivados, type Estado } from './model'

/** Lo que tiene que entrar a lo ancho (la maqueta, plinto incluido) y a lo alto, y los px que ocupa el zoom al costado. */
const ANCHO_MAQUETA = 4.8
const ALTO_MUNDO = 6.9
const ANCHO_ZOOM = 250
const CENTRO = new THREE.Vector3(0, 3.0, 0)
/** Fracción del ciclo que dura la inspiración (la espiración es más larga). */
const INSPIRACION = 0.4

/** Volumen relativo (0 vacío, 1 lleno) a lo largo de un ciclo de respiración. */
export function volumenEn(fase: number): number {
  return fase < INSPIRACION ? 0.5 * (1 - Math.cos((Math.PI * fase) / INSPIRACION)) : 0.5 * (1 + Math.cos((Math.PI * (fase - INSPIRACION)) / (1 - INSPIRACION)))
}

export function crearEscena(contenedor: HTMLElement) {
  const { scene, camera, renderer, render } = crearEscenario(contenedor, { bloom: 0.2, niebla: { cerca: 30, lejos: 60 } })
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture

  const controles = new OrbitControls(camera, renderer.domElement)
  controles.target.copy(CENTRO)
  controles.enableDamping = true
  controles.enablePan = false
  controles.maxPolarAngle = Math.PI * 0.49
  const alveolo = crearAlveolo(contenedor)
  camera.position.copy(CENTRO).add(new THREE.Vector3(0.2, 0.7, 4))
  encuadrarEntreHuds(camera, contenedor, ({ libre, alto, der }) => {
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    // La maqueta ocupa el hueco menos el zoom, que va a la derecha: se corre el centro para dejarle lugar.
    const util = Math.max(libre - ANCHO_ZOOM, 300)
    const distancia = Math.max((ANCHO_MAQUETA * alto) / (util * 2 * tan), ALTO_MUNDO / (2 * tan)) * 1.04
    const direccion = camera.position.clone().sub(controles.target).normalize()
    controles.target.x = ((ANCHO_ZOOM / 2) * (2 * distancia * tan)) / alto
    camera.position.copy(controles.target).addScaledVector(direccion, distancia)
    controles.minDistance = distancia * 0.6
    controles.maxDistance = distancia * 1.3
    scene.fog = new THREE.Fog(FONDO, distancia + 14, distancia + 34)
    alveolo.el.style.right = `${der + 22}px`
  })

  const mesada = new THREE.Mesh(new RoundedBoxGeometry(8, 0.5, 4.4, 4, 0.12), new THREE.MeshStandardMaterial({ color: 0x0f1917, roughness: 0.6, metalness: 0.2 }))
  mesada.position.set(0, -0.25, 0)
  const piso = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x0a1413, roughness: 0.9 }))
  piso.rotation.x = -Math.PI / 2
  piso.position.y = -0.52
  const borde = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: 0xc6f35e }))
  borde.position.set(0, -0.005, 2.2)
  const luz = new THREE.DirectionalLight(0xffffff, 1.3)
  luz.position.set(3, 9, 6)
  const acento = new THREE.PointLight(0x5ec8ff, 22, 20)
  acento.position.set(-4, 3, 4)
  scene.add(mesada, borde, piso, luz, acento)

  const pulmones = crearPulmones(scene)
  const aire = crearAire(scene, pulmones.punto)

  const rotulos = crearPildoras(contenedor, camera)
  const fijo = (texto: string, x: number, y: number, z = 0.5, opciones: OpcionesPildora = {}) => rotulos.crear(texto, { ancla: new THREE.Vector3(x, y, z), origen: 'izquierda', dx: 10, ...opciones })
  fijo('Tráquea', 0.3, 4.7, 0)
  fijo('Pulmón', 2.0, 3.6, 0.5)
  rotulos.crear('Diafragma', { ancla: new THREE.Vector3(0, GEO.base - 0.02, 1.5) })
  rotulos.crear('Corazón', { ancla: new THREE.Vector3(-0.1, 2.15, 0.5), dy: 26 })
  // Aire que entra y sale, al costado de la tráquea (a la derecha, lejos del HUD izquierdo).
  const entra = fijo('', 0.3, GEO.traqueaTope + 0.1, 0, { clase: 'p-aire' })
  const sale = fijo('', 0.3, GEO.traqueaTope - 0.3, 0, { clase: 'p-aire' })

  let fase = 0
  let volumen = 0
  let amplitud = 0.5
  return {
    /** Vuelve al comienzo de una exhalación (al soltar la respiración). */
    exhalar() {
      fase = INSPIRACION
    },
    /** `dt`: segundos reales (0 en pausa). */
    dibujar(c: Config, d: Derivados, e: Estado, dt: number) {
      // El dibujo respira en tiempo real, a la frecuencia elegida; la química del cuerpo va acelerada.
      if (!c.aguanta) fase = (fase + (dt * c.frecuencia) / 60) % 1
      amplitud += ((c.aguanta ? 3 : c.volumen) - amplitud) * Math.min(dt * 4, 1)
      // Al aguantar, los pulmones se llenan y se quedan así.
      const nuevo = c.aguanta ? volumen + (1 - volumen) * Math.min(dt * 2.5, 1) : volumenEn(fase)
      const dv = nuevo - volumen
      volumen = nuevo

      const dy = volumen * (0.1 + 0.2 * amplitud)
      const estiramiento = (GEO.pulmonAlto + dy) / GEO.pulmonAlto
      pulmones.actualizar(dy, 1 + (estiramiento - 1) * 0.9, d.spo2, c.actividad, dt)
      aire.actualizar(dv, 0.9 + 0.5 * amplitud, d.sale ? { o2: d.sale.o2 / 100, co2: d.sale.co2 / 100 } : null)

      entra.texto(`Entra · 21 % O₂ · ${numero(FICO2 * 100, 2)} % CO₂`)
      sale.texto(d.sale ? `Sale · ${numero(d.sale.o2, 0)} % O₂ · ${numero(d.sale.co2, 1)} % CO₂` : 'Sale · nada (aguantando)')

      // Cuántos gases cruzan la pared del alvéolo: crece con lo que pide el cuerpo (el CO₂ producido va con el O₂ gastado).
      const flujo = 0.2 + (0.8 * d.vo2) / ACTIVIDADES.correr.vo2
      alveolo.actualizar({ pao2: e.pao2, paco2: e.paco2, spo2: d.spo2, flujoO2: flujo, flujoCo2: flujo, respira: !c.aguanta }, dt)
      rotulos.ubicar()
      controles.update()
      render()
    },
  }
}
