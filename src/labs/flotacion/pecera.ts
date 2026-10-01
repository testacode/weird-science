import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { COLOR_AGUA_SALADA, COLOR_LIQUIDO } from './constantes'
import { ALTO_PECERA, NIVEL, SAL_MAX, type Config } from './model'

/** Unidades del mundo por metro: 1 unidad = 10 cm. */
export const ESCALA = 10
/** Altura del fondo interior de la pecera sobre la mesada. */
export const FONDO_Y = 0.08
/** Medio ancho y medio fondo del interior. */
export const MEDIO_X = 1.7
export const MEDIO_Z = 1.1
const VIDRIO = 0.05

/** Altura en el mundo de una altura sobre el fondo de la pecera (m). */
export const mundoY = (metros: number) => FONDO_Y + metros * ESCALA
export const SUPERFICIE_Y = mundoY(NIVEL)
export const BORDE_Y = mundoY(ALTO_PECERA)

function colorLiquido(c: Pick<Config, 'liquido' | 'sal'>): THREE.Color {
  if (c.liquido !== 'agua') return new THREE.Color(COLOR_LIQUIDO[c.liquido])
  return new THREE.Color(COLOR_LIQUIDO.agua).lerp(new THREE.Color(COLOR_AGUA_SALADA), Math.min(c.sal / SAL_MAX, 1))
}

/** Mesada, pecera de vidrio con el líquido y luces de acento. */
export function crearPecera(scene: THREE.Scene) {
  const mesada = new THREE.Mesh(new RoundedBoxGeometry(11, 0.5, 4, 4, 0.12), new THREE.MeshStandardMaterial({ color: 0x0f1917, roughness: 0.6, metalness: 0.2 }))
  mesada.position.set(0, -0.25, 0.3)
  const borde = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: 0xc6f35e }))
  borde.position.set(0, -0.005, 2.28)
  const piso = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x0a1413, roughness: 0.9 }))
  piso.rotation.x = -Math.PI / 2
  piso.position.y = -0.52
  scene.add(mesada, borde, piso)

  // Vidrio y líquido: transparentes con depthWrite apagado (la transmisión borraría el líquido y desenfocaría lo de adentro).
  const vidrio = new THREE.MeshPhysicalMaterial({
    color: 0xdfffee, transparent: true, opacity: 0.07, roughness: 0.1, envMapIntensity: 0.1, depthWrite: false,
  })
  const ancho = MEDIO_X * 2 + VIDRIO * 2
  const fondo = MEDIO_Z * 2 + VIDRIO * 2
  const alto = BORDE_Y - FONDO_Y + VIDRIO
  const paredes: [number, number, number, number, number, number][] = [
    [ancho, VIDRIO, fondo, 0, FONDO_Y - VIDRIO / 2, 0],
    [ancho, alto, VIDRIO, 0, FONDO_Y + alto / 2 - VIDRIO, MEDIO_Z + VIDRIO / 2],
    [ancho, alto, VIDRIO, 0, FONDO_Y + alto / 2 - VIDRIO, -MEDIO_Z - VIDRIO / 2],
    [VIDRIO, alto, fondo, MEDIO_X + VIDRIO / 2, FONDO_Y + alto / 2 - VIDRIO, 0],
    [VIDRIO, alto, fondo, -MEDIO_X - VIDRIO / 2, FONDO_Y + alto / 2 - VIDRIO, 0],
  ]
  for (const [w, h, d, x, y, z] of paredes) {
    const pared = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), vidrio)
    pared.position.set(x, y, z)
    pared.renderOrder = 3
    scene.add(pared)
  }
  // Borde del vidrio: marca el contorno de la pecera.
  const contorno = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(MEDIO_X * 2, BORDE_Y - FONDO_Y, MEDIO_Z * 2)),
    new THREE.LineBasicMaterial({ color: 0x9fd8c0, transparent: true, opacity: 0.45 }),
  )
  contorno.position.y = (BORDE_Y + FONDO_Y) / 2
  scene.add(contorno)

  const altoLiquido = SUPERFICIE_Y - FONDO_Y
  const liquidoMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.22, depthWrite: false })
  const liquido = new THREE.Mesh(new THREE.BoxGeometry(MEDIO_X * 2 - 0.02, altoLiquido, MEDIO_Z * 2 - 0.02), liquidoMat)
  liquido.position.y = FONDO_Y + altoLiquido / 2
  liquido.renderOrder = 1
  const superficieMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.2, depthWrite: false })
  const superficie = new THREE.Mesh(new THREE.PlaneGeometry(MEDIO_X * 2 - 0.02, MEDIO_Z * 2 - 0.02), superficieMat)
  superficie.rotation.x = -Math.PI / 2
  superficie.position.y = SUPERFICIE_Y + 0.005
  superficie.renderOrder = 1
  scene.add(liquido, superficie)

  const sol = new THREE.DirectionalLight(0xffffff, 0.4)
  sol.position.set(-3, 8, 6)
  const cielo = new THREE.PointLight(0x5ec8ff, 14, 22)
  cielo.position.set(-4, 3, 4)
  scene.add(sol, cielo)

  const objetivo = colorLiquido({ liquido: 'agua', sal: 0 })
  const actual = objetivo.clone()
  return {
    /** Color actual del líquido (pasa suave al nuevo). */
    color: actual,
    /** El color del líquido pasa suave al nuevo al cambiar de líquido o agregar sal. */
    actualizar(c: Config, dt: number) {
      objetivo.copy(colorLiquido(c))
      actual.lerp(objetivo, 1 - Math.exp(-dt * 6))
      liquidoMat.color.copy(actual)
      superficieMat.color.copy(actual).lerp(new THREE.Color(0xffffff), 0.45)
    },
  }
}
