// Movimiento de las partículas de la maqueta (solo dibujo: la física del calor vive en model.ts).
// Cada partícula sigue su fase: sólido = vibra en su lugar de la red, líquido = se desliza y se apila
// por gravedad, gas = vuela en línea recta y rebota. Unidades de escena, no metros.

export const N = 450
export const RADIO = 0.085
/** Radio interior del vaso y altura de su borde. */
export const R_INT = 1.46
export const Y_BORDE = 3.4
/** Techo invisible cuando el vaso está destapado: el gas sale por la boca y se pierde de vista. */
export const Y_SALA = 9

/** Arista de la celda cúbica de la red (centrada en el cuerpo) y distancia mínima entre partículas líquidas. */
const CELDA = 0.3
const D_LIQUIDO = 0.26
const R_LIMITE = R_INT - RADIO
const GRAVEDAD = 7
/** Velocidades dibujadas a 373 K (u/s). Las reales son del orden de 500 m/s: acá van muy escaladas. */
const V_GAS_REF = 3.1
const V_LIQ_REF = 1.0

const SOLIDO = 0
const LIQUIDO = 1
export const GAS = 2

export interface Fracciones {
  fs: number
  fl: number
  fg: number
}

const azar = () => Math.random()
function normal(): number {
  return Math.sqrt(-2 * Math.log(1 - azar())) * Math.cos(2 * Math.PI * azar())
}

export function crearDinamica() {
  const x = new Float32Array(N)
  const y = new Float32Array(N)
  const z = new Float32Array(N)
  const vx = new Float32Array(N)
  const vy = new Float32Array(N)
  const vz = new Float32Array(N)
  const fase = new Uint8Array(N)
  // Posición de cada partícula en la red cristalina.
  const sx = new Float32Array(N)
  const sy = new Float32Array(N)
  const sz = new Float32Array(N)
  /** Orden en que cada partícula cambia de fase: 0 = la primera (las de arriba). */
  const rango = new Float32Array(N)
  /** Factor propio de rapidez (hay partículas más rápidas y más lentas que el promedio). */
  const factor = new Float32Array(N)
  const fx = new Float32Array(N)
  const fy = new Float32Array(N)
  const fz = new Float32Array(N)
  const enLiquido = new Int16Array(N)
  const enSolido = new Int16Array(N)

  // Red cúbica centrada en el cuerpo dentro del círculo del vaso: capas cada media celda, cada una corrida
  // media celda en x y z. La última capa se llena desde el centro.
  const sitios: { x: number; y: number; z: number; capa: number; r: number }[] = []
  for (let capa = 0; sitios.length < N; capa++) {
    const lista: typeof sitios = []
    const n = Math.ceil(R_LIMITE / CELDA)
    const corrimiento = (capa % 2) * (CELDA / 2)
    for (let i = -n; i <= n; i++) {
      for (let k = -n; k <= n; k++) {
        const px = i * CELDA + corrimiento
        const pz = k * CELDA + corrimiento
        const r = Math.hypot(px, pz)
        if (r <= R_LIMITE - 0.03) lista.push({ x: px, y: RADIO + capa * (CELDA / 2), z: pz, capa, r })
      }
    }
    lista.sort((a, b) => a.r - b.r)
    sitios.push(...lista)
  }
  sitios.length = N
  const capas = sitios[N - 1].capa + 1
  const puntaje = sitios.map((s) => ((capas - 1 - s.capa) / capas) * 0.8 + azar() * 0.2)
  const orden = puntaje.map((p, i) => [p, i] as const).sort((a, b) => a[0] - b[0])
  orden.forEach(([, i], pos) => (rango[i] = pos / N))
  sitios.forEach((s, i) => {
    sx[i] = s.x
    sy[i] = s.y
    sz[i] = s.z
    factor[i] = 0.6 + azar() * 0.8
    fx[i] = azar() * 6.283
    fy[i] = azar() * 6.283
    fz[i] = azar() * 6.283
  })

  function reiniciar() {
    for (let i = 0; i < N; i++) {
      x[i] = sx[i]
      y[i] = sy[i]
      z[i] = sz[i]
      vx[i] = vy[i] = vz[i] = 0
      fase[i] = SOLIDO
    }
  }
  reiniciar()

  function direccion(arriba: boolean): [number, number, number] {
    const dx = normal()
    let dy = normal()
    const dz = normal()
    if (arriba) dy = Math.abs(dy) * 0.8 + 0.3
    const n = Math.hypot(dx, dy, dz) || 1
    return [dx / n, dy / n, dz / n]
  }

  function paso(dt: number, fr: Fracciones, tempK: number, tfK: number, techo: number, tiempo: number) {
    const sub = Math.min(2, Math.ceil(dt * 60))
    const h = dt / sub
    for (let s = 0; s < sub; s++) subpaso(h, fr, tempK, tfK, techo, tiempo + s * h)
  }

  function subpaso(dt: number, fr: Fracciones, tempK: number, tfK: number, techo: number, tiempo: number) {
    const raiz = Math.sqrt(Math.max(tempK, 1))
    const vLiq = V_LIQ_REF * (raiz / Math.sqrt(293))
    const vGas = V_GAS_REF * (raiz / Math.sqrt(373))
    // Vibración de la red: amplitud y frecuencia crecen con T (la amplitud está exagerada para que se note).
    const x3 = Math.min(tempK / tfK, 1.15) ** 3
    const amp = 0.006 + 0.034 * x3
    const omega = 6.283 * 3.2 * Math.sqrt(Math.min(tempK / tfK, 1.15))
    const sigma = (vLiq / Math.sqrt(3)) * Math.sqrt(2 * 3)
    const ruido = sigma * Math.sqrt(dt)
    const arrastre = Math.exp(-3 * dt)
    const resorte = 1 - Math.exp(-18 * dt)
    let nl = 0
    let ns = 0

    for (let i = 0; i < N; i++) {
      const objetivo = rango[i] < fr.fg ? GAS : rango[i] < fr.fg + fr.fl ? LIQUIDO : SOLIDO
      if (objetivo !== fase[i]) {
        if (objetivo === LIQUIDO && fase[i] === SOLIDO) {
          const [dx, dy, dz] = direccion(false)
          vx[i] = dx * vLiq * 0.5
          vy[i] = dy * vLiq * 0.5
          vz[i] = dz * vLiq * 0.5
        } else if (objetivo === GAS) {
          const [dx, dy, dz] = direccion(true)
          vx[i] = dx * vGas * factor[i]
          vy[i] = dy * vGas * factor[i]
          vz[i] = dz * vGas * factor[i]
        }
        fase[i] = objetivo
      }

      if (objetivo === SOLIDO) {
        const tx = sx[i] + amp * Math.sin(omega * tiempo + fx[i])
        const ty = sy[i] + amp * Math.sin(omega * 1.13 * tiempo + fy[i])
        const tz = sz[i] + amp * Math.sin(omega * 0.91 * tiempo + fz[i])
        x[i] += (tx - x[i]) * resorte
        y[i] += (ty - y[i]) * resorte
        z[i] += (tz - z[i]) * resorte
        enSolido[ns++] = i
        continue
      }

      if (objetivo === LIQUIDO) {
        vy[i] -= GRAVEDAD * dt
        vx[i] = vx[i] * arrastre + normal() * ruido
        vy[i] = vy[i] * arrastre + normal() * ruido
        vz[i] = vz[i] * arrastre + normal() * ruido
        enLiquido[nl++] = i
      } else {
        const v = Math.hypot(vx[i], vy[i], vz[i]) || 1
        const k = (vGas * factor[i]) / v
        vx[i] *= k
        vy[i] *= k
        vz[i] *= k
      }
      x[i] += vx[i] * dt
      y[i] += vy[i] * dt
      z[i] += vz[i] * dt

      // Paredes: cilindro del vaso (sigue como "chimenea" sobre el borde), piso y techo.
      const rebote = objetivo === GAS ? 1 : 0.3
      const r = Math.hypot(x[i], z[i])
      if (r > R_LIMITE) {
        const nx = x[i] / r
        const nz = z[i] / r
        x[i] = nx * R_LIMITE
        z[i] = nz * R_LIMITE
        const vn = vx[i] * nx + vz[i] * nz
        if (vn > 0) {
          vx[i] -= (1 + rebote) * vn * nx
          vz[i] -= (1 + rebote) * vn * nz
        }
      }
      if (y[i] < RADIO) {
        y[i] = RADIO
        if (vy[i] < 0) vy[i] *= -rebote
      }
      if (y[i] > techo - RADIO) {
        y[i] = techo - RADIO
        if (vy[i] > 0) vy[i] *= -rebote
      }
    }

    // Los líquidos no se pisan entre sí ni con la red que todavía no se fundió.
    const d0 = D_LIQUIDO
    const d2 = d0 * d0
    for (let it = 0; it < 2; it++) {
      for (let a = 0; a < nl; a++) {
        const i = enLiquido[a]
        for (let b = a + 1; b < nl + ns; b++) {
          const j = b < nl ? enLiquido[b] : enSolido[b - nl]
          const dx = x[i] - x[j]
          const dy = y[i] - y[j]
          const dz = z[i] - z[j]
          const q = dx * dx + dy * dy + dz * dz
          if (q >= d2 || q < 1e-10) continue
          const d = Math.sqrt(q)
          const mover = ((d0 - d) / d) * (b < nl ? 0.25 : 0.5)
          x[i] += dx * mover
          y[i] += dy * mover
          z[i] += dz * mover
          if (b < nl) {
            x[j] -= dx * mover
            y[j] -= dy * mover
            z[j] -= dz * mover
          }
        }
      }
    }
  }

  return { x, y, z, fase, reiniciar, paso }
}
