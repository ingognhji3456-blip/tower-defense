'use strict';
/* 철벽 요새 — 시뮬레이션. DOM 없이 돌아가므로 Node 에서도 그대로 실행된다. */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* 꺾임점을 둥글린 길. at(거리) 로 위치와 진행 방향을 얻는다. */
class TrackPath {
  constructor(waypoints) {
    const c = waypoints.map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));
    const pts = [];
    const push = (x, y) => {
      const l = pts[pts.length - 1];
      if (!l || Math.hypot(x - l.x, y - l.y) > 1e-6) pts.push({ x, y });
    };
    const R = 0.5;
    const STEPS = 8;
    push(c[0].x, c[0].y);
    for (let i = 1; i < c.length - 1; i++) {
      const p = c[i - 1];
      const q = c[i];
      const n = c[i + 1];
      const l1 = Math.hypot(q.x - p.x, q.y - p.y);
      const l2 = Math.hypot(n.x - q.x, n.y - q.y);
      const ax = q.x - ((q.x - p.x) / l1) * R;
      const ay = q.y - ((q.y - p.y) / l1) * R;
      const bx = q.x + ((n.x - q.x) / l2) * R;
      const by = q.y + ((n.y - q.y) / l2) * R;
      push(ax, ay);
      for (let s = 1; s <= STEPS; s++) {
        const t = s / STEPS;
        const u = 1 - t;
        push(u * u * ax + 2 * u * t * q.x + t * t * bx, u * u * ay + 2 * u * t * q.y + t * t * by);
      }
    }
    push(c[c.length - 1].x, c[c.length - 1].y);
    this.waypoints = waypoints;
    this.pts = pts;
    this.cum = [0];
    for (let i = 1; i < pts.length; i++) {
      this.cum.push(this.cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    }
    this.length = this.cum[this.cum.length - 1];
  }

  at(d, out) {
    const pts = this.pts;
    const cum = this.cum;
    let i;
    if (d <= 0) i = 0;
    else if (d >= this.length) i = pts.length - 2;
    else {
      let lo = 0;
      let hi = cum.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] <= d) lo = mid;
        else hi = mid;
      }
      i = lo;
    }
    const a = pts[i];
    const b = pts[i + 1];
    const len = cum[i + 1] - cum[i];
    const dx = (b.x - a.x) / len;
    const dy = (b.y - a.y) / len;
    const t = d - cum[i];
    out.x = a.x + dx * t;
    out.y = a.y + dy * t;
    out.dx = dx;
    out.dy = dy;
    return out;
  }
}

const TILE_FREE = 0;
const TILE_PATH = 1;
const TILE_DECO = 2;
const TILE_TOWER = 3;

class Game {
  constructor(opts = {}) {
    /* 스테이지를 주면 스테이지 규칙으로, 아니면 지도·난이도를 골라 30 웨이브를 버티는 도전 모드로 돈다. */
    this.stage = STAGES.find((st) => st.id === opts.stage) || null;
    this.map = MAPS.find((m) => m.id === (this.stage ? this.stage.map : opts.map)) || MAPS[0];
    this.diffId = !this.stage && DIFFICULTY[opts.diff] ? opts.diff : 'normal';
    this.diff = DIFFICULTY[this.diffId];
    this.finalWave = this.stage ? this.stage.waves.length : FINAL_WAVE;
    this.allowed = this.stage ? this.stage.towers : TOWER_ORDER;
    this.rand = mulberry32(opts.seed || 20251114);

    this.paths = this.map.paths.map((w) => new TrackPath(w));
    this.grid = new Uint8Array(COLS * ROWS);
    for (const w of this.map.paths) {
      for (let i = 1; i < w.length; i++) {
        let [x, y] = w[i - 1];
        const [ex, ey] = w[i];
        const sx = Math.sign(ex - x);
        const sy = Math.sign(ey - y);
        for (;;) {
          if (x >= 0 && x < COLS && y >= 0 && y < ROWS) this.grid[y * COLS + x] = TILE_PATH;
          if (x === ex && y === ey) break;
          x += sx;
          y += sy;
        }
      }
    }
    for (const [, x, y] of this.map.deco) {
      if (this.grid[y * COLS + x] === TILE_FREE) this.grid[y * COLS + x] = TILE_DECO;
    }

    /* 길 위 표본점: 사거리 안에 길이 얼마나 들어오는지 잴 때 쓴다. */
    this.samples = [];
    const tmp = {};
    for (const p of this.paths) {
      for (let d = 0; d <= p.length; d += 0.25) {
        p.at(d, tmp);
        this.samples.push({ x: tmp.x, y: tmp.y });
      }
    }

    this.gold = this.stage ? this.stage.gold : this.diff.gold;
    this.lives = this.stage ? this.stage.lives : this.diff.lives;
    this.maxLives = this.lives;
    this.wave = 0;
    this.phase = 'build'; // build | wave | won | lost
    this.endless = false;
    this.time = 0;

    this.towers = [];
    this.enemies = [];
    this.shots = [];
    this.queue = [];
    this.qi = 0;
    this.waveTime = 0;
    this.spawnFlip = 0;
    this.nextId = 1;

    this.stats = { kills: 0, leaked: 0, built: 0, earned: 0 };
    this.listener = null;
    this.snapshot = this.serialize();
  }

  emit(type, data) {
    if (this.listener) this.listener(type, data);
  }

  /* ───── 규칙: 스테이지냐 도전 모드냐에 따라 달라지는 값 ───── */

  groups(wave) {
    return this.stage ? this.stage.waves[wave - 1] || [] : waveGroups(wave);
  }

  preview(wave) {
    return previewFrom(this.groups(wave));
  }

  hpAt(wave) {
    return this.stage ? this.stage.hp * Math.pow(STAGE_GROWTH, wave - 1) : hpScale(wave) * this.diff.hp;
  }

  armorAt(wave) {
    return this.stage ? (1 + 0.07 * (this.stage.id - 1)) * (1 + 0.04 * (wave - 1)) : 1 + 0.05 * (wave - 1);
  }

  rewardAt(wave) {
    return this.stage ? this.stage.reward * (1 + 0.03 * (wave - 1)) : rewardScale(wave);
  }

  bonusAt(wave) {
    return this.stage ? 20 + 3 * wave + 4 * (this.stage.id - 1) : waveBonus(wave);
  }

  /* 스테이지를 깼을 때의 별점 */
  stars() {
    return starsFor(this.maxLives - this.lives);
  }

  /* ───── 건설 ───── */

  inBounds(tx, ty) {
    return tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS;
  }

  tile(tx, ty) {
    return this.inBounds(tx, ty) ? this.grid[ty * COLS + tx] : TILE_DECO;
  }

  canBuild(tx, ty) {
    return this.inBounds(tx, ty) && this.grid[ty * COLS + tx] === TILE_FREE;
  }

  towerAt(tx, ty) {
    for (const t of this.towers) if (t.x === tx && t.y === ty) return t;
    return null;
  }

  coverage(cx, cy, range) {
    const r2 = range * range;
    let n = 0;
    for (const s of this.samples) {
      const dx = s.x - cx;
      const dy = s.y - cy;
      if (dx * dx + dy * dy <= r2) n++;
    }
    return n;
  }

  addTower(type, tx, ty) {
    const def = TOWERS[type];
    const t = {
      id: this.nextId++,
      type,
      def,
      level: 0,
      lv: def.levels[0],
      x: tx,
      y: ty,
      cx: tx + 0.5,
      cy: ty + 0.5,
      cd: 0,
      mode: 'first',
      invested: def.levels[0].cost,
      fresh: this.phase === 'build',
      aimX: tx + 1.5,
      aimY: ty + 0.5,
      recoil: 0,
      flash: 0,
      burst: 0,
      burstT: 0,
      burstList: [],
      kills: 0,
      dealt: 0,
    };
    let best = Infinity;
    for (const s of this.samples) {
      const d = (s.x - t.cx) ** 2 + (s.y - t.cy) ** 2;
      if (d < best) { best = d; t.aimX = s.x; t.aimY = s.y; }
    }
    this.towers.push(t);
    this.grid[ty * COLS + tx] = TILE_TOWER;
    return t;
  }

  build(type, tx, ty) {
    const def = TOWERS[type];
    if (!def || !this.allowed.includes(type) || !this.canBuild(tx, ty)) return null;
    if (this.phase === 'lost' || this.phase === 'won') return null;
    const cost = def.levels[0].cost;
    if (this.gold < cost) return null;
    this.gold -= cost;
    this.stats.built++;
    const t = this.addTower(type, tx, ty);
    this.emit('build', { tower: t });
    return t;
  }

  upgradeCost(t) {
    const next = t.def.levels[t.level + 1];
    return next ? next.cost : null;
  }

  upgrade(t) {
    const cost = this.upgradeCost(t);
    if (cost == null || this.gold < cost) return false;
    if (this.phase === 'lost' || this.phase === 'won') return false;
    this.gold -= cost;
    t.level++;
    t.lv = t.def.levels[t.level];
    t.invested += cost;
    this.emit('upgrade', { tower: t });
    return true;
  }

  /* 웨이브가 시작되기 전에 무르면 전액, 그 뒤로는 70%. */
  sellValue(t) {
    return t.fresh ? t.invested : Math.floor(t.invested * SELL_RATE);
  }

  sell(t) {
    const i = this.towers.indexOf(t);
    if (i < 0) return false;
    const value = this.sellValue(t);
    this.gold += value;
    this.towers.splice(i, 1);
    this.grid[t.y * COLS + t.x] = TILE_FREE;
    this.emit('sell', { tower: t, value });
    return true;
  }

  /* ───── 웨이브 ───── */

  enemiesLeft() {
    return this.enemies.length + (this.queue.length - this.qi);
  }

  startWave() {
    if (this.phase !== 'build') return false;
    this.snapshot = this.serialize();
    this.wave++;
    this.queue = scheduleFrom(this.groups(this.wave));
    this.qi = 0;
    this.waveTime = 0;
    this.phase = 'wave';
    for (const t of this.towers) t.fresh = false;
    const boss = this.queue.find((q) => ENEMIES[q.type].boss);
    this.emit('wavestart', { wave: this.wave, boss: boss ? boss.type : null });
    return true;
  }

  continueEndless() {
    if (this.phase !== 'won' || this.stage) return false;
    this.endless = true;
    this.phase = 'build';
    return true;
  }

  spawn(type) {
    const def = ENEMIES[type];
    const w = this.wave;
    const path = this.paths[this.spawnFlip++ % this.paths.length];
    const hp = Math.round(def.hp * this.hpAt(w));
    const e = {
      id: this.nextId++,
      type,
      def,
      r: def.r,
      hp,
      maxHp: hp,
      speed: def.speed,
      armor: Math.round(def.armor * this.armorAt(w) * 10) / 10,
      phys: def.phys,
      reward: Math.round(def.reward * this.rewardAt(w)),
      lives: def.lives,
      boss: !!def.boss,
      path,
      dist: 0,
      off: def.boss ? 0 : (this.rand() - 0.5) * 0.36,
      x: 0,
      y: 0,
      dx: 1,
      dy: 0,
      slow: 0,
      vuln: 1,
      alive: true,
      age: 0,
      hitT: 0,
    };
    this.place(e);
    this.enemies.push(e);
    this.emit('spawn', { enemy: e });
    return e;
  }

  place(e) {
    e.path.at(e.dist, e);
    e.x += -e.dy * e.off;
    e.y += e.dx * e.off;
  }

  /* ───── 한 틱 ───── */

  update(dt) {
    this.time += dt;
    if (this.phase === 'wave') {
      this.waveTime += dt;
      while (this.qi < this.queue.length && this.queue[this.qi].t <= this.waveTime) {
        this.spawn(this.queue[this.qi++].type);
      }
      this.applyAuras();
      this.moveEnemies(dt);
      if (this.phase === 'lost') return;
      this.updateTowers(dt);
    } else if (this.phase === 'build') {
      for (const t of this.towers) {
        t.recoil = Math.max(0, t.recoil - dt * 4);
        t.flash = Math.max(0, t.flash - dt * 3);
      }
    }
    this.updateShots(dt);
    this.sweep();
    if (this.phase === 'wave' && this.qi >= this.queue.length && this.enemies.length === 0) {
      this.endWave();
    }
  }

  applyAuras() {
    const enemies = this.enemies;
    for (const e of enemies) { e.slow = 0; e.vuln = 1; }
    for (const t of this.towers) {
      if (t.def.kind !== 'aura') continue;
      const r2 = t.lv.range * t.lv.range;
      for (const e of enemies) {
        const dx = e.x - t.cx;
        const dy = e.y - t.cy;
        if (dx * dx + dy * dy > r2) continue;
        if (t.lv.slow > e.slow) e.slow = t.lv.slow;
        if (t.lv.vuln) e.vuln = 1 + t.lv.vuln;
      }
    }
  }

  moveEnemies(dt) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.age += dt;
      if (e.hitT > 0) e.hitT -= dt;
      const slow = e.boss ? e.slow * 0.5 : e.slow;
      e.cur = e.speed * (1 - slow);
      e.dist += e.cur * dt;
      if (e.dist >= e.path.length) {
        e.alive = false;
        this.lives -= e.lives;
        this.stats.leaked++;
        if (this.lives < 0) this.lives = 0;
        this.emit('leak', { enemy: e, x: e.x, y: e.y });
        if (this.lives <= 0) {
          this.phase = 'lost';
          this.emit('lost', {});
          return;
        }
        continue;
      }
      this.place(e);
    }
  }

  pickTarget(t, skip) {
    const r2 = t.lv.range * t.lv.range;
    let best = null;
    let bestScore = -Infinity;
    for (const e of this.enemies) {
      if (!e.alive || (skip && skip.includes(e))) continue;
      const dx = e.x - t.cx;
      const dy = e.y - t.cy;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      let score;
      switch (t.mode) {
        case 'last': score = e.path.length - e.dist; break;
        case 'strong': score = e.hp; break;
        case 'near': score = -d2; break;
        default: score = e.dist - e.path.length;
      }
      if (score > bestScore) { bestScore = score; best = e; }
    }
    return best;
  }

  updateTowers(dt) {
    for (const t of this.towers) {
      t.recoil = Math.max(0, t.recoil - dt * 4);
      t.flash = Math.max(0, t.flash - dt * 3);
      if (t.def.kind === 'aura') continue;
      if (t.burst > 0) {
        t.burstT -= dt;
        while (t.burst > 0 && t.burstT <= 0) {
          this.fireRocket(t);
          t.burst--;
          t.burstT += 0.07;
        }
      }
      if (t.cd > 0) t.cd -= dt;
      if (t.cd > 0) continue;
      const target = this.pickTarget(t);
      if (!target) continue;
      t.aimX = target.x;
      t.aimY = target.y;
      t.cd = t.lv.cd;
      t.recoil = 1;
      this.fire(t, target);
    }
  }

  fire(t, target) {
    const lv = t.lv;
    switch (t.type) {
      case 'crossbow': {
        const d0 = Math.max(0.3, Math.hypot(target.x - t.cx, target.y - t.cy));
        this.shots.push({
          kind: 'arrow', x: t.cx, y: t.cy, vx: 1, vy: 0, target, tx: target.x, ty: target.y,
          speed: 13, dmg: lv.dmg, src: t, h: lv.h, h0: lv.h, d0, slope: lv.h / d0,
        });
        this.emit('shoot', { kind: 'arrow', x: t.cx, y: t.cy, h: lv.h });
        break;
      }
      case 'cannon': {
        const speed = 7;
        const p = {};
        let dur = Math.max(0.25, Math.hypot(target.x - t.cx, target.y - t.cy) / speed);
        target.path.at(Math.min(target.path.length, target.dist + (target.cur || target.speed) * dur), p);
        dur = Math.max(0.25, Math.hypot(p.x - t.cx, p.y - t.cy) / speed);
        t.aimX = p.x;
        t.aimY = p.y;
        this.shots.push({
          kind: 'shell', x: t.cx, y: t.cy, x0: t.cx, y0: t.cy, tx: p.x, ty: p.y, h: lv.h, h0: lv.h,
          t: 0, dur, dmg: lv.dmg, splash: lv.splash, src: t,
        });
        this.emit('shoot', { kind: 'shell', x: t.cx, y: t.cy, h: lv.h });
        break;
      }
      case 'rocket': {
        const list = [target];
        while (list.length < lv.rockets) {
          const e = this.pickTarget(t, list);
          if (!e) break;
          list.push(e);
        }
        t.burstList = list;
        t.burst = lv.rockets;
        t.burstT = 0;
        this.emit('shoot', { kind: 'volley', x: t.cx, y: t.cy, h: lv.h });
        break;
      }
      case 'tesla': {
        const chain = [target];
        let cur = target;
        while (chain.length < lv.chain) {
          let next = null;
          let nd = CHAIN_RANGE * CHAIN_RANGE;
          for (const e of this.enemies) {
            if (!e.alive || chain.includes(e)) continue;
            const d = (e.x - cur.x) ** 2 + (e.y - cur.y) ** 2;
            if (d < nd) { nd = d; next = e; }
          }
          if (!next) break;
          chain.push(next);
          cur = next;
        }
        const pts = [{ x: t.cx, y: t.cy, h: lv.h }];
        let dmg = lv.dmg;
        for (const e of chain) {
          pts.push({ x: e.x, y: e.y });
          this.hit(e, dmg, 'magic', t);
          dmg *= CHAIN_FALLOFF;
        }
        t.flash = 1;
        this.emit('bolt', { pts });
        break;
      }
    }
  }

  fireRocket(t) {
    const lv = t.lv;
    const n = lv.rockets - t.burst;
    let target = null;
    const list = t.burstList;
    for (let k = 0; k < list.length; k++) {
      const e = list[(n + k) % list.length];
      if (e.alive) { target = e; break; }
    }
    if (!target) target = this.pickTarget(t);
    const tx = target ? target.x : t.aimX;
    const ty = target ? target.y : t.aimY;
    const a = Math.atan2(ty - t.cy, tx - t.cx) + (this.rand() - 0.5) * 1.1;
    t.recoil = 1;
    const d0 = Math.max(0.3, Math.hypot(tx - t.cx, ty - t.cy));
    this.shots.push({
      kind: 'rocket', x: t.cx, y: t.cy, vx: Math.cos(a), vy: Math.sin(a), target, tx, ty,
      speed: 4, life: 0, dmg: lv.dmg, splash: lv.splash, src: t, h: lv.h, h0: lv.h, d0, slope: lv.h / d0,
    });
    this.emit('shoot', { kind: 'rocket', x: t.cx, y: t.cy, h: lv.h });
  }

  hit(e, dmg, kind, src) {
    if (!e.alive) return;
    let d = dmg;
    if (kind === 'phys') d = Math.max(d * 0.15, d - e.armor) * e.phys;
    d *= e.vuln;
    e.hp -= d;
    e.hitT = 0.12;
    if (src) src.dealt += d;
    if (e.hp <= 0) {
      e.alive = false;
      this.gold += e.reward;
      this.stats.kills++;
      this.stats.earned += e.reward;
      if (src) src.kills++;
      this.emit('kill', { enemy: e, x: e.x, y: e.y, reward: e.reward });
    }
  }

  explode(x, y, radius, dmg, src) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const reach = radius + e.r * 0.5;
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy <= reach * reach) this.hit(e, dmg, 'phys', src);
    }
  }

  updateShots(dt) {
    for (const s of this.shots) {
      if (s.kind === 'arrow') {
        if (s.target && s.target.alive) { s.tx = s.target.x; s.ty = s.target.y; }
        const dx = s.tx - s.x;
        const dy = s.ty - s.y;
        const d = Math.hypot(dx, dy);
        const step = s.speed * dt;
        s.h = s.h0 * Math.min(1, d / s.d0);
        if (d <= step + 0.1) {
          if (s.target && s.target.alive) {
            this.hit(s.target, s.dmg, 'phys', s.src);
            this.emit('hit', { kind: 'arrow', x: s.tx, y: s.ty });
          }
          s.dead = true;
        } else {
          s.vx = dx / d;
          s.vy = dy / d;
          s.x += s.vx * step;
          s.y += s.vy * step;
        }
      } else if (s.kind === 'shell') {
        s.t += dt;
        const k = Math.min(1, s.t / s.dur);
        s.x = s.x0 + (s.tx - s.x0) * k;
        s.y = s.y0 + (s.ty - s.y0) * k;
        s.h = s.h0 * (1 - k) + Math.sin(k * Math.PI) * (0.35 + s.dur * 0.5);
        if (k >= 1) {
          this.explode(s.tx, s.ty, s.splash, s.dmg, s.src);
          this.emit('explode', { kind: 'shell', x: s.tx, y: s.ty, r: s.splash });
          s.dead = true;
        }
      } else if (s.kind === 'rocket') {
        s.life += dt;
        s.speed = Math.min(11, s.speed + 16 * dt);
        if (s.target && s.target.alive) { s.tx = s.target.x; s.ty = s.target.y; }
        const dx = s.tx - s.x;
        const dy = s.ty - s.y;
        const d = Math.hypot(dx, dy);
        const step = s.speed * dt;
        s.h = s.h0 * Math.min(1, d / s.d0);
        if (d <= step + 0.15 || s.life > 4) {
          this.explode(s.x, s.y, s.splash, s.dmg, s.src);
          this.emit('explode', { kind: 'rocket', x: s.x, y: s.y, r: s.splash });
          s.dead = true;
        } else {
          const want = Math.atan2(dy, dx);
          const have = Math.atan2(s.vy, s.vx);
          let diff = want - have;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const turn = (5 + s.life * 14) * dt;
          const a = have + Math.max(-turn, Math.min(turn, diff));
          s.vx = Math.cos(a);
          s.vy = Math.sin(a);
          s.x += s.vx * step;
          s.y += s.vy * step;
        }
      }
    }
  }

  sweep() {
    let n = 0;
    for (const e of this.enemies) if (e.alive) this.enemies[n++] = e;
    this.enemies.length = n;
    n = 0;
    for (const s of this.shots) if (!s.dead) this.shots[n++] = s;
    this.shots.length = n;
  }

  endWave() {
    const bonus = this.bonusAt(this.wave);
    this.gold += bonus;
    this.stats.earned += bonus;
    if (this.wave >= this.finalWave && !this.endless) {
      this.phase = 'won';
      this.emit('waveclear', { wave: this.wave, bonus });
      this.emit('won', {});
    } else {
      this.phase = 'build';
      this.emit('waveclear', { wave: this.wave, bonus });
    }
  }

  /* ───── 저장 ───── */

  serialize() {
    return {
      v: 3,
      stage: this.stage ? this.stage.id : null,
      map: this.map.id,
      diff: this.diffId,
      gold: this.gold,
      lives: this.lives,
      wave: this.wave,
      endless: this.endless,
      stats: { ...this.stats },
      towers: this.towers.map((t) => ({ t: t.type, x: t.x, y: t.y, l: t.level, m: t.mode, i: t.invested })),
    };
  }

  static fromSave(d) {
    if (!d || d.v !== 3 || !MAPS.some((m) => m.id === d.map)) return null;
    if (d.stage != null && !STAGES.some((st) => st.id === d.stage)) return null;
    const g = new Game({ stage: d.stage, map: d.map, diff: d.diff });
    g.gold = Math.max(0, d.gold | 0);
    g.lives = Math.max(1, d.lives | 0);
    g.wave = Math.max(0, d.wave | 0);
    g.endless = !g.stage && (!!d.endless || g.wave >= FINAL_WAVE);
    if (g.stage) g.wave = Math.min(g.wave, g.finalWave - 1);
    for (const s of d.towers || []) {
      if (!TOWERS[s.t] || !g.canBuild(s.x | 0, s.y | 0)) continue;
      const t = g.addTower(s.t, s.x | 0, s.y | 0);
      t.level = Math.max(0, Math.min(t.def.levels.length - 1, s.l | 0));
      t.lv = t.def.levels[t.level];
      if (TARGET_MODES.some((m) => m.id === s.m)) t.mode = s.m;
      t.invested = Math.max(0, s.i | 0);
      t.fresh = false;
    }
    for (const k of Object.keys(g.stats)) g.stats[k] = (d.stats && d.stats[k]) | 0;
    g.snapshot = g.serialize();
    return g;
  }
}

/* 길이 가장 많이 들어오는 빈 타일을 찾는다. 시작 화면의 시연과 밸런스 봇이 쓴다. */
function bestSpot(game, range, near) {
  let best = null;
  let bestScore = -1;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!game.canBuild(x, y)) continue;
      let score = game.coverage(x + 0.5, y + 0.5, range);
      if (near) {
        const d = Math.hypot(x - near.x, y - near.y);
        score -= d * 1.5;
      }
      if (score > bestScore) { bestScore = score; best = { x, y, score }; }
    }
  }
  return best;
}
