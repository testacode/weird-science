// Modelo de estados de la materia: balance de energía por entalpía.
//
// El estado guarda una sola cantidad, la entalpía `h` (J) de la muestra medida desde "todo sólido
// justo en el punto de fusión". La temperatura y la fracción de cada fase salen de `h` con una
// curva por tramos, así que las mesetas son exactas (no hay error de integración):
//
//   sólido      h < 0                  T = Tf + h / (m·cs)
//   fusión      0 ≤ h ≤ m·Lf           T = Tf                    fracción líquida = h / (m·Lf)
//   líquido                            T = Tf + (h - m·Lf) / (m·cl)
//   ebullición  hL ≤ h ≤ hL + m·Lv     T = Tb(P)                 fracción gaseosa = (h - hL) / (m·Lv)
//   gas                                T = Tb(P) + (h - hV) / (m·cg)
//
// La presión sólo cambia el punto de ebullición (Clausius-Clapeyron). Constantes: ver SUSTANCIAS.

/** Constante de los gases, J/(mol·K). */
export const R_GASES = 8.314
export const CERO_ABSOLUTO_C = -273.15
export const MASA_G = 100
/** Con tapa, una válvula de olla a presión se abre a esta presión absoluta (1 atm manométrica). */
export const P_VALVULA_ATM = 2
/** La placa enfría hasta `tFusion` menos esto, y calienta hasta `tEbullicion` más `T_TOPE_CALOR`. */
export const T_TOPE_FRIO = 60
export const T_TOPE_CALOR = 100
/** El experimento arranca con la sustancia sólida esto por debajo de su punto de fusión. */
export const T_PARTIDA = 30
export const POTENCIA_INICIAL_W = 400

export type SustanciaId = 'agua' | 'alcohol' | 'acetona'

export interface Sustancia {
  id: SustanciaId
  nombre: string
  /** Cómo se llama en estado sólido y en líquido, para las preguntas ("el hielo", "el agua"). */
  solido: string
  liquido: string
  /** Masa molar, g/mol. */
  masaMolar: number
  /** °C a 1 atm. */
  tFusion: number
  tEbullicion: number
  /** Calor específico por fase, J/(g·K). */
  cSolido: number
  cLiquido: number
  cGas: number
  /** Calores latentes, J/g. */
  calorFusion: number
  calorVaporizacion: number
}

// Valores redondeados de tablas (CRC Handbook of Chemistry and Physics, NIST Chemistry WebBook), verificados
// en docs/fuentes.md. El c del etanol sólido sale de un libro de texto (NIST no lo tiene); el del gas, cerca de la ebullición.
export const SUSTANCIAS: readonly Sustancia[] = [
  { id: 'agua', nombre: 'Agua', solido: 'el hielo', liquido: 'el agua', masaMolar: 18.015, tFusion: 0, tEbullicion: 100,
    cSolido: 2.09, cLiquido: 4.18, cGas: 2.01, calorFusion: 334, calorVaporizacion: 2257 },
  { id: 'alcohol', nombre: 'Alcohol', solido: 'el alcohol congelado', liquido: 'el alcohol', masaMolar: 46.07, tFusion: -114.1, tEbullicion: 78.4,
    cSolido: 0.97, cLiquido: 2.44, cGas: 1.6, calorFusion: 108, calorVaporizacion: 840 },
  { id: 'acetona', nombre: 'Acetona', solido: 'la acetona congelada', liquido: 'la acetona', masaMolar: 58.08, tFusion: -94.7, tEbullicion: 56.1,
    cSolido: 1.6, cLiquido: 2.15, cGas: 1.4, calorFusion: 98, calorVaporizacion: 501 },
]

export interface Config {
  /** Tapa de olla a presión puesta. */
  tapa: boolean
  /** Con `false` el calor latente vale cero: es el "romper el sistema" de las mesetas. */
  latente: boolean
}

export interface Estado {
  /** Entalpía (J) medida desde "todo sólido en el punto de fusión". */
  h: number
  /** Segundos simulados. */
  t: number
  /** Energía neta entregada por la placa (J); negativa si enfrió más de lo que calentó. */
  energia: number
}

export type Fase = 'solido' | 'fusion' | 'liquido' | 'ebullicion' | 'gas'

export interface Lectura {
  h: number
  /** °C. */
  temp: number
  tempK: number
  /** Fracciones de masa, suman 1. */
  fs: number
  fl: number
  fg: number
  fase: Fase
  /** Presión dentro del recipiente, atm. */
  presion: number
  /** Temperatura de la meseta de ebullición con la presión de la tapa, °C. */
  tEbullicion: number
  /** La placa está en su tope (no puede calentar o enfriar más). */
  tope: 'frio' | 'calor' | null
}

export interface Umbrales {
  tEbullicion: number
  /** Fin de la fusión. */
  hF: number
  /** Fin del tramo líquido (empieza a hervir). */
  hL: number
  /** Fin de la ebullición (todo gas). */
  hV: number
  hMin: number
  hMax: number
}

const aK = (c: number) => c - CERO_ABSOLUTO_C

/** Presión de vapor (atm) a `tC`, por Clausius-Clapeyron con el calor de vaporización constante. */
export function presionVapor(s: Sustancia, tC: number): number {
  const lMolar = s.calorVaporizacion * s.masaMolar
  return Math.exp((lMolar / R_GASES) * (1 / aK(s.tEbullicion) - 1 / aK(tC)))
}

/** Punto de ebullición (°C) a la presión `atm`. */
export function ebullicionA(s: Sustancia, atm: number): number {
  const lMolar = s.calorVaporizacion * s.masaMolar
  return 1 / (1 / aK(s.tEbullicion) - (R_GASES * Math.log(atm)) / lMolar) + CERO_ABSOLUTO_C
}

export function umbrales(s: Sustancia, c: Config): Umbrales {
  const tEbullicion = c.tapa ? ebullicionA(s, P_VALVULA_ATM) : s.tEbullicion
  const hF = c.latente ? MASA_G * s.calorFusion : 0
  const hL = hF + MASA_G * s.cLiquido * (tEbullicion - s.tFusion)
  const hV = hL + (c.latente ? MASA_G * s.calorVaporizacion : 0)
  return {
    tEbullicion,
    hF,
    hL,
    hV,
    hMin: -MASA_G * s.cSolido * T_TOPE_FRIO,
    hMax: hV + MASA_G * s.cGas * (s.tEbullicion + T_TOPE_CALOR - tEbullicion),
  }
}

export function estadoInicial(s: Sustancia): Estado {
  return { h: -MASA_G * s.cSolido * T_PARTIDA, t: 0, energia: 0 }
}

export function leer(e: Estado, s: Sustancia, c: Config): Lectura {
  const u = umbrales(s, c)
  const h = Math.min(Math.max(e.h, u.hMin), u.hMax)
  const m = MASA_G
  let temp: number
  let fs = 0
  let fl = 0
  let fg = 0
  let fase: Fase
  if (h <= 0) {
    temp = s.tFusion + h / (m * s.cSolido)
    fs = 1
    fase = 'solido'
  } else if (h < u.hF) {
    temp = s.tFusion
    fl = h / u.hF
    fs = 1 - fl
    fase = 'fusion'
  } else if (h <= u.hL) {
    temp = s.tFusion + (h - u.hF) / (m * s.cLiquido)
    fl = 1
    fase = 'liquido'
  } else if (h < u.hV) {
    temp = u.tEbullicion
    fg = (h - u.hL) / (u.hV - u.hL)
    fl = 1 - fg
    fase = 'ebullicion'
  } else {
    temp = u.tEbullicion + (h - u.hV) / (m * s.cGas)
    fg = 1
    fase = 'gas'
  }
  const hirviendo = fase === 'ebullicion' || fase === 'gas'
  const presion = !c.tapa ? 1 : hirviendo ? P_VALVULA_ATM : Math.max(1, presionVapor(s, temp))
  return {
    h, temp, tempK: aK(temp), fs, fl, fg, fase, presion,
    tEbullicion: u.tEbullicion,
    tope: h <= u.hMin ? 'frio' : h >= u.hMax ? 'calor' : null,
  }
}

/** Avanza `dt` segundos con la placa a `potencia` W (negativa enfría). Pura: devuelve un estado nuevo. */
export function paso(e: Estado, s: Sustancia, c: Config, potencia: number, dt: number): Estado {
  const u = umbrales(s, c)
  const h = Math.min(Math.max(e.h + potencia * dt, u.hMin), u.hMax)
  return { h, t: e.t + dt, energia: e.energia + (h - e.h) }
}

/** Velocidad media de las partículas, m/s: v = √(8·R·T / (π·M)), o sea proporcional a √T. */
export function velocidadMedia(tempK: number, s: Sustancia): number {
  return Math.sqrt((8 * R_GASES * Math.max(tempK, 0)) / (Math.PI * (s.masaMolar / 1000)))
}

export interface Meseta {
  /** Segundos que la placa tarda en cruzar el cambio de estado. 0 si no hay meseta. */
  duracion: number
  /** Temperatura mínima y máxima durante el cambio de estado, °C. */
  tMin: number
  tMax: number
}

/**
 * Calienta una muestra desde el estado inicial con `potencia` W y mide cuánto dura y a qué
 * temperatura queda el cambio de estado pedido. Es la "respuesta del modelo" de las predicciones.
 */
export function simularMeseta(s: Sustancia, c: Config, potencia: number, cambio: 'fusion' | 'ebullicion'): Meseta {
  const dt = 0.5
  const objetivo: Fase = cambio
  let e = estadoInicial(s)
  let duracion = 0
  let tMin = Infinity
  let tMax = -Infinity
  for (let i = 0; i < 200_000; i++) {
    const l = leer(e, s, c)
    if (l.fase === objetivo) {
      duracion += dt
      tMin = Math.min(tMin, l.temp)
      tMax = Math.max(tMax, l.temp)
    } else if (duracion > 0 || l.tope === 'calor') break
    e = paso(e, s, c, potencia, dt)
  }
  if (duracion === 0) {
    // Sin meseta: la temperatura del punto de cambio es la de la curva en ese instante.
    const t = cambio === 'fusion' ? s.tFusion : umbrales(s, c).tEbullicion
    return { duracion: 0, tMin: t, tMax: t }
  }
  return { duracion, tMin, tMax }
}
