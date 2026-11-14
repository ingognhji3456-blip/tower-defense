'use strict';
/* 금광 — 싸우지 않고 골드를 캔다. 겨누지 않으므로 aim 은 쓰지 않는다.
   1단: 통나무로 받친 갱도와 광차.  2단: 도르래 기중기와 금 무더기가 늘어난 광산.  3단: 금장 문과 보물 상자, 깃발을 갖춘 금고 광산. */
(function () {
  const RK = ['#b9a48c', '#8c7860', '#5f4f3f'];
  const W = ART.wood;
  const D = ART.darkwood;
  const I = ART.iron;
  const G = ART.gold;
  const S = ART.stone;

  function nugget(ctx, x, y, s) {
    artPoly(ctx, G[1], [x - s, y, x - s * 0.6, y - s * 0.9, x + s * 0.3, y - s * 1.1, x + s, y - s * 0.3, x + s * 0.7, y], ART.LW * 0.45);
    artPoly(ctx, G[0], [x - s * 0.6, y - s * 0.9, x + s * 0.3, y - s * 1.1, x, y - s * 0.4], 0);
  }

  function pile(ctx, x, y, s) {
    nugget(ctx, x - s, y, s * 0.9);
    nugget(ctx, x + s, y, s * 0.8);
    nugget(ctx, x, y - s * 0.6, s);
  }

  function cart(ctx, x, y, s, full) {
    artCircle(ctx, I[2], x - s * 0.55, y, s * 0.24);
    artCircle(ctx, I[2], x + s * 0.55, y, s * 0.24);
    artCircle(ctx, I[0], x - s * 0.55, y, s * 0.09, 0);
    artCircle(ctx, I[0], x + s * 0.55, y, s * 0.09, 0);
    if (full) pile(ctx, x, y - s * 0.95, s * 0.42);
    artPoly(ctx, D[1], [x - s, y - s * 1.0, x + s, y - s * 1.0, x + s * 0.78, y - s * 0.12, x - s * 0.78, y - s * 0.12]);
    artPoly(ctx, D[0], [x - s, y - s * 1.0, x - s * 0.5, y - s * 1.0, x - s * 0.4, y - s * 0.12, x - s * 0.78, y - s * 0.12], 0);
    artLine(ctx, I[0], [x - s * 0.95, y - s * 0.72, x + s * 0.95, y - s * 0.72], s * 0.12);
  }

  TOWER_ART.mine = {
    body(ctx, level) {
      artShadow(ctx, 0.06, 0.34, 0.5, 0.15);
      const top = -0.42 - level * 0.12;
      /* 바위 언덕 */
      artPoly(ctx, RK[1], [-0.46, 0.36, -0.44, 0.04, -0.3, top + 0.16, -0.08, top, 0.16, top + 0.04, 0.36, top + 0.24, 0.46, 0.06, 0.47, 0.36]);
      artPoly(ctx, RK[0], [-0.44, 0.04, -0.3, top + 0.16, -0.08, top, 0.16, top + 0.04, 0.06, top + 0.2, -0.16, top + 0.26, -0.3, 0.02], 0);
      artPoly(ctx, RK[2], [0.36, top + 0.24, 0.46, 0.06, 0.47, 0.36, 0.3, 0.36, 0.28, 0.02], 0);
      artPoly(ctx, 'rgba(0,0,0,0)', [-0.46, 0.36, -0.44, 0.04, -0.3, top + 0.16, -0.08, top, 0.16, top + 0.04, 0.36, top + 0.24, 0.46, 0.06, 0.47, 0.36]);
      /* 바위에 박힌 금맥 */
      for (const [x, y, s] of [[-0.3, -0.02, 0.035], [0.3, top + 0.4, 0.03], [-0.12, top + 0.14, 0.03], [0.14, top + 0.2, 0.026]]) {
        artPoly(ctx, G[1], [x, y - s, x + s, y, x, y + s, x - s, y], ART.LW * 0.5);
      }
      if (level >= 1) {
        /* 도르래 기중기 */
        const cx = 0.3;
        artStroke(ctx, D[1], [cx, 0.3, cx, top - 0.3], 0.04);
        artStroke(ctx, D[0], [cx + 0.02, top - 0.28, cx - 0.3, top - 0.18], 0.035);
        artStroke(ctx, D[1], [cx, top - 0.02, cx - 0.14, top - 0.22], 0.025);
        artCircle(ctx, I[0], cx - 0.3, top - 0.18, 0.035);
        artLine(ctx, '#f0e2bd', [cx - 0.3, top - 0.15, cx - 0.3, top + 0.06], 0.014);
        artPoly(ctx, I[1], [cx - 0.37, top + 0.05, cx - 0.23, top + 0.05, cx - 0.25, top + 0.17, cx - 0.35, top + 0.17]);
        nugget(ctx, cx - 0.3, top + 0.06, 0.04);
      }
      /* 갱도 입구: 어두운 굴과 통나무 틀 (3단은 돌과 금으로 두른 문) */
      artArch(ctx, '#201a1c', -0.08, 0.36, 0.19, 0.46, ART.LW);
      artGlow(ctx, -0.08, 0.2, 0.2, '255,200,90', 0.35);
      if (level === 2) {
        ctx.beginPath();
        ctx.arc(-0.08, 0.09, 0.2, Math.PI, 0);
        ctx.strokeStyle = ART.OUT;
        ctx.lineWidth = 0.095;
        ctx.stroke();
        ctx.strokeStyle = S[1];
        ctx.lineWidth = 0.068;
        ctx.stroke();
        ctx.strokeStyle = G[1];
        ctx.lineWidth = 0.02;
        ctx.stroke();
        artRect(ctx, S[1], -0.315, 0.09, 0.07, 0.27, 0);
        artRect(ctx, S[2], 0.085, 0.09, 0.07, 0.27, 0);
        artPoly(ctx, G[1], [-0.08, -0.2, -0.03, -0.13, -0.08, -0.06, -0.13, -0.13], ART.LW * 0.6);
      } else {
        artStroke(ctx, W[0], [-0.28, 0.36, -0.27, -0.08], 0.05);
        artStroke(ctx, W[2], [0.12, 0.36, 0.11, -0.08], 0.05);
        artStroke(ctx, W[1], [-0.32, -0.1, 0.16, -0.1], 0.06);
        artCircle(ctx, I[0], -0.27, -0.1, 0.014, 0);
        artCircle(ctx, I[0], 0.11, -0.1, 0.014, 0);
      }
      artLantern(ctx, -0.08, -0.0, 0.85);
      /* 선로와 광차 */
      artLine(ctx, ART.OUT, [-0.2, 0.4, 0.24, 0.4], 0.04);
      artLine(ctx, I[0], [-0.2, 0.4, 0.24, 0.4], 0.018);
      for (const x of [-0.14, -0.02, 0.1, 0.2]) artLine(ctx, D[2], [x, 0.37, x, 0.43], 0.02);
      cart(ctx, 0.04, 0.37, 0.13, true);
      /* 곡괭이와 금 무더기 */
      artLine(ctx, ART.OUT, [-0.4, 0.4, -0.3, 0.16], 0.036);
      artLine(ctx, W[0], [-0.4, 0.4, -0.3, 0.16], 0.016);
      artStroke(ctx, I[0], artCurve(-0.4, 0.2, -0.3, 0.1, -0.2, 0.19, 6), 0.026);
      pile(ctx, 0.36, 0.42, 0.05 + level * 0.008);
      if (level >= 1) pile(ctx, -0.38, 0.44, 0.045);
      if (level === 2) {
        /* 보물 상자와 깃발 */
        artRect(ctx, D[1], 0.22, 0.2, 0.2, 0.13, 0.015);
        artPoly(ctx, G[1], [0.22, 0.2, 0.42, 0.2, 0.4, 0.13, 0.24, 0.13]);
        nugget(ctx, 0.32, 0.15, 0.05);
        artRect(ctx, G[1], 0.3, 0.2, 0.04, 0.06, 0, ART.LW * 0.5);
        artLine(ctx, ART.OUT, [-0.08, top, -0.08, top - 0.34], 0.034);
        artLine(ctx, W[0], [-0.08, top, -0.08, top - 0.34], 0.015);
        artCircle(ctx, G[1], -0.08, top - 0.35, 0.02, ART.LW * 0.6);
      }
    },

    top(ctx, level, aim, o) {
      const t = o.t;
      const top = -0.42 - level * 0.12;
      if (level === 2) artFlag(ctx, G, -0.08, top - 0.33, 0.2, 0.13, t);
      /* 금이 반짝인다 */
      const spots = [[0.04, 0.2], [0.36, 0.36], [-0.3, -0.02], [0.14, top + 0.2], [-0.38, 0.4], [0.32, 0.14]];
      for (let i = 0; i < 3 + level; i++) {
        const k = (t * 0.6 + i * 0.31) % 1;
        const [x, y] = spots[i % spots.length];
        artSparkle(ctx, x, y, 0.03 + 0.025 * Math.sin(k * Math.PI), '#fff6cf', Math.sin(k * Math.PI));
      }
      /* 골드를 캔 순간: 동전이 튀어 오른다 */
      if (o.flash > 0) {
        const k = 1 - o.flash;
        for (const sx of [-1, 0, 1]) {
          const x = 0.04 + sx * (0.06 + k * 0.1);
          const y = 0.12 - Math.sin(k * Math.PI) * (0.3 + Math.abs(sx) * -0.08);
          ctx.globalAlpha = Math.min(1, o.flash * 2);
          artCircle(ctx, G[1], x, y, 0.04, ART.LW * 0.7);
          artRect(ctx, G[2], x - 0.012, y - 0.012, 0.024, 0.024, 0, 0);
          ctx.globalAlpha = 1;
        }
      }
    },
  };
})();
