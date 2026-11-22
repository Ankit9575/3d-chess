class ProceduralSoundEngine {
  private ctx: AudioContext | null = null;
  private sfxEnabled = true;
  private musicEnabled = false;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicGain: GainNode | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
  }

  public setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (enabled) {
      this.startAmbientMusic();
    } else {
      this.stopAmbientMusic();
    }
  }

  public unlock(): void {
    this.ensureContext();
    if (this.musicEnabled && this.musicTimer === null) {
      this.startAmbientMusic();
    }
  }

  public playSelect(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.045);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playMove(isCastle = false): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const playWoodClack = (delay: number, pitchScale: number) => {
      const now = ctx.currentTime + delay;

      // Low woody body resonance
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(175 * pitchScale, now);
      osc.frequency.exponentialRampToValueAtTime(68 * pitchScale, now + 0.075);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);

      // Crisp transient click
      const bufferSize = Math.floor(ctx.sampleRate * 0.02);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1150 * pitchScale;
      filter.Q.value = 1.8;

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.16, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(ctx.destination);
      noise.start(now);
    };

    const pitch = 0.94 + Math.random() * 0.12;
    playWoodClack(0, pitch);
    if (isCastle) {
      playWoodClack(0.14, pitch * 1.08);
    }
  }

  public playCapture(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.12);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(900, now);
    lowpass.frequency.exponentialRampToValueAtTime(220, now + 0.12);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);

    // Sharp snap
    const snap = ctx.createOscillator();
    const sGain = ctx.createGain();
    snap.type = 'sine';
    snap.frequency.setValueAtTime(680, now);
    snap.frequency.exponentialRampToValueAtTime(280, now + 0.045);
    sGain.gain.setValueAtTime(0.14, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    snap.connect(sGain);
    sGain.connect(ctx.destination);
    snap.start(now);
    snap.stop(now + 0.055);
  }

  public playCheck(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = [587.33, 880]; // D5 -> A5 tension fifth
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.07);
      gain.gain.setValueAtTime(0.14, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.3);
    });
  }

  public playCheckmate(isVictory: boolean): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = isVictory
      ? [392.0, 493.88, 587.33, 783.99] // G major triumphant arpeggio
      : [392.0, 349.23, 311.13, 261.63]; // C minor descending cadence

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = now + idx * 0.11;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.16, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.58);
    });
  }

  private startAmbientMusic(): void {
    if (this.musicTimer !== null) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (!this.musicGain) {
      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = 0.055;
      this.musicGain.connect(ctx.destination);
    }

    // D Dorian warm contemplative jazz/study chord progression
    const chords = [
      [146.83, 220.0, 261.63, 329.63], // Dm7
      [130.81, 196.0, 246.94, 293.66], // Cmaj7
      [116.54, 174.61, 220.0, 261.63], // Bbmaj7
      [110.0, 164.81, 196.0, 261.63], // Am7
    ];

    const triggerBar = () => {
      if (!this.musicEnabled || !this.ctx || !this.musicGain) return;
      if (this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const chord = chords[this.musicStep % chords.length];
      this.musicStep++;

      chord.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const filter = this.ctx!.createBiquadFilter();
        const g = this.ctx!.createGain();

        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.value = 620;

        const attack = 0.7;
        const duration = 3.6;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(idx === 0 ? 0.35 : 0.22, now + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(filter);
        filter.connect(g);
        g.connect(this.musicGain!);

        osc.start(now);
        osc.stop(now + duration + 0.05);
      });
    };

    triggerBar();
    this.musicTimer = window.setInterval(triggerBar, 3800);
  }

  private stopAmbientMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public dispose(): void {
    this.stopAmbientMusic();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export const soundEngine = new ProceduralSoundEngine();
