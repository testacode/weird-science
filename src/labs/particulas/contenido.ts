// Textos del lab. Todo el HTML de este archivo es propio (se inyecta con innerHTML); los números
// salen del modelo.

import { av } from '../../ui/avanzado'
import { numero } from '../../ui/formato'
import { MASA_G, P_VALVULA_ATM, T_TOPE_CALOR, T_TOPE_FRIO, umbrales, velocidadMedia, type Config, type Lectura, type Sustancia } from './model'

export const num = numero

const sol = (t: string) => `<span class="c-cielo">${t}</span>`
const liq = (t: string) => `<span class="c-marca">${t}</span>`
const gas = (t: string) => `<span class="c-magenta">${t}</span>`
const calor = (t: string) => `<span class="c-ambar">${t}</span>`
const pct = (f: number) => `${num(f * 100, 0)} %`

export const GANCHO = `Todo está hecho de partículas que no paran de moverse. Calentá la placa y mirá cómo el ${sol('sólido')} pasa a ${liq('líquido')} y a ${gas('gas')}${av(' (modelo cinético)')}: ¿por qué la temperatura se frena justo en el medio de cada cambio?`

export interface Contexto {
  sus: Sustancia
  config: Config
  /** W; negativa enfría. */
  potencia: number
}

/** Energía (J) que falta para terminar el tramo actual en la dirección de la placa, o `null`. */
function faltante(l: Lectura, { sus, config, potencia }: Contexto): number | null {
  const u = umbrales(sus, config)
  if (potencia > 0) {
    if (l.fase === 'solido') return -l.h
    if (l.fase === 'fusion') return u.hF - l.h
    if (l.fase === 'liquido') return u.hL - l.h
    if (l.fase === 'ebullicion') return u.hV - l.h
  } else if (potencia < 0) {
    if (l.fase === 'fusion') return l.h
    if (l.fase === 'liquido') return l.h - u.hF
    if (l.fase === 'ebullicion') return l.h - u.hL
  }
  return null
}

const tiempoDe = (joules: number, potencia: number) => `${num(joules / 1000)} kJ, unos ${num(joules / Math.abs(potencia), 0)} s a ${Math.abs(potencia)} W`

export function etiquetaEstado(l: Lectura, potencia: number): string {
  const calentando = potencia >= 0
  switch (l.fase) {
    case 'solido': return 'Sólido'
    case 'fusion': return calentando ? 'Fusión' : 'Congela'
    case 'liquido': return 'Líquido'
    case 'ebullicion': return calentando ? 'Hierve' : 'Condensa'
    case 'gas': return 'Gas'
  }
}

export function relato(l: Lectura, c: Contexto): string {
  const { sus, config, potencia } = c
  const v = velocidadMedia(l.tempK, sus)
  const falta = faltante(l, c)
  const tb0 = sus.tEbullicion
  const fracciones = `${liq(pct(l.fl))} líquido${l.fs > 0 ? `, ${sol(pct(l.fs))} sólido` : ''}${l.fg > 0 ? `, ${gas(pct(l.fg))} gas` : ''}`
  let texto: string

  switch (l.fase) {
    case 'solido': {
      const cuesta =
        potencia > 0 && falta !== null
          ? ` Para llegar a ${num(sus.tFusion)} °C faltan ${tiempoDe(falta, potencia)}${av(` (Q = m · c · ΔT = ${MASA_G} g · ${num(sus.cSolido, 2)} J/g·K · ${num(sus.tFusion - l.temp)} K)`)}.`
          : potencia < 0
            ? ' Cuanto más frío, menos vibran.'
            : ' La placa está apagada: la temperatura no cambia.'
      texto = `<strong>Sólido a ${num(l.temp)} °C.</strong> Las partículas forman una ${sol('red ordenada')} y solo vibran en su lugar${av(`, a ${num(v, 0)} m/s de promedio`)}.${cuesta}`
      break
    }
    case 'fusion':
      texto =
        potencia > 0
          ? `<strong>Fusión: la temperatura queda en ${num(l.temp)} °C.</strong> Entran ${potencia} W, pero esa energía no sube la temperatura: se gasta en ${liq('romper la red')}${av(` (calor latente de fusión: ${sus.calorFusion} J/g)`)}. Hay ${fracciones}. Faltan ${tiempoDe(falta ?? 0, potencia)}.`
          : potencia < 0
            ? `<strong>Solidificación: la temperatura queda en ${num(l.temp)} °C.</strong> La placa saca ${Math.abs(potencia)} W y las partículas, al ordenarse, devuelven justo esa energía${av(' (el mismo calor latente, al revés)')}. Hay ${fracciones}. Faltan ${tiempoDe(falta ?? 0, potencia)}.`
            : `<strong>Cambio detenido en ${num(l.temp)} °C.</strong> Sin potencia no entra ni sale energía: se queda con ${fracciones}.`
      break
    case 'liquido': {
      const rumbo =
        potencia > 0 && falta !== null
          ? ` Faltan ${num(l.tEbullicion - l.temp)} °C (${tiempoDe(falta, potencia)}) para hervir${config.tapa ? ` a ${num(l.tEbullicion)} °C por la tapa` : ''}.`
          : potencia < 0 && falta !== null
            ? ` Faltan ${num(l.temp - sus.tFusion)} °C (${tiempoDe(falta, potencia)}) para que empiece a congelarse.`
            : ' La placa está apagada: la temperatura no cambia.'
      const presion = config.tapa ? ` La tapa guarda el vapor: ${num(l.presion, 2)} atm${av(' (presión de vapor)')}.` : ''
      texto = `<strong>Líquido a ${num(l.temp)} °C.</strong> Las partículas están juntas pero ${liq('se deslizan')} unas sobre otras${av(`, a ${num(v, 0)} m/s de promedio`)}.${rumbo}${presion}`
      break
    }
    case 'ebullicion': {
      const tapa = config.tapa
        ? ` La tapa guarda el vapor y la presión llega a ${num(l.presion, 1)} atm${av(` (la válvula se abre a ${P_VALVULA_ATM} atm)`)}: por eso hierve a ${num(l.tEbullicion)} °C y no a ${num(tb0)} °C.`
        : ''
      texto =
        potencia > 0
          ? `<strong>Ebullición: la temperatura queda en ${num(l.temp)} °C.</strong> La energía rompe lo que une a las partículas y las deja ${gas('volar')}${av(` (calor latente de vaporización: ${sus.calorVaporizacion} J/g, ${num(sus.calorVaporizacion / sus.calorFusion, 0)} veces el de fusión)`)}. Hay ${fracciones}. Faltan ${tiempoDe(falta ?? 0, potencia)}.${tapa}`
          : potencia < 0
            ? `<strong>Condensación: la temperatura queda en ${num(l.temp)} °C.</strong> El gas se enfría y devuelve su energía al juntarse. Hay ${fracciones}.${tapa}`
            : `<strong>Cambio detenido en ${num(l.temp)} °C.</strong> Sin potencia se queda con ${fracciones}.${tapa}`
      break
    }
    case 'gas': {
      const dondeRebota = config.tapa ? 'rebotan contra las paredes y la tapa' : 'rebotan contra las paredes y se escapan por la boca del vaso'
      const presion = config.tapa ? ` La válvula mantiene ${num(l.presion, 1)} atm.` : ''
      const rumbo = potencia > 0 ? ' Si seguís calentando, se mueven cada vez más rápido.' : potencia < 0 ? ' Al enfriar, van a empezar a juntarse otra vez.' : ''
      texto = `<strong>Gas a ${num(l.temp)} °C.</strong> Las partículas están lejos unas de otras, ${gas('vuelan en línea recta')} y ${dondeRebota}${av(`, a ${num(v, 0)} m/s de promedio`)}.${presion}${rumbo}`
      break
    }
  }
  if (l.tope) texto += ` La placa llegó a su tope${l.tope === 'calor' ? ` de calor (${num(sus.tEbullicion + T_TOPE_CALOR, 0)} °C)` : ` de frío (${num(sus.tFusion - T_TOPE_FRIO, 0)} °C)`}.`
  if (!config.latente) texto += ` ${calor('Sin calor latente')}: no hay mesetas, la temperatura no se frena en ningún cambio.`
  return texto
}

export const COMO_FUNCIONA = `
  <h2>¿Cómo funciona?</h2>
  <p>La materia está hecha de partículas que se mueven. Un recipiente con ${MASA_G} g de sustancia recibe o pierde energía de la placa. Esa energía se reparte entre <b>subir la temperatura</b> y <b>cambiar de estado</b>.${av(' El modelo lleva la cuenta de la energía (entalpía) y de ahí salen la temperatura y cuánto hay de cada fase: Q = m · c · ΔT mientras la fase no cambia, y Q = m · L durante el cambio, con la temperatura clavada.')}</p>
  <h3>Qué mirar</h3>
  <ul>
    <li>Las bolitas ${sol('celestes')} son partículas de sólido (vibran en su lugar de la red), las ${liq('verdes')} de líquido (se deslizan juntas abajo) y las ${gas('rosas')} de gas (vuelan y rebotan).</li>
    <li>La barra de fases muestra qué porcentaje hay de cada una. Durante un cambio de estado conviven dos.</li>
    <li>El gráfico es temperatura (°C) contra tiempo: las <b>mesetas</b> son los cambios de estado. Lo que queda debajo de la línea del 0 está bajo cero.</li>
    <li>La placa brilla ${calor('ámbar')} cuando calienta y ${sol('celeste')} cuando enfría. El termómetro tiene la lectura en °C.</li>
  </ul>
  <h3>Controles</h3>
  <ul>
    <li><b>Placa:</b> calentar, apagar o enfriar, con una potencia de 100 a 1000 W.</li>
    <li><b>Sustancia:</b> agua, alcohol (etanol) o acetona. Cada una tiene sus puntos de fusión y de ebullición${av(', su calor específico en cada fase y sus calores latentes')}.</li>
    <li><b>Velocidad:</b> acelera el reloj. Un cambio de estado de verdad tarda minutos.</li>
    <li><b>Romper el sistema:</b> con la <b>tapa</b> (como una olla a presión) el vapor no se escapa, la presión sube y el punto de ebullición se corre${av(' (a 2 atm el agua hierve a unos 121 °C)')}. Con <b>calor latente: No</b> ves qué pasaría sin mesetas.</li>
    <li><b>Info avanzada:</b> muestra u oculta ecuaciones y detalles del modelo.</li>
  </ul>
  <h3>Predecí antes de correr</h3>
  <p>Cada vez que empezás de nuevo, el lab te pregunta qué va a pasar con la temperatura. Elegí, dejá correr el experimento y se revela si acertaste, con los números del modelo.</p>
  <h3>Qué es real y qué no</h3>
  <p><b>Real:</b> los puntos de fusión y de ebullición a 1 atm, el orden de magnitud de los calores específicos y latentes${av(' (valores de tablas, redondeados)')}, las mesetas, y que la velocidad media de las partículas crece con la raíz de la temperatura${av(' (v = √(8·R·T / π·M), unos 590 m/s en el agua a 20 °C)')}. También que la presión corre el punto de ebullición${av(' (Clausius-Clapeyron)')}.</p>
  <p><b>Simplificado:</b> 450 partículas dibujadas representan unas 10<sup>24</sup> reales y se mueven mucho más lento que las verdaderas. La vibración del sólido está exagerada para que se note. No hay fuerzas reales entre partículas, solo choques blandos. El hielo real flota (es menos denso); acá todos los sólidos se hunden. La placa es ideal, no hay pérdidas de calor al ambiente y la temperatura es pareja en todo el recipiente. La tapa es una olla a presión con válvula a ${P_VALVULA_ATM} atm y no cuenta el aire de adentro. "Sin calor latente" no existe en la naturaleza: es un experimento mental. Modelo educativo: verificá los datos con tu docente o manual.</p>`
