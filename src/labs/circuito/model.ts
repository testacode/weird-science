// Modelo del circuito en régimen estacionario: una pila real (con resistencia interna),
// lamparitas iguales de resistencia constante, un interruptor y, si se pide, un cable que
// une los dos polos sin carga (cortocircuito).
//
// Ecuaciones (todas con la ley de Ohm y las leyes de Kirchhoff):
//   Serie:    R_carga = n · R          (misma corriente en todas, los voltajes se suman)
//   Paralelo: R_carga = R / n          (mismo voltaje en todas, las corrientes se suman)
//   Cortocircuito: el cable (R_CABLE) queda en paralelo con la carga: 1/R_ext = 1/R_carga + 1/R_CABLE
//   I = V / (r + R_ext)                 corriente total que entrega la pila
//   V_bornes = V - I · r                voltaje que le llega a la carga
//   P = V_lámpara · I_lámpara           potencia; el brillo es P / P_NOMINAL

export const VOLTAJES = [1.5, 3, 4.5, 9] as const
export type Voltaje = (typeof VOLTAJES)[number]
export type Conexion = 'serie' | 'paralelo'
export const MAX_LAMPARAS = 3

/** Resistencia de cada lamparita (se modela constante). */
export const R_LAMPARA = 15
/** Voltaje para el que está pensada la lamparita. */
export const V_NOMINAL = 4.5
export const P_NOMINAL = V_NOMINAL ** 2 / R_LAMPARA
/** Resistencia interna de la pila: es lo que evita una corriente infinita en el cortocircuito. */
export const R_INTERNA = 0.5
/** Resistencia del cable pelado que hace el cortocircuito. */
export const R_CABLE = 0.05
/** Por encima de este brillo (en veces el normal) una lamparita real se quemaría. */
export const BRILLO_PELIGRO = 1.5

/** Carga de la pila: 1,5 / 3 / 4,5 V son pilas grandes en serie; 9 V es la rectangular. */
const capacidadAh = (v: Voltaje) => (v === 9 ? 0.55 : 2)

export interface Config {
  voltaje: Voltaje
  conexion: Conexion
  cantidad: number
  cerrado: boolean
  /** Lamparita sacada del portalámparas, por posición. */
  sacadas: boolean[]
  corto: boolean
}

export const CONFIG_INICIAL: Config = {
  voltaje: 9,
  conexion: 'serie',
  cantidad: 2,
  cerrado: true,
  sacadas: [false, false, false],
  corto: false,
}

export interface Lampara {
  presente: boolean
  tension: number
  corriente: number
  potencia: number
  /** Potencia relativa a la nominal: 1 = brilla como debe. */
  brillo: number
}

export interface Resultado {
  /** Corriente que sale de la pila. */
  corriente: number
  corrienteCarga: number
  corrienteCorto: number
  /** Voltaje que llega a la carga (la pila pierde `I · r` adentro). */
  tensionBornes: number
  /** Resistencia de las lamparitas con el interruptor (Infinity si el camino está cortado). */
  rCarga: number
  /** Resistencia que ve la pila, sin contar la suya. */
  rExterna: number
  lamparas: Lampara[]
  potenciaLamparas: number
  potenciaPila: number
  /** Lo que no se convierte en luz de las lamparitas: calor en la pila y en el cable. */
  calor: number
  horasPila: number
}

export const sacadasActivas = (c: Config) => c.sacadas.slice(0, c.cantidad).filter(Boolean).length
export const presentes = (c: Config) => c.cantidad - sacadasActivas(c)

export function resolver(c: Config): Resultado {
  const n = presentes(c)
  let rCarga = Infinity
  if (c.cerrado) {
    if (c.conexion === 'serie') rCarga = n === c.cantidad ? c.cantidad * R_LAMPARA : Infinity
    else rCarga = n > 0 ? R_LAMPARA / n : Infinity
  }
  const conductancia = (Number.isFinite(rCarga) ? 1 / rCarga : 0) + (c.corto ? 1 / R_CABLE : 0)
  const rExterna = conductancia === 0 ? Infinity : 1 / conductancia
  const corriente = Number.isFinite(rExterna) ? c.voltaje / (R_INTERNA + rExterna) : 0
  const tensionBornes = c.voltaje - corriente * R_INTERNA
  const corrienteCarga = Number.isFinite(rCarga) ? tensionBornes / rCarga : 0
  const corrienteCorto = c.corto ? tensionBornes / R_CABLE : 0

  const lamparas: Lampara[] = Array.from({ length: MAX_LAMPARAS }, (_, i) => {
    const presente = i < c.cantidad && !c.sacadas[i]
    const enCircuito = presente && corrienteCarga > 0
    const tension = !enCircuito ? 0 : c.conexion === 'serie' ? tensionBornes / c.cantidad : tensionBornes
    const potencia = (tension * tension) / R_LAMPARA
    return { presente, tension, corriente: tension / R_LAMPARA, potencia, brillo: potencia / P_NOMINAL }
  })
  const potenciaLamparas = lamparas.reduce((s, l) => s + l.potencia, 0)
  const potenciaPila = c.voltaje * corriente
  return {
    corriente, corrienteCarga, corrienteCorto, tensionBornes, rCarga, rExterna, lamparas, potenciaLamparas,
    potenciaPila, calor: Math.max(potenciaPila - potenciaLamparas, 0),
    horasPila: corriente > 0 ? capacidadAh(c.voltaje) / corriente : Infinity,
  }
}
