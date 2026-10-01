// Textos del lab. Todo el HTML de este archivo es propio (se inyecta con innerHTML); los números salen del modelo.
// Colores con significado: ámbar = el grito que sale, magenta = el eco que vuelve, celeste = lo que registra el sonómetro.

import { av } from '../../ui/avanzado'
import { fuentes } from '../../ui/fuentes'
import { numero } from '../../ui/formato'
import {
  CONFIG_INICIAL, REF_VOZ, RUIDO, SIGMA, UMBRAL_ECO, V_MAR, caida, clasificar, lenta, medioDe, nivelEco, recorrido, ruido, superficie, tiempoEco, velocidad, type Config, type Estado,
} from './model'

export const num = numero
const grito = (t: string) => `<span class="c-ambar">${t}</span>`
const eco = (t: string) => `<span class="c-magenta">${t}</span>`
export const ms = (s: number) => (s < 1 ? `${num(s * 1000, s < 0.1 ? 1 : 0)} ms` : `${num(s, 2)} s`)

/** Lo que el modo medir necesita saber: la estimación del usuario y, si ya comprobó, el resultado. */
export interface Medicion {
  estimacion: number
  comprobada: boolean
}

export const GANCHO = `Gritás frente a una pared y, un rato después, vuelve tu voz. ¿Es otro sonido? No: es ${grito('el mismo grito')} que rebotó, y llega ${eco('más flojo')}. Con lo que tarda en volver se mide a qué distancia está lo que rebotó${av(' (así se orientan los murciélagos y así mide la profundidad un sonar)')}. Probalo con una pared, una cortina, un acantilado y el fondo del mar.`

/** Distancia mínima de la superficie para que el eco se oiga aparte, m. */
export const distanciaMinima = (c: Config): number => (UMBRAL_ECO * velocidad(c)) / 2

const FRASE_MEDIO = (c: Config) => (medioDe(c) === 'agua' ? 'el sonar' : 'tu oído')

/** Relato de "ahora": cuenta qué pasa con los números del momento. */
export function relato(c: Config, e: Estado, medir: Medicion | null): string {
  const s = superficie(c.superficie)
  const t = tiempoEco(c)
  const v = velocidad(c)
  if (e.t === null) {
    if (medir) return `<strong>Medí la distancia.</strong> ${s.nombre === 'Fondo del mar' ? 'El fondo' : `La ${s.nombre.toLowerCase()}`} está a una distancia escondida. ¡Gritá!, mirá cuánto tarda el eco y calculá <b>d = v · t / 2</b>, con v = ${num(v, 0)} m/s.`
    return `<strong>Todo quieto.</strong> Apretá <b>¡Gritar!</b>: el sonido va hasta ${s.nombre === 'Fondo del mar' ? 'el fondo' : `la ${s.nombre.toLowerCase()}`}, a ${num(c.distancia, 0)} m, rebota y vuelve. Mirá cuánto tarda y cuánto se debilita.`
  }
  if (e.t < t) {
    const yendo = recorrido(e, c) <= 1
    return `<strong>${yendo ? 'El grito va hacia la superficie.' : 'Rebotó y el eco vuelve.'}</strong> Pasaron ${ms(e.t)}. ${lenta(c) > 1.05 ? `La animación está en cámara lenta (÷${num(lenta(c), 0)}): el` : 'Va en tiempo real: el'} eco de verdad tarda ${ms(t)}${medir ? '' : ` (2 × ${num(c.distancia, 0)} m ÷ ${num(v, 0)} m/s)`}.`
  }
  if (medir) {
    const base = `<strong>El eco volvió a los ${ms(t)}.</strong> ${medir.comprobada ? '' : 'Ahora calculá a qué distancia está y ponelo en <b>Tu estimación</b>.'}`
    if (!medir.comprobada) return base
    const error = (Math.abs(medir.estimacion - c.distancia) / c.distancia) * 100
    return `<strong>Era ${num(c.distancia, 0)} m.</strong> Tu estimación: ${num(medir.estimacion, 0)} m (${error < 1 ? 'clavaste' : `error de ${num(error, 0)} %`}). La cuenta: d = v · t / 2 = ${num(v, 0)} m/s × ${ms(t)} ÷ 2 = ${num(c.distancia, 0)} m.`
  }
  const d = num(c.distancia, 0)
  const cuenta = `2 × ${d} m ÷ ${num(v, 0)} m/s = ${ms(t)}`
  const nivel = `${num(nivelEco(c), 0)} dB`
  switch (clasificar(c)) {
    case 'claro':
      return medioDe(c) === 'agua'
        ? `<strong>El sonar recibió el eco a los ${ms(t)}.</strong> Es el mismo ping, ${num(caida(c), 0)} dB más débil. Con la velocidad del sonido en el agua de mar (${num(V_MAR, 0)} m/s): d = v · t / 2 = ${d} m. Un instrumento separa milisegundos; el oído, no.`
        : `<strong>El eco volvió a los ${ms(t)}.</strong> Es el mismo grito, ${num(caida(c), 0)} dB más flojo (${nivel}). Pasó más de ${UMBRAL_ECO.toString().replace('.', ',')} s entre uno y otro, así que ${FRASE_MEDIO(c)} los oye por separado.${av(` La cuenta: ${cuenta}.`)}`
    case 'mezcla':
      return `<strong>Volvió en ${ms(t)}: pegado al grito.</strong> Con menos de ${UMBRAL_ECO.toString().replace('.', ',')} s de diferencia el oído no separa los dos sonidos: se oye una sola voz que se alarga (reverberación), no un eco. Para oírlo aparte la superficie tiene que estar a más de ${num(distanciaMinima(c), 1)} m.`
    case 'ausente':
      return `<strong>Casi no vuelve.</strong> El eco llegó a ${nivel}, por debajo del ruido de fondo (${num(ruido(c), 0)} dB). ${s.alfa > 0.5 && c.superficie === 'cortina' ? `Una cortina absorbe el ${num(s.alfa * 100, 0)} % de la energía: devuelve el ${num((1 - s.alfa) * 100, 0)} %.` : 'El sonido se reparte en una esfera cada vez más grande: cada vez que se duplica el recorrido, pierde 6 dB.'} Probá gritar más fuerte o acercarte.`
  }
}

/** Texto de la métrica "Se oye". */
export function textoOido(c: Config, e: Estado): string {
  if (e.t === null || e.t < tiempoEco(c)) return '—'
  const clase = clasificar(c)
  if (medioDe(c) === 'agua') return clase === 'ausente' ? 'Sin eco' : 'Detectado'
  return clase === 'claro' ? 'Eco aparte' : clase === 'mezcla' ? 'Se mezcla' : 'Casi nada'
}

export const COMO_FUNCIONA = `
  <h2>¿Cómo funciona?</h2>
  <p>Un eco es <b>el mismo sonido, reflejado</b>. Tu grito sale en todas direcciones, choca con una superficie y una parte vuelve hacia vos. Tarda lo que tarda en ir y volver: <b>t = 2d / v</b>. Por eso, midiendo el tiempo se calcula la distancia: <b>d = v · t / 2</b>.</p>
  <h3>Qué mirar</h3>
  <ul>
    <li>El anillo ${grito('ámbar')} es el grito que sale; el ${eco('magenta')}, el eco que vuelve (más tenue cuanto más débil). La animación va en cámara lenta, y la métrica "Ida-vuelta" muestra el tiempo real.</li>
    <li>El gráfico es lo que marcaría un sonómetro junto a vos: primero el grito y, un rato después, el eco. Cuando los dos se pisan, no se distinguen.</li>
    <li>Métricas: tiempo de ida y vuelta, velocidad del sonido, nivel del eco y si se oye aparte.</li>
  </ul>
  <h3>Controles</h3>
  <ul>
    <li><b>Superficie:</b> pared, cortina (absorbe), acantilado o el fondo del mar (en el agua, como un sonar).</li>
    <li><b>Distancia, volumen y temperatura:</b> el volumen no cambia cuándo vuelve el eco, solo cuánto se oye. La temperatura del aire sí lo cambia un poco, porque cambia la velocidad.</li>
    <li><b>Medir:</b> la distancia queda escondida. Gritá, mirá el tiempo y calculá la distancia, como un murciélago o un sonar.</li>
    <li><b>Oír en tiempo real:</b> reproduce el grito y el eco con la demora real (sin cámara lenta). Probá una pared a 5 m y otra a 30 m.</li>
  </ul>
  <h3>Predecí antes de correr</h3>
  <p>Antes de gritar, el lab te pregunta qué va a pasar. Elegí, dejá correr el experimento y se revela si acertaste, con los números del modelo. Con "Preguntas: No" se usa libre.</p>
  <h3>Qué es real y qué no</h3>
  <p><b>Real:</b> t = 2d / v. La velocidad del sonido en el aire, v ≈ 331,4 + 0,6 · T (T en °C), y en el agua de mar, unos ${num(V_MAR, 0)} m/s: no depende del volumen. El eco repite el tono del grito. Los ~${UMBRAL_ECO.toString().replace('.', ',')} s (a 343 m/s, unos ${num(distanciaMinima({ ...CONFIG_INICIAL, temperatura: 20 }), 0)} m) para oír el eco aparte, y que cerca se mezcla con la voz. Que pierde 6 dB cada vez que se duplica la distancia recorrida. Que las superficies blandas devuelven menos energía: a 1.000 Hz, el ladrillo absorbe el ${num(superficie('pared').alfa * 100, 0)} % y las cortinas pesadas el ${num(superficie('cortina').alfa * 100, 0)} %. Que en el agua los decibeles se miden con otra referencia que en el aire.</p>
  <p><b>Simplificado:</b> el umbral de ${UMBRAL_ECO.toString().replace('.', ',')} s es una regla de textos escolares; la medición real depende del sonido (para voz, entre 40 y 50 ms; para música, hasta cerca de 100 ms), y una reflexión que llega entre 5 y 30 ms después puede ser hasta 10 dB más fuerte sin oírse como eco. El pulso es un "¡ey!" de unos ${num(SIGMA * 1000, 0)} ms, el grito sale a ${num(REF_VOZ.grito, 0)} dB a 1 m (promedio de un adulto: lo podés cambiar) y el ruido de fondo es de ${num(RUIDO.aire, 0)} dB; en el modelo se oye el eco si supera ese ruido (una persona real lo enmascara distinto según el lugar). Las superficies son espejos infinitos y planos: una pared real, o un acantilado, dispersa mucho más y devuelve menos. Los coeficientes de absorción son los de 1.000 Hz y la roca usa el del ladrillo. No hay viento, absorción del aire ni más de un rebote (el eco que rebota varias veces es la reverberación). El fondo del mar refleja a incidencia normal, con el ${num((1 - superficie('fondo').alfa) * 100, 0)} % de la energía (arena fina), y los dB del sonar son relativos al ping: un sonar real emite mucho más fuerte. Con ${num(REF_VOZ.conversacion, 0)} dB (una conversación) el eco de una pared a 30 m ya no se oye. El sonido en pantalla es una síntesis, no tu voz. Modelo educativo: verificá los datos con tu docente o manual.</p>
  ${fuentes([
  { texto: '<i>Speed of Sound in Air</i>, HyperPhysics (Georgia State University): v ≈ 331,4 + 0,6 · T m/s.', url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/Sound/souspe.html' },
  { texto: '<i>Echo</i>, Wikipedia: no se distingue del sonido directo con menos de 1/10 s; la superficie debe estar a más de 17,2 m.', url: 'https://en.wikipedia.org/wiki/Echo' },
  { texto: '<i>Precedence effect</i>, Wikipedia: fusión hasta ~50 ms con voz y ~100 ms con música; efecto Haas de 5 a 30 ms.', url: 'https://en.wikipedia.org/wiki/Precedence_effect' },
  { texto: '<i>Absorption (acoustics)</i>, Wikipedia: coeficientes a 1.000 Hz (ladrillo 0,04; cortinas pesadas 0,75).', url: 'https://en.wikipedia.org/wiki/Absorption_(acoustics)' },
  { texto: '<i>Inverse-square law</i>, Wikipedia: la presión sonora baja a la mitad (6,02 dB) al duplicar la distancia.', url: 'https://en.wikipedia.org/wiki/Inverse-square_law' },
  { texto: '<i>Basics of Underwater Sound</i>, NOAA: 1.500 m/s en agua de mar; los dB del agua y del aire usan otra referencia.', url: 'https://cdn.oceanservice.noaa.gov/oceanserviceprod/about/environmental-compliance/final-fact-sheets/NOS%20Final%20PEIS_Fact%20Sheet_Basics%20of%20Underwater%20Sound.pdf' },
  { texto: '<i>Facts about speech intelligibility</i>, DPA Microphones: nivel de la voz a 1 m (conversación 58 dB, grito 76 dB).', url: 'https://www.dpamicrophones.com/mic-university/background-knowledge/facts-about-speech-intelligibility/' },
  { texto: '<i>Sound pressure</i>, Wikipedia: un cuarto muy calmo, 20–30 dB.', url: 'https://en.wikipedia.org/wiki/Sound_pressure' },
  { texto: '<i>Physical properties and in situ geoacoustic properties of seafloor surface sediments in the East China Sea</i>, Frontiers in Marine Science (2023): arena fina, 1.970 kg/m³ y 1.619 m/s.', url: 'https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2023.1195651/full' },
  { texto: '<i>Seafloor sediment acoustic property inversion from reflection coefficients</i>, Frontiers in Marine Science (2025): densidad del agua de mar, 1.023 kg/m³.', url: 'https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2025.1635127/full' },
  ])}`
