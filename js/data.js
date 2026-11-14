'use strict';
/* 도깨비 고개 — 게임 데이터: 타워, 적, 웨이브, 지도 */

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
   거리 단위는 타일, 시간 단위는 초. levels[n].cost 는 그 단계로 올리는 값. */
const TOWER_ORDER = ['archer', 'cannon', 'jangseung', 'hwacha', 'dosa'];

const TOWERS = {
  archer: {
    name: '궁수대',
    blurb: '화살을 빠르게 쏩니다. 값이 싸서 어디에나 세우기 좋습니다.',
    kind: 'phys',
    levels: [
      { cost: 50, dmg: 8, cd: 0.8, range: 2.6 },
      { cost: 45, dmg: 14, cd: 0.7, range: 2.9 },
      { cost: 90, dmg: 24, cd: 0.56, range: 3.2 },
    ],
  },
  cannon: {
    name: '화포',
    blurb: '포탄이 터지며 주변 적을 함께 때립니다. 떼로 몰려올 때 강합니다.',
    kind: 'phys',
    levels: [
      { cost: 110, dmg: 22, cd: 1.8, range: 2.7, splash: 1.0 },
      { cost: 90, dmg: 38, cd: 1.7, range: 2.9, splash: 1.15 },
      { cost: 170, dmg: 66, cd: 1.5, range: 3.2, splash: 1.3 },
    ],
  },
  jangseung: {
    name: '장승',
    blurb: '주변 적의 발을 묶어 느리게 합니다. 직접 공격하지는 않습니다.',
    kind: 'aura',
    levels: [
      { cost: 80, slow: 0.3, range: 1.9 },
      { cost: 70, slow: 0.4, range: 2.2 },
      { cost: 130, slow: 0.5, range: 2.5, vuln: 0.15 },
    ],
  },
  hwacha: {
    name: '화차',
    blurb: '멀리까지 신기전을 한꺼번에 쏟아붓습니다. 장전이 깁니다.',
    kind: 'phys',
    levels: [
      { cost: 170, dmg: 16, cd: 3.0, range: 4.2, rockets: 4, splash: 0.5 },
      { cost: 140, dmg: 23, cd: 2.8, range: 4.6, rockets: 5, splash: 0.55 },
      { cost: 260, dmg: 32, cd: 2.5, range: 5.0, rockets: 7, splash: 0.6 },
    ],
  },
  dosa: {
    name: '도사',
    blurb: '벼락이 적에서 적으로 튑니다. 갑옷과 귀신을 가리지 않습니다.',
    kind: 'magic',
    levels: [
      { cost: 150, dmg: 16, cd: 1.1, range: 2.7, chain: 3 },
      { cost: 120, dmg: 26, cd: 1.0, range: 2.9, chain: 4 },
      { cost: 230, dmg: 40, cd: 0.9, range: 3.2, chain: 5 },
    ],
  },
};

const CHAIN_FALLOFF = 0.75;
const CHAIN_RANGE = 1.8;

/* ───────── 적 ─────────
   armor: 물리 공격 한 발마다 깎이는 피해량. phys: 물리 피해 배율. */
const ENEMIES = {
  imp: {
    name: '꼬마 도깨비', trait: '재주는 없지만 떼로 몰려옵니다.',
    hp: 30, speed: 1.25, armor: 0, phys: 1, reward: 4, lives: 1, r: 0.25,
  },
  fox: {
    name: '여우', trait: '몹시 빠릅니다. 장승으로 발을 묶으세요.',
    hp: 22, speed: 2.3, armor: 0, phys: 1, reward: 5, lives: 1, r: 0.22,
  },
  brute: {
    name: '불가사리', trait: '쇠를 먹고 자라 약한 공격은 튕겨냅니다. 화포와 벼락이 잘 듣습니다.',
    hp: 115, speed: 0.8, armor: 3, phys: 1, reward: 10, lives: 2, r: 0.33,
  },
  ghost: {
    name: '귀신', trait: '화살과 포탄이 잘 통하지 않습니다. 도사의 벼락으로 잡으세요.',
    hp: 55, speed: 1.35, armor: 0, phys: 0.5, reward: 8, lives: 1, r: 0.26,
  },
  chief: {
    name: '도깨비 대장', trait: '몸집이 크고 끈질깁니다. 놓치면 목숨 다섯을 잃습니다.',
    hp: 460, speed: 0.72, armor: 2, phys: 1, reward: 60, lives: 5, r: 0.42, boss: true,
  },
  gumiho: {
    name: '구미호', trait: '빠르고 질긴 여우 우두머리. 놓치면 목숨 다섯을 잃습니다.',
    hp: 340, speed: 1.35, armor: 0, phys: 1, reward: 70, lives: 5, r: 0.38, boss: true,
  },
  imugi: {
    name: '이무기', trait: '용이 되지 못한 구렁이. 고개를 넘으면 마을은 끝장입니다.',
    hp: 1100, speed: 0.6, armor: 3, phys: 1, reward: 300, lives: 99, r: 0.46, boss: true,
  },
};

/* ───────── 웨이브 ─────────
   묶음 = [적, 마릿수, 간격(초), 앞 묶음 시작 후 몇 초 뒤에 겹쳐 나올지(생략하면 앞 묶음이 끝난 뒤)] */
const WAVES = [
  [['imp', 8, 1.0]],
  [['imp', 12, 0.8]],
  [['imp', 8, 0.8], ['fox', 5, 0.7]],
  [['imp', 10, 0.7], ['brute', 3, 1.6]],
  [['imp', 10, 0.7], ['chief', 1, 1]],
  [['fox', 14, 0.5]],
  [['ghost', 8, 0.9], ['imp', 8, 0.6]],
  [['brute', 6, 1.3], ['fox', 8, 0.5]],
  [['imp', 28, 0.33]],
  [['ghost', 6, 0.8], ['chief', 2, 3]],
  [['brute', 8, 1.1], ['ghost', 8, 0.8]],
  [['fox', 26, 0.33]],
  [['imp', 20, 0.4], ['brute', 8, 1.0, 2]],
  [['ghost', 16, 0.6]],
  [['fox', 12, 0.45], ['gumiho', 1, 1]],
  [['brute', 14, 0.9]],
  [['imp', 30, 0.3], ['ghost', 10, 0.7, 3]],
  [['fox', 20, 0.35], ['brute', 8, 1.0]],
  [['ghost', 18, 0.55], ['brute', 8, 1.0, 2]],
  [['imp', 20, 0.35], ['chief', 3, 2.5]],
  [['brute', 18, 0.75]],
  [['fox', 40, 0.26]],
  [['ghost', 24, 0.5], ['imp', 20, 0.35, 2]],
  [['brute', 16, 0.8], ['fox', 20, 0.35, 3]],
  [['chief', 2, 3], ['gumiho', 2, 3]],
  [['imp', 64, 0.2]],
  [['ghost', 26, 0.45], ['brute', 14, 0.8, 2]],
  [['fox', 30, 0.3], ['brute', 18, 0.7, 2], ['ghost', 12, 0.6, 4]],
  [['imp', 24, 0.3], ['chief', 3, 2.5], ['gumiho', 2, 3]],
  [['brute', 10, 0.9], ['ghost', 10, 0.7, 2], ['imugi', 1, 1]],
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
  if (over % 10 === 0) groups.push(['imugi', over / 10, 4]);
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
   16×10 타일. 길은 타일 좌표 꺾임점의 목록이고, 첫 점이 도깨비 굴, 끝 점이 마을 어귀. */
const MAPS = [
  {
    id: 'gubi',
    name: '굽이 고개',
    note: '길이 길게 굽이칩니다.',
    paths: [
      [[0, 1], [3, 1], [3, 8], [7, 8], [7, 1], [11, 1], [11, 8], [15, 8]],
    ],
    deco: [
      ['pine', 0, 3], ['pine', 1, 6], ['cairn', 5, 0], ['pond', 9, 5], ['pine', 13, 3],
      ['cairn', 14, 5], ['pine', 15, 1], ['pine', 9, 9], ['pine', 0, 9], ['cairn', 5, 4],
    ],
  },
  {
    id: 'soyong',
    name: '소용돌이 골',
    note: '마을을 빙 둘러 안으로 감겨 듭니다.',
    paths: [
      [[0, 1], [14, 1], [14, 8], [2, 8], [2, 4], [11, 4], [11, 6], [5, 6]],
    ],
    deco: [
      ['pine', 0, 3], ['pond', 7, 2], ['pine', 15, 0], ['cairn', 15, 5], ['pine', 0, 9],
      ['cairn', 13, 6], ['pine', 4, 9], ['pine', 12, 3], ['cairn', 8, 5], ['pine', 0, 6],
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
      ['pine', 1, 4], ['pine', 0, 5], ['cairn', 7, 2], ['pond', 11, 5], ['pine', 15, 6],
      ['cairn', 15, 8], ['pine', 11, 9], ['pine', 6, 9], ['cairn', 2, 3], ['pine', 10, 0],
    ],
  },
];
