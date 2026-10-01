// Preguntas de "Predecí antes de correr". Se hacen ANTES de aplicar el cambio y la respuesta sale del modelo.

import { av } from '../../ui/avanzado'
import type { Opcion } from '../../ui/componentes'
import { cm, kms, num } from './contenido'
import {
  N_AIRE, esAire, indice, nombreMedio, sinDesvio, sinEngano, trazarEspejo, trazarLapiz, trazarRefraccion, velocidad, type Config,
} from './model'

export type Respuesta = 'igual' | 'doble' | 'mitad' | 'cierra' | 'abre' | 'sale' | 'parte' | 'toda' | 'real' | 'poco' | 'mucho'

export interface Pregunta {
  texto: string
  opciones: Opcion<Respuesta>[]
  /** Calcula con el modelo cuál era la respuesta correcta; usa solo las configuraciones con las que se armó. */
  resolver: () => { correcta: Respuesta; explicacion: string }
}

/** Con más de esta fracción de luz reflejada (y sin llegar al 100 %), "una parte sale y otra se refleja". */
const REFLEJO_NOTABLE = 0.25
/** Fracción de la profundidad real por debajo de la cual el lápiz se ve "bastante más cerca". */
const MUY_CERCA = 2 / 3

const g = (n: number) => `${num(n, Math.abs(n - Math.round(n)) < 0.05 ? 0 : 1)}°`

function preguntaEspejo(antes: Config, nueva: Config): Pregunta {
  const giro = nueva.espejo
  return {
    texto: `El láser le llega al espejo con ${g(antes.angulo)} desde la normal. Si giro el espejo ${g(giro)}, ¿cuánto gira el rayo reflejado?`,
    opciones: [
      { valor: 'igual', texto: `Lo mismo: ${g(giro)}` },
      { valor: 'doble', texto: `El doble: ${g(giro * 2)}` },
      { valor: 'mitad', texto: `La mitad: ${g(giro / 2)}` },
    ],
    resolver: () => {
      const d = trazarEspejo(nueva)
      // La opción más cercana al cociente continuo (rayo / espejo).
      const cociente = d.giroRayo / giro
      const correcta: Respuesta = cociente > 1.5 ? 'doble' : cociente < 0.75 ? 'mitad' : 'igual'
      return {
        correcta,
        explicacion: `El espejo giró <b>${g(giro)}</b> y el rayo reflejado giró <b>${g(d.giroRayo)}</b>. Al girar el espejo se mueve la normal, y el rayo se mueve con ella: se corre una vez porque cambia el ángulo de incidencia y otra porque cambia el de reflexión.${av(' Por eso un movimiento chico del espejo se nota tanto en un punto lejano: el rayo se mueve el doble.')}`,
      }
    },
  }
}

function preguntaEntra(nueva: Config): Pregunta {
  const medio = nombreMedio(nueva).toLowerCase()
  const n = indice(nueva)
  const texto = esAire(nueva)
    ? `Ahora el medio tiene el índice del aire (n = ${num(n, 4)}): es como si no hubiera nada. El láser llega con ${g(nueva.angulo)} desde la normal. ¿Qué hace el rayo al pasar?`
    : `El láser llega al ${medio} (n = ${num(n, 3)}) con ${g(nueva.angulo)} desde la normal. Adentro, ¿cómo sigue el rayo?`
  return {
    texto,
    opciones: [
      { valor: 'igual', texto: 'Sigue derecho, sin doblarse' },
      { valor: 'cierra', texto: 'Se dobla hacia la normal (el ángulo se achica)' },
      { valor: 'abre', texto: 'Se dobla alejándose de la normal (el ángulo crece)' },
    ],
    resolver: () => {
      const d = trazarRefraccion(nueva)
      const adentro = d.refraccion ?? d.incidencia
      // El desvío sale del cociente de índices (sen θ₂ / sen θ₁ = n₁ / n₂), no de cuántos grados cambió el ángulo.
      const correcta: Respuesta = sinDesvio(d.n1, d.n2) ? 'igual' : d.n2 > d.n1 ? 'cierra' : 'abre'
      const hecho = `Pasó de <b>${g(d.incidencia)}</b> a <b>${g(adentro)}</b>.`
      const causa = correcta === 'igual'
        ? ' El medio tiene casi el mismo índice que el aire: la luz no cambia de velocidad y no hay desvío.'
        : ` En un medio con más índice la luz va más lenta (${kms(velocidad(n))} contra ${kms(velocidad(N_AIRE))} en el aire) y se dobla hacia la normal.`
      return { correcta, explicacion: `${hecho}${causa}${av(` n₁ · sen θ₁ = n₂ · sen θ₂ → sen θ₂ = ${num(N_AIRE, 4)} · sen ${g(d.incidencia)} / ${num(n, 4)}.`)}` }
    },
  }
}

function preguntaAdentro(nueva: Config): Pregunta {
  const medio = nombreMedio(nueva).toLowerCase()
  return {
    texto: `Metemos el láser adentro del ${medio} y lo dejamos apuntando a la superficie con ${g(nueva.angulo)} desde la normal (el que tenías puesto). Cuando la luz llega al aire, ¿qué pasa?`,
    opciones: [
      { valor: 'sale', texto: 'Sale casi toda al aire' },
      { valor: 'parte', texto: 'Una parte sale y otra se refleja' },
      { valor: 'toda', texto: 'No sale nada: se refleja toda' },
    ],
    resolver: () => {
      const d = trazarRefraccion(nueva)
      const correcta: Respuesta = d.refraccion === null ? 'toda' : d.reflectancia >= REFLEJO_NOTABLE ? 'parte' : 'sale'
      const critico = d.critico ?? 0
      const explicacion = correcta === 'toda'
        ? `No sale nada: <b>${g(d.incidencia)}</b> es más que el ángulo crítico (<b>${g(critico)}</b>), así que no existe ángulo de refracción y se refleja el 100 %. Es la reflexión total interna, la que mantiene la luz adentro de una fibra óptica.${av(` Ángulo crítico = asen(n_aire / n) = asen(${num(N_AIRE, 4)} / ${num(indice(nueva), 4)}).`)}`
        : `Todavía sale: <b>${g(d.incidencia)}</b> es menos que el ángulo crítico (<b>${g(critico)}</b>). Sale abriéndose a ${g(d.refraccion ?? 0)} y se refleja el ${num(d.reflectancia * 100, 0)} % de la luz. Probá abrir el ángulo hasta pasar el crítico.`
      return { correcta, explicacion }
    },
  }
}

function preguntaLapiz(nueva: Config): Pregunta {
  const medio = nombreMedio(nueva).toLowerCase()
  const real = trazarLapiz(nueva).profundidad
  return {
    texto: `Hay un lápiz clavado en el ${medio} (n = ${num(indice(nueva), 3)}) y lo mirás con ${g(nueva.ojo)} desde la vertical. La punta está a ${cm(real)} de la superficie. ¿A qué profundidad la ves?`,
    opciones: [
      { valor: 'real', texto: `Donde está: a ${cm(real)}` },
      { valor: 'poco', texto: 'Un poco más cerca de la superficie (más de 2/3 de la profundidad real)' },
      { valor: 'mucho', texto: 'Bastante más cerca (menos de 2/3 de la profundidad real)' },
    ],
    resolver: () => {
      const d = trazarLapiz(nueva)
      const correcta: Respuesta = sinEngano(d) ? 'real' : d.factor > MUY_CERCA ? 'poco' : 'mucho'
      const causa = correcta === 'real'
        ? ' La luz no se desvía al salir de un medio con el índice del aire, así que no hay engaño.'
        : ' La luz que sale de la punta se dobla al pasar al aire y el ojo, que supone que la luz viajó derecho, la ve más cerca de la superficie. Cuanto más se mira de costado, más cerca parece; por eso una pileta parece menos profunda de lo que es.'
      return { correcta, explicacion: `La punta está a <b>${cm(d.profundidad)}</b> y se ve a <b>${cm(d.aparente)}</b> (el ${num(d.factor * 100, 0)} % de su profundidad).${causa}${av(` Profundidad aparente = real · tan β / tan α = ${num(d.factor, 2)} × real; mirando de arriba, n_aire / n.`)}` }
    },
  }
}

/** La pregunta que corresponde al cambio que se quiere hacer, o `null` si no hay nada que predecir. */
export function preguntaPara(antes: Config, nueva: Config): Pregunta | null {
  if (antes.escena === 'espejo' && nueva.escena === 'espejo' && antes.espejo === 0 && nueva.espejo > 0) return preguntaEspejo(antes, nueva)
  if (nueva.escena === 'lapiz' && (antes.escena !== 'lapiz' || antes.medio !== nueva.medio) && nueva.medio !== 'inventado') return preguntaLapiz(nueva)
  if (antes.escena !== 'refraccion' || nueva.escena !== 'refraccion') return null
  if (antes.desde === 'aire' && nueva.desde === 'medio' && !esAire(nueva)) return preguntaAdentro(nueva)
  // Con el láser de frente (0°) no hay desvío posible en ningún medio: no hay nada que predecir.
  if (antes.desde === 'aire' && nueva.desde === 'aire' && antes.medio !== nueva.medio && nueva.medio !== 'inventado' && nueva.angulo > 0) return preguntaEntra(nueva)
  return null
}
