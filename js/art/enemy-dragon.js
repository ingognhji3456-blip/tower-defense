'use strict';
/* 화룡 — 마지막 우두머리. 금빛 배 비늘의 붉은 용: 뿔과 등가시, 천천히 치는 두 날개, 입가에 이는 불길.
   draw 는 앞몸을 그리고, segment 는 길을 따라 뒤따르는 꼬리 마디를 그린다. */
(function () {
  const RD = ['#ff8f6b', '#dc3d2c', '#8f1f24'];
  const DR = ['#b12a36', '#7c1b2a', '#4f1220']; /* 먼 쪽·그늘 */
  const G = ART.gold;
  const BN = ART.bone;

  /* 날개: 어깨를 축으로 위아래로 친다. (0,0) = 어깨 */
  function wing(ctx, r, flap, tones, lw) {
    ctx.save();
    ctx.rotate(flap * 0.38);
    ctx.scale(1, 1 - flap * 0.12);
    const E = [-0.45 * r, -0.95 * r];
    const T1 = [-1.75 * r, -1.2 * r];
    const T2 = [-1.5 * r, -0.4 * r];
    const T3 = [-0.95 * r, 0.05 * r];
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(E[0], E[1]);
    ctx.quadraticCurveTo(-1.1 * r, -1.4 * r, T1[0], T1[1]);
    ctx.quadraticCurveTo(-1.35 * r, -0.85 * r, T2[0], T2[1]);
    ctx.quadraticCurveTo(-1.05 * r, -0.35 * r, T3[0], T3[1]);
    ctx.quadraticCurveTo(-0.5 * r, -0.1 * r, -0.1 * r, 0.25 * r);
    ctx.closePath();
    artFill(ctx, tones[1], lw);
    /* 날개막의 밝은 면과 뼈대 */
    artPoly(ctx, tones[0], [E[0], E[1], -1.15 * r, -1.22 * r, T1[0] + 0.12 * r, T1[1] + 0.06 * r, -1.2 * r, -0.86 * r], 0);
    for (const T of [T1, T2, T3]) {
      artLine(ctx, ART.OUT, [E[0], E[1], T[0], T[1]], lw * 1.9);
      artLine(ctx, tones[2], [E[0], E[1], T[0], T[1]], lw * 0.8);
    }
    artLine(ctx, ART.OUT, [0, 0, E[0], E[1]], lw * 3);
    artLine(ctx, tones[2], [0, 0, E[0], E[1]], lw * 1.7);
    artPoly(ctx, BN[0], [E[0] - 0.05 * r, E[1] - 0.02 * r, E[0] + 0.02 * r, E[1] - 0.28 * r, E[0] + 0.1 * r, E[1] - 0.02 * r], lw * 0.7);
    ctx.restore();
  }

  ENEMY_ART.dragon = {
    draw(ctx, r, t, o) {
      const ph = t * 4.5 + (o.seed || 0);
      const lw = Math.max(0.028, r * 0.06);
      const bob = Math.sin(ph * 2) * 0.03 * r;
      const flap = Math.sin(t * 3.4);
      artShadow(ctx, -0.1 * r, r * 0.98, r * 1.6, r * 0.32);
      ctx.translate(0, bob);

      const leg = (hx, hy, phase, tones, big) => {
        const s = Math.sin(ph + phase);
        const up = Math.max(0, Math.cos(ph + phase)) * 0.18 * r;
        const fx = hx + (0.05 + s * 0.3) * r;
        const fy = r - bob - up;
        const kx = hx + (big ? -0.2 : 0.16) * r;
        const ky = (hy + fy) / 2;
        artEllipse(ctx, tones[1], hx, hy + 0.1 * r, (big ? 0.34 : 0.26) * r, (big ? 0.42 : 0.34) * r, lw);
        artLine(ctx, ART.OUT, [hx, hy + 0.3 * r, kx, ky, fx, fy - 0.06 * r], lw * 4);
        artLine(ctx, tones[1], [hx, hy + 0.3 * r, kx, ky, fx, fy - 0.06 * r], lw * 2.5);
        artPoly(ctx, tones[1], [fx - 0.16 * r, fy - 0.12 * r, fx + 0.3 * r, fy - 0.1 * r, fx + 0.36 * r, fy + 0.02 * r, fx - 0.14 * r, fy + 0.02 * r], lw * 0.9);
        for (const dx of [0.08, 0.2, 0.32]) artPoly(ctx, BN[0], [fx + (dx - 0.05) * r, fy - 0.04 * r, fx + (dx + 0.09) * r, fy + 0.03 * r, fx + (dx - 0.04) * r, fy + 0.03 * r], lw * 0.5);
      };

      /* 먼 쪽 날개와 다리 */
      ctx.save();
      ctx.translate(0.12 * r, -0.62 * r);
      wing(ctx, r, flap * 0.9 + 0.15, DR, lw);
      ctx.restore();
      leg(-0.42 * r, 0.12 * r, Math.PI, DR, true);
      leg(0.6 * r, 0.1 * r, 0, DR, false);

      /* 몸통 */
      ctx.beginPath();
      ctx.moveTo(-1.0 * r, -0.05 * r);
      ctx.quadraticCurveTo(-0.6 * r, -0.7 * r, 0.1 * r, -0.68 * r);
      ctx.quadraticCurveTo(0.7 * r, -0.66 * r, 0.9 * r, -0.2 * r);
      ctx.quadraticCurveTo(0.9 * r, 0.3 * r, 0.3 * r, 0.5 * r);
      ctx.quadraticCurveTo(-0.5 * r, 0.6 * r, -1.0 * r, 0.35 * r);
      ctx.closePath();
      artFill(ctx, RD[1], lw);
      artPoly(ctx, RD[0], [-0.7 * r, -0.3 * r, -0.3 * r, -0.58 * r, 0.3 * r, -0.58 * r, 0.0 * r, -0.36 * r, -0.5 * r, -0.14 * r], 0);
      /* 비늘 무늬 */
      for (const [x, y] of [[-0.4, -0.08], [-0.1, -0.16], [0.2, -0.2], [-0.25, 0.1], [0.06, 0.04], [0.38, 0.0]]) {
        ctx.beginPath();
        ctx.arc(x * r, y * r, 0.11 * r, 0.2, Math.PI - 0.2);
        ctx.strokeStyle = 'rgba(110,20,25,.6)';
        ctx.lineWidth = lw * 0.6;
        ctx.stroke();
      }
      /* 금빛 배 비늘 */
      artPoly(ctx, G[1], [0.88 * r, -0.12 * r, 0.82 * r, 0.24 * r, 0.3 * r, 0.5 * r, -0.5 * r, 0.56 * r, -0.98 * r, 0.36 * r, -0.6 * r, 0.3 * r, 0.1 * r, 0.26 * r, 0.6 * r, 0.02 * r], lw * 0.9);
      for (const [x0, y0, x1, y1] of [[0.62, 0.05, 0.7, 0.34], [0.36, 0.2, 0.42, 0.46], [0.08, 0.27, 0.1, 0.52], [-0.22, 0.29, -0.24, 0.55], [-0.54, 0.31, -0.6, 0.52]]) {
        artLine(ctx, G[2], [x0 * r, y0 * r, x1 * r, y1 * r], lw * 0.7);
      }
      /* 등가시 */
      for (let i = 0; i < 5; i++) {
        const x = (-0.78 + i * 0.3) * r;
        const y = (-0.36 - Math.sin((i + 0.6) / 5 * Math.PI) * 0.33) * r;
        artPoly(ctx, DR[1], [x - 0.09 * r, y + 0.05 * r, x - 0.06 * r, y - 0.3 * r, x + 0.12 * r, y + 0.02 * r], lw * 0.8);
      }

      leg(-0.55 * r, 0.1 * r, 0, RD, true);

      /* 목: 금빛 목덜미 비늘과 가시 */
      ctx.beginPath();
      ctx.moveTo(0.3 * r, -0.62 * r);
      ctx.quadraticCurveTo(0.62 * r, -1.0 * r, 0.98 * r, -1.36 * r);
      ctx.lineTo(1.36 * r, -1.02 * r);
      ctx.quadraticCurveTo(1.05 * r, -0.62 * r, 0.9 * r, -0.14 * r);
      ctx.closePath();
      artFill(ctx, RD[1], lw);
      artPoly(ctx, G[1], [1.34 * r, -1.0 * r, 1.05 * r, -0.6 * r, 0.9 * r, -0.16 * r, 0.74 * r, -0.3 * r, 0.92 * r, -0.7 * r, 1.16 * r, -1.04 * r], lw * 0.8);
      artLine(ctx, G[2], [0.86 * r, -0.5 * r, 1.0 * r, -0.4 * r], lw * 0.7);
      artLine(ctx, G[2], [0.98 * r, -0.78 * r, 1.14 * r, -0.7 * r], lw * 0.7);
      for (let i = 0; i < 3; i++) {
        const x = (0.46 + i * 0.2) * r;
        const y = (-0.82 - i * 0.22) * r;
        artPoly(ctx, DR[1], [x - 0.07 * r, y + 0.06 * r, x - 0.22 * r, y - 0.2 * r, x + 0.08 * r, y - 0.06 * r], lw * 0.8);
      }

      leg(0.48 * r, 0.08 * r, Math.PI, RD, false);

      /* 가까운 쪽 날개 */
      ctx.save();
      ctx.translate(-0.05 * r, -0.56 * r);
      wing(ctx, r, flap, [RD[0], '#c9303a', DR[1]], lw);
      ctx.restore();

      /* 머리 */
      const hx = 1.16 * r;
      const hy = -1.22 * r + Math.sin(ph) * 0.03 * r;
      const jaw = 0.1 + Math.max(0, Math.sin(ph * 0.5)) * 0.18;
      const flick = 0.5 + 0.5 * Math.sin(t * 17);
      /* 뿔 (먼 쪽, 가까운 쪽) */
      artPoly(ctx, BN[2], [hx - 0.12 * r, hy - 0.26 * r, hx - 0.62 * r, hy - 0.68 * r, hx - 0.02 * r, hy - 0.4 * r], lw * 0.9);
      /* 입 안의 불길 */
      artGlow(ctx, hx + 0.72 * r, hy + 0.22 * r, (0.4 + flick * 0.12) * r, '255,150,40', 0.55);
      artPoly(ctx, DR[1], [hx + 0.0 * r, hy + 0.12 * r, hx + 0.74 * r, hy + (0.2 + jaw) * r, hx + 0.66 * r, hy + (0.36 + jaw) * r, hx + 0.02 * r, hy + 0.38 * r], lw);
      artPoly(ctx, '#ffb347', [hx + 0.12 * r, hy + 0.12 * r, hx + 0.7 * r, hy + 0.12 * r, hx + 0.7 * r, hy + (0.2 + jaw) * r, hx + 0.1 * r, hy + 0.24 * r], 0);
      artPoly(ctx, '#fff1a8', [hx + 0.3 * r, hy + 0.14 * r, hx + (0.86 + flick * 0.14) * r, hy + (0.18 + jaw * 0.5) * r, hx + 0.34 * r, hy + (0.2 + jaw * 0.6) * r], 0);
      for (let i = 0; i < 4; i++) {
        const x = hx + (0.22 + i * 0.13) * r;
        artPoly(ctx, '#ffffff', [x, hy + 0.1 * r, x + 0.09 * r, hy + 0.1 * r, x + 0.045 * r, hy + 0.24 * r], lw * 0.4);
      }
      artPoly(ctx, RD[1], [hx - 0.34 * r, hy - 0.1 * r, hx - 0.04 * r, hy - 0.4 * r, hx + 0.36 * r, hy - 0.3 * r, hx + 0.78 * r, hy - 0.14 * r, hx + 0.84 * r, hy + 0.1 * r, hx + 0.12 * r, hy + 0.14 * r, hx - 0.24 * r, hy + 0.32 * r], lw);
      artPoly(ctx, RD[0], [hx - 0.2 * r, hy - 0.12 * r, hx + 0.0 * r, hy - 0.3 * r, hx + 0.34 * r, hy - 0.23 * r, hx + 0.14 * r, hy - 0.1 * r], 0);
      artPoly(ctx, G[1], [hx - 0.24 * r, hy + 0.32 * r, hx + 0.12 * r, hy + 0.14 * r, hx + 0.02 * r, hy + 0.36 * r], lw * 0.7);
      artPoly(ctx, BN[0], [hx + 0.6 * r, hy - 0.2 * r, hx + 0.7 * r, hy - 0.42 * r, hx + 0.76 * r, hy - 0.15 * r], lw * 0.7);
      artCircle(ctx, ART.OUT, hx + 0.72 * r, hy - 0.02 * r, 0.035 * r, 0);
      artPoly(ctx, BN[0], [hx - 0.3 * r, hy - 0.14 * r, hx - 0.84 * r, hy - 0.52 * r, hx - 0.1 * r, hy - 0.36 * r], lw * 0.9);
      artPoly(ctx, DR[1], [hx - 0.3 * r, hy + 0.06 * r, hx - 0.58 * r, hy + 0.16 * r, hx - 0.26 * r, hy + 0.26 * r], lw * 0.8);
      artEye(ctx, hx + 0.2 * r, hy - 0.06 * r, 0.1 * r, '#ffe45a');
      artLine(ctx, ART.OUT, [hx + 0.02 * r, hy - 0.24 * r, hx + 0.36 * r, hy - 0.15 * r], lw);
      /* 불티 */
      for (let i = 0; i < 4; i++) {
        const k = (t * 1.3 + i * 0.25) % 1;
        artCircle(ctx, 'rgba(255,' + Math.round(200 - k * 110) + ',70,' + (1 - k) + ')', hx + (0.9 + k * 0.6) * r, hy + (0.26 - k * 0.5 + Math.sin(i * 2.1) * 0.12) * r, (0.05 - k * 0.03) * r, 0);
      }
    },

    /* 꼬리 마디: i = 1(몸 쪽) … n(끝). 세워서 그리므로 길이 어느 쪽으로 꺾여도 이어져 보인다. */
    segment(ctx, r, i, n, t) {
      const rr = r * (0.6 - 0.055 * i);
      const y = r * 0.28 + Math.sin(t * 4.5 * 2 + i * 0.9) * 0.02 * r;
      const lw = Math.max(0.026, r * 0.055);
      artShadow(ctx, 0, r * 0.95, rr * 1.1, rr * 0.3);
      if (i === n) {
        /* 꼬리 끝: 가시 돋친 창날 */
        artPoly(ctx, DR[1], [0, y - rr * 2.1, rr * 0.7, y - rr * 0.6, rr * 1.7, y, rr * 0.7, y + rr * 0.6, 0, y + rr * 1.5, -rr * 0.7, y + rr * 0.6, -rr * 1.7, y, -rr * 0.7, y - rr * 0.6], lw);
        artPoly(ctx, G[1], [0, y - rr * 0.9, rr * 0.6, y, 0, y + rr * 0.7, -rr * 0.6, y], lw * 0.7);
        return;
      }
      artPoly(ctx, DR[1], [-rr * 0.3, y - rr * 0.8, 0, y - rr * 1.75, rr * 0.3, y - rr * 0.8], lw * 0.9);
      artCircle(ctx, RD[1], 0, y, rr, lw);
      artEllipse(ctx, RD[0], -rr * 0.25, y - rr * 0.4, rr * 0.5, rr * 0.3, 0, -0.4);
      ctx.beginPath();
      ctx.arc(0, y + rr * 0.05, rr * 0.6, 0.25, Math.PI - 0.25);
      ctx.strokeStyle = 'rgba(110,20,25,.6)';
      ctx.lineWidth = lw * 0.6;
      ctx.stroke();
      artEllipse(ctx, G[1], 0, y + rr * 0.68, rr * 0.5, rr * 0.24, lw * 0.7);
    },
  };
})();
