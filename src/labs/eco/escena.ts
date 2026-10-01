import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { encuadrarEntreHuds } from '../../escena/encuadre'
import { crearEscenario } from '../../escena/escenario'
import { crearPildoras } from '../../escena/pildoras'
import { numero } from '../../ui/formato'
import { nivelEco, recorrido, ruido, superficie, tiempoEco, tiempoFinal, type Config, type Estado, type SuperficieId } from './model'
import { Y_MAR, crearMuros, crearMar, crearBarco, crearPersona } from './piezas'

/** Largo de la maqueta entre la fuente y la superficie, en unidades de la escena (el sonar es vertical y más corto). */
const LARGO = { aire: 10, agua: 6 } as const
/** Lo que tiene que entrar en pantalla: ancho × alto de cada maqueta, y la altura de su centro. */
const MARCO = { aire: { ancho: 13.4, alto: 7, y: 1.1 }, agua: { ancho: 9, alto: 9, y: 0.4 } } as const
/** El frente se ve hasta 2,4 veces la distancia a la superficie (2 = vuelve a la fuente). */
const R_MAX = 2.4
const COLOR_GRITO = 0xffc857
const COLOR_ECO = 0xff5fa2

export function crearEscena(contenedor: HTMLElement) {
  const { scene, camera, renderer, render } = crearEscenario(contenedor, { bloom: 0.22, niebla: { cerca: 30, lejos: 70 } })
  renderer.localClippingEnabled = true
  const controles = new OrbitControls(camera, renderer.domElement)
  controles.enableDamping = true
  controles.minDistance = 6
  controles.maxDistance = 40
  controles.minPolarAngle = Math.PI * 0.32
  controles.maxPolarAngle = Math.PI * 0.55
  controles.minAzimuthAngle = -0.7
  controles.maxAzimuthAngle = 0.7

  let hueco = { libre: 900, alto: 700 }
  let medio: 'aire' | 'agua' = 'aire'
  function encuadrar() {
    const m = MARCO[medio]
    const k = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const dist = Math.max(m.ancho / ((Math.max(hueco.libre, 200) / hueco.alto) * k), m.alto / k) * 1.04
    camera.position.set(0, m.y + dist * 0.2, dist)
    controles.target.set(0, m.y, 0)
  }
  encuadrarEntreHuds(camera, contenedor, ({ libre, alto }) => {
    hueco = { libre, alto }
    encuadrar()
  })

  // --- Luces ---
  scene.add(new THREE.HemisphereLight(0xcfe9ff, 0x14201d, 1.1))
  const sol = new THREE.DirectionalLight(0xffffff, 1.5)
  sol.position.set(-4, 9, 10)
  scene.add(sol)

  // --- Piso (aire) y mar (agua) ---
  const piso = new THREE.Mesh(new THREE.BoxGeometry(22, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0x15261f, roughness: 0.9 }))
  piso.position.y = -1.4
  const mar = crearMar(Y_MAR)
  scene.add(piso, mar.grupo)

  // --- El eje del sonido: la fuente en el origen y la superficie a LARGO. En el sonar, el eje apunta hacia abajo. ---
  const eje = new THREE.Group()
  scene.add(eje)
  const persona = crearPersona()
  const barco = crearBarco()
  const muros = crearMuros()
  eje.add(persona, barco, muros.grupo)

  const guia = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x93a8a0, transparent: true, opacity: 0.6 }))
  eje.add(guia)

  // Anillos del frente de onda: el que sale (centro en la fuente) y el reflejado (centro en la imagen de la fuente, detrás de la superficie).
  // Tres planos de corte (en el sistema del eje): no pasa de la superficie y el frente queda en una franja alrededor del eje.
  const planos = [new THREE.Plane(), new THREE.Plane(), new THREE.Plane()]
  const planosLocal = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 1), new THREE.Plane(new THREE.Vector3(0, -1, 0), 1), new THREE.Plane(new THREE.Vector3(0, 1, 0), 1)]
  const anillo = (color: number) => {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.985, 1, 128),
      new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, clippingPlanes: planos }),
    )
    m.renderOrder = 3
    m.visible = false
    eje.add(m)
    return m
  }
  const salida = anillo(COLOR_GRITO)
  const vuelta = anillo(COLOR_ECO)

  const pildoras = crearPildoras(contenedor, camera)
  const pFuente = pildoras.crear('', { clase: 'p-fuente' })
  const pSuperficie = pildoras.crear('')
  const pEco = pildoras.crear('', { clase: 'p-eco' })
  const pDistancia = pildoras.crear('')

  /** Punto del mundo a `x` metros-escena sobre el eje y `lado` a un costado. */
  const aMundo = (x: number, lado: number) => eje.localToWorld(new THREE.Vector3(x, lado, 0))
  let escenarioActual: SuperficieId | null = null
  /** Largo dibujado (cambia suave cuando cambia la distancia). */
  let largo: number = LARGO.aire
  let largoDibujado = -1

  function cambiarEscenario(c: Config) {
    const s = superficie(c.superficie)
    medio = s.medio
    escenarioActual = c.superficie
    const aire = medio === 'aire'
    eje.position.y = aire ? 0.3 : Y_MAR
    eje.rotation.z = aire ? 0 : -Math.PI / 2
    persona.visible = aire
    barco.visible = !aire
    piso.visible = aire
    mar.grupo.visible = !aire
    muros.mostrar(c.superficie)
    largoDibujado = -1
    planosLocal[1].constant = aire ? 2.4 : 2.8
    planosLocal[2].constant = aire ? 1.5 : 2.8
    guia.position.y = aire ? -1.05 : 1.15
    encuadrar()
  }

  return {
    /** `distanciaVisible`: en el modo medir la distancia queda escondida. */
    dibujar(c: Config, e: Estado, distanciaVisible: boolean) {
      if (c.superficie !== escenarioActual) cambiarEscenario(c)
      const aire = medio === 'aire'
      // La superficie se ve más lejos cuanto mayor es la distancia (entre 30 % y 100 % del largo); en el modo medir no delata el valor.
      const { min, max } = superficie(c.superficie).distancia
      const objetivo = LARGO[medio] * (distanciaVisible ? 0.3 + (0.7 * (c.distancia - min)) / (max - min) : 1)
      largo += (objetivo - largo) * 0.2
      if (Math.abs(objetivo - largo) < 0.002) largo = objetivo
      if (largo !== largoDibujado) {
        largoDibujado = largo
        muros.mover(largo)
        mar.ajustar(largo)
        planosLocal[0].constant = largo
        guia.geometry.setFromPoints([[0, 0], [largo, 0], [0, -0.12], [0, 0.12], [largo, -0.12], [largo, 0.12]].map(([x, y]) => new THREE.Vector3(x, y, 0)))
      }
      eje.position.x = aire ? -largo / 2 : 0
      eje.updateMatrixWorld()
      planos.forEach((p, i) => p.copy(planosLocal[i]).applyMatrix4(eje.matrixWorld))

      // Frente de onda: R = recorrido / distancia. Sale hasta R = 1 y, reflejado, vuelve hasta R = 2.
      const R = recorrido(e, c)
      const sale = e.t !== null && R > 0 && R <= 1
      salida.visible = sale
      if (sale) {
        salida.scale.setScalar(R * largo)
        ;(salida.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - R * 0.35)
      }
      // El eco dibujado se apaga solo: del final de la ida (R = 2, de vuelta en la fuente) hasta el final del experimento.
      const fin = Math.min(R_MAX, (2 * tiempoFinal(c)) / tiempoEco(c))
      const vuelve = R > 1 && R < fin
      vuelta.visible = vuelve
      // El eco dibujado es más tenue cuanto más cae respecto del ruido: 0 dB sobre el ruido casi no se ve.
      const margen = Math.max(0, Math.min(1, (nivelEco(c) - ruido(c)) / Math.max(1, c.volumen - ruido(c))))
      const fuerza = 0.1 + 0.85 * Math.sqrt(margen)
      if (vuelve) {
        vuelta.position.x = 2 * largo
        vuelta.scale.setScalar(R * largo)
        ;(vuelta.material as THREE.MeshBasicMaterial).opacity = fuerza * (R > 2 ? Math.max(0, 1 - (R - 2) / (fin - 2)) : 1)
      }

      // Pastillas.
      pFuente.ancla.copy(aMundo(0, aire ? 1.1 : -1.3))
      pFuente.texto(aire ? `Vos · grito de ${numero(c.volumen, 0)} dB` : `Barco · ping de ${numero(c.volumen, 0)} dB (rel.)`)
      pSuperficie.ancla.copy(aMundo(largo, aire ? 2.2 : -3.7))
      pSuperficie.texto(superficie(c.superficie).nombre)
      pDistancia.ancla.copy(aMundo(largo / 2, aire ? -1.55 : 1.9))
      pDistancia.texto(distanciaVisible ? `${numero(c.distancia, 0)} m` : '? m')
      pEco.el.hidden = !(vuelve && R <= 2.05)
      if (!pEco.el.hidden) {
        pEco.ancla.copy(aMundo(2 * largo - R * largo, aire ? 1.6 : 1.9))
        pEco.texto(`eco · ${numero(nivelEco(c), 0)} dB`)
      }
      pildoras.ubicar()
      controles.update()
      render()
    },
  }
}
