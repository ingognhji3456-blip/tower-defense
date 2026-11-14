#!/usr/bin/env node
'use strict';
/* 밸런스 점검용 봇. 화면 없이 게임을 끝까지 돌려 본다.

   node tools/balance.js              스테이지마다 봇 셋의 결과
   node tools/balance.js --verbose    놓친 적과 지은 탑도 함께
   node tools/balance.js --challenge  도전 모드(지도 × 난이도, 30 웨이브)
   node tools/balance.js --tune       스테이지마다 봇이 별 셋을 따는 한계 체력 배율을 찾아 준다
   node tools/balance.js --loadouts   편성을 바꿔 가며 스테이지를 돌려 본다 */

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
    for (const [type, n] of game.groups(w)) {
      const def = ENEMIES[type];
      const weight = n * def.hp * game.hpAt(w);
      mix.push({ weight, armor: def.armor * game.armorAt(w), phys: def.phys });
      total += weight;
    }
  }
  for (const m of mix) m.weight /= total || 1;
  return mix;
}

/* 타워 한 기의 대략적인 초당 피해량. 범위·연쇄 효과와 다가올 적의 갑옷·저항을 어림해 넣는다. */
function power(game, type, level, mix) {
  const lv = game.lvOf(type, level);
  const def = TOWERS[type];
  let eff = 1;
  if (def.kind === 'phys') {
    eff = 0;
    for (const m of mix) eff += m.weight * (def.pierce ? 1 : Math.max(0.15, (lv.dmg - m.armor) / lv.dmg)) * m.phys;
  }
  switch (type) {
    case 'crossbow': return (lv.dmg / lv.cd) * eff;
    case 'cannon': return (lv.dmg / lv.cd) * 2.2 * eff;
    case 'rocket': return ((lv.dmg * lv.rockets) / lv.cd) * 1.3 * eff;
    case 'tesla': {
      let m = 0;
      for (let k = 0; k < lv.chain; k++) m += Math.pow(CHAIN_FALLOFF, k);
      return (lv.dmg / lv.cd) * (1 + (m - 1) * 0.7);
    }
    case 'poison': return ((lv.dmg + lv.dot * POISON_TIME * 0.55) / lv.cd) * 2.0;
    case 'sniper': return (lv.dmg / lv.cd) * eff * 1.15;
    case 'flame': return lv.dps * 1.5;
    case 'laser': return lv.dps * 1.7;
    case 'lord': return (lv.dmg / lv.cd) * 1.5 + lv.bats * lv.batDps * (LORD_BAT_TIME / LORD_SUMMON);
    default: return 0;
  }
}

const ATTACKERS = ['crossbow', 'cannon', 'rocket', 'tesla', 'poison', 'sniper', 'flame', 'laser'];

const STRATEGIES = {
  /* 다가올 적을 보고 값어치가 큰 것부터 사는 운영 */
  mixed(game) {
    const mix = upcoming(game);
    const can = (t) => game.allowed.includes(t);
    for (let guard = 0; guard < 40; guard++) {
      if (can('crossbow') && game.towers.length < 4 && game.wave < 3) {
        const spot = bestSpot(game, 2.6);
        if (game.gold < 50 || !spot) return;
        game.build('crossbow', spot.x, spot.y);
        continue;
      }
      const options = [];
      const attackers = game.towers.filter((t) => t.def.kind !== 'aura');
      const auras = game.towers.filter((t) => t.def.kind === 'aura');
      if (can('frost') && attackers.length >= 3 * (auras.length + 1) && auras.length < 5) {
        const anchor = attackers[auras.length * 3] || attackers[0];
        const spot = bestSpot(game, game.lvOf('frost', 0).range, anchor);
        if (spot) options.push({ value: 99, cost: 80, run: () => game.build('frost', spot.x, spot.y) });
      }
      for (const type of ATTACKERS.filter(can)) {
        const lv = game.lvOf(type, 0);
        const spot = bestSpot(game, lv.range);
        if (!spot) continue;
        const cover = Math.min(1, spot.score / 60);
        options.push({
          value: (power(game, type, 0, mix) * (0.4 + cover)) / lv.cost,
          cost: lv.cost,
          run: () => game.build(type, spot.x, spot.y),
        });
      }
      for (const t of game.towers) {
        const cost = game.upgradeCost(t);
        if (cost == null) continue;
        if (t.def.kind === 'aura') {
          if (game.wave >= Math.min(8, game.finalWave / 2)) options.push({ value: 0.16, cost, run: () => game.upgrade(t) });
          continue;
        }
        const cover = Math.min(1, game.coverage(t.cx, t.cy, t.lv.range) / 60);
        const gain = power(game, t.type, t.level + 1, mix) - power(game, t.type, t.level, mix);
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
    const ORDER = ['crossbow', 'crossbow', 'cannon', 'crossbow', 'frost', 'tesla', 'poison', 'crossbow', 'cannon', 'rocket', 'sniper', 'flame', 'tesla', 'laser', 'frost']
      .filter((t) => game.allowed.includes(t));
    if (!ORDER.length) return;
    for (let guard = 0; guard < 40; guard++) {
      const want = Math.min(24, Math.floor(4 + game.wave * 0.7 + (game.stage ? game.stage.gold / 160 : 0)));
      if (game.towers.length < want) {
        let type = ORDER[game.stats.built % ORDER.length];
        if (game.gold < TOWERS[type].levels[0].cost && game.wave < 6 && game.allowed.includes('crossbow')) type = 'crossbow';
        const lv = game.lvOf(type, 0);
        if (game.gold < lv.cost) return;
        const anchor = type === 'frost' ? game.towers[game.towers.length - 1] : null;
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

  /* 석궁탑만 세우고 올리는 단순한 운영 */
  crossbows(game) {
    for (let guard = 0; guard < 40; guard++) {
      const up = game.towers.find((t) => game.upgradeCost(t) != null && game.upgradeCost(t) <= game.gold);
      const spot = bestSpot(game, 2.6);
      if (game.towers.length < 8 + game.wave * 1.5 && spot && game.gold >= 50) game.build('crossbow', spot.x, spot.y);
      else if (up) game.upgrade(up);
      else return;
    }
  },
};

/* 밸런스를 맞출 때 기준으로 삼는 편성 */
const STANDARD = ['crossbow', 'cannon', 'frost', 'rocket', 'tesla'];

function play(opts, strategy) {
  const game = new Game(Object.assign({ loadout: STANDARD }, opts));
  const leaks = [];
  game.listener = (type, d) => {
    if (type === 'leak') leaks.push(`w${game.wave} ${d.enemy.def.name} ${Math.round((d.enemy.hp / d.enemy.maxHp) * 100)}%`);
  };
  const DT = 1 / 60;
  while (game.phase !== 'lost' && game.phase !== 'won') {
    STRATEGIES[strategy](game);
    game.startWave();
    let ticks = 0;
    while (game.phase === 'wave' && ticks++ < 60 * 600) game.update(DT);
  }
  return { game, leaks };
}

function describe(game) {
  const count = {};
  for (const t of game.towers) {
    const k = `${t.def.name}${t.level + 1}`;
    count[k] = (count[k] || 0) + 1;
  }
  return Object.entries(count).map(([k, n]) => `${k}×${n}`).join(' ');
}

const pad = (s, n) => String(s).padEnd(n, '　');

function report(label, strategy, game, leaks) {
  const won = game.phase === 'won';
  const stars = won && game.stage ? '★'.repeat(game.stars()) + '☆'.repeat(3 - game.stars()) : '   ';
  console.log([
    label, strategy.padEnd(9), won ? '승리' : '패배', stars,
    String(game.wave).padStart(3) + '/' + String(game.finalWave).padEnd(2),
    '목숨 ' + String(game.lives).padStart(2), '처치 ' + String(game.stats.kills).padStart(4), '번 돈 ' + String(game.stats.earned).padStart(5),
  ].join('  '));
  if (VERBOSE) {
    console.log('     ' + describe(game));
    if (leaks.length) console.log('     놓친 적: ' + leaks.slice(-6).join(', '));
  }
}

if (process.argv.includes('--tune')) {
  /* 봇 셋 가운데 가장 잘한 쪽의 결과를 기준으로 삼는다. */
  const best = (stage) => Math.max(...Object.keys(STRATEGIES).map((st) => {
    const { game } = play({ stage: stage.id }, st);
    return game.phase === 'won' ? game.lives : 0;
  }));
  const search = (stage, ok) => {
    let lo = 0.2;
    let hi = 8;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      stage.hp = mid;
      if (ok(best(stage))) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  console.log('스테이지        지금   ★★★ 한계   통과 한계');
  for (const stage of STAGES) {
    const now = stage.hp;
    const three = search(stage, (lives) => lives >= 18);
    const clear = search(stage, (lives) => lives >= 1);
    stage.hp = now;
    console.log(`${String(stage.id).padStart(2)} ${pad(stage.name, 7)} ${now.toFixed(2).padStart(5)}   ${three.toFixed(2).padStart(6)}   ${clear.toFixed(2).padStart(8)}`);
  }
} else if (process.argv.includes('--challenge')) {
  for (const map of MAPS) {
    for (const diff of Object.keys(DIFFICULTY)) {
      for (const strategy of Object.keys(STRATEGIES)) {
        const { game, leaks } = play({ map: map.id, diff }, strategy);
        report(pad(map.name, 7) + ' ' + pad(DIFFICULTY[diff].name, 3), strategy, game, leaks);
      }
    }
  }
} else if (process.argv.includes('--loadouts')) {
  /* 편성을 바꿔 가며 mixed 봇으로 돌려 본다: 어느 편성이 지나치게 세거나 약한지 보려는 것 */
  const SETS = {
    '기준(석궁·대포·서리·로켓·번개)': STANDARD,
    '처음 탑만(석궁·대포)': ['crossbow', 'cannon'],
    '일반 셋(석궁·대포·서리)': ['crossbow', 'cannon', 'frost'],
    '새 탑(독·저격·화염·광선·서리)': ['poison', 'sniper', 'flame', 'laser', 'frost'],
    '희귀 위주(석궁·독·저격·서리·대포)': ['crossbow', 'poison', 'sniper', 'frost', 'cannon'],
    '기준 +3등급': STANDARD,
    '군주 포함(석궁·대포·서리·번개·군주)': ['crossbow', 'cannon', 'frost', 'tesla', 'lord'],
  };
  for (const [name, loadout] of Object.entries(SETS)) {
    const ranks = name.includes('+3') ? Object.fromEntries(loadout.map((t) => [t, 3])) : {};
    const line = STAGES.map((stage) => {
      const { game } = play({ stage: stage.id, loadout, ranks }, 'mixed');
      return game.phase === 'won' ? String(game.lives).padStart(2) : ' ✗';
    });
    console.log(pad(name, 18) + ' 남은 목숨: ' + line.join(' '));
  }
} else {
  for (const stage of STAGES) {
    for (const strategy of Object.keys(STRATEGIES)) {
      const { game, leaks } = play({ stage: stage.id }, strategy);
      report(String(stage.id).padStart(2) + ' ' + pad(stage.name, 7), strategy, game, leaks);
    }
  }
}
