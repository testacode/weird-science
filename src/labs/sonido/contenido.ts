// Textos del lab. Todo el HTML de este archivo es propio (se inyecta con innerHTML); los números salen del modelo.
// Colores con significado: ámbar = partículas comprimidas, violeta = separadas, celeste = aire, lima = micrófono.

import { av } from '../../ui/avanzado'
import { fuentes } from '../../ui/fuentes'
import { numero } from '../../ui/formato'
import { AUDIBLE, L_TUBO, MEDIOS, NIVEL_PELIGRO, T_EMISION, UMBRAL_DB, formatoAire, frecuenciaOida, golpeTerminado, llegada, longitudOnda, nivelAire, nota, oido, vacioLogrado, type Config, type Estado } from './model'

export const num = numero

const comp = (t: string) => `<span class="c-ambar">${t}</span>`
const sep = (t: string) => `<span class="c-violeta">${t}</span>`
const aireC = (t: string) => `<span class="c-cielo">${t}</span>`
const ms = (s: number) => `${num(s * 1000, 1)} ms`

export const GANCHO = `El sonido es una vibración que viaja por un medio: cada partícula empuja a la vecina y ninguna hace el viaje entera. Mandá un tono o un golpe por tres tubos, de ${aireC('aire')}, <span class="c-agua">agua</span> y <span class="c-acero">acero</span>, y fijate cuál llega primero. Después sacale el aire a uno${av(' (el sonido necesita un medio material)')}.`

/** Qué tan fuerte es un nivel, con los tramos que dan NIDCD y NIOSH (60–70 dBA una conversación, 85 dBA ya daña). */
function referencia(nivel: number): string {
  if (nivel < UMBRAL_DB) return 'bajo el umbral de audición: no se oye'
  if (nivel < 60) return 'más suave que una conversación'
  if (nivel <= 70) return 'como una conversación normal'
  if (nivel < NIVEL_PELIGRO) return 'más fuerte que una conversación'
  return `desde ${NIVEL_PELIGRO} dB el oído se daña si dura`
}

export function textoNivel(nivel: number): string {
  return nivel === -Infinity ? '−∞' : num(nivel, 0)
}

/** Lo que dice "Se oye" en el HUD: sí o por qué no. */
export function textoOido(c: Config, e: Estado): string {
  const o = oido(frecuenciaOida(c), nivelAire(c.amplitud, e.aire))
  if (o === 'infra') return 'Infrasonido'
  if (o === 'ultra') return 'Ultrasonido'
  if (o === 'bajo') return c.amplitud === 0 ? 'Mudo' : e.aire < 0.5 ? 'Sin aire' : 'Muy bajo'
  return 'Sí'
}

function registro(f: number): string {
  return f < 250 ? 'un tono grave' : f < 2000 ? 'un tono medio' : 'un tono agudo'
}

const aireTxt = (aire: number) => {
  const { valor, unidad } = formatoAire(aire)
  return unidad === '%' ? `el ${valor} % del aire` : `${valor} Pa de aire`
}

/** Relato de "ahora": cuenta qué pasa con los números del momento. */
export function relato(c: Config, e: Estado): string {
  const nivel = nivelAire(c.amplitud, e.aire)
  const ref = `${textoNivel(nivel)} dB, ${referencia(nivel)}`
  if (e.aire < 0.9999) {
    const accion = c.bomba ? (vacioLogrado(e) ? 'La bomba llegó a su mínimo' : 'La bomba saca el aire') : 'Entra el aire de nuevo'
    return `<strong>${accion}: queda ${aireTxt(e.aire)} en el tubo de aire.</strong> La fuente sigue vibrando igual, pero hay cada vez menos aire para empujar: el micrófono marca ${ref}. En el agua y el acero no cambió nada: no necesitan aire, necesitan un medio.`
  }
  if (c.modo === 'tono') {
    const n = nota(c.frecuencia)
    const lambdas = MEDIOS.map((m) => `${num(longitudOnda(m.id, c.frecuencia), longitudOnda(m.id, c.frecuencia) < 1 ? 2 : 1)} m en el ${m.nombre.toLowerCase()}`).join(', ')
    const fuera = c.frecuencia < AUDIBLE.min ? ` Es infrasonido: está por debajo de los ${num(AUDIBLE.min, 0)} Hz que oye una persona.` : c.frecuencia > AUDIBLE.max ? ` Es ultrasonido: está por encima de los ${num(AUDIBLE.max, 0)} Hz que oye una persona.` : ''
    return `<strong>${num(c.frecuencia, 0)} Hz${n ? ` (${n.exacta ? '' : '≈ '}${n.nombre})` : ''}: ${registro(c.frecuencia)}.</strong> La fuente vibra ${num(c.frecuencia, 0)} veces por segundo y las partículas se ${comp('comprimen')} y se ${sep('separan')} a ese ritmo. La misma nota tiene otra longitud de onda en cada medio: ${lambdas}${av(' (λ = v / f)')}. Nivel en el aire: ${ref}.${fuera}`
  }
  const tAire = llegada('aire', c.distancia)
  if (e.golpe === null) return `<strong>Todo quieto.</strong> Apretá <b>¡Golpe!</b>: un empujón corto sale de la fuente y viaja por los tres tubos a la vez. El micrófono está a ${num(c.distancia, 1)} m: mirá en qué orden llega.`
  const llegados = MEDIOS.filter((m) => e.golpe! >= T_EMISION + llegada(m.id, c.distancia)).map((m) => `el ${m.nombre.toLowerCase()} a los ${ms(llegada(m.id, c.distancia))}`)
  if (golpeTerminado(e, c)) return `<strong>El golpe ya pasó por los tres micrófonos.</strong> Llegó ${llegados.join(', ')}. El más rápido le sacó ${ms(tAire - llegada('acero', c.distancia))} de ventaja al más lento${av(` (t = d / v, con d = ${num(c.distancia, 1)} m)`)}.`
  return `<strong>El golpe viaja${llegados.length ? '' : ' y todavía no llegó a ningún micrófono'}.</strong> ${llegados.length ? `Ya llegó ${llegados.join(' y ')}. ` : ''}La animación está en cámara lenta (÷${c.lenta}): el golpe de verdad tarda ${ms(tAire)} en el aire.`
}

export const COMO_FUNCIONA = `
  <h2>¿Cómo funciona?</h2>
  <p>El sonido es una <b>vibración</b>. Una fuente (un parlante) empuja y suelta a las partículas que tiene al lado, cada una empuja a la siguiente, y así la vibración recorre el medio sin que ninguna partícula viaje con ella. Por eso necesita <b>algo</b> que vibre: aire, agua, un metal.</p>
  <h3>Qué mirar</h3>
  <ul>
    <li>Tres tubos de ${L_TUBO} m: aire (arriba), agua y acero. A la izquierda la fuente; el anillo es el micrófono y se enciende cuando le llega la vibración.</li>
    <li>Las bolitas ${comp('ámbar')} están comprimidas, las ${sep('violetas')} separadas y las de color apagado en reposo. El aire va suelto, el agua apretada y el acero en una red ordenada.</li>
    <li>El gráfico muestra la vibración de la fuente (en el modo tono) o lo que registra cada micrófono (en el modo golpe).</li>
  </ul>
  <h3>Controles</h3>
  <ul>
    <li><b>Fuente:</b> un <b>tono</b> continuo o un <b>golpe</b> suelto. <b>Frecuencia</b> = cuántas vibraciones por segundo: define si el sonido es grave o agudo. <b>Volumen</b> = amplitud de la vibración, y manda el nivel en dB. <b>Distancia</b>: dónde está el micrófono.</li>
    <li><b>Cámara lenta:</b> en un tubo de ${L_TUBO} m el sonido tarda unos 29 ms en el aire, así que el golpe se ve en cámara lenta.</li>
    <li><b>Sonido:</b> apagado por defecto. Si lo prendés, el tono suena en tus parlantes con el nivel del micrófono de aire: al sacar el aire lo oís apagarse.</li>
    <li><b>Romper el sistema:</b> la <b>bomba de vacío</b> saca el aire del tubo de aire. Los otros dos no se tocan.</li>
  </ul>
  <h3>Predecí antes de correr</h3>
  <p>Antes de lanzar el golpe y antes de prender la bomba, el lab te pregunta qué va a pasar. Elegí, dejá correr el experimento y se revela si acertaste, con los números del modelo.</p>
  <h3>Qué es real y qué no</h3>
  <p><b>Real:</b> las velocidades del sonido (aire a 20 °C, 343 m/s; agua dulce, 1.481 m/s; acero en una barra, 5.050 m/s), que no dependen de la frecuencia ni del volumen, y que la longitud de onda es v / f. El rango que oye una persona (${AUDIBLE.min} Hz a ${num(AUDIBLE.max, 0)} Hz), que 0 dB es el umbral de audición (20 µPa) y que 1 Pa son unos 94 dB. Que una conversación ronda los 60–70 dB y que desde 85 dB el oído se daña. Que el sonido no se propaga en el vacío y que, al sacar el aire de una campana, se va apagando${av(' (la presión sonora es p = ρ · c · v, con v la velocidad de las partículas: con la misma vibración y la misma c, baja junto con la densidad ρ del aire; y entre medios cuenta ρ · c)')}. Que el La4 es 440 Hz.</p>
  <p><b>Simplificado:</b> el tono se ve vibrar a 1,5 Hz, mucho más lento que el real, y el desplazamiento está muy exagerado (a 80 dB y 440 Hz las partículas se mueven menos de un micrómetro) y crece con la raíz de la amplitud para que una fuente suave también se vea. Las pocas bolitas que se dibujan representan una cantidad enorme de moléculas. El tubo guía la onda y no se dispersa, así que el nivel no cae con la distancia (al aire libre sí). El parlante es ideal: mantiene la presión a cualquier frecuencia y su vibración no cambia cuando falta el aire; los reales no. El nivel en dB solo se calcula en el aire: en el agua y el acero el micrófono muestra la llegada, sin comparar volúmenes. No hay absorción ni reflexiones. La bomba llega a 0,1 Pa (una bomba rotativa de laboratorio de varias etapas); una campana de vidrio de aula no llega tan lejos, y el tiempo de bombeo está ajustado para que se vea. Se considera que no se oye cuando el nivel baja de 0 dB, un umbral ideal en silencio absoluto: con ruido ambiente se deja de oír antes. El acero es una barra: la velocidad √(E/ρ) vale cuando la longitud de onda es mayor que el diámetro (a frecuencias muy altas ya no) y es algo menor que en el acero en masa (5.600 a 5.900 m/s medidos en aleaciones). El volumen que sale por tus parlantes no es el nivel real en dB (depende de tu equipo) y puede que no reproduzcan los graves. El timbre de los "tic" del golpe es solo para distinguir los tubos. Modelo educativo: verificá los datos con tu docente o manual.</p>
  ${fuentes([
  { texto: '<i>Speed of sound</i>, Wikipedia: aire 343 m/s a 20 °C, agua dulce 1.481 m/s, v = √(K/ρ) en un fluido, v = √(E/ρ) en una barra más fina que la longitud de onda y tabla de aceros en masa (5.596–5.912 m/s).', url: 'https://en.wikipedia.org/wiki/Speed_of_sound' },
  { texto: '<i>Young\'s modulus</i>, Wikipedia: acero A36, E = 200 GPa.', url: 'https://en.wikipedia.org/wiki/Young%27s_modulus' },
  { texto: '<i>Hearing range</i>, Wikipedia: rango humano, 20 a 20.000 Hz.', url: 'https://en.wikipedia.org/wiki/Hearing_range' },
  { texto: '<i>Sound pressure</i>, Wikipedia: referencia de 20 µPa (0 dB) y 1 Pa ≈ 94 dB.', url: 'https://en.wikipedia.org/wiki/Sound_pressure' },
  { texto: '<i>Noise-Induced Hearing Loss</i>, NIDCD (NIH): conversación 60–70 dBA y daño desde 85 dBA.', url: 'https://www.nidcd.nih.gov/health/noise-induced-hearing-loss' },
  { texto: '<i>Acoustic impedance</i>, Wikipedia: p = ρ · c · v y densidad del aire (1,204 kg/m³ a 20 °C).', url: 'https://en.wikipedia.org/wiki/Acoustic_impedance' },
  { texto: '<i>Water (data page)</i>, Wikipedia: densidad del agua a 20 °C, 998,2 kg/m³.', url: 'https://en.wikipedia.org/wiki/Water_(data_page)' },
  { texto: '<i>Sound</i>, Wikipedia: el sonido no se propaga en el vacío porque no hay un medio que lo sostenga.', url: 'https://en.wikipedia.org/wiki/Sound' },
  { texto: '<i>Bell jar</i>, Wikipedia: el experimento de la campana (el sonido se apaga al sacar el aire) y su capacidad limitada de vacío.', url: 'https://en.wikipedia.org/wiki/Bell_jar' },
  { texto: '<i>Rotary vane pump</i>, Wikipedia: una bomba rotativa de varias etapas llega a 0,1 Pa.', url: 'https://en.wikipedia.org/wiki/Rotary_vane_pump' },
  { texto: '<i>A440 (pitch standard)</i>, Wikipedia: La4 = 440 Hz (ISO 16).', url: 'https://en.wikipedia.org/wiki/A440_(pitch_standard)' },
  ])}`
