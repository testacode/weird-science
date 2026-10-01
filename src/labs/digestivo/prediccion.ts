// Preguntas de "Predecí antes de correr". La respuesta sale del modelo, no está escrita a mano.
import { numero } from '../../ui/formato'

import type { Opcion } from '../../ui/componentes'
import { av } from '../../ui/avanzado'
import { estadoInicial, kcalAbsorbidas, simularHastaElFinal, type Config, type Estado, type Macro } from './model'

export type Respuesta = 'sube' | 'igual' | 'baja'

export interface Pregunta {
  texto: string
  opciones: Opcion<Respuesta>[]
  /** Compara el tránsito que se vio (`final`) con el mismo tránsito sin romper nada. */
  resolver: (final: Estado, base: Estado) => { correcta: Respuesta; explicacion: string }
}

const NORMAL: Config = { bilis: true, acidoGastrico: true }
/** Variación relativa por debajo de la cual se considera "igual". */
const TOLERANCIA = { energia: 0.02, proteinas: 0.1 }

export function referencia(gramos: Record<Macro, number>): Estado {
  return simularHastaElFinal(estadoInicial(gramos), NORMAL)
}

function clasificar(real: number, base: number, tolerancia: number): Respuesta {
  const cambio = base === 0 ? 0 : (real - base) / base
  return Math.abs(cambio) < tolerancia ? 'igual' : cambio > 0 ? 'sube' : 'baja'
}

const PREGUNTA_ENERGIA: Pregunta = {
  texto: 'Sin bilis, ¿qué pasa con la energía absorbida (kcal)?',
  opciones: [
    { valor: 'sube', texto: 'Sube' },
    { valor: 'igual', texto: 'Queda igual' },
    { valor: 'baja', texto: 'Baja' },
  ],
  resolver: (final, base) => {
    const real = kcalAbsorbidas(final.nutrientes)
    const normal = kcalAbsorbidas(base.nutrientes)
    const correcta = clasificar(real, normal, TOLERANCIA.energia)
    const perdidas = base.nutrientes.grasas.absorbido - final.nutrientes.grasas.absorbido
    const hecho = `Se absorbieron <b>${numero(real, 0)} kcal</b> en vez de ${numero(normal, 0)}.`
    const causa =
      correcta === 'baja'
        ? ` Se absorbieron ${numero(perdidas, 1)} g de grasa menos que con bilis, y cada gramo de grasa aporta 9 kcal${av(' (4 los carbohidratos y las proteínas)')}.`
        : ' Esta comida casi no tiene grasa para perder, así que la bilis casi no se nota.'
    return { correcta, explicacion: hecho + causa }
  },
}

const PREGUNTA_PROTEINAS: Pregunta = {
  texto: 'Sin ácido en el estómago, ¿cuántas proteínas se absorben?',
  opciones: [
    { valor: 'sube', texto: 'Más' },
    { valor: 'igual', texto: 'Igual o casi igual' },
    { valor: 'baja', texto: 'Bastante menos' },
  ],
  resolver: (final, base) => {
    const real = final.nutrientes.proteinas.absorbido
    const normal = base.nutrientes.proteinas.absorbido
    const correcta = clasificar(real, normal, TOLERANCIA.proteinas)
    const hecho = `Se absorbieron <b>${numero(real, 1)} g</b> de proteínas en vez de ${numero(normal, 1)} g.`
    const causa =
      correcta === 'igual'
        ? ` El estómago ayuda, pero no es imprescindible: el páncreas${av(' (tripsina)')} corta las proteínas en el intestino delgado.`
        : ' Sin el ácido del estómago, esta vez el intestino no alcanzó a compensar.'
    return { correcta, explicacion: hecho + causa }
  },
}

/** La pregunta que corresponde a lo que el usuario rompió, o `null` si todo funciona. Bilis tiene prioridad. */
export function preguntaPara(config: Config): Pregunta | null {
  if (!config.bilis) return PREGUNTA_ENERGIA
  if (!config.acidoGastrico) return PREGUNTA_PROTEINAS
  return null
}
