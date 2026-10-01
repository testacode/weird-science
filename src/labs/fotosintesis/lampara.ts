import * as THREE from 'three'
import { ALTURA_LAMPARA, LUZ_HEX, REBOTE_HEX, lamparaX } from './constantes'
import { ABSORCION, type Config, type Derivados } from './model'

const FOTONES = 90
const VELOCIDAD = 3.6
const TAM_FOTON = 0.055
const HAZ_HASTA = 0.3
const MARCAS_CM = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]

interface Foton {
  vivo: boolean
  pos: THREE.Vector3
  vel: THREE.Vector3
  /** Dónde pega en la planta. */
  hit: THREE.Vector3
  rebotando: boolean
  edad: number
  absorbe: boolean
}

/** Lámpara sobre una regla (se mueve con la distancia), cono de luz y fotones que se absorben o rebotan. */
export function crearLampara(scene: THREE.Scene) {
  const cuerpo = new THREE.Group()
  const metal = new THREE.MeshStandardMaterial({ color: 0x2a3431, roughness: 0.4, metalness: 0.7, side: THREE.DoubleSide })
  const pantalla = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.3, 0.75, 32, 1, true), metal)
  pantalla.rotation.z = Math.PI / 2
  const foco = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffffff, emissiveIntensity: 0 }))
  foco.position.x = -0.12
  const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, ALTURA_LAMPARA, 12), metal)
  poste.position.set(0.15, -ALTURA_LAMPARA / 2, 0)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.1, 28), metal)
  base.position.set(0.15, -ALTURA_LAMPARA + 0.05, 0)
  cuerpo.add(pantalla, foco, poste, base)
  cuerpo.position.y = ALTURA_LAMPARA
  scene.add(cuerpo)

  const focoLuz = new THREE.PointLight(0xffffff, 0, 0, 2)
  focoLuz.position.y = ALTURA_LAMPARA
  scene.add(focoLuz)

  // Cono de luz: angosto en la lámpara, ancho en la planta. Más brillante al centro y hacia la lámpara.
  const hazMat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(0xffffff) }, opacidad: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY;
      void main() { vec4 p = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-p.xyz); vY = uv.y; gl_Position = projectionMatrix * p; }`,
    fragmentShader: `uniform vec3 color; uniform float opacidad; varying vec3 vN; varying vec3 vV; varying float vY;
      void main() { float centro = pow(abs(dot(normalize(vN), normalize(vV))), 1.6); gl_FragColor = vec4(color, centro * opacidad * mix(1.0, 0.35, vY)); }`,
  })
  const haz = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.5, 1, 40, 1, true), hazMat)
  haz.rotation.z = Math.PI / 2
  haz.position.y = ALTURA_LAMPARA
  scene.add(haz)

  // Regla con marcas cada 5 cm sobre la mesada.
  const regla = new THREE.Mesh(
    new THREE.BoxGeometry(lamparaX(60) - lamparaX(10) + 0.6, 0.03, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x7d8a82, roughness: 0.7 }),
  )
  regla.position.set((lamparaX(10) + lamparaX(60)) / 2, 0.015, 1.45)
  scene.add(regla)
  const marcas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.035, 0.18), new THREE.MeshBasicMaterial({ color: 0x07100f }), MARCAS_CM.length)
  const m = new THREE.Matrix4()
  MARCAS_CM.forEach((cm, i) => marcas.setMatrixAt(i, m.makeTranslation(lamparaX(cm), 0.032, cm % 10 === 0 ? 1.45 : 1.5)))
  scene.add(marcas)

  // Fotones: una InstancedMesh con color por instancia.
  const puntos = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ toneMapped: false }), FOTONES)
  puntos.frustumCulled = false
  scene.add(puntos)
  const fotones: Foton[] = Array.from({ length: FOTONES }, () => ({
    vivo: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), hit: new THREE.Vector3(), rebotando: false, edad: 0, absorbe: false,
  }))
  const color = new THREE.Color()
  const giro = new THREE.Quaternion()
  const escala = new THREE.Vector3()
  let acumulado = 0
  let x = lamparaX(20)

  function emitir(xLampara: number, hex: number) {
    const f = fotones.find((p) => !p.vivo)
    if (!f) return
    f.vivo = true
    f.rebotando = false
    f.edad = 0
    f.pos.set(xLampara - 0.5, ALTURA_LAMPARA + (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8)
    f.hit.set(0.1 + Math.random() * 0.2, 0.6 + Math.random() * 1.6, (Math.random() - 0.5) * 0.7)
    f.vel.subVectors(f.hit, f.pos).normalize().multiplyScalar(VELOCIDAD)
    puntos.setColorAt(fotones.indexOf(f), color.setHex(hex))
    if (puntos.instanceColor) puntos.instanceColor.needsUpdate = true
  }

  return {
    /** Mueve la lámpara, ajusta color e intensidad y anima los fotones. `dt` en segundos reales. */
    actualizar(c: Config, d: Derivados, dt: number) {
      x += (lamparaX(c.distancia) - x) * Math.min(1, dt * 9)
      cuerpo.position.x = x
      focoLuz.position.x = x - 0.6
      const hex = LUZ_HEX[c.color]
      const brillo = c.encendida ? 0.35 + 0.65 * (d.llega / 100) : 0
      ;(foco.material as THREE.MeshStandardMaterial).emissive.setHex(c.encendida ? hex : 0x000000)
      ;(foco.material as THREE.MeshStandardMaterial).emissiveIntensity = c.encendida ? 2 : 0
      focoLuz.color.setHex(hex)
      // La caída con la distancia la pone la propia luz (inverso del cuadrado).
      focoLuz.intensity = c.encendida ? 2.5 : 0
      const largo = Math.max(0.2, x - 0.6 - HAZ_HASTA)
      haz.scale.set(1, largo, 1)
      haz.position.x = HAZ_HASTA + largo / 2
      hazMat.uniforms.color.value.setHex(hex)
      hazMat.uniforms.opacidad.value = 0.55 * brillo

      acumulado += (c.encendida ? 1.5 + 34 * (d.llega / 100) : 0) * dt
      while (acumulado >= 1) {
        acumulado -= 1
        emitir(x, hex)
      }
      fotones.forEach((f, i) => {
        let tam = TAM_FOTON
        if (f.vivo) {
          f.edad += dt
          f.pos.addScaledVector(f.vel, dt)
          if (!f.rebotando && f.pos.x <= f.hit.x) {
            f.absorbe = Math.random() < ABSORCION[c.color]
            f.rebotando = true
            f.edad = 0
            if (f.absorbe) f.vel.set(0, 0.5, 0)
            else {
              f.vel.set(1 + Math.random() * 1.4, (Math.random() - 0.3) * 1.6, (Math.random() - 0.5) * 2)
              puntos.setColorAt(i, color.setHex(c.color === 'blanca' ? REBOTE_HEX : hex))
              if (puntos.instanceColor) puntos.instanceColor.needsUpdate = true
            }
          }
          if (f.rebotando) {
            const vida = f.absorbe ? 0.18 : 0.9
            tam = f.absorbe ? TAM_FOTON * (1 + 2.2 * (f.edad / vida)) * (1 - f.edad / vida) * 1.6 : TAM_FOTON * (1 - f.edad / vida)
            if (f.edad >= vida) f.vivo = false
          }
        }
        if (!f.vivo) tam = 0
        puntos.setMatrixAt(i, m.compose(f.pos, giro, escala.setScalar(Math.max(tam, 0))))
      })
      puntos.instanceMatrix.needsUpdate = true
    },
    get x() {
      return x
    },
  }
}
