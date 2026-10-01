// Preguntas de "Predecí antes de correr". La respuesta sale del modelo, no está escrita a mano.

import { av } from '../../ui/avanzado'
import type { Opcion } from '../../ui/componentes'
import { kgm3, newtons, num } from './contenido'
import { OBJETOS, PLANETAS, densidadLiquido, derivar, estadoInicial, simular, type Config } from './model'

export type Respuesta = 'barco' | 'piedra' | 'ninguno' | 'ambos' | 'sigue' | 'hunde' | 'sube' | 'mas' | 'igual' | 'menos'

export interface Pregunta {
  id: 'barco' | 'agujero' | 'planeta'
  texto: string
  opciones: Opcion<Respuesta>[]
  /** Calcula con el modelo cuál era la respuesta correcta para la config actual. */
  resolver: (config: Config) => { correcta: Respuesta; explicacion: string }
}

/** Diferencia de fracción sumergida por debajo de la cual se considera "igual". */
const TOLERANCIA = 0.02

const G = PLANETAS.tierra.g

const BARCO: Pregunta = {
  id: 'barco',
  texto: 'Un barco de acero de 1 kg y una piedra de 100 g, en este líquido: ¿cuál flota?',
  opciones: [
    { valor: 'barco', texto: 'Flota el barco, se hunde la piedra' },
    { valor: 'piedra', texto: 'Flota la piedra, se hunde el barco' },
    { valor: 'ninguno', texto: 'Se hunden los dos' },
    { valor: 'ambos', texto: 'Flotan los dos' },
  ],
  resolver: (config) => {
    const rho = densidadLiquido(config)
    const barco = OBJETOS.barco.densidad
    const piedra = OBJETOS.piedra.densidad
    const [barcoFlota, piedraFlota] = [barco < rho, piedra < rho]
    const correcta: Respuesta = barcoFlota && piedraFlota ? 'ambos' : barcoFlota ? 'barco' : piedraFlota ? 'piedra' : 'ninguno'
    // Volumen de cada uno y empuje máximo (todo sumergido) contra su peso.
    const fila = (nombre: string, masa: number, rhoObjeto: number) => {
      const volumen = masa / rhoObjeto
      const maximo = rho * volumen * G
      const veredicto = maximo >= masa * G ? 'alcanza: flota' : 'no alcanza: se hunde'
      return `${nombre}: ocupa ${num(volumen * 1e6, 0)} cm³, el empuje máximo es ${newtons(maximo)} N y pesa ${newtons(masa * G)} N, ${veredicto}.`
    }
    return {
      correcta,
      explicacion: `${fila('El barco de 1 kg', 1, barco)} ${fila('La piedra de 100 g', 0.1, piedra)} No importa cuánto pese: importa cuánto pesa por cada litro que ocupa.${av(` El barco es chapa y aire: su densidad media es ${kgm3(barco)}; la de la piedra, ${kgm3(piedra)}; la del líquido, ${kgm3(rho)}.`)}`,
    }
  },
}

const AGUJERO: Pregunta = {
  id: 'agujero',
  texto: 'Le hacemos un agujerito al barquito, abajo. ¿Qué pasa?',
  opciones: [
    { valor: 'sigue', texto: 'Sigue flotando igual' },
    { valor: 'hunde', texto: 'Se llena de líquido y se hunde' },
    { valor: 'sube', texto: 'Flota más alto: se aliviana' },
  ],
  resolver: (config) => {
    const { derivados: d } = simular(config)
    const antes = derivar({ ...config, agujero: false }, estadoInicial(config))
    const correcta: Respuesta = d.flota ? 'sigue' : 'hunde'
    return {
      correcta,
      explicacion: `Entró líquido: el casco pasó de pesar <b>${newtons(antes.peso)} N</b> a <b>${newtons(d.peso)} N</b> sin cambiar de tamaño, así que su densidad media subió y ya no flota. El empuje máximo no alcanza.${av(` Densidad media: de ${kgm3(antes.rhoObjeto)} a ${kgm3(d.rhoObjeto)}; la del líquido es ${kgm3(d.rhoLiquido)}.`)}`,
    }
  },
}

function preguntaPlaneta(config: Config): Pregunta {
  const { lugar, g } = PLANETAS[config.planeta]
  return {
    id: 'planeta',
    texto: `En ${lugar} la gravedad es ${num(g, 2)} m/s² (en la Tierra, ${num(G, 1)}). Con el mismo objeto (${OBJETOS[config.objeto].nombre.toLowerCase()}), ¿flota más, igual o menos que en la Tierra?`,
    opciones: [
      { valor: 'mas', texto: 'Flota más: queda menos sumergida' },
      { valor: 'igual', texto: 'Igual: queda sumergida lo mismo' },
      { valor: 'menos', texto: 'Flota menos: queda más sumergida' },
    ],
    resolver: (c) => {
      const aca = simular(c).derivados
      const tierra = simular({ ...c, planeta: 'tierra' }).derivados
      const cambio = aca.sumergido - tierra.sumergido
      const correcta: Respuesta = Math.abs(cambio) < TOLERANCIA ? 'igual' : cambio < 0 ? 'mas' : 'menos'
      return {
        correcta,
        explicacion: `El peso baja de <b>${newtons(tierra.peso)} N</b> a <b>${newtons(aca.peso)} N</b> y el empuje baja en la misma proporción: queda <b>${num(aca.sumergido * 100, 0)} %</b> sumergida, ${correcta === 'igual' ? 'igual que' : correcta === 'mas' ? 'más que' : 'menos que'} en la Tierra.${av(' La fracción sumergida es ρ_objeto / ρ_líquido y no tiene g: la gravedad se simplifica.')}`,
      }
    },
  }
}

/** La pregunta que corresponde a lo que el usuario eligió, o `null` si no hay nada que predecir. */
export function preguntaPara(config: Config): Pregunta | null {
  if (config.agujero) return AGUJERO
  if (config.planeta !== 'tierra') {
    const flotaEnLaTierra = OBJETOS[config.objeto].densidad < densidadLiquido(config)
    return flotaEnLaTierra ? preguntaPlaneta(config) : null
  }
  return config.objeto === 'barco' ? BARCO : null
}
