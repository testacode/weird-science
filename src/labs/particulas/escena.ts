import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { crearEscenario } from '../../escena/escenario'
import { GAS, N, RADIO, R_INT, Y_BORDE, Y_SALA, crearDinamica } from './dinamica'
import { CERO_ABSOLUTO_C, T_TOPE_CALOR, T_TOPE_FRIO, type Config, type Lectura, type Sustancia } from './model'

/** Un color por estado, el mismo en la escena, el texto, el gráfico y la leyenda. */
export const COLOR_FASE = [0x5ec8ff, 0xc6f35e, 0xff5fa2]
const AMBAR = 0xffc857
const CIELO = 0x5ec8ff

const X_VASO = -0.3
const X_TERMO = 2.3
const Y_PISO_PLACA = -0.12
const Y_TAPA_CERRADA = Y_BORDE + 0.1
const Y_TAPA_ABIERTA = 4.5
/** Ancho de la zona libre entre los dos HUD que tiene que entrar en cámara. */
const HUD_IZQ = 400
const HUD_DER = 350
const ANCHO_MAQUETA = 6.4

export function crearEscena(contenedor: HTMLElement) {
  const { scene, camera, renderer, render } = crearEscenario(contenedor)
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
  const controles = new OrbitControls(camera, renderer.domElement)
  controles.target.set(0.1, 1.5, 0)
  controles.enableDamping = true
  controles.minDistance = 6
  controles.maxDistance = 17
  controles.maxPolarAngle = Math.PI * 0.55

  // Cámara: que la maqueta entre en el hueco entre el HUD izquierdo y la consola derecha.
  const encuadrar = () => {
    const { clientWidth: w, clientHeight: h } = contenedor
    const libre = Math.max(w - HUD_IZQ - HUD_DER, 200)
    const dist = Math.max(11.5, ANCHO_MAQUETA / ((libre / w) * (w / h) * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))))
    camera.position.set(0.1, 2.9, dist)
    // Corre el cuadro para que el centro de la maqueta quede en el centro del hueco libre.
    camera.setViewOffset(w, h, -(HUD_IZQ - HUD_DER) / 2, 0, w, h)
  }
  encuadrar()
  window.addEventListener('resize', encuadrar)

  const grupo = new THREE.Group()
  grupo.position.x = X_VASO
  scene.add(grupo)

  // --- Mesada y placa ---
  const mesada = new THREE.Mesh(new RoundedBoxGeometry(8.4, 0.45, 3.8, 4, 0.12), new THREE.MeshStandardMaterial({ color: 0x17221f, roughness: 0.55, metalness: 0.3 }))
  mesada.position.set(0.1, -0.695, 0)
  const borde = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: 0xc6f35e }))
  borde.position.set(0.1, -0.48, 1.9)
  const piso = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: 0x0a1413, roughness: 0.9 }))
  piso.rotation.x = -Math.PI / 2
  piso.position.y = -0.95
  scene.add(mesada, borde, piso)

  const placa = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.15, 0.35, 56), new THREE.MeshStandardMaterial({ color: 0x1d2a27, roughness: 0.4, metalness: 0.6 }))
  placa.position.y = Y_PISO_PLACA - 0.175
  const brasa = new THREE.MeshStandardMaterial({ color: 0x111a18, emissive: AMBAR, emissiveIntensity: 0, roughness: 0.5 })
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.02, 56), brasa)
  disco.position.y = Y_PISO_PLACA + 0.004
  grupo.add(placa, disco)

  // --- Vaso de vidrio ---
  const perfil = [
    [0, -0.12], [1.3, -0.12], [1.5, -0.06], [1.56, 0.04], [1.56, Y_BORDE], [1.62, Y_BORDE + 0.05], [1.5, Y_BORDE + 0.05],
    [R_INT, Y_BORDE], [R_INT, 0.14], [1.3, 0.02], [0, 0.02],
  ].map(([r, y]) => new THREE.Vector2(r, y))
  // Vidrio transparente (no "transmission"): las partículas se dibujan antes y se ven nítidas a través.
  const vidrio = new THREE.MeshPhysicalMaterial({
    color: 0x7fa89a, transparent: true, opacity: 0.1, roughness: 0.1, envMapIntensity: 0.4, specularIntensity: 0.05, depthWrite: false, side: THREE.DoubleSide,
  })
  const vaso = new THREE.Mesh(new THREE.LatheGeometry(perfil, 64), vidrio)
  grupo.add(vaso)

  // --- Tapa (olla a presión) ---
  const materialTapa = new THREE.MeshStandardMaterial({ color: 0x9fd9c9, roughness: 0.3, metalness: 0.4, transparent: true, opacity: 0.3 })
  const valvula = new THREE.MeshStandardMaterial({ color: 0x33403c, emissive: COLOR_FASE[GAS], emissiveIntensity: 0, roughness: 0.4 })
  const tapa = new THREE.Group()
  tapa.add(new THREE.Mesh(new THREE.CylinderGeometry(1.68, 1.68, 0.1, 64), materialTapa))
  const perilla = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.24, 20), valvula)
  perilla.position.y = 0.17
  tapa.add(perilla)
  tapa.position.y = Y_TAPA_ABIERTA
  grupo.add(tapa)

  // --- Partículas: una sola InstancedMesh, el color depende de la fase de cada una ---
  const din = crearDinamica()
  const bolitas = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ color: 0x6a6a6a, roughness: 0.5, metalness: 0, envMapIntensity: 0.6 }), N)
  bolitas.frustumCulled = false
  grupo.add(bolitas)
  const colorPorFase = COLOR_FASE.map((c) => new THREE.Color(c))
  const ultimaFase = new Int8Array(N).fill(-1)
  const matriz = new THREE.Matrix4()
  const pos = new THREE.Vector3()
  const giro = new THREE.Quaternion()
  const escala = new THREE.Vector3(RADIO, RADIO, RADIO)

  // --- Termómetro de columna ---
  const termo = new THREE.Group()
  termo.position.set(X_TERMO, -0.47, 0.2)
  const tubo = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.6, 20), new THREE.MeshPhysicalMaterial({ color: 0x7fa89a, transparent: true, opacity: 0.25, roughness: 0.1, envMapIntensity: 0.4, depthWrite: false }))
  tubo.position.y = 1.95
  const bulbo = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 16), new THREE.MeshBasicMaterial({ color: AMBAR, toneMapped: false }))
  bulbo.position.y = 0.3
  const columna = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 12), new THREE.MeshBasicMaterial({ color: AMBAR, toneMapped: false }))
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.1, 28), new THREE.MeshStandardMaterial({ color: 0x1d2a27, roughness: 0.4, metalness: 0.6 }))
  base.position.y = 0.05
  const marcas = new THREE.Group()
  for (let i = 0; i <= 10; i++) {
    const marca = new THREE.Mesh(new THREE.BoxGeometry(i % 5 === 0 ? 0.22 : 0.12, 0.012, 0.012), new THREE.MeshBasicMaterial({ color: 0x93a8a0 }))
    marca.position.set(0.2, 0.75 + (i / 10) * 2.6, 0.06)
    marcas.add(marca)
  }
  termo.add(base, tubo, bulbo, columna, marcas)
  scene.add(termo)

  // --- Luces ---
  const luz = new THREE.DirectionalLight(0xffffff, 1.6)
  luz.position.set(4, 8, 6)
  const ambar = new THREE.PointLight(AMBAR, 30, 20)
  ambar.position.set(-5, 1, 3)
  const cielo = new THREE.PointLight(CIELO, 30, 20)
  cielo.position.set(5, -1, 3)
  scene.add(luz, ambar, cielo)

  // --- Etiquetas HTML ancladas ---
  const pildora = (ancla: THREE.Vector3) => {
    const el = document.createElement('div')
    el.className = 'pildora'
    contenedor.append(el)
    return { el, ancla }
  }
  const pTermo = pildora(new THREE.Vector3(X_TERMO, 3.55, 0.2))
  const pPlaca = pildora(new THREE.Vector3(X_VASO, -0.62, 2.35))
  const pTapa = pildora(new THREE.Vector3(X_VASO, 4.15, 0))
  const proyectado = new THREE.Vector3()
  function ubicar({ el, ancla }: { el: HTMLElement; ancla: THREE.Vector3 }) {
    proyectado.copy(ancla).project(camera)
    el.style.left = `${(proyectado.x * 0.5 + 0.5) * contenedor.clientWidth}px`
    el.style.top = `${(-proyectado.y * 0.5 + 0.5) * contenedor.clientHeight}px`
  }

  let avanceTapa = 0
  let anterior = performance.now()

  return {
    reiniciar: () => {
      din.reiniciar()
      ultimaFase.fill(-1)
    },
    dibujar(l: Lectura, sus: Sustancia, config: Config, potencia: number, ahora: number) {
      const dt = Math.min((ahora - anterior) / 1000, 0.1)
      anterior = ahora
      const s = ahora / 1000

      // Tapa: baja o sube con suavidad y el techo de las partículas la sigue.
      avanceTapa += ((config.tapa ? 1 : 0) - avanceTapa) * (1 - Math.exp(-6 * dt))
      if (Math.abs((config.tapa ? 1 : 0) - avanceTapa) < 0.002) avanceTapa = config.tapa ? 1 : 0
      const yTapa = Y_TAPA_ABIERTA + (Y_TAPA_CERRADA - Y_TAPA_ABIERTA) * avanceTapa
      tapa.position.y = yTapa
      materialTapa.opacity = 0.3 + 0.4 * avanceTapa
      const techo = avanceTapa > 0 ? Math.min(Y_SALA, yTapa - 0.05) : Y_SALA

      // Placa: ámbar al calentar, celeste al enfriar.
      const intensidad = Math.min(Math.abs(potencia) / 1000, 1)
      const color = potencia >= 0 ? AMBAR : CIELO
      brasa.emissive.setHex(color)
      brasa.emissiveIntensity = potencia === 0 ? 0 : 0.2 + intensidad * 0.9
      const ventea = config.tapa && avanceTapa === 1 && l.presion >= 1.98
      valvula.emissiveIntensity = ventea ? 0.6 + 0.4 * Math.sin(s * 14) : 0

      din.paso(dt, l, l.tempK, sus.tFusion - CERO_ABSOLUTO_C, techo, s)
      for (let i = 0; i < N; i++) {
        const f = din.fase[i]
        if (f !== ultimaFase[i]) {
          bolitas.setColorAt(i, colorPorFase[f])
          ultimaFase[i] = f
        }
        pos.set(din.x[i], din.y[i], din.z[i])
        matriz.compose(pos, giro, escala)
        bolitas.setMatrixAt(i, matriz)
      }
      bolitas.instanceMatrix.needsUpdate = true
      if (bolitas.instanceColor) bolitas.instanceColor.needsUpdate = true

      // Termómetro: la columna sube con la temperatura, entre el tope de frío y el de calor de la placa.
      const tMin = sus.tFusion - T_TOPE_FRIO
      const tMax = sus.tEbullicion + T_TOPE_CALOR
      const fraccion = THREE.MathUtils.clamp((l.temp - tMin) / (tMax - tMin), 0, 1)
      const alto = 0.05 + fraccion * 2.9
      columna.scale.y = alto
      columna.position.y = 0.3 + alto / 2

      pTermo.el.textContent = `${l.temp.toFixed(1).replace('.', ',')} °C`
      pPlaca.el.textContent = potencia === 0 ? 'Placa apagada' : `Placa ${potencia > 0 ? 'calienta' : 'enfría'} · ${Math.abs(potencia)} W`
      pPlaca.el.classList.toggle('activa', potencia !== 0)
      pTapa.el.style.display = avanceTapa > 0.9 ? '' : 'none'
      pTapa.el.textContent = `Tapa · ${l.presion.toFixed(1).replace('.', ',')} atm`
      pTapa.el.classList.toggle('activa', ventea)
      ubicar(pTermo)
      ubicar(pPlaca)
      ubicar(pTapa)

      controles.update()
      render()
    },
  }
}
