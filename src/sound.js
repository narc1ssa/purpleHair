// Short, locally synthesized notes; no audio requests, autoplay, or looped music.
export class Sound {
  constructor(enabled) {
    this.enabled = enabled;
    this.ctx = null;
  }
  unlock() {
    if (!this.enabled) return;
    try {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return;
      this.ctx ??= new A();
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    } catch {
      /* The game is fully playable without audio. */
    }
  }
  tone(hz, duration = 0.12, delay = 0, gain = 0.035, type = "sine", end = hz) {
    if (!this.enabled || !this.ctx || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime + delay,
      osc = this.ctx.createOscillator(),
      vol = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(hz, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, end), t + duration);
    vol.gain.setValueAtTime(0.0001, t);
    vol.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    vol.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(vol);
    vol.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.025);
    osc.onended = () => {
      osc.disconnect();
      vol.disconnect();
    };
  }
  play(event) {
    switch (event) {
      case "select":
        this.tone(494, 0.13, 0, 0.024);
        this.tone(740, 0.14, 0.045, 0.019);
        break;
      case "jump":
        this.tone(290, 0.13, 0, 0.024, "sine", 570);
        break;
      case "coin":
        this.tone(988, 0.13, 0, 0.035);
        this.tone(1319, 0.23, 0.055, 0.029);
        break;
      case "cast":
        this.tone(640, 0.17, 0, 0.019, "triangle", 210);
        break;
      case "hurt":
        this.tone(184, 0.21, 0, 0.035, "triangle", 75);
        break;
      case "poof":
        this.tone(390, 0.15, 0, 0.021, "sine", 155);
        break;
      case "start":
      case "finish":
        [392, 494, 587, 784].forEach((n, i) =>
          this.tone(n, 0.32, i * 0.09, 0.032),
        );
        break;
    }
  }
}
