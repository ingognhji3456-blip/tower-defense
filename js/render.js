'use strict';
/* 철벽 요새 — 캔버스 렌더러.
   시뮬레이션은 언제나 가로 18×11 좌표를 쓰고, 세로 화면에서는 여기서 x·y 를 맞바꿔 그린다.
   캔버스는 화면 전체를 덮고, 카메라(cam)가 그 안에서 지도를 어디에 둘지 정한다. 지도 밖으로는 풀밭과 숲이 이어진다.
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

/* 쏘는 즉시 맞는 공격이 남기는 궤적이 보이는 시간(초) */
const TRACE = { bullet: 0.16, spear: 0.2, tracer: 0.07, rail: 0.32, scythe: 0.26, toss: 0.22 };

/* 탄과 효과의 겉모습: c = 몸 색, hit = 맞았을 때 튀는 불티 색, rgb = 고리·빛의 색 */
const SKIN = {
  arrow: { c: '#f3e4bb', hit: ['#ffffff', '#ffe27e'] },
  ember: { c: '#ff9226', hit: ['#fff1a8', '#ffb347', '#e8552a'], rgb: '255,150,40' },
  harpoon: { c: '#d8dfea', hit: ['#ffffff', '#a7b2c4'] },
  shuriken: { c: '#d8dfea', hit: ['#ffffff', '#a7b2c4'] },
  icicle: { c: '#9cddf8', hit: ['#ecfbff', '#9cddf8', '#52a8dc'], rgb: '156,221,248' },
  bee: { c: '#f6bd22', hit: ['#fff08a', '#f6bd22'] },
  orb: { c: '#cba6ff', hit: ['#ffffff', '#cba6ff', '#9a6bea'], rgb: '203,166,255' },
  shell: { c: '#586275', rgb: '255,170,60', hit: ['#ffe27e', '#ee8530', '#ffffff'] },
  bomb: { c: '#3a3440', rgb: '255,150,50', hit: ['#ffe27e', '#ee8530', '#ffffff'] },
  vial: { c: '#8fe04a', rgb: '143,224,74', hit: ['#d6ff8a', '#8fe04a', '#4f9a2a'] },
  tar: { c: '#2f2a33', rgb: '60,50,58', hit: ['#4a4350', '#2f2a33', '#6b5f4a'] },
  /* 탑 둘레로 퍼지는 고리 */
  bell: { rgb: '255,226,126', hit: ['#ffe27e', '#ffffff'] },
  ice: { rgb: '156,221,248', hit: ['#ecfbff', '#9cddf8'] },
  quake: { rgb: '176,141,88', hit: ['#c9aa72', '#8d6e3f', '#e3c792'] },
  void: { rgb: '154,107,234', hit: ['#cba6ff', '#6640b4'] },
  time: { rgb: '111,159,242', hit: ['#ffffff', '#6f9ff2'] },
  thorn: { rgb: '63,158,79' },
  curse: { rgb: '154,107,234' },
  fire: { rgb: '255,150,40', hit: ['#fff1a8', '#ffb347', '#e8552a'] },
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
    this.w = 0; // 지도 그림의 크기(px): 숲 띠(pad)를 포함한다
    this.h = 0;
    this.pad = 0;
    this.cam = { x: 0, y: 0 }; // 화면 왼쪽 위에 놓이는 지도 그림 좌표(px)
    this.viewW = 0;
    this.viewH = 0;
    this.inset = { top: 0, bottom: 0 };
    this.still = true; // 카메라가 멈춰 있으면 땅을 한 번만 그려 두고 쓴다
    this.clean = false; // 로비의 전투 장면: 체력 막대·숫자·알림을 빼고 깔끔하게
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
    this.tracers = [];
    this.banner = null;
    this.shake = 0;
    this.alarm = 0;
    this.aims = new Map();
    this.poses = new Map(); // 화염파의 몸짓을 프레임 사이에 부드럽게 잇기 위한 값
    this.columns = []; // 화염파의 불기둥
    this.cuts = []; // 홍련의 십자 베기 자국
  }

  setGame(game) {
    this.game = game;
    this.reset();
    this.dirty = true;
  }

  /* 게임 화면: 화면 전체를 덮고, 상황판(위)과 건설 서랍(아래)을 뺀 자리에 지도가 가장 크게 들어가도록
     방향(가로/세로)과 타일 크기를 고른다. inset = { top, bottom, side } (px). */
  fit(viewW, viewH, inset) {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const top = (inset && inset.top) || 0;
    const bottom = (inset && inset.bottom) || 0;
    const side = (inset && inset.side) || 0;
    const safeW = Math.max(40, viewW - side * 2);
    const safeH = Math.max(40, viewH - top - bottom);
    const HEAD = 0.6; // 지도 위로 드러나는 숲 띠(타일). 나머지는 상황판 밑으로 들어간다.
    const land = Math.min(safeW / COLS, safeH / (ROWS + HEAD));
    const port = Math.min(safeW / ROWS, safeH / (COLS + HEAD));
    const transposed = port > land * 1.08;
    const ts = Math.max(8, Math.floor(Math.max(land, port) * dpr) / dpr);
    const key = [viewW, viewH, top, bottom, ts, dpr, transposed].join(',');
    if (key === this.fitKey && this.still) return;
    this.fitKey = key;
    this.still = true;
    this.inset = { top, bottom };
    this.setScale(viewW, viewH, ts, dpr, transposed);
    const slack = safeH - (this.rows + HEAD) * ts;
    this.cam.x = Math.round(-(viewW - this.w) / 2 * dpr) / dpr;
    this.cam.y = Math.round((this.pad - (top + HEAD * ts + slack / 2)) * dpr) / dpr;
  }

  /* 로비의 전투 장면: 타일 크기를 직접 정하고, 그 뒤 this.cam 을 움직여 지도 위를 옮겨 다닌다. */
  setView(viewW, viewH, ts, dpr) {
    this.still = false;
    this.fitKey = '';
    if (viewW === this.viewW && viewH === this.viewH && ts === this.ts && dpr === this.dpr && !this.transposed) return;
    this.setScale(viewW, viewH, ts, dpr, false);
  }

  setScale(viewW, viewH, ts, dpr, transposed) {
    this.ts = ts;
    this.dpr = dpr;
    this.transposed = transposed;
    this.cols = transposed ? ROWS : COLS;
    this.rows = transposed ? COLS : ROWS;
    this.pad = Math.round(PAD_TOP * ts * dpr) / dpr;
    this.w = this.cols * ts;
    this.h = this.rows * ts + this.pad;
    this.viewW = viewW;
    this.viewH = viewH;
    this.canvas.width = Math.round(viewW * dpr);
    this.canvas.height = Math.round(viewH * dpr);
    this.cache.clear();
    this.dirty = true;
  }

  /* 쓰지 않는 동안 큰 그림들을 내려놓는다. 다시 그릴 때 새로 만든다. */
  release() {
    this.bg.width = 1;
    this.bg.height = 1;
    this.cache.clear();
    this.dirty = true;
  }

  /* 게임 좌표(타일) → 지도 그림 좌표(px) */
  u(x, y) { return this.transposed ? y : x; }
  v(x, y) { return this.transposed ? x : y; }
  px(x, y) { return (this.transposed ? y : x) * this.ts; }
  py(x, y) { return (this.transposed ? x : y) * this.ts + this.pad; }

  /* 화면 안 픽셀 → 게임 타일 */
  tileAt(px, py) {
    const a = Math.floor((px + this.cam.x) / this.ts);
    const b = Math.floor((py + this.cam.y - this.pad) / this.ts);
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

  /* ───── 땅 ───── */

  /* 카메라가 멈춰 있을 때: 화면 크기의 땅 그림을 한 번 그려 둔다. */
  paintGround(camX, camY) {
    const { bg, dpr } = this;
    bg.width = this.canvas.width;
    bg.height = this.canvas.height;
    const g = bg.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, -camX * dpr, -camY * dpr);
    this.drawGround(g, camX, camY);
    this.dirty = false;
  }

  /* 화면에 보이는 만큼의 땅을 그린다. 지도 밖으로도 풀밭과 숲, 나무와 바위가 이어진다. */
  drawGround(ctx, camX, camY) {
    const { ts, pad, game } = this;
    const vw = this.viewW;
    const vh = this.viewH;
    const hash = (a, b) => {
      const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
      return v - Math.floor(v);
    };
    const tx0 = Math.floor(camX / ts) - 1;
    const tx1 = Math.ceil((camX + vw) / ts) + 1;
    const ty0 = Math.max(0, Math.floor((camY - pad) / ts) - 1);
    const ty1 = Math.ceil((camY + vh - pad) / ts) + 1;

    ctx.fillStyle = ART.grass[0];
    ctx.fillRect(camX - 2, camY - 2, vw + 4, vh + 4);
    ctx.fillStyle = ART.grass[1];
    for (let y = ty0; y <= ty1; y++) {
      for (let x = tx0; x <= tx1; x++) {
        if ((x + y) & 1) ctx.fillRect(x * ts, y * ts + pad, ts + 0.5, ts + 0.5);
      }
    }
    /* 지도 바깥은 살짝 어둡게 해서 탑을 세울 수 있는 곳과 구분한다 */
    ctx.fillStyle = 'rgba(30,70,40,.22)';
    ctx.fillRect(camX - 2, pad, -camX + 2, vh + camY + 4);
    ctx.fillRect(this.w, pad, camX + vw - this.w + 2, vh + camY + 4);
    ctx.fillRect(0, this.h, this.w, camY + vh - this.h + 2);

    /* 풀포기와 들꽃 */
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, ts * 0.03);
    for (let y = ty0; y <= ty1; y++) {
      for (let x = tx0; x <= tx1; x++) {
        for (let k = 0; k < 2; k++) {
          const h = hash(x + k * 17.3, y - k * 9.1);
          const px = (x + hash(x * 3.1 + k, y)) * ts;
          const py = (y + hash(x, y * 2.7 + k)) * ts + pad;
          if (h < 0.72) {
            ctx.strokeStyle = h < 0.36 ? ART.grassDark : ART.grassLight;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px - ts * 0.04, py - ts * 0.1);
            ctx.moveTo(px + ts * 0.05, py);
            ctx.lineTo(px + ts * 0.08, py - ts * 0.08);
            ctx.stroke();
          } else if (h < 0.86) {
            ctx.fillStyle = h < 0.77 ? '#ffffff' : h < 0.82 ? '#ffe36a' : '#ff9ec4';
            ctx.beginPath();
            ctx.arc(px, py, Math.max(1, ts * 0.035), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    /* 위쪽 숲 가장자리 */
    if (camY < pad * 1.2) {
      ctx.fillStyle = '#2f7a3a';
      ctx.fillRect(camX - 2, camY - 2, vw + 4, pad * 0.3 - camY + 2);
      for (const [f, color, rad, row] of [[0.3, '#2f7a3a', 0.62, 1], [0.62, '#3d9146', 0.56, 2], [0.9, '#4fa64f', 0.46, 3]]) {
        ctx.fillStyle = color;
        const step = ts * 0.62;
        for (let i = Math.floor(camX / step) - 2; i * step < camX + vw + ts; i++) {
          const j = (hash(i, row) - 0.5) * 0.2;
          ctx.beginPath();
          ctx.arc(i * step + j * ts, pad * f + j * ts * 0.4, ts * rad * (0.85 + hash(i + 0.5, row) * 0.3), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.fillStyle = 'rgba(20,60,30,.22)';
      ctx.fillRect(camX - 2, pad * 0.92, vw + 4, pad * 0.2);
    }

    /* 길 */
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const [color, width] of [['rgba(60,90,40,.35)', 0.98], [ART.pathEdge, 0.9], [ART.path, 0.76]]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = ts * width;
      for (const p of game.paths) {
        ctx.beginPath();
        p.waypoints.forEach(([x, y], i) => {
          if (i) ctx.lineTo(this.px(x + 0.5, y + 0.5), this.py(x + 0.5, y + 0.5));
          else ctx.moveTo(this.px(x + 0.5, y + 0.5), this.py(x + 0.5, y + 0.5));
        });
        ctx.stroke();
      }
    }
    game.samples.forEach((s, i) => {
      const sx = this.px(s.x, s.y);
      const sy = this.py(s.x, s.y);
      if (sx < camX - ts || sx > camX + vw + ts || sy < camY - ts || sy > camY + vh + ts) return;
      for (let k = 0; k < 2; k++) {
        ctx.fillStyle = hash(i, k + 5) > 0.5 ? 'rgba(150,115,60,.35)' : 'rgba(255,240,200,.4)';
        ctx.beginPath();
        ctx.ellipse(sx + (hash(i, k) - 0.5) * 0.6 * ts, sy + (hash(i, k + 2) - 0.5) * 0.6 * ts, ts * (0.02 + hash(i, k + 3) * 0.04), ts * (0.015 + hash(i, k + 4) * 0.02), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    /* 지도 바깥의 나무와 바위 */
    for (let y = ty0; y <= ty1; y++) {
      for (let x = tx0; x <= tx1; x++) {
        if (x >= -1 && x <= this.cols && y <= this.rows) continue;
        const h = hash(x * 1.7, y * 2.3);
        if (h > 0.22) continue;
        const kind = h < 0.09 ? 'tree' : h < 0.17 ? 'pine' : 'rock';
        const seed = Math.floor(h * 1000) % 9;
        const fn = TERRAIN_ART.deco[kind];
        if (fn) this.blit(ctx, this.sprite('d:' + kind + ':' + seed, BOX_DECO, (g) => fn(g, seed)), (x + 0.5) * ts, (y + 0.5) * ts + pad);
      }
    }
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

  /* 화염탑의 불길: 분사구에서 겨눈 쪽으로 뻗어 나가며 커지는 불덩이들 */
  flame(d) {
    const u0 = this.u(d.x, d.y);
    const v0 = this.v(d.x, d.y) - d.h;
    const u1 = this.u(d.tx, d.ty);
    const v1 = this.v(d.tx, d.ty) - 0.1;
    const len = Math.hypot(u1 - u0, v1 - v0) || 1;
    const du = (u1 - u0) / len;
    const dv = (v1 - v0) / len;
    const reach = Math.max(len, d.range * 0.8);
    for (let i = 0; i < (this.reduced ? 1 : 3); i++) {
      const life = 0.3 + Math.random() * 0.12;
      const side = (Math.random() - 0.5) * 0.9;
      this.particles.push({
        u: u0 + du * 0.34,
        v: v0 + dv * 0.34,
        du: (du * reach) / life - dv * side,
        dv: (dv * reach) / life + du * side,
        g: 0,
        life,
        max: life,
        size: 0.11 + Math.random() * 0.06,
        fire: true,
      });
    }
    if (this.particles.length > 500) this.particles.splice(0, this.particles.length - 500);
  }

  onEvent(type, d) {
    switch (type) {
      case 'shoot':
        if (d.kind === 'shell' && (d.skin === 'shell' || d.skin === 'bomb')) {
          this.spark(d.x, d.y, d.skin === 'bomb' ? 8 : 5, { h: d.h, color: ['#ffffff', '#d5d9e2'], speed: 0.8, life: 0.55, size: 0.08, lift: -0.4, soft: true });
        } else if (d.kind === 'snipe') {
          this.tracers.push({ x0: d.x, y0: d.y, h: d.h, x1: d.tx, y1: d.ty, skin: d.skin, life: TRACE[d.skin] || 0.16, max: TRACE[d.skin] || 0.16 });
          if (d.skin === 'rail') this.spark(d.x, d.y, 6, { h: d.h, color: ['#ffffff', '#9cddf8'], speed: 1.6, life: 0.3, size: 0.05 });
          else if (d.skin !== 'tracer') this.spark(d.tx, d.ty, 5, { color: ['#ffffff', '#ffe27e'], speed: 2.4, life: 0.22, size: 0.04 });
        } else if (d.kind === 'flame') this.flame(d);
        else if (d.kind === 'trap') this.tracers.push({ x0: d.x, y0: d.y, h: d.h, x1: d.tx, y1: d.ty, skin: 'toss', life: 0.22, max: 0.22 });
        else if (d.kind === 'lord') {
          const tw = d.tower;
          this.rings.push({ x: tw.cx, y: tw.cy + 0.2, r: 0.9, life: 0.3, max: 0.3, color: '255,150,40' });
        } else if (d.kind === 'blade') {
          /* 칼을 긋는 순간 칼끝 쪽에서 불티가 튄다. 회전 베기는 둘레로 고리가 퍼진다 */
          const tw = d.tower;
          const spin = d.step === 2;
          const a = tw.slash ? (tw.slash.a0 + tw.slash.a1) / 2 : tw.mid;
          const r = tw.range * 0.8;
          if (spin) {
            this.rings.push({ x: tw.cx, y: tw.cy, r: tw.range * 1.05, life: 0.34, max: 0.34, color: '255,150,40' });
            this.spark(tw.cx, tw.cy, 18, { color: ['#fff1a8', '#ffb347', '#e8552a'], speed: tw.range * 2.4, life: 0.36, size: 0.07, lift: -0.3 });
            if (!this.reduced && !this.clean) this.shake = Math.max(this.shake, 0.07);
          } else {
            this.spark(tw.cx + Math.cos(a) * r, tw.cy + Math.sin(a) * r, 7, { color: ['#fff1a8', '#ffb347', '#e8552a'], speed: 2.2, life: 0.3, size: 0.06, lift: -0.4, spread: tw.range * 0.6 });
          }
        }
        break;
      case 'nova': {
        /* 탑 둘레로 퍼지는 고리(그림은 drawShockwaves): 시작할 때 탑에서 불티가 튄다 */
        const sk = SKIN[d.skin] || SKIN.bell;
        this.spark(d.x, d.y, 10, { color: sk.hit, speed: d.r * 2.2, life: 0.35, size: 0.06, lift: -0.3 });
        if (d.skin === 'quake' && !this.reduced && !this.clean) this.shake = Math.max(this.shake, 0.1);
        break;
      }
      case 'sear': {
        /* 고리나 화염파의 광선에 닿은 적 */
        const sk = SKIN[d.skin] || SKIN.fire;
        this.rings.push({ x: d.x, y: d.y, r: 0.45 + d.r, life: 0.26, max: 0.26, color: sk.rgb });
        this.spark(d.x, d.y, 6, { color: sk.hit || ['#ffffff'], speed: 2.2, life: 0.36, size: 0.07, lift: -0.9 });
        break;
      }
      case 'exec':
        /* 처형 */
        this.rings.push({ x: d.x, y: d.y, r: 0.6 + d.r, life: 0.4, max: 0.4, color: '60,30,80' });
        this.spark(d.x, d.y, 10, { color: ['#cba6ff', '#3a2a50', '#ffffff'], speed: 2.4, life: 0.5, size: 0.07, lift: -0.6 });
        if (!this.clean) this.floaters.push({ x: d.x, y: d.y - d.r - 0.2, text: '처형', color: '#cba6ff', life: 0.9, max: 0.9 });
        break;
      case 'income':
        if (!this.clean) this.floaters.push({ x: d.tower.cx, y: d.tower.cy - d.tower.lv.h - 0.1, text: '+' + d.amount, color: '#ffe27e', life: 1, max: 1 });
        this.spark(d.tower.cx, d.tower.cy - 0.2, 4, { color: ['#ffe27e', '#fff6cf'], speed: 1, life: 0.5, size: 0.04, lift: -1 });
        break;
      case 'hit': {
        const sk = SKIN[d.skin] || SKIN.arrow;
        this.spark(d.x, d.y, 3, { color: sk.hit, speed: 1.6, life: 0.2, size: 0.035 });
        break;
      }
      case 'explode': {
        if (d.kind === 'trap') {
          this.rings.push({ x: d.x, y: d.y, r: d.r, life: 0.25, max: 0.25, color: '216,223,234' });
          this.spark(d.x, d.y, 8, { color: ['#d8dfea', '#a7b2c4', '#e3c792'], speed: 2.2, life: 0.3, size: 0.05, lift: -0.6 });
          break;
        }
        if (d.kind === 'rocket') {
          this.rings.push({ x: d.x, y: d.y, r: d.r, life: 0.32, max: 0.32, color: '255,140,60' });
          this.spark(d.x, d.y, 5, { color: ['#ffe27e', '#ee8530', '#ffffff'], speed: 2, life: 0.35, size: 0.065 });
          break;
        }
        const sk = SKIN[d.skin] || SKIN.shell;
        const heavy = d.skin === 'shell' || d.skin === 'bomb';
        this.rings.push({ x: d.x, y: d.y, r: d.r, life: d.skin === 'tar' ? 0.9 : heavy ? 0.32 : 0.4, max: d.skin === 'tar' ? 0.9 : heavy ? 0.32 : 0.4, color: sk.rgb });
        this.spark(d.x, d.y, heavy ? (d.skin === 'bomb' ? 18 : 12) : 8, { color: sk.hit, speed: heavy ? 3 : 1.6, life: heavy ? 0.35 : 0.5, size: heavy ? 0.065 : 0.07, lift: heavy ? 0 : -0.4 });
        if (heavy) this.spark(d.x, d.y, d.skin === 'bomb' ? 8 : 5, { color: ['#8d94a4', '#b9bfcc'], speed: 0.7, life: 0.7, size: 0.12, lift: -0.5, soft: true });
        if (d.skin === 'bomb' && !this.reduced && !this.clean) this.shake = Math.max(this.shake, 0.08);
        break;
      }
      case 'bolt':
        this.bolts.push({ pts: d.pts, life: 0.22, max: 0.22 });
        for (let i = 1; i < d.pts.length; i++) {
          this.spark(d.pts[i].x, d.pts[i].y, 3, { color: ['#ffffff', '#cba6ff'], speed: 2, life: 0.2, size: 0.04 });
        }
        break;
      case 'burst':
        if (d.kind === 'shock') {
          /* 발을 구른 자리에서 불티가 사방으로 튄다 (퍼지는 고리는 drawShockwaves 가 그린다) */
          this.spark(d.x, d.y + 0.2, 22, { color: ['#fff1a8', '#ffb347', '#e8552a'], speed: d.r * 2.6, life: 0.4, size: 0.075, lift: -0.4 });
          if (!this.reduced && !this.clean) this.shake = Math.max(this.shake, 0.14);
        } else if (d.kind === 'thunder') {
          /* 벼락: 하늘에서 그 자리로 내리꽂힌다 */
          this.columns.push({ kind: 'thunder', x: d.x, y: d.y, r: d.r, life: 0.24, max: 0.24, seed: Math.random() });
          this.rings.push({ x: d.x, y: d.y, r: d.r * 1.2, life: 0.3, max: 0.3, color: '203,166,255' });
          this.spark(d.x, d.y, 8, { color: ['#ffffff', '#cba6ff', '#9cddf8'], speed: 2.6, life: 0.3, size: 0.05 });
        } else if (d.kind === 'cross') {
          /* 십자 베기: 엇갈린 두 줄의 불꽃 칼자국 */
          this.cuts.push({ x: d.x, y: d.y, r: d.r, life: 0.5, max: 0.5, seed: Math.random() });
          this.spark(d.x, d.y, 16, { color: ['#fff1a8', '#ffb347', '#e8552a', '#ffffff'], speed: 3.4, life: 0.4, size: 0.07, lift: -0.4 });
          if (!this.reduced && !this.clean) this.shake = Math.max(this.shake, 0.1);
        } else if (d.kind === 'sword') {
          /* 화염검이 땅에 꽂히며 불길이 솟는다 */
          this.columns.push({ kind: 'sword', x: d.x, y: d.y, r: d.r, life: 0.55, max: 0.55 });
          this.rings.push({ x: d.x, y: d.y, r: d.r * 1.3, life: 0.36, max: 0.36, color: '255,150,40' });
          this.spark(d.x, d.y, 12, { color: ['#fff1a8', '#ffb347', '#e8552a'], speed: 2.8, life: 0.45, size: 0.07, lift: -1.4, spread: d.r * 0.6 });
          if (!this.reduced && !this.clean) this.shake = Math.max(this.shake, 0.06);
        } else if (d.kind === 'pillar') {
          this.columns.push({ x: d.x, y: d.y, r: d.r, life: 0.6, max: 0.6 });
          this.rings.push({ x: d.x, y: d.y, r: d.r * 1.25, life: 0.4, max: 0.4, color: '255,150,40' });
          this.spark(d.x, d.y, 14, { color: ['#fff1a8', '#ffb347', '#e8552a'], speed: 2.4, life: 0.6, size: 0.08, lift: -2.6, spread: d.r });
        } else {
          this.rings.push({ x: d.x, y: d.y, r: d.r * 1.3, life: 0.36, max: 0.36, color: '255,130,40' });
          this.spark(d.x, d.y, 14, { color: ['#fff1a8', '#ffb347', '#e8552a', '#ffffff'], speed: 3.2, life: 0.4, size: 0.075 });
          this.spark(d.x, d.y, 5, { color: ['#4a4658', '#6b6678'], speed: 0.8, life: 0.75, size: 0.13, lift: -0.5, soft: true });
          if (!this.reduced && !this.clean) this.shake = Math.max(this.shake, 0.1);
        }
        break;
      case 'kill': {
        const boss = d.enemy.boss;
        this.spark(d.x, d.y, boss ? 30 : 8, { color: POOF[d.enemy.type] || '#ffffff', speed: boss ? 2.6 : 1.6, life: boss ? 0.9 : 0.5, size: boss ? 0.11 : 0.07, lift: -0.8, gravity: 4, spread: d.enemy.r });
        this.spark(d.x, d.y, boss ? 8 : 3, { color: ['#ffffff', '#f1ecdf'], speed: 0.6, life: 0.6, size: boss ? 0.2 : 0.12, lift: -0.4, soft: true });
        if (boss) this.rings.push({ x: d.x, y: d.y, r: 1.6, life: 0.6, max: 0.6, color: '255,226,126' });
        if (d.reward > 0 && !this.clean) this.floaters.push({ x: d.x, y: d.y - d.enemy.r, text: '+' + d.reward, color: '#ffe27e', life: 0.9, max: 0.9 });
        break;
      }
      case 'leak':
        this.alarm = 1;
        if (!this.reduced) this.shake = 0.35;
        if (!this.clean) this.floaters.push({ x: d.x, y: d.y - 0.6, text: '−' + Math.min(d.enemy.lives, 99), color: '#ff6b55', life: 1.2, max: 1.2 });
        break;
      case 'build':
        if (d.tower.def.unique) {
          /* 화염파의 등장: 불빛 고리가 퍼지고 불티가 솟는다 */
          this.rings.push({ x: d.tower.cx, y: d.tower.cy + 0.2, r: 1.8, life: 0.7, max: 0.7, color: '255,150,40' });
          this.spark(d.tower.cx, d.tower.cy - 0.3, 26, { color: ['#ffd88f', '#ff9226', '#ffffff', '#2f2b3d'], speed: 2.6, life: 0.8, size: 0.07, lift: -1.2, spread: 0.4 });
          if (!this.reduced && !this.clean) this.shake = 0.2;
        }
        this.rings.push({ x: d.tower.cx, y: d.tower.cy + 0.2, r: 0.75, life: 0.3, max: 0.3, color: '255,255,255' });
        this.spark(d.tower.cx, d.tower.cy + 0.3, 9, { color: ['#e3c792', '#c9aa72', '#ffffff'], speed: 1.3, life: 0.45, size: 0.07, lift: -0.3, soft: true });
        break;
      case 'upgrade':
        if (d.tower.def.unique) {
          /* 망토가 길어지고 불길이 커지는 순간 */
          this.rings.push({ x: d.tower.cx, y: d.tower.cy + 0.2, r: 1.5, life: 0.6, max: 0.6, color: '255,150,40' });
          this.spark(d.tower.cx, d.tower.cy - 0.4, 22, { color: ['#ffd88f', '#ffffff', '#ff9226'], speed: 2.2, life: 0.8, size: 0.06, lift: -1.6, spread: 0.5 });
        }
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
    const t = ui.time;
    const dt = ui.dt;
    const camX = Math.round(this.cam.x * dpr) / dpr;
    const camY = Math.round(this.cam.y * dpr) / dpr;

    if (this.still) {
      if (this.dirty) this.paintGround(camX, camY);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.bg, 0, 0);
    }
    ctx.setTransform(dpr, 0, 0, dpr, -camX * dpr, -camY * dpr);
    if (!this.still) this.drawGround(ctx, camX, camY);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      const k = this.shake * ts * 0.25;
      ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
    }
    if (this.alarm > 0) this.alarm = Math.max(0, this.alarm - dt * 1.2);

    if (ui.placing) this.drawBuildable(ctx);
    this.drawAuras(ctx, t);
    if (ui.selected) {
      ctx.fillStyle = 'rgba(255,255,255,.28)';
      roundRectPath(ctx, this.px(ui.selected.x, ui.selected.y) + 2, this.py(ui.selected.x, ui.selected.y) + 2, ts - 4, ts - 4, ts * 0.16);
      ctx.fill();
    }

    this.drawStrikeMarks(ctx, t);
    this.drawShockwaves(ctx, t);
    this.drawActors(ctx, t, dt);
    this.drawBeams(ctx, t);
    this.drawSweeps(ctx, t);
    this.drawSlashes(ctx, t, dt);
    this.drawStrikes(ctx, t, dt);
    this.drawShots(ctx, t);
    this.drawEffects(ctx, dt);
    if (!this.clean) this.drawHealthBars(ctx);
    this.drawSelection(ctx, ui);

    /* 화면에 고정된 알림 */
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!this.clean) this.drawBanner(ctx, dt, ui);
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

  /* 늘 걸려 있는 효과의 범위: 서리탑의 냉기, 가시덩굴, 저주, 시계탑, 그리고 곁의 탑을 돕는 탑들 */
  drawAuras(ctx, t) {
    const { ts, game } = this;
    for (const tw of game.towers) {
      const mech = tw.def.mech;
      if (mech !== 'aura' && mech !== 'buff') continue;
      const px = this.px(tw.cx, tw.cy);
      const py = this.py(tw.cx, tw.cy);
      const rgb = mech === 'buff' ? '255,226,126' : (SKIN[tw.def.skin] || SKIN.ice).rgb;
      const r = tw.lv.range * ts;
      ctx.fillStyle = `rgba(${rgb},${mech === 'buff' ? 0.06 : 0.1})`;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      const k = (t * (mech === 'buff' ? 0.3 : 0.45) + tw.id * 0.37) % 1;
      ctx.strokeStyle = `rgba(${rgb},${0.75 * (1 - k)})`;
      ctx.lineWidth = Math.max(1.5, ts * (mech === 'buff' ? 0.035 : 0.06));
      ctx.beginPath();
      ctx.arc(px, py, r * (this.reduced ? 1 : k), 0, Math.PI * 2);
      ctx.stroke();
    }
    /* 깔아 둔 덫 */
    for (const q of game.traps || []) {
      const x = this.px(q.x, q.y);
      const y = this.py(q.x, q.y);
      const k = Math.min(1, q.age / 0.3);
      ctx.fillStyle = 'rgba(22,40,24,.22)';
      ctx.beginPath();
      ctx.ellipse(x, y + ts * 0.03, ts * 0.2 * k, ts * 0.09 * k, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ART.OUT;
      ctx.lineWidth = Math.max(2, ts * 0.07);
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = q.seed * 6.28 + i * 1.571;
        ctx.moveTo(x, y - ts * 0.03);
        ctx.lineTo(x + Math.cos(a) * ts * 0.15 * k, y - ts * 0.03 + Math.sin(a) * ts * 0.07 * k - ts * 0.07 * k);
      }
      ctx.stroke();
      ctx.strokeStyle = '#d8dfea';
      ctx.lineWidth = Math.max(1, ts * 0.03);
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

    /* 화면 밖에 있는 것은 그리지 않는다 (키 큰 그림이 걸칠 수 있어 여유를 둔다) */
    const cam = this.cam;
    const x0 = cam.x - ts * 2.6;
    const x1 = cam.x + this.viewW + ts * 2.6;
    const y0 = cam.y - ts * 1.5;
    const y1 = cam.y + this.viewH + ts * 2.6;

    for (const it of list) {
      const o = it.kind === 3 || it.kind === 4 ? it.a : it;
      const ox = it.kind === 3 ? o.cx : o.x;
      const oy = it.kind === 3 ? o.cy : o.y;
      const ax = this.px(ox, oy);
      const ay = this.py(ox, oy);
      if (ax < x0 || ax > x1 || ay < y0 || ay > y1) continue;
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

  /* 굴과 성문: 칸보다 넓은 그림 */
  landmark(ctx, x, y, half, fn) {
    ctx.save();
    ctx.translate(this.px(x, y), this.py(x, y));
    ctx.scale(this.ts, this.ts);
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
    const o = { recoil: tw.recoil, flash: tw.flash, t: t + tw.id };
    /* load: 다음 공격이 얼마나 준비됐는지 (0 = 막 쏜 참, 1 = 준비 끝). 장전하는 모습을 그리는 탑들이 쓴다 */
    const every = tw.lv.cd || tw.lv.every;
    o.load = every && this.game.phase === 'wave' ? 1 - Math.max(0, Math.min(1, tw.cd / (every / tw.haste))) : 1;
    if (tw.type === 'lord') have = this.lordPose(tw, o, have, want, dt);
    else if (tw.def.mech === 'blade') have = this.bladePose(tw, o, have, want, dt);
    art.top(ctx, tw.level, have, o);
    ctx.restore();
    if (art.front) this.blit(ctx, this.sprite('f:' + tw.type + ':' + tw.level, BOX_TOWER, (g) => art.front(g, tw.level)), x, y);
  }

  /* 화염파의 몸짓을 정한다. 자세가 뚝뚝 끊기지 않도록 겨눔·발사 정도를 프레임마다 조금씩 따라가게 하고,
     몸이 보는 쪽은 겨눈 적(휘두르는 동안은 부채꼴 한가운데) 쪽으로 고정한다. 돌려주는 값은 팔이 가리킬 각도. */
  lordPose(tw, o, have, want, dt) {
    let st = this.poses.get(tw.id);
    if (!st) {
      st = { aim: 0, fire: 0, face: Math.cos(want) >= 0 ? 1 : -1 };
      this.poses.set(tw.id, st);
    }
    const sweeping = !!tw.sweep;
    const waving = this.game.phase === 'wave';
    const q = dt > 0 ? 1 - Math.exp(-dt * 13) : 0;
    const ready = waving && !tw.idle && tw.cast <= 0 ? Math.max(0, Math.min(1, 1 - tw.cd / 0.5)) : 0;
    st.fire += ((sweeping ? 1 : 0) - st.fire) * q;
    st.aim += ((sweeping ? 1 : ready) - st.aim) * q;
    /* 보는 쪽: 거의 위아래를 겨눌 때는 보던 쪽을 그대로 둔다 */
    const c = this.u(tw.cx + Math.cos(tw.mid), tw.cy + Math.sin(tw.mid)) - this.u(tw.cx, tw.cy);
    if (Math.abs(c) > 0.2) st.face = c >= 0 ? 1 : -1;
    /* 광선을 휘두르는 동안은 팔이 광선과 한 치도 어긋나지 않게 한다 */
    const ang = sweeping ? want : have;
    if (sweeping) this.aims.set(tw.id, want);
    o.pose = st;
    o.face = st.face;
    o.gest = tw.gest;
    o.cast = tw.cast > 0 ? tw.cast / (tw.castDur || 1) : 0;
    st.o = o;
    st.ang = ang;
    return ang;
  }

  /* 홍련의 검기가 지금 어디까지 왔는지: [꼬리, 머리] 의 각도(전장 기준)와 진행 정도 */
  slashSpan(s) {
    const k = Math.min(1, s.t / s.dur);
    const head = k * (2 - k); /* 처음에 빠르게 나갔다가 끝에서 느려진다 */
    const tail = Math.max(0, (k - 0.3) / 0.7) ** 2; /* 꼬리는 늦게 따라붙는다 */
    return { k, head: s.a0 + (s.a1 - s.a0) * head, tail: s.a0 + (s.a1 - s.a0) * tail };
  }

  /* 홍련의 몸짓을 정한다. 베는 동안에는 칼이 그 베기의 궤적을 그대로 따르고,
     쉬는 동안에는 다음에 벨 자리(머리 위·앞 아래·등 뒤)로 부드럽게 옮겨 간다. */
  bladePose(tw, o, have, want, dt) {
    const art = TOWER_ART.blade;
    let st = this.poses.get(tw.id);
    if (!st) {
      st = { face: Math.cos(want) >= 0 ? 1 : -1, th: art.REST, idle: 1 };
      this.poses.set(tw.id, st);
    }
    const s = tw.slash;
    /* 보는 쪽: 거의 위아래를 겨눌 때와 베는 도중에는 보던 쪽을 그대로 둔다 */
    const side = this.u(tw.cx + Math.cos(tw.mid), tw.cy + Math.sin(tw.mid)) - this.u(tw.cx, tw.cy);
    if (Math.abs(side) > 0.2 && !s) st.face = side >= 0 ? 1 : -1;
    const c = art.center(have, st.face);
    o.swing = null;
    if (s) {
      const k = Math.min(1, s.t / s.dur);
      o.swing = { k, step: s.step };
      st.th = s.step === 2 ? art.guardAngle(2, c) : art.swingAngle(s.step, k, c);
    } else {
      let diff = art.guardAngle(tw.combo, c) - st.th;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      st.th += diff * (dt > 0 ? 1 - Math.exp(-dt * 11) : 0);
    }
    const resting = this.game.phase !== 'wave' || (tw.idle && tw.cast <= 0);
    st.idle += ((resting ? 1 : 0) - st.idle) * (dt > 0 ? 1 - Math.exp(-dt * 7) : 0);
    o.pose = st;
    o.face = st.face;
    o.next = tw.combo;
    o.gest = tw.gest;
    o.cast = tw.cast > 0 ? tw.cast / (tw.castDur || 1) : 0;
    o.charge = tw.lv.swords ? 1 - Math.max(0, Math.min(1, tw.swordT / BLADE_SWORD_EVERY)) : 0;
    return have;
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

    if (e.poisonT > 0) {
      /* 독이 든 표시: 초록 방울이 피어오른다 */
      for (let i = 0; i < 3; i++) {
        const k = (t * 1.3 + i / 3 + e.id * 0.31) % 1;
        ctx.fillStyle = `rgba(143,224,74,${0.9 * (1 - k)})`;
        ctx.beginPath();
        ctx.arc(x + Math.sin(i * 2.4 + e.id) * e.r * 0.8 * ts, y - e.r * (0.3 + k * 1.5) * ts, ts * (0.05 + 0.03 * (1 - k)), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (e.hitT > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.45, e.hitT * 3.6)})`;
      ctx.beginPath();
      ctx.arc(x, y - e.r * 0.2 * ts, e.r * 1.15 * ts, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* 광선탑의 광선(오래 비출수록 굵고 밝아진다)과, 프리즘탑의 갈라지는 무지갯빛 광선 */
  drawBeams(ctx, t) {
    const { ts, game } = this;
    ctx.lineCap = 'round';
    for (const tw of game.towers) {
      const b = tw.beam;
      if (tw.def.mech !== 'beam' || !b || !b.alive) continue;
      const prism = !!tw.lv.split;
      const k = prism ? 0.3 : (game.beamPower(tw) - 1) / 2;
      const ax = this.px(tw.cx, tw.cy);
      const ay = this.py(tw.cx, tw.cy) - tw.lv.h * ts;
      const bx = this.px(b.x, b.y);
      const by = this.py(b.x, b.y) - b.r * 0.2 * ts;
      const wob = 0.85 + 0.15 * Math.sin(t * 40);
      const [outer, mid] = prism ? ['rgba(154,107,234,.4)', 'rgba(203,236,255,.95)'] : [`rgba(255,120,50,${0.35 + k * 0.25})`, `rgba(255,214,120,${0.75 + k * 0.25})`];
      const line = (x0, y0, x1, y1, f) => {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.strokeStyle = outer;
        ctx.lineWidth = ts * (0.16 + k * 0.16) * wob * f;
        ctx.stroke();
        ctx.strokeStyle = mid;
        ctx.lineWidth = ts * (0.08 + k * 0.07) * wob * f;
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, ts * (0.03 + k * 0.025) * f);
        ctx.stroke();
      };
      line(ax, ay, bx, by, 1);
      if (prism && tw.forks) {
        const hues = ['255,120,120', '255,214,120', '143,224,130', '120,190,255'];
        tw.forks.forEach((e, i) => {
          if (!e.alive) return;
          const ex = this.px(e.x, e.y);
          const ey = this.py(e.x, e.y) - e.r * 0.2 * ts;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(ex, ey);
          ctx.strokeStyle = `rgba(${hues[i % 4]},.85)`;
          ctx.lineWidth = ts * 0.085 * wob;
          ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(1, ts * 0.028);
          ctx.stroke();
          ctx.fillStyle = `rgba(${hues[i % 4]},.8)`;
          ctx.beginPath();
          ctx.arc(ex, ey, ts * 0.1, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      ctx.fillStyle = prism ? 'rgba(203,236,255,.7)' : `rgba(255,190,90,${0.5 + k * 0.3})`;
      ctx.beginPath();
      ctx.arc(bx, by, ts * (0.14 + k * 0.12) * wob, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bx, by, ts * (0.06 + k * 0.04), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* 화염파의 불기둥·유성이 터질 자리를 땅에 미리 비춘다 */
  drawStrikeMarks(ctx, t) {
    const { ts, game } = this;
    if (!game.strikes || !game.strikes.length) return;
    for (const s of game.strikes) {
      const k = Math.max(0, Math.min(1, s.t / s.delay));
      const x = this.px(s.x, s.y);
      const y = this.py(s.x, s.y);
      const r = s.r * ts;
      ctx.fillStyle = `rgba(255,120,30,${0.1 + 0.22 * k})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,216,143,${0.5 + 0.5 * k})`;
      ctx.lineWidth = Math.max(1.5, ts * 0.045);
      ctx.stroke();
      /* 안쪽으로 조여드는 고리 */
      ctx.strokeStyle = `rgba(255,255,255,${0.75 * k})`;
      ctx.lineWidth = Math.max(1, ts * 0.03);
      ctx.beginPath();
      ctx.arc(x, y, r * (1 - k * 0.85), 0, Math.PI * 2);
      ctx.stroke();
      if (s.kind === 'pillar') {
        /* 갈라진 틈으로 새는 불빛 */
        ctx.strokeStyle = `rgba(255,170,60,${k})`;
        ctx.lineWidth = Math.max(1, ts * 0.035);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = s.seed * 6.28 + i * 1.257;
          ctx.moveTo(x + Math.cos(a) * r * 0.15, y + Math.sin(a) * r * 0.15);
          ctx.lineTo(x + Math.cos(a + 0.25) * r * (0.4 + k * 0.45), y + Math.sin(a + 0.25) * r * (0.4 + k * 0.45));
        }
        ctx.stroke();
      }
    }
  }

  /* 떨어지는 유성과 솟구친 불기둥 */
  drawStrikes(ctx, t, dt) {
    const { ts, game } = this;
    ctx.lineCap = 'round';
    for (const s of game.strikes || []) {
      if (s.kind === 'sword') {
        /* 화염검: 하늘에서 곧게 내리꽂힌다 */
        const k = Math.max(0, Math.min(1, s.t / s.delay));
        if (k < 0.35) continue;
        const f = 1 - (k - 0.35) / 0.65; /* 남은 길: 1 → 0 */
        this.flameSword(ctx, this.px(s.x, s.y) + ts * 0.5 * f, this.py(s.x, s.y) - ts * 7 * f * f, 1, t);
        continue;
      }
      if (s.kind !== 'meteor') continue;
      const big = s.r > 1.1 ? 1.5 : 1;
      const k = Math.max(0, Math.min(1, s.t / s.delay));
      if (k < 0.12) continue;
      const f = 1 - (k - 0.12) / 0.88; /* 남은 길: 1 → 0 */
      const x = this.px(s.x, s.y);
      const y = this.py(s.x, s.y);
      const ox = (0.9 + s.seed * 1.4) * ts * 2;
      const oy = -ts * 7.5;
      const mx = x + ox * f;
      const my = y + oy * f;
      const n = Math.hypot(ox, oy);
      const tx = (ox / n) * ts;
      const ty = (oy / n) * ts;
      for (const [w, len, color] of [[0.5, 1.9, 'rgba(255,104,24,.35)'], [0.3, 1.4, 'rgba(255,170,60,.8)'], [0.14, 0.9, 'rgba(255,241,168,.95)']]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = ts * w * big;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + tx * len, my + ty * len);
        ctx.stroke();
      }
      ctx.fillStyle = '#ff9226';
      ctx.beginPath();
      ctx.arc(mx, my, ts * 0.26 * big, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff6cf';
      ctx.beginPath();
      ctx.arc(mx - tx * 0.04, my - ty * 0.04, ts * 0.15 * big, 0, Math.PI * 2);
      ctx.fill();
    }

    let n = 0;
    for (const c of this.columns) {
      c.life -= dt;
      if (c.life <= 0) continue;
      this.columns[n++] = c;
      const k = c.life / c.max; /* 1 → 0 */
      if (c.kind === 'thunder') {
        /* 하늘에서 내리꽂히는 벼락 */
        const x0 = this.px(c.x, c.y);
        const y0 = this.py(c.x, c.y);
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        for (let i = 1; i <= 7; i++) {
          const jx = Math.sin(c.seed * 40 + i * 2.3) * ts * 0.28 * (i < 7 ? 1 : 0.4);
          ctx.lineTo(x0 + jx + i * ts * 0.12, y0 - i * ts * 0.95);
        }
        ctx.strokeStyle = `rgba(154,107,234,${0.5 * k})`;
        ctx.lineWidth = ts * 0.26;
        ctx.stroke();
        ctx.strokeStyle = `rgba(203,236,255,${k})`;
        ctx.lineWidth = ts * 0.11;
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${k})`;
        ctx.lineWidth = Math.max(1, ts * 0.04);
        ctx.stroke();
        continue;
      }
      const up = Math.min(1, (1 - k) * 5);
      const x = this.px(c.x, c.y);
      const y = this.py(c.x, c.y);
      const sword = c.kind === 'sword';
      const w = c.r * ts * (sword ? 0.5 : 0.62 + 0.2 * (1 - k));
      const h = ts * (sword ? 1.5 : 3.1) * up;
      const wob = Math.sin(t * 40 + c.x * 7) * w * 0.08;
      for (const [f, color] of [[1, `rgba(255,104,24,${0.55 * k})`], [0.66, `rgba(255,170,60,${0.85 * k})`], [0.34, `rgba(255,246,207,${0.95 * k})`]]) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x - w * f, y);
        ctx.quadraticCurveTo(x - w * f * 0.9 + wob, y - h * 0.55, x - w * f * 0.3, y - h * (0.8 + 0.2 * f));
        ctx.quadraticCurveTo(x + wob * 0.5, y - h * (1.02 + 0.1 * f), x + w * f * 0.3, y - h * (0.8 + 0.2 * f));
        ctx.quadraticCurveTo(x + w * f * 0.9 + wob, y - h * 0.55, x + w * f, y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = `rgba(255,216,143,${0.6 * k})`;
      ctx.beginPath();
      ctx.ellipse(x, y, w * 1.25, w * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      if (sword) this.flameSword(ctx, x, y, Math.min(1, k * 2.2), t); /* 땅에 꽂힌 검이 불길 속에서 사라진다 */
    }
    this.columns.length = n;
  }

  /* 끝을 아래로 한 화염검 한 자루. (x, y) 는 칼끝이 닿는 화면 좌표 */
  flameSword(ctx, x, y, alpha, t) {
    const ts = this.ts;
    const len = ts * 1.15;
    const hw = ts * 0.11;
    ctx.globalAlpha = alpha;
    /* 칼을 감싼 불길 */
    for (const [f, color] of [[1.9, 'rgba(232,85,42,.55)'], [1.35, 'rgba(255,150,40,.8)']]) {
      const wob = Math.sin(t * 30 + x * 0.05) * hw * 0.3;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y + ts * 0.06);
      ctx.quadraticCurveTo(x - hw * f * 1.4, y - len * 0.5, x - hw * f * 0.5 + wob, y - len * 1.25);
      ctx.quadraticCurveTo(x + wob * 0.5, y - len * (1.3 + 0.12 * f), x + hw * f * 0.5 + wob, y - len * 1.2);
      ctx.quadraticCurveTo(x + hw * f * 1.4, y - len * 0.5, x, y + ts * 0.06);
      ctx.fill();
    }
    /* 날, 코등이, 손잡이 */
    ctx.fillStyle = '#ffd45a';
    ctx.strokeStyle = '#2b2536';
    ctx.lineWidth = Math.max(1, ts * 0.03);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - hw, y - len * 0.28);
    ctx.lineTo(x - hw * 0.85, y - len);
    ctx.lineTo(x + hw * 0.85, y - len);
    ctx.lineTo(x + hw, y - len * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff6cf';
    ctx.beginPath();
    ctx.moveTo(x, y - len * 0.06);
    ctx.lineTo(x - hw * 0.35, y - len * 0.3);
    ctx.lineTo(x - hw * 0.3, y - len * 0.96);
    ctx.lineTo(x + hw * 0.3, y - len * 0.96);
    ctx.lineTo(x + hw * 0.35, y - len * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f4b93a';
    ctx.fillRect(x - hw * 2.1, y - len * 1.06, hw * 4.2, len * 0.07);
    ctx.strokeRect(x - hw * 2.1, y - len * 1.06, hw * 4.2, len * 0.07);
    ctx.fillStyle = '#48291a';
    ctx.fillRect(x - hw * 0.4, y - len * 1.28, hw * 0.8, len * 0.22);
    ctx.strokeRect(x - hw * 0.4, y - len * 1.28, hw * 0.8, len * 0.22);
    ctx.globalAlpha = 1;
  }

  /* 초승달 모양 검기 한 줄. 전장의 (cx, cy) 를 중심으로 a0(꼬리) → a1(머리) 를 잇는다.
     가운데가 가장 두껍고 양 끝은 뾰족하며, 바깥 테두리로 갈수록 밝다. */
  crescent(ctx, cx, cy, a0, a1, R, thick, alpha, seed) {
    const ts = this.ts;
    const span = a1 - a0;
    const n = Math.max(6, Math.ceil(Math.abs(span) / 0.14));
    const lift = ts * 0.2;
    const pt = (a, r) => [this.px(cx + Math.cos(a) * r, cy + Math.sin(a) * r), this.py(cx + Math.cos(a) * r, cy + Math.sin(a) * r) - lift];
    /* 두께: 머리 가까이가 가장 두껍다 */
    const prof = (f) => Math.sin(Math.PI * Math.pow(f, 1.45));
    const layer = (out, th, color, ragged) => {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const p = pt(a0 + (span * i) / n, R + out);
        if (i) ctx.lineTo(p[0], p[1]);
        else ctx.moveTo(p[0], p[1]);
      }
      for (let i = n; i >= 0; i--) {
        const f = i / n;
        const wob = ragged ? 1 + 0.28 * Math.sin(i * 2.9 + seed * 20) * Math.sin(f * Math.PI) : 1;
        const p = pt(a0 + span * f, R + out - th * prof(f) * wob);
        ctx.lineTo(p[0], p[1]);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };
    layer(0.05, thick * 1.5, `rgba(122,26,14,${0.5 * alpha})`, true); /* 뒤에 끌리는 검붉은 불길 */
    layer(0.03, thick, `rgba(232,85,42,${0.88 * alpha})`, true);
    layer(0, thick * 0.62, `rgba(255,170,60,${0.95 * alpha})`, false);
    layer(-0.015, thick * 0.3, `rgba(255,241,168,${alpha})`, false);
    /* 가장 뜨거운 바깥 날 */
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = Math.max(1, ts * 0.045);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = Math.floor(n * 0.35); i <= n; i++) {
      const p = pt(a0 + (span * i) / n, R + 0.01);
      if (i === Math.floor(n * 0.35)) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    }
    ctx.stroke();
  }

  /* 홍련의 검기와 십자 베기 자국 */
  drawSlashes(ctx, t, dt) {
    const { ts, game } = this;
    for (const tw of game.towers) {
      const s = tw.slash;
      if (!s || tw.def.mech !== 'blade') continue;
      const sp = this.slashSpan(s);
      if (Math.abs(sp.head - sp.tail) < 0.05) continue;
      const spin = s.step === 2;
      const grow = 1 + tw.level * 0.22;
      const fade = Math.min(1, (1 - sp.k) * 3.2 + 0.1);
      this.crescent(ctx, tw.cx, tw.cy, sp.tail, sp.head, tw.range * (spin ? 1 : 0.95), (spin ? 0.5 : 0.4) * grow, fade, tw.id);
      if (spin) this.crescent(ctx, tw.cx, tw.cy, sp.tail + 0.3, sp.head - 0.5, tw.range * 0.55, 0.26 * grow, fade * 0.85, tw.id + 1.7);
    }

    let n = 0;
    for (const c of this.cuts) {
      c.life -= dt;
      if (c.life <= 0) continue;
      this.cuts[n++] = c;
      const k = 1 - c.life / c.max; /* 0 → 1 */
      const x = this.px(c.x, c.y);
      const y = this.py(c.x, c.y) - ts * 0.15;
      const fade = Math.min(1, (1 - k) * 2.6);
      const L = c.r * ts * 2.5;
      /* 자국을 두른 고리 */
      ctx.strokeStyle = `rgba(255,170,60,${0.8 * fade})`;
      ctx.lineWidth = Math.max(1, ts * 0.06);
      ctx.beginPath();
      ctx.arc(x, y, c.r * ts * (0.9 + 0.5 * k), 0, Math.PI * 2);
      ctx.stroke();
      for (let j = 0; j < 2; j++) {
        const g = Math.max(0, Math.min(1, (k - j * 0.16) / 0.16)); /* 긋는 정도 */
        if (g <= 0) continue;
        const a = (j ? -1 : 1) * 0.82 + (c.seed - 0.5) * 0.3;
        const ux = Math.cos(a);
        const uy = Math.sin(a);
        const x0 = x - ux * L * 0.5;
        const y0 = y - uy * L * 0.5;
        const x1 = x0 + ux * L * g;
        const y1 = y0 + uy * L * g;
        for (const [w, color] of [[0.34, `rgba(122,26,14,${0.5 * fade})`], [0.24, `rgba(232,85,42,${0.9 * fade})`], [0.15, `rgba(255,170,60,${fade})`], [0.07, `rgba(255,246,207,${fade})`]]) {
          const hw = ts * w * 0.5;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo((x0 + x1) / 2 - uy * hw, (y0 + y1) / 2 + ux * hw);
          ctx.lineTo(x1, y1);
          ctx.lineTo((x0 + x1) / 2 + uy * hw, (y0 + y1) / 2 - ux * hw);
          ctx.closePath();
          ctx.fill();
        }
        if (g >= 1) {
          /* 칼자국 끝에서 반짝이는 빛 */
          for (const sgn of [-1, 1]) {
            const sx = x + ux * L * 0.5 * sgn;
            const sy = y + uy * L * 0.5 * sgn;
            const sz = ts * 0.13 * fade;
            ctx.fillStyle = `rgba(255,246,207,${fade})`;
            ctx.beginPath();
            ctx.moveTo(sx, sy - sz);
            ctx.lineTo(sx + sz * 0.25, sy - sz * 0.25);
            ctx.lineTo(sx + sz, sy);
            ctx.lineTo(sx + sz * 0.25, sy + sz * 0.25);
            ctx.lineTo(sx, sy + sz);
            ctx.lineTo(sx - sz * 0.25, sy + sz * 0.25);
            ctx.lineTo(sx - sz, sy);
            ctx.lineTo(sx - sz * 0.25, sy - sz * 0.25);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }
    this.cuts.length = n;
  }

  /* 탑 둘레로 퍼져 나가는 고리: 화염파의 충격파, 종소리, 한파, 지진, 중력, 시간 정지 */
  drawShockwaves(ctx, t) {
    const { ts, game } = this;
    for (const tw of game.towers) {
      const w = tw.wave;
      if (!w) continue;
      const lord = tw.def.mech === 'lord';
      const sk = lord ? SKIN.fire : SKIN[tw.def.skin] || SKIN.bell;
      const k = Math.min(1, w.t / w.dur);
      const x = this.px(tw.cx, tw.cy);
      const y = this.py(tw.cx, tw.cy) + (lord ? ts * 0.2 : 0);
      /* 중력탑의 고리는 바깥에서 탑 쪽으로 조여든다 */
      const r = Math.max(1, (tw.def.skin === 'void' ? w.r - (w.now || 0) * 0.85 : w.now || 0) * ts);
      const fade = 1 - k * k;
      ctx.fillStyle = `rgba(${sk.rgb},${0.2 * fade})`;
      ctx.beginPath();
      ctx.arc(x, y, tw.def.skin === 'void' ? w.r * ts : r, 0, Math.PI * 2);
      ctx.fill();
      for (const [width, alpha] of [[0.5, 0.35], [0.28, 0.85]]) {
        ctx.strokeStyle = `rgba(${sk.rgb},${alpha * fade})`;
        ctx.lineWidth = Math.max(1, ts * width * (1 - k * 0.5));
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = `rgba(255,255,255,${fade})`;
      ctx.lineWidth = Math.max(1, ts * 0.1 * (1 - k * 0.5));
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      if (tw.def.skin === 'bell' || tw.def.skin === 'time') {
        /* 소리·시간의 결: 안쪽으로 겹고리 */
        ctx.strokeStyle = `rgba(${sk.rgb},${0.6 * fade})`;
        ctx.lineWidth = Math.max(1, ts * 0.05);
        for (const f of [0.72, 0.44]) {
          ctx.beginPath();
          ctx.arc(x, y, r * f, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      if (lord && !this.reduced) {
        /* 고리를 따라 이는 불꽃 */
        for (let i = 0; i < 5; i++) {
          const a = Math.random() * Math.PI * 2;
          const life = 0.25 + Math.random() * 0.2;
          this.particles.push({
            u: this.u(tw.cx, tw.cy) + (Math.cos(a) * r) / ts,
            v: this.v(tw.cx, tw.cy) + 0.2 + (Math.sin(a) * r) / ts,
            du: Math.cos(a) * 1.4,
            dv: Math.sin(a) * 1.4 - 1,
            g: 0,
            life,
            max: life,
            size: 0.1 + Math.random() * 0.07,
            fire: true,
          });
        }
        if (this.particles.length > 500) this.particles.splice(0, this.particles.length - 500);
      }
    }
  }

  /* 화염파의 휩쓸기 광선: 두 손에서 사거리 끝까지 뻗은 굵은 불줄기가 부채꼴로 지나간다 */
  drawSweeps(ctx, t) {
    const { ts, game } = this;
    const art = TOWER_ART.lord;
    for (const tw of game.towers) {
      const s = tw.sweep;
      if (tw.type !== 'lord' || !s || !art) continue;
      const R = tw.lv.range;
      const k = Math.min(1, s.t / s.dur);
      const env = Math.min(1, k * 9 + 0.25, (1 - k) * 5 + 0.2); /* 처음에 확 굵어지고 끝에서 가늘어진다 */
      const grow = 1 + tw.level * 0.28;
      const at = (a, r) => [tw.cx + Math.cos(a) * r, tw.cy + Math.sin(a) * r];
      const tip = at(s.a, R);
      const ox = this.px(tw.cx, tw.cy);
      const oy = this.py(tw.cx, tw.cy);
      const ex = this.px(tip[0], tip[1]);
      const ey = this.py(tip[0], tip[1]) - ts * 0.12;

      /* 이미 휩쓸고 지나간 자리가 잠깐 달아오른다 */
      ctx.beginPath();
      ctx.moveTo(ox, oy + ts * 0.1);
      const steps = 12;
      for (let i = 0; i <= steps; i++) {
        const q = at(s.a0 + (s.a - s.a0) * (i / steps), R);
        ctx.lineTo(this.px(q[0], q[1]), this.py(q[0], q[1]));
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(255,140,40,${0.13 * env})`;
      ctx.fill();

      const aim = Math.atan2(this.v(tip[0], tip[1]) - this.v(tw.cx, tw.cy), this.u(tip[0], tip[1]) - this.u(tw.cx, tw.cy));
      const st = this.poses.get(tw.id);
      const hands = st && st.o ? art.hands(tw.level, st.ang, st.o) : art.hands(tw.level, aim);
      const mx = (hands[0][0] + hands[1][0]) / 2;
      const my = (hands[0][1] + hands[1][1]) / 2;
      const wob = 0.9 + 0.1 * Math.sin(t * 60);
      ctx.lineCap = 'round';
      for (const [width, color] of [[0.56, 'rgba(255,104,24,.3)'], [0.34, 'rgba(255,146,38,.85)'], [0.19, 'rgba(255,216,143,.97)'], [0.075, '#ffffff']]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, ts * width * grow * env * wob);
        ctx.beginPath();
        for (const h of hands) {
          ctx.moveTo(ox + h[0] * ts, oy + h[1] * ts);
          ctx.lineTo(ex + (h[0] - mx) * ts * 0.8, ey + (h[1] - my) * ts * 0.8);
        }
        ctx.stroke();
      }
      /* 광선 끝의 불덩이 */
      ctx.fillStyle = `rgba(255,170,60,${0.7 * env})`;
      ctx.beginPath();
      ctx.arc(ex, ey, ts * 0.3 * grow * env * wob, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, ts * 0.11 * grow * env, 0, Math.PI * 2);
      ctx.fill();

      if (!this.reduced) {
        /* 광선을 따라 이는 불꽃과, 끝이 훑고 간 땅에 남는 불티 */
        const hu = this.u(tw.cx, tw.cy) + mx;
        const hv = this.v(tw.cx, tw.cy) + my;
        const tu = this.u(tip[0], tip[1]);
        const tv = this.v(tip[0], tip[1]) - 0.12;
        for (let i = 0; i < 3; i++) {
          const f = 0.15 + Math.random() * 0.85;
          const life = 0.22 + Math.random() * 0.2;
          this.particles.push({
            u: hu + (tu - hu) * f + (Math.random() - 0.5) * 0.2,
            v: hv + (tv - hv) * f + (Math.random() - 0.5) * 0.2,
            du: (Math.random() - 0.5) * 1.2,
            dv: -0.6 - Math.random() * 1.2,
            g: 0,
            life,
            max: life,
            size: (0.08 + Math.random() * 0.07) * (0.8 + tw.level * 0.15),
            fire: true,
          });
        }
        if (this.particles.length > 500) this.particles.splice(0, this.particles.length - 500);
      }
    }
  }

  drawShots(ctx, t) {
    const { ts, game } = this;
    ctx.lineCap = 'round';
    const ball = (x, y, r, fill, shine) => {
      ctx.fillStyle = ART.OUT;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      if (shine) {
        ctx.fillStyle = shine;
        ctx.beginPath();
        ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    };
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
      const line = (back, front, color, w) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(gx - du * ts * back, y - dv * ts * back);
        ctx.lineTo(gx + du * ts * front, y + dv * ts * front);
        ctx.stroke();
      };
      if (s.kind === 'bolt') {
        const sk = SKIN[s.skin] || SKIN.arrow;
        switch (s.skin) {
          case 'ember':
            line(0.4, 0, 'rgba(255,146,38,.5)', ts * 0.12);
            ball(gx, y, ts * 0.075, '#ff9226', '#fff1a8');
            break;
          case 'orb':
            ctx.fillStyle = 'rgba(203,166,255,.35)';
            ctx.beginPath();
            ctx.arc(gx, y, ts * 0.2, 0, Math.PI * 2);
            ctx.fill();
            line(0.34, 0, 'rgba(154,107,234,.6)', ts * 0.1);
            ball(gx, y, ts * 0.085, '#cba6ff', '#ffffff');
            break;
          case 'icicle':
            line(0.3, 0.06, ART.OUT, Math.max(3.4, ts * 0.13));
            line(0.3, 0.06, '#9cddf8', Math.max(2, ts * 0.08));
            line(0.05, 0.1, '#ecfbff', Math.max(1.4, ts * 0.05));
            break;
          case 'harpoon': {
            /* 탑에서 풀려 나가는 밧줄 */
            ctx.strokeStyle = 'rgba(120,90,60,.7)';
            ctx.lineWidth = Math.max(1, ts * 0.025);
            ctx.beginPath();
            ctx.moveTo(this.px(s.src.cx, s.src.cy), this.py(s.src.cx, s.src.cy) - s.src.lv.h * ts);
            ctx.lineTo(gx, y);
            ctx.stroke();
            line(0.42, 0, ART.OUT, Math.max(3, ts * 0.11));
            line(0.42, 0, '#a7b2c4', Math.max(1.6, ts * 0.055));
            ctx.fillStyle = '#e1e5ec';
            ctx.strokeStyle = ART.OUT;
            ctx.lineWidth = Math.max(1, ts * 0.03);
            ctx.beginPath();
            ctx.moveTo(gx + du * ts * 0.12, y + dv * ts * 0.12);
            ctx.lineTo(gx - du * ts * 0.06 - dv * ts * 0.09, y - dv * ts * 0.06 + du * ts * 0.09);
            ctx.lineTo(gx - du * ts * 0.06 + dv * ts * 0.09, y - dv * ts * 0.06 - du * ts * 0.09);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
          }
          case 'shuriken': {
            /* 빙글빙글 도는 네 갈래 표창 */
            const a = t * 26 + s.x * 3;
            ctx.fillStyle = '#d8dfea';
            ctx.strokeStyle = ART.OUT;
            ctx.lineWidth = Math.max(1.2, ts * 0.035);
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
              const r = (i % 2 ? 0.055 : 0.15) * ts;
              const q = a + (i * Math.PI) / 4;
              if (i) ctx.lineTo(gx + Math.cos(q) * r, y + Math.sin(q) * r);
              else ctx.moveTo(gx + Math.cos(q) * r, y + Math.sin(q) * r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
          }
          case 'bee': {
            const wob = Math.sin(t * 30 + s.x * 9) * ts * 0.04;
            ctx.fillStyle = 'rgba(255,255,255,.75)';
            ctx.beginPath();
            ctx.ellipse(gx - du * ts * 0.02, y + wob - ts * 0.07, ts * 0.07, ts * 0.04, 0, 0, Math.PI * 2);
            ctx.fill();
            ball(gx, y + wob, ts * 0.06, '#f6bd22');
            ctx.strokeStyle = ART.OUT;
            ctx.lineWidth = Math.max(1, ts * 0.03);
            ctx.beginPath();
            ctx.moveTo(gx - dv * ts * 0.05, y + wob + du * ts * 0.05);
            ctx.lineTo(gx + dv * ts * 0.05, y + wob - du * ts * 0.05);
            ctx.stroke();
            break;
          }
          default:
            line(0.34, 0, ART.OUT, Math.max(2.4, ts * 0.085));
            line(0.34, 0, sk.c, Math.max(1.2, ts * 0.04));
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(gx, y, Math.max(1.2, ts * 0.045), 0, Math.PI * 2);
            ctx.fill();
        }
      } else if (s.kind === 'shell') {
        const big = s.skin === 'bomb' ? 1.35 : s.skin === 'shell' ? 1 : 0.86;
        ctx.fillStyle = ART.shadow;
        ctx.beginPath();
        ctx.ellipse(gx, gy, ts * 0.11 * big, ts * 0.05 * big, 0, 0, Math.PI * 2);
        ctx.fill();
        const sk = SKIN[s.skin] || SKIN.shell;
        ball(gx, y, ts * 0.085 * big, sk.c, s.skin === 'tar' ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.55)');
        if (s.skin === 'bomb') {
          /* 타들어 가는 심지 */
          ctx.fillStyle = '#ffb347';
          ctx.beginPath();
          ctx.arc(gx + ts * 0.07, y - ts * 0.12, ts * (0.035 + 0.015 * Math.sin(t * 40)), 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (s.kind === 'rocket') {
        line(0.62, -0.2, 'rgba(255,255,255,.7)', Math.max(2, ts * 0.09));
        line(0.32, -0.12, '#ffb347', Math.max(2, ts * 0.07));
        line(0.14, 0.1, ART.OUT, Math.max(3, ts * 0.11));
        line(0.14, 0.1, '#ee8530', Math.max(1.6, ts * 0.06));
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
      if (p.fire) {
        ctx.globalAlpha = Math.min(1, k * 1.8) * 0.85;
        ctx.fillStyle = k > 0.66 ? '#fff1a8' : k > 0.36 ? '#ffb347' : '#e8552a';
        ctx.beginPath();
        ctx.arc(p.u * ts, p.v * ts + this.pad, p.size * ts * (0.5 + (1 - k) * 1.5), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.globalAlpha = Math.min(1, k * (p.soft ? 1 : 1.6)) * (p.soft ? 0.75 : 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.u * ts, p.v * ts + this.pad, p.size * ts * (p.soft ? 1.4 - k * 0.6 : 0.4 + k * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    this.particles.length = n;

    /* 쏘는 즉시 맞는 공격의 궤적: 총알, 창, 기관포 예광탄, 레일건, 낫, 던져 놓는 덫 */
    n = 0;
    ctx.lineCap = 'round';
    for (const tr of this.tracers) {
      tr.life -= dt;
      if (tr.life <= 0) continue;
      this.tracers[n++] = tr;
      const k = tr.life / tr.max;
      const ax = this.px(tr.x0, tr.y0);
      const ay = this.py(tr.x0, tr.y0) - tr.h * ts;
      const bx = this.px(tr.x1, tr.y1);
      const by = this.py(tr.x1, tr.y1) - ts * 0.1;
      const seg = (f0, f1, color, w) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(ax + (bx - ax) * f0, ay + (by - ay) * f0);
        ctx.lineTo(ax + (bx - ax) * f1, ay + (by - ay) * f1);
        ctx.stroke();
      };
      if (tr.skin === 'spear') {
        /* 날아가는 창: 자루와 날 */
        const f = 1 - k;
        seg(Math.max(0, f - 0.3), f, ART.OUT, Math.max(3, ts * 0.1));
        seg(Math.max(0, f - 0.3), f, '#b07642', Math.max(1.6, ts * 0.05));
        seg(Math.max(0, f - 0.07), f, '#e1e5ec', Math.max(2.2, ts * 0.075));
      } else if (tr.skin === 'tracer') {
        seg(0.1, 1, `rgba(255,226,126,${0.8 * k})`, Math.max(1.4, ts * 0.045));
      } else if (tr.skin === 'rail') {
        seg(0, 1, `rgba(82,168,220,${0.5 * k})`, ts * 0.34 * k);
        seg(0, 1, `rgba(156,221,248,${0.9 * k})`, ts * 0.17 * k);
        seg(0, 1, `rgba(255,255,255,${k})`, Math.max(1, ts * 0.06));
      } else if (tr.skin === 'scythe') {
        /* 적 머리 위에서 내리긋는 낫 자국 */
        const a0 = -2.4 + (1 - k) * 2.2;
        ctx.strokeStyle = `rgba(60,30,80,${0.9 * k})`;
        ctx.lineWidth = ts * 0.16;
        ctx.beginPath();
        ctx.arc(bx, by - ts * 0.2, ts * 0.5, a0, a0 + 1.4);
        ctx.stroke();
        ctx.strokeStyle = `rgba(203,166,255,${k})`;
        ctx.lineWidth = ts * 0.06;
        ctx.stroke();
        seg(0, 1, `rgba(154,107,234,${0.35 * k})`, Math.max(1, ts * 0.04));
      } else if (tr.skin === 'toss') {
        const f = 1 - k;
        const x = ax + (bx - ax) * f;
        const y = ay + (by - ay) * f - Math.sin(f * Math.PI) * ts * 0.6;
        ctx.fillStyle = ART.OUT;
        ctx.beginPath();
        ctx.arc(x, y, ts * 0.075, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d8dfea';
        ctx.beginPath();
        ctx.arc(x, y, ts * 0.05, 0, Math.PI * 2);
        ctx.fill();
      } else {
        seg(0, 1, `rgba(255,226,126,${0.6 * k})`, Math.max(2, ts * 0.09));
        seg(0, 1, `rgba(255,255,255,${k})`, Math.max(1, ts * 0.035));
      }
    }
    this.tracers.length = n;

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
    if (ui.selected && ui.selected.range > 0) this.drawRange(ctx, ui.selected.cx, ui.selected.cy, ui.selected.range, true);
    if (ui.placing && ui.hover && game.inBounds(ui.hover.x, ui.hover.y)) {
      const { x, y } = ui.hover;
      const lv = game.lvOf(ui.placing, 0);
      const ok = game.canBuild(x, y) && game.gold >= lv.cost;
      if (lv.range > 0) this.drawRange(ctx, x + 0.5, y + 0.5, lv.range, ok);
      if (!ok) {
        ctx.fillStyle = 'rgba(255,80,60,.4)';
        ctx.fillRect(this.px(x, y), this.py(x, y), ts, ts);
      }
      ctx.globalAlpha = ok ? 0.85 : 0.45;
      this.at(ctx, x + 0.5, y + 0.5, (c) => drawTowerSprite(c, ui.placing, 0, this.transposed ? Math.PI / 2 : 0, { t: 0 }));
      ctx.globalAlpha = 1;
    }
  }

  /* 화면 가운데의 알림 글과 일시정지 표시 (화면 좌표) */
  drawBanner(ctx, dt, ui) {
    const w = this.viewW;
    const ts = this.ts;
    const top = this.inset.top;
    const h = this.viewH - top - this.inset.bottom;
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
        const size = Math.max(26, Math.min(ts * 1.05, w * 0.085, 92));
        const cy = top + h * 0.36;
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
          ctx.font = `700 ${Math.max(12, size * 0.38)}px ${FONT_UI}`;
          ctx.fillStyle = '#ffe27e';
          ctx.fillText(b.sub, w / 2, cy + size * 0.85);
        }
        ctx.globalAlpha = 1;
      }
    }
    if (ui.paused) {
      const size = Math.max(13, Math.min(22, ts * 0.42));
      ctx.font = `700 ${size}px ${FONT_UI}`;
      const tw = ctx.measureText('일시정지').width + size * 1.6;
      ctx.fillStyle = 'rgba(34,40,60,.9)';
      roundRectPath(ctx, w / 2 - tw / 2, top + 10, tw, size * 2, size);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText('일시정지', w / 2, top + 10 + size);
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
