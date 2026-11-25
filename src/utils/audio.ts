class CozyAudioEngine {
  private ctx: AudioContext | null = null
  private enabled = true

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  public unlock(): void {
    if (typeof window === 'undefined') return
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      if (!this.ctx) {
        this.ctx = new AudioCtx()
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume()
      }
    } catch {
      // AudioContext unavailable
    }
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    endFreq?: number,
    delay = 0
  ): void {
    if (!this.enabled) return
    this.unlock()
    const ctx = this.ctx
    if (!ctx) return

    try {
      const now = ctx.currentTime + delay
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = type
      osc.frequency.setValueAtTime(freq, now)
      if (endFreq !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration)
      }

      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + duration + 0.02)
    } catch {
      // Ignore audio errors
    }
  }

  public playCardFlip(): void {
    this.playTone(320, 0.065, 'triangle', 0.08, 520)
  }

  public playCardPlace(): void {
    this.playTone(210, 0.075, 'sine', 0.1, 140)
  }

  public playCardSnap(): void {
    this.playTone(440, 0.09, 'triangle', 0.09, 660)
  }

  public playCardError(): void {
    this.playTone(190, 0.11, 'sine', 0.07, 130)
  }

  public playButtonTap(): void {
    this.playTone(520, 0.045, 'sine', 0.05, 420)
  }

  public playWinFanfare(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((note, idx) => {
      this.playTone(note, 0.22, 'triangle', 0.11, undefined, idx * 0.11)
    })
  }
}

export const soundFX = new CozyAudioEngine()
