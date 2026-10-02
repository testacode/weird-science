// El corte de la Tierra de un borde: capas, agua, zona de fusión, conducto y flechas de las placas.
import * as THREE from 'three'
import { D, type Geo, type Pt } from './geometria'
import { FUSION, type Borde } from './model'
import { rampa } from './nube'

const shape = (puntos: Pt[]) => new THREE.Shape(puntos.map(([x, y]) => new THREE.Vector2(x, y)))

function disponer(g: THREE.Object3D) {
  g.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    o.geometry.dispose()
    ;(Array.isArray(o.material) ? o.material : [o.material]).forEach((m: THREE.Material) => m.dispose())
  })
}

function flecha(largo: number): THREE.Group {
  const material = new THREE.MeshStandardMaterial({ color: 0xc6f35e, emissive: 0xc6f35e, emissiveIntensity: 0.6 })
  const eje = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, largo, 10), material)
  eje.position.y = largo / 2
  const punta = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 14), material)
  punta.position.y = largo + 0.2
  return new THREE.Group().add(eje, punta)
}

/** Brillo que se prende con el avance: el material tiene que ser transparente. */
const brillo = (color: number, opacidad: number) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opacidad, depthWrite: false, blending: THREE.AdditiveBlending })

export function crearBloque(scene: THREE.Scene, borde: Borde, geo: Geo) {
  const grupo = new THREE.Group()
  scene.add(grupo)

  geo.capas.forEach((capa, i) => {
    const material = new THREE.MeshStandardMaterial({ color: capa.color, roughness: 0.92, emissive: capa.color, emissiveIntensity: capa.brillo ?? 0 })
    const malla = new THREE.Mesh(new THREE.ExtrudeGeometry(shape(capa.puntos), { depth: D, bevelEnabled: false }), material)
    // Cada capa un poco más adelante que la anterior: si no, las caras del corte pelean por el mismo plano.
    malla.position.z = -D + i * 0.004
    grupo.add(malla)
  })
  if (geo.agua) {
    const { x0, x1, y0 } = geo.agua
    const agua = new THREE.Mesh(
      new THREE.BoxGeometry(x1 - x0, -y0, D),
      new THREE.MeshPhysicalMaterial({ color: 0x3aa6d8, transparent: true, opacity: 0.3, roughness: 0.15, depthWrite: false }),
    )
    agua.position.set((x0 + x1) / 2, y0 / 2, -D / 2)
    grupo.add(agua)
  }

  // Todo lo que se "pinta" sobre el corte va apenas adelante del plano z = 0.
  const zona = geo.fusion.length ? new THREE.Mesh(new THREE.ShapeGeometry(shape(geo.fusion)), brillo(0xffa23a, 0)) : null
  if (zona) {
    zona.position.z = 0.02
    zona.renderOrder = 1
    grupo.add(zona)
  }
  const camara = geo.camara ? new THREE.Mesh(new THREE.CircleGeometry(1, 32), brillo(0xffc15a, 0)) : null
  if (camara && geo.camara) {
    camara.position.set(geo.camara.x, geo.camara.y, 0.03)
    camara.scale.set(geo.camara.rx, geo.camara.ry, 1)
    camara.renderOrder = 1
    grupo.add(camara)
  }
  const conducto = geo.conducto.length
    ? new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(geo.conducto.map(([x, y]) => new THREE.Vector3(x, y, 0.04))), 40, 0.06, 8),
        brillo(0xffd27a, 0),
      )
    : null
  if (conducto) {
    conducto.renderOrder = 1
    grupo.add(conducto)
  }

  const largo = 0.5 + FUSION[borde].velocidad * 0.2
  for (const f of geo.flechas) {
    const a = flecha(largo)
    const dir = new THREE.Vector3(...f.dir)
    a.position.set(...f.p).addScaledVector(dir, -largo / 2)
    a.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    grupo.add(a)
  }

  return {
    /** `fusion` (0 → 1): la zona se prende primero, el conducto después y la cámara cuando llega el magma. */
    actualizar(fusion: number) {
      const produccion = FUSION[borde].produccion
      if (zona) (zona.material as THREE.MeshBasicMaterial).opacity = 0.55 * rampa(fusion, 0.05, 0.5) * Math.min(1, 0.6 + produccion)
      if (conducto) (conducto.material as THREE.MeshBasicMaterial).opacity = 0.9 * rampa(fusion, 0.35, 0.7)
      if (camara) (camara.material as THREE.MeshBasicMaterial).opacity = 0.8 * rampa(fusion, 0.6, 0.95)
    },
    quitar() {
      scene.remove(grupo)
      disponer(grupo)
    },
  }
}
export type Bloque = ReturnType<typeof crearBloque>
