// Textos del lab. Todo el HTML de este archivo es estático y propio (se inyecta con innerHTML).

import { av } from '../../ui/avanzado'
import { numero } from '../../ui/formato'
import {
  CIUDADES, D_AFELIO, D_PERIHELIO, DIST_MEDIA, EXCENTRICIDAD, FECHAS_CLAVE, INCLINACION, NOMBRE_ESTACION, fecha, ideaDistancia, orbita, rangoAnual,
  type Ciudad, type Resumen,
} from './model'

/** Número con coma decimal, como se escribe en Argentina. */
export const num = (n: number, decimales = 0) => numero(n, decimales)

export interface Situacion {
  d: number
  ciudad: Ciudad
  eps: number
  idea: boolean
  r: Resumen
  /** Solo con la idea errónea: las dos ciudades que se comparan. */
  bsas: Resumen
  madrid: Resumen
}

export const SOL = '<span class="c-ambar">Sol</span>'
export const TIERRA = '<span class="c-cielo">Tierra</span>'
const IDEA = (t: string) => `<span class="c-magenta">${t}</span>`

export const GANCHO = `El eje de la ${TIERRA} está inclinado y siempre apunta al mismo lado. Por eso, a lo largo del año, el ${SOL} sale más alto o más bajo y los días se alargan o se acortan${av(`: eso, y no la distancia, hace las estaciones. El eje está inclinado ${num(INCLINACION, 2)}°`)}.`

// Cifras del modelo para los textos fijos (no escritas a mano).
const D_MIN = orbita(D_PERIHELIO).distancia
const D_MAX = orbita(D_AFELIO).distancia
const AMPLITUD_DISTANCIA = (ideaDistancia(D_PERIHELIO) - ideaDistancia(D_AFELIO)) / 2
const MADRID = rangoAnual(CIUDADES.madrid.lat, INCLINACION, 'energia')
const [EQ_MARZO, SOL_JUNIO, EQ_SEPT, SOL_DIC] = FECHAS_CLAVE.map((f) => fecha(f.dia).larga)

const grados = (n: number) => `${num(n, 1)}°`

function haciaDonde(r: Resumen): string {
  return r.haciaElSol === 'cenit' ? 'justo sobre tu cabeza' : `hacia el ${r.haciaElSol}`
}

const PORQUE: Record<string, string> = {
  verano: 'Rayos casi verticales y días largos: llega más energía a cada m².',
  invierno: 'Rayos inclinados y días cortos: la misma luz se reparte en más suelo.',
  otono: 'Los días se acortan y el Sol baja cada vez más.',
  primavera: 'Los días se alargan y el Sol sube cada vez más.',
}

function relatoNormal(s: Situacion): string {
  const { r, ciudad, eps } = s
  const f = fecha(s.d).larga
  const titulo =
    r.estacion === 'sin' ? (eps < 1 ? 'Sin estaciones' : `Casi sin estaciones en ${ciudad.nombre}`) : `${NOMBRE_ESTACION[r.estacion]} en ${ciudad.nombre}`
  const sol =
    r.altura <= 0
      ? `el ${SOL} no llega a salir en todo el día (noche polar)`
      : `el ${SOL} llega al mediodía a <b class="c-ambar">${grados(r.altura)}</b> de altura, ${haciaDonde(r)}${av(` (90° − |${grados(ciudad.lat)} − (${grados(r.declinacion)})|, con δ = ${grados(r.declinacion)} la declinación solar)`)}`
  const dia = r.horas >= 23.99 ? 'el Sol no se pone (sol de medianoche)' : r.horas <= 0.01 ? 'la noche dura las 24 h' : `el día dura <b>${num(r.horas, 1)} h</b>`
  const energia = r.altura > 0 ? ` Cada m² recibe el <b>${num(r.energiaVsPromedio)} %</b> de la energía de un día promedio${av(` (sen ${grados(r.altura)} × ${num(r.horas, 1)} h, con la distancia de ${num(r.distancia, 1)} M km)`)}.` : ''
  const causa =
    r.estacion === 'sin'
      ? eps < 1
        ? ' Con el eje derecho el Sol pasa siempre a la misma altura y el día dura lo mismo todo el año.'
        : ' En el ecuador el día dura 12 h todo el año y el Sol siempre sube muy alto.'
      : ` ${PORQUE[r.estacion]}`
  return `<strong>${titulo}.</strong> El ${f}, ${sol}, y ${dia}.${energia}${causa}`
}

function relatoIdea(s: Situacion): string {
  const { r, bsas, madrid } = s
  const cerca = r.distancia < DIST_MEDIA
  const fila = (nombre: string, x: Resumen) => {
    const est = x.estacion === 'sin' ? 'Sin estaciones' : NOMBRE_ESTACION[x.estacion]
    return `<span class="fila-idea"><span>${nombre}</span><b>${est}</b><small>Sol a ${grados(Math.max(0, x.altura))}</small></span>`
  }
  const opuestas = bsas.estacion !== 'sin' && bsas.estacion !== madrid.estacion
  const cierre = opuestas
    ? 'No coincide: con esa idea los dos hemisferios tendrían la misma estación a la vez, y se observan opuestas.'
    : 'Con el eje derecho no hay estaciones en ningún lado, aunque la distancia siga cambiando.'
  const rango = rangoAnual(s.ciudad.lat, s.eps, 'energia')
  return `${IDEA('<strong>Idea: “las estaciones son por la distancia al Sol”.</strong>')} Hoy la ${TIERRA} está a <b>${num(r.distancia, 1)} M km</b>, ${cerca ? 'más cerca' : 'más lejos'} que el promedio (${num(DIST_MEDIA, 1)}). Con esa idea sería ${cerca ? '<b>verano</b>' : '<b>invierno</b>'} en <b>todo</b> el planeta.<span class="comparar">${fila('Buenos Aires', bsas)}${fila('Madrid', madrid)}</span>${cierre}${av(` Además, la distancia mueve la energía solo ±${num(AMPLITUD_DISTANCIA, 1)} %; en ${s.ciudad.nombre} la altura del Sol y las horas de luz la mueven entre ${num(rango.min)} % y ${num(rango.max)} % del promedio.`)}`
}

export const relato = (s: Situacion) => (s.idea ? relatoIdea(s) : relatoNormal(s))

export const COMO_FUNCIONA = `
  <h2>¿Cómo funciona?</h2>
  <p>La ${TIERRA} da una vuelta al ${SOL} por año con el eje inclinado, siempre hacia el mismo lado del espacio. Cuando el polo norte mira hacia el Sol es verano en el norte; medio año después, el eje sigue igual pero la Tierra está del otro lado, y es verano en el sur. El recuadro <b>Desde tu ciudad</b> muestra qué ve una ciudad al mediodía: el Sol más alto o más bajo, y cuánto suelo cubre el mismo haz de luz.${av(` La altura del Sol al mediodía es 90° − |latitud − δ|, donde la declinación δ (la latitud donde el Sol cae vertical) sale de sen δ = sen ε · sen λ, con ε = ${num(INCLINACION, 2)}° la inclinación y λ la posición de la Tierra en su órbita.`)}</p>
  <h3>Qué mirar</h3>
  <ul>
    <li>La lámpara <span class="c-ambar">amarilla</span> es el Sol y la esfera <span class="c-cielo">celeste y verde</span>, la Tierra, con su eje <span class="c-cielo">celeste</span>. El punto <span class="c-marca">lima</span> es tu ciudad, siempre al mediodía (mirando al Sol).</li>
    <li>Las rayitas celestes de la órbita son el eje en cada equinoccio y solsticio: siempre apuntan al mismo lado.</li>
    <li>El gráfico muestra cómo cambian las <span class="c-ambar">horas de luz</span> (o la energía que llega a cada m²) a lo largo del año.</li>
  </ul>
  <h3>Controles</h3>
  <ul>
    <li><b>Día del año:</b> arrastrá la línea de tiempo o tocá un equinoccio o solsticio. En el hemisferio sur el verano es en diciembre; en el norte, en junio.</li>
    <li><b>Ciudad:</b> Buenos Aires, Ushuaia, el ecuador y Madrid. Fijate cómo cambia la altura del Sol y las horas de luz con la latitud.</li>
    <li><b>¿Y si fuera por la distancia al Sol?:</b> prueba esa idea errónea y la compara con lo que se observa.</li>
    <li><b>Eje sin inclinación:</b> la Tierra con el eje derecho. ¿Qué pasa con las estaciones?</li>
    ${av('<li><b>Inclinación del eje:</b> probá cualquier valor entre 0° y 45°. Con mucha inclinación, Ushuaia llega a tener noches polares.</li>')}
    <li><b>Info avanzada:</b> muestra u oculta las fórmulas, el perihelio y el afelio, y la inclinación del eje.</li>
  </ul>
  <h3>Predecí antes de correr</h3>
  <p>El lab arranca con una pregunta: elegí una opción, dejá correr el año y al llegar a la fecha clave se revela si acertaste, con los números del modelo.</p>
  ${av(`<h3>La distancia casi no cuenta</h3>
  <p>La órbita es una elipse muy poco achatada (excentricidad ${num(EXCENTRICIDAD, 4)}): la Tierra está a ${num(D_MIN, 1)} millones de km en el perihelio (el ${fecha(D_PERIHELIO).larga}) y a ${num(D_MAX, 1)} en el afelio (el ${fecha(D_AFELIO).larga}). Eso cambia la energía que llega solo un ±${num(AMPLITUD_DISTANCIA, 1)} %. La inclinación del eje, en cambio, la mueve en Madrid entre el ${num(MADRID.min)} % y el ${num(MADRID.max)} % del promedio. Y como en enero la Tierra está más cerca, pero es verano en el sur e invierno en el norte, la distancia no puede ser la causa.</p>
  <h3>Equinoccios y solsticios</h3>
  <p>En los equinoccios (el ${EQ_MARZO} y el ${EQ_SEPT}) el Sol cae vertical sobre el ecuador (δ = 0°) y el día dura 12 h en todo el planeta. En los solsticios (el ${SOL_JUNIO} y el ${SOL_DIC}) el Sol cae vertical sobre un trópico (δ = ±${num(INCLINACION, 2)}°): son los días más largos de un hemisferio y los más cortos del otro.</p>`)}
  <h3>Qué es real y qué no</h3>
  <p><b>Real:</b> la inclinación del eje de ${num(INCLINACION, 2)}°, que apunta siempre al mismo lado del espacio (hacia la Estrella Polar); que los dos hemisferios tienen estaciones opuestas; y que la Tierra está más cerca del Sol en enero.${av(` También son reales las fechas de equinoccios y solsticios, la distancia mínima y máxima (${num(D_MIN, 1)} y ${num(D_MAX, 1)} millones de km), la excentricidad de ${num(EXCENTRICIDAD, 4)} y las fórmulas de la altura del Sol y de las horas de luz.`)}</p>
  <p><b>Simplificado:</b> los tamaños y distancias de la maqueta están muy fuera de escala, y la elipse de la órbita se dibuja con una excentricidad ×5 para que se note (la real es casi un círculo). Tu ciudad se muestra siempre al mediodía: el globo no gira día a día. Las horas de luz se miden con el Sol como un punto y sin atmósfera (en la realidad la luz se curva y el día dura unos minutos más). La energía se calcula como el seno de la altura del Sol al mediodía por las horas de luz (y la distancia), una aproximación: en la realidad el Sol está más bajo el resto del día. Las estaciones se definen entre equinoccios y solsticios; no se modelan la atmósfera, las nubes ni la inercia del mar, que hace que el calor máximo llegue semanas después del solsticio. En el ecuador casi no hay estaciones de temperatura, aunque sí de lluvias (no se modelan). Modelo educativo: verificá los datos con tu docente o manual.</p>`
