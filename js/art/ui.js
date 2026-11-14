'use strict';
/* 화면 꾸밈 그림 — 뽑기 화면의 보물 상자. 1 단위가 상자 너비쯤인 좌표계에 그린다. 원점은 상자 바닥 가운데. */
const UI_ART = {
  /* open: 0(닫힘) ~ 1(활짝 열림), t: 초 */
  chest(ctx, open, t) {
    const D = ART.darkwood;
    const W = ART.wood;
    const G = ART.gold;
    const I = ART.iron;
    artShadow(ctx, 0.02, 0.02, 0.62, 0.11);
    if (open > 0) {
      /* 상자 안에서 뿜어 나오는 빛 */
      const k = open;
      artGlow(ctx, 0, -0.42, 0.55 * k + 0.2, '255,226,126', 0.75 * k);
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * 0.2 + Math.sin(t * 0.8 + i) * 0.03;
        const len = (0.4 + (i % 2) * 0.14) * k;
        ctx.globalAlpha = 0.5 * k;
        artPoly(ctx, '#fff1a8', [Math.cos(a - 0.05) * 0.2, -0.4 + Math.sin(a - 0.05) * 0.2, Math.cos(a) * (0.2 + len), -0.4 + Math.sin(a) * (0.2 + len), Math.cos(a + 0.05) * 0.2, -0.4 + Math.sin(a + 0.05) * 0.2], 0);
        ctx.globalAlpha = 1;
      }
    }
    /* 뚜껑 (열리면 뒤로 젖혀진다) */
    ctx.save();
    ctx.translate(0, -0.44);
    const lift = open * 0.3;
    ctx.translate(0, -lift);
    ctx.scale(1, 1 - open * 0.45);
    ctx.beginPath();
    ctx.moveTo(-0.5, 0);
    ctx.bezierCurveTo(-0.5, -0.36, 0.5, -0.36, 0.5, 0);
    ctx.closePath();
    artFill(ctx, D[1]);
    ctx.beginPath();
    ctx.moveTo(-0.5, 0);
    ctx.bezierCurveTo(-0.5, -0.36, -0.1, -0.36, -0.1, 0);
    ctx.closePath();
    artFill(ctx, D[0], 0);
    for (const x of [-0.3, 0, 0.3]) artRect(ctx, G[1], x - 0.04, -0.27 + Math.abs(x) * 0.22, 0.08, 0.27 - Math.abs(x) * 0.22, 0, ART.LW * 0.7);
    artRect(ctx, G[1], -0.52, -0.05, 1.04, 0.08, 0.02);
    ctx.restore();
    if (open > 0.3) {
      /* 안쪽 어둠과 금화 */
      artEllipse(ctx, '#3a2418', 0, -0.43, 0.47, 0.09);
      for (const [x, y, r] of [[-0.25, -0.45, 0.07], [0.0, -0.48, 0.085], [0.24, -0.45, 0.07], [-0.12, -0.42, 0.06], [0.13, -0.42, 0.06]]) {
        artCircle(ctx, G[1], x, y, r, ART.LW * 0.7);
        artCircle(ctx, G[0], x - r * 0.25, y - r * 0.25, r * 0.4, 0);
      }
    }
    /* 몸통 */
    artRect(ctx, D[1], -0.5, -0.44, 1.0, 0.44, 0.03);
    artRect(ctx, D[0], -0.5, -0.44, 0.34, 0.44, 0.03, 0);
    artRect(ctx, W[1], -0.5, -0.24, 1.0, 0.04, 0, 0);
    for (const x of [-0.3, 0.3]) artRect(ctx, G[1], x - 0.04, -0.44, 0.08, 0.44, 0, ART.LW * 0.7);
    artRect(ctx, G[1], -0.52, -0.06, 1.04, 0.07, 0.02);
    artRect(ctx, G[1], -0.52, -0.46, 1.04, 0.07, 0.02);
    /* 자물쇠 */
    artRect(ctx, G[0], -0.09, -0.4, 0.18, 0.2, 0.03);
    artCircle(ctx, I[2], 0, -0.32, 0.03, 0);
    artRect(ctx, I[2], -0.012, -0.32, 0.024, 0.07, 0, 0);
    /* 반짝임 */
    artSparkle(ctx, -0.58, -0.62, 0.06 + 0.02 * Math.sin(t * 3), '#fff6cf', 0.6 + 0.4 * Math.sin(t * 3));
    artSparkle(ctx, 0.6, -0.38, 0.045 + 0.02 * Math.sin(t * 2.3 + 1), '#fff6cf', 0.6 + 0.4 * Math.sin(t * 2.3 + 1));
  },
};
