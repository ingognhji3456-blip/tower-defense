'use strict';
/* 저격탑 — 등대처럼 가늘고 높은 탑 꼭대기에서 긴 총을 겨눈다.
   1단: 붉은 줄무늬의 가는 탑.  2단: 돌출 난간과 등불, 망원경을 단 탑.  3단: 남색 지붕과 금장식, 깃발을 얹은 높은 탑. */
(function () {
  const WH = ['#fbf7ee', '#e3ddd0', '#b9b2a4'];
  const R = ART.red;
  const S = ART.stone;
  const I = ART.iron;
  const W = ART.darkwood;
  const G = ART.gold;
  const BL = ART.blue;
  const K = ART.K;
  const BASE = 0.2;
  const DIM = [
    { top: -0.78, rTop: 0.15, rBot: 0.25, deck: 0.22 },
    { top: -0.92, rTop: 0.15, rBot: 0.26, deck: 0.24 },
    { top: -1.06, rTop: 0.15, rBot: 0.27, deck: 0.25 },
  ];

  /* 탑 몸통을 감싸는 굵은 줄무늬 */
  function stripe(ctx, d, y0, y1, tones) {
    const rAt = (y) => d.rTop + ((d.rBot - d.rTop) * (y - d.top)) / (BASE - d.top);
    const g = ctx.createLinearGradient(-d.rBot, 0, d.rBot, 0);
    g.addColorStop(0, tones[1]);
    g.addColorStop(0.3, tones[0]);
    g.addColorStop(0.65, tones[1]);
    g.addColorStop(1, tones[2]);
    ctx.beginPath();
    ctx.moveTo(-rAt(y0), y0);
    ctx.ellipse(0, y0, rAt(y0), rAt(y0) * K, 0, Math.PI, 0, true);
    ctx.lineTo(rAt(y1), y1);
    ctx.ellipse(0, y1, rAt(y1), rAt(y1) * K, 0, 0, Math.PI, false);
    ctx.closePath();
    artFill(ctx, g, ART.LW * 0.6);
  }

  function railing(ctx, y, r, front, color) {
    ctx.beginPath();
    ctx.ellipse(0, y - 0.085, r, r * K, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
    ctx.strokeStyle = ART.OUT;
    ctx.lineWidth = 0.04;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.02;
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (front ? 0.18 : 1.18) * Math.PI + i * 0.213 * Math.PI;
      const x = Math.cos(a) * r;
      const yy = y + Math.sin(a) * r * K;
      artLine(ctx, ART.OUT, [x, yy, x, yy - 0.085], 0.034);
      artLine(ctx, color, [x, yy, x, yy - 0.085], 0.016);
    }
  }

  TOWER_ART.sniper = {
    body(ctx, level) {
      const d = DIM[level];
      const rAt = (y) => d.rTop + ((d.rBot - d.rTop) * (y - d.top)) / (BASE - d.top);
      artPlinth(ctx, S);
      artCylinder(ctx, WH, 0, d.top, BASE, d.rTop, d.rBot, { top: false });
      /* 붉은 줄무늬 */
      const bands = level + 2;
      const span = (BASE - d.top) / (bands * 2 + 1);
      for (let i = 0; i < bands; i++) {
        const y0 = d.top + span * (i * 2 + 1);
        stripe(ctx, d, y0, y0 + span, R);
      }
      /* 문과 둥근 창 */
      artArch(ctx, S[2], 0, 0.335, 0.075, 0.2);
      artArch(ctx, W[1], 0, 0.335, 0.05, 0.17, ART.LW * 0.7);
      artCircle(ctx, G[1], 0.025, 0.25, 0.011, 0);
      artPoly(ctx, S[0], [-0.12, 0.36, 0.12, 0.36, 0.1, 0.33, -0.1, 0.33], ART.LW * 0.8);
      for (let i = 0; i < level + 1; i++) {
        const y = d.top + span * (i * 2 + 2.5) - 0.02 + rAt(d.top + span * (i * 2 + 2.5)) * K * 0.6;
        const x = i % 2 ? 0.05 : -0.05;
        artCircle(ctx, I[2], x, y, 0.04, ART.LW * 0.7);
        artCircle(ctx, '#ffe9a8', x, y, 0.024, 0);
      }
      artLantern(ctx, -0.16, 0.2, 0.9);
      if (level >= 1) {
        artLantern(ctx, 0.16, 0.2, 0.9);
        /* 망원경 받침대 */
        artTube(ctx, [G[0], G[1], G[2]], -0.34, 0.3, -0.25, 0.16, 0.022, 0.03, 0.5, 0.5);
        artLine(ctx, ART.OUT, [-0.3, 0.26, -0.33, 0.4, -0.3, 0.26, -0.26, 0.4], 0.02);
      }
      /* 탄약 상자 */
      artRect(ctx, W[0], 0.24, 0.3, 0.14, 0.1, 0.01);
      artLine(ctx, W[2], [0.24, 0.335, 0.38, 0.335], 0.012);
      artRect(ctx, G[1], 0.295, 0.325, 0.03, 0.03, 0, ART.LW * 0.5);
      if (level === 2) {
        /* 금테와 걸개 */
        for (const f of [0.14, 0.9]) {
          const y = d.top + (BASE - d.top) * f;
          artHoop(ctx, 0, y, rAt(y) + 0.004, G[1], 0.028, true);
        }
        const y = d.top + 0.22;
        artPoly(ctx, BL[1], [-0.06, y, 0.06, y, 0.06, y + 0.2, 0, y + 0.26, -0.06, y + 0.2]);
        artRect(ctx, G[1], -0.06, y, 0.12, 0.028, 0, ART.LW * 0.6);
        /* 과녁 문장 */
        artCircle(ctx, '#ffffff', 0, y + 0.12, 0.034, ART.LW * 0.5);
        artCircle(ctx, R[1], 0, y + 0.12, 0.016, 0);
      }
      /* 마루: 받침 → 마루판 → 뒤쪽 난간 */
      artCylinder(ctx, level === 2 ? [S[0], S[1], S[2]] : [W[0], W[1], W[2]], 0, d.top, d.top + 0.1, d.deck, d.rTop + 0.01, { topFill: level === 2 ? '#8d97a9' : W[1] });
      railing(ctx, d.top, d.deck - 0.015, false, level === 2 ? G[1] : I[0]);
      if (level === 2) {
        /* 지붕을 받치는 뒤 기둥 */
        artStroke(ctx, W[2], [0, d.top - d.deck * K, 0, d.top - 0.4], 0.03);
      }
    },

    top(ctx, level, aim, o) {
      const d = DIM[level];
      const h = TOWERS.sniper.levels[level].h;
      if (level === 1) {
        const fy = d.top - d.deck * K - 0.08;
        artLine(ctx, ART.OUT, [0, fy, 0, fy - 0.27], 0.034);
        artLine(ctx, W[0], [0, fy, 0, fy - 0.27], 0.015);
        artFlag(ctx, R, 0, fy - 0.26, 0.2, 0.12, o.t);
      }
      const a = artAim(aim);
      const y0 = -h;
      const kick = o.recoil * 0.06;
      const len = 0.46 + level * 0.05;
      const ax = -a.fx * (0.16 + kick);
      const ay = y0 - a.fy * (0.16 + kick);
      const bx = a.fx * (len - kick);
      const by = y0 + a.fy * (len - kick);
      const away = a.toward < 0;
      /* 삼각대 */
      artLine(ctx, ART.OUT, [0, y0, -0.07, y0 + 0.13, 0, y0, 0.07, y0 + 0.13, 0, y0, 0, y0 + 0.15], 0.034);
      artLine(ctx, I[0], [0, y0, -0.07, y0 + 0.13, 0, y0, 0.07, y0 + 0.13, 0, y0, 0, y0 + 0.15], 0.016);
      /* 개머리판 → 총몸 → 긴 총열 → 조준경 */
      const stock = level === 2 ? [G[0], G[1], G[2]] : [ART.wood[0], ART.wood[1], ART.wood[2]];
      artTube(ctx, stock, ax, ay, ax + a.fx * 0.2, ay + a.fy * 0.2, 0.052, 0.045, away ? 0.8 : 0.4, 0);
      const tube = artTube(ctx, I, ax + a.fx * 0.18, ay + a.fy * 0.18, bx, by, 0.034, 0.026, 0, 0);
      artBand(ctx, level === 2 ? G : [I[0], I[0], I[1]], ax + (bx - ax) * 0.5, ay + (by - ay) * 0.5, tube, 0.04, 0.03);
      artBand(ctx, I, bx - a.fx * 0.03, by - a.fy * 0.03, tube, 0.042, 0.06);
      if (!away) artTubeEnd(ctx, '#17131d', bx, by, 0.03, a.fx, a.fy, a.toward);
      const sx = ax + (bx - ax) * 0.34;
      const sy = ay + (by - ay) * 0.34 - 0.07;
      artTube(ctx, [I[0], I[1], I[2]], sx - a.fx * 0.07, sy - a.fy * 0.07, sx + a.fx * 0.09, sy + a.fy * 0.09, 0.028, 0.03, 0.5, 0.5);
      artCircle(ctx, '#8fe9ff', sx + a.fx * 0.095, sy + a.fy * 0.095, 0.018, 0);
      if (o.recoil > 0.5) {
        const k = (o.recoil - 0.5) / 0.5;
        const mx = bx + a.fx * 0.08;
        const my = by + a.fy * 0.08;
        artCircle(ctx, 'rgba(255,214,120,' + k + ')', mx, my, 0.07 + k * 0.05, 0);
        artCircle(ctx, 'rgba(255,255,240,' + k + ')', mx - a.fx * 0.02, my - a.fy * 0.02, 0.035, 0);
        artLine(ctx, 'rgba(255,240,200,' + k * 0.8 + ')', [mx, my, mx + a.fx * 0.3, my + a.fy * 0.3], 0.02);
      }
    },

    front(ctx, level) {
      const d = DIM[level];
      railing(ctx, d.top, d.deck - 0.015, true, level === 2 ? G[1] : I[0]);
      if (level === 2) {
        /* 남색 지붕과 금 꼭지 */
        const base = d.top - 0.36;
        artStroke(ctx, W[0], [-d.deck + 0.03, d.top - 0.07, -d.deck + 0.03, base + 0.02], 0.03);
        artStroke(ctx, W[1], [d.deck - 0.03, d.top - 0.07, d.deck - 0.03, base + 0.02], 0.03);
        artCone(ctx, BL, 0, base - 0.22, base, d.deck + 0.05);
        artHoop(ctx, 0, base, d.deck + 0.05, G[1], 0.022, true);
        artLine(ctx, ART.OUT, [0, base - 0.22, 0, base - 0.26], 0.03);
        artCircle(ctx, G[1], 0, base - 0.27, 0.024);
      }
    },
  };
})();
