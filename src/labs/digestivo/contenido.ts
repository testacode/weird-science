// Textos del lab. Todo el HTML de este archivo es estático y propio (se inyecta con innerHTML).

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

export const GANCHO =
  'Un tubo de vidrio de casi 9 m. Cada tramo tiene su pH y sus enzimas: hidrolizan <span class="c-ambar">carbohidratos</span>, <span class="c-magenta">proteínas</span> y <span class="c-cielo">grasas</span> hasta moléculas que el intestino delgado puede absorber.'

type Relato = (s: Segmento, e: Estado, c: Config, ph: number) => string

export const RELATO: Record<Segmento['id'], Relato> = {
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

export function relatoFinal(kcal: number, kcalTotal: number, grasasPerdidas: number): string {
  const perdida = grasasPerdidas >= 1 ? ` Se perdieron <span class="c-cielo">${grasasPerdidas.toFixed(0)} g de grasa</span>.` : ''
  return `<strong>Fin del tránsito.</strong> Absorbidas <span class="c-marca">${kcal.toFixed(0)} kcal</span> de ${kcalTotal.toFixed(0)} ingeridas.${perdida} El resto se elimina con las heces.`
}

export const COMO_FUNCIONA = `
  <h2>¿Cómo funciona?</h2>
  <p>Comer no alcanza: el cuerpo tiene que romper la comida en moléculas tan chicas que puedan pasar a la sangre. Cada tramo del tubo es un reactor con su pH y sus enzimas. En cada paso de 0,01 h, una fracción de cada nutriente intacto se hidroliza (cinética de primer orden) y, en el intestino delgado, una fracción de lo digerido se absorbe.</p>
  <h3>Qué mirar</h3>
  <ul>
    <li>Las bolitas <span class="c-ambar">amarillas</span> son carbohidratos (pan, papa), las <span class="c-magenta">rosas</span> proteínas (carne, huevo) y las <span class="c-cielo">celestes</span> grasas (aceite, manteca).</li>
    <li>Cuando una bolita se achica, se digirió. Cuando vuela hacia el hígado, se absorbió y pasó a la sangre.</li>
  </ul>
  <h3>Controles</h3>
  <ul>
    <li><b>Comida:</b> cambia los gramos de cada macronutriente.</li>
    <li><b>Bilis:</b> sin emulsión, la lipasa trabaja al 20%. También podés tocar la vesícula (la bolita verde bajo el hígado).</li>
    <li><b>Ácido gástrico:</b> con antiácido el estómago sube a pH 5 y la pepsina se apaga.</li>
    <li><b>Velocidad:</b> el reloj se acelera distinto en cada órgano para que todos se vean; el valor ×N indica cuánto.</li>
  </ul>
  <h3>Qué es real y qué no</h3>
  <p><b>Real:</b> pH por tramo, qué enzima actúa dónde, tiempos de tránsito típicos (estómago ~3 h, delgado ~4 h, grueso 12-36 h), 4/4/9 kcal por gramo.</p>
  <p><b>Simplificado:</b> las tasas son aproximadas, no hay fibra ni agua, un solo bolo en vez de flujo continuo, y el páncreas no se muestra aparte. Modelo educativo: verificá los datos con tu docente o manual.</p>`
