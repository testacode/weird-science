// Preguntas de "Predecí antes de correr". Se hacen ANTES de aplicar el cambio y la respuesta sale del modelo
// (tiempos de llegada y niveles calculados, no escritos a mano). Se resuelven con las magnitudes continuas.

import { av } from '../../ui/avanzado'
import { mezclar } from '../../ui/azar'
import type { Opcion } from '../../ui/componentes'
import { numero } from '../../ui/formato'
import { AIRE_MIN, L_TUBO, MEDIOS, P_ATM, UMBRAL_DB, golpeTerminado, llegada, medio, nivelAire, oido, vacioLogrado, type Config, type Estado } from './model'

const num = numero

export type Respuesta = 'aire_agua_acero' | 'juntos' | 'acero_agua_aire' | 'gradual' | 'de_golpe' | 'igual'

/** Lo que la pregunta necesita para resolverse: se congela al preguntar. */
export interface Datos {
  distancia: number
  amplitud: number
  /** La que oiría una persona: la del tono, o una audible si es un golpe. */
  frecuencia: number
}

export interface Pregunta {
  tipo: 'golpe' | 'bomba'
  texto: string
  opciones: Opcion<Respuesta>[]
  /** La predicción se revela cuando el experimento llega a este punto. */
  listo: (c: Config, e: Estado) => boolean
  resolver: (d: Datos) => { correcta: Respuesta; explicacion: string }
}

/** Si el más lento tarda menos de esto (veces) que el más rápido, se considera que llegan "juntos". */
const TOLERANCIA_LLEGADA = 1.1
/** Caída de nivel (dB) por debajo de la cual se considera que "no cambió". */
const TOLERANCIA_DB = 3

const ms = (s: number) => `${num(s * 1000, 1)} ms`

const GOLPE: Pregunta = {
  tipo: 'golpe',
  texto: `Un golpe sale por tres tubos de ${L_TUBO} m: uno de aire, uno de agua y uno de acero. ¿En qué orden llega a los micrófonos?`,
  opciones: [
    { valor: 'aire_agua_acero', texto: 'Primero el aire, después el agua y al final el acero: cuanto más denso, más lento' },
    { valor: 'acero_agua_aire', texto: 'Primero el acero, después el agua y al final el aire' },
    { valor: 'juntos', texto: 'Llegan a la vez: el sonido va igual de rápido en todos' },
  ],
  listo: (c, e) => golpeTerminado(e, c),
  resolver: ({ distancia }) => {
    const t = MEDIOS.map((m) => ({ id: m.id, t: llegada(m.id, distancia) })).sort((a, b) => a.t - b.t)
    const tiempo = (id: string) => t.find((x) => x.id === id)!.t
    const correcta: Respuesta = t[t.length - 1].t / t[0].t < TOLERANCIA_LLEGADA ? 'juntos' : t[0].id === 'acero' ? 'acero_agua_aire' : 'aire_agua_acero'
    const [aire, agua, acero] = [medio('aire'), medio('agua'), medio('acero')]
    const rigidez = (agua.v / aire.v) ** 2 * (agua.densidad / aire.densidad)
    return {
      correcta,
      explicacion: `A ${num(distancia, 1)} m llegó el acero a los <b>${ms(tiempo('acero'))}</b>, el agua a los <b>${ms(tiempo('agua'))}</b> y el aire a los <b>${ms(tiempo('aire'))}</b>. En el agua el sonido va ${num(agua.v / aire.v, 1)} veces más rápido que en el aire, y en el acero ${num(acero.v / aire.v, 0)}. Que el medio sea más denso no lo frena: lo que cuenta es qué tan rígido es.${av(` En un fluido v = √(K/ρ): el agua es ${num(agua.densidad / aire.densidad, 0)} veces más densa que el aire, pero también unas ${num(Math.round(rigidez / 1000) * 1000, 0)} veces más difícil de comprimir (K), y eso gana.`)}`,
    }
  },
}

const BOMBA: Pregunta = {
  tipo: 'bomba',
  texto: 'La bomba saca el aire del tubo de aire y el parlante sigue vibrando igual. Mientras el aire se va, ¿cómo cambia lo que marca el micrófono de ese tubo?',
  opciones: [
    { valor: 'gradual', texto: 'Baja de a poco, a medida que se va el aire' },
    { valor: 'de_golpe', texto: 'Se mantiene casi igual y se corta de golpe cuando no queda aire' },
    { valor: 'igual', texto: 'No cambia: el parlante vibra lo mismo' },
  ],
  listo: (c, e) => c.bomba && vacioLogrado(e),
  resolver: ({ amplitud, frecuencia }) => {
    const antes = nivelAire(amplitud, 1)
    const nivel = (aire: number) => nivelAire(amplitud, aire)
    // "De golpe" = casi no baja hasta que queda el 10 % del aire; "igual" = no baja ni al final.
    const correcta: Respuesta = antes - nivel(AIRE_MIN) < TOLERANCIA_DB ? 'igual' : antes - nivel(0.1) < TOLERANCIA_DB ? 'de_golpe' : 'gradual'
    const dB = (aire: number) => `<b>${num(nivel(aire), 0)} dB</b>`
    const hecho = `Con todo el aire el micrófono marcaba ${num(antes, 0)} dB; con la mitad, ${dB(0.5)}; con el 10 %, ${dB(0.1)}; y con lo último que saca la bomba (${num(AIRE_MIN * P_ATM, 1)} Pa), ${dB(AIRE_MIN)}.`
    // Cuándo dejaría de oírse: solo tiene sentido si ese tono es audible.
    const cruce = 10 ** ((UMBRAL_DB - antes) / 20)
    const pa = cruce * P_ATM
    const persona = oido(frecuencia, antes) === 'si'
      ? ` Una persona dejaría de oírlo cuando quedara el ${num(cruce * 100, 3)} % del aire (${num(pa, pa < 10 ? 1 : 0)} Pa), con el umbral de 0 dB.`
      : ` Con ${num(frecuencia, 0)} Hz una persona no lo oiría ni con aire (no está en el rango audible), pero el micrófono sí lo registra.`
    const causa = correcta === 'gradual' ? ' No se corta de golpe: baja a medida que se va el aire, porque cada partícula que falta es una que no empuja a la vecina.' : ''
    return {
      correcta,
      explicacion: `${hecho}${causa}${persona} En el agua y el acero no hace falta aire, solo un medio.${av(' La presión sonora es p = ρ · c · v, con v la velocidad de las partículas: con la misma vibración y la misma c (que en el aire no depende de la presión), p baja junto con la densidad ρ.')}`,
    }
  },
}

export const preguntaPara = (tipo: Pregunta['tipo']): Pregunta => {
  const p = tipo === 'golpe' ? GOLPE : BOMBA
  return { ...p, opciones: mezclar(p.opciones) }
}
