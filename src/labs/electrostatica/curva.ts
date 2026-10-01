// Gráfico de la izquierda: cómo cambia el efecto con la distancia en el experimento activo.
import { grafico, type Serie } from '../../ui/grafico'
import { RANGOS, resolver, type Config } from './model'

const PUNTOS = 40
/** Tope del gráfico de papelitos: sin él, la atracción cerca (miles de veces el peso) aplasta el umbral en 1. */
const TECHO_PAPELITOS = 10

export function crearCurva() {
  const g = grafico([{ id: 'v', nombre: 'Fuerza', color: 'marca' }], { titulo: 'Fuerza según la distancia', unidadX: ' cm', unidadY: 'mN', alto: 100 })
  let clave = ''
  return {
    el: g.el,
    /** Redibuja la curva del experimento activo, desde la distancia mínima hasta la actual. */
    pintar(c: Config) {
      const { min, max } = RANGOS[c.experimento]
      let series: Serie[] = [{ id: 'v', nombre: 'Fuerza', color: 'marca' }]
      let titulo = 'Fuerza según la distancia'
      let unidad = 'N'
      let factor = 1
      let yMax = 1e-9
      let yTecho: number | undefined
      let valor: (d: number) => Record<string, number>
      if (c.experimento === 'cargas') {
        const tope = Math.abs(resolver(c, min).fuerza)
        ;[factor, unidad] = tope >= 1 || tope === 0 ? [1, 'N'] : tope >= 1e-3 ? [1e3, 'mN'] : [1e6, 'µN']
        yMax = Math.max(tope * factor, 1e-9)
        valor = (d) => ({ v: Math.abs(resolver(c, d).fuerza) * factor })
      } else if (c.experimento === 'papelitos') {
        series = [{ id: 'v', nombre: 'Atracción', color: 'marca' }, { id: 'peso', nombre: 'Peso', color: 'var(--apagado)' }]
        titulo = 'Atracción sobre un papelito'
        unidad = '× peso'
        yMax = 4
        yTecho = TECHO_PAPELITOS
        valor = (d) => ({ v: resolver(c, d).vecesPeso, peso: 1 })
      } else {
        series = [{ id: 'v', nombre: 'Apertura', color: 'marca' }]
        titulo = 'Apertura de las hojas'
        unidad = '°'
        yMax = 45
        yTecho = 160
        valor = (d) => ({ v: resolver(c, d).angulo * 2 })
      }
      const nueva = `${c.experimento}-${unidad}`
      if (nueva !== clave) {
        clave = nueva
        g.cambiar(series, { titulo, unidadX: ' cm', unidadY: unidad, xMax: max, yMax, yTecho })
      }
      g.limpiar({ xMax: max, yMax })
      // Se dibuja hasta la distancia actual: el valor de la leyenda es el del último punto.
      const hasta = Math.max(c.dist[c.experimento], min + 0.01)
      for (let i = 0; i <= PUNTOS; i++) {
        const d = min + ((hasta - min) * i) / PUNTOS
        g.agregar(d, valor(d))
      }
    },
  }
}
