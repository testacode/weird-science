// Preguntas de "Predecí antes de correr". La respuesta sale del modelo: se simula el método completo y se mide.
import type { Opcion } from '../../ui/componentes'
import { av } from '../../ui/avanzado'
import { ESPECIES, SAL_SOBRESATURADA_G, mezclaDe, type MetodoId } from './datos'
import { explicacion, num } from './contenido'
import { PORO_FILTRO_MM, resultadoFinal, type Config, type Veredicto } from './model'

export type Respuesta = string

export interface Pregunta {
  texto: string
  opciones: Opcion<Respuesta>[]
  resolver: (c: Config) => { correcta: Respuesta; explicacion: string }
}

const gramos = (g: number) => `${num(g, g < 10 ? 1 : 0)} g`
/** Gramos de una especie en una lista de porciones. */
const deEspecie = (e: string, lista: { especie: string }[], v: number[]) => lista.reduce((s, p, i) => (p.especie === e ? s + v[i] : s), 0)

const preguntaFiltroConSal: Pregunta = {
  texto: 'Si filtrás agua con sal, ¿qué sale del otro lado del filtro?',
  opciones: [
    { valor: 'agua', texto: 'Agua sola: el filtro se queda con la sal' },
    { valor: 'agua-sal', texto: 'Agua con sal, igual que antes' },
    { valor: 'sal', texto: 'Sal sola' },
  ],
  resolver: (c) => {
    const { corrida, lectura } = resultadoFinal(c)
    const sal = deEspecie('sal', corrida.porciones, lectura.salida)
    const agua = deEspecie('agua', corrida.porciones, lectura.salida)
    const correcta = sal > 0.5 * deEspecie('sal', corrida.porciones, corrida.porciones.map((p) => p.masa)) ? (agua > 0.5 ? 'agua-sal' : 'sal') : 'agua'
    return { correcta, explicacion: `Del otro lado salieron ${gramos(agua)} de agua con <b>${gramos(sal)} de sal disuelta</b>${av(` (iones de menos de 1 nm, miles de veces más chicos que el poro de ${num(PORO_FILTRO_MM, 2)} mm)`)}. La sal pasa el filtro: formó una <b>solución</b>, no un sólido suspendido. Para separarla hay que evaporar o destilar el agua.` }
  },
}

const preguntaSobresaturada: Pregunta = {
  texto: `El agua disuelve ${num(ESPECIES.sal.solubilidad, 0)} g de sal cada 100 mL. Si hay ${num(SAL_SOBRESATURADA_G, 0)} g, ¿qué atrapa el filtro?`,
  opciones: [
    { valor: 'nada', texto: 'Nada: toda la sal pasa' },
    { valor: 'todo', texto: 'Toda la sal' },
    { valor: 'exceso', texto: 'Solo la sal que no se pudo disolver' },
  ],
  resolver: (c) => {
    const { corrida, lectura } = resultadoFinal(c)
    const total = deEspecie('sal', corrida.porciones, corrida.porciones.map((p) => p.masa))
    const atrapada = deEspecie('sal', corrida.porciones, lectura.queda)
    const correcta = atrapada > 0.9 * total ? 'todo' : atrapada < 1 ? 'nada' : 'exceso'
    return { correcta, explicacion: `El filtro atrapó ${gramos(atrapada)} de sal: los cristales de sobra, que son granos de ${num(ESPECIES.sal.tamanoMm, 1)} mm. Los otros ${gramos(total - atrapada)} están disueltos y pasaron con el agua. Una solución saturada sigue siendo una solución.` }
  },
}

const VERBO: Record<MetodoId, (mezcla: string, c: Config) => string> = {
  tamiz: (m) => `Pasás ${m} por el tamiz`,
  filtro: (m) => `Filtrás ${m} con papel de filtro`,
  decantacion: (m) => `Ponés ${m} en la ampolla de decantación`,
  destilacion: (m, c) => `Destilás ${m} con el mechero a ${num(c.tMechero, 0)} °C`,
  iman: (m) => `Acercás un imán a ${m}`,
}

const RESPUESTAS: Record<Veredicto, string> = { funciona: 'Sí, quedan bien separados', parcial: 'Solo en parte', no: 'No, no los separa' }

const preguntaGeneral = (c: Config): Pregunta => ({
  texto: `${VERBO[c.metodo](mezclaDe(c.mezcla).nombre.toLowerCase(), c)}. ¿Se separan los componentes?`,
  opciones: (Object.keys(RESPUESTAS) as Veredicto[]).map((v) => ({ valor: v, texto: RESPUESTAS[v] })),
  resolver: (cfg) => {
    const { corrida, lectura, veredicto } = resultadoFinal(cfg)
    return { correcta: veredicto, explicacion: `Pureza ${num(lectura.pureza ?? 0, 0)} %. ${explicacion(corrida, lectura)}` }
  },
})

/** La pregunta que corresponde a lo que se está probando. Filtrar agua salada es la idea errónea clásica. */
export function preguntaPara(c: Config): Pregunta {
  if (c.mezcla === 'agua-sal' && c.metodo === 'filtro') return c.sobresaturar ? preguntaSobresaturada : preguntaFiltroConSal
  return preguntaGeneral(c)
}

