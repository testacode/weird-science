import { describe, expect, it } from 'vitest'
import { alCambiarNivel, guardarNivel, leerNivel } from './nivel'

function almacen() {
  const datos = new Map<string, string>()
  return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v) }
}

describe('nivel', () => {
  it('arranca en primaria si no hay nada guardado o el valor es inválido', () => {
    const a = almacen()
    expect(leerNivel(a)).toBe('primaria')
    a.setItem('ws-nivel', 'jardin')
    expect(leerNivel(a)).toBe('primaria')
  })

  it('guarda el nivel y avisa a los oyentes', () => {
    const a = almacen()
    const vistos: string[] = []
    alCambiarNivel((n) => vistos.push(n))
    guardarNivel('secundaria', a)
    expect(leerNivel(a)).toBe('secundaria')
    expect(vistos).toEqual(['secundaria'])
  })
})
