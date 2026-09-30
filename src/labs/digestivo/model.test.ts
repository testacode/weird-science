import { describe, expect, it } from 'vitest'
import {
  HORAS_TOTALES,
  MACROS,
  estadoInicial,
  fraccionAbsorbida,
  kcalAbsorbidas,
  paso,
  phSegmento,
  simularHastaElFinal,
  type Config,
} from './model'

const normal: Config = { bilis: true, acidoGastrico: true }
const comida = { carbos: 40, proteinas: 20, grasas: 15 }

describe('modelo digestivo', () => {
  it('conserva la masa: intacto + digerido + absorbido = lo ingerido', () => {
    let e = estadoInicial(comida)
    for (let i = 0; i < 1000; i++) e = paso(e, normal)
    for (const m of MACROS) {
      const p = e.nutrientes[m]
      expect(p.intacto + p.digerido + p.absorbido).toBeCloseTo(comida[m], 6)
    }
  })

  it('con todo funcionando absorbe más del 90% de cada macronutriente', () => {
    const fin = simularHastaElFinal(estadoInicial(comida), normal)
    for (const m of MACROS) expect(fraccionAbsorbida(fin.nutrientes, m)).toBeGreaterThan(0.9)
  })

  it('sin bilis la absorción de grasas cae por debajo del 60%', () => {
    const fin = simularHastaElFinal(estadoInicial(comida), { ...normal, bilis: false })
    expect(fraccionAbsorbida(fin.nutrientes, 'grasas')).toBeLessThan(0.6)
    expect(fraccionAbsorbida(fin.nutrientes, 'carbos')).toBeGreaterThan(0.9)
  })

  it('sin ácido gástrico las proteínas se siguen digiriendo en el delgado', () => {
    const fin = simularHastaElFinal(estadoInicial(comida), { ...normal, acidoGastrico: false })
    expect(fraccionAbsorbida(fin.nutrientes, 'proteinas')).toBeGreaterThan(0.85)
    expect(phSegmento(2, { ...normal, acidoGastrico: false })).toBe(5)
  })

  it('el estómago es ácido y el delgado levemente básico', () => {
    expect(phSegmento(2, normal)).toBe(2)
    expect(phSegmento(3, normal)).toBeGreaterThan(7)
  })

  it('no absorbe nada antes del intestino delgado', () => {
    let e = estadoInicial(comida)
    while (e.segmento < 3) e = paso(e, normal)
    expect(kcalAbsorbidas(e.nutrientes)).toBe(0)
  })

  it('termina cerca del tiempo total de tránsito', () => {
    const fin = simularHastaElFinal(estadoInicial(comida), normal)
    expect(fin.terminado).toBe(true)
    expect(fin.horas).toBeCloseTo(HORAS_TOTALES, 0)
  })
})
