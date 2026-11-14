'use strict';
/* 철벽 요새 — 게임 데이터: 타워, 적, 지도, 스테이지, 도전 모드 웨이브, 뽑기 */

const COLS = 18;
const ROWS = 11;
const FINAL_WAVE = 30;
const SELL_RATE = 0.7;
const HP_BASE = 0.6;
const HP_GROWTH = 1.105; // 웨이브마다 적 체력이 불어나는 비율
const CHALLENGE_LEN = 1.5; // 도전 모드 웨이브의 마릿수 배율 (보상은 그만큼 나눠 준다)

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
   h 는 무기(발사 지점)가 타일 중심에서 위로 얼마나 높이 있는지 — 그림과 발사체가 이 높이를 함께 쓴다.
   rarity 는 뽑기 등급. 탑은 뽑기로 얻고, 전투에는 다섯 개까지 골라 데려간다. */
const TOWER_ORDER = ['crossbow', 'cannon', 'frost', 'poison', 'sniper', 'mine', 'rocket', 'tesla', 'flame', 'laser', 'lord'];

const TOWERS = {
  crossbow: {
    name: '석궁탑', rarity: 'common',
    blurb: '볼트를 빠르게 쏩니다. 값이 싸서 어디에나 세우기 좋습니다.',
    kind: 'phys',
    levels: [
      { cost: 50, dmg: 8, cd: 0.8, range: 2.6, h: 0.7 },
      { cost: 45, dmg: 14, cd: 0.7, range: 2.9, h: 0.88 },
      { cost: 90, dmg: 24, cd: 0.56, range: 3.2, h: 1.06 },
    ],
  },
  cannon: {
    name: '대포탑', rarity: 'common',
    blurb: '포탄이 터지며 주변 적을 함께 때립니다. 떼로 몰려올 때 강합니다.',
    kind: 'phys',
    levels: [
      { cost: 110, dmg: 22, cd: 1.8, range: 2.7, splash: 1.0, h: 0.68 },
      { cost: 90, dmg: 38, cd: 1.7, range: 2.9, splash: 1.15, h: 0.86 },
      { cost: 170, dmg: 66, cd: 1.5, range: 3.2, splash: 1.3, h: 1.04 },
    ],
  },
  frost: {
    name: '서리탑', rarity: 'common',
    blurb: '냉기를 뿜어 주변 적을 느리게 합니다. 직접 공격하지는 않습니다.',
    kind: 'aura',
    levels: [
      { cost: 80, slow: 0.3, range: 1.9, h: 0.78 },
      { cost: 70, slow: 0.4, range: 2.2, h: 0.98 },
      { cost: 130, slow: 0.5, range: 2.5, vuln: 0.15, h: 1.18 },
    ],
  },
  poison: {
    name: '독탑', rarity: 'rare',
    blurb: '독병을 던져 주변 적을 중독시킵니다. 독은 껍질과 회피를 무시하고 4초 동안 몸을 갉아먹습니다.',
    kind: 'magic',
    levels: [
      { cost: 120, dmg: 5, dot: 7, cd: 1.6, range: 2.8, splash: 0.8, h: 0.74 },
      { cost: 100, dmg: 8, dot: 13, cd: 1.5, range: 3.0, splash: 0.9, h: 0.92 },
      { cost: 190, dmg: 12, dot: 22, cd: 1.3, range: 3.2, splash: 1.0, h: 1.1 },
    ],
  },
  sniper: {
    name: '저격탑', rarity: 'rare',
    blurb: '아주 멀리서 한 발씩 강하게 쏩니다. 껍질을 꿰뚫지만 장전이 깁니다.',
    kind: 'phys', pierce: true, mode: 'strong',
    levels: [
      { cost: 140, dmg: 60, cd: 2.6, range: 5.5, h: 0.92 },
      { cost: 120, dmg: 110, cd: 2.4, range: 6.0, h: 1.06 },
      { cost: 220, dmg: 200, cd: 2.1, range: 6.5, h: 1.2 },
    ],
  },
  mine: {
    name: '금광', rarity: 'rare',
    blurb: '싸우지 않는 대신 전투 중에 8초마다 골드를 캡니다. 긴 싸움일수록 이득입니다.',
    kind: 'income',
    levels: [
      { cost: 130, income: 4, every: 8, range: 0, h: 0.6 },
      { cost: 110, income: 7, every: 8, range: 0, h: 0.7 },
      { cost: 190, income: 11, every: 8, range: 0, h: 0.8 },
    ],
  },
  rocket: {
    name: '로켓탑', rarity: 'epic',
    blurb: '멀리까지 로켓을 한꺼번에 쏟아붓습니다. 장전이 깁니다.',
    kind: 'phys',
    levels: [
      { cost: 170, dmg: 16, cd: 3.0, range: 4.2, rockets: 4, splash: 0.5, h: 0.72 },
      { cost: 140, dmg: 23, cd: 2.8, range: 4.6, rockets: 5, splash: 0.55, h: 0.9 },
      { cost: 260, dmg: 32, cd: 2.5, range: 5.0, rockets: 7, splash: 0.6, h: 1.08 },
    ],
  },
  tesla: {
    name: '번개탑', rarity: 'epic',
    blurb: '번개가 적에서 적으로 튑니다. 단단한 껍질도 날쌘 몸놀림도 소용없습니다.',
    kind: 'magic',
    levels: [
      { cost: 150, dmg: 20, cd: 1.1, range: 2.7, chain: 3, h: 0.86 },
      { cost: 120, dmg: 32, cd: 1.0, range: 2.9, chain: 4, h: 1.08 },
      { cost: 230, dmg: 50, cd: 0.9, range: 3.2, chain: 5, h: 1.3 },
    ],
  },
  flame: {
    name: '화염탑', rarity: 'epic',
    blurb: '가까운 적들에게 불길을 내뿜습니다. 사거리는 짧지만 불길 안의 적을 모두 태웁니다.',
    kind: 'magic',
    levels: [
      { cost: 160, dps: 24, range: 1.9, cone: 0.6, h: 0.66 },
      { cost: 130, dps: 40, range: 2.1, cone: 0.6, h: 0.82 },
      { cost: 240, dps: 66, range: 2.3, cone: 0.65, h: 0.98 },
    ],
  },
  laser: {
    name: '광선탑', rarity: 'legend',
    blurb: '한 적에게 광선을 고정합니다. 오래 비출수록 피해가 세 배까지 커져 우두머리에게 특히 강합니다.',
    kind: 'magic',
    levels: [
      { cost: 220, dps: 44, range: 3.0, h: 0.88 },
      { cost: 180, dps: 72, range: 3.3, h: 1.08 },
      { cost: 320, dps: 120, range: 3.6, h: 1.3 },
    ],
  },
  /* 영웅: 건물이 아니라 전장에 직접 서는 군주. 한 판에 하나만 세울 수 있다.
     h 는 두 손의 높이(쌍광선이 나가는 곳), bats 는 한 번에 부르는 박쥐 수, batDps 는 박쥐 한 마리의 초당 피해. */
  lord: {
    name: '심연의 군주', rarity: 'mythic', unique: true,
    blurb: '두 손에서 쌍광선을 쏘아 맞은 자리 둘레까지 터뜨리고, 박쥐 떼를 불러 적을 물어뜯게 합니다. 한 판에 하나만 세울 수 있습니다.',
    kind: 'magic',
    levels: [
      { cost: 520, dmg: 95, cd: 1.5, range: 3.6, splash: 0.9, bats: 2, batDps: 14, h: 0.42 },
      { cost: 460, dmg: 165, cd: 1.35, range: 4.0, splash: 1.05, bats: 3, batDps: 24, h: 0.48 },
      { cost: 820, dmg: 300, cd: 1.15, range: 4.5, splash: 1.25, bats: 5, batDps: 40, h: 0.6 },
    ],
  },
};

const FLAME_TICK = 0.15; // 화염탑이 피해를 주는 간격
const POISON_TIME = 4; // 독이 이어지는 시간
const LORD_SPLASH = 0.5; // 군주의 쌍광선: 둘레의 적이 받는 피해 비율
const LORD_SUMMON = 7; // 박쥐 떼를 부르는 간격(초)
const LORD_BAT_TIME = 5; // 박쥐가 머무는 시간(초)
const LORD_CAST = 0.9; // 소환 몸짓이 이어지는 시간(초)
const BEAM_RAMP = 0.8; // 광선탑: 같은 적을 비춘 시간 1초마다 피해가 이만큼(배) 더 붙는다. 최대 3배.

/* ───────── 뽑기와 등급 ─────────
   같은 탑이 또 나오면 그 탑의 등급이 오른다(+1 ~ +5). 등급마다 위력이 RANK_BONUS 만큼 는다. */
const RARITY = {
  common: { name: '일반', weight: 45, color: '#b5bdca' },
  rare: { name: '희귀', weight: 33, color: '#6f9ff2' },
  epic: { name: '영웅', weight: 17, color: '#cba6ff' },
  legend: { name: '전설', weight: 4, color: '#f6c445' },
  mythic: { name: '신화', weight: 1, color: '#ff6fb5' },
};
const PULL_COST = 100;
const PULL5_COST = 450;
const MAX_RANK = 5;
const RANK_BONUS = 0.08;
const DUPE_GEMS = 30; // 등급이 가득 찬 탑이 또 나오면 돌려받는 보석
const LOADOUT_MAX = 5;
const STARTER = { towers: ['crossbow', 'cannon'], gems: 300, sure: 3 }; // 처음 가진 탑·보석, 새 탑이 보장되는 뽑기 횟수

/* 등급을 반영한 탑의 수치 */
function towerStats(type, level, rank) {
  const base = TOWERS[type].levels[level];
  if (!rank) return base;
  const k = 1 + RANK_BONUS * rank;
  const lv = Object.assign({}, base);
  for (const key of ['dmg', 'dot', 'dps', 'batDps']) if (lv[key]) lv[key] = Math.round(lv[key] * k * 10) / 10;
  if (lv.income) lv.income = Math.round(lv.income * (1 + 0.1 * rank));
  if (TOWERS[type].kind === 'aura') lv.range = Math.round(lv.range * (1 + 0.05 * rank) * 100) / 100;
  return lv;
}

const CHAIN_FALLOFF = 0.8;
const SPLASH_FALLOFF = 0.45; // 폭발 가장자리에서 피해가 줄어드는 정도
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

const CHALLENGE_PATH = 46; // 도전 모드에서 체력 조절의 기준이 되는 길 길이(칸)

function hpScale(wave) {
  const w = Math.min(wave, FINAL_WAVE);
  let s = HP_BASE * Math.pow(HP_GROWTH, w - 1);
  if (wave > FINAL_WAVE) s *= Math.pow(1.13, wave - FINAL_WAVE);
  return s;
}

function rewardScale(wave) {
  return (1 + 0.02 * (Math.min(wave, 40) - 1)) / CHALLENGE_LEN;
}

function waveBonus(wave) {
  return 20 + 2 * Math.min(wave, 40);
}

/* 도전 모드의 웨이브. 표의 마릿수를 CHALLENGE_LEN 배로 늘려 한 웨이브를 길게 끈다.
   30 웨이브 이후(무한 모드)는 뒤쪽 웨이브를 돌려 쓰며 마릿수를 더 늘린다. */
function waveGroups(wave) {
  const over = Math.max(0, wave - WAVES.length);
  const base = over ? WAVES[20 + ((over - 1) % 9)] : WAVES[wave - 1];
  const grow = CHALLENGE_LEN * (1 + 0.12 * over);
  const groups = base.map(([type, n, gap, par]) => {
    const boss = ENEMIES[type].boss;
    const count = boss ? n + Math.floor(over / 5) : Math.round(n * grow);
    return [type, count, boss ? gap : Math.max(0.16, gap / Math.sqrt(grow)), par];
  });
  if (over && over % 10 === 0) groups.push(['dragon', over / 10, 4]);
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
   18×11 타일. 길은 타일 좌표 꺾임점의 목록이고, 첫 점이 괴수 굴, 끝 점이 성문.
   길이 여럿이면 괴수가 번갈아 가며 나뉘어 간다(굴이 둘이거나, 한 굴에서 갈라졌다 다시 만나거나).
   지형지물(탑을 세울 수 없는 칸)은 아래 autoDeco 가 지도마다 늘 같은 자리에 놓는다. */
const MAPS = [
  {
    id: 'field', name: '들판길', note: '들판을 세 번 가로지르는 긴 길입니다.',
    paths: [[[0, 2], [14, 2], [14, 5], [3, 5], [3, 8], [17, 8]]],
  },
  {
    id: 'gubi', name: '굽이 협곡', note: '위아래로 크게 굽이칩니다.',
    paths: [[[0, 1], [3, 1], [3, 9], [7, 9], [7, 1], [11, 1], [11, 9], [15, 9], [15, 4], [17, 4]]],
  },
  {
    id: 'cross', name: '교차로', note: '길이 한 번 엇갈립니다. 엇갈리는 곳은 두 번 지나갑니다.',
    paths: [[[0, 5], [12, 5], [12, 9], [6, 9], [6, 1], [15, 1], [15, 7], [17, 7]]],
  },
  {
    id: 'fork', name: '갈림길', note: '길이 위아래로 갈라졌다가 성문 앞에서 다시 만납니다.',
    paths: [
      [[0, 5], [2, 5], [2, 1], [7, 1], [7, 3], [11, 3], [11, 1], [15, 1], [15, 5], [17, 5]],
      [[0, 5], [2, 5], [2, 9], [7, 9], [7, 7], [11, 7], [11, 9], [15, 9], [15, 5], [17, 5]],
    ],
  },
  {
    id: 'stairs', name: '계단 길', note: '층층이 꺾이며 오르내립니다.',
    paths: [[[0, 9], [3, 9], [3, 7], [6, 7], [6, 5], [9, 5], [9, 3], [12, 3], [12, 1], [16, 1], [16, 6], [13, 6], [13, 9], [17, 9]]],
  },
  {
    id: 'ssang', name: '쌍갈래 길', note: '두 굴에서 한꺼번에 몰려옵니다. 아래쪽 굴은 지름길입니다.',
    paths: [
      [[0, 1], [7, 1], [7, 4], [2, 4], [2, 6], [10, 6], [10, 9], [14, 9], [14, 3], [17, 3]],
      [[0, 8], [4, 8], [4, 10], [10, 10], [10, 9], [14, 9], [14, 3], [17, 3]],
    ],
  },
  {
    id: 'maze', name: '미로 숲', note: '이리저리 꺾이는 미로 같은 길입니다.',
    paths: [[[0, 1], [5, 1], [5, 3], [2, 3], [2, 6], [5, 6], [5, 9], [9, 9], [9, 6], [12, 6], [12, 9], [15, 9], [15, 4], [11, 4], [11, 1], [17, 1]]],
  },
  {
    id: 'knot', name: '매듭 길', note: '길이 두 번 엇갈리며 한가운데 성으로 감겨 듭니다.',
    paths: [[[0, 1], [12, 1], [12, 7], [5, 7], [5, 3], [15, 3], [15, 9], [8, 9], [8, 5]]],
  },
  {
    id: 'pincer', name: '협공 골짜기', note: '왼쪽과 오른쪽 굴에서 가운데 성을 조여 옵니다.',
    paths: [
      [[0, 1], [7, 1], [7, 3], [2, 3], [2, 9], [8, 9], [8, 6]],
      [[17, 1], [10, 1], [10, 3], [15, 3], [15, 9], [8, 9], [8, 6]],
    ],
  },
  {
    id: 'snake', name: '뱀길', note: '다섯 번 오르내리는 아주 긴 길입니다.',
    paths: [[[0, 9], [2, 9], [2, 1], [5, 1], [5, 9], [8, 9], [8, 1], [11, 1], [11, 9], [14, 9], [14, 1], [17, 1]]],
  },
  {
    id: 'soyong', name: '소용돌이 분지', note: '성을 빙 둘러 안으로 감겨 듭니다.',
    paths: [[[0, 1], [16, 1], [16, 9], [1, 9], [1, 4], [13, 4], [13, 7], [4, 7]]],
  },
  {
    id: 'nest', name: '용의 둥지', note: '두 겹으로 감긴 가장 긴 길입니다.',
    paths: [[[0, 5], [2, 5], [2, 1], [16, 1], [16, 9], [4, 9], [4, 3], [14, 3], [14, 7], [6, 7], [6, 5], [12, 5]]],
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
  const kinds = ['tree', 'pine', 'rock', 'tree', 'pond', 'pine', 'rock', 'tree', 'pine', 'rock', 'tree', 'pine'];
  const out = [];
  for (let tries = 0; tries < 900 && out.length < kinds.length; tries++) {
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
  map.deco = autoDeco(map, 7919 * (i + 3));
});

/* ───────── 스테이지 ─────────
   waves 는 웨이브마다 한 줄. 낱말 하나가 묶음 하나: <적><마릿수>[@간격].
   a 병정개미 · w 늑대 · b 장수풍뎅이 · h 말벌 · S 대왕전갈 · R 랩터 · D 화룡.
   앞에 + 를 붙이면 앞 묶음이 나오기 시작하고 2초 뒤에 겹쳐 나온다.
   gold 는 시작 골드, budget 은 그 스테이지의 괴수를 모두 잡았을 때 버는 골드(마릿수가 바뀌어도 벌이는 그대로다).
   hp 는 적 체력 배율 — tools/balance.js --tune 으로 맞춘 값. */
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

const STAGE_GROWTH = 1.11; // 스테이지 안에서 웨이브마다 적 체력이 불어나는 비율
const STAGE_PAY_GROWTH = 0.03; // 웨이브마다 처치 보상이 느는 비율

const STAGES = [
  {
    id: 1, name: '첫 습격', map: 'field', gold: 200, budget: 520, hp: 0.92,
    waves: [
      'a10@1.1 a8@0.9',
      'a12@0.9 a12@0.7',
      'a16@0.7 a10@0.5 a8@0.9',
      'a14@0.6 a14@0.6 a14@0.5',
      'a20@0.5 a12@0.8 a20@0.45',
      'a24@0.45 a16@0.6 a24@0.4',
      'a30@0.4 a20@0.5 a30@0.35',
    ],
  },
  {
    id: 2, name: '늑대 울음', map: 'gubi', gold: 220, budget: 800, hp: 0.87,
    waves: [
      'a12@0.9 a10@0.7',
      'w6@0.9 a12@0.7 w6@0.7',
      'a16@0.6 w8@0.6 a12@0.5',
      'w12@0.5 a14@0.6 w10@0.45',
      'a20@0.5 +w8@0.9 a16@0.5 w10',
      'w16@0.45 a20@0.45 w14@0.4',
      'a24@0.4 w12 a24@0.4 +w10@0.8',
      'w20@0.4 a30@0.35 w20@0.35',
    ],
  },
  {
    id: 3, name: '껍질 부대', map: 'cross', gold: 240, budget: 1150, hp: 1.1,
    waves: [
      'a14@0.8 a12@0.6',
      'b3@1.6 a14@0.6 b3@1.4',
      'a16@0.6 b4@1.3 w10 a12@0.5',
      'w12 b6@1.2 a20@0.5',
      'b8@1.1 a16@0.5 +w8@0.9 b5',
      'a26@0.4 b8 w14@0.45',
      'b10@0.9 +a20@0.6 w16@0.4 b8@0.9',
      'a30@0.35 b12@0.85 +w14@0.7 b8@0.8',
    ],
  },
  {
    id: 4, name: '말벌 둥지', map: 'fork', gold: 260, budget: 1550, hp: 0.5,
    waves: [
      'a16@0.7 w8',
      'h5@1.0 a14@0.6 h5@0.9',
      'h8@0.8 w10 a14@0.5',
      'b5@1.2 h8 a18@0.5',
      'h12@0.65 +a16@0.7 b6',
      'w16@0.45 h12@0.6 a20@0.45',
      'b8 +h10@0.9 a24@0.4 h10@0.6',
      'h16@0.55 w16@0.4 b8@0.9 a20@0.4',
      'a30@0.35 +h14@0.8 b10@0.85 +w14@0.7 h12@0.5',
    ],
  },
  {
    id: 5, name: '전갈의 굴', map: 'stairs', gold: 280, budget: 1950, hp: 0.58,
    waves: [
      'a18@0.6 w10',
      'b5 h8 a16@0.5',
      'w14@0.45 a20@0.45 h8',
      'h12@0.6 b8 +a16@0.7',
      'a26@0.4 S1 w12@0.45',
      'b10@0.9 +h10@0.9 a24@0.4',
      'w18@0.4 h14@0.55 b8@0.9 a20@0.4',
      'a30@0.35 +b8@1.2 h16@0.5 w16@0.4',
      'a24@0.4 S2@4 +h12@0.8 b10@0.8 w16@0.4',
    ],
  },
  {
    id: 6, name: '두 갈래 습격', map: 'ssang', gold: 320, budget: 2400, hp: 0.93,
    waves: [
      'a20@0.6 w10',
      'w14@0.45 b6 a16@0.5',
      'h10@0.7 a20@0.45 h8@0.6',
      'b8 +a18@0.6 w14@0.45',
      'a30@0.35 h12@0.6 b8@0.9',
      'S1 w16@0.4 +a20@0.5 h10',
      'b12@0.85 +h12@0.8 a26@0.38',
      'w22@0.38 a30@0.35 +b8@1.2 h12@0.55',
      'h18@0.5 b12@0.8 +a24@0.5 w16@0.4',
      'a30@0.35 S2@4 +h14@0.7 b12@0.8 w18@0.38',
    ],
  },
  {
    id: 7, name: '사냥꾼', map: 'maze', gold: 340, budget: 3000, hp: 1.05,
    waves: [
      'a20@0.55 w12 b5',
      'h10 a20@0.45 w12@0.45',
      'b8 +a20@0.6 h10@0.6',
      'w18@0.4 R1 a20@0.45',
      'a30@0.35 +b8@1.2 h14@0.55',
      'h14@0.6 w16@0.4 R1 +a16@0.6',
      'b12@0.8 +h12@0.8 a28@0.36 w14@0.4',
      'S1 a26@0.38 +w14@0.7 R1 h12@0.55',
      'a34@0.32 b12@0.8 +h14@0.7 w18@0.38',
      'w20@0.36 R2@4 +a24@0.5 S1 h16@0.5 b10@0.8',
    ],
  },
  {
    id: 8, name: '매듭', map: 'knot', gold: 360, budget: 3600, hp: 1.0,
    waves: [
      'a22@0.5 w12 h8',
      'b8 a22@0.45 w14@0.42',
      'h14@0.6 +a20@0.6 b8@0.9',
      'w20@0.38 S1 a24@0.42',
      'a34@0.32 h14@0.55 +b8@1.1',
      'R1 b12@0.8 +w16@0.6 h12@0.55',
      'a30@0.34 +h14@0.7 S1 w18@0.38',
      'b14@0.78 +a26@0.5 h16@0.5 R1',
      'w24@0.34 a36@0.3 +b12@0.9 h16@0.5',
      'a30@0.32 S2@4 +h16@0.6 R2@4 +w18@0.5 b12@0.75',
    ],
  },
  {
    id: 9, name: '협공', map: 'pincer', gold: 420, budget: 4400, hp: 0.72,
    waves: [
      'a24@0.5 w14 b6',
      'h12 a24@0.42 w14@0.42',
      'b10@0.9 +a22@0.55 h12@0.58',
      'w22@0.36 S1 a26@0.4',
      'a36@0.3 +h14@0.7 b10@0.85',
      'R1 w18@0.38 +a20@0.55 h14@0.52',
      'b14@0.78 +h14@0.75 a30@0.34 S1',
      'w24@0.34 a34@0.3 +b10@1.0 R1',
      'h20@0.48 b14@0.75 +a28@0.45 w18@0.36',
      'a36@0.3 S2@4 +w18@0.6 h18@0.48 R1',
      'b14@0.72 +a30@0.4 R2@4 +h16@0.6 S2@4 w22@0.34',
    ],
  },
  {
    id: 10, name: '뱀의 길', map: 'snake', gold: 440, budget: 5400, hp: 1.12,
    waves: [
      'a26@0.48 w14 b8',
      'h14 a26@0.4 w16@0.4',
      'b12@0.85 +a24@0.5 h14@0.55',
      'w24@0.35 S1 a28@0.38',
      'a38@0.29 +h16@0.65 b12@0.8',
      'R1 w20@0.36 +a22@0.5 h16@0.5',
      'b16@0.75 +h16@0.7 a32@0.32 S1',
      'w26@0.32 a36@0.29 +b12@0.95 R1',
      'h22@0.46 b16@0.72 +a30@0.42 w20@0.35',
      'a38@0.28 S2@4 +w20@0.55 h20@0.46 R1',
      'b16@0.7 +a32@0.38 R2@4 +h18@0.55 w24@0.32',
      'a36@0.28 S3@3.5 +h20@0.5 R2@4 +b14@0.8 w24@0.32',
    ],
  },
  {
    id: 11, name: '소용돌이', map: 'soyong', gold: 520, budget: 6400, hp: 1.33,
    waves: [
      'a28@0.46 w16 b8',
      'h16 a28@0.38 w18@0.38',
      'b14@0.8 +a26@0.48 h16@0.52',
      'w26@0.34 S1 a30@0.36 R1',
      'a40@0.28 +h18@0.6 b14@0.78',
      'R2@4 w22@0.35 +a24@0.48 h18@0.48',
      'b18@0.72 +h18@0.66 a34@0.31 S2@4',
      'w28@0.31 a38@0.28 +b14@0.9 R1',
      'h24@0.44 b18@0.7 +a32@0.4 w22@0.34',
      'a40@0.27 S2@4 +w22@0.52 h22@0.44 R2@4',
      'b18@0.68 +a34@0.36 R2@4 +h20@0.52 S2@4 w26@0.31',
      'a40@0.27 S3@3.5 +h22@0.48 R3@3.5 +b16@0.78 w26@0.31',
    ],
  },
  {
    id: 12, name: '화룡의 둥지', map: 'nest', gold: 560, budget: 8600, hp: 2.4,
    waves: [
      'a30@0.45 w16 b10',
      'h16 a30@0.36 w20@0.37',
      'b14@0.8 +a28@0.46 h18@0.5',
      'w28@0.33 S1 a32@0.35 R1',
      'a42@0.27 +h20@0.58 b16@0.76',
      'R2@4 w24@0.34 +a26@0.46 h20@0.46',
      'b20@0.7 +h20@0.64 a36@0.3 S2@4',
      'w30@0.3 a40@0.27 +b16@0.88 R2@4',
      'h26@0.42 b20@0.68 +a34@0.38 w24@0.33',
      'a42@0.26 S3@3.5 +w24@0.5 h24@0.42 R2@4',
      'b20@0.66 +a36@0.35 R3@3.5 +h22@0.5 S2@4 w28@0.3',
      'a44@0.26 S3@3.5 +h24@0.46 R3@3.5 +b18@0.76 w28@0.3',
      'w30@0.29 +b20@0.9 h28@0.4 +a40@0.4 S3@3.5 R3@3.5',
      'a36@0.3 +b16@0.9 h20@0.5 +w20@0.6 S2@4 R2@4 D1',
    ],
  },
];

for (const st of STAGES) {
  st.waves = st.waves.map(parseWave);
  st.lives = 20;
  /* 처치 보상 배율: 괴수를 다 잡으면 budget 만큼 벌도록 맞춘다 */
  let worth = 0;
  st.waves.forEach((groups, w) => {
    for (const [type, n] of groups) worth += n * ENEMIES[type].reward * (1 + STAGE_PAY_GROWTH * w);
  });
  st.reward = st.budget / worth;
  /* 이 스테이지에 나오는 적과, 여기서 처음 나오는 적 */
  const before = STAGES.filter((o) => o.id < st.id);
  const kinds = [...new Set(st.waves.flat().map((g) => g[0]))];
  st.enemies = Object.keys(ENEMIES).filter((k) => kinds.includes(k));
  st.newEnemies = st.enemies.filter((k) => !before.some((o) => o.enemies && o.enemies.includes(k)));
}

/* 남은 목숨으로 매기는 별점: 2개 이하로 잃으면 ★★★, 9개 이하면 ★★, 그 밖은 ★ */
function starsFor(lost) {
  return lost <= 2 ? 3 : lost <= 9 ? 2 : 1;
}
