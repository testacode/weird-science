// Preguntas de "Predecí antes de correr". Se hacen ANTES de aplicar el cambio y la respuesta sale del modelo.

import { av } from '../../ui/avanzado'
import type { Opcion } from '../../ui/componentes'
import { amperes, num } from './contenido'
import { presentes, sacadasActivas, type Config, type Resultado } from './model'

export type Respuesta = 'apagan' | 'igual' | 'mas' | 'menos'

export interface Pregunta {
  texto: string
  opciones: Opcion<Respuesta>[]
  resolver: (antes: Resultado, despues: Resultado) => { correcta: Respuesta; explicacion: string }
}

/** Variación relativa del brillo por debajo de la cual se considera "igual". */
const TOLERANCIA = 0.15

const brilloDe = (r: Resultado) => r.lamparas.find((l) => l.presente)?.brillo ?? 0

function clasificar(antes: number, despues: number): Respuesta {
  if (despues < 0.005) return 'apagan'
  const cambio = (despues - antes) / antes
  return Math.abs(cambio) < TOLERANCIA ? 'igual' : cambio > 0 ? 'mas' : 'menos'
}

const potencia = (r: Resultado) => `${num(r.lamparas.find((l) => l.presente)?.potencia ?? 0, 2)} W`

function preguntaSacar(c: Config): Pregunta {
  return {
    texto: `Las ${c.cantidad} lamparitas están en ${c.conexion}. Si saco una, ¿qué pasa con las otras?`,
    opciones: [
      { valor: 'apagan', texto: 'Se apagan todas' },
      { valor: 'igual', texto: 'Siguen igual' },
      { valor: 'mas', texto: 'Brillan más' },
      { valor: 'menos', texto: 'Brillan menos' },
    ],
    resolver: (antes, despues) => {
      const correcta = clasificar(brilloDe(antes), brilloDe(despues))
      if (correcta === 'apagan') {
        return {
          correcta,
          explicacion: `Se apagaron todas: cada una pasó de <b>${potencia(antes)}</b> a 0 W. En serie hay un solo camino, y si se corta en un punto no circula corriente${av(' (I = 0 A, así que a ninguna lamparita le cae voltaje)')}.`,
        }
      }
      return {
        correcta,
        explicacion: `Las otras siguen casi igual: <b>${potencia(antes)}</b> antes y <b>${potencia(despues)}</b> ahora. En paralelo cada lamparita tiene su propio camino y recibe el voltaje de la pila. Por eso en una casa los artefactos van en paralelo.${av(` La corriente total baja de ${amperes(antes.corriente)} a ${amperes(despues.corriente)}, y el brillo sube apenas porque la pila pierde menos adentro.`)}`,
      }
    },
  }
}

function preguntaSumar(c: Config, nueva: Config): Pregunta {
  return {
    texto: `Hoy hay ${c.cantidad === 1 ? '1 lamparita' : `${c.cantidad} lamparitas`} en ${c.conexion} y vas a poner ${nueva.cantidad}. ¿Cómo brilla cada una?`,
    opciones: [
      { valor: 'mas', texto: 'Más' },
      { valor: 'igual', texto: 'Casi igual' },
      { valor: 'menos', texto: 'Menos' },
    ],
    resolver: (antes, despues) => {
      const correcta = clasificar(brilloDe(antes), brilloDe(despues))
      const hecho = `Cada lamparita pasó de <b>${potencia(antes)}</b> a <b>${potencia(despues)}</b>.`
      const causa = c.conexion === 'serie'
        ? ` En serie el voltaje de la pila se reparte entre más lamparitas (${num(antes.lamparas[0].tension)} V a ${num(despues.lamparas[0].tension)} V cada una) y la corriente baja de ${amperes(antes.corriente)} a ${amperes(despues.corriente)}${av(`: la resistencia total pasó de ${num(antes.rCarga)} Ω a ${num(despues.rCarga)} Ω`)}.`
        : ` En paralelo todas reciben el voltaje de la pila, así que brillan casi igual, pero la pila entrega más corriente (${amperes(antes.corriente)} a ${amperes(despues.corriente)}) y se agota antes.`
      return { correcta, explicacion: hecho + causa }
    },
  }
}

/** La pregunta que corresponde al cambio que se quiere hacer, o `null` si no hay nada que predecir. */
export function preguntaPara(actual: Config, nueva: Config): Pregunta | null {
  const funciona = actual.cerrado && !actual.corto
  if (funciona && presentes(actual) >= 2 && sacadasActivas(nueva) > sacadasActivas(actual) && nueva.cantidad === actual.cantidad) {
    return preguntaSacar(actual)
  }
  if (funciona && sacadasActivas(actual) === 0 && nueva.cantidad > actual.cantidad && nueva.conexion === actual.conexion) {
    return preguntaSumar(actual, nueva)
  }
  return null
}
