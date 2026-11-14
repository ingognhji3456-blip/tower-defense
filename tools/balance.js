#!/usr/bin/env node
'use strict';
/* 밸런스 점검용 봇. 화면 없이 게임을 끝까지 돌려 본다.
   사용법: node tools/balance.js [--verbose] */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

for (const f of ['data.js', 'sim.js']) {
  const file = path.join(__dirname, '..', 'js', f);
  vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
}

const VERBOSE = process.argv.includes('--verbose');

/* 다가올 세 웨이브의 적 구성 (체력 비중, 갑옷, 물리 배율). */
function upcoming(game) {
  const mix = [];
  let total = 0;
  for (let w = game.wave + 1; w <= game.wave + 3; w++) {
    for (const [type, n] of waveGroups(w)) {
      const def = ENEMIES[type];
      const weight = n * def.hp * hpScale(w);
      mix.push({ weight, armor: def.armor * (1 + 0.05 * (w - 1)), phys: def.phys });
      total += weight;
    }
  }
  for (const m of mix) m.weight /= total;
  return mix;
}

/* 타워 한 기의 대략적인 초당 피해량. 범위·연쇄 효과와 다가올 적의 갑옷·저항을 어림해 넣는다. */
function power(type, level, mix) {
  const lv = TOWERS[type].levels[level];
  let eff = 1;
  if (TOWERS[type].kind === 'phys') {
    eff = 0;
    for (const m of mix) eff += m.weight * Math.max(0.15, (lv.dmg - m.armor) / lv.dmg) * m.phys;
  }
  switch (type) {
    case 'archer': return (lv.dmg / lv.cd) * eff;
    case 'cannon': return (lv.dmg / lv.cd) * 2.2 * eff;
    case 'hwacha': return ((lv.dmg * lv.rockets) / lv.cd) * 1.3 * eff;
    case 'dosa': {
      let m = 0;
      for (let k = 0; k < lv.chain; k++) m += Math.pow(CHAIN_FALLOFF, k);
      return (lv.dmg / lv.cd) * (1 + (m - 1) * 0.7);
    }
    default: return 0;
  }
}

const STRATEGIES = {
  /* 여러 타워를 섞고 장승을 곁들이는 무난한 운영 */
  mixed(game) {
    const mix = upcoming(game);
    for (let guard = 0; guard < 40; guard++) {
      if (game.towers.length < 4 && game.wave < 3) {
        const spot = bestSpot(game, 2.6);
        if (game.gold < 50 || !spot) return;
        game.build('archer', spot.x, spot.y);
        continue;
      }
      const options = [];
      const attackers = game.towers.filter((t) => t.def.kind !== 'aura');
      const auras = game.towers.filter((t) => t.def.kind === 'aura');
      if (attackers.length >= 3 * (auras.length + 1) && auras.length < 5) {
        const anchor = attackers[auras.length * 3] || attackers[0];
        const spot = bestSpot(game, TOWERS.jangseung.levels[0].range, anchor);
        if (spot) options.push({ value: 99, cost: 80, run: () => game.build('jangseung', spot.x, spot.y) });
      }
      for (const type of ['archer', 'cannon', 'hwacha', 'dosa']) {
        const lv = TOWERS[type].levels[0];
        const spot = bestSpot(game, lv.range);
        if (!spot) continue;
        const cover = Math.min(1, spot.score / 60);
        options.push({
          value: (power(type, 0, mix) * (0.4 + cover)) / lv.cost,
          cost: lv.cost,
          run: () => game.build(type, spot.x, spot.y),
        });
      }
      for (const t of game.towers) {
        const cost = game.upgradeCost(t);
        if (cost == null) continue;
        if (t.def.kind === 'aura') {
          if (game.wave >= 8) options.push({ value: 0.16, cost, run: () => game.upgrade(t) });
          continue;
        }
        const cover = Math.min(1, game.coverage(t.cx, t.cy, t.lv.range) / 60);
        const gain = power(t.type, t.level + 1, mix) - power(t.type, t.level, mix);
        options.push({ value: (gain * (0.4 + cover)) / cost, cost, run: () => game.upgrade(t) });
      }
      if (!options.length) return;
      options.sort((a, b) => b.value - a.value);
      const top = options[0];
      const pick = options.find((o) => o.cost <= game.gold && o.value >= top.value * 0.7);
      if (!pick) return;
      pick.run();
    }
  },

  /* 정해진 순서로 골고루 짓고, 틈틈이 강화하는 평범한 사람의 운영 */
  casual(game) {
    const ORDER = ['archer', 'archer', 'cannon', 'archer', 'jangseung', 'dosa', 'archer', 'cannon', 'hwacha', 'dosa', 'jangseung'];
    for (let guard = 0; guard < 40; guard++) {
      const want = Math.min(24, Math.floor(4 + game.wave * 0.7));
      if (game.towers.length < want) {
        let type = ORDER[game.stats.built % ORDER.length];
        if (game.gold < TOWERS[type].levels[0].cost && game.wave < 6) type = 'archer';
        const lv = TOWERS[type].levels[0];
        if (game.gold < lv.cost) return;
        const anchor = type === 'jangseung' ? game.towers[game.towers.length - 1] : null;
        const spot = bestSpot(game, lv.range, anchor);
        if (!spot) return;
        game.build(type, spot.x, spot.y);
      } else {
        const ups = game.towers.filter((t) => game.upgradeCost(t) != null);
        if (!ups.length) return;
        ups.sort((a, b) => game.upgradeCost(a) - game.upgradeCost(b));
        if (game.upgradeCost(ups[0]) > game.gold) return;
        game.upgrade(ups[0]);
      }
    }
  },

  /* 궁수대만 세우고 올리는 단순한 운영 */
  archers(game) {
    for (let guard = 0; guard < 40; guard++) {
      const up = game.towers.find((t) => game.upgradeCost(t) != null && game.upgradeCost(t) <= game.gold);
      const spot = bestSpot(game, 2.6);
      if (game.towers.length < 6 + game.wave && spot && game.gold >= 50) game.build('archer', spot.x, spot.y);
      else if (up) game.upgrade(up);
      else return;
    }
  },
};

function play(mapId, diff, strategy, maxWave = FINAL_WAVE) {
  const game = new Game({ map: mapId, diff });
  const log = [];
  const leaks = [];
  game.listener = (type, d) => {
    if (type === 'leak') leaks.push(`w${game.wave} ${d.enemy.def.name} ${Math.round((d.enemy.hp / d.enemy.maxHp) * 100)}%`);
  };
  const DT = 1 / 60;
  while (game.phase !== 'lost' && game.phase !== 'won' && game.wave < maxWave) {
    STRATEGIES[strategy](game);
    const before = game.lives;
    game.startWave();
    let ticks = 0;
    while (game.phase === 'wave' && ticks++ < 60 * 600) game.update(DT);
    log.push({ wave: game.wave, lost: before - game.lives, gold: game.gold, sec: Math.round(ticks / 60) });
    if (game.phase === 'won' && maxWave > FINAL_WAVE) game.continueEndless();
  }
  return { game, log, leaks };
}

function describe(game) {
  const count = {};
  for (const t of game.towers) {
    const k = `${t.def.name}${t.level + 1}`;
    count[k] = (count[k] || 0) + 1;
  }
  return Object.entries(count).map(([k, n]) => `${k}×${n}`).join(' ');
}

console.log('지도         난이도   운영      결과     웨이브  남은목숨  처치   번 돈');
for (const map of MAPS) {
  for (const diff of Object.keys(DIFFICULTY)) {
    for (const strategy of Object.keys(STRATEGIES)) {
      const { game, log, leaks } = play(map.id, diff, strategy);
      const result = game.phase === 'won' ? '승리' : game.phase === 'lost' ? '패배' : game.phase;
      console.log(
        [
          map.name.padEnd(8, '　'),
          DIFFICULTY[diff].name.padEnd(4, '　'),
          strategy.padEnd(8),
          result,
          String(game.wave).padStart(6),
          String(game.lives).padStart(8),
          String(game.stats.kills).padStart(6),
          String(game.stats.earned).padStart(7),
        ].join('  '),
      );
      if (VERBOSE) {
        console.log('   ' + describe(game));
        console.log('   ' + log.filter((l) => l.lost).map((l) => `w${l.wave}:-${l.lost}`).join(' '));
        if (leaks.length) console.log('   놓친 적: ' + leaks.slice(-6).join(', '));
      }
    }
  }
}
