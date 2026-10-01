// Los imanes de barra de la maqueta: cada parte tiene una mitad N (magenta) y una mitad S (cielo).
import * as THREE from 'three'
import type { Pildora } from '../../escena/pildoras'
import { ALTO_IMAN, COLOR_N, COLOR_S, ESC, GRIS_SIN_IMAN, aX, smooth } from './geometria'
import { MAX_PIEZAS, LADO, TIPOS, magnetizacion, piezaB, piezasA, type Config, type Pieza } from './model'

const GRIS = new THREE.Color(GRIS_SIN_IMAN)
/** Los colores del kit son claros: sobre la mesada, con la luz de la escena, se lavan. */
const OSCURECER = 0.45

interface Parte {
  grupo: THREE.Group
  n: THREE.Mesh
  s: THREE.Mesh
  pN: Pildora
  pS: Pildora
}

interface Rotulos {
  crear: (texto?: string, o?: { clase?: string; ancla?: THREE.Vector3 }) => Pildora
}

export function crearImanes(scene: THREE.Scene, rotulos: Rotulos) {
  const materiales = () => ({
    n: new THREE.MeshStandardMaterial({ color: COLOR_N, roughness: 0.4, metalness: 0.3, envMapIntensity: 0.4 }),
    s: new THREE.MeshStandardMaterial({ color: COLOR_S, roughness: 0.4, metalness: 0.3, envMapIntensity: 0.4 }),
  })
  const matA = materiales()
  const matB = materiales()
  const caja = new THREE.BoxGeometry(1, 1, 1)

  function crearParte(mat: ReturnType<typeof materiales>): Parte {
    const n = new THREE.Mesh(caja, mat.n)
    const s = new THREE.Mesh(caja, mat.s)
    const grupo = new THREE.Group()
    grupo.add(n, s)
    scene.add(grupo)
    return { grupo, n, s, pN: rotulos.crear('N', { clase: 'polo-n' }), pS: rotulos.crear('S', { clase: 'polo-s' }) }
  }
  const partesA = Array.from({ length: MAX_PIEZAS }, () => crearParte(matA))
  const parteB = crearParte(matB)
  const nombreA = rotulos.crear('Imán A')
  const nombreB = rotulos.crear('Imán B')

  /** Coloca las dos mitades de una pieza: cada una se extiende del extremo de su polo al centro de la pieza. */
  function ubicar(parte: Parte, p: Pieza, polos: boolean) {
    const centro = (p.x0 + p.x1) / 2
    for (const [malla, xPolo, pildora] of [[parte.n, p.xN, parte.pN], [parte.s, p.xS, parte.pS]] as const) {
      const x = (xPolo + centro) / 2
      malla.scale.set(Math.abs(centro - xPolo) * ESC, ALTO_IMAN, LADO * ESC)
      malla.position.set(aX(x), ALTO_IMAN / 2, 0)
      pildora.ancla.set(aX(x), ALTO_IMAN + 0.35, 0)
      // En las partes angostas las dos pastillas se pisarían: se abren hacia los costados.
      pildora.dx = Math.abs(p.x1 - p.x0) < 2 ? Math.sign(xPolo - centro) * 11 : 0
      pildora.el.hidden = !polos
    }
    parte.grupo.visible = true
  }

  function pintar(mat: ReturnType<typeof materiales>, fuerza: number, caliente: number) {
    mat.n.color.set(COLOR_N).lerp(GRIS, 1 - fuerza).multiplyScalar(OSCURECER)
    mat.s.color.set(COLOR_S).lerp(GRIS, 1 - fuerza).multiplyScalar(OSCURECER)
    for (const m of [mat.n, mat.s]) {
      m.emissive.set(0xff4a10)
      m.emissiveIntensity = caliente
    }
  }

  return {
    actualizar(c: Config) {
      const fuerza = magnetizacion(c)
      // El brillo rojo es una señal visual, no un dato: crece al acercarse al punto de Curie.
      const caliente = smooth(250, TIPOS[c.tipo].curie + 100, c.temp) * 0.9
      pintar(matA, fuerza, caliente)
      pintar(matB, 1, 0)
      const piezas = piezasA(c)
      partesA.forEach((parte, i) => {
        const p = piezas[i]
        parte.grupo.visible = Boolean(p)
        if (!p) {
          parte.pN.el.hidden = parte.pS.el.hidden = true
          return
        }
        ubicar(parte, p, fuerza > 0.001)
      })
      const xs = piezas.flatMap((p) => [p.x0, p.x1])
      nombreA.ancla.set(aX((Math.min(...xs) + Math.max(...xs)) / 2), ALTO_IMAN + 0.95, 0)
      const hayB = c.modo === 'dos'
      parteB.grupo.visible = hayB
      nombreB.el.hidden = !hayB
      if (hayB) {
        const b = piezaB(c.gap)
        ubicar(parteB, b, true)
        nombreB.ancla.set(aX((b.x0 + b.x1) / 2), ALTO_IMAN + 0.95, 0)
      } else {
        parteB.pN.el.hidden = parteB.pS.el.hidden = true
      }
    },
  }
}
