// Modelo del sonido: una vibración que viaja por un medio. Puro (sin Three.js ni DOM).
//
// Tres tubos de 10 m rellenos de aire, agua y acero. Una fuente en un extremo (tono continuo o un golpe)
// y un micrófono a `distancia` metros. Los tiempos son los reales del fenómeno (t = d / v); la escena los
// reproduce en cámara lenta (`Config.lenta`), así que ninguna cuenta del modelo depende del reloj de la animación.
//
//   tiempo de llegada    t = d / v                 (v depende solo del medio, no de la frecuencia ni del volumen)
//   longitud de onda     λ = v / f
//   presión sonora       p = ρ · v_partícula       (con la misma vibración de la fuente, p crece con la densidad ρ)
//   nivel                L = 94 dB + 20·log10(amplitud · fracción de aire)   (1 Pa ≈ 94 dB re 20 µPa)

export type MedioId = 'aire' | 'agua' | 'acero'

export interface Medio {
  id: MedioId
  nombre: string
  /** Velocidad del sonido, m/s. */
  v: number
  /** Densidad, kg/m³. */
  densidad: number
}

// Aire a 20 °C: 343 m/s y 1,204 kg/m³. Agua dulce a 20 °C: 1.481 m/s y 998,2 kg/m³. Acero: 5.900 m/s (las aleaciones
// medidas van de 5.600 a 5.900) y ≈ 7.850 kg/m³. Fuentes y verificación: docs/fuentes.md.
export const MEDIOS: readonly Medio[] = [
  { id: 'aire', nombre: 'Aire', v: 343, densidad: 1.204 },
  { id: 'agua', nombre: 'Agua', v: 1481, densidad: 998.2 },
  { id: 'acero', nombre: 'Acero', v: 5900, densidad: 7850 },
]
export const medio = (id: MedioId): Medio => MEDIOS.find((m) => m.id === id)!

/** Largo de cada tubo, m. */
export const L_TUBO = 10
export const DISTANCIA = { min: 2, max: 10 } as const
/** Rango del control de frecuencia, Hz: incluye infra y ultrasonido, que el oído humano no capta. */
export const FRECUENCIA = { min: 10, max: 40000 } as const
/** Rango audible humano, Hz. */
export const AUDIBLE = { min: 20, max: 20000 } as const
/** Presión de referencia del aire (0 dB = umbral de audición), Pa. */
export const P_REF = 20e-6
/** Nivel con la fuente al 100 % de amplitud: 1 Pa eficaz ≈ 94 dB. */
export const NIVEL_MAX = 94
export const UMBRAL_DB = 0
/** Nivel desde el cual el ruido prolongado daña el oído (NIOSH, NIDCD), dBA. */
export const NIVEL_PELIGRO = 85
/** Presión atmosférica estándar, Pa. */
export const P_ATM = 101325
/** Lo más bajo que llega la bomba: una rotativa de dos etapas llega a 0,1 Pa (parámetro del modelo). */
export const AIRE_MIN = 0.1 / P_ATM
/** Constantes de tiempo del aire, s reales del reloj (parámetros de ajuste): la bomba lo saca en unos 8 s. */
const TAU_BOMBA = 0.6
const TAU_ENTRADA = 0.35
/** Un golpe es un pulso de este ancho (σ, s) y sale cuando pasaron `T_EMISION` desde que empieza el registro. */
export const PULSO_S = 0.0006
export const T_EMISION = 3 * PULSO_S
/** Factores de cámara lenta elegibles (÷N). */
export const LENTAS = [100, 300, 1000] as const

export type Modo = 'tono' | 'golpe'

export interface Config {
  modo: Modo
  /** Hz. */
  frecuencia: number
  /** Amplitud de la vibración de la fuente, 0 a 1 (1 = 94 dB en el aire a 1 atm). */
  amplitud: number
  /** Del micrófono a la fuente, m. */
  distancia: number
  /** La bomba saca el aire del tubo de aire. */
  bomba: boolean
  /** Cámara lenta del golpe: la animación va N veces más lenta que el fenómeno. */
  lenta: number
}

export const CONFIG_INICIAL: Config = { modo: 'tono', frecuencia: 440, amplitud: 0.2, distancia: 10, bomba: false, lenta: 300 }

export interface Estado {
  /** Segundos reales del fenómeno desde que salió el golpe; `null` si todavía no hubo golpe. */
  golpe: number | null
  /** Fracción de la presión atmosférica dentro del tubo de aire. */
  aire: number
}
export const ESTADO_INICIAL: Estado = { golpe: null, aire: 1 }

/** Tiempo (s) que tarda el sonido en recorrer `d` metros en el medio. */
export const llegada = (m: MedioId, d: number) => d / medio(m).v
export const longitudOnda = (m: MedioId, f: number) => medio(m).v / f

/** Cuándo termina el registro de un golpe: cuando ya pasó por el micrófono del medio más lento. */
export const tiempoFinal = (d: number) => T_EMISION + llegada('aire', d) + 3 * PULSO_S
export const golpeTerminado = (e: Estado, c: Config) => e.golpe !== null && e.golpe >= tiempoFinal(c.distancia)

/** Nivel (dB re 20 µPa) en el micrófono del tubo de aire. */
export function nivelAire(amplitud: number, aire: number): number {
  const p = amplitud * aire
  return p > 0 ? NIVEL_MAX + 20 * Math.log10(p) : -Infinity
}

export type Oido = 'si' | 'bajo' | 'infra' | 'ultra'
/** ¿Un oído humano lo oiría? Fuera del rango audible o por debajo del umbral, no. */
export function oido(frecuencia: number, nivel: number): Oido {
  if (frecuencia < AUDIBLE.min) return 'infra'
  if (frecuencia > AUDIBLE.max) return 'ultra'
  return nivel < UMBRAL_DB ? 'bajo' : 'si'
}

/** Pulso de presión normalizado (derivada de una gaussiana, ±1 en τ = ±σ): compresión adelante, rarefacción atrás. */
export function pulso(tau: number): number {
  const x = tau / PULSO_S
  return x * Math.exp(0.5 - (x * x) / 2)
}

/** Lo que registra el micrófono del medio `m` (presión relativa, 1 = la amplitud de la fuente) a los `t` s del golpe. */
export function senal(m: MedioId, c: Config, aire: number, t: number): number {
  return c.amplitud * (m === 'aire' ? aire : 1) * pulso(t - T_EMISION - llegada(m, c.distancia))
}

const NOTAS = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si']
/** Nota más cercana (La4 = 440 Hz, Do4 = 261,6 Hz) y si la frecuencia cae justo ahí; `null` fuera del rango del piano. */
export function nota(f: number): { nombre: string; exacta: boolean } | null {
  if (f < 27 || f > 4200) return null
  const midi = 69 + 12 * Math.log2(f / 440)
  const m = Math.round(midi)
  return { nombre: `${NOTAS[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`, exacta: Math.abs(midi - m) < 0.1 }
}

/** Avanza `dt` s reales de reloj: el golpe viaja en cámara lenta y la bomba saca (o deja entrar) el aire. */
export function paso(e: Estado, c: Config, dt: number): Estado {
  const aire = c.bomba
    ? Math.max(AIRE_MIN, e.aire * Math.exp(-dt / TAU_BOMBA))
    : e.aire >= 0.9999 ? 1 : 1 - (1 - e.aire) * Math.exp(-dt / TAU_ENTRADA)
  const golpe = e.golpe === null ? null : Math.min(e.golpe + dt / c.lenta, tiempoFinal(c.distancia))
  return { golpe, aire }
}
