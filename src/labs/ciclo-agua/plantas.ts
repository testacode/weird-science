import * as THREE from 'three'
import { COLOR, puntoRio, semilla } from './constantes'

const N = 24
const VAPORES = 36

type Altura = (x: number, z: number) => number

/** Z por donde pasa el río en `x` (para no plantar encima), o `null` si el río no llega a ese x. */
function zDelRio(x: number): number | null {
  const t = (1.9 - x) / 3.1
  return t < 0 || t > 1 ? null : puntoRio(t).z
}

/** Arbustos sobre la tierra (se achican y se talan con la cobertura) y el vapor de la transpiración que sube de sus hojas. */
export function crearPlantas(scene: THREE.Scene, altura: Altura) {
  const azar = semilla(11)
  const lugares: { x: number; z: number; tam: number }[] = []
  while (lugares.length < N) {
    const x = -0.5 + azar() * 4.2
    const z = (azar() - 0.5) * 2.9
    const rio = zDelRio(x)
    if (rio !== null && Math.abs(z - rio) < 0.4) continue
    lugares.push({ x, z, tam: 0.8 + azar() * 0.5 })
  }

  const troncos = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.05, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0x5b4330, roughness: 0.9 }), N)
  const copas = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.3, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }), N)
  const verde = new THREE.Color()
  lugares.forEach((_, i) => copas.setColorAt(i, verde.setHSL(0.25 + azar() * 0.07, 0.55, 0.22 + azar() * 0.1)))
  troncos.frustumCulled = copas.frustumCulled = false
  const vapor = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: COLOR.nube, transparent: true, opacity: 0.6, depthWrite: false }), VAPORES)
  vapor.frustumCulled = false
  scene.add(troncos, copas, vapor)

  const crecimiento = new Array<number>(N).fill(0)
  let iniciado = false
  const fase = Array.from({ length: VAPORES }, (_, i) => i / VAPORES)
  const m4 = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const p = new THREE.Vector3()
  const s = new THREE.Vector3()
  const ancla = new THREE.Vector3(2.6, 2, 0)
  const copaDe = new THREE.Vector3()

  return {
    /** Dónde anclar la pastilla "Plantas": la copa de una planta viva. */
    ancla,
    /** `cobertura` de 0 a 1, `trans` en mm/h. `dtCrece` (siempre corre) y `dt` (se frena en pausa) en segundos. */
    actualizar(cobertura: number, trans: number, dtCrece: number, dt: number, t: number) {
      const visibles = Math.round(cobertura * N)
      const vivas: number[] = []
      lugares.forEach((l, i) => {
        const h = altura(l.x, l.z)
        // En la cima de la montaña no crece nada.
        const meta = i < visibles ? 1 - THREE.MathUtils.smoothstep(h, 2.1, 2.6) : 0
        crecimiento[i] = iniciado ? crecimiento[i] + (meta - crecimiento[i]) * (1 - Math.exp(-dtCrece * 3)) : meta
        const g = crecimiento[i]
        const tronco = 0.2 + 0.8 * g
        troncos.setMatrixAt(i, m4.compose(p.set(l.x, h + 0.15 * tronco * l.tam, l.z), q, s.set(l.tam, tronco * l.tam, l.tam)))
        const tamCopa = Math.max(l.tam * g, 1e-3)
        copas.setMatrixAt(i, m4.compose(p.set(l.x, h + 0.3 * tronco * l.tam + 0.2 * tamCopa, l.z), q, s.set(tamCopa, tamCopa * 1.15, tamCopa)))
        if (g > 0.5) vivas.push(i)
      })
      troncos.instanceMatrix.needsUpdate = copas.instanceMatrix.needsUpdate = true
      iniciado = true

      if (vivas.length) {
        const l = lugares[vivas[vivas.length - 1]]
        ancla.set(l.x, altura(l.x, l.z) + 0.85 * l.tam, l.z)
      }
      const n = vivas.length ? Math.round(VAPORES * Math.min(1, trans / 0.5)) : 0
      for (let i = 0; i < VAPORES; i++) {
        fase[i] = (fase[i] + dt * 0.25) % 1
        if (i >= n) {
          vapor.setMatrixAt(i, m4.compose(p.set(0, -9, 0), q, s.setScalar(0)))
          continue
        }
        const l = lugares[vivas[i % vivas.length]]
        copaDe.set(l.x, altura(l.x, l.z) + 0.55 * l.tam, l.z)
        p.set(copaDe.x + 0.08 * Math.sin(t * 1.3 + i), copaDe.y + fase[i] * 1.0, copaDe.z + 0.08 * Math.cos(t + i))
        vapor.setMatrixAt(i, m4.compose(p, q, s.setScalar(0.05 * Math.sin(Math.PI * fase[i]))))
      }
      vapor.instanceMatrix.needsUpdate = true
    },
  }
}
