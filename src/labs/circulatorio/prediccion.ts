// Preguntas de "Predecí antes de correr". Se hacen ANTES de aplicar el cambio y la respuesta sale del modelo.

import { av } from '../../ui/avanzado'
import type { Opcion } from '../../ui/componentes'
import { num } from './contenido'
import { ACTIVIDADES, EXTRACCION_MAXIMA, derivados, gradoFuga, tamanoAgujero, type Config, type Estado } from './model'

export type Respuesta = 'poco' | 'todo' | 'mucho' | 'alcanza' | 'falta_algo' | 'falta_mucho' | 'nada' | 'suma' | 'divide' | 'baja' | 'igual' | 'sube'

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

const d = (f: Foto) => derivados(f.c, f.e)
const pct = (x: number) => `${num(x * 100, 0)} %`

/** La pregunta con la que arranca el lab: cuánta sangre bombea el corazón en reposo (se compara en escala logarítmica con las tres opciones). */
export const PREGUNTA_INICIAL: Pregunta = {
  texto: 'En reposo el corazón late unas 70 veces por minuto. ¿Cuánta sangre manda al cuerpo en un minuto?',
  opciones: [
    { valor: 'poco', texto: 'Medio litro: una botellita' },
    { valor: 'todo', texto: 'Unos 5 litros: toda la sangre del cuerpo' },
    { valor: 'mucho', texto: 'Unos 50 litros: una bañera' },
  ],
  ventana: 15,
  resolver: (_antes, despues) => {
    const x = d(despues)
    const candidatos: [Respuesta, number][] = [['poco', 0.5], ['todo', 5], ['mucho', 50]]
    const correcta = candidatos.reduce((a, b) => (Math.abs(Math.log(x.cuerpo / b[1])) < Math.abs(Math.log(x.cuerpo / a[1])) ? b : a))[0]
    return {
      correcta,
      explicacion: `Cada latido manda <b>${num(despues.c.volumen, 0)} mL</b> y late ${num(despues.c.frecuencia, 0)} veces por minuto: <b>${num(x.cuerpo, 1)} L por minuto</b>. Es casi toda la sangre que tiene una persona (≈ 5 L): en reposo la sangre completa pasa por el corazón una vez por minuto.${av(' Al correr el gasto sube hasta unos 20–25 L/min.')}`,
    }
  },
}

const CORRER = (c: Config, e: Estado): Pregunta => ({
  texto: `Tu corazón late ${num(c.frecuencia, 0)} veces por minuto y manda ${num(c.volumen, 0)} mL cada vez (${num(derivados(c, e).cuerpo, 1)} L/min al cuerpo). Si salís a correr sin que el corazón cambie, ¿alcanza la sangre para el oxígeno que piden los músculos?`,
  opciones: [
    { valor: 'alcanza', texto: 'Alcanza: los músculos sacan más O₂ de la misma sangre' },
    { valor: 'falta_algo', texto: 'Falta algo: haría falta hasta el doble de sangre' },
    { valor: 'falta_mucho', texto: 'Falta mucho: haría falta más del doble' },
  ],
  ventana: 30,
  resolver: (_antes, despues) => {
    const x = d(despues)
    const razon = x.necesario / x.cuerpo
    const correcta: Respuesta = razon <= 1 ? 'alcanza' : razon <= 2 ? 'falta_algo' : 'falta_mucho'
    const hecho = `Al correr el cuerpo pide <b>${num(x.vo2, 0)} mL</b> de O₂ por minuto (en reposo, ${ACTIVIDADES.reposo.vo2}). Los músculos sí sacan más de cada gota (del 25 % de reposo hasta ≈ ${pct(EXTRACCION_MAXIMA)}), pero con ${num(x.cuerpo, 1)} L/min la sangre entrega como mucho <b>${num(x.entrega, 0)} mL</b> de O₂ por minuto.`
    const causa = correcta === 'alcanza'
      ? ' Ya movías suficiente sangre, así que alcanza.'
      : ` Hace falta que lleguen unos <b>${num(x.necesario, 1)} L/min</b>: ${num(razon, 1)} veces lo que llega. Por eso al correr el corazón late más rápido y más fuerte.`
    return { correcta, explicacion: hecho + causa }
  },
})

/** mL por latido que tendría que expulsar el ventrículo con este defecto para que al cuerpo llegue lo mismo que sin él. */
function volumenParaCompensar(c: Config): number {
  const sano = derivados({ ...c, defecto: 'ninguno' }, { t: 0, svo2: 0 }).cuerpo
  const porMl = derivados({ ...c, volumen: 1 }, { t: 0, svo2: 0 }).cuerpo
  return sano / porMl
}

const VALVULA = (c: Config): Pregunta => {
  const fuga = c.gravedad
  return {
    texto: `Una válvula del corazón no cierra bien y el ${pct(fuga)} de la sangre de cada latido vuelve para atrás (fuga ${gradoFuga(fuga)}). ¿Cuánto más tiene que bombear el ventrículo para que al cuerpo llegue lo mismo que antes?`,
    opciones: [
      { valor: 'nada', texto: 'Nada: late igual y alcanza' },
      { valor: 'suma', texto: `Un ${pct(fuga)} más: lo que se devuelve` },
      { valor: 'divide', texto: `Un ${pct(1 / (1 - fuga) - 1)} más` },
    ],
    ventana: 20,
    resolver: (_antes, despues) => {
      const necesario = volumenParaCompensar(despues.c) / despues.c.volumen
      const rf = despues.c.gravedad
      const candidatos: [Respuesta, number][] = [['nada', 1], ['suma', 1 + rf], ['divide', 1 / (1 - rf)]]
      const correcta = candidatos.reduce((a, b) => (Math.abs(necesario - b[1]) < Math.abs(necesario - a[1]) ? b : a))[0]
      const x = d(despues)
      return {
        correcta,
        explicacion: `Si se devuelve el ${pct(rf)}, al cuerpo llega solo el <b>${pct(1 - rf)}</b> de cada latido (${num(x.cuerpo, 1)} de los ${num(x.bombea, 1)} L/min que bombea). Para que llegue lo de antes hay que expulsar ${num(despues.c.volumen * necesario, 0)} mL en vez de ${num(despues.c.volumen, 0)}: un <b>${pct(necesario - 1)} más</b>. El porcentaje es de lo que se bombea, no de lo que llega, y ese trabajo extra agranda y cansa al ventrículo.`,
      }
    },
  }
}

const TABIQUE = (c: Config): Pregunta => ({
  texto: `Un agujero en el tabique deja pasar sangre entre los dos lados del corazón (el ${pct(c.gravedad)} de cada latido). ¿Qué le pasa al oxígeno de la sangre que sale hacia el cuerpo?`,
  opciones: [
    { valor: 'baja', texto: 'Baja: se mezcla sangre con y sin oxígeno' },
    { valor: 'igual', texto: 'Casi igual: sigue saliendo bien oxigenada' },
    { valor: 'sube', texto: 'Sube: la sangre pasa dos veces por los pulmones' },
  ],
  ventana: 20,
  resolver: (antes, despues) => {
    const a = d(antes)
    const x = d(despues)
    const cambio = x.satArterial - a.satArterial
    const correcta: Respuesta = Math.abs(cambio) < 0.02 ? 'igual' : cambio < 0 ? 'baja' : 'sube'
    return {
      correcta,
      explicacion: `La sangre que sale al cuerpo sigue con <b>${pct(x.satArterial)}</b> de saturación. El lado izquierdo tiene mucha más presión (≈ 120 mmHg contra ≈ 20), así que el agujero manda sangre <i>ya oxigenada</i> hacia la derecha, y vuelve a los pulmones sin ir al cuerpo. Lo que cambia: los pulmones reciben <b>${num(x.pulmones, 1)} L/min</b> y el cuerpo ${num(x.cuerpo, 1)} (Qp:Qs de ${num(x.qpqs, 1)}:1, agujero ${tamanoAgujero(x.qpqs)}), y la sangre que va a los pulmones está más oxigenada.${av(' Si los pulmones se dañan y la presión de la derecha supera a la izquierda, el paso se invierte (síndrome de Eisenmenger) y entonces sí llega sangre pobre en O₂ al cuerpo.')}`,
    }
  },
})

/** La pregunta que corresponde al cambio que se quiere hacer, o `null` si no hay nada que predecir. */
export function preguntaPara(actual: Foto, nueva: Config): Pregunta | null {
  if (actual.c.actividad !== 'correr' && nueva.actividad === 'correr') return CORRER(actual.c, actual.e)
  if (actual.c.defecto !== 'valvula' && nueva.defecto === 'valvula') return VALVULA(nueva)
  if (actual.c.defecto !== 'tabique' && nueva.defecto === 'tabique') return TABIQUE(nueva)
  return null
}
