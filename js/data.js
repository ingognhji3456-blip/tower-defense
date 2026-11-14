'use strict';
/* 철벽 요새 — 게임 데이터: 타워, 적, 지도, 스테이지, 도전 모드 웨이브 */

const COLS = 16;
const ROWS = 10;
const FINAL_WAVE = 30;
const SELL_RATE = 0.7;
const HP_BASE = 0.85;
const HP_GROWTH = 1.105; // 웨이브마다 적 체력이 불어나는 비율

const DIFFICULTY = {
  easy: { name: '쉬움', hp: 0.8, gold: 260, lives: 25 },
  normal: { name: '보통', hp: 1.0, gold: 220, lives: 20 },
  hard: { name: '어려움', hp: 1.2, gold: 200, lives: 15 },
};

const TARGET_MODES = [
  { id: 'first', name: '선두' },
  { id: 'last', name: '후미' },
  { id: 'strong', name: '강한 적' },
  { id: 'near', name: '가까운 적' },
];

/* ───────── 타워 ─────────
   거리 단위는 타일, 시간 단위는 초. levels[n].cost 는 그 단계로 올리는 값.
   h 는 무기(발사 지점)가 타일 중심에서 위로 얼마나 높이 있는지 — 그림과 발사체가 이 높이를 함께 쓴다. */
const TOWER_ORDER = ['crossbow', 'cannon', 'frost', 'rocket', 'tesla'];

const TOWERS = {
  crossbow: {
    name: '석궁탑',
    blurb: '볼트를 빠르게 쏩니다. 값이 싸서 어디에나 세우기 좋습니다.',
    kind: 'phys',
    levels: [
      { cost: 50, dmg: 8, cd: 0.8, range: 2.6, h: 0.7 },
      { cost: 45, dmg: 14, cd: 0.7, range: 2.9, h: 0.88 },
      { cost: 90, dmg: 24, cd: 0.56, range: 3.2, h: 1.06 },
    ],
  },
  cannon: {
    name: '대포탑',
    blurb: '포탄이 터지며 주변 적을 함께 때립니다. 떼로 몰려올 때 강합니다.',
    kind: 'phys',
    levels: [
      { cost: 110, dmg: 22, cd: 1.8, range: 2.7, splash: 1.0, h: 0.68 },
      { cost: 90, dmg: 38, cd: 1.7, range: 2.9, splash: 1.15, h: 0.86 },
      { cost: 170, dmg: 66, cd: 1.5, range: 3.2, splash: 1.3, h: 1.04 },
    ],
  },
  frost: {
    name: '서리탑',
    blurb: '냉기를 뿜어 주변 적을 느리게 합니다. 직접 공격하지는 않습니다.',
    kind: 'aura',
    levels: [
      { cost: 80, slow: 0.3, range: 1.9, h: 0.78 },
      { cost: 70, slow: 0.4, range: 2.2, h: 0.98 },
      { cost: 130, slow: 0.5, range: 2.5, vuln: 0.15, h: 1.18 },
    ],
  },
  rocket: {
    name: '로켓탑',
    blurb: '멀리까지 로켓을 한꺼번에 쏟아붓습니다. 장전이 깁니다.',
    kind: 'phys',
    levels: [
      { cost: 170, dmg: 16, cd: 3.0, range: 4.2, rockets: 4, splash: 0.5, h: 0.72 },
      { cost: 140, dmg: 23, cd: 2.8, range: 4.6, rockets: 5, splash: 0.55, h: 0.9 },
      { cost: 260, dmg: 32, cd: 2.5, range: 5.0, rockets: 7, splash: 0.6, h: 1.08 },
    ],
  },
  tesla: {
    name: '번개탑',
    blurb: '번개가 적에서 적으로 튑니다. 단단한 껍질도 날쌘 몸놀림도 소용없습니다.',
    kind: 'magic',
    levels: [
      { cost: 150, dmg: 16, cd: 1.1, range: 2.7, chain: 3, h: 0.86 },
      { cost: 120, dmg: 26, cd: 1.0, range: 2.9, chain: 4, h: 1.08 },
      { cost: 230, dmg: 40, cd: 0.9, range: 3.2, chain: 5, h: 1.3 },
    ],
  },
};

const CHAIN_FALLOFF = 0.75;
const CHAIN_RANGE = 1.8;

/* ───────── 적 ─────────
   armor: 물리 공격 한 발마다 깎이는 피해량. phys: 물리 피해 배율. r: 몸 크기(타일).
   tail: 길을 따라 늘어지는 꼬리 마디 (n 마디, gap 간격). */
const ENEMIES = {
  ant: {
    name: '병정개미', trait: '약하지만 떼로 몰려옵니다.',
    hp: 30, speed: 1.25, armor: 0, phys: 1, reward: 4, lives: 1, r: 0.26,
  },
  wolf: {
    name: '늑대', trait: '몹시 빠릅니다. 서리탑으로 발을 묶으세요.',
    hp: 22, speed: 2.3, armor: 0, phys: 1, reward: 5, lives: 1, r: 0.27,
  },
  beetle: {
    name: '장수풍뎅이', trait: '단단한 껍질이 약한 공격을 튕겨냅니다. 대포와 번개가 잘 듣습니다.',
    hp: 115, speed: 0.8, armor: 3, phys: 1, reward: 10, lives: 2, r: 0.34,
  },
  hornet: {
    name: '말벌', trait: '날쌔게 날아 볼트와 포탄을 절반쯤 흘려보냅니다. 번개는 피하지 못합니다.',
    hp: 55, speed: 1.35, armor: 0, phys: 0.5, reward: 8, lives: 1, r: 0.27,
  },
  scorpion: {
    name: '대왕전갈', trait: '몸집이 크고 끈질깁니다. 놓치면 목숨 다섯을 잃습니다.',
    hp: 460, speed: 0.72, armor: 2, phys: 1, reward: 60, lives: 5, r: 0.44, boss: true,
  },
  raptor: {
    name: '랩터', trait: '빠르고 질긴 사냥꾼입니다. 놓치면 목숨 다섯을 잃습니다.',
    hp: 340, speed: 1.35, armor: 0, phys: 1, reward: 70, lives: 5, r: 0.42, boss: true,
  },
  dragon: {
    name: '화룡', trait: '괴수들의 왕. 성문을 넘으면 그대로 끝장입니다.',
    hp: 1100, speed: 0.6, armor: 3, phys: 1, reward: 300, lives: 99, r: 0.54, boss: true,
    tail: { n: 7, gap: 0.3 },
  },
};

/* ───────── 도전 모드의 웨이브 (30 웨이브 + 무한) ─────────
   묶음 = [적, 마릿수, 간격(초), 앞 묶음 시작 후 몇 초 뒤에 겹쳐 나올지(생략하면 앞 묶음이 끝난 뒤)] */
const WAVES = [
  [['ant', 8, 1.0]],
  [['ant', 12, 0.8]],
  [['ant', 8, 0.8], ['wolf', 5, 0.7]],
  [['ant', 10, 0.7], ['beetle', 3, 1.6]],
  [['ant', 10, 0.7], ['scorpion', 1, 1]],
  [['wolf', 14, 0.5]],
  [['hornet', 8, 0.9], ['ant', 8, 0.6]],
  [['beetle', 6, 1.3], ['wolf', 8, 0.5]],
  [['ant', 28, 0.33]],
  [['hornet', 6, 0.8], ['scorpion', 2, 3]],
  [['beetle', 8, 1.1], ['hornet', 8, 0.8]],
  [['wolf', 26, 0.33]],
  [['ant', 20, 0.4], ['beetle', 8, 1.0, 2]],
  [['hornet', 16, 0.6]],
  [['wolf', 12, 0.45], ['raptor', 1, 1]],
  [['beetle', 14, 0.9]],
  [['ant', 30, 0.3], ['hornet', 10, 0.7, 3]],
  [['wolf', 20, 0.35], ['beetle', 8, 1.0]],
  [['hornet', 18, 0.55], ['beetle', 8, 1.0, 2]],
  [['ant', 20, 0.35], ['scorpion', 3, 2.5]],
  [['beetle', 18, 0.75]],
  [['wolf', 40, 0.26]],
  [['hornet', 24, 0.5], ['ant', 20, 0.35, 2]],
  [['beetle', 16, 0.8], ['wolf', 20, 0.35, 3]],
  [['scorpion', 2, 3], ['raptor', 2, 3]],
  [['ant', 64, 0.2]],
  [['hornet', 26, 0.45], ['beetle', 14, 0.8, 2]],
  [['wolf', 30, 0.3], ['beetle', 18, 0.7, 2], ['hornet', 12, 0.6, 4]],
  [['ant', 24, 0.3], ['scorpion', 3, 2.5], ['raptor', 2, 3]],
  [['beetle', 10, 0.9], ['hornet', 10, 0.7, 2], ['dragon', 1, 1]],
];

function hpScale(wave) {
  const w = Math.min(wave, FINAL_WAVE);
  let s = HP_BASE * Math.pow(HP_GROWTH, w - 1);
  if (wave > FINAL_WAVE) s *= Math.pow(1.13, wave - FINAL_WAVE);
  return s;
}

function rewardScale(wave) {
  return 1 + 0.02 * (Math.min(wave, 40) - 1);
}

function waveBonus(wave) {
  return 20 + 2 * Math.min(wave, 40);
}

/* 30 웨이브 이후(무한 모드)는 뒤쪽 웨이브를 돌려 쓰며 마릿수를 늘린다. */
function waveGroups(wave) {
  if (wave <= WAVES.length) return WAVES[wave - 1];
  const over = wave - WAVES.length;
  const base = WAVES[20 + ((over - 1) % 9)];
  const grow = 1 + 0.12 * over;
  const groups = base.map(([type, n, gap, par]) => {
    const boss = ENEMIES[type].boss;
    const count = boss ? n + Math.floor(over / 5) : Math.round(n * grow);
    return [type, count, boss ? gap : Math.max(0.16, gap / Math.sqrt(grow)), par];
  });
  if (over % 10 === 0) groups.push(['dragon', over / 10, 4]);
  return groups;
}

/* 묶음 목록 → 등장 시각표 */
function scheduleFrom(groups) {
  const out = [];
  let prevStart = 0;
  let prevEnd = 0;
  groups.forEach(([type, n, gap, par], i) => {
    const start = i === 0 ? 0 : par != null ? prevStart + par : prevEnd + 1.5;
    for (let k = 0; k < n; k++) out.push({ t: start + k * gap, type });
    prevStart = start;
    prevEnd = Math.max(prevEnd, start + (n - 1) * gap);
  });
  out.sort((a, b) => a.t - b.t);
  return out;
}

/* 묶음 목록 → 적 종류별 마릿수 (나오는 순서대로) */
function previewFrom(groups) {
  const order = [];
  const count = {};
  for (const [type, n] of groups) {
    if (!(type in count)) { count[type] = 0; order.push(type); }
    count[type] += n;
  }
  return order.map((type) => ({ type, count: count[type] }));
}

/* ───────── 지도 ─────────
   16×10 타일. 길은 타일 좌표 꺾임점의 목록이고, 첫 점이 괴수 굴, 끝 점이 성문.
   deco 는 [종류, x, y] — 그 칸에는 탑을 세울 수 없다. 적어 두지 않은 지도는 아래 autoDeco 가 채운다. */
const MAPS = [
  {
    id: 'field',
    name: '들판길',
    note: '넓은 들을 한 번 굽어 지납니다.',
    paths: [[[0, 2], [5, 2], [5, 7], [10, 7], [10, 2], [15, 2]]],
  },
  {
    id: 'uturn',
    name: '되돌이 길',
    note: '갔던 길을 되돌아 나옵니다.',
    paths: [[[0, 2], [12, 2], [12, 7], [0, 7]]],
  },
  {
    id: 'gubi',
    name: '굽이 협곡',
    note: '길이 길게 굽이칩니다.',
    paths: [[[0, 1], [3, 1], [3, 8], [7, 8], [7, 1], [11, 1], [11, 8], [15, 8]]],
    deco: [
      ['tree', 0, 3], ['pine', 1, 6], ['rock', 5, 0], ['pond', 9, 5], ['tree', 13, 3],
      ['rock', 14, 5], ['pine', 15, 1], ['tree', 9, 9], ['pine', 0, 9], ['rock', 5, 4],
    ],
  },
  {
    id: 'zigzag',
    name: '갈지자 고개',
    note: '세 번 가로질러 내려옵니다.',
    paths: [[[0, 1], [13, 1], [13, 4], [2, 4], [2, 7], [15, 7]]],
  },
  {
    id: 'cross',
    name: '교차로',
    note: '길이 한 번 엇갈립니다. 엇갈리는 곳을 두 번 지납니다.',
    paths: [[[0, 4], [10, 4], [10, 8], [5, 8], [5, 1], [15, 1]]],
  },
  {
    id: 'ssang',
    name: '쌍갈래 길',
    note: '두 굴에서 한꺼번에 몰려옵니다.',
    paths: [
      [[0, 1], [5, 1], [5, 4], [9, 4], [9, 7], [13, 7], [13, 3], [15, 3]],
      [[0, 8], [3, 8], [3, 6], [9, 6], [9, 7], [13, 7], [13, 3], [15, 3]],
    ],
    deco: [
      ['tree', 1, 4], ['pine', 0, 5], ['rock', 7, 2], ['pond', 11, 5], ['tree', 15, 6],
      ['rock', 15, 8], ['pine', 11, 9], ['tree', 6, 9], ['rock', 2, 3], ['pine', 10, 0],
    ],
  },
  {
    id: 'stairs',
    name: '계단 길',
    note: '짧은 길이 층층이 꺾입니다.',
    paths: [[[0, 8], [3, 8], [3, 6], [6, 6], [6, 4], [9, 4], [9, 2], [12, 2], [12, 5], [15, 5]]],
  },
  {
    id: 'soyong',
    name: '소용돌이 분지',
    note: '성을 빙 둘러 안으로 감겨 듭니다.',
    paths: [[[0, 1], [14, 1], [14, 8], [2, 8], [2, 4], [11, 4], [11, 6], [5, 6]]],
    deco: [
      ['tree', 0, 3], ['pond', 7, 2], ['pine', 15, 0], ['rock', 15, 5], ['tree', 0, 9],
      ['rock', 13, 6], ['pine', 4, 9], ['tree', 12, 3], ['rock', 8, 5], ['pine', 0, 6],
    ],
  },
  {
    id: 'shortcut',
    name: '지름길',
    note: '길이 짧아 막을 틈이 적습니다.',
    paths: [[[0, 5], [6, 5], [6, 2], [10, 2], [10, 6], [15, 6]]],
  },
  {
    id: 'twin',
    name: '쌍봉 고개',
    note: '봉우리 둘을 오르내립니다.',
    paths: [[[0, 8], [2, 8], [2, 2], [6, 2], [6, 6], [9, 6], [9, 2], [13, 2], [13, 8], [15, 8]]],
  },
  {
    id: 'pincer',
    name: '협공 골짜기',
    note: '왼쪽과 오른쪽에서 짧은 길로 조여 옵니다.',
    paths: [
      [[0, 1], [5, 1], [5, 7], [8, 7], [8, 9]],
      [[15, 1], [10, 1], [10, 7], [8, 7], [8, 9]],
    ],
  },
  {
    id: 'snake',
    name: '뱀길',
    note: '다섯 번 오르내리는 긴 길입니다.',
    paths: [[[0, 8], [2, 8], [2, 1], [5, 1], [5, 8], [8, 8], [8, 1], [11, 1], [11, 8], [14, 8], [14, 3], [15, 3]]],
  },
];

/* 길이 지나는 칸 */
function pathTiles(paths) {
  const set = new Set();
  for (const w of paths) {
    for (let i = 1; i < w.length; i++) {
      let [x, y] = w[i - 1];
      const [ex, ey] = w[i];
      const sx = Math.sign(ex - x);
      const sy = Math.sign(ey - y);
      for (;;) {
        set.add(y * COLS + x);
        if (x === ex && y === ey) break;
        x += sx;
        y += sy;
      }
    }
  }
  return set;
}

/* 지형지물을 고르게 흩어 놓는다. 지도마다 늘 같은 자리에 놓이도록 씨앗값을 쓴다.
   키 큰 나무는 길 바로 앞(화면에서 길 아래쪽)에 두지 않아 지나가는 적을 가리지 않게 한다. */
function autoDeco(map, seed) {
  const road = pathTiles(map.paths);
  const isRoad = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && road.has(y * COLS + x);
  let a = seed >>> 0;
  const rand = () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
  const kinds = ['tree', 'pine', 'rock', 'tree', 'pond', 'pine', 'rock', 'tree', 'pine', 'rock'];
  const out = [];
  for (let tries = 0; tries < 600 && out.length < kinds.length; tries++) {
    const x = Math.floor(rand() * COLS);
    const y = Math.floor(rand() * ROWS);
    const kind = kinds[out.length];
    if (isRoad(x, y)) continue;
    if (out.some(([, ox, oy]) => Math.abs(ox - x) <= 1 && Math.abs(oy - y) <= 1)) continue;
    const tall = kind === 'tree' || kind === 'pine';
    if (tall && (isRoad(x, y - 1) || isRoad(x - 1, y))) continue;
    /* 굴과 성문 둘레는 비워 둔다 */
    if (map.paths.some((w) => [w[0], w[w.length - 1]].some(([ex, ey]) => Math.abs(ex - x) <= 1 && Math.abs(ey - y) <= 1))) continue;
    out.push([kind, x, y]);
  }
  return out;
}

MAPS.forEach((map, i) => {
  if (!map.deco) map.deco = autoDeco(map, 7919 * (i + 3));
});

/* ───────── 스테이지 ─────────
   waves 는 웨이브마다 한 줄. 낱말 하나가 묶음 하나: <적><마릿수>[@간격].
   a 병정개미 · w 늑대 · b 장수풍뎅이 · h 말벌 · S 대왕전갈 · R 랩터 · D 화룡.
   앞에 + 를 붙이면 앞 묶음이 나오기 시작하고 2초 뒤에 겹쳐 나온다.
   hp 는 적 체력 배율(밸런스 봇으로 맞춘 값), towers 는 그 스테이지에서 쓸 수 있는 탑. */
const WAVE_CODE = { a: 'ant', w: 'wolf', b: 'beetle', h: 'hornet', S: 'scorpion', R: 'raptor', D: 'dragon' };
const WAVE_GAP = { ant: 0.6, wolf: 0.5, beetle: 1.0, hornet: 0.7, scorpion: 2.5, raptor: 2.5, dragon: 1 };

function parseWave(text) {
  return text.trim().split(/\s+/).map((word) => {
    const m = /^(\+?)([a-zA-Z])(\d+)(?:@([\d.]+))?$/.exec(word);
    if (!m || !WAVE_CODE[m[2]]) throw new Error('웨이브 표기를 읽을 수 없습니다: ' + word);
    const type = WAVE_CODE[m[2]];
    return [type, Number(m[3]), m[4] ? Number(m[4]) : WAVE_GAP[type], m[1] ? 2 : undefined];
  });
}

const STAGE_GROWTH = 1.13; // 스테이지 안에서 웨이브마다 적 체력이 불어나는 비율

const STAGES = [
  {
    id: 1, name: '첫 습격', map: 'field', gold: 200, hp: 0.8,
    towers: ['crossbow', 'cannon'],
    waves: ['a6@1', 'a9@0.8', 'a12@0.7', 'a8 a8', 'a18@0.45', 'a14@0.5 a14@0.4'],
  },
  {
    id: 2, name: '늑대 울음', map: 'uturn', gold: 220, hp: 0.89,
    towers: ['crossbow', 'cannon', 'frost'],
    waves: ['a8', 'w5@0.8', 'a10 w5', 'w10', 'a14@0.5 +w6', 'a10 w8 a10@0.4', 'w16@0.4 a16@0.45'],
  },
  {
    id: 3, name: '껍질 부대', map: 'gubi', gold: 240, hp: 0.65,
    towers: ['crossbow', 'cannon', 'frost'],
    waves: ['a10', 'b3@1.4', 'a12 b3', 'w8 b4', 'b7', 'a18@0.45 +b4', 'w12 b6', 'b10@0.9 a20@0.4'],
  },
  {
    id: 4, name: '말벌 둥지', map: 'zigzag', gold: 260, hp: 0.76,
    towers: ['crossbow', 'cannon', 'frost', 'tesla'],
    waves: ['a12', 'h5@0.9', 'h8 a8', 'w10 h6', 'b5 h8', 'h14@0.6', 'a20@0.4 +h8 b5', 'h16@0.55 +b8 w12'],
  },
  {
    id: 5, name: '전갈의 굴', map: 'cross', gold: 280, hp: 1.35,
    towers: ['crossbow', 'cannon', 'frost', 'tesla', 'rocket'],
    waves: ['a14', 'w10 b4', 'h10', 'a20@0.4 b5', 'w14 h8', 'b9 +h8', 'a26@0.35 w12', 'h14 b8', 'a16@0.4 S1 +w10'],
  },
  {
    id: 6, name: '두 갈래 습격', map: 'ssang', gold: 320, hp: 0.84,
    waves: ['a16', 'w12', 'b6 a12', 'h12', 'a24@0.4 +w10', 'b10 h10', 'w18@0.4 a18@0.4', 'h16 +b10', 'S2 a24@0.35 +h10'],
  },
  {
    id: 7, name: '사냥꾼', map: 'stairs', gold: 340, hp: 0.96,
    waves: ['a16 w8', 'b6 h8', 'w16@0.4', 'a26@0.35 b6', 'R1 w8', 'h16 b8', 'a30@0.3 +w12', 'b12 +h12', 'w20@0.35 R1', 'R2 S1 a24@0.35'],
  },
  {
    id: 8, name: '소용돌이', map: 'soyong', gold: 360, hp: 1.73,
    waves: ['a20@0.45', 'w14 h8', 'b10', 'a34@0.3', 'h18 +w12', 'S1 b8', 'a30@0.3 +b10 h10', 'w24@0.3 R1', 'b16 +h16', 'S2 R1 a36@0.28'],
  },
  {
    id: 9, name: '지름길', map: 'shortcut', gold: 420, hp: 0.79,
    waves: ['a18 w10', 'b8 h10', 'w20@0.35', 'S1 a20@0.4', 'h20 +b8', 'a36@0.28 w14', 'R2 b10', 'h20 +w16 b10', 'S2 a30@0.3 +h12', 'R2 S2 w20@0.35'],
  },
  {
    id: 10, name: '쌍봉을 넘어', map: 'twin', gold: 440, hp: 1.25,
    waves: ['a24@0.4', 'b10 w12', 'h18', 'S1 w14', 'a36@0.28 +b10', 'R1 h16', 'b16 +h14', 'w26@0.3 S1', 'a40@0.26 +h16 b12', 'R2 S2', 'S3 R2 a30@0.3 +h16'],
  },
  {
    id: 11, name: '협공', map: 'pincer', gold: 520, hp: 0.86,
    waves: ['a24@0.4 w10', 'b10 h12', 'w22@0.35', 'S1 R1', 'a40@0.26 +h14', 'b16 w16', 'R2 h18', 'a36@0.28 +b14 w14', 'S2 R2', 'h24 +b16 a30@0.3', 'S3 R3 w24@0.3'],
  },
  {
    id: 12, name: '화룡의 둥지', map: 'snake', gold: 560, hp: 1.31,
    waves: ['a26@0.4 w12', 'b12 h12', 'w24@0.33', 'S2 a24@0.35', 'h22 +b12', 'R2 w18', 'a44@0.25 +h16', 'b20 +w20@0.35', 'S3 R2', 'h26 +b18 a36@0.28', 'S3 R3 w26@0.3', 'b14 +h14 D1'],
  },
];

for (const st of STAGES) {
  st.waves = st.waves.map(parseWave);
  st.lives = 20;
  if (!st.towers) st.towers = TOWER_ORDER.slice();
  st.reward = 1 + 0.07 * (st.id - 1);
  /* 이 스테이지에서 처음 쓸 수 있게 되는 탑과 처음 나오는 적 */
  const before = STAGES.filter((o) => o.id < st.id);
  st.newTowers = st.towers.filter((t) => st.id > 1 && !before.some((o) => o.towers && o.towers.includes(t)));
  const kinds = [...new Set(st.waves.flat().map((g) => g[0]))];
  st.enemies = Object.keys(ENEMIES).filter((k) => kinds.includes(k));
  st.newEnemies = st.enemies.filter((k) => !before.some((o) => o.enemies && o.enemies.includes(k)));
}

/* 남은 목숨으로 매기는 별점: 2개 이하로 잃으면 ★★★, 9개 이하면 ★★, 그 밖은 ★ */
function starsFor(lost) {
  return lost <= 2 ? 3 : lost <= 9 ? 2 : 1;
}
