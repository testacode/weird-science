import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { encuadrarEntreHuds } from '../../escena/encuadre'
import { crearEscenario } from '../../escena/escenario'
import { crearPildoras } from '../../escena/pildoras'
import { h } from '../../ui/dom'
import { numero } from '../../ui/formato'
import { crearSol, crearTierra } from './cuerpos'
import {
  D_AFELIO, D_PERIHELIO, EXCENTRICIDAD, FECHAS_CLAVE, YEAR, fecha, orbita, type Ciudad,
} from './model'

const RAD = Math.PI / 180
// Escala didáctica: todo está muy agrandado y más cerca que en la realidad (se aclara en "Qué es real").
const R_ORBITA = 3
const R_TIERRA = 0.55
const R_SOL = 0.5
const MESADA_Y = -1
/** La órbita real es casi un círculo (e = 0,0167): en la maqueta se dibuja con una excentricidad ×5 para que se note. */
const EXAGERACION_E = 5
const E_VISUAL = EXCENTRICIDAD * EXAGERACION_E

export interface Cuadro {
  d: number
  ciudad: Ciudad
  /** Inclinación del eje en grados. */
  eps: number
  idea: boolean
  avanzado: boolean
  /** Distancia Tierra-Sol del día, en millones de km. */
  distancia: number
}

/** Posición de la Tierra en la maqueta (plano y = 0) el día `d`: ángulo real, distancia exagerada. */
function posicionTierra(d: number, salida = new THREE.Vector3()) {
  const o = orbita(d)
  const L = (o.longitud + 180) * RAD
  const r = R_ORBITA * (1 - E_VISUAL * Math.cos(o.E))
  return salida.set(r * Math.cos(L), 0, -r * Math.sin(L))
}

/** Dirección del polo norte: inclinada ε hacia el lado opuesto al Sol en diciembre (siempre la misma en el espacio). */
const ejeDe = (eps: number) => new THREE.Vector3(0, Math.cos(eps * RAD), -Math.sin(eps * RAD))

export function crearEscena(contenedor: HTMLElement) {
  const { scene, camera, renderer, render } = crearEscenario(contenedor, { niebla: { cerca: 22, lejos: 40 } })
  const target = new THREE.Vector3(0, 0.2, 0)
  camera.position.copy(target).add(new THREE.Vector3(0, 11, 7.5))
  const controles = new OrbitControls(camera, renderer.domElement)
  controles.target.copy(target)
  controles.enableDamping = true
  controles.enablePan = false
  controles.maxPolarAngle = Math.PI * 0.49
  // Aleja la cámara hasta que la órbita entre en el hueco que dejan los HUD (el kit la centra en ese hueco).
  encuadrarEntreHuds(camera, contenedor, ({ libre, alto }) => {
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const distancia = THREE.MathUtils.clamp((11.8 * alto) / (Math.max(libre, 380) * 2 * tanV), 10, 24)
    const direccion = camera.position.clone().sub(controles.target).normalize()
    camera.position.copy(controles.target).addScaledVector(direccion, distancia)
    controles.minDistance = distancia * 0.55
    controles.maxDistance = distancia * 1.3
    scene.fog = new THREE.Fog(0x07100f, distancia + 8, distancia + 28)
  })

  // Luz: el Sol ilumina a la Tierra con rayos paralelos; el ambiente es apenas la luz del cielo.
  const sol = new THREE.DirectionalLight(0xfff3dc, 4)
  scene.add(sol, sol.target, new THREE.AmbientLight(0x9fb8d0, 0.15))

  const mesada = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.2, 0.3, 96),
    new THREE.MeshStandardMaterial({ color: 0x17221f, emissive: 0x0f2622, roughness: 0.55, metalness: 0.3 }),
  )
  mesada.position.y = MESADA_Y - 0.15
  const grilla = new THREE.PolarGridHelper(3.95, 16, 6, 64, 0x3d625a, 0x2c4640)
  grilla.position.y = MESADA_Y + 0.005
  const lampara = crearSol(R_SOL, MESADA_Y)
  const tierra = crearTierra(R_TIERRA)
  scene.add(mesada, grilla, lampara, tierra.grupo)

  // Órbita: sale de la misma función que mueve a la Tierra, así que pasa por donde ella está.
  const PUNTOS = 180
  const puntosOrbita = Array.from({ length: PUNTOS + 1 }, (_, i) => posicionTierra((i / PUNTOS) * YEAR))
  const lineaOrbita = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(puntosOrbita),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 }),
  )
  scene.add(lineaOrbita)

  // Equinoccios y solsticios: la Tierra en cada uno, con su eje (siempre apunta al mismo lado).
  const marcasClave = FECHAS_CLAVE.map((f) => {
    const p = posicionTierra(f.dia)
    const punto = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }))
    punto.position.copy(p)
    const eje = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x5ec8ff, transparent: true, opacity: 0.45 }))
    scene.add(punto, eje)
    return { f, p, eje }
  })
  // Perihelio y afelio: el punto más cerca y más lejos del Sol.
  const extremos = [D_PERIHELIO, D_AFELIO].map((d) => {
    const p = posicionTierra(d)
    const punto = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff5fa2, toneMapped: false }))
    punto.position.copy(p)
    scene.add(punto)
    return { p, punto }
  })

  // Rayo del Sol a la ciudad.
  const rayo = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineBasicMaterial({ color: 0xffc857, transparent: true, opacity: 0.75, depthTest: false }),
  )
  rayo.renderOrder = 10
  scene.add(rayo)

  const pildoras = crearPildoras(contenedor, camera)
  pildoras.crear('Sol', { clase: 'p-sol', ancla: new THREE.Vector3(0, 0, 0), dy: 42 })
  const pTierra = pildoras.crear('', { clase: 'p-tierra', dy: 44, multilinea: true })
  const nombreTierra = h('span', {}, 'Tierra')
  const distanciaTierra = h('span', { class: 'p-dist' })
  pTierra.el.append(nombreTierra, distanciaTierra)
  const pCiudad = pildoras.crear('', { clase: 'p-ciudad', origen: 'izquierda', dx: 14, dy: -18 })
  const pNorte = pildoras.crear('N', { clase: 'p-norte' })
  // Las marcas de fecha se esconden cuando la Tierra está encima (ahí el rótulo de la Tierra dice cuál es).
  const pClave = marcasClave.map(({ f, p }) => ({ f, el: pildoras.crear(`${fecha(f.dia).corta} · ${f.tipo}`, { clase: 'p-fecha', ancla: p.clone().multiplyScalar(1.22) }).el }))
  const pExtremos = [D_PERIHELIO, D_AFELIO].map((d, i) =>
    pildoras.crear(`${i ? 'Afelio' : 'Perihelio'} · ${fecha(d).corta}`, {
      clase: 'p-extremo', ancla: extremos[i].p, ...(i ? { origen: 'izquierda', dx: 16, dy: 18 } : { origen: 'derecha', dx: -8, dy: -8 }),
    }),
  )

  const pos = new THREE.Vector3()
  const haciaSol = new THREE.Vector3()
  const ciudadMundo = new THREE.Vector3()
  const norte = new THREE.Vector3()
  let epsPrevio = NaN

  return {
    dibujar(c: Cuadro) {
      posicionTierra(c.d, pos)
      tierra.grupo.position.copy(pos)
      haciaSol.copy(pos).negate().normalize()
      const eje = ejeDe(c.eps)
      tierra.orientar(eje, haciaSol, c.ciudad.lat, c.ciudad.lon)
      tierra.grupo.updateMatrixWorld(true)
      sol.target.position.copy(pos)
      sol.target.updateMatrixWorld()

      if (c.eps !== epsPrevio) {
        epsPrevio = c.eps
        for (const m of marcasClave) {
          const a = m.eje.geometry.attributes.position
          a.setXYZ(0, m.p.x - eje.x * 0.75, m.p.y - eje.y * 0.75, m.p.z - eje.z * 0.75)
          a.setXYZ(1, m.p.x + eje.x * 0.75, m.p.y + eje.y * 0.75, m.p.z + eje.z * 0.75)
          a.needsUpdate = true
        }
      }
      extremos.forEach((e, i) => {
        e.punto.visible = c.idea || c.avanzado
        pExtremos[i].el.hidden = !e.punto.visible
      })

      tierra.ciudadEnMundo(ciudadMundo)
      const a = rayo.geometry.attributes.position
      const salida = ciudadMundo.clone().normalize().multiplyScalar(R_SOL)
      a.setXYZ(0, salida.x, salida.y, salida.z)
      a.setXYZ(1, ciudadMundo.x, ciudadMundo.y, ciudadMundo.z)
      a.needsUpdate = true

      pTierra.ancla.copy(pos)
      pCiudad.ancla.copy(ciudadMundo)
      pCiudad.texto(c.ciudad.nombre)
      pNorte.ancla.copy(tierra.poloEnMundo(norte))
      // Distancia en días sobre el calendario circular (el 3 de enero está a 12 días del solsticio de diciembre).
      const aDias = (k: (typeof pClave)[number]) => Math.min(Math.abs(c.d - k.f.dia), YEAR - Math.abs(c.d - k.f.dia))
      const cerca = pClave.find((k) => aDias(k) < 16)
      pClave.forEach((k) => (k.el.hidden = k === cerca))
      nombreTierra.textContent = cerca && aDias(cerca) < 3 ? `Tierra · ${cerca.f.tipo}` : 'Tierra'
      distanciaTierra.textContent = `${numero(c.distancia, 1)} M km del Sol`
      distanciaTierra.classList.toggle('idea', c.idea)
      ;(lineaOrbita.material as THREE.LineBasicMaterial).color.set(c.idea ? 0xff5fa2 : 0xffffff)
      ;(lineaOrbita.material as THREE.LineBasicMaterial).opacity = c.idea ? 0.7 : 0.3

      controles.update()
      pildoras.ubicar()
      render()
    },
  }
}
