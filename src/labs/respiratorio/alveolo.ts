// Burbuja de zoom a un alvéolo: el aire de adentro (O₂ cielo, CO₂ magenta), el capilar que lo rodea (sangre) y los
// gases cruzando la pared. Va en su propio canvas redondo con su propio renderer, como la burbuja del digestivo.
import * as THREE from 'three'
import { h } from '../../ui/dom'
import { numero } from '../../ui/formato'
import { CIELO_HEX, MAGENTA_HEX, colorSangre } from './constantes'

const TAM = 210
const RADIO = 1.3
const CAPILAR = 1.5
const AMBIENTE_O2 = 24
const AMBIENTE_CO2 = 14
const VIAJEROS_O2 = 36
const VIAJEROS_CO2 = 28
const GLOBULOS = 18
const SALIDA = new THREE.Vector3(0, 2.7, 0)

export interface EstadoAlveolo {
  /** mmHg. */
  pao2: number
  paco2: number
  spo2: number
  /** De 0 a 1: cuánto O₂ pasa a la sangre y cuánto CO₂ sale de ella (relativo al máximo). */
  flujoO2: number
  flujoCo2: number
  /** Hay aire entrando y saliendo (si no, el CO₂ no sale del alvéolo). */
  respira: boolean
}

const brillo = (hex: number, k: number) => new THREE.Color(hex).multiplyScalar(k)

export function crearAlveolo(contenedor: HTMLElement) {
  const canvas = h('canvas', { 'aria-hidden': 'true' })
  const detalle = h('span', { class: 'avanzado' })
  const el = h('div', { class: 'zoom', role: 'img', 'aria-label': 'Zoom a un alvéolo: el oxígeno pasa a la sangre y el dióxido de carbono sale' },
    h('div', { class: 'lente' }, canvas),
    h('div', { class: 'rotulo' }, h('b', {}, 'Zoom: un alvéolo'), detalle),
  )
  contenedor.append(el)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(TAM, TAM, false)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0b1816)
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 30)
  camera.position.set(0, 0.4, 6.3)
  camera.lookAt(0, 0.4, 0)
  const luz = new THREE.DirectionalLight(0xffffff, 2)
  luz.position.set(2, 4, 5)
  scene.add(new THREE.AmbientLight(0xffffff, 1.1), luz)

  const vidrio = new THREE.MeshPhysicalMaterial({ color: 0xffc2d0, transparent: true, opacity: 0.22, roughness: 0.1, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide })
  const bolsa = new THREE.Mesh(new THREE.SphereGeometry(RADIO, 40, 28), vidrio)
  const boca = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.6, 20, 1, true), vidrio)
  boca.position.y = RADIO + 0.55
  scene.add(bolsa, boca)

  // Capilar: un tubo sinuoso que rodea al alvéolo, con glóbulos rojos que circulan.
  const puntos = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2
    const lat = 0.8 * Math.sin(3 * a + 0.6)
    return new THREE.Vector3(Math.cos(lat) * Math.cos(a), Math.sin(lat), Math.cos(lat) * Math.sin(a)).multiplyScalar(CAPILAR)
  })
  const curva = new THREE.CatmullRomCurve3(puntos, true)
  const sangre = new THREE.MeshStandardMaterial({ roughness: 0.4, emissiveIntensity: 0.25, transparent: true, opacity: 0.55 })
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 120, 0.15, 12, true), sangre))
  const globulo = new THREE.MeshStandardMaterial({ roughness: 0.4, emissiveIntensity: 0.4 })
  const globulos = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), globulo, GLOBULOS)
  globulos.frustumCulled = false
  scene.add(globulos)
  const muestras = Array.from({ length: 96 }, (_, i) => curva.getPointAt(i / 96))

  const gas = (hex: number, n: number) => {
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: brillo(hex, 1.4), toneMapped: false }), n)
    m.frustumCulled = false
    scene.add(m)
    return m
  }
  const o2 = gas(CIELO_HEX, AMBIENTE_O2 + VIAJEROS_O2)
  const co2 = gas(MAGENTA_HEX, AMBIENTE_CO2 + VIAJEROS_CO2)

  const azar = () => new THREE.Vector3().randomDirection()
  const ambiente = (n: number) => Array.from({ length: n }, () => ({ base: azar().multiplyScalar(Math.cbrt(Math.random()) * (RADIO - 0.2)), fase: Math.random() * 10 }))
  const aO2 = ambiente(AMBIENTE_O2)
  const aCo2 = ambiente(AMBIENTE_CO2)
  /** Viajero: sale de `desde` y llega a `hasta` en un ciclo `t` de 0 a 1. */
  const viajero = () => ({ t: Math.random(), desde: new THREE.Vector3(), hasta: new THREE.Vector3(), nuevo: true })
  const vO2 = Array.from({ length: VIAJEROS_O2 }, viajero)
  const vCo2 = Array.from({ length: VIAJEROS_CO2 }, viajero)
  /** Punto del capilar más cercano a la dirección `d`. */
  const capilarHacia = (d: THREE.Vector3) => muestras.reduce((mejor, p) => (p.dot(d) > mejor.dot(d) ? p : mejor), muestras[0])

  const m = new THREE.Matrix4()
  const giro = new THREE.Quaternion()
  const pos = new THREE.Vector3()
  const esc = new THREE.Vector3()
  const oculto = (malla: THREE.InstancedMesh, i: number) => malla.setMatrixAt(i, m.compose(pos.set(0, -9, 0), giro, esc.setScalar(0)))
  const color = new THREE.Color()
  let reloj = 0
  let ciclo = 0

  return {
    el,
    /** `dt` en segundos reales (0 en pausa). */
    actualizar(s: EstadoAlveolo, dt: number) {
      reloj += dt
      ciclo += dt
      colorSangre(s.spo2, color)
      sangre.color.copy(color)
      sangre.emissive.copy(color)
      globulo.color.copy(color)
      globulo.emissive.copy(color)
      for (let i = 0; i < GLOBULOS; i++) {
        curva.getPointAt((i / GLOBULOS + ciclo * 0.05) % 1, pos)
        globulos.setMatrixAt(i, m.compose(pos, giro, esc.setScalar(0.1)))
      }
      globulos.instanceMatrix.needsUpdate = true

      // Gas que flota en el alvéolo: más O₂ cuanto más PO₂ alveolar, más CO₂ cuanto más PCO₂.
      const nO2 = Math.round(THREE.MathUtils.clamp(s.pao2 / 100, 0, 1.5) * (AMBIENTE_O2 * 0.75))
      const nCo2 = Math.round(THREE.MathUtils.clamp(s.paco2 / 41, 0, 2.4) * (AMBIENTE_CO2 * 0.42))
      const flota = (malla: THREE.InstancedMesh, lista: typeof aO2, n: number, radio: number) => {
        lista.forEach((g, i) => {
          if (i >= n) return oculto(malla, i)
          pos.copy(g.base)
          pos.x += Math.sin(reloj * 0.9 + g.fase) * 0.12
          pos.y += Math.cos(reloj * 0.7 + g.fase * 2) * 0.12
          malla.setMatrixAt(i, m.compose(pos, giro, esc.setScalar(radio)))
        })
        malla.instanceMatrix.needsUpdate = true
      }
      flota(o2, aO2, nO2, 0.06)
      flota(co2, aCo2, nCo2, 0.075)

      // Gases cruzando la pared: el O₂ del alvéolo a la sangre, el CO₂ de la sangre al alvéolo y por la boca.
      const cruzan = (malla: THREE.InstancedMesh, lista: typeof vO2, desde: number, visibles: number, entra: boolean) => {
        lista.forEach((v, i) => {
          if (i >= visibles) return oculto(malla, desde + i)
          v.t += dt * 0.35
          if (v.t >= 1 || v.nuevo) {
            v.t = v.nuevo ? v.t % 1 : 0
            v.nuevo = false
            const d = azar()
            const sangreCerca = capilarHacia(d)
            const lumen = d.clone().multiplyScalar(0.45)
            v.desde.copy(entra ? lumen : sangreCerca)
            v.hasta.copy(entra ? sangreCerca : s.respira ? SALIDA : lumen)
          }
          const e = v.t * v.t * (3 - 2 * v.t)
          pos.lerpVectors(v.desde, v.hasta, e)
          malla.setMatrixAt(desde + i, m.compose(pos, giro, esc.setScalar((entra ? 0.075 : 0.085) * Math.sin(Math.PI * Math.min(v.t * 1.05, 1)) ** 0.4)))
        })
        malla.instanceMatrix.needsUpdate = true
      }
      cruzan(o2, vO2, AMBIENTE_O2, Math.round(VIAJEROS_O2 * s.flujoO2), true)
      cruzan(co2, vCo2, AMBIENTE_CO2, Math.round(VIAJEROS_CO2 * s.flujoCo2), false)
      detalle.textContent = `PO₂ ${numero(s.pao2, 0)} · PCO₂ ${numero(s.paco2, 0)} mmHg`
      renderer.render(scene, camera)
    },
  }
}
