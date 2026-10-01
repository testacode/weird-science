// Partículas de comida: una sola InstancedMesh con un grupo por bocado, color por macronutriente.
import * as THREE from 'three'
import { MACROS, posicionEnTubo, type Estado, type Macro } from './model'
import { despEnTubo } from './explosion'
import { puntoEnTubo, radioEnTubo } from './tubo'

export const COLOR: Record<Macro, number> = { carbos: 0xd99a1e, proteinas: 0xd6337a, grasas: 0x2f9fd8 }
const PARTICULAS = 96
const VUELO_SEG = 1.4

interface Particula {
  macro: Macro
  bocado: number
  /** Lugar dentro de su grupo (macro + bocado): decide cuándo se achica y cuándo se absorbe. */
  rango: number
  desfase: number
  offset: THREE.Vector3
  absorbidaEn: number | null
  desde: THREE.Vector3
}

export function crearParticulas(scene: THREE.Scene, destinoAbsorcion: THREE.Vector3) {
  const bolitas = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ toneMapped: false }), PARTICULAS)
  bolitas.frustumCulled = false
  scene.add(bolitas)
  let particulas: Particula[] = []
  const matriz = new THREE.Matrix4()
  const pos = new THREE.Vector3()
  const desp = new THREE.Vector3()
  const escala = new THREE.Vector3()
  const giro = new THREE.Quaternion()

  /** Reparte las partículas por macronutriente y, dentro de cada uno, entre los bocados. */
  function setComida(gramos: Record<Macro, number>, bocados: number) {
    const total = MACROS.reduce((s, m) => s + gramos[m], 0)
    particulas = []
    for (const m of MACROS) {
      const n = Math.round((gramos[m] / total) * PARTICULAS)
      for (let i = 0; i < n && particulas.length < PARTICULAS; i++) {
        const bocado = i % bocados
        const enGrupo = Math.ceil((n - bocado) / bocados)
        particulas.push({
          macro: m, bocado, rango: Math.floor(i / bocados) / enGrupo, desfase: (Math.random() - 0.5) * 0.02,
          offset: new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 0.6), absorbidaEn: null, desde: new THREE.Vector3(),
        })
      }
    }
    bolitas.count = particulas.length
    particulas.forEach((p, i) => bolitas.setColorAt(i, new THREE.Color(COLOR[p.macro])))
    if (bolitas.instanceColor) bolitas.instanceColor.needsUpdate = true
  }

  /** `estados[i]` es el bocado i; los que todavía no entraron no se ven. */
  function ubicar(estados: Estado[], f: number, ahora: number) {
    particulas.forEach((p, i) => {
      const estado = estados[p.bocado]
      if (!estado) {
        bolitas.setMatrixAt(i, matriz.makeScale(0, 0, 0))
        return
      }
      const posicion = posicionEnTubo(estado)
      const pool = estado.nutrientes[p.macro]
      const total = pool.intacto + pool.digerido + pool.absorbido
      const fAbs = pool.absorbido / total
      const fDig = pool.digerido / total
      puntoEnTubo(posicion + p.desfase, pos).addScaledVector(p.offset, radioEnTubo(posicion)).add(despEnTubo(posicion + p.desfase, f, desp))
      let tam = p.rango < fAbs + fDig ? 0.055 : 0.11
      if (p.rango < fAbs) {
        if (p.absorbidaEn === null) {
          p.absorbidaEn = ahora
          p.desde.copy(pos)
        }
        const t = Math.min((ahora - p.absorbidaEn) / VUELO_SEG, 1)
        pos.lerpVectors(p.desde, destinoAbsorcion, t).y += Math.sin(t * Math.PI) * 0.8
        tam = t >= 1 ? 0 : 0.06
      } else p.absorbidaEn = null
      matriz.compose(pos, giro, escala.setScalar(tam))
      bolitas.setMatrixAt(i, matriz)
    })
    bolitas.instanceMatrix.needsUpdate = true
  }

  return { setComida, ubicar }
}
