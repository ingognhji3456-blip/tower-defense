'use strict';
/* 대왕전갈 — 느리고 단단한 우두머리. 보랏빛 갑옷, 큰 집게 둘, 등 위로 말아 올린 꼬리 끝의 초록 독침. */
(function () {
  const PU = ['#a98be6', '#6244a8', '#372562'];
  const DK = ['#55446a', '#30244a', '#1c142c'];
  const G = ART.gold;

  ENEMY_ART.scorpion = {
    draw(ctx, r, t, o) {
      const ph = t * 6 + (o.seed || 0) * 1.3;
      const lw = Math.max(0.026, r * 0.075);
      const bob = Math.sin(ph * 2) * 0.03 * r;
      artShadow(ctx, 0, r * 0.98, r * 1.55, r * 0.3);

      const leg = (x, dir, phase, far) => {
        const s = Math.sin(ph + phase);
        const up = Math.max(0, Math.cos(ph + phase)) * 0.16 * r;
        const y0 = 0.5 * r + bob;
        const pts = [x, y0, x + (dir * 0.34 + s * 0.06) * r, (far ? 0.3 : 0.42) * r + bob, x + (dir * 0.52 + s * 0.2) * r, (far ? 0.88 : 1.0) * r - up];
        artLine(ctx, ART.OUT, pts, lw * 2.6);
        artLine(ctx, far ? DK[1] : PU[1], pts, lw * 1.35);
      };
      for (let i = 0; i < 4; i++) leg((-0.72 + i * 0.36) * r, i < 2 ? -0.8 : 0.8, i * 1.6, true);

      /* 꼬리: 마디가 등 위로 휘어 올라가 머리 위에서 독침으로 끝난다 */
      const sway = Math.sin(ph * 0.5) * 0.1;
      const beads = [[-1.12, 0.02, 0.3], [-1.42, -0.5, 0.27], [-1.36, -1.08, 0.24], [-0.96, -1.52, 0.215], [-0.42, -1.68, 0.19]];
      const tx = (p) => (p[0] + sway * (0.3 - p[1]) * 0.35) * r;
      const ty = (p) => p[1] * r + bob;
      for (let i = 0; i < beads.length; i++) {
        const b = beads[i];
        artCircle(ctx, i % 2 ? PU[1] : PU[2], tx(b), ty(b), b[2] * r, lw);
        artCircle(ctx, PU[0], tx(b) - b[2] * 0.25 * r, ty(b) - b[2] * 0.3 * r, b[2] * 0.4 * r, 0);
      }
      const last = beads[beads.length - 1];
      const sx = tx(last) + 0.38 * r;
      const sy = ty(last) + 0.1 * r;
      artGlow(ctx, sx + 0.3 * r, sy + 0.34 * r, 0.42 * r, '125,255,106', 0.5);
      artCircle(ctx, PU[1], sx, sy, 0.21 * r, lw);
      artPoly(ctx, '#7dff6a', [sx + 0.08 * r, sy - 0.14 * r, sx + 0.42 * r, sy + 0.02 * r, sx + 0.36 * r, sy + 0.52 * r, sx + 0.2 * r, sy + 0.16 * r], lw * 0.8);
      artCircle(ctx, PU[0], sx - 0.06 * r, sy - 0.07 * r, 0.08 * r, 0);

      /* 먼 쪽 집게 */
      const claw = (bx, by, open, tones, scale) => {
        const k = scale;
        artPoly(ctx, tones[1], [bx, by, bx + 0.4 * k * r, by - 0.26 * k * r, bx + 0.62 * k * r, by - (0.3 + open) * k * r, bx + 0.98 * k * r, by - (0.26 + open) * k * r, bx + 0.66 * k * r, by - 0.02 * k * r, bx + 0.3 * k * r, by + 0.16 * k * r], lw);
        artPoly(ctx, tones[2], [bx + 0.24 * k * r, by + 0.12 * k * r, bx + 0.62 * k * r, by + 0.02 * k * r, bx + 0.98 * k * r, by + (0.02 + open * 0.4) * k * r, bx + 0.62 * k * r, by + 0.32 * k * r, bx + 0.2 * k * r, by + 0.34 * k * r], lw);
        artPoly(ctx, tones[0], [bx + 0.12 * k * r, by - 0.02 * k * r, bx + 0.4 * k * r, by - 0.2 * k * r, bx + 0.58 * k * r, by - 0.2 * k * r, bx + 0.36 * k * r, by - 0.02 * k * r], 0);
      };
      const snap = 0.06 + Math.max(0, Math.sin(ph)) * 0.2;
      artLine(ctx, ART.OUT, [0.6 * r, 0.05 * r + bob, 1.0 * r, -0.42 * r + bob], lw * 3.2);
      artLine(ctx, DK[0], [0.6 * r, 0.05 * r + bob, 1.0 * r, -0.42 * r + bob], lw * 1.9);
      claw(0.9 * r, -0.5 * r + bob, snap, [DK[0], DK[1], DK[2]], 0.85);

      /* 가까운 쪽 다리 → 몸통: 납작한 갑옷 마디 */
      for (let i = 0; i < 4; i++) leg((-0.62 + i * 0.36) * r, i < 2 ? -0.8 : 0.8, i * 1.6 + Math.PI, false);
      artEllipse(ctx, DK[1], -0.1 * r, 0.42 * r + bob, 0.98 * r, 0.3 * r, lw);
      for (let i = 0; i < 5; i++) {
        const x = (-0.92 + i * 0.36) * r;
        const hgt = (0.56 + Math.sin((i / 4) * Math.PI) * 0.2) * r;
        const top = 0.42 * r - hgt + bob;
        artPoly(ctx, PU[2], [x + 0.12 * r, top + 0.02 * r, x + 0.2 * r, top - 0.2 * r, x + 0.3 * r, top + 0.02 * r], lw * 0.8);
        artPoly(ctx, i % 2 ? PU[1] : PU[2], [x - 0.04 * r, 0.42 * r + bob, x, top, x + 0.4 * r, top - 0.02 * r, x + 0.44 * r, 0.42 * r + bob], lw);
        artPoly(ctx, PU[0], [x + 0.04 * r, top + 0.12 * r, x + 0.06 * r, top + 0.04 * r, x + 0.34 * r, top + 0.02 * r, x + 0.3 * r, top + 0.12 * r], 0);
        artCircle(ctx, G[1], x + 0.2 * r, top + 0.3 * r, 0.05 * r, lw * 0.5);
        artLine(ctx, G[1], [x, 0.42 * r + bob - 0.03 * r, x + 0.4 * r, 0.42 * r + bob - 0.03 * r], lw * 0.9);
      }

      /* 머리판과 눈 */
      artPoly(ctx, PU[1], [0.72 * r, -0.2 * r + bob, 1.12 * r, -0.08 * r + bob, 1.22 * r, 0.3 * r + bob, 0.95 * r, 0.52 * r + bob, 0.7 * r, 0.44 * r + bob], lw);
      artPoly(ctx, PU[0], [0.78 * r, -0.12 * r + bob, 1.06 * r, -0.03 * r + bob, 1.1 * r, 0.14 * r + bob, 0.8 * r, 0.06 * r + bob], 0);
      artEye(ctx, 0.98 * r, 0.22 * r + bob, 0.085 * r, '#7dff6a');
      artCircle(ctx, '#7dff6a', 1.13 * r, 0.3 * r + bob, 0.04 * r, lw * 0.5);
      artCircle(ctx, '#7dff6a', 0.84 * r, 0.3 * r + bob, 0.04 * r, lw * 0.5);

      /* 가까운 쪽 집게 */
      artLine(ctx, ART.OUT, [0.8 * r, 0.42 * r + bob, 1.2 * r, 0.3 * r + bob, 1.3 * r, 0.02 * r + bob], lw * 3.4);
      artLine(ctx, PU[1], [0.8 * r, 0.42 * r + bob, 1.2 * r, 0.3 * r + bob, 1.3 * r, 0.02 * r + bob], lw * 2);
      claw(0.98 * r, -0.02 * r + bob, 0.26 - snap, PU, 1);
    },
  };
})();
