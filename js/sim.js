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
    /* 전투에 데려온 탑(최대 다섯)과 그 탑들의 등급. 주지 않으면 모든 탑을 등급 없이 쓴다. */
    this.allowed = (opts.loadout || TOWER_ORDER).filter((t) => TOWERS[t]).slice(0, opts.loadout ? LOADOUT_MAX : TOWER_ORDER.length);
    this.ranks = opts.ranks || {};
    this.lvCache = {};
    this.carry = 0; // 처치 보상의 소수점 아래 몫을 모아 두는 곳
    this.rand = mulberry32(opts.seed || 20251114);

    this.paths = this.map.paths.map((w) => new TrackPath(w));
    /* 도전 모드: 길이 길수록 탑이 적을 오래 때리므로, 길 길이에 맞춰 적의 체력을 조절해 지도마다 난이도를 고르게 한다 */
    this.ease = Math.max(0.55, Math.min(1.5, this.paths.reduce((n, q) => n + q.length, 0) / this.paths.length / CHALLENGE_PATH));
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
    this.strikes = []; // 예고된 자리에 잠시 뒤 터지는 공격(불기둥·유성·낙뢰)
    this.traps = []; // 길 위에 깔린 덫
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
    return this.stage ? this.stage.hp * Math.pow(STAGE_GROWTH, wave - 1) : hpScale(wave) * this.diff.hp * this.ease;
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
      mode: def.mode || 'first',
      tick: 0,
      beam: null,
      beamT: 0,
      beamAcc: 0,
      invested: def.levels[0].cost,
      fresh: this.phase === 'build',
      aimX: tx + 1.5,
      aimY: ty + 0.5,
      recoil: 0,
      flash: 0,
      burst: 0,
      burstT: 0,
      burstList: [],
      cast: 0, // 화염파: 몸짓(소환·불기둥·유성우)이 남은 시간
      castDur: 1,
      gest: null, // 화염파: 지금 하는 몸짓의 종류
      idle: true, // 화염파: 사거리 안에 적이 없다
      mid: 0,
      pillarT: 3.2, // 화염파: 다음 불기둥까지
      meteorT: 6.5, // 화염파: 다음 유성우까지
      sweep: null, // 화염파: 지금 휘두르고 있는 광선 { a0, a1, a, t, dur, hit }
      flip: false,
      amp: 1, // 사령탑 곁에서 느는 피해
      haste: 1, // 북탑 곁에서 느는 연사
      reach: 1, // 감시탑 곁에서 느는 사거리
      range: def.levels[0].range || 0,
      forks: null, // 프리즘탑: 갈라진 광선이 닿은 적들
      shockT: 1.5, // 화염파: 다음 충격파까지
      wave: null, // 화염파: 퍼져 나가는 충격파 { t, dur, r, hit }
      wavePending: false,
      kills: 0,
      dealt: 0,
    };
    let best = Infinity;
    for (const s of this.samples) {
      const d = (s.x - t.cx) ** 2 + (s.y - t.cy) ** 2;
      if (d < best) { best = d; t.aimX = s.x; t.aimY = s.y; }
    }
    t.lv = this.lvOf(type, 0);
    t.mid = Math.atan2(t.aimY - t.cy, t.aimX - t.cx);
    if (t.lv.every) t.tick = t.lv.every;
    this.towers.push(t);
    this.grid[ty * COLS + tx] = TILE_TOWER;
    this.recalc();
    return t;
  }

  /* 등급을 반영한 탑의 단계별 수치 */
  lvOf(type, level) {
    const key = type + level;
    return this.lvCache[key] || (this.lvCache[key] = towerStats(type, level, this.ranks[type] | 0));
  }

  setLevel(t, level) {
    t.level = level;
    t.lv = this.lvOf(t.type, level);
    t.tickFx = null;
    this.recalc();
  }

  build(type, tx, ty) {
    const def = TOWERS[type];
    if (!def || !this.allowed.includes(type) || !this.canBuild(tx, ty)) return null;
    if (this.phase === 'lost' || this.phase === 'won') return null;
    if (def.unique && this.towers.some((o) => o.type === type)) return null;
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
    this.setLevel(t, t.level + 1);
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
    this.strikes = this.strikes.filter((q) => q.src !== t);
    this.traps = this.traps.filter((q) => q.src !== t);
    this.recalc();
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
      reward: def.reward * this.rewardAt(w),
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
      poison: 0,
      kb: 0, // 밀려날 남은 거리
      stun: 0, // 기절·빙결이 남은 시간
      stunGuard: 0, // 다시 기절하지 않는 시간
      kbGuard: 0, // 다시 밀려나지 않는 시간
      chill: 0, // 맞아서 걸린 둔화와 그 남은 시간
      chillT: 0,
      shred: 0, // 깎인 갑옷과 그 남은 시간
      shredT: 0,
      curse: 0, // 저주탑 곁에서 깎이는 갑옷
      mark: 0, // 표식: 받는 피해가 느는 정도와 남은 시간
      markT: 0,
      dotKind: 'poison',
      poisonT: 0,
      poisonSrc: null,
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
      this.updateStrikes(dt);
      this.updateTraps(dt);
    } else if (this.phase === 'build') {
      for (const t of this.towers) {
        t.recoil = Math.max(0, t.recoil - dt * 4);
        t.flash = Math.max(0, t.flash - dt * 3);
        t.cast = Math.max(0, t.cast - dt);
        t.sweep = null;
        t.forks = null;
        t.wave = null;
        t.wavePending = false;
        t.idle = true;
        t.beam = null;
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
    for (const e of enemies) {
      e.slow = e.chillT > 0 ? e.chill : 0;
      e.vuln = e.markT > 0 ? 1 + e.mark : 1;
      e.curse = 0;
    }
    for (const t of this.towers) {
      if (t.def.mech !== 'aura') continue;
      const lv = t.lv;
      const r2 = lv.range * lv.range;
      for (const e of enemies) {
        const dx = e.x - t.cx;
        const dy = e.y - t.cy;
        if (dx * dx + dy * dy > r2) continue;
        if (lv.slow > e.slow) e.slow = lv.slow;
        if (lv.vuln && 1 + lv.vuln > e.vuln) e.vuln = 1 + lv.vuln;
        if (lv.shred > e.curse) e.curse = lv.shred;
      }
    }
  }

  moveEnemies(dt) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.age += dt;
      if (e.hitT > 0) e.hitT -= dt;
      if (e.chillT > 0) e.chillT -= dt;
      if (e.stunGuard > 0) e.stunGuard -= dt;
      if (e.kbGuard > 0) e.kbGuard -= dt;
      if (e.markT > 0) e.markT -= dt;
      if (e.shredT > 0) {
        e.shredT -= dt;
        if (e.shredT <= 0) e.shred = 0;
      }
      if (e.poisonT > 0) {
        e.poisonT -= dt;
        this.hit(e, e.poison * dt, 'magic', e.poisonSrc, true);
        if (!e.alive) continue;
        if (e.poisonT <= 0) e.poison = 0;
      }
      if (e.kb > 0) {
        /* 충격파에 밀려나는 동안은 나아가지 못한다 */
        const step = Math.min(e.kb, dt * 6);
        e.kb -= step;
        e.dist = Math.max(0, e.dist - step);
        e.cur = 0;
        this.place(e);
        continue;
      }
      if (e.stun > 0) {
        /* 기절·빙결: 그 자리에 멈춰 선다 */
        e.stun -= dt;
        e.cur = 0;
        continue;
      }
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

  /* ───── 탑 ───── */

  pickTarget(t, skip) {
    const r2 = t.range * t.range;
    const min2 = t.lv.minRange ? t.lv.minRange * t.lv.minRange : 0;
    let best = null;
    let bestScore = -Infinity;
    for (const e of this.enemies) {
      if (!e.alive || (skip && skip.includes(e))) continue;
      const dx = e.x - t.cx;
      const dy = e.y - t.cy;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2 || d2 < min2) continue;
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

  /* 주변 탑을 돕는 탑(감시탑·북탑·사령탑)의 효과를 다시 셈한다. 같은 종류는 겹치지 않고 가장 센 것만 든다. */
  recalc() {
    for (const t of this.towers) { t.amp = 1; t.haste = 1; t.reach = 1; }
    for (const b of this.towers) {
      if (b.def.mech !== 'buff') continue;
      const r2 = b.lv.range * b.lv.range;
      for (const t of this.towers) {
        if (t.def.mech === 'buff' || (t.cx - b.cx) ** 2 + (t.cy - b.cy) ** 2 > r2) continue;
        if (b.lv.amp) t.amp = Math.max(t.amp, 1 + b.lv.amp);
        if (b.lv.haste) t.haste = Math.max(t.haste, 1 + b.lv.haste);
        if (b.lv.reach) t.reach = Math.max(t.reach, 1 + b.lv.reach);
      }
    }
    for (const t of this.towers) {
      const fixed = t.def.mech === 'buff' || t.def.mech === 'aura' || t.def.mech === 'nova';
      t.range = (t.lv.range || 0) * (fixed ? 1 : t.reach);
      t.spots = null;
    }
  }

  updateTowers(dt) {
    for (const t of this.towers) {
      t.recoil = Math.max(0, t.recoil - dt * 4);
      t.flash = Math.max(0, t.flash - dt * 3);
      const lv = t.lv;
      switch (t.def.mech) {
        case 'buff': continue;
        case 'aura':
          if (lv.dps) this.runThorns(t, dt);
          if (lv.every) this.runNova(t, dt);
          continue;
        case 'income': this.runMine(t, dt); continue;
        case 'cone': this.runFlame(t, dt); continue;
        case 'beam': this.runLaser(t, dt); continue;
        case 'nova': this.runNova(t, dt); continue;
        case 'trap': this.runTrap(t, dt); continue;
        case 'lord': this.runLord(t, dt); continue;
      }
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
      t.cd = lv.cd / t.haste;
      t.recoil = 1;
      this.fire(t, target);
    }
  }

  fire(t, target) {
    const lv = t.lv;
    const skin = t.def.skin;
    switch (t.def.mech) {
      case 'bolt': {
        /* 날아가 맞는 탄. multi 가 있으면 서로 다른 적 여럿을 한꺼번에 노린다. */
        const list = [target];
        while (list.length < (lv.multi || 1)) {
          const e = this.pickTarget(t, list);
          if (!e) break;
          list.push(e);
        }
        for (const e of list) this.launch(t, e, 1, lv.bounce || 0, null);
        this.emit('shoot', { kind: 'bolt', skin, x: t.cx, y: t.cy, h: lv.h });
        break;
      }
      case 'shell': {
        /* 포물선으로 날아가 떨어진 자리에서 터진다. 적이 갈 곳을 내다보고 쏜다. */
        const speed = t.def.speed || 7;
        const p = {};
        let dur = Math.max(0.25, Math.hypot(target.x - t.cx, target.y - t.cy) / speed);
        target.path.at(Math.min(target.path.length, target.dist + (target.cur || target.speed) * dur), p);
        dur = Math.max(0.25, Math.hypot(p.x - t.cx, p.y - t.cy) / speed);
        t.aimX = p.x;
        t.aimY = p.y;
        this.shots.push({
          kind: 'shell', skin, x: t.cx, y: t.cy, x0: t.cx, y0: t.cy, tx: p.x, ty: p.y, h: lv.h, h0: lv.h,
          t: 0, dur, fx: lv, splash: lv.splash, src: t,
        });
        this.emit('shoot', { kind: 'shell', skin, x: t.cx, y: t.cy, h: lv.h });
        break;
      }
      case 'rockets': {
        const list = [target];
        while (list.length < lv.rockets) {
          const e = this.pickTarget(t, list);
          if (!e) break;
          list.push(e);
        }
        t.burstList = list;
        t.burst = lv.rockets;
        t.burstT = 0;
        this.emit('shoot', { kind: 'volley', skin, x: t.cx, y: t.cy, h: lv.h });
        break;
      }
      case 'snipe': {
        let tx = target.x;
        let ty = target.y;
        if (t.def.line) {
          /* 일직선으로 꿰뚫는다: 겨눈 적 쪽으로 사거리 끝까지, 그 선 위의 적을 앞에서부터 through 마리 */
          const a = Math.atan2(target.y - t.cy, target.x - t.cx);
          const ux = Math.cos(a);
          const uy = Math.sin(a);
          const hits = [];
          for (const e of this.enemies) {
            if (!e.alive) continue;
            const dx = e.x - t.cx;
            const dy = e.y - t.cy;
            const along = dx * ux + dy * uy;
            if (along < 0 || along > t.range + 0.2) continue;
            if (Math.abs(dx * uy - dy * ux) > LINE_HALF + e.r * 0.5) continue;
            hits.push([along, e]);
          }
          hits.sort((p, q) => p[0] - q[0]);
          const n = Math.min(hits.length, lv.through || 99);
          for (let i = 0; i < n; i++) this.strike(hits[i][1], t, lv, 1);
          const reach = lv.through && hits.length >= lv.through ? hits[n - 1][0] + 0.3 : t.range;
          tx = t.cx + ux * reach;
          ty = t.cy + uy * reach;
        } else {
          this.strike(target, t, lv, 1);
        }
        this.emit('shoot', { kind: 'snipe', skin, x: t.cx, y: t.cy, h: lv.h, tx, ty });
        break;
      }
      case 'chain': {
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
        let k = 1;
        for (const e of chain) {
          pts.push({ x: e.x, y: e.y });
          this.strike(e, t, lv, k);
          k *= CHAIN_FALLOFF;
        }
        t.flash = 1;
        this.emit('bolt', { pts });
        break;
      }
      case 'strike':
        /* 하늘에서 떨어지는 공격: 적이 몰린 곳을 고르거나(pick: 'cluster'), 사거리 안의 적들 위로 흩뿌린다 */
        t.flash = 1;
        if (t.def.pick === 'cluster') this.clusterStrikes(t, lv.count || 1, lv.splash, lv, lv.delay, skin);
        else this.rainStrikes(t, lv.count || 1, lv.splash, lv, lv.delay, 0.12, skin);
        this.emit('shoot', { kind: 'call', skin, x: t.cx, y: t.cy, h: lv.h });
        break;
    }
  }

  /* 적을 쫓아가는 탄 하나를 쏜다. from 이 있으면 그 자리에서 튕겨 나간 탄이다. */
  launch(t, e, mult, bounce, from) {
    const x = from ? from.x : t.cx;
    const y = from ? from.y : t.cy;
    const h = from ? 0.2 : t.lv.h;
    const d0 = Math.max(0.3, Math.hypot(e.x - x, e.y - y));
    this.shots.push({
      kind: 'bolt', skin: t.def.skin, x, y, vx: 1, vy: 0, target: e, tx: e.x, ty: e.y,
      speed: t.def.speed || 13, mult, bounce, seen: from ? from.seen : [e], fx: t.lv, src: t, h, h0: h, d0, slope: h / d0,
    });
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
      kind: 'rocket', skin: t.def.skin, x: t.cx, y: t.cy, vx: Math.cos(a), vy: Math.sin(a), target, tx, ty,
      speed: 4, life: 0, fx: lv, splash: lv.splash, src: t, h: lv.h, h0: lv.h, d0, slope: lv.h / d0,
    });
    this.emit('shoot', { kind: 'rocket', skin: t.def.skin, x: t.cx, y: t.cy, h: lv.h });
  }

  /* 피해를 준다. quiet: 조금씩 계속 들어가는 피해(독·불길·광선)라서 맞을 때마다 번쩍이지 않는다. */
  hit(e, dmg, kind, src, quiet) {
    if (!e.alive) return;
    let d = dmg;
    if (kind === 'phys') {
      const armor = Math.max(0, e.armor - e.shred - e.curse);
      d = (src && src.def.pierce ? d : Math.max(d * 0.15, d - armor)) * e.phys;
    }
    d *= e.vuln;
    if (src) d *= src.amp;
    e.hp -= d;
    if (!quiet) e.hitT = 0.12;
    if (src) src.dealt += d;
    if (e.hp <= 0) {
      e.alive = false;
      /* 보상의 소수점 아래는 모아 두었다가 1골드가 되면 함께 준다 */
      this.carry += e.reward;
      let pay = Math.floor(this.carry + 1e-9);
      this.carry -= pay;
      if (src && src.lv.bounty) pay += src.lv.bounty;
      this.gold += pay;
      this.stats.kills++;
      this.stats.earned += pay;
      if (src) src.kills++;
      this.emit('kill', { enemy: e, x: e.x, y: e.y, reward: pay, bounty: !!(src && src.lv.bounty) });
    }
  }

  /* 탑의 공격 한 번이 적에게 닿았을 때: 피해와 함께 그 공격에 딸린 효과(fx)를 건다.
     fx 는 탑의 단계 수치이거나, 그와 같은 모양으로 만든 값이다. */
  strike(e, src, fx, mult, quiet) {
    if (!e.alive) return;
    if (fx.dmg) this.hit(e, fx.dmg * mult, fx.dtype || src.def.dtype || 'phys', src, quiet);
    if (!e.alive) return;
    if (fx.slow && src.def.mech !== 'aura') {
      if (fx.slow >= e.chill || e.chillT <= 0) e.chill = fx.slow;
      e.chillT = Math.max(e.chillT, fx.slowT || 1.5);
    }
    if (fx.stun && e.stunGuard <= 0) {
      /* 한 번 풀려난 적은 한동안 다시 묶이지 않는다: 기절 탑을 여럿 세워도 적을 영영 세워 둘 수는 없다 */
      e.stun = fx.stun * (e.boss ? 0.4 : 1);
      e.stunGuard = e.stun + STUN_GUARD;
    }
    if (fx.dot) {
      if (fx.dot >= e.poison) { e.poison = fx.dot; e.poisonSrc = src; e.dotKind = src.def.dotKind || 'poison'; }
      e.poisonT = Math.max(e.poisonT, fx.dotT || POISON_TIME);
    }
    if (fx.shred && src.def.mech !== 'aura') {
      e.shred = Math.min(fx.shredMax || fx.shred, e.shred + fx.shred);
      e.shredT = 3;
    }
    if (fx.mark) { e.mark = Math.max(e.mark, fx.mark); e.markT = fx.markT || 4; }
    if (fx.kb && e.kbGuard <= 0) {
      e.kb += fx.kb * (e.boss ? 0.35 : 1);
      e.kbGuard = KB_GUARD;
    }
    if (fx.exec && !e.boss && e.hp < e.maxHp * fx.exec) {
      /* 처형: 체력이 얼마 남지 않은 적은 그 자리에서 끝낸다 */
      this.emit('exec', { x: e.x, y: e.y, r: e.r });
      this.hit(e, e.hp + 1, 'magic', src, true);
    }
  }

  /* 터지는 공격: 한가운데는 온전한 피해, 가장자리로 갈수록 절반 가까이까지 약해진다. 딸린 효과는 고르게 걸린다. */
  blast(x, y, radius, src, fx) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const reach = radius + e.r * 0.5;
      const d2 = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d2 > reach * reach) continue;
      this.strike(e, src, fx, 1 - (SPLASH_FALLOFF * Math.sqrt(d2)) / reach);
    }
  }

  /* 금광·금고: 전투 중에 일정 시간마다 골드를 캔다 */
  runMine(t, dt) {
    t.tick -= dt;
    if (t.tick > 0) return;
    t.tick += t.lv.every;
    this.gold += t.lv.income;
    this.stats.earned += t.lv.income;
    t.flash = 1;
    this.emit('income', { tower: t, amount: t.lv.income });
  }

  /* 화염탑·용의 탑: 겨눈 쪽 부채꼴 안의 적을 모두 태운다 */
  runFlame(t, dt) {
    if (t.cd > 0) t.cd -= dt;
    if (t.cd > 0) return;
    const target = this.pickTarget(t);
    if (!target) return;
    const lv = t.lv;
    t.cd = FLAME_TICK;
    t.aimX = target.x;
    t.aimY = target.y;
    t.recoil = 1;
    const ax = target.x - t.cx;
    const ay = target.y - t.cy;
    const al = Math.hypot(ax, ay) || 1;
    const cos = Math.cos(lv.cone);
    const fx = t.tickFx || (t.tickFx = Object.assign({}, lv, { dmg: lv.dps * FLAME_TICK }));
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - t.cx;
      const dy = e.y - t.cy;
      const d = Math.hypot(dx, dy);
      if (d > t.range + 0.15) continue;
      if (d > 0.35 && (dx * ax + dy * ay) / (d * al) < cos) continue;
      this.strike(e, t, fx, t.haste, true);
    }
    this.emit('shoot', { kind: 'flame', skin: t.def.skin, x: t.cx, y: t.cy, h: lv.h, tx: target.x, ty: target.y, range: t.range });
  }

  /* 광선탑: 한 적을 계속 비추고, 오래 비출수록 피해가 커진다. 프리즘탑(split)은 커지지 않는 대신 곁의 적에게로 갈라진다. */
  runLaser(t, dt) {
    const lv = t.lv;
    let b = t.beam;
    if (b && (!b.alive || (b.x - t.cx) ** 2 + (b.y - t.cy) ** 2 > (t.range + 0.2) ** 2)) b = null;
    if (!b) {
      b = this.pickTarget(t);
      t.beamT = 0;
    }
    t.beam = b;
    t.forks = null;
    if (!b) return;
    t.beamT += dt;
    t.aimX = b.x;
    t.aimY = b.y;
    t.recoil = 1;
    const dmg = lv.dps * this.beamPower(t) * dt * t.haste;
    this.hit(b, dmg, 'magic', t, true);
    if (lv.split) {
      /* 가까운 적들에게로 갈라진 광선 */
      const forks = [];
      const near = PRISM_RANGE * PRISM_RANGE;
      for (const e of this.enemies) {
        if (!e.alive || e === b || (e.x - b.x) ** 2 + (e.y - b.y) ** 2 > near) continue;
        forks.push(e);
        if (forks.length >= lv.split) break;
      }
      for (const e of forks) this.hit(e, dmg * PRISM_SHARE, 'magic', t, true);
      t.forks = forks;
    }
    t.beamAcc -= dt;
    if (t.beamAcc <= 0) {
      t.beamAcc = 0.3;
      this.emit('shoot', { kind: 'beam', skin: t.def.skin, x: t.cx, y: t.cy, h: lv.h });
    }
    if (!b.alive) t.beam = null;
  }

  beamPower(t) {
    return t.lv.split ? 1 : 1 + Math.min(2, t.beamT * BEAM_RAMP);
  }

  /* 가시덩굴탑: 사거리 안의 모든 적을 쉬지 않고 찌른다 */
  runThorns(t, dt) {
    const r2 = t.range * t.range;
    const dmg = t.lv.dps * dt * t.haste;
    let any = false;
    for (const e of this.enemies) {
      if (!e.alive || (e.x - t.cx) ** 2 + (e.y - t.cy) ** 2 > r2) continue;
      this.hit(e, dmg, t.def.dtype || 'magic', t, true);
      any = true;
    }
    if (any) t.recoil = 1;
  }

  /* 종탑·빙하탑·지진탑·중력탑·시계탑: 적이 사거리 안에 들어와 있으면 때맞춰 탑 둘레로 고리를 퍼뜨린다 */
  runNova(t, dt) {
    const lv = t.lv;
    if (t.wave) this.spread(t, dt);
    if (t.cd > 0) t.cd -= dt;
    if (t.cd > 0) return;
    const near = (lv.range * 0.9) ** 2;
    if (!this.enemies.some((e) => e.alive && (e.x - t.cx) ** 2 + (e.y - t.cy) ** 2 <= near)) return;
    t.cd = lv.every / t.haste;
    t.recoil = 1;
    t.flash = 1;
    t.wave = { t: 0, dur: NOVA_TIME, r: lv.range, now: 0, hit: [], fx: lv };
    this.emit('nova', { skin: t.def.skin, x: t.cx, y: t.cy, r: lv.range });
  }

  /* 퍼져 나가는 고리가 닿은 적에게 효과를 건다 */
  spread(t, dt) {
    const w = t.wave;
    w.t += dt;
    const k = Math.min(1, w.t / w.dur);
    w.now = w.r * (1 - (1 - k) * (1 - k));
    for (const e of this.enemies) {
      if (!e.alive || w.hit.includes(e)) continue;
      if (Math.hypot(e.x - t.cx, e.y - t.cy) > w.now + e.r * 0.5) continue;
      w.hit.push(e);
      this.strike(e, t, w.fx, 1);
      this.emit('sear', { skin: t.def.skin, x: e.x, y: e.y, r: e.r });
    }
    if (k >= 1) t.wave = null;
  }

  /* 가시덫탑: 사거리 안의 길 위에 덫을 깔아 둔다. 덫은 밟은 적과 그 둘레를 다치게 한다. */
  runTrap(t, dt) {
    const lv = t.lv;
    if (t.cd > 0) t.cd -= dt;
    if (t.cd > 0) return;
    let mine = 0;
    for (const q of this.traps) if (q.src === t) mine++;
    if (mine >= lv.traps) return;
    if (!t.spots) {
      const r2 = t.range * t.range;
      t.spots = this.samples.filter((s) => (s.x - t.cx) ** 2 + (s.y - t.cy) ** 2 <= r2);
    }
    if (!t.spots.length) return;
    for (let tries = 0; tries < 8; tries++) {
      const s = t.spots[(this.rand() * t.spots.length) | 0];
      if (this.traps.some((q) => (q.x - s.x) ** 2 + (q.y - s.y) ** 2 < 0.3)) continue;
      this.traps.push({ x: s.x, y: s.y, age: 0, src: t, fx: lv, r: lv.splash, seed: this.rand() });
      t.cd = lv.cd / t.haste;
      t.recoil = 1;
      t.aimX = s.x;
      t.aimY = s.y;
      this.emit('shoot', { kind: 'trap', skin: t.def.skin, x: t.cx, y: t.cy, h: lv.h, tx: s.x, ty: s.y });
      return;
    }
  }

  updateTraps(dt) {
    const list = this.traps;
    if (!list.length) return;
    let sprung = false;
    for (const q of list) {
      q.age += dt;
      if (q.age < TRAP_ARM) continue;
      for (const e of this.enemies) {
        if (!e.alive || (e.x - q.x) ** 2 + (e.y - q.y) ** 2 > (0.3 + e.r * 0.5) ** 2) continue;
        this.blast(q.x, q.y, q.r, q.src, q.fx);
        this.emit('explode', { kind: 'trap', x: q.x, y: q.y, r: q.r });
        q.dead = true;
        sprung = true;
        break;
      }
    }
    if (sprung) this.traps = list.filter((q) => !q.dead);
  }

  /* 적이 가장 많이 몰린 자리 n 곳에, 잠시 뒤 터지는 공격을 예고한다 */
  clusterStrikes(t, n, radius, fx, delay, kind) {
    const r2 = t.range * t.range;
    const near = radius * radius;
    const taken = [];
    for (let i = 0; i < n; i++) {
      let best = null;
      let bestN = 0;
      for (const e of this.enemies) {
        if (!e.alive || (e.x - t.cx) ** 2 + (e.y - t.cy) ** 2 > r2) continue;
        if (taken.some((q) => (q.x - e.x) ** 2 + (q.y - e.y) ** 2 < 1.6)) continue;
        let c = 0;
        for (const o of this.enemies) {
          if (o.alive && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 <= near) c += o.boss ? 4 : 1;
        }
        if (c > bestN) { bestN = c; best = e; }
      }
      if (!best) break;
      const wait = delay + i * 0.16;
      const p = {};
      best.path.at(Math.min(best.path.length, best.dist + (best.cur || best.speed) * wait), p);
      taken.push({ x: best.x, y: best.y });
      this.strikes.push({ kind, x: p.x, y: p.y, t: 0, delay: wait, r: radius, fx, src: t, seed: this.rand() });
    }
  }

  /* 사거리 안의 적들 가운데 아무나 골라 그 머리 위로 n 번 떨군다 */
  rainStrikes(t, n, radius, fx, delay, gap, kind) {
    const r2 = (t.range + 0.4) ** 2;
    const pool = this.enemies.filter((e) => e.alive && (e.x - t.cx) ** 2 + (e.y - t.cy) ** 2 <= r2);
    for (let i = 0; i < n && pool.length; i++) {
      const e = pool[(this.rand() * pool.length) | 0];
      const wait = delay + i * gap;
      const p = {};
      e.path.at(Math.min(e.path.length, e.dist + (e.cur || e.speed) * wait), p);
      this.strikes.push({
        kind, x: p.x + (this.rand() - 0.5) * 0.3, y: p.y + (this.rand() - 0.5) * 0.3,
        t: 0, delay: wait, r: radius, fx, src: t, seed: this.rand(),
      });
    }
  }

  /* 예고된 자리에 시간이 되면 터지는 공격(불기둥·유성·낙뢰) */
  updateStrikes(dt) {
    const list = this.strikes;
    if (!list.length) return;
    for (const s of list) {
      s.t += dt;
      if (s.t < s.delay) continue;
      this.blast(s.x, s.y, s.r, s.src, s.fx);
      this.emit('burst', { kind: s.kind, x: s.x, y: s.y, r: s.r });
    }
    this.strikes = list.filter((s) => s.t < s.delay);
  }

  /* ───── 화염파(영웅) ─────
     두 손에서 뿜는 굵은 광선을 부채꼴로 휘둘러 지나간 자리의 적을 모두 태운다.
     적이 가까이 오면 발을 굴러 충격파로 태우며 밀어내고,
     2단부터는 불기둥을 솟구치게 하고, 3단에서는 유성우를 떨군다. */
  runLord(t, dt) {
    const lv = t.lv;
    if (t.cast > 0) t.cast = Math.max(0, t.cast - dt);
    if (t.cd > 0) t.cd -= dt;
    if (t.shockT > 0) t.shockT -= dt;
    if (t.pillarT > 0) t.pillarT -= dt;
    if (t.meteorT > 0) t.meteorT -= dt;
    /* 충격파: 움츠렸다가 발을 구르는 순간 퍼져 나가기 시작한다 */
    if (t.wavePending && t.cast <= t.castDur * LORD_SHOCK_AT) {
      t.wavePending = false;
      t.wave = { t: 0, dur: LORD_SHOCK_TIME, r: lv.shockR, now: 0, hit: [], fx: { dmg: lv.shock, dtype: 'magic', kb: lv.push } };
      this.emit('burst', { kind: 'shock', x: t.cx, y: t.cy, r: lv.shockR });
    }
    if (t.wave) this.spread(t, dt);
    if (t.sweep) { this.sweepLord(t, dt); return; }
    const target = this.pickTarget(t);
    t.idle = !target;
    if (!target) return;
    t.aimX = target.x;
    t.aimY = target.y;
    t.mid = Math.atan2(target.y - t.cy, target.x - t.cx); /* 몸이 보는 쪽: 겨눈 적, 휘두르는 동안은 부채꼴의 한가운데 */
    if (t.cast > 0) return; /* 몸짓이 끝날 때까지는 다른 공격을 시작하지 않는다 */
    if (t.shockT <= 0) {
      /* 적이 코앞까지 왔을 때만 쓴다 */
      const near = (lv.shockR * 0.8) ** 2;
      if (this.enemies.some((e) => e.alive && (e.x - t.cx) ** 2 + (e.y - t.cy) ** 2 <= near)) {
        t.shockT = LORD_SHOCK_EVERY;
        this.lordGesture(t, 'shock', 0.8);
        t.wavePending = true;
        this.emit('cast', { kind: 'shock', tower: t });
        return;
      }
    }
    if (lv.meteors && t.meteorT <= 0) {
      t.meteorT = LORD_METEOR_EVERY;
      this.lordGesture(t, 'meteor', 1.3);
      this.rainStrikes(t, lv.meteors, LORD_METEOR_R, { dmg: lv.meteor, dtype: 'magic' }, LORD_METEOR_DELAY, 0.17, 'meteor');
      this.emit('cast', { kind: 'meteor', tower: t });
      return;
    }
    if (lv.pillar && t.pillarT <= 0) {
      t.pillarT = LORD_PILLAR_EVERY;
      this.lordGesture(t, 'pillar', 0.75);
      this.clusterStrikes(t, lv.pillars || 1, LORD_PILLAR_R, { dmg: lv.pillar, dtype: 'magic' }, LORD_PILLAR_DELAY, 'pillar');
      this.emit('cast', { kind: 'pillar', tower: t });
      return;
    }
    /* 겨눈 적을 한가운데 두고, 번갈아 왼쪽·오른쪽에서부터 휘두른다 */
    const mid = t.mid;
    const half = (lv.arc / 2) * (t.flip ? -1 : 1);
    if (t.cd > 0) {
      if (t.cd < 0.5) {
        /* 쏘기 직전에는 광선이 시작될 쪽을 미리 겨눈다 */
        t.aimX = t.cx + Math.cos(mid - half) * t.range;
        t.aimY = t.cy + Math.sin(mid - half) * t.range;
      }
      return;
    }
    t.cd = lv.cd / t.haste;
    t.flip = !t.flip;
    t.sweep = { a0: mid - half, a1: mid + half, a: mid - half, t: 0, dur: LORD_SWEEP, hit: [] };
    this.emit('shoot', { kind: 'lord', tower: t });
    this.sweepLord(t, 0);
  }

  /* 몸짓을 시작한다: 그동안은 광선을 쏘지 않는다 */
  lordGesture(t, kind, dur) {
    t.gest = kind;
    t.cast = dur;
    t.castDur = dur;
    t.cd = Math.max(t.cd, dur * 0.8);
  }

  /* 휩쓸기: 광선이 이번 틱에 지나간 각도 안에 든 적을 한 번씩 태운다 */
  sweepLord(t, dt) {
    const s = t.sweep;
    const lv = t.lv;
    const prev = s.a;
    s.t += dt;
    const k = Math.min(1, s.t / s.dur);
    s.a = s.a0 + (s.a1 - s.a0) * k * k * (3 - 2 * k);
    t.recoil = 1;
    t.flash = 1;
    t.aimX = t.cx + Math.cos(s.a) * t.range;
    t.aimY = t.cy + Math.sin(s.a) * t.range;
    const lo = Math.min(prev, s.a);
    const hi = Math.max(prev, s.a);
    const ref = (lo + hi) / 2;
    for (const e of this.enemies) {
      if (!e.alive || s.hit.includes(e)) continue;
      const dx = e.x - t.cx;
      const dy = e.y - t.cy;
      const d = Math.hypot(dx, dy);
      if (d > t.range + e.r * 0.5) continue;
      let ang = Math.atan2(dy, dx);
      while (ang - ref > Math.PI) ang -= Math.PI * 2;
      while (ang - ref < -Math.PI) ang += Math.PI * 2;
      const pad = Math.atan2(LORD_BEAM + e.r * 0.5, Math.max(0.3, d)); /* 광선 굵기만큼의 각도 */
      if (ang < lo - pad || ang > hi + pad) continue;
      s.hit.push(e);
      this.hit(e, lv.dmg, 'magic', t);
      this.emit('sear', { x: e.x, y: e.y, r: e.r });
    }
    if (k >= 1) t.sweep = null;
  }

  updateShots(dt) {
    for (const s of this.shots) {
      if (s.kind === 'bolt') {
        if (s.target && s.target.alive) { s.tx = s.target.x; s.ty = s.target.y; }
        const dx = s.tx - s.x;
        const dy = s.ty - s.y;
        const d = Math.hypot(dx, dy);
        const step = s.speed * dt;
        s.h = s.h0 * Math.min(1, d / s.d0);
        if (d <= step + 0.1) {
          s.dead = true;
          if (!s.target || !s.target.alive) continue;
          this.strike(s.target, s.src, s.fx, s.mult);
          this.emit('hit', { kind: 'bolt', skin: s.skin, x: s.tx, y: s.ty });
          if (s.bounce > 0) {
            /* 가까운 다른 적에게로 튕긴다 */
            let next = null;
            let nd = BOUNCE_RANGE * BOUNCE_RANGE;
            for (const e of this.enemies) {
              if (!e.alive || s.seen.includes(e)) continue;
              const q = (e.x - s.tx) ** 2 + (e.y - s.ty) ** 2;
              if (q < nd) { nd = q; next = e; }
            }
            if (next) {
              s.seen.push(next);
              this.launch(s.src, next, s.mult * BOUNCE_FALLOFF, s.bounce - 1, { x: s.tx, y: s.ty, seen: s.seen });
            }
          }
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
          this.blast(s.tx, s.ty, s.splash, s.src, s.fx);
          this.emit('explode', { kind: 'shell', skin: s.skin, x: s.tx, y: s.ty, r: s.splash });
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
          this.blast(s.x, s.y, s.splash, s.src, s.fx);
          this.emit('explode', { kind: 'rocket', skin: s.skin, x: s.x, y: s.y, r: s.splash });
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
    this.strikes.length = 0;
    /* 황금 금고: 가진 골드에 이자가 붙는다 */
    for (const t of this.towers) {
      if (!t.lv.interest) continue;
      const gain = Math.min(t.lv.cap, Math.floor(this.gold * t.lv.interest));
      if (gain <= 0) continue;
      this.gold += gain;
      this.stats.earned += gain;
      this.emit('income', { tower: t, amount: gain });
    }
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
      v: 4,
      stage: this.stage ? this.stage.id : null,
      map: this.map.id,
      diff: this.diffId,
      loadout: this.allowed.slice(),
      ranks: { ...this.ranks },
      gold: this.gold,
      lives: this.lives,
      wave: this.wave,
      endless: this.endless,
      stats: { ...this.stats },
      towers: this.towers.map((t) => ({ t: t.type, x: t.x, y: t.y, l: t.level, m: t.mode, i: t.invested })),
    };
  }

  static fromSave(d) {
    if (!d || d.v !== 4 || !MAPS.some((m) => m.id === d.map)) return null;
    if (d.stage != null && !STAGES.some((st) => st.id === d.stage)) return null;
    const g = new Game({ stage: d.stage, map: d.map, diff: d.diff, loadout: Array.isArray(d.loadout) ? d.loadout : null, ranks: d.ranks });
    g.gold = Math.max(0, d.gold | 0);
    g.lives = Math.max(1, d.lives | 0);
    g.wave = Math.max(0, d.wave | 0);
    g.endless = !g.stage && (!!d.endless || g.wave >= FINAL_WAVE);
    if (g.stage) g.wave = Math.min(g.wave, g.finalWave - 1);
    for (const s of d.towers || []) {
      if (!TOWERS[s.t] || !g.canBuild(s.x | 0, s.y | 0)) continue;
      const t = g.addTower(s.t, s.x | 0, s.y | 0);
      g.setLevel(t, Math.max(0, Math.min(t.def.levels.length - 1, s.l | 0)));
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
