// Un grupo de partículas del mismo tipo (agua, sal o hemoglobina): posiciones, velocidades y región en arrays planos.
import * as THREE from 'three'

/** -1: no está, 0: libre afuera, 1: adentro de la célula, 2: cruzando la membrana. */
export type Region = -1 | 0 | 1 | 2

export class Pool {
  readonly x: Float32Array
  readonly v: Float32Array
  readonly reg: Int8Array
  readonly destino: Int8Array
  readonly ini: Float32Array
  readonly fin: Float32Array
  readonly prog: Float32Array
  readonly malla: THREE.InstancedMesh
  constructor(readonly n: number, radio: number, color: number, readonly agitacion: number) {
    this.x = new Float32Array(n * 3)
    this.v = new Float32Array(n * 3)
    this.reg = new Int8Array(n).fill(-1)
    this.destino = new Int8Array(n)
    this.ini = new Float32Array(n * 3)
    this.fin = new Float32Array(n * 3)
    this.prog = new Float32Array(n)
    this.malla = new THREE.InstancedMesh(new THREE.SphereGeometry(radio, 8, 6), new THREE.MeshBasicMaterial({ color }), n)
    this.malla.frustumCulled = false
  }
  cuenta(r: Region) {
    let c = 0
    for (let i = 0; i < this.n; i++) if (this.reg[i] === r) c++
    return c
  }
  /** Una partícula al azar de la región, o -1. */
  elegir(r: Region) {
    const e = this.reg.indexOf(r, Math.floor(Math.random() * this.n))
    return e >= 0 ? e : this.reg.indexOf(r)
  }
  /** Cuántas hay yendo hacia `dest` (cruzando). */
  cruzando(dest: Region) {
    let c = 0
    for (let i = 0; i < this.n; i++) if (this.reg[i] === 2 && this.destino[i] === dest) c++
    return c
  }
}

export const azar = () => Math.random() - 0.5
export const gauss = () => azar() + azar() + azar() + azar()

