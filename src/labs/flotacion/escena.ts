import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { h } from '../../ui/dom'
import { encuadrarEntreHuds } from '../../escena/encuadre'
import { crearEscenario } from '../../escena/escenario'
import { crearPildoras, type Pildora } from '../../escena/pildoras'
import { COLOR_EMPUJE, COLOR_PESO } from './constantes'
import { kgm3, newtons } from './contenido'
import { crearFlecha } from './flechas'
import { OBJETOS, dimensiones, nombreLiquido, pesoReferencia, type Config, type Derivados, type Estado } from './model'
import { crearObjetos } from './objetos'
import { BORDE_Y, ESCALA, MEDIO_X, MEDIO_Z, crearPecera, mundoY } from './pecera'

/** Lo que tiene que entrar a lo ancho y a lo alto (unidades del mundo): la pecera con las flechas y los rótulos. */
const ANCHO_MUNDO = 5.2
const ALTO_MUNDO = 3.8
const CENTRO = new THREE.Vector3(0, 1.45, 0)
/** Largo (unidades) de la flecha de un objeto con su peso de referencia; el resto sale proporcional. */
const LARGO_REFERENCIA = 1.1
const LARGO_MAXIMO = 3.2
/** Separación de las flechas al costado del objeto. */
const SEPARACION = 0.34

export function crearEscena(contenedor: HTMLElement) {
  const { scene, camera, renderer, render } = crearEscenario(contenedor)
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture

  const controles = new OrbitControls(camera, renderer.domElement)
  controles.target.copy(CENTRO)
  controles.enableDamping = true
  controles.maxPolarAngle = Math.PI * 0.49
  controles.enablePan = false

  // Aleja la cámara hasta que la pecera entre en el hueco que dejan los HUD (el kit la centra en ese hueco).
  camera.position.copy(CENTRO).add(new THREE.Vector3(0.1, 0.9, 3))
  encuadrarEntreHuds(camera, contenedor, ({ libre, alto }) => {
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const distancia = Math.max((ANCHO_MUNDO * alto) / (Math.max(libre, 360) * 2 * tanV), ALTO_MUNDO / (2 * tanV)) * 1.04
    const direccion = camera.position.clone().sub(controles.target)
    if (direccion.lengthSq() < 1e-6) direccion.set(0.05, 0.3, 1)
    camera.position.copy(controles.target).addScaledVector(direccion.normalize(), distancia)
    controles.minDistance = distancia * 0.55
    controles.maxDistance = distancia * 1.3
    // La niebla acompaña a la distancia: si no, con la cámara lejos la maqueta se apaga.
    scene.fog = new THREE.Fog(0x07100f, distancia + 12, distancia + 34)
  })

  const pecera = crearPecera(scene)
  const objetos = crearObjetos(scene)
  const flechaPeso = crearFlecha(scene, COLOR_PESO)
  const flechaEmpuje = crearFlecha(scene, COLOR_EMPUJE)

  // Rótulos HTML anclados a la maqueta.
  const rotulos = crearPildoras(contenedor, camera)
  const pPeso = rotulos.crear('', { clase: 'peso' })
  const pEmpuje = rotulos.crear('', { clase: 'empuje' })
  const pLiquido = rotulos.crear('', { multilinea: true, ancla: new THREE.Vector3(MEDIO_X - 0.6, mundoY(0.06), MEDIO_Z) })
  const pObjeto = rotulos.crear('', { multilinea: true, ancla: new THREE.Vector3(-MEDIO_X + 0.7, BORDE_Y - 0.12, MEDIO_Z) })
  /** Rótulo de dos líneas (la densidad es info avanzada); solo toca el DOM si cambia el texto. */
  const rotular = (p: Pildora, nombre: string, densidad: string) => {
    const clave = `${nombre}|${densidad}`
    if (p.el.dataset.clave === clave) return
    p.el.dataset.clave = clave
    p.el.replaceChildren(h('span', {}, nombre), h('span', { class: 'avanzado' }, densidad))
  }

  let anterior = 0
  return {
    dibujar(c: Config, e: Estado, d: Derivados, ahora: number) {
      const dt = Math.min(ahora - anterior, 0.1)
      anterior = ahora
      pecera.actualizar(c, dt)
      objetos.actualizar(c, e, pecera.color)

      // Las flechas: misma escala para un objeto (la da su peso en la Tierra), proporcionales a la fuerza.
      const dim = dimensiones(c)
      const k = LARGO_REFERENCIA / pesoReferencia(c.objeto)
      const largo = (fuerza: number) => Math.min(fuerza * k, LARGO_MAXIMO)
      const yc = mundoY(e.y)
      const lado = (dim.ancho * ESCALA) / 2 + SEPARACION
      flechaPeso.poner(-lado, yc, 0, largo(d.peso), -1)
      flechaEmpuje.poner(lado, yc, 0, largo(d.empuje), 1)

      pPeso.texto(`Peso ${newtons(d.peso)} N`)
      pPeso.ancla.copy(flechaPeso.punta).y -= 0.16
      pEmpuje.el.hidden = d.empuje < 0.005
      pEmpuje.texto(`Empuje ${newtons(d.empuje)} N`)
      pEmpuje.ancla.copy(flechaEmpuje.punta).y += 0.16
      rotular(pLiquido, nombreLiquido(c), `ρ ${kgm3(d.rhoLiquido)}`)
      rotular(pObjeto, OBJETOS[c.objeto].nombre, `ρ ${kgm3(d.rhoObjeto)}`)
      rotulos.ubicar()
      controles.update()
      render()
    },
  }
}
