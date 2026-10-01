// Textos del lab. Todo el HTML de este archivo es propio (se inyecta con innerHTML); los números salen del modelo.

import { av } from '../../ui/avanzado'
import { fuentes } from '../../ui/fuentes'
import { numero } from '../../ui/formato'
import { ESPECIES, METODOS, METODO_PROPIO, mezclaDe, metodoDe, type EspecieId } from './datos'
import { tEbullicionInicial } from './destilacion'
import { LUZ_TAMIZ_MM, PORO_FILTRO_MM, sugerirMetodos, veredictoDe, type Corrida, type Lectura } from './model'

export const num = numero

/** Nombre de una especie con su color (el mismo de la escena y el gráfico). */
export const esp = (e: EspecieId, nombre = ESPECIES[e].nombre) => `<span style="color:${ESPECIES[e].color}">${nombre}</span>`
const ART: Record<EspecieId, string> = { agua: 'el agua', arena: 'la arena', aceite: 'el aceite', sal: 'la sal', alcohol: 'el alcohol', hierro: 'el hierro' }
const con = (e: EspecieId) => esp(e, ART[e])
/** Concordancia con el artículo de cada componente: disuelto/disuelta, el mismo/la misma. */
const FEMENINO: Record<EspecieId, boolean> = { agua: true, arena: true, sal: true, aceite: false, alcohol: false, hierro: false }
const fem = (e: EspecieId) => FEMENINO[e]
const Con = (e: EspecieId) => esp(e, ART[e][0].toUpperCase() + ART[e].slice(1))
const mm = (v: number) => `${numero(v, Number.isInteger(Math.round(v * 100) / 10) ? 1 : 2)} mm`
const gramos = (g: number) => `${numero(g, g < 10 ? 1 : 0)} g`

export const GANCHO = `Una mezcla se separa aprovechando algo en lo que sus componentes son <em>distintos</em>${av(' (el tamaño, la densidad, el punto de ebullición, el magnetismo)')}. Pero ¿qué pasa si filtrás ${con('agua')} con ${con('sal')}?`

function ebullicion(e: EspecieId): string {
  const { humo, tEbullicion } = ESPECIES[e]
  if (humo) return `no hierve: humea y se quema a ~${num(humo, 0)} °C`
  return tEbullicion < 1000 ? `${num(tEbullicion)} °C` : 'más de 1000 °C'
}

/** Frase corta que presenta cada método (la propiedad que usa y el dato que importa). */
function presentar(c: Corrida): string {
  const { metodo } = c.config
  const partes = mezclaDe(c.config.mezcla).partes.map((p) => p.especie)
  const lista = partes.map((e) => `${con(e)}${ESPECIES[e].tamanoMm ? ` (${mm(ESPECIES[e].tamanoMm)})` : ''}`).join(' y ')
  switch (metodo) {
    case 'tamiz': return `El tamiz tiene agujeros de ${mm(LUZ_TAMIZ_MM)}: deja pasar lo más chico y frena lo más grande. Tamaños: ${lista}.`
    case 'filtro': return `El papel de filtro tiene poros de ${mm(PORO_FILTRO_MM)}: frena los granos y deja pasar el líquido. Tamaños: ${lista}.`
    case 'decantacion': return `En la ampolla, lo más denso se hunde y lo menos denso flota (siempre que no se mezclen). Densidades: ${partes.map((e) => `${con(e)} ${num(ESPECIES[e].densidad, 2)} g/mL`).join(', ')}.`
    case 'destilacion': return `Con el mechero el balón se calienta hasta que algo hierve; el vapor pasa por el refrigerante y vuelve a líquido. Ebullición: ${partes.map((e) => `${con(e)} ${ebullicion(e)}`).join(', ')}.`
    case 'iman': return `El imán solo atrae al hierro. ${partes.map((e) => `${con(e)}: ${ESPECIES[e].magnetico ? 'magnético' : 'no magnético'}`).join(', ')}.`
  }
}

function porqueTamiz(c: Corrida, l: Lectura): string {
  const luz = c.config.metodo === 'tamiz' ? LUZ_TAMIZ_MM : PORO_FILTRO_MM
  const lugar = c.config.metodo === 'tamiz' ? 'la malla' : 'el papel'
  const disuelta = c.porciones.find((p) => p.disuelta)
  const cristal = c.porciones.find((p) => p.id.endsWith('-cristal'))
  const { sale, queda } = c.ideal
  if (disuelta) {
    const g = l.salida[c.porciones.indexOf(disuelta)]
    const exceso = cristal ? ` Lo único que quedó arriba son los ${gramos(l.queda[c.porciones.indexOf(cristal)])} de cristales que no se pudieron disolver.` : ''
    return `${Con(disuelta.especie)} está <b>${fem(disuelta.especie) ? 'disuelta' : 'disuelto'}</b>: sus partículas miden menos de 1 nanómetro${av(' (iones sueltos entre las moléculas de agua)')}, miles de veces menos que ${lugar} (${mm(luz)}). Pasan con el agua: del otro lado salieron ${gramos(g)} de ${ESPECIES[disuelta.especie].nombre.toLowerCase()} ${fem(disuelta.especie) ? 'disuelta, la misma' : 'disuelto, el mismo'} que había.${exceso}`
  }
  if (!c.porciones.some((p) => ESPECIES[p.especie].estado === 'solido')) return `Ninguno de los dos tiene granos: los líquidos pasan juntos por ${lugar}. Para separar líquidos hace falta otra propiedad.`
  if (l.pureza === 0 && l.salida.every((g) => g < 0.5)) return `${Con(sale)} y ${con(queda)} son granos más grandes que ${lugar} (${mm(luz)}) y no hay un líquido que los arrastre: quedan los dos arriba, mezclados.`
  return `${Con(queda)} (grano de ${mm(ESPECIES[queda].tamanoMm)}) es más grande que ${lugar} (${mm(luz)}) y queda arriba; ${con(sale)} pasa${l.salida.some((g, i) => c.porciones[i].especie === queda && g > 0.3) ? `. Se coló ${gramos(l.salida[c.porciones.findIndex((p) => p.especie === queda)])} de ${ESPECIES[queda].nombre.toLowerCase()}: algunos granos son más chicos que los agujeros` : ''}.`
}

function porqueDecantacion(c: Corrida, l: Lectura): string {
  const { sale, queda } = c.ideal
  if (!c.conFases) {
    const disuelta = c.porciones.find((p) => p.disuelta)
    return disuelta
      ? `Es <b>una sola fase</b>: ${con(disuelta.especie)} está ${fem(disuelta.especie) ? 'disuelta' : 'disuelto'}${disuelta.especie === 'alcohol' ? ' (se mezcla con el agua en cualquier proporción)' : ''} y no hay una capa que separar. Al abrir la llave sale todo junto.`
      : 'No hay un líquido que sostenga las capas: al abrir la llave sale todo junto, sin separarse.'
  }
  const cristal = c.porciones.find((p) => p.id.endsWith('-cristal'))
  if (cristal) {
    const i = c.porciones.indexOf(cristal)
    const disuelta = c.porciones.filter((p) => p.disuelta && p.especie === cristal.especie).reduce((s, p) => s + p.masa, 0)
    return `Los ${gramos(l.salida[i])} de cristales que no se pudieron disolver son más densos que la solución (${num(ESPECIES[cristal.especie].densidad, 2)} g/mL contra ~${num(ESPECIES.agua.densidad, 2)} g/mL) y se hunden en ${num(c.tAsentado, 0)} s: salen por la llave. Los ${gramos(disuelta)} de ${ESPECIES[cristal.especie].nombre.toLowerCase()} disuelta <b>se quedan con el agua</b>: lo disuelto no se decanta.`
  }
  const solido = ESPECIES[sale].estado === 'solido'
  return `${Con(sale)} (${num(ESPECIES[sale].densidad, 2)} g/mL) es más ${fem(sale) ? 'densa' : 'denso'} que ${con(queda)} (${num(ESPECIES[queda].densidad, 2)} g/mL) y no ${solido ? 'se disuelve' : 'se mezcla'}: ${solido ? 'se hunde' : 'queda abajo'} en ${num(c.tAsentado, 0)} s${av(' (la velocidad sale de la ley de Stokes: depende de la diferencia de densidad y del tamaño)')}. Al abrir la llave sale la fase de abajo.${solido ? '' : ` En la interfase siempre se cuela un poquito (${gramos(l.salida.reduce((s, g, i) => s + (c.porciones[i].especie === queda ? g : 0), 0))} de ${ESPECIES[queda].nombre.toLowerCase()}).`}`
}

function porqueDestilacion(c: Corrida, l: Lectura): string {
  const { mezcla, tMechero } = c.config
  const tTop = Math.max(...c.temp)
  if (!c.hirvio) {
    return mezcla === 'hierro-arena'
      ? 'No hay nada que hierva: el hierro y la arena hierven a más de 2000 °C. El balón solo se calienta.'
      : `El mechero (${num(tMechero, 0)} °C) no alcanza: ${mezcla === 'agua-alcohol' ? `el alcohol puro hierve a ${num(ESPECIES.alcohol.tEbullicion)} °C, pero mezclado con agua` : 'esta mezcla'} hierve a ~${num(tEbullicionInicial(c.porciones), 0)} °C. El balón llegó a ${num(tTop)} °C y se quedó ahí. Hace falta que el mechero esté más caliente que el punto de ebullición.`
  }
  const lento = c.duracion > 3600 ? ` El mechero apenas supera la ebullición: hierve despacio y tarda ${num(c.duracion / 3600, 1)} h.` : ''
  if (mezcla === 'agua-alcohol') {
    const alc = l.salida[c.porciones.findIndex((p) => p.especie === 'alcohol')]
    return `${Con('alcohol')} hierve a ${num(ESPECIES.alcohol.tEbullicion)} °C y ${con('agua')} a ${num(ESPECIES.agua.tEbullicion, 0)} °C, pero se parecen tanto que el vapor sale <b>rico en alcohol, no puro</b>: el destilado tiene ${gramos(alc)} de alcohol y ${gramos(l.salida.reduce((s, g) => s + g, 0) - alc)} de agua. Con el mechero más bajo sale más puro pero recuperás menos. Para separarlos mejor hace falta una destilación fraccionada${av(' (y aun así el azeótropo etanol-agua, ~96 %, no se rompe destilando)')}.${lento}`
  }
  const volatil = c.ideal.sale
  const resto = c.ideal.queda
  return `Solo ${con(volatil)} hierve (${num(tTop)} °C): sale como vapor, se condensa en el refrigerante y cae al colector (${gramos(l.salida[c.porciones.findIndex((p) => p.especie === volatil)])}). ${Con(resto)} no hierve a esa temperatura y se queda en el balón${mezcla === 'agua-sal' ? `${av(`. La sal hierve a ${num(ESPECIES.sal.tEbullicion, 0)} °C. Con sal disuelta el agua hierve un poco arriba de 100 °C (ascenso ebulloscópico)`)}` : ''}.${tMechero > 200 ? ' Con el mechero tan fuerte el vapor sube a los chorros y arrastra gotitas del balón: el destilado sale menos puro.' : ''}${lento}`
}

function porqueIman(c: Corrida): string {
  return c.config.mezcla === 'hierro-arena'
    ? `${Con('hierro')} es <b>magnético</b>: el imán lo levanta. ${Con('arena')} no lo es: se queda en el vaso. Es el único método que usa esta propiedad.`
    : 'Ninguno de los componentes es magnético: el imán no atrae nada. Solo sirve cuando exactamente uno de los componentes lo es.'
}

export function explicacion(c: Corrida, l: Lectura): string {
  switch (c.config.metodo) {
    case 'tamiz': case 'filtro': return porqueTamiz(c, l)
    case 'decantacion': return porqueDecantacion(c, l)
    case 'destilacion': return porqueDestilacion(c, l)
    case 'iman': return porqueIman(c)
  }
}

const NOMBRE_VEREDICTO = { funciona: 'Funciona', parcial: 'Separa en parte', no: 'No separa' }
const COLOR_VEREDICTO = { funciona: 'c-marca', parcial: 'c-ambar', no: 'c-magenta' }

/** Relato en vivo de la tarjeta "ahora". */
export function relato(c: Corrida, l: Lectura, iniciado: boolean, tMechero: number): string {
  const { mezcla, metodo, sobresaturar } = c.config
  const tipo = c.tipo
  const detalleTipo = tipo.soluto
    ? ` Es una <b>solución</b>${av(`: ${con(tipo.soluto)} es el soluto y ${con(tipo.solvente!)} el solvente`)}.`
    : tipo.homogenea ? '' : ` Se distinguen ${tipo.fases} fases.`
  const encabezado = `<strong>${mezclaDe(mezcla).nombre}: mezcla ${tipo.homogenea ? 'homogénea' : 'heterogénea'}.</strong>${detalleTipo}`
  const sat = sobresaturar && mezcla === 'agua-sal' ? ` Hay más sal de la que el agua puede disolver (${num(ESPECIES.sal.solubilidad, 0)} g cada 100 mL a 20 °C): lo que sobra queda como <b>cristales</b> en el fondo.` : ''
  const propio = METODO_PROPIO[mezcla]
  const nota = propio && propio !== metodo ? ` Para esta mezcla el método propio es el <b>${metodoDe(propio).nombre.toLowerCase()}</b>.` : ''
  if (!iniciado) return `${encabezado}${sat} ${presentar(c)}${metodo === 'destilacion' ? ` Mechero a ${num(tMechero, 0)} °C.` : ''}${nota}`
  if (!l.terminado) {
    const sale = l.salida.reduce((s, g) => s + g, 0)
    const hacia = metodo === 'decantacion' && l.asentado < 1 ? ' Las fases se están separando…' : ''
    return `<strong>${metodoDe(metodo).nombre} en marcha.</strong> Ya salieron ${gramos(sale)} del origen.${hacia}${metodo === 'destilacion' && l.temp != null ? ` El balón está a ${num(l.temp)} °C.` : ''}`
  }
  const v = veredictoDe(l.pureza ?? 0)
  const { metodos, parcial } = sugerirMetodos(mezcla, sobresaturar)
  const pista = v === 'funciona' ? [] : metodos.filter((m) => m !== metodo)
  const nombres = pista.map((m) => `<b>${metodoDe(m).nombre.toLowerCase()}</b>`).join(', ')
  const sugerencia = pista.length ? ` Probá con: ${nombres}${parcial ? ` (es ${metodos[0] === 'decantacion' || metodos[0] === 'destilacion' ? 'la' : 'el'} que más separa, aunque no del todo)` : ''}.` : ''
  return `<strong class="${COLOR_VEREDICTO[v]}">${NOMBRE_VEREDICTO[v]}: pureza ${num(l.pureza ?? 0, 0)} %.</strong> ${explicacion(c, l)}${sugerencia}`
}

export const COMO_FUNCIONA = `
  <h2>¿Cómo funciona?</h2>
  <p>Una mezcla son dos o más sustancias juntas que conservan sus propiedades. Para separarlas se usa una propiedad en la que se diferencian. Elegí una mezcla, un método y apretá <b>Separar</b>.</p>
  <h3>Qué mirar</h3>
  <ul>
    <li>Cada componente tiene su color: ${esp('agua')}, ${esp('aceite')}, ${esp('alcohol')}, ${esp('sal')}, ${esp('arena')} y ${esp('hierro')}. Cada bolita es un puñado de gramos.</li>
    <li><b>Pureza</b>: qué tan limpios quedaron los dos productos. Es la del producto menos puro: un método que deja todo mezclado tiene pureza 0.${av(' Pureza = el menor de los dos cocientes "masa de la especie esperada dividida por la masa total del producto".')}</li>
    <li><b>Mezcla homogénea</b> (una sola fase: no se distingue un componente del otro) o <b>heterogénea</b> (se ven las partes).${av(' Una solución es una mezcla homogénea: el soluto (lo que se disuelve) se reparte entre las moléculas del solvente.')}</li>
    <li>El gráfico muestra los gramos de cada componente que ya están en el producto donde le corresponde.</li>
  </ul>
  <h3>Los métodos</h3>
  <ul>
    ${METODOS.map((m) => `<li><b>${m.nombre}</b>: ${{ tamiz: `separa por tamaño, con agujeros de ${mm(LUZ_TAMIZ_MM)}.`, filtro: `separa por tamaño, con poros de ${mm(PORO_FILTRO_MM)}.`, decantacion: 'separa por densidad dos fases que no se mezclan.', destilacion: 'separa por punto de ebullición. Es el único que usa el mechero.', iman: 'separa por magnetismo.' }[m.id]}</li>`).join('')}
  </ul>
  <h3>Romper el sistema</h3>
  <ul>
    <li><b>Filtrar agua salada</b>: la sal pasa el filtro porque está disuelta.</li>
    <li><b>Sobresaturar</b>: con más sal de la que cabe, el sobrante precipita como cristales y recién ahí el filtro lo puede frenar.</li>
  </ul>
  <h3>Qué es real y qué no</h3>
  <p><b>Real:</b> los puntos de ebullición, las densidades y la solubilidad de la sal (${num(ESPECIES.sal.solubilidad, 0)} g cada 100 mL de agua a 20 °C) son de tablas${av(' (redondeados)')}. Que lo disuelto atraviesa cualquier filtro, que lo denso se hunde y que el imán solo atrae al hierro.</p>
  <p><b>Simplificado:</b> unas 700 partículas dibujadas representan millones de millones. Los tamaños de grano son típicos (arena gruesa, limaduras finas), no medidos. Los tiempos están acelerados. La arena sale sin agua entre los granos, la solubilidad no cambia con la temperatura y la destilación es un modelo simple (el equilibrio etanol-agua es un ajuste propio, solo vale para ver tendencias). Modelo educativo: verificá los datos con tu docente o manual.</p>
  ${fuentes([
  { texto: '«Sodium chloride», «Iron» y «Silicon dioxide», Wikipedia (citan el <i>CRC Handbook</i>): densidad, ebullición y solubilidad de la sal, el hierro y la arena.', url: 'https://en.wikipedia.org/wiki/Sodium_chloride' },
  { texto: '<i>NIST Chemistry WebBook</i>: ebullición del etanol.', url: 'https://webbook.nist.gov/cgi/cbook.cgi?ID=C64175&Units=SI&Mask=4' },
  { texto: 'The Engineering ToolBox, «Liquids - Densities»: densidad del aceite y del alcohol.', url: 'https://www.engineeringtoolbox.com/liquids-densities-d_743.html' },
  { texto: '«Smoke point», Wikipedia: el aceite humea y se quema antes de hervir.', url: 'https://en.wikipedia.org/wiki/Smoke_point' },
  { texto: 'Escala de Wentworth, «Grain size», Wikipedia: tamaño de la arena gruesa.', url: 'https://en.wikipedia.org/wiki/Grain_size' },
  { texto: '«Salt, the Only Rock We Eat!», UC Master Food Preserver Program (2025): tamaño del grano de sal fina.', url: 'https://ucanr.edu/program/uc-master-food-preserver-program/article/salt-only-rock-we-eat-may-2025' },
  { texto: 'Sigma-Aldrich, tabla de conversión de tamaños de partícula: tamaño de las limaduras.', url: 'https://www.sigmaaldrich.com/US/en/support/calculators-and-apps/particle-size-conversion-table' },
  ])}`
