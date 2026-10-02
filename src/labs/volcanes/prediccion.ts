// Preguntas de "Predecí antes de correr". La respuesta sale del modelo, no está escrita a mano.
// - origen: siempre da lo mismo (el magma se forma en el manto): constante, la lección va en el texto y las opciones se mezclan.
// - volcanes: depende del borde (producción de magma: cero solo en el transformante).
// - erupcion: depende del magma (explosividad); se pregunta solo con los magmas de referencia, lejos de los cortes.
import { av } from '../../ui/avanzado'
import { mezclar } from '../../ui/azar'
import type { Opcion } from '../../ui/componentes'
import { exp10, num } from './contenido'
import {
  FUSION, PROFUNDIDAD, explosividad, logViscosidad, temperatura, tipoErupcion, tipoMagma,
  type Borde, type Config, type Estado,
} from './model'

export type Respuesta = 'nucleo' | 'manto' | 'corteza' | 'si' | 'no' | 'cualquiera' | 'efusiva' | 'mixta' | 'explosiva'

export interface Pregunta {
  id: 'origen' | 'volcanes' | 'erupcion'
  texto: string
  opciones: Opcion<Respuesta>[]
  /** Lo que se ve en pantalla ya coincide con el veredicto. */
  listo: (e: Estado) => boolean
  resolver: () => { correcta: Respuesta; explicacion: string }
}

const NOMBRE_BORDE: Record<Borde, string> = {
  divergente: 'Las placas se separan.',
  convergente: 'Una placa se hunde bajo la otra.',
  transformante: 'Las placas se deslizan, una al lado de la otra.',
}

/** Veces la viscosidad del agua (0,001 Pa·s). */
const vecesAgua = (silice: number) => {
  const n = 10 ** (logViscosidad(silice) + 3)
  const paso = 10 ** (Math.floor(Math.log10(n)) - 1)
  return Math.round(n / paso) * paso
}
const potencia = (silice: number) => `10<sup>${exp10(logViscosidad(silice))}</sup> Pa·s`

export function preguntaOrigen(c: Config): Pregunta {
  return {
    id: 'origen',
    texto: 'Un volcán expulsa roca fundida. ¿De dónde viene ese magma?',
    opciones: mezclar<Opcion<Respuesta>>([
      { valor: 'nucleo', texto: `Del núcleo de la Tierra, a unos ${num(PROFUNDIDAD.nucleo, 0)} km` },
      { valor: 'manto', texto: 'Del manto superior, a decenas o pocos cientos de km' },
      { valor: 'corteza', texto: 'De la corteza, a pocos km de la superficie' },
    ]),
    listo: (e) => e.fusion >= 1,
    resolver: () => {
      const f = FUSION[c.borde]
      return {
        correcta: 'manto',
        explicacion: `Se forma en el manto, a unos <b>${num(f.origenKm, 0)} km</b> (la zona naranja del corte): ${f.mecanismo === 'agua' ? 'la placa que se hunde suelta agua y el agua baja el punto de fusión de la roca' : 'el manto sube, baja la presión y la roca se funde'}. El núcleo está unas ${num(PROFUNDIDAD.nucleo / f.origenKm, 0)} veces más hondo, y además es hierro y níquel líquidos: el magma es roca fundida (silicatos).${av(' Las cámaras de pocos km solo lo almacenan en el camino: el magma sube porque es menos denso que la roca que lo rodea.')}`,
      }
    },
  }
}

export function preguntaVolcanes(c: Config): Pregunta {
  const f = FUSION[c.borde]
  return {
    id: 'volcanes',
    texto: `${NOMBRE_BORDE[c.borde]} ¿Qué esperás encontrar acá?`,
    opciones: [
      { valor: 'si', texto: 'Se forma magma y aparecen volcanes' },
      { valor: 'no', texto: 'Casi no hay magma ni volcanes' },
      { valor: 'cualquiera', texto: 'Da igual el borde: los volcanes salen en cualquier lugar' },
    ],
    listo: (e) => e.fusion >= 1 && (f.produccion === 0 || e.erupcion >= 0.5),
    resolver: () => {
      const hay = f.produccion > 0
      const general = 'Los volcanes se concentran en los bordes de placa: el Anillo de Fuego reúne cerca de dos tercios de todos. Las excepciones son los puntos calientes, como Hawái, a más de 3.200 km del borde más cercano.'
      const porQue = {
        divergente: `Al separarse las placas el manto sube; al bajar la presión, la roca se funde desde unos ${f.origenKm} km. Las dorsales producen casi todo el magma del planeta: unos 19 km³ de corteza nueva por año, de 20–25 km³ en total.`,
        convergente: `La placa que se hunde llega a unos ${f.origenKm} km y suelta agua: a unos 100 km de profundidad, con agua la roca del manto funde a ~800 °C en vez de ~1.500 °C. Por eso hay cadenas de volcanes sobre la placa de arriba, como los Andes.`,
        transformante: `Las placas solo se rozan (la falla de San Andrés se mueve ~${num(f.velocidad, 0)} cm por año): no sube manto ni entra agua, así que no se forma magma. Lo que hay son sismos poco profundos.`,
      }[c.borde]
      return { correcta: hay ? 'si' : 'no', explicacion: `${porQue} ${general}` }
    },
  }
}

export function preguntaErupcion(c: Config): Pregunta {
  return {
    id: 'erupcion',
    texto: `Pasás a un magma ${{ basaltico: 'basáltico', andesitico: 'andesítico', riolitico: 'riolítico' }[tipoMagma(c.silice)]}: ${num(c.silice, 0)} % de sílice y ${num(c.gas, 1)} % de agua disuelta. ¿Cómo va a ser la erupción?`,
    opciones: [
      { valor: 'explosiva', texto: 'Explosiva: ceniza y fragmentos volando' },
      { valor: 'efusiva', texto: 'Tranquila: la lava fluye por las laderas' },
      { valor: 'mixta', texto: 'Mezcla: fuentes de lava y algo de ceniza' },
    ],
    listo: (e) => e.erupcion >= 1,
    resolver: () => {
      const e = explosividad(c.silice, c.gas)
      const correcta = tipoErupcion(e)
      const dato = `Con <b>${num(c.silice, 0)} %</b> de sílice el magma tiene <b>${potencia(c.silice)}</b> (unas ${num(vecesAgua(c.silice), 0)} veces el agua) a ~${num(temperatura(c.silice), 0)} °C, y lleva <b>${num(c.gas, 1)} %</b> de agua.`
      const porQue = {
        efusiva: `Es fluido${c.gas < 1 ? ' y casi no tiene gas:' : ` y, aunque lleva ${num(c.gas, 1)} % de agua,`} las burbujas escapan sin romper nada y la lava corre por las laderas. Por eso los volcanes de basalto, como los de Hawái, forman coladas y no explotan.`,
        explosiva: 'Es pastoso y lleva gas: las burbujas no pueden escapar, la presión crece y al llegar arriba la espuma revienta y rompe el magma en ceniza y fragmentos. Es lo típico de los volcanes andesíticos y de las riolitas. No todos los volcanes explotan: depende del magma.',
        mixta: 'Su viscosidad y su gas están a medio camino: la lava sale en fuentes y parte se fragmenta en ceniza.',
      }[correcta]
      return { correcta, explicacion: `${dato} ${porQue}${av(` Explosividad del modelo: ${num(e, 2)} de 1.`)}` }
    },
  }
}
