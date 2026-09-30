export type Nivel = 'primaria' | 'secundaria'

const CLAVE = 'ws-nivel'
const oyentes = new Set<(n: Nivel) => void>()

export function leerNivel(almacen: Pick<Storage, 'getItem'> = localStorage): Nivel {
  return almacen.getItem(CLAVE) === 'secundaria' ? 'secundaria' : 'primaria'
}

export function guardarNivel(n: Nivel, almacen: Pick<Storage, 'setItem'> = localStorage): void {
  almacen.setItem(CLAVE, n)
  for (const oyente of oyentes) oyente(n)
}

export function alCambiarNivel(oyente: (n: Nivel) => void): void {
  oyentes.add(oyente)
}
