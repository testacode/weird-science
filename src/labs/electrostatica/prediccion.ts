// Preguntas de "Predecí antes de correr". Se hacen ANTES de cambiar nada.
// Las tres tienen una respuesta que el modelo no puede cambiar (la carga se conserva, F ∝ 1/d², un neutro se polariza):
// no hay una cuenta que finja decidir. La lección va en el texto, el reveal muestra los números del momento y el orden de las opciones se mezcla.

import { av } from '../../ui/avanzado'
import type { Opcion } from '../../ui/componentes'
import { cargaTexto, cientifica, conSigno, de, fuerzaTexto, mayus, neg, nombreDe, num, pos } from './contenido'
import { DIST_PREGUNTA_PAPEL, MASA_RELATIVA, RANGOS, electrones, polaridad, resolver, type Config } from './model'

export type Respuesta = 'opuestas' | 'solo-uno' | 'mismas' | 'mitad' | 'cuarto' | 'octavo' | 'nada' | 'saltan' | 'se-alejan'
export type Intencion = 'frotar' | 'duplicar' | 'acercar'

export interface Pregunta {
  texto: string
  opciones: Opcion<Respuesta>[]
  /** Distancia (cm) a la que queda el experimento al responder. */
  distancia?: number
  resolver: () => { correcta: Respuesta; explicacion: string }
}

function mezclar<T>(lista: T[]): T[] {
  const r = [...lista]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

function preguntaFrotar(c: Config): Pregunta {
  const { qa, qb } = resolver({ ...c, frote: 1 })
  const { negativo, positivo } = polaridad(c)
  const q = { a: qa, b: qb }
  return {
    texto: `Vas a frotar ${nombreDe(c, 'a')} con ${nombreDe(c, 'b')}. Cuando termines, ¿cómo quedan las cargas?`,
    opciones: mezclar<Opcion<Respuesta>>([
      { valor: 'opuestas', texto: 'Uno con carga + y el otro con carga −, en la misma cantidad' },
      { valor: 'solo-uno', texto: `Solo ${nombreDe(c, 'a')} se carga: el frotamiento le crea la carga` },
      { valor: 'mismas', texto: 'Los dos con carga del mismo signo' },
    ]),
    resolver: () => ({
      correcta: 'opuestas',
      explicacion: `${conSigno(mayus(nombreDe(c, negativo)), q[negativo])} se quedó con ${cientifica(electrones(q[negativo]))} electrones (${conSigno(cargaTexto(q[negativo]), q[negativo])}) y ${conSigno(nombreDe(c, positivo), q[positivo])} los perdió (${conSigno(cargaTexto(q[positivo]), q[positivo])}). Sumadas, las dos cargas dan <b>${cargaTexto(qa + qb)}</b>: el frotamiento no crea carga, la pasa de un objeto al otro (la carga total se conserva).${av(` Por eso ${neg} y ${pos} siempre aparecen juntas y en la misma cantidad.`)}`,
    }),
  }
}

function preguntaDuplicar(c: Config): Pregunta {
  const dist = c.dist.cargas
  const antes = resolver(c).fuerza
  return {
    texto: `Los objetos están a ${num(dist, 1)} cm y ${antes < 0 ? 'se atraen' : 'se repelen'} con ${fuerzaTexto(antes)}. Si los alejás al doble (${num(dist * 2, 1)} cm), ¿cuánta fuerza queda?`,
    opciones: mezclar<Opcion<Respuesta>>([
      { valor: 'mitad', texto: 'La mitad' },
      { valor: 'cuarto', texto: 'Un cuarto' },
      { valor: 'octavo', texto: 'Un octavo' },
    ]),
    distancia: dist * 2,
    resolver: () => {
      const despues = resolver(c, dist * 2).fuerza
      return {
        correcta: 'cuarto',
        explicacion: `La fuerza pasó de <b>${fuerzaTexto(antes)}</b> a <b>${fuerzaTexto(despues)}</b>: quedó el <b>${num((despues / antes) * 100, 0)} %</b>. Con el doble de distancia, la fuerza se divide por 2² = 4: cae con el cuadrado de la distancia, no con la distancia.${av(' Es la ley de Coulomb, F = k·q₁·q₂ / d². Con el triple de distancia queda 1/9.')}`,
      }
    },
  }
}

function preguntaPapelito(c: Config): Pregunta {
  const sonda = nombreDe(c, c.cual)
  return {
    texto: `${mayus(sonda)} ya está cargado y los papelitos no tienen carga. Lo acercás a ${num(DIST_PREGUNTA_PAPEL, 1)} cm de ellos. ¿Qué hacen los papelitos?`,
    opciones: mezclar<Opcion<Respuesta>>([
      { valor: 'nada', texto: 'Nada: sin carga, no lo sienten' },
      { valor: 'saltan', texto: 'Saltan hacia el objeto' },
      { valor: 'se-alejan', texto: 'Se alejan del objeto' },
    ]),
    distancia: DIST_PREGUNTA_PAPEL,
    resolver: () => {
      const r = resolver(c, DIST_PREGUNTA_PAPEL)
      return {
        correcta: 'saltan',
        explicacion: `Un papelito neutro <b>sí</b> es atraído: el campo ${de(sonda)} le separa las cargas (se polariza) y el lado cercano, de signo opuesto, tira más fuerte que el lejano. Acá la fuerza sobre cada uno es <b>${fuerzaTexto(r.fuerzaPapel)}</b>, ${num(r.vecesPeso, 0)} veces su peso.${av(' Neutro no es lo mismo que sin cargas: tiene las dos, solo que en igual cantidad.')}`,
      }
    },
  }
}

/** La pregunta que corresponde a la acción que se quiere hacer, o `null` si no hay nada que predecir. `papelesPegados`: ya hay papelitos pegados al objeto. */
export function preguntaPara(c: Config, intencion: Intencion, papelesPegados: boolean): Pregunta | null {
  if (intencion === 'frotar') return c.frote === 0 ? preguntaFrotar(c) : null
  if (c.frote === 0) return null
  if (intencion === 'duplicar') return c.experimento === 'cargas' && c.dist.cargas * 2 <= RANGOS.cargas.max ? preguntaDuplicar(c) : null
  // Papelitos en reposo: la atracción queda por debajo de lo que necesita el más liviano para despegar (con margen), y el objeto está lejos.
  const quietos = !papelesPegados && resolver(c).vecesPeso < MASA_RELATIVA.min * 0.75 && c.dist.papelitos > DIST_PREGUNTA_PAPEL
  return c.experimento === 'papelitos' && quietos ? preguntaPapelito(c) : null
}
