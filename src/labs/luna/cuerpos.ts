// Los tres cuerpos de la maqueta: Luna (con el relieve pintado en los vértices), Tierra y Sol-lámpara.
import * as THREE from 'three'
import { UMBRA_EN_LUNAS } from './model'

const RAD = Math.PI / 180

/** Generador pseudoaleatorio con semilla: la Luna se ve igual en cada carga. */
function azar(semilla: number) {
  let s = semilla
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

// Mares vistos desde la Tierra en el hemisferio norte: x a la derecha, y hacia arriba (radios lunares).
const MARES: [number, number, number][] = [
  [-0.28, 0.45, 0.28], [0.18, 0.42, 0.16], [0.3, 0.12, 0.18], [0.65, 0.3, 0.1],
  [0.55, -0.15, 0.13], [-0.6, 0.1, 0.3], [-0.15, -0.4, 0.18], [-0.5, -0.35, 0.1],
]

function pintarLuna(geo: THREE.BufferGeometry) {
  const pos = geo.attributes.position
  const rnd = azar(7)
  const crateres = Array.from({ length: 70 }, () => {
    const d = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize()
    return { d, r: 0.04 + rnd() * rnd() * 0.16 }
  })
  const color = new Float32Array(pos.count * 3)
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize()
    let mar = 0
    for (const [cx, cy, r] of MARES) mar += Math.exp(-((v.x - cx) ** 2 + (v.y - cy) ** 2) / (r * r)) * (v.z > -0.2 ? 1 : 0.5)
    let relieve = 0.5 + 0.5 * Math.sin(v.x * 9 + 1) * Math.sin(v.y * 11 + 2) * Math.sin(v.z * 10 + 3)
    relieve += 0.3 * Math.sin(v.x * 29 + v.y * 23) * Math.sin(v.z * 31 + 4)
    let crater = 0
    for (const c of crateres) {
      const d = Math.sqrt(Math.max(0, 2 - 2 * v.dot(c.d))) / c.r
      crater += d < 1 ? -0.1 * (1 - d) : d < 1.35 ? 0.07 * (1.35 - d) : 0
    }
    // Tycho, abajo, con sus rayos claros.
    const tycho = Math.exp(-((v.x + 0.1) ** 2 + (v.y + 0.8) ** 2) / 0.004) * 0.35
    const rayos = Math.exp(-((v.x + 0.1) ** 2 + (v.y + 0.8) ** 2) / 0.12) * 0.12 * (0.5 + 0.5 * Math.sin(Math.atan2(v.y + 0.8, v.x + 0.1) * 11))
    const brillo = Math.min(0.86, Math.max(0.12, 0.64 - Math.min(mar, 1) * 0.3 + (relieve - 0.5) * 0.09 + crater + tycho + rayos))
    color.set([brillo, brillo * 0.97, brillo * 0.92], i * 3)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(color, 3))
}

/**
 * Luna con una sombra "de la Tierra" opcional, hecha en el shader: un círculo (de radio `UMBRA_EN_LUNAS`)
 * proyectado a lo largo del eje Tierra-Luna. Se usa para los eclipses (cobre) y para la idea errónea (negro).
 * La escala didáctica de la maqueta haría que la sombra real tape a la Luna todos los meses, por eso la
 * sombra no sale del shadow map sino de los ángulos reales del modelo.
 */
export function crearLuna(radio: number) {
  const geo = new THREE.SphereGeometry(1, 96, 64)
  pintarLuna(geo)
  const uSombra = { value: new THREE.Vector4(0, 0, UMBRA_EN_LUNAS, 0.08) }
  const uModo = { value: new THREE.Vector2(0, 1) }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 })
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uSombra = uSombra
    sh.uniforms.uModo = uModo
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;\nuniform vec4 uSombra;\nuniform vec2 uModo;')
      .replace('#include <opaque_fragment>', `#include <opaque_fragment>
        if (uModo.x > 0.0 && vLocal.z > 0.0) {
          float d = length(vLocal.xy - uSombra.xy);
          float s = (1.0 - smoothstep(uSombra.z - uSombra.w, uSombra.z + uSombra.w, d)) * uModo.x;
          vec3 cobre = vec3(0.3, 0.07, 0.03) * uModo.y;
          gl_FragColor.rgb = mix(gl_FragColor.rgb, cobre + gl_FragColor.rgb * 0.04, s);
        }`)
  }
  const mesh = new THREE.Mesh(geo, mat)
  mesh.scale.setScalar(radio)
  return {
    mesh,
    /** `fuerza` 0-1 (0 = sin sombra), `cobre` 0-1 (0 = negra), `suavidad` del borde en radios lunares. */
    setSombra(dx: number, dy: number, fuerza: number, cobre = 1, suavidad = 0.08) {
      uSombra.value.set(dx, dy, UMBRA_EN_LUNAS, suavidad)
      uModo.value.set(fuerza, cobre)
    },
  }
}

// Continentes muy esquemáticos: [longitud, latitud, radio en grados].
const TIERRAS: [number, number, number][] = [
  [-60, -15, 24], [-95, 42, 26], [20, 8, 28], [85, 52, 38], [135, -25, 14], [-42, 72, 12], [100, 20, 14],
]

export const posicionEnTierra = (lat: number, lon: number, radio = 1) =>
  new THREE.Vector3(Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD), Math.cos(lat * RAD) * Math.cos(lon * RAD)).multiplyScalar(radio)

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
    if (v.y < -0.93) c.lerp(hielo, 0.9)
    color.set([c.r, c.g, c.b], i * 3)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(color, 3))
  const esfera = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.05 }))

  // Meridianos y paralelos: dejan ver el giro aunque sea suave.
  const puntos: THREE.Vector3[] = []
  for (let lon = 0; lon < 360; lon += 30)
    for (let lat = -90; lat < 90; lat += 6) puntos.push(posicionEnTierra(lat, lon, 1.004), posicionEnTierra(lat + 6, lon, 1.004))
  for (let lat = -60; lat <= 60; lat += 30)
    for (let lon = 0; lon < 360; lon += 6) puntos.push(posicionEnTierra(lat, lon, 1.004), posicionEnTierra(lat, lon + 6, 1.004))
  const grilla = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(puntos),
    new THREE.LineBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.22 }),
  )
  esfera.add(grilla)

  // El observador: un punto que gira con la Tierra y cambia de hemisferio.
  const observador = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: 0xc6f35e, toneMapped: false }))
  esfera.add(observador)

  const inclinada = new THREE.Group()
  inclinada.rotation.z = 23.4 * RAD
  inclinada.add(esfera)
  inclinada.scale.setScalar(radio)
  return {
    grupo: inclinada,
    girar: (angulo: number) => (esfera.rotation.y = angulo),
    ponerObservador(sur: boolean) {
      observador.position.copy(sur ? posicionEnTierra(-34.6, -58.4, 1.02) : posicionEnTierra(40.4, -3.7, 1.02))
    },
    /** Posición del observador en el mundo (para anclar una etiqueta). */
    posicionObservador: (salida: THREE.Vector3) => observador.getWorldPosition(salida),
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
