'use strict';
/* 석궁탑 — 모서리를 앞에 둔 네모 망루 위에 큰 석궁을 얹었다.
   1단: 통나무로 짠 망루.  2단: 아래를 돌로 쌓고 난간에 방패를 건 망루.  3단: 돌탑에 초록 기와지붕과 걸개를 단 망루. */
(function () {
  const S = ART.stone;
  const W = ART.wood;
  const D = ART.darkwood;
  const G = ART.gold;
  const GR = ART.green;
  const I = ART.iron;
  const R = ART.red;
  const K = ART.K;
  const GROUND = 0.24;
  /* deck: 마루 윗면 높이, w: 마루 반너비, stone: 돌로 쌓은 부분의 윗면(없으면 null) */
  const DIM = [
    { deck: -0.5, w: 0.33, stone: null },
    { deck: -0.68, w: 0.34, stone: -0.14 },
    { deck: -0.86, w: 0.38, stone: -0.78 },
  ];
  const LINE = 'rgba(43,37,54,.28)';

  /* 돌벽의 켜와 벽돌 금 */
  function courses(ctx, yTop, yBot, wTop, wBot, n) {
    const step = (yBot - yTop) / (n + 1);
    for (let i = 1; i <= n; i++) {
      const y = yTop + step * i;
      const w = wTop + ((wBot - wTop) * (y - yTop)) / (yBot - yTop);
      artLine(ctx, LINE, [-w, y, 0, y + w * K, w, y], 0.012);
      for (let k = 0; k < 2; k++) {
        const f = (k + 0.6 + (i % 2) * 0.4) / 2.6;
        const yy = y + w * K * (1 - f);
        artLine(ctx, 'rgba(43,37,54,.2)', [-w * f, yy - step + 0.014, -w * f, yy - 0.012], 0.01);
        artLine(ctx, 'rgba(43,37,54,.2)', [w * f, yy - step + 0.014, w * f, yy - 0.012], 0.01);
      }
    }
  }

  /* 통나무 뼈대: 뒤 기둥 → 가새 → 앞 기둥 */
  function frame(ctx, yTop, yBot, wTop, wBot) {
    const ym = (yTop + yBot) / 2;
    const wm = (wTop + wBot) / 2;
    artStroke(ctx, D[2], [0, yBot - wBot * K, 0, yTop - wTop * K], 0.045);
    artStroke(ctx, D[2], [-wm, ym, 0, ym - wm * K, wm, ym], 0.03);
    artStroke(ctx, D[0], [-wBot, yBot, 0, yTop + wTop * K], 0.036);
    artStroke(ctx, D[0], [0, yBot + wBot * K, -wTop, yTop], 0.036);
    artStroke(ctx, D[1], [wBot, yBot, 0, yTop + wTop * K], 0.036);
    artStroke(ctx, D[1], [0, yBot + wBot * K, wTop, yTop], 0.036);
    artStroke(ctx, W[1], [-wm, ym, 0, ym + wm * K, wm, ym], 0.036);
    artStroke(ctx, W[0], [-wBot, yBot, -wTop, yTop], 0.062);
    artStroke(ctx, W[2], [wBot, yBot, wTop, yTop], 0.062);
    artStroke(ctx, W[1], [0, yBot + wBot * K, 0, yTop + wTop * K], 0.068);
  }

  /* 벽면에 드리운 걸개. side = -1 왼쪽 면, +1 오른쪽 면 */
  function banner(ctx, side, x0, y0, len, drop) {
    const x1 = x0 + side * len;
    const s = -side * K; /* 면을 따라 가운데 모서리 쪽으로 갈수록 내려간다 */
    const ya = y0;
    const yb = y0 + (x1 - x0) * s;
    const top = side < 0 ? [x1, yb, x0, ya] : [x0, ya, x1, yb];
    const pts = [top[0], top[1], top[2], top[3], top[2], top[3] + drop, (x0 + x1) / 2, (ya + yb) / 2 + drop - 0.06, top[0], top[1] + drop];
    artPoly(ctx, side < 0 ? GR[1] : GR[2], pts);
    artLine(ctx, G[1], [top[0], top[1] + 0.03, top[2], top[3] + 0.03], 0.022);
    artCircle(ctx, G[1], (x0 + x1) / 2, (ya + yb) / 2 + drop * 0.45, 0.03, ART.LW * 0.6);
  }

  function deck(ctx, d, level) {
    const y = d.deck;
    const w = d.w;
    if (level === 2) {
      /* 돌출 마루를 받치는 까치발 */
      for (const f of [0.25, 0.75]) {
        artPoly(ctx, D[1], [-w * f - 0.03, y + 0.07 + w * K * (1 - f), -w * f + 0.03, y + 0.09 + w * K * (1 - f), -w * f * 0.82, y + 0.2 + w * K * (1 - f)]);
        artPoly(ctx, D[2], [w * f - 0.03, y + 0.09 + w * K * (1 - f), w * f + 0.03, y + 0.07 + w * K * (1 - f), w * f * 0.82, y + 0.2 + w * K * (1 - f)]);
      }
    }
    artBox(ctx, W, 0, y, y + 0.075, w, w - 0.015, { topFill: W[0] });
    for (const f of [-0.5, 0, 0.5]) {
      artLine(ctx, 'rgba(90,50,25,.45)', [f * w - w * 0.5, y - w * K * 0.5 + f * w * K, f * w + w * 0.5, y + w * K * 0.5 + f * w * K], 0.012);
    }
  }

  /* 난간. back 이 참이면 뒤쪽(석궁 뒤), 거짓이면 앞쪽. */
  function rail(ctx, d, level, back) {
    const y = d.deck;
    const w = d.w - 0.02;
    const up = 0.11;
    const cy = back ? y - w * K : y + w * K;
    const tone = back ? D[1] : W[1];
    artStroke(ctx, tone, [-w, y - up, 0, cy - up, w, y - up], 0.03);
    if (back) {
      artStroke(ctx, D[1], [0, cy, 0, cy - up], 0.036);
      return;
    }
    artStroke(ctx, W[0], [-w, y, -w, y - up - 0.01], 0.04);
    artStroke(ctx, W[2], [w, y, w, y - up - 0.01], 0.04);
    artStroke(ctx, W[1], [0, cy, 0, cy - up - 0.01], 0.044);
    if (level >= 1) {
      /* 난간에 건 방패 */
      for (const f of [0.5]) {
        const yy = y + w * K * (1 - f) - 0.035;
        artCircle(ctx, GR[1], -w * f, yy, 0.062);
        artCircle(ctx, G[1], -w * f, yy, 0.022, 0);
        artCircle(ctx, GR[2], w * f, yy, 0.062);
        artCircle(ctx, G[2], w * f, yy, 0.022, 0);
      }
    }
  }

  function roof(ctx, d) {
    const base = d.deck - 0.44;
    const w = d.w + 0.05;
    const tip = base - 0.3;
    artPoly(ctx, GR[0], [0, tip, -w, base, 0, base + w * K]);
    artPoly(ctx, GR[2], [0, tip, 0, base + w * K, w, base]);
    /* 기왓골 */
    for (const f of [0.35, 0.68]) {
      artLine(ctx, 'rgba(20,60,30,.4)', [0, tip, -w * f, base + w * K * (1 - f)], 0.012);
      artLine(ctx, 'rgba(10,40,20,.45)', [0, tip, w * f, base + w * K * (1 - f)], 0.012);
    }
    artLine(ctx, G[1], [-w, base, 0, base + w * K, w, base], 0.03);
    artLine(ctx, ART.OUT, [0, tip, 0, tip - 0.09], 0.036);
    artCircle(ctx, G[1], 0, tip - 0.1, 0.035);
  }

  TOWER_ART.crossbow = {
    body(ctx, level) {
      const d = DIM[level];
      artShadow(ctx, 0.07, 0.33, 0.47, 0.15);
      artBox(ctx, [S[1], S[1], S[2]], 0, 0.24, 0.32, 0.43, 0.45, { topFill: S[1] });
      const under = d.deck + 0.075;
      if (d.stone == null) {
        frame(ctx, under, GROUND, d.w - 0.05, 0.37);
      } else {
        const wb = 0.36;
        const wt = level === 2 ? 0.29 : 0.31;
        if (level === 1) frame(ctx, under, d.stone, d.w - 0.05, wt);
        artBox(ctx, S, 0, d.stone, GROUND, wt, wb, { topFill: S[0] });
        courses(ctx, d.stone, GROUND, wt, wb, level === 2 ? 6 : 3);
        /* 문 */
        artPoly(ctx, D[1], [-0.21, 0.3, -0.21, 0.14, -0.15, 0.1, -0.09, 0.19, -0.09, 0.345]);
        artLine(ctx, D[2], [-0.15, 0.115, -0.15, 0.32], 0.012);
        /* 창 */
        artPoly(ctx, ART.OUT, [0.13, d.stone + 0.2, 0.19, d.stone + 0.178, 0.19, d.stone + 0.3, 0.13, d.stone + 0.322], 0);
        if (level === 2) {
          artPoly(ctx, ART.OUT, [-0.19, d.stone + 0.18, -0.13, d.stone + 0.202, -0.13, d.stone + 0.322, -0.19, d.stone + 0.3], 0);
          banner(ctx, -1, -0.27, d.stone + 0.36, 0.17, 0.3);
          banner(ctx, 1, 0.27, d.stone + 0.36, 0.17, 0.3);
          /* 금빛 모서리 장식 */
          artLine(ctx, G[1], [0, d.stone + wt * K + 0.03, 0, GROUND + wb * K - 0.03], 0.02);
        }
      }
      /* 꾸밈: 사다리, 화살통, 등불, 덩굴, 과녁 */
      if (level === 0) {
        const lx = [-0.3, 0.3, -0.22, -0.46];
        artLine(ctx, ART.OUT, [lx[0], lx[1], lx[2], lx[3]], 0.036);
        artLine(ctx, ART.OUT, [lx[0] + 0.1, lx[1] + 0.036, lx[2] + 0.1, lx[3] + 0.036], 0.036);
        artLine(ctx, W[0], [lx[0], lx[1], lx[2], lx[3]], 0.016);
        artLine(ctx, W[0], [lx[0] + 0.1, lx[1] + 0.036, lx[2] + 0.1, lx[3] + 0.036], 0.016);
        for (let i = 1; i < 7; i++) {
          const f = i / 7;
          const x = lx[0] + (lx[2] - lx[0]) * f;
          const y = lx[1] + (lx[3] - lx[1]) * f;
          artLine(ctx, W[0], [x, y, x + 0.1, y + 0.036], 0.018);
        }
        /* 밧줄로 묶은 이음매 */
        for (const [x, y] of [[-0.345, -0.08], [0.345, -0.08], [0, 0.04]]) {
          artLine(ctx, ART.OUT, [x - 0.04, y, x + 0.04, y], 0.05);
          artLine(ctx, '#f0e2bd', [x - 0.04, y, x + 0.04, y], 0.026);
        }
      } else {
        artIvy(ctx, level === 1 ? [-0.34, 0.22, -0.31, 0.12, -0.33, 0.02, -0.3, -0.06] : [0.33, 0.22, 0.3, 0.06, 0.32, -0.1, 0.29, -0.26, 0.3, -0.42]);
        artShield(ctx, -0.15, 0.03, 0.04, GR, G[1]);
      }
      /* 볼트를 꽂아 둔 통 */
      for (const [dx, tip] of [[-0.03, -0.2], [0.02, -0.24], [0.06, -0.19]]) {
        artLine(ctx, ART.OUT, [0.32 + dx, 0.3, 0.32 + dx * 1.6, 0.37 + tip], 0.03);
        artLine(ctx, '#e9dcb6', [0.32 + dx, 0.3, 0.32 + dx * 1.6, 0.37 + tip], 0.014);
        artPoly(ctx, level === 2 ? G[1] : GR[1], [0.32 + dx * 1.6 - 0.025, 0.37 + tip + 0.03, 0.32 + dx * 1.6, 0.37 + tip - 0.03, 0.32 + dx * 1.6 + 0.025, 0.37 + tip + 0.03], ART.LW * 0.5);
      }
      artBarrel(ctx, 0.32, 0.4, 0.06, 0.13, W, level === 2 ? G[1] : I[1]);
      artLantern(ctx, 0.0, d.deck + 0.2 + d.w * K, 0.9);
      if (level === 2) {
        artLantern(ctx, -d.w + 0.01, d.deck + 0.2, 0.9);
        artLantern(ctx, d.w - 0.01, d.deck + 0.2, 0.9);
      }
      if (level >= 1) {
        /* 짚 과녁 */
        artCircle(ctx, '#f3dc7c', -0.36, 0.33, 0.07);
        artCircle(ctx, R[1], -0.36, 0.33, 0.045, 0);
        artCircle(ctx, '#ffffff', -0.36, 0.33, 0.02, 0);
      }

      deck(ctx, d, level);
      rail(ctx, d, level, true);
      if (level === 2) artStroke(ctx, D[2], [0, d.deck - d.w * K, 0, d.deck - 0.44 - d.w * K * 0.4], 0.04);
    },

    top(ctx, level, aim, o) {
      const d = DIM[level];
      const h = TOWERS.crossbow.levels[level].h;
      if (level === 1) {
        /* 뒤 모서리의 깃대 */
        const fx = 0;
        const fy = d.deck - d.w * K - 0.1;
        artLine(ctx, ART.OUT, [fx, fy, fx, fy - 0.42], 0.036);
        artLine(ctx, D[0], [fx, fy, fx, fy - 0.42], 0.016);
        artFlag(ctx, GR, fx, fy - 0.41, 0.22, 0.14, o.t);
      }

      const a = artAim(aim);
      const size = 1 + level * 0.14;
      const pull = 1 - o.recoil;
      const y0 = -h;
      /* 받침 기둥 */
      artTube(ctx, I, 0, y0 + 0.2, 0, y0 + 0.05, 0.04, 0.04, 0, 0);
      const pr = artPrism(ctx, level === 2 ? [W[0], W[1], D[0]] : W, 0, y0, 0.2 * size, 0.04, 0.055, aim);
      const P = pr.P;
      const limb = level === 0 ? D : level === 1 ? I : G;
      const tips = [];
      for (const side of [-1, 1]) {
        const pts = [];
        for (let i = 0; i <= 6; i++) {
          const t = i / 6;
          const u = (1 - t) * (1 - t) * 0.17 + 2 * t * (1 - t) * 0.22 + t * t * (0.07 + (1 - pull) * 0.04);
          const v = (2 * t * (1 - t) * 0.2 + t * t * 0.37) * side;
          pts.push(...P(u * size, v * size));
        }
        artStroke(ctx, limb[side < 0 ? 0 : 1], pts, 0.05);
        tips.push(pts[pts.length - 2], pts[pts.length - 1]);
      }
      const nock = P((-0.15 * pull + 0.03 * (1 - pull)) * size, 0);
      artLine(ctx, '#f6efdc', [tips[0], tips[1], nock[0], nock[1], tips[2], tips[3]], 0.016);
      if (pull > 0.5) {
        const tip = P(0.3 * size, 0);
        artLine(ctx, ART.OUT, [nock[0], nock[1], tip[0], tip[1]], 0.04);
        artLine(ctx, '#e9dcb6', [nock[0], nock[1], tip[0], tip[1]], 0.02);
        const b = P(0.24 * size, -0.035);
        const c = P(0.24 * size, 0.035);
        const e = P(0.35 * size, 0);
        artPoly(ctx, ART.steel[0], [e[0], e[1], b[0], b[1], c[0], c[1]], ART.LW * 0.7);
      }
      const hub = P(0.16 * size, 0);
      artCircle(ctx, level === 2 ? G[1] : I[0], hub[0], hub[1], 0.03, ART.LW * 0.7);
    },

    front(ctx, level) {
      const d = DIM[level];
      rail(ctx, d, level, false);
      if (level === 2) {
        const base = d.deck - 0.44;
        artStroke(ctx, D[0], [-d.w + 0.02, d.deck - 0.1, -d.w + 0.02, base + 0.02], 0.04);
        artStroke(ctx, D[1], [d.w - 0.02, d.deck - 0.1, d.w - 0.02, base + 0.02], 0.04);
        roof(ctx, d);
      }
    },
  };
})();
