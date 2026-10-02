// El volcán cortado por la mitad (se ve el conducto) y su erupción: coladas y fuentes de lava, columna de ceniza y bombas.
import * as THREE from 'three'
import type { Nube, Particula } from './nube'
import { rampa } from './nube'

const T_LAVA = 11, T_FUENTE = 12, T_CENIZA = 13, T_BOMBA = 14, T_BRASA = 15
const GRAVEDAD = 3.4

export interface Erupcion {
  /** 0 → 1: la erupción llega a su régimen. */
  nivel: number
  /** Explosividad 0 → 1. */
  e: number
  /** Viscosidad normalizada 0 → 1 (fluida → pastosa). */
  eta: number
}

/** Forma del cono según la viscosidad: escudo ancho y bajo si es fluido, cono alto y empinado si es pastoso. */
function perfil(eta: number) {
  const base = 2.2 - 1.0 * eta
  const alto = 0.7 + 0.75 * eta
  const crater = 0.2
  const q = 0.9 + 0.5 * eta
  const radio = (u: number) => crater + u * (base - crater)
  const altura = (u: number) => alto * (1 - u) ** q
  const largo = Math.hypot(base - crater, alto) * 1.05
  return { base, alto, crater, radio, altura, largo }
}

export function crearVolcan(scene: THREE.Scene, brillo: Nube, humo: Nube) {
  const grupo = new THREE.Group()
  scene.add(grupo)
  let forma = perfil(0)
  let etaForma = -1
  let activo = false
  let mostrando = true
  let limites = { izq: -Infinity, der: Infinity }
  let fraccion = { lava: 0, fuente: 0, ceniza: 0, bomba: 0 }
  const material = new THREE.MeshStandardMaterial({ color: 0x4a3f36, roughness: 0.95, side: THREE.DoubleSide })
  const corte = new THREE.MeshStandardMaterial({ color: 0x74614d, roughness: 0.9 })
  const conductoMaterial = new THREE.MeshBasicMaterial({ color: 0xffb445, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  const cuerpo = new THREE.Group()
  grupo.add(cuerpo)

  function reconstruir(eta: number) {
    cuerpo.children.forEach((o) => o instanceof THREE.Mesh && o.geometry.dispose())
    cuerpo.clear()
    forma = perfil(eta)
    const { base, alto, crater, radio, altura } = forma
    const flanco = Array.from({ length: 21 }, (_, i) => new THREE.Vector2(radio(1 - i / 20), altura(1 - i / 20)))
    // La mitad de atrás del cono: el plano del corte (z = 0) queda de frente.
    const lateral = new THREE.Mesh(new THREE.LatheGeometry([...flanco, new THREE.Vector2(crater * 0.55, alto - 0.12), new THREE.Vector2(0, alto - 0.15)], 28, Math.PI / 2, Math.PI), material)
    const izq = flanco.map((v) => new THREE.Vector2(-v.x, v.y))
    const cara = new THREE.Mesh(
      new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-base, 0), ...izq, new THREE.Vector2(0, alto - 0.15), ...[...flanco].reverse(), new THREE.Vector2(base, 0)])),
      corte,
    )
    cara.position.z = 0.005
    const conducto = new THREE.Mesh(new THREE.PlaneGeometry(0.13, alto - 0.1), conductoMaterial)
    conducto.position.set(0, (alto - 0.1) / 2, 0.03)
    conducto.renderOrder = 1
    cuerpo.add(lateral, cara, conducto)
  }

  const cx = () => grupo.position.x
  const base = () => grupo.position.y
  const azar = () => Math.random() - 0.5

  return {
    colocar(volcan: { x: number; base: number; izq: number; der: number } | null) {
      activo = volcan !== null
      grupo.visible = activo && mostrando
      if (volcan) {
        grupo.position.set(volcan.x, volcan.base, 0)
        limites = { izq: volcan.izq, der: volcan.der }
      }
    },
    /** Esconde o muestra el volcán (mientras una pregunta espera, el borde sin volcán no tiene que delatarse). */
    mostrar(si: boolean) {
      mostrando = si
      grupo.visible = activo && si
    },
    /** Cuánto del conducto se ve prendido (0 → 1) mientras el magma sube. */
    conducto(v: number) {
      conductoMaterial.opacity = 0.9 * v
    },
    emitir(dt: number, { nivel, e, eta }: Erupcion) {
      if (!activo || dt <= 0) return
      const etaQ = Math.round(eta * 20) / 20
      if (etaQ !== etaForma) {
        etaForma = etaQ
        reconstruir(etaQ)
      }
      const I = rampa(nivel, 0, 0.5)
      const cima = base() + forma.alto
      const sale = { x: cx(), y: cima - 0.05 }
      if (I > 0) brillo.emitir({ tipo: T_BRASA, ...sale, z: 0.06, vida: dt * 1.6, tam: 0.9 + 0.5 * I, r: 1, g: 0.5, b: 0.15, a: 0.3 * I })
      const ritmos = {
        lava: 26 * I * (1 - rampa(e, 0.25, 0.7)),
        fuente: 22 * I * (0.35 + 0.65 * Math.min(1, e / 0.4)) * (1 - rampa(e, 0.55, 0.9)),
        ceniza: 70 * I * rampa(e, 0.3, 0.6),
        bomba: 7 * I * rampa(e, 0.45, 0.9),
      }
      for (const k of ['lava', 'fuente', 'ceniza', 'bomba'] as const) {
        fraccion[k] += ritmos[k] * dt
        for (; fraccion[k] >= 1; fraccion[k]--) {
          if (k === 'lava') {
            const velocidad = 0.5 + 1.1 * (1 - eta)
            const rodar = 0.3 + 3.2 * (1 - eta)
            brillo.emitir({ tipo: T_LAVA, x: sale.x, y: sale.y, z: 0.05 + Math.random() * 0.06, v: Math.random() < 0.5 ? -1 : 1, vx: velocidad, u: 0, vida: (forma.largo + rodar) / velocidad })
          } else if (k === 'fuente') {
            brillo.emitir({ tipo: T_FUENTE, ...sale, z: 0.05 + azar() * 0.1, vx: azar() * 0.7, vy: 1.4 + 1.8 * e + Math.random() * 0.6, vida: 1.8, tam: 0.15, r: 1, g: 0.62, b: 0.2 })
          } else if (k === 'ceniza') {
            humo.emitir({ tipo: T_CENIZA, ...sale, z: azar() * 0.5, vx: azar() * 0.6, vy: 1 + 1.6 * e + Math.random() * 0.4, vida: 3.6 + Math.random(), tam: 0.3 })
          } else {
            brillo.emitir({ tipo: T_BOMBA, ...sale, z: azar() * 0.4, vx: azar() * 3.2, vy: 2.4 + Math.random() * 2.2, vida: 2.6, tam: 0.1, r: 1, g: 0.5, b: 0.18 })
          }
        }
      }
    },
    mover(p: Particula, dt: number): boolean {
      const k = p.edad / p.vida
      switch (p.tipo) {
        case T_LAVA: {
          p.u += p.vx * dt
          const d = p.u
          if (d < forma.largo) {
            const t = d / forma.largo
            p.x = cx() + p.v * forma.radio(t)
            p.y = base() + forma.altura(t)
          } else {
            p.x = cx() + p.v * (forma.base + (d - forma.largo) * 0.9)
            p.y = base() + 0.02
            // La colada se frena en el borde del continente o del bloque.
            if (p.x < limites.izq || p.x > limites.der) p.vida = 0
          }
          p.tam = 0.22 - 0.08 * k
          p.r = 1
          p.g = 0.55 - 0.35 * k
          p.b = 0.12
          p.a = 0.95 - 0.55 * k
          return true
        }
        case T_FUENTE:
        case T_BOMBA: {
          p.vy -= (p.tipo === T_BOMBA ? GRAVEDAD * 1.3 : GRAVEDAD) * dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.a = 1 - rampa(k, 0.6, 1)
          p.g = 0.62 - 0.3 * k
          return true
        }
        case T_CENIZA: {
          p.vy *= Math.exp(-0.6 * dt)
          p.vx += (p.x - cx()) * 0.45 * rampa(k, 0.35, 1) * dt + azar() * 1.2 * dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.tam = 0.3 + 1.0 * k
          const gris = 0.2 + 0.18 * k
          p.r = gris + 0.02
          p.g = gris
          p.b = gris - 0.02
          p.a = 0.6 * Math.sin(Math.PI * Math.min(1, k * 1.1)) ** 0.8
          return true
        }
        default:
          return false
      }
    },
    /** Rebobina la erupción (cambió el borde o el magma). */
    reiniciar() {
      fraccion = { lava: 0, fuente: 0, ceniza: 0, bomba: 0 }
    },
  }
}
export type Volcan = ReturnType<typeof crearVolcan>
