// Las cinco estaciones de separación. Solo se ve la activa; el vaso de mezcla queda siempre a la izquierda.
import * as THREE from 'three'
import { numero } from '../../ui/formato'
import type { MetodoId } from './datos'
import { LUZ_TAMIZ_MM, PORO_FILTRO_MM } from './model'
import { metal, soporte, torneado, vasoPrecipitados, vidrio } from './piezas'
import { cilindro, paso, porPerfil, type Estacion, type Region } from './regiones'

export const X_VASO = -3.6
export const VASO: Region = { x: X_VASO, z: 0, y0: 0.07, alto: 1.65, capMl: 190, radio: cilindro(0.72) }
export const BOCA_VASO = paso(X_VASO, 2.4, 0, 0.2)
const AMBAR = 0xffc857
const CIELO = 0x5ec8ff

const donde = (x0: number, r: Omit<Region, 'x' | 'z'> & { x?: number }): Region => ({ ...r, x: x0 + (r.x ?? 0), z: 0 })
const pasoEn = (x0: number, x: number, y: number, d = 0) => paso(x0 + x, y, 0, d)
const at = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z)

/** Cilindro entre dos puntos. */
function entre(a: THREE.Vector3, b: THREE.Vector3, radio: number, material: THREE.Material) {
  const dir = b.clone().sub(a)
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, dir.length(), 16), material)
  m.position.copy(a).addScaledVector(dir, 0.5)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
  return m
}

function tamiz(): Estacion {
  const x0 = 0.9
  const g = new THREE.Group()
  g.position.x = x0
  const vaso = vasoPrecipitados(1.0, 1.45)
  const aro = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.05, 8, 48), metal(0x93a8a0))
  aro.rotation.x = Math.PI / 2
  aro.position.y = 1.5
  const pared = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 0.6, 48, 1, true), vidrio(0.16, 0x93a8a0))
  pared.position.y = 1.8
  const malla = new THREE.GridHelper(2.4, 18, 0x93a8a0, 0x93a8a0)
  malla.position.y = 1.52
  g.add(vaso, aro, pared, malla)
  return {
    grupo: g,
    origen: donde(x0, { y0: 1.56, alto: 0.55, capMl: 160, radio: cilindro(1.05) }),
    salida: donde(x0, { y0: 0.08, alto: 1.3, capMl: 260, radio: cilindro(0.92) }),
    entrada: [pasoEn(x0, 0, 2.7, 0.3)],
    rutaSalida: [pasoEn(x0, 0, 1.4, 0.35)],
    rotulos: { estacion: 'Tamiz', origen: 'Retenido', salida: 'Pasó' },
    anclas: { estacion: at(x0, 2.9), origen: at(x0 - 1.3, 2.0, 0.4), salida: at(x0, -0.25, 2.2) },
  }
}

function filtro(): Estacion {
  const x0 = 0.9
  const g = new THREE.Group()
  g.position.x = x0
  const embudo = torneado([[0.07, 1.9], [0.07, 2.5], [1.1, 3.55], [1.16, 3.62]], vidrio(0.14))
  const papel = torneado([[0.02, 2.52], [1.0, 3.5]], new THREE.MeshStandardMaterial({ color: 0xb9c4bf, transparent: true, opacity: 0.4, side: THREE.DoubleSide, roughness: 0.9, depthWrite: false }))
  g.add(vasoPrecipitados(0.9, 1.3), embudo, papel, soporte(-1.6, 4.3, 2.75, 0, 0.45))
  return {
    grupo: g,
    origen: donde(x0, { y0: 2.62, alto: 0.85, capMl: 150, radio: (f) => 0.85 * porPerfil([[2.5, 0.07], [3.55, 1.1]], 2.62, 0.85)(f) }),
    salida: donde(x0, { y0: 0.08, alto: 1.15, capMl: 250, radio: cilindro(0.8) }),
    entrada: [pasoEn(x0, 0, 4.2, 0.25)],
    rutaSalida: [pasoEn(x0, 0, 2.5), pasoEn(x0, 0, 1.95), pasoEn(x0, 0, 1.55, 0.1)],
    rotulos: { estacion: 'Embudo con papel de filtro', origen: 'Queda en el papel', salida: 'Filtrado' },
    anclas: { estacion: at(x0, 4.0), origen: at(x0 - 1.4, 3.2, 0.4), salida: at(x0, -0.25, 2.2) },
  }
}

const PERFIL_AMPOLLA = [[1.9, 0.08], [2.25, 0.08], [2.5, 0.4], [2.95, 0.75], [3.35, 0.88], [3.8, 0.7], [4.15, 0.4], [4.4, 0.17], [4.65, 0.15]]

function ampolla(): Estacion {
  const x0 = 0.9
  const g = new THREE.Group()
  g.position.x = x0
  const bulbo = torneado(PERFIL_AMPOLLA.map(([y, r]) => [r, y]), vidrio(0.12))
  const llave = new THREE.Group()
  llave.position.y = 2.1
  llave.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.42, 14), metal(0x93a8a0)))
  const palanca = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.07, 0.07), new THREE.MeshStandardMaterial({ color: 0xc6f35e, roughness: 0.4 }))
  palanca.position.set(0, 0, 0.2)
  llave.add(palanca)
  llave.rotation.z = Math.PI / 2
  g.add(vasoPrecipitados(0.8, 1.2), bulbo, llave, soporte(-1.6, 4.6, 2.62, 0, 0.6))
  const perfil = porPerfil(PERFIL_AMPOLLA, 2.3, 1.7)
  return {
    grupo: g,
    origen: donde(x0, { y0: 2.3, alto: 1.7, capMl: 230, radio: (f) => 0.8 * perfil(f) }),
    salida: donde(x0, { y0: 0.08, alto: 1.0, capMl: 220, radio: cilindro(0.7) }),
    entrada: [pasoEn(x0, 0, 4.9, 0.1), pasoEn(x0, 0, 4.4, 0.05)],
    rutaSalida: [pasoEn(x0, 0, 2.2, 0.03), pasoEn(x0, 0, 1.7, 0.03), pasoEn(x0, 0, 1.3, 0.1)],
    rotulos: { estacion: 'Ampolla de decantación', origen: 'Queda arriba', salida: 'Sale por la llave' },
    anclas: { estacion: at(x0, 5.1), origen: at(x0 - 1.5, 3.9, 0.4), salida: at(x0, -0.25, 2.2) },
    animar: ({ lectura, iniciado, dt }) => {
      const abierta = iniciado && !!lectura && lectura.asentado >= 1 && !lectura.terminado
      llave.rotation.z += ((abierta ? 0 : Math.PI / 2) - llave.rotation.z) * (1 - Math.exp(-8 * dt))
    },
  }
}

function destilacion(): Estacion {
  const x0 = 1.5
  const g = new THREE.Group()
  g.position.x = x0
  const vi = vidrio(0.1)
  const balon = new THREE.Mesh(new THREE.SphereGeometry(0.92, 40, 28), vi)
  balon.position.set(-0.9, 2.6, 0)
  const cuello = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.0, 24, 1, true), vi)
  cuello.position.set(-0.9, 3.9, 0)
  // Mechero: base, tubo y llama (su tamaño sigue a la temperatura).
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.1, 28), metal())
  base.position.set(-0.9, 0.05, 0)
  const tubo = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.95, 16), metal(0x93a8a0))
  tubo.position.set(-0.9, 0.57, 0)
  const matLlama = new THREE.MeshBasicMaterial({ color: AMBAR, transparent: true, opacity: 0.85, toneMapped: false })
  const llama = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.8, 20), matLlama)
  llama.position.set(-0.9, 1.45, 0)
  llama.visible = false
  // Refrigerante de Liebig: tubo interior, camisa de agua y mangueras.
  const a = at(-0.2, 4.1)
  const b = at(2.3, 2.65)
  const camisa = entre(a, b, 0.24, new THREE.MeshPhysicalMaterial({ color: CIELO, transparent: true, opacity: 0.22, roughness: 0.2, depthWrite: false }))
  const interior = entre(a, b, 0.07, vi)
  const codo = entre(at(-0.9, 4.4), a, 0.07, vi)
  const goteo = entre(b, at(2.4, 2.4), 0.07, vi)
  g.add(vasoColector(2.4), balon, cuello, base, tubo, llama, camisa, interior, codo, goteo, soporte(-2.2, 4.6, 3.9, -0.9, 0.3))
  const radioBalon = (f: number) => 0.05 + 0.84 * Math.sqrt(Math.max(0, 1 - (2 * f - 1) ** 2))
  return {
    grupo: g,
    origen: donde(x0, { x: -0.9, y0: 1.72, alto: 1.7, capMl: 240, radio: radioBalon }),
    salida: donde(x0, { x: 2.4, y0: 0.08, alto: 0.9, capMl: 120, radio: cilindro(0.48) }),
    entrada: [pasoEn(x0, -0.9, 4.9, 0.1), pasoEn(x0, -0.9, 4.35, 0.05)],
    rutaSalida: [pasoEn(x0, -0.9, 3.9, 0.1), pasoEn(x0, -0.25, 4.1), pasoEn(x0, 1.0, 3.4), pasoEn(x0, 2.3, 2.65), pasoEn(x0, 2.4, 1.8, 0.05)],
    rotulos: { estacion: 'Equipo de destilación', origen: 'Queda en el balón', salida: 'Destilado' },
    anclas: { estacion: at(x0 + 2.1, 4.5), origen: at(x0 - 0.9, -0.25, 2.2), salida: at(x0 + 1.9, -0.25, 2.2), temp: at(x0 - 1.0, 5.0) },
    animar: ({ lectura, iniciado, ahora, tMechero }) => {
      const prendido = iniciado && !!lectura && !lectura.terminado
      llama.visible = prendido
      const tamano = 0.55 + 0.9 * ((tMechero - 60) / 240) + 0.05 * Math.sin(ahora / 70)
      llama.scale.set(0.8 + 0.2 * Math.sin(ahora / 90), tamano, 0.8 + 0.2 * Math.sin(ahora / 110))
      llama.position.y = 1.05 + 0.4 * tamano
    },
  }
}

function vasoColector(x: number) {
  const v = vasoPrecipitados(0.6, 1.0)
  v.position.x = x
  return v
}

function iman(): Estacion {
  const g = new THREE.Group()
  g.position.x = X_VASO
  const pie = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.9), metal())
  pie.position.set(1.9, 0.05, -0.3)
  const varilla = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.1, 12), metal(0x93a8a0))
  varilla.position.set(1.9, 2.05, -0.3)
  const brazo = entre(at(1.9, 4.1, -0.3), at(0, 4.1, 0), 0.04, metal(0x93a8a0))
  const barra = new THREE.Group()
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, 0.3), new THREE.MeshStandardMaterial({ color: 0xcfd8dc, roughness: 0.3, metalness: 0.7 }))
  const polo = (y: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.32), new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.4, metalness: 0.6 }))
    m.position.y = y
    return m
  }
  const hilo = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), new THREE.MeshBasicMaterial({ color: 0x93a8a0 }))
  barra.add(cuerpo, polo(-0.39), polo(0.39))
  g.add(pie, varilla, brazo, barra, hilo)
  const salida: Region = { x: X_VASO, z: 0, y0: 2.5, alto: 0.3, capMl: 40, radio: cilindro(0.3), pegado: true }
  const ancla = at(X_VASO, 3.3)
  let y = 3.0
  return {
    grupo: g,
    origen: VASO,
    salida,
    entrada: [],
    rutaSalida: [],
    rotulos: { estacion: 'Imán', origen: 'Queda en el vaso', salida: 'Pegado al imán' },
    anclas: { estacion: at(X_VASO + 1.9, 4.4), origen: at(X_VASO, -0.25, 2.2), salida: ancla },
    animar: ({ lectura, iniciado, dt }) => {
      const sube = !!lectura && lectura.progreso > 0.75
      const objetivo = !iniciado ? 3.0 : sube ? 2.8 : 0.95
      y += (objetivo - y) * (1 - Math.exp(-3 * dt))
      barra.position.set(0, y, 0)
      hilo.scale.y = 4.1 - (y + 0.5)
      hilo.position.set(0, (4.1 + y + 0.5) / 2, 0)
      salida.y0 = y - 0.5
      ancla.y = y + 0.9
    },
  }
}

export function crearEstaciones(): Record<MetodoId, Estacion> {
  return { tamiz: tamiz(), filtro: filtro(), decantacion: ampolla(), destilacion: destilacion(), iman: iman() }
}

/** Detalle técnico de la propiedad que usa cada método, para la pastilla y la métrica avanzada. */
export const DETALLE: Record<MetodoId, string> = {
  tamiz: `por tamaño · malla de ${numero(LUZ_TAMIZ_MM, 1)} mm`,
  filtro: `por tamaño · poro de ${numero(PORO_FILTRO_MM, 2)} mm`,
  decantacion: 'por densidad',
  destilacion: 'por punto de ebullición',
  iman: 'por magnetismo',
}
