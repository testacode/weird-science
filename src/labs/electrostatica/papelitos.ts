// Papelitos neutros sobre la mesa. Cada uno siente la atracción por polarización (modelo) contra su propio peso.
import * as THREE from 'three'
import { MASA_RELATIVA, PESO_PAPEL, polarizacion } from './model'

const CANTIDAD = 10
/** Los papelitos se mueven con velocidad ilustrativa (cm/s de pantalla), en cámara lenta respecto de la física real. */
const VEL_BASE = 8
const VEL_MAX = 55
const CAIDA = 28
const LADO = 1.2
const NO_ALEATORIO = (i: number) => (Math.sin(i * 91.7) + 1) / 2

interface Papel {
  pos: THREE.Vector3
  /** Posición respecto del objeto una vez pegado. */
  rel: THREE.Vector3
  pegado: boolean
  /** Se despegó y cae hacia la mesa: no siente la atracción hasta apoyarse. */
  cae: boolean
  /** Masa relativa (`MASA_RELATIVA`): no todos despegan a la vez. */
  masa: number
  giro: number
  base: number
}

export function crearPapelitos(scene: THREE.Scene) {
  const malla = new THREE.InstancedMesh(new THREE.BoxGeometry(LADO, 0.04, LADO), new THREE.MeshStandardMaterial({ color: 0x857f6c, roughness: 1 }), CANTIDAD)
  malla.frustumCulled = false
  scene.add(malla)
  const papeles: Papel[] = Array.from({ length: CANTIDAD }, (_, i) => ({
    pos: new THREE.Vector3(), rel: new THREE.Vector3(), pegado: false, cae: false, masa: MASA_RELATIVA.min + (MASA_RELATIVA.max - MASA_RELATIVA.min) * NO_ALEATORIO(i + 3), giro: NO_ALEATORIO(i) * Math.PI, base: 0.03 + i * 0.045,
  }))
  const m = new THREE.Object3D()

  /** Los papelitos vuelven a la mesa, en un montoncito. */
  function reponer() {
    papeles.forEach((p, i) => {
      const ang = i * 2.399963
      const r = 1.5 * Math.sqrt((i + 0.5) / CANTIDAD)
      p.pos.set(Math.cos(ang) * r, p.base, Math.sin(ang) * r)
      p.pegado = false
      p.cae = false
    })
  }
  reponer()

  function dibujar(tiempo: number) {
    papeles.forEach((p, i) => {
      const vuelo = p.pos.y > p.base + 0.02
      m.position.copy(p.pos)
      m.rotation.set(vuelo ? Math.sin(tiempo * 5 + i) * 0.35 : 0, p.giro, vuelo ? Math.cos(tiempo * 4 + i) * 0.35 : 0)
      m.updateMatrix()
      malla.setMatrixAt(i, m.matrix)
    })
    malla.instanceMatrix.needsUpdate = true
  }

  const hacia = new THREE.Vector3()
  return {
    malla,
    reponer,
    get pegados() {
      let n = 0
      for (const p of papeles) if (p.pegado) n++
      return n
    },
    get total() {
      return CANTIDAD
    },
    /** Mueve los papelitos con la carga `q` del objeto en `centro` (cuyo punto más bajo está `bajo` cm más abajo). */
    actualizar(dt: number, tiempo: number, q: number, centro: THREE.Vector3, bajo: number) {
      for (const p of papeles) {
        if (p.pegado) {
          // Sigue pegado mientras la atracción a la altura del objeto le gane a su peso (el mismo criterio con que despegó); si no, se suelta.
          if (polarizacion(q, centro.y) / (PESO_PAPEL * p.masa) > 1) {
            p.pos.copy(centro).add(p.rel)
            continue
          }
          p.pegado = false
          p.cae = true
        }
        if (p.cae) {
          p.pos.y = Math.max(p.base, p.pos.y - CAIDA * dt)
          p.cae = p.pos.y > p.base
          continue
        }
        hacia.copy(centro).sub(p.pos)
        const d = hacia.length()
        const veces = polarizacion(q, d) / (PESO_PAPEL * p.masa)
        if (veces > 1) {
          p.pos.addScaledVector(hacia.normalize(), Math.min(VEL_MAX, VEL_BASE + 16 * Math.log10(veces)) * dt)
          if (d < bajo + 0.5) {
            p.pegado = true
            const ang = p.base * 90
            p.rel.set(Math.cos(ang) * 0.8, -(bajo + 0.3 + p.base * 0.5), Math.sin(ang) * 0.8)
          }
        } else if (p.pos.y > p.base) p.pos.y = Math.max(p.base, p.pos.y - CAIDA * dt)
      }
      dibujar(tiempo)
    },
  }
}
