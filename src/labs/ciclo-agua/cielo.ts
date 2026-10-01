import * as THREE from 'three'
import { COLOR, semilla } from './constantes'
import type { Estado, Flujos } from './model'

const PUFFS = 9
const GOTAS = 320
const VAPORES = 70
/** Centros de las 3 nubes sin montaña y con montaña (el aire sube por la ladera y las nubes se juntan ahí). */
const NUBES_LLANURA = [new THREE.Vector3(-1.9, 3.95, 0.1), new THREE.Vector3(0.5, 4, -0.3), new THREE.Vector3(2.7, 3.9, 0.2)]
const NUBES_MONTANA = [new THREE.Vector3(-1.2, 3.9, 0.3), new THREE.Vector3(1.3, 4.05, 0.1), new THREE.Vector3(2.2, 4, -0.2)]
const BLANCA = new THREE.Color(0xeef2ff)
const CARGADA = new THREE.Color(0x7c87a6)
const VELOCIDAD_GOTA = 6

type Altura = (x: number, z: number) => number

/** Vapor que sube del mar, nubes que crecen con el agua acumulada y lluvia (InstancedMesh) según la precipitación. */
export function crearCielo(scene: THREE.Scene, altura: Altura) {
  const azar = semilla(5)
  const material = new THREE.MeshStandardMaterial({ color: BLANCA, roughness: 1, emissive: 0x8892b0, emissiveIntensity: 0.3 })
  const nubes = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), material, PUFFS * 3)
  const puffs = Array.from({ length: PUFFS * 3 }, () => ({
    dx: (azar() - 0.5) * 1.3, dy: (azar() - 0.5) * 0.28, dz: (azar() - 0.5) * 0.7, r: 0.28 + azar() * 0.24, f: azar() * 6,
  }))
  const gotas = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.22, 4),
    new THREE.MeshBasicMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.85, toneMapped: false }),
    GOTAS,
  )
  const vapor = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: COLOR.nube, transparent: true, opacity: 0.5, depthWrite: false }), VAPORES)
  nubes.frustumCulled = gotas.frustumCulled = vapor.frustumCulled = false
  scene.add(nubes, gotas, vapor)

  const gx = new Float32Array(GOTAS)
  const gy = new Float32Array(GOTAS)
  const gz = new Float32Array(GOTAS)
  const viva = new Uint8Array(GOTAS)
  const vx = Array.from({ length: VAPORES }, () => -3.7 + azar() * 2.1)
  const vz = Array.from({ length: VAPORES }, () => (azar() - 0.5) * 3)
  const vf = Array.from({ length: VAPORES }, (_, i) => i / VAPORES)
  let acumulado = 0
  const centro = new THREE.Vector3()
  const m4 = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const p = new THREE.Vector3()
  const s = new THREE.Vector3()
  const ancla = new THREE.Vector3()

  function sortearGota(f: Flujos, montana: boolean) {
    const i = viva.indexOf(0)
    if (i < 0) return
    const r = Math.random()
    const x = r < f.fMar ? -3.7 + Math.random() * 2.4 : montana && Math.random() < f.fLadera ? 0.1 + Math.random() * 1.8 : -0.8 + Math.random() * 4.6
    const z = (Math.random() - 0.5) * 3
    const y = 3.75 - Math.random() * 0.25
    if (y < altura(x, z) + 0.25) return
    gx[i] = x
    gy[i] = y
    gz[i] = z
    viva[i] = 1
  }

  return {
    /** Dónde anclar la pastilla "Nubes". */
    ancla,
    /** `relieve` de 0 a 1; `dt` y `t` en segundos visuales. */
    actualizar(e: Estado, f: Flujos, nivel: number, relieve: number, dt: number, t: number) {
      // Nubes: crecen con el agua que tienen y se oscurecen cuando están cargadas.
      const carga = Math.min(1, Math.max(0, e.nubes - 0.3) / 10)
      const tam = carga ** 0.6
      material.color.copy(BLANCA).lerp(CARGADA, Math.min(1, Math.max(0, e.nubes - 3) / 9))
      for (let c = 0; c < 3; c++) {
        centro.lerpVectors(NUBES_LLANURA[c], NUBES_MONTANA[c], relieve)
        if (c === 1) ancla.copy(centro).setY(centro.y + 0.55 * tam + 0.2)
        const extra = c > 0 ? 1 + 0.25 * relieve : 1
        for (let k = 0; k < PUFFS; k++) {
          const pf = puffs[c * PUFFS + k]
          p.set(centro.x + pf.dx * (0.5 + tam), centro.y + pf.dy + 0.04 * Math.sin(t * 0.6 + pf.f), centro.z + pf.dz)
          nubes.setMatrixAt(c * PUFFS + k, m4.compose(p, q, s.set(pf.r * tam * extra, pf.r * tam * 0.75 * extra, pf.r * tam * extra)))
        }
      }
      nubes.instanceMatrix.needsUpdate = true

      // Lluvia: una gota por cada tanto de agua que cae.
      acumulado += 90 * f.prec * dt
      for (; acumulado >= 1; acumulado--) sortearGota(f, relieve > 0.5)
      for (let i = 0; i < GOTAS; i++) {
        if (viva[i]) {
          gy[i] -= VELOCIDAD_GOTA * dt
          if (gy[i] < Math.max(altura(gx[i], gz[i]), nivel)) viva[i] = 0
        }
        gotas.setMatrixAt(i, m4.compose(p.set(gx[i], gy[i], gz[i]), q, s.setScalar(viva[i])))
      }
      gotas.instanceMatrix.needsUpdate = true

      // Vapor: sube del mar y se va hacia las nubes.
      const n = Math.round(VAPORES * Math.min(1, f.evap / 3))
      for (let i = 0; i < VAPORES; i++) {
        vf[i] = (vf[i] + dt * 0.14) % 1
        const sube = vf[i]
        p.set(vx[i] + sube * 0.9 + 0.06 * Math.sin(t * 1.4 + i), nivel + sube * (3.5 - nivel), vz[i] + 0.06 * Math.cos(t + i * 2))
        vapor.setMatrixAt(i, m4.compose(p, q, s.setScalar(i < n ? 0.05 * Math.sin(Math.PI * sube) : 0)))
      }
      vapor.instanceMatrix.needsUpdate = true
    },
  }
}
