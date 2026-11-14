'use strict';
/* 도깨비 고개 — 캔버스 렌더러.
   시뮬레이션은 언제나 가로 16×10 좌표를 쓰고, 세로 화면에서는 여기서 x·y 를 맞바꿔 그린다. */

const FONT_DISPLAY = '"Yeon Sung", "Gungsuh", "AppleMyungjo", "Batang", serif';
const FONT_UI = '"IBM Plex Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif';

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.bg = document.createElement('canvas');
    this.game = null;
    this.ts = 32;
    this.dpr = 1;
    this.transposed = false;
    this.cols = COLS;
    this.rows = ROWS;
    this.w = 0;
    this.h = 0;
    this.dirty = true;
    this.reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.fireflies = [];
    for (let i = 0; i < 14; i++) {
      this.fireflies.push({ u: Math.random(), v: Math.random(), p: Math.random() * 6.28, s: 0.4 + Math.random() * 0.8 });
    }
    this.reset();
  }

  reset() {
    this.particles = [];
    this.floaters = [];
    this.bolts = [];
    this.rings = [];
    this.banner = null;
    this.shake = 0;
    this.alarm = 0;
    this.aims = new Map();
  }

  setGame(game) {
    this.game = game;
    this.reset();
    this.dirty = true;
  }

  /* 주어진 상자 안에 가장 크게 들어가는 방향(가로/세로)을 골라 캔버스 크기를 정한다. */
  resize(boxW, boxH) {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const land = Math.min(boxW / COLS, boxH / ROWS);
    const port = Math.min(boxW / ROWS, boxH / COLS);
    const transposed = port > land * 1.08;
    const ts = Math.max(8, Math.floor(Math.max(land, port) * dpr) / dpr);
    if (ts === this.ts && dpr === this.dpr && transposed === this.transposed && this.w) return;
    this.ts = ts;
    this.dpr = dpr;
    this.transposed = transposed;
    this.cols = transposed ? ROWS : COLS;
    this.rows = transposed ? COLS : ROWS;
    this.w = this.cols * ts;
    this.h = this.rows * ts;
    this.canvas.style.width = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.dirty = true;
  }

  /* 게임 좌표(타일) → 화면 타일 좌표 */
  u(x, y) { return this.transposed ? y : x; }
  v(x, y) { return this.transposed ? x : y; }

  /* 캔버스 안 픽셀 → 게임 타일 */
  tileAt(px, py) {
    const a = Math.floor(px / this.ts);
    const b = Math.floor(py / this.ts);
    return this.transposed ? { x: b, y: a } : { x: a, y: b };
  }

  at(ctx, x, y, fn) {
    ctx.save();
    ctx.translate(this.u(x, y) * this.ts, this.v(x, y) * this.ts);
    ctx.scale(this.ts, this.ts);
    fn(ctx);
    ctx.restore();
  }

  /* ───── 배경 (지형은 크기가 바뀔 때만 다시 그린다) ───── */

  paintBackground() {
    const { bg, ts, dpr, game } = this;
    bg.width = this.canvas.width;
    bg.height = this.canvas.height;
    const g = bg.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rand = mulberry32(977 + game.map.id.length * 31 + game.map.id.charCodeAt(0));

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        g.fillStyle = (x + y) % 2 ? PAL.grassA : PAL.grassB;
        g.fillRect(this.u(x, y) * ts, this.v(x, y) * ts, ts + 0.5, ts + 0.5);
      }
    }
    g.lineCap = 'round';
    for (let i = 0; i < 260; i++) {
      const x = rand() * COLS;
      const y = rand() * ROWS;
      const px = this.u(x, y) * ts;
      const py = this.v(x, y) * ts;
      g.strokeStyle = rand() > 0.5 ? PAL.grassTuft : '#1a3d38';
      g.lineWidth = Math.max(1, ts * 0.03);
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px - ts * 0.04, py - ts * 0.1);
      g.moveTo(px + ts * 0.05, py);
      g.lineTo(px + ts * 0.08, py - ts * 0.08);
      g.stroke();
    }

    const trace = (path) => {
      g.beginPath();
      path.waypoints.forEach(([x, y], i) => {
        const px = this.u(x + 0.5, y + 0.5) * ts;
        const py = this.v(x + 0.5, y + 0.5) * ts;
        if (i) g.lineTo(px, py);
        else g.moveTo(px, py);
      });
    };
    g.lineJoin = 'round';
    g.lineCap = 'round';
    for (const [color, width] of [[PAL.pathEdge, 0.9], [PAL.path, 0.76]]) {
      g.strokeStyle = color;
      g.lineWidth = ts * width;
      for (const p of game.paths) { trace(p); g.stroke(); }
    }
    for (const s of game.samples) {
      for (let k = 0; k < 2; k++) {
        const x = s.x + (rand() - 0.5) * 0.6;
        const y = s.y + (rand() - 0.5) * 0.6;
        g.fillStyle = rand() > 0.5 ? 'rgba(60,50,40,.28)' : 'rgba(190,172,140,.25)';
        g.beginPath();
        g.ellipse(this.u(x, y) * ts, this.v(x, y) * ts, ts * (0.02 + rand() * 0.035), ts * (0.015 + rand() * 0.02), 0, 0, Math.PI * 2);
        g.fill();
      }
    }

    game.map.deco.forEach(([kind, x, y], i) => {
      this.at(g, x + 0.5, y + 0.5, (c) => drawDeco(c, kind, i * 7 + x + y));
    });

    /* 달빛과 가장자리 어둠 */
    const moon = g.createRadialGradient(this.w * 0.2, 0, 0, this.w * 0.2, 0, Math.max(this.w, this.h) * 0.9);
    moon.addColorStop(0, 'rgba(170,200,255,.13)');
    moon.addColorStop(1, 'rgba(170,200,255,0)');
    g.fillStyle = moon;
    g.fillRect(0, 0, this.w, this.h);
    const vig = g.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.35, this.w / 2, this.h / 2, Math.hypot(this.w, this.h) * 0.6);
    vig.addColorStop(0, 'rgba(8,10,24,0)');
    vig.addColorStop(1, 'rgba(8,10,24,.5)');
    g.fillStyle = vig;
    g.fillRect(0, 0, this.w, this.h);
    this.dirty = false;
  }

  /* ───── 시뮬레이션 사건 → 효과 ───── */

  spark(x, y, n, o) {
    if (this.reduced) n = Math.ceil(n / 3);
    const u = this.u(x, y);
    const v = this.v(x, y);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (o.speed || 1.5) * (0.4 + Math.random() * 0.8);
      const life = (o.life || 0.4) * (0.6 + Math.random() * 0.7);
      this.particles.push({
        u: u + (Math.random() - 0.5) * (o.spread || 0),
        v: v + (Math.random() - 0.5) * (o.spread || 0),
        du: Math.cos(a) * sp,
        dv: Math.sin(a) * sp + (o.lift || 0),
        g: o.gravity || 0,
        life,
        max: life,
        size: (o.size || 0.05) * (0.6 + Math.random() * 0.8),
        color: Array.isArray(o.color) ? o.color[(Math.random() * o.color.length) | 0] : o.color,
        wisp: !!o.wisp,
      });
    }
    if (this.particles.length > 500) this.particles.splice(0, this.particles.length - 500);
  }

  onEvent(type, d) {
    switch (type) {
      case 'shoot':
        if (d.kind === 'shell') this.spark(d.x, d.y, 4, { color: ['#c9cfdf', '#8d94aa'], speed: 0.8, life: 0.5, size: 0.07, lift: -0.4 });
        break;
      case 'hit':
        this.spark(d.x, d.y, 3, { color: [PAL.white, PAL.yellow], speed: 1.6, life: 0.2, size: 0.03 });
        break;
      case 'explode': {
        const shell = d.kind === 'shell';
        this.rings.push({ x: d.x, y: d.y, r: d.r, life: 0.32, max: 0.32, color: shell ? '255,190,90' : '255,150,80' });
        this.spark(d.x, d.y, shell ? 12 : 5, { color: [PAL.yellow, PAL.red, '#ffe9b0'], speed: shell ? 3 : 2, life: 0.35, size: 0.06 });
        if (shell) this.spark(d.x, d.y, 5, { color: ['#59607a', '#3d445c'], speed: 0.7, life: 0.7, size: 0.11, lift: -0.5 });
        break;
      }
      case 'bolt':
        this.bolts.push({ pts: d.pts, life: 0.2, max: 0.2 });
        for (let i = 1; i < d.pts.length; i++) {
          this.spark(d.pts[i].x, d.pts[i].y, 3, { color: ['#e8f1ff', PAL.blueLight], speed: 2, life: 0.2, size: 0.035 });
        }
        break;
      case 'kill': {
        const boss = d.enemy.boss;
        this.spark(d.x, d.y, boss ? 26 : 6, { color: [PAL.flame, '#eafaff', '#4aa8e8'], speed: boss ? 2.2 : 0.9, life: boss ? 1.1 : 0.7, size: boss ? 0.1 : 0.075, lift: -1.1, spread: d.enemy.r, wisp: true });
        if (boss) this.rings.push({ x: d.x, y: d.y, r: 1.6, life: 0.6, max: 0.6, color: '127,212,255' });
        this.floaters.push({ x: d.x, y: d.y - d.enemy.r, text: '+' + d.reward, color: PAL.yellow, life: 0.9, max: 0.9 });
        break;
      }
      case 'leak':
        this.alarm = 1;
        if (!this.reduced) this.shake = 0.35;
        this.floaters.push({ x: d.x, y: d.y - 0.4, text: '−' + Math.min(d.enemy.lives, 99), color: '#ff8a70', life: 1.2, max: 1.2 });
        break;
      case 'build':
        this.rings.push({ x: d.tower.cx, y: d.tower.cy, r: 0.75, life: 0.3, max: 0.3, color: '244,236,216' });
        this.spark(d.tower.cx, d.tower.cy + 0.3, 8, { color: ['#a39274', '#6f6451'], speed: 1.3, life: 0.45, size: 0.06, lift: -0.3 });
        break;
      case 'upgrade':
        this.rings.push({ x: d.tower.cx, y: d.tower.cy, r: 0.9, life: 0.45, max: 0.45, color: '244,185,58' });
        this.spark(d.tower.cx, d.tower.cy, 12, { color: [PAL.yellow, '#fff3c9'], speed: 1.2, life: 0.7, size: 0.045, lift: -1.4 });
        break;
      case 'sell':
        this.spark(d.tower.cx, d.tower.cy, 8, { color: [PAL.yellow, '#b07d1c'], speed: 2, life: 0.6, size: 0.06, lift: -1.5, gravity: 6 });
        this.floaters.push({ x: d.tower.cx, y: d.tower.cy - 0.3, text: '+' + d.value, color: PAL.yellow, life: 1, max: 1 });
        break;
      case 'wavestart':
        this.banner = {
          title: '웨이브 ' + d.wave,
          sub: d.boss ? ENEMIES[d.boss].name + ' 출현' : '',
          life: d.boss ? 2.8 : 2,
          max: d.boss ? 2.8 : 2,
          boss: !!d.boss,
        };
        break;
      case 'waveclear':
        this.banner = { title: '막아냈습니다', sub: '상금 ' + d.bonus + '냥', life: 1.6, max: 1.6 };
        break;
    }
  }

  /* ───── 한 프레임 ───── */

  /* ui = { time, dt, placing, hover: {x,y}|null, selected: tower|null, paused } */
  draw(ui) {
    const { ctx, ts, dpr, game } = this;
    if (!game || !this.w) return;
    if (this.dirty) this.paintBackground();
    const t = ui.time;
    const dt = ui.dt;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      const k = this.shake * ts * 0.25;
      ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
    }
    ctx.drawImage(this.bg, 0, 0, this.w, this.h);
    if (this.alarm > 0) this.alarm = Math.max(0, this.alarm - dt * 1.2);

    if (ui.placing) this.drawBuildable(ctx);

    for (const p of game.paths) {
      const [bx, by] = p.waypoints[0];
      this.at(ctx, bx + 0.5, by + 0.5, (c) => drawBurrow(c, t));
    }

    /* 장승의 기운 */
    for (const tw of game.towers) {
      if (tw.def.kind !== 'aura') continue;
      const k = (t * 0.45 + tw.id * 0.37) % 1;
      const px = this.u(tw.cx, tw.cy) * ts;
      const py = this.v(tw.cx, tw.cy) * ts;
      ctx.strokeStyle = `rgba(95,184,154,${0.28 * (1 - k)})`;
      ctx.lineWidth = Math.max(1, ts * 0.05);
      ctx.beginPath();
      ctx.arc(px, py, tw.lv.range * ts * (this.reduced ? 1 : k), 0, Math.PI * 2);
      ctx.stroke();
    }

    this.drawEnemies(ctx, t);

    const end = game.paths[0].waypoints[game.paths[0].waypoints.length - 1];
    this.at(ctx, end[0] + 0.5, end[1] + 0.5, (c) => drawGate(c, t, this.alarm));

    this.drawTowers(ctx, t, dt, ui);
    this.drawShots(ctx);
    this.drawEffects(ctx, dt);
    this.drawHealthBars(ctx);
    this.drawSelection(ctx, ui);
    this.drawFireflies(ctx, t);
    this.drawBanner(ctx, dt, ui);
  }

  drawBuildable(ctx) {
    const { ts, game } = this;
    ctx.fillStyle = 'rgba(244,236,216,.04)';
    ctx.strokeStyle = 'rgba(244,236,216,.11)';
    ctx.lineWidth = 1;
    const pad = ts * 0.08;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!game.canBuild(x, y)) continue;
        roundRect(ctx, this.u(x, y) * ts + pad, this.v(x, y) * ts + pad, ts - pad * 2, ts - pad * 2, ts * 0.14);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  drawEnemies(ctx, t) {
    const { ts, game } = this;
    const list = game.enemies.slice().sort((a, b) => this.v(a.x, a.y) - this.v(b.x, b.y));
    const tmp = {};
    for (const e of list) {
      const sdx = this.transposed ? e.dy : e.dx;
      if (sdx < -0.3) e.flip = true;
      else if (sdx > 0.3) e.flip = false;
      const grow = Math.min(1, e.age / 0.35);

      if (e.type === 'imugi') {
        for (let k = 15; k >= 1; k--) {
          const d = e.dist - k * 0.3;
          if (d <= 0.05) continue;
          e.path.at(d, tmp);
          const wig = Math.sin(t * 5 + k * 0.8) * 0.07;
          const r = e.r * (0.95 - k * 0.043);
          this.at(ctx, tmp.x - tmp.dy * wig, tmp.y + tmp.dx * wig, (c) => drawImugiSegment(c, r, k));
        }
      }

      this.at(ctx, e.x, e.y, (c) => {
        if (e.slow > 0) {
          c.strokeStyle = 'rgba(95,184,154,.75)';
          c.lineWidth = 0.04;
          c.beginPath();
          c.ellipse(0, e.r * 0.9, e.r * 1.1, e.r * 0.35, 0, 0, Math.PI * 2);
          c.stroke();
        }
        if (grow < 1) { c.globalAlpha = grow; c.scale(grow, grow); }
        drawEnemySprite(c, e.type, e.r, t + e.id * 0.7, { flip: e.flip, seed: e.id });
        if (e.hitT > 0) {
          c.fillStyle = `rgba(255,255,255,${Math.min(0.4, e.hitT * 3.2)})`;
          fillCircle(c, 0, 0, e.r * 1.05);
        }
      });
    }
  }

  drawTowers(ctx, t, dt, ui) {
    const { ts, game } = this;
    const list = game.towers.slice().sort((a, b) => this.v(a.cx, a.cy) - this.v(b.cx, b.cy));
    for (const tw of list) {
      const want = Math.atan2(this.v(tw.aimX, tw.aimY) - this.v(tw.cx, tw.cy), this.u(tw.aimX, tw.aimY) - this.u(tw.cx, tw.cy));
      let have = this.aims.get(tw.id);
      if (have == null) have = want;
      let diff = want - have;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      have += diff * Math.min(1, dt * 14);
      this.aims.set(tw.id, have);
      if (ui.selected === tw) {
        ctx.fillStyle = 'rgba(244,236,216,.12)';
        roundRect(ctx, this.u(tw.x, tw.y) * ts + 1, this.v(tw.x, tw.y) * ts + 1, ts - 2, ts - 2, ts * 0.16);
        ctx.fill();
      }
      this.at(ctx, tw.cx, tw.cy, (c) => drawTowerSprite(c, tw.type, tw.level, have, { recoil: tw.recoil, flash: tw.flash, t: t + tw.id }));
    }
  }

  drawShots(ctx) {
    const { ts, game } = this;
    ctx.lineCap = 'round';
    for (const s of game.shots) {
      const px = this.u(s.x, s.y) * ts;
      const py = this.v(s.x, s.y) * ts;
      if (s.kind === 'arrow') {
        const du = this.u(s.vx, s.vy);
        const dv = this.v(s.vx, s.vy);
        ctx.strokeStyle = '#efe6cc';
        ctx.lineWidth = Math.max(1.2, ts * 0.045);
        ctx.beginPath();
        ctx.moveTo(px - du * ts * 0.3, py - dv * ts * 0.3);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        fillCircle(ctx, px, py, Math.max(1, ts * 0.04));
      } else if (s.kind === 'shell') {
        ctx.fillStyle = 'rgba(6,10,24,.35)';
        fillEllipse(ctx, px, py, ts * 0.1, ts * 0.05);
        ctx.fillStyle = '#1a1e2e';
        fillCircle(ctx, px, py - s.h * ts, ts * 0.1);
        ctx.fillStyle = 'rgba(255,255,255,.25)';
        fillCircle(ctx, px - ts * 0.03, py - s.h * ts - ts * 0.03, ts * 0.035);
      } else if (s.kind === 'rocket') {
        const du = this.u(s.vx, s.vy);
        const dv = this.v(s.vx, s.vy);
        ctx.strokeStyle = 'rgba(255,170,80,.55)';
        ctx.lineWidth = Math.max(1.5, ts * 0.07);
        ctx.beginPath();
        ctx.moveTo(px - du * ts * 0.5, py - dv * ts * 0.5);
        ctx.lineTo(px - du * ts * 0.12, py - dv * ts * 0.12);
        ctx.stroke();
        ctx.strokeStyle = '#f4ecd8';
        ctx.lineWidth = Math.max(1.5, ts * 0.05);
        ctx.beginPath();
        ctx.moveTo(px - du * ts * 0.14, py - dv * ts * 0.14);
        ctx.lineTo(px + du * ts * 0.1, py + dv * ts * 0.1);
        ctx.stroke();
        ctx.fillStyle = PAL.red;
        fillCircle(ctx, px + du * ts * 0.1, py + dv * ts * 0.1, Math.max(1.2, ts * 0.045));
      }
    }
  }

  drawEffects(ctx, dt) {
    const { ts } = this;
    let n = 0;
    for (const r of this.rings) {
      r.life -= dt;
      if (r.life <= 0) continue;
      this.rings[n++] = r;
      const k = 1 - r.life / r.max;
      const px = this.u(r.x, r.y) * ts;
      const py = this.v(r.x, r.y) * ts;
      ctx.fillStyle = `rgba(${r.color},${0.22 * (1 - k)})`;
      fillCircle(ctx, px, py, r.r * ts * (0.35 + 0.65 * k));
      ctx.strokeStyle = `rgba(${r.color},${0.8 * (1 - k)})`;
      ctx.lineWidth = Math.max(1, ts * 0.05 * (1 - k));
      ctx.beginPath();
      ctx.arc(px, py, r.r * ts * (0.35 + 0.65 * k), 0, Math.PI * 2);
      ctx.stroke();
    }
    this.rings.length = n;

    n = 0;
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      this.particles[n++] = p;
      p.dv += p.g * dt;
      p.u += p.du * dt;
      p.v += p.dv * dt;
      if (p.wisp) p.du *= 1 - dt * 3;
      const k = p.life / p.max;
      ctx.globalAlpha = Math.min(1, k * 1.6);
      ctx.fillStyle = p.color;
      fillCircle(ctx, p.u * ts, p.v * ts, p.size * ts * (p.wisp ? 0.5 + k * 0.5 : 0.4 + k * 0.6));
    }
    ctx.globalAlpha = 1;
    this.particles.length = n;

    n = 0;
    ctx.lineJoin = 'round';
    for (const b of this.bolts) {
      b.life -= dt;
      if (b.life <= 0) continue;
      this.bolts[n++] = b;
      const k = b.life / b.max;
      ctx.beginPath();
      for (let i = 0; i < b.pts.length - 1; i++) {
        const ax = this.u(b.pts[i].x, b.pts[i].y) * ts;
        const ay = this.v(b.pts[i].x, b.pts[i].y) * ts;
        const bx = this.u(b.pts[i + 1].x, b.pts[i + 1].y) * ts;
        const by = this.v(b.pts[i + 1].x, b.pts[i + 1].y) * ts;
        const len = Math.hypot(bx - ax, by - ay);
        const steps = Math.max(2, Math.round(len / (ts * 0.3)));
        if (i === 0) ctx.moveTo(ax, ay);
        for (let s = 1; s <= steps; s++) {
          const f = s / steps;
          const j = s === steps ? 0 : (Math.random() - 0.5) * ts * 0.24;
          ctx.lineTo(ax + (bx - ax) * f - ((by - ay) / len) * j, ay + (by - ay) * f + ((bx - ax) / len) * j);
        }
      }
      ctx.strokeStyle = `rgba(110,162,255,${0.55 * k})`;
      ctx.lineWidth = Math.max(2, ts * 0.14);
      ctx.stroke();
      ctx.strokeStyle = `rgba(240,247,255,${k})`;
      ctx.lineWidth = Math.max(1, ts * 0.05);
      ctx.stroke();
    }
    this.bolts.length = n;

    n = 0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.max(10, ts * 0.34)}px ${FONT_UI}`;
    for (const f of this.floaters) {
      f.life -= dt;
      if (f.life <= 0) continue;
      this.floaters[n++] = f;
      const k = f.life / f.max;
      const px = this.u(f.x, f.y) * ts;
      const py = this.v(f.x, f.y) * ts - (1 - k) * ts * 0.7;
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(10,14,30,.8)';
      ctx.strokeText(f.text, px, py);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, px, py);
    }
    ctx.globalAlpha = 1;
    this.floaters.length = n;
  }

  drawHealthBars(ctx) {
    const { ts, game } = this;
    for (const e of game.enemies) {
      if (e.hp >= e.maxHp && !e.boss) continue;
      const w = Math.max(0.5, e.r * 2.3) * ts;
      const h = Math.max(3, ts * (e.boss ? 0.11 : 0.075));
      const px = this.u(e.x, e.y) * ts - w / 2;
      const py = this.v(e.x, e.y) * ts - e.r * ts * (e.boss ? 2.05 : 1.85) - h;
      const k = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = 'rgba(10,14,30,.8)';
      ctx.fillRect(px - 1, py - 1, w + 2, h + 2);
      ctx.fillStyle = k > 0.5 ? PAL.jade : k > 0.25 ? PAL.yellow : PAL.red;
      ctx.fillRect(px, py, w * k, h);
    }
  }

  drawRange(ctx, cx, cy, range, ok) {
    const { ts } = this;
    const px = this.u(cx, cy) * ts;
    const py = this.v(cx, cy) * ts;
    const c = ok ? '244,236,216' : '226,87,43';
    ctx.fillStyle = `rgba(${c},.08)`;
    fillCircle(ctx, px, py, range * ts);
    ctx.strokeStyle = `rgba(${c},.6)`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([ts * 0.16, ts * 0.12]);
    ctx.beginPath();
    ctx.arc(px, py, range * ts, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawSelection(ctx, ui) {
    const { ts, game } = this;
    if (ui.selected) this.drawRange(ctx, ui.selected.cx, ui.selected.cy, ui.selected.lv.range, true);
    if (ui.placing && ui.hover && game.inBounds(ui.hover.x, ui.hover.y)) {
      const { x, y } = ui.hover;
      const def = TOWERS[ui.placing];
      const lv = def.levels[0];
      const ok = game.canBuild(x, y) && game.gold >= lv.cost;
      this.drawRange(ctx, x + 0.5, y + 0.5, lv.range, ok);
      if (!ok) {
        ctx.fillStyle = 'rgba(226,87,43,.3)';
        ctx.fillRect(this.u(x, y) * ts, this.v(x, y) * ts, ts, ts);
      }
      ctx.globalAlpha = ok ? 0.85 : 0.4;
      this.at(ctx, x + 0.5, y + 0.5, (c) => drawTowerSprite(c, ui.placing, 0, this.transposed ? Math.PI / 2 : 0, { t: 0 }));
      ctx.globalAlpha = 1;
    }
  }

  drawFireflies(ctx, t) {
    if (this.reduced) return;
    for (const f of this.fireflies) {
      const x = (f.u + Math.sin(t * 0.21 * f.s + f.p) * 0.06) * this.w;
      const y = (f.v + Math.cos(t * 0.17 * f.s + f.p * 2) * 0.06) * this.h;
      const a = 0.25 + 0.45 * Math.max(0, Math.sin(t * 1.3 * f.s + f.p * 3));
      ctx.fillStyle = `rgba(214,240,150,${a * 0.25})`;
      fillCircle(ctx, x, y, this.ts * 0.12);
      ctx.fillStyle = `rgba(232,250,190,${a})`;
      fillCircle(ctx, x, y, Math.max(1, this.ts * 0.03));
    }
  }

  drawBanner(ctx, dt, ui) {
    const { w, h, ts } = this;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const b = this.banner;
    if (b) {
      b.life -= dt;
      if (b.life <= 0) this.banner = null;
      else {
        const age = b.max - b.life;
        const a = Math.min(1, age / 0.25, b.life / 0.4);
        const size = Math.min(ts * 0.95, w * 0.085);
        const cy = h * 0.4;
        ctx.globalAlpha = a;
        const band = ctx.createLinearGradient(0, 0, w, 0);
        band.addColorStop(0, 'rgba(10,14,30,0)');
        band.addColorStop(0.5, 'rgba(10,14,30,.62)');
        band.addColorStop(1, 'rgba(10,14,30,0)');
        ctx.fillStyle = band;
        ctx.fillRect(0, cy - size * 0.95, w, size * (b.sub ? 2.3 : 1.9));
        ctx.font = `${size}px ${FONT_DISPLAY}`;
        ctx.fillStyle = b.boss ? '#ff9a7a' : PAL.white;
        ctx.fillText(b.title, w / 2, cy);
        if (b.sub) {
          ctx.font = `600 ${Math.max(11, size * 0.36)}px ${FONT_UI}`;
          ctx.fillStyle = b.boss ? PAL.yellow : '#c9d2ee';
          ctx.fillText(b.sub, w / 2, cy + size * 0.85);
        }
        ctx.globalAlpha = 1;
      }
    }
    if (ui.paused) {
      const size = Math.max(12, ts * 0.42);
      ctx.font = `600 ${size}px ${FONT_UI}`;
      const tw = ctx.measureText('일시정지').width + size * 1.6;
      ctx.fillStyle = 'rgba(10,14,30,.78)';
      roundRect(ctx, w / 2 - tw / 2, ts * 0.25, tw, size * 2, size);
      ctx.fill();
      ctx.fillStyle = PAL.white;
      ctx.fillText('일시정지', w / 2, ts * 0.25 + size);
    }
  }
}
