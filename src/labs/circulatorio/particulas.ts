import * as THREE from 'three'
import { colorSangre } from './constantes'
import { GASTO_REPOSO, SAO2 } from './model'
import { AGUJERO_Y, LARGO, posicion, tramo, ubicar, type Zona } from './trayecto'

const CANTIDAD = 420
const RADIO = 0.065
/** Cuánto se acelera el dibujo del recorrido de la sangre (en la realidad una vuelta completa tarda ≈ 1 min en reposo). */
const VELOCIDAD = 3
/** Qué tan rápido vuelven las partículas que se devuelven por la válvula (unidades por segundo) y cuánto tardan en cruzar el agujero. */
const VUELTA_REFLUJO = 7
const CRUCE_AGUJERO = 0.3
/** Hasta dónde (fracción del ventrículo) las partículas todavía están adentro y se pueden devolver o cruzar el tabique. */
const DENTRO_VENTRICULO = 0.7
/** Cuánto de la sangre se mezcla con el lecho: distancia (unidades) en la que la saturación recorre 63 % del camino. */
const LARGO_INTERCAMBIO = 1.1

const BLANCO = new THREE.Color(0xffffff)
const DISPERSION: Record<Zona, number> = { ad: 0.2, vd: 0.2, ai: 0.2, vi: 0.2, arteriaPulmonar: 0.05, venaPulmonar: 0.05, aorta: 0.05, vena: 0.05, pulmon: 0.02, cuerpo: 0.02 }

type Modo = 'normal' | 'reflujo' | 'agujero'
interface Particula {
  s: number
  sat: number
  modo: Modo
  t: number
  origen: THREE.Vector3
  desvio: THREE.Vector3
}

/** Tramos que recorre el flujo de los pulmones (Qp); el resto sigue el flujo del cuerpo (Qs). Con el agujero del tabique son distintos. */
const PULMONAR: Zona[] = ['vd', 'arteriaPulmonar', 'pulmon', 'venaPulmonar', 'ai', 'vi']

/** Factor de velocidad de cada tramo: lento en los capilares, a golpes en los ventrículos y las arterias. */
function factor(zona: Zona, fase: number, fs: number): number {
  const sistole = fase < fs
  if (zona === 'pulmon' || zona === 'cuerpo') return 0.35
  if (zona === 'vd' || zona === 'vi') return sistole ? 2.4 : 0.45
  if (zona === 'arteriaPulmonar' || zona === 'aorta') return 0.55 + (sistole ? 1.5 * Math.sin((Math.PI * fase) / fs) : 0)
  return 1
}

/** Las partículas de la sangre: recorren el camino completo; el color sigue su saturación (cambia en los lechos de capilares). */
export function crearParticulas(scene: THREE.Scene, svoInicial: number) {
  const malla = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), CANTIDAD)
  malla.frustumCulled = false
  scene.add(malla)

  const lista: Particula[] = Array.from({ length: CANTIDAD }, (_, i) => {
    const s = (i / CANTIDAD) * LARGO
    const { tramo: t } = ubicar(s)
    const arterial = ['venaPulmonar', 'ai', 'vi', 'aorta'].includes(t.zona)
    return {
      s, sat: arterial ? SAO2 : svoInicial, modo: 'normal', t: 0, origen: new THREE.Vector3(),
      desvio: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(2),
    }
  })

  const pos = new THREE.Vector3()
  const meta = new THREE.Vector3()
  const hueco = new THREE.Vector3(0, AGUJERO_Y, 0)
  const m = new THREE.Matrix4()
  const giro = new THREE.Quaternion()
  const escala = new THREE.Vector3()
  const color = new THREE.Color()
  const salidaVd = tramo('vd').inicio + 0.8 * tramo('vd').largo
  const piso = tramo('ai').inicio + 0.35 * tramo('ai').largo

  /** Al empezar cada sístole se sortea qué partículas del ventrículo izquierdo se devuelven o cruzan el agujero. */
  function sortear(fuga: number, agujero: number) {
    for (const p of lista) {
      const { tramo: t, u } = ubicar(p.s)
      if (p.modo !== 'normal' || t.zona !== 'vi' || u > DENTRO_VENTRICULO) continue
      const r = Math.random()
      if (r < fuga) p.modo = 'reflujo'
      else if (r < fuga + agujero) {
        p.modo = 'agujero'
        p.t = 0
        posicion(p.s, p.origen)
      }
    }
  }

  return {
    /**
     * `dt`: segundos reales (0 en pausa). `fase`: del latido (0 a 1; 0 es el comienzo de la sístole) y `fs` la parte del ciclo que dura la sístole.
     * `nuevoLatido`: la fase acaba de dar la vuelta. `pulmones` y `cuerpo`: flujo de cada circuito (L/min); `fuga` y `agujero`: fracciones del latido; `svo2` es la saturación venosa.
     */
    actualizar(dt: number, fase: number, fs: number, nuevoLatido: boolean, pulmones: number, cuerpo: number, fuga: number, agujero: number, svo2: number) {
      if (nuevoLatido) sortear(fuga, agujero)
      lista.forEach((p, i) => {
        let tamano = RADIO
        const sistole = fase < fs
        if (p.modo === 'reflujo') {
          tamano = RADIO * 1.6
          if (!sistole) p.modo = 'normal'
          else p.s = Math.max(p.s - VUELTA_REFLUJO * dt, piso)
        }
        if (p.modo === 'agujero') {
          p.t += dt
          if (p.t >= CRUCE_AGUJERO) {
            p.modo = 'normal'
            p.s = salidaVd
          }
        }
        if (p.modo === 'normal') {
          const zona = ubicar(p.s).tramo.zona
          // Cada circuito va a la velocidad de su flujo: con un defecto los pulmones y el cuerpo no mueven lo mismo.
          const flujo = PULMONAR.includes(zona) ? pulmones : cuerpo
          const ds = ((VELOCIDAD * flujo) / GASTO_REPOSO) * factor(zona, fase, fs) * dt
          p.s = (p.s + ds) % LARGO
          const destino = ubicar(p.s).tramo.zona
          const objetivo = destino === 'pulmon' ? SAO2 : destino === 'cuerpo' ? svo2 : null
          if (objetivo !== null) p.sat += (objetivo - p.sat) * (1 - Math.exp(-ds / LARGO_INTERCAMBIO))
        }
        if (p.modo === 'agujero') {
          tamano *= 1.7
          // Curva de tres puntos: de donde estaba, por el agujero del tabique, hasta la salida del ventrículo derecho.
          const q = Math.min(p.t / CRUCE_AGUJERO, 1)
          posicion(salidaVd, meta)
          pos.copy(p.origen).multiplyScalar((1 - q) ** 2).addScaledVector(hueco, 2 * q * (1 - q)).addScaledVector(meta, q * q)
        } else {
          const dispersion = DISPERSION[ubicar(p.s).tramo.zona]
          posicion(p.s, pos)
          pos.addScaledVector(p.desvio, dispersion)
          // Dentro de las cámaras se dibujan más grandes: si no, se pierden contra el vidrio.
          if (dispersion > 0.1) tamano *= 1.3
        }
        malla.setMatrixAt(i, m.compose(pos, giro, escala.setScalar(tamano)))
        colorSangre(p.sat, color).multiplyScalar(1.35)
        if (tamano > RADIO) color.lerp(BLANCO, 0.1)
        malla.setColorAt(i, color)
      })
      malla.instanceMatrix.needsUpdate = true
      if (malla.instanceColor) malla.instanceColor.needsUpdate = true
    },
  }
}
