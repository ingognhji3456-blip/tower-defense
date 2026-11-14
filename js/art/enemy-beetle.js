'use strict';
/* 장수풍뎅이 — 단단한 껍질의 느린 적. 에메랄드빛 등딱지와 갈라진 큰 뿔. */
(function () {
  const SH = ['#74e8ae', '#1fa06d', '#0e6b4d'];
  const BR = ['#ecc079', '#b07f33', '#6d4b1d'];
  const DK = ['#4a4150', '#2d2634', '#1c1722'];

  ENEMY_ART.beetle = {
    period: (Math.PI * 4) / 7,
    draw(ctx, r, t, o) {
      const ph = t * 7 + (o.seed || 0) * 1.9;
      const bob = Math.abs(Math.sin(ph)) * 0.04 * r;
      const lw = Math.max(0.024, r * 0.09);
      artShadow(ctx, -0.1 * r, r * 0.98, r * 1.4, r * 0.28);
      ctx.translate(-0.15 * r, 0);

      const leg = (x, dir, phase, far) => {
        const s = Math.sin(ph + phase);
        const up = Math.max(0, Math.cos(ph + phase)) * 0.14 * r;
        const pts = [x, 0.3 * r, x + (dir * 0.28 + s * 0.08) * r, 0.52 * r - up, x + (dir * 0.42 + s * 0.22) * r, (far ? 0.9 : 1.0) * r - up];
        artLine(ctx, ART.OUT, pts, lw * 2.8);
        artLine(ctx, far ? DK[1] : DK[0], pts, lw * 1.5);
      };
      leg(-0.75 * r, -1, 0, true);
      leg(-0.05 * r, 0.2, Math.PI, true);
      leg(0.6 * r, 1, 0, true);

      /* 배 밑면 */
      artEllipse(ctx, DK[1], -0.2 * r, 0.32 * r - bob, 1.05 * r, 0.3 * r, lw);

      /* 등딱지: 높이 솟은 둥근 지붕 */
      const shell = () => {
        ctx.beginPath();
        ctx.moveTo(-1.32 * r, 0.3 * r - bob);
        ctx.bezierCurveTo(-1.45 * r, -0.75 * r - bob, -0.5 * r, -1.2 * r - bob, 0.25 * r, -0.95 * r - bob);
        ctx.bezierCurveTo(0.62 * r, -0.8 * r - bob, 0.72 * r, -0.2 * r - bob, 0.66 * r, 0.3 * r - bob);
        ctx.closePath();
      };
      shell();
      artFill(ctx, SH[1], lw);
      ctx.save();
      shell();
      ctx.clip();
      ctx.fillStyle = SH[2];
      ctx.beginPath();
      ctx.ellipse(-0.25 * r, 0.42 * r - bob, 1.3 * r, 0.5 * r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = SH[0];
      ctx.beginPath();
      ctx.ellipse(-0.55 * r, -0.72 * r - bob, 0.5 * r, 0.2 * r, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath();
      ctx.ellipse(-0.7 * r, -0.78 * r - bob, 0.16 * r, 0.06 * r, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      /* 딱지날개가 맞물리는 금과 테두리 */
      ctx.beginPath();
      ctx.moveTo(0.3 * r, -0.92 * r - bob);
      ctx.bezierCurveTo(-0.2 * r, -0.6 * r - bob, -0.9 * r, -0.2 * r - bob, -1.3 * r, 0.22 * r - bob);
      ctx.strokeStyle = ART.OUT;
      ctx.lineWidth = lw * 0.8;
      ctx.stroke();
      artLine(ctx, BR[1], [-1.28 * r, 0.3 * r - bob, 0.64 * r, 0.3 * r - bob], lw * 1.2);

      /* 앞가슴판과 작은 뿔 */
      artPoly(ctx, BR[1], [0.3 * r, -0.9 * r - bob, 0.75 * r, -0.72 * r - bob, 1.08 * r, -0.2 * r - bob, 1.05 * r, 0.32 * r - bob, 0.5 * r, 0.34 * r - bob, 0.56 * r, -0.3 * r - bob], lw);
      artPoly(ctx, BR[0], [0.42 * r, -0.8 * r - bob, 0.72 * r, -0.66 * r - bob, 0.92 * r, -0.3 * r - bob, 0.66 * r, -0.36 * r - bob], 0);
      artPoly(ctx, BR[2], [0.55 * r, -0.82 * r - bob, 0.78 * r, -1.32 * r - bob, 0.9 * r, -1.28 * r - bob, 0.82 * r, -0.68 * r - bob], lw);

      leg(-0.6 * r, -1, Math.PI, false);
      leg(0.1 * r, 0.2, 0, false);
      leg(0.75 * r, 1, Math.PI, false);

      /* 머리와 갈라진 큰 뿔 */
      const nod = Math.sin(ph * 0.5) * 0.04 * r;
      artPoly(ctx, DK[0], [
        1.2 * r, 0.02 * r - bob, 1.52 * r, -0.5 * r + nod, 1.56 * r, -1.02 * r + nod, 1.36 * r, -1.36 * r + nod, 1.52 * r, -1.44 * r + nod,
        1.7 * r, -1.14 * r + nod, 1.9 * r, -1.32 * r + nod, 1.98 * r, -1.14 * r + nod, 1.76 * r, -0.86 * r + nod, 1.74 * r, -0.4 * r + nod, 1.45 * r, 0.22 * r - bob,
      ], lw);
      artLine(ctx, DK[2], [1.48 * r, -0.1 * r, 1.64 * r, -0.5 * r + nod, 1.66 * r, -0.95 * r + nod], lw * 0.9);
      artEllipse(ctx, DK[1], 1.2 * r, 0.12 * r - bob, 0.3 * r, 0.26 * r, lw);
      artEye(ctx, 1.26 * r, 0.06 * r - bob, 0.1 * r, '#ff9a3a');
    },
  };
})();
