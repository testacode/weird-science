// Textos del lab. Todo el HTML de este archivo es estático y propio (se inyecta con innerHTML).
// Colores con significado: cielo = O₂, magenta = CO₂, lima = aire, ámbar = lo que pide el cuerpo, rojo = sangre.

import { av } from '../../ui/avanzado'
import { fuentes } from '../../ui/fuentes'
import { numero } from '../../ui/formato'
import { ACELERACION, ESPACIO_MUERTO, FICO2, QUIEBRE_CO2, estadoEn, saturacion, type Config, type Derivados, type Estado } from './model'

export const num = numero

const cielo = (t: string) => `<span class="c-cielo">${t}</span>`
const magenta = (t: string) => `<span class="c-magenta">${t}</span>`
const marca = (t: string) => `<span class="c-marca">${t}</span>`
const ambar = (t: string) => `<span class="c-ambar">${t}</span>`

export const GANCHO = `Respirar no es llenar la panza de aire: el ${marca('aire')} baja por la tráquea hasta los alvéolos, donde el ${cielo('oxígeno')} pasa a la <span class="c-sangre">sangre</span> y el ${magenta('CO₂')} hace el camino inverso. Probá correr, subir a la montaña o aguantar la respiración${av(' (aire por minuto = frecuencia × aire por respiración)')}.`

/** "Reposo", "Caminar", "Correr" en el relato. */
const verbo = { reposo: 'En reposo', caminar: 'Caminando', correr: 'Corriendo' } as const

function consejo(c: Config): string {
  return c.volumen < 0.8 && c.frecuencia >= 25
    ? `Respirás rápido pero poco: buena parte de cada bocanada se queda en la tráquea y los bronquios (${num(ESPACIO_MUERTO * 1000, 0)} mL de espacio muerto) y no llega a los alvéolos. Probá respirar más hondo.`
    : 'Subí la frecuencia o la profundidad.'
}

/** Relato de "ahora": cuenta qué pasa en el cuerpo con los números del momento. */
export function relato(c: Config, d: Derivados, e: Estado): string {
  const sat = cielo(`${num(d.spo2, 0)} %`)
  const co2 = av(` (${magenta(`${num(e.paco2, 0)} mmHg`)})`)
  const pide = ambar(`${num(d.vo2, 0)} mL de O₂ por minuto`)
  if (c.aguanta) {
    return `<strong>Aguantando la respiración.</strong> No entra ni sale aire: el ${cielo('O₂')} de los pulmones se va gastando (saturación ${sat}) y el ${magenta('CO₂')} se acumula${co2}. Cuando llegue a unos ${QUIEBRE_CO2} mmHg el cerebro te va a obligar a respirar${av(': lo que te apura es el CO₂, no la falta de O₂')}.`
  }
  const sale = d.sale!
  if (!d.alcanza) {
    return `<strong>No alcanza el aire.</strong> ${verbo[c.actividad]}, el cuerpo pide ${pide}${c.altura >= 1000 ? ` y a ${num(c.altura, 0)} m cada bocanada trae menos O₂` : ''}. Con ${marca(`${num(d.ve, 1)} L de aire por minuto`)} no llega: la saturación baja hacia ${sat}${e.paco2 > 45 ? ` y el ${magenta('CO₂')} sube${co2}` : ''}. Hacen falta unos ${marca(`${num(d.necesario, 0)} L/min`)}. ${consejo(c)}`
  }
  if (e.paco2 < 30) {
    return `<strong>Respirás de más.</strong> Movés ${marca(`${num(d.ve, 1)} L/min`)} y el cuerpo necesita ${num(d.necesario, 0)}: el ${magenta('CO₂')} de la sangre baja${co2} y por eso te marearías. La saturación casi no mejora (${sat}): la hemoglobina ya estaba casi llena.`
  }
  // Con aire suficiente pero la sangre todavía lejos de su valor de equilibrio (después de aguantar o de acelerar).
  const meta = estadoEn(c)
  if (Math.abs(e.paco2 - meta.paco2) > 2 || Math.abs(d.spo2 - saturacion(meta.pao2)) > 2) {
    return `<strong>El cuerpo se está acomodando.</strong> ${verbo[c.actividad]}, ${marca(`${num(d.ve, 1)} L de aire por minuto`)} alcanzan para los ${pide}: la saturación (${sat}) va hacia ${cielo(`${num(saturacion(meta.pao2), 0)} %`)} y el ${magenta('CO₂')} hacia su valor normal${co2}. La sangre tarda un poco en enterarse.`
  }
  const veces = sale.co2 / (FICO2 * 100)
  return `<strong>Todo en equilibrio.</strong> ${verbo[c.actividad]}, ${marca(`${num(d.ve, 1)} L de aire por minuto`)} alcanzan para los ${pide} que pide el cuerpo, y la sangre sale con ${sat} de saturación. Del aire que entra (21 % de O₂) la sangre se queda con una parte: sale con ≈ ${cielo(`${num(sale.o2, 0)} % de O₂`)} y ${magenta(`${num(sale.co2, 1)} % de CO₂`)}, unas ${num(veces, 0)} veces más CO₂ que el que entró.`
}

/** Por qué se cortó el aguante (o no se pudo empezar), con el CO₂ de ese momento. */
export type Motivo = { tipo: 'quiebre' | 'imposible'; co2: number }

/** Aviso destacado (o `null`): el cerebro obligó a respirar, o la respiración fija ya sería peligrosa. */
export function aviso(c: Config, d: Derivados, e: Estado, motivo: Motivo | null): string | null {
  if (motivo?.tipo === 'quiebre') {
    return `<strong>El cerebro te obligó a respirar.</strong> El ${magenta('CO₂')} llegó a ${num(motivo.co2, 0)} mmHg y el cuerpo no te dejó aguantar más, aunque todavía quedaba O₂ en la sangre. Mirá cómo se recupera.`
  }
  if (motivo?.tipo === 'imposible') {
    return `<strong>No podés aguantar ahora.</strong> El ${magenta('CO₂')} ya está en ${num(motivo.co2, 0)} mmHg (el cerebro obliga a respirar desde unos ${QUIEBRE_CO2}). Respirá hasta que baje y probá de nuevo.`
  }
  return !c.aguanta && (d.spo2 < 88 || e.paco2 > 60)
    ? '<strong>Zona de riesgo.</strong> Con la respiración fija así, tu cuerpo real ya te habría obligado a respirar más: el cerebro lo hace solo. Acá la controlás vos.'
    : null
}

export const COMO_FUNCIONA = `
  <h2>¿Cómo funciona?</h2>
  <p>Respiramos para que el ${cielo('oxígeno')} del aire llegue a la <span class="c-sangre">sangre</span> y el ${magenta('dióxido de carbono')} que produce el cuerpo salga. Los músculos del pecho y el diafragma agrandan el tórax, el aire baja por la tráquea y los bronquios hasta los alvéolos (hay cientos de millones) y ahí cruza la pared finita hacia los capilares.${av(' El modelo calcula el aire que llega a los alvéolos como frecuencia × (aire por respiración − 150 mL de espacio muerto), y con eso el O₂ y el CO₂ alveolares (ecuación del gas alveolar). La saturación sale de la curva de la hemoglobina (P50 ≈ 27 mmHg).')}</p>
  <h3>Qué mirar</h3>
  <ul>
    <li>El <b>diafragma</b> baja al inspirar y sube al exhalar; los pulmones se estiran con él.</li>
    <li>Las bolitas son moléculas de aire: ${cielo('celestes')} = O₂, ${magenta('magenta')} = CO₂ y grises = nitrógeno y el resto. Entra mucho gris y algo de celeste; sale gris, menos celeste y un poco de magenta.</li>
    <li>En el <b>zoom</b> ves un alvéolo: el ${cielo('O₂')} pasa a la sangre y el ${magenta('CO₂')} sale hacia la boca del alvéolo. La sangre se pone más oscura cuando le falta oxígeno.</li>
    <li>El gráfico muestra la ${cielo('saturación de O₂')} (qué porcentaje de la hemoglobina lleva oxígeno) y el ${magenta('CO₂')} de la sangre.</li>
  </ul>
  <h3>Controles</h3>
  <ul>
    <li><b>Frecuencia y profundidad:</b> cuántas veces respirás y cuánto aire movés cada vez. Juntas dan el ${marca('aire por minuto')}. Respirar muy rápido y poco sirve de poco: el espacio muerto se lleva lo mejor.</li>
    <li><b>Actividad:</b> caminar o correr hace que el cuerpo ${ambar('pida más O₂')} y produzca más CO₂.</li>
    <li><b>Altura:</b> en la montaña el aire sigue siendo 21 % oxígeno, pero hay menos aire en cada bocanada${av(' (la presión baja y con ella la presión parcial de O₂)')}.</li>
    <li><b>Romper el sistema:</b> aguantar la respiración o subir a 4.000 m.</li>
    <li><b>Info avanzada:</b> muestra u oculta los detalles del modelo y el CO₂ en mmHg.</li>
  </ul>
  <h3>Predecí antes de correr</h3>
  <p>Al abrir el lab te pregunta por el aire que exhalás, y cuando empezás a correr, subís a la montaña o aguantás la respiración te pregunta qué va a pasar. Elegí, dejá correr unos segundos y se revela si acertaste.</p>
  <h3>Qué es real y qué no</h3>
  <p><b>Real:</b> el aire tiene 21 % de O₂ y exhalamos ≈ 16 % de O₂ y ≈ 4 % de CO₂ (no usamos todo el oxígeno, y el gas que el cuerpo agrega es el CO₂, además del vapor de agua), el espacio muerto, que la saturación normal ronda 97 %, que a más esfuerzo hace falta más aire, que la presión baja con la altura, y que lo que te obliga a volver a respirar es el CO₂.</p>
  <p><b>Simplificado:</b> es una persona adulta de 70 kg. La curva de la hemoglobina usa un valor de libro (la mitad de saturación a ~27 mmHg). La respiración queda fija en lo que elegís, pero el cerebro real la ajusta solo (por eso acá las situaciones se ponen peor que en la vida real). El reloj del cuerpo va ${ACELERACION} veces más rápido que el real (así los cambios se ven en segundos), pero la maqueta respira en tiempo real. La absorción de O₂ de la sangre es una versión simplificada (se frena sola cuando el alvéolo se queda sin O₂), así que no conserva el O₂ al detalle. No incluye aclimatación a la altura ni el corazón (los latidos son solo dibujo). El alvéolo es esquemático y no está a escala. Los valores son de libro de texto y aproximados: verificalos con tu docente o manual.</p>
  ${fuentes([
  { texto: 'Herrmann y otros, «2024 Adult Compendium of Physical Activities», <i>Journal of Sport and Health Science</i>: oxígeno que consume el cuerpo al correr.', url: 'https://pacompendium.com/running/' },
  { texto: 'Mismo Compendium, sección caminar: oxígeno que consume el cuerpo al caminar.', url: 'https://pacompendium.com/walking/' },
  { texto: 'Stock, Schisler y McSweeney, «The PaCO2 rate of rise in anesthetized patients with airway obstruction», <i>J Clin Anesth</i>, 1989: cuánto sube el CO₂ al no respirar.', url: 'https://pubmed.ncbi.nlm.nih.gov/2516732/' },
  { texto: '«Atmosphere of Earth», Wikipedia: el aire tiene 20,95 % de O₂ y 0,04 % de CO₂.', url: 'https://en.wikipedia.org/wiki/Atmosphere_of_Earth' },
  { texto: '«Barometric formula», Wikipedia: cómo baja la presión con la altura (atmósfera estándar).', url: 'https://en.wikipedia.org/wiki/Barometric_formula' },
  { texto: '«Alveolar gas equation», Wikipedia: vapor de agua de las vías aéreas (47 mmHg).', url: 'https://en.wikipedia.org/wiki/Alveolar_gas_equation' },
  { texto: '«Hill equation (biochemistry)», Wikipedia: coeficiente de Hill de la hemoglobina.', url: 'https://en.wikipedia.org/wiki/Hill_equation_(biochemistry)' },
  { texto: '«Breathing», Wikipedia: el aire exhalado tiene 4-5 % de CO₂.', url: 'https://en.wikipedia.org/wiki/Breathing' },
  { texto: 'MacIntosh y otros, <i>Open Textbook of Exercise Physiology</i>, cap. 7, LibreTexts: presión de O₂ de la sangre venosa.', url: 'https://med.libretexts.org/Bookshelves/Sports_and_Exercise/Open_Textbook_of_Exercise_Physiology_(MacIntosh)/02:_The_Fundamentals_of_Exercise_Physiology/2.05:_Chapter_7_-_Pulmonary_Function_Gas_Exchange_Between_the_Environment_and_Blood' },
  ])}`
