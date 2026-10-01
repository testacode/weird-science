// Modelo simplificado del tubo digestivo: un bolo recorre los segmentos y en
// cada uno las enzimas activas transforman nutrientes intactos en digeridos
// (cinética de primer orden) y el intestino delgado absorbe los digeridos.

export const MACROS = ['carbos', 'proteinas', 'grasas'] as const
export type Macro = (typeof MACROS)[number]

export const KCAL_POR_GRAMO: Record<Macro, number> = { carbos: 4, proteinas: 4, grasas: 9 }

export interface Pool {
  intacto: number
  digerido: number
  absorbido: number
}

export type Nutrientes = Record<Macro, Pool>

export interface Segmento {
  id: 'boca' | 'esofago' | 'estomago' | 'delgado' | 'grueso'
  nombre: string
  horas: number
  ph: number
  /** Tasas de digestión (1/h) por macronutriente. */
  digestion: Record<Macro, number>
  /** Tasa de absorción de nutrientes digeridos (1/h). */
  absorcion: number
}

export interface Config {
  bilis: boolean
  acidoGastrico: boolean
}

export interface Estado {
  horas: number
  segmento: number
  /** Avance dentro del segmento actual, de 0 a 1. */
  progreso: number
  nutrientes: Nutrientes
  terminado: boolean
}

export const SEGMENTOS: readonly Segmento[] = [
  { id: 'boca', nombre: 'Boca', horas: 0.02, ph: 6.8, digestion: { carbos: 3, proteinas: 0, grasas: 0 }, absorcion: 0 },
  { id: 'esofago', nombre: 'Esófago', horas: 0.01, ph: 7, digestion: { carbos: 0, proteinas: 0, grasas: 0 }, absorcion: 0 },
  { id: 'estomago', nombre: 'Estómago', horas: 3, ph: 2, digestion: { carbos: 0, proteinas: 0.35, grasas: 0.05 }, absorcion: 0 },
  { id: 'delgado', nombre: 'Intestino delgado', horas: 4, ph: 7.5, digestion: { carbos: 1.2, proteinas: 0.9, grasas: 1 }, absorcion: 1.5 },
  { id: 'grueso', nombre: 'Intestino grueso', horas: 16, ph: 6.5, digestion: { carbos: 0, proteinas: 0, grasas: 0 }, absorcion: 0 },
]

/** Sin bilis las grasas no se emulsionan y la lipasa trabaja sobre muy poca superficie. */
const FACTOR_SIN_BILIS = 0.2
/** Con antiácido el estómago sube a pH ~5 y la pepsina casi no actúa. */
const PH_CON_ANTIACIDO = 5

export const PASO_HORAS = 0.01

/** Índice del intestino delgado en SEGMENTOS (donde están el páncreas, el duodeno y las vellosidades). */
export const DELGADO = SEGMENTOS.findIndex((s) => s.id === 'delgado')

export const HORAS_TOTALES = SEGMENTOS.reduce((total, s) => total + s.horas, 0)

export function estadoInicial(gramos: Record<Macro, number>): Estado {
  const nutrientes = {} as Nutrientes
  for (const m of MACROS) nutrientes[m] = { intacto: gramos[m], digerido: 0, absorbido: 0 }
  return { horas: 0, segmento: 0, progreso: 0, nutrientes, terminado: false }
}

export function phSegmento(indice: number, config: Config): number {
  const s = SEGMENTOS[indice]
  return s.id === 'estomago' && !config.acidoGastrico ? PH_CON_ANTIACIDO : s.ph
}

export function tasaDigestion(s: Segmento, m: Macro, config: Config): number {
  if (s.id === 'estomago' && m === 'proteinas' && !config.acidoGastrico) return 0
  if (s.id === 'delgado' && m === 'grasas' && !config.bilis) return s.digestion[m] * FACTOR_SIN_BILIS
  return s.digestion[m]
}

/** Avanza la simulación un paso fijo. Pura: devuelve un estado nuevo. */
export function paso(estado: Estado, config: Config, dt = PASO_HORAS): Estado {
  if (estado.terminado) return estado
  const s = SEGMENTOS[estado.segmento]
  const nutrientes = {} as Nutrientes
  for (const m of MACROS) {
    const p = estado.nutrientes[m]
    const digiere = p.intacto * (1 - Math.exp(-tasaDigestion(s, m, config) * dt))
    const absorbe = p.digerido * (1 - Math.exp(-s.absorcion * dt))
    nutrientes[m] = {
      intacto: p.intacto - digiere,
      digerido: p.digerido + digiere - absorbe,
      absorbido: p.absorbido + absorbe,
    }
  }

  let segmento = estado.segmento
  let progreso = estado.progreso + dt / s.horas
  let terminado = false
  if (progreso >= 1) {
    if (segmento === SEGMENTOS.length - 1) {
      progreso = 1
      terminado = true
    } else {
      segmento += 1
      progreso = 0
    }
  }
  return { horas: estado.horas + dt, segmento, progreso, nutrientes, terminado }
}

export function simularHastaElFinal(estado: Estado, config: Config): Estado {
  let e = estado
  while (!e.terminado) e = paso(e, config)
  return e
}

export function kcalAbsorbidas(n: Nutrientes): number {
  return MACROS.reduce((total, m) => total + n[m].absorbido * KCAL_POR_GRAMO[m], 0)
}

export function fraccionAbsorbida(n: Nutrientes, m: Macro): number {
  const p = n[m]
  const total = p.intacto + p.digerido + p.absorbido
  return total === 0 ? 0 : p.absorbido / total
}

/** Posición a lo largo de todo el tubo, de 0 (boca) a 1 (fin del grueso), proporcional al largo visual. */
export function posicionEnTubo(estado: Estado): number {
  return (estado.segmento + estado.progreso) / SEGMENTOS.length
}
