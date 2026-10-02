// Preguntas de "Predecí antes de correr". Se hacen ANTES de gritar y la respuesta sale del modelo.
// Dos son constantes (la respuesta no puede variar con el modelo): se dejan honestas, con la lección en el texto, y se mezcla el orden de las opciones.
// La tercera ("¿siempre hay eco?") se resuelve con magnitudes continuas: tiempo de ida y vuelta contra 0,1 s y nivel del eco contra el ruido.

import { av } from '../../ui/avanzado'
import { mezclar } from '../../ui/azar'
import type { Opcion } from '../../ui/componentes'
import { numero } from '../../ui/formato'
import { UMBRAL, distanciaMinima, ms } from './contenido'
import { caida, clasificar, nivelEco, ruido, superficie, tiempoEco, type Config } from './model'

const num = numero

export type Tipo = 'mismo' | 'volumen' | 'eco'
export type Respuesta = 'mismo' | 'otro' | 'grave' | 'antes' | 'igual' | 'despues' | 'claro' | 'mezcla' | 'ausente'

/** Lo que la pregunta necesita para resolverse: se congela al preguntar. `previo` = el grito anterior (solo la pregunta del volumen). */
export interface Datos {
  tipo: Tipo
  config: Config
  previo?: { volumen: number; tiempo: number }
}

const el = (c: Config) => (c.superficie === 'fondo' ? 'el fondo del mar' : `la ${superficie(c.superficie).nombre.toLowerCase()}`)

/** Texto y opciones (en orden al azar) de la pregunta. */
export function armar(d: Datos): { texto: string; opciones: Opcion<Respuesta>[] } {
  const c = d.config
  const sonar = superficie(c.superficie).medio === 'agua'
  if (d.tipo === 'mismo') {
    return {
      texto: `${sonar ? 'Un barco manda un ping hacia' : 'Gritás una nota aguda frente a'} ${el(c)}, a ${num(c.distancia, 0)} m. ¿Qué es lo que vuelve?`,
      opciones: mezclar<Opcion<Respuesta>>([
        { valor: 'mismo', texto: 'El mismo sonido, rebotado: el mismo tono, pero más flojo' },
        { valor: 'otro', texto: 'Otro sonido: lo produce la superficie cuando le pega el mío' },
        { valor: 'grave', texto: 'El mismo sonido pero más grave: al rebotar pierde fuerza y baja el tono' },
      ]),
    }
  }
  if (d.tipo === 'volumen') {
    const p = d.previo!
    return {
      texto: `Tu grito anterior (${num(p.volumen, 0)} dB) tuvo su eco a los ${ms(p.tiempo)}. Ahora gritás más fuerte (${num(c.volumen, 0)} dB), con todo lo demás igual. ¿Cuándo vuelve el eco?`,
      opciones: mezclar<Opcion<Respuesta>>([
        { valor: 'antes', texto: 'Antes que la vez anterior' },
        { valor: 'igual', texto: 'Al mismo tiempo que la vez anterior' },
        { valor: 'despues', texto: 'Más tarde que la vez anterior' },
      ]),
    }
  }
  return {
    texto: `Gritás frente a ${el(c)}, a ${num(c.distancia, 0)} m. ¿Qué vas a oír?`,
    opciones: mezclar<Opcion<Respuesta>>([
      { valor: 'claro', texto: 'Un eco claro, separado de mi grito' },
      { valor: 'mezcla', texto: 'El eco se mezcla con mi voz: se oye una sola voz larga' },
      { valor: 'ausente', texto: 'Casi no vuelve nada' },
    ]),
  }
}

export function resolver(d: Datos): { correcta: Respuesta; explicacion: string } {
  const c = d.config
  const t = tiempoEco(c)
  const s = superficie(c.superficie)
  if (d.tipo === 'mismo') {
    return {
      correcta: 'mismo',
      explicacion: `Volvió el mismo sonido, con el mismo tono: la superficie no produce nada, solo lo refleja. Lo que cambió es la fuerza: sale a ${num(c.volumen, 0)} dB y vuelve a ${num(nivelEco(c), 0)} dB, ${num(caida(c), 0)} dB menos, porque el sonido se reparte en una esfera cada vez más grande y ${el(c)} devuelve el ${num((1 - s.alfa) * 100, 0)} % de la energía.${av(' No cambia el tono porque la superficie está quieta (si se moviera, habría efecto Doppler).')}`,
    }
  }
  if (d.tipo === 'volumen') {
    const p = d.previo!
    return {
      correcta: 'igual',
      explicacion: `Volvió a los <b>${ms(t)}</b>, igual que antes (${ms(p.tiempo)}). Cambió el nivel del eco, de ${num(p.volumen - caida(c), 0)} a ${num(nivelEco(c), 0)} dB, pero no el tiempo: depende de la distancia (${num(c.distancia, 0)} m) y del medio, no del volumen.${av(' t = 2d / v: ni la distancia ni v dependen de la amplitud.')}`,
    }
  }
  const correcta = clasificar(c)
  const dB = `${num(nivelEco(c), 0)} dB`
  const hecho: Record<typeof correcta, string> = {
    claro: `El eco tardó <b>${ms(t)}</b>, más de ${UMBRAL} s, y llegó a ${dB}, sobre el ruido de fondo (${num(ruido(c), 0)} dB): se oye aparte.`,
    mezcla: `El eco tardó solo <b>${ms(t)}</b>, menos de ${UMBRAL} s: se pega al grito y suena a una sola voz larga (reverberación). Para oírlo aparte hace falta estar a más de ${num(distanciaMinima(c), 1)} m de la superficie.`,
    ausente: `El eco llegó a <b>${dB}</b>, por debajo del ruido de fondo (${num(ruido(c), 0)} dB): casi no vuelve.${c.superficie === 'cortina' ? ` Una cortina absorbe el ${num(s.alfa * 100, 0)} % de la energía.` : ' El sonido se reparte en una esfera cada vez más grande.'}`,
  }
  return { correcta, explicacion: hecho[correcta] }
}
