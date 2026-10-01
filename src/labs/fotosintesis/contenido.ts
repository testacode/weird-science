// Textos del lab. Todo el HTML de este archivo es estático y propio (se inyecta con innerHTML).
// Colores con significado: ámbar = glucosa, cielo = oxígeno, magenta = CO₂ y respiración, lima = la fotosíntesis.

import { av } from '../../ui/avanzado'
import { fuentes } from '../../ui/fuentes'
import { numero } from '../../ui/formato'
import { ABSORCION, P_MAX, type Config, type Derivados, type Estado, type Factor } from './model'

export const num = numero

/** Burbujas por minuto: con decimal cuando son pocas. */
export const burbujas = (n: number) => num(n, n < 10 ? 1 : 0)

export const FACTORES: Record<Factor, { corto: string; nombre: string; clase: string }> = {
  luz: { corto: 'Luz', nombre: 'la luz', clase: 'c-luz' },
  co2: { corto: 'CO₂', nombre: 'el CO₂', clase: 'c-magenta' },
  temp: { corto: 'Temp.', nombre: 'la temperatura', clase: 'c-temp' },
}

export const GANCHO = `Una rama de Elodea, una lámpara y un vaso. Con luz y <span class="c-magenta">CO₂</span> disuelto, la planta fabrica <span class="c-ambar">glucosa</span> y suelta <span class="c-cielo">oxígeno</span>: cada burbuja que sube es la prueba${av(' (6 CO₂ + 6 H₂O + luz → C₆H₁₂O₆ + 6 O₂)')}.`

/** El mito del verde, con los números del modelo. */
export const ABSORCION_VERDE = `La hoja absorbe casi tanta luz verde como blanca${av(` (${num(ABSORCION.verde * 100, 0)}% contra ${num(ABSORCION.blanca * 100, 0)}%)`)}: el verde no "rebota todo". La hoja se ve verde por lo poco que rebota.`

const o2 = (n: number) => `<span class="c-cielo">${num(n)} µmol/min</span>`

function consejo(c: Config, d: Derivados): string {
  if (Math.min(d.fLuz, d.fCo2, d.fTemp) >= 0.9) return 'Casi todo está al máximo: ningún factor frena mucho.'
  if (d.limita === 'luz') return 'Lo que frena es la luz: acercá la lámpara.'
  if (d.limita === 'co2') return `Lo que frena es el <span class="c-magenta">CO₂</span>: agregá bicarbonato.${av(' Aunque haya mucha luz, sin CO₂ el ciclo de Calvin no tiene materia prima.')}`
  if (d.fTemp >= 0.8) return 'La temperatura está cerca de la ideal (28 °C): ya queda poco por ganar.'
  return c.temperatura > 28
    ? `Hace demasiado calor: las enzimas empiezan a dañarse${av(' (desnaturalización)')}.`
    : `Hace frío: las enzimas trabajan lento${av(' (cada 10 °C menos, a la mitad)')}.`
}

export function relato(e: Estado, c: Config, d: Derivados): string {
  const contadas = `Burbujas contadas: <b>${e.burbujas}</b>.`
  if (!c.encendida)
    return `<strong>Sin luz.</strong> La fotosíntesis se frena (${o2(0)}), pero la planta sigue <span class="c-magenta">respirando</span>: gasta ${o2(d.resp)}. El balance es <b class="c-magenta">${num(d.neto)}</b>: no sale ninguna burbuja y el agua pierde oxígeno${av('. De noche la planta vive de la glucosa que guardó')}. ${contadas}`
  const luz = `Llega <span class="c-luz">${num(d.llega, 0)}% de luz</span> y la hoja absorbe <span class="c-luz">${num(d.absorbida, 0)}%</span>.`
  const fabrica = `Fabrica ${o2(d.bruta)}${d.neto > 0.02 ? ` (de un máximo de ${P_MAX})` : ''} y gasta ${o2(d.resp)} respirando`
  if (d.neto < -0.02)
    return `<strong>La respiración le gana.</strong> ${luz} ${fabrica}: el balance es <b class="c-magenta">${num(d.neto)}</b>, no sale ninguna burbuja y el agua pierde oxígeno. ${consejo(c, d)} ${contadas}`
  if (d.neto <= 0.02)
    return `<strong>Empate.</strong> ${luz} ${fabrica}: no sobra oxígeno para las burbujas. ${consejo(c, d)} ${contadas}`
  return `<strong>Frena ${FACTORES[d.limita].nombre}.</strong> ${luz} ${fabrica}: salen <b>${burbujas(d.burbujasMin)} burbujas por minuto</b>. ${consejo(c, d)} ${contadas}`
}

export const COMO_FUNCIONA = `
  <h2>¿Cómo funciona?</h2>
  <p>Las plantas no comen: fabrican su alimento. Con la energía de la luz, convierten agua y <span class="c-magenta">dióxido de carbono</span> en <span class="c-ambar">glucosa</span> y liberan <span class="c-cielo">oxígeno</span>. Acá la rama de Elodea está en agua, así que el oxígeno sale en burbujas que se pueden contar.${av(' El modelo calcula µmol de O₂ por minuto: la fotosíntesis bruta es P_MAX · min(factor de luz, de CO₂, de temperatura) y de eso se resta una respiración constante. Cada burbuja de ~2 mm lleva unos 0,17 µmol de O₂, y se hacen 6 O₂ por cada glucosa.')}</p>
  <h3>Qué mirar</h3>
  <ul>
    <li>Los puntitos de <span class="c-luz">luz</span> viajan de la lámpara a la planta: los que se absorben desaparecen y los que rebotan se van. Con luz blanca, los que rebotan son sobre todo verdes.</li>
    <li>Los puntitos <span class="c-magenta">magenta</span> son CO₂ disuelto que entra a las hojas.</li>
    <li>Las burbujas <span class="c-cielo">celestes</span> son oxígeno. En el cuadrito de arriba ves una célula de la hoja con sus cloroplastos, que se encienden cuando trabajan.</li>
    <li>El gráfico muestra el <span class="c-cielo">balance de oxígeno</span>: lo que la planta fabrica con la fotosíntesis menos lo que gasta respirando. Arriba del 0 sobra oxígeno y salen burbujas; debajo del 0 la planta gasta más de lo que fabrica y el agua pierde oxígeno.</li>
  </ul>
  <h3>Controles</h3>
  <ul>
    <li><b>Distancia de la lámpara:</b> más lejos, menos luz${av(' (cae con el cuadrado de la distancia: al doble, la cuarta parte)')}. Si ya hay mucha luz, acercarla ayuda cada vez menos${av(' (curva de saturación)')}.</li>
    <li><b>CO₂ disuelto:</b> el agua de la canilla tiene poco. Con bicarbonato hay más.</li>
    <li><b>Temperatura:</b> con frío las enzimas van lentas y con mucho calor se dañan. La mejor está cerca de los 28 °C.</li>
    <li><b>Color de la luz:</b> la hoja absorbe muy bien el rojo y el azul, y un poco menos el verde (pero igual la mayor parte).</li>
    <li><b>¿Qué frena a la planta?</b> Manda el factor más escaso${av(' (ley de Blackman, o del mínimo de Liebig)')}: mejorar los otros no sirve hasta que arregles ese. Es como un cuello de botella.</li>
    <li><b>Info avanzada:</b> muestra u oculta las fórmulas y los detalles del modelo.</li>
  </ul>
  <h3>Predecí antes de correr</h3>
  <p>Cuando apagás la luz o elegís la luz verde, el lab te pregunta qué va a pasar. Elegí, dejá correr 2 minutos del experimento y se revela si acertaste.</p>
  <h3>Qué es real y qué no</h3>
  <p><b>Real:</b> la ecuación de la fotosíntesis, que la respiración sigue siempre (también de noche), que la hoja absorbe menos el verde que el rojo y el azul (aunque usa la mayor parte), que la luz cae con la distancia, que la tasa se frena con frío y con calor, y que el oxígeno de una planta acuática se puede contar en burbujas.</p>
  <p><b>Simplificado:</b> las constantes son aproximadas (la absorción de cada color es una estimación para una hoja fina como la de Elodea, a partir de mediciones en otras hojas), la respiración no cambia con la temperatura, el O₂ sale todo en burbujas (en la realidad parte queda disuelto en el agua), la lámpara no calienta el agua, el cuadrito de la célula no está a escala y la maqueta tampoco. Modelo educativo: verificá los datos con tu docente o manual.</p>
  ${fuentes([
  { texto: 'Liu y van Iersel, «Photosynthetic Physiology of Blue, Green, and Red Light», <i>Frontiers in Plant Science</i>, 2021: cuánta luz de cada color absorbe una hoja.', url: 'https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2021.619987/full' },
  { texto: 'Terashima y otros, «Green light drives leaf photosynthesis more efficiently than red light in strong white light», <i>Plant Cell Physiol</i>, 2009: la luz verde también hace fotosíntesis.', url: 'https://pubmed.ncbi.nlm.nih.gov/19246458/' },
  { texto: '<i>NIST Chemistry WebBook</i>: masa molar de la glucosa.', url: 'https://webbook.nist.gov/cgi/cbook.cgi?ID=C50997&Units=SI' },
  ])}`
