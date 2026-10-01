// La Tierra (con eje, ciudad y plano del horizonte) y el Sol-lámpara de la maqueta.
import * as THREE from 'three'

const RAD = Math.PI / 180

// Continentes muy esquemáticos: [longitud, latitud, radio en grados].
const TIERRAS: [number, number, number][] = [
  [-60, -15, 24], [-95, 42, 26], [20, 8, 28], [85, 52, 38], [135, -25, 14], [-42, 72, 12], [100, 20, 14],
]

export const posicionEnTierra = (lat: number, lon: number, radio = 1) =>
  new THREE.Vector3(Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD), Math.cos(lat * RAD) * Math.cos(lon * RAD)).multiplyScalar(radio)

const AUX = { x: new THREE.Vector3(), m: new THREE.Matrix4() }

/**
 * Tierra de radio 1 escalada a `radio`. `orientar` apunta el eje (norte) y gira el globo para que la ciudad
 * quede mirando al Sol (siempre es mediodía en la ciudad: lo que importa es a qué altura ve al Sol).
 */
export function crearTierra(radio: number) {
  const geo = new THREE.SphereGeometry(1, 64, 40)
  const pos = geo.attributes.position
  const color = new Float32Array(pos.count * 3)
  const v = new THREE.Vector3()
  const centros = TIERRAS.map(([lon, lat, r]) => ({ d: posicionEnTierra(lat, lon), r: r * RAD }))
  const mar = new THREE.Color(0x1d6aa5)
  const tierra = new THREE.Color(0x3f8f55)
  const hielo = new THREE.Color(0xe4f1f5)
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize()
    let t = 0
    for (const c of centros) t += Math.exp(-((Math.acos(Math.min(1, v.dot(c.d))) / c.r) ** 2))
    const c = mar.clone().lerp(tierra, Math.min(1, Math.max(0, (t - 0.45) * 5)))
    if (Math.abs(v.y) > 0.93) c.lerp(hielo, 0.9)
    color.set([c.r, c.g, c.b], i * 3)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(color, 3))
  const esfera = new THREE.Mesh(geo, // El `emissive` apenas deja ver el lado de noche (si no, de espaldas al Sol la Tierra sería una mancha negra).
  new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.05, emissive: 0x0b2236 }))

  // Meridianos y paralelos (incluye el ecuador): dejan ver cómo se inclina el globo.
  const puntos: THREE.Vector3[] = []
  for (let lon = 0; lon < 360; lon += 30)
    for (let lat = -90; lat < 90; lat += 6) puntos.push(posicionEnTierra(lat, lon, 1.004), posicionEnTierra(lat + 6, lon, 1.004))
  for (let lat = -60; lat <= 60; lat += 30)
    for (let lon = 0; lon < 360; lon += 6) puntos.push(posicionEnTierra(lat, lon, 1.004), posicionEnTierra(lat, lon + 6, 1.004))
  esfera.add(new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(puntos),
    new THREE.LineBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.22 }),
  ))

  // La ciudad: un punto lima y su horizonte (un disco tangente al suelo).
  const punto = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), new THREE.MeshBasicMaterial({ color: 0xc6f35e, toneMapped: false, depthTest: false }))
  const horizonte = new THREE.Mesh(
    new THREE.CircleGeometry(0.34, 40),
    new THREE.MeshBasicMaterial({ color: 0xc6f35e, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false, depthTest: false, toneMapped: false }),
  )
  // Se ven "a través" del globo: cuando la Tierra está de espaldas al observador, la ciudad mira al Sol, del otro lado.
  punto.renderOrder = horizonte.renderOrder = 10
  esfera.add(punto, horizonte)

  const grupo = new THREE.Group()
  grupo.add(esfera)
  // Eje de rotación: atraviesa los polos y sobresale; es de la Tierra, así que se inclina con ella.
  const eje = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1.55, 0), new THREE.Vector3(0, 1.55, 0)]),
    new THREE.LineBasicMaterial({ color: 0x5ec8ff, transparent: true, opacity: 0.8 }),
  )
  grupo.add(eje)
  grupo.scale.setScalar(radio)

  const polo = new THREE.Vector3(0, 1.55, 0)
  return {
    grupo,
    /** `eje`: dirección del polo norte. `haciaSol`: dirección unitaria Tierra→Sol. */
    orientar(eje: THREE.Vector3, haciaSol: THREE.Vector3, lat: number, lon: number) {
      // Meridiano que mira al Sol: la proyección de la dirección del Sol sobre el plano del ecuador.
      const p = haciaSol.clone().addScaledVector(eje, -haciaSol.dot(eje)).normalize()
      AUX.x.crossVectors(eje, p)
      grupo.quaternion.setFromRotationMatrix(AUX.m.makeBasis(AUX.x, eje, p))
      esfera.rotation.y = -lon * RAD
      const c = posicionEnTierra(lat, lon)
      punto.position.copy(c).multiplyScalar(1.01)
      horizonte.position.copy(c).multiplyScalar(1.012)
      horizonte.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), c.clone().normalize())
    },
    /** Posición del punto de la ciudad en el mundo. */
    ciudadEnMundo: (salida: THREE.Vector3) => punto.getWorldPosition(salida),
    poloEnMundo: (salida: THREE.Vector3) => grupo.localToWorld(salida.copy(polo)),
  }
}

/** Sol-lámpara: esfera emisiva con halo (para el bloom) sobre un pie que baja hasta la mesada. */
export function crearSol(radio: number, alturaMesada: number) {
  const grupo = new THREE.Group()
  const bola = new THREE.Mesh(new THREE.SphereGeometry(radio, 40, 24), new THREE.MeshBasicMaterial({ color: 0xffc857, toneMapped: false, fog: false }))
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(radio * 1.45, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0xffb53d, transparent: true, opacity: 0.16, depthWrite: false, fog: false }),
  )
  const pie = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.08, -alturaMesada - radio, 12),
    new THREE.MeshStandardMaterial({ color: 0x35504a, roughness: 0.5, metalness: 0.5 }),
  )
  pie.position.y = (alturaMesada - radio) / 2
  grupo.add(bola, halo, pie)
  return grupo
}
