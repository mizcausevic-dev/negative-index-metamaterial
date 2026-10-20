// Original procedural score. No samples. AudioContext starts only from a user gesture.
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private music: GainNode | null = null;
  private sfx: GainNode | null = null;
  private timers: number[] = [];
  muted = false;

  private ensure() {
    if (this.ctx) return true;
    try {
      this.ctx = new AudioContext();
      this.music = this.ctx.createGain(); this.music.gain.value = 0.16;
      this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.22;
      const master = this.ctx.createGain(); master.gain.value = this.muted ? 0 : 1;
      this.music.connect(master); this.sfx.connect(master); master.connect(this.ctx.destination);
      (this as unknown as { master: GainNode }).master = master;
      return true;
    } catch { return false; }
  }
  setMuted(m: boolean) {
    this.muted = m;
    const master = (this as unknown as { master?: GainNode }).master;
    if (this.ctx && master) master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.03);
  }
  async start(fromTime: number) {
    if (!this.ensure() || !this.ctx || !this.music || !this.sfx) return;
    await this.ctx.resume();
    this.stopScheduled();
    const ctx = this.ctx, music = this.music, sfx = this.sfx;
    // Deterministic chord schedule derived from absolute timeline position.
    const chords = [[110, 164.81, 220], [98, 146.83, 196], [87.31, 130.81, 174.61], [110, 164.81, 246.94]];
    const startBeat = Math.floor(fromTime / 4);
    for (let i = startBeat; i < 9; i++) {
      const at = ctx.currentTime + Math.max(0, i * 4 - fromTime);
      const chord = chords[i % chords.length];
      chord.forEach((f, j) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = j === 0 ? "sine" : "triangle"; o.frequency.value = f;
        g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.05, at + 0.4);
        g.gain.linearRampToValueAtTime(0.0001, at + 3.8);
        o.connect(g); g.connect(music); o.start(at); o.stop(at + 4);
      });
    }
    // Shot-boundary presentation cues (not physical microwave tones).
    [5, 10, 17, 25, 29, 33].forEach((t, idx) => {
      if (t < fromTime) return;
      const at = ctx.currentTime + (t - fromTime);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = idx === 4 ? 320 : 520 + idx * 40;
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.08, at + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.45);
      o.connect(g); g.connect(sfx); o.start(at); o.stop(at + 0.5);
    });
    // Soft 34 s resolution tone.
    const endAt = ctx.currentTime + Math.max(0, 33.2 - fromTime);
    [220, 277.18, 329.63].forEach((f) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0, endAt); g.gain.linearRampToValueAtTime(0.04, endAt + 0.15);
      g.gain.linearRampToValueAtTime(0.0001, endAt + 0.8);
      o.connect(g); g.connect(music); o.start(endAt); o.stop(endAt + 0.85);
    });
  }
  pause() { this.ctx?.suspend(); }
  stopScheduled() { this.timers.forEach(clearTimeout); this.timers = []; void this.ctx?.suspend(); }
}
