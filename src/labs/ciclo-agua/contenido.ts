// Textos del lab. Todo el HTML de este archivo es estático y propio (se inyecta con innerHTML).
// Colores con significado: ámbar = Sol, lila = vapor y nubes, celeste = agua del mar y lluvia,
// turquesa = río y escorrentía, tierra = suelo, lima = plantas.

import { av } from '../../ui/avanzado'
import { numero } from '../../ui/formato'
import { LLUVIA_MIN, N_UMBRAL, efectiva, total, type Config, type Estado, type Flujos, type Reservorio } from './model'

export const num = numero

export const RESERVORIO_TEXTO: Record<Reservorio, { nombre: string; clase: string }> = {
  mar: { nombre: 'Mar', clase: 'c-cielo' },
  vapor: { nombre: 'Vapor en el aire', clase: 'c-nube' },
  nubes: { nombre: 'Nubes', clase: 'c-nube' },
  suelo: { nombre: 'Suelo y subsuelo', clase: 'c-tierra' },
  rio: { nombre: 'Río', clase: 'c-rio' },
}

/** Cómo se llama la lluvia según los mm que cae por hora. */
export function intensidad(mmH: number): string {
  if (mmH < LLUVIA_MIN) return 'sin lluvia'
  if (mmH < 0.5) return 'llovizna'
  if (mmH < 2.5) return 'lluvia ligera'
  if (mmH < 7.6) return 'lluvia moderada'
  return 'lluvia fuerte'
}

export const GANCHO = `Un terrario cerrado, una lámpara que hace de Sol y siempre la misma agua. El Sol la <span class="c-nube">evapora</span>, se hace <span class="c-nube">nube</span> y vuelve como <span class="c-cielo">lluvia</span>${av(' (1 mm = el agua que cubriría el piso con 1 mm de espesor)')}. ¿Se gana o se pierde agua en cada vuelta?`

const mmH = (n: number) => `${num(n)} mm/h`

/** Frase de lo que pasa "ahora", con los números del momento. */
export function relato(e: Estado, c: Config, f: Flujos): string {
  const ef = efectiva(c)
  const todo = `En el terrario sigue habiendo <b>${num(total(e), 1)} mm</b> de agua${av(': la suma de los cinco reservorios')}.`
  if (ef.sol === 0) {
    return f.prec >= LLUVIA_MIN
      ? `<strong>Sin Sol.</strong> No se evapora agua nueva, pero las nubes todavía tienen <span class="c-nube">${num(e.nubes, 1)} mm</span> y la lluvia sigue (<span class="c-cielo">${mmH(f.prec)}</span>). Cuando se vacíen, deja de llover. ${todo}`
      : `<strong>Sin Sol, sin lluvia.</strong> El ciclo se frenó: el agua ya no sube y casi toda volvió al <span class="c-cielo">mar</span> (${num(e.mar, 0)}%). ${todo}`
  }
  const subida = f.evap + f.trans
  if (f.capArriba >= f.capBaja - 1e-6)
    return `<strong>Arriba no hace frío.</strong> El aire de arriba (${num(f.tArriba, 0)} °C) está tan tibio como el de abajo (${num(f.tBaja, 0)} °C): el vapor no se condensa, no hay nubes ni lluvia. El aire se llena de vapor (<span class="c-nube">${num(f.humedad * 100, 0)}%</span> de humedad) y la evaporación se frena${av(' porque el aire ya no puede llevar más vapor')}. ${todo}`
  if (f.prec < LLUVIA_MIN && e.nubes < 0.5)
    return `<strong>Se evapora.</strong> El Sol calienta el mar y sube vapor invisible: <span class="c-nube">${mmH(subida)}</span>. Al llegar arriba, donde el aire está a ${num(f.tArriba, 0)} °C, se condensa y se forman las nubes${av(` (el aire a ${num(f.tArriba, 0)} °C aguanta menos vapor que a ${num(f.tBaja, 0)} °C)`)}.`
  if (f.prec < LLUVIA_MIN)
    return `<strong>Se forman nubes.</strong> El vapor se enfría arriba y se condensa en gotitas: las nubes ya tienen <span class="c-nube">${num(e.nubes, 1)} mm</span>. Cuando junten más de ${num(N_UMBRAL, 1)} mm empieza a llover. ${todo}`
  const extra = c.talado
    ? 'Sin plantas la tierra queda desnuda: se infiltra menos, escurre más y casi no hay transpiración.'
    : c.montana
      ? 'La montaña obliga al aire a subir y enfriarse: llueve más, sobre todo en la ladera que mira al mar.'
      : `Las plantas devuelven agua al aire: transpiran <span class="c-planta">${mmH(f.trans)}</span>.`
  return `<strong>Hay ${intensidad(f.prec)}</strong> (<span class="c-cielo">${mmH(f.prec)}</span>). Del agua que cae en tierra, ${num(f.cr * 100, 0)}% escurre al <span class="c-rio">río</span> y el resto se infiltra al suelo${av(` (coeficiente de escorrentía ${num(f.cr, 2)}: sube con el suelo lleno, la pendiente y la falta de plantas)`)}. ${extra} ${todo}`
}

export const COMO_FUNCIONA = `
  <h2>¿Cómo funciona?</h2>
  <p>El agua del planeta da vueltas: el <span class="c-ambar">Sol</span> la evapora, el vapor sube y se enfría, se condensa en <span class="c-nube">nubes</span> y vuelve como <span class="c-cielo">lluvia</span>. Acá todo pasa en un terrario cerrado: no entra ni sale agua, así que se puede seguir cada gota.${av(' El modelo tiene cinco reservorios (mar, vapor, nubes, suelo y río) y mide el agua en mm de lámina: el terrario tiene 100 mm en total. Cada flujo saca agua de uno y la pone en otro.')}</p>
  <h3>Qué mirar</h3>
  <ul>
    <li>Las <span class="c-nube">volutas</span> que suben del mar son vapor de agua. Cuando llegan al aire frío de arriba se juntan en <span class="c-nube">nubes</span>, que se ponen grises cuando están cargadas.</li>
    <li>Las gotas <span class="c-cielo">celestes</span> son la lluvia. La que cae en tierra se reparte: parte escurre por la ladera hacia el <span class="c-rio">río</span> y parte se infiltra al <span class="c-tierra">suelo</span> (se ve en el corte del frente).</li>
    <li>Las <span class="c-planta">plantas</span> toman agua del suelo y la devuelven al aire por las hojas: es la transpiración.</li>
    <li>El gráfico muestra cuánta agua se mueve por hora: lo que se evapora, lo que llueve y lo que escurre. Cuando la evaporación y la lluvia se igualan, el ciclo está en equilibrio.</li>
  </ul>
  <h3>Controles</h3>
  <ul>
    <li><b>Sol:</b> más intensidad, más calor y más evaporación${av(' (la evaporación es proporcional a la intensidad y al aire que todavía puede absorber vapor)')}.</li>
    <li><b>Temperatura en altura:</b> cuanto más frío arriba, menos vapor aguanta el aire y más se condensa${av(' (a 20 °C el aire saturado lleva 17,3 g de vapor por m³; a 10 °C, 9,4 g/m³)')}. Si arriba está tan tibio como abajo, no hay nubes.</li>
    <li><b>Plantas:</b> frenan el agua en la superficie, la dejan infiltrarse y la transpiran.</li>
    <li><b>Relieve:</b> con montaña el aire tiene que subir, se enfría más y llueve más de ese lado; el agua baja rápido por la ladera.</li>
    <li><b>Romper el sistema:</b> apagar el Sol frena el motor del ciclo; talar las plantas deja la tierra desnuda.</li>
    <li><b>Info avanzada:</b> muestra u oculta las fórmulas y los detalles del modelo.</li>
  </ul>
  <h3>Predecí antes de correr</h3>
  <p>Al empezar, el lab te pregunta si hay más, igual o menos agua después de 3 días. Y cuando apagás el Sol o talás las plantas, te pregunta qué va a pasar. Elegí, dejá correr y se revela si acertaste.</p>
  <h3>Qué es real y qué no</h3>
  <p><b>Real:</b> el agua total no cambia: la lluvia no es agua nueva, es la misma que se evaporó (conservación de la masa); el Sol es el motor de la evaporación; el aire frío aguanta menos vapor y por eso condensa; las nubes llueven cuando juntan suficiente agua; las plantas transpiran; con plantas se infiltra más y escurre menos; la montaña fuerza al aire a subir; los ríos y el agua subterránea vuelven al mar.</p>
  <p><b>Simplificado:</b> las proporciones están exageradas (en la Tierra cerca del 97% del agua está en los océanos y apenas el 0,001% en la atmósfera); el tiempo va acelerado; sin Sol no se evapora nada (en la realidad algo se evapora igual, más despacio); no hay viento, nieve ni hielo; el suelo y el subsuelo son un solo reservorio; los coeficientes de evaporación y escorrentía son didácticos. Modelo educativo: verificá los datos con tu docente o manual.</p>`
