// El campo magnético hecho visible: brújulas (apuntan al campo local, incluido el terrestre) y limaduras de hierro
// (solo se ordenan donde el campo supera a su rozamiento con el papel). Las dos salen de `campoEn` del modelo.
import * as THREE from 'three'
import { COLOR_N, COLOR_S, ESC, aX, aZ, smooth } from './geometria'
import { LADO, LADO_MUESTRA, campoEn, piezaB, piezasA, polosTodos, type Config } from './model'

const PASO = 2
const COLUMNAS = Array.from({ length: 16 }, (_, i) => -12 + i * PASO)
const FILAS = Array.from({ length: 7 }, (_, i) => -6 + i * PASO)
const RADIO_BRUJULA = 0.75
const LARGO_AGUJA = 0.52
const N_LIMADURAS = 4200
/** Parámetro de ajuste: campo (T) desde el cual las limaduras se ordenan del todo; a un tercio de eso apenas se mueven. */
const B_LIMADURAS = 1e-3
/** Tramo de mesada (cm) en el que se esparcen las limaduras: de x0 a x1 y de −y a y. */
const MESA = { x0: -13, x1: 19, y: 7.5 }

const dentro = (x: number, y: number, r: { x0: number; x1: number; semi: number }, margen: number) =>
  x > r.x0 - margen && x < r.x1 + margen && Math.abs(y) < r.semi + margen

/** Rectángulos que ocupan los imanes y la muestra (cm): ahí no se dibujan brújulas ni limaduras. */
function ocupado(c: Config) {
  const piezas = piezasA(c)
  const r = piezas.map((p) => ({ x0: p.x0, x1: p.x1, semi: LADO / 2 }))
  if (c.modo === 'dos') r.push({ x0: c.gap, x1: piezaB(c.gap).x1, semi: LADO / 2 })
  else r.push({ x0: c.gap, x1: c.gap + LADO_MUESTRA, semi: LADO_MUESTRA / 2 })
  return r
}

const angulo = (b: { bx: number; by: number }) => Math.atan2(b.by, b.bx)
/** Diferencia de ángulo más corta, entre −π y π. */
const dif = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

export function crearCampo(scene: THREE.Scene) {
  const grupo = new THREE.Group()
  scene.add(grupo)
  const matriz = new THREE.Matrix4()
  const giro = new THREE.Quaternion()
  const eje = new THREE.Vector3(0, 1, 0)
  const unidad = new THREE.Vector3(1, 1, 1)
  const pos = new THREE.Vector3()
  const escala = new THREE.Vector3()

  // --- Brújulas: un disco y dos agujas triangulares (N magenta, S cielo) ---
  const lugares = FILAS.flatMap((y) => COLUMNAS.map((x) => ({ x, y })))
  const cuerpo = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(RADIO_BRUJULA * ESC, RADIO_BRUJULA * ESC, 0.05, 20),
    new THREE.MeshStandardMaterial({ color: 0x14231f, roughness: 0.6, metalness: 0.3 }),
    lugares.length,
  )
  const aguja = (color: number, sentido: 1 | -1) => {
    const g = new THREE.ConeGeometry(0.07, LARGO_AGUJA * 0.5, 3)
    g.rotateZ((-Math.PI / 2) * sentido)
    g.translate(sentido * LARGO_AGUJA * 0.25, 0, 0)
    return new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color, toneMapped: false }), lugares.length)
  }
  const agujaN = aguja(COLOR_N, 1)
  const agujaS = aguja(COLOR_S, -1)
  for (const m of [cuerpo, agujaN, agujaS]) {
    m.frustumCulled = false
    grupo.add(m)
  }
  const actual = lugares.map(() => Math.PI / 2)
  const objetivo = lugares.map(() => Math.PI / 2)
  const visibles = lugares.map(() => true)

  // --- Limaduras: rayitas con orientación al azar que se ordenan según el campo ---
  const limaduras = Array.from({ length: N_LIMADURAS }, () => ({
    x: MESA.x0 + Math.random() * (MESA.x1 - MESA.x0),
    y: (Math.random() * 2 - 1) * MESA.y,
    azar: Math.random() * Math.PI,
    ruido: (Math.random() - 0.5) * 0.35,
    largo: 0.7 + Math.random() * 0.6,
  }))
  const polvo = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ toneMapped: false }), N_LIMADURAS)
  polvo.frustumCulled = false
  grupo.add(polvo)
  const color = new THREE.Color()

  function actualizarLimaduras(c: Config, polos: ReturnType<typeof polosTodos>) {
    const huecos = ocupado(c)
    limaduras.forEach((l, i) => {
      const b = campoEn(polos, l.x, l.y)
      const peso = smooth(B_LIMADURAS / 3, B_LIMADURAS, Math.hypot(b.bx, b.by))
      const theta = l.azar + dif(angulo(b) + l.ruido * (1 - peso), l.azar) * peso
      const tapada = huecos.some((r) => dentro(l.x, l.y, r, 0.1))
      giro.setFromAxisAngle(eje, theta)
      escala.set(0.17 * l.largo * (0.6 + 0.4 * peso), 0.014, 0.014)
      polvo.setMatrixAt(i, matriz.compose(pos.set(aX(l.x), 0.025, aZ(l.y)), giro, tapada ? escala.setScalar(0) : escala))
      polvo.setColorAt(i, color.setScalar(0.15 + 0.7 * peso))
    })
    polvo.instanceMatrix.needsUpdate = true
    if (polvo.instanceColor) polvo.instanceColor.needsUpdate = true
  }

  function actualizarBrujulas(c: Config, polos: ReturnType<typeof polosTodos>) {
    const huecos = ocupado(c)
    lugares.forEach((l, i) => {
      objetivo[i] = angulo(campoEn(polos, l.x, l.y))
      visibles[i] = !huecos.some((r) => dentro(l.x, l.y, r, RADIO_BRUJULA))
      matriz.compose(pos.set(aX(l.x), 0.025, aZ(l.y)), giro.identity(), visibles[i] ? unidad : escala.setScalar(0))
      cuerpo.setMatrixAt(i, matriz)
    })
    cuerpo.instanceMatrix.needsUpdate = true
  }

  return {
    actualizar(c: Config) {
      const polos = polosTodos(c)
      cuerpo.visible = agujaN.visible = agujaS.visible = c.vista === 'brujulas'
      polvo.visible = c.vista === 'limaduras'
      if (c.vista === 'brujulas') actualizarBrujulas(c, polos)
      if (c.vista === 'limaduras') actualizarLimaduras(c, polos)
    },
    /** Las agujas giran hacia el campo con algo de inercia. */
    animar(dt: number) {
      if (!agujaN.visible) return
      const k = 1 - Math.exp(-dt / 0.09)
      lugares.forEach((l, i) => {
        actual[i] += dif(objetivo[i], actual[i]) * k
        giro.setFromAxisAngle(eje, actual[i])
        const e = visibles[i] ? unidad : escala.setScalar(0)
        matriz.compose(pos.set(aX(l.x), 0.07, aZ(l.y)), giro, e)
        agujaN.setMatrixAt(i, matriz)
        agujaS.setMatrixAt(i, matriz)
      })
      agujaN.instanceMatrix.needsUpdate = true
      agujaS.instanceMatrix.needsUpdate = true
    },
  }
}
