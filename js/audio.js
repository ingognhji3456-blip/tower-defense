'use strict';
/* 철벽 요새 — 효과음. 음원 파일 없이 Web Audio 로 그때그때 만들어 낸다. */

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

  /* 다섯 음(펜타토닉)으로 고른 음 — 어느 음을 이어도 어울린다 */
  scale: [311.1, 349.2, 415.3, 466.2, 523.3, 622.3, 698.5, 830.6],

  play(name) {
    if (!this.ctx || !this.enabled || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const gap = { arrow: 0.06, kill: 0.05, hit: 0.05, rocket: 0.05, boom: 0.08, zap: 0.08, flame: 0.22, beam: 0.28, coin: 0.12, splat: 0.08, snipe: 0.08, sear: 0.07, lord: 0.1, meteor: 0.09, pillar: 0.1, tick: 0.09, buzz: 0.25, chime: 0.07, thunder: 0.08, slash: 0.1, cut: 0.07, whirl: 0.1, cross: 0.1, sword: 0.08, reap: 0.08, bite: 0.1, eclipse: 0.1, snare: 0.1 }[name] || 0;
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
      case 'vial':
        this.tone('sine', 700, 1300, 0.07, 0.06);
        break;
      case 'splat':
        this.hiss('bandpass', 1800, 500, 0.16, 0.16);
        this.tone('sine', 300, 140, 0.12, 0.08);
        break;
      case 'snipe':
        this.hiss('highpass', 2400, 900, 0.09, 0.3);
        this.tone('square', 220, 70, 0.12, 0.1);
        break;
      case 'flame':
        this.hiss('bandpass', 500, 900, 0.26, 0.12);
        break;
      case 'beam':
        this.tone('sawtooth', 660, 700, 0.3, 0.035);
        this.tone('sine', 1320, 1400, 0.3, 0.03);
        break;
      case 'lord':
        /* 휩쓸기 광선: 길게 끌리는 불줄기 */
        this.tone('sawtooth', 240, 620, 0.7, 0.07);
        this.tone('sawtooth', 247, 600, 0.7, 0.05, 0.02);
        this.tone('sine', 150, 55, 0.75, 0.3);
        this.hiss('bandpass', 500, 2400, 0.75, 0.2);
        break;
      case 'sear':
        this.hiss('bandpass', 1400, 500, 0.12, 0.1);
        break;
      case 'shock':
        /* 발 구르는 소리와 퍼져 나가는 불길 */
        this.tone('sine', 140, 36, 0.4, 0.6);
        this.hiss('lowpass', 2200, 300, 0.45, 0.32);
        this.tone('sawtooth', 300, 90, 0.35, 0.07);
        break;
      case 'slam':
        this.tone('sine', 120, 40, 0.3, 0.5);
        this.hiss('lowpass', 700, 150, 0.2, 0.3);
        break;
      case 'pillar':
        this.hiss('bandpass', 300, 2600, 0.5, 0.3);
        this.tone('sawtooth', 110, 420, 0.45, 0.09);
        this.tone('sine', 80, 40, 0.4, 0.4);
        break;
      case 'sky':
        this.tone('triangle', 260, 780, 0.9, 0.1);
        this.tone('sine', 520, 1560, 0.9, 0.05);
        break;
      case 'meteor':
        this.hiss('lowpass', 1100, 140, 0.32, 0.42);
        this.tone('sine', 110, 38, 0.3, 0.42);
        break;
      case 'chime':
        this.tone('sine', 1800, 2400, 0.08, 0.05);
        this.tone('sine', 2700, 3200, 0.1, 0.03, 0.03);
        break;
      case 'buzz':
        this.tone('sawtooth', 220, 260, 0.12, 0.03);
        break;
      case 'tick':
        this.hiss('highpass', 3000, 1800, 0.035, 0.1);
        break;
      case 'rail':
        this.tone('sawtooth', 1800, 200, 0.28, 0.1);
        this.tone('sine', 120, 45, 0.35, 0.4);
        this.hiss('highpass', 4000, 1500, 0.2, 0.15);
        break;
      case 'slash':
        this.hiss('bandpass', 3200, 700, 0.16, 0.22);
        this.tone('sine', 300, 90, 0.2, 0.12);
        break;
      case 'cut':
        /* 홍련의 가로 베기: 짧고 날카로운 바람 소리에 불길이 스친다 */
        this.hiss('bandpass', 3600, 900, 0.13, 0.2);
        this.hiss('bandpass', 700, 1800, 0.16, 0.08);
        break;
      case 'whirl':
        /* 회전 베기: 한 바퀴 도는 긴 바람 소리 */
        this.hiss('bandpass', 900, 3400, 0.2, 0.2);
        this.hiss('bandpass', 3400, 600, 0.26, 0.22, 0.16);
        this.tone('sine', 190, 70, 0.36, 0.22);
        break;
      case 'cross':
        /* 십자 베기: 연달아 두 번 긋고 터진다 */
        this.hiss('bandpass', 4200, 1200, 0.1, 0.26);
        this.hiss('bandpass', 4200, 1200, 0.1, 0.26, 0.09);
        this.tone('sine', 150, 45, 0.34, 0.4, 0.1);
        this.tone('sawtooth', 520, 160, 0.2, 0.06, 0.1);
        break;
      case 'sword':
        /* 화염검이 땅에 꽂힌다: 쇳소리와 불길 */
        this.tone('triangle', 1900, 1500, 0.1, 0.09);
        this.tone('sine', 130, 42, 0.3, 0.38);
        this.hiss('lowpass', 1600, 250, 0.3, 0.3);
        break;
      case 'reap':
        /* 자월의 낫질: 낮게 깔리는 바람 소리와 맑은 울림 */
        this.hiss('bandpass', 2400, 500, 0.2, 0.2);
        this.tone('sine', 880, 440, 0.22, 0.05);
        this.tone('sine', 220, 110, 0.2, 0.1);
        break;
      case 'bite':
        /* 공허 구슬이 닫히며 물어뜯는다 */
        this.tone('sine', 300, 40, 0.3, 0.45);
        this.hiss('lowpass', 2600, 200, 0.22, 0.3);
        this.tone('sawtooth', 700, 90, 0.16, 0.07);
        break;
      case 'snare':
        /* 월식의 가시가 돋는다 */
        this.hiss('bandpass', 1200, 3600, 0.18, 0.2);
        this.tone('sawtooth', 160, 420, 0.2, 0.06);
        break;
      case 'eclipse':
        /* 월식의 빛기둥 */
        this.tone('sine', 110, 30, 0.7, 0.6);
        this.hiss('lowpass', 3000, 200, 0.7, 0.4);
        this.tone('sawtooth', 220, 880, 0.5, 0.07);
        this.tone('sine', 1320, 660, 0.6, 0.05, 0.05);
        break;
      case 'bell':
        this.tone('sine', 660, 650, 0.9, 0.22);
        this.tone('sine', 1320, 1310, 0.6, 0.1);
        this.tone('triangle', 1980, 1960, 0.3, 0.05);
        break;
      case 'freeze':
        for (let i = 0; i < 4; i++) this.tone('sine', 2000 + i * 400, 2400 + i * 400, 0.12, 0.04, i * 0.04);
        this.hiss('highpass', 5000, 2500, 0.3, 0.1);
        break;
      case 'warp':
        this.tone('sine', 420, 60, 0.6, 0.3);
        this.tone('sawtooth', 210, 40, 0.6, 0.06);
        break;
      case 'thunder':
        this.hiss('highpass', 2500, 600, 0.12, 0.3);
        this.tone('sawtooth', 900, 120, 0.12, 0.1);
        this.tone('sine', 90, 40, 0.3, 0.3, 0.03);
        break;
      case 'coin':
        this.tone('square', 1568, 1568, 0.05, 0.04);
        this.tone('square', 2093, 2093, 0.09, 0.04, 0.05);
        break;
      case 'pull':
        for (let i = 0; i < 6; i++) this.tone('triangle', 180 + i * 40, 160 + i * 40, 0.07, 0.16, i * 0.07);
        this.hiss('lowpass', 400, 1600, 0.45, 0.12);
        break;
      case 'reveal':
        this.tone('triangle', S[4], S[4], 0.12, 0.16);
        this.tone('triangle', S[6], S[6], 0.25, 0.16, 0.08);
        break;
      case 'jackpot':
        [3, 4, 5, 6, 7].forEach((n, i) => this.tone('triangle', S[n], S[n], i === 4 ? 0.6 : 0.14, 0.18, i * 0.09));
        break;
      case 'equip':
        this.tone('triangle', 420, 560, 0.07, 0.14);
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
        if (d.kind === 'bolt') this.play({ ember: 'vial', orb: 'vial', icicle: 'chime', harpoon: 'snipe', bee: 'buzz' }[d.skin] || 'arrow');
        else if (d.kind === 'shell') this.play(d.skin === 'vial' || d.skin === 'tar' ? 'vial' : 'cannon');
        else if (d.kind === 'rocket') this.play('rocket');
        else if (d.kind === 'snipe') this.play({ spear: 'arrow', tracer: 'tick', rail: 'rail', scythe: 'slash' }[d.skin] || 'snipe');
        else if (d.kind === 'flame') this.play('flame');
        else if (d.kind === 'beam') this.play('beam');
        else if (d.kind === 'trap') this.play('click');
        else if (d.kind === 'lord') this.play('lord');
        else if (d.kind === 'blade') this.play(d.step === 2 ? 'whirl' : 'cut');
        else if (d.kind === 'moon') this.play(d.step === 2 ? 'whirl' : 'reap');
        else if (d.kind === 'orb') this.play('warp');
        break;
      case 'nova': this.play({ bell: 'bell', ice: 'freeze', quake: 'boom', void: 'warp', time: 'bell' }[d.skin] || 'bell'); break;
      case 'exec': this.play('slash'); break;
      case 'cast':
        if (d.kind === 'pillar') this.play('slam');
        else if (d.kind === 'meteor' || d.kind === 'swords' || d.kind === 'eclipse') this.play('sky');
        break;
      case 'burst':
        if (d.kind === 'vortex') break; /* 구슬이 자리 잡는 소리는 던질 때 낸 것으로 충분하다 */
        this.play({ shock: 'shock', pillar: 'pillar', thunder: 'thunder', cross: 'cross', sword: 'sword', bite: 'bite', snare: 'snare', eclipse: 'eclipse' }[d.kind] || 'meteor');
        break;
      case 'sear': this.play('sear'); break;
      case 'explode':
        if (d.kind === 'shell') this.play(d.skin === 'vial' || d.skin === 'tar' ? 'splat' : 'boom');
        else this.play('pop');
        break;
      case 'income': this.play('coin'); break;
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
