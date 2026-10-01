// Destilación simple del lab: el balón se calienta por conducción desde el mechero, hierve a la
// temperatura que le toca a la mezcla y el vapor condensado se junta en el colector. Modelo
// simplificado (ajuste propio al equilibrio líquido-vapor etanol-agua), pensado para ver tendencias.

import type { Porcion } from './porciones'

/** W/K: calor que pasa del mechero al balón por cada grado de diferencia. */
const U = 4
const T_AMBIENTE = 20
const C_VIDRIO = 120
const CP: Record<string, number> = { agua: 4.18, alcohol: 2.44, aceite: 2.0, arena: 0.8, hierro: 0.45, sal: 0.86 }
/** Calor de vaporización, J/g. */
const DH_AGUA = 2257
const DH_ALCOHOL = 846
const M_AGUA = 18.015
const M_ALCOHOL = 46.07
/** Fracción molar de etanol del azeótropo etanol-agua (~96 % en masa, 78,2 °C). */
const X_AZEOTROPO = 0.894
const T_AZEOTROPO = 78.2
/** g/s de vapor con los que el destilado sale limpio; por encima, el vapor arrastra gotas del balón. */
const RITMO_LIMPIO = 0.06
/** Con alcohol se corta cuando el balón pasa de esta temperatura: de ahí en adelante sale casi solo agua. */
const T_CORTE_ALCOHOL = 95
const MAX_S = 4 * 3600
const MUESTREO_S = 5
const SOLUBILIDAD_SAL = 36 // g/100 g de agua
const M_NACL = 58.44
const KB_AGUA = 0.512

export interface Destilado {
  muestreo: number
  /** Gramos destilados por porción en cada muestra. */
  salida: number[][]
  /** °C del balón en cada muestra. */
  temp: number[]
  hirvio: boolean
}

/** Temperatura de ebullición de la mezcla: la curva etanol-agua (ajuste propio) más el aumento por sal disuelta. */
function tEbullicionMezcla(xAlc: number, salDisuelta: number, agua: number): number {
  const base = T_AZEOTROPO + (100 - T_AZEOTROPO) * Math.exp(-xAlc / 0.12)
  const molalidad = agua > 0.01 ? salDisuelta / M_NACL / (agua / 1000) : 0
  return base + 2 * KB_AGUA * molalidad
}

/** Fracción molar de etanol en el vapor, con la volatilidad relativa que cae a 1 en el azeótropo (ajuste propio). */
function yEquilibrio(x: number): number {
  const alfa = 1 + 6.5 * Math.max(0, 1 - x / X_AZEOTROPO) ** 2
  return (alfa * x) / (1 + (alfa - 1) * x)
}

export function destilar(porciones: Porcion[], tMechero: number): Destilado {
  const indice = (id: string) => porciones.findIndex((p) => p.id === id)
  const iAgua = indice('agua')
  const iAlc = indice('alcohol')
  const iSal = indice('sal-disuelta')
  const esSal = (p: Porcion) => p.especie === 'sal'
  const flask = porciones.map((p) => (esSal(p) ? 0 : p.masa))
  // La sal (disuelta + cristales) se maneja junta: a medida que se va el agua, lo que no cabe cristaliza.
  let sal = porciones.filter(esSal).reduce((s, p) => s + p.masa, 0)
  const salida = porciones.map(() => 0)
  const agua0 = iAgua >= 0 ? flask[iAgua] : 0
  const filas: number[][] = [[...salida]]
  const temps = [T_AMBIENTE]
  let tf = T_AMBIENTE
  let hirvio = false
  let estancado = 0
  let fin = false

  for (let t = 1; t <= MAX_S; t++) {
    const agua = iAgua >= 0 ? flask[iAgua] : 0
    const alc = iAlc >= 0 ? flask[iAlc] : 0
    const salDis = Math.min(sal, (SOLUBILIDAD_SAL * agua) / 100)
    const xAlc = alc > 0 ? alc / M_ALCOHOL / (alc / M_ALCOHOL + agua / M_AGUA) : 0
    // Sin nada que hierva (limaduras + arena) el balón solo se calienta.
    const tb = agua + alc > 0.01 ? tEbullicionMezcla(xAlc, salDis, agua) : Infinity

    const calor = porciones.reduce((s, p, i) => s + (esSal(p) ? 0 : flask[i] * (CP[p.especie] ?? 1)), C_VIDRIO + sal * CP.sal)
    tf += (U * (tMechero - tf)) / calor
    let hierve = false
    if (tf >= tb) {
      tf = tb
      hierve = tMechero > tb
    }

    if (hierve) {
      hirvio = true
      const yMol = alc > 0 ? yEquilibrio(xAlc) : 0
      const yMasa = (yMol * M_ALCOHOL) / (yMol * M_ALCOHOL + (1 - yMol) * M_AGUA)
      const ritmo = (U * (tMechero - tb)) / (yMasa * DH_ALCOHOL + (1 - yMasa) * DH_AGUA)
      const arrastre = Math.min(0.4, Math.max(0, 0.04 * (ritmo / RITMO_LIMPIO - 1)))
      const vapor = ritmo * (1 - arrastre)
      const gotas = (ritmo * arrastre) / Math.max(agua + alc + salDis, 1e-9)
      const dAlc = Math.min(alc, vapor * yMasa + gotas * alc)
      const dAgua = Math.min(agua, vapor * (1 - yMasa) + gotas * agua)
      const dSal = Math.min(salDis, gotas * salDis)
      if (iAlc >= 0) { flask[iAlc] -= dAlc; salida[iAlc] += dAlc }
      if (iAgua >= 0) { flask[iAgua] -= dAgua; salida[iAgua] += dAgua }
      if (iSal >= 0) { sal -= dSal; salida[iSal] += dSal }
      estancado = ritmo < 0.002 ? estancado + 1 : 0
    } else if (tMechero - tf < 0.3 && tf > T_AMBIENTE + 1) {
      estancado++
    }

    const corte = hierve && (alc > 0 ? tb >= T_CORTE_ALCOHOL : agua <= 0.01 * agua0)
    if (corte || estancado > 240) fin = true
    if (t % MUESTREO_S === 0) {
      filas.push([...salida])
      temps.push(tf)
      if (fin) break
    }
  }
  return { muestreo: MUESTREO_S, salida: filas, temp: temps, hirvio }
}
