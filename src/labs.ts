import type { Nivel } from './ui/nivel'

/** Los 4 ejes de los NAP de Ciencias Naturales (Argentina). */
export const EJES = {
  vivos: 'Seres vivos',
  materiales: 'Materiales y sus cambios',
  fisica: 'Fenómenos del mundo físico',
  tierra: 'La Tierra, el universo y sus cambios',
} as const
export type Eje = keyof typeof EJES

export interface Lab {
  slug: string
  titulo: string
  bajada: string
  eje: Eje
  niveles: Nivel[]
  /** Dónde aparece en los NAP, para docentes. */
  nap: string
  listo: boolean
}

export const LABS: Lab[] = [
  { slug: 'digestivo', titulo: 'Sistema digestivo', bajada: 'De la boca a la sangre', eje: 'vivos', niveles: ['primaria', 'secundaria'], nap: 'Primaria 5° · funciones de nutrición', listo: true },
  { slug: 'fotosintesis', titulo: 'Fotosíntesis', bajada: 'Luz, agua y aire hechos planta', eje: 'vivos', niveles: ['primaria', 'secundaria'], nap: 'Primaria 6° · modelos de nutrición', listo: false },
  { slug: 'particulas', titulo: 'Estados de la materia', bajada: 'Partículas que se calientan', eje: 'materiales', niveles: ['primaria', 'secundaria'], nap: 'Primaria 6° · modelo corpuscular', listo: false },
  { slug: 'circuito', titulo: 'Circuito eléctrico', bajada: 'Pila, cable y lamparita', eje: 'fisica', niveles: ['primaria', 'secundaria'], nap: 'Primaria 6° · corriente eléctrica', listo: false },
  { slug: 'luna', titulo: 'Fases de la Luna', bajada: 'Por qué la Luna cambia de forma', eje: 'tierra', niveles: ['primaria', 'secundaria'], nap: 'Primaria 6° · Sistema Solar', listo: false },
]
