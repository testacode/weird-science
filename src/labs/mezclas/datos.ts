// Datos del lab: componentes, mezclas y métodos. Valores de libro de texto, redondeados; los que no
// están verificados se marcan en el comentario.

export type EspecieId = 'agua' | 'arena' | 'aceite' | 'sal' | 'alcohol' | 'hierro'
export type MezclaId = 'arena-agua' | 'agua-aceite' | 'agua-sal' | 'agua-alcohol' | 'hierro-arena'
export type MetodoId = 'tamiz' | 'filtro' | 'decantacion' | 'destilacion' | 'iman'

export interface Especie {
  id: EspecieId
  nombre: string
  /** Un color por componente: el mismo en la escena, el texto, el gráfico y los controles. */
  color: string
  estado: 'solido' | 'liquido'
  /** g/mL. */
  densidad: number
  /** Tamaño del grano o del cristal. Un líquido no tiene grano: 0. */
  tamanoMm: number
  /** °C a 1 atm. Los sólidos y el aceite no hierven en el rango del mechero. */
  tEbullicion: number
  magnetico: boolean
  /** g cada 100 mL de agua a 20 °C. `Infinity`: se mezcla en cualquier proporción. */
  solubilidad: number
}

export const ESPECIES: Record<EspecieId, Especie> = {
  agua: { id: 'agua', nombre: 'Agua', color: '#5ec8ff', estado: 'liquido', densidad: 1.0, tamanoMm: 0, tEbullicion: 100, magnetico: false, solubilidad: Infinity },
  // Aceite vegetal: ~0,92 g/mL (no verificado: varía con el aceite). Se descompone antes de hervir (~300 °C, no verificado).
  aceite: { id: 'aceite', nombre: 'Aceite', color: '#ffc857', estado: 'liquido', densidad: 0.92, tamanoMm: 0, tEbullicion: 300, magnetico: false, solubilidad: 0 },
  // Etanol: 0,789 g/mL y 78,4 °C (valores de libro).
  alcohol: { id: 'alcohol', nombre: 'Alcohol', color: '#ff5fa2', estado: 'liquido', densidad: 0.789, tamanoMm: 0, tEbullicion: 78.4, magnetico: false, solubilidad: Infinity },
  // NaCl: 2,16 g/cm³, 36 g/100 mL a 20 °C y 1413 °C de ebullición. Cristal de sal fina ~0,4 mm (no verificado).
  sal: { id: 'sal', nombre: 'Sal', color: '#f1f4f2', estado: 'solido', densidad: 2.16, tamanoMm: 0.4, tEbullicion: 1413, magnetico: false, solubilidad: 36 },
  // Cuarzo: 2,65 g/cm³. Arena gruesa ~0,8 mm (no verificado: la fina ronda 0,2 mm). Ebullición del SiO2 ~2230 °C (no verificado).
  arena: { id: 'arena', nombre: 'Arena', color: '#b98b5e', estado: 'solido', densidad: 2.65, tamanoMm: 0.8, tEbullicion: 2230, magnetico: false, solubilidad: 0 },
  // Hierro: 7,87 g/cm³ y 2862 °C. Limaduras ~0,15 mm (no verificado).
  hierro: { id: 'hierro', nombre: 'Hierro', color: '#8c9bab', estado: 'solido', densidad: 7.87, tamanoMm: 0.15, tEbullicion: 2862, magnetico: true, solubilidad: 0 },
}

export interface Mezcla {
  id: MezclaId
  nombre: string
  /** Gramos de cada componente en el vaso. El agua siempre son 100 g (≈ 100 mL). */
  partes: { especie: EspecieId; masa: number }[]
}

/** Sal agregada cuando se sobresatura: 55 g en 100 mL, bastante más que los 36 g que aguanta el agua. */
export const SAL_SOBRESATURADA_G = 55

export const MEZCLAS: Mezcla[] = [
  { id: 'arena-agua', nombre: 'Arena + agua', partes: [{ especie: 'arena', masa: 40 }, { especie: 'agua', masa: 100 }] },
  { id: 'agua-aceite', nombre: 'Agua + aceite', partes: [{ especie: 'agua', masa: 100 }, { especie: 'aceite', masa: 46 }] },
  { id: 'agua-sal', nombre: 'Agua + sal', partes: [{ especie: 'agua', masa: 100 }, { especie: 'sal', masa: 30 }] },
  { id: 'agua-alcohol', nombre: 'Agua + alcohol', partes: [{ especie: 'agua', masa: 100 }, { especie: 'alcohol', masa: 39.5 }] },
  { id: 'hierro-arena', nombre: 'Limaduras + arena', partes: [{ especie: 'hierro', masa: 30 }, { especie: 'arena', masa: 30 }] },
]

export interface Metodo {
  id: MetodoId
  nombre: string
  /** La propiedad que aprovecha. */
  propiedad: string
}

export const METODOS: Metodo[] = [
  { id: 'tamiz', nombre: 'Tamiz', propiedad: 'Tamaño' },
  { id: 'filtro', nombre: 'Filtro', propiedad: 'Tamaño' },
  { id: 'decantacion', nombre: 'Decantación', propiedad: 'Densidad' },
  { id: 'destilacion', nombre: 'Destilación', propiedad: 'Ebullición' },
  { id: 'iman', nombre: 'Imán', propiedad: 'Magnetismo' },
]

export const mezclaDe = (id: MezclaId) => MEZCLAS.find((m) => m.id === id)!
export const metodoDe = (id: MetodoId) => METODOS.find((m) => m.id === id)!
