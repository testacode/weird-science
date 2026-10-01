// Preguntas de "Predecí antes de correr". Se hacen ANTES de aplicar el cambio y la respuesta sale del modelo.

import { av } from '../../ui/avanzado'
import type { Opcion } from '../../ui/componentes'
import { num } from './contenido'
import { ACTIVIDADES, FICO2, derivados, presion, presionO2, type Config, type Estado } from './model'

export type Respuesta = 'sube' | 'igual' | 'baja' | 'o2' | 'co2' | 'ninguno' | 'ambos' | 'solo_o2' | 'solo_co2' | 'poco' | 'mucho'

/** Config y estado del cuerpo en un momento. */
export interface Foto {
  c: Config
  e: Estado
}

export interface Pregunta {
  texto: string
  opciones: Opcion<Respuesta>[]
  /** Segundos del cuerpo que se dejan correr antes de revelar. */
  ventana: number
  /** Dice cuál era la respuesta correcta con lo que realmente pasó en el modelo. */
  resolver: (antes: Foto, despues: Foto) => { correcta: Respuesta; explicacion: string }
}

/** Puntos de saturación (o mmHg de CO₂) de cambio por debajo de los cuales se considera "igual". */
const TOLERANCIA = 2

const sat = (f: Foto) => derivados(f.c, f.e).spo2

const CORRER = (c: Config): Pregunta => ({
  texto: `Respirás ${num(c.frecuencia, 0)} veces por minuto, ${num(c.volumen, 2)} L cada vez. Si salís a correr sin respirar más rápido, ¿qué pasa con el oxígeno de tu sangre?`,
  opciones: [
    { valor: 'sube', texto: 'Sube: el cuerpo recibe más aire' },
    { valor: 'igual', texto: 'Queda igual' },
    { valor: 'baja', texto: 'Baja: llega menos O₂ del que se gasta' },
  ],
  ventana: 60,
  resolver: (antes, despues) => {
    const a = sat(antes)
    const b = sat(despues)
    const d = derivados(despues.c, despues.e)
    const correcta: Respuesta = b - a > TOLERANCIA ? 'sube' : a - b > TOLERANCIA ? 'baja' : 'igual'
    const hecho = `La saturación pasó de <b>${num(a, 0)} %</b> a <b>${num(b, 0)} %</b>.`
    const causa = correcta === 'baja'
      ? ` Al correr el cuerpo pide <b>${num(d.vo2, 0)} mL</b> de O₂ por minuto (en reposo, ${ACTIVIDADES.reposo.vo2}) y con ${num(d.ve, 1)} L de aire por minuto no alcanza: hacen falta unos ${num(d.necesario, 0)}. Por eso al correr respirás más rápido y más hondo.${av(` El CO₂ de la sangre subió de ${num(antes.e.paco2, 0)} a ${num(despues.e.paco2, 0)} mmHg.`)}`
      : ` Ya movías suficiente aire (${num(d.ve, 1)} L/min contra unos ${num(d.necesario, 0)} necesarios), así que el oxígeno se sostiene.`
    return { correcta, explicacion: hecho + causa }
  },
})

/** La pregunta con la que arranca el lab: la idea errónea de que "inhalamos solo O₂". */
export const PREGUNTA_INICIAL: Pregunta = {
  texto: 'El aire que exhalás, ¿qué tiene de más que el aire que inhalaste?',
  opciones: [
    { valor: 'o2', texto: 'Más oxígeno (O₂)' },
    { valor: 'co2', texto: 'Más dióxido de carbono (CO₂)' },
    { valor: 'ninguno', texto: 'Lo mismo: sale igual que entró' },
  ],
  ventana: 15,
  resolver: (_antes, despues) => {
    const sale = derivados(despues.c, despues.e).sale ?? { o2: 16, co2: 4 }
    const veces = sale.co2 / (FICO2 * 100)
    const correcta: Respuesta = sale.o2 > 20.93 ? 'o2' : veces > 1.5 ? 'co2' : 'ninguno'
    return {
      correcta,
      explicacion: `Entran 21 % de O₂ y ${num(FICO2 * 100, 2)} % de CO₂; salen ≈ <b>${num(sale.o2, 0)} % de O₂</b> y <b>${num(sale.co2, 1)} % de CO₂</b>. El único gas que sale en más cantidad es el CO₂ (unas ${num(veces, 0)} veces más). Y no usamos todo el oxígeno: del 21 % solo se queda una parte.${av(' El nitrógeno (78 %) entra y sale casi igual: no participa.')}`,
    }
  },
}

const ALTURA = (c: Config): Pregunta => ({
  texto: `Subís a ${num(c.altura, 0)} m y respirás igual que en el llano. ¿Cuánto oxígeno trae cada bocanada, comparada con la del llano?`,
  opciones: [
    { valor: 'igual', texto: 'Lo mismo' },
    { valor: 'poco', texto: 'Un poco menos (más o menos el 90 %)' },
    { valor: 'mucho', texto: 'Bastante menos (alrededor del 60 %)' },
  ],
  ventana: 45,
  resolver: (antes, despues) => {
    const razon = presionO2(despues.c.altura) / presionO2(0)
    const correcta: Respuesta = razon > 0.95 ? 'igual' : razon > 0.8 ? 'poco' : 'mucho'
    return {
      correcta,
      explicacion: `A ${num(despues.c.altura, 0)} m la presión del aire es el ${num((presion(despues.c.altura) / presion(0)) * 100, 0)} % de la del llano: cada bocanada trae ≈ <b>${num(razon * 100, 0)} %</b> del O₂. El aire sigue siendo 21 % oxígeno; lo que baja es cuánto aire entra. La saturación pasó de ${num(sat(antes), 0)} % a <b>${num(sat(despues), 0)} %</b>.${av(` PO₂ del aire que entra: ${num(presionO2(0), 0)} → ${num(presionO2(despues.c.altura), 0)} mmHg.`)}`,
    }
  },
})

const AGUANTAR: Pregunta = {
  texto: 'Vas a aguantar la respiración con los pulmones llenos. ¿Qué pasa en tu sangre?',
  opciones: [
    { valor: 'ambos', texto: 'Baja el O₂ y sube el CO₂' },
    { valor: 'solo_o2', texto: 'Baja el O₂; el CO₂ no cambia' },
    { valor: 'solo_co2', texto: 'Sube el CO₂; el O₂ no cambia' },
  ],
  ventana: 60,
  resolver: (antes, despues) => {
    const dSat = sat(despues) - sat(antes)
    const dCo2 = despues.e.paco2 - antes.e.paco2
    const baja = dSat < -TOLERANCIA
    const sube = dCo2 > TOLERANCIA
    const correcta: Respuesta = baja && sube ? 'ambos' : sube ? 'solo_co2' : 'solo_o2'
    return {
      correcta,
      explicacion: `En ${num(despues.e.t - antes.e.t, 0)} segundos la saturación pasó de ${num(sat(antes), 0)} % a <b>${num(sat(despues), 0)} %</b> y el CO₂ subió de ${num(antes.e.paco2, 0)} a <b>${num(despues.e.paco2, 0)} mmHg</b>. Los pulmones guardan un poco de aire, pero el cuerpo sigue gastando O₂ y produciendo CO₂, y sin respirar no hay cómo sacarlo. Lo que te va a obligar a volver a respirar es el CO₂.`,
    }
  },
}

/** La pregunta que corresponde al cambio que se quiere hacer, o `null` si no hay nada que predecir. */
export function preguntaPara(actual: Config, nueva: Config): Pregunta | null {
  if (!actual.aguanta && nueva.aguanta) return AGUANTAR
  if (actual.altura < 3000 && nueva.altura >= 3000) return ALTURA(nueva)
  if (actual.actividad !== 'correr' && nueva.actividad === 'correr') return CORRER(nueva)
  return null
}
