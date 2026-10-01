// Preguntas de "Predecí antes de correr". La respuesta sale del modelo (se calienta una muestra
// con `paso` y se mide), no está escrita a mano.

import { av } from '../../ui/avanzado'
import type { Opcion } from '../../ui/componentes'
import { MASA_G, simularMeseta, type Config, type Lectura, type Sustancia } from './model'
import { num } from './contenido'

export type Respuesta = 'sube' | 'igual' | 'baja'

export interface ContextoPrediccion {
  sus: Sustancia
  config: Config
  /** W, mayor que cero: la potencia con la que se calienta la muestra de referencia. */
  potencia: number
}

export interface Pregunta {
  texto: string
  opciones: Opcion<Respuesta>[]
  /** La predicción se revela cuando el experimento llega a este punto. */
  listo: (l: Lectura) => boolean
  resolver: (c: ContextoPrediccion) => { correcta: Respuesta; explicacion: string }
}

/** Cambio de temperatura (°C) por debajo del cual se considera "igual". */
const TOLERANCIA = 0.5

const preguntaFusion = (sus: Sustancia, config: Config): Pregunta => ({
  texto: config.latente
    ? `Mientras ${sus.solido} se derrite, ¿la temperatura sube, queda igual o baja?`
    : `Si derretir ${sus.solido} no necesitara calor latente, al llegar a ${num(sus.tFusion)} °C la temperatura…`,
  opciones: config.latente
    ? [{ valor: 'sube', texto: 'Sube' }, { valor: 'igual', texto: 'Queda igual' }, { valor: 'baja', texto: 'Baja' }]
    : [
        { valor: 'sube', texto: 'Sigue subiendo sin frenarse' },
        { valor: 'igual', texto: 'Se queda clavada un rato' },
        { valor: 'baja', texto: 'Baja un poco' },
      ],
  listo: (l) => l.fase === 'liquido' || l.fase === 'ebullicion' || l.fase === 'gas',
  resolver: ({ sus: s, config: c, potencia }) => {
    const m = simularMeseta(s, c, potencia, 'fusion')
    const correcta: Respuesta = m.duracion === 0 ? 'sube' : m.tMax - m.tMin < TOLERANCIA ? 'igual' : m.tMax > m.tMin ? 'sube' : 'baja'
    const explicacion =
      correcta === 'igual'
        ? `Durante la fusión la temperatura quedó en <b>${num(m.tMin)} °C</b> durante ${num(m.duracion, 0)} s. Derretir ${MASA_G} g necesita ${num((MASA_G * s.calorFusion) / 1000)} kJ y toda esa energía se gasta en romper la red${av(` (Q = m · L = ${MASA_G} g · ${s.calorFusion} J/g)`)}, no en calentar.`
        : `Sin calor latente la red se rompe sin gastar energía: no hay meseta y la temperatura <b>sigue subiendo</b> al pasar por ${num(s.tFusion)} °C. Con el calor latente real habría quedado clavada ${num(((MASA_G * s.calorFusion) / potencia), 0)} s${av(` (Q = m · L = ${MASA_G} g · ${s.calorFusion} J/g)`)}.`
    return { correcta, explicacion }
  },
})

const preguntaTapa = (sus: Sustancia): Pregunta => ({
  texto: `Con la tapa puesta (como una olla a presión), ¿a qué temperatura hierve ${sus.liquido}?`,
  opciones: [
    { valor: 'sube', texto: `Más arriba de ${num(sus.tEbullicion)} °C` },
    { valor: 'igual', texto: `En ${num(sus.tEbullicion)} °C, igual que sin tapa` },
    { valor: 'baja', texto: `Más abajo de ${num(sus.tEbullicion)} °C` },
  ],
  listo: (l) => l.fase === 'ebullicion' || l.fase === 'gas',
  resolver: ({ sus: s, config: c, potencia }) => {
    const con = simularMeseta(s, { ...c, tapa: true }, potencia, 'ebullicion')
    const sin = simularMeseta(s, { ...c, tapa: false }, potencia, 'ebullicion')
    const dif = con.tMax - sin.tMax
    const correcta: Respuesta = Math.abs(dif) < TOLERANCIA ? 'igual' : dif > 0 ? 'sube' : 'baja'
    const explicacion = `Hirvió a <b>${num(con.tMax)} °C</b> en vez de ${num(sin.tMax)} °C. La tapa no deja escapar el vapor, la presión sube hasta 2 atm y hace falta más temperatura para que las partículas se separen${av(' (Clausius-Clapeyron)')}.`
    return { correcta, explicacion }
  },
})

/** La pregunta que corresponde a lo que el usuario rompió. Sin calor latente tiene prioridad sobre la tapa. */
export function preguntaPara(sus: Sustancia, config: Config): Pregunta {
  if (config.tapa && config.latente) return preguntaTapa(sus)
  return preguntaFusion(sus, config)
}
