import { ESPECIES, SAL_SOBRESATURADA_G, mezclaDe, type EspecieId, type MezclaId } from './datos'

/** Un pedazo de la mezcla que se comporta como una unidad: la sal disuelta y los cristales son porciones distintas. */
export interface Porcion {
  id: string
  especie: EspecieId
  masa: number
  /** Disuelta en el agua: pasa por cualquier poro y se mueve con el solvente. */
  disuelta: boolean
}

/** Tamaño de lo que está disuelto: iones y moléculas sueltas, del orden de 1 nm. */
export const TAMANO_DISUELTO_MM = 1e-6

/** Descompone la mezcla en porciones. La sal que pasa los 36 g/100 mL no se disuelve: queda como cristales. */
export function porciones(mezcla: MezclaId, sobresaturar: boolean): Porcion[] {
  const partes = mezclaDe(mezcla).partes
  const agua = partes.find((p) => p.especie === 'agua')?.masa ?? 0
  const lista: Porcion[] = []
  for (const { especie, masa } of partes) {
    const e = ESPECIES[especie]
    const total = especie === 'sal' && sobresaturar ? SAL_SOBRESATURADA_G : masa
    if (especie === 'agua') lista.push({ id: 'agua', especie, masa, disuelta: false })
    else if (e.solubilidad === Infinity && agua > 0) lista.push({ id: especie, especie, masa: total, disuelta: true })
    else if (e.solubilidad > 0 && agua > 0) {
      const cabe = Math.min(total, (e.solubilidad * agua) / 100)
      lista.push({ id: `${especie}-disuelta`, especie, masa: cabe, disuelta: true })
      if (total - cabe > 0.05) lista.push({ id: `${especie}-cristal`, especie, masa: total - cabe, disuelta: false })
    } else lista.push({ id: especie, especie, masa: total, disuelta: false })
  }
  return lista
}

export interface TipoMezcla {
  homogenea: boolean
  /** Cuántas fases se ven. */
  fases: number
  /** Solo en las soluciones: qué es el soluto y qué el solvente. */
  soluto?: EspecieId
  solvente?: EspecieId
}

/** Homogénea = una sola fase (no se distinguen los componentes); heterogénea = se ven dos o más. */
export function tipoDeMezcla(lista: Porcion[]): TipoMezcla {
  const sinDisolver = lista.filter((p) => !p.disuelta)
  const fasesLiquidas = new Set(sinDisolver.filter((p) => ESPECIES[p.especie].estado === 'liquido').map((p) => p.especie)).size
  const solidos = new Set(sinDisolver.filter((p) => ESPECIES[p.especie].estado === 'solido').map((p) => p.especie)).size
  const fases = fasesLiquidas + solidos
  const disuelta = lista.find((p) => p.disuelta)
  return { homogenea: fases <= 1, fases, ...(disuelta && fases <= 1 ? { soluto: disuelta.especie, solvente: 'agua' as const } : {}) }
}
