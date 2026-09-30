/** Los 4 ejes de los NAP de Ciencias Naturales (Argentina). */
export const EJES = {
  vivos: 'Seres vivos',
  materiales: 'Materiales y sus cambios',
  fisica: 'Fenómenos del mundo físico',
  tierra: 'La Tierra, el universo y sus cambios',
} as const
export type Eje = keyof typeof EJES

/** Recorridos transversales, además de los ejes NAP. */
export const TEMAS = {
  energia: 'Energía',
  ciclos: 'Ciclos',
  sistemas: 'Sistemas',
  materia: 'Materia y partículas',
  fuerzas: 'Fuerzas y campos',
} as const
export type Tema = keyof typeof TEMAS

export interface Lab {
  slug: string
  titulo: string
  bajada: string
  eje: Eje
  /** Dónde aparece en los NAP, para docentes. */
  nap: string
  temas: Tema[]
  /** Orden dentro del eje. */
  orden: number
  listo: boolean
}

// Cada lab describe su propia tarjeta en src/labs/<slug>/meta.ts.
const metas = import.meta.glob<{ meta: Lab }>('./labs/*/meta.ts', { eager: true })

export const LABS: Lab[] = Object.values(metas)
  .map((m) => m.meta)
  .sort((a, b) => a.orden - b.orden)
