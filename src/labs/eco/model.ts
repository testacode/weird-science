// Modelo del eco: un pulso sale de la fuente, viaja hasta una superficie, rebota y vuelve. Puro (sin Three.js ni DOM).
//
//   tiempo de ida y vuelta   t = 2d / v                    (v depende del medio y, en el aire, de la temperatura; no del volumen)
//   velocidad en el aire     v = 331,4 + 0,6·T             (T en °C, cerca de la temperatura ambiente)
//   nivel del eco            L_eco = L − 20·log10(2d / 1 m) + 10·log10(1 − α)
//                            (el pulso se abre en esfera: −6 dB por cada duplicación de la distancia recorrida, 2d;
//                             y la superficie devuelve la fracción 1 − α de la energía)
//   mismo tono               el eco repite la frecuencia de la fuente (la superficie está quieta: no hay efecto Doppler)
//
// Parámetros del modelo (no son constantes de la naturaleza): ver las marcas "parámetro". Fuentes: docs/fuentes.md.

export type MedioId = 'aire' | 'agua'
export type SuperficieId = 'pared' | 'cortina' | 'acantilado' | 'fondo'
export type Modo = 'explorar' | 'medir'
export type Clase = 'claro' | 'mezcla' | 'ausente'

export interface Superficie {
  id: SuperficieId
  nombre: string
  medio: MedioId
  /** Fracción de la energía que se absorbe o se pierde en el rebote (0 = espejo perfecto). */
  alfa: number
  distancia: { min: number; max: number; paso: number; inicial: number }
}

/** Impedancia acústica Z = ρ·c, en kg/(m²·s). Agua de mar: 1.023 kg/m³ y 1.500 m/s. Arena fina del fondo: 1.970 kg/m³ y 1.619 m/s. */
const Z_AGUA = 1023 * 1500
const Z_ARENA = 1970 * 1619
/** Reflexión en el fondo a incidencia normal: R = ((Z2 − Z1) / (Z2 + Z1))² de la energía (≈ 0,12). */
const ALFA_FONDO = 1 - ((Z_ARENA - Z_AGUA) / (Z_ARENA + Z_AGUA)) ** 2

// Absorción a 1.000 Hz (la voz): ladrillo 0,04 y cortinas pesadas 0,75 (Wikipedia, "Absorption (acoustics)").
// El acantilado usa el valor del ladrillo: la roca no está en la tabla (parámetro).
export const SUPERFICIES: readonly Superficie[] = [
  { id: 'pared', nombre: 'Pared', medio: 'aire', alfa: 0.04, distancia: { min: 2, max: 100, paso: 1, inicial: 30 } },
  { id: 'cortina', nombre: 'Cortina', medio: 'aire', alfa: 0.75, distancia: { min: 2, max: 100, paso: 1, inicial: 30 } },
  { id: 'acantilado', nombre: 'Acantilado', medio: 'aire', alfa: 0.04, distancia: { min: 30, max: 400, paso: 5, inicial: 85 } },
  { id: 'fondo', nombre: 'Fondo del mar', medio: 'agua', alfa: ALFA_FONDO, distancia: { min: 10, max: 300, paso: 5, inicial: 100 } },
]
export const superficie = (id: SuperficieId): Superficie => SUPERFICIES.find((s) => s.id === id)!

/** Velocidad del sonido en el agua de mar, m/s (valor típico: varía con temperatura, salinidad y profundidad). */
export const V_MAR = 1500
/** Rango de temperatura del aire donde vale la fórmula lineal, °C (parámetro). */
export const TEMPERATURA = { min: 0, max: 40 } as const
/** Nivel de un grito a 1 m, dB: 76 dB (A) promedio de un adulto, según DPA. Rango del control (parámetro). */
export const VOLUMEN = { min: 50, max: 100, inicial: 76 } as const
/** Nivel de una conversación normal y de un grito a 1 m, dB (DPA): referencias del control de volumen. */
export const REF_VOZ = { conversacion: 58, grito: 76 } as const
/** Separación mínima para oír el eco aparte del grito, s: regla didáctica de 1/10 de segundo (Wikipedia, "Echo"). */
export const UMBRAL_ECO = 0.1
/** Ruido de fondo, dB: un cuarto/campo muy tranquilo (20–30 dB, Wikipedia "Sound pressure"); en el agua los dB son relativos (parámetro). */
export const RUIDO: Record<MedioId, number> = { aire: 25, agua: 0 }
/** Duración del pulso (σ de una campana), s: un "¡ey!" corto (parámetro). */
export const SIGMA = 0.03
/** El eco "casi no vuelve" y el "se mezcla" solo se preguntan lejos de sus umbrales: margen en dB y en s. */
const MARGEN_DB = 3
const MARGEN_T = 0.05

export interface Config {
  superficie: SuperficieId
  modo: Modo
  /** Distancia fuente–superficie, m. */
  distancia: number
  /** Nivel del grito a 1 m, dB. */
  volumen: number
  /** Temperatura del aire, °C. */
  temperatura: number
}
export const CONFIG_INICIAL: Config = { superficie: 'pared', modo: 'explorar', distancia: 30, volumen: VOLUMEN.inicial, temperatura: 20 }

/** Segundos desde que sale el pulso (tiempo real, no el de la animación); `null` = todavía no se gritó. */
export interface Estado {
  t: number | null
}
export const ESTADO_INICIAL: Estado = { t: null }

export const velocidad = (c: Config): number => (superficie(c.superficie).medio === 'agua' ? V_MAR : 331.4 + 0.6 * c.temperatura)
export const medioDe = (c: Config): MedioId => superficie(c.superficie).medio
/** Tiempo de ida y vuelta, s. */
export const tiempoEco = (c: Config): number => (2 * c.distancia) / velocidad(c)
/** Nivel del eco en la fuente, dB. */
export const nivelEco = (c: Config): number => c.volumen - 20 * Math.log10(2 * c.distancia) + 10 * Math.log10(1 - superficie(c.superficie).alfa)
/** Cuánto baja el eco respecto del grito que sale, dB (positivo). */
export const caida = (c: Config): number => c.volumen - nivelEco(c)
export const ruido = (c: Config): number => RUIDO[medioDe(c)]

/** Qué se oye: eco aparte, eco pegado al grito (reverberación) o casi nada. En el agua lo mide un instrumento, que separa milisegundos. */
export function clasificar(c: Config): Clase {
  if (nivelEco(c) < ruido(c)) return 'ausente'
  return medioDe(c) === 'aire' && tiempoEco(c) < UMBRAL_ECO ? 'mezcla' : 'claro'
}
/** La clase no está cerca de un umbral: sirve para preguntar. */
export function claseSegura(c: Config): boolean {
  if (Math.abs(nivelEco(c) - ruido(c)) < MARGEN_DB) return false
  return nivelEco(c) < ruido(c) || medioDe(c) === 'agua' || Math.abs(tiempoEco(c) - UMBRAL_ECO) >= MARGEN_T
}

/** Duración de la animación de ida y vuelta, s: si el eco es más rápido, se ve en cámara lenta. */
const DURACION_VISUAL = 3.5
export const lenta = (c: Config): number => Math.max(1, DURACION_VISUAL / tiempoEco(c))
/** Lo que dura la campana del eco después de llegar, s: cierra el gráfico. */
const COLA = 0.1
/** Cámara lenta máxima de la cola: 0,1 s reales se ven en poco más de un segundo. */
const LENTA_COLA = 12
/** Cuando termina el experimento (el eco ya pasó). */
export const tiempoFinal = (c: Config): number => tiempoEco(c) + COLA

export function paso(e: Estado, c: Config, dt: number): Estado {
  if (e.t === null) return e
  const factor = e.t < tiempoEco(c) ? lenta(c) : Math.min(lenta(c), LENTA_COLA)
  return { t: Math.min(tiempoFinal(c), e.t + dt / factor) }
}
/** El eco ya volvió a la fuente y se completó su campana (el reveal de las preguntas espera acá). */
export const ecoPasado = (e: Estado, c: Config): boolean => e.t !== null && e.t >= tiempoFinal(c)

/** Nivel total que registra un sonómetro junto a la fuente en el instante `t`: ruido + grito + eco (suma de energías), dB. */
export function nivelEn(c: Config, t: number): number {
  const campana = (centro: number) => Math.exp(-((t - centro) ** 2) / (2 * SIGMA * SIGMA))
  const energia = (db: number) => 10 ** (db / 10)
  return 10 * Math.log10(energia(ruido(c)) + energia(c.volumen) * campana(0) + energia(nivelEco(c)) * campana(tiempoEco(c)))
}

/** Fracción de la distancia a la superficie que recorrió el frente (0 → 1 llega, 2 → vuelve a la fuente). */
export const recorrido = (e: Estado, c: Config): number => (e.t === null ? 0 : (velocidad(c) * e.t) / c.distancia)

/** Distancia "escondida" al azar para el modo medir: sin las puntas del rango, redondeada al paso. */
export function distanciaAlAzar(id: SuperficieId, azar: number = Math.random()): number {
  const { min, max, paso: p } = superficie(id).distancia
  const crudo = min + (0.1 + 0.8 * azar) * (max - min)
  return Math.round(crudo / p) * p
}
