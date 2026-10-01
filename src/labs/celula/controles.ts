// Consola de controles (arriba a la derecha). Devuelve los `set` de cada control para que
// el teclado y la lógica del lab mantengan la botonera sincronizada.
import { interruptorAvanzado } from '../../ui/avanzado'
import { grupo, interruptor, modal, segmentado } from '../../ui/componentes'
import { deslizador } from '../../ui/deslizador'
import { h } from '../../ui/dom'
import { numero } from '../../ui/formato'
import { osmolaridad } from './constantes'
import { AYUDA_ATAJOS, COMO_FUNCIONA } from './contenido'
import { CELULAS, type Celula, type Entorno } from './model'

export const VELOCIDADES = [0.5, 1, 3]
const NOMBRE_VELOCIDAD = ['½×', '1×', '3×']
export const PCT_MAX = 4

export type Solucion = 'agua' | 'hipo' | 'iso' | 'hiper'
const FACTOR: Record<Solucion, number> = { agua: 0, hipo: 0.5, iso: 1, hiper: 3 }
const NOMBRE_SOLUCION: Record<Solucion, string> = { agua: 'Agua pura', hipo: 'Hipotónica', iso: 'Isotónica', hiper: 'Hipertónica' }

/** % de sal de cada solución típica: múltiplos de la concentración isotónica de la célula. */
export const pctDe = (celula: Celula, s: Solucion) => Math.round(FACTOR[s] * CELULAS[celula].pctIso * 100) / 100
/** La solución típica que coincide con el % dado, o `null` si es uno intermedio. */
export const solucionDe = (celula: Celula, pct: number): Solucion | null =>
  (Object.keys(FACTOR) as Solucion[]).find((s) => Math.abs(pctDe(celula, s) - pct) < 0.005) ?? null

export interface Acciones {
  alternar(): void
  reiniciar(): void
  velocidad(v: number): void
  celula(c: Celula): void
  solucion(s: Solucion): void
  pct(v: number): void
  selectiva(si: boolean): void
  pared(si: boolean): void
}

export function crearControles(ent: Entorno, velocidad: number, a: Acciones) {
  const ayuda = modal()
  const botonPlay = h('button', { class: 'boton boton-marca', type: 'button', onclick: a.alternar }, '⏸ Pausa')
  const reloj = h('span', { class: 'etiqueta' })
  const abrirAyuda = () => ayuda.abrir(COMO_FUNCIONA)
  const abrirAtajos = () => ayuda.abrir(AYUDA_ATAJOS)

  const celula = segmentado<Celula>(
    (Object.keys(CELULAS) as Celula[]).map((c) => ({ valor: c, texto: CELULAS[c].nombre })), ent.celula, a.celula,
  )
  const solucion = segmentado<Solucion | 'libre'>(
    (Object.keys(FACTOR) as Solucion[]).map((s) => ({ valor: s, texto: NOMBRE_SOLUCION[s] })), solucionDe(ent.celula, ent.pct) ?? 'libre',
    (s) => s !== 'libre' && a.solucion(s),
  )
  const sal = deslizador({
    titulo: 'Sal en la solución', min: 0, max: PCT_MAX, paso: 0.01, valor: ent.pct, color: 'var(--ambar)',
    formato: (v) => `${numero(v, 2)} % NaCl`,
    nota: (v) => `<span class="avanzado">${numero(osmolaridad(v), 0)} mOsm/L</span>`,
    alCambiar: a.pct,
  })
  const vel = segmentado(VELOCIDADES.map((v, i) => ({ valor: String(v), texto: NOMBRE_VELOCIDAD[i] })), String(velocidad), (v) => a.velocidad(Number(v)))
  const selectiva = interruptor('Membrana selectiva', ent.selectiva, a.selectiva)
  const pared = interruptor('Pared celular', ent.pared, a.pared)
  pared.el.hidden = ent.celula !== 'vegetal'

  const el = h('div', { class: 'panel consola' },
    h('div', { class: 'fila' }, botonPlay, h('button', { class: 'boton', type: 'button', onclick: a.reiniciar }, '↺ Otra célula'),
      h('button', { class: 'boton', type: 'button', 'aria-label': 'Cómo funciona', title: 'Cómo funciona (?)', onclick: abrirAyuda }, '?')),
    grupo('Célula', celula.el),
    grupo('Solución', h('div', { class: 'grupo' }, solucion.el, sal.el)),
    grupo('Velocidad', vel.el),
    reloj,
    grupo('Romper el sistema', h('div', { class: 'grupo' }, selectiva.el, pared.el)),
    interruptorAvanzado(),
    h('button', { class: 'boton boton-atajos', type: 'button', onclick: abrirAtajos }, '⌨ Atajos de teclado (H)'),
  )

  return {
    el, ayuda, abrirAyuda, abrirAtajos, botonPlay, reloj,
    set: {
      celula: (c: Celula) => {
        celula.set(c)
        pared.el.hidden = c !== 'vegetal'
      },
      pct: (celulaActual: Celula, pct: number) => {
        sal.set(pct)
        solucion.set(solucionDe(celulaActual, pct) ?? 'libre')
      },
      velocidad: (v: number) => vel.set(String(v)),
      selectiva: selectiva.set,
      pared: pared.set,
    },
  }
}
