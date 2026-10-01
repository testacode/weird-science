// Textos del lab. Todo el HTML de este archivo es estático y propio (se inyecta con innerHTML).

import { av } from '../../ui/avanzado'
import { numero } from '../../ui/formato'
import { fuentes } from '../../ui/fuentes'
import { LARGO, MATERIALES, TIPOS, fuerzaSobreMuestra, resolver, rozamientoMuestra, type Config, type Resultado } from './model'

export const num = numero

/** Cantidad de veces con dos cifras significativas ("unas 140.000"), para no aparentar una precisión que el modelo no tiene. */
export const veces = (x: number) => num(Number(x.toPrecision(2)), 0)

export const n = '<span class="c-magenta">N</span>'
export const s = '<span class="c-cielo">S</span>'
const ambar = (t: string) => `<span class="c-ambar">${t}</span>`

/** Fuerza con la unidad que corresponde a su tamaño: "0,41 N", "6,9 mN", "1,8 µN". */
export function fuerzaPartes(f: number): [string, string] {
  const a = Math.abs(f)
  if (a === 0) return ['0', 'N']
  if (a >= 1) return [num(a, a >= 10 ? 1 : 2), 'N']
  if (a >= 1e-3) return [num(a * 1e3, a >= 1e-2 ? 1 : 2), 'mN']
  if (a >= 1e-6) return [num(a * 1e6, a >= 1e-5 ? 1 : 2), 'µN']
  return [num(a * 1e9, 1), 'nN']
}
export const fuerzaTexto = (f: number) => fuerzaPartes(f).join(' ')

/** Campo con la unidad que corresponde a su tamaño: T desde 0,1 T, mT, µT por debajo. */
export function campoPartes(t: number): [string, string] {
  if (t >= 0.1) return [num(t, 2), 'T']
  if (t >= 1e-3) return [num(t * 1e3, t >= 1e-2 ? 1 : 2), 'mT']
  return [num(t * 1e6, 1), 'µT']
}

export const GANCHO = `Un imán tiene dos polos, ${n} y ${s}: polos distintos se atraen e iguales se repelen. Acercá imanes y objetos, mirá el campo con brújulas y limaduras, y probá partir o calentar un imán${av(', con el modelo de polos magnéticos y el punto de Curie')}.`

function notaMagnetizacion(c: Config, magnet: number): string {
  if (magnet === 0) {
    return ` <strong>Desmagnetizado:</strong> pasó el punto de Curie (${TIPOS[c.tipo].curie} °C), los dominios se desordenaron y al enfriarse no vuelven.`
  }
  if (c.temp <= 25) return ''
  const uso = TIPOS[c.tipo].usoMax
  const real = uso ? av(` Ojo: un imán de neodimio común empieza a perder fuerza para siempre desde unos ${uso} °C, mucho antes que su punto de Curie; acá solo se muestra la pérdida por Curie.`) : ''
  return ` Calentado a ${c.temp} °C conserva el <b>${num(magnet * 100, 0)} %</b> de su magnetización.${real}`
}

function relatoDos(c: Config, r: Resultado): string {
  const g = `<b>${num(c.gap, 1)} cm</b>`
  if (r.magnetizacion === 0) {
    return `<strong>El imán A ya no atrae.</strong>${notaMagnetizacion(c, 0)} Lejos del imán B las brújulas apuntan al norte: solo sienten el campo de la Tierra. A sigue siendo un trozo de ${c.tipo === 'ferrita' ? 'ferrita' : 'aleación de neodimio'}, y un imán lo atraería como a un clavo, pero el modelo no calcula esa fuerza.`
  }
  const partes = c.piezas > 1
    ? ` El imán A está partido en ${c.piezas}: cada parte tiene su propio ${n} y su ${s}${c.sep > 0 ? ', por eso entre las partes se atraen y las brújulas giran' : ''}.`
    : ''
  const polo = c.polo === 'N' ? n : s
  if (r.fuerza >= 0) {
    return `<strong>Se atraen.</strong> Se enfrentan el ${n} de A y el ${s} de B: polos distintos. A ${g} la fuerza es ${ambar(fuerzaTexto(r.fuerza))}.${partes}${notaMagnetizacion(c, r.magnetizacion)}${av(` En el modelo, cada imán tiene dos polos de signo opuesto y la fuerza total suma los 4 pares de polos; lejos del imán decae como 1/d⁴.`)}`
  }
  return `<strong>Se repelen.</strong> Se enfrentan dos polos ${polo} (iguales). A ${g} la fuerza es ${ambar(fuerzaTexto(r.fuerza))}: no se acercan solos.${partes}${notaMagnetizacion(c, r.magnetizacion)}`
}

const NOTA_MATERIAL: Partial<Record<Config['material'], string>> = {
  aluminio: ' El 75 % de las latas de bebida son de aluminio: esas no se pegan. El otro 25 % son de acero, y esas sí.',
  acero: ' Las latas de conserva son de acero (con un baño de estaño): el acero al carbono es magnético.',
  niquel: ' Hierro, níquel y cobalto son los tres metales ferromagnéticos.',
  cobalto: ' Hierro, níquel y cobalto son los tres metales ferromagnéticos.',
  cobre: ' El cobre (como el oro o la plata) no es ferromagnético.',
}

function relatoMaterial(c: Config, r: Resultado): string {
  const m = MATERIALES[c.material]
  const roz = fuerzaTexto(rozamientoMuestra(c.material))
  const f = `<b>${fuerzaTexto(r.fuerza)}</b>`
  const nota = NOTA_MATERIAL[c.material] ?? ''
  if (r.magnetizacion === 0) return `<strong>El imán está desmagnetizado.</strong> No atrae nada: ni siquiera ${m.ejemplo || `el ${m.nombre.toLowerCase()}`}.${notaMagnetizacion(c, 0)}`
  if (r.relativa >= 1) {
    return c.gap === 0
      ? `<strong>${m.nombre}: pegado.</strong> El imán lo atrae con ${ambar(fuerzaTexto(r.fuerza))}, ${num(r.relativa, 0)} veces lo que lo frena el rozamiento (${roz}).${nota}`
      : `<strong>${m.nombre}: se desliza hacia el imán.</strong> A ${num(c.gap, 1)} cm lo atrae con ${ambar(fuerzaTexto(r.fuerza))} y el rozamiento es de ${roz}.${nota}`
  }
  if (m.ferro) {
    return `<strong>${m.nombre}: ferromagnético, pero lejos.</strong> A ${num(c.gap, 1)} cm el imán lo atrae con ${f}, menos que el rozamiento (${roz}). Acercalo: la fuerza sube muy rápido.${nota}`
  }
  const hierro = Math.abs(fuerzaSobreMuestra({ ...c, material: 'hierro' }, c.gap)) / Math.max(Math.abs(r.fuerza), 1e-30)
  const sentido = r.fuerza >= 0 ? 'lo atrae' : 'lo empuja'
  return `<strong>${m.nombre}: no se pega.</strong> A ${num(c.gap, 1)} cm el imán ${sentido} con apenas ${ambar(fuerzaTexto(r.fuerza))}, unas ${veces(hierro)} veces menos que al hierro: no alcanza ni a vencer el rozamiento (${roz}).${nota}`
}

/** Relato de "ahora": cuenta qué pasa con los números del momento. */
export const relato = (c: Config) => {
  const r = resolver(c)
  return c.modo === 'dos' ? relatoDos(c, r) : relatoMaterial(c, r)
}

export const COMO_FUNCIONA = `
  <h2>¿Cómo funciona?</h2>
  <p>Todo imán tiene dos polos, ${n} (norte) y ${s} (sur). Los polos distintos se atraen y los iguales se repelen. Alrededor del imán hay un <b>campo magnético</b>: una brújula o una limadura de hierro se ordena siguiendo el campo, y por eso se ven las "líneas" que salen del ${n} y vuelven al ${s}.${av(' En el modelo cada imán tiene una carga magnética en cada extremo, y el campo y la fuerza salen de sumar el efecto de todos los polos.')}</p>
  <h3>Qué mirar</h3>
  <ul>
    <li>Las <b>brújulas</b> apuntan en la dirección del campo (con su punta ${n} hacia donde el campo apunta). Lejos de los imanes solo sienten la Tierra y apuntan al norte, hacia arriba en la mesada.</li>
    <li>Las <b>limaduras</b> se ordenan solo donde el campo es fuerte: ese borde marca hasta dónde llega el imán. Es mucho menos que lo que parece.</li>
    <li>La <span class="c-ambar">fuerza</span> cae muy rápido con la distancia: el gráfico se dibuja hasta donde estás y se ve el desplome.</li>
    <li>La regla de la mesada marca los centímetros desde el extremo derecho del imán A.</li>
  </ul>
  <h3>Controles</h3>
  <ul>
    <li><b>Dos imanes:</b> el imán A queda fijo y vos movés el B. Podés dar vuelta el A para que se atraigan (${n} frente a ${s}) o se repelan (polos iguales). El botón "Alejar al doble" pregunta antes qué va a pasar con la fuerza.</li>
    <li><b>Materiales:</b> el imán A y un cubo del mismo tamaño de cada material. Si la atracción vence al rozamiento con la mesa, el cubo se desliza y se pega.</li>
    <li><b>Ferrita o neodimio:</b> la ferrita es la del imán de la heladera; el neodimio es mucho más fuerte.</li>
    <li><b>Info avanzada:</b> muestra u oculta las ecuaciones y los detalles del modelo.</li>
  </ul>
  <h3>Predecí antes de correr</h3>
  <p>Cuando alejás al doble, cambiás de material o parto el imán, el lab te pregunta qué va a pasar antes de hacerlo. Elegí y después se revela si acertaste, con los números del modelo.</p>
  <h3>Romper el sistema</h3>
  <ul>
    <li><b>Partir el imán:</b> cada parte es un imán completo, con su ${n} y su ${s}. Los polos no se pueden separar.</li>
    <li><b>Calentarlo:</b> el imán va perdiendo fuerza y, al llegar al punto de Curie, la pierde del todo. Al enfriarse no se recupera.</li>
  </ul>
  <h3>Qué es real y qué no</h3>
  <p><b>Real:</b> los polos se atraen o se repelen; la fuerza entre dos imanes cae mucho más rápido que 1/d² cuando están lejos${av(' (como 1/d⁴ en el modelo de dipolos)')}; el hierro, el níquel y el cobalto son ferromagnéticos y el aluminio, el cobre y el plástico no lo son (el aluminio es apenas paramagnético y el cobre y el plástico apenas diamagnéticos: en el modelo sienten una fuerza cientos de miles de veces menor); el acero de una lata de conserva es magnético y el aluminio de una lata de gaseosa no; al partir un imán se obtienen dos imanes; al calentarlo por encima del punto de Curie se desmagnetiza; y una brújula apunta al norte porque la Tierra tiene su propio campo (entre 30 y 60 µT según el lugar).</p>
  <p><b>Simplificado:</b></p>
  <ul>
    <li>Los dos imanes son de barra (${LARGO} cm), enfrentados en línea y sobre la mesada. Los de ferrita usan el campo máximo de ~0,35 T como remanencia; los de neodimio, 1,3 T (la fuente da 1 a 1,5 T).</li>
    <li>Los polos del modelo son una herramienta de cálculo (dentro del imán no hay polos separados). Su "suavizado" de 0,5 cm, el campo mínimo con el que las limaduras se ordenan (1 mT) y el campo de la Tierra en la mesada (20 µT) son <b>parámetros de ajuste</b>, no datos. Las limaduras del modelo solo se ordenan: no se agrupan ni se mueven.</li>
    <li>La muestra es un cubo de 1,2 cm. Se calcula como un imán inducido, con el factor desmagnetizante de un cubo (1/3) y saturación a 1,6 T. De cobalto y acero no hay susceptibilidad verificada: el modelo usa un valor alto y el resultado no cambia. El rozamiento con la mesa (0,3) es un parámetro y el deslizamiento está acelerado para que se vea.</li>
    <li>La curva de la temperatura sale del modelo de campo medio de Weiss: muestra la forma (cae despacio y después de golpe), pero los imanes reales se apartan de ella; el neodimio común, por ejemplo, se arruina desde unos 80 °C. Un clavo también deja de ser atraído si lo calentás por encima de 770 °C.</li>
    <li>Un imán desmagnetizado sigue siendo atraído por otro imán (es ferromagnético, solo que sin imanación), pero el modelo muestra fuerza 0. No incluye electricidad estática.</li>
  </ul>
  ${fuentes([
    { texto: 'Curie temperature, Wikipedia: hierro 770 °C, cobalto 1.130 °C, níquel 354 °C, imanes de neodimio 310–400 °C, ferrita de estroncio 450 °C; la magnetización espontánea cae a cero en Tc (en campo medio, como (Tc−T)^½).', url: 'https://en.wikipedia.org/wiki/Curie_temperature' },
    { texto: 'Neodymium magnet, Wikipedia: remanencia de 1 a 1,5 T, Curie de 310 a 370 °C y temperatura máxima de uso desde 80 °C en el grado estándar.', url: 'https://en.wikipedia.org/wiki/Neodymium_magnet' },
    { texto: 'Ferrite magnet, Wikipedia: campo máximo de unos 0,35 T; es el imán de la heladera.', url: 'https://en.wikipedia.org/wiki/Ferrite_magnet' },
    { texto: 'Force between magnets, Wikipedia: modelo de polos y fuerza entre dos imanes cilíndricos enfrentados.', url: 'https://en.wikipedia.org/wiki/Force_between_magnets' },
    { texto: 'Magnetic dipole–dipole interaction, Wikipedia: la fuerza entre dipolos decae como la cuarta potencia de la distancia.', url: 'https://en.wikipedia.org/wiki/Magnetic_dipole%E2%80%93dipole_interaction' },
    { texto: 'Magnetic susceptibility, Wikipedia: aluminio +2,2×10⁻⁵, cobre −9,63×10⁻⁶, PVC −1,07×10⁻⁵, níquel 600, hierro 200.000; densidades de la misma tabla.', url: 'https://en.wikipedia.org/wiki/Magnetic_susceptibility' },
    { texto: 'Magnet, Wikipedia: hierro, níquel y cobalto son ferromagnéticos; un imán partido da dos imanes, cada uno con su N y su S.', url: 'https://en.wikipedia.org/wiki/Magnet' },
    { texto: 'Demagnetizing field, Wikipedia: factor desmagnetizante de 1/3 para una esfera. Saturation (magnetic), Wikipedia: las aleaciones de hierro saturan entre 1,6 y 2,2 T.', url: 'https://en.wikipedia.org/wiki/Demagnetizing_field' },
    { texto: 'Beverage can, Wikipedia: el 75 % de las latas de bebida son de aluminio y el 25 % de acero estañado. Tin can, Wikipedia: el acero al carbono es magnético.', url: 'https://en.wikipedia.org/wiki/Beverage_can' },
    { texto: 'Earth\'s magnetic field, Wikipedia: entre 30.000 nT (Brasil) y 60.000 nT (Siberia); la punta N de la brújula apunta al norte geográfico.', url: 'https://en.wikipedia.org/wiki/Earth%27s_magnetic_field' },
  ])}`
