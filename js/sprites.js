'use strict';
/* 도깨비 고개 — 그림. 모든 함수는 원점이 대상의 중심이고 1 단위가 타일 한 칸인 좌표계에 그린다. */

const PAL = {
  ink: '#0f1528',
  night: '#131a30',
  grassA: '#1f4640',
  grassB: '#234c45',
  grassTuft: '#2f6355',
  path: '#8a7a60',
  pathEdge: '#544a3f',
  pathLight: '#a39274',
  jade: '#5fb89a',
  jadeDark: '#2f7a66',
  red: '#e2572b',
  redDark: '#8c2f22',
  blue: '#3f6fd8',
  blueLight: '#8fb8ff',
  yellow: '#f4b93a',
  white: '#f4ecd8',
  wood: '#9a6a44',
  woodLight: '#c08a58',
  woodDark: '#5d3b26',
  stone: '#77819c',
  stoneDark: '#4a5370',
  floor: '#2a3354',
  iron: '#39415a',
  ironDark: '#222840',
  flame: '#7fd4ff',
  skin: '#f0c9a0',
};

const TOWER_RIM = {
  archer: PAL.jade,
  cannon: PAL.red,
  jangseung: PAL.woodLight,
  hwacha: PAL.yellow,
  dosa: PAL.blueLight,
};

function fillCircle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function fillEllipse(ctx, x, y, rx, ry, rot) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
  ctx.fill();
}

function fillPoly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fillRoundRect(ctx, x, y, w, h, r) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
}

/* ───────── 타워 ───────── */

function drawPlatform(ctx, type, level) {
  ctx.fillStyle = 'rgba(6,10,24,.38)';
  fillEllipse(ctx, 0.03, 0.07, 0.42, 0.4);
  ctx.fillStyle = PAL.stoneDark;
  fillCircle(ctx, 0, 0.02, 0.4);
  ctx.fillStyle = PAL.stone;
  fillCircle(ctx, 0, -0.01, 0.38);
  ctx.fillStyle = TOWER_RIM[type];
  fillCircle(ctx, 0, -0.01, 0.325);
  ctx.fillStyle = PAL.floor;
  fillCircle(ctx, 0, -0.01, 0.265);
  if (level >= 2) {
    ctx.strokeStyle = PAL.yellow;
    ctx.lineWidth = 0.022;
    ctx.beginPath();
    ctx.arc(0, -0.01, 0.235, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/* 단계 표시: 아래쪽 돌 테두리에 박은 금빛 못 */
function drawPips(ctx, level) {
  for (let i = 0; i <= level; i++) {
    const a = Math.PI / 2 + (i - level / 2) * 0.36;
    const x = Math.cos(a) * 0.355;
    const y = -0.01 + Math.sin(a) * 0.355;
    ctx.fillStyle = PAL.ink;
    fillCircle(ctx, x, y, 0.052);
    ctx.fillStyle = PAL.yellow;
    fillCircle(ctx, x, y, 0.036);
  }
}

function drawArcherTop(ctx, level, recoil) {
  const draw = 1 - recoil;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = PAL.woodDark;
  fillRoundRect(ctx, -0.25, -0.05, 0.42, 0.1, 0.03);
  ctx.strokeStyle = level >= 2 ? PAL.yellow : PAL.woodLight;
  ctx.lineWidth = 0.075;
  ctx.beginPath();
  ctx.arc(-0.3, 0, 0.44, -0.66, 0.66);
  ctx.stroke();
  const tipX = -0.3 + 0.44 * Math.cos(0.66);
  const tipY = 0.44 * Math.sin(0.66);
  const nock = -0.05 - draw * 0.15;
  ctx.strokeStyle = PAL.white;
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.moveTo(tipX, -tipY);
  ctx.lineTo(nock, 0);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  if (recoil < 0.55) {
    ctx.strokeStyle = '#e6dcc0';
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(nock, 0);
    ctx.lineTo(nock + 0.4, 0);
    ctx.stroke();
    ctx.fillStyle = '#eef2fb';
    fillPoly(ctx, [nock + 0.5, 0, nock + 0.37, -0.055, nock + 0.37, 0.055]);
  }
  if (level >= 1) {
    ctx.fillStyle = PAL.jade;
    fillCircle(ctx, -0.19, 0, 0.05);
  }
}

function drawCannonTop(ctx, level, recoil) {
  ctx.translate(-recoil * 0.09, 0);
  const len = 0.5 + level * 0.035;
  const half = 0.105 + level * 0.012;
  ctx.fillStyle = PAL.woodDark;
  fillRoundRect(ctx, -0.22, -0.18, 0.3, 0.36, 0.05);
  ctx.fillStyle = PAL.iron;
  fillRoundRect(ctx, -0.17, -half, len, half * 2, 0.07);
  ctx.fillStyle = 'rgba(255,255,255,.14)';
  fillRoundRect(ctx, -0.13, -half + 0.025, len - 0.1, 0.04, 0.02);
  ctx.fillStyle = PAL.ironDark;
  fillRoundRect(ctx, -0.17 + len - 0.07, -half - 0.02, 0.085, half * 2 + 0.04, 0.03);
  ctx.fillStyle = PAL.yellow;
  ctx.fillRect(-0.06, -half, 0.035, half * 2);
  if (level >= 1) ctx.fillRect(0.1, -half, 0.035, half * 2);
  if (level >= 2) ctx.fillRect(0.02, -half, 0.02, half * 2);
  ctx.fillStyle = PAL.ironDark;
  fillCircle(ctx, -0.17, 0, half * 0.75);
  if (recoil > 0.55) {
    const k = (recoil - 0.55) / 0.45;
    ctx.fillStyle = `rgba(255,214,120,${k})`;
    fillCircle(ctx, -0.17 + len + 0.1, 0, 0.1 + k * 0.08);
    ctx.fillStyle = `rgba(255,255,240,${k})`;
    fillCircle(ctx, -0.17 + len + 0.08, 0, 0.06);
  }
}

function drawHwachaTop(ctx, level, recoil) {
  ctx.translate(-recoil * 0.04, 0);
  ctx.fillStyle = '#231a14';
  fillRoundRect(ctx, -0.17, -0.34, 0.3, 0.085, 0.035);
  fillRoundRect(ctx, -0.17, 0.255, 0.3, 0.085, 0.035);
  ctx.fillStyle = PAL.woodDark;
  fillRoundRect(ctx, -0.26, -0.26, 0.46, 0.52, 0.04);
  ctx.fillStyle = PAL.wood;
  fillRoundRect(ctx, -0.15, -0.22, 0.4, 0.44, 0.03);
  const rows = level >= 2 ? 5 : 4;
  const cols = level >= 1 ? 4 : 3;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = -0.08 + (i * 0.27) / (cols - 1);
      const y = -0.15 + (j * 0.3) / (rows - 1);
      ctx.fillStyle = '#1b1310';
      fillCircle(ctx, x, y, 0.03);
      if (recoil < 0.3) {
        ctx.fillStyle = PAL.red;
        fillCircle(ctx, x, y, 0.015);
      }
    }
  }
  ctx.fillStyle = PAL.yellow;
  ctx.fillRect(-0.15, -0.22, 0.03, 0.44);
}

function drawJangseung(ctx, level, flash, t) {
  ctx.fillStyle = 'rgba(6,10,24,.4)';
  fillEllipse(ctx, 0.02, 0.27, 0.2, 0.07);
  ctx.fillStyle = PAL.woodDark;
  fillRoundRect(ctx, -0.155, -0.4, 0.31, 0.7, 0.08);
  ctx.fillStyle = PAL.wood;
  fillRoundRect(ctx, -0.14, -0.4, 0.26, 0.68, 0.07);
  ctx.strokeStyle = 'rgba(60,35,20,.5)';
  ctx.lineWidth = 0.014;
  ctx.beginPath();
  ctx.moveTo(-0.07, 0.12); ctx.lineTo(-0.06, 0.25);
  ctx.moveTo(0.05, 0.1); ctx.lineTo(0.04, 0.24);
  ctx.stroke();
  /* 관모 */
  ctx.fillStyle = '#26203a';
  fillPoly(ctx, [-0.2, -0.3, 0.2, -0.3, 0.12, -0.47, -0.12, -0.47]);
  ctx.fillStyle = PAL.red;
  ctx.fillRect(-0.2, -0.325, 0.4, 0.035);
  /* 눈 */
  const glow = level >= 2 || flash > 0;
  ctx.fillStyle = glow ? '#c9ffe9' : PAL.white;
  fillCircle(ctx, -0.065, -0.19, 0.052);
  fillCircle(ctx, 0.065, -0.19, 0.052);
  ctx.fillStyle = glow ? PAL.jadeDark : PAL.ink;
  fillCircle(ctx, -0.06, -0.185, 0.024);
  fillCircle(ctx, 0.07, -0.185, 0.024);
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 0.028;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-0.125, -0.265); ctx.lineTo(-0.02, -0.235);
  ctx.moveTo(0.125, -0.265); ctx.lineTo(0.02, -0.235);
  ctx.stroke();
  /* 코와 입 */
  ctx.fillStyle = PAL.red;
  fillRoundRect(ctx, -0.025, -0.16, 0.05, 0.1, 0.02);
  ctx.fillStyle = PAL.ink;
  fillRoundRect(ctx, -0.1, -0.035, 0.2, 0.09, 0.025);
  ctx.fillStyle = PAL.white;
  fillRoundRect(ctx, -0.085, -0.02, 0.17, 0.06, 0.015);
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 0.012;
  ctx.beginPath();
  for (let i = -1; i <= 1; i++) { ctx.moveTo(i * 0.043, -0.02); ctx.lineTo(i * 0.043, 0.04); }
  ctx.stroke();
  if (level >= 1) {
    /* 금줄 */
    ctx.strokeStyle = PAL.white;
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(-0.15, 0.1);
    ctx.quadraticCurveTo(0, 0.17, 0.14, 0.1);
    ctx.stroke();
    ctx.fillStyle = PAL.red;
    fillPoly(ctx, [-0.07, 0.13, -0.03, 0.14, -0.06, 0.21]);
    ctx.fillStyle = PAL.yellow;
    fillPoly(ctx, [0.03, 0.14, 0.07, 0.13, 0.06, 0.21]);
  }
}

function drawDosa(ctx, level, flash, t) {
  ctx.fillStyle = 'rgba(6,10,24,.4)';
  fillEllipse(ctx, 0.02, 0.27, 0.22, 0.07);
  /* 도포 */
  ctx.fillStyle = '#d9e2f2';
  fillPoly(ctx, [-0.21, 0.28, 0.21, 0.28, 0.12, -0.1, -0.12, -0.1]);
  ctx.fillStyle = PAL.blue;
  fillPoly(ctx, [-0.03, -0.1, 0.03, -0.1, 0.02, 0.28, -0.02, 0.28]);
  ctx.fillRect(-0.165, 0.07, 0.33, 0.045);
  /* 소매와 부적 */
  ctx.fillStyle = '#c3cee6';
  fillPoly(ctx, [0.08, -0.06, 0.27, -0.02, 0.25, 0.1, 0.1, 0.06]);
  ctx.save();
  ctx.translate(0.27, -0.04);
  ctx.rotate(0.25);
  if (flash > 0) {
    ctx.fillStyle = `rgba(143,184,255,${0.5 * flash})`;
    fillCircle(ctx, 0, -0.05, 0.2);
  }
  ctx.fillStyle = PAL.yellow;
  ctx.fillRect(-0.045, -0.16, 0.09, 0.19);
  ctx.strokeStyle = PAL.red;
  ctx.lineWidth = 0.016;
  ctx.beginPath();
  ctx.moveTo(-0.02, -0.13); ctx.lineTo(0.02, -0.1); ctx.lineTo(-0.02, -0.07); ctx.lineTo(0.02, -0.04); ctx.lineTo(-0.015, -0.01);
  ctx.stroke();
  ctx.restore();
  /* 얼굴, 수염, 갓 */
  ctx.fillStyle = PAL.skin;
  fillCircle(ctx, 0, -0.18, 0.1);
  ctx.fillStyle = PAL.white;
  fillPoly(ctx, [-0.05, -0.12, 0.05, -0.12, 0, 0.0]);
  ctx.fillStyle = PAL.ink;
  fillCircle(ctx, -0.035, -0.19, 0.013);
  fillCircle(ctx, 0.04, -0.19, 0.013);
  ctx.fillStyle = 'rgba(12,14,26,.94)';
  fillEllipse(ctx, 0, -0.255, 0.26, 0.07);
  fillRoundRect(ctx, -0.09, -0.43, 0.18, 0.18, 0.03);
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  fillEllipse(ctx, 0, -0.265, 0.2, 0.035);
  /* 단계가 오르면 구슬이 주위를 돈다 */
  for (let i = 0; i < level; i++) {
    const a = t * 2 + i * Math.PI;
    const x = Math.cos(a) * 0.3;
    const y = -0.08 + Math.sin(a) * 0.09;
    ctx.fillStyle = 'rgba(143,184,255,.35)';
    fillCircle(ctx, x, y, 0.07);
    ctx.fillStyle = '#e8f1ff';
    fillCircle(ctx, x, y, 0.035);
  }
}

/* aim: 화면 좌표계 각도(라디안). o = { recoil, flash, t } */
function drawTowerSprite(ctx, type, level, aim, o) {
  const recoil = (o && o.recoil) || 0;
  const flash = (o && o.flash) || 0;
  const t = (o && o.t) || 0;
  drawPlatform(ctx, type, level);
  ctx.save();
  switch (type) {
    case 'archer': ctx.rotate(aim); drawArcherTop(ctx, level, recoil); break;
    case 'cannon': ctx.rotate(aim); drawCannonTop(ctx, level, recoil); break;
    case 'hwacha': ctx.rotate(aim); drawHwachaTop(ctx, level, recoil); break;
    case 'jangseung': ctx.translate(0, -0.06); drawJangseung(ctx, level, flash, t); break;
    case 'dosa': ctx.translate(0, -0.06); drawDosa(ctx, level, flash, t); break;
  }
  ctx.restore();
  drawPips(ctx, level);
}

/* ───────── 적 ───────── */

const IMP_COLORS = ['#58b592', '#5a93dc', '#9a82d8'];

function drawEyes(ctx, r, x1, x2, y, size, angry) {
  ctx.fillStyle = PAL.white;
  fillCircle(ctx, x1 * r, y * r, size * r);
  fillCircle(ctx, x2 * r, y * r, size * r * 0.95);
  ctx.fillStyle = PAL.ink;
  fillCircle(ctx, (x1 + size * 0.35) * r, y * r, size * r * 0.5);
  fillCircle(ctx, (x2 + size * 0.35) * r, y * r, size * r * 0.5);
  if (angry) {
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 0.13 * r;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo((x1 - size) * r, (y - size * 1.5) * r);
    ctx.lineTo((x1 + size * 0.8) * r, (y - size * 0.8) * r);
    ctx.moveTo((x2 + size) * r, (y - size * 1.5) * r);
    ctx.lineTo((x2 - size * 0.8) * r, (y - size * 0.8) * r);
    ctx.stroke();
  }
}

function drawImp(ctx, r, t, seed) {
  const step = Math.sin(t * 11 + seed);
  ctx.fillStyle = 'rgba(6,10,24,.35)';
  fillEllipse(ctx, 0, r * 0.95, r * 0.8, r * 0.22);
  ctx.fillStyle = '#17302c';
  fillEllipse(ctx, (-0.42 + step * 0.14) * r, 0.86 * r, 0.3 * r, 0.17 * r);
  fillEllipse(ctx, (0.42 - step * 0.14) * r, 0.86 * r, 0.3 * r, 0.17 * r);
  const by = -Math.abs(step) * 0.07 * r;
  ctx.fillStyle = PAL.yellow;
  fillPoly(ctx, [-0.2 * r, -0.8 * r + by, 0.2 * r, -0.8 * r + by, 0.06 * r, -1.5 * r + by]);
  ctx.fillStyle = IMP_COLORS[seed % IMP_COLORS.length];
  fillCircle(ctx, 0, by, r);
  ctx.fillStyle = 'rgba(255,255,255,.14)';
  fillEllipse(ctx, -0.3 * r, -0.45 * r + by, 0.42 * r, 0.26 * r, -0.5);
  ctx.save();
  ctx.translate(0, by);
  drawEyes(ctx, r, -0.1, 0.5, -0.18, 0.25, false);
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 0.1 * r;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0.22 * r, 0.25 * r, 0.3 * r, 0.25, 2.4);
  ctx.stroke();
  ctx.fillStyle = PAL.white;
  fillPoly(ctx, [0.3 * r, 0.5 * r, 0.46 * r, 0.44 * r, 0.4 * r, 0.7 * r]);
  ctx.restore();
}

function drawFox(ctx, r, t, seed, tails) {
  const step = Math.sin(t * 16 + seed);
  const big = tails > 1;
  const fur = big ? '#f1e2c2' : '#e8853a';
  const furDark = big ? '#cdb893' : '#b85f22';
  ctx.fillStyle = 'rgba(6,10,24,.35)';
  fillEllipse(ctx, 0, r * 0.85, r * 1.1, r * 0.22);
  /* 꼬리 */
  for (let i = 0; i < tails; i++) {
    const spread = tails > 1 ? -1.25 + (i / (tails - 1)) * 1.9 : -0.45;
    ctx.save();
    ctx.translate(-0.7 * r, 0.05 * r);
    ctx.rotate(spread + Math.sin(t * 5 + i + seed) * 0.12);
    ctx.fillStyle = i % 2 ? fur : furDark;
    fillEllipse(ctx, -0.65 * r, 0, 0.75 * r, 0.26 * r);
    ctx.fillStyle = big ? '#e0627a' : PAL.white;
    fillEllipse(ctx, -1.12 * r, 0, 0.28 * r, 0.19 * r);
    ctx.restore();
  }
  /* 다리 */
  ctx.strokeStyle = furDark;
  ctx.lineWidth = 0.2 * r;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-0.5 * r, 0.35 * r); ctx.lineTo((-0.5 + step * 0.25) * r, 0.85 * r);
  ctx.moveTo(0.45 * r, 0.35 * r); ctx.lineTo((0.45 - step * 0.25) * r, 0.85 * r);
  ctx.stroke();
  ctx.fillStyle = fur;
  fillEllipse(ctx, 0, 0.12 * r, 0.95 * r, 0.55 * r);
  /* 머리 */
  const hx = 0.78 * r;
  const hy = -0.38 * r;
  ctx.fillStyle = furDark;
  fillPoly(ctx, [hx - 0.42 * r, hy - 0.2 * r, hx - 0.3 * r, hy - 0.95 * r, hx - 0.02 * r, hy - 0.42 * r]);
  ctx.fillStyle = fur;
  fillPoly(ctx, [hx - 0.05 * r, hy - 0.4 * r, hx + 0.22 * r, hy - 0.98 * r, hx + 0.42 * r, hy - 0.25 * r]);
  fillCircle(ctx, hx, hy, 0.5 * r);
  ctx.fillStyle = PAL.white;
  fillEllipse(ctx, hx + 0.36 * r, hy + 0.17 * r, 0.3 * r, 0.2 * r, 0.2);
  ctx.fillStyle = PAL.ink;
  fillCircle(ctx, hx + 0.62 * r, hy + 0.12 * r, 0.08 * r);
  ctx.fillStyle = big ? PAL.red : PAL.ink;
  fillEllipse(ctx, hx + 0.12 * r, hy - 0.1 * r, 0.12 * r, 0.065 * r, -0.35);
}

function drawBrute(ctx, r, t, seed) {
  const step = Math.sin(t * 6 + seed);
  ctx.fillStyle = 'rgba(6,10,24,.38)';
  fillEllipse(ctx, 0, r * 0.92, r * 1.1, r * 0.24);
  ctx.fillStyle = '#2c3349';
  fillRoundRect(ctx, (-0.75 + step * 0.08) * r, 0.5 * r, 0.42 * r, 0.48 * r, 0.12 * r);
  fillRoundRect(ctx, (0.3 - step * 0.08) * r, 0.5 * r, 0.42 * r, 0.48 * r, 0.12 * r);
  ctx.fillStyle = '#5b6685';
  fillEllipse(ctx, 0, 0, 1.05 * r, 0.9 * r);
  ctx.strokeStyle = '#39415c';
  ctx.lineWidth = 0.11 * r;
  ctx.beginPath();
  ctx.arc(-0.1 * r, 0.1 * r, 0.75 * r, Math.PI * 1.05, Math.PI * 1.9);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-0.1 * r, 0.15 * r, 0.42 * r, Math.PI * 1.05, Math.PI * 1.9);
  ctx.stroke();
  ctx.fillStyle = '#aab3cc';
  for (let i = 0; i < 4; i++) {
    const a = Math.PI * (1.15 + i * 0.22);
    fillCircle(ctx, -0.1 * r + Math.cos(a) * 0.6 * r, 0.12 * r + Math.sin(a) * 0.6 * r, 0.055 * r);
  }
  ctx.fillStyle = '#6f7b9c';
  fillEllipse(ctx, 0.72 * r, 0.12 * r, 0.44 * r, 0.42 * r);
  ctx.strokeStyle = '#6f7b9c';
  ctx.lineWidth = 0.2 * r;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(1.05 * r, 0.2 * r);
  ctx.quadraticCurveTo(1.32 * r, 0.3 * r, 1.2 * r, 0.72 * r);
  ctx.stroke();
  ctx.fillStyle = PAL.white;
  fillPoly(ctx, [0.78 * r, 0.42 * r, 0.98 * r, 0.36 * r, 1.0 * r, 0.74 * r]);
  ctx.fillStyle = PAL.red;
  fillCircle(ctx, 0.74 * r, -0.04 * r, 0.085 * r);
}

function drawGhost(ctx, r, t, seed) {
  const fl = Math.sin(t * 3 + seed) * 0.12 * r;
  ctx.fillStyle = 'rgba(6,10,24,.25)';
  fillEllipse(ctx, 0, r * 1.05, r * 0.6, r * 0.16);
  ctx.save();
  ctx.translate(0, fl - 0.1 * r);
  ctx.fillStyle = 'rgba(160,200,255,.16)';
  fillCircle(ctx, 0, 0, 1.45 * r);
  ctx.globalAlpha *= 0.9;
  ctx.fillStyle = '#eaf1ff';
  const w = Math.sin(t * 5 + seed) * 0.08 * r;
  ctx.beginPath();
  ctx.moveTo(-0.76 * r, 0.95 * r);
  ctx.lineTo(-0.76 * r, -0.12 * r);
  ctx.arc(0, -0.12 * r, 0.76 * r, Math.PI, 0);
  ctx.lineTo(0.76 * r, 0.95 * r);
  ctx.quadraticCurveTo(0.5 * r, 0.6 * r + w, 0.25 * r, 0.95 * r);
  ctx.quadraticCurveTo(0, 0.6 * r - w, -0.25 * r, 0.95 * r);
  ctx.quadraticCurveTo(-0.5 * r, 0.6 * r + w, -0.76 * r, 0.95 * r);
  ctx.fill();
  /* 풀어헤친 머리 */
  ctx.fillStyle = '#1d1a2e';
  ctx.beginPath();
  ctx.moveTo(-0.84 * r, 0.5 * r);
  ctx.lineTo(-0.84 * r, -0.12 * r);
  ctx.arc(0, -0.12 * r, 0.84 * r, Math.PI, 0);
  ctx.lineTo(0.84 * r, 0.5 * r);
  ctx.lineTo(0.6 * r, 0.25 * r);
  ctx.quadraticCurveTo(0.55 * r, -0.5 * r, 0.1 * r, -0.55 * r);
  ctx.quadraticCurveTo(-0.5 * r, -0.5 * r, -0.52 * r, 0.3 * r);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1d1a2e';
  fillEllipse(ctx, -0.1 * r, -0.05 * r, 0.11 * r, 0.16 * r);
  fillEllipse(ctx, 0.3 * r, -0.05 * r, 0.11 * r, 0.16 * r);
  fillEllipse(ctx, 0.12 * r, 0.33 * r, 0.09 * r, 0.11 * r);
  ctx.restore();
}

function drawChief(ctx, r, t, seed) {
  const step = Math.sin(t * 7 + seed);
  ctx.fillStyle = 'rgba(6,10,24,.4)';
  fillEllipse(ctx, 0, r * 0.98, r * 0.95, r * 0.22);
  ctx.fillStyle = '#5c1e17';
  fillEllipse(ctx, (-0.42 + step * 0.12) * r, 0.9 * r, 0.32 * r, 0.16 * r);
  fillEllipse(ctx, (0.42 - step * 0.12) * r, 0.9 * r, 0.32 * r, 0.16 * r);
  const by = -Math.abs(step) * 0.05 * r;
  /* 방망이 */
  ctx.save();
  ctx.translate(0.95 * r, 0.25 * r + by);
  ctx.rotate(-0.5 + step * 0.12);
  ctx.fillStyle = PAL.woodDark;
  fillRoundRect(ctx, -0.09 * r, -1.25 * r, 0.18 * r, 1.3 * r, 0.06 * r);
  ctx.fillStyle = PAL.iron;
  fillRoundRect(ctx, -0.2 * r, -1.45 * r, 0.4 * r, 0.75 * r, 0.14 * r);
  ctx.fillStyle = PAL.yellow;
  for (let i = 0; i < 3; i++) {
    fillCircle(ctx, -0.1 * r, (-1.3 + i * 0.22) * r, 0.045 * r);
    fillCircle(ctx, 0.1 * r, (-1.2 + i * 0.22) * r, 0.045 * r);
  }
  ctx.restore();
  /* 뿔 */
  ctx.fillStyle = PAL.yellow;
  fillPoly(ctx, [-0.65 * r, -0.62 * r + by, -0.3 * r, -0.86 * r + by, -0.62 * r, -1.42 * r + by]);
  fillPoly(ctx, [0.65 * r, -0.62 * r + by, 0.3 * r, -0.86 * r + by, 0.62 * r, -1.42 * r + by]);
  ctx.fillStyle = PAL.red;
  fillCircle(ctx, 0, by, r);
  /* 호피 */
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, by, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = PAL.yellow;
  ctx.fillRect(-r, 0.52 * r + by, 2 * r, r);
  ctx.fillStyle = PAL.ink;
  for (let i = -3; i <= 3; i++) fillPoly(ctx, [(i * 0.28 - 0.06) * r, 0.52 * r + by, (i * 0.28 + 0.06) * r, 0.52 * r + by, i * 0.28 * r, 0.85 * r + by]);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  fillEllipse(ctx, -0.3 * r, -0.5 * r + by, 0.45 * r, 0.24 * r, -0.5);
  ctx.save();
  ctx.translate(0, by);
  drawEyes(ctx, r, -0.2, 0.42, -0.2, 0.2, true);
  ctx.fillStyle = PAL.ink;
  fillRoundRect(ctx, -0.22 * r, 0.12 * r, 0.75 * r, 0.24 * r, 0.1 * r);
  ctx.fillStyle = PAL.white;
  fillPoly(ctx, [-0.14 * r, 0.14 * r, 0.02 * r, 0.14 * r, -0.06 * r, -0.08 * r]);
  fillPoly(ctx, [0.3 * r, 0.14 * r, 0.46 * r, 0.14 * r, 0.38 * r, -0.08 * r]);
  ctx.restore();
}

function drawImugiSegment(ctx, r, i) {
  ctx.fillStyle = 'rgba(6,10,24,.3)';
  fillEllipse(ctx, 0, r * 0.75, r * 0.9, r * 0.25);
  ctx.fillStyle = i % 2 ? '#1c6a66' : '#22807a';
  fillCircle(ctx, 0, 0, r);
  ctx.fillStyle = PAL.yellow;
  fillCircle(ctx, 0, r * 0.45, r * 0.3);
  ctx.fillStyle = '#0f3b3b';
  fillPoly(ctx, [-0.25 * r, -0.85 * r, 0.25 * r, -0.85 * r, 0, -1.3 * r]);
}

function drawImugiHead(ctx, r, t) {
  ctx.fillStyle = 'rgba(6,10,24,.35)';
  fillEllipse(ctx, 0, r * 0.85, r * 1.1, r * 0.28);
  ctx.fillStyle = '#0f3b3b';
  fillPoly(ctx, [-0.5 * r, -0.7 * r, -0.2 * r, -0.85 * r, -0.62 * r, -1.5 * r]);
  fillPoly(ctx, [0.05 * r, -0.9 * r, 0.38 * r, -0.8 * r, 0.3 * r, -1.55 * r]);
  ctx.fillStyle = '#259088';
  fillEllipse(ctx, 0.1 * r, 0, 1.2 * r, 0.95 * r);
  ctx.fillStyle = '#2fa79c';
  fillEllipse(ctx, 0.75 * r, 0.22 * r, 0.7 * r, 0.52 * r);
  ctx.strokeStyle = PAL.yellow;
  ctx.lineWidth = 0.07 * r;
  ctx.lineCap = 'round';
  const sway = Math.sin(t * 4) * 0.2 * r;
  ctx.beginPath();
  ctx.moveTo(1.2 * r, 0.2 * r);
  ctx.quadraticCurveTo(1.7 * r, 0.1 * r + sway, 1.9 * r, 0.55 * r + sway);
  ctx.moveTo(1.15 * r, 0.4 * r);
  ctx.quadraticCurveTo(1.55 * r, 0.6 * r - sway, 1.6 * r, 1.0 * r - sway);
  ctx.stroke();
  ctx.fillStyle = PAL.yellow;
  fillCircle(ctx, 0.3 * r, -0.28 * r, 0.26 * r);
  ctx.fillStyle = PAL.redDark;
  fillEllipse(ctx, 0.36 * r, -0.28 * r, 0.09 * r, 0.2 * r);
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 0.1 * r;
  ctx.beginPath();
  ctx.moveTo(-0.02 * r, -0.62 * r);
  ctx.lineTo(0.6 * r, -0.45 * r);
  ctx.moveTo(0.5 * r, 0.5 * r);
  ctx.lineTo(1.3 * r, 0.42 * r);
  ctx.stroke();
  ctx.fillStyle = PAL.white;
  fillPoly(ctx, [0.75 * r, 0.47 * r, 0.9 * r, 0.46 * r, 0.82 * r, 0.72 * r]);
  fillPoly(ctx, [1.05 * r, 0.44 * r, 1.2 * r, 0.43 * r, 1.12 * r, 0.66 * r]);
}

/* 원점은 적의 중심. o = { flip, seed } — 길을 따라 늘어지는 이무기의 몸통은 렌더러가 따로 그린다. */
function drawEnemySprite(ctx, type, r, t, o) {
  const seed = (o && o.seed) || 0;
  ctx.save();
  if (o && o.flip) ctx.scale(-1, 1);
  switch (type) {
    case 'imp': drawImp(ctx, r, t, seed); break;
    case 'fox': drawFox(ctx, r, t, seed, 1); break;
    case 'gumiho': drawFox(ctx, r, t, seed, 9); break;
    case 'brute': drawBrute(ctx, r, t, seed); break;
    case 'ghost': drawGhost(ctx, r, t, seed); break;
    case 'chief': drawChief(ctx, r, t, seed); break;
    case 'imugi': drawImugiHead(ctx, r, t); break;
  }
  ctx.restore();
}

/* ───────── 지형지물 ───────── */

function drawPine(ctx, seed) {
  const lean = ((seed % 5) - 2) * 0.02;
  ctx.fillStyle = 'rgba(6,10,24,.35)';
  fillEllipse(ctx, 0.04, 0.36, 0.3, 0.09);
  ctx.strokeStyle = '#6b4630';
  ctx.lineWidth = 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0.36);
  ctx.quadraticCurveTo(0.06 + lean, 0.1, lean * 3, -0.2);
  ctx.stroke();
  const tiers = [[0.02, 0.02, 0.36, 0.13], [-0.03, -0.17, 0.3, 0.12], [0.03, -0.33, 0.21, 0.1]];
  for (const [x, y, rx, ry] of tiers) {
    ctx.fillStyle = '#16382f';
    fillEllipse(ctx, x + lean * 3, y + 0.03, rx, ry);
    ctx.fillStyle = '#245a48';
    fillEllipse(ctx, x + lean * 3, y, rx * 0.94, ry * 0.8);
    ctx.fillStyle = '#2f705a';
    fillEllipse(ctx, x + lean * 3 - rx * 0.25, y - ry * 0.25, rx * 0.45, ry * 0.35);
  }
}

/* 돌탑: 길손이 하나씩 얹고 간 돌무더기 */
function drawCairn(ctx, seed) {
  ctx.fillStyle = 'rgba(6,10,24,.35)';
  fillEllipse(ctx, 0.03, 0.33, 0.34, 0.1);
  const stones = [[0, 0.24, 0.3, 0.13], [0.02, 0.08, 0.23, 0.11], [-0.02, -0.06, 0.17, 0.09], [0.01, -0.18, 0.11, 0.07], [0, -0.27, 0.06, 0.045]];
  stones.forEach(([x, y, rx, ry], i) => {
    const sx = x + (((seed + i * 3) % 5) - 2) * 0.012;
    ctx.fillStyle = '#4c556f';
    fillEllipse(ctx, sx, y + 0.02, rx, ry);
    ctx.fillStyle = i % 2 ? '#8691ad' : '#7a85a1';
    fillEllipse(ctx, sx, y, rx, ry * 0.85);
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    fillEllipse(ctx, sx - rx * 0.3, y - ry * 0.3, rx * 0.4, ry * 0.3);
  });
}

function drawPond(ctx) {
  ctx.fillStyle = '#2c5a52';
  fillEllipse(ctx, 0, 0.04, 0.46, 0.36);
  ctx.fillStyle = '#17335c';
  fillEllipse(ctx, 0, 0.04, 0.41, 0.31);
  ctx.fillStyle = '#21467a';
  fillEllipse(ctx, -0.04, 0.0, 0.33, 0.22);
  ctx.fillStyle = 'rgba(244,236,216,.75)';
  fillEllipse(ctx, 0.1, 0.02, 0.085, 0.07);
  ctx.fillStyle = '#21467a';
  fillEllipse(ctx, 0.135, 0.005, 0.07, 0.06);
  ctx.fillStyle = '#3f8f6f';
  fillEllipse(ctx, -0.2, 0.15, 0.08, 0.05);
  fillEllipse(ctx, -0.1, -0.12, 0.06, 0.04);
}

function drawDeco(ctx, kind, seed) {
  if (kind === 'pine') drawPine(ctx, seed);
  else if (kind === 'cairn') drawCairn(ctx, seed);
  else if (kind === 'pond') drawPond(ctx);
}

/* 도깨비 굴: 길이 시작되는 곳. 푸른 도깨비불이 일렁인다. */
function drawBurrow(ctx, t) {
  ctx.fillStyle = '#3b4258';
  fillEllipse(ctx, 0, 0.05, 0.47, 0.37);
  ctx.fillStyle = '#080b18';
  fillEllipse(ctx, 0, 0.07, 0.37, 0.27);
  ctx.strokeStyle = 'rgba(127,212,255,.5)';
  ctx.lineWidth = 0.025;
  ctx.beginPath();
  ctx.ellipse(0, 0.07, 0.37, 0.27, 0, 0, Math.PI * 2);
  ctx.stroke();
  drawWisp(ctx, -0.36, -0.2, 0.11, t);
  drawWisp(ctx, 0.36, -0.2, 0.11, t + 1.7);
}

function drawWisp(ctx, x, y, s, t) {
  const f = Math.sin(t * 9) * 0.12 + Math.sin(t * 5.3) * 0.1;
  ctx.fillStyle = 'rgba(127,212,255,.22)';
  fillCircle(ctx, x, y, s * 2.1);
  ctx.fillStyle = PAL.flame;
  ctx.beginPath();
  ctx.moveTo(x - s, y + s * 0.3);
  ctx.quadraticCurveTo(x - s * 0.9, y - s * 0.6, x + f * s, y - s * (1.9 + f));
  ctx.quadraticCurveTo(x + s * 0.9, y - s * 0.6, x + s, y + s * 0.3);
  ctx.arc(x, y + s * 0.3, s, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#eafaff';
  fillCircle(ctx, x, y + s * 0.25, s * 0.5);
}

/* 마을 어귀: 기와를 얹은 문과 청사초롱 */
function drawGate(ctx, t, alarm) {
  ctx.fillStyle = 'rgba(6,10,24,.4)';
  fillEllipse(ctx, 0, 0.4, 0.46, 0.09);
  const glow = 0.26 + Math.sin(t * 2.2) * 0.05;
  ctx.fillStyle = alarm > 0 ? `rgba(226,87,43,${0.25 + alarm * 0.4})` : `rgba(244,185,58,${glow})`;
  fillCircle(ctx, 0, 0.05, 0.52);
  ctx.fillStyle = '#0b0f1e';
  ctx.fillRect(-0.24, -0.12, 0.48, 0.52);
  ctx.fillStyle = PAL.redDark;
  ctx.fillRect(-0.34, -0.14, 0.11, 0.54);
  ctx.fillRect(0.23, -0.14, 0.11, 0.54);
  ctx.fillStyle = PAL.red;
  ctx.fillRect(-0.32, -0.14, 0.06, 0.54);
  ctx.fillRect(0.25, -0.14, 0.06, 0.54);
  /* 단청 띠 */
  ctx.fillStyle = PAL.jadeDark;
  ctx.fillRect(-0.36, -0.2, 0.72, 0.075);
  ctx.fillStyle = PAL.yellow;
  for (let i = -3; i <= 3; i++) ctx.fillRect(i * 0.1 - 0.02, -0.185, 0.04, 0.045);
  /* 기와지붕: 처마 끝이 살짝 들린다 */
  ctx.fillStyle = '#2a3150';
  ctx.beginPath();
  ctx.moveTo(-0.5, -0.2);
  ctx.quadraticCurveTo(-0.3, -0.24, -0.2, -0.42);
  ctx.lineTo(0.2, -0.42);
  ctx.quadraticCurveTo(0.3, -0.24, 0.5, -0.2);
  ctx.lineTo(0.47, -0.26);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3a4268';
  ctx.fillRect(-0.21, -0.46, 0.42, 0.05);
  /* 초롱 */
  ctx.fillStyle = alarm > 0 ? PAL.red : PAL.yellow;
  fillRoundRect(ctx, -0.05, -0.08, 0.1, 0.14, 0.03);
  ctx.fillStyle = PAL.blue;
  ctx.fillRect(-0.05, -0.08, 0.1, 0.03);
  ctx.fillStyle = PAL.red;
  ctx.fillRect(-0.05, 0.03, 0.1, 0.03);
}

/* 엽전 */
function drawCoin(ctx, r) {
  ctx.fillStyle = '#b07d1c';
  fillCircle(ctx, 0, r * 0.08, r);
  ctx.fillStyle = PAL.yellow;
  fillCircle(ctx, 0, 0, r);
  ctx.fillStyle = '#b07d1c';
  ctx.fillRect(-r * 0.3, -r * 0.3, r * 0.6, r * 0.6);
}
