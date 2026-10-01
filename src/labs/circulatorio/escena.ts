import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { encuadrarEntreHuds } from '../../escena/encuadre'
import { crearEscenario, FONDO } from '../../escena/escenario'
import { crearPildoras } from '../../escena/pildoras'
import { numero } from '../../ui/formato'
import { crearCorazon } from './corazon'
import type { Config, Derivados, Estado } from './model'
import { crearOrganos } from './organos'
import { crearParticulas } from './particulas'
import { AGUJERO_Y, CAMARA_X, VALVULA_Y } from './trayecto'

/** Lo que tiene que entrar a lo ancho (la maqueta, base incluida) y a lo alto. */
const ANCHO_MAQUETA = 7.6
const ALTO_MUNDO = 9.8
const CENTRO = new THREE.Vector3(0, 0.55, 0)

export function crearEscena(contenedor: HTMLElement, svoInicial: number) {
  const { scene, camera, renderer, render } = crearEscenario(contenedor, { bloom: 0.25, niebla: { cerca: 40, lejos: 80 } })
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture

  const controles = new OrbitControls(camera, renderer.domElement)
  controles.target.copy(CENTRO)
  controles.enableDamping = true
  controles.enablePan = false
  controles.maxPolarAngle = Math.PI * 0.55
  camera.position.copy(CENTRO).add(new THREE.Vector3(0, 0.4, 5))
  encuadrarEntreHuds(camera, contenedor, ({ libre, alto }) => {
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const distancia = Math.max((ANCHO_MAQUETA * alto) / (Math.max(libre, 300) * 2 * tan), ALTO_MUNDO / (2 * tan)) * 1.04
    const direccion = camera.position.clone().sub(controles.target).normalize()
    camera.position.copy(controles.target).addScaledVector(direccion, distancia)
    controles.minDistance = distancia * 0.5
    controles.maxDistance = distancia * 1.4
    scene.fog = new THREE.Fog(FONDO, distancia + 20, distancia + 50)
  })

  const luz = new THREE.DirectionalLight(0xffffff, 1.3)
  luz.position.set(3, 9, 7)
  const acento = new THREE.PointLight(0xff5a5a, 18, 24)
  acento.position.set(-4, 3, 4)
  scene.add(luz, acento)

  const corazon = crearCorazon(scene)
  const organos = crearOrganos(scene)
  const sangre = crearParticulas(scene, svoInicial)

  const rotulos = crearPildoras(contenedor, camera)
  const fijo = (texto: string, x: number, y: number, z = 0.5, origen: 'izquierda' | 'derecha' | 'centro' = 'centro', dx = 0, dy = 0) =>
    rotulos.crear(texto, { ancla: new THREE.Vector3(x, y, z), origen, dx, dy })
  fijo('Aurícula derecha', -CAMARA_X, 2.95, 0.5, 'centro', 0, -4)
  fijo('Ventrículo derecho', -CAMARA_X, -0.45, 0.5, 'centro', 0, 8)
  fijo('Aurícula izquierda', CAMARA_X, 2.95, 0.5, 'centro', 0, -4)
  fijo('Ventrículo izquierdo', CAMARA_X, -0.45, 0.5, 'centro', 0, 8)
  fijo('Tabique', 0, -0.95, 0.5)
  const pulmon = fijo('', -2.6, 5.15, 0.3, 'izquierda')
  const cuerpo = fijo('', -3.0, -3.55, 0.5, 'izquierda')
  const fuga = fijo('Válvula con fuga', CAMARA_X, VALVULA_Y, 0.4, 'izquierda', 40, 0)
  const agujero = fijo('Agujero en el tabique', 0, AGUJERO_Y, 0.5, 'centro', 0, 26)
  fuga.el.hidden = agujero.el.hidden = true

  let fase = 0
  let tiempo = 0
  return {
    /** `dt`: segundos reales (0 en pausa). El corazón late en tiempo real; la química de la sangre va acelerada. */
    dibujar(c: Config, d: Derivados, e: Estado, dt: number) {
      const anterior = fase
      fase = (fase + (dt * c.frecuencia) / 60) % 1
      tiempo += dt
      const fs = (d.sistole * c.frecuencia) / 60
      corazon.actualizar(c, d, e, fase, dt)
      organos.actualizar(d, e, tiempo)
      sangre.actualizar(dt, fase, fs, fase < anterior, d.pulmones, d.cuerpo, c.defecto === 'valvula' ? c.gravedad : 0, c.defecto === 'tabique' ? c.gravedad : 0, e.svo2)

      pulmon.texto(`Pulmones · ${numero(d.pulmones, 1)} L/min`)
      cuerpo.texto(`Cuerpo · ${numero(d.cuerpo, 1)} L/min`)
      fuga.el.hidden = c.defecto !== 'valvula'
      agujero.el.hidden = c.defecto !== 'tabique'
      rotulos.ubicar()
      controles.update()
      render()
    },
  }
}
