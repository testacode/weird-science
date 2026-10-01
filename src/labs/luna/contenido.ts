// Textos del lab. Todo el HTML de este archivo es estático y propio (se inyecta con innerHTML).

import { av } from '../../ui/avanzado'
import { fuentes } from '../../ui/fuentes'
import { numero } from '../../ui/formato'
import {
  INCLINACION, MES_SIDERAL, MES_SINODICO, ladoIluminado, letraDeLaForma, type Config, type Eclipse, type Hemisferio, type IdFase, type IdeaSombra,
} from './model'

/** Número con coma decimal, como se escribe en Argentina. */
export const num = (n: number, decimales = 0) => numero(n, decimales)

export interface Situacion {
  id: IdFase
  fase: number
  elong: number
  /** Fracción iluminada (0-1) según el modelo. */
  iluminada: number
  hem: Hemisferio
  config: Config
  eclipse: Eclipse
  /** Latitud lunar en grados: signo + = al norte del plano de la órbita terrestre. */
  latitud: number
  idea: IdeaSombra
}

const SOL = '<span class="c-ambar">Sol</span>'
const TIERRA = '<span class="c-cielo">Tierra</span>'
const LUNA = '<span class="c-luna">Luna</span>'

export const GANCHO = `La ${LUNA} siempre tiene una mitad iluminada por el ${SOL}. Lo que cambia, mes a mes, es cuánto de esa mitad mira hacia la ${TIERRA}${av(`. El ciclo dura ${num(MES_SINODICO, 2)} días (mes sinódico)`)}.`

const pct = (s: Situacion) => `<span class="c-ambar">${num(s.iluminada * 100)}%</span>`
const angulo = (s: Situacion) => av(` (ángulo Sol-Tierra-Luna: ${num(s.elong)}°)`)

function forma(s: Situacion): string {
  const letra = letraDeLaForma(s.fase, s.hem)
  const lado = ladoIluminado(s.fase, s.hem)
  const donde = s.hem === 'sur' ? 'desde el hemisferio sur' : 'desde el hemisferio norte'
  return letra
    ? ` Se ilumina por la ${lado} y, ${donde}, parece una <strong>${letra}</strong>.`
    : ` Se ilumina por la ${lado}.`
}

const POR_FASE: Record<IdFase, (s: Situacion) => string> = {
  nueva: (s) => `<strong>Luna nueva.</strong> La ${LUNA} está entre la ${TIERRA} y el ${SOL}: su cara iluminada mira al Sol y a nosotros nos da la oscura. Iluminada: ${pct(s)}${angulo(s)}.`,
  creciente: (s) => `<strong>Creciente.</strong> La ${LUNA} se corrió del ${SOL} y ya vemos una tajada de su cara iluminada: ${pct(s)}${angulo(s)}.${forma(s)}`,
  cuartoCreciente: (s) => `<strong>Cuarto creciente.</strong> ${SOL}, ${TIERRA} y ${LUNA} forman un ángulo recto: de la cara que miramos, la mitad está iluminada: ${pct(s)}${angulo(s)}.${forma(s)}`,
  gibosaCreciente: (s) => `<strong>Gibosa creciente.</strong> Ya vemos más de la mitad iluminada: ${pct(s)}${angulo(s)}. Cada noche se completa un poco más.${forma(s)}`,
  llena: (s) => `<strong>Luna llena.</strong> La ${TIERRA} queda en el medio: la ${LUNA} está del lado opuesto al ${SOL} y vemos entera su cara iluminada, ${pct(s)}${angulo(s)}.`,
  gibosaMenguante: (s) => `<strong>Gibosa menguante.</strong> Empieza a perderse la luz: ${pct(s)}${angulo(s)}.${forma(s)}`,
  cuartoMenguante: (s) => `<strong>Cuarto menguante.</strong> Otra vez un ángulo recto, ahora del otro lado: vemos ${pct(s)}${angulo(s)}.${forma(s)}`,
  menguante: (s) => `<strong>Menguante.</strong> Queda una tajada cada vez más fina: ${pct(s)}${angulo(s)}. La ${LUNA} vuelve hacia el ${SOL}.${forma(s)}`,
}

/** Eclipse de Luna: solo se comenta cerca de la Luna llena, y solo con info avanzada. */
function textoEclipse(s: Situacion): string {
  if (s.id !== 'llena') return ''
  const { eclipse: e } = s
  if (e.tipo !== 'ninguno') {
    return av(` <span class="c-magenta"><strong>Eclipse ${e.tipo} de Luna.</strong> Esta Luna llena cruza la sombra de la Tierra: su centro pasa a ${num(e.distancia, 1)}° del eje de la sombra.</span>`)
  }
  const lado = s.latitud >= 0 ? 'por arriba' : 'por abajo'
  return av(` No hay eclipse: por la inclinación de ${num(INCLINACION, 1)}° de su órbita, la Luna pasa a ${num(e.distancia, 1)}° del eje de la sombra, ${lado}.`)
}

function relatoIdea(s: Situacion): string {
  const tapada = num(s.idea.tapada * 100)
  const cierre =
    s.id === 'llena' ? 'Con esa idea la Luna llena tendría que verse apagada, y es la más brillante.'
    : s.id === 'nueva' ? 'Con esa idea la Luna nueva tendría que verse llena, y no se ve.'
    : 'Además, el borde de una sombra redonda siempre sería un arco curvo; en los cuartos el borde de la luz se ve recto.'
  return `<span class="c-magenta"><strong>Idea: “la fase es la sombra de la Tierra”.</strong></span> Con esa idea, la sombra taparía el <b>${tapada}%</b> de la Luna y se vería <b>${num(s.idea.iluminada * 100)}%</b> iluminada. Lo que se observa es <b>${num(s.iluminada * 100)}%</b>. ${cierre}`
}

export function relato(s: Situacion): string {
  return s.config.sombraTierra ? relatoIdea(s) : POR_FASE[s.id](s) + textoEclipse(s)
}

export const NOTA_MES = `Mes <b>sinódico</b>: ${num(MES_SINODICO, 2)} días entre dos Lunas nuevas. Mes <b>sideral</b>: ${num(MES_SIDERAL, 2)} días para una vuelta completa respecto de las estrellas. La diferencia son ~2,2 días: mientras la Luna giraba, la Tierra avanzó en su órbita y la Luna tiene que "alcanzar" otra vez al Sol.`

/** Cómo se ve cada hemisferio, para el pie del círculo de "Vista desde la Tierra". */
export function pieVista(hem: Hemisferio, s: Situacion): string {
  const regla = hem === 'sur' ? 'Hemisferio sur: creciente = C, menguante = D' : 'Hemisferio norte: creciente = D, menguante = C'
  const lado = s.id === 'nueva' || s.id === 'llena' ? '' : ` · se ilumina por la ${ladoIluminado(s.fase, hem)}`
  return `${regla}${lado}`
}

export const PIE_AVANZADO = 'Es la misma Luna: desde el otro hemisferio se ve "cabeza abajo".'

export const COMO_FUNCIONA = `
  <h2>¿Cómo funciona?</h2>
  <p>El ${SOL} siempre ilumina media ${LUNA}. Mientras la Luna da la vuelta a la ${TIERRA}, desde acá vemos una parte distinta de esa mitad iluminada: eso son las fases. El círculo <b>Vista desde la Tierra</b> mira la Luna 3D desde la Tierra, con la luz real de la maqueta.${av(` La fracción iluminada sale de la elongación θ (el ángulo Sol-Tierra-Luna): (1 − cos θ) / 2. Un ciclo completo de fases dura ${num(MES_SINODICO, 2)} días.`)}</p>
  <h3>Qué mirar</h3>
  <ul>
    <li>La lámpara <span class="c-ambar">amarilla</span> es el Sol, la esfera <span class="c-cielo">celeste y verde</span> es la Tierra y la <span class="c-luna">gris</span>, la Luna. El punto lima sobre la Tierra es quien mira.</li>
    <li>La línea de tiempo de abajo se arrastra: elegí una fase y fijate dónde está la Luna en la maqueta y cómo se ve desde la Tierra.</li>
    <li>El gráfico muestra qué porcentaje de la Luna se ve <span class="c-ambar">iluminado</span> a lo largo del ciclo.</li>
  </ul>
  <h3>Controles</h3>
  <ul>
    <li><b>Día del ciclo:</b> 0 es Luna nueva; 14,8, Luna llena. También podés tocar los íconos de las fases.</li>
    <li><b>Vista:</b> desde arriba se ven los ángulos; desde el costado, la inclinación de la órbita.</li>
    <li><b>Hemisferio:</b> en el sur la Luna creciente parece una <b>C</b> y la menguante una <b>D</b>; en el norte es al revés${av('. Es la misma Luna: cambia el lado donde está parado el observador, que la ve "cabeza abajo"')}.</li>
    <li><b>¿Y si las fases fueran la sombra de la Tierra?:</b> muestra cómo se vería con esa idea equivocada, al lado de lo que se observa.</li>
    ${av('<li><b>Órbita sin inclinación:</b> la Luna cruzaría la sombra de la Tierra en cada Luna llena. <b>Ir al próximo eclipse</b> salta a la próxima Luna llena en la que sí pasa.</li>')}
    <li><b>Info avanzada:</b> muestra u oculta el ángulo, los nodos, los eclipses y los detalles del modelo.</li>
  </ul>
  <h3>Predecí antes de correr</h3>
  <p>El lab arranca con una pregunta: elegí una opción, dejá correr el tiempo y en la Luna llena se revela si acertaste.</p>
  ${av(`<h3>Por qué no hay eclipse todos los meses</h3>
  <p>La órbita de la Luna está inclinada ${num(INCLINACION, 1)}° respecto de la de la Tierra. En casi todas las Lunas llenas la Luna pasa por arriba o por abajo de la sombra. Solo hay eclipse si la Luna llena cae cerca de un <b>nodo</b> (donde la órbita cruza ese plano): unas 1-2 veces por año. Los nodos giran respecto del Sol una vuelta cada 346,6 días.</p>
  <h3>Mes sinódico y mes sideral</h3>
  <p>${NOTA_MES}</p>`)}
  <h3>Qué es real y qué no</h3>
  <p><b>Real:</b> la Luna siempre tiene media cara iluminada, la secuencia de fases, que la Luna llena está del lado opuesto al Sol y que en el hemisferio sur las fases se ven al revés que en el norte.${av(' También son reales las ecuaciones (fracción iluminada = (1 − cos θ) / 2), el mes de 29,53 días, la inclinación de 5,14°, el tamaño de la sombra respecto de la Luna y la duración de un eclipse (~3,5 h).')}</p>
  <p><b>Simplificado:</b> los tamaños y distancias están muy fuera de escala (la Luna real está a unos 60 radios terrestres; acá, a menos de 5) y la inclinación de la órbita se dibuja ×3 para que se note. La órbita es circular y el Sol está fijo, a un costado. La Tierra gira mucho más lento que en la realidad. La vista desde la Tierra muestra la Luna de frente, sin la inclinación que muestra cerca del horizonte, y sin atmósfera. La sombra de la Tierra no se proyecta con la luz de la maqueta (con esta escala taparía a la Luna todos los meses): se calcula con los ángulos reales. No se modelan eclipses de Sol ni penumbrales. Modelo educativo: verificá los datos con tu docente o manual.</p>
  ${fuentes([
  { texto: '<i>Explanatory Supplement to the Astronomical Ephemeris</i> (1961), vía «Lunar month», Wikipedia: duración de los meses sinódico, sideral y dracónico.', url: 'https://en.wikipedia.org/wiki/Lunar_month' },
  { texto: 'NASA NSSDCA, <i>Moon Fact Sheet</i>: distancia, radio e inclinación de la órbita de la Luna.', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html' },
  { texto: 'Pogge, «Eclipses of the Sun & Moon», Ohio State University: tamaño de la sombra de la Tierra a la distancia de la Luna.', url: 'https://www.astronomy.ohio-state.edu/pogge.1/Ast161/Unit2/eclipses.html' },
  ])}`
