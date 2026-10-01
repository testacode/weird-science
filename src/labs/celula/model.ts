// Ósmosis de una célula en una solución de NaCl. Simulación pura, sin Three.js.
// Cantidades relativas: volumen v en múltiplos del normal; concentraciones en múltiplos de la isotónica de la célula (r).
import {
  FRACCION_INACTIVA_GR, K_AGUA_GLOBULO, K_AGUA_VEGETAL, K_SOLUTO, PCT_PLASMOLISIS_VEGETAL, PCT_SUERO, RIGIDEZ_PARED,
  RITMO_GLOBULO, RITMO_VEGETAL, V_ROTURA, osmolaridad,
} from './constantes'

export type Celula = 'globulo' | 'vegetal'

/** Lo que se arma en el vaso: la célula, la sal de afuera y las dos cosas que se pueden romper. */
export interface Entorno {
  celula: Celula
  /** NaCl de la solución, % m/V. */
  pct: number
  /** Membrana que deja pasar solo agua. Sin ella la sal atraviesa la membrana. */
  selectiva: boolean
  /** Pared celular (solo la célula vegetal tiene). */
  pared: boolean
}

export interface Estado {
  /** Segundos de la célula (no de la pantalla). */
  t: number
  v: number
  /** Soluto permeante que ya entró, en múltiplos de c₀·V₀. */
  s: number
  rota: boolean
}

export interface ParamsCelula {
  nombre: string
  /** Con artículo, para las frases ("un glóbulo rojo"). */
  un: string
  /** Fracción del volumen que no responde a la ósmosis. */
  b: number
  k: number
  /** Segundos de la célula por segundo de pantalla a 1×. */
  ritmo: number
  /** % de NaCl con el que la célula está en equilibrio (isotónica / borde de la plasmólisis). */
  pctIso: number
  /** Segundos de la célula que tienen que pasar antes de dar la ósmosis por terminada. */
  tMin: number
}

export const CELULAS: Record<Celula, ParamsCelula> = {
  globulo: { nombre: 'Glóbulo rojo', un: 'un glóbulo rojo', b: FRACCION_INACTIVA_GR, k: K_AGUA_GLOBULO, ritmo: RITMO_GLOBULO, pctIso: PCT_SUERO, tMin: 0.4 },
  vegetal: { nombre: 'Célula vegetal', un: 'una célula vegetal', b: 0, k: K_AGUA_VEGETAL, ritmo: RITMO_VEGETAL, pctIso: PCT_PLASMOLISIS_VEGETAL, tMin: 2 },
}

/** Variación de volumen por debajo de la cual se considera "igual". */
export const TOLERANCIA_VOLUMEN = 0.03
/** Distancia al volumen de equilibrio por debajo de la cual se considera que la célula llegó. */
const UMBRAL_EQUILIBRIO = 0.004
/** Presión osmótica (MPa) de la célula vegetal en la plasmólisis incipiente: π = osmolaridad · R · T, con T = 20 °C. */
export const PI0_VEGETAL_MPA = (osmolaridad(PCT_PLASMOLISIS_VEGETAL) * 8.314 * 293.15) / 1e6
const PASO_S = 0.005

/** Osmolaridad (mOsm/L) del interior de la célula en reposo. */
export const mOsmInterior = (celula: Celula) => osmolaridad(CELULAS[celula].pctIso)
export const estadoInicial = (): Estado => ({ t: 0, v: 1, s: 0, rota: false })
export const conPared = (e: Entorno) => e.celula === 'vegetal' && e.pared
const presionPared = (v: number, ent: Entorno) => (conPared(ent) ? RIGIDEZ_PARED * Math.max(0, v - 1) : 0)
/** Concentración de afuera relativa a la isotónica de la célula. */
export const relativa = (e: Entorno) => e.pct / CELULAS[e.celula].pctIso

/** Cómo cambian el volumen y el soluto que entró. El agua va hacia donde hay más soluto; la pared frena al hincharse. */
export function derivadas(est: Estado, ent: Entorno): { dv: number; ds: number } {
  const p = CELULAS[ent.celula]
  const agua = est.v - p.b
  const adentro = (1 - p.b + est.s) / agua
  const afuera = relativa(ent)
  return { dv: p.k * (adentro - afuera - presionPared(est.v, ent)), ds: ent.selectiva ? 0 : K_SOLUTO * (afuera - est.s / agua) }
}

export function paso(est: Estado, ent: Entorno, dt: number): Estado {
  if (est.rota) return { ...est, t: est.t + dt }
  const p = CELULAS[ent.celula]
  let { v, s } = est
  const n = Math.max(1, Math.ceil(dt / PASO_S))
  for (let i = 0; i < n; i++) {
    const { dv, ds } = derivadas({ ...est, v, s }, ent)
    v = Math.max(p.b + 0.08, v + (dv * dt) / n)
    s = Math.max(0, s + (ds * dt) / n)
    if (!conPared(ent) && v >= V_ROTURA) return { t: est.t + dt, v, s, rota: true }
  }
  return { t: est.t + dt, v, s, rota: false }
}

export type Forma = 'rota' | 'hincha' | 'igual' | 'achica'
export const forma = (v: number, rota: boolean): Forma =>
  rota ? 'rota' : v > 1 + TOLERANCIA_VOLUMEN ? 'hincha' : v < 1 - TOLERANCIA_VOLUMEN ? 'achica' : 'igual'

export type Tonicidad = 'hipo' | 'iso' | 'hiper'
/**
 * Un solo criterio para "igual / hipo / hiper": la célula sin pared quedaría dentro de ±TOLERANCIA_VOLUMEN de su volumen normal.
 * Lo usan la métrica, el estado, el relato y la pregunta. Con la sal atravesando la membrana la tonicidad es la de lo que no pasa (`hipo`).
 */
export function tonicidad(ent: Entorno): Tonicidad {
  if (!ent.selectiva) return 'hipo'
  const { b } = CELULAS[ent.celula]
  const v = b + (1 - b) / relativa(ent)
  return v > 1 + TOLERANCIA_VOLUMEN ? 'hipo' : v < 1 - TOLERANCIA_VOLUMEN ? 'hiper' : 'iso'
}

/** Volumen y soluto del equilibrio (o `rota` si la membrana no llega a aguantar), resuelto por bisección: dv = 0 en `derivadas`. */
export function equilibrio(ent: Entorno): Estado {
  const p = CELULAS[ent.celula]
  // Con la sal atravesando la membrana el soluto se reparte igual y solo empujan las moléculas grandes de adentro.
  const afuera = ent.selectiva ? relativa(ent) : 0
  const sobra = (v: number) => (1 - p.b) / (v - p.b) - afuera - presionPared(v, ent)
  const s = (v: number) => (ent.selectiva ? 0 : relativa(ent) * (v - p.b))
  if (!conPared(ent) && sobra(V_ROTURA) >= 0) return { t: 0, v: V_ROTURA, s: s(V_ROTURA), rota: true }
  let [bajo, alto] = [p.b + 0.08, V_ROTURA]
  for (let i = 0; i < 60; i++) {
    const medio = (bajo + alto) / 2
    if (sobra(medio) > 0) bajo = medio
    else alto = medio
  }
  return { t: 0, v: bajo, s: s(bajo), rota: false }
}

export interface Lectura {
  v: number
  /** Soluto permeante que entró (en múltiplos de c₀·V₀). */
  s: number
  forma: Forma
  rota: boolean
  /** Volumen del agua de la célula relativo al normal (lo que cruza la membrana). */
  agua: number
  /** Concentración de adentro, en % de NaCl equivalente. */
  pctDentro: number
  mOsmDentro: number
  mOsmFuera: number
  /** Presión de turgencia (MPa); 0 sin pared. */
  presion: number
  tonicidad: Tonicidad
  /** Agua neta: > 0 entra, < 0 sale (1/s). */
  flujo: number
  listo: boolean
}

/** Llegó cuando está cerca del volumen de equilibrio y lo que se muestra ya coincide con el veredicto (misma forma). */
function llegoAlEquilibrio(v: number, ent: Entorno): boolean {
  const eq = equilibrio(ent)
  return !eq.rota && Math.abs(v - eq.v) < UMBRAL_EQUILIBRIO && forma(v, false) === forma(eq.v, false)
}

export function leer(est: Estado, ent: Entorno): Lectura {
  const p = CELULAS[ent.celula]
  const { dv } = derivadas(est, ent)
  const agua = est.v - p.b
  // Rota: lo de adentro se mezcla con lo de afuera.
  const pctDentro = est.rota ? ent.pct : ((1 - p.b + est.s) / agua) * p.pctIso
  return {
    v: est.v,
    s: est.s,
    forma: forma(est.v, est.rota),
    rota: est.rota,
    agua: agua / (1 - p.b),
    pctDentro,
    mOsmDentro: osmolaridad(pctDentro),
    mOsmFuera: osmolaridad(ent.pct),
    presion: est.rota ? 0 : presionPared(est.v, ent) * PI0_VEGETAL_MPA,
    tonicidad: tonicidad(ent),
    flujo: est.rota ? 0 : dv,
    listo: est.rota || (est.t > p.tMin && llegoAlEquilibrio(est.v, ent)),
  }
}

export interface Resultado {
  final: Estado
  /** Flujos del primer instante: agua neta y soluto que entra. */
  dv0: number
  ds0: number
}

/** Resultado final de la ósmosis en `ent` (equilibrio o rotura) sin correrla, más los flujos del primer instante. */
export function simular(ent: Entorno): Resultado {
  const { dv, ds } = derivadas(estadoInicial(), ent)
  return { final: equilibrio(ent), dv0: dv, ds0: ds }
}

/** Con qué % de NaCl llega el glóbulo justo al volumen de rotura (Boyle–van't Hoff). */
export function pctDeRotura(): number {
  const { b, pctIso } = CELULAS.globulo
  return (pctIso * (1 - b)) / (V_ROTURA - b)
}
