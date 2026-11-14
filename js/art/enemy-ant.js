'use strict';
/* 병정개미 — 떼로 몰려오는 기본 적. 붉은 갑옷, 큰 턱, 줄무늬 배. */
(function () {
  const RED = ['#ff7a5c', '#d8432f', '#8f2420'];
  const DARK = ['#6b3a3a', '#43222a', '#2b1620'];

  ENEMY_ART.ant = {
    period: (Math.PI * 4) / 16, /* 움직임이 한 바퀴 도는 시간(초) */
    draw(ctx, r, t, o) {
      const ph = t * 16 + (o.seed || 0) * 1.7;
      const bob = Math.sin(ph * 2) * 0.04 * r;
      const lw = Math.max(0.022, r * 0.1);
      artShadow(ctx, 0, r * 0.98, r * 1.25, r * 0.26);
      /* 몸 전체를 범위 안에 들도록 조금 줄여 그린다 (발은 그대로 땅에 닿게) */
      ctx.translate(-0.1 * r, r * 0.16);
      ctx.scale(0.84, 0.84);

      /* 다리 여섯: 세 개씩 번갈아 딛는다. 먼 쪽 다리를 먼저. */
      const leg = (x, dir, phase, far) => {
        const s = Math.sin(ph + phase);
        const lift = Math.max(0, Math.cos(ph + phase)) * 0.22 * r;
        const hip = [x, 0.18 * r + bob];
        const knee = [x + (dir * 0.3 + s * 0.1) * r, -0.28 * r + bob - (far ? 0.12 : 0) * r];
        const foot = [x + (dir * 0.62 + s * 0.3) * r, r * (far ? 0.84 : 0.98) - lift];
        const pts = [hip[0], hip[1], knee[0], knee[1], foot[0], foot[1]];
        artLine(ctx, ART.OUT, pts, lw * 2.1);
        artLine(ctx, far ? DARK[1] : DARK[0], pts, lw * 0.95);
      };
      leg(-0.3 * r, -1, Math.PI, true);
      leg(0.05 * r, 0.1, 0, true);
      leg(0.36 * r, 1, Math.PI, true);

      /* 배: 줄무늬가 있는 통통한 뒷몸 */
      ctx.save();
      ctx.translate(-0.92 * r, -0.05 * r + bob);
      ctx.rotate(-0.22 + Math.sin(ph) * 0.05);
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.74 * r, 0.56 * r, 0, 0, Math.PI * 2);
      artFill(ctx, RED[1], lw);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.74 * r, 0.56 * r, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = RED[2];
      ctx.fillRect(-0.8 * r, 0.12 * r, 1.6 * r, 0.6 * r);
      ctx.fillStyle = DARK[1];
      ctx.fillRect(-0.42 * r, -0.7 * r, 0.16 * r, 1.4 * r);
      ctx.fillRect(-0.02 * r, -0.7 * r, 0.16 * r, 1.4 * r);
      ctx.fillStyle = RED[0];
      ctx.beginPath();
      ctx.ellipse(0.2 * r, -0.3 * r, 0.3 * r, 0.14 * r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.restore();

      /* 가슴 */
      artEllipse(ctx, RED[1], 0, 0.02 * r + bob, 0.46 * r, 0.4 * r, lw);
      artEllipse(ctx, RED[0], -0.06 * r, -0.14 * r + bob, 0.24 * r, 0.14 * r, 0);

      leg(-0.22 * r, -1, 0, false);
      leg(0.1 * r, 0.1, Math.PI, false);
      leg(0.4 * r, 1, 0, false);

      /* 머리: 크고 각진 투구 모양 */
      const hx = 0.88 * r;
      const hy = -0.22 * r + bob;
      /* 더듬이 */
      const sway = Math.sin(ph * 0.5) * 0.1 * r;
      for (const dy of [0, 0.12]) {
        const pts = [hx + 0.05 * r, hy - 0.4 * r, hx + 0.35 * r, hy - (1.0 + dy) * r, hx + (0.85 - dy) * r, hy - (0.9 + dy) * r + sway];
        artLine(ctx, ART.OUT, pts, lw * 1.7);
        artLine(ctx, DARK[0], pts, lw * 0.7);
      }
      /* 턱: 벌렸다 오므렸다 */
      const bite = 0.1 + Math.abs(Math.sin(ph * 0.5)) * 0.14;
      artPoly(ctx, DARK[1], [hx + 0.3 * r, hy + 0.22 * r, hx + 1.0 * r, hy + (0.12 + bite) * r, hx + 0.85 * r, hy + (0.42 + bite) * r, hx + 0.38 * r, hy + 0.52 * r], lw);
      artPoly(ctx, DARK[0], [hx + 0.34 * r, hy + 0.02 * r, hx + 1.02 * r, hy + (0.1 - bite) * r, hx + 0.8 * r, hy + (0.32 - bite * 0.4) * r, hx + 0.4 * r, hy + 0.3 * r], lw);
      artPoly(ctx, RED[1], [hx - 0.42 * r, hy - 0.12 * r, hx - 0.12 * r, hy - 0.5 * r, hx + 0.38 * r, hy - 0.42 * r, hx + 0.56 * r, hy + 0.06 * r, hx + 0.34 * r, hy + 0.46 * r, hx - 0.24 * r, hy + 0.42 * r], lw);
      artPoly(ctx, RED[0], [hx - 0.3 * r, hy - 0.14 * r, hx - 0.08 * r, hy - 0.4 * r, hx + 0.3 * r, hy - 0.34 * r, hx + 0.1 * r, hy - 0.16 * r], 0);
      artEye(ctx, hx + 0.2 * r, hy + 0.02 * r, 0.15 * r, '#ffe45a');
    },
  };
})();
