'use strict';
/* 철벽 요새 — 게임 데이터: 타워, 적, 웨이브, 지도 */

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

/* ───────── 웨이브 ─────────
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

function buildSchedule(wave) {
  const out = [];
  let prevStart = 0;
  let prevEnd = 0;
  waveGroups(wave).forEach(([type, n, gap, par], i) => {
    const start = i === 0 ? 0 : par != null ? prevStart + par : prevEnd + 1.5;
    for (let k = 0; k < n; k++) out.push({ t: start + k * gap, type });
    prevStart = start;
    prevEnd = Math.max(prevEnd, start + (n - 1) * gap);
  });
  out.sort((a, b) => a.t - b.t);
  return out;
}

function wavePreview(wave) {
  const order = [];
  const count = {};
  for (const [type, n] of waveGroups(wave)) {
    if (!(type in count)) { count[type] = 0; order.push(type); }
    count[type] += n;
  }
  return order.map((type) => ({ type, count: count[type] }));
}

/* ───────── 지도 ─────────
   16×10 타일. 길은 타일 좌표 꺾임점의 목록이고, 첫 점이 괴수 굴, 끝 점이 성문.
   deco 는 [종류, x, y] — 그 칸에는 탑을 세울 수 없다. */
const MAPS = [
  {
    id: 'gubi',
    name: '굽이 협곡',
    note: '길이 길게 굽이칩니다.',
    paths: [
      [[0, 1], [3, 1], [3, 8], [7, 8], [7, 1], [11, 1], [11, 8], [15, 8]],
    ],
    deco: [
      ['tree', 0, 3], ['pine', 1, 6], ['rock', 5, 0], ['pond', 9, 5], ['tree', 13, 3],
      ['rock', 14, 5], ['pine', 15, 1], ['tree', 9, 9], ['pine', 0, 9], ['rock', 5, 4],
    ],
  },
  {
    id: 'soyong',
    name: '소용돌이 분지',
    note: '성을 빙 둘러 안으로 감겨 듭니다.',
    paths: [
      [[0, 1], [14, 1], [14, 8], [2, 8], [2, 4], [11, 4], [11, 6], [5, 6]],
    ],
    deco: [
      ['tree', 0, 3], ['pond', 7, 2], ['pine', 15, 0], ['rock', 15, 5], ['tree', 0, 9],
      ['rock', 13, 6], ['pine', 4, 9], ['tree', 12, 3], ['rock', 8, 5], ['pine', 0, 6],
    ],
  },
  {
    id: 'ssang',
    name: '쌍갈래 길',
    note: '두 길에서 한꺼번에 몰려옵니다.',
    paths: [
      [[0, 1], [5, 1], [5, 4], [9, 4], [9, 7], [13, 7], [13, 3], [15, 3]],
      [[0, 8], [3, 8], [3, 6], [9, 6], [9, 7], [13, 7], [13, 3], [15, 3]],
    ],
    deco: [
      ['tree', 1, 4], ['pine', 0, 5], ['rock', 7, 2], ['pond', 11, 5], ['tree', 15, 6],
      ['rock', 15, 8], ['pine', 11, 9], ['tree', 6, 9], ['rock', 2, 3], ['pine', 10, 0],
    ],
  },
];
