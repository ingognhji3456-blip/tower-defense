'use strict';
/* 늑대 — 몹시 빠른 적. 몸을 쭉 뻗었다 오므리며 달리는 잿빛 푸른 늑대.
   곤두선 갈기와 북슬북슬한 꼬리, 가시 박힌 어깨 갑옷과 목걸이, 이마의 보석, 옆구리에 빛나는 무늬. */
(function () {
  const BL = ['#a9bfde', '#6682b0', '#3c4f7c'];
  const NV = ['#4a5f94', '#2d3d6a', '#1e2a4c']; /* 등줄기의 짙은 털 */
  const BELLY = '#e6eef9';
  const ST = ART.steel;
  const G = ART.gold;
  const RD = ART.red;
  const CY = '#5af2ff';

  ENEMY_ART.wolf = {
    period: (Math.PI * 4) / 15,
    draw(ctx, r, t, o) {
      const ph = t * 15 + (o.seed || 0) * 2.3;
      const s = Math.sin(ph); /* +1: 네 다리를 쭉 뻗은 순간, -1: 모은 순간 */
      const lift = -Math.cos(ph) * 0.1 * r - 0.06 * r;
      const lw = Math.max(0.022, r * 0.1);
      artShadow(ctx, 0, r * 0.98, r * (1.25 + s * 0.15), r * 0.24);
      ctx.translate(-0.02 * r, lift);

      /* 다리: 굵은 허벅지 → 가는 정강이 → 발톱 달린 발 */
      const limb = (hx, hy, px, py, bend, tones) => {
        const kx = (hx + px) / 2 + bend * r;
        const ky = (hy + py) / 2 - 0.05 * r;
        artLine(ctx, ART.OUT, [hx, hy, kx, ky], lw * 3.6);
        artLine(ctx, ART.OUT, [kx, ky, px, py], lw * 2.5);
        artLine(ctx, tones[0], [hx, hy, kx, ky], lw * 2.3);
        artLine(ctx, tones[1], [kx, ky, px, py], lw * 1.25);
        artEllipse(ctx, tones[0], px + 0.08 * r, py, 0.16 * r, 0.09 * r, lw * 0.8);
        for (const dx of [0.12, 0.2]) artPoly(ctx, '#ffffff', [px + dx * r, py - 0.02 * r, px + (dx + 0.1) * r, py + 0.06 * r, px + (dx - 0.01) * r, py + 0.05 * r], lw * 0.4);
      };
      const hind = (dx, tones) => limb(-0.72 * r, -0.08 * r, (-0.85 - s * 0.62 + dx) * r, (0.98 - Math.max(0, s) * 0.2) * r - lift, -0.22, tones);
      const fore = (dx, tones) => limb(0.5 * r, 0.0 * r, (0.62 + s * 0.68 + dx) * r, (0.98 - Math.max(0, s) * 0.22) * r - lift, 0.14, tones);

      /* 꼬리: 털이 삐죽삐죽한 큰 붓 모양 */
      const tw = Math.sin(ph * 0.5) * 0.12 * r;
      artPoly(ctx, BL[1], [
        -0.9 * r, -0.52 * r, -1.12 * r, -0.78 * r + tw * 0.4, -1.24 * r, -0.62 * r + tw * 0.5, -1.46 * r, -0.86 * r + tw * 0.8,
        -1.52 * r, -0.64 * r + tw, -1.76 * r, -0.72 * r + tw, -1.66 * r, -0.5 * r + tw, -1.8 * r, -0.36 * r + tw,
        -1.56 * r, -0.3 * r + tw, -1.58 * r, -0.14 * r + tw, -1.3 * r, -0.2 * r + tw * 0.6, -1.2 * r, -0.04 * r + tw * 0.4, -0.94 * r, -0.14 * r,
      ], lw);
      artPoly(ctx, BELLY, [-1.52 * r, -0.64 * r + tw, -1.76 * r, -0.72 * r + tw, -1.66 * r, -0.5 * r + tw, -1.8 * r, -0.36 * r + tw, -1.56 * r, -0.3 * r + tw, -1.42 * r, -0.46 * r + tw], lw * 0.7);
      artPoly(ctx, NV[0], [-0.92 * r, -0.5 * r, -1.12 * r, -0.74 * r + tw * 0.4, -1.22 * r, -0.6 * r + tw * 0.5, -1.4 * r, -0.74 * r + tw * 0.8, -1.3 * r, -0.5 * r + tw * 0.6], 0);

      hind(0.2, [BL[2], BL[2]]);
      fore(-0.18, [BL[2], BL[2]]);

      /* 몸통: 가슴이 깊고 허리가 잘록하다 */
      ctx.beginPath();
      ctx.moveTo(-1.0 * r, -0.42 * r);
      ctx.quadraticCurveTo(-0.3 * r, -0.72 * r, 0.55 * r, -0.62 * r);
      ctx.quadraticCurveTo(0.95 * r, -0.3 * r, 0.72 * r, 0.22 * r);
      ctx.quadraticCurveTo(0.2 * r, 0.34 * r, -0.35 * r, 0.02 * r);
      ctx.quadraticCurveTo(-0.8 * r, 0.22 * r, -1.02 * r, 0.02 * r);
      ctx.closePath();
      artFill(ctx, BL[1], lw);
      /* 배의 흰 털 (톱니처럼 삐죽) */
      artPoly(ctx, BELLY, [0.74 * r, 0.14 * r, 0.3 * r, 0.26 * r, -0.3 * r, 0.03 * r, -0.12 * r, -0.02 * r, 0.0 * r, 0.08 * r, 0.14 * r, -0.02 * r, 0.26 * r, 0.1 * r, 0.42 * r, -0.02 * r, 0.52 * r, 0.1 * r], 0);
      /* 등줄기의 짙은 털과 곤두선 갈기 */
      artPoly(ctx, NV[0], [
        -0.98 * r, -0.42 * r, -0.86 * r, -0.62 * r, -0.72 * r, -0.5 * r, -0.56 * r, -0.74 * r, -0.42 * r, -0.58 * r,
        -0.24 * r, -0.84 * r, -0.1 * r, -0.64 * r, 0.08 * r, -0.92 * r, 0.2 * r, -0.66 * r, 0.3 * r, -0.62 * r,
        0.1 * r, -0.48 * r, -0.5 * r, -0.36 * r,
      ], lw * 0.8);
      /* 옆구리에 빛나는 무늬 */
      for (const [x, y] of [[-0.6, -0.18], [-0.36, -0.14], [-0.12, -0.12]]) {
        artPoly(ctx, CY, [x * r, y * r - 0.13 * r, (x + 0.1) * r, y * r - 0.04 * r, (x + 0.02) * r, y * r + 0.12 * r, (x - 0.06) * r, y * r + 0.02 * r], lw * 0.45);
      }

      hind(0, [BL[1], BL[0]]);
      fore(0, [BL[1], BL[0]]);

      /* 어깨 갑옷: 금테 두른 강철판과 가시 */
      artPoly(ctx, ST[2], [0.34 * r, -0.82 * r, 0.42 * r, -1.12 * r, 0.54 * r, -0.84 * r], lw * 0.8);
      artPoly(ctx, ST[1], [0.5 * r, -0.86 * r, 0.64 * r, -1.14 * r, 0.7 * r, -0.82 * r], lw * 0.8);
      artPoly(ctx, ST[1], [0.14 * r, -0.62 * r, 0.44 * r, -0.86 * r, 0.82 * r, -0.72 * r, 0.9 * r, -0.26 * r, 0.6 * r, 0.02 * r, 0.26 * r, -0.14 * r], lw);
      artPoly(ctx, ST[0], [0.24 * r, -0.6 * r, 0.46 * r, -0.76 * r, 0.72 * r, -0.66 * r, 0.5 * r, -0.5 * r], 0);
      artLine(ctx, G[1], [0.26 * r, -0.14 * r, 0.6 * r, 0.02 * r, 0.9 * r, -0.26 * r], lw * 1.1);
      artCircle(ctx, G[1], 0.56 * r, -0.36 * r, 0.085 * r, lw * 0.6);
      artCircle(ctx, CY, 0.56 * r, -0.36 * r, 0.04 * r, 0);

      /* 머리 */
      const hx = 1.02 * r;
      const hy = -0.62 * r + Math.sin(ph + 1) * 0.03 * r;
      /* 가시 박힌 붉은 목걸이 */
      artPoly(ctx, RD[1], [hx - 0.34 * r, hy - 0.22 * r, hx - 0.18 * r, hy - 0.26 * r, hx - 0.06 * r, hy + 0.42 * r, hx - 0.24 * r, hy + 0.46 * r], lw * 0.9);
      for (const k of [0, 1]) artPoly(ctx, ST[0], [hx - (0.33 - k * 0.07) * r, hy + (-0.02 + k * 0.24) * r, hx - (0.5 - k * 0.07) * r, hy + (0.06 + k * 0.24) * r, hx - (0.31 - k * 0.07) * r, hy + (0.12 + k * 0.24) * r], lw * 0.6);
      /* 먼 쪽 귀 */
      artPoly(ctx, BL[2], [hx - 0.1 * r, hy - 0.2 * r, hx + 0.05 * r, hy - 0.74 * r, hx + 0.22 * r, hy - 0.22 * r], lw);
      /* 아래턱, 붉은 입안, 이빨 */
      const jaw = 0.1 + Math.max(0, Math.sin(ph * 0.5)) * 0.1;
      artPoly(ctx, BL[2], [hx + 0.1 * r, hy + 0.12 * r, hx + 0.72 * r, hy + (0.12 + jaw) * r, hx + 0.62 * r, hy + (0.3 + jaw) * r, hx + 0.02 * r, hy + 0.34 * r], lw);
      artPoly(ctx, '#8a2233', [hx + 0.14 * r, hy + 0.1 * r, hx + 0.7 * r, hy + 0.08 * r, hx + 0.68 * r, hy + (0.12 + jaw) * r, hx + 0.14 * r, hy + 0.2 * r], 0);
      for (const dx of [0.3, 0.44, 0.58]) artPoly(ctx, '#ffffff', [hx + (dx - 0.05) * r, hy + 0.08 * r, hx + (dx + 0.05) * r, hy + 0.08 * r, hx + dx * r, hy + (dx > 0.5 ? 0.3 : 0.2) * r], lw * 0.45);
      /* 주둥이와 이마 */
      artPoly(ctx, BL[1], [hx - 0.32 * r, hy - 0.12 * r, hx - 0.05 * r, hy - 0.36 * r, hx + 0.3 * r, hy - 0.26 * r, hx + 0.82 * r, hy - 0.04 * r, hx + 0.78 * r, hy + 0.1 * r, hx + 0.2 * r, hy + 0.14 * r, hx - 0.2 * r, hy + 0.3 * r], lw);
      artPoly(ctx, BELLY, [hx + 0.26 * r, hy + 0.12 * r, hx + 0.78 * r, hy + 0.09 * r, hx + 0.76 * r, hy + 0.0 * r, hx + 0.34 * r, hy + 0.02 * r], 0);
      /* 볼의 삐죽한 털 */
      artPoly(ctx, BL[0], [hx - 0.2 * r, hy + 0.3 * r, hx - 0.3 * r, hy + 0.5 * r, hx - 0.06 * r, hy + 0.36 * r, hx - 0.04 * r, hy + 0.56 * r, hx + 0.12 * r, hy + 0.22 * r, hx - 0.1 * r, hy + 0.1 * r], lw * 0.8);
      /* 이마를 덮은 강철 투구판과 보석 */
      artPoly(ctx, ST[1], [hx - 0.26 * r, hy - 0.16 * r, hx - 0.03 * r, hy - 0.37 * r, hx + 0.32 * r, hy - 0.27 * r, hx + 0.56 * r, hy - 0.16 * r, hx + 0.3 * r, hy - 0.12 * r, hx + 0.08 * r, hy - 0.2 * r, hx - 0.1 * r, hy - 0.06 * r], lw * 0.8);
      artPoly(ctx, ST[0], [hx - 0.16 * r, hy - 0.18 * r, hx - 0.01 * r, hy - 0.31 * r, hx + 0.26 * r, hy - 0.23 * r, hx + 0.06 * r, hy - 0.25 * r], 0);
      artPoly(ctx, CY, [hx + 0.0 * r, hy - 0.4 * r, hx + 0.08 * r, hy - 0.3 * r, hx + 0.0 * r, hy - 0.2 * r, hx - 0.08 * r, hy - 0.3 * r], lw * 0.5);
      artCircle(ctx, ART.OUT, hx + 0.8 * r, hy + 0.0 * r, 0.075 * r, 0);
      /* 가까운 쪽 귀 */
      artPoly(ctx, BL[1], [hx - 0.3 * r, hy - 0.2 * r, hx - 0.2 * r, hy - 0.84 * r, hx + 0.06 * r, hy - 0.32 * r], lw);
      artPoly(ctx, '#f0b7c4', [hx - 0.22 * r, hy - 0.32 * r, hx - 0.18 * r, hy - 0.64 * r, hx - 0.06 * r, hy - 0.35 * r], 0);
      artPoly(ctx, G[1], [hx - 0.24 * r, hy - 0.7 * r, hx - 0.2 * r, hy - 0.84 * r, hx - 0.13 * r, hy - 0.7 * r], lw * 0.5);
      /* 눈과 흉터 */
      artEye(ctx, hx + 0.24 * r, hy - 0.03 * r, 0.1 * r, CY);
      artLine(ctx, ART.OUT, [hx + 0.08 * r, hy - 0.16 * r, hx + 0.4 * r, hy - 0.1 * r], lw * 0.9);
    },
  };
})();
