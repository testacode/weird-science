import * as THREE from 'three'
import { COLOR, MEDIO_X, MEDIO_Z, nivelMar, puntoRio, semilla } from './constantes'
import { S_MAX, type Estado, type Flujos } from './model'

const MUESTRAS_RIO = 48
const GOTAS_RIO = 70
const GOTAS_SUELO = 50
const X_NAPA = -1.2

type Altura = (x: number, z: number) => number

/** Agua líquida de la maqueta: el mar (cambia de nivel), el río con su escorrentía y la napa del subsuelo con la infiltración. */
export function crearAgua(scene: THREE.Scene, altura: Altura) {
  // --- Mar ---
  const mar = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshPhysicalMaterial({ color: 0x2a8fbf, transparent: true, opacity: 0.34, roughness: 0.1, envMapIntensity: 0.3, depthWrite: false }),
  )
  const ancho = MEDIO_X - 0.02
  mar.position.x = -ancho / 2
  const superficie = new THREE.Mesh(
    new THREE.PlaneGeometry(ancho, MEDIO_Z * 2 - 0.04, 28, 10).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x9fe0ff, transparent: true, opacity: 0.18, depthWrite: false }),
  )
  superficie.position.x = -ancho / 2
  scene.add(mar, superficie)
  const olas = superficie.geometry.getAttribute('position')

  // --- Río: una cinta que sigue el terreno ---
  const trazo = Array.from({ length: MUESTRAS_RIO }, (_, i) => puntoRio(i / (MUESTRAS_RIO - 1)))
  const lado = trazo.map((_, i) => {
    const a = trazo[Math.max(i - 1, 0)]
    const b = trazo[Math.min(i + 1, MUESTRAS_RIO - 1)]
    return new THREE.Vector2(-(b.z - a.z), b.x - a.x).normalize()
  })
  const cinta = new THREE.BufferGeometry()
  const cPos = new Float32Array(MUESTRAS_RIO * 2 * 3)
  const cIdx: number[] = []
  for (let i = 0; i < MUESTRAS_RIO - 1; i++) cIdx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 2, 2 * i + 1, 2 * i + 3)
  cinta.setAttribute('position', new THREE.BufferAttribute(cPos, 3))
  cinta.setIndex(cIdx)
  const cintaMat = new THREE.MeshBasicMaterial({ color: COLOR.rio, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide })
  const rio = new THREE.Mesh(cinta, cintaMat)
  rio.frustumCulled = false
  scene.add(rio)

  // --- Napa en el corte del suelo (frente) ---
  const NAPA_N = 50
  const napa = new THREE.BufferGeometry()
  const nPos = new Float32Array(NAPA_N * 2 * 3)
  const nIdx: number[] = []
  for (let i = 0; i < NAPA_N - 1; i++) nIdx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 2, 2 * i + 1, 2 * i + 3)
  napa.setAttribute('position', new THREE.BufferAttribute(nPos, 3))
  napa.setIndex(nIdx)
  const napaMesh = new THREE.Mesh(napa, new THREE.MeshBasicMaterial({ color: COLOR.rio, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }))
  napaMesh.frustumCulled = false
  scene.add(napaMesh)

  // --- Gotas: escorrentía por el trazo del río e infiltración por el corte del suelo ---
  const gotaMat = new THREE.MeshBasicMaterial({ color: 0x55f0d0, toneMapped: false })
  const escorrentia = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), gotaMat, GOTAS_RIO)
  const infiltracion = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), gotaMat, GOTAS_SUELO)
  escorrentia.frustumCulled = infiltracion.frustumCulled = false
  scene.add(escorrentia, infiltracion)
  const azar = semilla(7)
  const tRio = Array.from({ length: GOTAS_RIO }, (_, i) => i / GOTAS_RIO)
  const sueloX = Array.from({ length: GOTAS_SUELO }, () => -0.2 + azar() * 4)
  const tSuelo = Array.from({ length: GOTAS_SUELO }, (_, i) => i / GOTAS_SUELO)
  const m4 = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const v = new THREE.Vector3()
  const s = new THREE.Vector3()
  const p = new THREE.Vector3()

  return {
    actualizar(e: Estado, f: Flujos, dt: number, t: number) {
      const nivel = nivelMar(e.mar)
      mar.scale.set(ancho, nivel, MEDIO_Z * 2 - 0.04)
      mar.position.y = nivel / 2
      superficie.position.y = nivel + 0.004
      for (let i = 0; i < olas.count; i++) {
        const x = olas.getX(i)
        olas.setY(i, 0.012 * Math.sin(x * 3.1 + t * 1.6) + 0.01 * Math.sin(olas.getZ(i) * 4 + t * 1.2))
      }
      olas.needsUpdate = true

      // Río: más ancho y más visible con más caudal.
      const caudal = Math.min(1, f.rio / 0.8)
      const semiancho = 0.04 + 0.1 * caudal
      cintaMat.opacity = e.rio < 0.05 ? 0 : 0.2 + 0.5 * caudal
      trazo.forEach((pt, i) => {
        for (const [k, signo] of [[0, -1], [1, 1]] as const) {
          const x = pt.x + lado[i].x * semiancho * signo
          const z = pt.z + lado[i].y * semiancho * signo
          cPos.set([x, altura(x, z) + 0.03, z], (2 * i + k) * 3)
        }
      })
      cinta.getAttribute('position').needsUpdate = true

      // Napa: sube con el agua del suelo y nunca pasa de la superficie.
      const techo = 0.1 + 0.7 * (e.suelo / S_MAX)
      for (let i = 0; i < NAPA_N; i++) {
        const x = X_NAPA + (i * (MEDIO_X - X_NAPA)) / (NAPA_N - 1)
        nPos.set([x, 0.01, MEDIO_Z + 0.006, x, Math.max(0.02, Math.min(techo, altura(x, MEDIO_Z) * 0.85)), MEDIO_Z + 0.006], i * 6)
      }
      napa.getAttribute('position').needsUpdate = true

      const nRio = Math.round(GOTAS_RIO * Math.min(1, f.escorr / 0.9))
      for (let i = 0; i < GOTAS_RIO; i++) {
        tRio[i] = (tRio[i] + dt * 0.3 * (1 + 0.5 * Math.sin(i))) % 1
        puntoRio(tRio[i], p)
        p.y = altura(p.x, p.z) + 0.05
        escorrentia.setMatrixAt(i, m4.compose(p, q, s.setScalar(i < nRio ? 0.032 : 0)))
      }
      escorrentia.instanceMatrix.needsUpdate = true

      const nSuelo = Math.round(GOTAS_SUELO * Math.min(1, f.infil / 1))
      for (let i = 0; i < GOTAS_SUELO; i++) {
        tSuelo[i] = (tSuelo[i] + dt * 0.45) % 1
        const x = sueloX[i]
        const arriba = altura(x, MEDIO_Z) - 0.02
        const abajo = Math.max(0.05, Math.min(techo, altura(x, MEDIO_Z) * 0.85))
        v.set(x, arriba + (abajo - arriba) * tSuelo[i], MEDIO_Z + 0.014)
        infiltracion.setMatrixAt(i, m4.compose(v, q, s.setScalar(i < nSuelo && arriba > abajo ? 0.03 : 0)))
      }
      infiltracion.instanceMatrix.needsUpdate = true
    },
  }
}
