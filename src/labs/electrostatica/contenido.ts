// Textos del lab. Todo el HTML de este archivo es estático y propio (se inyecta con innerHTML).

import { av } from '../../ui/avanzado'
import { numero } from '../../ui/formato'
import { fuentes } from '../../ui/fuentes'
import { MASA_RELATIVA, MATERIALES, PAPEL, Q_PUESTO, materialDe, polaridad, type Config, type Lado, type Resultado } from './model'

export const num = numero

export const pos = '<span class="c-ambar">+</span>'
export const neg = '<span class="c-cielo">−</span>'
const ambar = (t: string) => `<span class="c-ambar">${t}</span>`
const cielo = (t: string) => `<span class="c-cielo">${t}</span>`
const marca = (t: string) => `<span class="c-marca">${t}</span>`
/** Texto con el color de su signo (ámbar +, celeste −). */
export const conSigno = (texto: string, q: number) => (q > 0 ? ambar(texto) : q < 0 ? cielo(texto) : texto)
export const mayus = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** Carga con unidad (nC o µC), sin signo. */
export function cargaPartes(q: number): [string, string] {
  const nc = Math.abs(q) * 1e9
  return nc >= 1000 ? [num(nc / 1000, 2), 'µC'] : [num(nc, nc >= 100 ? 0 : 1), 'nC']
}
/** Carga con signo tipográfico: "−165 nC", "+15,0 nC", "0 nC". */
export function cargaTexto(q: number): string {
  if (q === 0) return '0 nC'
  const [v, u] = cargaPartes(q)
  return `${q > 0 ? '+' : '−'}${v} ${u}`
}

/** Fuerza con la unidad que corresponde a su tamaño: "58 mN", "0,20 mN", "4,3 µN". */
export function fuerzaPartes(f: number): [string, string] {
  const a = Math.abs(f)
  if (a === 0) return ['0', 'N']
  const escalas: [number, number, string][] = [[1, 1, 'N'], [1e-3, 1e3, 'mN'], [1e-6, 1e6, 'µN']]
  const [, factor, unidad] = escalas.find(([desde]) => a >= desde) ?? [0, 1e9, 'nN']
  const v = a * factor
  return [num(v, v >= 100 ? 0 : v >= 10 ? 1 : 2), unidad]
}
export const fuerzaTexto = (f: number) => fuerzaPartes(f).join(' ')

const SUPER = '⁰¹²³⁴⁵⁶⁷⁸⁹'
/** Número grande en notación científica, en dos partes: ["9,4", "× 10¹⁰"]. */
export function cientificaPartes(x: number): [string, string] {
  if (x === 0) return ['0', '']
  const exp = Math.floor(Math.log10(x))
  return [num(x / 10 ** exp, 1), `× 10${[...String(exp)].map((d) => SUPER[Number(d)]).join('')}`]
}
export const cientifica = (x: number) => cientificaPartes(x).join(' ')

export const nombreDe = (c: Pick<Config, 'par'>, lado: Lado) => MATERIALES[materialDe(c, lado)].det
/** "de el globo" → "del globo". */
export const de = (det: string) => (det.startsWith('el ') ? `del ${det.slice(3)}` : `de ${det}`)
/** "a el globo" → "al globo". */
const al = (det: string) => (det.startsWith('el ') ? `al ${det.slice(3)}` : `a ${det}`)
const otroLado = (l: Lado): Lado => (l === 'a' ? 'b' : 'a')

export const GANCHO = `Frotá dos materiales y se pasan electrones de uno a otro: uno queda con carga ${pos} y el otro con ${neg}. Después probá qué hace esa carga: atrae o repele a otro objeto, hace saltar papelitos y abre un electroscopio${av(', con la ley de Coulomb y la polarización')}.`

function relatoFrote(c: Config): string {
  const { negativo, positivo } = polaridad(c)
  return `<strong>Frotando.</strong> Al rozarse, algunos electrones pasan ${de(nombreDe(c, positivo))} ${al(nombreDe(c, negativo))}${av(': el que está más abajo en la serie triboeléctrica se queda con ellos')}. No se crea carga: se muda.`
}

function relatoNeutro(c: Config): string {
  const efecto = {
    cargas: 'no se atraen ni se repelen',
    papelitos: 'los papelitos ni se mueven',
    electroscopio: 'las hojas del electroscopio quedan cerradas',
  }[c.experimento]
  return `<strong>Todo neutro.</strong> ${mayus(nombreDe(c, 'a'))} y ${nombreDe(c, 'b')} tienen tantas cargas ${pos} como ${neg}, así que ${efecto}. Apretá <b>Frotar</b> para pasar electrones de uno a otro.`
}

function relatoCargas(c: Config, r: Resultado): string {
  const sonda = nombreDe(c, c.cual)
  const otro = c.otro === 'opuesto' ? nombreDe(c, otroLado(c.cual)) : 'otro objeto igual'
  const base = r.fuerza < 0
    ? `<strong>Se atraen.</strong> ${mayus(sonda)} (${conSigno(cargaTexto(r.q), r.q)}) y ${otro} (${conSigno(cargaTexto(r.q2), r.q2)}) tienen cargas opuestas.`
    : `<strong>Se repelen.</strong> ${mayus(sonda)} y ${otro} tienen carga del mismo signo (${conSigno(cargaTexto(r.q), r.q)} cada uno).`
  return `${base} A <b>${num(c.dist.cargas, 1)} cm</b> la fuerza es ${marca(fuerzaTexto(r.fuerza))}: la misma sobre cada uno, aunque empujen en sentidos contrarios.${av(' Es F = k·q₁·q₂ / d²: depende del producto de las cargas y del cuadrado de la distancia entre centros.')}`
}

/** Atracción (veces el peso) desde la que despegan todos, también el más pesado (1,25) y el más descentrado (a ~1,5 cm de lado, a 2,4 cm de altura la fuerza es ~0,44 de la de justo debajo). */
const TODOS_DESPEGAN = 3

function relatoPapelitos(c: Config, r: Resultado, pegados: number): string {
  const sonda = nombreDe(c, c.cual)
  const d = num(c.dist.papelitos, 1)
  const fuerza = `${marca(fuerzaTexto(r.fuerzaPapel))} (${num(r.vecesPeso, r.vecesPeso >= 10 ? 0 : 1)} veces su peso)`
  const causa = ` Los papelitos están neutros, pero el campo ${de(sonda)} separa un poco sus cargas${av(' (polarización)')}: el lado cercano queda con carga de signo opuesto y el lejano con el mismo. El cercano está más cerca, así que la atracción le gana a la repulsión.`
  if (pegados > 0) return `<strong>Un papelito neutro sí es atraído.</strong> A ${d} cm la fuerza es ${fuerza}.${causa} Si alejás el objeto hasta que la atracción no le gane al peso, se despegan y caen.`
  if (r.vecesPeso >= TODOS_DESPEGAN) return `<strong>Los papelitos saltan.</strong> A ${d} cm la atracción es ${fuerza}.${causa}`
  if (r.vecesPeso >= MASA_RELATIVA.min) return `<strong>Justo en el borde.</strong> A ${d} cm la atracción (${fuerza}) ya alcanza para los más livianos y los más cercanos al objeto: despegan algunos, el resto no.`
  return `<strong>Todavía no se mueven.</strong> A ${d} cm hay atracción, pero de ${fuerza}: no alcanza para levantarlos.${av(' La fuerza cae como 1/d⁵: a la mitad de distancia es 32 veces mayor.')} Bajá ${sonda}.`
}

function relatoElectroscopio(c: Config, r: Resultado): string {
  const sonda = nombreDe(c, c.cual)
  const signo = r.q > 0 ? pos : neg
  if (r.angulo < 1) return '<strong>Las hojas están cerradas.</strong> A esta distancia llega casi nada de carga: acercá el objeto.'
  return `<strong>Las hojas se abren ${num(r.angulo * 2, 0)}°.</strong> ${mayus(sonda)} (${signo}) no toca el electroscopio, pero atrae las cargas ${r.q > 0 ? neg : pos} hacia la perilla y empuja las ${signo} hacia las hojas. Las dos hojas quedan con el mismo signo, se repelen y se separan.${av(' Al retirar el objeto las cargas vuelven y las hojas se cierran: es inducción, sin contacto.')}`
}

/** Relato de "ahora": qué pasa con los números del momento. `pegados`: papelitos pegados al objeto. */
export function relato(c: Config, r: Resultado, frotando: boolean, pegados: number): string {
  if (frotando) return relatoFrote(c)
  if (c.frote === 0) return relatoNeutro(c)
  return { cargas: relatoCargas(c, r), papelitos: relatoPapelitos(c, r, pegados), electroscopio: relatoElectroscopio(c, r) }[c.experimento]
}

const SERIE = Object.values(MATERIALES)
  .sort((a, b) => a.lugar - b.lugar)
  .map((m) => `${m.nombre} (${m.lugar})`)
  .join(' · ')

export const COMO_FUNCIONA = `
  <h2>¿Cómo funciona?</h2>
  <p>Todo es neutro: tiene tantas cargas ${pos} (protones) como ${neg} (electrones). Al frotar dos materiales, algunos <b>electrones</b> pasan de uno al otro. El que los recibe queda con carga ${neg}; el que los perdió, ${pos}, y en <b>la misma cantidad</b>. No se crea carga: se muda de lugar.${av(' Cuánto pasa depende de qué tan separados están los materiales en la serie triboeléctrica.')}</p>
  <h3>Qué mirar</h3>
  <ul>
    <li>Frotá un par de materiales. Los electrones (puntitos celestes) viajan del que está más arriba en la serie al que está más abajo.</li>
    <li><b>Cargas:</b> acercale al objeto cargado el otro objeto frotado (carga opuesta: se atraen) o uno igual (mismo signo: se repelen). La fuerza cae con el cuadrado de la distancia: al doble, un cuarto.</li>
    <li><b>Papelitos:</b> un objeto cargado atrae papelitos que no tienen carga. El papelito se polariza (sus cargas se separan un poquito) y eso alcanza para levantarlo si está cerca.</li>
    <li><b>Electroscopio:</b> acercá el objeto sin tocar. Las hojas se cargan por inducción, se repelen y se abren. Cuanta más carga y más cerca, más se abren.</li>
  </ul>
  <h3>Predecí antes de correr</h3>
  <p>Antes de frotar, de alejar al doble o de acercar el objeto a los papelitos, el lab te pregunta qué va a pasar. Elegí y después se revela con los números del modelo. Con "Preguntas: No" lo usás libre.</p>
  <h3>Qué es real y qué no</h3>
  <p><b>Real:</b> frotar pasa electrones de un material a otro y los dos objetos quedan con cargas iguales y opuestas (la carga total se conserva); cargas del mismo signo se repelen y de signo opuesto se atraen; la fuerza entre cargas puntuales es k·q₁·q₂/d² (se comprobó con una precisión de 1 parte en 10¹⁶); un objeto neutro se polariza y es atraído por uno cargado; la electricidad estática común mueve entre nC y µC; la serie triboeléctrica ordena los materiales según quién se queda con los electrones.</p>
  <p><b>Simplificado:</b></p>
  <ul>
    <li>Los objetos son <b>cargas puntuales</b> ubicadas en su centro y la distancia del deslizador es entre centros. Un globo real tiene la carga repartida por la superficie y, cerca, la fuerza no sigue exactamente 1/d².</li>
    <li>La serie triboeléctrica es una lista empírica y <b>el orden cambia entre fuentes</b> (en una de las listas de la Universidad de Iowa la lana está más arriba que el nailon y el vidrio; en la de Wesleyan es al revés). Acá se usa la de los kits de clase de Carolina (${SERIE}; el número es el puesto en esa lista, y el plástico es vinilo, PVC). El globo de látex no figura en todas: Carolina lo pone como "rubber balloon" entre el ámbar y la goma dura.</li>
    <li>La cantidad de carga es un <b>parámetro del modelo</b>: ${num(Q_PUESTO * 1e9, 0)} nC por cada puesto de diferencia entre los dos materiales. La fuente solo dice que la electricidad estática común va de nC a µC. En la realidad depende de la humedad (con aire húmedo la carga se escapa), de la presión y del roce, y dos frotadas distintas dan cargas distintas. Acá el frotado es siempre completo.</li>
    <li>El papelito (${num(PAPEL.masa * 1e6, 0)} mg, de ${num(PAPEL.radio * 200, 1)} cm de lado) y el electroscopio (fracción de carga que llega a las hojas, su atenuación con la distancia y la masa de las hojas) son <b>parámetros de ajuste</b>, no datos medidos: se eligieron para que un papelito salte a pocos centímetros y las hojas se abran decenas de grados, como en una demostración de clase. Los papelitos se mueven en cámara lenta.</li>
    <li>El papelito se trata como una <b>esfera conductora</b> polarizable (F = 2·k·a³·q²/d⁵). Un papel real es un dieléctrico: su fuerza llevaría además el factor (εr−1)/(εr+2), menor que 1, que acá queda absorbido en el radio efectivo de 0,7 cm (otro parámetro de ajuste). Tiene también fibras y humedad y, una vez pegado, puede cargarse por contacto y salir despedido: acá se despega solo cuando la atracción deja de ganarle al peso.</li>
    <li>No hay descargas por el aire, chispas ni pérdida de carga con el tiempo.</li>
  </ul>
  ${fuentes([
    { texto: 'NIST, CODATA 2022, elementary charge: e = 1,602 176 634 × 10⁻¹⁹ C (valor exacto). De ahí sale la cantidad de electrones que pasan.', url: 'https://physics.nist.gov/cgi-bin/cuu/Value?e' },
    { texto: 'NIST, CODATA 2022, vacuum electric permittivity: ε₀ = 8,854 187 8188 × 10⁻¹² F/m. La constante de Coulomb sale de k = 1/(4π ε₀) = 8,9875517862 × 10⁹ N·m²/C², igual que Wikipedia (Coulomb\'s law) y el 8,988 × 10⁹ de OpenStax.', url: 'https://physics.nist.gov/cgi-bin/cuu/Value?ep0' },
    { texto: 'College Physics (OpenStax) 18.3, Coulomb\'s law: F = k|q₁q₂|/r²; la proporcionalidad con 1/r² se verificó con una precisión de 1 parte en 10¹⁶.', url: 'https://courses.lumenlearning.com/atd-austincc-physics2/chapter/18-3-coulombs-law/' },
    { texto: 'College Physics (OpenStax) 18.1, Static electricity and charge: la electricidad estática común mueve cargas de nanocoulombs a microcoulombs; la carga total es constante en todo proceso; el ámbar frotado con seda gana electrones.', url: 'https://courses.lumenlearning.com/atd-austincc-physics2/chapter/18-1-static-electricity-and-charge-conservation-of-charge/' },
    { texto: 'College Physics (OpenStax) 18.2, Conductors and insulators: la polarización es la separación de cargas en un objeto que sigue neutro.', url: 'https://courses.lumenlearning.com/atd-austincc-physics2/chapter/18-2-conductors-and-insulators/' },
    { texto: 'Carolina Knowledge Center, The triboelectric series: lista de los materiales de los kits de clase (vidrio, pelo, nailon, lana, piel, seda, aluminio, papel… globo de goma, goma dura… PVC, teflón); los más separados dan más carga.', url: 'https://knowledge.carolina.com/discipline/physical-science/the-triboelectric-series-an-introduction-for-static-electricity-labs/' },
    { texto: 'University of Iowa, Lecture Demonstrations 5A10.15 Triboelectric Series (reúne 6 listas con órdenes distintos) y Wesleyan University, Physics Demos 5A10.15 (lista de Adams, Nature\'s Electricity, 1987).', url: 'https://instructional-resources.physics.uiowa.edu/5a1015-triboelectric-series' },
  ])}`
