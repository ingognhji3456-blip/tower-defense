'use strict';
/* 철벽 요새 — 캔버스 렌더러.
   시뮬레이션은 언제나 가로 16×10 좌표를 쓰고, 세로 화면에서는 여기서 x·y 를 맞바꿔 그린다.
   탑과 나무는 칸보다 키가 크므로 화면 아래쪽(앞)에 있는 것이 위쪽(뒤)을 가리도록 순서를 매겨 그린다. */

const FONT_DISPLAY = '"Black Han Sans", "Do Hyeon", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const FONT_UI = '"IBM Plex Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif';

/* 맨 윗줄에 선 높은 탑이 잘리지 않도록 지도 위에 두는 여백(타일) */
const PAD_TOP = 1.3;

/* 미리 그려 두는 그림의 범위 (타일 단위: 왼쪽·오른쪽 반너비, 위, 아래) */
const BOX_TOWER = { x: 0.8, up: 1.8, down: 0.55 };
const BOX_DECO = { x: 0.62, up: 1.12, down: 0.55 };

const POOF = {
  ant: ['#d8432f', '#ff7a5c', '#43222a'],
  wolf: ['#6682b0', '#a9bfde', '#5af2ff'],
  beetle: ['#1fa06d', '#74e8ae', '#b07f33'],
  hornet: ['#f6bd22', '#fff08a', '#33283a'],
  scorpion: ['#6244a8', '#a98be6', '#7dff6a'],
  raptor: ['#22a898', '#7ee9d6', '#ee8530'],
  dragon: ['#dc3d2c', '#ff8f6b', '#f4b93a'],
};

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
    this.pad = 0;
    this.dirty = true;
    this.cache = new Map();
    this.actors = [];
    this.reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    const land = Math.min(boxW / COLS, boxH / (ROWS + PAD_TOP));
    const port = Math.min(boxW / ROWS, boxH / (COLS + PAD_TOP));
    const transposed = port > land * 1.08;
    const ts = Math.max(8, Math.floor(Math.max(land, port) * dpr) / dpr);
    if (ts === this.ts && dpr === this.dpr && transposed === this.transposed && this.w) return;
    this.ts = ts;
    this.dpr = dpr;
    this.transposed = transposed;
    this.cols = transposed ? ROWS : COLS;
    this.rows = transposed ? COLS : ROWS;
    this.pad = Math.round(PAD_TOP * ts * dpr) / dpr;
    this.w = this.cols * ts;
    this.h = this.rows * ts + this.pad;
    this.canvas.style.width = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.cache.clear();
    this.dirty = true;
  }

  /* 게임 좌표(타일) → 화면 픽셀 */
  u(x, y) { return this.transposed ? y : x; }
  v(x, y) { return this.transposed ? x : y; }
  px(x, y) { return (this.transposed ? y : x) * this.ts; }
  py(x, y) { return (this.transposed ? x : y) * this.ts + this.pad; }

  /* 캔버스 안 픽셀 → 게임 타일 */
  tileAt(px, py) {
    const a = Math.floor(px / this.ts);
    const b = Math.floor((py - this.pad) / this.ts);
    return this.transposed ? { x: b, y: a } : { x: a, y: b };
  }

  at(ctx, x, y, fn) {
    ctx.save();
    ctx.translate(this.px(x, y), this.py(x, y));
    ctx.scale(this.ts, this.ts);
    fn(ctx);
    ctx.restore();
  }

  /* ───── 미리 그려 두는 그림 ───── */

  /* box 범위의 그림을 화면 해상도 그대로 작은 캔버스에 그려 두고 재사용한다. */
  sprite(key, box, draw) {
    let s = this.cache.get(key);
    if (s) return s;
    const k = this.ts * this.dpr;
    const c = document.createElement('canvas');
    c.width = Math.ceil(box.x * 2 * k);
    c.height = Math.ceil((box.up + box.down) * k);
    const g = c.getContext('2d');
    g.translate(box.x * k, box.up * k);
    g.scale(k, k);
    try { draw(g); } catch (err) { /* 그림 하나가 잘못돼도 게임은 계속 */ }
    s = { c, ox: box.x * this.ts, oy: box.up * this.ts, w: c.width / this.dpr, h: c.height / this.dpr };
    this.cache.set(key, s);
    return s;
  }

  blit(ctx, s, x, y) {
    const d = this.dpr;
    ctx.drawImage(s.c, Math.round((x - s.ox) * d) / d, Math.round((y - s.oy) * d) / d, s.w, s.h);
  }

  /* 걷는 동작을 한 바퀴 분량의 장면으로 나눠 그려 둔다 (우두머리가 아닌 적). */
  enemyFrame(e, t) {
    const art = ENEMY_ART[e.type];
    if (!art || !art.period || e.boss) return null;
    const n = Math.max(8, Math.min(24, Math.round(art.period * 22)));
    const phase = (((t + e.id * 0.37) % art.period) + art.period) % art.period;
    const i = Math.floor((phase / art.period) * n) % n;
    const key = 'e:' + e.type + ':' + i;
    const r = e.r;
    return this.cache.get(key) || this.sprite(key, { x: r * 2.05, up: r * 2.35, down: r * 1.4 }, (g) => art.draw(g, r, (i / n) * art.period, { seed: 0 }));
  }

  /* ───── 배경 (지형은 크기가 바뀔 때만 다시 그린다) ───── */

  paintBackground() {
    const { bg, ts, dpr, game, pad } = this;
    bg.width = this.canvas.width;
    bg.height = this.canvas.height;
    const g = bg.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rand = mulberry32(977 + game.map.id.length * 31 + game.map.id.charCodeAt(0));

    /* 풀밭 */
    g.fillStyle = ART.grass[0];
    g.fillRect(0, 0, this.w, this.h);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if ((x + y) % 2 === 0) continue;
        g.fillStyle = ART.grass[1];
        g.fillRect(this.px(x, y), this.py(x, y), ts + 0.5, ts + 0.5);
      }
    }

    /* 지도 위쪽 여백: 숲 가장자리 */
    const rows = [[0.3, '#2f7a3a', 0.62], [0.62, '#3d9146', 0.56], [0.9, '#4fa64f', 0.46]];
    for (const [f, color, rad] of rows) {
      g.fillStyle = color;
      for (let x = -0.3; x < this.cols + 0.6; x += 0.62) {
        const jitter = (rand() - 0.5) * 0.2;
        g.beginPath();
        g.arc((x + jitter) * ts, pad * f + jitter * ts * 0.4, ts * rad * (0.85 + rand() * 0.3), 0, Math.PI * 2);
        g.fill();
      }
    }
    g.fillStyle = 'rgba(20,60,30,.22)';
    g.fillRect(0, pad * 0.92, this.w, pad * 0.2);

    /* 풀포기와 들꽃 */
    g.lineCap = 'round';
    for (let i = 0; i < 230; i++) {
      const x = rand() * COLS;
      const y = rand() * ROWS;
      const px = this.px(x, y);
      const py = this.py(x, y);
      const kind = rand();
      if (kind < 0.8) {
        g.strokeStyle = kind < 0.4 ? ART.grassDark : ART.grassLight;
        g.lineWidth = Math.max(1, ts * 0.03);
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(px - ts * 0.04, py - ts * 0.1);
        g.moveTo(px + ts * 0.05, py);
        g.lineTo(px + ts * 0.08, py - ts * 0.08);
        g.stroke();
      } else {
        g.fillStyle = kind < 0.87 ? '#ffffff' : kind < 0.94 ? '#ffe36a' : '#ff9ec4';
        g.beginPath();
        g.arc(px, py, Math.max(1, ts * 0.035), 0, Math.PI * 2);
        g.fill();
      }
    }

    /* 길 */
    const trace = (path) => {
      g.beginPath();
      path.waypoints.forEach(([x, y], i) => {
        const px = this.px(x + 0.5, y + 0.5);
        const py = this.py(x + 0.5, y + 0.5);
        if (i) g.lineTo(px, py);
        else g.moveTo(px, py);
      });
    };
    g.lineJoin = 'round';
    g.lineCap = 'round';
    for (const [color, width] of [['rgba(60,90,40,.35)', 0.98], [ART.pathEdge, 0.9], [ART.path, 0.76]]) {
      g.strokeStyle = color;
      g.lineWidth = ts * width;
      for (const p of game.paths) { trace(p); g.stroke(); }
    }
    for (const s of game.samples) {
      for (let k = 0; k < 2; k++) {
        const x = s.x + (rand() - 0.5) * 0.6;
        const y = s.y + (rand() - 0.5) * 0.6;
        g.fillStyle = rand() > 0.5 ? 'rgba(150,115,60,.35)' : 'rgba(255,240,200,.4)';
        g.beginPath();
        g.ellipse(this.px(x, y), this.py(x, y), ts * (0.02 + rand() * 0.04), ts * (0.015 + rand() * 0.02), 0, 0, Math.PI * 2);
        g.fill();
      }
    }
    this.dirty = false;
  }

  /* ───── 시뮬레이션 사건 → 효과 ───── */

  spark(x, y, n, o) {
    if (this.reduced) n = Math.ceil(n / 3);
    const u = this.u(x, y);
    const v = this.v(x, y) - (o.h || 0);
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
        soft: !!o.soft,
      });
    }
    if (this.particles.length > 500) this.particles.splice(0, this.particles.length - 500);
  }

  onEvent(type, d) {
    switch (type) {
      case 'shoot':
        if (d.kind === 'shell') this.spark(d.x, d.y, 5, { h: d.h, color: ['#ffffff', '#d5d9e2'], speed: 0.8, life: 0.55, size: 0.08, lift: -0.4, soft: true });
        break;
      case 'hit':
        this.spark(d.x, d.y, 3, { color: ['#ffffff', '#ffe27e'], speed: 1.6, life: 0.2, size: 0.035 });
        break;
      case 'explode': {
        const shell = d.kind === 'shell';
        this.rings.push({ x: d.x, y: d.y, r: d.r, life: 0.32, max: 0.32, color: shell ? '255,170,60' : '255,140,60' });
        this.spark(d.x, d.y, shell ? 12 : 5, { color: ['#ffe27e', '#ee8530', '#ffffff'], speed: shell ? 3 : 2, life: 0.35, size: 0.065 });
        if (shell) this.spark(d.x, d.y, 5, { color: ['#8d94a4', '#b9bfcc'], speed: 0.7, life: 0.7, size: 0.12, lift: -0.5, soft: true });
        break;
      }
      case 'bolt':
        this.bolts.push({ pts: d.pts, life: 0.22, max: 0.22 });
        for (let i = 1; i < d.pts.length; i++) {
          this.spark(d.pts[i].x, d.pts[i].y, 3, { color: ['#ffffff', '#cba6ff'], speed: 2, life: 0.2, size: 0.04 });
        }
        break;
      case 'kill': {
        const boss = d.enemy.boss;
        this.spark(d.x, d.y, boss ? 30 : 8, { color: POOF[d.enemy.type] || '#ffffff', speed: boss ? 2.6 : 1.6, life: boss ? 0.9 : 0.5, size: boss ? 0.11 : 0.07, lift: -0.8, gravity: 4, spread: d.enemy.r });
        this.spark(d.x, d.y, boss ? 8 : 3, { color: ['#ffffff', '#f1ecdf'], speed: 0.6, life: 0.6, size: boss ? 0.2 : 0.12, lift: -0.4, soft: true });
        if (boss) this.rings.push({ x: d.x, y: d.y, r: 1.6, life: 0.6, max: 0.6, color: '255,226,126' });
        this.floaters.push({ x: d.x, y: d.y - d.enemy.r, text: '+' + d.reward, color: '#ffe27e', life: 0.9, max: 0.9 });
        break;
      }
      case 'leak':
        this.alarm = 1;
        if (!this.reduced) this.shake = 0.35;
        this.floaters.push({ x: d.x, y: d.y - 0.6, text: '−' + Math.min(d.enemy.lives, 99), color: '#ff6b55', life: 1.2, max: 1.2 });
        break;
      case 'build':
        this.rings.push({ x: d.tower.cx, y: d.tower.cy + 0.2, r: 0.75, life: 0.3, max: 0.3, color: '255,255,255' });
        this.spark(d.tower.cx, d.tower.cy + 0.3, 9, { color: ['#e3c792', '#c9aa72', '#ffffff'], speed: 1.3, life: 0.45, size: 0.07, lift: -0.3, soft: true });
        break;
      case 'upgrade':
        this.rings.push({ x: d.tower.cx, y: d.tower.cy + 0.2, r: 0.9, life: 0.45, max: 0.45, color: '255,226,126' });
        this.spark(d.tower.cx, d.tower.cy - 0.3, 14, { color: ['#ffe27e', '#ffffff'], speed: 1.3, life: 0.7, size: 0.05, lift: -1.4, spread: 0.5 });
        break;
      case 'sell':
        this.spark(d.tower.cx, d.tower.cy, 8, { color: ['#ffe27e', '#f4b93a'], speed: 2, life: 0.6, size: 0.06, lift: -1.5, gravity: 6 });
        this.floaters.push({ x: d.tower.cx, y: d.tower.cy - 0.3, text: '+' + d.value, color: '#ffe27e', life: 1, max: 1 });
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
        this.banner = { title: '막아냈습니다', sub: '상금 ' + d.bonus + ' 골드', life: 1.6, max: 1.6 };
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
    this.drawAuras(ctx, t);
    if (ui.selected) {
      ctx.fillStyle = 'rgba(255,255,255,.28)';
      roundRectPath(ctx, this.px(ui.selected.x, ui.selected.y) + 2, this.py(ui.selected.x, ui.selected.y) + 2, ts - 4, ts - 4, ts * 0.16);
      ctx.fill();
    }

    this.drawActors(ctx, t, dt);
    this.drawShots(ctx);
    this.drawEffects(ctx, dt);
    this.drawHealthBars(ctx);
    this.drawSelection(ctx, ui);
    this.drawBanner(ctx, dt, ui);
  }

  drawBuildable(ctx) {
    const { ts, game } = this;
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = 1;
    const pad = ts * 0.08;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!game.canBuild(x, y)) continue;
        roundRectPath(ctx, this.px(x, y) + pad, this.py(x, y) + pad, ts - pad * 2, ts - pad * 2, ts * 0.14);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  /* 서리탑이 뿜는 냉기 */
  drawAuras(ctx, t) {
    const { ts, game } = this;
    for (const tw of game.towers) {
      if (tw.def.kind !== 'aura') continue;
      const px = this.px(tw.cx, tw.cy);
      const py = this.py(tw.cx, tw.cy);
      ctx.fillStyle = 'rgba(156,221,248,.1)';
      ctx.beginPath();
      ctx.arc(px, py, tw.lv.range * ts, 0, Math.PI * 2);
      ctx.fill();
      const k = (t * 0.45 + tw.id * 0.37) % 1;
      ctx.strokeStyle = `rgba(236,251,255,${0.75 * (1 - k)})`;
      ctx.lineWidth = Math.max(1.5, ts * 0.06);
      ctx.beginPath();
      ctx.arc(px, py, tw.lv.range * ts * (this.reduced ? 1 : k), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /* 나무·굴·성문·탑·적을 발 딛는 높이 순으로 그린다. */
  drawActors(ctx, t, dt) {
    const { ts, game } = this;
    const list = this.actors;
    list.length = 0;
    const tmp = {};

    game.map.deco.forEach(([kind, x, y], i) => {
      list.push({ k: this.v(x + 0.5, y + 0.5) + 0.38, kind: 0, a: kind, x: x + 0.5, y: y + 0.5, i: i * 7 + x + y });
    });
    for (const p of game.paths) {
      const [bx, by] = p.waypoints[0];
      list.push({ k: this.v(bx + 0.5, by + 0.5) + 0.2, kind: 1, x: bx + 0.5, y: by + 0.5 });
    }
    const end = game.paths[0].waypoints[game.paths[0].waypoints.length - 1];
    list.push({ k: this.v(end[0] + 0.5, end[1] + 0.5) + 0.45, kind: 2, x: end[0] + 0.5, y: end[1] + 0.5 });
    for (const tw of game.towers) list.push({ k: this.v(tw.cx, tw.cy) + 0.38, kind: 3, a: tw });
    for (const e of game.enemies) {
      list.push({ k: this.v(e.x, e.y) + e.r * 0.9, kind: 4, a: e });
      const tail = e.def.tail;
      if (tail) {
        for (let n = tail.n; n >= 1; n--) {
          const d = e.dist - n * tail.gap;
          if (d <= 0.05) continue;
          e.path.at(d, tmp);
          list.push({ k: this.v(tmp.x, tmp.y) + e.r * 0.85, kind: 5, a: e, x: tmp.x, y: tmp.y, i: n });
        }
      }
    }
    list.sort((p, q) => p.k - q.k);

    for (const it of list) {
      switch (it.kind) {
        case 0: {
          const fn = TERRAIN_ART.deco[it.a];
          if (fn) this.blit(ctx, this.sprite('d:' + it.a + ':' + it.i, BOX_DECO, (g) => fn(g, it.i)), this.px(it.x, it.y), this.py(it.x, it.y));
          break;
        }
        case 1: this.landmark(ctx, it.x, it.y, 0.64, (c) => TERRAIN_ART.cave(c, t)); break;
        case 2: this.landmark(ctx, it.x, it.y, 0.72, (c) => TERRAIN_ART.gate(c, t, this.alarm)); break;
        case 3: this.drawTower(ctx, it.a, t, dt); break;
        case 4: this.drawEnemy(ctx, it.a, t); break;
        case 5: {
          const art = ENEMY_ART[it.a.type];
          if (art && art.segment) this.at(ctx, it.x, it.y, (c) => art.segment(c, it.a.r, it.i, it.a.def.tail.n, t));
          break;
        }
      }
    }
  }

  /* 굴과 성문은 칸보다 넓다. 지도 가장자리에 있으면 잘리지 않게 안쪽으로 조금 들여 그린다. */
  landmark(ctx, x, y, half, fn) {
    const ts = this.ts;
    const px = Math.max(half * ts, Math.min(this.w - half * ts, this.px(x, y)));
    ctx.save();
    ctx.translate(px, this.py(x, y));
    ctx.scale(ts, ts);
    fn(ctx);
    ctx.restore();
  }

  drawTower(ctx, tw, t, dt) {
    const art = TOWER_ART[tw.type];
    if (!art) return;
    const want = Math.atan2(this.v(tw.aimX, tw.aimY) - this.v(tw.cx, tw.cy), this.u(tw.aimX, tw.aimY) - this.u(tw.cx, tw.cy));
    let have = this.aims.get(tw.id);
    if (have == null) have = want;
    let diff = want - have;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    have += diff * Math.min(1, dt * 14);
    this.aims.set(tw.id, have);

    const x = this.px(tw.cx, tw.cy);
    const y = this.py(tw.cx, tw.cy);
    this.blit(ctx, this.sprite('t:' + tw.type + ':' + tw.level, BOX_TOWER, (g) => art.body(g, tw.level)), x, y);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(this.ts, this.ts);
    art.top(ctx, tw.level, have, { recoil: tw.recoil, flash: tw.flash, t: t + tw.id });
    ctx.restore();
    if (art.front) this.blit(ctx, this.sprite('f:' + tw.type + ':' + tw.level, BOX_TOWER, (g) => art.front(g, tw.level)), x, y);
  }

  drawEnemy(ctx, e, t) {
    const ts = this.ts;
    const sdx = this.transposed ? e.dy : e.dx;
    if (sdx < -0.3) e.flip = true;
    else if (sdx > 0.3) e.flip = false;
    const grow = Math.min(1, e.age / 0.35);
    const x = this.px(e.x, e.y);
    const y = this.py(e.x, e.y);

    if (e.slow > 0) {
      /* 냉기에 발이 묶인 표시 */
      ctx.strokeStyle = 'rgba(236,251,255,.95)';
      ctx.lineWidth = Math.max(1.5, ts * 0.045);
      ctx.beginPath();
      ctx.ellipse(x, y + e.r * 0.92 * ts, e.r * 1.25 * ts, e.r * 0.36 * ts, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(156,221,248,.35)';
      ctx.fill();
    }

    ctx.save();
    ctx.translate(x, y);
    if (grow < 1) {
      ctx.globalAlpha = grow;
      ctx.scale(grow, grow);
    }
    if (e.flip) ctx.scale(-1, 1);
    const frame = this.enemyFrame(e, t);
    if (frame) {
      ctx.drawImage(frame.c, -frame.ox, -frame.oy, frame.w, frame.h);
    } else {
      ctx.scale(ts, ts);
      const art = ENEMY_ART[e.type];
      if (art) art.draw(ctx, e.r, t + e.id * 0.7, { seed: e.id });
    }
    ctx.restore();

    if (e.hitT > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.45, e.hitT * 3.6)})`;
      ctx.beginPath();
      ctx.arc(x, y - e.r * 0.2 * ts, e.r * 1.15 * ts, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawShots(ctx) {
    const { ts, game } = this;
    ctx.lineCap = 'round';
    for (const s of game.shots) {
      const gx = this.px(s.x, s.y);
      const gy = this.py(s.x, s.y);
      const y = gy - s.h * ts;
      /* 날아가는 방향: 땅 위 방향에 내려오는 기울기를 더한다 */
      let du = this.u(s.vx || 0, s.vy || 0);
      let dv = this.v(s.vx || 0, s.vy || 0) + (s.slope || 0);
      const len = Math.hypot(du, dv) || 1;
      du /= len;
      dv /= len;
      if (s.kind === 'arrow') {
        ctx.strokeStyle = ART.OUT;
        ctx.lineWidth = Math.max(2.4, ts * 0.085);
        ctx.beginPath();
        ctx.moveTo(gx - du * ts * 0.34, y - dv * ts * 0.34);
        ctx.lineTo(gx, y);
        ctx.stroke();
        ctx.strokeStyle = '#f3e4bb';
        ctx.lineWidth = Math.max(1.2, ts * 0.04);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(gx, y, Math.max(1.2, ts * 0.045), 0, Math.PI * 2);
        ctx.fill();
      } else if (s.kind === 'shell') {
        ctx.fillStyle = ART.shadow;
        ctx.beginPath();
        ctx.ellipse(gx, gy, ts * 0.11, ts * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ART.OUT;
        ctx.beginPath();
        ctx.arc(gx, y, ts * 0.115, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#586275';
        ctx.beginPath();
        ctx.arc(gx, y, ts * 0.085, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.beginPath();
        ctx.arc(gx - ts * 0.03, y - ts * 0.03, ts * 0.03, 0, Math.PI * 2);
        ctx.fill();
      } else if (s.kind === 'rocket') {
        ctx.strokeStyle = 'rgba(255,255,255,.7)';
        ctx.lineWidth = Math.max(2, ts * 0.09);
        ctx.beginPath();
        ctx.moveTo(gx - du * ts * 0.62, y - dv * ts * 0.62);
        ctx.lineTo(gx - du * ts * 0.2, y - dv * ts * 0.2);
        ctx.stroke();
        ctx.strokeStyle = '#ffb347';
        ctx.lineWidth = Math.max(2, ts * 0.07);
        ctx.beginPath();
        ctx.moveTo(gx - du * ts * 0.32, y - dv * ts * 0.32);
        ctx.lineTo(gx - du * ts * 0.12, y - dv * ts * 0.12);
        ctx.stroke();
        ctx.strokeStyle = ART.OUT;
        ctx.lineWidth = Math.max(3, ts * 0.11);
        ctx.beginPath();
        ctx.moveTo(gx - du * ts * 0.14, y - dv * ts * 0.14);
        ctx.lineTo(gx + du * ts * 0.1, y + dv * ts * 0.1);
        ctx.stroke();
        ctx.strokeStyle = '#ee8530';
        ctx.lineWidth = Math.max(1.6, ts * 0.06);
        ctx.stroke();
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
      const px = this.px(r.x, r.y);
      const py = this.py(r.x, r.y);
      ctx.fillStyle = `rgba(${r.color},${0.3 * (1 - k)})`;
      ctx.beginPath();
      ctx.arc(px, py, r.r * ts * (0.35 + 0.65 * k), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(${r.color},${0.9 * (1 - k)})`;
      ctx.lineWidth = Math.max(1, ts * 0.06 * (1 - k));
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
      if (p.soft) { p.du *= 1 - dt * 3; p.dv *= 1 - dt * 1.5; }
      const k = p.life / p.max;
      ctx.globalAlpha = Math.min(1, k * (p.soft ? 1 : 1.6)) * (p.soft ? 0.75 : 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.u * ts, p.v * ts + this.pad, p.size * ts * (p.soft ? 1.4 - k * 0.6 : 0.4 + k * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    this.particles.length = n;

    /* 번개 */
    n = 0;
    ctx.lineJoin = 'round';
    for (const b of this.bolts) {
      b.life -= dt;
      if (b.life <= 0) continue;
      this.bolts[n++] = b;
      const k = b.life / b.max;
      ctx.beginPath();
      for (let i = 0; i < b.pts.length - 1; i++) {
        const ax = this.px(b.pts[i].x, b.pts[i].y);
        const ay = this.py(b.pts[i].x, b.pts[i].y) - (b.pts[i].h || 0) * ts;
        const bx = this.px(b.pts[i + 1].x, b.pts[i + 1].y);
        const by = this.py(b.pts[i + 1].x, b.pts[i + 1].y) - (b.pts[i + 1].h || 0) * ts;
        const len = Math.hypot(bx - ax, by - ay) || 1;
        const steps = Math.max(2, Math.round(len / (ts * 0.3)));
        if (i === 0) ctx.moveTo(ax, ay);
        for (let s = 1; s <= steps; s++) {
          const f = s / steps;
          const j = s === steps ? 0 : (Math.random() - 0.5) * ts * 0.26;
          ctx.lineTo(ax + (bx - ax) * f - ((by - ay) / len) * j, ay + (by - ay) * f + ((bx - ax) / len) * j);
        }
      }
      ctx.strokeStyle = `rgba(154,107,234,${0.75 * k})`;
      ctx.lineWidth = Math.max(3, ts * 0.17);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${k})`;
      ctx.lineWidth = Math.max(1.2, ts * 0.06);
      ctx.stroke();
    }
    this.bolts.length = n;

    /* 떠오르는 숫자 */
    n = 0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.max(11, ts * 0.36)}px ${FONT_UI}`;
    ctx.lineJoin = 'round';
    for (const f of this.floaters) {
      f.life -= dt;
      if (f.life <= 0) continue;
      this.floaters[n++] = f;
      const k = f.life / f.max;
      const px = this.px(f.x, f.y);
      const py = this.py(f.x, f.y) - (1 - k) * ts * 0.7;
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.lineWidth = Math.max(3, ts * 0.09);
      ctx.strokeStyle = ART.OUT;
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
      const w = Math.max(0.52, e.r * 2.3) * ts;
      const h = Math.max(3, ts * (e.boss ? 0.12 : 0.08));
      const px = this.px(e.x, e.y) - w / 2;
      const py = this.py(e.x, e.y) - e.r * ts * (e.boss ? 2.45 : 2.05) - h;
      const k = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = ART.OUT;
      ctx.fillRect(px - 1.5, py - 1.5, w + 3, h + 3);
      ctx.fillStyle = '#5a4a52';
      ctx.fillRect(px, py, w, h);
      ctx.fillStyle = k > 0.5 ? '#6fd66a' : k > 0.25 ? '#ffc93c' : '#ff5a45';
      ctx.fillRect(px, py, w * k, h);
    }
  }

  drawRange(ctx, cx, cy, range, ok) {
    const { ts } = this;
    const px = this.px(cx, cy);
    const py = this.py(cx, cy);
    const c = ok ? '255,255,255' : '255,80,60';
    ctx.fillStyle = `rgba(${c},.14)`;
    ctx.beginPath();
    ctx.arc(px, py, range * ts, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(43,37,54,.55)';
    ctx.lineWidth = 3.5;
    ctx.setLineDash([ts * 0.16, ts * 0.12]);
    ctx.stroke();
    ctx.strokeStyle = `rgba(${c},.95)`;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawSelection(ctx, ui) {
    const { ts, game } = this;
    if (ui.selected) this.drawRange(ctx, ui.selected.cx, ui.selected.cy, ui.selected.lv.range, true);
    if (ui.placing && ui.hover && game.inBounds(ui.hover.x, ui.hover.y)) {
      const { x, y } = ui.hover;
      const lv = TOWERS[ui.placing].levels[0];
      const ok = game.canBuild(x, y) && game.gold >= lv.cost;
      this.drawRange(ctx, x + 0.5, y + 0.5, lv.range, ok);
      if (!ok) {
        ctx.fillStyle = 'rgba(255,80,60,.4)';
        ctx.fillRect(this.px(x, y), this.py(x, y), ts, ts);
      }
      ctx.globalAlpha = ok ? 0.85 : 0.45;
      this.at(ctx, x + 0.5, y + 0.5, (c) => drawTowerSprite(c, ui.placing, 0, this.transposed ? Math.PI / 2 : 0, { t: 0 }));
      ctx.globalAlpha = 1;
    }
  }

  drawBanner(ctx, dt, ui) {
    const { w, h, ts } = this;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    const b = this.banner;
    if (b) {
      b.life -= dt;
      if (b.life <= 0) this.banner = null;
      else {
        const age = b.max - b.life;
        const a = Math.min(1, age / 0.25, b.life / 0.4);
        const size = Math.min(ts * 0.95, w * 0.085);
        const cy = this.pad + (h - this.pad) * 0.36;
        ctx.globalAlpha = a;
        const band = ctx.createLinearGradient(0, 0, w, 0);
        band.addColorStop(0, 'rgba(34,40,60,0)');
        band.addColorStop(0.5, 'rgba(34,40,60,.72)');
        band.addColorStop(1, 'rgba(34,40,60,0)');
        ctx.fillStyle = band;
        ctx.fillRect(0, cy - size * 0.95, w, size * (b.sub ? 2.3 : 1.9));
        ctx.font = `${size}px ${FONT_DISPLAY}`;
        ctx.lineWidth = Math.max(4, size * 0.16);
        ctx.strokeStyle = ART.OUT;
        ctx.strokeText(b.title, w / 2, cy);
        ctx.fillStyle = b.boss ? '#ff8a6b' : '#ffffff';
        ctx.fillText(b.title, w / 2, cy);
        if (b.sub) {
          ctx.font = `700 ${Math.max(11, size * 0.38)}px ${FONT_UI}`;
          ctx.fillStyle = '#ffe27e';
          ctx.fillText(b.sub, w / 2, cy + size * 0.85);
        }
        ctx.globalAlpha = 1;
      }
    }
    if (ui.paused) {
      const size = Math.max(12, ts * 0.42);
      ctx.font = `700 ${size}px ${FONT_UI}`;
      const tw = ctx.measureText('일시정지').width + size * 1.6;
      ctx.fillStyle = 'rgba(34,40,60,.88)';
      roundRectPath(ctx, w / 2 - tw / 2, this.pad + ts * 0.25, tw, size * 2, size);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText('일시정지', w / 2, this.pad + ts * 0.25 + size);
    }
  }
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
