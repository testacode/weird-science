// Modelo puro (sin Three.js). Datos medidos y parámetros del modelo, cada uno marcado como tal.
// Fuentes de los datos: docs/fuentes.md (sección Volcanes).

export type Borde = 'divergente' | 'convergente' | 'transformante'
export type TipoMagma = 'basaltico' | 'andesitico' | 'riolitico'
export type Erupcion = 'efusiva' | 'mixta' | 'explosiva'

export interface Config {
  borde: Borde
  /** SiO₂ del magma, en % del peso. */
  silice: number
  /** Agua disuelta en el magma, en % del peso. */
  gas: number
}

/** Rangos de los deslizadores. Sílice: de los basaltos (≥45 %) a las riolitas (≤75 %); agua: de los basaltos de dorsal (0,1 %) a las riolitas (hasta 7 %). */
export const LIMITES = { silice: [45, 75], gas: [0.1, 7] } as const

/** Magmas de referencia: sílice del ejemplo de libro (basalto 53,8 / andesita 60,0 / riolita 73,2 %); el agua cae dentro de los rangos de Schmincke (2003). */
export const PRESETS: Record<TipoMagma, { silice: number; gas: number }> = {
  basaltico: { silice: 50, gas: 0.5 },
  andesitico: { silice: 60, gas: 3.5 },
  riolitico: { silice: 73, gas: 5 },
}

export const CONFIG_INICIAL: Config = { borde: 'convergente', ...PRESETS.andesitico }

/** Profundidades en km (USGS, This Dynamic Earth). */
export const PROFUNDIDAD = {
  cortezaOceanica: 5,
  cortezaContinental: 30,
  litosfera: 80,
  /** El manto llega a ~2.900 km: ahí empieza el núcleo externo, de hierro y níquel líquidos. */
  nucleo: 2900,
  /** Hasta dónde dibuja el corte (el resto del manto sigue hacia abajo). */
  corte: 200,
} as const

export interface Fusion {
  mecanismo: 'descompresion' | 'agua' | 'ninguno'
  /** Profundidad donde se forma el magma, en km. 0 si no hay. */
  origenKm: number
  /** Cuánto magma se genera, relativo (parámetro didáctico: solo el cero y el orden son datos). */
  produccion: number
  /** Velocidad típica de las placas, cm/año (USGS: dorsal Atlántica 2,5; San Andrés 5; Nazca 4,0–5,2). */
  velocidad: number
  /** Magma que se espera en ese borde. */
  tipico: TipoMagma | null
}

/** Qué pasa en cada borde: el único dato que cambia el corte. */
export const FUSION: Record<Borde, Fusion> = {
  // Descompresión: el manto sube, baja la presión y funde (seca 0–60 km, húmeda 60–120 km).
  divergente: { mecanismo: 'descompresion', origenKm: 120, produccion: 1, velocidad: 2.5, tipico: 'basaltico' },
  // Agua: la placa que se hunde la libera a ~120 km (60–173 km) y baja el punto de fusión del manto.
  convergente: { mecanismo: 'agua', origenKm: 120, produccion: 0.5, velocidad: 4.6, tipico: 'andesitico' },
  // Las placas solo se deslizan: ni sube manto ni entra agua.
  transformante: { mecanismo: 'ninguno', origenKm: 0, produccion: 0, velocidad: 5, tipico: null },
}

/** Sismos más profundos del borde, en km (Wadati–Benioff: hasta 670 km; los otros bordes, poco profundos). */
export const SISMOS_MAX_KM: Record<Borde, number | null> = { divergente: null, convergente: 670, transformante: null }

export function tipoMagma(silice: number): TipoMagma {
  return silice < 52 ? 'basaltico' : silice < 63 ? 'andesitico' : 'riolitico'
}

/** log₁₀ de la viscosidad (Pa·s): recta entre basalto (10–100 Pa·s a 50 %) y riolita fría (10⁸ Pa·s a 73 %). Ajuste del modelo. */
export function logViscosidad(silice: number): number {
  return 1.5 + ((8 - 1.5) / (73 - 50)) * (silice - 50)
}

/** Temperatura del magma (°C): baja con la sílice, de 1.100 °C (50 %) a ~725 °C (70 %), mitades de los rangos de Nelson. Ajuste del modelo. */
export function temperatura(silice: number): number {
  return Math.min(1200, Math.max(650, 1100 - 18.75 * (silice - 50)))
}

/**
 * Qué tan explosiva es la erupción, de 0 a 1. El gas hace falta (sin gas no hay explosión) y la
 * viscosidad decide si las burbujas escapan (magma fluido) o quedan atrapadas (magma pastoso). Parámetros del modelo.
 */
const GAS_REFERENCIA = 3
const VISCOSIDAD_CORTE = 3
export function explosividad(silice: number, gas: number): number {
  const atrapa = 1 / (1 + Math.exp(-(logViscosidad(silice) - VISCOSIDAD_CORTE) / 0.7))
  return Math.min(gas / GAS_REFERENCIA, 1) * (0.1 + 0.9 * atrapa)
}

export function tipoErupcion(e: number): Erupcion {
  return e < 0.3 ? 'efusiva' : e >= 0.6 ? 'explosiva' : 'mixta'
}

/** Con los dos números de la erupción: cuál es el tipo y si queda lejos de los cortes (para preguntar solo con respuesta clara). */
export function claridad(e: number): number {
  return Math.min(Math.abs(e - 0.3), Math.abs(e - 0.6))
}

export interface Estado {
  /** 0 → 1: el magma se forma, sube y llega a la cámara. */
  fusion: number
  /** 0 → 1: la erupción llega a su régimen (colada corriendo o columna arriba). */
  erupcion: number
}

export const T_FUSION = 4
export const T_ERUPCION = 3

export const estadoInicial = (): Estado => ({ fusion: 0, erupcion: 0 })

/** Avanza el tiempo del experimento. La erupción arranca cuando el magma llegó arriba, y solo si el borde genera magma. */
export function paso(e: Estado, c: Config, dt: number): Estado {
  const fusion = Math.min(1, e.fusion + dt / T_FUSION)
  const hayMagma = FUSION[c.borde].produccion > 0
  const erupcion = hayMagma && fusion >= 1 ? Math.min(1, e.erupcion + dt / T_ERUPCION) : e.erupcion
  return { fusion, erupcion }
}
