import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { encuadrarEntreHuds } from '../../escena/encuadre'
import { crearEscenario } from '../../escena/escenario'
import { crearPildoras, type Pildora } from '../../escena/pildoras'
import { h } from '../../ui/dom'
import { cm, num } from './contenido'
import { crearEspejo, crearLapiz, crearMesa, crearOjo, crearPecera } from './maqueta'
import {
  N_AIRE, O_ESPEJO, O_PECERA, PECERA_X, PISO_Y, SUPERFICIE_Y, indice, nombreMedio, sinEngano,
  type Config, type Punto, type Resultado, type Tramo,
} from './model'
import { crearArco, crearHaces, crearNormal, crearPunto, crearPuntero } from './rayos'

/** Lo que tiene que entrar a lo ancho y a lo alto (unidades del mundo). */
const ANCHO_MUNDO = 7.8
const ALTO_MUNDO = 6.6
const CENTRO = new THREE.Vector3(0, 2.4, 0)
const RADIO_ARCO = 0.9

/** Dirección unitaria de un tramo. */
function direccion(t: Tramo): Punto {
  const dx = t.a[0] - t.de[0]
  const dy = t.a[1] - t.de[1]
  const l = Math.hypot(dx, dy) || 1
  return [dx / l, dy / l]
}
const opuesta = (d: Punto): Punto => [-d[0], -d[1]]

export function crearEscena(contenedor: HTMLElement) {
  const { scene, camera, renderer, render } = crearEscenario(contenedor, { bloom: 0.55 })
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture

  const controles = new OrbitControls(camera, renderer.domElement)
  controles.target.copy(CENTRO)
  controles.enableDamping = true
  // Con la cámara muy girada los ángulos del plano del rayo se leen mal: se la deja cerca de la vista de frente.
  controles.minAzimuthAngle = -0.5
  controles.maxAzimuthAngle = 0.5
  controles.minPolarAngle = 1.1
  controles.maxPolarAngle = Math.PI * 0.5
  controles.enablePan = false
  camera.position.copy(CENTRO).add(new THREE.Vector3(0, 0.6, 3))
  encuadrarEntreHuds(camera, contenedor, ({ libre, alto }) => {
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const distancia = Math.max((ANCHO_MUNDO * alto) / (Math.max(libre, 360) * 2 * tanV), ALTO_MUNDO / (2 * tanV)) * 1.04
    const direccionCamara = camera.position.clone().sub(controles.target)
    if (direccionCamara.lengthSq() < 1e-6) direccionCamara.set(0, 0.2, 1)
    camera.position.copy(controles.target).addScaledVector(direccionCamara.normalize(), distancia)
    controles.minDistance = distancia * 0.6
    controles.maxDistance = distancia * 1.3
    scene.fog = new THREE.Fog(0x07100f, distancia + 12, distancia + 34)
  })

  crearMesa(scene)
  const pecera = crearPecera(scene)
  const espejo = crearEspejo(scene)
  const lapiz = crearLapiz(scene)
  const ojo = crearOjo(scene)
  const haces = crearHaces(scene)
  const puntero = crearPuntero(scene)
  const punto = crearPunto(scene)
  const normal = crearNormal(scene, 1.9)
  const arcoInc = crearArco(scene, 0xffc857)
  const arcoRefl = crearArco(scene, 0xff5fa2)
  const arcoRefr = crearArco(scene, 0x5ec8ff)

  const rotulos = crearPildoras(contenedor, camera)
  const pInc = rotulos.crear('', { clase: 'inc', origen: 'derecha', dx: -2 })
  const pRefl = rotulos.crear('', { clase: 'refl', origen: 'izquierda', dx: 2 })
  const pRefr = rotulos.crear('', { clase: 'refr', origen: 'izquierda', dx: 2 })
  const pNormal = rotulos.crear('normal', { dx: 6, origen: 'izquierda' })
  const pMedio = rotulos.crear('', { multilinea: true, ancla: new THREE.Vector3(-PECERA_X + 0.9, PISO_Y + 0.55, 1.2) })
  const pAire = rotulos.crear('', { multilinea: true, ancla: new THREE.Vector3(-PECERA_X + 0.5, SUPERFICIE_Y + 2.9, 0) })
  const pReal = rotulos.crear('', { clase: 'real', dy: 16 })
  const pAparente = rotulos.crear('', { clase: 'aparente', dx: 12, origen: 'izquierda' })
  const pOjo = rotulos.crear('Ojo', { dy: -22 })
  /** Rótulo de dos líneas (el índice es info avanzada); solo toca el DOM si cambia el texto. */
  const rotular = (p: Pildora, nombre: string, indiceTxt: string) => {
    const clave = `${nombre}|${indiceTxt}`
    if (p.el.dataset.clave === clave) return
    p.el.dataset.clave = clave
    p.el.replaceChildren(h('span', {}, nombre), h('span', { class: 'avanzado' }, indiceTxt))
  }
  /** Pone un rótulo en `a` (o lo esconde); el texto solo se reescribe si cambió. */
  const anclar = (p: Pildora, texto: string, a: Punto | null) => {
    p.el.hidden = a === null
    if (!a) return
    if (p.el.dataset.texto !== texto) {
      p.el.dataset.texto = texto
      p.texto(texto)
    }
    p.ancla.set(a[0], a[1], 0)
  }

  function dibujarPlano(c: Config, r: Resultado) {
    // Todo lo del plano arranca oculto: cada escena muestra solo lo suyo.
    ;[arcoInc, arcoRefl, arcoRefr].forEach((a) => a.ocultar())
    const esEspejo = r.escena === 'espejo'
    const [centro, giro] = esEspejo ? [O_ESPEJO, THREE.MathUtils.degToRad(c.espejo)] : [O_PECERA, 0]
    normal.position.set(centro[0], centro[1], 0)
    normal.rotation.z = giro
    const eje: Punto = [-Math.sin(giro), Math.cos(giro)]
    if (r.escena === 'lapiz') return
    const [entrante, reflejado] = [r.tramos[0], r.tramos[1]]
    const dEntra = direccion(entrante)
    // El lado desde el que llega el láser: arriba de la superficie (aire) o abajo (adentro del medio).
    const ladoOrigen: Punto = esEspejo || c.desde === 'aire' ? eje : opuesta(eje)
    puntero.poner(entrante.de, dEntra)
    punto.position.set(centro[0], centro[1], 0)
    const aInc = arcoInc.poner(centro, ladoOrigen, opuesta(dEntra), RADIO_ARCO)
    const refl = reflejado.intensidad > 0.004 ? arcoRefl.poner(centro, ladoOrigen, direccion(reflejado), RADIO_ARCO) : (arcoRefl.ocultar(), null)
    anclar(pInc, `Incidencia ${num(r.incidencia, 1)}°`, aInc)
    anclar(pRefl, `Reflexión ${num(esEspejo ? r.reflexion : r.incidencia, 1)}°`, refl)
    anclar(pNormal, 'normal', [centro[0] + eje[0] * 1.95, centro[1] + eje[1] * 1.95])
    if (r.escena === 'refraccion') {
      const pasa = r.tramos[2]
      const aRefr = pasa ? arcoRefr.poner(centro, opuesta(ladoOrigen), direccion(pasa), RADIO_ARCO + 0.35) : (arcoRefr.ocultar(), null)
      anclar(pRefr, `Refracción ${num(r.refraccion ?? 0, 1)}°`, aRefr)
    }
  }

  return {
    dibujar(c: Config, r: Resultado) {
      const esLapiz = c.escena === 'lapiz'
      const esEspejo = c.escena === 'espejo'
      pecera.grupo.visible = !esEspejo
      espejo.grupo.visible = esEspejo
      lapiz.grupo.visible = ojo.grupo.visible = esLapiz
      puntero.grupo.visible = punto.visible = normal.visible = !esLapiz
      if (esLapiz) [arcoInc, arcoRefl, arcoRefr].forEach((a) => a.ocultar())
      if (c.escena === 'refraccion' || esLapiz) pecera.actualizar(c)
      if (esEspejo) espejo.girar(c.espejo)
      haces.poner(r.tramos)

      if (r.escena === 'lapiz') {
        lapiz.actualizar(r)
        ojo.poner(r.ojo, r.salida)
        anclar(pReal, `Real: ${cm(r.profundidad)}`, r.puntaReal)
        anclar(pAparente, `Parece: ${cm(r.aparente)}`, r.puntaAparente)
        anclar(pOjo, 'Ojo', r.ojo)
        pReal.el.hidden = sinEngano(r)
      } else {
        for (const p of [pReal, pAparente, pOjo]) p.el.hidden = true
      }
      if (!esLapiz) dibujarPlano(c, r)
      else for (const p of [pInc, pRefl, pRefr, pNormal]) p.el.hidden = true
      pRefr.el.hidden ||= c.escena !== 'refraccion'
      pMedio.el.hidden = esEspejo
      pAire.el.hidden = esEspejo
      if (!esEspejo) {
        rotular(pMedio, nombreMedio(c), `n ${num(indice(c), indice(c) < 1.01 ? 4 : 3)}`)
        rotular(pAire, 'Aire', `n ${num(N_AIRE, 4)}`)
      }
      rotulos.ubicar()
      controles.update()
      render()
    },
  }
}
