// Glóbulo rojo: disco bicóncavo que se redondea al hincharse (esfera de 150 fL), se arruga al achicarse y se rompe.
import * as THREE from 'three'
import { V_ROTURA } from './constantes'
import type { Cuerpo } from './cuerpo'

const NU = 56
const NV = 44
/** Radio del disco normal (unidades de la maqueta). */
const RADIO = 1.0

/** z / cos(φ) del perfil: de bicóncavo (m = 0) a esfera (m = 1). Pensado para ~2,5 µm de espesor máximo y ~1 µm en el centro. */
const perfil = (rho: number, m: number) => (1 - m) * (0.13 + rho * rho - 0.55 * rho ** 4) + m

/** Volumen del perfil (sin escala): 4π ∫ ρ √(1−ρ²) h(ρ) dρ, por Simpson. */
function volumenPerfil(m: number): number {
  const n = 64
  let suma = 0
  for (let i = 0; i <= n; i++) {
    const rho = i / n
    const peso = i === 0 || i === n ? 1 : i % 2 ? 4 : 2
    suma += peso * rho * Math.sqrt(1 - rho * rho) * perfil(rho, m)
  }
  return 4 * Math.PI * (suma / (3 * n))
}
const VOLUMEN_DISCO = volumenPerfil(0)

const suave = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

export function crearGlobulo() {
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array((NU + 1) * (NV + 1) * 3)
  const indices: number[] = []
  for (let j = 0; j < NV; j++)
    for (let i = 0; i < NU; i++) {
      const a = j * (NU + 1) + i
      const b = a + NU + 1
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  geo.setIndex(indices)
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xd9363e, emissive: 0x4a0a10, roughness: 0.35, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false,
  })
  const malla = new THREE.Mesh(geo, material)
  malla.renderOrder = 2
  const grupo = new THREE.Group()
  grupo.add(malla)

  let m = 0
  let escala = RADIO
  const cuerpo: Cuerpo = {
    hx: 1.7, hy: 1.7, hz: 1.7,
    f(x, y, z) {
      const rho = Math.hypot(x, z) / escala
      if (rho >= 1) return 2
      const techo = Math.max(0.04, Math.sqrt(1 - rho * rho) * perfil(rho, m)) * escala
      return (y / techo) ** 2
    },
  }

  /** `v` es el volumen relativo; `rota` lo deja como un "fantasma" desinflado. */
  function actualizar(v: number, rota: boolean) {
    m = THREE.MathUtils.clamp((v - 1) / (V_ROTURA - 1), 0, 1)
    escala = RADIO * Math.cbrt((Math.min(v, V_ROTURA) * VOLUMEN_DISCO) / volumenPerfil(m))
    const pinchos = suave(0.97, 0.72, v) * 0.3
    for (let j = 0; j <= NV; j++) {
      const fi = (j / NV) * Math.PI
      const rho = Math.sin(fi)
      const z = Math.cos(fi) * perfil(rho, m)
      for (let i = 0; i <= NU; i++) {
        const th = (i / NU) * Math.PI * 2
        let x = rho * Math.cos(th)
        let zz = rho * Math.sin(th)
        let y = z
        const largo = Math.hypot(x, y, zz) || 1
        const g = Math.max(0, Math.sin(7 * (x / largo)) * Math.sin(7 * (y / largo) + 1) * Math.sin(7 * (zz / largo) + 2))
        const k = escala * (1 + pinchos * Math.sqrt(g) * 2)
        x *= k
        y *= k
        zz *= k
        pos.set([x, y, zz], (j * (NU + 1) + i) * 3)
      }
    }
    geo.attributes.position.needsUpdate = true
    geo.computeVertexNormals()
    geo.computeBoundingSphere()
    material.opacity = rota ? 0.14 : 0.6
    material.color.set(rota ? 0xe8b4b4 : 0xd9363e)
    grupo.scale.setScalar(rota ? 0.8 : 1)
  }
  actualizar(1, false)
  return { grupo, cuerpo, actualizar }
}
