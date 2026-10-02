import { h } from './dom'
import { numero } from './formato'

/** Colores del kit (variables CSS de `kit.css`). */
export type ColorKit = 'ambar' | 'magenta' | 'cielo' | 'marca'
const COLORES_KIT: readonly string[] = ['ambar', 'magenta', 'cielo', 'marca']

export interface Serie {
  id: string
  nombre: string
  /** Un color del kit o cualquier color CSS (`'#e8e6d6'`, `'var(--luz)'`). */
  color: ColorKit | (string & {})
}

export interface EscalaGrafico {
  /** Fin del eje X. Sin valor, el eje crece con los datos. */
  xMax?: number
  /** Mínimo para el tope del eje Y; la escala crece si los datos lo superan. */
  yMax?: number
  /** Máximo para el piso del eje Y (negativo para mostrar valores bajo cero); baja si los datos bajan más. Sin valor, 0. */
  yMin?: number
  /** Límite físico del eje Y (24 h, 100 %): el redondeo del tope nunca lo pasa. */
  yTecho?: number
}

export interface Punto {
  x: number
  /** Valor de cada serie (por `id`). */
  v: Record<string, number>
}

export interface OpcionesGrafico extends EscalaGrafico {
  titulo?: string
  unidadX?: string
  unidadY?: string
  /** Alto del lienzo en px CSS. */
  alto?: number
}

const MONO = '"JetBrains Mono", ui-monospace, monospace'
const MARGEN = { izq: 34, der: 8, arriba: 6, abajo: 18 }
/** Distancia mínima (px) entre dos rótulos del eje Y. */
const SEPARACION_Y = 12

/** Número corto para ejes y leyenda: sin decimales desde 10, con uno por debajo. */
const corto = (n: number) => numero(n, Math.abs(n) >= 10 || Number.isInteger(n) ? 0 : 1)

/** Tope "lindo" para el eje: 1, 2, 2,5, 5 o 10 por potencia de diez. */
function tope(valor: number): number {
  const base = 10 ** Math.floor(Math.log10(Math.max(valor, 1e-9)))
  return ([1, 2, 2.5, 5, 10].find((m) => m * base >= valor) ?? 10) * base
}

/** Color CSS utilizable en canvas: los del kit y `var(--x)` se resuelven contra `:root`. */
function resolver(c: string): string {
  const variable = COLORES_KIT.includes(c) ? `--${c}` : /^var\((--[\w-]+)\)$/.exec(c)?.[1]
  return variable ? getComputedStyle(document.documentElement).getPropertyValue(variable).trim() : c
}

/**
 * Gráfico de líneas en el tiempo sobre canvas 2D, en un panel de vidrio con leyenda viva.
 * `agregar(x, { serie: valor })` suma un punto; `cargar(puntos)` reemplaza todos y dibuja una sola vez;
 * `limpiar()` lo reinicia. `cargar` y `limpiar` pueden cambiar la escala
 * (lo que no se pase queda como en las opciones iniciales). `cambiar()` reemplaza series, textos y escala
 * sin crear otro gráfico.
 */
export function grafico(series: Serie[], opciones: OpcionesGrafico = {}) {
  const alto = opciones.alto ?? 120
  let { titulo, unidadX = '', unidadY = '' } = opciones
  let inicial: EscalaGrafico = { xMax: opciones.xMax, yMax: opciones.yMax, yMin: opciones.yMin, yTecho: opciones.yTecho }
  let escala = inicial
  let puntos: Punto[] = []
  let valores: HTMLElement[] = []

  const canvas = h('canvas', { class: 'grafico-lienzo', role: 'img' })
  canvas.style.height = `${alto}px`
  const etiqueta = h('span', { class: 'etiqueta' })
  const leyenda = h('div', { class: 'leyenda' })
  const el = h('div', { class: 'panel grafico' }, etiqueta, leyenda, canvas)
  const ctx = canvas.getContext('2d')!

  function armar() {
    etiqueta.textContent = titulo ?? ''
    etiqueta.hidden = !titulo
    canvas.setAttribute('aria-label', titulo ?? 'Gráfico')
    valores = series.map(() => h('b', {}, '0'))
    leyenda.replaceChildren(
      ...series.map((s, i) => {
        const kit = COLORES_KIT.includes(s.color)
        const item = h('span', kit ? { class: `c-${s.color}` } : {}, `${s.nombre} `, valores[i], unidadY && h('small', {}, unidadY))
        if (!kit) item.style.color = s.color
        return item
      }),
    )
  }
  armar()

  function dibujar() {
    const dpr = window.devicePixelRatio || 1
    const ancho = canvas.clientWidth
    if (!ancho) return
    canvas.width = Math.round(ancho * dpr)
    canvas.height = Math.round(alto * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, ancho, alto)

    const ultimo = puntos[puntos.length - 1]
    const xMax = escala.xMax ?? Math.max(ultimo?.x ?? 0, 1e-9)
    const datos = puntos.flatMap((p) => Object.values(p.v))
    const yMax = Math.min(tope(Math.max(escala.yMax ?? 0, 0, ...datos)), escala.yTecho ?? Infinity)
    const bajo = Math.min(escala.yMin ?? 0, 0, ...datos)
    const yMin = bajo < 0 ? -tope(-bajo) : 0
    const w = ancho - MARGEN.izq - MARGEN.der
    const hh = alto - MARGEN.arriba - MARGEN.abajo
    const px = (x: number) => MARGEN.izq + (x / xMax) * w
    const py = (y: number) => MARGEN.arriba + hh - ((y - yMin) / (yMax - yMin)) * hh

    ctx.font = `600 10px ${MONO}`
    ctx.fillStyle = resolver('var(--apagado)')
    ctx.lineWidth = 1
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    // Rótulos del eje Y por prioridad: el cero y los extremos primero; los que quedan muy cerca se saltean.
    const dibujados: number[] = []
    for (const valor of [0, yMax, yMin, yMax / 2]) {
      const y = Math.round(py(valor)) + 0.5
      if (dibujados.some((d) => Math.abs(d - y) < SEPARACION_Y)) continue
      dibujados.push(y)
      ctx.strokeStyle = valor === 0 && yMin < 0 ? 'rgba(190, 255, 220, 0.28)' : 'rgba(190, 255, 220, 0.1)'
      ctx.beginPath()
      ctx.moveTo(MARGEN.izq, y)
      ctx.lineTo(ancho - MARGEN.der, y)
      ctx.stroke()
      ctx.fillText(corto(valor), MARGEN.izq - 6, y)
    }
    ctx.textBaseline = 'top'
    for (const f of [0, 0.5, 1]) {
      ctx.textAlign = f === 0 ? 'left' : f === 1 ? 'right' : 'center'
      ctx.fillText(`${corto(xMax * f)}${f === 1 ? unidadX : ''}`, px(xMax * f), alto - MARGEN.abajo + 5)
    }

    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    for (const s of series) {
      if (puntos.length < 2) break
      ctx.strokeStyle = resolver(s.color)
      ctx.beginPath()
      puntos.forEach((p, i) => (i ? ctx.lineTo(px(p.x), py(p.v[s.id] ?? 0)) : ctx.moveTo(px(p.x), py(p.v[s.id] ?? 0))))
      ctx.stroke()
    }
  }

  /** Leyenda con los valores de un punto. */
  const leer = (v: Record<string, number>) => series.forEach((s, i) => (valores[i].textContent = corto(v[s.id] ?? 0)))

  function cargar(nuevos: Punto[], nuevaEscala?: EscalaGrafico) {
    if (nuevaEscala) escala = { ...inicial, ...nuevaEscala }
    puntos = nuevos
    leer(puntos[puntos.length - 1]?.v ?? {})
    dibujar()
  }

  new ResizeObserver(dibujar).observe(canvas)
  document.fonts?.load(`600 10px ${MONO}`).then(dibujar, () => {})

  return {
    el,
    agregar(x: number, v: Record<string, number>) {
      puntos.push({ x, v })
      leer(v)
      dibujar()
    },
    /** Reemplaza todos los puntos (una curva calculada de una) y dibuja una sola vez; la leyenda muestra el último. Se queda con el array. */
    cargar,
    /** Otras series y textos (cambió la mezcla, la ciudad o el tipo de gráfico): arranca vacío con la escala nueva. */
    cambiar(nuevas: Serie[], nuevasOpciones: Omit<OpcionesGrafico, 'alto'> = {}) {
      series = nuevas
      ;({ titulo, unidadX = '', unidadY = '' } = nuevasOpciones)
      inicial = { xMax: nuevasOpciones.xMax, yMax: nuevasOpciones.yMax, yMin: nuevasOpciones.yMin, yTecho: nuevasOpciones.yTecho }
      escala = inicial
      puntos = []
      armar()
      dibujar()
    },
    limpiar: (nuevaEscala?: EscalaGrafico) => cargar([], nuevaEscala),
  }
}
