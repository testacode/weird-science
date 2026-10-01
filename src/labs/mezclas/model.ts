// Modelo puro del lab (sin Three.js): qué le pasa a cada porción de la mezcla en cada método.
// Cada método usa UNA propiedad (tamaño, densidad, punto de ebullición o magnetismo) y la regla se
// evalúa sobre los datos de cada componente; no hay una tabla "mezcla × método" escrita a mano.

import { ESPECIES, METODOS, METODO_PROPIO, mezclaDe, type EspecieId, type MetodoId, type MezclaId } from './datos'
import { destilar } from './destilacion'
import { TAMANO_DISUELTO_MM, porciones as armarPorciones, tipoDeMezcla, type Porcion, type TipoMezcla } from './porciones'

export { TAMANO_DISUELTO_MM }

export interface Config {
  mezcla: MezclaId
  metodo: MetodoId
  /** Agregar sal más allá de lo que se disuelve (solo cambia algo en agua + sal). */
  sobresaturar: boolean
  /** °C del mechero. Solo importa en la destilación. */
  tMechero: number
}

export const T_MECHERO = { min: 60, max: 300, paso: 10, inicial: 130 }
/** Luz de malla del tamiz y poro del papel de filtro, en mm. */
export const LUZ_TAMIZ_MM = 0.5
export const PORO_FILTRO_MM = 0.02
const G = 9.8
/** Viscosidad del agua, Pa·s. */
const VISCOSIDAD = 1e-3
/** Altura de la columna de líquido en la ampolla, m. */
const ALTO_AMPOLLA_M = 0.12
/** Los granos gruesos caen más lento de lo que dice Stokes (que vale para partículas diminutas). */
const V_MAX_SEDIMENTACION = 0.1
/** Radio de las gotas de aceite después de agitar la ampolla, m (orden de magnitud, sin fuente directa). */
const RADIO_GOTA_M = 2.5e-4
/** mL/s que salen por la llave de la ampolla. */
const CAUDAL_LLAVE = 6
/** Fracción que se cuela en la interfase al cortar la llave entre dos líquidos. */
const INTERFASE = 0.015
/** Fracción de las limaduras que el imán levanta, y de la arena que se pega con ellas. */
const EFICIENCIA_IMAN = 0.98
const ARRASTRE_IMAN = 0.005
/** Segundos del experimento que se mira en este tiempo real (la destilación dura media hora). */
const OBJETIVO_S: Record<MetodoId, number> = { tamiz: 6, filtro: 10, decantacion: 12, destilacion: 20, iman: 6 }
const MIN_PRODUCTO_G = 0.5

export interface Corrida {
  config: Config
  porciones: Porcion[]
  /** s del experimento. */
  duracion: number
  /** Gramos que salieron del origen, por porción, en muestras uniformes de `muestreo` s. */
  salida: number[][]
  muestreo: number
  /** °C del balón (solo destilación). */
  temp: number[]
  /** s hasta que la ampolla separa las fases (decantación). */
  tAsentado: number
  /** La mezcla tiene más de una fase en la ampolla: sale solo la de abajo. */
  conFases: boolean
  hirvio: boolean
  /** Qué especie debería salir y cuál quedar si el método separara bien: se decide por la propiedad que usa. */
  ideal: { sale: EspecieId; queda: EspecieId }
  tipo: TipoMezcla
}

export type Veredicto = 'funciona' | 'parcial' | 'no'

export interface Lectura {
  t: number
  duracion: number
  progreso: number
  terminado: boolean
  salida: number[]
  queda: number[]
  /** 0-100. `null` mientras todavía no hay dos productos para comparar. */
  pureza: number | null
  /** Gramos de cada especie que ya están en el producto donde le corresponde. */
  recuperado: { especie: EspecieId; g: number; total: number }[]
  /** 0-1: las fases de la ampolla ya se separaron. */
  asentado: number
  temp: number | null
}

const masa = (lista: Porcion[], filtro: (p: Porcion, i: number) => boolean, v: number[]) =>
  lista.reduce((s, p, i) => (filtro(p, i) ? s + v[i] : s), 0)

/** Qué tan retenido queda un grano de este tamaño en una malla: 1 si es más grande, 0 si pasa (transición abrupta). */
export const retencion = (tamanoMm: number, luzMm: number) => (tamanoMm <= 0 ? 0 : 1 / (1 + (luzMm / tamanoMm) ** 8))

const tamano = (p: Porcion) => (p.disuelta ? TAMANO_DISUELTO_MM : ESPECIES[p.especie].tamanoMm)
const hayLiquido = (l: Porcion[]) => l.some((p) => ESPECIES[p.especie].estado === 'liquido' && !p.disuelta)

/** Qué especie sale y cuál queda, según la propiedad del método (el orden de la mezcla desempata). */
function idealDe(metodo: MetodoId, especies: EspecieId[]): { sale: EspecieId; queda: EspecieId } {
  const clave: Record<MetodoId, (e: EspecieId) => number> = {
    tamiz: (e) => ESPECIES[e].tamanoMm,
    filtro: (e) => ESPECIES[e].tamanoMm,
    decantacion: (e) => -ESPECIES[e].densidad,
    destilacion: (e) => ESPECIES[e].tEbullicion,
    iman: (e) => (ESPECIES[e].magnetico ? 0 : 1),
  }
  const orden = [...especies].sort((a, b) => clave[metodo](a) - clave[metodo](b))
  return { sale: orden[0], queda: orden[1] }
}

/** Fracción de cada porción que sale en los métodos que no son la destilación, y cuánto tarda. */
function reglaSimple(c: Config, lista: Porcion[]) {
  const { metodo } = c
  const fSale = lista.map(() => 0)
  let duracion = 6
  let tAsentado = 0
  let conFases = false
  const solvente = lista.findIndex((p) => p.id === 'agua')

  if (metodo === 'tamiz' || metodo === 'filtro') {
    const luz = metodo === 'tamiz' ? LUZ_TAMIZ_MM : PORO_FILTRO_MM
    lista.forEach((p, i) => (fSale[i] = 1 - retencion(tamano(p), luz)))
    const retenida = masa(lista, (_, i) => fSale[i] < 0.5, lista.map((p) => p.masa))
    duracion = metodo === 'tamiz' ? 6 : hayLiquido(lista) ? 20 + 0.4 * retenida : 8
  } else if (metodo === 'iman') {
    const hayMagnetico = lista.some((p) => !p.disuelta && ESPECIES[p.especie].magnetico)
    lista.forEach((p, i) => {
      if (p.disuelta || ESPECIES[p.especie].estado !== 'solido' || !hayMagnetico) return
      fSale[i] = ESPECIES[p.especie].magnetico ? EFICIENCIA_IMAN : ARRASTRE_IMAN
    })
    duracion = 8
  } else if (metodo === 'decantacion') {
    // Fases ordenadas por densidad: sedimentos (sólidos sin disolver), la solución acuosa y el aceite.
    const fases = new Map<string, { densidad: number; ids: number[]; solido: boolean }>()
    lista.forEach((p, i) => {
      const e = ESPECIES[p.especie]
      const clave = p.disuelta ? 'agua' : p.id
      const f = fases.get(clave) ?? { densidad: p.disuelta ? ESPECIES.agua.densidad : e.densidad, ids: [], solido: e.estado === 'solido' && !p.disuelta }
      f.ids.push(i)
      fases.set(clave, f)
    })
    const orden = [...fases.values()].sort((a, b) => b.densidad - a.densidad)
    const hayLiq = hayLiquido(lista)
    const abajo = orden[0]
    let mlSale = 0
    if (!hayLiq || orden.length === 1) {
      lista.forEach((_, i) => (fSale[i] = 1))
      mlSale = lista.reduce((s, p) => s + p.masa / ESPECIES[p.especie].densidad, 0)
    } else {
      conFases = true
      orden.forEach((f) => f.ids.forEach((i) => (fSale[i] = f === abajo ? (abajo.solido ? 1 : 1 - INTERFASE) : abajo.solido ? 0 : INTERFASE)))
      mlSale = abajo.ids.reduce((s, i) => s + lista[i].masa / ESPECIES[lista[i].especie].densidad, 0)
      // Lo disuelto acompaña al agua: si el agua baja, su sal baja con ella.
      lista.forEach((p, i) => p.disuelta && solvente >= 0 && (fSale[i] = fSale[solvente]))
      // Sedimentación (Stokes, con tope) de los sólidos, o ascenso de las gotas de aceite.
      const velocidad = (rho: number, rhoFluido: number, radio: number) =>
        Math.min(V_MAX_SEDIMENTACION, (2 / 9) * Math.abs(rho - rhoFluido) * 1000 * G * radio ** 2 / VISCOSIDAD)
      // Tiempo en que cada fase que no es la de abajo termina de separarse: los sólidos se hunden, las gotas suben.
      const tiempos = orden.filter((f) => f !== abajo).map((f) => f.solido
        ? ALTO_AMPOLLA_M / velocidad(f.densidad, ESPECIES.agua.densidad, tamano(lista[f.ids[0]]) / 2000)
        : ALTO_AMPOLLA_M / velocidad(f.densidad, abajo.densidad, RADIO_GOTA_M))
      const sedimentos = abajo.solido ? [ALTO_AMPOLLA_M / velocidad(abajo.densidad, ESPECIES.agua.densidad, tamano(lista[abajo.ids[0]]) / 2000)] : []
      tAsentado = Math.max(1, ...tiempos, ...sedimentos)
    }
    duracion = tAsentado + mlSale / CAUDAL_LLAVE + 1
  }
  return { fSale, duracion, tAsentado, conFases }
}

export function simular(c: Config): Corrida {
  const lista = armarPorciones(c.mezcla, c.sobresaturar)
  const especies = mezclaDe(c.mezcla).partes.map((p) => p.especie)
  const base = { config: c, porciones: lista, ideal: idealDe(c.metodo, especies), tipo: tipoDeMezcla(lista) }
  if (c.metodo === 'destilacion') {
    const d = destilar(lista, c.tMechero)
    return { ...base, duracion: (d.salida.length - 1) * d.muestreo, salida: d.salida, muestreo: d.muestreo, temp: d.temp, tAsentado: 0, conFases: false, hirvio: d.hirvio }
  }
  const { fSale, duracion, tAsentado, conFases } = reglaSimple(c, lista)
  const N = 60
  const salida = Array.from({ length: N + 1 }, (_, k) => {
    const x = k / N
    // Al principio sale más rápido (el filtro y el tamiz se vacían cuesta abajo) y después más despacio.
    const avance = tAsentado > 0 ? Math.max(0, (x * duracion - tAsentado) / (duracion - tAsentado)) : 1 - (1 - x) ** 2
    return lista.map((p, i) => p.masa * fSale[i] * Math.min(1, avance))
  })
  return { ...base, duracion, salida, muestreo: duracion / N, temp: [], tAsentado, conFases, hirvio: false }
}

/** Interpola la corrida en el instante `t` (s del experimento). */
export function leer(corrida: Corrida, t: number): Lectura {
  const { porciones: lista, salida: filas, muestreo, duracion } = corrida
  const tt = Math.min(Math.max(t, 0), duracion)
  const k = Math.min(Math.floor(tt / muestreo), filas.length - 2)
  const f = filas.length > 1 ? (tt - k * muestreo) / muestreo : 0
  const salida = lista.map((_, i) => (filas.length > 1 ? filas[k][i] + (filas[k + 1][i] - filas[k][i]) * Math.min(f, 1) : 0))
  const queda = lista.map((p, i) => p.masa - salida[i])
  const terminado = t >= duracion
  const { sale, queda: ideaQueda } = corrida.ideal
  const mSale = masa(lista, () => true, salida)
  const mQueda = masa(lista, () => true, queda)
  const pS = mSale > 0 ? masa(lista, (p) => p.especie === sale, salida) / mSale : 0
  const pQ = mQueda > 0 ? masa(lista, (p) => p.especie === ideaQueda, queda) / mQueda : 0
  const hayDos = mSale >= MIN_PRODUCTO_G && mQueda >= MIN_PRODUCTO_G
  // Lo que queda en el origen no está "recuperado" hasta que se separó: se cuenta lo que quedará al final, a medida que sale lo otro.
  const final = filas[filas.length - 1]
  const salidaFinal = final.reduce((s, g) => s + g, 0)
  const avance = salidaFinal >= MIN_PRODUCTO_G ? Math.min(1, mSale / salidaFinal) : 0
  const quedaFinal = masa(lista, (p) => p.especie === ideaQueda, lista.map((p, i) => p.masa - final[i]))
  const totalDe = (e: EspecieId) => lista.filter((p) => p.especie === e).reduce((s, p) => s + p.masa, 0)
  const temp = corrida.temp.length ? corrida.temp[k] + (corrida.temp[k + 1] - corrida.temp[k]) * Math.min(f, 1) : null
  return {
    t: tt,
    duracion,
    progreso: duracion > 0 ? tt / duracion : 1,
    terminado,
    salida,
    queda,
    pureza: hayDos ? Math.min(pS, pQ) * 100 : terminado ? 0 : null,
    // Mientras no haya salido nada del origen no se separó nada, y no hay nada "recuperado".
    recuperado: [
      { especie: sale, g: masa(lista, (p) => p.especie === sale, salida), total: totalDe(sale) },
      { especie: ideaQueda, g: quedaFinal * avance, total: totalDe(ideaQueda) },
    ],
    asentado: corrida.tAsentado > 0 ? Math.min(1, tt / corrida.tAsentado) : 1,
    temp,
  }
}

export const veredictoDe = (pureza: number): Veredicto => (pureza >= 85 ? 'funciona' : pureza >= 40 ? 'parcial' : 'no')

/** Resultado final de una corrida completa. */
export function resultadoFinal(c: Config) {
  const corrida = simular(c)
  const lectura = leer(corrida, corrida.duracion)
  return { corrida, lectura, veredicto: veredictoDe(lectura.pureza ?? 0) }
}

/** Qué métodos separan bien esta mezcla (para sugerir uno cuando el elegido no sirve). */
const sugerencias = new Map<string, Sugerencia>()

export interface Sugerencia {
  metodos: MetodoId[]
  /** Ninguno separa del todo: se sugiere el que más separa. */
  parcial: boolean
}

/** Qué métodos separan bien esta mezcla; si ninguno, el que más separa. El método propio de la mezcla va primero. */
export function sugerirMetodos(mezcla: MezclaId, sobresaturar: boolean): Sugerencia {
  const clave = `${mezcla}|${sobresaturar}`
  let s = sugerencias.get(clave)
  if (!s) {
    const res = METODOS.map(({ id }) => ({ id, pureza: resultadoFinal({ mezcla, metodo: id, sobresaturar, tMechero: T_MECHERO.inicial }).lectura.pureza ?? 0 }))
    const buenos = res.filter((r) => veredictoDe(r.pureza) === 'funciona')
    const mejor = res.filter((r) => veredictoDe(r.pureza) === 'parcial').sort((a, b) => b.pureza - a.pureza).slice(0, 1)
    const elegidos = (buenos.length ? buenos : mejor).map((r) => r.id).sort((a, b) => Number(b === METODO_PROPIO[mezcla]) - Number(a === METODO_PROPIO[mezcla]))
    s = { metodos: elegidos, parcial: !buenos.length }
    sugerencias.set(clave, s)
  }
  return s
}

/** Segundos del experimento por segundo real, para que cada método dure unos segundos en pantalla. */
export const relojPara = (c: Corrida) => Math.max(1, c.duracion / OBJETIVO_S[c.config.metodo])
