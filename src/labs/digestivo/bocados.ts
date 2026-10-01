// Flujo de bocados: cada uno tiene su propio estado del modelo y avanza con `paso()`.
// La porción se reparte en partes iguales, así el total de nutrientes no cambia con la cantidad de bocados.
import { MACROS, PASO_HORAS, SEGMENTOS, estadoInicial, paso, type Config, type Estado, type Macro, type Nutrientes } from './model'

/** Segundos reales que tarda cada órgano a velocidad 1×: el reloj se acelera distinto en cada uno. */
export const SEGUNDOS_POR_TRAMO = 7
/** Segundos (a 1×) entre un bocado y el siguiente. */
export const ENTRE_BOCADOS_SEG = 5

export type Bocados = 1 | 3
export const MAX_BOCADOS = 3

export interface Flujo {
  total: Bocados
  porBocado: Record<Macro, number>
  /** Solo los bocados que ya entraron, en orden de ingreso. */
  estados: Estado[]
  /** Segundos de laboratorio (escalados por la velocidad) desde el primer bocado. */
  espera: number
  /** Hora del reloj en que entró cada bocado (mismo orden que `estados`). */
  entradas: number[]
  /** Horas desde el primer bocado: el máximo de entrada + horas propias. Lo ven las métricas y el gráfico. */
  reloj: number
  /** Índice del bocado que marca el reloj (el que define el ritmo que muestra la etiqueta ×N). */
  marca: number
}

export function nuevoFlujo(gramos: Record<Macro, number>, total: Bocados): Flujo {
  const porBocado = { carbos: gramos.carbos / total, proteinas: gramos.proteinas / total, grasas: gramos.grasas / total }
  return { total, porBocado, estados: [estadoInicial(porBocado)], entradas: [0], espera: 0, reloj: 0, marca: 0 }
}

/** Cada bocado avanza con el ritmo de SU tramo, así todos se ven como si viajaran solos. */
export const horasPorSegundo = (e: Estado, velocidad: number) => (SEGMENTOS[e.segmento].horas / SEGUNDOS_POR_TRAMO) * velocidad

export function avanzar(f: Flujo, config: Config, dtReal: number, velocidad: number) {
  f.espera += dtReal * velocidad
  while (f.estados.length < f.total && f.espera >= f.estados.length * ENTRE_BOCADOS_SEG) {
    f.estados.push(estadoInicial(f.porBocado))
    f.entradas.push(f.reloj)
  }
  f.estados.forEach((e, i) => {
    let restante = dtReal * horasPorSegundo(e, velocidad)
    let n = e
    while (restante > 0 && !n.terminado) {
      const dt = Math.min(restante, PASO_HORAS)
      n = paso(n, config, dt)
      restante -= dt
    }
    f.estados[i] = n
  })
  // Cada bocado lleva su propio reloj; el del flujo es el más avanzado (no la suma de avances por cuadro).
  f.estados.forEach((e, i) => {
    const h = f.entradas[i] + e.horas
    if (h >= f.reloj) {
      f.reloj = h
      f.marca = i
    }
  })
}

/** Horas de reloj por segundo real, según el tramo del bocado que marca el reloj. */
export const ritmoReloj = (f: Flujo, velocidad: number) => horasPorSegundo(f.estados[f.marca], velocidad)

export const todosTerminaron = (f: Flujo) => f.estados.length === f.total && f.estados.every((e) => e.terminado)

/** El bocado que cuenta la historia: el primero que sigue viajando (o el último, si ya terminaron todos). */
export const foco = (f: Flujo): Estado => f.estados.find((e) => !e.terminado) ?? f.estados[f.estados.length - 1]

/** Un `Estado` que suma todos los bocados, para métricas, gráfico, relato y predicción. */
export function agregado(f: Flujo): Estado {
  const lider = foco(f)
  const nutrientes = {} as Nutrientes
  for (const m of MACROS) {
    nutrientes[m] = f.estados.reduce(
      (s, e) => ({
        intacto: s.intacto + e.nutrientes[m].intacto,
        digerido: s.digerido + e.nutrientes[m].digerido,
        absorbido: s.absorbido + e.nutrientes[m].absorbido,
      }),
      { intacto: 0, digerido: 0, absorbido: 0 },
    )
  }
  return { horas: f.reloj, segmento: lider.segmento, progreso: lider.progreso, nutrientes, terminado: todosTerminaron(f) }
}
