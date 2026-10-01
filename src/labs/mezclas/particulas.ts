// Partículas instanciadas: cada una representa un puñado de gramos de una porción de la mezcla. Vive en
// una región (vaso, origen o salida de la estación) acomodada en capas por densidad; cuando el modelo
// dice que ya salió, vuela por la ruta de la estación hasta la región de salida.
import * as THREE from 'three'
import { ESPECIES } from './datos'
import { BOCA_VASO, VASO } from './estaciones'
import type { Corrida, Lectura } from './model'
import type { Estacion, Paso, Region } from './regiones'

const N_TOTAL = 720
const MIN_POR_PORCION = 24
/** Fracción del volumen que ocupan los granos apilados (el resto es aire entre ellos). */
const EMPAQUE = 0.6
const RADIO: Record<string, number> = { agua: 0.045, alcohol: 0.047, aceite: 0.062, arena: 0.07, hierro: 0.04, 'sal-disuelta': 0.034, 'sal-cristal': 0.06 }

export interface ContextoParticulas {
  dt: number
  ahora: number
  estacion: Estacion
  lectura: Lectura | null
  iniciado: boolean
  /** 0-1: cuánto se agitan las partículas del origen (ebullición). */
  agitacion: number
}

interface Capas {
  lleno: number
  capas: Map<string, [number, number]>
}

export function crearParticulas(scene: THREE.Scene) {
  const malla = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 9), new THREE.MeshStandardMaterial({ color: 0xbdbdbd, roughness: 0.45, metalness: 0.05, envMapIntensity: 0.3 }), N_TOTAL + 64)
  malla.frustumCulled = false
  malla.count = 0
  scene.add(malla)

  let n = 0
  let porciones: Corrida['porciones'] = []
  let cuentas: number[] = []
  let px = new Float32Array(0)
  let py = new Float32Array(0)
  let pz = new Float32Array(0)
  let porcion = new Int16Array(0)
  let rango = new Float32Array(0)
  /** Cinco números al azar por partícula: capa, altura si está revuelto, ángulo, radio y fase. */
  let azar = new Float32Array(0)
  let zona = new Int8Array(0)
  let vuelo = new Uint8Array(0)
  let etapa = new Int16Array(0)
  let rutas: (Paso[] | null)[] = []
  let velocidad = new Float32Array(0)
  let aterrizar = true
  const matriz = new THREE.Matrix4()
  const vec = new THREE.Vector3()
  const giro = new THREE.Quaternion()
  const escala = new THREE.Vector3()

  // Un cuerpo translúcido por líquido en cada recipiente cilíndrico: hace que se lea el nivel (las partículas son los componentes).
  const cuerpos = new Map<Region, Record<'agua' | 'aceite', THREE.Mesh>>()
  const cuerpoDe = (region: Region) => {
    let c = cuerpos.get(region)
    if (!c) {
      const crear = (color: string) => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false }))
        scene.add(m)
        return m
      }
      c = { agua: crear(ESPECIES.agua.color), aceite: crear(ESPECIES.aceite.color) }
      cuerpos.set(region, c)
    }
    return c
  }
  const esSedimento = (i: number) => {
    const p = porciones[porcion[i]]
    return !p.disuelta && ESPECIES[p.especie].estado === 'solido'
  }
  /** Sin líquido (limaduras + arena) los granos quedan revueltos: no hay nada que los ordene por densidad. */
  let enSeco = false
  /** Lo disuelto comparte la capa del agua; el resto tiene la suya. */
  const capaDe = (i: number) => (enSeco ? 'seco' : porciones[porcion[i]].disuelta ? 'agua' : porciones[porcion[i]].id)
  const densidadDe = (k: string) => (k === 'seco' ? 0 : ESPECIES[porciones.find((p) => p.id === k || (k === 'agua' && p.especie === 'agua'))!.especie].densidad)

  /** Reparte las partículas entre las porciones (según los gramos de cada una) y las pone en el vaso. */
  function configurar(c: Corrida) {
    porciones = c.porciones
    enSeco = porciones.every((p) => ESPECIES[p.especie].estado === 'solido')
    const total = porciones.reduce((s, p) => s + p.masa, 0)
    cuentas = porciones.map((p) => Math.max(MIN_POR_PORCION, Math.round((N_TOTAL * p.masa) / total)))
    n = cuentas.reduce((s, k) => s + k, 0)
    px = new Float32Array(n); py = new Float32Array(n); pz = new Float32Array(n)
    porcion = new Int16Array(n); rango = new Float32Array(n); azar = new Float32Array(n * 5)
    zona = new Int8Array(n); vuelo = new Uint8Array(n); etapa = new Int16Array(n); rutas = new Array(n).fill(null); velocidad = new Float32Array(n)
    let i = 0
    cuentas.forEach((k, pi) => {
      // Rangos estratificados y mezclados: lo que sale en cada momento se reparte parejo entre las partículas.
      const orden = Array.from({ length: k }, (_, j) => (j + 0.5) / k).sort(() => Math.random() - 0.5)
      for (let j = 0; j < k; j++, i++) {
        porcion[i] = pi
        rango[i] = orden[j]
        for (let a = 0; a < 5; a++) azar[i * 5 + a] = Math.random()
        velocidad[i] = 3.2 + Math.random() * 2
        malla.setColorAt(i, new THREE.Color(ESPECIES[porciones[pi].especie].color))
      }
    })
    malla.count = n
    if (malla.instanceColor) malla.instanceColor.needsUpdate = true
    aterrizar = true
  }

  /** Capas de una región: cada porción ocupa un tramo según su volumen, las más densas abajo. */
  function capasDe(region: Region, miembros: number[]): Capas {
    const vol = new Map<string, number>()
    for (const i of miembros) {
      const p = porciones[porcion[i]]
      const ml = p.masa / ESPECIES[p.especie].densidad / cuentas[porcion[i]]
      vol.set(capaDe(i), (vol.get(capaDe(i)) ?? 0) + ml / (esSedimento(i) ? EMPAQUE : 1))
    }
    const total = [...vol.values()].reduce((s, v) => s + v, 0)
    const capas = new Map<string, [number, number]>()
    let acumulado = 0
    for (const k of [...vol.keys()].sort((a, b) => densidadDe(b) - densidadDe(a))) {
      capas.set(k, [acumulado / total, (acumulado + vol.get(k)!) / total])
      acumulado += vol.get(k)!
    }
    return { lleno: Math.min(1, total / region.capMl), capas }
  }

  function actualizar({ dt, ahora, estacion, lectura, iniciado, agitacion }: ContextoParticulas) {
    if (!n) return
    const regiones: Region[] = [VASO, estacion.origen, estacion.salida]
    const rutaVertido: Paso[] = estacion.origen === VASO ? [] : [BOCA_VASO, ...estacion.entrada]
    const fracSalida = porciones.map((p, k) => (p.masa > 0 && lectura ? lectura.salida[k] / p.masa : 0))

    // 1) A qué zona va cada partícula; hacia adelante vuela, hacia atrás (reinicio) salta.
    for (let i = 0; i < n; i++) {
      const deseada = !iniciado ? 0 : rango[i] < fracSalida[porcion[i]] ? 2 : 1
      const actual = zona[i]
      if (deseada === actual) continue
      zona[i] = deseada
      if (deseada < actual || aterrizar) {
        vuelo[i] = 0
        rutas[i] = null
      } else {
        vuelo[i] = 1
        etapa[i] = 0
        rutas[i] = [...(actual === 0 ? rutaVertido : []), ...(deseada === 2 ? estacion.rutaSalida : [])]
      }
    }

    // 2) Capas de cada región según quién está adentro.
    const miembros = new Map<Region, number[]>(regiones.map((r) => [r, []]))
    for (let i = 0; i < n; i++) miembros.get(regiones[zona[i]])!.push(i)
    const capas = new Map<Region, Capas>([...miembros].map(([r, m]) => [r, capasDe(r, m)]))
    const asentadoOrigen = lectura ? lectura.asentado : 1
    for (const c of cuerpos.values()) c.agua.visible = c.aceite.visible = false
    for (const [region, { lleno, capas: cs }] of capas) {
      if (region.pegado || Math.abs(region.radio(0) - region.radio(1)) > 1e-6) continue
      const cuerpo = cuerpoDe(region)
      for (const k of ['agua', 'aceite'] as const) {
        const tramo = cs.get(k)
        if (!tramo) continue
        // El agua llena también los huecos entre los granos del fondo: su cuerpo arranca desde el piso.
        const desde = k === 'agua' ? 0 : tramo[0]
        const alto = (tramo[1] - desde) * region.alto * lleno
        cuerpo[k].visible = alto > 0.02
        cuerpo[k].scale.set(region.radio(0), Math.max(alto, 0.001), region.radio(0))
        cuerpo[k].position.set(region.x, region.y0 + desde * region.alto * lleno + alto / 2, region.z)
      }
    }
    const seg = ahora / 1000

    for (let i = 0; i < n; i++) {
      const o = i * 5
      const region = regiones[zona[i]]
      const { lleno, capas: cs } = capas.get(region)!
      let tx: number, ty: number, tz: number
      const ang = azar[o + 2] * Math.PI * 2
      if (region.pegado) {
        const r = 0.3 * Math.sqrt(azar[o + 3])
        tx = region.x + r * Math.cos(ang); ty = region.y0 - 0.02 - 0.28 * azar[o] * (1 - azar[o + 3] * 0.5); tz = region.z + r * Math.sin(ang)
      } else {
        const [ini, fin] = cs.get(capaDe(i)) ?? [0, 1]
        // En la ampolla las fases se separan de a poco (cada partícula con su demora); en los demás recipientes ya están asentadas.
        const asentado = region === estacion.origen && region !== VASO ? Math.min(1, Math.max(0, asentadoOrigen * 1.3 - 0.3 * azar[o + 4])) : 1
        const f = (1 - asentado) * azar[o + 1] + asentado * (ini + azar[o] * (fin - ini))
        ty = region.y0 + f * region.alto * lleno
        const r = region.radio(Math.min(1, Math.max(0, (ty - region.y0) / region.alto))) * 0.9 * Math.sqrt(azar[o + 3])
        tx = region.x + r * Math.cos(ang); tz = region.z + r * Math.sin(ang)
      }

      if (vuelo[i]) {
        const w = rutas[i]![etapa[i]]
        const ox = w ? w.p.x + (azar[o + 2] - 0.5) * 2 * w.d : tx
        const oy = w ? w.p.y : ty
        const oz = w ? w.p.z + (azar[o + 3] - 0.5) * 2 * w.d : tz
        const dx = ox - px[i], dy = oy - py[i], dz = oz - pz[i]
        const dist = Math.hypot(dx, dy, dz)
        const avance = velocidad[i] * dt
        if (dist <= avance) {
          px[i] = ox; py[i] = oy; pz[i] = oz
          if (w) etapa[i]++
          else vuelo[i] = 0
        } else {
          px[i] += (dx / dist) * avance; py[i] += (dy / dist) * avance; pz[i] += (dz / dist) * avance
        }
      } else {
        const k = aterrizar ? 1 : 1 - Math.exp(-7 * dt)
        px[i] += (tx - px[i]) * k; py[i] += (ty - py[i]) * k; pz[i] += (tz - pz[i]) * k
      }

      // Agitación térmica: los líquidos y lo disuelto se mueven; los granos apilados, no.
      const amp = !esSedimento(i) && !vuelo[i] ? 0.018 + (region === estacion.origen ? 0.05 * agitacion : 0) : 0
      vec.set(
        px[i] + amp * Math.sin(seg * (2 + azar[o] * 3) + azar[o + 1] * 40),
        py[i] + amp * Math.sin(seg * (2 + azar[o + 1] * 3) + azar[o + 2] * 40),
        pz[i] + amp * Math.sin(seg * (2 + azar[o + 2] * 3) + azar[o + 3] * 40),
      )
      const r = RADIO[porciones[porcion[i]].id] ?? 0.05
      escala.set(r, r, r)
      matriz.compose(vec, giro, escala)
      malla.setMatrixAt(i, matriz)
    }
    malla.instanceMatrix.needsUpdate = true
    aterrizar = false
  }

  return {
    configurar,
    actualizar,
    /** Todas vuelven al vaso de golpe (sin viajar). */
    reiniciar: () => {
      zona.fill(0)
      vuelo.fill(0)
      aterrizar = true
    },
  }
}
