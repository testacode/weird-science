// Textos del lab por nivel. El modelo es el mismo; cambia cómo se cuenta.
// Todo el HTML de este archivo es estático y propio (se inyecta con innerHTML).

import type { Nivel } from '../../ui/nivel'
import type { Config, Estado, Segmento } from './model'

export interface Comida {
  id: 'pan' | 'milanesa' | 'papas'
  nombre: string
  gramos: { carbos: number; proteinas: number; grasas: number }
}

// Porciones aproximadas, redondeadas para que se lean fácil.
export const COMIDAS: Comida[] = [
  { id: 'pan', nombre: 'Pan', gramos: { carbos: 50, proteinas: 9, grasas: 3 } },
  { id: 'milanesa', nombre: 'Milanesa', gramos: { carbos: 15, proteinas: 30, grasas: 18 } },
  { id: 'papas', nombre: 'Papas fritas', gramos: { carbos: 40, proteinas: 4, grasas: 17 } },
]

export const GANCHO: Record<Nivel, string> = {
  primaria:
    'Un tubo de vidrio de casi 9 metros, doblado para entrar en tu panza. Elegí qué comer y mirá cómo la comida se rompe en pedacitos cada vez más chicos hasta pasar a la sangre.',
  secundaria:
    'Un tubo de vidrio de casi 9 m. Cada tramo tiene su pH y sus enzimas: hidrolizan <span class="c-ambar">carbohidratos</span>, <span class="c-magenta">proteínas</span> y <span class="c-cielo">grasas</span> hasta moléculas que el intestino delgado puede absorber.',
}

type Relato = (s: Segmento, e: Estado, c: Config, ph: number) => string

const PRIMARIA: Record<Segmento['id'], Relato> = {
  boca: () => '<strong>Boca.</strong> Los dientes trituran y la saliva empieza a romper el <span class="c-ambar">almidón</span> del pan.',
  esofago: () => '<strong>Esófago.</strong> Un tubo que empuja el bocado hacia abajo con ondas de músculo, aunque estés cabeza abajo.',
  estomago: (_s, _e, c) =>
    c.acidoGastrico
      ? '<strong>Estómago.</strong> Un ácido muy fuerte y los movimientos del estómago deshacen las <span class="c-magenta">proteínas</span> de la comida.'
      : '<strong>Estómago.</strong> Con antiácido el jugo casi no es ácido, así que las <span class="c-magenta">proteínas</span> esperan al intestino.',
  delgado: (_s, _e, c) =>
    c.bilis
      ? '<strong>Intestino delgado.</strong> Acá pasa casi todo: los nutrientes ya son tan chiquitos que atraviesan la pared y viajan por la sangre.'
      : '<strong>Intestino delgado.</strong> ¡Sin bilis las <span class="c-cielo">grasas</span> quedan en gotas grandes y muchas no se pueden aprovechar!',
  grueso: () => '<strong>Intestino grueso.</strong> Se recupera el agua. Lo que no se absorbió sigue su camino hacia afuera.',
}

const SECUNDARIA: Record<Segmento['id'], Relato> = {
  boca: (_s, _e, _c, ph) =>
    `<strong>Boca · pH ${ph.toFixed(1)}.</strong> La amilasa salival empieza a hidrolizar el <span class="c-ambar">almidón</span> en maltosa.`,
  esofago: () => '<strong>Esófago.</strong> Peristaltismo: ondas de contracción que llevan el bolo al estómago en unos segundos.',
  estomago: (_s, _e, c, ph) =>
    c.acidoGastrico
      ? `<strong>Estómago · pH ${ph.toFixed(1)}.</strong> El HCl activa la pepsina, que corta las <span class="c-magenta">proteínas</span> en péptidos. La amilasa se desactiva.`
      : `<strong>Estómago · pH ${ph.toFixed(1)}.</strong> Con antiácido la pepsina casi no actúa. La tripsina del páncreas tendrá que hacer todo el trabajo con las <span class="c-magenta">proteínas</span>.`,
  delgado: (_s, _e, c, ph) =>
    c.bilis
      ? `<strong>Intestino delgado · pH ${ph.toFixed(1)}.</strong> La bilis emulsiona las <span class="c-cielo">grasas</span> y la lipasa pancreática las rompe. Las vellosidades absorben monosacáridos, aminoácidos y ácidos grasos.`
      : `<strong>Intestino delgado · pH ${ph.toFixed(1)}.</strong> Sin bilis no hay emulsión: la lipasa solo ataca la superficie de gotas grandes y buena parte de las <span class="c-cielo">grasas</span> se pierde (esteatorrea).`,
  grueso: () => '<strong>Intestino grueso.</strong> Absorbe agua y sales, y la microbiota fermenta la fibra. Lo no absorbido se elimina.',
}

export const RELATO: Record<Nivel, Record<Segmento['id'], Relato>> = { primaria: PRIMARIA, secundaria: SECUNDARIA }

export function relatoFinal(nivel: Nivel, kcal: number, kcalTotal: number, grasasPerdidas: number): string {
  const perdida = grasasPerdidas >= 1 ? ` Se perdieron <span class="c-cielo">${grasasPerdidas.toFixed(0)} g de grasa</span>.` : ''
  return nivel === 'primaria'
    ? `<strong>¡Llegó al final!</strong> Tu cuerpo aprovechó <span class="c-marca">${kcal.toFixed(0)}</span> de ${kcalTotal.toFixed(0)} calorías.${perdida}`
    : `<strong>Fin del tránsito.</strong> Absorbidas <span class="c-marca">${kcal.toFixed(0)} kcal</span> de ${kcalTotal.toFixed(0)} ingeridas.${perdida} El resto se elimina con las heces.`
}

export const COMO_FUNCIONA: Record<Nivel, string> = {
  primaria: `
    <h2>¿Cómo funciona?</h2>
    <p>Comer no alcanza: el cuerpo tiene que <b>romper</b> la comida en pedacitos tan chiquitos que puedan pasar a la sangre. Eso es la digestión.</p>
    <h3>Qué mirar</h3>
    <ul>
      <li>Las bolitas <span class="c-ambar">amarillas</span> son carbohidratos (pan, papa), las <span class="c-magenta">rosas</span> proteínas (carne, huevo) y las <span class="c-cielo">celestes</span> grasas (aceite, manteca).</li>
      <li>Cuando una bolita se achica, se digirió. Cuando vuela hacia el hígado, pasó a la sangre.</li>
    </ul>
    <h3>Probá romperlo</h3>
    <p>Tocá la <b>vesícula</b> (la bolita verde abajo del hígado) para sacar la bilis y mirá qué pasa con las grasas.</p>
    <h3>Qué es real y qué no</h3>
    <p>El orden de los órganos y los tiempos son reales, pero el reloj va muy acelerado y los órganos están simplificados.</p>`,
  secundaria: `
    <h2>¿Cómo funciona?</h2>
    <p>Cada tramo es un reactor con su pH y sus enzimas. En cada paso de 0,01 h, una fracción de cada nutriente intacto se hidroliza (cinética de primer orden) y, en el intestino delgado, una fracción de lo digerido se absorbe.</p>
    <h3>Controles</h3>
    <ul>
      <li><b>Comida:</b> cambia los gramos de cada macronutriente.</li>
      <li><b>Bilis:</b> sin emulsión, la lipasa trabaja al 20%.</li>
      <li><b>Ácido gástrico:</b> con antiácido el estómago sube a pH 5 y la pepsina se apaga.</li>
      <li><b>Velocidad:</b> el reloj se acelera distinto en cada órgano para que todos se vean; el valor ×N indica cuánto.</li>
    </ul>
    <h3>Qué es real y qué no</h3>
    <p><b>Real:</b> pH por tramo, qué enzima actúa dónde, tiempos de tránsito típicos (estómago ~3 h, delgado ~4 h, grueso 12-36 h), 4/4/9 kcal por gramo.</p>
    <p><b>Simplificado:</b> las tasas son aproximadas, no hay fibra ni agua, un solo bolo en vez de flujo continuo, y el páncreas no se muestra aparte. Modelo educativo: verificá los datos con tu docente o manual.</p>`,
}
