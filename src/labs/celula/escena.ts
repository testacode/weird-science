import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { encuadrarEntreHuds } from '../../escena/encuadre'
import { crearEscenario } from '../../escena/escenario'
import { crearPildoras } from '../../escena/pildoras'
import { numero } from '../../ui/formato'
import { VASO } from './cuerpo'
import { crearGlobulo } from './globulo'
import { CELULAS, relativa, type Entorno, type Lectura } from './model'
import { crearParticulas } from './particulas'
import { crearVegetal } from './vegetal'

/** Partículas de maqueta por unidad de concentración / de volumen de agua / de soluto que entró. */
const SAL_POR_R = 34
const AGUA_DENTRO = 60
const SAL_DENTRO_POR_S = 22
/** Cruces por segundo de agua en cada sentido cuando está en equilibrio. */
const INTERCAMBIO = 5
/** Flujo (1/s) por encima del cual se dice "entra" o "sale". */
const UMBRAL_FLUJO = 0.02
const ANCHO_MAQUETA = 5.2
const ALTO_MAQUETA = 4.6

export function crearEscena(contenedor: HTMLElement) {
  const { scene, camera, renderer, render } = crearEscenario(contenedor, { bloom: 0.06, niebla: { cerca: 20, lejos: 45 } })
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
  const centro = new THREE.Vector3(0, VASO.centroY, 0)
  const controles = new OrbitControls(camera, renderer.domElement)
  controles.target.copy(centro)
  controles.enableDamping = true
  controles.enablePan = false
  controles.maxPolarAngle = Math.PI * 0.52
  camera.position.set(0.4, 5.2, 6.6)
  encuadrarEntreHuds(camera, contenedor, ({ libre, alto }) => {
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const distancia = Math.max((ANCHO_MAQUETA * alto) / (Math.max(libre, 300) * 2 * tan), ALTO_MAQUETA / (2 * tan)) * 1.05
    const direccion = camera.position.clone().sub(controles.target).normalize()
    camera.position.copy(controles.target).addScaledVector(direccion, distancia)
    controles.minDistance = distancia * 0.5
    controles.maxDistance = distancia * 1.4
  })

  // --- Mesada y vaso ---
  const mesada = new THREE.Mesh(new RoundedBoxGeometry(6.4, 0.4, 4.2, 4, 0.12), new THREE.MeshStandardMaterial({ color: 0x17221f, roughness: 0.55, metalness: 0.3 }))
  mesada.position.y = -0.2
  const piso = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x0a1413, roughness: 0.9 }))
  piso.rotation.x = -Math.PI / 2
  piso.position.y = -0.42
  const vidrio = new THREE.MeshPhysicalMaterial({ color: 0xcfeee6, roughness: 0.05, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false })
  const alto = VASO.tope - VASO.base
  const pared = new THREE.Mesh(new THREE.CylinderGeometry(VASO.radio, VASO.radio, alto, 64, 1, true), vidrio)
  pared.position.y = VASO.base + alto / 2
  const base = new THREE.Mesh(new THREE.CylinderGeometry(VASO.radio, VASO.radio, 0.1, 64), vidrio)
  base.position.y = VASO.base
  const borde = new THREE.Mesh(new THREE.TorusGeometry(VASO.radio, 0.03, 8, 64), new THREE.MeshStandardMaterial({ color: 0xcfeee6, roughness: 0.2, transparent: true, opacity: 0.6 }))
  borde.rotation.x = Math.PI / 2
  borde.position.y = VASO.tope
  const alturaLiquido = VASO.liquido - VASO.base
  const colorLiquido = new THREE.Color(0x2c8fb0)
  const liquido = new THREE.Mesh(
    new THREE.CylinderGeometry(VASO.radio - 0.03, VASO.radio - 0.03, alturaLiquido, 64),
    new THREE.MeshPhysicalMaterial({ color: colorLiquido, roughness: 0.1, transparent: true, opacity: 0.16, depthWrite: false }),
  )
  liquido.position.y = VASO.base + alturaLiquido / 2
  liquido.renderOrder = 1
  scene.add(mesada, piso, pared, base, borde, liquido)

  const luz = new THREE.DirectionalLight(0xffffff, 1.1)
  luz.position.set(4, 9, 7)
  const ambar = new THREE.PointLight(0xffc857, 30, 24)
  ambar.position.set(-6, 3, 4)
  const cielo = new THREE.PointLight(0x5ec8ff, 30, 24)
  cielo.position.set(6, 1, 4)
  scene.add(luz, ambar, cielo)

  // --- Célula y partículas (en un grupo centrado en la célula) ---
  const mundo = new THREE.Group()
  mundo.position.copy(centro)
  const globulo = crearGlobulo()
  const vegetal = crearVegetal()
  mundo.add(globulo.grupo, vegetal.grupo)
  const particulas = crearParticulas(mundo)
  scene.add(mundo)

  const pildoras = crearPildoras(contenedor, camera)
  const pVaso = pildoras.crear('', { ancla: new THREE.Vector3(0, VASO.tope + 0.3, 0) })
  const pCelula = pildoras.crear('', { ancla: new THREE.Vector3(0, VASO.centroY - 1.25, 0) })
  const pFlujo = pildoras.crear('', { ancla: new THREE.Vector3(0, VASO.centroY + 1.25, 0) })

  let celula = CELULAS.globulo
  let rojo = 0
  // La malla del glóbulo se rehace solo si cambió el volumen o la rotura.
  let ultimo = { v: NaN, rota: false }
  const colorRojo = new THREE.Color(0xd9363e)
  const cuerpoActual = (ent: Entorno) => (ent.celula === 'globulo' ? globulo.cuerpo : vegetal.cuerpo)

  return {
    /** Célula nueva en reposo (v = 1), con la solución y la membrana que haya en `ent`. */
    reiniciar(ent: Entorno) {
      celula = CELULAS[ent.celula]
      globulo.grupo.visible = ent.celula === 'globulo'
      vegetal.grupo.visible = ent.celula === 'vegetal'
      globulo.actualizar(1, false)
      ultimo = { v: 1, rota: false }
      vegetal.actualizar(1, ent.pared, false)
      rojo = 0
      particulas.reiniciar(cuerpoActual(ent), AGUA_DENTRO)
    },
    dibujar(ent: Entorno, l: Lectura, dt: number) {
      if (ent.celula === 'globulo') {
        if (l.v !== ultimo.v || l.rota !== ultimo.rota) globulo.actualizar(l.v, l.rota)
        ultimo = { v: l.v, rota: l.rota }
      } else vegetal.actualizar(l.v, ent.pared, l.rota)
      particulas.actualizar(dt, {
        cuerpo: l.rota ? null : cuerpoActual(ent),
        aguaDentro: AGUA_DENTRO * l.agua,
        salFuera: relativa(ent) * SAL_POR_R,
        salDentro: l.s * SAL_DENTRO_POR_S,
        intercambio: INTERCAMBIO,
      })
      // La hemoglobina que se escapa tiñe el líquido.
      rojo += ((l.rota && ent.celula === 'globulo' ? 1 : 0) - rojo) * Math.min(1, dt * 0.6)
      ;(liquido.material as THREE.MeshPhysicalMaterial).color.copy(colorLiquido).lerp(colorRojo, rojo * 0.7)

      pVaso.texto(`Solución · ${numero(ent.pct, 2)} % de sal`)
      pCelula.texto(l.rota ? `${celula.nombre} · estalló` : `${celula.nombre} · ${numero(l.v, 2)}×`)
      const sentido = l.rota ? '' : l.flujo > UMBRAL_FLUJO ? 'El agua entra' : l.flujo < -UMBRAL_FLUJO ? 'El agua sale' : 'Agua en equilibrio'
      pFlujo.texto(sentido)
      pFlujo.el.hidden = !sentido
      pFlujo.el.classList.toggle('activa', Math.abs(l.flujo) > UMBRAL_FLUJO)
      pildoras.ubicar()
      controles.update()
      render()
    },
  }
}
