import * as THREE from 'three'
import { AIRE_HEX, CIELO_HEX, MAGENTA_HEX } from './constantes'
import { FICO2 } from './model'
import { GEO } from './pulmones'

const PARTICULAS = 120
const RADIOS = { aire: 0.035, o2: 0.06, co2: 0.075 }
type Gas = keyof typeof RADIOS
const COLORES: Record<Gas, THREE.Color> = {
  aire: new THREE.Color(AIRE_HEX),
  o2: new THREE.Color(CIELO_HEX).multiplyScalar(1.5),
  co2: new THREE.Color(MAGENTA_HEX).multiplyScalar(1.5),
}

/** Fracción de cada gas del aire (0 a 1); el resto es nitrógeno. */
export interface Mezcla {
  o2: number
  co2: number
}
/** El aire que entra: 21 % de O₂ y casi nada de CO₂. */
export const MEZCLA_ENTRADA: Mezcla = { o2: 0.2093, co2: FICO2 }

/** Qué gas es una molécula nueva de una mezcla: el nitrógeno y el resto van en gris. */
function sortear(m: Mezcla): Gas {
  const r = Math.random()
  return r < m.co2 ? 'co2' : r < m.co2 + m.o2 ? 'o2' : 'aire'
}

interface Particula {
  u: number
  lado: 1 | -1
  gas: Gas
  desvio: THREE.Vector3
}

/**
 * Moléculas de aire que van y vienen por la tráquea y los bronquios. Cada una tiene su gas (O₂ cielo, CO₂ magenta,
 * el resto gris) sorteado con la composición real del aire que entra o que sale: así se ve que se inhala sobre todo
 * nitrógeno y que lo que más aumenta al exhalar es el CO₂.
 */
export function crearAire(scene: THREE.Scene, punto: (lado: 1 | -1, local: THREE.Vector3, destino: THREE.Vector3) => THREE.Vector3) {
  const malla = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), PARTICULAS)
  malla.frustumCulled = false
  scene.add(malla)
  const lista: Particula[] = Array.from({ length: PARTICULAS }, (_, i) => ({
    u: i / PARTICULAS,
    lado: i % 2 ? 1 : -1,
    gas: sortear(MEZCLA_ENTRADA),
    desvio: new THREE.Vector3((Math.random() - 0.5) * 0.2, 0, (Math.random() - 0.5) * 0.2),
  }))

  // Recorrido de cada lado: tope de la tráquea, carina, hilio y fondo del pulmón (en el mundo, se recalcula con el pulmón).
  const recorrido: Record<string, THREE.Vector3[]> = { '-1': [], '1': [] }
  const largos: Record<string, number[]> = { '-1': [], '1': [] }
  const locales = (l: 1 | -1) => [new THREE.Vector3(-0.5 * l, -0.9, 0), new THREE.Vector3(0.3 * l, -1.8, 0.1), new THREE.Vector3(0.3 * l, -2.5, 0)]
  function armar(l: 1 | -1) {
    const pts = [new THREE.Vector3(0, GEO.traqueaTope, 0), new THREE.Vector3(0, GEO.carina, 0), ...locales(l).map((p) => punto(l, p, new THREE.Vector3()))]
    const acum = [0]
    for (let i = 1; i < pts.length; i++) acum.push(acum[i - 1] + pts[i].distanceTo(pts[i - 1]))
    recorrido[String(l)] = pts
    largos[String(l)] = acum
  }
  const pos = new THREE.Vector3()
  const m = new THREE.Matrix4()
  const giro = new THREE.Quaternion()
  const escala = new THREE.Vector3()

  return {
    /**
     * `dv`: cambio del volumen del pulmón en este cuadro (positivo al inspirar), `alcance`: cuánto del camino recorre
     * una molécula por inspiración. `salida`: composición del aire que sale; `null` si no hay aire (aguantando).
     */
    actualizar(dv: number, alcance: number, salida: Mezcla | null) {
      armar(-1)
      armar(1)
      lista.forEach((p, i) => {
        p.u += dv * alcance
        if (p.u > 1) {
          p.u -= 1
          p.gas = sortear(MEZCLA_ENTRADA)
        } else if (p.u < 0) {
          p.u += 1
          p.gas = sortear(salida ?? MEZCLA_ENTRADA)
        }
        const pts = recorrido[String(p.lado)]
        const acum = largos[String(p.lado)]
        const s = p.u * acum[acum.length - 1]
        let k = 1
        while (k < acum.length - 1 && acum[k] < s) k++
        const f = (s - acum[k - 1]) / (acum[k] - acum[k - 1])
        pos.lerpVectors(pts[k - 1], pts[k], THREE.MathUtils.clamp(f, 0, 1))
        // Más desvío en el pulmón que en la tráquea, que es angosta.
        pos.addScaledVector(p.desvio, p.u > 0.4 ? 3 : 1)
        malla.setMatrixAt(i, m.compose(pos, giro, escala.setScalar(RADIOS[p.gas])))
        malla.setColorAt(i, COLORES[p.gas])
      })
      malla.instanceMatrix.needsUpdate = true
      if (malla.instanceColor) malla.instanceColor.needsUpdate = true
    },
  }
}
