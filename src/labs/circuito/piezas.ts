// Piezas 3D de la maqueta: pila (o portapilas), lamparita con portalámparas e interruptor.
import * as THREE from 'three'
import type { Voltaje } from './model'
import { BY, mediaLargoPila } from './trazado'

export const COLOR_MARCA = 0xc6f35e
const metal = () => new THREE.MeshStandardMaterial({ color: 0x7a8782, metalness: 0.7, roughness: 0.45 })
const plastico = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1 })

function cilindroEnZ(radio: number, largo: number, material: THREE.Material, z: number, y = BY): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, largo, 28), material)
  m.rotation.x = Math.PI / 2
  m.position.set(0, y, z)
  return m
}

/** Pilas grandes en un portapilas (1,5 / 3 / 4,5 V) o la pila rectangular de 9 V. El polo + mira hacia atrás (−z). */
export function crearPila(voltaje: Voltaje): THREE.Group {
  const g = new THREE.Group()
  const hl = mediaLargoPila(voltaje)
  const cuerpo = plastico(0x1b2a26)
  const banda = new THREE.MeshStandardMaterial({ color: 0x8fb83a, roughness: 0.45 })
  const acero = metal()
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.18, hl * 2), plastico(0x101a18))
  base.position.y = 0.09
  g.add(base)
  if (voltaje === 9) {
    const caja = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.7, hl * 2 - 0.3), cuerpo)
    caja.position.y = 0.18 + 0.35
    const franja = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, hl * 2 - 0.6), banda)
    franja.position.y = 0.9
    g.add(caja, franja)
  } else {
    const celdas = voltaje / 1.5
    for (let i = 0; i < celdas; i++) {
      const z = -hl + 0.2 + 0.45 + i * 0.9
      g.add(cilindroEnZ(0.34, 0.86, cuerpo, z), cilindroEnZ(0.35, 0.22, banda, z))
    }
  }
  for (const lado of [-1, 1]) g.add(cilindroEnZ(0.1, 0.22, acero, lado * (hl - 0.09)))
  return g
}

export interface Lamparita {
  grupo: THREE.Group
  bombilla: THREE.Group
  vidrio: THREE.MeshPhysicalMaterial
  filamento: THREE.MeshBasicMaterial
  luz: THREE.PointLight
}

export function crearLamparita(): Lamparita {
  const grupo = new THREE.Group()
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.3, 28), metal())
  base.position.y = 0.15
  const rosca = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.04, 8, 28), metal())
  rosca.rotation.x = Math.PI / 2
  rosca.position.y = 0.3
  grupo.add(base, rosca)

  const bombilla = new THREE.Group()
  bombilla.position.y = 0.3
  const vidrio = new THREE.MeshPhysicalMaterial({
    color: 0xffe9c0, transmission: 0.75, roughness: 0.15, thickness: 0.3, ior: 1.45, envMapIntensity: 0.5, emissive: 0xffc857, emissiveIntensity: 0,
  })
  const ampolla = new THREE.Mesh(new THREE.SphereGeometry(0.52, 32, 20), vidrio)
  ampolla.position.y = 0.8
  const cuello = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.3, 24), vidrio)
  cuello.position.y = 0.2
  const filamento = new THREE.MeshBasicMaterial({ color: 0x3a2a20, toneMapped: false })
  const espira = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 8, 20), filamento)
  espira.position.y = 0.78
  const apoyo = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), metal())
  apoyo.position.y = 0.5
  bombilla.add(ampolla, cuello, espira, apoyo)
  grupo.add(bombilla)

  const luz = new THREE.PointLight(0xffc857, 0, 9, 2)
  luz.position.y = 1.5
  grupo.add(luz)
  return { grupo, bombilla, vidrio, filamento, luz }
}

export interface InterruptorPieza {
  grupo: THREE.Group
  palanca: THREE.Group
}

/** Interruptor de palanca: cerrado (palanca baja, apoyada en el poste) o abierto (palanca levantada). */
export function crearInterruptor(): InterruptorPieza {
  const grupo = new THREE.Group()
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.16, 0.75), plastico(0x101a18))
  base.position.y = 0.08
  grupo.add(base)
  for (const x of [-0.6, 0.6]) {
    const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 16), metal())
    poste.position.set(x, 0.3, 0)
    grupo.add(poste)
  }
  const palanca = new THREE.Group()
  palanca.position.set(-0.6, 0.47, 0)
  const brazo = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.2), metal())
  brazo.position.x = 0.6
  const perilla = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), plastico(COLOR_MARCA))
  perilla.position.set(1.2, 0.08, 0)
  palanca.add(brazo, perilla)
  grupo.add(palanca)
  return { grupo, palanca }
}
