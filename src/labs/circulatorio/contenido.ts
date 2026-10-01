// Textos del lab. Todo el HTML de este archivo es estático y propio (se inyecta con innerHTML).
// Colores con significado: rojo = sangre con O₂, azul = sangre que volvió de los tejidos, lima = latidos, ámbar = lo que pide el cuerpo, magenta = el defecto.

import { av } from '../../ui/avanzado'
import { fuentes } from '../../ui/fuentes'
import { numero } from '../../ui/formato'
import { ACELERACION, EXTRACCION_MAXIMA, SAO2, VFS, gradoFuga, tamanoAgujero, type Config, type Derivados, type Estado } from './model'

export const num = numero

const rojo = (t: string) => `<span class="c-sangre">${t}</span>`
const azul = (t: string) => `<span class="c-venosa">${t}</span>`
const marca = (t: string) => `<span class="c-marca">${t}</span>`
const ambar = (t: string) => `<span class="c-ambar">${t}</span>`
const magenta = (t: string) => `<span class="c-magenta">${t}</span>`
const pct = (x: number, dec = 0) => `${num(x * 100, dec)} %`

export const GANCHO = `El corazón es una bomba doble: manda la ${azul('sangre que volvió del cuerpo')} a los pulmones, donde se carga de oxígeno, y la ${rojo('sangre con oxígeno')} a todo el cuerpo. Cada ${marca('latido')} empuja un poco de sangre${av(' (gasto cardíaco = latidos por minuto × volumen de cada latido)')}. Probá correr, o romper el corazón con una válvula que no cierra o un agujero en el tabique.`

const verbo = { reposo: 'En reposo', caminar: 'Caminando', correr: 'Corriendo' } as const

/** Qué pasa con el defecto elegido (vacío si no hay). */
function defecto(c: Config, d: Derivados): string {
  if (c.defecto === 'valvula') {
    return `<strong>Válvula con fuga (${gradoFuga(c.gravedad)}).</strong> En cada latido el ventrículo izquierdo empuja ${num(c.volumen, 0)} mL, pero ${num(d.regurgitado, 0)} mL (${pct(c.gravedad)}) vuelven a la aurícula: el corazón bombea ${marca(`${num(d.bombea, 1)} L/min`)} y al cuerpo llegan solo ${rojo(`${num(d.cuerpo, 1)} L/min`)}. `
  }
  if (c.defecto === 'tabique') {
    return `<strong>Agujero en el tabique (${tamanoAgujero(d.qpqs)}).</strong> Como la presión del lado izquierdo es mucho mayor, ${num(d.cortocircuito, 0)} mL de cada latido, <i>ya oxigenados</i>, pasan al lado derecho y vuelven a los pulmones sin ir al cuerpo: los pulmones reciben ${marca(`${num(d.pulmones, 1)} L/min`)} y el cuerpo ${rojo(`${num(d.cuerpo, 1)} L/min`)} (${num(d.qpqs, 1)}:1). La sangre que sale al cuerpo sigue con ${rojo(pct(d.satArterial))} de saturación. `
  }
  return ''
}

/** Relato de "ahora": cuenta qué pasa en el cuerpo con los números del momento. */
export function relato(c: Config, d: Derivados, e: Estado): string {
  const llega = rojo(`${num(d.cuerpo, 1)} L/min`)
  const pide = ambar(`${num(d.vo2, 0)} mL de O₂ por minuto`)
  const sat = azul(pct(e.svo2))
  const inicio = defecto(c, d)
  if (!d.alcanza) {
    return `${inicio}<strong>No alcanza la sangre.</strong> ${verbo[c.actividad]}, el cuerpo pide ${pide}. Aunque los músculos saquen hasta el ${pct(EXTRACCION_MAXIMA)} del O₂ de cada gota, con ${llega} solo se le pueden entregar ${num(d.entrega, 0)} mL por minuto. Hacen falta unos ${rojo(`${num(d.necesario, 1)} L/min`)} al cuerpo${c.defecto === 'ninguno' ? '' : ` (el ventrículo tendría que bombear ${marca(`${num(d.necesarioBombeo, 1)}`)})`}: subí la frecuencia o el volumen de cada latido.`
  }
  if (Math.abs(e.svo2 - d.svoMeta) > 0.03) {
    return `${inicio}<strong>El cuerpo se está acomodando.</strong> ${verbo[c.actividad]}, ${llega} alcanzan para los ${pide}: la sangre que vuelve de los tejidos tiene ${sat} de saturación y va hacia ${azul(pct(d.svoMeta))}. Toda la sangre tarda un rato en dar la vuelta.`
  }
  const extra = c.actividad === 'reposo' && c.defecto === 'ninguno' ? ' Toda la sangre del cuerpo (≈ 5 L) pasa por el corazón más o menos una vez por minuto.' : ''
  return `${inicio}<strong>${c.defecto === 'ninguno' ? 'Todo en equilibrio' : 'Alcanza, con esfuerzo extra'}.</strong> ${verbo[c.actividad]}, el corazón late ${marca(`${num(c.frecuencia, 0)} veces por minuto`)} y manda ${num(c.volumen, 0)} mL cada vez. Los tejidos sacan el ${pct(d.extraccion)} del O₂ de la sangre para cubrir los ${pide}, y la sangre vuelve con ${sat} de saturación.${extra}`
}

/** Aviso destacado (o `null`): la sangre no alcanza para lo que pide el cuerpo. */
export function aviso(d: Derivados): string | null {
  return d.alcanza ? null : '<strong>Zona de riesgo.</strong> Así los músculos se quedarían sin energía enseguida. El cuerpo real lo corrige solo: el cerebro acelera el corazón. Acá lo controlás vos.'
}

export const COMO_FUNCIONA = `
  <h2>¿Cómo funciona?</h2>
  <p>El corazón es una bomba doble. El lado derecho (a la izquierda del dibujo, como si la persona te mirara) manda la ${azul('sangre que volvió del cuerpo')} a los pulmones (circuito pulmonar): ahí se carga de oxígeno y vuelve al lado izquierdo, que la ${rojo('empuja con fuerza a todo el cuerpo')} (circuito sistémico). Cada lado tiene una <b>aurícula</b>, que recibe la sangre, y un <b>ventrículo</b>, que la expulsa; las <b>válvulas</b> dejan pasar la sangre en un solo sentido.${av(` El gasto cardíaco es frecuencia × volumen sistólico, y el volumen sistólico es lo que expulsa el ventrículo: el volumen con el que termina de llenarse menos el que le queda al vaciarse (acá ${VFS} mL). Con el oxígeno vale el principio de Fick: lo que consume el cuerpo es la sangre que le llega × el O₂ que saca de cada litro.`)}</p>
  <h3>Qué mirar</h3>
  <ul>
    <li>Las <b>cámaras</b> se achican al expulsar la sangre (sístole) y se llenan después (diástole); las válvulas se abren y cierran en cada latido.</li>
    <li>Las bolitas son sangre: ${rojo('rojas')} con oxígeno y ${azul('azules')} sin mucho. Cambian de color en los capilares: azul → rojo en los pulmones, rojo → azul en el cuerpo.</li>
    <li>El bloque de abajo es el <b>cuerpo</b>: brilla ${ambar('ámbar')} con lo que pide y parpadea en magenta si la sangre no alcanza.</li>
    <li>El gráfico muestra cuánta sangre ${marca('bombea')} el corazón, cuánta ${rojo('llega al cuerpo')} y cuánta ${ambar('hace falta')}.</li>
  </ul>
  <h3>Controles</h3>
  <ul>
    <li><b>Frecuencia y volumen:</b> cuántas veces late y cuánta sangre expulsa cada vez. Juntos dan el gasto cardíaco. El botón de valores típicos los ajusta como lo haría el cuerpo para la actividad elegida.</li>
    <li><b>Actividad:</b> caminar o correr hace que el cuerpo ${ambar('pida más O₂')}.</li>
    <li><b>Romper el sistema:</b> una ${magenta('válvula que no cierra')} (parte de la sangre vuelve para atrás) o un ${magenta('agujero en el tabique')} (parte de la sangre pasa de un lado al otro). El deslizador elige qué tan grave.</li>
    <li><b>Info avanzada:</b> muestra u oculta los detalles del modelo.</li>
  </ul>
  <h3>Predecí antes de correr</h3>
  <p>Al abrir el lab te pregunta cuánta sangre bombea el corazón en reposo; y cuando empezás a correr, abrís una válvula o un agujero en el tabique, te pregunta qué va a pasar. Elegí, dejá correr unos segundos y se revela si acertaste.</p>
  <h3>Qué es real y qué no</h3>
  <p><b>Real:</b> en reposo el corazón late ≈ 70 veces por minuto y expulsa ≈ 70 mL cada vez (≈ 5 L por minuto, casi toda la sangre del cuerpo); con el esfuerzo el gasto puede llegar a 20–25 L/min; un latido dura ≈ 0,8 s a 75 por minuto (sístole 0,3 s, diástole 0,5 s); en reposo los tejidos sacan ≈ 25 % del oxígeno de la sangre y en el esfuerzo máximo casi 90 %; la fuga de una válvula se mide por la fracción de cada latido que vuelve; y un agujero en el tabique manda sangre de izquierda a derecha porque el lado izquierdo tiene mucha más presión (≈ 120 mmHg contra ≈ 20), así que la sangre que sale al cuerpo <i>no</i> pierde oxígeno: lo que se sobrecarga son los pulmones y el ventrículo izquierdo. Además la sangre sin oxígeno <i>no es azul</i>: es rojo oscuro (las venas se ven azules por cómo la piel dispersa la luz); acá es azul por convención.</p>
  <p><b>Simplificado:</b> es una persona adulta de 70 kg con 15 g/dL de hemoglobina y ${pct(SAO2)} de saturación al salir de los pulmones (el volumen sistólico de libro es 70 mL; por resonancia sale ≈ 90 mL). El defecto se controla con una sola gravedad: en la realidad el paso por el agujero depende de su tamaño y de la resistencia de los pulmones y del cuerpo, y una fuga crónica agranda el ventrículo. Si la presión del lado derecho superara a la izquierda el paso se invertiría y sí llegaría sangre pobre en O₂ al cuerpo (no se modela). El cuerpo es un solo bloque (no hay reparto del flujo entre órganos) y los dos pulmones son un solo circuito. El corazón real regula solo su frecuencia (acá la elegís vos), y por encima de ≈ 180 por minuto los ventrículos ya no alcanzan a llenarse: los deslizadores no pasan de 24 L/min. La sístole a otras frecuencias, la frecuencia y el volumen típicos por actividad (una interpolación entre reposo y esfuerzo máximo) y la rapidez con que se mezcla la sangre son ajustes del modelo: el reloj del cuerpo va ${ACELERACION} veces más rápido que el real para que los cambios se vean en segundos. El latido se dibuja en tiempo real, pero la sangre circula más rápido que la verdadera (una vuelta completa en reposo tarda ≈ 1 minuto). Los valores son de libro de texto y aproximados: verificalos con tu docente o manual.</p>
  ${fuentes([
  { texto: '«Cardiac output», Wikipedia: ≈ 5 L/min en reposo con 70 latidos por minuto y ≈ 70 mL por latido; la entrega de oxígeno es gasto × contenido de O₂.', url: 'https://en.wikipedia.org/wiki/Cardiac_output' },
  { texto: '«Stroke volume», Wikipedia: volumen sistólico, volumen al final de la sístole (≈ 50 mL) y valores por resonancia.', url: 'https://en.wikipedia.org/wiki/Stroke_volume' },
  { texto: '«Heart rate», Wikipedia: frecuencia en reposo de 60–100 por minuto y máxima ≈ 220 − edad.', url: 'https://en.wikipedia.org/wiki/Heart_rate' },
  { texto: '«Cardiac cycle» y «Diastole», Wikipedia: un latido dura 0,8 s a 75 por minuto, con sístole de 0,3 s y diástole de 0,5 s.', url: 'https://en.wikipedia.org/wiki/Diastole' },
  { texto: '«Fick principle», Wikipedia: 1,34 mL de O₂ por gramo de hemoglobina; ≈ 200 mL/L en sangre arterial y ≈ 150 mL/L en la venosa mixta (≈ 75 %).', url: 'https://en.wikipedia.org/wiki/Fick_principle' },
  { texto: 'Magder, «Mechanical Limits of Cardiac Output at Maximal Aerobic Exercise», IntechOpen, 2022: extracción de O₂ y gasto cardíaco máximos.', url: 'https://www.intechopen.com/chapters/81078' },
  { texto: '«Blood volume», Wikipedia: un adulto tiene ≈ 5 L de sangre.', url: 'https://en.wikipedia.org/wiki/Blood_volume' },
  { texto: '«Oxygen saturation (medicine)», Wikipedia: saturación arterial normal de 96–100 % y venosa de 60–80 %.', url: 'https://en.wikipedia.org/wiki/Oxygen_saturation_(medicine)' },
  { texto: '«Mitral valve regurgitation», Wikipedia: fracción regurgitante y grados de la fuga.', url: 'https://en.wikipedia.org/wiki/Mitral_valve_regurgitation' },
  { texto: '«Ventricular septal defect», Wikipedia: paso de izquierda a derecha por la diferencia de presión (≈ 120 contra ≈ 20 mmHg).', url: 'https://en.wikipedia.org/wiki/Ventricular_septal_defect' },
  { texto: 'UTMB, «Left-to-Right Shunts»: los flujos pulmonar y sistémico son iguales (Qp/Qs = 1) y con el paso el flujo pulmonar es mayor.', url: 'https://www.utmb.edu/pedi_ed/CoreV2/Cardiology/Cardiology8.html' },
  { texto: 'Bradley, «Ventricular Septal Defects (VSD)», STS Adult and Pediatric Cardiac: tamaño del agujero según Qp:Qs (< 1,5 pequeño, 1,5–3 moderado, > 3 grande).', url: 'https://ebook.sts.org/sts/view/Cardiac-and-Congenital/1864080/all/Ventricular_Septal_Defects__VSD_' },
  { texto: 'Herrmann y otros, «2024 Adult Compendium of Physical Activities»: oxígeno que consume el cuerpo al correr y al caminar.', url: 'https://pacompendium.com/running/' },
  { texto: '«Blood», Wikipedia: la sangre es rojo vivo con oxígeno y rojo oscuro sin él; las venas se ven azules por la luz en la piel.', url: 'https://en.wikipedia.org/wiki/Blood' },
  ])}`
