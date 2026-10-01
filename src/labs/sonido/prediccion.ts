// Preguntas de "Predecí antes de correr". Se hacen ANTES de aplicar el cambio y la respuesta sale del modelo
// (tiempos de llegada y niveles calculados, no escritos a mano). Se resuelven con las magnitudes continuas.

import { av } from '../../ui/avanzado'
import type { Opcion } from '../../ui/componentes'
import { numero } from '../../ui/formato'
import { AIRE_MIN, L_TUBO, MEDIOS, P_ATM, UMBRAL_DB, golpeTerminado, llegada, medio, nivelAire, type Config, type Estado } from './model'

const num = numero

export type Respuesta = 'aire_agua_acero' | 'juntos' | 'acero_agua_aire' | 'igual' | 'mas_bajo' | 'nada'

/** Lo que la pregunta necesita para resolverse: se congela al preguntar. */
export interface Datos {
  distancia: number
  amplitud: number
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
/** Caída de nivel (dB) por debajo de la cual se considera que "se oye igual". */
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
  texto: 'La bomba saca el aire del tubo de aire y el parlante sigue vibrando igual. ¿Qué pasa con lo que oye el micrófono de ese tubo?',
  opciones: [
    { valor: 'nada', texto: 'Ya no se oye nada' },
    { valor: 'igual', texto: 'Se oye igual: el parlante vibra lo mismo' },
    { valor: 'mas_bajo', texto: 'Se oye más bajito, pero se sigue oyendo' },
  ],
  listo: (c, e) => c.bomba && e.aire <= AIRE_MIN * 1.01,
  resolver: ({ amplitud }) => {
    const antes = nivelAire(amplitud, 1)
    const despues = nivelAire(amplitud, AIRE_MIN)
    const correcta: Respuesta = despues < UMBRAL_DB ? 'nada' : antes - despues > TOLERANCIA_DB ? 'mas_bajo' : 'igual'
    // Fracción de aire con la que el nivel cruza el umbral de audición.
    const cruce = 10 ** ((UMBRAL_DB - antes) / 20)
    const pa = cruce * P_ATM
    const hecho = `El nivel pasó de <b>${num(antes, 0)} dB</b> a <b>${num(despues, 0)} dB</b>, bajo el umbral de audición (${UMBRAL_DB} dB).`
    const causa = correcta === 'nada'
      ? ` No se cortó de golpe: se fue apagando a medida que se iba el aire, y dejó de oírse cuando quedaba el ${num(cruce * 100, 3)} % (${num(pa, pa < 10 ? 1 : 0)} Pa). Sin moléculas, la vibración no tiene qué empujar. En el agua y el acero no hace falta aire, solo un medio: sus micrófonos siguen recibiendo.`
      : ' Todavía queda aire suficiente para llevar la vibración.'
    return { correcta, explicacion: hecho + causa + av(' La presión sonora es p = ρ · v de las partículas: con la misma vibración, p baja junto con la densidad ρ.') }
  },
}

export const preguntaPara = (tipo: Pregunta['tipo']) => (tipo === 'golpe' ? GOLPE : BOMBA)
