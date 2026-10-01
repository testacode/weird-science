// Partículas de la maqueta: agua (celeste), sal (ámbar) y hemoglobina (rosa). Cuántas hay sale del modelo;
// dónde están y cómo se mueven es de maqueta. El agua cruza la membrana en los dos sentidos; la sal y la hemoglobina rebotan.
import * as THREE from 'three'
import type { Cuerpo } from './cuerpo'
import { VASO } from './cuerpo'
import { Pool, gauss, azar, type Region } from './pool'

/** Segundos que tarda una partícula en cruzar la membrana. */
const CRUCE_S = 0.5
const MAX_NUEVOS_POR_CUADRO = 3

export function crearParticulas(padre: THREE.Group) {
  const agua = new Pool(380, 0.05, 0x5ec8ff, 1)
  const sal = new Pool(560, 0.075, 0xffc857, 0.8)
  const hemo = new Pool(16, 0.11, 0xff5fa2, 0.5)
  const pools = [agua, sal, hemo]
  for (const p of pools) padre.add(p.malla)
  const yMin = VASO.base - VASO.centroY + 0.05
  const yMax = VASO.liquido - VASO.centroY - 0.05
  const rMax = VASO.radio - 0.1

  let cuerpo: Cuerpo | null = null
  /** Entre varias de la región, la que está más cerca de la membrana (la que se ve cruzar). */
  function cercana(p: Pool, r: Region) {
    let mejor = -1
    let fMejor = Infinity
    for (let n = 0; n < 8; n++) {
      const i = p.elegir(r)
      if (i < 0) return -1
      const f = cuerpo ? cuerpo.f(p.x[i * 3], p.x[i * 3 + 1], p.x[i * 3 + 2]) : 0
      if (Math.abs(f - 1) < fMejor) [mejor, fMejor] = [i, Math.abs(f - 1)]
    }
    return mejor
  }

  function puntoFuera(): [number, number, number] {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2
      const r = rMax * Math.sqrt(Math.random())
      const y = yMin + (yMax - yMin) * Math.random()
      if (!cuerpo || cuerpo.f(r * Math.cos(a), y, r * Math.sin(a)) > 1.15) return [r * Math.cos(a), y, r * Math.sin(a)]
    }
    return [rMax * 0.9, yMax, 0]
  }
  function puntoDentro(): [number, number, number] {
    if (!cuerpo) return [0, 0, 0]
    for (let i = 0; i < 60; i++) {
      const p: [number, number, number] = [2 * azar() * cuerpo.hx * 0.5, 2 * azar() * cuerpo.hy * 0.5, 2 * azar() * cuerpo.hz * 0.5]
      if (cuerpo.f(...p) < 0.8) return p
    }
    return [0, 0, 0]
  }

  function poner(p: Pool, i: number, r: Region, [x, y, z]: [number, number, number]) {
    p.reg[i] = r
    p.x.set([x, y, z], i * 3)
    p.v.set([gauss() * 0.6, gauss() * 0.6, gauss() * 0.6], i * 3)
  }

  /** Arranca el cruce de la partícula `i` hacia adentro o hacia afuera: termina del otro lado de la membrana. */
  function cruzar(p: Pool, i: number, haciaAdentro: boolean) {
    const o = i * 3
    const [x, y, z] = [p.x[o], p.x[o + 1], p.x[o + 2]]
    let k = 1
    for (let j = 0; j < 30 && cuerpo; j++) {
      k *= haciaAdentro ? 0.85 : 1.15
      const f = cuerpo.f(x * k, y * k, z * k)
      if (haciaAdentro ? f < 0.7 : f > 1.3) break
    }
    p.reg[i] = 2
    p.destino[i] = haciaAdentro ? 1 : 0
    p.prog[i] = 0
    p.ini.set([x, y, z], o)
    p.fin.set([x * k, y * k, z * k], o)
  }

  /** Lleva la cantidad de partículas de adentro al objetivo, haciéndolas cruzar. */
  function ajustarAdentro(p: Pool, objetivo: number) {
    const hay = p.cuenta(1) + p.cruzando(1)
    let falta = Math.round(objetivo) - hay
    for (let n = 0; n < MAX_NUEVOS_POR_CUADRO && falta !== 0; n++) {
      const i = cercana(p, falta > 0 ? 0 : 1)
      if (i < 0) break
      cruzar(p, i, falta > 0)
      falta += falta > 0 ? -1 : 1
    }
  }

  /** Cantidad de partículas libres afuera igual al objetivo: aparecen y desaparecen (la sal que se agrega o se saca). */
  function ajustarAfuera(p: Pool, objetivo: number) {
    let hay = p.cuenta(0)
    const meta = Math.round(objetivo)
    for (let n = 0; n < 12 && hay !== meta; n++) {
      if (hay < meta) {
        const i = p.reg.indexOf(-1)
        if (i < 0) break
        poner(p, i, 0, puntoFuera())
        hay++
      } else {
        p.reg[p.elegir(0)] = -1
        hay--
      }
    }
  }

  function normal(x: number, y: number, z: number): [number, number, number] {
    if (!cuerpo) return [0, 1, 0]
    const e = 0.03
    const g: [number, number, number] = [
      cuerpo.f(x + e, y, z) - cuerpo.f(x - e, y, z), cuerpo.f(x, y + e, z) - cuerpo.f(x, y - e, z), cuerpo.f(x, y, z + e) - cuerpo.f(x, y, z - e),
    ]
    const l = Math.hypot(...g) || 1
    return [g[0] / l, g[1] / l, g[2] / l]
  }

  function mover(p: Pool, dt: number) {
    const amort = Math.exp(-2 * dt)
    for (let i = 0; i < p.n; i++) {
      const r = p.reg[i]
      if (r < 0) continue
      const o = i * 3
      if (r === 2) {
        p.prog[i] += dt / CRUCE_S
        const t = Math.min(1, p.prog[i])
        const e = t * t * (3 - 2 * t)
        for (let c = 0; c < 3; c++) p.x[o + c] = p.ini[o + c] + (p.fin[o + c] - p.ini[o + c]) * e
        if (t >= 1) {
          p.reg[i] = p.destino[i] as Region
          p.v.set([gauss(), gauss(), gauss()], o)
        }
        continue
      }
      for (let c = 0; c < 3; c++) p.v[o + c] = p.v[o + c] * amort + gauss() * 0.9 * p.agitacion * Math.sqrt(dt)
      let [x, y, z] = [p.x[o] + p.v[o] * dt, p.x[o + 1] + p.v[o + 1] * dt, p.x[o + 2] + p.v[o + 2] * dt]
      const radio = Math.hypot(x, z)
      if (radio > rMax) {
        x *= rMax / radio
        z *= rMax / radio
        p.v[o] *= -1
        p.v[o + 2] *= -1
      }
      if (y < yMin || y > yMax) {
        y = Math.min(yMax, Math.max(yMin, y))
        p.v[o + 1] *= -1
      }
      // La membrana: se rebota contra ella desde el lado en el que se estaba.
      if (cuerpo && cuerpo.f(x, y, z) < 1 !== (r === 1)) {
        const [nx, ny, nz] = normal(p.x[o], p.x[o + 1], p.x[o + 2])
        const dot = p.v[o] * nx + p.v[o + 1] * ny + p.v[o + 2] * nz
        p.v[o] -= 2 * dot * nx
        p.v[o + 1] -= 2 * dot * ny
        p.v[o + 2] -= 2 * dot * nz
        ;[x, y, z] = [p.x[o], p.x[o + 1], p.x[o + 2]]
      }
      p.x.set([x, y, z], o)
    }
  }

  /** La célula cambió de tamaño: lo que quedó del lado equivocado se acomoda. */
  function acomodar(p: Pool) {
    if (!cuerpo) return
    for (let i = 0; i < p.n; i++) {
      const r = p.reg[i]
      if (r !== 0 && r !== 1) continue
      const o = i * 3
      for (let n = 0; n < 12 && cuerpo.f(p.x[o], p.x[o + 1], p.x[o + 2]) < 1 !== (r === 1); n++) {
        const k = r === 1 ? 0.9 : 1.08
        p.x[o] *= k
        p.x[o + 1] *= k
        p.x[o + 2] *= k
      }
    }
  }

  const matriz = new THREE.Object3D()
  function dibujar(p: Pool) {
    for (let i = 0; i < p.n; i++) {
      matriz.position.set(p.x[i * 3], p.x[i * 3 + 1], p.x[i * 3 + 2])
      matriz.scale.setScalar(p.reg[i] < 0 ? 0 : 1)
      matriz.updateMatrix()
      p.malla.setMatrixAt(i, matriz.matrix)
    }
    p.malla.instanceMatrix.needsUpdate = true
  }

  return {
    /** Vuelve a empezar con la célula en reposo. */
    reiniciar(c: Cuerpo, aguaDentro: number) {
      cuerpo = c
      for (const p of pools) p.reg.fill(-1)
      for (let i = 0; i < Math.round(aguaDentro); i++) poner(agua, i, 1, puntoDentro())
      for (let i = 0; i < 200; i++) poner(agua, agua.reg.indexOf(-1), 0, puntoFuera())
      for (let i = 0; i < hemo.n; i++) poner(hemo, i, 1, puntoDentro())
    },
    /** `salFuera` y `salDentro` son cantidades de partículas; `intercambio`, cruces por segundo en cada sentido (equilibrio dinámico). */
    actualizar(dt: number, e: { cuerpo: Cuerpo | null; aguaDentro: number; salFuera: number; salDentro: number; intercambio: number }) {
      const eraCuerpo = cuerpo
      cuerpo = e.cuerpo
      if (!cuerpo && eraCuerpo) {
        // La célula se rompió: todo lo de adentro queda suelto.
        for (const p of pools) for (let i = 0; i < p.n; i++) if (p.reg[i] === 1 || p.reg[i] === 2) p.reg[i] = 0
      }
      if (cuerpo) {
        acomodar(agua)
        acomodar(sal)
        ajustarAdentro(agua, e.aguaDentro)
        ajustarAdentro(sal, e.salDentro)
        const entra = Math.random() < e.intercambio * dt ? cercana(agua, 0) : -1
        const sale = entra >= 0 ? cercana(agua, 1) : -1
        if (entra >= 0 && sale >= 0) {
          cruzar(agua, entra, true)
          cruzar(agua, sale, false)
        }
      }
      ajustarAfuera(sal, e.salFuera)
      acomodar(hemo)
      for (const p of pools) {
        mover(p, dt)
        dibujar(p)
      }
    },
  }
}
