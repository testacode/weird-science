// Preguntas de "Predecí antes de correr". Se hacen ANTES de aplicar el cambio y la respuesta sale del modelo.

import { av } from '../../ui/avanzado'
import type { Opcion } from '../../ui/componentes'
import { fuerzaTexto, n, num, s, veces } from './contenido'
import { LARGO, MATERIALES, TIPOS, fuerzaSobreMuestra, magnetizacion, piezasA, polosDe, resolver, rozamientoMuestra, type Config } from './model'

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
      const correcta: Respuesta = queda > 0.5 ? 'mitad' : queda >= 0.25 ? 'entre' : 'cuarto'
      const hecho = `La fuerza pasó de <b>${fuerzaTexto(antes)}</b> a <b>${fuerzaTexto(ahora)}</b>: quedó el <b>${num(queda * 100, 0)} %</b> (${num(antes / ahora, 1)} veces menos).`
      const causa = correcta === 'cuarto'
        ? ' Si bajara como 1/d² (como la gravedad) quedaría el 25 %: acá cae más rápido: de cada imán, un polo atrae y el otro repele, y a esa distancia se cancelan en parte.'
        : ' Cerca del imán la fuerza cae casi como 1/d² (queda un cuarto): lo que cuenta es el polo más cercano. Lejos cae mucho más rápido.'
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
      const hierro = Math.abs(fuerzaSobreMuestra({ ...despues, material: 'hierro', gap: GAP_PRUEBA }, GAP_PRUEBA)) / Math.max(Math.abs(r.fuerza), 1e-30)
      const cual = m.ferro ? 'El imán está tan débil que' : `El ${m.nombre.toLowerCase()} no es ferromagnético:`
      return {
        correcta,
        explicacion: `No se mueve. ${cual} la fuerza es de apenas <b>${fuerzaTexto(r.fuerza)}</b> (unas ${veces(hierro)} veces menos que sobre el hierro) y el rozamiento es ${fuerzaTexto(roz)}.${av(' El aluminio es apenas paramagnético y el cobre y el plástico apenas diamagnéticos: su respuesta es del orden de 10⁻⁵, contra un valor de 3 en un ferromagnético.')}`,
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
    resolver: (despues) => {
      const q = magnetizacion(despues)
      const partes = piezasA(despues).map((p) => polosDe(p, q))
      const todas = partes.every(([pn, ps]) => pn.q > 0 && ps.q < 0)
      const ninguna = partes.every(([pn, ps]) => pn.q === 0 && ps.q === 0)
      const correcta: Respuesta = todas ? 'completos' : ninguna ? 'sin-magnetismo' : 'sueltos'
      return {
        correcta,
        explicacion: `Quedan ${k} imanes completos de ${num(LARGO / k, 1)} cm: cada uno con su ${n} y su ${s}. Aparecen polos nuevos justo en el corte, así que no se puede aislar un polo: mirá cómo giran las brújulas entre las partes. Un imán se parece a una fila de imanes chiquitos alineados.${av(` Cada parte conserva la misma carga magnética por polo (la sección no cambió), pero al ser más cortas su momento magnético es ${k} veces menor.`)}`,
      }
    },
  }
}

/** La pregunta que corresponde al cambio que se quiere hacer, o `null` si no hay nada que predecir. */
export function preguntaPara(actual: Config, nueva: Config, intencion?: Intencion): Pregunta | null {
  if (magnetizacion(actual) === 0) return null
  if (intencion === 'duplicar' && actual.modo === 'dos') return preguntaDuplicar(actual)
  if (nueva.piezas > actual.piezas) return preguntaPartir(nueva)
  if (actual.modo === 'material' && nueva.modo === 'material' && nueva.material !== actual.material) return preguntaMaterial(actual, nueva)
  return null
}
