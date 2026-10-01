import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { encuadrarEntreHuds } from '../../escena/encuadre'
import { crearEscenario } from '../../escena/escenario'
import { crearPildoras } from '../../escena/pildoras'
import { numero } from '../../ui/formato'
import { crearAgua } from './agua'
import { crearCielo } from './cielo'
import { ALTO, MEDIO_Z, nivelMar, puntoRio } from './constantes'
import { efectiva, S_MAX, type Config, type Estado, type Flujos } from './model'
import { crearPlantas } from './plantas'
import { crearTerrario } from './terrario'
import { crearTerreno } from './terreno'

/** Lo que tiene que entrar a lo ancho y a lo alto (unidades del mundo): del terrario al poste de la lámpara, de la mesada al brazo. */
const ANCHO_MUNDO = 10.2
const ALTO_MUNDO = 6.9
const CENTRO = new THREE.Vector3(0.4, 2.7, 0)

/** Suaviza un valor hacia su meta: `veloz` en 1/s. */
const hacia = (actual: number, meta: number, veloz: number, dt: number) => actual + (meta - actual) * (1 - Math.exp(-veloz * dt))

export function crearEscena(contenedor: HTMLElement) {
  const { scene, camera, renderer, render } = crearEscenario(contenedor)
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture

  const controles = new OrbitControls(camera, renderer.domElement)
  controles.target.copy(CENTRO)
  controles.enableDamping = true
  controles.maxPolarAngle = Math.PI * 0.49
  controles.enablePan = false

  // Aleja la cámara hasta que la maqueta entre en el hueco que dejan los HUD (el kit la centra en ese hueco).
  camera.position.copy(CENTRO).add(new THREE.Vector3(0.2, 0.9, 3))
  encuadrarEntreHuds(camera, contenedor, ({ libre, alto }) => {
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const distancia = Math.max((ANCHO_MUNDO * alto) / (Math.max(libre, 360) * 2 * tanV), ALTO_MUNDO / (2 * tanV)) * 1.04
    const direccion = camera.position.clone().sub(controles.target)
    if (direccion.lengthSq() < 1e-6) direccion.set(0.05, 0.3, 1)
    camera.position.copy(controles.target).addScaledVector(direccion.normalize(), distancia)
    controles.minDistance = distancia * 0.55
    controles.maxDistance = distancia * 1.3
    scene.fog = new THREE.Fog(0x07100f, distancia + 12, distancia + 34)
  })

  const terrario = crearTerrario(scene)
  const terreno = crearTerreno(scene)
  const agua = crearAgua(scene, terreno.altura)
  const plantas = crearPlantas(scene, terreno.altura)
  const cielo = crearCielo(scene, terreno.altura)

  // Etiquetas HTML ancladas a la maqueta.
  const rotulos = crearPildoras(contenedor, camera)
  const mar = rotulos.crear('', { ancla: new THREE.Vector3(-2.9, 1, MEDIO_Z) })
  const nubes = rotulos.crear('', { ancla: cielo.ancla })
  const montana = rotulos.crear('Montaña', { ancla: new THREE.Vector3(1.9, 3.7, 0) })
  const suelo = rotulos.crear('', { ancla: new THREE.Vector3(1.6, 0.35, MEDIO_Z + 0.05) })
  const rio = rotulos.crear('', { ancla: puntoRio(0.5) })
  const verde = rotulos.crear('Plantas', { ancla: plantas.ancla })
  const sol = rotulos.crear('', { ancla: terrario.foco.clone().setY(terrario.foco.y + 0.55) })
  rotulos.crear('Cerrado: no entra ni sale agua', { ancla: new THREE.Vector3(-1.4, ALTO + 0.2, MEDIO_Z) })
  const textos = new Map<unknown, string>()
  const texto = (p: { texto: (t: string) => void }, t: string) => {
    if (textos.get(p) === t) return
    textos.set(p, t)
    p.texto(t)
  }
  const pct = (n: number) => `${numero(n, 0)}%`

  let anterior = 0
  let solVisual = 0.6
  let relieve = 0
  let cobertura = 0.6

  return {
    /** `ahora` en segundos reales. Con `activo` en falso (pausa) las partículas se congelan, pero las luces y el relieve siguen. */
    dibujar(e: Estado, c: Config, f: Flujos, ahora: number, activo: boolean) {
      const dt = Math.min(ahora - anterior, 0.1)
      anterior = ahora
      const dtVisual = activo ? dt : 0
      const ef = efectiva(c)
      solVisual = hacia(solVisual, ef.sol, 4, dt)
      relieve = hacia(relieve, ef.montana ? 1 : 0, 2.5, dt)
      cobertura = hacia(cobertura, ef.plantas, 2, dt)

      terrario.actualizar(solVisual)
      terreno.actualizar(relieve, cobertura, e.suelo / S_MAX)
      agua.actualizar(e, f, dtVisual, ahora)
      plantas.actualizar(ef.plantas, f.trans, dt, dtVisual, ahora)
      cielo.actualizar(e, f, nivelMar(e.mar), relieve, dtVisual, ahora)

      mar.ancla.y = nivelMar(e.mar) + 0.12
      suelo.ancla.y = 0.3
      rio.ancla.y = terreno.altura(rio.ancla.x, rio.ancla.z) + 0.3
      montana.el.hidden = relieve < 0.6
      montana.ancla.y = terreno.altura(1.9, 0) + 0.3
      verde.el.hidden = cobertura < 0.05
      nubes.el.hidden = e.nubes < 0.5
      texto(mar, `Mar · ${pct(e.mar)}`)
      texto(nubes, `Nubes · ${pct(e.nubes)}`)
      texto(suelo, `Suelo y subsuelo · ${pct(e.suelo)}`)
      texto(rio, `Río · ${pct(e.rio)}`)
      texto(sol, ef.sol === 0 ? 'Sol apagado' : `Sol · ${pct(ef.sol * 100)}`)
      sol.el.classList.toggle('activa', ef.sol > 0)
      controles.update()
      rotulos.ubicar()
      render()
    },
  }
}
