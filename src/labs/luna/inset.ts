// "Vista desde la Tierra": un segundo renderer que mira la Luna desde la Tierra sobre la misma escena.
// La fase sale de la luz real del Sol sobre la Luna 3D, no de una textura.
import * as THREE from 'three'
import { h } from '../../ui/dom'
import type { crearLuna } from './cuerpos'

export interface Sombra {
  dx: number
  dy: number
  fuerza: number
  cobre: number
  suavidad: number
}

interface Contexto {
  scene: THREE.Scene
  luna: ReturnType<typeof crearLuna>
  sol: THREE.DirectionalLight
  frente: THREE.DirectionalLight
  /** Intensidad normal del Sol (se apaga un instante para la vista de la idea errónea). */
  intensidadSol: number
  tam: number
}

/** Distancia de la cámara a la Luna, sobre la línea Tierra-Luna: la dirección de mirada es la de la Tierra. */
const DISTANCIA = 1.45
const FONDO_CIELO = 0x02040a

export function crearInset({ scene, luna, sol, frente, intensidadSol, tam }: Contexto) {
  const dpr = Math.min(window.devicePixelRatio, 2)
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(dpr)
  renderer.setSize(tam, tam)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.setClearColor(FONDO_CIELO, 1)
  const idea = h('canvas', { class: 'inset-lienzo' })
  idea.width = idea.height = Math.round(tam * dpr)
  idea.style.width = idea.style.height = `${tam}px`
  const ctxIdea = idea.getContext('2d')!

  const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 20)
  cam.layers.set(0) // sin las capas 1: lámpara, órbita y líneas solo se ven en la maqueta
  scene.add(frente.target)
  const dir = new THREE.Vector3()

  const poner = (s: Sombra) => luna.setSombra(s.dx, s.dy, s.fuerza, s.cobre, s.suavidad)
  function render() {
    const fondo = scene.background
    const niebla = scene.fog
    scene.background = null
    scene.fog = null
    renderer.render(scene, cam)
    scene.background = fondo
    scene.fog = niebla
  }

  return {
    real: renderer.domElement,
    idea,
    /**
     * `real`: sombra del eclipse (si lo hay). `ideaSombra`: la sombra de la idea errónea; con ella se dibuja
     * antes la Luna "toda iluminada de frente" en el lienzo `idea`, para comparar lado a lado.
     */
    dibujar(lunaPos: THREE.Vector3, sur: boolean, real: Sombra, ideaSombra: Sombra | null) {
      dir.copy(lunaPos).normalize()
      cam.position.copy(lunaPos).addScaledVector(dir, -DISTANCIA)
      // Hemisferio sur: la misma vista girada 180° (el "arriba" de la cámara apunta al sur).
      cam.up.set(0, sur ? -1 : 1, 0)
      cam.lookAt(lunaPos)
      if (ideaSombra) {
        sol.intensity = 0
        frente.intensity = intensidadSol
        frente.position.copy(cam.position)
        frente.target.position.copy(lunaPos)
        frente.target.updateMatrixWorld()
        poner(ideaSombra)
        render()
        ctxIdea.drawImage(renderer.domElement, 0, 0, idea.width, idea.height)
        sol.intensity = intensidadSol
        frente.intensity = 0
      }
      poner(real)
      render()
    },
  }
}
