// Modelo del lab de electrostática: cargas por frotamiento, ley de Coulomb, polarización de un papelito y electroscopio.
// Simulación pura, sin Three.js. Unidades del SI; las distancias de la interfaz van en cm.

/** Carga elemental (C). CODATA 2022, valor exacto. */
export const E_CARGA = 1.602176634e-19
/** Permitividad del vacío (F/m). CODATA 2022. */
export const EPS0 = 8.8541878188e-12
/** Constante de Coulomb, k = 1 / (4π ε₀) ≈ 8,9875517862 × 10⁹ N·m²/C². */
export const K = 1 / (4 * Math.PI * EPS0)
/** Gravedad (m/s²). */
export const G = 9.8

// --- Serie triboeléctrica ---

export type MatId = 'vidrio' | 'pelo' | 'lana' | 'seda' | 'globo' | 'pvc'

export interface Material {
  nombre: string
  /** Con artículo, para las frases ("el globo"). */
  det: string
  /** Posición en la lista de materiales de los kits de clase (Carolina): 1 es lo más positivo; más abajo, más negativo. */
  lugar: number
}

export const MATERIALES: Record<MatId, Material> = {
  vidrio: { nombre: 'Vidrio', det: 'el vidrio', lugar: 1 },
  pelo: { nombre: 'Pelo', det: 'el pelo', lugar: 2 },
  lana: { nombre: 'Lana', det: 'la lana', lugar: 4 },
  seda: { nombre: 'Seda', det: 'la seda', lugar: 6 },
  globo: { nombre: 'Globo', det: 'el globo', lugar: 13 },
  pvc: { nombre: 'Plástico', det: 'el plástico', lugar: 21 },
}

/** Parámetro del modelo: carga que se transfiere por cada puesto de distancia en la serie (C). Está dentro del rango nC–µC de la electricidad estática común. */
export const Q_PUESTO = 15e-9

export type ParId = 'globo-pelo' | 'vidrio-seda' | 'pvc-lana' | 'globo-lana' | 'vidrio-pelo' | 'seda-lana'
/** Se frota `a` con `b`. */
export const PARES: Record<ParId, { a: MatId; b: MatId }> = {
  'globo-pelo': { a: 'globo', b: 'pelo' },
  'vidrio-seda': { a: 'vidrio', b: 'seda' },
  'pvc-lana': { a: 'pvc', b: 'lana' },
  'globo-lana': { a: 'globo', b: 'lana' },
  'vidrio-pelo': { a: 'vidrio', b: 'pelo' },
  'seda-lana': { a: 'seda', b: 'lana' },
}

export type Lado = 'a' | 'b'
export type Experimento = 'cargas' | 'papelitos' | 'electroscopio'

export interface Config {
  par: ParId
  /** Cuál de los dos objetos frotados se usa para los experimentos. */
  cual: Lado
  experimento: Experimento
  /** En "cargas": lo que se le acerca al objeto (el otro frotado, de signo opuesto, o uno igual, del mismo signo). */
  otro: 'opuesto' | 'igual'
  /** Distancia (cm) de cada experimento. */
  dist: Record<Experimento, number>
  /** 0: neutros; 1: frotado del todo. */
  frote: number
}

export const RANGOS: Record<Experimento, { min: number; max: number }> = {
  cargas: { min: 8, max: 26 },
  papelitos: { min: 2.4, max: 16 },
  electroscopio: { min: 5, max: 26 },
}

export const CONFIG_INICIAL: Config = {
  par: 'globo-pelo',
  cual: 'a',
  experimento: 'cargas',
  otro: 'opuesto',
  dist: { cargas: 12, papelitos: 12, electroscopio: 14 },
  frote: 0,
}

// --- Carga por frotamiento ---

export const materialDe = (c: Pick<Config, 'par'>, lado: Lado): MatId => PARES[c.par][lado]

/** Cargas (C) de los dos objetos. El que está más abajo en la serie se queda con los electrones: queda negativo, y el otro, positivo en la misma cantidad. */
export function cargas(par: ParId, frote: number): Record<Lado, number> {
  const { a, b } = PARES[par]
  const qb = -Q_PUESTO * (MATERIALES[b].lugar - MATERIALES[a].lugar) * frote
  return { a: -qb, b: qb }
}

/** Quién queda negativo y quién positivo al frotar el par: el que está más abajo en la serie se queda con los electrones. */
export function polaridad(c: Pick<Config, 'par'>): { negativo: Lado; positivo: Lado } {
  const { a, b } = PARES[c.par]
  return MATERIALES[a].lugar > MATERIALES[b].lugar ? { negativo: 'a', positivo: 'b' } : { negativo: 'b', positivo: 'a' }
}
export const electrones = (q: number) => Math.abs(q) / E_CARGA

// --- Fuerzas ---

/** Ley de Coulomb entre cargas puntuales (N): positiva si se repelen, negativa si se atraen. `d` es la distancia entre centros, en cm. */
export const coulomb = (q1: number, q2: number, d: number) => (K * q1 * q2) / (d / 100) ** 2

/** Papelito de prueba (parámetros del modelo): ~1,4 cm de lado, papel de seda, tratado como una esfera polarizable de radio `radio`. */
export const PAPEL = { masa: 3e-6, radio: 0.007 }
export const PESO_PAPEL = PAPEL.masa * G

/** Fuerza de atracción (N) sobre un papelito neutro a `d` cm de una carga puntual `q`: el campo (kq/d²) induce un dipolo y el dipolo siente la variación del campo, F = 2·k·a³·q²/d⁵. */
export const polarizacion = (q: number, d: number) => (2 * K * PAPEL.radio ** 3 * q * q) / (d / 100) ** 5

/** Distancia (cm, entre centros) a la que se hace la pregunta del papelito: la atracción es varias veces el peso con cualquier par. */
export const DIST_PREGUNTA_PAPEL = 2.4

/** Electroscopio (parámetros del modelo): fracción de la carga que llega a las hojas, distancia (cm) a la que se reduce a la mitad su inducción en cuadrado, y hojas de oro de 4 cm. */
export const ELECTROSCOPIO = { eta: 0.02, d0: 8, largo: 0.04, masa: 1.5e-6 }

/** Carga (C) que se acumula en cada hoja por inducción: la del objeto, con su signo, atenuada con la distancia. */
export const cargaHojas = (q: number, d: number) => (ELECTROSCOPIO.eta * q * ELECTROSCOPIO.d0 ** 2) / (ELECTROSCOPIO.d0 ** 2 + d ** 2)

/** Ángulo (grados) de cada hoja respecto de la vertical. Equilibrio de una hoja: tan θ · sen²θ = k·Q² / (4·L²·m·g). */
export function anguloHojas(q: number, d: number): number {
  const Q = cargaHojas(q, d)
  const objetivo = (K * Q * Q) / (4 * ELECTROSCOPIO.largo ** 2 * ELECTROSCOPIO.masa * G)
  const f = (t: number) => Math.tan(t) * Math.sin(t) ** 2
  let lo = 0
  let hi = (80 * Math.PI) / 180
  if (f(hi) <= objetivo) return 80
  for (let i = 0; i < 40; i++) {
    const medio = (lo + hi) / 2
    if (f(medio) < objetivo) lo = medio
    else hi = medio
  }
  return (((lo + hi) / 2) * 180) / Math.PI
}

export interface Resultado {
  qa: number
  qb: number
  /** Carga del objeto que se usa de sonda. */
  q: number
  /** Carga de lo que se le acerca en "cargas". */
  q2: number
  /** Coulomb entre los dos (N, con signo: negativa es atracción). */
  fuerza: number
  /** Atracción sobre el papelito (N). */
  fuerzaPapel: number
  /** Cuántas veces el peso del papelito. */
  vecesPeso: number
  /** Apertura de cada hoja (grados). */
  angulo: number
}

/** Todo lo que se mide con la config actual. `dist` reemplaza la distancia del experimento activo (para dibujar la curva). */
export function resolver(c: Config, dist?: number): Resultado {
  const d = dist === undefined ? c.dist : { ...c.dist, [c.experimento]: dist }
  const { a, b } = cargas(c.par, c.frote)
  const q = c.cual === 'a' ? a : b
  const fuerzaPapel = polarizacion(q, d.papelitos)
  return {
    qa: a,
    qb: b,
    q,
    q2: c.otro === 'opuesto' ? -q : q,
    fuerza: coulomb(q, c.otro === 'opuesto' ? -q : q, d.cargas),
    fuerzaPapel,
    vecesPeso: fuerzaPapel / PESO_PAPEL,
    angulo: anguloHojas(q, d.electroscopio),
  }
}
