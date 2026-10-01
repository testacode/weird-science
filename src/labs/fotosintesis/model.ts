// Modelo simplificado de una rama de Elodea bajo una lámpara. Todo en µmol de O₂ por minuto.
//
//   6 CO₂ + 6 H₂O + luz  →  C₆H₁₂O₆ + 6 O₂        (fotosíntesis: 1 glucosa cada 6 O₂)
//   C₆H₁₂O₆ + 6 O₂       →  6 CO₂ + 6 H₂O + energía  (respiración: lo inverso, de día y de noche)
//
// Luz que llega:      I     = 100 · (D_REF / d)²                (ley del inverso del cuadrado, % de la lámpara a 10 cm)
// Luz absorbida:      Iabs  = I · absorción(color)               (la hoja absorbe menos el verde, pero igual la mayor parte)
// Factor de luz:      fLuz  = 1 − exp(−Iabs / IK)                (curva saturante)
// Factor de CO₂:      fCO2  = C / (C + KC) · (100 + KC) / 100    (Michaelis-Menten normalizada a 1 con C = 100)
// Factor de temp.:    fTemp = Q10^((T − T_OPT)/10) si T ≤ T_OPT, exp(−((T − T_OPT)/ANCHO)²) si T > T_OPT
// Fotosíntesis bruta: P = P_MAX · min(fLuz, fCO2, fTemp)         (Blackman / Liebig: manda el factor más escaso)
// Balance de O₂:      neto = P − R, con R constante
// Burbujas:           solo sale gas si neto > 0; cada burbuja de ~2 mm lleva UMOL_POR_BURBUJA de O₂
// Glucosa:            µg = (O₂ producido / 6) · 180,16 µg/µmol

export const COLORES = ['blanca', 'roja', 'azul', 'verde'] as const
export type ColorLuz = (typeof COLORES)[number]

export interface Config {
  /** Distancia de la lámpara a la planta, en cm. */
  distancia: number
  /** CO₂ disuelto, en % del máximo (0 = agua hervida, 30 = agua de la canilla, 100 = con bicarbonato). */
  co2: number
  /** Temperatura del agua, en °C. */
  temperatura: number
  color: ColorLuz
  encendida: boolean
}

export const CONFIG_INICIAL: Config = { distancia: 20, co2: 30, temperatura: 26, color: 'blanca', encendida: true }

export const LIMITES = { distancia: [10, 60], co2: [0, 100], temperatura: [5, 45] } as const

/**
 * Fracción de la luz de cada color que absorbe la hoja (a igual cantidad de fotones). Una hoja de lechuga absorbe
 * ~92 % del rojo y del azul y ~81 % del verde (Liu y van Iersel 2021); la de Elodea es más fina: estimación algo menor.
 * La blanca es la mezcla, con mucho verde. Ver docs/fuentes.md.
 */
export const ABSORCION: Record<ColorLuz, number> = { blanca: 0.8, roja: 0.9, azul: 0.95, verde: 0.7 }

export const P_MAX = 5
export const RESPIRACION = 0.4
const DISTANCIA_REF = 10
const IK = 30
const KC = 25
const T_OPT = 28
const T_ANCHO = 8
const Q10 = 2
const UMOL_POR_BURBUJA = 0.17
const O2_POR_GLUCOSA = 6
const UG_POR_UMOL_GLUCOSA = 180.16

export type Factor = 'luz' | 'co2' | 'temp'

export interface Derivados {
  /** Luz que llega a la planta, % de la lámpara a 10 cm. */
  llega: number
  absorbida: number
  fLuz: number
  fCo2: number
  fTemp: number
  limita: Factor
  /** µmol de O₂ por minuto. */
  bruta: number
  resp: number
  neto: number
  burbujasMin: number
  glucosaUgMin: number
}

export function tasas(c: Config): Derivados {
  const llega = c.encendida ? Math.min(100, 100 * (DISTANCIA_REF / c.distancia) ** 2) : 0
  const absorbida = llega * ABSORCION[c.color]
  const fLuz = 1 - Math.exp(-absorbida / IK)
  const fCo2 = (c.co2 / (c.co2 + KC)) * ((100 + KC) / 100)
  const dT = c.temperatura - T_OPT
  const fTemp = dT <= 0 ? Q10 ** (dT / 10) : Math.exp(-((dT / T_ANCHO) ** 2))
  // Empate: gana el primero en este orden (luz, CO₂, temperatura).
  const limita: Factor = fLuz <= fCo2 && fLuz <= fTemp ? 'luz' : fCo2 <= fTemp ? 'co2' : 'temp'
  const bruta = P_MAX * Math.min(fLuz, fCo2, fTemp)
  const neto = bruta - RESPIRACION
  return {
    llega, absorbida, fLuz, fCo2, fTemp, limita, bruta, resp: RESPIRACION, neto,
    burbujasMin: Math.max(0, neto) / UMOL_POR_BURBUJA,
    glucosaUgMin: (bruta / O2_POR_GLUCOSA) * UG_POR_UMOL_GLUCOSA,
  }
}

export interface Estado {
  minutos: number
  /** O₂ producido y consumido acumulados, µmol. */
  producido: number
  consumido: number
  /** Burbujas ya emitidas (enteras) y gas acumulado para la próxima. */
  burbujas: number
  gasPendiente: number
}

export const PASO_MIN = 1 / 60

export const estadoInicial = (): Estado => ({ minutos: 0, producido: 0, consumido: 0, burbujas: 0, gasPendiente: 0 })

/** Avanza `dt` minutos. Pura: devuelve un estado nuevo. */
export function paso(e: Estado, c: Config, dt = PASO_MIN): Estado {
  const d = tasas(c)
  let gasPendiente = Math.max(0, e.gasPendiente + d.neto * dt)
  let burbujas = e.burbujas
  while (gasPendiente >= UMOL_POR_BURBUJA) {
    gasPendiente -= UMOL_POR_BURBUJA
    burbujas += 1
  }
  return { minutos: e.minutos + dt, producido: e.producido + d.bruta * dt, consumido: e.consumido + d.resp * dt, burbujas, gasPendiente }
}

/** Corre la simulación `minutos` con una config fija; sirve para calcular las respuestas de la predicción. */
export function simular(c: Config, minutos: number, desde = estadoInicial()): Estado {
  let e = desde
  for (let i = 0, n = Math.round(minutos / PASO_MIN); i < n; i++) e = paso(e, c)
  return e
}

/** Glucosa fabricada (bruta) en mg. */
export const glucosaMg = (e: Estado) => (e.producido / O2_POR_GLUCOSA) * UG_POR_UMOL_GLUCOSA / 1000
