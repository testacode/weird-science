// Preguntas de "Predecí antes de correr". La respuesta sale del modelo, no está escrita a mano.

import { av } from '../../ui/avanzado'
import type { Opcion } from '../../ui/componentes'
import { num } from './contenido'
import {
  CONFIG_NORMAL, DIA_LLENA, MES_SINODICO, eclipse, elongacion, fase, iluminada, ladoRespectoDelSol, type Config, type Lado,
} from './model'

export type Respuesta = Lado | 'si' | 'no'

export interface Pregunta {
  texto: string
  opciones: Opcion<Respuesta>[]
  resolver: (config: Config) => { correcta: Respuesta; explicacion: string }
}

/** Instante (en días desde la Luna nueva) en que se revela la respuesta: la primera Luna llena. */
export const T_REVELAR = DIA_LLENA

const PREGUNTA_LLENA: Pregunta = {
  texto: 'En Luna llena, ¿dónde está la Luna respecto de la Tierra y el Sol?',
  opciones: [
    { valor: 'mismo', texto: 'Del mismo lado que el Sol' },
    { valor: 'opuesto', texto: 'Del lado opuesto al Sol, con la Tierra en el medio' },
    { valor: 'recto', texto: 'A 90° del Sol, de costado' },
  ],
  resolver: () => {
    const elong = elongacion(fase(T_REVELAR))
    return {
      correcta: ladoRespectoDelSol(elong),
      explicacion: `En Luna llena el ángulo Sol-Tierra-Luna es de <b>${num(elong)}°</b>: la Tierra queda en el medio y vemos entera la cara iluminada (${num(iluminada(elong) * 100)}%).${av(' Por eso la Luna llena sale cuando el Sol se pone.')}`,
    }
  },
}

const PREGUNTA_SIN_INCLINACION: Pregunta = {
  texto: 'Si la órbita de la Luna no estuviera inclinada, ¿qué pasaría en esta Luna llena?',
  opciones: [
    { valor: 'si', texto: 'Habría eclipse: la Luna cruzaría la sombra de la Tierra' },
    { valor: 'no', texto: 'Nada especial: se vería la Luna llena de siempre' },
  ],
  resolver: (config) => {
    const sin = eclipse(T_REVELAR, config)
    const real = eclipse(T_REVELAR, CONFIG_NORMAL)
    const hay = sin.tipo !== 'ninguno'
    return {
      correcta: hay ? 'si' : 'no',
      explicacion: hay
        ? `Sin inclinación, la Luna llena pasa justo por el eje de la sombra: eclipse <b>${sin.tipo}</b> de Luna, <b>todos los meses</b> (${num(365.25 / MES_SINODICO, 1)} por año). Con la órbita inclinada, esta misma Luna llena pasa a ${num(real.distancia, 1)}° de la sombra y la esquiva: por eso los eclipses son raros.`
        : 'Con esta configuración no hay eclipse.',
    }
  },
}

/** La pregunta que corresponde a lo que el usuario rompió. */
export const preguntaPara = (config: Config): Pregunta => (config.sinInclinacion ? PREGUNTA_SIN_INCLINACION : PREGUNTA_LLENA)
