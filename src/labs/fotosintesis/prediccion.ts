// Preguntas de "Predecí antes de correr". La respuesta sale del modelo, no está escrita a mano.

import { av } from '../../ui/avanzado'
import type { Opcion } from '../../ui/componentes'
import { ABSORCION_VERDE, num } from './contenido'
import { tasas, type Config } from './model'

export type Respuesta = 'mas' | 'igual' | 'menos' | 'cero' | 'consume'

/** Minutos del experimento que se miden antes de revelar la respuesta. */
export const VENTANA_MIN = 2

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

/** Por debajo de esta fracción de la tasa con luz blanca ya no es "casi como con blanca". */
const CASI_IGUAL = 0.8
const NOMBRE_LIMITE = { luz: 'la luz', co2: 'el CO₂', temp: 'la temperatura' } as const

const VERDE: Pregunta = {
  id: 'verde',
  texto: '¿La planta sigue haciendo fotosíntesis con luz verde (misma lámpara, misma distancia)?',
  opciones: [
    { valor: 'igual', texto: 'Sí, casi como con luz blanca' },
    { valor: 'menos', texto: 'Sí, pero mucho menos' },
    { valor: 'cero', texto: 'No: el verde rebota y no sirve' },
  ],
  resolver: (config) => {
    // Con la tasa continua, no con burbujas contadas: el redondeo no decide la respuesta.
    const verde = tasas({ ...config, color: 'verde' })
    const blanca = tasas({ ...config, color: 'blanca' })
    const r = verde.bruta / blanca.bruta
    const correcta: Respuesta = r >= CASI_IGUAL ? 'igual' : r > 0.05 ? 'menos' : 'cero'
    const hecho = `Con luz verde fabrica <b>${num(verde.bruta)} µmol/min</b> de O₂; con blanca, ${num(blanca.bruta)} (${num(r * 100, 0)}%).`
    const causa = verde.limita === 'luz'
      ? ''
      : ` Además, acá lo que frena no es la luz sino ${NOMBRE_LIMITE[verde.limita]}, así que el color casi no cambia nada.`
    return { correcta, explicacion: `${hecho} ${ABSORCION_VERDE}${causa}` }
  },
}

/** La pregunta que corresponde a lo que el usuario rompió, o `null` si todo funciona. Apagar la luz tiene prioridad. */
export function preguntaPara(config: Config): Pregunta | null {
  if (!config.encendida) return OSCURO
  // Sin CO₂ no fabrica con ningún color: preguntar por el verde confundiría la causa.
  if (config.color === 'verde' && tasas({ ...config, color: 'blanca' }).bruta > 0) return VERDE
  return null
}
