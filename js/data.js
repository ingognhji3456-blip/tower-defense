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
   rarity 는 뽑기 등급. 탑은 뽑기로 얻고, 전투에는 다섯 개까지 골라 데려간다.

   mech 는 공격 방식이다.
     bolt     적을 쫓아가 맞는 탄. multi = 한 번에 노리는 적의 수, bounce = 맞은 뒤 다른 적에게 튕기는 횟수
     shell    포물선으로 날아가 splash 반지름으로 터지는 탄. minRange 안쪽은 쏘지 못한다
     snipe    쏘는 즉시 맞는다. line 이면 일직선 위의 적을 through 마리까지(없으면 전부) 꿰뚫는다
     rockets  로켓 여러 발을 한꺼번에        chain  적에서 적으로 튀는 번개
     cone     겨눈 쪽 부채꼴을 계속 태운다    beam   한 적을 계속 비춘다. split = 곁의 적에게 갈라지는 줄기 수
     aura     사거리 안의 적에게 늘 걸리는 효과(slow·vuln·shred), dps 가 있으면 계속 피해도 준다
     nova     every 초마다 탑 둘레로 고리를 퍼뜨린다 (aura 탑도 every 가 있으면 함께 쓴다)
     strike   하늘에서 떨어지는 공격을 count 번. pick: 'cluster' 면 적이 몰린 곳을 고른다
     trap     길 위에 덫을 traps 개까지 깐다    buff   곁의 탑을 돕는다(amp 피해, haste 연사, reach 사거리)
     income   골드를 번다. interest 는 웨이브가 끝날 때 가진 골드에 붙는 이자(cap 까지)
     lord     영웅 화염파
     blade    영웅 홍련
     moon     영웅 자월
     oni      영웅 야차
   맞은 적에게 걸리는 효과: slow·slowT(둔화), stun(기절), dot·dotT(지속 피해), shred·shredMax(갑옷 깎기),
     kb(뒤로 밀어내기), exec(체력이 이 비율 아래면 즉사), bounty(이 탑이 처치하면 더 받는 골드).
   dtype 은 피해의 종류: 'phys'(갑옷에 깎인다, 기본값) 또는 'magic'. pierce 면 갑옷을 무시한다. */
const TOWERS = {
  /* ── 일반 ── */
  crossbow: {
    name: '석궁탑', rarity: 'common', mech: 'bolt', skin: 'arrow',
    blurb: '볼트를 빠르게 쏩니다. 값이 싸서 어디에나 세우기 좋습니다.',
    levels: [
      { cost: 50, dmg: 8, cd: 0.8, range: 2.6, h: 0.7 },
      { cost: 45, dmg: 14, cd: 0.7, range: 2.9, h: 0.88 },
      { cost: 90, dmg: 24, cd: 0.56, range: 3.2, h: 1.06 },
    ],
  },
  cannon: {
    name: '대포탑', rarity: 'common', mech: 'shell', skin: 'shell',
    blurb: '포탄이 터지며 주변 적을 함께 때립니다. 떼로 몰려올 때 강합니다.',
    levels: [
      { cost: 110, dmg: 22, cd: 1.8, range: 2.7, splash: 1.0, h: 0.68 },
      { cost: 90, dmg: 38, cd: 1.7, range: 2.9, splash: 1.15, h: 0.86 },
      { cost: 170, dmg: 66, cd: 1.5, range: 3.2, splash: 1.3, h: 1.04 },
    ],
  },
  frost: {
    name: '서리탑', rarity: 'common', mech: 'aura', skin: 'ice',
    blurb: '냉기를 뿜어 주변 적을 느리게 합니다. 직접 공격하지는 않습니다.',
    levels: [
      { cost: 80, slow: 0.3, range: 1.9, h: 0.78 },
      { cost: 70, slow: 0.4, range: 2.2, h: 0.98 },
      { cost: 130, slow: 0.5, range: 2.5, vuln: 0.15, h: 1.18 },
    ],
  },
  spear: {
    name: '창탑', rarity: 'common', mech: 'snipe', line: true, skin: 'spear',
    blurb: '창을 던져 일직선 위의 적을 차례로 꿰뚫습니다. 길이 곧게 뻗은 곳에 세우면 좋습니다.',
    levels: [
      { cost: 60, dmg: 16, cd: 1.5, range: 2.5, through: 2, h: 0.66 },
      { cost: 55, dmg: 26, cd: 1.4, range: 2.8, through: 3, h: 0.82 },
      { cost: 100, dmg: 42, cd: 1.25, range: 3.1, through: 4, h: 1.0 },
    ],
  },
  twin: {
    name: '쌍궁탑', rarity: 'common', mech: 'bolt', skin: 'arrow',
    blurb: '궁수 여럿이 서로 다른 적을 한꺼번에 쏩니다.',
    levels: [
      { cost: 70, dmg: 7, cd: 0.9, range: 2.5, multi: 2, h: 0.68 },
      { cost: 60, dmg: 12, cd: 0.8, range: 2.8, multi: 2, h: 0.84 },
      { cost: 110, dmg: 18, cd: 0.7, range: 3.1, multi: 3, h: 1.02 },
    ],
  },
  trap: {
    name: '가시덫탑', rarity: 'common', mech: 'trap', skin: 'trap',
    blurb: '가까운 길 위에 가시덫을 깔아 둡니다. 덫을 밟은 적과 그 둘레가 다치고 잠깐 느려집니다.',
    levels: [
      { cost: 65, dmg: 17, cd: 2.6, range: 2.2, traps: 3, splash: 0.55, slow: 0.3, slowT: 1.0, h: 0.6 },
      { cost: 60, dmg: 28, cd: 2.3, range: 2.4, traps: 4, splash: 0.6, slow: 0.3, slowT: 1.2, h: 0.74 },
      { cost: 105, dmg: 46, cd: 2.0, range: 2.6, traps: 5, splash: 0.65, slow: 0.35, slowT: 1.4, h: 0.9 },
    ],
  },
  torch: {
    name: '횃불탑', rarity: 'common', mech: 'bolt', skin: 'ember', dtype: 'magic', dotKind: 'burn',
    blurb: '불씨를 던져 적에게 불을 붙입니다. 불은 껍질과 회피를 무시하고 한동안 타오릅니다.',
    levels: [
      { cost: 75, dmg: 9, dot: 6, dotT: 3, cd: 1.2, range: 2.4, h: 0.72 },
      { cost: 65, dmg: 15, dot: 11, dotT: 3, cd: 1.1, range: 2.6, h: 0.9 },
      { cost: 115, dmg: 24, dot: 18, dotT: 3, cd: 1.0, range: 2.9, h: 1.08 },
    ],
  },
  bell: {
    name: '종탑', rarity: 'common', mech: 'nova', skin: 'bell', dtype: 'magic',
    blurb: '종을 울려 주변 적을 잠깐 멈춰 세웁니다.',
    levels: [
      { cost: 90, dmg: 6, stun: 0.5, every: 4.0, range: 1.7, h: 0.8 },
      { cost: 75, dmg: 10, stun: 0.65, every: 3.6, range: 1.9, h: 0.98 },
      { cost: 130, dmg: 16, stun: 0.8, every: 3.2, range: 2.1, h: 1.16 },
    ],
  },
  watch: {
    name: '감시탑', rarity: 'common', mech: 'buff',
    blurb: '멀리 내다보고 알려 주어 곁에 선 탑들의 사거리를 늘려 줍니다. 직접 공격하지는 않습니다.',
    levels: [
      { cost: 55, reach: 0.12, range: 1.6, h: 0.74 },
      { cost: 50, reach: 0.18, range: 1.8, h: 0.92 },
      { cost: 90, reach: 0.25, range: 2.3, h: 1.12 },
    ],
  },
  tar: {
    name: '끈끈이탑', rarity: 'common', mech: 'shell', skin: 'tar', dtype: 'magic',
    blurb: '끈끈한 역청 덩어리를 던져 터진 자리의 적들을 한동안 느리게 합니다.',
    levels: [
      { cost: 70, dmg: 4, slow: 0.35, slowT: 2.2, cd: 2.4, range: 2.6, splash: 1.0, h: 0.66 },
      { cost: 60, dmg: 6, slow: 0.42, slowT: 2.5, cd: 2.2, range: 2.8, splash: 1.15, h: 0.82 },
      { cost: 110, dmg: 9, slow: 0.5, slowT: 2.8, cd: 2.0, range: 3.1, splash: 1.3, h: 1.0 },
    ],
  },

  /* ── 희귀 ── */
  poison: {
    name: '독탑', rarity: 'rare', mech: 'shell', skin: 'vial', dtype: 'magic', dotKind: 'poison',
    blurb: '독병을 던져 주변 적을 중독시킵니다. 독은 껍질과 회피를 무시하고 4초 동안 몸을 갉아먹습니다.',
    levels: [
      { cost: 120, dmg: 5, dot: 7, cd: 1.6, range: 2.8, splash: 0.8, h: 0.74 },
      { cost: 100, dmg: 8, dot: 13, cd: 1.5, range: 3.0, splash: 0.9, h: 0.92 },
      { cost: 190, dmg: 12, dot: 22, cd: 1.3, range: 3.2, splash: 1.0, h: 1.1 },
    ],
  },
  sniper: {
    name: '저격탑', rarity: 'rare', mech: 'snipe', pierce: true, mode: 'strong', skin: 'bullet',
    blurb: '아주 멀리서 한 발씩 강하게 쏩니다. 껍질을 꿰뚫지만 장전이 깁니다.',
    levels: [
      { cost: 140, dmg: 60, cd: 2.6, range: 5.5, h: 0.92 },
      { cost: 120, dmg: 110, cd: 2.4, range: 6.0, h: 1.06 },
      { cost: 220, dmg: 200, cd: 2.1, range: 6.5, h: 1.2 },
    ],
  },
  mine: {
    name: '금광', rarity: 'rare', mech: 'income',
    blurb: '싸우지 않는 대신 전투 중에 8초마다 골드를 캡니다. 긴 싸움일수록 이득입니다.',
    levels: [
      { cost: 130, income: 4, every: 8, range: 0, h: 0.6 },
      { cost: 110, income: 7, every: 8, range: 0, h: 0.7 },
      { cost: 190, income: 11, every: 8, range: 0, h: 0.8 },
    ],
  },
  mortar: {
    name: '박격포탑', rarity: 'rare', mech: 'shell', skin: 'bomb', speed: 5,
    blurb: '아주 먼 곳까지 큰 포탄을 쏘아 올립니다. 넓게 터지지만 코앞의 적은 쏘지 못합니다.',
    levels: [
      { cost: 135, dmg: 34, cd: 3.4, range: 5.2, minRange: 1.8, splash: 1.25, h: 0.5 },
      { cost: 115, dmg: 56, cd: 3.2, range: 5.8, minRange: 1.8, splash: 1.4, h: 0.58 },
      { cost: 200, dmg: 92, cd: 2.9, range: 6.4, minRange: 1.8, splash: 1.6, h: 0.68 },
    ],
  },
  harpoon: {
    name: '작살탑', rarity: 'rare', mech: 'bolt', skin: 'harpoon', speed: 15,
    blurb: '작살로 적을 꿰어 그 자리에 잠깐 붙잡아 둡니다. 빠른 적을 세우는 데 좋습니다.',
    levels: [
      { cost: 125, dmg: 44, stun: 0.6, cd: 2.0, range: 3.0, h: 0.76 },
      { cost: 105, dmg: 72, stun: 0.8, cd: 1.85, range: 3.3, h: 0.94 },
      { cost: 190, dmg: 116, stun: 1.0, cd: 1.7, range: 3.6, h: 1.12 },
    ],
  },
  shuriken: {
    name: '표창탑', rarity: 'rare', mech: 'bolt', skin: 'shuriken',
    blurb: '표창이 적을 맞히고 가까운 다른 적에게로 튕겨 갑니다.',
    levels: [
      { cost: 120, dmg: 11, bounce: 2, cd: 1.0, range: 2.6, h: 0.56 },
      { cost: 100, dmg: 18, bounce: 3, cd: 0.9, range: 2.9, h: 0.88 },
      { cost: 185, dmg: 28, bounce: 4, cd: 0.8, range: 3.2, h: 1.2 },
    ],
  },
  icicle: {
    name: '얼음창탑', rarity: 'rare', mech: 'bolt', skin: 'icicle', dtype: 'magic',
    blurb: '얼음창을 쏘아 맞은 적을 한동안 느리게 합니다. 껍질과 회피를 무시합니다.',
    levels: [
      { cost: 115, dmg: 20, slow: 0.3, slowT: 1.6, cd: 1.1, range: 2.8, h: 0.78 },
      { cost: 100, dmg: 34, slow: 0.36, slowT: 1.8, cd: 1.0, range: 3.1, h: 0.96 },
      { cost: 180, dmg: 54, slow: 0.42, slowT: 2.0, cd: 0.9, range: 3.4, h: 1.14 },
    ],
  },
  drum: {
    name: '북탑', rarity: 'rare', mech: 'buff',
    blurb: '북을 울려 곁에 선 탑들이 더 빨리 쏘게 합니다. 직접 공격하지는 않습니다.',
    levels: [
      { cost: 130, haste: 0.12, range: 1.7, h: 0.7 },
      { cost: 110, haste: 0.18, range: 1.9, h: 0.86 },
      { cost: 190, haste: 0.25, range: 2.3, h: 1.02 },
    ],
  },
  lodge: {
    name: '사냥꾼 오두막', rarity: 'rare', mech: 'bolt', skin: 'arrow',
    blurb: '사냥꾼이 굵은 화살을 쏩니다. 이 탑이 처치한 적은 골드를 더 줍니다.',
    levels: [
      { cost: 125, dmg: 26, bounty: 2, cd: 1.3, range: 3.0, h: 0.7 },
      { cost: 105, dmg: 44, bounty: 3, cd: 1.2, range: 3.3, h: 0.86 },
      { cost: 185, dmg: 72, bounty: 5, cd: 1.05, range: 3.6, h: 1.02 },
    ],
  },
  thorn: {
    name: '가시덩굴탑', rarity: 'rare', mech: 'aura', dtype: 'magic', skin: 'thorn',
    blurb: '덩굴이 사거리 안의 모든 적을 쉬지 않고 찌릅니다. 껍질과 회피를 무시합니다.',
    levels: [
      { cost: 120, dps: 7, range: 1.7, h: 0.7 },
      { cost: 100, dps: 11, range: 1.9, h: 0.9 },
      { cost: 180, dps: 17, range: 2.2, h: 1.1 },
    ],
  },

  /* ── 영웅 ── */
  rocket: {
    name: '로켓탑', rarity: 'epic', mech: 'rockets', skin: 'rocket',
    blurb: '멀리까지 로켓을 한꺼번에 쏟아붓습니다. 장전이 깁니다.',
    levels: [
      { cost: 170, dmg: 16, cd: 3.0, range: 4.2, rockets: 4, splash: 0.5, h: 0.72 },
      { cost: 140, dmg: 23, cd: 2.8, range: 4.6, rockets: 5, splash: 0.55, h: 0.9 },
      { cost: 260, dmg: 32, cd: 2.5, range: 5.0, rockets: 7, splash: 0.6, h: 1.08 },
    ],
  },
  tesla: {
    name: '번개탑', rarity: 'epic', mech: 'chain', dtype: 'magic',
    blurb: '번개가 적에서 적으로 튑니다. 단단한 껍질도 날쌘 몸놀림도 소용없습니다.',
    levels: [
      { cost: 150, dmg: 20, cd: 1.1, range: 2.7, chain: 3, h: 0.86 },
      { cost: 120, dmg: 32, cd: 1.0, range: 2.9, chain: 4, h: 1.08 },
      { cost: 230, dmg: 50, cd: 0.9, range: 3.2, chain: 5, h: 1.3 },
    ],
  },
  flame: {
    name: '화염탑', rarity: 'epic', mech: 'cone', dtype: 'magic', skin: 'flame',
    blurb: '가까운 적들을 부채꼴 불길로 한꺼번에 태웁니다. 길이 꺾이는 곳에 세우면 좋습니다.',
    levels: [
      { cost: 160, dps: 24, range: 1.9, cone: 0.6, h: 0.66 },
      { cost: 130, dps: 40, range: 2.1, cone: 0.6, h: 0.82 },
      { cost: 240, dps: 66, range: 2.3, cone: 0.65, h: 0.98 },
    ],
  },
  gatling: {
    name: '기관포탑', rarity: 'epic', mech: 'snipe', skin: 'tracer',
    blurb: '쉴 새 없이 쏘아 대며 맞힐 때마다 적의 껍질을 조금씩 깎아 냅니다.',
    levels: [
      { cost: 160, dmg: 9, shred: 0.4, shredMax: 5, cd: 0.2, range: 2.7, h: 0.7 },
      { cost: 135, dmg: 14, shred: 0.6, shredMax: 8, cd: 0.18, range: 3.0, h: 0.86 },
      { cost: 245, dmg: 22, shred: 0.9, shredMax: 12, cd: 0.15, range: 3.3, h: 1.02 },
    ],
  },
  railgun: {
    name: '레일건탑', rarity: 'epic', mech: 'snipe', line: true, pierce: true, skin: 'rail',
    blurb: '사거리 끝까지 일직선 위의 적을 모조리 꿰뚫습니다. 껍질도 무시하지만 장전이 아주 깁니다.',
    levels: [
      { cost: 190, dmg: 55, cd: 3.2, range: 5.0, h: 0.8 },
      { cost: 160, dmg: 95, cd: 3.0, range: 5.5, h: 0.98 },
      { cost: 290, dmg: 160, cd: 2.7, range: 6.0, h: 1.16 },
    ],
  },
  glacier: {
    name: '빙하탑', rarity: 'epic', mech: 'nova', skin: 'ice', dtype: 'magic',
    blurb: '때맞춰 한파를 터뜨려 주변의 적을 통째로 얼립니다.',
    levels: [
      { cost: 170, dmg: 20, stun: 1.0, every: 5.0, range: 2.1, h: 0.8 },
      { cost: 145, dmg: 32, stun: 1.3, every: 4.6, range: 2.3, h: 1.0 },
      { cost: 260, dmg: 50, stun: 1.6, every: 4.2, range: 2.6, h: 1.2 },
    ],
  },
  quake: {
    name: '지진탑', rarity: 'epic', mech: 'nova', skin: 'quake',
    blurb: '큰 망치로 땅을 내리쳐 주변의 적을 모두 때리고 잠깐 비틀거리게 합니다.',
    levels: [
      { cost: 165, dmg: 22, stun: 0.25, every: 2.4, range: 1.8, h: 0.9 },
      { cost: 140, dmg: 36, stun: 0.3, every: 2.2, range: 2.0, h: 1.08 },
      { cost: 250, dmg: 50, stun: 0.35, every: 2.0, range: 2.2, h: 1.26 },
    ],
  },
  curse: {
    name: '저주탑', rarity: 'epic', mech: 'aura', skin: 'curse',
    blurb: '저주를 내려 주변의 적이 받는 피해를 늘리고 껍질을 무르게 합니다. 직접 공격하지는 않습니다.',
    levels: [
      { cost: 150, vuln: 0.18, shred: 1, range: 2.2, h: 0.8 },
      { cost: 130, vuln: 0.25, shred: 2, range: 2.5, h: 1.0 },
      { cost: 230, vuln: 0.33, shred: 3, range: 2.8, h: 1.2 },
    ],
  },
  hive: {
    name: '벌집탑', rarity: 'epic', mech: 'bolt', skin: 'bee', dtype: 'magic', dotKind: 'poison', speed: 9,
    blurb: '벌 떼가 여러 적에게 한꺼번에 달려들어 쏘고 독을 남깁니다.',
    levels: [
      { cost: 175, dmg: 11, dot: 3, dotT: 2, multi: 3, cd: 0.9, range: 3.0, h: 0.7 },
      { cost: 150, dmg: 17, dot: 5, dotT: 2, multi: 4, cd: 0.85, range: 3.3, h: 0.88 },
      { cost: 265, dmg: 25, dot: 8, dotT: 2, multi: 6, cd: 0.75, range: 3.6, h: 1.06 },
    ],
  },
  prism: {
    name: '프리즘탑', rarity: 'epic', mech: 'beam', dtype: 'magic', skin: 'prism',
    blurb: '광선이 겨눈 적에게서 곁의 적들에게로 갈라집니다.',
    levels: [
      { cost: 180, dps: 26, split: 2, range: 2.8, h: 0.86 },
      { cost: 150, dps: 42, split: 3, range: 3.1, h: 1.06 },
      { cost: 270, dps: 68, split: 4, range: 3.4, h: 1.28 },
    ],
  },

  /* ── 전설 ── */
  laser: {
    name: '광선탑', rarity: 'legend', mech: 'beam', dtype: 'magic', skin: 'sun',
    blurb: '한 적에게 광선을 고정합니다. 오래 비출수록 피해가 세 배까지 커져 우두머리에게 특히 강합니다.',
    levels: [
      { cost: 220, dps: 44, range: 3.0, h: 0.88 },
      { cost: 180, dps: 72, range: 3.3, h: 1.08 },
      { cost: 320, dps: 120, range: 3.6, h: 1.3 },
    ],
  },
  dragon: {
    name: '용의 탑', rarity: 'legend', mech: 'cone', dtype: 'magic', dotKind: 'burn', skin: 'dragon',
    blurb: '탑에 깃든 용이 넓은 불길을 내뿜습니다. 불길에 닿은 적은 한동안 타오릅니다.',
    levels: [
      { cost: 260, dps: 30, dot: 6, dotT: 2, range: 2.4, cone: 0.7, h: 0.74 },
      { cost: 210, dps: 48, dot: 10, dotT: 2, range: 2.7, cone: 0.7, h: 0.9 },
      { cost: 380, dps: 76, dot: 16, dotT: 2, range: 3.0, cone: 0.75, h: 1.06 },
    ],
  },
  storm: {
    name: '천둥신전', rarity: 'legend', mech: 'strike', skin: 'thunder', dtype: 'magic',
    blurb: '넓은 사거리 안의 적들 머리 위로 벼락을 잇달아 떨굽니다.',
    levels: [
      { cost: 250, dmg: 28, count: 2, splash: 0.6, delay: 0.25, cd: 1.7, range: 4.0, h: 0.72 },
      { cost: 200, dmg: 36, count: 3, splash: 0.65, delay: 0.25, cd: 1.6, range: 4.4, h: 0.9 },
      { cost: 360, dmg: 46, count: 4, splash: 0.7, delay: 0.25, cd: 1.5, range: 4.8, h: 1.2 },
    ],
  },
  gravity: {
    name: '중력탑', rarity: 'legend', mech: 'nova', skin: 'void', dtype: 'magic',
    blurb: '중력을 뒤틀어 주변의 적을 길 뒤쪽으로 멀리 끌어당깁니다.',
    levels: [
      { cost: 240, dmg: 24, kb: 1.6, every: 5.5, range: 2.4, h: 0.7 },
      { cost: 200, dmg: 38, kb: 2.0, every: 5.0, range: 2.7, h: 0.88 },
      { cost: 350, dmg: 60, kb: 2.5, every: 4.5, range: 3.0, h: 1.08 },
    ],
  },
  vault: {
    name: '황금 금고', rarity: 'legend', mech: 'income',
    blurb: '전투 중에 골드를 벌고, 웨이브가 끝날 때마다 가진 골드에 이자를 붙여 줍니다.',
    levels: [
      { cost: 260, income: 9, every: 8, interest: 0.04, cap: 40, range: 0, h: 0.7 },
      { cost: 220, income: 14, every: 8, interest: 0.06, cap: 70, range: 0, h: 0.8 },
      { cost: 380, income: 22, every: 8, interest: 0.08, cap: 110, range: 0, h: 0.9 },
    ],
  },
  citadel: {
    name: '사령탑', rarity: 'legend', mech: 'buff',
    blurb: '깃발을 올려 곁에 선 탑들의 피해를 크게 늘려 줍니다. 직접 공격하지는 않습니다.',
    levels: [
      { cost: 240, amp: 0.15, range: 2.0, h: 1.0 },
      { cost: 200, amp: 0.22, range: 2.3, h: 1.2 },
      { cost: 360, amp: 0.3, range: 2.6, h: 1.4 },
    ],
  },
  observatory: {
    name: '천문대', rarity: 'legend', mech: 'strike', pick: 'cluster', skin: 'meteor', dtype: 'magic',
    blurb: '아주 먼 곳까지, 적이 가장 몰린 자리에 운석을 떨어뜨립니다.',
    levels: [
      { cost: 270, dmg: 62, count: 1, splash: 1.3, delay: 0.9, cd: 4.2, range: 5.5, h: 0.54 },
      { cost: 220, dmg: 98, count: 1, splash: 1.45, delay: 0.9, cd: 3.9, range: 6.0, h: 0.7 },
      { cost: 390, dmg: 150, count: 1, splash: 1.6, delay: 0.9, cd: 3.5, range: 6.5, h: 0.88 },
    ],
  },
  clock: {
    name: '시계탑', rarity: 'legend', mech: 'aura', skin: 'time',
    blurb: '주변의 시간을 늦춰 적을 크게 느리게 하고, 때맞춰 시간을 멈춰 세웁니다.',
    levels: [
      { cost: 250, slow: 0.4, stun: 1.2, every: 9, range: 2.4, h: 0.62 },
      { cost: 210, slow: 0.48, stun: 1.5, every: 8, range: 2.7, h: 0.8 },
      { cost: 370, slow: 0.56, stun: 1.8, every: 7, range: 3.0, h: 1.0 },
    ],
  },
  reaper: {
    name: '처형탑', rarity: 'legend', mech: 'snipe', dtype: 'magic', skin: 'scythe', mode: 'strong',
    blurb: '가장 센 적을 골라 내리칩니다. 체력이 얼마 남지 않은 적은 그 자리에서 처형합니다(우두머리 제외).',
    levels: [
      { cost: 255, dmg: 110, exec: 0.15, cd: 2.2, range: 3.6, h: 0.7 },
      { cost: 210, dmg: 190, exec: 0.2, cd: 2.0, range: 4.0, h: 0.88 },
      { cost: 370, dmg: 320, exec: 0.25, cd: 1.8, range: 4.4, h: 1.06 },
    ],
  },
  wizard: {
    name: '마법사의 탑', rarity: 'legend', mech: 'bolt', skin: 'orb', dtype: 'magic', speed: 10,
    blurb: '마법 구슬 여러 개가 서로 다른 적을 쫓아가 터집니다. 껍질과 회피를 무시합니다.',
    levels: [
      { cost: 245, dmg: 32, multi: 3, cd: 1.3, range: 3.4, h: 0.8 },
      { cost: 205, dmg: 50, multi: 4, cd: 1.2, range: 3.8, h: 0.96 },
      { cost: 365, dmg: 76, multi: 5, cd: 1.05, range: 4.2, h: 1.14 },
    ],
  },

  /* ── 신화 ── */
  /* 영웅: 건물이 아니라 전장에 직접 서는 화염파. 한 판에 하나만 세울 수 있다. 강화할수록 공격이 는다.
     dmg 는 광선이 한 번 휩쓸 때 적 하나가 받는 피해, arc 는 휩쓰는 부채꼴의 각도(라디안), h 는 두 손의 높이,
     shock·shockR·push 는 충격파의 피해·반지름·밀어내는 거리(칸),
     pillar(·pillars) 는 2단부터 쓰는 불기둥의 피해(와 개수), meteor·meteors 는 3단의 유성 하나의 피해와 개수. */
  lord: {
    name: '화염파', rarity: 'mythic', unique: true, mech: 'lord', dtype: 'magic',
    learn: [null, '불기둥', '유성우'], /* 그 단계에 올라서며 익히는 공격 */
    blurb: '굵은 불꽃 광선을 부채꼴로 휘둘러 범위 안의 적을 한꺼번에 태우고, 적이 다가오면 충격파로 태우며 밀어냅니다. 2단에서 불기둥, 3단에서 유성우를 익힙니다. 한 판에 하나만 세울 수 있습니다.',
    levels: [
      { cost: 520, dmg: 50, cd: 2.2, range: 3.4, arc: 1.3, shock: 30, shockR: 1.9, push: 0.9, h: 0.42 },
      { cost: 460, dmg: 64, cd: 2.0, range: 3.8, arc: 1.6, shock: 44, shockR: 2.1, push: 1.1, pillar: 100, pillars: 1, h: 0.48 },
      { cost: 820, dmg: 70, cd: 1.8, range: 4.3, arc: 2.0, shock: 58, shockR: 2.4, push: 1.3, pillar: 130, pillars: 2, meteor: 95, meteors: 5, h: 0.6 },
    ],
  },
  /* 영웅: 불꽃 검을 든 홍련. 화염파가 멀리서 넓게 태운다면, 홍련은 길 가까이에 서서 다가온 적을 연달아 벤다.
     dmg 는 한 번 벨 때 적 하나가 받는 피해, arc 는 베는 부채꼴의 각도(라디안), cd 는 베기 사이의 틈,
     finish 는 세 번째 회전 베기의 피해 배율, dot 는 회전 베기와 기술이 남기는 화상(초당),
     cross 는 2단부터 쓰는 십자 베기의 피해, sword·swords 는 3단의 화염검 하나의 피해와 개수, h 는 가슴 높이. */
  blade: {
    name: '홍련', rarity: 'mythic', unique: true, mech: 'blade', dtype: 'magic', dotKind: 'burn',
    learn: [null, '십자 베기', '화염검 낙하'], /* 그 단계에 올라서며 익히는 공격 */
    blurb: '불꽃 검으로 다가온 적을 연달아 벱니다. 두 번 가로로 베고, 세 번째는 한 바퀴 돌며 둘레의 적을 모두 베어 불태웁니다. 2단에서 가장 센 적을 가르는 십자 베기, 3단에서 화염검 낙하를 익힙니다. 껍질을 무시합니다. 한 판에 하나만 세울 수 있습니다.',
    levels: [
      { cost: 500, dmg: 22, cd: 0.62, range: 2.0, arc: 2.2, finish: 1.8, dot: 6, h: 0.42 },
      { cost: 450, dmg: 34, cd: 0.56, range: 2.2, arc: 2.4, finish: 1.9, dot: 11, cross: 210, h: 0.48 },
      { cost: 800, dmg: 60, cd: 0.5, range: 2.4, arc: 2.6, finish: 2.0, dot: 18, cross: 380, sword: 190, swords: 3, h: 0.56 },
    ],
  },
  /* 영웅: 보랏빛 큰 낫을 든 자월. 낫을 휘둘러 초승달 검기를 날리고, 적을 붙잡아 한데 묶어 터뜨린다.
     dmg 는 검기가 적 하나에게 주는 피해, ring 은 세 번째 공격인 원월의 반지름, finish 는 원월의 피해 배율,
     orb·orbDps 는 2단부터 쓰는 공허 구슬이 닫히며 물어뜯는 피해와 붙잡아 두는 동안의 초당 피해,
     eclipse 는 3단의 월식(빛기둥) 피해, h 는 가슴 높이. */
  moon: {
    name: '자월', rarity: 'mythic', unique: true, mech: 'moon', dtype: 'magic',
    learn: [null, '공허 구슬', '월식'], /* 그 단계에 올라서며 익히는 공격 */
    blurb: '보랏빛 큰 낫을 휘둘러 초승달 검기를 날립니다. 검기는 곧게 날아가며 지나는 적을 모두 베고, 세 번째 공격은 몸 둘레를 한 바퀴 베어 느리게 합니다. 2단에서 적 무리를 붙잡아 두었다가 물어뜯는 공허 구슬, 3단에서 적을 옭아맨 뒤 빛기둥으로 터뜨리는 월식을 익힙니다. 껍질을 무시합니다. 한 판에 하나만 세울 수 있습니다.',
    levels: [
      { cost: 540, dmg: 52, cd: 0.85, range: 3.0, ring: 1.8, finish: 2.0, h: 0.42 },
      { cost: 480, dmg: 60, cd: 0.8, range: 3.3, ring: 1.9, finish: 2.0, orb: 100, orbDps: 18, h: 0.48 },
      { cost: 840, dmg: 80, cd: 0.74, range: 3.6, ring: 2.0, finish: 2.1, orb: 170, orbDps: 32, eclipse: 560, h: 0.56 },
    ],
  },
  /* 영웅: 검붉은 귀기를 두른 야차. 손톱으로 땅을 갈라 귀참을 날리고, 혼불을 풀어 적을 쫓게 한다.
     dmg 는 귀참이 적 하나에게 주는 피해, soul·souls 는 세 번째 공격으로 푸는 혼불 하나의 피해와 개수,
     breath 는 2단부터 쓰는 귀염포가 줄기 안의 적에게 모두 합쳐 주는 피해,
     beast 는 3단에서 부르는 귀수가 들이받는 피해(끝에서 터질 때는 그 0.8배), h 는 가슴 높이.
     3단에 오르면 큰 귀신의 모습으로 변신한다. */
  oni: {
    name: '야차', rarity: 'mythic', unique: true, mech: 'oni', dtype: 'magic',
    learn: [null, '귀염포', '변신 · 귀수'], /* 그 단계에 올라서며 익히는 공격 */
    blurb: '손톱을 휘둘러 땅을 가르는 귀참을 날립니다. 귀참은 곧게 달려가며 지나는 적을 모두 베고, 세 번째 공격으로는 적을 쫓아가는 혼불을 여럿 풉니다. 2단에서 일직선의 적을 모두 태우는 귀염포를 익히고, 3단에서는 큰 귀신으로 변신해 길을 따라 달려가 터지는 귀수를 부릅니다. 껍질을 무시합니다. 한 판에 하나만 세울 수 있습니다.',
    levels: [
      { cost: 560, dmg: 64, cd: 0.85, range: 3.2, soul: 56, souls: 3, h: 0.42 },
      { cost: 500, dmg: 86, cd: 0.8, range: 3.5, soul: 80, souls: 4, breath: 520, h: 0.48 },
      { cost: 880, dmg: 112, cd: 0.74, range: 3.8, soul: 100, souls: 5, breath: 760, beast: 640, h: 0.62 },
    ],
  },
};

/* 화면에 늘어놓는 순서: 등급 순, 같은 등급 안에서는 위에 적은 순 */
const TOWER_ORDER = ['common', 'rare', 'epic', 'legend', 'mythic'].flatMap((r) => Object.keys(TOWERS).filter((t) => TOWERS[t].rarity === r));

const FLAME_TICK = 0.15; // 화염탑이 피해를 주는 간격
const POISON_TIME = 4; // 독이 이어지는 시간
const LINE_HALF = 0.32; // 일직선 관통(창·레일건)의 반 굵기(칸)
const BOUNCE_RANGE = 2.0; // 표창이 튕겨 갈 수 있는 거리(칸)
const BOUNCE_FALLOFF = 0.8; // 튕길 때마다 줄어드는 피해
const PRISM_RANGE = 1.7; // 프리즘탑: 광선이 갈라져 닿는 거리(칸)
const PRISM_SHARE = 0.55; // 프리즘탑: 갈라진 줄기의 피해 비율
const STUN_GUARD = 2.5; // 기절이 풀린 뒤 다시 기절하지 않는 시간(초)
const KB_GUARD = 5; // 한 번 밀려난 적이 다시 밀려나지 않는 시간(초)
const NOVA_TIME = 0.35; // 탑 둘레로 퍼지는 고리가 끝까지 가는 시간(초)
const TRAP_ARM = 0.35; // 덫이 깔린 뒤 작동하기까지(초)
const LORD_SWEEP = 0.75; // 화염파: 광선을 한 번 휘두르는 데 걸리는 시간(초)
const LORD_BEAM = 0.28; // 화염파: 광선의 반 굵기(칸)
const LORD_PILLAR_EVERY = 5.5; // 불기둥을 쓰는 간격(초)
const LORD_PILLAR_DELAY = 0.45; // 불기둥이 예고된 뒤 솟기까지(초)
const LORD_PILLAR_R = 0.95; // 불기둥의 반지름(칸)
const LORD_METEOR_EVERY = 11; // 유성우를 쓰는 간격(초)
const LORD_METEOR_DELAY = 0.6; // 첫 유성이 떨어지기까지(초)
const LORD_METEOR_R = 0.85; // 유성 하나가 터지는 반지름(칸)
const LORD_SHOCK_EVERY = 6; // 충격파를 쓰는 간격(초)
const LORD_SHOCK_TIME = 0.4; // 충격파가 끝까지 퍼지는 시간(초)
const LORD_SHOCK_AT = 0.7; // 몸짓이 이만큼 남았을 때(전체의 비율) 발을 굴러 충격파가 나간다
const BLADE_SWING = 0.2; // 홍련: 가로 베기 한 번이 지나가는 시간(초)
const BLADE_SPIN = 0.42; // 회전 베기가 한 바퀴 도는 시간(초)
const BLADE_REST = 1.7; // 회전 베기 뒤에는 베기 사이의 틈이 이만큼(배) 길다
const BLADE_BURN = 3; // 화상이 이어지는 시간(초)
const BLADE_REACH = 1.7; // 십자 베기·화염검이 닿는 거리(사거리의 배)
const BLADE_CROSS_EVERY = 5; // 십자 베기를 쓰는 간격(초)
const BLADE_CROSS_AT = 0.5; // 몸짓이 이만큼 남았을 때(전체의 비율) 칼을 그어 피해가 들어간다
const BLADE_CROSS_R = 0.7; // 십자 베기가 번지는 반지름(칸)
const BLADE_SWORD_EVERY = 9; // 화염검 낙하를 쓰는 간격(초)
const BLADE_SWORD_DELAY = 0.6; // 첫 화염검이 떨어지기까지(초)
const BLADE_SWORD_R = 0.75; // 화염검 하나가 터지는 반지름(칸)
const MOON_SWING = 0.26; // 자월: 낫을 한 번 휘두르는 시간(초)
const MOON_SPIN = 0.46; // 원월이 한 바퀴 도는 시간(초)
const MOON_REST = 1.5; // 원월 뒤에는 공격 사이의 틈이 이만큼(배) 길다
const MOON_WAVE_AT = 0.11; // 낫을 휘두르기 시작해 검기가 떠나기까지(초)
const MOON_WAVE_SPEED = 9; // 검기가 날아가는 빠르기(칸/초)
const MOON_WAVE_HALF = 0.6; // 검기의 반 너비(칸)
const MOON_RING_SLOW = 0.35; // 원월에 맞은 적이 느려지는 정도
const MOON_ORB_EVERY = 7; // 공허 구슬을 쓰는 간격(초)
const MOON_ORB_AT = 0.5; // 몸짓이 이만큼 남았을 때(전체의 비율) 구슬이 손을 떠난다
const MOON_ORB_SPEED = 6.5; // 구슬이 날아가는 빠르기(칸/초)
const MOON_ORB_HOLD = 2.2; // 구슬이 적을 붙잡아 두는 시간(초)
const MOON_ORB_R = 1.15; // 구슬이 붙잡는 반지름(칸)
const MOON_ORB_SLOW = 0.8; // 구슬 안의 적이 느려지는 정도
const MOON_ECLIPSE_EVERY = 12; // 월식을 쓰는 간격(초)
const MOON_ECLIPSE_DELAY = 1.1; // 달 그림자가 새겨진 뒤 빛기둥이 솟기까지(초)
const MOON_ECLIPSE_SNARE = 0.42; // 그사이 이만큼 지났을 때(비율) 가시가 돋아 적을 옭아맨다
const MOON_ECLIPSE_R = 1.3; // 월식의 반지름(칸)
const MOON_ECLIPSE_STUN = 1.3; // 옭아매는 시간(초)
const ONI_SWING = 0.24; // 야차: 손톱을 한 번 휘두르는 시간(초)
const ONI_VOLLEY = 0.5; // 혼불을 푸는 몸짓의 시간(초)
const ONI_REST = 1.4; // 혼불을 푼 뒤에는 공격 사이의 틈이 이만큼(배) 길다
const ONI_WAVE_AT = 0.1; // 손톱을 휘두르기 시작해 귀참이 떠나기까지(초)
const ONI_WAVE_SPEED = 10; // 귀참이 달려가는 빠르기(칸/초)
const ONI_WAVE_HALF = 0.55; // 귀참의 반 너비(칸)
const ONI_SOUL_SPEED = 6; // 혼불이 날아가는 빠르기(칸/초)
const ONI_BREATH_EVERY = 8; // 귀염포를 쓰는 간격(초)
const ONI_BREATH_WIND = 0.5; // 기를 모으는 시간(초)
const ONI_BREATH_TIME = 0.8; // 귀염포를 내뿜는 시간(초)
const ONI_BREATH_REACH = 1.7; // 귀염포가 닿는 거리(사거리의 배)
const ONI_BREATH_HALF = 0.5; // 귀염포의 반 굵기(칸)
const ONI_BEAST_EVERY = 13; // 귀수를 부르는 간격(초)
const ONI_BEAST_AHEAD = 2; // 귀수가 나타나는 자리: 영웅 곁의 길에서 성문 쪽으로 이만큼(칸)
const ONI_BEAST_RUN = 9; // 귀수가 달리는 거리(칸)
const ONI_BEAST_SPEED = 7.5; // 귀수가 달리는 빠르기(칸/초)
const ONI_BEAST_HALF = 0.8; // 귀수에게 들이받히는 거리(칸)
const ONI_BEAST_R = 1.4; // 귀수가 터지는 반지름(칸)
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
/* 시험용 스위치: 켜 두면 뽑지 않은 탑도 모두 가진 것으로 치고 편성할 수 있다. 빌려준 탑은 저장되지 않으므로, 끄면 뽑은 탑만 남는다. */
const UNLOCK_ALL = true;

/* 등급을 반영한 탑의 수치 */
function towerStats(type, level, rank) {
  const base = TOWERS[type].levels[level];
  if (!rank) return base;
  const k = 1 + RANK_BONUS * rank;
  const lv = Object.assign({}, base);
  for (const key of ['dmg', 'dot', 'dps', 'shock', 'pillar', 'meteor', 'cross', 'sword', 'orb', 'orbDps', 'eclipse', 'soul', 'breath', 'beast']) if (lv[key]) lv[key] = Math.round(lv[key] * k * 10) / 10;
  if (lv.income) lv.income = Math.round(lv.income * (1 + 0.1 * rank));
  const mech = TOWERS[type].mech;
  if (mech === 'aura' || mech === 'buff') lv.range = Math.round(lv.range * (1 + 0.05 * rank) * 100) / 100;
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
