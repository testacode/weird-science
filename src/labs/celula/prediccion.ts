// Preguntas de "Predecí antes de correr". La respuesta sale del modelo: se resuelve el equilibrio
// (o la rotura) y se mide el volumen final; no está escrita a mano.
import { av } from '../../ui/avanzado'
import type { Opcion } from '../../ui/componentes'
import { numero } from '../../ui/formato'
import { V_ROTURA, osmolaridad } from './constantes'
import { CELULAS, conPared, leer, mOsmInterior, pctDeRotura, simular, tonicidad, type Entorno, type Forma } from './model'

export type Respuesta = Forma | 'sal' | 'agua' | 'nada'

export interface Pregunta {
  texto: string
  opciones: Opcion<Respuesta>[]
  resolver: (ent: Entorno) => { correcta: Respuesta; explicacion: string }
}

const porcentaje = (pct: number) => `${numero(pct, 2)} % de sal`

function situacion(ent: Entorno): string {
  const rotos = [!ent.selectiva && 'con una membrana que deja pasar la sal', ent.celula === 'vegetal' && !ent.pared && 'sin pared celular']
  const nota = rotos.filter(Boolean).join(' y ')
  return `${CELULAS[ent.celula].un} en agua con ${porcentaje(ent.pct)}${nota ? `, ${nota}` : ''}`
}

const opcionesDestino = (ent: Entorno): Opcion<Respuesta>[] => [
  { valor: 'rota', texto: 'Estalla' },
  { valor: 'hincha', texto: conPared(ent) ? 'Se pone turgente: se hincha un poco y aguanta' : 'Se hincha, pero aguanta' },
  { valor: 'igual', texto: 'Queda igual' },
  { valor: 'achica', texto: conPared(ent) ? 'Se achica y la membrana se despega de la pared' : 'Se achica y se arruga' },
]

function causaRotura(ent: Entorno): string {
  const afuera = osmolaridad(ent.pct)
  const adentro = mOsmInterior(ent.celula)
  if (!ent.selectiva)
    return ` La sal atraviesa la membrana y se reparte igual a los dos lados, así que lo único que cuenta son las moléculas grandes de adentro, que no pasan: el agua entra sin parar.${av(' Algo parecido pasa con la urea, que sí atraviesa la membrana: una solución de urea con la misma osmolaridad que la sangre revienta a los glóbulos rojos.')}`
  if (ent.celula === 'vegetal') return ` Sin pared nada frena al agua: afuera hay ${numero(afuera, 0)} mOsm/L y adentro ${numero(adentro, 0)}. Con pared la célula no estalla.`
  return ` Afuera hay mucha menos sal que adentro (${numero(afuera, 0)} contra ${numero(adentro, 0)} mOsm/L) y el agua entra hasta pasar el límite de la membrana${av(`; en este modelo eso ocurre por debajo de ${numero(pctDeRotura(), 2)} % de sal`)}.`
}

/** Por qué la pared frenó al agua, según lo que haya pasado con la sal. */
function causaTurgencia(ent: Entorno, presion: number): string {
  const freno = `la membrana empujó contra la pared, que devuelve ${numero(presion, 2)} MPa de presión${av(' (turgencia)')}`
  return ent.selectiva && tonicidad(ent) === 'hipo'
    ? `${freno}. Con esa presión el agua deja de entrar: por eso la célula vegetal no estalla en agua dulce.`
    : ent.selectiva
      ? `${freno}.`
      : `${freno}. La sal pasó libre y solo hacían fuerza las moléculas grandes de adentro: la pared las frena.`
}

const EXPLICACION: Record<Forma, (ent: Entorno, v: number, presion: number) => string> = {
  rota: (ent) =>
    `Estalló: el volumen llegó a <b>${numero(V_ROTURA, 2)}×</b> el normal, el límite de la membrana${av(ent.celula === 'globulo' ? ' (una esfera de 150 fL, contra 90 fL del glóbulo normal)' : ' (se supone el mismo que el del glóbulo)')}.${causaRotura(ent)}`,
  hincha: (ent, v, presion) =>
    conPared(ent)
      ? `El volumen subió a <b>${numero(v, 2)}×</b>: entró agua y ${causaTurgencia(ent, presion)}`
      : `El volumen subió a <b>${numero(v, 2)}×</b>: entró agua, pero no llegó al límite de la membrana (${numero(V_ROTURA, 2)}×).`,
  igual: (ent, v, presion) =>
    presion > 0.05
      ? `El volumen quedó en <b>${numero(v, 2)}×</b>, casi igual, pero no por falta de diferencia: ${causaTurgencia(ent, presion)}`
      : `El volumen quedó en <b>${numero(v, 2)}×</b>: adentro y afuera hay casi lo mismo, el agua cruza en los dos sentidos al mismo ritmo y no hay cambio neto.`,
  achica: (ent, v) =>
    `El volumen bajó a <b>${numero(v, 2)}×</b>: afuera hay más sal, el agua sale hasta emparejar${av(' las concentraciones')} y la sal se queda afuera. ${conPared(ent) ? 'La pared no se achica y la membrana se despega: plasmólisis.' : 'La membrana se arruga: crenación.'}`,
}

const preguntaDestino = (ent: Entorno): Pregunta => ({
  texto: `¿Qué le pasa a ${situacion(ent)}?`,
  opciones: opcionesDestino(ent),
  resolver: (e) => {
    const l = leer(simular(e).final, e)
    return { correcta: l.forma, explicacion: EXPLICACION[l.forma](e, l.v, l.presion) }
  },
})

const mezclar = <T>(lista: T[]): T[] => lista.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x)

/** Para el mito "la sal entra y la arruga": lo que cruza la membrana en el primer instante. */
const preguntaCruza = (ent: Entorno): Pregunta => ({
  texto: `Con ${porcentaje(ent.pct)} afuera, ¿qué cruza la membrana de ${CELULAS[ent.celula].un}?`,
  // El orden se mezcla: si no, el mito quedaría siempre primero.
  opciones: mezclar<Opcion<Respuesta>>([
    { valor: 'sal', texto: 'Entra sal: la célula se llena de sal' },
    { valor: 'agua', texto: 'Sale agua: la sal se queda afuera' },
    { valor: 'nada', texto: 'No cruza nada' },
  ]),
  resolver: (e) => {
    const { final, dv0, ds0 } = simular(e)
    const correcta: 'agua' | 'sal' | 'nada' = dv0 < -1e-6 ? 'agua' : ds0 > 1e-6 ? 'sal' : 'nada'
    const l = leer(final, e)
    const explicaciones: Record<'agua' | 'sal' | 'nada', string> = {
      agua: `Salió agua: el volumen bajó a <b>${numero(l.v, 2)}×</b>. La membrana deja pasar el agua pero no la sal, y el agua va hacia donde hay más soluto${av(` (afuera ${numero(l.mOsmFuera, 0)} mOsm/L, adentro empezó en ${numero(mOsmInterior(e.celula), 0)})`)}. La sal no entró.`,
      sal: 'Entró sal: la membrana la deja pasar.',
      nada: 'No cruzó nada neto: no hay diferencia de concentración.',
    }
    return { correcta, explicacion: explicaciones[correcta] }
  },
})

/** Con la membrana selectiva y mucha sal afuera, la pregunta es el mito de la sal; si no, qué le pasa a la célula. */
export function preguntaPara(ent: Entorno): Pregunta {
  return ent.selectiva && tonicidad(ent) === 'hiper' ? preguntaCruza(ent) : preguntaDestino(ent)
}
