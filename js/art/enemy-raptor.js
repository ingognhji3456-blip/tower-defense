'use strict';
/* 랩터 — 빠르고 질긴 우두머리. 두 발로 내달리는 청록 공룡, 주황 줄무늬와 붉은 깃 볏, 벌린 입. */
(function () {
  const TE = ['#7ee9d6', '#22a898', '#10706a'];
  const BELLY = '#f6e8bd';
  const OR = ART.orange;
  const RD = ART.red;

  ENEMY_ART.raptor = {
    draw(ctx, r, t, o) {
      const ph = t * 13 + (o.seed || 0) * 2.1;
      const lw = Math.max(0.026, r * 0.075);
      const bob = Math.sin(ph * 2) * 0.05 * r;
      artShadow(ctx, 0, r * 0.98, r * 1.4, r * 0.26);
      ctx.translate(-0.05 * r, bob);

      /* 뒷다리: 허벅지 → 무릎(앞) → 발목(뒤) → 발 */
      const leg = (phase, tones) => {
        const s = Math.sin(ph + phase);
        const c = Math.cos(ph + phase);
        const hip = [-0.22 * r, -0.2 * r];
        const foot = [(-0.25 + s * 0.72) * r, (0.98 - Math.max(0, c) * 0.34) * r - bob];
        const knee = [hip[0] + (0.3 + s * 0.2) * r, hip[1] + 0.42 * r];
        const ankle = [foot[0] - 0.3 * r, foot[1] - 0.36 * r];
        artLine(ctx, ART.OUT, [hip[0], hip[1], knee[0], knee[1]], lw * 5.4);
        artLine(ctx, tones[1], [hip[0], hip[1], knee[0], knee[1]], lw * 4);
        const shin = [knee[0], knee[1], ankle[0], ankle[1], foot[0], foot[1]];
        artLine(ctx, ART.OUT, shin, lw * 3);
        artLine(ctx, tones[2], shin, lw * 1.7);
        artPoly(ctx, tones[1], [foot[0] - 0.12 * r, foot[1] - 0.1 * r, foot[0] + 0.36 * r, foot[1] - 0.08 * r, foot[0] + 0.42 * r, foot[1] + 0.03 * r, foot[0] - 0.1 * r, foot[1] + 0.03 * r], lw * 0.9);
        artPoly(ctx, '#fbf3e0', [foot[0] + 0.04 * r, foot[1] - 0.12 * r, foot[0] + 0.3 * r, foot[1] - 0.38 * r, foot[0] + 0.2 * r, foot[1] - 0.08 * r], lw * 0.7);
      };
      leg(Math.PI, [TE[1], TE[2], TE[2]]);

      /* 꼬리: 뒤로 곧게 뻗어 균형을 잡는다 */
      const tw = Math.sin(ph) * 0.1 * r;
      ctx.beginPath();
      ctx.moveTo(-0.3 * r, -0.62 * r);
      ctx.quadraticCurveTo(-1.1 * r, -0.72 * r + tw * 0.5, -1.85 * r, -0.5 * r + tw);
      ctx.quadraticCurveTo(-1.1 * r, -0.36 * r + tw * 0.5, -0.4 * r, 0.02 * r);
      ctx.closePath();
      artFill(ctx, TE[1], lw);
      for (let i = 0; i < 4; i++) {
        const x = (-0.62 - i * 0.28) * r;
        const y = -0.63 * r + tw * (i / 4) + i * 0.012 * r;
        artPoly(ctx, OR[1], [x, y, x - 0.14 * r, y + 0.01 * r, x - 0.1 * r, y + (0.2 - i * 0.03) * r, x - 0.02 * r, y + (0.22 - i * 0.03) * r], 0);
      }

      /* 몸통과 목 */
      ctx.beginPath();
      ctx.moveTo(-0.5 * r, -0.66 * r);
      ctx.quadraticCurveTo(0.1 * r, -0.86 * r, 0.6 * r, -0.92 * r);
      ctx.quadraticCurveTo(0.9 * r, -1.25 * r, 1.05 * r, -1.36 * r);
      ctx.lineTo(1.3 * r, -0.98 * r);
      ctx.quadraticCurveTo(1.0 * r, -0.6 * r, 0.78 * r, -0.12 * r);
      ctx.quadraticCurveTo(0.2 * r, 0.22 * r, -0.45 * r, 0.02 * r);
      ctx.closePath();
      artFill(ctx, TE[1], lw);
      artPoly(ctx, BELLY, [1.24 * r, -0.96 * r, 0.98 * r, -0.6 * r, 0.76 * r, -0.14 * r, 0.3 * r, 0.1 * r, 0.42 * r, -0.2 * r, 0.82 * r, -0.62 * r, 1.08 * r, -0.98 * r], 0);
      artPoly(ctx, TE[0], [-0.4 * r, -0.62 * r, 0.1 * r, -0.78 * r, 0.56 * r, -0.84 * r, 0.3 * r, -0.62 * r, -0.2 * r, -0.5 * r], 0);
      for (let i = 0; i < 3; i++) {
        const x = (-0.32 + i * 0.3) * r;
        const y = (-0.67 - i * 0.07) * r;
        artPoly(ctx, OR[1], [x, y, x + 0.15 * r, y - 0.03 * r, x + 0.12 * r, y + 0.3 * r, x + 0.04 * r, y + 0.32 * r], 0);
      }
      /* 등과 목의 붉은 깃 */
      for (let i = 0; i < 4; i++) {
        const f = i / 3;
        const x = (0.5 + f * 0.5) * r;
        const y = (-0.92 - f * 0.42) * r;
        artPoly(ctx, RD[1], [x - 0.06 * r, y + 0.04 * r, x - 0.3 * r, y - (0.24 + f * 0.1) * r, x + 0.08 * r, y - 0.04 * r], lw * 0.8);
      }

      leg(0, TE);

      /* 작은 앞발 */
      const paw = Math.sin(ph * 2) * 0.05 * r;
      artLine(ctx, ART.OUT, [0.72 * r, -0.38 * r, 0.98 * r, -0.14 * r + paw, 1.2 * r, -0.2 * r + paw], lw * 2.3);
      artLine(ctx, TE[2], [0.72 * r, -0.38 * r, 0.98 * r, -0.14 * r + paw, 1.2 * r, -0.2 * r + paw], lw * 1.1);
      artPoly(ctx, '#fbf3e0', [1.18 * r, -0.25 * r + paw, 1.36 * r, -0.12 * r + paw, 1.2 * r, -0.14 * r + paw], lw * 0.6);

      /* 머리: 길쭉한 주둥이, 벌린 턱과 이빨 */
      const hx = 1.12 * r;
      const hy = -1.2 * r;
      const jaw = 0.12 + Math.max(0, Math.sin(ph * 0.5)) * 0.16;
      artPoly(ctx, TE[2], [hx - 0.06 * r, hy + 0.1 * r, hx + 0.74 * r, hy + (0.2 + jaw) * r, hx + 0.7 * r, hy + (0.34 + jaw) * r, hx - 0.02 * r, hy + 0.36 * r], lw);
      artPoly(ctx, '#7a1f2a', [hx + 0.05 * r, hy + 0.1 * r, hx + 0.7 * r, hy + 0.12 * r, hx + 0.68 * r, hy + (0.2 + jaw) * r, hx + 0.02 * r, hy + 0.22 * r], 0);
      for (let i = 0; i < 4; i++) {
        const x = hx + (0.2 + i * 0.13) * r;
        artPoly(ctx, '#ffffff', [x, hy + 0.1 * r, x + 0.09 * r, hy + 0.1 * r, x + 0.045 * r, hy + 0.23 * r], lw * 0.45);
      }
      artPoly(ctx, TE[1], [hx - 0.3 * r, hy - 0.12 * r, hx + 0.02 * r, hy - 0.36 * r, hx + 0.4 * r, hy - 0.26 * r, hx + 0.8 * r, hy - 0.12 * r, hx + 0.82 * r, hy + 0.1 * r, hx + 0.1 * r, hy + 0.14 * r, hx - 0.22 * r, hy + 0.3 * r], lw);
      artPoly(ctx, TE[0], [hx - 0.18 * r, hy - 0.12 * r, hx + 0.04 * r, hy - 0.28 * r, hx + 0.38 * r, hy - 0.2 * r, hx + 0.2 * r, hy - 0.08 * r], 0);
      artCircle(ctx, ART.OUT, hx + 0.7 * r, hy - 0.04 * r, 0.035 * r, 0);
      artPoly(ctx, RD[1], [hx - 0.24 * r, hy - 0.16 * r, hx - 0.62 * r, hy - 0.5 * r, hx - 0.28 * r, hy - 0.36 * r, hx - 0.5 * r, hy - 0.72 * r, hx - 0.06 * r, hy - 0.4 * r, hx + 0.04 * r, hy - 0.3 * r], lw * 0.8);
      artEye(ctx, hx + 0.2 * r, hy - 0.06 * r, 0.1 * r, '#ffe45a');
      artLine(ctx, ART.OUT, [hx + 0.04 * r, hy - 0.22 * r, hx + 0.34 * r, hy - 0.15 * r], lw * 0.9);
    },
  };
})();
