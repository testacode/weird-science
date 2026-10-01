// Textos del lab. Todo el HTML de este archivo es estático y propio (se inyecta con innerHTML).

import { av } from '../../ui/avanzado'
import { fuentes } from '../../ui/fuentes'
import { BRILLO_PELIGRO, R_CABLE, R_INTERNA, R_LAMPARA, V_NOMINAL, presentes, type Config, type Resultado } from './model'
import { numero } from '../../ui/formato'

/** Número con coma decimal. */
export const num = numero
export const amperes = (i: number) => `${num(i, i >= 10 ? 1 : 2)} A`
export const ohms = (r: number) => (Number.isFinite(r) ? `${num(r, r >= 100 ? 0 : 1)} Ω` : '∞')

function duracion(horas: number): string {
  if (horas < 1) return `${Math.max(Math.round(horas * 60), 1)} min`
  if (horas < 48) return `${num(horas, horas < 10 ? 1 : 0)} h`
  return `${Math.round(horas / 24)} días`
}

export const GANCHO = `Una pila empuja a los <span class="c-cielo">electrones</span> por un camino cerrado y las <span class="c-ambar">lamparitas</span> los frenan: ahí la energía se vuelve luz. Cambiá la conexión y mirá quién brilla más${av(', con la ley de Ohm y las leyes de Kirchhoff')}.`

const cielo = (t: string) => `<span class="c-cielo">${t}</span>`
const ambar = (t: string) => `<span class="c-ambar">${t}</span>`
const marca = (t: string) => `<span class="c-marca">${t}</span>`
const magenta = (t: string) => `<span class="c-magenta">${t}</span>`

/** Relato de "ahora": cuenta qué pasa en el circuito con los números del momento. */
export function relato(c: Config, r: Resultado): string {
  const n = c.cantidad
  const vPila = marca(`${num(c.voltaje)} V`)
  const luz = r.lamparas.find((l) => l.presente) ?? r.lamparas[0]
  const pct = (b: number) => ambar(`${num(b * 100, 0)} %`)
  const pila = Number.isFinite(r.horasPila) ? av(` A este ritmo la pila dura unas ${duracion(r.horasPila)}.`) : ''

  if (c.corto) {
    return `<strong>${magenta('Cortocircuito.')}</strong> El cable une los dos polos sin nada que frene a los electrones: por él pasan ${magenta(amperes(r.corrienteCorto))} y a las lamparitas casi no les llega nada. La pila se calienta y se agota en unos ${duracion(r.horasPila)}.${av(` Con una resistencia total de solo ${ohms(R_INTERNA + R_CABLE)}, I = V ÷ R se dispara.`)}`
  }
  if (!c.cerrado) {
    return `<strong>Interruptor abierto.</strong> El camino está cortado: la corriente es ${cielo('0 A')} y las lamparitas están apagadas. Los electrones esperan quietos en el cable.${av(` La pila de ${vPila} sigue con su voltaje, pero sin camino no circula nada.`)}`
  }
  if (r.corriente === 0) {
    return c.conexion === 'serie'
      ? `<strong>Camino cortado.</strong> En serie hay un solo camino: sin una lamparita se corta y la corriente es ${cielo('0 A')}. Se apagan todas.`
      : `<strong>Sin lamparitas.</strong> No queda ningún camino para los electrones: la corriente es ${cielo('0 A')}.`
  }
  const sobrecarga = luz.brillo > BRILLO_PELIGRO
    ? ` <strong>Ojo:</strong> estas lamparitas son de ${num(V_NOMINAL)} V y así trabajan al ${pct(luz.brillo)}: en la vida real se quemarían.`
    : ''
  if (c.conexion === 'serie') {
    return `<strong>Serie.</strong> Hay un solo camino: la corriente es la misma en todo el circuito, ${cielo(amperes(r.corriente))}. Los ${vPila} de la pila se reparten entre ${n === 1 ? 'la lamparita' : `las ${n} lamparitas`}: ${n === 1 ? 'recibe' : 'cada una recibe'} <b>${num(luz.tension)} V</b> y brilla al ${pct(luz.brillo)}.${sobrecarga}${av(` Ohm: I = V ÷ R = ${num(r.tensionBornes)} V ÷ ${ohms(r.rCarga)}. Kirchhoff: los voltajes de las lamparitas suman lo que entrega la pila.`)}${pila}`
  }
  const k = presentes(c)
  const faltan = n - k
  const resto = faltan > 0 ? ` Con ${faltan === 1 ? 'una lamparita menos' : `${faltan} lamparitas menos`}, las otras siguen con su propio camino.` : ''
  return `<strong>Paralelo.</strong> Cada lamparita tiene su propio camino y recibe casi todos los ${vPila} de la pila (<b>${num(luz.tension)} V</b>): brilla al ${pct(luz.brillo)}. La corriente se reparte: ${cielo(amperes(luz.corriente))} por lamparita y ${cielo(amperes(r.corriente))} en total.${resto}${sobrecarga}${av(` Kirchhoff: las corrientes de las ramas suman la total. Ohm en cada una: I = ${num(luz.tension)} V ÷ ${ohms(R_LAMPARA)}.`)}${pila}`
}

export const AVISO_CORTO = `
  <strong>Aviso de seguridad: cortocircuito.</strong>
  <p>Pasa cuando un cable une los dos polos sin nada en el medio que frene la corriente. Con la corriente tan alta, el cable y la pila se calientan muy rápido y pueden quemar, hacer chispas o incendiar algo.</p>
  <p>Por eso las casas tienen fusibles y llaves térmicas, que cortan solos. Nunca hagas esta prueba con pilas, baterías ni enchufes de verdad.</p>`

export const COMO_FUNCIONA = `
  <h2>¿Cómo funciona?</h2>
  <p>Una pila empuja a los electrones a dar vueltas por un camino cerrado. Cuando pasan por una lamparita, el filamento los frena, se calienta y brilla. Si el camino se corta en cualquier punto, nada circula.${av(` En el modelo, la pila tiene resistencia interna (${num(R_INTERNA)} Ω) y cada lamparita es una resistencia de ${R_LAMPARA} Ω.`)}</p>
  <h3>Qué mirar</h3>
  <ul>
    <li>Las bolitas <span class="c-cielo">celestes</span> son los electrones: van más rápido cuanta más corriente hay. Salen del polo − y vuelven al +.</li>
    <li>Las <span class="c-ambar">lamparitas</span> brillan según la potencia que reciben. La luz y el calor salen de ahí.</li>
    <li>El <span class="c-marca">voltaje</span> es el empuje de la pila; la corriente es cuántos electrones pasan por segundo.</li>
    <li>El gráfico muestra cuánta potencia llega a las lamparitas y cuánta se pierde como calor en la pila y el cable.</li>
  </ul>
  <h3>Controles</h3>
  <ul>
    <li><b>Pila:</b> 1,5, 3 o 4,5 V son pilas grandes en fila; 9 V es la rectangular. A más voltaje, más empuje.</li>
    <li><b>Conexión:</b> en <b>serie</b> hay un solo camino; en <b>paralelo</b>, uno por cada lamparita.</li>
    <li><b>Lamparitas y interruptor:</b> sumá o sacá lamparitas y abrí o cerrá el circuito. También podés tocar el interruptor o una lamparita en la maqueta.</li>
    <li><b>Info avanzada:</b> muestra u oculta las ecuaciones y los detalles del modelo.</li>
  </ul>
  <h3>Predecí antes de correr</h3>
  <p>Cuando sacás una lamparita o sumás otra, el lab te pregunta qué va a pasar antes de hacerlo. Elegí y después se revela si acertaste, con los números del modelo.</p>
  <h3>Romper el sistema</h3>
  <ul>
    <li><b>Sacar una lamparita:</b> en serie se apagan todas; en paralelo, las otras siguen. Por eso en una casa los artefactos van en paralelo.</li>
    <li><b>Cortocircuito:</b> un cable une los dos polos. La corriente se dispara y es peligroso: por eso existen los fusibles.</li>
  </ul>
  <h3>Qué es real y qué no</h3>
  <p><b>Real:</b> ${av('la ley de Ohm (I = V ÷ R), las leyes de Kirchhoff (en serie la corriente es la misma y los voltajes se suman; en paralelo el voltaje es el mismo y las corrientes se suman) y la potencia P = V · I. ')}Si se corta un tramo en serie se apaga todo, la corriente de un cortocircuito es enorme y las pilas tienen resistencia interna.</p>
  <p><b>Simplificado:</b> la lamparita tiene una resistencia fija de ${R_LAMPARA} Ω (en una real crece mucho al calentarse) y es para ${num(V_NOMINAL)} V; el voltaje de la pila no baja al gastarse; los electrones van mucho más rápido que en la realidad (en un cable real avanzan unos milímetros por segundo: la energía llega rápido porque todos empujan a la vez); y mostramos el sentido de los electrones (− a +), mientras que en los libros la corriente se dibuja al revés. Las lamparitas incandescentes pierden casi toda la energía como calor; las LED rinden mucho mejor.</p>
  <p>En una casa los artefactos se conectan en paralelo a 220 V de corriente alterna, con un tablero con llaves que cortan ante un cortocircuito. Modelo educativo: verificá los datos con tu docente o manual.</p>
  ${fuentes([
  { texto: 'Energizer E95 (pila D), hoja de datos: 1,5 V por pila y resistencia interna de 173 mΩ.', url: 'https://assets.rs-online.com/v1698850014/Datasheets/fd367a14d9214aa9c2d082888803f824.pdf' },
  { texto: 'Lamparita E10 de 4,5 V / 0,3 A / 1,35 W, la de los kits escolares de electricidad.', url: 'https://www.amazon.com/Miniature-Screw-Light-1-35W-Flashlight/dp/B076MGGHKS' },
  ])}`
