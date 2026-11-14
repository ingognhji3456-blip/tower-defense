'use strict';
/* 마법사의 탑 — 뾰족 모자 지붕 둘레를 도는 마법 구슬들이 적을 쫓아가 터진다.
   1단: 창 하나짜리 낮은 탑에 끝이 휜 모자 지붕.
   2단: 옆구리에 곁탑이 하나 돋고, 모자에 금띠와 달을 달았다.
   3단: 양쪽에 곁탑을 단 높은 탑. 금테와 별 걸개, 모자 끝의 초승달. */
(function () {
  const G = ART.gold;
  const R = ART.red;
  const BL = ART.blue;
  const P = ART.purple;
  const K = ART.K;
  const H = (level) => TOWERS.wizard.levels[level].h;
  const ARCANE = ['#b9a8e6', '#7a68b8', '#4b3d80'];
  const HAT = ['#6f8fe6', '#3f5cb8', '#27397a'];
  const LIT = '#ffe9a8';
  const TOP = [-0.42, -0.58, -0.76];

  /* 빛나는 둥근 창 */
  function porthole(ctx, x, y, r) {
    artCircle(ctx, G[2], x, y, r);
    artCircle(ctx, LIT, x, y, r * 0.62, 0);
    artLine(ctx, G[2], [x - r * 0.62, y, x + r * 0.62, y], 0.012);
    artLine(ctx, G[2], [x, y - r * 0.62, x, y + r * 0.62], 0.012);
  }

  /* 끝이 휜 뾰족 모자 지붕. (x, y) = 챙의 가운데, r = 챙 반지름, hgt = 높이, bend = 끝이 휜 만큼 */
  function hat(ctx, x, y, r, hgt, bend, band) {
    artEllipse(ctx, HAT[2], x, y + 0.012, r, r * K);
    const rr = r * 0.74;
    ctx.beginPath();
    ctx.moveTo(x - rr, y - 0.01);
    ctx.quadraticCurveTo(x - rr * 0.25, y - hgt * 0.6, x + bend, y - hgt);
    ctx.quadraticCurveTo(x + rr * 0.45, y - hgt * 0.55, x + rr, y - 0.01);
    ctx.ellipse(x, y - 0.01, rr, rr * K, 0, 0, Math.PI, false);
    ctx.closePath();
    artFill(ctx, artRound(ctx, HAT, x, r));
    if (band) artHoop(ctx, x, y - 0.03, rr - 0.004, band, r * 0.13, true);
  }

  /* 옆구리에 내민 곁탑 */
  function turret(ctx, x, y, gold) {
    artPoly(ctx, ARCANE[2], [x - 0.085, y + 0.2, x + 0.085, y + 0.2, x - Math.sign(x) * 0.07, y + 0.34]);
    artCylinder(ctx, ARCANE, x, y, y + 0.2, 0.085, 0.085, { topFill: ARCANE[2] });
    porthole(ctx, x, y + 0.13, 0.035);
    hat(ctx, x, y + 0.01, 0.13, 0.22, Math.sign(x) * 0.03, gold ? G[1] : null);
    artCircle(ctx, G[0], x + Math.sign(x) * 0.03, y - 0.21, 0.022, ART.LW * 0.8);
  }

  TOWER_ART.wizard = {
    body(ctx, level) {
      const top = TOP[level];
      const hoops = level === 2 ? [[top + 0.1, G[1], 0.032], [0.1, G[1], 0.03]] : level === 1 ? [[top + 0.1, G[1], 0.03]] : [];
      const rAt = KIT.round(ctx, {
        tones: ARCANE, top, rTop: 0.2, rBot: 0.31, rows: 3 + level, rgb: '40,30,80', hoops,
        door: [P[0], P[1], P[2]], lit: LIT,
      });
      artGlow(ctx, 0, 0.26, 0.13, '255,233,168', 0.35);
      /* 창 */
      const wins = level === 0 ? [-0.12] : level === 1 ? [-0.3, -0.05] : [-0.5, -0.27, -0.04];
      for (const y of wins) porthole(ctx, 0, y + rAt(y) * K, 0.052);
      if (level === 2) {
        /* 별 걸개 */
        KIT.banner(ctx, 0.15, top + 0.3, 0.05, 0.19, P, (c, x, y) => KIT.sign.star(c, x, y - 0.01, 0.03, G[0]));
      }
      /* 곁탑 */
      if (level >= 1) turret(ctx, 0.29, top + 0.2, level === 2);
      if (level === 2) turret(ctx, -0.3, top + 0.36, true);

      /* 모자 지붕 */
      const r = 0.33 + level * 0.015;
      const hgt = 0.48 + level * 0.03;
      hat(ctx, 0, top, r, hgt, 0.09, level >= 1 ? G[1] : null);
      KIT.sign.star(ctx, -0.07, top - 0.17, 0.038, G[0]);
      if (level >= 1) KIT.sign.star(ctx, 0.08, top - 0.12, 0.028, '#ffffff');
      if (level >= 1) KIT.sign.moon(ctx, 0.0, top - 0.3, 0.036, G[0]);
      if (level === 2) {
        /* 모자 끝의 초승달 */
        artLine(ctx, ART.OUT, [0.09, top - hgt + 0.01, 0.09, top - hgt - 0.05], 0.03);
        KIT.sign.moon(ctx, 0.09, top - hgt - 0.1, 0.06, G[0]);
      } else {
        artCircle(ctx, G[0], 0.09, top - hgt, 0.032, ART.LW * 0.8);
      }

      /* 발치의 책과 수정 */
      artRect(ctx, R[1], -0.43, 0.4, 0.13, 0.045, 0.006);
      artRect(ctx, BL[1], -0.41, 0.36, 0.12, 0.042, 0.006);
      artPoly(ctx, P[1], [0.33, 0.45, 0.365, 0.29, 0.42, 0.45]);
      artPoly(ctx, P[0], [0.33, 0.45, 0.365, 0.29, 0.37, 0.45], 0);
      if (level >= 1) artPoly(ctx, P[1], [0.27, 0.46, 0.295, 0.36, 0.33, 0.46]);
    },

    top(ctx, level, aim, o) {
      const h = H(level);
      const t = o.t;
      const n = TOWERS.wizard.levels[level].multi;
      /* 수정이 은은히 빛난다 */
      artGlow(ctx, 0.37, 0.38, 0.12, '203,166,255', 0.3 + 0.15 * Math.sin(t * 2.5));
      if (level === 2) {
        /* 모자 둘레의 반짝임 */
        for (let i = 0; i < 3; i++) {
          const k = (t * 0.6 + i / 3) % 1;
          artSparkle(ctx, Math.sin(i * 2.4 + 1) * 0.3, -h - 0.25 + i * 0.16, 0.035 * Math.sin(k * Math.PI), '#fff6cf', 1);
        }
      }
      /* 지붕 둘레를 도는 구슬: 뒤쪽 것은 작고 어둡다 */
      const list = [];
      for (let i = 0; i < n; i++) {
        const q = t * 1.5 + (i * Math.PI * 2) / n;
        list.push([Math.sin(q), Math.cos(q)]);
      }
      list.sort((p, q) => p[0] - q[0]);
      for (const [depth, c] of list) {
        const x = c * (0.34 + level * 0.02);
        const y = -h + depth * 0.09 - o.recoil * 0.04;
        const r = 0.055 + depth * 0.012 + o.recoil * 0.015;
        artGlow(ctx, x, y, r * 3, '203,166,255', 0.45);
        artCircle(ctx, depth < 0 ? P[1] : P[0], x, y, r);
        artCircle(ctx, '#ffffff', x - r * 0.3, y - r * 0.3, r * 0.35, 0);
      }
    },
  };
})();
