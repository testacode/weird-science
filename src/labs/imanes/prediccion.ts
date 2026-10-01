// Preguntas de "Predecí antes de correr". Se hacen ANTES de aplicar el cambio y la respuesta sale del modelo.

import { av } from '../../ui/avanzado'
import type { Opcion } from '../../ui/componentes'
import { fuerzaTexto, n, num, s, veces } from './contenido'
import { LARGO, MATERIALES, TIPOS, fuerzaSobreMuestra, magnetizacion, resolver, rozamientoMuestra, type Config } from './model'

export type Respuesta = 'mitad' | 'entre' | 'cuarto' | 'se-mueve' | 'quieta' | 'completos' | 'sueltos' | 'sin-magnetismo'
export type Intencion = 'duplicar'

export interface Pregunta {
  texto: string
  opciones: Opcion<Respuesta>[]
  /** Lo que se le agrega al cambio pedido al responder (apoyar la muestra a 1 cm, separar las partes). */
  ajuste: Partial<Pick<Config, 'gap' | 'sep'>>
  resolver: (despues: Config) => { correcta: Respuesta; explicacion: string }
}

/** A qué distancia se apoya la muestra en la pregunta de materiales. */
export const GAP_PRUEBA = 1
/** Cuánto se separan las partes de un imán partido (cm). */
export const SEP_CORTE = 1.4

/** Fracción de la fuerza que queda al duplicar la distancia. */
const quedaAlDuplicar = (actual: Config, nueva: Config) => Math.abs(resolver(nueva).fuerza) / Math.abs(resolver(actual).fuerza)
/** Los cortes de la pregunta (½ y ¼) y la banda muerta alrededor: ahí no se pregunta, así el porcentaje redondeado nunca contradice el veredicto. */
const CORTES = [0.5, 0.25]
const BANDA = 0.01
const clasificar = (queda: number): 'mitad' | 'entre' | 'cuarto' => (queda > 0.5 ? 'mitad' : queda >= 0.25 ? 'entre' : 'cuarto')

function preguntaDuplicar(actual: Config): Pregunta {
  const r = resolver(actual)
  const doble = actual.gap * 2
  return {
    texto: `Los imanes están a ${num(actual.gap, 1)} cm y ${r.fuerza >= 0 ? 'se atraen' : 'se repelen'} con ${fuerzaTexto(r.fuerza)}. Si los alejás al doble (${num(doble, 1)} cm), ¿cuánta fuerza queda?`,
    opciones: [
      { valor: 'mitad', texto: 'Más de la mitad' },
      { valor: 'entre', texto: 'Entre la mitad y un cuarto' },
      { valor: 'cuarto', texto: 'Menos de un cuarto' },
    ],
    ajuste: {},
    resolver: (despues) => {
      const antes = Math.abs(r.fuerza)
      const ahora = Math.abs(resolver(despues).fuerza)
      const queda = ahora / antes
      const correcta = clasificar(queda)
      const hecho = `La fuerza pasó de <b>${fuerzaTexto(antes)}</b> a <b>${fuerzaTexto(ahora)}</b>: quedó el <b>${num(queda * 100, 0)} %</b> (${num(antes / ahora, 1)} veces menos). Si bajara como 1/d² (como la gravedad) quedaría el 25 %.`
      const causa = {
        mitad: ' Acá cae más despacio: a esta distancia el polo todavía se ve como una cara ancha (1,6 cm), no como un punto, y casi toda la cara sigue igual de cerca.',
        entre: ' Acá cae más despacio que 1/d²: el polo no es un punto sino una cara de 1,6 cm, y a esta distancia todavía se nota su tamaño.',
        cuarto: ' Acá cae más rápido que 1/d²: de cada imán, un polo atrae y el otro repele, y a esta distancia se cancelan en parte.',
      }[correcta]
      return { correcta, explicacion: `${hecho}${causa}${av(' Lejos del imán (mucho más que su largo) la fuerza entre dos dipolos decae como 1/d⁴: al doble de distancia queda 1/16.')}` }
    },
  }
}

function preguntaMaterial(actual: Config, nueva: Config): Pregunta {
  const m = MATERIALES[nueva.material]
  return {
    texto: `Apoyás un cubito de ${m.nombre.toLowerCase()}${m.ejemplo ? ` (como ${m.ejemplo})` : ''} a ${GAP_PRUEBA} cm del imán de ${TIPOS[actual.tipo].nombre.split(' ')[0].toLowerCase()}. ¿Qué pasa?`,
    opciones: [
      { valor: 'se-mueve', texto: 'Se pega: se desliza hacia el imán' },
      { valor: 'quieta', texto: 'No se mueve' },
    ],
    ajuste: { gap: GAP_PRUEBA },
    resolver: (despues) => {
      const r = resolver({ ...despues, gap: GAP_PRUEBA })
      const roz = rozamientoMuestra(despues.material)
      const correcta: Respuesta = r.relativa >= 1 ? 'se-mueve' : 'quieta'
      if (correcta === 'se-mueve') {
        return {
          correcta,
          explicacion: `Se pega: el imán lo atrae con <b>${fuerzaTexto(r.fuerza)}</b>, ${num(r.relativa, 0)} veces el rozamiento con la mesa (${fuerzaTexto(roz)}). Los materiales ferromagnéticos (hierro, níquel, cobalto y sus aleaciones, como el acero) se magnetizan al acercarles un imán.${av(' Un ferromagnético tiene una respuesta enorme (χ ≫ 1) y la forma del cubo la limita a un valor de 3: por eso se pegan con casi la misma fuerza (cambia sobre todo el peso).')}`,
        }
      }
      if (m.ferro) {
        return {
          correcta,
          explicacion: `No se mueve, aunque el ${m.nombre.toLowerCase()} es ferromagnético: el imán conserva solo el <b>${num(magnetizacion(despues) * 100, 0)} %</b> de su magnetización y la fuerza (<b>${fuerzaTexto(r.fuerza)}</b>) no llega a vencer el rozamiento (${fuerzaTexto(roz)}). Sin calor, o más cerca, se pegaría.`,
        }
      }
      const hierro = Math.abs(fuerzaSobreMuestra({ ...despues, material: 'hierro' }, GAP_PRUEBA)) / Math.max(Math.abs(r.fuerza), 1e-30)
      return {
        correcta,
        explicacion: `No se mueve. El ${m.nombre.toLowerCase()} no es ferromagnético: la fuerza es de apenas <b>${fuerzaTexto(r.fuerza)}</b> (unas ${veces(hierro)} veces menos que sobre el hierro) y el rozamiento es ${fuerzaTexto(roz)}.${av(' El aluminio es apenas paramagnético y el cobre y el plástico apenas diamagnéticos: su respuesta es del orden de 10⁻⁵, contra un valor de 3 en un ferromagnético.')}`,
      }
    },
  }
}

function preguntaPartir(nueva: Config): Pregunta {
  const k = nueva.piezas
  return {
    texto: `Parto el imán A en ${k} partes iguales con una sierra. ¿Qué queda?`,
    opciones: [
      { valor: 'sueltos', texto: 'Partes con un solo polo: unas solo N, otras solo S' },
      { valor: 'completos', texto: 'Cada parte es un imán con su N y su S' },
      { valor: 'sin-magnetismo', texto: 'Pedazos de metal sin magnetismo' },
    ],
    ajuste: { sep: Math.max(nueva.sep, SEP_CORTE) },
    // No es un cálculo sino una propiedad del modelo de polos: cada parte conserva su carga por cara (cortar no cambia la sección),
    // y también de la realidad (Wikipedia, "Magnet": un imán partido da dos imanes con N y S). Las otras dos opciones son distractores.
    resolver: () => ({
      correcta: 'completos',
      explicacion: `Quedan ${k} imanes completos de ${num(LARGO / k, 1)} cm: cada uno con su ${n} y su ${s}. Aparecen polos nuevos justo en el corte, así que no se puede aislar un polo: mirá cómo giran las brújulas entre las partes. Un imán se parece a una fila de imanes chiquitos alineados.${av(` Cada parte conserva la misma carga magnética por polo (la sección no cambió), pero al ser más cortas su momento magnético es ${k} veces menor.`)}`,
    }),
  }
}

/** La pregunta que corresponde al cambio que se quiere hacer, o `null` si no hay nada que predecir. */
export function preguntaPara(actual: Config, nueva: Config, intencion?: Intencion): Pregunta | null {
  if (magnetizacion(actual) === 0) return null
  if (intencion === 'duplicar' && actual.modo === 'dos') {
    const queda = quedaAlDuplicar(actual, nueva)
    return CORTES.some((c) => Math.abs(queda - c) < BANDA) ? null : preguntaDuplicar(actual)
  }
  if (nueva.piezas > actual.piezas) return preguntaPartir(nueva)
  if (actual.modo === 'material' && nueva.modo === 'material' && nueva.material !== actual.material) return preguntaMaterial(actual, nueva)
  return null
}
