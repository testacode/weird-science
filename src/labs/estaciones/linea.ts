// Línea de tiempo arrastrable: el día del año, con una marca por equinoccio y solsticio para saltar directo.
import { h } from '../../ui/dom'
import { numero } from '../../ui/formato'
import { D_AFELIO, D_PERIHELIO, FECHAS_CLAVE, YEAR, fecha } from './model'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const INICIO_MES = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
const pct = (d: number) => `${(d / YEAR) * 100}%`

export function lineaDeTiempo(alArrastrar: (dia: number) => void, alElegirFecha: (dia: number) => void) {
  const fechaTexto = h('b', {}, '')
  const rango = h('input', {
    type: 'range', min: '0', max: String(YEAR), step: '0.05', value: '0', 'aria-label': 'Día del año',
  })
  let arrastrando = false
  rango.addEventListener('input', () => alArrastrar(Number(rango.value)))
  rango.addEventListener('pointerdown', () => (arrastrando = true))
  const soltar = () => (arrastrando = false)
  window.addEventListener('pointerup', soltar)
  window.addEventListener('pointercancel', soltar)
  rango.addEventListener('lostpointercapture', soltar)

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

  const el = h('div', { class: 'panel linea' },
    h('div', { class: 'linea-cabecera' },
      h('span', { class: 'etiqueta' }, 'Día del año · arrastralo'),
      h('span', { class: 'linea-valor' }, fechaTexto),
    ),
    rango,
    h('div', { class: 'meses' }, ...meses),
    h('div', { class: 'marcas' }, ...marcas),
    h('div', { class: 'marcas-extremo avanzado' }, ...extremos),
  )
  return {
    el,
    /** Actualiza el control sin pisar el arrastre del usuario. */
    set(d: number) {
      if (!arrastrando) rango.value = String(d)
      rango.style.setProperty('--p', `${(d / YEAR) * 100}%`)
      fechaTexto.textContent = `${fecha(d).larga} · día ${numero(Math.floor(d) + 1, 0)}`
    },
  }
}
