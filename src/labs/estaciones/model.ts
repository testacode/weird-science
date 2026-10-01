// Modelo de las estaciones del año. Simulación pura, sin Three.js.
// El tiempo `d` son días desde el 1 de enero a las 00:00 (año de 365,25 días). Supuestos: órbita elíptica
// de Kepler, eje inclinado siempre hacia el mismo punto del espacio, Sol puntual (sin refracción ni
// radio solar: "salida" y "puesta" cuando el centro del Sol cruza el horizonte geométrico).

export const YEAR = 365.25
/** Inclinación del eje de la Tierra (grados): valor de libro de texto. */
export const INCLINACION = 23.44
export const EXCENTRICIDAD = 0.0167
/** Semieje mayor de la órbita, en millones de km. */
export const DIST_MEDIA = 149.6
/** Día (desde el 1 de enero 00:00) del perihelio: ~3 de enero (con esto los equinoccios y solsticios caen en las fechas de libro: 20 mar, 21 jun, 22 sep, 21 dic). */
export const D_PERIHELIO = 2
/** Longitud eclíptica del Sol visto desde la Tierra en el perihelio (~283°): ancla las fechas de equinoccios y solsticios. */
const LONGITUD_PERIHELIO = 282.94

const RAD = Math.PI / 180
const mod = (x: number, n: number) => ((x % n) + n) % n

export type Estacion = 'primavera' | 'verano' | 'otono' | 'invierno'
export const NOMBRE_ESTACION: Record<Estacion, string> = { primavera: 'Primavera', verano: 'Verano', otono: 'Otoño', invierno: 'Invierno' }

export type IdCiudad = 'buenos-aires' | 'ushuaia' | 'ecuador' | 'madrid'
export interface Ciudad {
  id: IdCiudad
  nombre: string
  /** Latitud en grados: negativa = hemisferio sur. */
  lat: number
  /** Longitud en grados: negativa = al oeste de Greenwich. */
  lon: number
}
export const CIUDADES: Record<IdCiudad, Ciudad> = {
  'buenos-aires': { id: 'buenos-aires', nombre: 'Buenos Aires', lat: -34.6, lon: -58.4 },
  ushuaia: { id: 'ushuaia', nombre: 'Ushuaia', lat: -54.8, lon: -68.3 },
  ecuador: { id: 'ecuador', nombre: 'Ecuador', lat: 0, lon: -78.5 },
  madrid: { id: 'madrid', nombre: 'Madrid', lat: 40.4, lon: -3.7 },
}

// --- La Tierra en su órbita ---

export interface Orbita {
  /** Longitud eclíptica del Sol visto desde la Tierra (0° = equinoccio de marzo), en grados. */
  longitud: number
  /** Distancia Tierra-Sol en millones de km. */
  distancia: number
  /** Anomalía excéntrica (rad): sirve para dibujar la órbita. */
  E: number
}

function resolverKepler(M: number, e: number): number {
  let E = M + e * Math.sin(M)
  for (let i = 0; i < 6; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
  return E
}

export function orbita(d: number, e = EXCENTRICIDAD): Orbita {
  const E = resolverKepler(((d - D_PERIHELIO) / YEAR) * 2 * Math.PI, e)
  const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2))
  return { longitud: mod(nu / RAD + LONGITUD_PERIHELIO, 360), distancia: DIST_MEDIA * (1 - e * Math.cos(E)), E }
}

/** Día del año en que el Sol está en la longitud eclíptica dada (inversa de `orbita`). */
export function diaDeLongitud(longitud: number): number {
  const nu = (longitud - LONGITUD_PERIHELIO) * RAD
  const E = 2 * Math.atan(Math.sqrt((1 - EXCENTRICIDAD) / (1 + EXCENTRICIDAD)) * Math.tan(nu / 2))
  const M = E - EXCENTRICIDAD * Math.sin(E)
  return mod(D_PERIHELIO + (M / (2 * Math.PI)) * YEAR, YEAR)
}

export const diaDelAnio = (t: number) => mod(t, YEAR)

export interface FechaClave {
  id: 'equinoccio-marzo' | 'solsticio-junio' | 'equinoccio-septiembre' | 'solsticio-diciembre'
  dia: number
  /** Texto corto de la marca ("equinoccio"). */
  tipo: string
}
/** Equinoccios y solsticios, calculados con el modelo (no escritos a mano). */
export const FECHAS_CLAVE: FechaClave[] = [
  { id: 'equinoccio-marzo', dia: diaDeLongitud(0), tipo: 'equinoccio' },
  { id: 'solsticio-junio', dia: diaDeLongitud(90), tipo: 'solsticio' },
  { id: 'equinoccio-septiembre', dia: diaDeLongitud(180), tipo: 'equinoccio' },
  { id: 'solsticio-diciembre', dia: diaDeLongitud(270), tipo: 'solsticio' },
]
export const diaClave = (id: FechaClave['id']) => FECHAS_CLAVE.find((f) => f.id === id)!.dia
export const D_AFELIO = mod(D_PERIHELIO + YEAR / 2, YEAR)

// --- Calendario (año de 365 días) ---

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIAS_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export function fecha(d: number): { dia: number; mes: string; corta: string; larga: string } {
  let resto = Math.min(Math.floor(mod(d, YEAR)), 364)
  let m = 0
  while (resto >= DIAS_MES[m]) resto -= DIAS_MES[m++]
  const dia = resto + 1
  return { dia, mes: MESES[m], corta: `${dia} ${MESES[m].slice(0, 3)}`, larga: `${dia} de ${MESES[m]}` }
}

// --- El Sol visto desde una ciudad ---

/** Declinación solar (grados): la latitud donde el Sol cae vertical. sen δ = sen ε · sen λ. */
export const declinacion = (d: number, eps: number) => Math.asin(Math.sin(eps * RAD) * Math.sin(orbita(d).longitud * RAD)) / RAD

/** Altura del Sol sobre el horizonte al mediodía solar: 90° − |latitud − declinación|. Negativa = el Sol no sale. */
export const alturaMediodia = (lat: number, dec: number) => 90 - Math.abs(lat - dec)

/** Hacia dónde está el Sol al mediodía. */
export function haciaElSol(lat: number, dec: number): 'norte' | 'sur' | 'cenit' {
  if (Math.abs(lat - dec) < 0.05) return 'cenit'
  return dec > lat ? 'norte' : 'sur'
}

/** Horas de luz: 2·acos(−tan φ · tan δ) / 15. Fuera de [−1, 1] hay noche polar (0 h) o sol de medianoche (24 h). */
export function horasDeLuz(lat: number, dec: number): number {
  const x = -Math.tan(lat * RAD) * Math.tan(dec * RAD)
  return (2 * Math.acos(Math.max(-1, Math.min(1, x))) / RAD) / 15
}

/** Referencia de la energía: Sol vertical durante 12 h a la distancia media. */
const ENERGIA_REF = 12

/** Energía diaria relativa por m² (en % de la referencia) ∝ sen(altura) × horas de luz × (distancia media / distancia)². */
export function energia(d: number, lat: number, eps: number): number {
  const dec = declinacion(d, eps)
  const h = alturaMediodia(lat, dec)
  const f = (DIST_MEDIA / orbita(d).distancia) ** 2
  return (Math.max(0, Math.sin(h * RAD)) * horasDeLuz(lat, dec) * f * 100) / ENERGIA_REF
}

export interface Resumen {
  estacion: Estacion | 'sin'
  declinacion: number
  altura: number
  haciaElSol: ReturnType<typeof haciaElSol>
  horas: number
  /** Energía en % de la referencia. */
  energia: number
  /** Energía en % del promedio anual de la ciudad. */
  energiaVsPromedio: number
  distancia: number
  longitud: number
  /** Cuántas veces se estira el mismo haz de luz sobre el suelo: 1 / sen(altura). */
  estiramiento: number
}

const memo = new Map<string, { media: number; amplitudHoras: number }>()
/** Promedio anual de la energía y variación anual de las horas de luz de una ciudad (con 1 muestra por día). */
function anual(lat: number, eps: number) {
  const clave = `${lat}|${eps}`
  let r = memo.get(clave)
  if (!r) {
    let suma = 0
    let min = Infinity
    let max = -Infinity
    for (let i = 0; i < 365; i++) {
      suma += energia(i + 0.5, lat, eps)
      const H = horasDeLuz(lat, declinacion(i + 0.5, eps))
      min = Math.min(min, H)
      max = Math.max(max, H)
    }
    r = { media: suma / 365, amplitudHoras: max - min }
    memo.set(clave, r)
  }
  return r
}

/** ¿Hay estaciones marcadas? No con el eje derecho ni en el ecuador, donde el día dura lo mismo todo el año. */
export const hayEstaciones = (lat: number, eps: number) => eps >= 1 && anual(lat, eps).amplitudHoras >= 1

export function estacionDe(longitud: number, lat: number, eps: number): Estacion | 'sin' {
  if (!hayEstaciones(lat, eps)) return 'sin'
  const norte: Estacion[] = ['primavera', 'verano', 'otono', 'invierno']
  const i = Math.floor(mod(longitud, 360) / 90)
  return norte[lat > 0 ? i : (i + 2) % 4]
}

export function resumen(d: number, ciudad: Ciudad, eps: number): Resumen {
  const o = orbita(d)
  const dec = declinacion(d, eps)
  const altura = alturaMediodia(ciudad.lat, dec)
  const e = energia(d, ciudad.lat, eps)
  return {
    estacion: estacionDe(o.longitud, ciudad.lat, eps),
    declinacion: dec,
    altura,
    haciaElSol: haciaElSol(ciudad.lat, dec),
    horas: horasDeLuz(ciudad.lat, dec),
    energia: e,
    energiaVsPromedio: (e / anual(ciudad.lat, eps).media) * 100,
    distancia: o.distancia,
    longitud: o.longitud,
    estiramiento: altura > 0 ? 1 / Math.sin(altura * RAD) : Infinity,
  }
}

// --- La idea errónea: "las estaciones son por la distancia al Sol" ---

/** Cuánto "pegaría" el Sol si solo importara la distancia, en % del promedio anual: igual en todo el planeta, con el pico en enero. */
export const ideaDistancia = (d: number) => (100 * (DIST_MEDIA / orbita(d).distancia) ** 2) / ideaMedia()

let mediaIdea = 0
function ideaMedia() {
  if (!mediaIdea) {
    let s = 0
    for (let i = 0; i < 365; i++) s += (DIST_MEDIA / orbita(i + 0.5).distancia) ** 2
    mediaIdea = s / 365
  }
  return mediaIdea
}

/** Mínimo y máximo anual de una curva (horas de luz o energía en % del promedio): fija la escala del gráfico y alimenta el relato. */
export function rangoAnual(lat: number, eps: number, que: 'horas' | 'energia'): { min: number; max: number } {
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < 365; i += 2) {
    const v = que === 'horas' ? horasDeLuz(lat, declinacion(i, eps)) : (energia(i, lat, eps) / anual(lat, eps).media) * 100
    min = Math.min(min, v)
    max = Math.max(max, v)
  }
  return { min, max }
}
