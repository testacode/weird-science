// Base compartida por todos los labs: renderer, cámara, bloom y resize.
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

export const FONDO = 0x07100f

export function crearEscenario(contenedor: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  contenedor.prepend(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(FONDO)
  scene.fog = new THREE.Fog(FONDO, 16, 34)
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)

  // OutputPass va último: aplica tone mapping y espacio de color.
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.4, 0.85)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  function ajustar() {
    const { clientWidth: w, clientHeight: h } = contenedor
    renderer.setSize(w, h)
    composer.setSize(w, h)
    bloom.resolution.set(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  ajustar()
  window.addEventListener('resize', ajustar)

  return { scene, camera, renderer, render: () => composer.render() }
}
