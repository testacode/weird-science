// Textos del lab. Todo el HTML de este archivo es estático y propio (se inyecta con innerHTML).
// Colores con significado: ámbar = lo que llega (incidencia), magenta = lo que se refleja, celeste = lo que se refracta.

import { av } from '../../ui/avanzado'
import { fuentes } from '../../ui/fuentes'
import { numero } from '../../ui/formato'
import { listaAtajos } from '../../ui/teclado'
import { ATAJOS } from './teclado'
import { N_AIRE, esAire, indice, nombreMedio, velocidad, type Config, type Resultado } from './model'

export const num = numero
export const cm = (n: number) => `${num(n, 1)} cm`
const grados = (n: number) => `${num(n, 1)}°`
const porcentaje = (f: number) => `${num(f * 100, f < 0.1 ? 1 : 0)} %`
export const kms = (n: number) => `${num(n, 0)} km/s`

export const GANCHO = `Un láser, un espejo y una pecera. El rayo <span class="c-ambar">que llega</span> se <span class="c-magenta">refleja</span> y, si pasa de un medio a otro, se <span class="c-cielo">dobla</span>${av(' (ley de Snell: n₁ · sen θ₁ = n₂ · sen θ₂)')}.`

const entrada = (r: { incidencia: number }) => `<span class="c-ambar">${grados(r.incidencia)}</span>`

export function relato(c: Config, r: Resultado): string {
  const medio = nombreMedio(c).toLowerCase()
  if (r.escena === 'espejo') {
    if (c.espejo === 0) {
      return `<strong>Sale con el mismo ángulo con el que llega.</strong> Llega con ${entrada(r)} respecto de la normal (la perpendicular al espejo) y se va con <span class="c-magenta">${grados(r.reflexion)}</span>. Es la ley de la reflexión.${av(' Los tres, rayo que llega, normal y rayo que sale, están en un mismo plano.')}`
    }
    return `<strong>Giraste el espejo ${grados(c.espejo)} y el rayo giró ${grados(r.giroRayo)}.</strong> Cambió la normal, y con ella el ángulo de incidencia (${entrada(r)}): la reflexión sigue siendo igual a la incidencia (<span class="c-magenta">${grados(r.reflexion)}</span>), pero medida desde la normal nueva.${av(' El rayo reflejado gira 2δ cuando el espejo gira δ: el espejo mueve la normal y el rayo se mueve con ella, dos veces.')}`
  }
  if (r.escena === 'lapiz') {
    if (esAire(c)) return `<strong>El lápiz se ve derecho.</strong> Con un medio de índice igual al del aire la luz no se desvía al salir: lo sumergido está justo donde lo ves, a ${cm(r.profundidad)}.`
    return `<strong>El lápiz parece quebrado.</strong> La punta está a ${cm(r.profundidad)} de profundidad, pero la luz que sale del ${medio} se dobla al pasar al aire y el ojo la ve a <span class="c-cielo">${cm(r.aparente)}</span>, más cerca de la superficie.${av(` Lo sumergido se ve achicado por tan β / tan α = ${num(r.factor, 2)} (mirando desde ${num(c.ojo, 0)}°); mirando de arriba sería n_aire / n = ${num(N_AIRE / r.n, 2)}.`)}`
  }
  const n = indice(c)
  const reparto = `Se refleja el <span class="c-magenta">${porcentaje(r.reflectancia)}</span> de la luz y pasa el resto.`
  const velocidades = av(` En el aire la luz va a ${kms(velocidad(N_AIRE))}; en el ${medio}, a ${kms(velocidad(n))} (c / n).`)
  if (esAire(c)) {
    return `<strong>El rayo no se dobla.</strong> El medio tiene el índice del aire (n = ${num(n, 2)}): la luz no cambia de velocidad al pasar, así que sigue derecho (${entrada(r)} → <span class="c-cielo">${grados(r.refraccion ?? 0)}</span>) y casi no se refleja. La pecera deja de verse.`
  }
  if (r.refraccion === null) {
    return `<strong>Reflexión total: no sale nada.</strong> Llega con ${entrada(r)}, más que el ángulo crítico (${grados(r.critico ?? 0)}). Se refleja el 100 % y vuelve al ${medio}. Así viaja la luz dentro de una fibra óptica.${av(' Pasado el crítico, n₁ · sen θ₁ / n₂ da más que 1 y no existe ángulo de refracción.')}`
  }
  if (c.desde === 'aire') {
    return `<strong>Entra y se acerca a la normal.</strong> Llega con ${entrada(r)} y adentro del ${medio} queda en <span class="c-cielo">${grados(r.refraccion)}</span>: la luz va más lenta (n = ${num(n, 3)}) y se dobla hacia la normal. ${reparto}${velocidades}`
  }
  return `<strong>Sale y se aleja de la normal.</strong> Llega con ${entrada(r)} y en el aire sale con <span class="c-cielo">${grados(r.refraccion)}</span>. ${reparto} Con más de ${grados(r.critico ?? 0)} ya no saldría nada.${velocidades}`
}

export const COMO_FUNCIONA = `
  <h2>¿Cómo funciona?</h2>
  <p>La luz viaja en línea recta hasta que llega a un límite. Ahí una parte <span class="c-magenta">rebota</span> (reflexión) y otra <span class="c-cielo">pasa doblada</span> (refracción) porque en cada medio la luz va a otra velocidad. Los ángulos se miden desde la <b>normal</b>, la línea punteada perpendicular a la superficie.${av(' Ley de la reflexión: θ_reflexión = θ_incidencia. Ley de Snell: n₁ · sen θ₁ = n₂ · sen θ₂, con n = c / v el índice de refracción del medio.')}</p>
  <h3>Qué mirar</h3>
  <ul>
    <li>El arco <span class="c-ambar">ámbar</span> es el ángulo con el que llega el láser, el <span class="c-magenta">magenta</span> el del rayo reflejado y el <span class="c-cielo">celeste</span> el del rayo que pasa al otro medio.</li>
    <li>Si el rayo pasa a un medio con más índice (del aire al agua, al vidrio o al diamante) se <b>acerca</b> a la normal; si pasa a uno con menos, se <b>aleja</b>.</li>
    <li>Cuanto más inclinado llega el rayo, más luz se refleja${av(' (ecuaciones de Fresnel)')}. El brillo que se dibuja sube más rápido que la luz real, para que un 2 % se note.</li>
    <li>El gráfico muestra con qué ángulo sale el rayo según el ángulo con el que entra: no es una recta.</li>
  </ul>
  <h3>Las tres escenas</h3>
  <ul>
    <li><b>Espejo:</b> el rayo sale con el mismo ángulo con el que llega. Al girar el espejo, el rayo gira el doble.</li>
    <li><b>Refracción:</b> el láser puede estar en el aire o adentro del medio. Desde adentro, pasado el <b>ángulo crítico</b>, la luz no sale: se refleja toda (reflexión total interna).</li>
    <li><b>Lápiz:</b> un lápiz clavado en el medio y un ojo que lo mira. El ojo ve lo sumergido más cerca de la superficie que lo real (el fantasma blanco), por eso un lápiz en un vaso parece quebrado.</li>
  </ul>
  <h3>Romper el sistema</h3>
  <ul>
    <li><b>Medio con el índice del aire:</b> la luz no cambia de velocidad al pasar, no se dobla y la pecera se vuelve invisible.</li>
    <li><b>Medio inventado:</b> elegí vos el índice (no existe un líquido de 2,5; es para ver qué pasa).</li>
    <li><b>Láser adentro del medio:</b> con ángulos grandes, reflexión total. El diamante tiene el crítico más chico: atrapa la luz con ángulos más abiertos.</li>
  </ul>
  <h3>Predecí antes de correr</h3>
  <p>Cuando girás el espejo, cambiás de medio, metés el láser adentro del medio o pasás al lápiz, el lab te pregunta qué va a pasar. Elegí una opción y se hace el cambio: unos segundos después se revela si acertaste, con los números del modelo.</p>
  <h3>Atajos de teclado</h3>
  ${listaAtajos(Object.values(ATAJOS))}
  <h3>Qué es real y qué no</h3>
  <p><b>Real:</b> las leyes de la reflexión y de Snell; que el ángulo crítico sale de los índices (48,6° del agua al aire, unos 41° del vidrio común, 24° del diamante); los índices de agua, vidrio, aceite, diamante y aire; el reparto de la luz según Fresnel; y la profundidad aparente (mirando de arriba, el fondo se ve a n_aire / n de su profundidad real: la pileta parece más baja de lo que es).</p>
  <p><b>Simplificado:</b> un solo rayo y un solo límite plano, sin segundos rebotes (el rayo que baja no rebota en el fondo de la pecera) ni paredes de vidrio; los índices son a ≈ 589 nm (luz amarilla del sodio): un puntero rojo (≈ 650 nm) tiene un índice apenas menor, y los colores no se separan (sin dispersión). El espejo es ideal (refleja todo) y el aceite es el de oliva (su índice va de 1,4677 a 1,4705; se usa 1,469). El vidrio es el común de ventana (el de lentes finas, tipo BK7, da 1,517). El ojo está lejos y mira en el mismo plano que el lápiz; la pecera sin ancho de vidrio; el medio "inventado" y su rango son parámetros de la maqueta, no materiales; también lo son las medidas (pecera, lápiz inclinado 30°, distancia del ojo) y el ángulo con el que se mete el láser adentro del medio (11° más que el crítico). El brillo del rayo dibujado no es proporcional a la luz real, y que la pecera desaparezca con n ≈ 1 es una decisión de dibujo. Modelo educativo: verificá los datos con tu docente o manual.</p>
  ${fuentes([
    { texto: 'RefractiveIndex.INFO, <i>Daimon y Masumura 2007</i>: índice del agua a 20 °C (1,3333 a 589,3 nm).', url: 'https://refractiveindex.info/?shelf=main&book=H2O&page=Daimon-20.0C' },
    { texto: 'RefractiveIndex.INFO, <i>Rubin 1985</i>: vidrio común (soda-lime), 1,5233 a 589,3 nm. Control con el crown BK7 de Schott: 1,5167.', url: 'https://refractiveindex.info/?shelf=glass&book=soda-lime&page=Rubin-clear' },
    { texto: 'RefractiveIndex.INFO, <i>Peter 1923</i>: índice del diamante, 2,4173 a 589,3 nm.', url: 'https://refractiveindex.info/?shelf=main&book=C&page=Peter' },
    { texto: 'RefractiveIndex.INFO, <i>Ciddor 1996</i>: índice del aire estándar (15 °C, 101,325 kPa), 1,000277 a 589,3 nm.', url: 'https://refractiveindex.info/?shelf=other&book=air&page=Ciddor' },
    { texto: '«Olive oil», Wikipedia: índice de refracción del aceite de oliva, 1,4677–1,4705.', url: 'https://en.wikipedia.org/wiki/Olive_oil' },
    { texto: '«Total internal reflection», Wikipedia: ángulo crítico de unos 49° (agua al aire) y 42° (vidrio común al aire).', url: 'https://en.wikipedia.org/wiki/Total_internal_reflection' },
    { texto: '«Snell\'s law», Wikipedia: ley de Snell y ángulo crítico del agua al aire, 48,6°.', url: 'https://en.wikipedia.org/wiki/Snell%27s_law' },
    { texto: '«Reflection (physics)», Wikipedia: ley de la reflexión.', url: 'https://en.wikipedia.org/wiki/Reflection_(physics)' },
    { texto: '«Fresnel equations», Wikipedia: reflexión y transmisión de la luz en un límite.', url: 'https://en.wikipedia.org/wiki/Fresnel_equations' },
    { texto: '«Refraction», Wikipedia: profundidad aparente.', url: 'https://en.wikipedia.org/wiki/Refraction' },
    { texto: 'NIST, CODATA 2022: velocidad de la luz en el vacío, 299 792 458 m/s (exacta).', url: 'https://physics.nist.gov/cgi-bin/cuu/Value?c' },
  ])}`
