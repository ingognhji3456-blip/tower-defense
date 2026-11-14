'use strict';
/* 심연의 군주 — 건물이 아니라 전장에 직접 서는 영웅. 둥근 머리에 선으로 된 몸, 곧 막대 인간(졸라맨) 꼴이다.
   두 손에서 쌍광선을 쏘고 박쥐 떼를 부린다.
   1단 「떠돌이 군주」: 맨몸에 작은 뿔, 목에 감아 뒤로 날리는 보랏빛 목도리, 금 팔찌.
   2단 「심연의 기사」: 깃을 세운 망토, 가시 돋친 어깨 갑옷, 강철 팔·정강이 덮개, 금 허리띠, 더 자란 뿔.
   3단 「심연의 황제」: 금관과 큰 뿔, 발끝까지 내려오는 별무늬 망토, 금 갑옷과 가슴의 심연석,
                       등 뒤의 빛 날개, 몸을 도는 구슬. 땅에서 떠 있다.

   body 는 발밑의 소환진(움직이지 않는 부분), top 은 군주 자신.
   top 의 o 에는 { recoil, flash, t } 말고도 다음 값이 들어올 수 있다.
     charge  쏘기 직전 두 손에 기를 모으는 정도 (0 → 1): 무릎을 굽히고 두 팔을 겨눈다
     cast    박쥐를 부르는 몸짓 (1 → 0): 한 팔을 치켜들고 다른 팔을 뒤로 뻗는다
   hands(level, aim) 은 쏘는 순간 두 손의 위치(타일 중심 기준)를 돌려준다 — 광선이 거기서 나간다.
   minion(ctx, level, t, bite) 는 박쥐 한 마리를 그린다. */
(function () {
  const BODY = ['#ffa3d8', '#ff4fa8', '#c0297a']; /* 몸: 밝은 곳, 앞쪽 팔다리, 뒤쪽 팔다리 */
  const CAPE = ['#5a50a6', '#332b6c', '#1e1944']; /* 망토 겉감 */
  const INNER = ['#a48ff0', '#6a55c8', '#473692']; /* 망토 안감·목도리 */
  const STEEL = ['#b3b0cf', '#737095', '#413e60']; /* 검은 강철 */
  const HORN = ['#6a6288', '#3f3a5c', '#26223c'];
  const BAT = ['#8163c9', '#4d3789', '#2c1f55'];
  const OB = ['#625d7e', '#3d3955', '#272439']; /* 흑요석 */
  const G = ART.gold;
  const EYE = '#fff6cf';
  const GLOW = '255,95,184';
  const K = ART.K;
  const FEET = 0.2;
  const SCALE = [1.3, 1.42, 1.56];
  const W = 0.054; /* 팔다리 굵기 */
  const LIMB = 0.16; /* 허벅지·정강이 길이 */
  const ARM = 0.14; /* 위팔·아래팔 길이 */

  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

  /* 몸짓을 정한다. 모든 좌표는 "두 발 사이가 원점, 오른쪽을 본다" 는 몸 기준 좌표. */
  function pose(level, aim, o) {
    const t = o.t || 0;
    const cast = o.cast || 0;
    const castK = Math.min(1, (1 - cast) * 6) * Math.min(1, cast * 3.5);
    const fire = o.recoil > 0 ? Math.min(1, o.recoil * 1.5) : 0;
    const aimK = Math.max(o.charge || 0, fire > 0 ? 1 : 0) * (1 - castK);
    let ax = Math.abs(Math.cos(aim));
    let ay = Math.sin(aim) * ART.TILT;
    const al = Math.hypot(ax, ay) || 1;
    ax /= al;
    ay /= al;
    const thA = Math.atan2(ay, ax);
    const float = level === 2;
    const bob = Math.sin(t * 2.6) * 0.006;
    /* 겨눌 때는 무릎을 굽혀 앞으로 숙이고, 쏘는 순간 뒤로 젖혀진다 */
    const crouch = float ? 0 : aimK * 0.045;
    const lunge = float ? 0 : aimK * 0.075;
    const lean = aimK * 0.12 - fire * 0.24 - castK * 0.1;
    const hip = [-lunge * 0.3 - fire * 0.02, -0.3 + crouch + bob];
    const neck = [hip[0] + Math.sin(lean) * 0.3, hip[1] - Math.cos(lean) * 0.3];
    const head = [neck[0] + Math.sin(lean) * 0.115 + 0.012, neck[1] - Math.cos(lean) * 0.115];
    const arm = (side) => {
      /* side: -1 = 몸 뒤쪽 팔, +1 = 앞쪽 팔 */
      const sh = [neck[0] + side * 0.02, neck[1] + 0.04];
      const rest = Math.PI / 2 + (side < 0 ? 0.42 : -0.36);
      const up = side > 0 ? -Math.PI / 2 + 0.2 : Math.PI + 0.3;
      let th = rest + (thA - side * 0.13 - rest) * aimK;
      th += (up - th) * castK;
      const bend = (side < 0 ? -0.5 : 0.5) * (1 - aimK) * (1 - castK) + castK * 0.15 * side;
      const len = ARM * (1 + fire * 0.08);
      const el = [sh[0] + Math.cos(th + bend) * len, sh[1] + Math.sin(th + bend) * len];
      const hd = [el[0] + Math.cos(th - bend) * len, el[1] + Math.sin(th - bend) * len];
      return { sh, el, hd };
    };
    const leg = (side) => {
      /* 발 자리를 먼저 정하고, 무릎은 그 사이에서 앞으로 꺾인다 */
      const foot = float
        ? [side < 0 ? -0.05 + Math.sin(t * 2.2) * 0.008 : 0.06, side < 0 ? -0.04 : -0.005]
        : [side < 0 ? -0.085 - lunge : 0.085 + lunge * 1.2, 0];
      const dx = foot[0] - hip[0];
      const dy = foot[1] - hip[1];
      const n = Math.hypot(dx, dy) || 1;
      const d = Math.min(n, LIMB * 2 - 0.001);
      const out = Math.sqrt(Math.max(0, LIMB * LIMB - (d / 2) * (d / 2)));
      const knee = [hip[0] + dx / 2 + (dy / n) * out, hip[1] + dy / 2 - (dx / n) * out];
      const toe = float ? [foot[0] + 0.04, foot[1] + 0.04] : [foot[0] + 0.06, foot[1]];
      return { knee, foot, toe };
    };
    return {
      s: SCALE[level],
      dir: Math.cos(aim) >= 0 ? 1 : -1,
      hover: float ? 0.08 + 0.016 * Math.sin(t * 2.2) + castK * 0.03 : castK * 0.015,
      t, castK, fire, aimK, hip, neck, head,
      armB: arm(-1),
      armF: arm(1),
      legB: leg(-1),
      legF: leg(1),
    };
  }

  function quad(ctx, pts) {
    /* [x0, y0, cx, cy, x1, y1, cx, cy, x2, y2 …] 꼴의 굽은 경로 */
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 4) ctx.quadraticCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3]);
    ctx.closePath();
  }

  /* 등 뒤의 빛 날개 (3단) */
  function wings(ctx, p) {
    const flap = Math.sin(p.t * 3) * 0.035 + p.castK * 0.07 + p.fire * 0.05;
    const pulse = 0.5 + 0.5 * Math.sin(p.t * 4);
    const rx = p.neck[0] - 0.02;
    const ry = p.neck[1] + 0.07;
    for (const sgn of [-1, 1]) {
      const k = sgn < 0 ? 1 : 0.82;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.quadraticCurveTo(rx + sgn * 0.16 * k, ry - 0.27 - flap, rx + sgn * 0.48 * k, ry - 0.27 - flap);
      ctx.quadraticCurveTo(rx + sgn * 0.46 * k, ry - 0.14, rx + sgn * 0.42 * k, ry + 0.02);
      ctx.quadraticCurveTo(rx + sgn * 0.36 * k, ry - 0.08, rx + sgn * 0.3 * k, ry + 0.1);
      ctx.quadraticCurveTo(rx + sgn * 0.24 * k, ry, rx + sgn * 0.17 * k, ry + 0.15);
      ctx.quadraticCurveTo(rx + sgn * 0.12 * k, ry + 0.05, rx, ry + 0.16);
      ctx.closePath();
      ctx.fillStyle = 'rgba(214,74,166,' + (0.74 + pulse * 0.1 + p.fire * 0.15) + ')';
      ctx.fill();
      ctx.strokeStyle = ART.OUT;
      ctx.lineWidth = ART.LW;
      ctx.lineJoin = 'round';
      ctx.stroke();
      /* 날개 살 */
      ctx.strokeStyle = 'rgba(255,196,232,.9)';
      ctx.lineWidth = 0.011;
      for (const [ex, ey] of [[0.42, 0.02], [0.3, 0.1], [0.17, 0.15]]) {
        ctx.beginPath();
        ctx.moveTo(rx + sgn * 0.03, ry - 0.02);
        ctx.quadraticCurveTo(rx + sgn * ex * k * 0.7, ry - 0.2, rx + sgn * ex * k, ry + ey);
        ctx.stroke();
      }
    }
  }

  /* 1단의 목도리 자락, 2·3단의 망토 */
  function cape(ctx, level, p) {
    const sway = Math.sin(p.t * 1.8) * 0.02;
    const flare = p.fire * 0.1 + p.castK * 0.13 + p.aimK * 0.03;
    const nx = p.neck[0];
    const ny = p.neck[1];
    if (level === 0) {
      quad(ctx, [nx + 0.01, ny + 0.03, nx - 0.1, ny - 0.035 + sway, nx - 0.3 - flare, ny + 0.02 + sway * 2, nx - 0.27 - flare, ny + 0.075, nx - 0.2 - flare * 0.6, ny + 0.08 + sway, nx - 0.22, ny + 0.15, nx - 0.31 - flare, ny + 0.23 + sway * 2, nx - 0.13, ny + 0.19, nx - 0.03, ny + 0.08]);
      artFill(ctx, INNER[1]);
      artLine(ctx, INNER[0], [nx - 0.06, ny + 0.02, nx - 0.2 - flare * 0.5, ny + 0.035 + sway], 0.014);
      artLine(ctx, INNER[2], [nx - 0.07, ny + 0.1, nx - 0.2 - flare * 0.5, ny + 0.17 + sway], 0.012);
      return;
    }
    const hem = level === 2 ? 0.02 : -0.1;
    const w = 0.2 + flare;
    /* 겉감: 뒤로 날리는 쪽 */
    ctx.beginPath();
    ctx.moveTo(nx - 0.07, ny + 0.03);
    ctx.quadraticCurveTo(-w - 0.11, -0.38, -w - 0.08 + sway, hem - 0.01);
    if (level === 2) {
      /* 들쭉날쭉한 단 */
      ctx.lineTo(-w + 0.01 + sway, hem + 0.045);
      ctx.lineTo(-w * 0.72, hem - 0.03);
      ctx.lineTo(-w * 0.45 + sway, hem + 0.04);
      ctx.lineTo(-0.06, hem - 0.03);
      ctx.lineTo(0.0, hem + 0.035);
      ctx.lineTo(0.06, hem - 0.03);
      ctx.lineTo(0.09 + flare * 0.7, hem + 0.03);
    } else {
      ctx.lineTo(-w * 0.55 + sway, hem + 0.035);
      ctx.lineTo(-0.08, hem);
      ctx.lineTo(0.02, hem + 0.03);
    }
    ctx.lineTo(0.12 + flare * 0.9, hem - 0.03);
    ctx.quadraticCurveTo(0.16 + flare * 0.9, -0.3, nx + 0.06, ny + 0.03);
    ctx.closePath();
    artFill(ctx, CAPE[1]);
    /* 안감: 몸 뒤로 들여다보이는 쪽 */
    ctx.beginPath();
    ctx.moveTo(nx - 0.045, ny + 0.07);
    ctx.lineTo(-0.11, hem - 0.03);
    if (level === 2) {
      ctx.lineTo(-0.06, hem - 0.03);
      ctx.lineTo(0.0, hem + 0.02);
      ctx.lineTo(0.06, hem - 0.03);
      ctx.lineTo(0.085 + flare * 0.6, hem + 0.012);
    } else {
      ctx.lineTo(0.02, hem + 0.012);
    }
    ctx.lineTo(0.105 + flare * 0.85, hem - 0.04);
    ctx.quadraticCurveTo(0.14 + flare * 0.85, -0.3, nx + 0.045, ny + 0.06);
    ctx.closePath();
    ctx.fillStyle = INNER[2];
    ctx.fill();
    /* 주름 */
    artLine(ctx, CAPE[0], artCurve(nx - 0.08, ny + 0.07, -w - 0.03, -0.36, -w - 0.035 + sway, hem - 0.06, 8), 0.016);
    artLine(ctx, CAPE[2], artCurve(nx - 0.06, ny + 0.12, -w * 0.62, -0.3, -w * 0.6 + sway, hem - 0.03, 8), 0.014);
    artLine(ctx, INNER[1], artCurve(nx + 0.03, ny + 0.1, 0.1 + flare * 0.5, -0.3, 0.075 + flare * 0.6, hem - 0.05, 8), 0.012);
    if (level === 2) {
      /* 금 테두리와 별 무늬 */
      artLine(ctx, G[1], [-w - 0.08 + sway, hem - 0.01, -w + 0.01 + sway, hem + 0.045, -w * 0.72, hem - 0.03, -w * 0.45 + sway, hem + 0.04], 0.012);
      for (const [x, y] of [[-0.2, -0.22], [-0.28, -0.1], [-0.16, -0.07]]) artSparkle(ctx, x - flare * 0.5 + sway, y, 0.02, '#ffe9a8', 0.95);
    }
  }

  function leg(ctx, level, p, l, front) {
    const c = front ? BODY[1] : BODY[2];
    artStroke(ctx, c, [p.hip[0], p.hip[1], l.knee[0], l.knee[1], l.foot[0], l.foot[1], l.toe[0], l.toe[1]], W);
    if (level === 0) return;
    /* 정강이 덮개와 신 */
    const tn = level === 2 ? G : STEEL;
    const a = mix(l.knee, l.foot, 0.3);
    artStroke(ctx, front ? tn[1] : tn[2], [a[0], a[1], l.foot[0], l.foot[1], l.toe[0], l.toe[1]], W + 0.01);
    if (front) artLine(ctx, tn[0], [a[0] - 0.012, a[1] + 0.01, l.foot[0] - 0.012, l.foot[1] - 0.02], 0.012);
    artCircle(ctx, level === 2 ? '#fff6cf' : G[1], l.knee[0], l.knee[1], 0.03, ART.LW * 0.8);
  }

  function arm(ctx, level, a, front) {
    const c = front ? BODY[1] : BODY[2];
    artStroke(ctx, c, [a.sh[0], a.sh[1], a.el[0], a.el[1], a.hd[0], a.hd[1]], W);
    if (level === 0) {
      /* 금 팔찌 */
      const b = mix(a.el, a.hd, 0.7);
      artCircle(ctx, G[1], b[0], b[1], 0.034, ART.LW * 0.8);
    } else {
      /* 팔 덮개 */
      const tn = level === 2 ? G : STEEL;
      const g0 = mix(a.el, a.hd, 0.12);
      const g1 = mix(a.el, a.hd, 0.78);
      artStroke(ctx, front ? tn[1] : tn[2], [g0[0], g0[1], g1[0], g1[1]], W + 0.012);
      if (front) artLine(ctx, tn[0], [g0[0], g0[1] - 0.014, g1[0], g1[1] - 0.014], 0.012);
    }
    artCircle(ctx, front ? BODY[1] : BODY[2], a.hd[0], a.hd[1], 0.038, ART.LW);
  }

  /* 어깨 갑옷 (2·3단): 바깥으로 가시가 솟는다 */
  function pauldron(ctx, level, p, out) {
    const tn = level === 2 ? G : STEEL;
    const x = p.neck[0] + out * 0.03;
    const y = p.neck[1] + 0.045;
    const up = level === 2 ? 0.05 : 0.02;
    artPoly(ctx, out > 0 ? tn[1] : tn[2], [x - out * 0.03, y - 0.03, x + out * 0.06, y - 0.05, x + out * 0.15, y - 0.06 - up, x + out * 0.11, y + 0.02, x + out * 0.09, y + 0.055, x - out * 0.02, y + 0.045]);
    artLine(ctx, tn[0], [x - out * 0.015, y - 0.014, x + out * 0.06, y - 0.03, x + out * 0.125, y - 0.045 - up], 0.012);
    artLine(ctx, level === 2 ? INNER[1] : G[1], [x - out * 0.015, y + 0.036, x + out * 0.085, y + 0.045], 0.012);
  }

  function torso(ctx, level, p) {
    artStroke(ctx, BODY[1], [p.neck[0], p.neck[1], p.hip[0], p.hip[1]], W + 0.008);
    if (level === 0) {
      /* 목에 감은 목도리 */
      artStroke(ctx, INNER[0], [p.neck[0] - 0.045, p.neck[1] + 0.03, p.neck[0] + 0.045, p.neck[1] + 0.042], 0.04);
      return;
    }
    const hx = p.hip[0];
    const hy = p.hip[1];
    if (level === 2) {
      /* 허리에서 드리운 띠 */
      artPoly(ctx, INNER[1], [hx - 0.035, hy, hx + 0.04, hy, hx + 0.045, hy + 0.13, hx + 0.005, hy + 0.17, hx - 0.035, hy + 0.13]);
      artLine(ctx, G[1], [hx - 0.03, hy + 0.125, hx + 0.005, hy + 0.158, hx + 0.04, hy + 0.125], 0.011);
      artSparkle(ctx, hx + 0.004, hy + 0.075, 0.022, '#ffe9a8');
      /* 가슴의 금 갑옷 */
      const c0 = mix(p.neck, p.hip, 0.14);
      const c1 = mix(p.neck, p.hip, 0.62);
      artStroke(ctx, G[1], [c0[0], c0[1], c1[0], c1[1]], W + 0.034);
      artLine(ctx, G[0], [c0[0] - 0.022, c0[1], c1[0] - 0.022, c1[1]], 0.014);
    } else {
      const c0 = mix(p.neck, p.hip, 0.16);
      const c1 = mix(p.neck, p.hip, 0.55);
      artStroke(ctx, STEEL[1], [c0[0], c0[1], c1[0], c1[1]], W + 0.026);
      artLine(ctx, STEEL[0], [c0[0] - 0.018, c0[1], c1[0] - 0.018, c1[1]], 0.012);
    }
    /* 금 허리띠 */
    artStroke(ctx, G[1], [hx - 0.055, hy - 0.012, hx + 0.06, hy - 0.012], 0.034);
    artPoly(ctx, level === 2 ? INNER[0] : STEEL[0], [hx + 0.003, hy - 0.04, hx + 0.028, hy - 0.012, hx + 0.003, hy + 0.016, hx - 0.022, hy - 0.012], ART.LW * 0.7);
    /* 가슴의 심연석 */
    const g = mix(p.neck, p.hip, level === 2 ? 0.36 : 0.34);
    const r = level === 2 ? 0.04 : 0.028;
    artGlow(ctx, g[0], g[1], r * 3, GLOW, 0.45 + 0.25 * Math.sin(p.t * 3));
    artPoly(ctx, '#ff5fb8', [g[0], g[1] - r * 1.2, g[0] + r, g[1], g[0], g[1] + r * 1.2, g[0] - r, g[1]], ART.LW * 0.7);
    artPoly(ctx, '#ffffff', [g[0], g[1] - r * 0.7, g[0] + r * 0.35, g[1] - r * 0.05, g[0] - r * 0.45, g[1] - r * 0.15], 0);
  }

  function horn(ctx, level, bx, by, out) {
    const hs = [0.8, 1.15, 1.5][level];
    ctx.beginPath();
    ctx.moveTo(bx - out * 0.028, by + 0.012);
    ctx.quadraticCurveTo(bx + out * 0.085 * hs, by - 0.02 * hs, bx + out * 0.045 * hs, by - 0.13 * hs);
    ctx.quadraticCurveTo(bx + out * 0.03 * hs, by - 0.05 * hs, bx + out * 0.03, by - 0.012);
    ctx.closePath();
    artFill(ctx, out > 0 ? HORN[1] : HORN[0]);
    /* 끝의 빛 */
    ctx.beginPath();
    ctx.moveTo(bx + out * 0.063 * hs, by - 0.07 * hs);
    ctx.quadraticCurveTo(bx + out * 0.066 * hs, by - 0.1 * hs, bx + out * 0.045 * hs, by - 0.13 * hs);
    ctx.quadraticCurveTo(bx + out * 0.04 * hs, by - 0.09 * hs, bx + out * 0.042 * hs, by - 0.07 * hs);
    ctx.closePath();
    ctx.fillStyle = BODY[0];
    ctx.fill();
    if (level >= 1) artLine(ctx, G[1], [bx - out * 0.01, by - 0.014 * hs, bx + out * 0.05 * hs, by - 0.032 * hs], 0.016);
  }

  function head(ctx, level, p) {
    const hx = p.head[0];
    const hy = p.head[1];
    const r = 0.1;
    const hot = p.fire > 0 || p.castK > 0.5;
    /* 깃 (2·3단): 목 뒤로 세운 망토 깃 */
    if (level >= 1) {
      const nx = p.neck[0];
      const ny = p.neck[1];
      const up = level === 2 ? 0.14 : 0.11;
      artPoly(ctx, CAPE[1], [nx - 0.015, ny + 0.035, nx - 0.14, ny - up, nx - 0.085, ny + 0.01, nx - 0.065, ny + 0.065]);
      artPoly(ctx, INNER[1], [nx - 0.03, ny + 0.03, nx - 0.12, ny - up + 0.035, nx - 0.078, ny + 0.022], 0);
      artPoly(ctx, CAPE[2], [nx + 0.015, ny + 0.035, nx + 0.135, ny - up + 0.01, nx + 0.085, ny + 0.015, nx + 0.065, ny + 0.065]);
      artPoly(ctx, INNER[2], [nx + 0.03, ny + 0.03, nx + 0.115, ny - up + 0.04, nx + 0.078, ny + 0.025], 0);
    }
    horn(ctx, level, hx - 0.062, hy - 0.07, -1);
    horn(ctx, level, hx + 0.066, hy - 0.072, 1);
    /* 둥근 머리 */
    artCircle(ctx, BODY[1], hx, hy, r);
    artEllipse(ctx, BODY[0], hx - 0.03, hy - 0.04, 0.042, 0.03, 0, -0.5);
    ctx.beginPath();
    ctx.arc(hx, hy, r * 0.9, 0.1, 1.5);
    ctx.strokeStyle = BODY[2];
    ctx.lineWidth = 0.016;
    ctx.stroke();
    /* 치켜뜬 눈 */
    if (hot) artGlow(ctx, hx + 0.04, hy + 0.005, 0.1, '255,246,207', 0.55);
    const big = hot ? 1.25 : 1;
    for (const [ex, ew] of [[hx + 0.008, 0.027], [hx + 0.066, 0.02]]) {
      const ey = hy + 0.008;
      artPoly(ctx, EYE, [ex - ew * big, ey - 0.024 * big, ex + ew * big, ey - 0.006 * big, ex + ew * 0.75 * big, ey + 0.022 * big, ex - ew * 0.8 * big, ey + 0.016 * big], ART.LW * 0.55);
    }
    /* 금관 (3단) */
    if (level === 2) {
      const cx = hx + 0.004;
      const cy = hy - 0.078 - Math.sin(p.t * 2.2) * 0.004;
      artPoly(ctx, G[1], [cx - 0.07, cy + 0.02, cx - 0.082, cy - 0.065, cx - 0.04, cy - 0.025, cx, cy - 0.1, cx + 0.04, cy - 0.025, cx + 0.082, cy - 0.065, cx + 0.07, cy + 0.02]);
      artLine(ctx, G[0], [cx - 0.062, cy + 0.004, cx + 0.062, cy + 0.004], 0.012);
      artPoly(ctx, '#ff5fb8', [cx, cy - 0.05, cx + 0.018, cy - 0.022, cx, cy + 0.002, cx - 0.018, cy - 0.022], ART.LW * 0.6);
    }
  }

  /* 손에 모이는 기운 */
  function handGlow(ctx, p, a, seed) {
    const t = p.t;
    const k = Math.max(p.aimK, p.castK * 0.6);
    const r = 0.016 + k * 0.022 + p.fire * 0.024 + 0.004 * Math.sin(t * 9 + seed);
    artGlow(ctx, a.hd[0], a.hd[1], r * 3.2, GLOW, 0.3 + k * 0.25 + p.fire * 0.25);
    artCircle(ctx, 'rgba(255,170,220,.95)', a.hd[0], a.hd[1], r, 0);
    artCircle(ctx, '#ffffff', a.hd[0], a.hd[1], r * 0.55, 0);
    if (k > 0.3) {
      /* 손으로 빨려드는 불티 */
      for (let i = 0; i < 3; i++) {
        const q = (t * 1.8 + i / 3 + seed) % 1;
        const ang = i * 2.1 + seed * 5 + t;
        ctx.globalAlpha = q;
        artCircle(ctx, '#ffd0ec', a.hd[0] + Math.cos(ang) * (1 - q) * 0.12, a.hd[1] + Math.sin(ang) * (1 - q) * 0.12, 0.009, 0);
        ctx.globalAlpha = 1;
      }
    }
  }

  /* 몸을 도는 심연의 구슬 (3단) */
  function orb(ctx, p, i, front) {
    const ang = p.t * 1.7 + (i * Math.PI * 2) / 3;
    if (Math.sin(ang) > 0 !== front) return;
    const x = p.hip[0] + Math.cos(ang) * 0.3;
    const y = p.hip[1] - 0.08 + Math.sin(ang) * 0.075 + Math.sin(p.t * 2 + i) * 0.015;
    artGlow(ctx, x, y, 0.075, GLOW, 0.45);
    artCircle(ctx, '#2a1038', x, y, 0.032, ART.LW * 0.8);
    artCircle(ctx, '#ff8fcf', x - 0.01, y - 0.011, 0.011, 0);
  }

  TOWER_ART.lord = {
    /* 발밑의 소환진 */
    body(ctx, level) {
      artShadow(ctx, 0.06, 0.34, 0.47, 0.15);
      artCylinder(ctx, [OB[1], OB[2], OB[2]], 0, 0.28, 0.33, 0.44, 0.45, { topFill: OB[1] });
      artCylinder(ctx, OB, 0, 0.22, 0.28, 0.39, 0.4, { topFill: '#484361' });
      artHoop(ctx, 0, 0.253, 0.397, level === 2 ? G[1] : '#dc4494', 0.016);
      /* 뒤쪽 수정 기둥 */
      if (level >= 1) {
        for (const x of [-0.27, 0.27]) {
          artPoly(ctx, OB[1], [x - 0.04, 0.16, x - 0.012, -0.02 - level * 0.05, x + 0.04, 0.16]);
          artPoly(ctx, '#dc4494', [x - 0.012, -0.02 - level * 0.05, x + 0.003, 0.07, x - 0.022, 0.07], 0);
        }
      }
      /* 윗면에 새긴 마법진 */
      const ring = (r, w, c) => {
        ctx.beginPath();
        ctx.ellipse(0, 0.22, r, r * K, 0, 0, Math.PI * 2);
        ctx.strokeStyle = c;
        ctx.lineWidth = w;
        ctx.stroke();
      };
      ring(0.32, 0.02, 'rgba(255,95,184,.95)');
      ring(0.21, 0.012, 'rgba(255,155,212,.9)');
      const pt = (a, r) => [Math.cos(a) * r, 0.22 + Math.sin(a) * r * K];
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + 0.2;
        artLine(ctx, 'rgba(255,155,212,.9)', [...pt(a, 0.23), ...pt(a, 0.3)], 0.012);
      }
      if (level >= 1) {
        /* 두 겹 세모로 짠 별 */
        for (const off of [0, Math.PI / 3]) {
          const pts = [];
          for (let i = 0; i < 3; i++) pts.push(...pt(off + (i * Math.PI * 2) / 3 - Math.PI / 2, 0.21));
          artPath(ctx, pts);
          ctx.strokeStyle = 'rgba(255,155,212,.75)';
          ctx.lineWidth = 0.01;
          ctx.stroke();
        }
      }
      /* 둘레에 솟은 흑요석 조각 */
      const shards = level === 0 ? [[-0.37, 0.31, 0.11], [0.38, 0.32, 0.09]] : level === 1 ? [[-0.38, 0.31, 0.15], [0.39, 0.32, 0.13], [-0.25, 0.39, 0.08]] : [[-0.39, 0.31, 0.19], [0.4, 0.32, 0.17], [-0.26, 0.39, 0.1], [0.27, 0.4, 0.09]];
      for (const [x, y, hgt] of shards) {
        artPoly(ctx, OB[1], [x - 0.04, y, x - 0.01, y - hgt, x + 0.04, y]);
        artPoly(ctx, OB[0], [x - 0.04, y, x - 0.01, y - hgt, x - 0.008, y], 0);
        artPoly(ctx, '#dc4494', [x - 0.01, y - hgt, x + 0.004, y - hgt * 0.45, x - 0.02, y - hgt * 0.45], 0);
      }
      if (level === 2) {
        for (let k = -2; k <= 2; k++) {
          const a = Math.PI / 2 + k * 0.5;
          const x = Math.cos(a) * 0.43;
          const y = 0.3 + Math.sin(a) * 0.43 * K;
          artPoly(ctx, G[1], [x, y - 0.018, x + 0.018, y, x, y + 0.018, x - 0.018, y], ART.LW * 0.4);
        }
      }
    },

    top(ctx, level, aim, o) {
      const p = pose(level, aim, o);
      const t = p.t;
      /* 마법진의 빛 */
      const lit = 0.25 + 0.15 * Math.sin(t * 2.4) + p.castK * 0.6 + p.fire * 0.25;
      ctx.beginPath();
      ctx.ellipse(0, 0.22, 0.32, 0.32 * K, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + GLOW + ',' + Math.min(0.6, lit * 0.5) + ')';
      ctx.fill();
      if (p.castK > 0) {
        ctx.strokeStyle = 'rgba(255,200,235,' + p.castK + ')';
        ctx.lineWidth = 0.03;
        ctx.beginPath();
        ctx.ellipse(0, 0.22, 0.32 + (1 - p.castK) * 0.2, (0.32 + (1 - p.castK) * 0.2) * K, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (level === 2) {
        /* 떠 있는 발밑으로 빛이 고인다 */
        artGlow(ctx, 0, FEET, 0.3, GLOW, 0.4);
      }

      ctx.save();
      ctx.translate(0, FEET - p.hover);
      ctx.scale(p.dir * p.s, p.s);
      if (level === 2) {
        wings(ctx, p);
        for (let i = 0; i < 3; i++) orb(ctx, p, i, false);
      }
      cape(ctx, level, p);
      arm(ctx, level, p.armB, false);
      leg(ctx, level, p, p.legB, false);
      if (level >= 1) pauldron(ctx, level, p, -1);
      leg(ctx, level, p, p.legF, true);
      torso(ctx, level, p);
      head(ctx, level, p);
      arm(ctx, level, p.armF, true);
      if (level >= 1) pauldron(ctx, level, p, 1);
      handGlow(ctx, p, p.armB, 0.3);
      handGlow(ctx, p, p.armF, 0.7);
      if (p.castK > 0) {
        /* 치켜든 손 위에 도는 소환 문양 */
        const x = p.armF.hd[0];
        const y = p.armF.hd[1] - 0.08;
        ctx.globalAlpha = p.castK;
        for (const off of [0, Math.PI]) {
          const pts = [];
          for (let i = 0; i < 3; i++) {
            const a = t * 3 + off + (i * Math.PI * 2) / 3;
            pts.push(x + Math.cos(a) * 0.08, y + Math.sin(a) * 0.08 * 0.6);
          }
          artPath(ctx, pts);
          ctx.strokeStyle = '#ffd0ec';
          ctx.lineWidth = 0.012;
          ctx.stroke();
        }
        artSparkle(ctx, x, y, 0.05, '#ffffff', p.castK);
        ctx.globalAlpha = 1;
      }
      if (level === 2) for (let i = 0; i < 3; i++) orb(ctx, p, i, true);
      ctx.restore();
    },

    /* 쏘는 순간 두 손의 위치 (타일 중심 기준, 타일 단위) */
    hands(level, aim) {
      const p = pose(level, aim, { recoil: 1, t: 0 });
      const at = (h) => [p.dir * p.s * h[0], FEET - p.hover + p.s * h[1]];
      return [at(p.armB.hd), at(p.armF.hd)];
    },

    /* 박쥐 한 마리. 원점은 몸 가운데, 오른쪽을 본다. */
    minion(ctx, level, t, bite) {
      const s = [1, 1.12, 1.26][level];
      const flap = Math.sin(t * (bite ? 34 : 17));
      ctx.save();
      ctx.scale(s, s);
      if (bite) ctx.rotate(0.3 + Math.sin(t * 40) * 0.12);
      if (level === 2) artGlow(ctx, 0, 0, 0.2, GLOW, 0.4);
      for (const sgn of [-1, 1]) {
        const ty = -0.03 - flap * 0.1;
        artPoly(ctx, sgn < 0 ? BAT[1] : BAT[2], [sgn * 0.035, -0.03, sgn * 0.12, ty - 0.06, sgn * 0.25, ty, sgn * 0.2, ty + 0.05, sgn * 0.165, ty + 0.025, sgn * 0.135, ty + 0.085, sgn * 0.095, ty + 0.05, sgn * 0.06, 0.06], ART.LW * 0.8);
        artLine(ctx, BAT[0], [sgn * 0.04, -0.02, sgn * 0.12, ty - 0.04, sgn * 0.165, ty + 0.02], 0.01);
        artLine(ctx, BAT[0], [sgn * 0.12, ty - 0.04, sgn * 0.23, ty], 0.01);
      }
      artEllipse(ctx, BAT[1], 0, 0.012, 0.058, 0.074);
      artEllipse(ctx, BAT[0], -0.014, 0.0, 0.026, 0.04, 0);
      for (const sgn of [-1, 1]) {
        artPoly(ctx, BAT[1], [sgn * 0.052, -0.035, sgn * 0.05, -0.125, sgn * 0.008, -0.058], ART.LW * 0.8);
        artPoly(ctx, '#dc4494', [sgn * 0.042, -0.05, sgn * 0.043, -0.098, sgn * 0.022, -0.06], 0);
        artCircle(ctx, '#ff5fb8', sgn * 0.024, -0.012, 0.015, 0);
        artCircle(ctx, '#ffffff', sgn * 0.024 - 0.004, -0.016, 0.006, 0);
        artPoly(ctx, '#ffffff', [sgn * 0.01, 0.026, sgn * 0.017, 0.05, sgn * 0.026, 0.026], 0);
      }
      if (level >= 1) artLine(ctx, G[1], [-0.04, 0.062, 0.04, 0.062], 0.014);
      ctx.restore();
    },
  };
})();
