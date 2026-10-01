// Qué enzimas actúan en cada tramo. No hay una lista por posición: una enzima aparece
// cuando el modelo le da una tasa de digestión > 0 al macronutriente que ataca en ese tramo.
import { MACROS, SEGMENTOS, tasaDigestion, type Config, type Macro, type Segmento } from './model'

export interface EnzimaActiva {
  nombre: string
  macro: Macro
  /** Actúa, pero con menos fuerza que en condiciones normales (por ejemplo, la lipasa sin bilis). */
  frenada: boolean
}

const NOMBRE: Partial<Record<Segmento['id'], Partial<Record<Macro, string>>>> = {
  boca: { carbos: 'Amilasa salival' },
  estomago: { proteinas: 'Pepsina', grasas: 'Lipasa gástrica' },
  delgado: { carbos: 'Amilasa pancreática', proteinas: 'Tripsina', grasas: 'Lipasa pancreática' },
}

export function enzimasActivas(indice: number, config: Config): EnzimaActiva[] {
  const s = SEGMENTOS[indice]
  return MACROS.flatMap((m) => {
    const nombre = NOMBRE[s.id]?.[m]
    const tasa = tasaDigestion(s, m, config)
    return nombre && tasa > 0 ? [{ nombre, macro: m, frenada: tasa < s.digestion[m] }] : []
  })
}
