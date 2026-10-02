// Lo que se mueve dentro del corte: manto que sube y se abre (dorsal), placa que se hunde y suelta agua (subducción),
// gotas de magma que suben por el conducto y sismos (anillos que se expanden).
import * as THREE from 'three'
import { FONDO_Y, LITOSFERA, W, XT, baseDorsal, y, type Geo } from './geometria'
import { FUSION, type Borde } from './model'
import type { Nube, Particula } from './nube'
import { rampa } from './nube'

const T_MANTO = 1, T_PLACA = 2, T_AGUA = 3, T_MAGMA = 4
const N_ANILLOS = 10
/** Segundos que tarda una gota de magma en subir de la zona de fusión al cráter. */
const SUBIDA = 2.2
const SISMOS_POR_SEG: Record<Borde, number> = { divergente: 0.7, convergente: 1.3, transformante: 2 }

/** Punto a una fracción `u` de la polilínea y su normal horizontal (para dispersar las gotas). */
function sobreRuta(ruta: [number, number][], u: number): [number, number] {
  const n = ruta.length - 1
  const t = Math.min(Math.max(u, 0), 1) * n
  const i = Math.min(Math.floor(t), n - 1)
  const f = t - i
  return [ruta[i][0] + (ruta[i + 1][0] - ruta[i][0]) * f, ruta[i][1] + (ruta[i + 1][1] - ruta[i][1]) * f]
}

export function crearFlujo(scene: THREE.Scene, brillo: Nube) {
  const anillos = Array.from({ length: N_ANILLOS }, () => {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1, 40),
      new THREE.MeshBasicMaterial({ color: 0xffd37a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    )
    m.visible = false
    m.renderOrder = 4
    scene.add(m)
    return { m, edad: 0, vida: 0 }
  })
  let acum = { manto: 0, placa: 0, agua: 0, magma: 0, sismo: 0 }
  let geo: Geo | null = null
  let borde: Borde = 'divergente'
  let ruta: [number, number][] = []
  const azar = () => Math.random() - 0.5

  function sismo() {
    const libre = anillos.find((a) => a.edad >= a.vida)
    if (!libre || !geo) return
    const [x, yy] = geo.sismo()
    libre.m.position.set(x, yy, 0.05)
    libre.edad = 0
    libre.vida = 1
    libre.m.visible = true
  }

  return {
    colocar(g: Geo, b: Borde) {
      geo = g
      borde = b
      ruta = g.conducto
      acum = { manto: 0, placa: 0, agua: 0, magma: 0, sismo: 0 }
    },
    /** `fusion` (0 → 1) manda cuándo empieza a subir el magma; el manto, la placa, el agua y los sismos corren siempre. */
    emitir(dt: number, fusion: number) {
      if (!geo || dt <= 0) return
      const rate = {
        manto: borde === 'divergente' ? 34 : 0,
        placa: borde === 'convergente' ? 16 : 0,
        agua: borde === 'convergente' ? 14 : 0,
        magma: FUSION[borde].produccion > 0 ? 16 * (0.5 + 0.5 * FUSION[borde].produccion) * rampa(fusion, 0.3, 0.45) : 0,
        sismo: SISMOS_POR_SEG[borde],
      }
      for (const k of Object.keys(rate) as (keyof typeof rate)[]) acum[k] += rate[k] * dt
      for (; acum.manto >= 1; acum.manto--) {
        brillo.emitir({ tipo: T_MANTO, x: azar() * 5, y: FONDO_Y + 0.05, z: 0.06, vida: 8, tam: 0.08, r: 1, g: 0.55, b: 0.2, a: 0.55 })
      }
      for (; acum.placa >= 1; acum.placa--) {
        // Puntos que viajan con la placa: planos hasta la fosa y después hacia abajo, a 45°.
        brillo.emitir({ tipo: T_PLACA, x: -W, y: 0, z: 0.06, u: 0, v: 0.1 + Math.random() * (LITOSFERA * 0.8 - 0.2), vida: 12, tam: 0.07, r: 0.55, g: 0.8, b: 1, a: 0.6 })
      }
      for (; acum.agua >= 1; acum.agua--) {
        // Nacen en la placa entre los 70 y los 120 km y suben hacia la cuña de manto.
        const yy = y(70 + Math.random() * 50)
        brillo.emitir({ tipo: T_AGUA, x: XT + (-0.3 - yy) + 0.08, y: yy, z: 0.06, vx: 0.18 + Math.random() * 0.1, vy: 0.5 + Math.random() * 0.15, vida: 2.4, tam: 0.09, r: 0.35, g: 0.8, b: 1, a: 0.9 })
      }
      for (; acum.magma >= 1; acum.magma--) {
        brillo.emitir({ tipo: T_MAGMA, z: 0.07, u: 0, v: azar() * 1.2, vida: SUBIDA, tam: 0.15, r: 1, g: 0.75, b: 0.25, a: 1 })
      }
      for (; acum.sismo >= 1; acum.sismo--) sismo()
    },
    mover(p: Particula, dt: number): boolean {
      const k = p.edad / p.vida
      switch (p.tipo) {
        case T_MANTO: {
          // Sube por el eje de la dorsal y se abre bajo las placas; en el fondo converge hacia el eje.
          const h = rampa(p.y, -3.6, -1.2)
          const V = 0.5 + 0.2 * FUSION[borde].velocidad
          p.vx = V * (Math.sign(p.x || 1) * h * Math.min(1, Math.abs(p.x) * 1.5) - 0.3 * p.x * (1 - h))
          p.vy = V * Math.exp(-(p.x * p.x) / 2) * (1 - h)
          p.x += p.vx * dt
          p.y = Math.min(p.y + p.vy * dt, baseDorsal(p.x) - 0.25)
          p.a = 0.55 * Math.sin(Math.PI * k)
          if (Math.abs(p.x) > W) p.vida = 0
          return true
        }
        case T_PLACA: {
          const velocidad = 0.2 + FUSION[borde].velocidad * 0.12
          p.u += velocidad * dt
          const largoPlano = XT + W
          if (p.u < largoPlano) {
            p.x = -W + p.u
            p.y = -0.3 - p.v
          } else {
            const s = (p.u - largoPlano) / Math.SQRT2
            p.x = XT + s
            p.y = -0.3 - p.v - s
          }
          p.a = 0.6 * Math.min(1, k * 8) * (1 - rampa(k, 0.9, 1))
          if (p.y < FONDO_Y) p.vida = 0
          return true
        }
        case T_AGUA: {
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.a = 0.9 * Math.sin(Math.PI * k)
          return true
        }
        case T_MAGMA: {
          const u = k
          const [x, yy] = sobreRuta(ruta, u)
          p.x = x + p.v * (1 - u) ** 1.6
          p.y = yy
          p.a = rampa(u, 0, 0.1) * (1 - rampa(u, 0.92, 1))
          return true
        }
        default:
          return false
      }
    },
    /** Los anillos de sismo se expanden y se apagan. */
    anillos(dt: number) {
      for (const a of anillos) {
        if (a.edad >= a.vida) continue
        a.edad += dt
        const k = a.edad / a.vida
        a.m.scale.setScalar(0.06 + 0.5 * k)
        ;(a.m.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k)
        if (k >= 1) a.m.visible = false
      }
    },
  }
}
export type Flujo = ReturnType<typeof crearFlujo>
