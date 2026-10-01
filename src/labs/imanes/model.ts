// Modelo de imanes sobre la mesada. Unidades: posiciones en cm (x hacia la derecha, y hacia el norte),
// campo en T, fuerza en N, temperatura en °C. Todo vive en el plano de la mesada.
//
// Un imán de barra se modela con el "modelo de polos": una carga magnética +q en el extremo N y −q en el S,
// con q = M · A = (Br / μ0) · A (Wikipedia, "Force between magnets"). Es un truco de cálculo que usan quienes
// diseñan imanes: los polos sueltos no existen, y un polo real es una cara, no un punto (ver `SUAVIZADO`). De ahí salen, con la misma fórmula:
//   campo      B = (μ0/4π) · Σ q · r / (r² + a²)^(3/2)                 (brújulas y limaduras)
//   fuerza     F = (μ0/4π) · Σ qi · qj · d / (d² + a²)^(3/2)           (entre dos imanes, sumando los 4 pares de polos)
// Con a = 0 es la ley de Coulomb magnética (F = μ0 q1 q2 / 4π r²) y la suma de 4 pares reproduce la fórmula
// F ≈ (π μ0 /4) M² R⁴ [1/x² + 1/(x+2L)² − 2/(x+L)²] de dos imanes cilíndricos enfrentados (misma página).
// Lejos del imán la suma decae como 1/x⁴ (dipolo–dipolo), no como 1/x².

export const MU0 = 4e-7 * Math.PI
const K = MU0 / (4 * Math.PI)

export type Modo = 'dos' | 'material'
export type TipoId = 'ferrita' | 'neodimio'
export type Polo = 'N' | 'S'
export type CampoVista = 'brujulas' | 'limaduras' | 'nada'

/** Imán de barra de sección cuadrada. */
export const LARGO = 5
export const LADO = 1.6
const AREA = (LADO * 1e-2) ** 2
/** El polo no es un punto: es una cara de LADO × LADO. El "suavizado" (radio, en m) lo reparte y hace que, cerca, la fuerza caiga más
 *  despacio que 1/d² (con polos puntuales caería siempre más rápido). Parámetro ajustado, no un dato: se eligió para que la forma de F(d)
 *  coincida (error medio ~10 %) con la fuerza entre dos caras cuadradas de 1,6 cm con carga superficial uniforme, calculada por
 *  integración numérica propia entre 0,5 y 12 cm. A 0,5 cm da ~5 N para la ferrita, contra ~4,5 N de las caras. */
const SUAVIZADO = 0.65e-2

export const GAP_MIN = 0.5
export const GAP_MAX = 12
export const TEMP_MIN = 20
export const TEMP_MAX = 600
export const MAX_PIEZAS = 4
export const SEP_MAX = 2

/** Campo magnético terrestre en la mesada: solo la componente horizontal, apuntando al norte. Es un parámetro: la intensidad total
 *  va de 30 µT sobre Brasil a 60 µT sobre Siberia (Wikipedia, "Earth's magnetic field"). */
export const CAMPO_TERRESTRE = 20e-6

export interface Tipo {
  nombre: string
  /** Remanencia a temperatura ambiente, en T. */
  br: number
  /** Temperatura de Curie, en °C. */
  curie: number
  /** Temperatura máxima de uso antes de perder fuerza para siempre (solo el neodimio estándar), en °C. */
  usoMax?: number
}

/** Ferrita: B máximo ≈ 0,35 T, Curie 450 °C (ferrita de estroncio). Neodimio: Br 1–1,5 T (1,3 elegido), Curie 310–370 °C en la página del neodimio (310–400 °C en la tabla de Curie temperature; 340 elegido, dentro de las dos), uso hasta 80 °C. */
export const TIPOS: Record<TipoId, Tipo> = {
  ferrita: { nombre: 'Ferrita (heladera)', br: 0.35, curie: 450 },
  neodimio: { nombre: 'Neodimio (potente)', br: 1.3, curie: 340, usoMax: 80 },
}

const POLO_ENTERO = (t: TipoId) => (TIPOS[t].br / MU0) * AREA

// --- Materiales de la muestra de prueba (cubo de LADO_MUESTRA cm) ---
export type MaterialId = 'hierro' | 'acero' | 'niquel' | 'cobalto' | 'aluminio' | 'cobre' | 'plastico'

export interface Material {
  nombre: string
  /** Objeto cotidiano hecho de ese material, con artículo (vacío si no hay uno típico). */
  ejemplo: string
  ferro: boolean
  /** Susceptibilidad magnética volumétrica (SI). En los ferromagnéticos es enorme y no es una constante. */
  chi: number
  /** g/cm³ */
  densidad: number
  color: number
}

/** χ: Fe 200.000, Ni 600, Al +2,2×10⁻⁵, Cu −9,63×10⁻⁶, PVC −1,071×10⁻⁵ (Wikipedia, "Magnetic susceptibility").
 *  Densidades: Fe, Al, Cu, Ni y PVC de la misma tabla; cobalto 8,834 (Wikipedia, "Cobalt", 20 °C); acero 7,85 (docs/fuentes.md, Flotación).
 *  Cobalto y acero: sin χ verificado; el modelo usa un valor ≫ 3 y el resultado no cambia (la forma limita la respuesta, ver `chiEfectivo`). */
export const MATERIALES: Record<MaterialId, Material> = {
  hierro: { nombre: 'Hierro', ejemplo: 'un clavo', ferro: true, chi: 2e5, densidad: 7.874, color: 0x6b6f72 },
  acero: { nombre: 'Acero', ejemplo: 'una lata de conserva', ferro: true, chi: 1e3, densidad: 7.85, color: 0x9aa3a8 },
  niquel: { nombre: 'Níquel', ejemplo: '', ferro: true, chi: 600, densidad: 8.9, color: 0xc9d2d6 },
  cobalto: { nombre: 'Cobalto', ejemplo: '', ferro: true, chi: 250, densidad: 8.834, color: 0x7f93b8 },
  aluminio: { nombre: 'Aluminio', ejemplo: 'una lata de gaseosa', ferro: false, chi: 2.2e-5, densidad: 2.7, color: 0xd9dde0 },
  cobre: { nombre: 'Cobre', ejemplo: 'un caño de cobre', ferro: false, chi: -9.63e-6, densidad: 8.92, color: 0xd7814a },
  plastico: { nombre: 'Plástico', ejemplo: 'una tapita de PVC', ferro: false, chi: -1.071e-5, densidad: 1.372, color: 0xe8efe6 },
}
export const ORDEN_MATERIALES: MaterialId[] = ['hierro', 'acero', 'niquel', 'cobalto', 'aluminio', 'cobre', 'plastico']

export const LADO_MUESTRA = 1.2
const VOLUMEN_MUESTRA = (LADO_MUESTRA * 1e-2) ** 3
/** Coeficiente de rozamiento de la muestra con la mesada (parámetro; no es un dato). */
const ROZAMIENTO = 0.3
/** Saturación: las aleaciones de hierro saturan a 1,6–2,2 T (Wikipedia, "Saturation (magnetic)"); se toma el extremo bajo. */
const B_SATURACION = 1.6
/** Factor desmagnetizante de un cubo: 1/3 por simetría (el de una esfera es 1/3; Wikipedia, "Demagnetizing field"). */
const N_DESMAG = 1 / 3

/** Respuesta de una muestra chica: χ efectivo = χ / (1 + N·χ). Con χ ≫ 3 la forma lo limita a 1/N = 3 para cualquier ferromagnético. */
export const chiEfectivo = (chi: number) => chi / (1 + N_DESMAG * chi)

// --- Configuración ---
export interface Config {
  modo: Modo
  tipo: TipoId
  /** Polo del imán A que mira a la derecha (hacia B o la muestra). B siempre muestra su S: con N se atraen, con S se repelen. */
  polo: Polo
  /** Separación (cm) entre el extremo derecho de A y el imán B o la muestra. */
  gap: number
  piezas: 1 | 2 | 4
  /** Separación (cm) entre las partes de A partido. */
  sep: number
  /** Temperatura del imán A. */
  temp: number
  /** La mayor temperatura que alcanzó A: pasado el punto de Curie no se recupera al enfriar. */
  tMax: number
  material: MaterialId
  vista: CampoVista
}

export const CONFIG_INICIAL: Config = {
  modo: 'dos', tipo: 'ferrita', polo: 'N', gap: 3, piezas: 1, sep: 0, temp: TEMP_MIN, tMax: TEMP_MIN, material: 'hierro', vista: 'brujulas',
}

// --- Magnetización según la temperatura ---
/** Magnetización reducida de Weiss (campo medio): m = tanh(m·Tc/T), por bisección. Vale 0 desde Tc; cerca de Tc cae como (Tc−T)^½ (β = 1/2 en campo medio). */
function weiss(tK: number, tcK: number): number {
  if (tK >= tcK) return 0
  let lo = 1e-9
  let hi = 1
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2
    if (m - Math.tanh((m * tcK) / tK) < 0) lo = m
    else hi = m
  }
  return (lo + hi) / 2
}

/** Fracción de la magnetización de fábrica (20 °C) que conserva el imán A: 0 si en algún momento llegó al punto de Curie. */
export function magnetizacion(c: Config): number {
  const tc = TIPOS[c.tipo].curie + 273.15
  if (c.tMax + 273.15 >= tc) return 0
  return weiss(c.temp + 273.15, tc) / weiss(TEMP_MIN + 273.15, tc)
}

// --- Piezas y polos ---
export interface Pieza {
  x0: number
  x1: number
  /** Posición del extremo N y del S. */
  xN: number
  xS: number
}

/** Las partes del imán A. A parte de un lado fijo: su extremo derecho queda en x = 0. Cada parte es un imán con su N y su S. */
export function piezasA(c: Config): Pieza[] {
  const largo = LARGO / c.piezas
  return Array.from({ length: c.piezas }, (_, i) => {
    const x1 = -i * (largo + c.sep)
    const x0 = x1 - largo
    return c.polo === 'N' ? { x0, x1, xN: x1, xS: x0 } : { x0, x1, xN: x0, xS: x1 }
  })
}

/** El imán B (solo en "dos imanes"): su S mira a A. */
export const piezaB = (gap: number): Pieza => ({ x0: gap, x1: gap + LARGO, xS: gap, xN: gap + LARGO })

interface PoloPunto {
  x: number
  q: number
}

/** Los dos polos de una pieza; `q` es la carga magnética del imán entero, la misma en cada parte (el corte no cambia la sección). */
export function polosDe(p: Pieza, q: number): [PoloPunto, PoloPunto] {
  return [{ x: p.xN, q }, { x: p.xS, q: -q }]
}

const polosA = (c: Config): PoloPunto[] => piezasA(c).flatMap((p) => polosDe(p, POLO_ENTERO(c.tipo) * magnetizacion(c)))
const polosB = (c: Config, gap: number): PoloPunto[] => polosDe(piezaB(gap), POLO_ENTERO(c.tipo))

/** Todos los polos de la mesada (A y, si corresponde, B). */
export function polosTodos(c: Config): PoloPunto[] {
  return c.modo === 'dos' ? [...polosA(c), ...polosB(c, c.gap)] : polosA(c)
}

/** Campo de un conjunto de polos (más el terrestre) en (x, y), en T. El eje y es el norte. */
export function campoEn(polos: PoloPunto[], x: number, y: number, terrestre = true): { bx: number; by: number } {
  let bx = 0
  let by = terrestre ? CAMPO_TERRESTRE : 0
  for (const p of polos) {
    const dx = (x - p.x) * 1e-2
    const dy = y * 1e-2
    const f = (K * p.q) / (dx * dx + dy * dy + SUAVIZADO ** 2) ** 1.5
    bx += f * dx
    by += f * dy
  }
  return { bx, by }
}

const modulo = (b: { bx: number; by: number }) => Math.hypot(b.bx, b.by)

// --- Fuerzas ---
/** Fuerza de A sobre B a la separación `gap`: positiva atrae, negativa repele (N). */
export function fuerzaSobreB(c: Config, gap: number): number {
  const a = polosA(c)
  let fx = 0
  for (const pb of polosB(c, gap)) {
    for (const pa of a) {
      const d = (pb.x - pa.x) * 1e-2
      fx += (K * pb.q * pa.q * d) / (d * d + SUAVIZADO ** 2) ** 1.5
    }
  }
  return -fx
}

/** Magnetización inducida de la muestra: M = χef·B/μ0, con tope de saturación en los ferromagnéticos. */
function mInducida(m: Material, b: number): number {
  const chi = chiEfectivo(m.chi)
  const tope = m.ferro ? B_SATURACION : Infinity
  return (Math.sign(chi) * Math.min(Math.abs(chi) * b, tope)) / MU0
}

/** Fuerza de A sobre la muestra a la separación `gap` (centro de la muestra a gap + LADO_MUESTRA/2), en N: positiva atrae.
 *  Es la fuerza sobre un dipolo inducido, F = V · M · d|B|/dx. */
export function fuerzaSobreMuestra(c: Config, gap: number): number {
  const polos = polosA(c)
  const x = gap + LADO_MUESTRA / 2
  const h = 0.02
  const b = (xx: number) => modulo(campoEn(polos, xx, 0, false))
  const gradiente = (b(x + h) - b(x - h)) / (2 * h * 1e-2)
  return -VOLUMEN_MUESTRA * mInducida(MATERIALES[c.material], b(x)) * gradiente
}

/** Fuerza que hace falta para deslizar la muestra sobre la mesada, en N. */
export const rozamientoMuestra = (id: MaterialId) => ROZAMIENTO * MATERIALES[id].densidad * 1e3 * VOLUMEN_MUESTRA * 9.8

export interface Resultado {
  /** Positiva atrae, negativa repele (N). */
  fuerza: number
  /** Campo de los imanes en el lugar del objeto (T). */
  campo: number
  magnetizacion: number
  /** Solo en "material": fuerza / rozamiento; desde 1 la muestra se desliza hacia el imán. */
  relativa: number
}

/** Todo lo que se muestra del estado, a la separación `gap` (por defecto la de la configuración). */
export function resolver(c: Config, gap = c.gap): Resultado {
  const polos = polosA(c)
  const magnet = magnetizacion(c)
  if (c.modo === 'dos') {
    return { fuerza: fuerzaSobreB(c, gap), campo: modulo(campoEn(polos, gap, 0, false)), magnetizacion: magnet, relativa: 0 }
  }
  const f = fuerzaSobreMuestra(c, gap)
  return {
    fuerza: f, campo: modulo(campoEn(polos, gap + LADO_MUESTRA / 2, 0, false)), magnetizacion: magnet, relativa: f / rozamientoMuestra(c.material),
  }
}
