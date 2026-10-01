// Línea de tiempo arrastrable: el día del ciclo lunar, con un ícono por fase para saltar directo.
import { h } from '../../ui/dom'
import { numero } from '../../ui/formato'
import { NOTA_MES } from './contenido'
import { MES_SINODICO, esCreciente, elongacion, type Hemisferio } from './model'

const RAD = Math.PI / 180
const TAM_ICONO = 24

/** Dibuja la Luna con su fase (`grados` 0-360) como se ve desde cada hemisferio. */
function dibujarIcono(canvas: HTMLCanvasElement, grados: number, hem: Hemisferio) {
  const dpr = window.devicePixelRatio || 1
  canvas.width = canvas.height = Math.round(TAM_ICONO * dpr)
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const c = TAM_ICONO / 2
  const r = c - 1.5
  ctx.clearRect(0, 0, TAM_ICONO, TAM_ICONO)
  ctx.fillStyle = '#26332f'
  ctx.beginPath()
  ctx.arc(c, c, r, 0, Math.PI * 2)
  ctx.fill()
  // Lado iluminado: derecha en el norte cuando crece; el sur lo ve al revés.
  const lado = esCreciente(grados) === (hem === 'norte') ? 1 : -1
  const cos = Math.cos(elongacion(grados) * RAD)
  ctx.fillStyle = '#f1efe2'
  ctx.beginPath()
  ctx.arc(c, c, r, -Math.PI / 2, Math.PI / 2, lado < 0)
  for (let i = 0; i <= 24; i++) {
    const y = r - (i / 24) * 2 * r
    ctx.lineTo(c + lado * cos * Math.sqrt(Math.max(0, r * r - y * y)), c + y)
  }
  ctx.fill()
}

const MARCAS = [0, 45, 90, 135, 180, 225, 270, 315, 360]

export function lineaDeTiempo(inicial: Hemisferio, alElegir: (dia: number) => void) {
  const dia = h('b', {}, '0')
  const ciclo = h('span', { class: 'avanzado' })
  const rango = h('input', {
    type: 'range', min: '0', max: String(MES_SINODICO), step: '0.01', value: '0', 'aria-label': 'Día del ciclo lunar',
  })
  let arrastrando = false
  rango.addEventListener('input', () => alElegir(Number(rango.value)))
  rango.addEventListener('pointerdown', () => (arrastrando = true))
  window.addEventListener('pointerup', () => (arrastrando = false))
  const iconos = MARCAS.map((g) => {
    const canvas = h('canvas', { class: 'icono-fase' })
    const boton = h('button', {
      type: 'button', class: 'marca-fase', 'aria-label': `Ir al día ${((g / 360) * MES_SINODICO).toFixed(1)}`,
      onclick: () => alElegir((g / 360) * MES_SINODICO),
    }, canvas)
    boton.style.left = `${(g / 360) * 100}%`
    return { g, canvas, boton }
  })
  const nota = h('p', { class: 'nota-mes avanzado' })
  nota.innerHTML = NOTA_MES
  const poner = (hem: Hemisferio) => iconos.forEach((i) => dibujarIcono(i.canvas, i.g, hem))
  poner(inicial)

  const el = h('div', { class: 'panel linea' },
    h('div', { class: 'linea-cabecera' },
      h('span', { class: 'etiqueta' }, 'Día del ciclo · arrastralo'),
      h('span', { class: 'linea-valor' }, dia, ` de ${numero(MES_SINODICO)} `, ciclo),
    ),
    rango,
    h('div', { class: 'marcas' }, ...iconos.map((i) => i.boton)),
    nota,
  )
  return {
    el,
    setHemisferio: poner,
    /** Actualiza el control sin pisar el arrastre del usuario. */
    set(valor: number, numeroCiclo: number) {
      if (!arrastrando) rango.value = String(valor)
      rango.style.setProperty('--p', `${(valor / MES_SINODICO) * 100}%`)
      dia.textContent = numero(valor)
      ciclo.textContent = `· ciclo ${numeroCiclo}`
    },
  }
}
