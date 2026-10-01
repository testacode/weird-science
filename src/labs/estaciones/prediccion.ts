// Preguntas de "Predecí antes de correr". La respuesta sale del modelo, no está escrita a mano.

import { av } from '../../ui/avanzado'
import type { Opcion } from '../../ui/componentes'
import { num } from './contenido'
import {
  CIUDADES, D_PERIHELIO, NOMBRE_ESTACION, diaClave, fecha, orbita, resumen, type Resumen,
} from './model'

export type Respuesta = 'cerca' | 'alto' | 'emite' | 'verano' | 'invierno' | 'misma' | 'iguales' | 'sin' | 'distancia'

export interface Pregunta {
  texto: string
  opciones: Opcion<Respuesta>[]
  /** Día del año en que arranca el recorrido y día en que se revela la respuesta. */
  inicio: number
  revela: number
  resolver: (eps: number) => { correcta: Respuesta; explicacion: string }
}

const BSAS = CIUDADES['buenos-aires']
const MADRID = CIUDADES.madrid
const B = (d: number, eps: number) => resumen(d, BSAS, eps)
const grados = (n: number) => `${num(n, 1)}°`
const detalle = (r: Resumen) => `el Sol llega a <b>${grados(r.altura)}</b> y el día dura <b>${num(r.horas, 1)} h</b>`
const pctDistancia = (rLejos: number, rCerca: number) => ((rLejos / rCerca) ** 2 - 1) * 100

const SOLSTICIO_JUNIO = diaClave('solsticio-junio')
const SOLSTICIO_DICIEMBRE = diaClave('solsticio-diciembre')

const PREGUNTA_VERANO: Pregunta = {
  texto: 'En Buenos Aires hace mucho más calor en diciembre que en junio. ¿Por qué?',
  opciones: [
    { valor: 'cerca', texto: 'Porque en diciembre la Tierra está más cerca del Sol' },
    { valor: 'alto', texto: 'Porque el Sol está más alto y hay más horas de luz' },
    { valor: 'emite', texto: 'Porque el Sol emite más energía en esa época' },
  ],
  inicio: SOLSTICIO_JUNIO,
  revela: SOLSTICIO_DICIEMBRE,
  resolver: (eps) => {
    const jun = B(SOLSTICIO_JUNIO, eps)
    const dic = B(SOLSTICIO_DICIEMBRE, eps)
    const sol = (r: Resumen) => Math.max(0, Math.sin((r.altura * Math.PI) / 180)) * r.horas
    const factorSol = sol(dic) / sol(jun)
    const factorDistancia = (jun.distancia / dic.distancia) ** 2
    const correcta: Respuesta = factorSol > factorDistancia ? 'alto' : 'cerca'
    const comparacion = `En diciembre ${detalle(dic)}; en junio, ${detalle(jun)}. Eso hace que cada m² reciba <b>×${num(factorSol, 1)}</b> más energía. La distancia (${num(dic.distancia, 1)} M km en diciembre contra ${num(jun.distancia, 1)} en junio) suma <b>×${num(factorDistancia, 2)}</b>.`
    return {
      correcta,
      explicacion: correcta === 'alto'
        ? `${comparacion} La distancia casi no cuenta. Y en Madrid, el mismo diciembre es invierno: no puede ser la causa.${av(' El Sol no cambia: su energía es la misma todo el año.')}`
        : `${comparacion} Con un eje tan poco inclinado, la distancia pesa más que la altura del Sol.`,
    }
  },
}

const PREGUNTA_ENERO: Pregunta = {
  texto: `El ${fecha(D_PERIHELIO).larga} la Tierra está lo más cerca del Sol de todo el año. ¿Qué estación hay en Madrid?`,
  opciones: [
    { valor: 'verano', texto: 'Verano: está más cerca y recibe más calor' },
    { valor: 'invierno', texto: 'Invierno: el Sol está bajo y los días son cortos' },
    { valor: 'misma', texto: 'La misma que en Buenos Aires: las estaciones son iguales en todo el planeta' },
  ],
  inicio: diaClave('equinoccio-septiembre'),
  revela: D_PERIHELIO,
  resolver: (eps) => {
    const mad = resumen(D_PERIHELIO, MADRID, eps)
    const bsas = B(D_PERIHELIO, eps)
    const correcta: Respuesta = mad.estacion === bsas.estacion ? 'misma' : mad.estacion === 'verano' ? 'verano' : 'invierno'
    const nombre = (r: Resumen) => (r.estacion === 'sin' ? 'sin estaciones' : NOMBRE_ESTACION[r.estacion].toLowerCase())
    if (bsas.estacion === 'sin') {
      return {
        correcta,
        explicacion: `El ${fecha(D_PERIHELIO).larga} la Tierra está en el perihelio (<b>${num(orbita(D_PERIHELIO).distancia, 1)} M km</b>), pero con el eje casi derecho no hay estaciones marcadas: en Madrid ${detalle(mad)} y en Buenos Aires, ${detalle(bsas)}.`,
      }
    }
    return {
      correcta,
      explicacion: `El ${fecha(D_PERIHELIO).larga} la Tierra está en el perihelio: a <b>${num(orbita(D_PERIHELIO).distancia, 1)} M km</b>, lo más cerca del año. Y en Madrid es <b>${nombre(mad)}</b> (${detalle(mad)}), mientras que en Buenos Aires es <b>${nombre(bsas)}</b> (${detalle(bsas)}). Si las estaciones dependieran de la distancia, los dos estarían igual.`,
    }
  },
}

const PREGUNTA_SIN_EJE: Pregunta = {
  texto: 'Si el eje de la Tierra no estuviera inclinado, ¿qué pasaría con las estaciones?',
  opciones: [
    { valor: 'iguales', texto: 'Habría estaciones igual' },
    { valor: 'sin', texto: 'No habría: el Sol pasaría siempre a la misma altura y los días durarían lo mismo' },
    { valor: 'distancia', texto: 'Sería verano en todo el planeta cuando la Tierra pasa más cerca del Sol' },
  ],
  inicio: SOLSTICIO_JUNIO,
  revela: SOLSTICIO_DICIEMBRE,
  // Solo se hace con el eje exactamente derecho (interruptor "Eje sin inclinación"): ahí no hay estaciones.
  resolver: (eps) => {
    const jun = B(SOLSTICIO_JUNIO, eps)
    const dic = B(SOLSTICIO_DICIEMBRE, eps)
    return {
      correcta: 'sin',
      explicacion: `Con el eje derecho, en Buenos Aires en junio ${detalle(jun)}, y en diciembre, ${detalle(dic)}. No cambia nada: no hay estaciones. Lo único que sigue cambiando es la distancia (de ${num(dic.distancia, 1)} a ${num(jun.distancia, 1)} M km), que mueve la energía solo un ${num(pctDistancia(jun.distancia, dic.distancia), 0)} %: no alcanza para hacer estaciones.`,
    }
  },
}

/** La pregunta que corresponde a lo que el usuario rompió. */
export function preguntaPara(eps: number, idea: boolean): Pregunta {
  if (eps === 0) return PREGUNTA_SIN_EJE
  return idea ? PREGUNTA_ENERO : PREGUNTA_VERANO
}
