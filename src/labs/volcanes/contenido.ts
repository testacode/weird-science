// Textos del lab. Todo el HTML de este archivo es estático y propio (se inyecta con innerHTML).
// Colores con significado: ámbar = magma y lava, cielo = agua, magenta = sismos y tensión.

import { av } from '../../ui/avanzado'
import { fuentes } from '../../ui/fuentes'
import { numero } from '../../ui/formato'
import { FUSION, PROFUNDIDAD, explosividad, tipoErupcion, tipoMagma, type Config, type Estado } from './model'

export const num = numero

/** Exponente de la viscosidad: sin decimal cuando es redondo (10⁸ y no 10⁸,0). */
export const exp10 = (l: number) => num(l, Number.isInteger(l) ? 0 : 1)

export const NOMBRE_MAGMA = { basaltico: 'basáltico', andesitico: 'andesítico', riolitico: 'riolítico' } as const
export const NOMBRE_ERUPCION = { efusiva: 'efusiva', mixta: 'mixta', explosiva: 'explosiva' } as const

export const GANCHO = `Un corte de la Tierra hasta ${PROFUNDIDAD.corte} km de profundidad. Cuando las placas se <span class="c-cielo">separan</span>, <span class="c-ambar">chocan</span> o se <span class="c-magenta">rozan</span>, a veces la roca se funde y nace un volcán. ¿De dónde sale ese magma? ¿Y por qué algunos volcanes explotan y otros solo largan lava?`

/** Frase de lo que pasa "ahora", según el borde, el avance del experimento y el magma. */
export function relato(e: Estado, c: Config): string {
  const f = FUSION[c.borde]
  const v = `${num(f.velocidad, Number.isInteger(f.velocidad) ? 0 : 1)} cm por año`
  if (c.borde === 'transformante') {
    return `<strong>Las placas se rozan</strong> (~${v}). No sube manto ni entra agua, así que <span class="c-magenta">no se forma magma</span>. La roca se traba, acumula tensión y se rompe en <span class="c-magenta">sismos poco profundos</span>.`
  }
  if (e.fusion < 0.3) {
    return c.borde === 'divergente'
      ? `<strong>Las placas se separan</strong> (~${v}). El manto caliente sube para llenar el hueco que dejan, sin dejar de ser sólido.`
      : `<strong>Una placa se hunde bajo la otra</strong> (~${v}). La placa oceánica, más densa, baja al manto y se calienta; trae <span class="c-cielo">agua</span> atrapada en sus minerales.`
  }
  if (e.fusion < 1) {
    return c.borde === 'divergente'
      ? `<strong>Sube y se descomprime.</strong> Al subir baja la presión y la roca empieza a fundirse un poco (zona naranja), desde unos ${f.origenKm} km. El <span class="c-ambar">magma</span> es más liviano y sube por el eje.`
      : `<strong>El agua baja el punto de fusión.</strong> A unos ${f.origenKm} km la placa suelta su <span class="c-cielo">agua</span>, que sube al manto de arriba: con agua la roca funde a menos temperatura. El <span class="c-ambar">magma</span> sube hacia el volcán.`
  }
  const magma = NOMBRE_MAGMA[tipoMagma(c.silice)]
  const tipo = tipoErupcion(explosividad(c.silice, c.gas))
  if (e.erupcion < 0.3) return `<strong>El magma llega arriba.</strong> Es un magma ${magma}: ahora depende de cuán viscoso es y de cuánto gas lleva.`
  return {
    efusiva: `<strong>Erupción efusiva.</strong> Magma ${magma} fluido y casi sin gas: las burbujas escapan, la <span class="c-ambar">lava</span> corre por las laderas y el volcán se vuelve ancho y bajo.`,
    mixta: `<strong>Erupción mixta.</strong> Magma ${magma} a medio camino: fuentes de <span class="c-ambar">lava</span> y algo de ceniza.`,
    explosiva: `<strong>Erupción explosiva.</strong> Magma ${magma} pastoso con gas atrapado: la presión revienta el magma y lanza <span class="c-ambar">ceniza y fragmentos</span> en una columna alta. El volcán es empinado.`,
  }[tipo]
}

export const COMO_FUNCIONA = `
  <h2>¿Cómo funciona?</h2>
  <p>La capa de afuera de la Tierra está partida en placas que se mueven unos centímetros por año. Donde se encuentran, a veces se forma magma y nace un volcán. Este lab muestra un <b>corte vertical</b> de los primeros ${PROFUNDIDAD.corte} km: la <b>corteza</b>, la <b>litósfera</b> (corteza y manto rígido, de unos ${PROFUNDIDAD.litosfera} km) y la <b>astenósfera</b>, el manto caliente y blando de abajo.${av(` La corteza mide ~${PROFUNDIDAD.cortezaOceanica} km bajo el mar y ~${PROFUNDIDAD.cortezaContinental} km en los continentes. El manto sigue hasta unos ${numero(PROFUNDIDAD.nucleo, 0)} km, donde empieza el núcleo.`)}</p>
  <h3>Qué mirar</h3>
  <ul>
    <li><b>Tres bordes.</b> <span class="c-cielo">Divergente</span>: las placas se separan y el manto sube. <span class="c-ambar">Convergente</span>: una placa se hunde bajo la otra. <span class="c-magenta">Transformante</span>: las placas se rozan.</li>
    <li><b>Zona naranja:</b> donde la roca del manto se funde. En la dorsal funde porque <b>sube</b> y baja la presión (descompresión); en la subducción funde porque la placa le suma <b>agua</b>${av(' (a ~100 km, con agua la roca funde a ~800 °C; sin agua, a ~1.500 °C)')}. En el borde transformante no se funde nada.</li>
    <li><b>El volcán:</b> el cono cambia con el magma. Fluido: ancho y bajo (volcán escudo). Pastoso: alto y empinado.</li>
    <li><b>Flechas verdes:</b> el movimiento de las placas. <b>Anillos amarillos:</b> sismos.</li>
  </ul>
  <h3>Controles</h3>
  <ul>
    <li><b>Borde:</b> elegí cómo se mueven las placas.</li>
    <li><b>Magma:</b> basáltico, andesítico o riolítico. Cambian la <b>sílice</b> (SiO₂, % del peso) y el <b>agua disuelta</b>; podés ajustarlos por separado.</li>
    <li>Más sílice, más <b>viscosidad</b> (el magma fluye peor)${av(' (de unos 10–100 Pa·s en un basalto a ~10⁸ Pa·s en una riolita fría; el agua tiene 0,001 Pa·s)')}. Con el magma pastoso y con gas, las burbujas no escapan: la presión crece y revienta.</li>
  </ul>
  <h3>Predecí antes de correr</h3>
  <p>Al empezar, al cambiar de borde y al elegir un magma de referencia, el lab te hace una pregunta. Elegí, mirá qué pasa y se revela si acertaste. Con el interruptor "Preguntas: No" lo usás libre.</p>
  <h3>Qué es real y qué no</h3>
  <p><b>Real:</b> las capas y sus espesores; los tres tipos de borde; el magma <b>se forma en el manto</b> (no en el núcleo) por descompresión, por agua o por un punto caliente; en el borde transformante no hay magma; los magmas basáltico, andesítico y riolítico con su sílice y su temperatura (basalto 1.000–1.200 °C, riolita 650–800 °C); más sílice, más viscosidad; los magmas con más agua y más viscosos tienden a explotar.</p>
  <p><b>Simplificado:</b> el ancho del corte no está a escala (un borde real tiene cientos de km) y el volcán y el mar están exagerados; el tiempo va muy acelerado (las placas se mueven unos cm por año); una sola inclinación de la placa que se hunde (en la realidad varía); en cada borde dibujamos un solo mecanismo de fusión (hay más, como el agua bajo las dorsales); la viscosidad es una recta entre dos valores de libro y la temperatura sale de la sílice; la "explosividad" es un índice del modelo (0 a 1) que combina viscosidad y agua, con cortes elegidos por nosotros; no cuenta la velocidad de ascenso, el agua externa ni los cristales; la cantidad de magma por borde es relativa. <b>Fuera del corte:</b> los <b>puntos calientes</b> como Hawái, a más de 3.200 km del borde más cercano, explican algunos volcanes lejos de los bordes (su origen profundo todavía se discute). Modelo educativo: verificá los datos con tu docente o manual.</p>
  ${fuentes([
    { texto: 'USGS, This Dynamic Earth: Understanding plate motions (bordes, velocidades: Atlántico 2,5 cm/año, San Andrés ~5 cm/año)', url: 'https://pubs.usgs.gov/gip/dynamic/understanding.html' },
    { texto: 'USGS, This Dynamic Earth: Inside the Earth (corteza ~5 km y ~30 km, litósfera ≥80 km, manto ~2.900 km)', url: 'https://pubs.usgs.gov/gip/dynamic/inside.html' },
    { texto: 'USGS, This Dynamic Earth: Hotspots (volcanes lejos de los bordes, Hawái)', url: 'https://pubs.usgs.gov/gip/dynamic/hotspots.html' },
    { texto: 'Nelson, S. A., Volcanoes, Magma, and Volcanic Eruptions, Tulane University (sílice, temperatura, viscosidad y gas de los tres magmas; el magma no viene del núcleo)', url: 'https://www2.tulane.edu/~sanelson/Natural_Disasters/volcan&amp;magma.htm' },
    { texto: 'Magma, Wikipedia, con Philpotts y Ague (2009, <i>Principles of igneous and metamorphic petrology</i>) y Schmincke (2003, <i>Volcanism</i>): composición, viscosidad y agua', url: 'https://en.wikipedia.org/wiki/Magma' },
    { texto: 'Eilon y Abers (2017), <i>Science Advances</i>: fusión bajo una dorsal (seca 0–60 km, húmeda 60–120 km)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5443646/' },
    { texto: 'Volcanic arc, Wikipedia: el arco se forma sobre la placa a ~120 km (60–173 km)', url: 'https://en.wikipedia.org/wiki/Volcanic_arc' },
    { texto: 'Igneous rock, Wikipedia: la peridotita funde a ~800 °C con agua y a ~1.500 °C sin agua, a ~100 km', url: 'https://en.wikipedia.org/wiki/Igneous_rock' },
    { texto: 'Ring of Fire, Wikipedia: 750–915 volcanes, ~2/3 del total mundial', url: 'https://en.wikipedia.org/wiki/Ring_of_Fire' },
  ])}`
