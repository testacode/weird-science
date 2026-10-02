// Un tubo de 10 m de un medio: fuente (pistón) a la izquierda, partículas adentro y un micrófono-anillo.

import * as THREE from 'three'
import { mezclar } from '../../ui/azar'
import { L_TUBO, medio, senal, type Config, type Estado, type MedioId } from './model'
import { U_POR_M, campo, golpe, tono, visibilidad } from './onda'

export const L_U = L_TUBO * U_POR_M
export const R_TUBO = 0.56
const R_INT = 0.46

/** Partículas dibujadas, tamaño y agitación (térmica o de la red) por medio: el aire va suelto, el agua apretada y el acero en red. */
const ASPECTO: Record<MedioId, { n: number; radio: number; agitacion: number; neutro: number; vidrio: number; opacidad: number }> = {
  aire: { n: 900, radio: 0.036, agitacion: 0.05, neutro: 0x7ec8e3, vidrio: 0x7fa89a, opacidad: 0.1 },
  agua: { n: 2000, radio: 0.038, agitacion: 0.012, neutro: 0x2a74c8, vidrio: 0x2a6fa8, opacidad: 0.22 },
  acero: { n: 0, radio: 0.05, agitacion: 0.006, neutro: 0x8d9aa1, vidrio: 0x8a9aa2, opacidad: 0.3 },
}
const PASO_RED = 0.15
const COMPRIME = new THREE.Color(0xffc857)
const SEPARA = new THREE.Color(0x3b3fa8)

/** Posiciones en reposo: al azar (estratificado en x) para aire y agua, en red cúbica para el acero. */
function posiciones(id: MedioId): number[][] {
  const lista: number[][] = []
  if (id === 'acero') {
    const radio = Math.floor(R_INT / PASO_RED)
    for (let i = 0; i * PASO_RED <= L_U; i++)
      for (let j = -radio; j <= radio; j++)
        for (let k = -radio; k <= radio; k++) if (j * j + k * k <= radio * radio + 1) lista.push([i * PASO_RED, j * PASO_RED, k * PASO_RED])
    return lista
  }
  const { n } = ASPECTO[id]
  for (let i = 0; i < n; i++) {
    const r = Math.sqrt(Math.random()) * R_INT
    const a = Math.random() * Math.PI * 2
    lista.push([((i + Math.random()) / n) * L_U, r * Math.cos(a), r * Math.sin(a)])
  }
  // El aire se vacía quitando partículas del final de la lista: que no sea siempre del lado derecho.
  return mezclar(lista)
}

export function crearTubo(id: MedioId, y: number) {
  const asp = ASPECTO[id]
  const v = medio(id).v
  const grupo = new THREE.Group()
  grupo.position.y = y

  const vidrio = new THREE.Mesh(
    new THREE.CylinderGeometry(R_TUBO, R_TUBO, L_U, 40, 1, true).rotateZ(Math.PI / 2).translate(L_U / 2, 0, 0),
    new THREE.MeshPhysicalMaterial({ color: asp.vidrio, transparent: true, opacity: asp.opacidad, roughness: 0.15, metalness: id === 'acero' ? 0.4 : 0, envMapIntensity: 0.25, depthWrite: false, side: THREE.DoubleSide }),
  )
  const metal = new THREE.MeshStandardMaterial({ color: 0x1d2a27, roughness: 0.4, metalness: 0.6 })
  const tapa = new THREE.Mesh(new THREE.CylinderGeometry(R_TUBO + 0.04, R_TUBO + 0.04, 0.1, 32).rotateZ(Math.PI / 2), metal)
  tapa.position.x = L_U + 0.05
  // Fuente: caja con un pistón que vibra. En el modelo, la membrana de un parlante.
  const caja = new THREE.Mesh(new THREE.CylinderGeometry(R_TUBO + 0.12, R_TUBO + 0.12, 0.45, 32).rotateZ(Math.PI / 2), metal)
  caja.position.x = -0.42
  const membranaMat = new THREE.MeshStandardMaterial({ color: 0x1d2a27, emissive: 0xc6f35e, emissiveIntensity: 0.5, roughness: 0.4 })
  const membrana = new THREE.Mesh(new THREE.CylinderGeometry(R_INT + 0.05, R_INT + 0.05, 0.06, 32).rotateZ(Math.PI / 2), membranaMat)
  // Micrófono: un anillo alrededor del tubo que se enciende con la señal.
  const micMat = new THREE.MeshStandardMaterial({ color: 0x1d2a27, emissive: 0xc6f35e, emissiveIntensity: 0.1, roughness: 0.4, metalness: 0.5 })
  const mic = new THREE.Group()
  mic.add(new THREE.Mesh(new THREE.TorusGeometry(R_TUBO + 0.04, 0.045, 12, 40).rotateY(Math.PI / 2), micMat))
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), micMat)
  cabeza.position.y = R_TUBO + 0.14
  mic.add(cabeza)
  grupo.add(vidrio, tapa, caja, membrana, mic)

  // Partículas: una sola InstancedMesh, el color dice si el aire está comprimido (ámbar) o separado (violeta).
  const base = posiciones(id)
  const n = base.length
  const bolitas = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), n)
  bolitas.frustumCulled = false
  const neutro = new THREE.Color(asp.neutro)
  for (let i = 0; i < n; i++) bolitas.setColorAt(i, neutro)
  const mat = bolitas.instanceMatrix.array as Float32Array
  const col = bolitas.instanceColor!.array as Float32Array
  const fases = Float32Array.from(base, () => Math.random() * 100)
  for (let i = 0; i < n; i++) {
    mat[16 * i] = mat[16 * i + 5] = mat[16 * i + 10] = asp.radio
    mat[16 * i + 15] = 1
  }
  grupo.add(bolitas)
  const color = new THREE.Color()
  const separacion = L_U / (id === 'acero' ? L_U / PASO_RED : n)

  return {
    grupo,
    id,
    /** Dibuja el cuadro: `fase` = 2π·f_visual·t del tono y `seg` = reloj de pantalla (para la agitación). */
    dibujar(c: Config, e: Estado, fase: number, seg: number) {
      const golpeando = c.modo === 'golpe'
      const lambdaU = (v / c.frecuencia) * U_POR_M
      const vis = golpeando ? 1 : visibilidad(lambdaU, separacion)
      const visibles = id === 'aire' ? Math.ceil(n * e.aire) : n
      bolitas.count = visibles
      const t = e.golpe ?? -1
      for (let i = 0; i < visibles; i++) {
        const [x0, y0, z0] = base[i]
        if (!golpeando) tono(x0, v, c.frecuencia, c.amplitud, fase, vis)
        else if (e.golpe === null) campo.dx = campo.c = 0
        else golpe(x0, v, c.amplitud, t)
        const f = fases[i]
        mat[16 * i + 12] = x0 + campo.dx + asp.agitacion * Math.sin(seg * 5 + f)
        mat[16 * i + 13] = y0 + asp.agitacion * Math.sin(seg * 4.3 + f * 1.7)
        mat[16 * i + 14] = z0 + asp.agitacion * Math.sin(seg * 5.7 + f * 2.3)
        // Qué tan comprimida está: el contraste crece con la amplitud.
        const w = Math.max(-1, Math.min(1, campo.c * 2.2))
        color.copy(neutro).lerp(w > 0 ? COMPRIME : SEPARA, Math.abs(w))
        col[3 * i] = color.r
        col[3 * i + 1] = color.g
        col[3 * i + 2] = color.b
      }
      bolitas.instanceMatrix.needsUpdate = true
      bolitas.instanceColor!.needsUpdate = true

      // Pistón y micrófono.
      if (golpeando) golpe(0, v, c.amplitud, t)
      else tono(0, v, c.frecuencia, c.amplitud, fase, 1)
      membrana.position.x = -0.2 + (golpeando && e.golpe === null ? 0 : campo.dx)
      mic.position.x = c.distancia * U_POR_M
      const aire = id === 'aire' ? e.aire : 1
      const brillo = golpeando
        ? e.golpe === null ? 0 : Math.abs(senal(id, c, aire, t))
        : c.amplitud * aire * (0.35 + 0.65 * Math.abs(Math.sin(fase - ((2 * Math.PI) / lambdaU) * c.distancia * U_POR_M)))
      micMat.emissiveIntensity = 0.1 + 2.5 * Math.min(1, brillo * 1.2)
    },
    /** Dónde está el micrófono en el eje del tubo (unidades), para anclar la pastilla. */
    micX: () => mic.position.x,
  }
}
