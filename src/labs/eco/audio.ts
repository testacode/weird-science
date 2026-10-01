// Web Audio: el grito y el eco con la demora real (sin cámara lenta), para oír la diferencia entre eco y reverberación.
// El AudioContext se crea dentro del clic (política de autoplay) y cualquier falla (sin salida de audio) se traga: el lab sigue mudo.
// Es una síntesis (un soplido filtrado alrededor de 900 Hz), no la voz de nadie; el volumen sigue el nivel del modelo.

const DURACION = 0.09
/** Del nivel del modelo (dB) a la ganancia: 76 dB suena a 0,4 y cada 30 dB multiplican por 10; mudo si no supera el ruido. */
const ganancia = (nivel: number, ruido: number) => (nivel < ruido ? 0 : Math.min(1, 0.4 * 10 ** ((nivel - 76) / 30)))

export function crearAudio() {
  let ctx: AudioContext | null = null
  let ruidoBlanco: AudioBuffer | null = null

  function soplido(inicio: number, g: number) {
    if (!ctx || !ruidoBlanco || g <= 0) return
    const fuente = ctx.createBufferSource()
    fuente.buffer = ruidoBlanco
    const filtro = ctx.createBiquadFilter()
    filtro.type = 'bandpass'
    filtro.frequency.value = 900
    filtro.Q.value = 1.2
    const volumen = ctx.createGain()
    volumen.gain.setValueAtTime(0, inicio)
    volumen.gain.linearRampToValueAtTime(g, inicio + 0.015)
    volumen.gain.exponentialRampToValueAtTime(0.0001, inicio + DURACION)
    fuente.connect(filtro).connect(volumen).connect(ctx.destination)
    fuente.start(inicio)
    fuente.stop(inicio + DURACION + 0.02)
  }

  return {
    /** Grito ahora y eco `demora` s después. Devuelve `false` si Web Audio falló. */
    reproducir(grito: number, eco: number, demora: number, ruido: number): boolean {
      try {
        ctx ??= new AudioContext()
        ctx.resume().catch(() => {})
        ruidoBlanco ??= (() => {
          const b = ctx!.createBuffer(1, Math.round(ctx!.sampleRate * DURACION), ctx!.sampleRate)
          const datos = b.getChannelData(0)
          for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1
          return b
        })()
        const ahora = ctx.currentTime + 0.05
        soplido(ahora, ganancia(grito, 0))
        soplido(ahora + demora, ganancia(eco, ruido))
        return true
      } catch {
        return false
      }
    },
  }
}
