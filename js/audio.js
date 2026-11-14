'use strict';
/* 도깨비 고개 — 효과음. 음원 파일 없이 Web Audio 로 그때그때 만들어 낸다. */

const Sfx = {
  ctx: null,
  master: null,
  noise: null,
  enabled: true,
  last: {},

  /* 브라우저 정책상 첫 입력 뒤에만 소리를 낼 수 있다. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.5 : 0;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, len);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } catch (err) {
      this.ctx = null;
    }
  },

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.5 : 0;
  },

  tone(type, f0, f1, dur, vol, delay) {
    const c = this.ctx;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  hiss(filter, f0, f1, dur, vol, delay) {
    const c = this.ctx;
    const t = c.currentTime + (delay || 0);
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const flt = c.createBiquadFilter();
    flt.type = filter;
    flt.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt);
    flt.connect(g);
    g.connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  },

  /* 한국 전통 5음(황·태·중·임·남)에 가깝게 고른 음 */
  scale: [311.1, 349.2, 415.3, 466.2, 523.3, 622.3, 698.5, 830.6],

  play(name) {
    if (!this.ctx || !this.enabled || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const gap = { arrow: 0.06, kill: 0.05, hit: 0.05, rocket: 0.05, boom: 0.08, zap: 0.08 }[name] || 0;
    if (gap && now - (this.last[name] || 0) < gap) return;
    this.last[name] = now;
    const S = this.scale;
    switch (name) {
      case 'arrow':
        this.hiss('bandpass', 2600, 900, 0.07, 0.12);
        this.tone('triangle', 760, 380, 0.06, 0.04);
        break;
      case 'cannon':
        this.tone('sine', 150, 42, 0.26, 0.5);
        this.hiss('lowpass', 900, 200, 0.2, 0.35);
        break;
      case 'boom':
        this.hiss('lowpass', 700, 120, 0.28, 0.4);
        this.tone('sine', 90, 40, 0.22, 0.3);
        break;
      case 'rocket':
        this.hiss('bandpass', 700, 2600, 0.16, 0.1);
        break;
      case 'pop':
        this.hiss('lowpass', 1200, 300, 0.1, 0.14);
        break;
      case 'zap':
        this.tone('sawtooth', 1500, 180, 0.13, 0.09);
        this.hiss('highpass', 3000, 5000, 0.1, 0.08);
        break;
      case 'kill':
        this.tone('sine', 520, 980, 0.09, 0.09);
        break;
      case 'build':
        this.tone('triangle', 190, 150, 0.07, 0.3);
        this.tone('triangle', 260, 210, 0.08, 0.22, 0.07);
        break;
      case 'upgrade':
        this.tone('triangle', S[2], S[2], 0.12, 0.16);
        this.tone('triangle', S[4], S[4], 0.12, 0.16, 0.09);
        this.tone('triangle', S[6], S[6], 0.22, 0.16, 0.18);
        break;
      case 'sell':
        this.tone('square', 1320, 1320, 0.05, 0.05);
        this.tone('square', 1760, 1760, 0.09, 0.05, 0.06);
        break;
      case 'deny':
        this.tone('square', 150, 110, 0.12, 0.07);
        break;
      case 'click':
        this.tone('triangle', 620, 520, 0.04, 0.08);
        break;
      case 'wave':
        this.tone('sine', 130, 55, 0.3, 0.6);
        this.hiss('lowpass', 500, 150, 0.12, 0.25);
        this.tone('sine', 130, 55, 0.4, 0.6, 0.28);
        this.hiss('lowpass', 500, 150, 0.12, 0.25, 0.28);
        break;
      case 'boss':
        for (let i = 0; i < 4; i++) {
          this.tone('sine', 110, 45, 0.3, 0.6, i * 0.2);
          this.hiss('lowpass', 400, 120, 0.1, 0.25, i * 0.2);
        }
        this.tone('sawtooth', 77.8, 73, 1.1, 0.12, 0.1);
        break;
      case 'clear':
        this.tone('triangle', S[3], S[3], 0.14, 0.14);
        this.tone('triangle', S[5], S[5], 0.24, 0.14, 0.12);
        break;
      case 'leak':
        this.tone('sawtooth', 196, 92, 0.35, 0.16);
        this.tone('sawtooth', 185, 87, 0.35, 0.12);
        break;
      case 'win':
        [2, 3, 4, 5, 4, 5, 7].forEach((n, i) => this.tone('triangle', S[n], S[n], i === 6 ? 0.7 : 0.2, 0.16, i * 0.16));
        break;
      case 'lose':
        [5, 4, 2, 1, 0].forEach((n, i) => this.tone('triangle', S[n] / 2, S[n] / 2, i === 4 ? 0.8 : 0.28, 0.18, i * 0.24));
        break;
    }
  },

  /* 시뮬레이션 사건을 소리로 옮긴다. */
  onEvent(type, d) {
    switch (type) {
      case 'shoot':
        if (d.kind === 'arrow') this.play('arrow');
        else if (d.kind === 'shell') this.play('cannon');
        else if (d.kind === 'rocket') this.play('rocket');
        break;
      case 'explode': this.play(d.kind === 'shell' ? 'boom' : 'pop'); break;
      case 'bolt': this.play('zap'); break;
      case 'kill': this.play('kill'); break;
      case 'leak': this.play('leak'); break;
      case 'build': this.play('build'); break;
      case 'upgrade': this.play('upgrade'); break;
      case 'sell': this.play('sell'); break;
      case 'wavestart': this.play(d.boss ? 'boss' : 'wave'); break;
      case 'waveclear': this.play('clear'); break;
      case 'won': this.play('win'); break;
      case 'lost': this.play('lose'); break;
    }
  },
};
