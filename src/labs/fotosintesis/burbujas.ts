import * as THREE from 'three'
import { BURBUJA_HEX, CO2_HEX, PLANTA, VASO } from './constantes'

const BURBUJAS = 80
const CO2_PUNTOS = 70
const SUBIDA_SEG = 2.2

interface Burbuja {
  vivo: boolean
  nacio: number
  fase: number
  radio: number
}

/**
 * O₂ que sube desde el corte del tallo (una InstancedMesh) y CO₂ disuelto que se mete en las hojas.
 * Las burbujas viven en tiempo real (no dependen de la velocidad del experimento).
 */
export function crearBurbujas(scene: THREE.Scene) {
  const burbujas = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ color: BURBUJA_HEX, toneMapped: false }), BURBUJAS)
  burbujas.frustumCulled = false
  scene.add(burbujas)
  const estado: Burbuja[] = Array.from({ length: BURBUJAS }, () => ({ vivo: false, nacio: 0, fase: 0, radio: 0.08 }))

  const co2 = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: CO2_HEX, toneMapped: false }), CO2_PUNTOS)
  co2.frustumCulled = false
  scene.add(co2)
  const puntos = Array.from({ length: CO2_PUNTOS }, () => ({
    desde: new THREE.Vector3(), hacia: new THREE.Vector3(), t: Math.random(), azar: Math.random() * 10,
  }))
  const sortear = (p: (typeof puntos)[number]) => {
    const ang = Math.random() * Math.PI * 2
    const r = Math.sqrt(Math.random()) * (VASO.radio - 0.2)
    p.desde.set(Math.cos(ang) * r, 0.4 + Math.random() * (VASO.nivel - 0.5), Math.sin(ang) * r)
    p.hacia.set((Math.random() - 0.5) * 0.5, 0.6 + Math.random() * 1.6, (Math.random() - 0.5) * 0.5)
    p.t = 0
  }
  puntos.forEach((p) => {
    sortear(p)
    p.t = Math.random()
  })

  const m = new THREE.Matrix4()
  const giro = new THREE.Quaternion()
  const pos = new THREE.Vector3()
  const escala = new THREE.Vector3()

  return {
    /** Suma burbujas nuevas en el corte del tallo. */
    emitir(cantidad: number, ahora: number) {
      for (let n = 0; n < cantidad; n++) {
        const b = estado.find((x) => !x.vivo)
        if (!b) return
        Object.assign(b, { vivo: true, nacio: ahora - n * 0.05, fase: Math.random() * 6.28, radio: 0.08 + Math.random() * 0.03 })
      }
    },
    /**
     * `co2` en % (cuántos puntitos hay) y `actividad` de 0 a 1 (qué tan rápido entran a las hojas).
     * `dt` en segundos reales.
     */
    actualizar(co2Pct: number, actividad: number, ahora: number, dt: number) {
      const subida = VASO.nivel + 0.1 - PLANTA.corte.y
      estado.forEach((b, i) => {
        if (!b.vivo) return void burbujas.setMatrixAt(i, m.compose(pos.set(0, -9, 0), giro, escala.setScalar(0)))
        const edad = ahora - b.nacio
        const u = edad / SUBIDA_SEG
        if (u >= 1) b.vivo = false
        const y = PLANTA.corte.y + subida * (u * u * 0.35 + u * 0.65)
        const tam = b.radio * (0.35 + 0.65 * Math.min(edad / 0.5, 1) + u * 0.25)
        pos.set(PLANTA.corte.x + Math.sin(edad * 7 + b.fase) * 0.05 * u, y, Math.cos(edad * 6 + b.fase) * 0.05 * u)
        m.compose(pos, giro, escala.setScalar(b.vivo ? Math.max(tam, 0) : 0))
        burbujas.setMatrixAt(i, m)
      })
      burbujas.instanceMatrix.needsUpdate = true

      const visibles = Math.round((CO2_PUNTOS * co2Pct) / 100)
      puntos.forEach((p, i) => {
        if (i >= visibles) return void co2.setMatrixAt(i, m.compose(pos.set(0, -9, 0), giro, escala.setScalar(0)))
        p.t += dt * (0.05 + 0.3 * actividad)
        if (p.t >= 1) sortear(p)
        const e = p.t * p.t * (3 - 2 * p.t)
        pos.lerpVectors(p.desde, p.hacia, e)
        pos.x += Math.sin(ahora * 1.3 + p.azar) * 0.04
        pos.y += Math.cos(ahora * 1.1 + p.azar * 2) * 0.04
        co2.setMatrixAt(i, m.compose(pos, giro, escala.setScalar(0.045 * (1 - p.t * p.t))))
      })
      co2.instanceMatrix.needsUpdate = true
    },
  }
}
