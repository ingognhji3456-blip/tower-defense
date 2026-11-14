'use strict';
/* 말벌 — 길 위를 낮게 나는 날쌘 적. 노랑·검정 줄무늬 배와 침, 붉은 겹눈, 파르르 떠는 날개. */
(function () {
  const Y = ['#fff08a', '#f6bd22', '#bb7c10'];
  const DK = ['#57475a', '#33283a', '#1f1826'];

  ENEMY_ART.hornet = {
    period: (Math.PI * 2) / 6,
    draw(ctx, r, t, o) {
      const seed = o.seed || 0;
      const bob = Math.sin(t * 6 + seed * 1.3) * 0.12 * r;
      const flap = Math.sin(t * 48 + seed);
      const lw = Math.max(0.022, r * 0.1);
      /* 떠 있으므로 그림자는 작고 옅다 */
      ctx.fillStyle = 'rgba(22,40,24,.16)';
      ctx.beginPath();
      ctx.ellipse(-0.1 * r, r, r * 0.85, r * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.translate(0.04 * r, -0.36 * r + bob);
      ctx.scale(0.9, 0.9);

      /* 날개: 빠르게 떨어서 잔상이 남는다 */
      const wing = (ang, alpha, len) => {
        ctx.save();
        ctx.translate(0.05 * r, -0.42 * r);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.ellipse(-len * 0.5 * r, 0, len * 0.5 * r, 0.26 * r, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(225,246,255,' + alpha + ')';
        ctx.fill();
        ctx.strokeStyle = 'rgba(43,37,54,' + Math.min(1, alpha + 0.25) + ')';
        ctx.lineWidth = lw * 0.6;
        ctx.stroke();
        ctx.restore();
      };
      wing(1.05 + flap * 0.5, 0.3, 1.25);
      wing(1.05 - flap * 0.5, 0.3, 1.25);
      wing(0.75 + flap * 0.38, 0.55, 1.5);

      /* 매달린 다리 */
      for (let i = 0; i < 3; i++) {
        const x = (-0.2 + i * 0.26) * r;
        const sw = Math.sin(t * 6 + i + seed) * 0.05 * r;
        const pts = [x, 0.05 * r, x - 0.1 * r + sw, 0.4 * r, x - 0.32 * r + sw, 0.58 * r];
        artLine(ctx, ART.OUT, pts, lw * 1.9);
        artLine(ctx, DK[0], pts, lw * 0.8);
      }

      /* 배: 뒤로 처진 줄무늬 물방울과 침 */
      ctx.save();
      ctx.translate(-0.3 * r, 0.02 * r);
      ctx.rotate(-0.42 + Math.sin(t * 6 + seed) * 0.06);
      artPoly(ctx, DK[2], [-1.3 * r, -0.06 * r, -1.78 * r, 0.02 * r, -1.3 * r, 0.1 * r], lw * 0.8);
      const belly = () => {
        ctx.beginPath();
        ctx.moveTo(0, -0.4 * r);
        ctx.bezierCurveTo(-0.7 * r, -0.62 * r, -1.25 * r, -0.3 * r, -1.42 * r, 0.02 * r);
        ctx.bezierCurveTo(-1.2 * r, 0.42 * r, -0.6 * r, 0.56 * r, 0, 0.36 * r);
        ctx.closePath();
      };
      belly();
      artFill(ctx, Y[1], lw);
      ctx.save();
      belly();
      ctx.clip();
      ctx.fillStyle = Y[2];
      ctx.fillRect(-1.5 * r, 0.14 * r, 1.6 * r, 0.5 * r);
      ctx.fillStyle = Y[0];
      ctx.fillRect(-1.5 * r, -0.7 * r, 1.6 * r, 0.3 * r);
      ctx.fillStyle = DK[1];
      for (const x of [-0.42, -0.82, -1.18]) ctx.fillRect(x * r, -0.7 * r, 0.19 * r, 1.4 * r);
      ctx.restore();
      belly();
      ctx.strokeStyle = ART.OUT;
      ctx.lineWidth = lw;
      ctx.stroke();
      ctx.restore();

      /* 가슴 */
      artEllipse(ctx, DK[1], 0.05 * r, -0.12 * r, 0.48 * r, 0.42 * r, lw);
      artEllipse(ctx, DK[0], -0.02 * r, -0.26 * r, 0.26 * r, 0.14 * r, 0);

      /* 머리, 겹눈, 턱, 더듬이 */
      const hx = 0.72 * r;
      const hy = -0.08 * r;
      for (const dy of [0, 0.1]) {
        const pts = [hx + 0.1 * r, hy - 0.34 * r, hx + 0.5 * r, hy - (0.86 + dy) * r, hx + (0.98 - dy) * r, hy - (0.62 + dy) * r];
        artLine(ctx, ART.OUT, pts, lw * 1.7);
        artLine(ctx, DK[0], pts, lw * 0.7);
      }
      artPoly(ctx, DK[1], [hx + 0.22 * r, hy + 0.22 * r, hx + 0.62 * r, hy + 0.42 * r, hx + 0.34 * r, hy + 0.56 * r, hx + 0.08 * r, hy + 0.4 * r], lw * 0.8);
      artEllipse(ctx, Y[1], hx, hy, 0.4 * r, 0.42 * r, lw);
      artEllipse(ctx, Y[0], hx - 0.1 * r, hy - 0.2 * r, 0.18 * r, 0.1 * r, 0);
      artEllipse(ctx, '#3a1418', hx + 0.14 * r, hy - 0.02 * r, 0.25 * r, 0.3 * r, 0, -0.3);
      artEllipse(ctx, '#ff5a3a', hx + 0.14 * r, hy - 0.02 * r, 0.19 * r, 0.24 * r, 0, -0.3);
      artCircle(ctx, '#ffd9c4', hx + 0.07 * r, hy - 0.12 * r, 0.07 * r, 0);

      wing(0.62 - flap * 0.42, 0.6, 1.5);
    },
  };
})();
