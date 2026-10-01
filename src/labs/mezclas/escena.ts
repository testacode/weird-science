import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { encuadrarEntreHuds } from '../../escena/encuadre'
import { crearEscenario } from '../../escena/escenario'
import { crearPildoras } from '../../escena/pildoras'
import { numero } from '../../ui/formato'
import type { MetodoId } from './datos'
import { DETALLE, X_VASO, crearEstaciones } from './estaciones'
import type { Corrida, Lectura } from './model'
import { crearParticulas } from './particulas'
import { metal, vasoPrecipitados } from './piezas'

/** Qué parte de la mesada se encuadra con cada método: centro (x) y ancho que tiene que entrar en el hueco entre los HUD. */
const ENCUADRE: Record<MetodoId, { x: number; ancho: number }> = {
  tamiz: { x: -1.1, ancho: 7.6 },
  filtro: { x: -1.1, ancho: 7.6 },
  decantacion: { x: -1.1, ancho: 7.6 },
  destilacion: { x: 0.2, ancho: 10 },
  iman: { x: -2.4, ancho: 5.6 },
}

export interface CuadroEscena {
  lectura: Lectura | null
  iniciado: boolean
  ahora: number
}

export function crearEscena(contenedor: HTMLElement) {
  const { scene, camera, renderer, render } = crearEscenario(contenedor, { bloom: 0.12, niebla: { cerca: 24, lejos: 55 } })
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
  const controles = new OrbitControls(camera, renderer.domElement)
  controles.target.set(-1.1, 1.9, 0)
  controles.enableDamping = true
  controles.minDistance = 8
  controles.maxDistance = 30
  controles.maxPolarAngle = Math.PI * 0.55
  // La cámara se acomoda sola al cambiar de método o de ventana, y después queda en manos del usuario.
  let hueco = { libre: 600, alto: 800 }
  let acomodando = 0
  const distanciaPara = (ancho: number) => Math.max(9, ancho / ((Math.max(hueco.libre, 200) / hueco.alto) * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))))
  encuadrarEntreHuds(camera, contenedor, (h) => {
    hueco = h
    acomodando = 1.5
  })

  // --- Mesada ---
  const mesada = new THREE.Mesh(new RoundedBoxGeometry(11.4, 0.45, 4.2, 4, 0.12), new THREE.MeshStandardMaterial({ color: 0x17221f, roughness: 0.55, metalness: 0.3 }))
  mesada.position.set(0.3, -0.225, 0)
  const borde = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: 0xc6f35e }))
  borde.position.set(0.3, 0.0, 2.1)
  const piso = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x0a1413, roughness: 0.9 }))
  piso.rotation.x = -Math.PI / 2
  piso.position.y = -0.48
  scene.add(mesada, borde, piso)

  // --- Vaso de mezcla y estaciones (solo se ve la elegida) ---
  const vasoMezcla = vasoPrecipitados(0.78, 1.9)
  vasoMezcla.position.set(X_VASO, 0, 0)
  const pie = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.02, 40), metal())
  pie.position.set(X_VASO, 0.01, 0)
  scene.add(vasoMezcla, pie)
  const estaciones = crearEstaciones()
  for (const e of Object.values(estaciones)) {
    e.grupo.visible = false
    scene.add(e.grupo)
  }
  const particulas = crearParticulas(scene)

  // --- Luces ---
  const luz = new THREE.DirectionalLight(0xffffff, 1.2)
  luz.position.set(4, 9, 7)
  const ambar = new THREE.PointLight(0xffc857, 40, 28)
  ambar.position.set(-7, 2, 4)
  const cielo = new THREE.PointLight(0x5ec8ff, 40, 28)
  cielo.position.set(7, 0, 4)
  scene.add(luz, ambar, cielo)

  // --- Pastillas ancladas ---
  const pildoras = crearPildoras(contenedor, camera)
  const pVaso = pildoras.crear('', { ancla: new THREE.Vector3(X_VASO, 2.55, 0) })
  const nombre = document.createElement('span')
  const detalle = document.createElement('span')
  detalle.className = 'avanzado'
  const pEstacion = pildoras.crear('', { multilinea: true })
  pEstacion.el.replaceChildren(nombre, detalle)
  const pOrigen = pildoras.crear('', { clase: 'origen' })
  const pSalida = pildoras.crear('', { clase: 'salida' })
  const pTemp = pildoras.crear('', { clase: 'temp' })

  let metodo: MetodoId = 'tamiz'
  let firma = ''
  let ultimo = performance.now()
  let primera = true

  function preparar(corrida: Corrida) {
    // Solo un cambio de método reencuadra la cámara: tocar el mechero no le pisa el zoom al usuario.
    if (metodo !== corrida.config.metodo || primera) acomodando = 1.5
    metodo = corrida.config.metodo
    for (const [id, e] of Object.entries(estaciones)) e.grupo.visible = id === metodo
    const e = estaciones[metodo]
    nombre.textContent = e.rotulos.estacion
    detalle.textContent = DETALLE[metodo]
    pEstacion.ancla.copy(e.anclas.estacion)
    pOrigen.ancla.copy(e.anclas.origen)
    pSalida.ancla.copy(e.anclas.salida)
    if (e.anclas.temp) pTemp.ancla.copy(e.anclas.temp)
    pTemp.el.hidden = !e.anclas.temp
    const nueva = corrida.porciones.map((p) => `${p.id}:${p.masa}`).join('|')
    if (nueva !== firma) {
      firma = nueva
      particulas.configurar(corrida)
      pVaso.texto(`Mezcla · ${numero(corrida.porciones.reduce((s, p) => s + p.masa, 0), 0)} g`)
    }
    particulas.reiniciar()
  }

  function dibujar({ lectura, iniciado, ahora }: CuadroEscena, tMechero: number) {
    const dt = Math.min((ahora - ultimo) / 1000, 0.1)
    ultimo = ahora
    const e = estaciones[metodo]
    if (acomodando > 0) {
      const { x, ancho } = ENCUADRE[metodo]
      const k = primera ? 1 : 1 - Math.exp(-5 * dt)
      const alto = 3.4
      controles.target.x += (x - controles.target.x) * k
      camera.position.x += (x - camera.position.x) * k
      camera.position.y += (alto + 0.4 - camera.position.y) * k
      camera.position.z += (distanciaPara(ancho) - camera.position.z) * k
      acomodando -= dt
      primera = false
    }
    // Antes de hervir el balón ya se agita un poco, más cuanto más caliente.
    const calentando = metodo === 'destilacion' && lectura?.temp ? Math.min(1, Math.max(0, (lectura.temp - 60) / 60)) * 0.5 : 0
    const hierve = metodo === 'destilacion' && !!lectura && !lectura.terminado && lectura.salida.some((g) => g > 0)
    e.animar?.({ lectura, iniciado, dt, ahora, tMechero })
    particulas.actualizar({ dt, ahora, estacion: e, lectura, iniciado, agitacion: hierve ? 1 : calentando })

    const sale = lectura ? lectura.salida.reduce((s, g) => s + g, 0) : 0
    const total = lectura ? lectura.salida.reduce((s, g, i) => s + g + lectura.queda[i], 0) : 0
    pEstacion.el.classList.toggle('activa', iniciado && !!lectura && !lectura.terminado)
    pOrigen.texto(`${e.rotulos.origen} · ${numero(total - sale, 0)} g`)
    pSalida.texto(`${e.rotulos.salida} · ${numero(sale, 0)} g`)
    pSalida.el.classList.toggle('activa', sale > 0.5)
    pTemp.texto(lectura?.temp != null ? `Balón ${numero(lectura.temp)} °C` : '')
    pildoras.ubicar()
    controles.update()
    render()
  }

  return { preparar, dibujar }
}
