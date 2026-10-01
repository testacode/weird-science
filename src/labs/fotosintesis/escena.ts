import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { encuadrarEntreHuds } from '../../escena/encuadre'
import { crearEscenario } from '../../escena/escenario'
import { crearPildoras } from '../../escena/pildoras'
import { crearBurbujas } from './burbujas'
import { VASO, lamparaX } from './constantes'
import { crearLampara } from './lampara'
import { crearLupa, CENTRO_LUPA } from './lupa'
import { P_MAX, type Config, type Derivados, type Estado } from './model'
import { crearPlanta } from './planta'
import { crearVaso } from './vaso'

/** Lo que tiene que entrar a lo ancho y a lo alto (unidades del mundo): del vaso a la lámpara más lejana, de la mesada a la lupa. */
const ANCHO_MUNDO = 8.6
const ALTO_MUNDO = 7
const CENTRO = new THREE.Vector3(2.3, 2.3, 0)

const MARCAS_REGLA = [10, 20, 30, 40, 50, 60]

export function crearEscena(contenedor: HTMLElement) {
  const { scene, camera, renderer, render } = crearEscenario(contenedor)
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture

  const controles = new OrbitControls(camera, renderer.domElement)
  controles.target.copy(CENTRO)
  controles.enableDamping = true
  controles.maxPolarAngle = Math.PI * 0.49
  controles.enablePan = false

  // Aleja la cámara hasta que la maqueta entre en el hueco que dejan los HUD (el kit la centra en ese hueco).
  camera.position.copy(CENTRO).add(new THREE.Vector3(0.1, 0.9, 3))
  encuadrarEntreHuds(camera, contenedor, ({ libre, alto }) => {
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const distancia = Math.max((ANCHO_MUNDO * alto) / (Math.max(libre, 360) * 2 * tanV), ALTO_MUNDO / (2 * tanV)) * 1.04
    const direccion = camera.position.clone().sub(controles.target)
    if (direccion.lengthSq() < 1e-6) direccion.set(0.05, 0.3, 1)
    camera.position.copy(controles.target).addScaledVector(direccion.normalize(), distancia)
    controles.minDistance = distancia * 0.55
    controles.maxDistance = distancia * 1.3
    // La niebla acompaña a la distancia: si no, con la cámara lejos la maqueta se apaga.
    scene.fog = new THREE.Fog(0x07100f, distancia + 12, distancia + 34)
  })

  const vaso = crearVaso(scene)
  const planta = crearPlanta(scene)
  const lampara = crearLampara(scene)
  const burbujas = crearBurbujas(scene)
  const lupa = crearLupa(scene, camera)

  // Etiquetas HTML ancladas a la maqueta.
  const etiquetas = [
    { id: 'planta', texto: 'Elodea (planta acuática)', ancla: new THREE.Vector3(-0.2, 0.1, 1.3) },
    { id: 'agua', texto: 'Agua con CO₂', ancla: new THREE.Vector3(0, VASO.nivel - 0.4, VASO.radio) },
    { id: 'lampara', texto: 'Lámpara', ancla: new THREE.Vector3(0, 2.75, 0) },
    { id: 'celula', texto: 'Célula de la hoja', ancla: new THREE.Vector3(CENTRO_LUPA.x, CENTRO_LUPA.y + 1.3, CENTRO_LUPA.z) },
    { id: 'cloroplasto', texto: 'Cloroplastos', ancla: new THREE.Vector3(CENTRO_LUPA.x, CENTRO_LUPA.y - 1.3, CENTRO_LUPA.z) },
    ...MARCAS_REGLA.map((cm) => ({ id: `cm${cm}`, texto: `${cm}`, ancla: new THREE.Vector3(lamparaX(cm), 0, 1.95) })),
  ]
  const rotulos = crearPildoras(contenedor, camera)
  const pildoras = etiquetas.map((e) => rotulos.crear(e.texto, { ancla: e.ancla, clase: e.id.startsWith('cm') ? 'regla' : '' }))
  const lamp = pildoras[etiquetas.findIndex((e) => e.id === 'lampara')]
  function ubicarPildoras(c: Config) {
    lamp.texto(c.encendida ? `Lámpara · ${c.distancia} cm` : 'Lámpara apagada')
    lamp.ancla.x = lampara.x
    lamp.el.classList.toggle('activa', c.encendida)
    rotulos.ubicar()
  }

  let burbujasVistas = 0
  let anterior = 0

  return {
    reiniciar() {
      burbujasVistas = 0
    },
    /** `ahora` en segundos reales. */
    dibujar(estado: Estado, config: Config, d: Derivados, ahora: number) {
      const dt = Math.min(ahora - anterior, 0.1)
      anterior = ahora
      if (estado.burbujas > burbujasVistas) burbujas.emitir(Math.min(estado.burbujas - burbujasVistas, 4), ahora)
      burbujasVistas = estado.burbujas
      const actividad = d.bruta / P_MAX
      vaso.actualizar(config.co2)
      planta.brillar(actividad)
      lampara.actualizar(config, d, dt)
      burbujas.actualizar(config.co2, actividad, ahora, dt)
      lupa.actualizar(actividad, ahora)
      ubicarPildoras(config)
      controles.update()
      render()
    },
  }
}

