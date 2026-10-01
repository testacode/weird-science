// Preguntas de "Predecí antes de correr". La respuesta sale del modelo (se corre `simular` desde el
// mismo punto de partida), no está escrita a mano.

import { av } from '../../ui/avanzado'
import type { Opcion } from '../../ui/componentes'
import { num } from './contenido'
import { LLUVIA_MIN, TOTAL, flujos, horasHastaSinLluvia, simular, total, type Config, type Estado } from './model'

export type Respuesta = 'mas' | 'igual' | 'menos' | 'ya' | 'rato' | 'sigue'

/** Horas del terrario que se miden antes de revelar (3 días). */
export const VENTANA_H = 72
/** Variación relativa de la escorrentía por debajo de la cual se considera "igual". */
const TOLERANCIA = 0.05

export interface Pregunta {
  id: 'agua' | 'sol' | 'tala'
  texto: string
  opciones: Opcion<Respuesta>[]
  /** El experimento terminó: se puede revelar. */
  listo: (e: Estado, c: Config) => boolean
  /** Calcula con el modelo la respuesta correcta, simulando desde `arranque` con la config actual. */
  resolver: (c: Config, arranque: Estado) => { correcta: Respuesta; explicacion: string }
}

export const AGUA: Pregunta = {
  id: 'agua',
  texto: 'Pasan 3 días: el agua se evapora y llueve una y otra vez. ¿Cuánta agua hay al final en todo el terrario?',
  opciones: [
    { valor: 'mas', texto: 'Más: la lluvia es agua nueva' },
    { valor: 'igual', texto: 'La misma: solo cambia de lugar' },
    { valor: 'menos', texto: 'Menos: parte se pierde' },
  ],
  listo: (e) => e.horas >= VENTANA_H,
  resolver: (c, arranque) => {
    const fin = simular(c, VENTANA_H, arranque)
    const dif = total(fin) - total(arranque)
    const correcta: Respuesta = Math.abs(dif) < 0.01 ? 'igual' : dif > 0 ? 'mas' : 'menos'
    const llovio = fin.lluvia < 1
      ? 'Casi no llovió'
      : `Llovieron <b>${num(fin.lluvia, 0)} mm</b> (${num(fin.lluvia / TOTAL, 1)} veces toda el agua)`
    return {
      correcta,
      explicacion: `${llovio} y el total sigue en <b>${num(total(fin), 1)} mm</b>: la lluvia no es agua nueva, es la que se evaporó, y el terrario cerrado no pierde nada${av('. Cada flujo saca agua de un reservorio y la pone en otro: la suma no cambia (conservación de la masa)')}.`,
    }
  },
}

export const SOL: Pregunta = {
  id: 'sol',
  texto: 'Apagás el Sol con las nubes cargadas. ¿Cuándo deja de llover?',
  opciones: [
    { valor: 'ya', texto: 'En cuanto lo apago' },
    { valor: 'rato', texto: 'Sigue un rato y después para' },
    { valor: 'sigue', texto: 'Sigue igual: el agua ya está en las nubes' },
  ],
  listo: (e, c) => flujos(e, c).prec < LLUVIA_MIN || e.horas >= VENTANA_H,
  resolver: (c, arranque) => {
    const horas = horasHastaSinLluvia(c, arranque, VENTANA_H)
    const correcta: Respuesta = horas < 1 ? 'ya' : horas < VENTANA_H ? 'rato' : 'sigue'
    const explicacion = correcta === 'ya'
      ? 'No había nubes cargadas, así que dejó de llover enseguida. Sin Sol no se evapora agua nueva y el ciclo se frena.'
      : `Siguió lloviendo unas <b>${num(horas, 0)} horas</b>: las nubes ya tenían <b>${num(arranque.nubes, 1)} mm</b> y se fueron vaciando. Después, nada: sin Sol no sube agua nueva${av(' (evaporar necesita la energía de la lámpara)')}.`
    return { correcta, explicacion }
  },
}

export const TALA: Pregunta = {
  id: 'tala',
  texto: 'Talás todas las plantas. En 3 días, ¿qué pasa con el agua que escurre por la superficie hacia el río?',
  opciones: [
    { valor: 'mas', texto: 'Escurre más' },
    { valor: 'igual', texto: 'Escurre lo mismo' },
    { valor: 'menos', texto: 'Escurre menos: hay menos plantas' },
  ],
  listo: (e) => e.horas >= VENTANA_H,
  resolver: (c, arranque) => {
    const sin = simular(c, VENTANA_H, arranque)
    const con = simular({ ...c, talado: false }, VENTANA_H, arranque)
    const cambio = con.escorrentia === 0 ? 0 : (sin.escorrentia - con.escorrentia) / con.escorrentia
    const correcta: Respuesta = Math.abs(cambio) < TOLERANCIA ? 'igual' : cambio > 0 ? 'mas' : 'menos'
    return {
      correcta,
      explicacion: `Sin plantas escurrieron <b>${num(sin.escorrentia, 0)} mm</b> al río; con plantas, ${num(con.escorrentia, 0)} mm. ${
        correcta === 'mas'
          ? `La tierra desnuda se infiltra menos${av(' (sin raíces ni hojas que frenen el agua, y sin transpiración que la devuelva al aire)')}.`
          : correcta === 'igual'
            ? 'Casi no cambia: con estos controles no hay plantas que talar o casi no llueve, así que la tala no tiene efecto.'
            : 'Escurrió menos: con menos plantas también hay menos transpiración y menos lluvia en el terrario.'
      }`,
    }
  },
}

/** La pregunta que corresponde a lo que el usuario rompió, o `null` si todo funciona. Apagar el Sol tiene prioridad. */
export function preguntaRota(c: Config): Pregunta | null {
  return c.solApagado ? SOL : c.talado ? TALA : null
}
