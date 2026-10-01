// Preguntas de "Predecí antes de correr". La respuesta sale del modelo, no está escrita a mano.

import { av } from '../../ui/avanzado'
import type { Opcion } from '../../ui/componentes'
import { num } from './contenido'
import { ABSORCION, simular, tasas, type Config } from './model'

export type Respuesta = 'mas' | 'igual' | 'menos' | 'cero' | 'consume'

/** Minutos del experimento que se miden antes de revelar la respuesta. */
export const VENTANA_MIN = 2
/** Variación relativa por debajo de la cual se considera "igual". */
const TOLERANCIA = 0.1

export interface Pregunta {
  id: 'oscuro' | 'verde'
  texto: string
  opciones: Opcion<Respuesta>[]
  /** Calcula con el modelo cuál era la respuesta correcta para la config actual. */
  resolver: (config: Config) => { correcta: Respuesta; explicacion: string }
}

const OSCURO: Pregunta = {
  id: 'oscuro',
  texto: 'Con la luz apagada, ¿qué pasa con el oxígeno?',
  opciones: [
    { valor: 'menos', texto: 'Siguen saliendo, pero menos' },
    { valor: 'cero', texto: 'No salen y el O₂ del agua no cambia' },
    { valor: 'consume', texto: 'No salen y la planta gasta O₂ del agua' },
  ],
  resolver: (config) => {
    const { neto, resp } = tasas({ ...config, encendida: false })
    const correcta: Respuesta = neto < 0 ? 'consume' : neto === 0 ? 'cero' : 'menos'
    return {
      correcta,
      explicacion: `Sin luz la fotosíntesis se frena, pero la planta sigue respirando: gasta <b>${num(resp)} µmol</b> de O₂ por minuto${av(` (balance de ${num(neto)} µmol/min)`)}. No sale ni una burbuja y el agua va perdiendo oxígeno.`,
    }
  },
}

const VERDE: Pregunta = {
  id: 'verde',
  texto: 'Con luz verde (misma lámpara, misma distancia), ¿cuántas burbujas salen?',
  opciones: [
    { valor: 'mas', texto: 'Más que con luz blanca' },
    { valor: 'igual', texto: 'Igual o casi igual' },
    { valor: 'menos', texto: 'Menos que con luz blanca' },
  ],
  resolver: (config) => {
    const real = simular(config, VENTANA_MIN).burbujas
    const blanca = simular({ ...config, color: 'blanca' }, VENTANA_MIN).burbujas
    const cambio = blanca === 0 ? 0 : (real - blanca) / blanca
    const correcta: Respuesta = Math.abs(cambio) < TOLERANCIA ? 'igual' : cambio > 0 ? 'mas' : 'menos'
    const hecho = `Con luz verde se contaron <b>${real} burbujas</b> en ${VENTANA_MIN} min; con luz blanca habrían sido ${blanca}.`
    const causa =
      correcta === 'igual'
        ? ` La hoja usa casi tanta luz verde como blanca${av(` (absorbe ${num(ABSORCION.verde * 100, 0)}% contra ${num(ABSORCION.blanca * 100, 0)}%)`)}: la idea de que "el verde rebota todo" es un mito. Se ve verde por lo poco que rebota.`
        : ` La hoja absorbe un poco menos de verde${av(` (${num(ABSORCION.verde * 100, 0)}% contra ${num(ABSORCION.blanca * 100, 0)}% de la blanca)`)}, pero igual usa la mayor parte: la idea de que "el verde rebota todo" es un mito. Se ve verde por lo poco que rebota.`
    return { correcta, explicacion: hecho + causa }
  },
}

/** La pregunta que corresponde a lo que el usuario rompió, o `null` si todo funciona. Apagar la luz tiene prioridad. */
export function preguntaPara(config: Config): Pregunta | null {
  if (!config.encendida) return OSCURO
  if (config.color === 'verde') return VERDE
  return null
}
