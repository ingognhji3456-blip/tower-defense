'use strict';
/* 철벽 요새 — 그림 공통 규격.

   좌표: 모든 그림은 "1 = 타일 한 칸" 인 좌표계에 그린다. +y 가 아래.
   빛은 왼쪽 위에서 온다. 왼쪽 면은 밝게, 오른쪽 면은 어둡게, 윗면은 가장 밝게.
   재질마다 [밝음, 중간, 어두움] 세 가지 색만 쓰고, 바깥 윤곽은 ART.OUT 색 선(굵기 ART.LW)으로 두른다.

   타워  TOWER_ART[type] = { body(ctx, level), top(ctx, level, aim, o), front?(ctx, level) }
         원점은 타일 중심. 건물은 타일 아래쪽(y≈+0.4)에 발을 딛고 위로 솟는다.
         body·front 는 움직이지 않는 부분(렌더러가 미리 그려 두고 재사용), top 은 매 프레임 그리는 부분(무기·빛·깃발).
         그리는 순서는 body → top → front.  level 은 0·1·2, aim 은 화면 기준 조준 각도(라디안),
         o = { recoil: 발사 직후 1 → 0, flash: 1 → 0, t: 초, load: 다음 공격 준비 0 → 1 (없으면 1로 본다) }.
         무기의 회전축은 (0, -TOWERS[type].levels[level].h) — 발사체가 그 높이에서 나간다.

   적    ENEMY_ART[type] = { draw(ctx, r, t, o), segment?(ctx, r, i, n, t) }
         원점은 몸의 중심, 발은 y≈+r 에 닿는다. 언제나 오른쪽을 보고 그린다(왼쪽으로 갈 때는 렌더러가 뒤집는다).
         r 은 몸 크기, t 는 초, o = { seed }.

   지형  TERRAIN_ART.deco[kind](ctx, seed) · TERRAIN_ART.cave(ctx, t) · TERRAIN_ART.gate(ctx, t, alarm)
         원점은 타일 중심. */

const TOWER_ART = {};
const ENEMY_ART = {};
const TERRAIN_ART = { deco: {} };

const ART = {
  OUT: '#2b2536',
  LW: 0.03,
  TILT: 0.62, // 위에서 비스듬히 내려다보는 정도: 수평으로 도는 무기의 세로 축을 이만큼 납작하게 그린다
  K: 0.36, // 둥근 탑의 윗면·밑면 타원 납작함 (세로 반지름 = 가로 반지름 × K)

  /* 재질: [밝음, 중간, 어두움] */
  stone: ['#e1e5ec', '#b5bdca', '#8690a2'],
  sand: ['#ecdcb8', '#cdb387', '#9d835c'],
  wood: ['#d9a162', '#b07642', '#7d4f2d'],
  darkwood: ['#8d5d3a', '#6b432a', '#48291a'],
  thatch: ['#f3dc7c', '#d6b44a', '#a3832b'],
  red: ['#f0694c', '#cf4430', '#962b24'],
  blue: ['#6f9ff2', '#4674d0', '#2e4e9b'],
  green: ['#6fcc76', '#3f9e4f', '#2a7039'],
  orange: ['#ffad55', '#ee8530', '#b85b1b'],
  purple: ['#cba6ff', '#9a6bea', '#6640b4'],
  ice: ['#ecfbff', '#9cddf8', '#52a8dc'],
  iron: ['#808a9d', '#586275', '#373f50'],
  steel: ['#d8dfea', '#a7b2c4', '#74809a'],
  gold: ['#ffe27e', '#f4b93a', '#b87c19'],
  bone: ['#fcf5e3', '#e3d6ba', '#b4a486'],

  /* 땅 */
  grass: ['#8ed05c', '#84c653'],
  grassDark: '#62a544',
  grassLight: '#a9e072',
  path: '#e3c792',
  pathEdge: '#b08d58',
  pathDark: '#c9aa72',
  shadow: 'rgba(22,40,24,.26)',
};

/* ───────── 도형 도우미 ───────── */

/* [x0, y0, x1, y1, …] 꼭짓점으로 경로를 만든다. */
function artPath(ctx, pts, open) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  if (!open) ctx.closePath();
}

/* 지금 경로를 칠하고 윤곽선을 두른다. lw 를 0 으로 주면 윤곽선 없이 칠만 한다. */
function artFill(ctx, fill, lw) {
  ctx.fillStyle = fill;
  ctx.fill();
  const w = lw == null ? ART.LW : lw;
  if (w > 0) {
    ctx.strokeStyle = ART.OUT;
    ctx.lineWidth = w;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

function artPoly(ctx, fill, pts, lw) {
  artPath(ctx, pts);
  artFill(ctx, fill, lw);
}

function artEllipse(ctx, fill, x, y, rx, ry, lw, rot) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
  artFill(ctx, fill, lw);
}

function artCircle(ctx, fill, x, y, r, lw) {
  artEllipse(ctx, fill, x, y, r, r, lw);
}

function artRect(ctx, fill, x, y, w, h, radius, lw) {
  const r = Math.min(radius || 0, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  if (r > 0) {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  } else {
    ctx.rect(x, y, w, h);
  }
  artFill(ctx, fill, lw);
}

/* 열린 꺾은선 (끝이 둥근 선) */
function artLine(ctx, color, pts, width) {
  artPath(ctx, pts, true);
  ctx.strokeStyle = color;
  ctx.lineWidth = width == null ? ART.LW : width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

/* 땅에 지는 그림자 */
function artShadow(ctx, x, y, rx, ry) {
  ctx.fillStyle = ART.shadow;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/* 은은한 빛. rgb 는 '255,220,120' 꼴. */
function artGlow(ctx, x, y, r, rgb, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(' + rgb + ',' + (alpha == null ? 0.6 : alpha) + ')');
  g.addColorStop(1, 'rgba(' + rgb + ',0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/* 둥근 면의 음영: 왼쪽 위에서 빛을 받아 둥글게 말려 들어가는 느낌 */
function artRound(ctx, tones, x, r) {
  const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, tones[1]);
  g.addColorStop(0.2, tones[0]);
  g.addColorStop(0.38, tones[0]);
  g.addColorStop(0.62, tones[1]);
  g.addColorStop(0.86, tones[2]);
  g.addColorStop(1, tones[2]);
  return g;
}

/* 비스듬히 내려다본 둥근 기둥(위아래 반지름이 달라도 된다).
   tones = [밝음, 중간, 어두움]. o.top === false 면 윗면을 그리지 않는다. o.topFill 로 윗면 색을 바꾼다. */
function artCylinder(ctx, tones, x, yTop, yBot, rTop, rBot, o) {
  const k = ART.K;
  ctx.beginPath();
  ctx.moveTo(x - rTop, yTop);
  ctx.lineTo(x - rBot, yBot);
  ctx.ellipse(x, yBot, rBot, rBot * k, 0, Math.PI, 0, true);
  ctx.lineTo(x + rTop, yTop);
  ctx.ellipse(x, yTop, rTop, rTop * k, 0, 0, Math.PI, false);
  ctx.closePath();
  artFill(ctx, artRound(ctx, tones, x, Math.max(rTop, rBot)));
  if (!o || o.top !== false) artEllipse(ctx, (o && o.topFill) || tones[0], x, yTop, rTop, rTop * k);
}

/* 모서리를 앞으로 두고 본 네모 탑: 왼쪽 면(밝음)과 오른쪽 면(어두움)이 가운데 모서리에서 만난다.
   wTop·wBot 은 위·아래에서의 반너비. o.top === false 면 윗면(마름모)을 그리지 않는다. */
function artBox(ctx, tones, x, yTop, yBot, wTop, wBot, o) {
  const k = ART.K;
  artPoly(ctx, tones[1], [x - wTop, yTop, x, yTop + wTop * k, x, yBot + wBot * k, x - wBot, yBot]);
  artPoly(ctx, tones[2], [x + wTop, yTop, x, yTop + wTop * k, x, yBot + wBot * k, x + wBot, yBot]);
  if (!o || o.top !== false) {
    artPoly(ctx, (o && o.topFill) || tones[0], [x - wTop, yTop, x, yTop - wTop * k, x + wTop, yTop, x, yTop + wTop * k]);
  }
}

/* 원뿔 지붕. 왼쪽이 밝고 오른쪽이 어둡다. */
function artCone(ctx, tones, x, yTip, yBase, rBase) {
  const k = ART.K;
  ctx.beginPath();
  ctx.moveTo(x, yTip);
  ctx.lineTo(x - rBase, yBase);
  ctx.ellipse(x, yBase, rBase, rBase * k, 0, Math.PI, 0, true);
  ctx.closePath();
  artFill(ctx, artRound(ctx, tones, x, rBase));
}

/* 둥근 지붕(돔). */
function artDome(ctx, tones, x, yBase, r, hgt) {
  const k = ART.K;
  ctx.beginPath();
  ctx.moveTo(x - r, yBase);
  ctx.bezierCurveTo(x - r, yBase - hgt * 1.25, x + r, yBase - hgt * 1.25, x + r, yBase);
  ctx.ellipse(x, yBase, r, r * k, 0, 0, Math.PI, false);
  ctx.closePath();
  artFill(ctx, artRound(ctx, tones, x, r));
}

/* 바람에 날리는 삼각 깃발. (x, y) 는 깃대에 매인 위쪽 끝, len 은 길이(음수면 왼쪽으로 날린다). */
function artFlag(ctx, tones, x, y, len, hgt, t) {
  const w = Math.sin((t || 0) * 4 + x * 9) * hgt * 0.22;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + len * 0.5, y + w, x + len, y + hgt * 0.5 + w * 0.6);
  ctx.quadraticCurveTo(x + len * 0.5, y + hgt * 0.6 + w, x, y + hgt);
  ctx.closePath();
  artFill(ctx, tones[1], ART.LW * 0.8);
}

/* 괴수의 빛나는 눈 */
function artEye(ctx, x, y, r, color) {
  artCircle(ctx, ART.OUT, x, y, r * 1.25, 0);
  artCircle(ctx, color || '#ffe95a', x, y, r, 0);
  artCircle(ctx, '#ffffff', x - r * 0.3, y - r * 0.32, r * 0.36, 0);
}

/* 수평으로 도는 무기를 비스듬히 내려다본 화면 방향.
   f = 겨누는 쪽, s = 그 오른쪽. toward 가 양수면 무기가 보는 사람 쪽(화면 아래)을 향한다. */
function artAim(aim) {
  const c = Math.cos(aim);
  const s = Math.sin(aim);
  return { fx: c, fy: s * ART.TILT, sx: -s, sy: c * ART.TILT, toward: s };
}

/* 화면의 두 점을 잇는 둥근 통(포신·통나무·로켓). 굵기는 눌리지 않아 입체로 보인다.
   ra·rb 는 양 끝의 반지름, capA·capB 는 양 끝이 얼마나 볼록한지(0 = 납작, 1 = 반구).
   빛을 받는 쪽 절반은 밝게, 반대쪽은 어둡게 칠한다. 축(ux, uy)과 빛 쪽 법선(nx, ny)을 돌려준다. */
function artTube(ctx, tones, ax, ay, bx, by, ra, rb, capA, capB) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1e-6;
  const ux = dx / len;
  const uy = dy / len;
  let nx = -uy;
  let ny = ux;
  if (nx + ny > 0) { nx = -nx; ny = -ny; } /* n 은 빛이 오는 쪽(왼쪽 위) */
  const ang = Math.atan2(uy, ux);
  const ca = capA == null ? 0.35 : capA;
  const cb = capB == null ? 0.35 : capB;
  const body = (k0, k1) => {
    ctx.beginPath();
    ctx.moveTo(ax + nx * ra * k0, ay + ny * ra * k0);
    ctx.lineTo(bx + nx * rb * k0, by + ny * rb * k0);
    ctx.lineTo(bx + nx * rb * k1, by + ny * rb * k1);
    ctx.lineTo(ax + nx * ra * k1, ay + ny * ra * k1);
    ctx.closePath();
  };
  if (ca > 0) artEllipse(ctx, tones[1], ax, ay, ra * ca, ra, ART.LW, ang);
  if (cb > 0) artEllipse(ctx, tones[1], bx, by, rb * cb, rb, ART.LW, ang);
  body(1, -1);
  artFill(ctx, tones[1]);
  body(0.9, 0.3);
  artFill(ctx, tones[0], 0);
  body(-0.25, -0.9);
  artFill(ctx, tones[2], 0);
  return { ux, uy, nx, ny, ang };
}

/* 통을 두르는 띠(쇠테·금테). (x, y) 는 통 축 위의 점, tube 는 artTube 가 돌려준 값. */
function artBand(ctx, tones, x, y, tube, r, w) {
  const { ux, uy, nx, ny } = tube;
  const q = (a, b) => [x + ux * a + nx * b, y + uy * a + ny * b];
  const h = w / 2;
  artPoly(ctx, tones[1], [...q(-h, r), ...q(h, r), ...q(h, -r), ...q(-h, -r)]);
  artPoly(ctx, tones[0], [...q(-h, r * 0.9), ...q(h, r * 0.9), ...q(h, r * 0.3), ...q(-h, r * 0.3)], 0);
  artPoly(ctx, tones[2], [...q(-h, -r * 0.3), ...q(h, -r * 0.3), ...q(h, -r * 0.9), ...q(-h, -r * 0.9)], 0);
}

/* 통의 끝 단면(포구 등). 축 방향 (dx, dy) 로 눕힌 타원 — toward(0~1)만큼 속이 들여다보인다. */
function artTubeEnd(ctx, fill, x, y, r, dx, dy, toward) {
  const ang = Math.atan2(dy, dx);
  artEllipse(ctx, fill, x, y, Math.max(r * 0.16, r * 0.8 * Math.abs(toward)), r, ART.LW, ang);
}

/* 수평으로 aim 만큼 돌린 상자를 비스듬히 내려다본 모습. (cx, cy) 는 윗면의 중심,
   hl·hw 는 앞뒤·좌우 반길이, hgt 는 높이. 보이는 옆면과 윗면을 칠한다.
   돌아오는 P(u, v) 는 윗면 위의 점(u = 앞쪽, v = 오른쪽)을 화면 좌표로 바꿔 준다. */
function artPrism(ctx, tones, cx, cy, hl, hw, hgt, aim, topFill) {
  const a = artAim(aim);
  const P = (u, v) => [cx + a.fx * u + a.sx * v, cy + a.fy * u + a.sy * v];
  const c = [P(hl, -hw), P(hl, hw), P(-hl, hw), P(-hl, -hw)];
  const normals = [[a.fx, a.fy], [a.sx, a.sy], [-a.fx, -a.fy], [-a.sx, -a.sy]];
  for (let i = 0; i < 4; i++) {
    const n = normals[i];
    if (n[1] <= 0.02) continue; /* 보는 사람을 등진 면 */
    const p = c[i];
    const q = c[(i + 1) % 4];
    artPoly(ctx, n[0] < 0 ? tones[1] : tones[2], [p[0], p[1], q[0], q[1], q[0], q[1] + hgt, p[0], p[1] + hgt]);
  }
  artPoly(ctx, topFill || tones[0], [c[0][0], c[0][1], c[1][0], c[1][1], c[2][0], c[2][1], c[3][0], c[3][1]]);
  return { P, a, corners: c };
}

/* 굵은 윤곽을 두른 곡선·꺾은선(활대, 밧줄, 뿔 등). pts 는 P() 로 구한 화면 좌표들. */
function artStroke(ctx, color, pts, width) {
  artLine(ctx, ART.OUT, pts, width + ART.LW * 1.6);
  artLine(ctx, color, pts, width);
}

/* ───────── 탑을 꾸미는 소품 ───────── */

/* 벽에 건 등불 */
function artLantern(ctx, x, y, s) {
  const k = s || 1;
  artLine(ctx, ART.OUT, [x, y - 0.075 * k, x, y - 0.03 * k], 0.03 * k);
  artGlow(ctx, x, y + 0.01 * k, 0.11 * k, '255,214,107', 0.55);
  artPoly(ctx, ART.iron[1], [x - 0.04 * k, y - 0.03 * k, x, y - 0.065 * k, x + 0.04 * k, y - 0.03 * k], ART.LW * 0.6);
  artRect(ctx, '#ffd66b', x - 0.03 * k, y - 0.03 * k, 0.06 * k, 0.07 * k, 0.012 * k, ART.LW * 0.7);
  artRect(ctx, '#fff6cf', x - 0.012 * k, y - 0.018 * k, 0.024 * k, 0.04 * k, 0.008 * k, 0);
  artRect(ctx, ART.iron[1], x - 0.035 * k, y + 0.04 * k, 0.07 * k, 0.018 * k, 0.005 * k, ART.LW * 0.5);
}

/* 문장이 든 방패 */
function artShield(ctx, x, y, s, tones, emblem) {
  artPoly(ctx, tones[1], [x - s, y - s, x + s, y - s, x + s, y + s * 0.3, x, y + s * 1.2, x - s, y + s * 0.3]);
  artPoly(ctx, tones[0], [x - s, y - s, x - s * 0.15, y - s, x - s * 0.15, y + s * 1.02, x - s, y + s * 0.3], 0);
  artCircle(ctx, emblem || ART.gold[1], x, y - s * 0.05, s * 0.36, ART.LW * 0.5);
}

/* 둥근 것(포탄·열매) 무더기 */
function artPile(ctx, x, y, r, tones) {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1.55]]) {
    artCircle(ctx, tones[1], x + dx * r, y + dy * r, r);
    artCircle(ctx, tones[0], x + dx * r - r * 0.3, y + dy * r - r * 0.35, r * 0.32, 0);
  }
}

/* 통(술통·화약통). 띠 색을 바꿀 수 있다. */
function artBarrel(ctx, x, y, w, h, tones, band) {
  ctx.beginPath();
  ctx.moveTo(x - w * 0.82, y - h);
  ctx.quadraticCurveTo(x - w * 1.15, y - h * 0.5, x - w * 0.82, y);
  ctx.lineTo(x + w * 0.82, y);
  ctx.quadraticCurveTo(x + w * 1.15, y - h * 0.5, x + w * 0.82, y - h);
  ctx.closePath();
  artFill(ctx, tones[1]);
  artRect(ctx, tones[0], x - w * 0.62, y - h * 0.94, w * 0.36, h * 0.88, w * 0.1, 0);
  for (const f of [0.26, 0.74]) artLine(ctx, band || ART.iron[1], [x - w * 0.98, y - h * f, x + w * 0.98, y - h * f], h * 0.11);
  artEllipse(ctx, tones[2], x, y - h, w * 0.82, w * 0.26, ART.LW * 0.8);
}

/* 덩굴 */
function artIvy(ctx, pts) {
  artLine(ctx, '#2f7d3e', pts, 0.022);
  for (let i = 0; i < pts.length; i += 2) {
    artEllipse(ctx, i % 4 ? '#6fcc76' : '#3f9e4f', pts[i] + (i % 4 ? 0.03 : -0.03), pts[i + 1], 0.036, 0.024, ART.LW * 0.5, i % 4 ? 0.6 : -0.6);
  }
}

/* ───────── 탑 몸통을 짓는 도우미 ───────── */

/* 그림자와 두 단짜리 둥근 기단 */
function artPlinth(ctx, tones, topFill) {
  artShadow(ctx, 0.07, 0.33, 0.47, 0.15);
  artCylinder(ctx, [tones[1], tones[2], tones[2]], 0, 0.27, 0.32, 0.44, 0.45, { topFill: tones[1] });
  artCylinder(ctx, tones, 0, 0.2, 0.27, 0.39, 0.4, { topFill: topFill || tones[0] });
}

/* 둥근 탑의 앞면을 감싸는 띠 */
function artHoop(ctx, x, y, r, color, width, outlined) {
  const arc = () => {
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * ART.K, 0, 0.1, Math.PI - 0.1);
  };
  ctx.lineCap = 'round';
  if (outlined) {
    arc();
    ctx.strokeStyle = ART.OUT;
    ctx.lineWidth = width + ART.LW * 1.6;
    ctx.stroke();
  }
  arc();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

/* 둥근 탑의 돌 켜와 벽돌 금. 위아래 반지름이 달라도 된다. */
function artCourses(ctx, x, yTop, yBot, rTop, rBot, rows, rgb) {
  const c = rgb || '43,37,54';
  const rAt = (y) => rTop + ((rBot - rTop) * (y - yTop)) / (yBot - yTop);
  const step = (yBot - yTop) / (rows + 1);
  for (let i = 1; i <= rows; i++) {
    const y = yBot - step * i;
    artHoop(ctx, x, y, rAt(y), 'rgba(' + c + ',.3)', 0.013);
    for (let k = -2; k <= 2; k++) {
      const a = Math.PI / 2 + (k + (i % 2) * 0.5) * 0.52;
      const px = x + Math.cos(a) * rAt(y);
      const py = y + Math.sin(a) * rAt(y) * ART.K;
      artLine(ctx, 'rgba(' + c + ',.22)', [px, py + 0.01, px, py + step - 0.01], 0.011);
    }
  }
}

/* 아치 모양(문·창). (x, yBase) 는 바닥 가운데. */
function artArch(ctx, fill, x, yBase, halfW, hgt, lw) {
  ctx.beginPath();
  ctx.moveTo(x - halfW, yBase);
  ctx.lineTo(x - halfW, yBase - hgt + halfW);
  ctx.arc(x, yBase - hgt + halfW, halfW, Math.PI, 0);
  ctx.lineTo(x + halfW, yBase);
  ctx.closePath();
  artFill(ctx, fill, lw);
}

/* 2차 곡선을 꺾은선 좌표로 */
function artCurve(x0, y0, cx, cy, x1, y1, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push(u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1);
  }
  return pts;
}

/* 네 갈래로 반짝이는 빛 */
function artSparkle(ctx, x, y, s, color, alpha) {
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  artPoly(ctx, color || '#ffffff', [x, y - s, x + s * 0.25, y - s * 0.25, x + s, y, x + s * 0.25, y + s * 0.25, x, y + s, x - s * 0.25, y + s * 0.25, x - s, y, x - s * 0.25, y - s * 0.25], 0);
  ctx.globalAlpha = 1;
}

/* ───────── 그리기 진입점 ───────── */

function drawTowerSprite(ctx, type, level, aim, o) {
  const art = TOWER_ART[type];
  if (!art) return;
  const opt = o || {};
  if (opt.recoil == null) opt.recoil = 0;
  if (opt.flash == null) opt.flash = 0;
  if (opt.t == null) opt.t = 0;
  art.body(ctx, level);
  art.top(ctx, level, aim, opt);
  if (art.front) art.front(ctx, level);
}

function drawEnemySprite(ctx, type, r, t, o) {
  const art = ENEMY_ART[type];
  if (!art) return;
  ctx.save();
  if (o && o.flip) ctx.scale(-1, 1);
  art.draw(ctx, r, t, o || { seed: 0 });
  ctx.restore();
}
