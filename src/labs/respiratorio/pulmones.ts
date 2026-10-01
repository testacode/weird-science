import * as THREE from 'three'
import { colorSangre, LATIDOS } from './constantes'
import type { Actividad } from './model'

/** Medidas de la maqueta (1 unidad ≈ 5 cm, la tráquea está alargada para que se vea el aire entrar). */
export const GEO = { plinto: 0.5, base: 0.62, domo: 0.78, pulmonAlto: 3.2, pulmonAncho: 1.0, ladoX: 1.12, carina: 3.95, traqueaTope: 5.9 }
/** Y del ápice de los pulmones (fijo: al inspirar se estiran hacia abajo, siguiendo al diafragma). */
export const APICE = GEO.base + GEO.domo + GEO.pulmonAlto

const tubo = (a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, a.distanceTo(b), 10), mat)
  m.position.copy(a).add(b).multiplyScalar(0.5)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
  return m
}

const vidrio = (color: number, opacity: number) =>
  new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity, roughness: 0.12, clearcoat: 1, envMapIntensity: 0.4, depthWrite: false, side: THREE.DoubleSide })

/** Pulmón de vidrio con su árbol de bronquios. El origen es el ápice: al escalar en Y se estira hacia abajo. */
function crearPulmon(lado: 1 | -1) {
  const grupo = new THREE.Group()
  grupo.position.set(lado * GEO.ladoX, APICE, 0)
  const g = new THREE.SphereGeometry(1, 44, 30)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i)
    const y = p.getY(i)
    // El lado que mira al centro es más plano (ahí va el corazón).
    if (x * -lado > 0) x *= 0.62
    p.setXYZ(i, x * GEO.pulmonAncho, (y - 1) * (GEO.pulmonAlto / 2), p.getZ(i) * 0.85)
  }
  g.computeVertexNormals()
  grupo.add(new THREE.Mesh(g, vidrio(0xffc2d0, 0.17)))

  const rosa = new THREE.MeshStandardMaterial({ color: 0xff9fb4, emissive: 0xff6f8f, emissiveIntensity: 0.25, roughness: 0.4, transparent: true, opacity: 0.85 })
  const v = (x: number, y: number, z = 0) => new THREE.Vector3(x * lado, y, z)
  const hilio = v(-0.5, -0.9)
  const ramas: [THREE.Vector3, THREE.Vector3[]][] = [
    [v(0.05, -0.55, 0.1), [v(0.35, -0.3, 0.2), v(0.2, -0.45, -0.3)]],
    [v(0.2, -1.5, 0.15), [v(0.5, -1.4, 0.3), v(0.4, -1.9, -0.2)]],
    [v(0.05, -2.35, -0.1), [v(0.3, -2.6, 0.1), v(0.1, -2.7, -0.3)]],
  ]
  for (const [medio, puntas] of ramas) {
    grupo.add(tubo(hilio, medio, 0.05, rosa))
    for (const punta of puntas) {
      grupo.add(tubo(medio, punta, 0.03, rosa))
      const alveolos = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), rosa)
      alveolos.position.copy(punta)
      grupo.add(alveolos)
    }
  }
  // Bronquio principal: de la carina (en el eje) al hilio, escalado junto con el pulmón.
  grupo.add(tubo(new THREE.Vector3(-lado * GEO.ladoX, GEO.carina - APICE, 0), hilio, 0.075, rosa))
  return grupo
}

/** Maqueta del tórax: pulmones de vidrio, tráquea, diafragma, costillas y un corazón esquemático. */
export function crearPulmones(scene: THREE.Scene) {
  const pulmones = [crearPulmon(-1), crearPulmon(1)]
  scene.add(...pulmones)

  const traquea = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, GEO.traqueaTope - GEO.carina, 24, 1, true), vidrio(0xdfffee, 0.2))
  traquea.position.y = (GEO.traqueaTope + GEO.carina) / 2
  const cartilago = new THREE.MeshStandardMaterial({ color: 0xe9d9cf, roughness: 0.5, transparent: true, opacity: 0.4 })
  for (let y = GEO.carina + 0.2; y < GEO.traqueaTope; y += 0.3) {
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.018, 6, 24), cartilago)
    anillo.rotation.x = Math.PI / 2
    anillo.position.y = y
    scene.add(anillo)
  }
  scene.add(traquea)

  // Plinto y diafragma (un domo que baja al inspirar).
  const plinto = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, GEO.plinto, 56), new THREE.MeshStandardMaterial({ color: 0x14201e, roughness: 0.5, metalness: 0.3 }))
  plinto.scale.set(2.6, 1, 1.45)
  plinto.position.y = GEO.plinto / 2
  const borde = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 72), new THREE.MeshBasicMaterial({ color: 0xc6f35e }))
  borde.rotation.x = Math.PI / 2
  borde.scale.set(2.6, 1.45, 1)
  borde.position.y = GEO.plinto
  const diafragma = new THREE.Mesh(
    new THREE.SphereGeometry(1, 56, 18, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xc4455f, emissive: 0x4a0f1c, roughness: 0.55, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
  )
  diafragma.position.y = GEO.base
  const aroDiafragma = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 72), new THREE.MeshStandardMaterial({ color: 0xd9667c, roughness: 0.5 }))
  aroDiafragma.rotation.x = Math.PI / 2
  aroDiafragma.position.y = GEO.base
  scene.add(plinto, borde, diafragma, aroDiafragma)

  // Corazón esquemático y sus dos vasos hacia cada pulmón (oscuro va al pulmón, vivo vuelve).
  const material = new THREE.MeshStandardMaterial({ color: 0xff4a4a, emissive: 0xff4a4a, emissiveIntensity: 0.3, roughness: 0.4 })
  const corazon = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), material)
  corazon.scale.set(0.34, 0.42, 0.3)
  corazon.rotation.z = 0.35
  corazon.position.set(-0.12, GEO.base + 1.55, 0.25)
  const sangreOscura = new THREE.MeshStandardMaterial({ color: 0x6d1226, emissive: 0x6d1226, emissiveIntensity: 0.3, roughness: 0.4 })
  const origen = corazon.position.clone().add(new THREE.Vector3(0, 0.38, 0))
  const vasos = [-1, 1].flatMap((lado) => {
    const destino = new THREE.Vector3(lado * 0.75, GEO.carina - 0.2, 0.3)
    const a = origen.clone().add(new THREE.Vector3(lado * 0.06, 0, 0.05))
    return [tubo(a, destino, 0.035, sangreOscura), tubo(a.clone().add(new THREE.Vector3(0, 0, 0.1)), destino.clone().add(new THREE.Vector3(0, 0.12, 0.1)), 0.035, material)]
  })
  scene.add(corazon, ...vasos)

  let latido = 0
  const color = new THREE.Color()
  return {
    /**
     * `dy`: cuánto baja el diafragma (unidades). `ensancha`: cuánto se abre el tórax (1 = nada).
     * `spo2` tiñe la sangre; `dt` en segundos y 0 si está en pausa.
     */
    actualizar(dy: number, ensancha: number, spo2: number, actividad: Actividad, dt: number) {
      const alto = Math.max(GEO.domo - dy, 0.06)
      diafragma.scale.set(2.3 * ensancha, alto, 1.25 * ensancha)
      aroDiafragma.scale.set(2.3 * ensancha, 1.25 * ensancha, 1)
      const estiramiento = (GEO.pulmonAlto + dy) / GEO.pulmonAlto
      pulmones.forEach((p) => p.scale.set(ensancha, estiramiento, ensancha))
      latido += (dt * LATIDOS[actividad] * Math.PI * 2) / 60
      corazon.scale.set(0.34, 0.42, 0.3).multiplyScalar(1 + 0.09 * Math.max(0, Math.sin(latido)) ** 3)
      colorSangre(spo2, color)
      material.color.copy(color)
      material.emissive.copy(color)
    },
    /** Punto del pulmón (coordenadas del pulmón, se escala con él) en el mundo. */
    punto: (lado: 1 | -1, local: THREE.Vector3, destino: THREE.Vector3) => pulmones[lado === 1 ? 1 : 0].localToWorld(destino.copy(local)),
  }
}
