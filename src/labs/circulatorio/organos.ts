import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { AMBAR_HEX, MAGENTA_HEX, colorSangre } from './constantes'
import { ACTIVIDADES, SAO2, type Derivados, type Estado } from './model'
import { tramo, type Zona } from './trayecto'

const vidrio = (color: number, opacidad: number) =>
  new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity: opacidad, roughness: 0.12, clearcoat: 1, envMapIntensity: 0.4, depthWrite: false, side: THREE.DoubleSide })

/** Vasos (tubos de vidrio que siguen el camino de la sangre) y lechos de capilares, con su color según la saturación. */
function crearVasos(scene: THREE.Scene) {
  const vaso = (zona: Zona, radio: number, opacidad: number) => {
    const material = vidrio(0xffffff, opacidad)
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(tramo(zona).curva, 90, radio, 10, false), material))
    return material
  }
  const vena = vaso('vena', 0.13, 0.32)
  const arteriaPulmonar = vaso('arteriaPulmonar', 0.13, 0.32)
  const venaPulmonar = vaso('venaPulmonar', 0.13, 0.32)
  const aorta = vaso('aorta', 0.13, 0.32)
  vaso('pulmon', 0.05, 0.16).color.set(0xcfe8ff)
  vaso('cuerpo', 0.05, 0.16).color.set(0xcfe8ff)
  const color = new THREE.Color()
  return {
    colorear(svo2: number, satPulmonar: number) {
      vena.color.copy(colorSangre(svo2, color))
      arteriaPulmonar.color.copy(colorSangre(satPulmonar, color))
      venaPulmonar.color.copy(colorSangre(SAO2, color))
      aorta.color.copy(color)
    },
  }
}

/** Pulmones y cuerpo (bloques de vidrio detrás de los lechos de capilares) más la base de la maqueta. */
export function crearOrganos(scene: THREE.Scene) {
  const vasos = crearVasos(scene)

  const pulmones = [-1, 1].map((lado) => {
    const pulmon = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), vidrio(0xffc2d0, 0.1))
    pulmon.scale.set(1.2, 0.85, 0.5)
    pulmon.position.set(lado * 1.15, 4.3, 0)
    return pulmon
  })

  const cuerpoMaterial = new THREE.MeshStandardMaterial({ color: 0x2b1d12, emissive: AMBAR_HEX, emissiveIntensity: 0.1, roughness: 0.5, transparent: true, opacity: 0.45, depthWrite: false })
  const cuerpo = new THREE.Mesh(new RoundedBoxGeometry(6.4, 1.25, 1.0, 4, 0.2), cuerpoMaterial)
  cuerpo.position.set(0, -2.9, 0)

  const base = new THREE.Mesh(new RoundedBoxGeometry(8, 0.3, 3, 4, 0.1), new THREE.MeshStandardMaterial({ color: 0x0f1917, roughness: 0.6, metalness: 0.2 }))
  base.position.set(0, -3.85, 0)
  const borde = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: 0xc6f35e }))
  borde.position.set(0, -3.69, 1.5)
  const piso = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x0a1413, roughness: 0.9 }))
  piso.rotation.x = -Math.PI / 2
  piso.position.y = -4.05
  scene.add(...pulmones, cuerpo, base, borde, piso)

  const ambar = new THREE.Color(AMBAR_HEX)
  const alerta = new THREE.Color(MAGENTA_HEX)
  return {
    /** `t`: segundos reales (para el parpadeo cuando la sangre no alcanza). */
    actualizar(d: Derivados, e: Estado, t: number) {
      vasos.colorear(e.svo2, d.satPulmonar)
      // El cuerpo brilla ámbar con lo que pide; si no alcanza, parpadea en magenta.
      const pide = d.vo2 / ACTIVIDADES.correr.vo2
      cuerpoMaterial.emissive.copy(d.alcanza ? ambar : alerta)
      cuerpoMaterial.emissiveIntensity = d.alcanza ? 0.1 + 0.9 * pide : 0.35 + 0.35 * Math.sin(t * 6)
    },
  }
}
