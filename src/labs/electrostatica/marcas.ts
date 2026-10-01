// Signos de carga: pastillas "+" (ámbar) y "−" (celeste) que se dibujan encima de la escena.
import * as THREE from 'three'

function textura(glifo: string, color: string): THREE.CanvasTexture {
  const lienzo = document.createElement('canvas')
  lienzo.width = lienzo.height = 64
  const ctx = lienzo.getContext('2d')!
  ctx.fillStyle = 'rgba(7, 16, 15, 0.72)'
  ctx.strokeStyle = color
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(32, 32, 28, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = color
  ctx.font = '700 46px "Space Grotesk", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(glifo, 32, 35)
  const t = new THREE.CanvasTexture(lienzo)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** `n` puntos repartidos parejos sobre una esfera de radio 1 (espiral de Fibonacci). */
export function sobreEsfera(n: number): THREE.Vector3[] {
  return Array.from({ length: n }, (_, i) => {
    const y = n === 1 ? 0 : 1 - (2 * (i + 0.5)) / n
    const r = Math.sqrt(1 - y * y)
    const ang = i * 2.399963
    return new THREE.Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r)
  })
}

export function crearMarcas(scene: THREE.Scene, max = 48) {
  const materiales = {
    mas: new THREE.SpriteMaterial({ map: textura('+', '#ffc857'), depthTest: false, transparent: true, toneMapped: false }),
    menos: new THREE.SpriteMaterial({ map: textura('−', '#5ec8ff'), depthTest: false, transparent: true, toneMapped: false }),
  }
  const sprites = Array.from({ length: max }, () => {
    const s = new THREE.Sprite(materiales.mas)
    s.scale.setScalar(0.85)
    s.renderOrder = 10
    s.visible = false
    scene.add(s)
    return s
  })
  let usados = 0
  return {
    /** Arranca un cuadro: se vuelven a poner todos los signos. */
    empezar() {
      usados = 0
    },
    poner(posicion: THREE.Vector3, signo: number, escala = 1) {
      if (usados >= max) return
      const s = sprites[usados++]
      s.material = signo > 0 ? materiales.mas : materiales.menos
      s.position.copy(posicion)
      s.scale.setScalar(0.85 * escala)
      s.visible = true
    },
    terminar() {
      for (let i = usados; i < max; i++) sprites[i].visible = false
    },
  }
}
