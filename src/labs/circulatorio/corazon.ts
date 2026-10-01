import * as THREE from 'three'
import { MAGENTA_HEX, colorSangre } from './constantes'
import { SAO2, VFS, volumenVentriculo, type Config, type Derivados, type Estado } from './model'
import { AGUJERO_Y, ATRIO_Y, CAMARA_X, VALVULA_Y, VENTRICULO_Y } from './trayecto'

/** Volumen (mL) al que se dibuja la cámara con su tamaño base: el VFD de reposo. */
const VOLUMEN_BASE = VFS + 70
const SEPTO = { ancho: 0.34, profundo: 1.0, abajo: -0.4, arriba: 2.85 }

const vidrio = (opacidad: number, lado: THREE.Side = THREE.DoubleSide) =>
  new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: opacidad, roughness: 0.15, clearcoat: 1, envMapIntensity: 0.4, depthWrite: false, side: lado })

/** Cámara del corazón: una cavidad de vidrio teñida con el color de la sangre y la pared de músculo alrededor. */
function camara(x: number, y: number, radios: [number, number, number]) {
  const grupo = new THREE.Group()
  grupo.position.set(x, y, 0)
  const geo = new THREE.SphereGeometry(1, 36, 24)
  const sangre = new THREE.Mesh(geo, vidrio(0.2))
  const pared = new THREE.Mesh(geo, vidrio(0.25, THREE.BackSide))
  sangre.scale.set(...radios)
  pared.scale.set(radios[0] * 1.09, radios[1] * 1.09, radios[2] * 1.09)
  grupo.add(sangre, pared)
  return {
    grupo,
    color: (c: THREE.Color) => {
      ;(sangre.material as THREE.MeshPhysicalMaterial).color.copy(c)
      ;(pared.material as THREE.MeshPhysicalMaterial).color.copy(c).multiplyScalar(0.65)
    },
  }
}

/** Dos hojas que se abren siguiendo el flujo (hacia −Y del grupo): cerradas bloquean el paso. */
function valvula(posicion: THREE.Vector3, flujo: THREE.Vector3, ancho: number) {
  const grupo = new THREE.Group()
  grupo.position.copy(posicion)
  grupo.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), flujo.clone().normalize())
  const material = new THREE.MeshStandardMaterial({ color: 0xcdb8a6, roughness: 0.6 })
  const pivotes = [-1, 1].map((lado) => {
    const pivote = new THREE.Group()
    pivote.position.x = (lado * ancho) / 2
    const hoja = new THREE.Mesh(new THREE.BoxGeometry(ancho / 2, 0.035, ancho * 0.8), material)
    hoja.position.x = (-lado * ancho) / 4
    pivote.add(hoja)
    grupo.add(pivote)
    return { pivote, lado }
  })
  let abierta = 0
  return {
    grupo,
    material,
    /** Acerca la apertura (0 cerrada, 1 abierta) a `objetivo`. */
    actualizar(objetivo: number, dt: number) {
      abierta += (objetivo - abierta) * Math.min(dt * 18, 1)
      for (const { pivote, lado } of pivotes) pivote.rotation.z = lado * abierta * 1.25
    },
  }
}

/** El corazón de cuatro cavidades: cámaras que se llenan y vacían, cuatro válvulas y el tabique (con su agujero, si lo hay). */
export function crearCorazon(scene: THREE.Scene) {
  const ad = camara(-CAMARA_X, ATRIO_Y, [0.72, 0.55, 0.5])
  const ai = camara(CAMARA_X, ATRIO_Y, [0.72, 0.55, 0.5])
  const vd = camara(-CAMARA_X, VENTRICULO_Y, [0.74, 0.98, 0.58])
  const vi = camara(CAMARA_X, VENTRICULO_Y, [0.78, 1.0, 0.64])
  scene.add(ad.grupo, ai.grupo, vd.grupo, vi.grupo)

  const tricuspide = valvula(new THREE.Vector3(-CAMARA_X, VALVULA_Y, 0), new THREE.Vector3(0, -1, 0), 0.66)
  const mitral = valvula(new THREE.Vector3(CAMARA_X, VALVULA_Y, 0), new THREE.Vector3(0, -1, 0), 0.66)
  const pulmonar = valvula(new THREE.Vector3(-0.4, 1.35, 0.4), new THREE.Vector3(0.25, 0.85, 0.35), 0.3)
  const aortica = valvula(new THREE.Vector3(1.55, 0.65, 0), new THREE.Vector3(1, 0, 0), 0.3)
  scene.add(tricuspide.grupo, mitral.grupo, pulmonar.grupo, aortica.grupo)

  // Tabique: una pared entre los dos lados; el agujero es el hueco entre las dos piezas.
  const tabique = new THREE.MeshStandardMaterial({ color: 0x7d2c3f, roughness: 0.7, transparent: true, opacity: 0.85 })
  const pieza = () => new THREE.Mesh(new THREE.BoxGeometry(SEPTO.ancho, 1, SEPTO.profundo), tabique)
  const abajo = pieza()
  const arriba = pieza()
  const borde = new THREE.MeshBasicMaterial({ color: MAGENTA_HEX, toneMapped: false })
  const bordes = [0, 1].map(() => new THREE.Mesh(new THREE.BoxGeometry(SEPTO.ancho + 0.04, 0.035, SEPTO.profundo + 0.04), borde))
  scene.add(abajo, arriba, ...bordes)

  const color = new THREE.Color()
  let hueco = -1
  function ajustarTabique(alto: number) {
    if (alto === hueco) return
    hueco = alto
    const corte = AGUJERO_Y - alto / 2
    const tope = AGUJERO_Y + alto / 2
    abajo.scale.y = Math.max(corte - SEPTO.abajo, 0.001)
    abajo.position.set(0, SEPTO.abajo + abajo.scale.y / 2, 0)
    arriba.scale.y = Math.max(SEPTO.arriba - tope, 0.001)
    arriba.position.set(0, tope + arriba.scale.y / 2, 0)
    bordes[0].position.set(0, corte, 0)
    bordes[1].position.set(0, tope, 0)
    bordes.forEach((b) => (b.visible = alto > 0))
  }
  ajustarTabique(0)

  return {
    /** `fase`: del latido (0 a 1); `dt`: segundos reales (0 en pausa). */
    actualizar(c: Config, d: Derivados, e: Estado, fase: number, dt: number) {
      const fs = (d.sistole * c.frecuencia) / 60
      const sistole = fase < fs
      // Un ventrículo muy agrandado (por un defecto grave) no se dibuja más grande que esto.
      const cubo = (volumen: number) => Math.min(Math.cbrt(volumen / VOLUMEN_BASE), 1.5)
      vi.grupo.scale.setScalar(cubo(volumenVentriculo(fase, c.frecuencia, d.expulsa)))
      vd.grupo.scale.setScalar(cubo(volumenVentriculo(fase, c.frecuencia, (d.pulmones * 1000) / c.frecuencia)))
      // La aurícula se contrae justo antes de la sístole.
      const x = (fase - fs) / (1 - fs)
      const patada = 1 - 0.12 * (x > 0.8 ? Math.sin((Math.PI * (x - 0.8)) / 0.2) : 0)
      ad.grupo.scale.setScalar(patada)
      ai.grupo.scale.setScalar(patada)

      const fuga = c.defecto === 'valvula' ? Math.min(0.85, c.gravedad * 1.4) : 0
      tricuspide.actualizar(sistole ? 0 : 1, dt)
      mitral.actualizar(sistole ? fuga : 1, dt)
      pulmonar.actualizar(sistole ? 1 : 0, dt)
      aortica.actualizar(sistole ? 1 : 0, dt)
      mitral.material.color.set(c.defecto === 'valvula' ? MAGENTA_HEX : 0xcdb8a6)

      ajustarTabique(c.defecto === 'tabique' ? 0.14 + 0.5 * c.gravedad : 0)

      colorSangre(e.svo2, color)
      ad.color(color)
      vd.color(colorSangre(d.satPulmonar, color))
      ai.color(colorSangre(SAO2, color))
      vi.color(color)
    },
  }
}
