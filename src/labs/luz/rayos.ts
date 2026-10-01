// Piezas dibujadas en el plano del rayo: haces de luz, arcos de ángulo, línea de la normal y el puntero láser.
import * as THREE from 'three'
import type { Punto, Tramo } from './model'

/** Hasta cuántos tramos se dibujan a la vez (incidente, reflejado, refractado). */
const MAX_TRAMOS = 3
const COLOR_LASER = new THREE.Color().setRGB(3.4, 0.35, 0.3)
const COLOR_MIRADA = new THREE.Color(0xffc857)
/** Radio (unidades) del núcleo del haz y de su halo. */
const GROSOR = { laser: 0.028, mirada: 0.014 }
const HALO = 2.6

const cilindro = new THREE.CylinderGeometry(1, 1, 1, 12, 1)

/** Coloca un cilindro unitario (radio 1, alto 1) entre dos puntos del plano, con ese grosor. */
export function segmento(m: THREE.Object3D, de: Punto, a: Punto, grosor: number) {
  const dx = a[0] - de[0]
  const dy = a[1] - de[1]
  const largo = Math.hypot(dx, dy)
  m.position.set((de[0] + a[0]) / 2, (de[1] + a[1]) / 2, 0)
  m.rotation.set(0, 0, Math.atan2(-dx, dy))
  m.scale.set(grosor, Math.max(largo, 1e-4), grosor)
  m.visible = largo > 1e-3
}

function material(color: THREE.Color, opacidad: number) {
  return new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true, opacity: opacidad, depthTest: false })
}

/** El brillo dibujado no es proporcional a la intensidad (un 2 % no se vería): sube más rápido para que se note. */
const visible = (intensidad: number) => (intensidad < 0.004 ? 0 : 0.18 + 0.82 * Math.sqrt(intensidad))

/** Haces de luz: un núcleo brillante y un halo por tramo. */
export function crearHaces(scene: THREE.Scene) {
  const haces = Array.from({ length: MAX_TRAMOS }, () => {
    const nucleo = new THREE.Mesh(cilindro, material(COLOR_LASER, 1))
    const halo = new THREE.Mesh(cilindro, material(COLOR_LASER, 0.25))
    nucleo.renderOrder = halo.renderOrder = 10
    scene.add(nucleo, halo)
    return { nucleo, halo }
  })
  return {
    poner(tramos: Tramo[]) {
      haces.forEach(({ nucleo, halo }, i) => {
        const t = tramos[i]
        const v = t ? visible(t.intensidad) : 0
        nucleo.visible = halo.visible = v > 0
        if (!t || v === 0) return
        const mirada = t.tipo === 'mirada'
        const color = mirada ? COLOR_MIRADA : COLOR_LASER
        const [mn, mh] = [nucleo.material as THREE.MeshBasicMaterial, halo.material as THREE.MeshBasicMaterial]
        mn.color.copy(color)
        mh.color.copy(color)
        mn.opacity = mirada ? 0.75 : v
        mh.opacity = mirada ? 0 : 0.28 * v
        segmento(nucleo, t.de, t.a, GROSOR[t.tipo])
        segmento(halo, t.de, t.a, GROSOR[t.tipo] * HALO)
        halo.visible = !mirada
      })
    },
  }
}

/** Puntero láser: un cuerpo con la punta en `punta`, apuntando en la dirección `hacia` (unitaria). */
export function crearPuntero(scene: THREE.Scene) {
  const grupo = new THREE.Group()
  const cuerpo = new THREE.Mesh(cilindro, new THREE.MeshStandardMaterial({ color: 0x25332f, metalness: 0.7, roughness: 0.35 }))
  const aro = new THREE.Mesh(cilindro, new THREE.MeshStandardMaterial({ color: 0xc6f35e, metalness: 0.3, roughness: 0.4 }))
  const luz = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), material(COLOR_LASER, 1))
  luz.renderOrder = 11
  grupo.add(cuerpo, aro, luz)
  scene.add(grupo)
  return {
    grupo,
    poner(punta: Punto, hacia: Punto) {
      const atras = (t: number): Punto => [punta[0] - hacia[0] * t, punta[1] - hacia[1] * t]
      segmento(cuerpo, atras(0.9), atras(0.04), 0.13)
      segmento(aro, atras(0.2), atras(0.04), 0.15)
      luz.position.set(punta[0], punta[1], 0)
    },
  }
}

/** Punto brillante donde el rayo toca la superficie. */
export function crearPunto(scene: THREE.Scene) {
  const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), material(COLOR_LASER, 0.95))
  p.renderOrder = 11
  scene.add(p)
  return p
}

/** Línea punteada de la normal: la perpendicular a la superficie, de la que se miden todos los ángulos. */
export function crearNormal(scene: THREE.Scene, largo: number) {
  const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -largo, 0), new THREE.Vector3(0, largo, 0)])
  const linea = new THREE.Line(g, new THREE.LineDashedMaterial({ color: 0xecf5f0, dashSize: 0.1, gapSize: 0.09, transparent: true, opacity: 0.55, depthTest: false }))
  linea.computeLineDistances()
  linea.renderOrder = 9
  scene.add(linea)
  return linea
}

const PASOS_ARCO = 32

/** Arco que marca un ángulo entre dos direcciones unitarias que salen de un centro. */
export function crearArco(scene: THREE.Scene, color: number) {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((PASOS_ARCO + 1) * 3), 3))
  const linea = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95, depthTest: false }))
  linea.renderOrder = 9
  linea.frustumCulled = false
  scene.add(linea)
  return {
    /** Dibuja el arco y devuelve el punto del medio (para anclar el rótulo), o `null` si el ángulo es casi cero. */
    poner(centro: Punto, u: Punto, v: Punto, radio: number): Punto | null {
      const a0 = Math.atan2(u[1], u[0])
      const delta = ((Math.atan2(v[1], v[0]) - a0 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI
      linea.visible = Math.abs(delta) > 0.01
      if (!linea.visible) return null
      const pos = geo.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i <= PASOS_ARCO; i++) {
        const a = a0 + (delta * i) / PASOS_ARCO
        pos.setXYZ(i, centro[0] + Math.cos(a) * radio, centro[1] + Math.sin(a) * radio, 0)
      }
      pos.needsUpdate = true
      return [centro[0] + Math.cos(a0 + delta / 2) * (radio + 0.32), centro[1] + Math.sin(a0 + delta / 2) * (radio + 0.32)]
    },
    ocultar: () => (linea.visible = false),
  }
}
