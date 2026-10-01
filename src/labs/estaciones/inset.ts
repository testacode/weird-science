// "Desde tu ciudad": un corte de lo que ve la ciudad al mediodía. El Sol a su altura y un haz de linterna
// de ancho fijo que cae sobre el suelo: cuanto más bajo el Sol, más suelo cubre el mismo haz.
import { h } from '../../ui/dom'
import { numero } from '../../ui/formato'
import type { Resumen } from './model'

const RAD = Math.PI / 180
const W = 320
const H = 132
const SUELO = 100
/** Ancho del haz (px), igual todo el año. */
const HAZ = 32
const DISTANCIA_SOL = 88

export interface VistaCiudad {
  ciudad: string
  fecha: string
  r: Resumen
}

export function crearInset() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const canvas = h('canvas', { class: 'inset-lienzo', role: 'img', 'aria-label': 'El Sol al mediodía visto desde tu ciudad' })
  canvas.width = Math.round(W * dpr)
  canvas.height = Math.round(H * dpr)
  canvas.style.width = `${W}px`
  canvas.style.height = `${H}px`
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  const lugar = h('span', { class: 'inset-lugar' })
  const altura = h('b', { class: 'inset-altura' })
  const lado = h('span', { class: 'inset-lado' })
  const pie = h('p', { class: 'inset-pie' })
  const el = h('div', { class: 'panel inset' },
    h('div', { class: 'inset-cabeza' }, h('span', { class: 'etiqueta' }, 'Desde tu ciudad'), lugar),
    h('div', { class: 'inset-marco' }, canvas, altura, lado, h('span', { class: 'inset-yo' }, 'tu ciudad')),
    pie,
  )

  function dibujar(r: Resumen) {
    const alt = r.altura
    const sale = alt > 0
    const O = { x: W * 0.42, y: SUELO }
    ctx.clearRect(0, 0, W, H)

    // Cielo
    const cielo = ctx.createLinearGradient(0, 0, 0, SUELO)
    cielo.addColorStop(0, sale ? '#07182b' : '#03070d')
    cielo.addColorStop(1, sale ? '#1a4257' : '#08121c')
    ctx.fillStyle = cielo
    ctx.fillRect(0, 0, W, SUELO)

    if (sale) {
      const s = Math.sin(alt * RAD)
      const c = Math.cos(alt * RAD)
      const sol = { x: O.x + DISTANCIA_SOL * c, y: O.y - DISTANCIA_SOL * s }
      // El haz: ancho fijo, perpendicular a la dirección de los rayos (que van del Sol al suelo, hacia la izquierda).
      const nx = s
      const ny = c
      const borde = (k: number) => {
        const x0 = sol.x + k * nx * (HAZ / 2)
        const y0 = sol.y + k * ny * (HAZ / 2)
        const t = (SUELO - y0) / s
        return { x0, y0, x1: x0 - c * t, y1: SUELO }
      }
      const a = borde(-1)
      const b = borde(1)
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, W, SUELO)
      ctx.clip()
      ctx.fillStyle = 'rgba(255, 200, 87, 0.13)'
      ctx.beginPath()
      ctx.moveTo(a.x0, a.y0)
      ctx.lineTo(b.x0, b.y0)
      ctx.lineTo(b.x1, b.y1)
      ctx.lineTo(a.x1, a.y1)
      ctx.closePath()
      ctx.fill()
      // Rayos paralelos dentro del haz.
      ctx.strokeStyle = 'rgba(255, 214, 120, 0.55)'
      ctx.lineWidth = 1.2
      const N = 5
      for (let i = 0; i < N; i++) {
        const k = -1 + (2 * (i + 0.5)) / N
        const x0 = sol.x + k * nx * (HAZ / 2)
        const y0 = sol.y + k * ny * (HAZ / 2)
        const t = (SUELO - y0) / s
        ctx.beginPath()
        ctx.moveTo(x0, y0)
        ctx.lineTo(x0 - c * t, SUELO)
        ctx.stroke()
      }
      ctx.restore()

      // Sol con halo.
      const halo = ctx.createRadialGradient(sol.x, sol.y, 2, sol.x, sol.y, 24)
      halo.addColorStop(0, 'rgba(255, 200, 87, 0.7)')
      halo.addColorStop(1, 'rgba(255, 200, 87, 0)')
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, W, SUELO)
      ctx.clip()
      ctx.fillStyle = halo
      ctx.fillRect(sol.x - 24, sol.y - 24, 48, 48)
      ctx.fillStyle = '#ffc857'
      ctx.beginPath()
      ctx.arc(sol.x, sol.y, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Arco de la altura.
      ctx.strokeStyle = 'rgba(236, 245, 240, 0.7)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(O.x, O.y, 22, -alt * RAD, 0)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(O.x, O.y)
      ctx.lineTo(O.x + 30, O.y)
      ctx.stroke()
    } else {
      ctx.fillStyle = '#93a8a0'
      ctx.font = '600 11px "JetBrains Mono", ui-monospace, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('El Sol no sale', O.x, 56)
    }

    // Suelo, con la mancha de luz: más larga y más tenue cuanto más bajo el Sol.
    ctx.fillStyle = '#0f211d'
    ctx.fillRect(0, SUELO, W, H - SUELO)
    ctx.fillStyle = 'rgba(190, 255, 220, 0.3)'
    ctx.fillRect(0, SUELO, W, 1)
    if (sale) {
      const largo = HAZ / Math.sin(alt * RAD)
      ctx.fillStyle = `rgba(255, 200, 87, ${0.3 + 0.7 * Math.sin(alt * RAD)})`
      ctx.fillRect(Math.max(0, O.x - largo / 2), SUELO, Math.min(largo, W), 5)
    }
    // La ciudad.
    ctx.fillStyle = '#c6f35e'
    ctx.beginPath()
    ctx.arc(O.x, SUELO, 4, 0, Math.PI * 2)
    ctx.fill()
  }

  let previo = ''
  return {
    el,
    dibujar(v: VistaCiudad) {
      const { r } = v
      // Con el Sol quieto (día pausado) no hay nada que repintar.
      const clave = `${v.ciudad}|${v.fecha}|${r.altura.toFixed(2)}`
      if (clave === previo) return
      previo = clave
      lugar.textContent = `${v.ciudad} · ${v.fecha}`
      altura.innerHTML = r.altura > 0 ? `${numero(r.altura, 1)}°<small>al mediodía</small>` : 'Sin Sol<small>noche polar</small>'
      lado.textContent = r.altura <= 0 ? '' : r.haciaElSol === 'cenit' ? 'arriba' : r.haciaElSol === 'norte' ? 'Norte →' : 'Sur →'
      pie.innerHTML = r.altura > 0
        ? `El mismo haz cubre <b>${numero(r.estiramiento, 1)}×</b> de suelo: cada m² recibe el <b>${numero(100 / r.estiramiento, 0)} %</b> de la luz.`
        : 'El Sol no llega a salir: no hay luz directa.'
      dibujar(r)
    },
  }
}
