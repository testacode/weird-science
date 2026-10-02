import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { encuadrarEntreHuds } from '../../escena/encuadre'
import { FONDO, crearEscenario } from '../../escena/escenario'
import { crearPildoras } from '../../escena/pildoras'
import { numero } from '../../ui/formato'
import { crearBloque, type Bloque } from './bloque'
import { crearFlujo } from './flujo'
import { FONDO_Y, GEO, W, XT, y, type Geo } from './geometria'
import { FUSION, PROFUNDIDAD, explosividad, logViscosidad, type Borde, type Config, type Estado } from './model'
import { crearNube, rampa } from './nube'
import { crearVolcan } from './volcan'

/** Lo que tiene que entrar a lo ancho y a lo alto (unidades): el corte con sus rótulos y la columna de ceniza. */
const ANCHO_MUNDO = 12.5
const ALTO_MUNDO = 11.5
const CENTRO = new THREE.Vector3(0, -0.6, -1)

export const viscosidadNormal = (silice: number) => THREE.MathUtils.clamp((logViscosidad(silice) - 1.5) / 6.5, 0, 1)

export function crearEscena(contenedor: HTMLElement) {
  const { scene, camera, renderer, render } = crearEscenario(contenedor, { bloom: 0.6 })
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.3
  const sol = new THREE.DirectionalLight(0xfff0dc, 1.3)
  sol.position.set(4, 9, 10)
  scene.add(sol, new THREE.AmbientLight(0xbfd8d0, 0.5))

  const controles = new OrbitControls(camera, renderer.domElement)
  controles.target.copy(CENTRO)
  controles.enableDamping = true
  controles.enablePan = false
  controles.minPolarAngle = 1.0
  controles.maxPolarAngle = 1.75
  controles.minAzimuthAngle = -0.9
  controles.maxAzimuthAngle = 0.9
  camera.position.copy(CENTRO).add(new THREE.Vector3(0.1, 2.4, 14))
  // En el borde transformante las placas se mueven hacia y desde la cámara: se la inclina para que se vean las flechas.
  const POLAR = { normal: 1.4, transformante: 1.0 }
  let polarObjetivo = POLAR.normal
  let inclinando = false
  controles.addEventListener('start', () => (inclinando = false))
  const brillo = crearNube(scene, 1600, true)
  const humo = crearNube(scene, 700, false)
  encuadrarEntreHuds(camera, contenedor, ({ libre, alto }) => {
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const distancia = Math.max((ANCHO_MUNDO * alto) / (Math.max(libre, 420) * 2 * tanV), ALTO_MUNDO / (2 * tanV)) * 1.04
    const direccion = camera.position.clone().sub(controles.target)
    camera.position.copy(controles.target).addScaledVector(direccion.normalize(), distancia)
    controles.minDistance = distancia * 0.55
    controles.maxDistance = distancia * 1.3
    scene.fog = new THREE.Fog(FONDO, distancia + 20, distancia + 60)
    // Tamaño de las partículas en unidades de la escena: píxeles de alto por unidad a distancia 1.
    const escala = (alto * renderer.getPixelRatio()) / (2 * tanV)
    brillo.escala(escala)
    humo.escala(escala)
  })
  const flujo = crearFlujo(scene, brillo)
  const volcan = crearVolcan(scene, brillo, humo)
  let bloque: Bloque | null = null
  let geo: Geo = GEO.convergente()

  // Rótulos HTML anclados al corte.
  const rotulos = crearPildoras(contenedor, camera)
  for (const km of [0, 50, 100, 150, 200]) rotulos.crear(`${km} km`, { ancla: new THREE.Vector3(-W - 0.15, y(km), 0.1), origen: 'derecha' })
  const capa = (texto: string, km: number) => rotulos.crear(texto, { ancla: new THREE.Vector3(W - 0.1, y(km), 0.1), origen: 'derecha', clase: 'capa' })
  capa('Corteza', 3)
  capa('Litósfera', 40)
  capa('Astenósfera', 140)
  const zona = rotulos.crear('', { clase: 'activa', origen: 'izquierda' })
  const a1 = rotulos.crear('')
  const a2 = rotulos.crear('')
  const lugar = rotulos.crear('', { clase: 'lugar' })
  rotulos.crear(`↓ El núcleo está a ~${numero(PROFUNDIDAD.nucleo, 0)} km (fuera de escala)`, { ancla: new THREE.Vector3(0, FONDO_Y - 0.4, 0.1) })

  const cm = (v: number) => `${numero(v, Number.isInteger(v) ? 0 : 1)} cm/año`
  function rotular(b: Borde, g: Geo) {
    const v = cm(FUSION[b].velocidad)
    const sobre = ([x, yy, z]: [number, number, number]) => new THREE.Vector3(x, yy + 0.5, z)
    a1.ancla.copy(sobre(g.flechas[0].p))
    a2.ancla.copy(sobre(g.flechas[1].p))
    if (b === 'divergente') {
      a1.texto(`← ${v}`)
      a2.texto(`${v} →`)
      lugar.texto('Dorsal oceánica')
      lugar.ancla.set(0, 1.5, 0.1)
    } else if (b === 'convergente') {
      a1.texto(`Placa oceánica · ${v} →`)
      a2.texto('Placa continental')
      lugar.texto('Fosa')
      lugar.ancla.set(XT, -0.75, 0.1)
    } else {
      a1.texto(`${v}, hacia vos`)
      a2.texto(`${v}, se aleja`)
      lugar.texto('Falla')
      lugar.ancla.set(0, 0.35, 0.1)
    }
    const f = g.fusion
    zona.ancla.set(Math.max(...f.map((p) => p[0]), 0) + 0.15, y(FUSION[b].origenKm) + 0.25, 0.1)
    zona.texto(`Se funde a ~${numero(FUSION[b].origenKm, 0)} km`)
  }

  function cambiarBorde(b: Borde) {
    bloque?.quitar()
    geo = GEO[b]()
    bloque = crearBloque(scene, b, geo)
    flujo.colocar(geo, b)
    volcan.colocar(geo.volcan)
    volcan.reiniciar()
    brillo.limpiar()
    humo.limpiar()
    rotular(b, geo)
    polarObjetivo = b === 'transformante' ? POLAR.transformante : POLAR.normal
    inclinando = true
  }
  cambiarBorde('convergente')

  return {
    cambiarBorde,
    /** `dt` en segundos reales. `magma` es la composición que se muestra; `mostrarVolcan` lo esconde mientras una pregunta no se respondió. */
    dibujar(e: Estado, magma: Pick<Config, 'silice' | 'gas'>, dt: number, mostrarVolcan: boolean) {
      volcan.mostrar(mostrarVolcan)
      bloque?.actualizar(e.fusion)
      volcan.conducto(rampa(e.fusion, 0.5, 0.9))
      flujo.emitir(dt, e.fusion)
      volcan.emitir(dt, { nivel: e.erupcion, e: explosividad(magma.silice, magma.gas), eta: viscosidadNormal(magma.silice) })
      const mover = (p: Parameters<typeof flujo.mover>[0], paso: number) => {
        if (!flujo.mover(p, paso)) volcan.mover(p, paso)
      }
      brillo.paso(dt, mover)
      humo.paso(dt, mover)
      flujo.anillos(dt)
      zona.el.hidden = geo.fusion.length === 0 || e.fusion < 0.4
      if (inclinando) {
        const desde = camera.position.clone().sub(controles.target)
        const s = new THREE.Spherical().setFromVector3(desde)
        s.phi += (polarObjetivo - s.phi) * (1 - Math.exp(-4 * dt))
        camera.position.copy(controles.target).add(desde.setFromSpherical(s))
        inclinando = Math.abs(polarObjetivo - s.phi) > 0.005
      }
      controles.update()
      rotulos.ubicar()
      render()
    },
  }
}
