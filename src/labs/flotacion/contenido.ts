// Textos del lab. Todo el HTML de este archivo es estático y propio (se inyecta con innerHTML).
// Colores con significado: magenta = peso, cielo = empuje, lima = lo sumergido, ámbar = aceite.

import { av } from '../../ui/avanzado'
import { fuentes } from '../../ui/fuentes'
import { numero } from '../../ui/formato'
import { OBJETOS, PLANETAS, nombreLiquido, type Config, type Derivados, type Estado } from './model'

export const num = numero

/** Newtons con dos decimales si son pocos y uno si son muchos. */
export const newtons = (n: number) => num(n, n < 10 ? 2 : 1)
/** Densidades en kg/m³ con separador de miles. */
export const kgm3 = (n: number) => `${num(n, 0)} kg/m³`

export const GANCHO = `Soltá un objeto en la pecera y mirá dos flechas: el <span class="c-magenta">peso</span> lo tira para abajo y el <span class="c-cielo">empuje</span> del líquido lo sube. Si el empuje alcanza al peso, flota${av(' (Arquímedes: E = ρ_líquido · V_sumergido · g)')}.`

const peso = (d: Derivados) => `<span class="c-magenta">${newtons(d.peso)} N</span>`
const empuje = (d: Derivados) => `<span class="c-cielo">${newtons(d.empuje)} N</span>`

function densidades(c: Config, d: Derivados): string {
  return av(` Densidad del ${OBJETOS[c.objeto].nombre.toLowerCase()}: ${kgm3(d.rhoObjeto)}; del líquido: ${kgm3(d.rhoLiquido)}.`)
}

function relatoBarco(c: Config, e: Estado, d: Derivados): string {
  const lleno = num(e.lleno * 100, 0)
  if (c.agujero && e.lleno > 0.01 && d.flota)
    return `<strong>Entra líquido por el agujero.</strong> El casco ya tiene ${lleno} % de agua adentro y pesa ${peso(d)}; el empuje es ${empuje(d)}. Cada gota que entra lo hace más denso.${av(` Densidad media: ${kgm3(d.rhoObjeto)} contra ${kgm3(d.rhoLiquido)} del líquido: se hunde cuando la pasa.`)}`
  if (c.agujero && !d.flota)
    return `<strong>${d.fase === 'fondo' ? 'Se hundió' : 'Se hunde'}.</strong> Con el casco lleno de líquido su densidad media (${kgm3(d.rhoObjeto)}) pasó la del líquido: el peso (${peso(d)}) le gana al empuje (${empuje(d)}).`
  return ''
}

export function relato(c: Config, e: Estado, d: Derivados, soltado: boolean): string {
  const nombre = OBJETOS[c.objeto].nombre.toLowerCase()
  const liquido = nombreLiquido(c).toLowerCase()
  const pct = `<span class="c-marca">${num(d.sumergido * 100, 0)} % sumergido</span>`
  if (!soltado)
    return `<strong>Listo para soltar.</strong> El ${nombre} pesa ${peso(d)}. Todavía no toca el ${liquido}: no hay empuje.${densidades(c, d)}`
  const barco = c.objeto === 'barco' ? relatoBarco(c, e, d) : ''
  if (barco) return barco
  const casco = c.objeto === 'barco' ? ' No es acero macizo: la chapa y el aire de adentro dan una densidad media baja.' : ''
  switch (d.fase) {
    case 'aire':
      return `<strong>Cayendo.</strong> Solo actúa el peso (${peso(d)}): todavía no toca el ${liquido}, así que no hay empuje.${densidades(c, d)}`
    case 'flota':
      return `<strong>Flota.</strong> El peso (${peso(d)}) y el empuje (${empuje(d)}) se igualan: queda ${pct}.${casco}${av(` ρ_obj / ρ_líq = ${num(d.rhoObjeto, 0)} / ${num(d.rhoLiquido, 0)} = ${num(d.equilibrio, 2)}: esa es la parte que queda bajo el líquido.`)}`
    case 'sube':
      return `<strong>Sube.</strong> El empuje (${empuje(d)}) le gana al peso (${peso(d)}) mientras está todo sumergido: sube hasta la superficie.${densidades(c, d)}`
    case 'hunde':
      return `<strong>Se hunde.</strong> El peso (${peso(d)}) le gana al empuje (${empuje(d)}): baja hasta el fondo.${densidades(c, d)}`
    case 'fondo':
      return `<strong>Se hundió.</strong> Todo sumergido, el empuje es ${empuje(d)} y el peso ${peso(d)}: el fondo sostiene la diferencia (${newtons(d.apoyo)} N).${av(` Es más denso que el líquido (${kgm3(d.rhoObjeto)} contra ${kgm3(d.rhoLiquido)}).`)}${c.planeta !== 'tierra' ? ` En ${PLANETAS[c.planeta].lugar} todo pesa menos, pero se hunde igual.` : ''}`
  }
}

export const COMO_FUNCIONA = `
  <h2>¿Cómo funciona?</h2>
  <p>Todo lo que se mete en un líquido recibe un empuje hacia arriba igual al peso del líquido que desplaza. Si ese empuje alcanza al <span class="c-magenta">peso</span> del objeto, flota; si no, se hunde. Lo que decide no es cuánto pesa, sino cuánto pesa <i>por cada litro que ocupa</i>: la densidad.${av(' El modelo usa E = ρ_líquido · V_sumergido · g y P = m · g. Si ρ_objeto < ρ_líquido, flota con una fracción sumergida de ρ_objeto / ρ_líquido, que no depende de g ni del tamaño. La dinámica es m · a = E − P − c · v, con un roce que lo frena sin rebotes infinitos.')}</p>
  <h3>Qué mirar</h3>
  <ul>
    <li>La flecha <span class="c-magenta">magenta</span> es el peso (para abajo) y la <span class="c-cielo">celeste</span> es el empuje (para arriba). Miden lo mismo mientras el objeto flota quieto. Su largo es proporcional a la fuerza, con la misma escala para un mismo objeto.</li>
    <li>Cuando se hunde, la flecha del peso es más larga que la del empuje y el fondo sostiene la diferencia.</li>
    <li>El gráfico muestra las dos fuerzas en el tiempo: al soltar el objeto el empuje arranca en cero, crece al entrar y, si flota, se encuentra con el peso.</li>
  </ul>
  <h3>Controles</h3>
  <ul>
    <li><b>Objeto:</b> madera, hielo, plástico, piedra, metal macizo, un barquito de metal hueco y un huevo. Cada cambio vuelve a soltarlo.</li>
    <li><b>Líquido:</b> agua dulce, agua salada, aceite o alcohol: cada uno tiene su densidad${av(' (1.000, ~1.025 el mar, 920 y 790 kg/m³)')}.</li>
    <li><b>Sal en el agua:</b> con más sal el agua es más densa y empuja más. El huevo, que se hunde en agua dulce, empieza a flotar cuando el agua pasa su densidad.</li>
    <li><b>Tamaño:</b> con un objeto más grande pesa más y empuja más, pero la parte sumergida es la misma.</li>
    <li><b>Info avanzada:</b> muestra u oculta las densidades y las fórmulas.</li>
  </ul>
  <h3>Romper el sistema</h3>
  <ul>
    <li><b>Barco agujereado:</b> entra líquido por un agujero del fondo. El casco no cambia de tamaño pero pesa cada vez más, su densidad media sube y, al pasar la del líquido, se hunde.</li>
    <li><b>Cambiar de planeta:</b> con menos gravedad, ¿flota distinto? No: el peso y el empuje bajan en la misma proporción. Lo que cambia es la fuerza, no el resultado.</li>
  </ul>
  <h3>Predecí antes de correr</h3>
  <p>Cuando elegís el barquito, lo agujereás o cambiás de planeta con un objeto que flota, el lab te pregunta qué va a pasar. Elegí una opción y se suelta el objeto: al quedar quieto se revela si acertaste.</p>
  <h3>Qué es real y qué no</h3>
  <p><b>Real:</b> el principio de Arquímedes, que la fracción sumergida es ρ_objeto / ρ_líquido, que el hielo flota en agua pero se hunde en alcohol, que un barco de acero flota porque su densidad media (metal + aire) es menor que la del agua, que la sal sube la densidad y que el peso y el empuje dependen de g de la misma manera.</p>
  <p><b>Simplificado:</b> el objeto solo sube y baja, sin dar vueltas ni volcarse (un barco real puede zozobrar aunque flote); el nivel del líquido no sube al meter el objeto; el hielo no se derrite; el roce es una amortiguación inventada y el tiempo corre en cámara lenta; el casco es una caja y el agujero un orificio chico por donde entra con la fórmula de Torricelli (solo entra por ahí: aunque el borde quede bajo el agua, no se inunda por arriba); el empuje se dibuja desde el centro del objeto y no desde el centro de la parte sumergida. Las densidades son de tabla y algunas aproximadas: la del huevo varía con la frescura, la del hielo es a 0 °C y el ajuste de la sal es lineal. Modelo educativo: verificá los datos con tu docente o manual.</p>
  ${fuentes([
  { texto: '<i>CRC Handbook of Chemistry and Physics</i>, 86.ª ed. (2005), vía «Sodium chloride (data page)», Wikipedia: densidad del agua salada.', url: 'https://en.wikipedia.org/wiki/Sodium_chloride_(data_page)' },
  { texto: 'The Engineering ToolBox, «Liquids - Densities»: agua, aceite y alcohol.', url: 'https://www.engineeringtoolbox.com/liquids-densities-d_743.html' },
  { texto: 'The Engineering ToolBox, «Densities of Solids»: hielo, granito y acero.', url: 'https://www.engineeringtoolbox.com/density-solids-d_1265.html' },
  { texto: 'The Engineering ToolBox, «Wood Species - Densities»: madera de pino.', url: 'https://www.engineeringtoolbox.com/wood-density-d_40.html' },
  { texto: '«Polyethylene», Wikipedia: densidad del plástico de las tapitas.', url: 'https://en.wikipedia.org/wiki/Polyethylene' },
  { texto: '«Physical quality of eggs of four strains of poultry», Redalyc: densidad del huevo.', url: 'https://www.redalyc.org/journal/3031/303168054052/html/' },
  ])}`
