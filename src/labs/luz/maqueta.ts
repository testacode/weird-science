// Objetos de la maqueta: mesada, pecera con el medio, espejo con su pie, lápiz y ojo.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { segmento } from './rayos'
import {
  N_AIRE, O_ESPEJO, O_PECERA, PECERA_X, PISO_Y, SUPERFICIE_Y, indice,
  type Config, type Punto, type ResLapiz,
} from './model'

const PECERA_Z = 1.2
export const COLOR_MEDIO = { aire: 0xffffff, agua: 0x4fb8ff, aceite: 0xf2c04a, vidrio: 0x8fe3c8, diamante: 0xdff3ff, inventado: 0xc08cff } as const
/** Mitad del ancho del espejo. */
export const ESPEJO_X = 2.2

/** Mesada, piso y luces. */
export function crearMesa(scene: THREE.Scene) {
  const mesada = new THREE.Mesh(new RoundedBoxGeometry(10, 0.5, 4.4, 4, 0.12), new THREE.MeshStandardMaterial({ color: 0x0f1917, roughness: 0.6, metalness: 0.2 }))
  mesada.position.set(0, -0.25, 0)
  const borde = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: 0xc6f35e }))
  borde.position.set(0, -0.005, 2.18)
  const piso = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x0a1413, roughness: 0.9 }))
  piso.rotation.x = -Math.PI / 2
  piso.position.y = -0.52
  const sol = new THREE.DirectionalLight(0xffffff, 0.5)
  sol.position.set(-3, 8, 6)
  const cielo = new THREE.PointLight(0x5ec8ff, 12, 22)
  cielo.position.set(-4, 3, 4)
  scene.add(mesada, borde, piso, sol, cielo)
}

/** Pecera (o bloque) con el medio. Cuanto más parecido al aire, más invisible. */
export function crearPecera(scene: THREE.Scene) {
  const grupo = new THREE.Group()
  const alto = SUPERFICIE_Y - PISO_Y
  const caja = new THREE.BoxGeometry(PECERA_X * 2, alto, PECERA_Z * 2)
  const medioMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.2, depthWrite: false })
  const medio = new THREE.Mesh(caja, medioMat)
  medio.position.y = PISO_Y + alto / 2
  medio.renderOrder = 1
  const superficieMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.2, depthWrite: false })
  const superficie = new THREE.Mesh(new THREE.PlaneGeometry(PECERA_X * 2, PECERA_Z * 2), superficieMat)
  superficie.rotation.x = -Math.PI / 2
  superficie.position.y = SUPERFICIE_Y + 0.004
  superficie.renderOrder = 1
  const contornoMat = new THREE.LineBasicMaterial({ color: 0x9fd8c0, transparent: true, opacity: 0.5 })
  const contorno = new THREE.LineSegments(new THREE.EdgesGeometry(caja), contornoMat)
  contorno.position.copy(medio.position)
  grupo.add(medio, superficie, contorno)
  scene.add(grupo)
  const color = new THREE.Color()
  return {
    grupo,
    actualizar(c: Config) {
      const n = indice(c)
      // Parecido al aire = invisible: la opacidad crece con la diferencia de índice (decisión de dibujo, no física).
      const presencia = THREE.MathUtils.clamp((n - N_AIRE) / 0.3, 0, 1)
      color.set(COLOR_MEDIO[c.medio])
      medioMat.color.copy(color)
      superficieMat.color.copy(color).lerp(new THREE.Color(0xffffff), 0.45)
      medioMat.opacity = 0.2 * presencia
      superficieMat.opacity = 0.2 * presencia
      contornoMat.opacity = 0.5 * presencia
    },
  }
}

/** Espejo plano sobre un pie, con una marca punteada de dónde estaba antes de girarlo. */
export function crearEspejo(scene: THREE.Scene) {
  const grupo = new THREE.Group()
  const metal = new THREE.MeshStandardMaterial({ color: 0x1b2926, metalness: 0.6, roughness: 0.4 })
  const pie = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, O_ESPEJO[1] - 0.05, 12), metal)
  pie.position.set(0, (O_ESPEJO[1] - 0.05) / 2, 0)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.1, 32), metal)
  base.position.y = 0.05
  const bisagra = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), metal)
  bisagra.position.set(O_ESPEJO[0], O_ESPEJO[1] - 0.06, 0)
  const vidrio = new THREE.Mesh(
    new THREE.BoxGeometry(ESPEJO_X * 2, 0.05, 2.2),
    new THREE.MeshStandardMaterial({ color: 0xe6eef2, metalness: 1, roughness: 0.06, envMapIntensity: 1.4 }),
  )
  const marco = new THREE.Mesh(new THREE.BoxGeometry(ESPEJO_X * 2 + 0.1, 0.035, 2.3), metal)
  marco.position.y = -0.04
  const espejo = new THREE.Group()
  espejo.position.set(O_ESPEJO[0], O_ESPEJO[1], 0)
  espejo.add(vidrio, marco)
  const antes = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-ESPEJO_X, 0, 0), new THREE.Vector3(ESPEJO_X, 0, 0)]),
    new THREE.LineDashedMaterial({ color: 0xecf5f0, dashSize: 0.1, gapSize: 0.1, transparent: true, opacity: 0.4 }),
  )
  antes.computeLineDistances()
  antes.position.set(O_ESPEJO[0], O_ESPEJO[1], 0.9)
  grupo.add(pie, base, bisagra, espejo, antes)
  scene.add(grupo)
  return {
    grupo,
    girar(grados: number) {
      espejo.rotation.z = THREE.MathUtils.degToRad(grados)
      antes.visible = grados > 0.05
    },
  }
}

const PUNTAS = { madera: 0xb98b55, grafito: 0x2b2b2b, cuerpo: 0xd9a02e, goma: 0xd9487f }

/** Lápiz: la parte de afuera, la sumergida como se ve (con el factor aparente) y la sumergida de verdad (fantasma). */
export function crearLapiz(scene: THREE.Scene) {
  const grupo = new THREE.Group()
  const cil = new THREE.CylinderGeometry(1, 1, 1, 12, 1)
  const cono = new THREE.ConeGeometry(1, 1, 12)
  const solido = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, envMapIntensity: 0.15 })
  const fuera = new THREE.Mesh(cil, solido(PUNTAS.cuerpo))
  const goma = new THREE.Mesh(cil, solido(PUNTAS.goma))
  const visto = new THREE.Mesh(cil, solido(PUNTAS.cuerpo))
  const puntaMadera = new THREE.Mesh(cono, solido(PUNTAS.madera))
  const puntaGrafito = new THREE.Mesh(cono, solido(PUNTAS.grafito))
  const fantasmaMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false, depthTest: false })
  const fantasma = new THREE.Mesh(cil, fantasmaMat)
  fantasma.renderOrder = 8
  const ancho = 0.075
  grupo.add(fuera, goma, visto, puntaMadera, puntaGrafito, fantasma)
  scene.add(grupo)

  return {
    grupo,
    actualizar(r: ResLapiz) {
      const lado = (a: Punto, b: Punto, t: number): Punto => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
      segmento(fuera, O_PECERA, lado(O_PECERA, r.extremo, 0.93), ancho)
      segmento(goma, lado(O_PECERA, r.extremo, 0.93), r.extremo, ancho)
      // Lo que se ve de lo sumergido: del límite hasta la punta aparente (cuerpo + punta de madera con grafito).
      const corte = lado(O_PECERA, r.puntaAparente, 0.86)
      segmento(visto, O_PECERA, corte, ancho)
      segmento(puntaMadera, corte, r.puntaAparente, ancho)
      segmento(puntaGrafito, lado(corte, r.puntaAparente, 0.7), r.puntaAparente, ancho * 0.32)
      // Dónde está de verdad (solo se muestra si no coincide con lo que se ve).
      segmento(fantasma, O_PECERA, r.puntaReal, ancho * 1.25)
      fantasma.visible = r.profundidad - r.aparente > 0.03 * r.profundidad
    },
  }
}

/** El ojo: una esfera con la pupila mirando hacia `mira`. */
export function crearOjo(scene: THREE.Scene) {
  const grupo = new THREE.Group()
  const globo = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 16), new THREE.MeshStandardMaterial({ color: 0x7d8985, roughness: 0.5, envMapIntensity: 0.1 }))
  const iris = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshStandardMaterial({ color: 0x2a78ad, roughness: 0.5, envMapIntensity: 0.2 }))
  iris.position.z = 0.17
  const pupila = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0x050505 }))
  pupila.position.z = 0.25
  grupo.add(globo, iris, pupila)
  scene.add(grupo)
  return {
    grupo,
    poner(pos: Punto, mira: Punto) {
      grupo.position.set(pos[0], pos[1], 0)
      grupo.lookAt(mira[0], mira[1], 0)
    },
  }
}
