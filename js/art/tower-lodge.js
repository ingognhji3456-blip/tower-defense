'use strict';
/* 사냥꾼 오두막 — 모서리를 앞에 둔 통나무집 지붕 위에 석궁을 걸었다. 잡은 적마다 현상금이 붙는다.
   1단: 초가를 얹은 통나무 오두막.
   2단: 돌 기초를 높이고 굴뚝을 세운 널지붕 사냥막.
   3단: 돌로 쌓은 아래층 위에 통나무 위층을 내밀고 초록 기와를 얹은 사냥 본부. */
(function () {
  const S = ART.stone;
  const W = ART.wood;
  const D = ART.darkwood;
  const G = ART.gold;
  const GR = ART.green;
  const I = ART.iron;
  const R = ART.red;
  const B = ART.bone;
  const TH = ART.thatch;
  const K = ART.K;
  const H = (level) => TOWERS.lodge.levels[level].h;
  /* eave: 처마 높이, roof: 지붕 윗면 높이 */
  const DIM = [
    { eave: -0.2, roof: -0.5 },
    { eave: -0.32, roof: -0.64 },
    { eave: -0.5, roof: -0.82 },
  ];
  const SEAM = 'rgba(60,30,12,.5)';

  /* 벽면 위의 점. side = -1 왼쪽 면 / +1 오른쪽 면, f = 가운데 모서리(0) → 바깥 모서리(1), y = 바깥 모서리에서 잰 높이 */
  const F = (w, y, side, f) => [side * w * f, y + w * K * (1 - f)];

  /* 벽면에 붙은 네모(창·걸개): 면을 따라 기울어진다 */
  function pane(ctx, fill, w, y, side, f0, f1, hgt, lw) {
    const a = F(w, y, side, f0);
    const b = F(w, y, side, f1);
    artPoly(ctx, fill, [a[0], a[1], b[0], b[1], b[0], b[1] + hgt, a[0], a[1] + hgt], lw);
  }

  /* 불 켜진 창 */
  function windowAt(ctx, w, y, side, f0, f1, hgt) {
    pane(ctx, D[2], w, y - 0.018, side, f0 - 0.06, f1 + 0.06, hgt + 0.036);
    pane(ctx, '#ffd66b', w, y, side, f0, f1, hgt, ART.LW * 0.6);
    const m = F(w, y, side, (f0 + f1) / 2);
    artLine(ctx, D[2], [m[0], m[1], m[0], m[1] + hgt], 0.014);
  }

  /* 통나무 벽: 켜마다 금을 긋고 모서리마다 통나무 마구리를 낸다 */
  function logs(ctx, top, bot, wTop, wBot, n) {
    artBox(ctx, W, 0, top, bot, wTop, wBot, { top: false });
    const step = (bot - top) / n;
    const wAt = (y) => wTop + ((wBot - wTop) * (y - top)) / (bot - top);
    for (let i = 1; i < n; i++) {
      const y = top + step * i;
      artLine(ctx, SEAM, [-wAt(y), y, 0, y + wAt(y) * K, wAt(y), y], 0.016);
    }
    for (let i = 0; i < n; i++) {
      const y = top + step * (i + 0.5);
      const w = wAt(y);
      for (const [x, yy, c] of [[-w, y, W[0]], [w, y, W[2]], [0, y + w * K, W[1]]]) {
        artCircle(ctx, c, x, yy, step * 0.4);
        artCircle(ctx, D[1], x, yy, step * 0.13, 0);
      }
    }
  }

  /* 돌벽의 켜 */
  function courses(ctx, top, bot, wTop, wBot, n) {
    const step = (bot - top) / (n + 1);
    for (let i = 1; i <= n; i++) {
      const y = top + step * i;
      const w = wTop + ((wBot - wTop) * (y - top)) / (bot - top);
      artLine(ctx, 'rgba(43,37,54,.28)', [-w, y, 0, y + w * K, w, y], 0.012);
      for (const f of i % 2 ? [0.3, 0.7] : [0.5]) {
        artLine(ctx, 'rgba(43,37,54,.2)', [-w * f, y + w * K * (1 - f) - step + 0.014, -w * f, y + w * K * (1 - f) - 0.012], 0.01);
        artLine(ctx, 'rgba(43,37,54,.2)', [w * f, y + w * K * (1 - f) - step + 0.014, w * f, y + w * K * (1 - f) - 0.012], 0.01);
      }
    }
  }

  /* 윗면이 평평한 모임지붕(모서리가 앞). 윗면에 석궁 받침을 세운다. */
  function roof(ctx, tones, eave, w, top, wt, trim) {
    artPoly(ctx, tones[1], [-w, eave, 0, eave + w * K, 0, eave + w * K + 0.04, -w, eave + 0.04]);
    artPoly(ctx, tones[2], [w, eave, 0, eave + w * K, 0, eave + w * K + 0.04, w, eave + 0.04]);
    artPoly(ctx, tones[0], [-wt, top, -w, eave, 0, eave + w * K, 0, top + wt * K]);
    artPoly(ctx, tones[2], [wt, top, w, eave, 0, eave + w * K, 0, top + wt * K]);
    for (const f of [0.36, 0.7]) {
      const y = top + (eave - top) * f;
      const ww = wt + (w - wt) * f;
      artLine(ctx, 'rgba(0,0,0,.2)', [-ww, y, 0, y + ww * K, ww, y], 0.014);
    }
    artPoly(ctx, tones[1], [-wt, top, 0, top - wt * K, wt, top, 0, top + wt * K]);
    if (trim) artLine(ctx, trim, [-w, eave + 0.02, 0, eave + w * K + 0.02, w, eave + 0.02], 0.026);
  }

  function door(ctx, lit) {
    artPoly(ctx, D[2], [-0.228, 0.302, -0.228, 0.122, -0.15, 0.072, -0.072, 0.188, -0.072, 0.356]);
    artPoly(ctx, lit ? '#ffd66b' : D[1], [-0.205, 0.304, -0.205, 0.142, -0.15, 0.106, -0.095, 0.194, -0.095, 0.342], ART.LW * 0.7);
    if (!lit) {
      artLine(ctx, D[2], [-0.15, 0.12, -0.15, 0.32], 0.012);
      artCircle(ctx, G[1], -0.118, 0.25, 0.012, 0);
    }
  }

  /* 벽에 건 사슴뿔 */
  function antlers(ctx, x, y, s, c) {
    for (const side of [-1, 1]) {
      artStroke(ctx, c, [x + side * 0.02 * s, y, x + side * 0.075 * s, y - 0.035 * s, x + side * 0.1 * s, y - 0.12 * s], 0.022 * s);
      artStroke(ctx, c, [x + side * 0.07 * s, y - 0.03 * s, x + side * 0.145 * s, y - 0.055 * s], 0.02 * s);
    }
    artCircle(ctx, D[1], x, y + 0.012 * s, 0.036 * s);
  }

  /* 과녁 */
  function target(ctx, x, y, s) {
    artEllipse(ctx, '#f6f0dc', x, y, 0.058 * s, 0.066 * s);
    artEllipse(ctx, R[1], x, y, 0.038 * s, 0.044 * s, 0);
    artEllipse(ctx, '#f6f0dc', x, y, 0.017 * s, 0.02 * s, 0);
  }

  /* 굴뚝 */
  function chimney(ctx, d, gold) {
    artBox(ctx, S, 0.21, d.roof - 0.05, d.eave - 0.1, 0.055, 0.06, { topFill: S[2] });
    artBox(ctx, gold ? G : [S[0], S[0], S[1]], 0.21, d.roof - 0.085, d.roof - 0.045, 0.072, 0.072, { topFill: '#3a3340' });
  }

  TOWER_ART.lodge = {
    body(ctx, level) {
      const d = DIM[level];
      const h = H(level);
      artShadow(ctx, 0.07, 0.33, 0.47, 0.15);
      artBox(ctx, [S[1], S[1], S[2]], 0, 0.24, 0.32, 0.43, 0.45, { topFill: S[1] });
      /* 장작더미 */
      artPile(ctx, -0.38, 0.4, 0.04, W);

      if (level === 0) {
        logs(ctx, d.eave, 0.24, 0.33, 0.35, 4);
        door(ctx);
        windowAt(ctx, 0.34, -0.03, 1, 0.34, 0.7, 0.12);
        roof(ctx, TH, d.eave, 0.43, d.roof, 0.15);
        antlers(ctx, 0, d.eave + 0.43 * K - 0.01, 1, B[0]);
      } else if (level === 1) {
        /* 돌 기초 위에 통나무 벽 */
        artBox(ctx, S, 0, 0.04, 0.24, 0.345, 0.36, { top: false });
        courses(ctx, 0.04, 0.24, 0.345, 0.36, 1);
        door(ctx);
        logs(ctx, d.eave, 0.04, 0.33, 0.345, 3);
        windowAt(ctx, 0.335, -0.17, 1, 0.26, 0.56, 0.12);
        target(ctx, 0.25, -0.02, 1);
        roof(ctx, [D[0], D[1], D[2]], d.eave, 0.43, d.roof, 0.15);
        chimney(ctx, d, false);
        antlers(ctx, 0, d.eave + 0.43 * K - 0.01, 1.05, B[0]);
        artLantern(ctx, -0.035, 0.24, 0.8);
      } else {
        /* 돌로 쌓은 아래층 */
        artBox(ctx, S, 0, -0.02, 0.24, 0.33, 0.36, { top: false });
        courses(ctx, -0.02, 0.24, 0.33, 0.36, 2);
        door(ctx);
        /* 아래층 벽의 걸개 */
        pane(ctx, GR[2], 0.34, 0.03, 1, 0.3, 0.66, 0.15);
        artLine(ctx, G[1], [...F(0.34, 0.045, 1, 0.3), ...F(0.34, 0.045, 1, 0.66)], 0.022);
        artCircle(ctx, G[1], 0.34 * 0.48, 0.11 + 0.34 * K * 0.52, 0.026, ART.LW * 0.6);
        /* 내민 위층을 받치는 까치발 */
        for (const f of [0.3, 0.78]) {
          artPoly(ctx, D[1], [-0.39 * f - 0.03, -0.02 + 0.39 * K * (1 - f), -0.39 * f + 0.03, 0 + 0.39 * K * (1 - f), -0.32 * f, 0.1 + 0.34 * K * (1 - f)]);
          artPoly(ctx, D[2], [0.39 * f - 0.03, 0 + 0.39 * K * (1 - f), 0.39 * f + 0.03, -0.02 + 0.39 * K * (1 - f), 0.32 * f, 0.1 + 0.34 * K * (1 - f)]);
        }
        logs(ctx, d.eave, -0.02, 0.39, 0.39, 4);
        artLine(ctx, G[1], [-0.39, -0.02, 0, -0.02 + 0.39 * K, 0.39, -0.02], 0.024);
        windowAt(ctx, 0.39, -0.3, -1, 0.34, 0.68, 0.13);
        windowAt(ctx, 0.39, -0.3, 1, 0.34, 0.68, 0.13);
        roof(ctx, GR, d.eave, 0.48, d.roof, 0.16, G[1]);
        chimney(ctx, d, true);
        antlers(ctx, 0, d.eave + 0.48 * K - 0.01, 1.15, G[1]);
        artLantern(ctx, -0.035, 0.24, 0.8);
        artLantern(ctx, -0.29, 0.2, 0.8);
      }

      /* 그루터기에 박힌 도끼 */
      artCylinder(ctx, W, 0.38, 0.33, 0.41, 0.05, 0.055, { topFill: W[0] });
      artStroke(ctx, D[0], [0.38, 0.33, 0.44, 0.2], 0.022);
      artPoly(ctx, level === 2 ? G[1] : ART.steel[1], [0.4, 0.2, 0.47, 0.17, 0.49, 0.25, 0.43, 0.25]);

      /* 지붕 위의 석궁 받침 */
      artStroke(ctx, D[1], [-0.07, d.roof + 0.01, 0, -h + 0.05, 0.07, d.roof + 0.01], 0.034);
      artStroke(ctx, W[1], [0, d.roof + 0.03, 0, -h + 0.04], 0.05);
      artEllipse(ctx, level === 2 ? G[1] : I[1], 0, -h + 0.035, 0.075, 0.032);
    },

    top(ctx, level, aim, o) {
      const h = H(level);
      const d = DIM[level];
      const a = artAim(aim);
      const s = 1 + level * 0.12;
      const P = (u, v, up) => [a.fx * u + a.sx * v, -h + a.fy * u + a.sy * v - (up || 0)];
      if (level >= 1) KIT.smoke(ctx, 0.21, d.roof - 0.1, o.t, '#d9dbe2', 3);
      /* 석궁: 개머리, 쇠 활대, 시위, 메긴 화살 */
      const gold = level === 2;
      const pull = 1 - Math.min(1, o.recoil * 1.5);
      const back = P(-0.2 * s, 0);
      const front = P(0.2 * s, 0);
      const stock = artTube(ctx, D, back[0], back[1], front[0], front[1], 0.045 * s, 0.036 * s, 0.7, 0.3);
      artBand(ctx, gold ? G : I, back[0] + (front[0] - back[0]) * 0.3, back[1] + (front[1] - back[1]) * 0.3, stock, 0.048 * s, 0.03);
      const l = P(0.1 * s, -0.22 * s);
      const r = P(0.1 * s, 0.22 * s);
      const mid = P(0.21 * s, 0);
      artStroke(ctx, gold ? G[1] : ART.steel[1], [l[0], l[1], mid[0], mid[1], r[0], r[1]], 0.036);
      const nock = P(0.2 * s - pull * 0.26 * s, 0);
      artLine(ctx, '#f6f0dc', [l[0], l[1], nock[0], nock[1], r[0], r[1]], 0.012);
      if (pull > 0.25) {
        const tip = P(0.33 * s, 0);
        artLine(ctx, ART.OUT, [nock[0], nock[1] - 0.012, tip[0], tip[1] - 0.012], 0.03);
        artLine(ctx, '#f3e4bb', [nock[0], nock[1] - 0.012, tip[0], tip[1] - 0.012], 0.014);
        const t0 = P(0.3 * s, -0.035);
        const t1 = P(0.3 * s, 0.035);
        artPoly(ctx, ART.steel[0], [tip[0] + a.fx * 0.04, tip[1] + a.fy * 0.04 - 0.012, t0[0], t0[1] - 0.012, t1[0], t1[1] - 0.012], ART.LW * 0.6);
        const f0 = P(0.2 * s - pull * 0.24 * s, -0.03);
        const f1 = P(0.2 * s - pull * 0.24 * s, 0.03);
        artLine(ctx, gold ? G[1] : R[1], [f0[0], f0[1] - 0.012, f1[0], f1[1] - 0.012], 0.016);
      }
    },
  };
})();
