'use strict';
/* 대포탑 — 둥근 돌탑 꼭대기에 대포를 얹었다.
   1단: 나지막한 돌탑.  2단: 쇠테를 두르고 돌출 난간을 낸 탑.  3단: 붉은 지붕의 망루 둘과 걸개·깃발을 단 성탑. */
(function () {
  const S = ART.stone;
  const SD = [S[1], S[2], '#69738a'];
  const I = ART.iron;
  const R = ART.red;
  const W = ART.darkwood;
  const G = ART.gold;
  const K = ART.K;
  const BASE = 0.2;
  const FLOOR = '#8d97a9';
  const DIM = [
    { top: -0.52, rTop: 0.29, rBot: 0.36 },
    { top: -0.7, rTop: 0.29, rBot: 0.37 },
    { top: -0.88, rTop: 0.3, rBot: 0.38 },
  ];

  /* 탑 둘레의 톱니(성가퀴): 뒤쪽부터 앞쪽 순서로 그려 겹침을 맞춘다. */
  function merlons(ctx, y, r, gold) {
    const n = 10;
    const list = [];
    for (let i = 0; i < n; i++) list.push(((i + 0.5) / n) * Math.PI * 2);
    list.sort((a, b) => Math.sin(a) - Math.sin(b));
    for (const a of list) {
      const x = Math.cos(a) * r;
      const yy = y + Math.sin(a) * r * K;
      const w = 0.036 + 0.032 * Math.abs(Math.sin(a));
      const tone = Math.cos(a) < -0.35 ? S[0] : Math.cos(a) > 0.35 ? S[2] : S[1];
      artRect(ctx, tone, x - w, yy - 0.11, w * 2, 0.12, 0.012);
      if (gold) artRect(ctx, G[1], x - w, yy - 0.11, w * 2, 0.032, 0.008, ART.LW * 0.6);
    }
  }

  /* 탑 몸통 앞면을 감싸는 가로줄 */
  function hoop(ctx, y, r, color, width) {
    ctx.beginPath();
    ctx.ellipse(0, y, r, r * K, 0, 0.1, Math.PI - 0.1);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function turret(ctx, x, yTop, tones) {
    artCylinder(ctx, tones, x, yTop, yTop + 0.24, 0.09, 0.065, { top: false });
    artCone(ctx, R, x, yTop - 0.34, yTop + 0.01, 0.125);
    artCircle(ctx, G[1], x, yTop - 0.34, 0.022, ART.LW * 0.6);
  }

  TOWER_ART.cannon = {
    body(ctx, level) {
      const d = DIM[level];
      const rAt = (y) => d.rTop + ((d.rBot - d.rTop) * (y - d.top)) / (BASE - d.top);
      artShadow(ctx, 0.07, 0.33, 0.47, 0.15);
      /* 두 단으로 쌓은 기단 */
      artCylinder(ctx, SD, 0, 0.27, 0.32, 0.44, 0.45, { topFill: S[1] });
      artCylinder(ctx, S, 0, 0.2, 0.27, 0.39, 0.4, { topFill: S[0] });
      if (level === 2) {
        turret(ctx, -0.33, d.top + 0.04, S);
        turret(ctx, 0.33, d.top + 0.04, SD);
      }
      artCylinder(ctx, S, 0, d.top, BASE, d.rTop, d.rBot, { topFill: FLOOR });

      /* 돌 켜와 벽돌 금 */
      const rows = level + 4;
      const step = (BASE - d.top) / (rows + 1);
      for (let i = 1; i <= rows; i++) {
        const y = BASE - step * i;
        hoop(ctx, y, rAt(y), 'rgba(43,37,54,.3)', 0.013);
        for (let k = -2; k <= 2; k++) {
          const a = Math.PI / 2 + (k + (i % 2) * 0.5) * 0.52;
          const x = Math.cos(a) * rAt(y);
          const yy = y + Math.sin(a) * rAt(y) * K;
          artLine(ctx, 'rgba(43,37,54,.24)', [x, yy + 0.01, x, yy + step - 0.01], 0.011);
        }
      }

      /* 문 (움푹 들어가 보이게 어두운 테를 먼저) */
      ctx.beginPath();
      ctx.moveTo(-0.085, 0.33);
      ctx.lineTo(-0.085, 0.16);
      ctx.arc(0, 0.16, 0.085, Math.PI, 0);
      ctx.lineTo(0.085, 0.33);
      ctx.closePath();
      artFill(ctx, SD[2]);
      ctx.beginPath();
      ctx.moveTo(-0.058, 0.33);
      ctx.lineTo(-0.058, 0.17);
      ctx.arc(0, 0.17, 0.058, Math.PI, 0);
      ctx.lineTo(0.058, 0.33);
      ctx.closePath();
      artFill(ctx, W[1], ART.LW * 0.7);
      artLine(ctx, W[2], [0, 0.115, 0, 0.325], 0.012);
      artCircle(ctx, G[1], 0.03, 0.24, 0.012, 0);

      /* 화살 구멍 */
      const slit = (x, y) => {
        artRect(ctx, S[2], x - 0.03, y - 0.012, 0.06, 0.14, 0.02, 0);
        artRect(ctx, ART.OUT, x - 0.014, y, 0.028, 0.11, 0.014, 0);
      };
      slit(-0.15, d.top + 0.24);
      if (level >= 1) slit(0.14, d.top + 0.34);
      if (level >= 2) slit(-0.02, d.top + 0.52);

      if (level >= 1) {
        /* 쇠테 */
        const yb = (BASE + d.top) / 2 + 0.08;
        hoop(ctx, yb, rAt(yb) + 0.004, ART.OUT, 0.056);
        hoop(ctx, yb, rAt(yb) + 0.004, I[0], 0.03);
        for (let k = -2; k <= 2; k++) {
          const a = Math.PI / 2 + k * 0.55;
          artCircle(ctx, I[2], Math.cos(a) * rAt(yb), yb + Math.sin(a) * rAt(yb) * K, 0.011, 0);
        }
      }

      /* 난간: 처마 밑 그늘 → 돌출 띠 → 톱니 */
      hoop(ctx, d.top + 0.1, rAt(d.top + 0.1) + 0.002, 'rgba(43,37,54,.28)', 0.05);
      const lip = level >= 1 ? 0.05 : 0.025;
      artCylinder(ctx, S, 0, d.top, d.top + 0.085, d.rTop + lip, d.rTop + 0.005, { topFill: FLOOR });
      if (level === 2) {
        /* 붉은 걸개 */
        const y = d.top + 0.15;
        artPoly(ctx, R[1], [-0.1, y, 0.1, y, 0.1, y + 0.27, 0, y + 0.35, -0.1, y + 0.27]);
        artPoly(ctx, R[0], [-0.1, y, -0.035, y, -0.035, y + 0.32, -0.1, y + 0.27], 0);
        artRect(ctx, G[1], -0.1, y, 0.2, 0.035, 0, ART.LW * 0.6);
        artCircle(ctx, G[1], 0.005, y + 0.17, 0.045, ART.LW * 0.7);
        artCircle(ctx, R[2], 0.005, y + 0.17, 0.018, 0);
      }
      merlons(ctx, d.top, d.rTop + lip - 0.012, level === 2);

      /* 꾸밈: 문 위 방패, 등불, 덩굴, 포탄 더미 */
      artShield(ctx, 0, 0.03, 0.05, level === 2 ? G : R, level === 2 ? R[1] : G[1]);
      artLantern(ctx, -0.17, 0.2, 1);
      if (level >= 1) artLantern(ctx, 0.17, 0.2, 1);
      artIvy(ctx, [0.3, 0.2, 0.27, 0.08, 0.29, -0.04, 0.25, -0.15, 0.27, -0.26]);
      if (level === 0) artIvy(ctx, [-0.31, 0.2, -0.28, 0.1, -0.3, 0.0]);
      artPile(ctx, 0.31, 0.37, 0.045, [I[0], I[2]]);
      if (level >= 1) artPile(ctx, -0.32, 0.37, 0.04, [I[0], I[2]]);
      if (level === 2) {
        /* 금테를 두른 문 아치 */
        ctx.beginPath();
        ctx.arc(0, 0.16, 0.1, Math.PI, 0);
        ctx.strokeStyle = ART.OUT;
        ctx.lineWidth = 0.05;
        ctx.stroke();
        ctx.strokeStyle = G[1];
        ctx.lineWidth = 0.026;
        ctx.stroke();
      }
    },

    top(ctx, level, aim, o) {
      const d = DIM[level];
      const h = TOWERS.cannon.levels[level].h;
      if (level >= 1) {
        /* 깃대와 깃발 */
        const fx = level === 2 ? -0.33 : -0.19;
        const fy = level === 2 ? d.top - 0.3 : d.top - 0.06;
        artLine(ctx, ART.OUT, [fx, fy, fx, fy - 0.4], 0.036);
        artLine(ctx, W[0], [fx, fy, fx, fy - 0.4], 0.016);
        artCircle(ctx, G[1], fx, fy - 0.41, 0.02, ART.LW * 0.6);
        artFlag(ctx, R, fx, fy - 0.39, -0.22, 0.14, o.t);
      }

      const a = artAim(aim);
      const y0 = -h;
      const rad = 0.074 + level * 0.012;
      const len = 0.3 + level * 0.04;
      const kick = o.recoil * 0.07;
      const ax = -a.fx * (0.15 + kick);
      const ay = y0 - a.fy * (0.15 + kick);
      const bx = a.fx * (len - kick);
      const by = y0 + a.fy * (len - kick);
      const brass = level === 2 ? G : [I[0], I[0], I[1]];
      const away = a.toward < 0;

      /* 포가(나무 받침) */
      artPrism(ctx, W, -a.fx * kick * 0.5, y0 + rad * 0.85, 0.14, rad + 0.03, 0.07, aim);

      /* 포신: 멀리 있는 끝부터 그린다 */
      if (!away) artCircle(ctx, I[2], ax - a.fx * 0.04, ay - a.fy * 0.04, rad * 0.45);
      const tube = artTube(ctx, I, ax, ay, bx, by, rad * 1.12, rad * 0.9, away ? 0.85 : 0.5, 0);
      artBand(ctx, brass, ax + (bx - ax) * 0.4, ay + (by - ay) * 0.4, tube, rad * 1.07, 0.04);
      if (level >= 1) artBand(ctx, brass, ax + (bx - ax) * 0.72, ay + (by - ay) * 0.72, tube, rad * 0.99, 0.03);
      artBand(ctx, I, bx - a.fx * 0.02, by - a.fy * 0.02, tube, rad * 1.1, 0.05);
      if (away) {
        artCircle(ctx, I[0], ax - a.fx * 0.05, ay - a.fy * 0.05, rad * 0.42);
      } else {
        artTubeEnd(ctx, I[1], bx, by, rad * 1.1, a.fx, a.fy, a.toward);
        artTubeEnd(ctx, '#17131d', bx, by, rad * 0.64, a.fx, a.fy, a.toward);
      }

      if (o.recoil > 0.55) {
        const k = (o.recoil - 0.55) / 0.45;
        const mx = bx + a.fx * 0.13;
        const my = by + a.fy * 0.13;
        artCircle(ctx, 'rgba(255,170,60,' + k * 0.9 + ')', mx, my, 0.1 + k * 0.08, 0);
        artCircle(ctx, 'rgba(255,236,150,' + k + ')', mx - a.fx * 0.03, my - a.fy * 0.03, 0.07 + k * 0.03, 0);
        artCircle(ctx, 'rgba(255,255,240,' + k + ')', mx - a.fx * 0.05, my - a.fy * 0.05, 0.035, 0);
      }
    },
  };
})();
