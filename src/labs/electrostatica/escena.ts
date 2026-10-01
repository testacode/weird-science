import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { encuadrarEntreHuds, type Hueco } from '../../escena/encuadre'
import { crearEscenario } from '../../escena/escenario'
import { numero } from '../../ui/formato'
import { crearElectroscopio, PERILLA } from './electroscopio'
import { crearMarcas, sobreEsfera } from './marcas'
import { crearMedidas } from './medidas'
import { MATERIALES, Q_PUESTO, materialDe, polaridad, type Config, type Experimento, type MatId, type Resultado } from './model'
import { crearPapelitos } from './papelitos'
import { crearPieza, type Pieza } from './piezas'

const Y_COLGADO = 4
const Y_BARRA = 26
const ELEVACION = (24 * Math.PI) / 180
const MARGEN_HUECO = 20
/** Qué tiene que entrar en cuadro en cada experimento (cm) y a dónde mira la cámara. */
const ENCUADRES: Record<Experimento, { ancho: number; alto: number; objetivo: THREE.Vector3 }> = {
  cargas: { ancho: 30, alto: 11, objetivo: new THREE.Vector3(0, 4.5, 0) },
  papelitos: { ancho: 14, alto: 19, objetivo: new THREE.Vector3(0, 7.5, 0) },
  electroscopio: { ancho: 32, alto: 15, objetivo: new THREE.Vector3(4, 7, 0) },
}
const ELECTRON = new THREE.Color(0x5ec8ff)
const CANT_ELECTRONES = 36
/** Vueltas de frotado en toda la animación y amplitud (cm). */
const VUELTAS = 5
const AMPLITUD = 2.2

const suave = (x: number) => {
  const t = Math.min(Math.max(x, 0), 1)
  return t * t * (3 - 2 * t)
}
const cantidadMarcas = (q: number) => (q === 0 ? 0 : Math.min(7, Math.round(2 + (5 * Math.abs(q)) / (20 * Q_PUESTO))))
const ESFERAS = Array.from({ length: 8 }, (_, n) => sobreEsfera(n))

interface Objeto {
  pieza: Pieza
  hilo: THREE.Mesh
  vis: number
}
export interface Vista {
  c: Config
  r: Resultado
  /** Progreso del frotado (0 a 1); `null` si no se está frotando. */
  frote: number | null
}

export function crearEscena(contenedor: HTMLElement) {
  const { scene, camera, renderer, render } = crearEscenario(contenedor, { bloom: 0.15, niebla: { cerca: 40, lejos: 90 } })
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture

  const controles = new OrbitControls(camera, renderer.domElement)
  controles.enableDamping = true
  controles.enablePan = false
  controles.minDistance = 10
  controles.maxDistance = 70
  controles.maxPolarAngle = Math.PI * 0.49
  let movida = false
  controles.addEventListener('start', () => (movida = true))
  let hueco: Hueco | null = null
  let experimento: Experimento = 'cargas'
  function encuadrar(forzar = false) {
    const { ancho, alto, objetivo } = ENCUADRES[experimento]
    if (!hueco || (movida && !forzar)) return
    movida = false
    const tan = Math.tan((camera.fov * Math.PI) / 360)
    const d = Math.max((ancho * hueco.alto) / (Math.max(hueco.libre - MARGEN_HUECO, 380) * 2 * tan), alto / (2 * tan))
    controles.target.copy(objetivo)
    camera.position.copy(objetivo).add(new THREE.Vector3(0, Math.sin(ELEVACION), Math.cos(ELEVACION)).multiplyScalar(d))
  }
  encuadrarEntreHuds(camera, contenedor, (h) => {
    hueco = h
    encuadrar()
  })

  // --- Mesa y soporte: una barra de la que cuelgan los objetos ---
  const mesada = new THREE.Mesh(new RoundedBoxGeometry(54, 1, 22, 4, 0.2), new THREE.MeshStandardMaterial({ color: 0x17221f, roughness: 0.55, metalness: 0.3 }))
  mesada.position.y = -0.5
  const piso = new THREE.Mesh(new THREE.CircleGeometry(60, 48), new THREE.MeshStandardMaterial({ color: 0x0a1413, roughness: 0.9 }))
  piso.rotation.x = -Math.PI / 2
  piso.position.y = -1.05
  const metal = new THREE.MeshStandardMaterial({ color: 0x2f423d, roughness: 0.4, metalness: 0.6 })
  const barra = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 54, 12), metal)
  barra.rotation.z = Math.PI / 2
  barra.position.set(0, Y_BARRA, 0)
  const postes = [-26.5, 26.5].map((x) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, Y_BARRA, 12), metal)
    p.position.set(x, Y_BARRA / 2, 0)
    return p
  })
  const luz = new THREE.DirectionalLight(0xffffff, 0.9)
  luz.position.set(8, 18, 14)
  const cielo = new THREE.PointLight(0x5ec8ff, 400, 0, 2)
  cielo.position.set(14, 16, 12)
  scene.add(mesada, piso, barra, ...postes, luz, cielo)

  // --- Objetos (dos copias de cada material: "otro igual" necesita un segundo) ---
  const geoHilo = new THREE.CylinderGeometry(0.03, 0.03, 1, 6).translate(0, 0.5, 0)
  const matHilo = new THREE.MeshBasicMaterial({ color: 0x93a8a0 })
  const objetos = new Map<string, Objeto>()
  for (const id of Object.keys(MATERIALES) as MatId[]) {
    for (const copia of [0, 1]) {
      const pieza = crearPieza(id)
      const hilo = new THREE.Mesh(geoHilo, matHilo)
      pieza.grupo.visible = hilo.visible = false
      scene.add(pieza.grupo, hilo)
      objetos.set(`${id}:${copia}`, { pieza, hilo, vis: 0 })
    }
  }

  const electroscopio = crearElectroscopio(scene)
  const papelitos = crearPapelitos(scene)
  const marcas = crearMarcas(scene)

  // Electrones del frotado: puntitos que viajan de un objeto al otro.
  const electrones = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 8, 6), new THREE.MeshBasicMaterial({ color: ELECTRON, toneMapped: false }), CANT_ELECTRONES)
  electrones.frustumCulled = false
  electrones.visible = false
  scene.add(electrones)
  const semillas = Array.from({ length: CANT_ELECTRONES }, (_, i) => ({ fase: i / CANT_ELECTRONES, x: Math.sin(i * 12.9) * 1.1, y: Math.sin(i * 7.7) * 1.1 }))

  const medidas = crearMedidas(scene, contenedor, camera)

  // --- Estado (todo se reutiliza entre cuadros: el loop no crea objetos) ---
  let vista: Vista | null = null
  let sondaPrevia: Objeto | null = null
  const posiciones = new Map<Objeto, THREE.Vector3>()
  const obj = (id: MatId, copia: 0 | 1) => objetos.get(`${id}:${copia}`)!
  let previo = 0
  const tmp = new THREE.Vector3()
  const extremo = new THREE.Vector3()
  const matriz = new THREE.Object3D()
  /** Un objeto con el lugar al que va y la carga que muestra. */
  interface Puesto {
    o: Objeto | null
    pos: THREE.Vector3
    q: number
  }
  const puesto = (): Puesto => ({ o: null, pos: new THREE.Vector3(), q: 0 })
  /** Dónde va cada objeto en el experimento activo, y dónde en el frotado. */
  const planta = [puesto(), puesto()]
  const frotado = [puesto(), puesto()]
  const buscar = (lista: Puesto[], n: number, o: Objeto): Puesto | undefined => {
    for (let i = 0; i < n; i++) if (lista[i].o === o) return lista[i]
    return undefined
  }
  let textoDist = ''
  let distPrevia = NaN

  /** Llena `planta` con los objetos visibles del experimento (sin el frotado); devuelve cuántos son. */
  function armarPlanta({ c, r }: Vista): number {
    const sonda = obj(materialDe(c, c.cual), 0)
    const d = c.dist[c.experimento]
    planta[0].o = sonda
    planta[0].q = r.q
    if (c.experimento === 'cargas') {
      planta[0].pos.set(-d / 2, Y_COLGADO, 0)
      planta[1].o = c.otro === 'opuesto' ? obj(materialDe(c, c.cual === 'a' ? 'b' : 'a'), 0) : obj(materialDe(c, c.cual), 1)
      planta[1].q = r.q2
      planta[1].pos.set(d / 2, Y_COLGADO, 0)
      return 2
    }
    if (c.experimento === 'papelitos') planta[0].pos.set(0, d, 0)
    else planta[0].pos.set(PERILLA.x + d, PERILLA.y, 0)
    return 1
  }

  function actualizar(dt: number, t: number) {
    if (!vista) return
    const { c, r, frote } = vista
    const p = frote ?? 0
    const w = frote === null ? 0 : suave(p / 0.14) * (1 - suave((p - 0.86) / 0.14))
    const nPlanta = armarPlanta(vista)
    // Frotado: a y b se juntan en el centro y b se desliza contra a.
    const nFrotado = w > 0.01 ? 2 : 0
    if (nFrotado) {
      const a = obj(materialDe(c, 'a'), 0)
      const b = obj(materialDe(c, 'b'), 0)
      frotado[0].o = a
      frotado[0].q = r.qa
      frotado[1].o = b
      frotado[1].q = r.qb
      frotado[0].pos.set(0, Y_COLGADO, -a.pieza.semiZ)
      frotado[1].pos.set(Math.sin(p * VUELTAS * Math.PI * 2) * AMPLITUD * w, Y_COLGADO, b.pieza.semiZ)
    }
    // Con el frotado en marcha solo se ven los dos que se frotan.
    const activos = nFrotado ? frotado : planta
    const nActivos = nFrotado || nPlanta

    const facil = 1 - Math.exp(-dt * 14)
    for (const o of objetos.values()) {
      const dest = buscar(planta, nPlanta, o)
      const frotando = buscar(frotado, nFrotado, o)
      const nuevo = !posiciones.has(o)
      const pos = (posiciones.get(o) ?? posiciones.set(o, new THREE.Vector3(0, Y_COLGADO, 0)).get(o))!
      if (nuevo && dest) pos.copy(dest.pos)
      if (frotando) {
        // Entra al centro: mezcla entre la planta (si tiene) y la pose de frotado.
        if (!dest && o.vis < 0.05) pos.copy(frotando.pos)
        pos.lerp(dest ? tmp.copy(dest.pos).lerp(frotando.pos, w) : frotando.pos, facil)
      } else if (dest) pos.lerp(dest.pos, facil)
      const visible = Boolean(buscar(activos, nActivos, o))
      o.vis += ((visible ? 1 : 0) - o.vis) * facil
      const { grupo, bajo } = o.pieza
      grupo.position.copy(pos)
      grupo.scale.setScalar(Math.max(o.vis, 1e-4))
      grupo.visible = o.hilo.visible = o.vis > 0.02
      o.hilo.position.set(pos.x, pos.y + bajo, pos.z)
      o.hilo.scale.y = Math.max(Y_BARRA - (pos.y + bajo), 0.1)
    }

    // Electrones en el frotado: del que pierde al que gana.
    electrones.visible = w > 0.3
    if (electrones.visible) {
      const { positivo, negativo } = polaridad(c)
      const dona = buscar(frotado, nFrotado, obj(materialDe(c, positivo), 0))!.pos
      const recibe = buscar(frotado, nFrotado, obj(materialDe(c, negativo), 0))!.pos
      semillas.forEach((s, i) => {
        const u = (t * 0.8 + s.fase) % 1
        matriz.position.lerpVectors(dona, recibe, u)
        matriz.position.x += s.x
        matriz.position.y += s.y + Math.sin(u * Math.PI) * 0.7
        matriz.scale.setScalar(w > 0.9 ? 1 : 0.3)
        matriz.updateMatrix()
        electrones.setMatrixAt(i, matriz.matrix)
      })
      electrones.instanceMatrix.needsUpdate = true
    }

    // Flechas de fuerza entre dos objetos cargados.
    const fuerza = Math.abs(r.fuerza)
    medidas.ocultarFlechas()
    if (c.experimento === 'cargas' && frote === null && c.frote > 0 && fuerza > 0) {
      const [izq, der] = planta
      const hueco = (der.pos.x - izq.pos.x) / 2 - 2.1
      const largo = Math.min(Math.max(0.9 + 1.15 * (Math.log10(fuerza) + 4.2), 0.9), 6)
      const atrae = r.fuerza < 0
      const l = atrae ? Math.min(largo, Math.max(hueco, 0.8)) : largo
      medidas.flecha(0, tmp.set(izq.pos.x + (atrae ? 1.8 : -1.8), Y_COLGADO, 0), atrae ? 1 : -1, l)
      medidas.flecha(1, tmp.set(der.pos.x + (atrae ? -1.8 : 1.8), Y_COLGADO, 0), atrae ? -1 : 1, l)
    }

    // Papelitos y electroscopio, solo en su experimento.
    const enPapelitos = c.experimento === 'papelitos'
    papelitos.malla.visible = enPapelitos
    if (enPapelitos) papelitos.actualizar(dt, t, frote === null ? r.q : 0, posiciones.get(planta[0].o!)!, planta[0].o!.pieza.bajo)
    const enElectro = c.experimento === 'electroscopio'
    electroscopio.grupo.visible = enElectro
    electroscopio.actualizar(enElectro && frote === null ? r.angulo : 0, dt)

    // Cota.
    const dist = c.dist[c.experimento]
    if (dist !== distPrevia) {
      distPrevia = dist
      textoDist = `${numero(dist, 1)} cm`
    }
    if (frote !== null) medidas.cota(null)
    else if (c.experimento === 'cargas') medidas.cota(tmp.set(planta[0].pos.x, Y_COLGADO - 2.7, 0), extremo.set(planta[1].pos.x, Y_COLGADO - 2.7, 0), textoDist)
    else if (c.experimento === 'papelitos') medidas.cota(tmp.set(2.4, 0, 0), extremo.set(2.4, planta[0].pos.y, 0), textoDist)
    else medidas.cota(tmp.set(PERILLA.x, PERILLA.y - 2.4, 0), extremo.set(planta[0].pos.x, PERILLA.y - 2.4, 0), textoDist)
    medidas.ubicar()

    // Signos de carga.
    marcas.empezar()
    for (let i = 0; i < nActivos; i++) {
      const { o, q } = activos[i]
      const { pieza, vis } = o!
      for (const e of ESFERAS[cantidadMarcas(q)]) marcas.poner(tmp.copy(e).multiplyScalar(pieza.cascara).add(pieza.grupo.position), q, vis)
    }
    if (enElectro && frote === null && r.q !== 0) {
      const signo = Math.sign(r.q)
      ESFERAS[3].forEach((e) => marcas.poner(tmp.copy(e).multiplyScalar(1.7).add(PERILLA), -signo))
      if (electroscopio.angulo > 2) for (const i of [0, 1] as const) for (const k of [0.45, 0.9]) marcas.poner(electroscopio.puntoHoja(i, k), signo, 0.8)
    }
    marcas.terminar()
  }

  return {
    /** Experimento y valores del momento. Llamar cuando cambia algo de la config o durante el frotado. */
    aplicar(v: Vista) {
      if (v.c.experimento !== experimento) {
        experimento = v.c.experimento
        encuadrar(true)
        // Los objetos aparecen en su lugar (si cruzaran la mesa, atraerían a los papelitos) y los papelitos arrancan sobre la mesa.
        posiciones.clear()
        papelitos.reponer()
      }
      // La sonda nueva (otro objeto de prueba u otro par) aparece en su lugar, no desde donde estaba: si no, cruza la mesa cargada y levanta los papelitos.
      const sonda = obj(materialDe(v.c, v.c.cual), 0)
      if (sonda !== sondaPrevia) {
        sondaPrevia = sonda
        if (v.frote === null) posiciones.delete(sonda)
      }
      vista = v
    },
    dibujar(ahora: number) {
      const t = ahora / 1000
      const dt = Math.min(Math.max(t - previo, 0), 0.1)
      previo = t
      actualizar(dt, t)
      controles.update()
      render()
    },
    /** Los objetos ya llegaron a su lugar. */
    asentada(): boolean {
      if (!vista) return true
      const n = armarPlanta(vista)
      for (let i = 0; i < n; i++) if ((posiciones.get(planta[i].o!)?.distanceTo(planta[i].pos) ?? 0) >= 0.05) return false
      return true
    },
    papeles: papelitos,
  }
}
