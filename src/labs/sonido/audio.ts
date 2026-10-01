// Web Audio: el lab suena solo si el usuario lo pide. El AudioContext se crea dentro del clic del botón
// (política de autoplay) y cualquier falla (sin salida de audio, navegador sin Web Audio) se traga: el lab sigue mudo.

import { NIVEL_MAX, UMBRAL_DB, type MedioId } from './model'

/** Tono (Hz) de cada micrófono en el modo golpe: solo sirve para distinguir de cuál se trata, no es el timbre real. */
const CLIC_HZ: Record<MedioId, number> = { aire: 330, agua: 495, acero: 660 }
const GANANCIA_MAX = 0.12

/** Del nivel del modelo a la ganancia digital: 30 dB por década de amplitud para que se note la baja, mudo bajo el umbral. */
const ganancia = (nivel: number) => (nivel < UMBRAL_DB ? 0 : GANANCIA_MAX * Math.min(1, 10 ** ((nivel - NIVEL_MAX) / 30)))

export function crearAudio() {
  let ctx: AudioContext | null = null
  let osc: OscillatorNode | null = null
  let volumen: GainNode | null = null
  let ultimaG = -1
  let ultimaF = -1

  return {
    get activo() {
      return osc !== null
    },
    /** Enciende o apaga el sonido. Devuelve `false` si se pidió encender y Web Audio falló. */
    activar(si: boolean): boolean {
      try {
        if (si && !osc) {
          ctx ??= new AudioContext()
          ctx.resume().catch(() => {})
          osc = ctx.createOscillator()
          volumen = ctx.createGain()
          volumen.gain.value = 0
          osc.connect(volumen).connect(ctx.destination)
          osc.start()
          ultimaG = ultimaF = -1
        } else if (!si && osc && volumen && ctx) {
          volumen.gain.setTargetAtTime(0, ctx.currentTime, 0.05)
          osc.stop(ctx.currentTime + 0.4)
          osc = volumen = null
        }
      } catch {
        osc = volumen = null
      }
      return !si || osc !== null
    },
    /** Tono continuo: frecuencia y nivel de ahora; `suena` es false si el oído no lo captaría o no es el modo tono. */
    tono(frecuencia: number, nivel: number, suena: boolean) {
      if (!osc || !volumen || !ctx) return
      const g = suena ? ganancia(nivel) : 0
      const f = Math.min(frecuencia, 20000)
      if (f !== ultimaF) {
        osc.frequency.setTargetAtTime(f, ctx.currentTime, 0.02)
        ultimaF = f
      }
      // Los cambios de ganancia se agrupan (±1 %) para no llenar la agenda de eventos del contexto.
      if (Math.abs(g - ultimaG) > 0.01 * Math.max(g, ultimaG)) {
        volumen.gain.setTargetAtTime(g, ctx.currentTime, 0.04)
        ultimaG = g
      }
    },
    /** Un "tic" corto cuando el golpe llega a un micrófono. */
    clic(id: MedioId, nivel: number) {
      if (!osc || !ctx) return
      const g = ganancia(nivel)
      if (g <= 0) return
      try {
        const o = ctx.createOscillator()
        const v = ctx.createGain()
        const t = ctx.currentTime
        o.type = 'triangle'
        o.frequency.value = CLIC_HZ[id]
        v.gain.setValueAtTime(0, t)
        v.gain.linearRampToValueAtTime(g, t + 0.01)
        v.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
        o.connect(v).connect(ctx.destination)
        o.start(t)
        o.stop(t + 0.2)
      } catch {
        // sin salida de audio: el lab sigue mudo.
      }
    },
  }
}
