// Textos del lab. Todo el HTML de este archivo es estático y propio (se inyecta con innerHTML).

import { av } from '../../ui/avanzado'
import { listaAtajos } from '../../ui/teclado'
import type { Config, Estado, Segmento } from './model'
import { ATAJOS } from './teclado'

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

export const GANCHO = `Un tubo de vidrio de casi 9 m. Cada tramo trabaja a su manera${av(', con su pH y sus enzimas')}: rompe los <span class="c-ambar">carbohidratos</span>, las <span class="c-magenta">proteínas</span> y las <span class="c-cielo">grasas</span> hasta moléculas que el intestino delgado puede absorber.`

type Relato = (s: Segmento, e: Estado, c: Config, ph: number) => string

const titulo = (nombre: string, ph: number) => `<strong>${nombre}${av(` · pH ${ph.toFixed(1)}`)}.</strong>`

export const RELATO: Record<Segmento['id'], Relato> = {
  boca: (_s, _e, _c, ph) =>
    `${titulo('Boca', ph)} La saliva${av(' (con amilasa)')} empieza a romper el <span class="c-ambar">almidón</span>${av(' en maltosa')}.`,
  esofago: () => `<strong>Esófago.</strong> Ondas de contracción${av(' (peristaltismo)')} llevan la comida al estómago en unos segundos.`,
  estomago: (_s, _e, c, ph) =>
    c.acidoGastrico
      ? `${titulo('Estómago', ph)} El ácido${av(' clorhídrico (HCl) activa la pepsina, que')} corta las <span class="c-magenta">proteínas</span> en trozos más chicos${av(' (péptidos)')}.${av(' La amilasa se desactiva.')}`
      : `${titulo('Estómago', ph)} Con antiácido casi no se cortan las <span class="c-magenta">proteínas</span>${av(' (la pepsina casi no actúa)')}. El páncreas${av(', con su tripsina,')} tendrá que hacer todo el trabajo.`,
  delgado: (_s, _e, c, ph) =>
    c.bilis
      ? `${titulo('Intestino delgado', ph)} La bilis deshace las <span class="c-cielo">grasas</span> en gotitas${av(' (emulsión)')} y las enzimas del páncreas${av(' (lipasa)')} las cortan. Las vellosidades pasan a la sangre los nutrientes ya cortados${av(': monosacáridos, aminoácidos y ácidos grasos')}.`
      : `${titulo('Intestino delgado', ph)} Sin bilis las <span class="c-cielo">grasas</span> quedan en gotas grandes${av(' (no hay emulsión)')} y las enzimas casi no las alcanzan${av(': la lipasa solo ataca la superficie')}. Buena parte de la grasa se pierde${av(' (esteatorrea)')}.`,
  grueso: () => `<strong>Intestino grueso.</strong> Absorbe agua y sales${av(', y la microbiota fermenta la fibra')}. Lo que no se absorbió se elimina.`,
}

export function relatoFinal(kcal: number, kcalTotal: number, grasasPerdidas: number): string {
  const perdida = grasasPerdidas >= 1 ? ` Se perdieron <span class="c-cielo">${grasasPerdidas.toFixed(0)} g de grasa</span>.` : ''
  return `<strong>Fin del tránsito.</strong> Absorbidas <span class="c-marca">${kcal.toFixed(0)} kcal</span> de ${kcalTotal.toFixed(0)} ingeridas.${perdida} El resto se elimina con las heces.`
}


export const COMO_FUNCIONA = `
  <h2>¿Cómo funciona?</h2>
  <p>Comer no alcanza: el cuerpo tiene que romper la comida en moléculas tan chicas que puedan pasar a la sangre. Cada tramo del tubo trabaja distinto${av(', como un reactor con su pH y sus enzimas')}.${av(' En cada paso de 0,01 h, una fracción de cada nutriente intacto se hidroliza (cinética de primer orden) y, en el intestino delgado, una fracción de lo digerido se absorbe.')}</p>
  <h3>Qué mirar</h3>
  <ul>
    <li>Las bolitas <span class="c-ambar">amarillas</span> son carbohidratos (pan, papa), las <span class="c-magenta">rosas</span> proteínas (carne, huevo) y las <span class="c-cielo">celestes</span> grasas (aceite, manteca).</li>
    <li>Cuando una bolita se achica, se digirió. Cuando vuela hacia el hígado, se absorbió y pasó a la sangre.</li>
    <li>El gráfico muestra cuántos gramos de cada nutriente pasaron a la sangre, hora a hora del tránsito.</li>
    <li>Cuando la comida llega al intestino delgado, aparece una burbuja con un zoom a las <b>vellosidades</b>: son pliegues diminutos que agrandan la superficie de absorción. Los nutrientes digeridos entran por ellas a los capilares (en rojo) y siguen hacia la sangre.</li>
    <li class="avanzado">El vidrio se tiñe según el pH de cada tramo (rojo ácido, verde neutro, azul básico). Si apagás el ácido gástrico, el estómago pierde el rojo.</li>
    <li class="avanzado">La píldora que acompaña a la comida nombra las enzimas que están actuando en ese tramo. Si algo del modelo las frena, se nota: sin ácido desaparece la pepsina y sin bilis la lipasa queda frenada.</li>
  </ul>
  <h3>El páncreas</h3>
  <p>El <b>páncreas</b> (la maqueta amarilla, a la derecha del estómago) no deja pasar la comida, pero es clave: manda por su conducto al duodeno, el principio del intestino delgado, <b>enzimas</b> que cortan carbohidratos, proteínas y grasas, y <b>bicarbonato</b> que neutraliza el ácido que viene del estómago${av(' (por eso el pH sube de 2 a casi 7,5)')}. Brilla mientras la comida está en el intestino delgado.</p>
  <h3>Controles</h3>
  <ul>
    <li><b>Comida:</b> cambia los gramos de cada macronutriente.</li>
    <li><b>Bocados:</b> con 3, la porción se reparte en tres bocados que entran uno detrás del otro. Cada uno hace su propio recorrido; las métricas y el gráfico suman todos.</li>
    <li><b>Vista:</b> "Explotada" separa los órganos para verlos por separado, con una línea tenue que marca cómo se conectan. Podés girar la cámara en ambas vistas.</li>
    <li><b>Bilis:</b> sin bilis las grasas se aprovechan mucho menos${av(' (sin emulsión, la lipasa trabaja al 20%)')}. También podés tocar la vesícula (la bolita verde bajo el hígado).</li>
    <li><b>Ácido gástrico:</b> con antiácido el estómago pierde acidez y casi no corta proteínas${av(' (sube a pH 5 y la pepsina se apaga)')}.</li>
    <li><b>Velocidad:</b> el reloj se acelera distinto en cada órgano para que todos se vean; el valor ×N indica cuánto.</li>
    <li><b>Info avanzada:</b> muestra u oculta los nombres de enzimas, el pH y los detalles del modelo.</li>
  </ul>
  <h3>Atajos de teclado</h3>
  ${listaAtajos(Object.values(ATAJOS))}
  <h3>Predecí antes de correr</h3>
  <p>Cuando rompés la bilis o el ácido, el lab te pregunta qué va a pasar antes de empezar. Elegí, dejá correr el tránsito y al final se revela si acertaste.</p>
  <h3>Qué es real y qué no</h3>
  <p><b>Real:</b> ${av('el pH por tramo, qué enzima actúa dónde, ')}los tiempos de tránsito típicos (estómago ~3 h, delgado ~4 h, grueso 12-36 h) y las kcal por gramo (4/4/9).</p>
  <p><b>Simplificado:</b> las tasas son aproximadas y no hay fibra ni agua. Los bocados no se mezclan entre sí: cada uno viaja solo, y con 3 la porción se reparte en partes iguales. El tamaño, la forma y el lugar del páncreas y del hígado son de maqueta, y la vista explotada no respeta distancias reales. El zoom a las vellosidades es una ilustración: no está a escala y las posiciones de los nutrientes son inventadas, aunque cuántos se ven sale del modelo. Modelo educativo: verificá los datos con tu docente o manual.</p>`
