// Línea de tiempo arrastrable: el día del año, con una marca por equinoccio y solsticio para saltar directo.
import { h } from '../../ui/dom'
import { numero } from '../../ui/formato'
import { lineaArrastrable } from '../../ui/linea'
import { D_AFELIO, D_PERIHELIO, FECHAS_CLAVE, YEAR, fecha } from './model'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const INICIO_MES = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
const pct = (d: number) => `${(d / YEAR) * 100}%`

export function lineaDeTiempo(alArrastrar: (dia: number) => void, alElegirFecha: (dia: number) => void) {
  const fechaTexto = h('b', {}, '')

  const marcas = FECHAS_CLAVE.map((f) => {
    const boton = h('button', {
      type: 'button', class: 'marca-dia', 'aria-label': `Ir al ${fecha(f.dia).larga} (${f.tipo})`,
      onclick: () => alElegirFecha(f.dia),
    }, h('b', {}, fecha(f.dia).corta), h('small', {}, f.tipo))
    boton.style.left = pct(f.dia)
    return boton
  })
  // Perihelio y afelio (info avanzada): también se puede saltar a ellos.
  const extremos = [{ d: D_PERIHELIO, texto: 'perihelio' }, { d: D_AFELIO, texto: 'afelio' }].map(({ d, texto }) => {
    const boton = h('button', {
      type: 'button', class: 'marca-extremo avanzado', 'aria-label': `Ir al ${texto}, ${fecha(d).larga}`,
      onclick: () => alElegirFecha(d),
    }, texto)
    boton.style.left = pct(d)
    return boton
  })
  const meses = MESES.map((m, i) => {
    const s = h('span', {}, m)
    s.style.left = pct(INICIO_MES[i])
    return s
  })

  const l = lineaArrastrable(
    { etiqueta: 'Día del año · arrastralo', valor: [fechaTexto], max: YEAR, paso: 0.05, aria: 'Día del año', alArrastrar },
    h('div', { class: 'meses' }, ...meses),
    h('div', { class: 'marcas' }, ...marcas),
    h('div', { class: 'marcas-extremo avanzado' }, ...extremos),
  )
  return {
    el: l.el,
    /** Actualiza el control sin pisar el arrastre del usuario. */
    set(d: number) {
      l.set(d)
      fechaTexto.textContent = `${fecha(d).larga} · día ${numero(Math.floor(d) + 1, 0)}`
    },
  }
}
