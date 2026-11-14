'use strict';
/* 독탑 — 꼭대기의 가마솥에서 독이 끓는다. 겨누지 않으므로 aim 은 쓰지 않는다.
   1단: 쇠테를 두른 나무통 탑과 버섯.  2단: 돌탑 위에 나무 망대를 내밀어 얹고 구리 배관과 약병을 단 탑.
   3단: 이끼 낀 돌탑에 금테 가마솥, 해골 걸개, 뼈 장식. */
(function () {
  const S = ['#d6dcc9', '#a9b39a', '#7a866c']; /* 이끼 낀 돌 */
  const W = ART.darkwood;
  const I = ART.iron;
  const G = ART.gold;
  const P = ART.purple;
  const C = ['#f6ae72', '#cb763d', '#8b4a22'];
  const GOO = ['#d6ff8a', '#8fe04a', '#4f9a2a'];
  const K = ART.K;
  const BASE = 0.2;
  const DIM = [
    { top: -0.56, rTop: 0.25, rBot: 0.33, pot: 0.2 },
    { top: -0.74, rTop: 0.25, rBot: 0.34, pot: 0.22 },
    { top: -0.92, rTop: 0.26, rBot: 0.35, pot: 0.24 },
  ];

  function mushroom(ctx, x, y, s, cap) {
    artRect(ctx, ART.bone[0], x - s * 0.22, y - s * 0.7, s * 0.44, s * 0.75, s * 0.15, ART.LW * 0.7);
    ctx.beginPath();
    ctx.moveTo(x - s, y - s * 0.6);
    ctx.bezierCurveTo(x - s, y - s * 1.7, x + s, y - s * 1.7, x + s, y - s * 0.6);
    ctx.closePath();
    artFill(ctx, cap, ART.LW * 0.8);
    artCircle(ctx, '#ffffff', x - s * 0.35, y - s * 1.0, s * 0.16, 0);
    artCircle(ctx, '#ffffff', x + s * 0.3, y - s * 0.85, s * 0.12, 0);
  }

  function flask(ctx, x, y, s, color) {
    artLine(ctx, ART.OUT, [x, y - s * 1.9, x, y - s * 1.2], 0.014);
    artRect(ctx, '#e8f4ff', x - s * 0.22, y - s * 1.25, s * 0.44, s * 0.55, 0, ART.LW * 0.6);
    artCircle(ctx, color, x, y - s * 0.35, s * 0.55, ART.LW * 0.7);
    artCircle(ctx, 'rgba(255,255,255,.7)', x - s * 0.18, y - s * 0.5, s * 0.14, 0);
  }

  function skull(ctx, x, y, s) {
    artCircle(ctx, ART.bone[0], x, y, s, ART.LW * 0.6);
    artRect(ctx, ART.bone[0], x - s * 0.5, y + s * 0.5, s, s * 0.6, s * 0.1, ART.LW * 0.6);
    artCircle(ctx, ART.OUT, x - s * 0.38, y + s * 0.05, s * 0.26, 0);
    artCircle(ctx, ART.OUT, x + s * 0.38, y + s * 0.05, s * 0.26, 0);
  }

  TOWER_ART.poison = {
    body(ctx, level) {
      const d = DIM[level];
      const rAt = (y) => d.rTop + ((d.rBot - d.rTop) * (y - d.top)) / (BASE - d.top);
      artPlinth(ctx, S, '#b9d48a');
      /* 2단은 돌탑 위로 나무 망대가 내밀어 얹힌다. out = 망대가 돌벽 밖으로 나온 만큼 */
      const mid = level === 0 ? BASE : level === 1 ? d.top + 0.27 : d.top;
      const out = level === 1 ? 0.045 : 0;

      /* 아래쪽 돌 부분 */
      if (level >= 1) {
        artCylinder(ctx, S, 0, mid, BASE, rAt(mid), d.rBot, { topFill: S[2] });
        artCourses(ctx, 0, mid, BASE, rAt(mid), d.rBot, level === 2 ? 6 : 4, '40,60,30');
        /* 이끼 */
        for (const [x, y, w] of [[-0.2, mid + 0.12, 0.09], [0.16, mid + 0.24, 0.07], [-0.08, 0.1, 0.08]]) {
          artEllipse(ctx, GOO[2], x, y, w, w * 0.4, 0);
          artEllipse(ctx, GOO[1], x - 0.01, y - 0.01, w * 0.6, w * 0.22, 0);
        }
      }
      /* 위쪽 나무 부분: 1단은 통째로 나무통, 2단은 돌탑 위의 나무 망대 */
      if (level < 2) {
        const rt = d.rTop + out;
        const rb = rAt(mid) + out;
        if (level === 1) {
          /* 망대를 받치는 까치발 */
          for (let k = -2; k <= 2; k++) {
            const a = Math.PI / 2 + k * 0.55;
            const x = Math.cos(a) * rb;
            const y = mid + Math.sin(a) * rb * K;
            artPoly(ctx, W[2], [x - 0.03, y - 0.01, x + 0.03, y - 0.01, x * 0.86, y + 0.1]);
          }
        }
        artCylinder(ctx, [W[0], W[1], W[2]], 0, d.top, mid, rt, rb, { topFill: W[2] });
        for (let k = -3; k <= 3; k++) {
          const a = Math.PI / 2 + k * 0.38;
          artLine(ctx, 'rgba(30,16,8,.45)', [Math.cos(a) * rt, d.top + Math.sin(a) * rt * K, Math.cos(a) * rb, mid + Math.sin(a) * rb * K], 0.012);
        }
        for (const f of level === 1 ? [0.3, 0.92] : [0.22, 0.72]) {
          const y = d.top + (mid - d.top) * f;
          artHoop(ctx, 0, y, rt + ((rb - rt) * (y - d.top)) / (mid - d.top) + 0.004, I[0], 0.03, true);
        }
      }

      /* 문: 초록빛이 새는 둥근 문 */
      artArch(ctx, W[2], 0, 0.335, 0.085, 0.22);
      artArch(ctx, level === 2 ? I[1] : W[1], 0, 0.335, 0.058, 0.19, ART.LW * 0.7);
      artCircle(ctx, GOO[1], 0, 0.235, 0.022, ART.LW * 0.5);
      artPoly(ctx, S[0], [-0.13, 0.36, 0.13, 0.36, 0.11, 0.33, -0.11, 0.33], ART.LW * 0.8);

      if (level >= 1) {
        /* 구리 배관과 떨어지는 독, 걸어 둔 약병 */
        const px = rAt(0) + 0.03;
        artTube(ctx, C, px, 0.26, px - 0.02, d.top + 0.16, 0.026, 0.026, 0, 0);
        artTube(ctx, C, px - 0.02, d.top + 0.16, px - 0.1, d.top + 0.08, 0.026, 0.026, 0.6, 0);
        artCircle(ctx, C[0], px - 0.02, d.top + 0.16, 0.032, ART.LW * 0.7);
        artPoly(ctx, GOO[1], [px - 0.02, 0.3, px + 0.02, 0.3, px, 0.37], ART.LW * 0.5);
        flask(ctx, -0.3, d.top + 0.3, 0.06, GOO[1]);
        flask(ctx, -0.2, d.top + 0.36, 0.05, P[1]);
      }
      if (level === 2) {
        /* 초록 창과 해골 걸개 */
        for (const [x, y] of [[-0.14, d.top + 0.3], [0.15, d.top + 0.42]]) {
          artRect(ctx, ART.OUT, x - 0.03, y - 0.05, 0.06, 0.12, 0.03, 0);
          artRect(ctx, GOO[1], x - 0.017, y - 0.035, 0.034, 0.09, 0.017, 0);
        }
        const y = d.top + 0.52;
        artPoly(ctx, P[1], [-0.085, y, 0.085, y, 0.085, y + 0.22, 0, y + 0.29, -0.085, y + 0.22]);
        artPoly(ctx, P[0], [-0.085, y, -0.03, y, -0.03, y + 0.265, -0.085, y + 0.22], 0);
        artRect(ctx, G[1], -0.085, y, 0.17, 0.03, 0, ART.LW * 0.6);
        skull(ctx, 0.003, y + 0.12, 0.04);
      } else {
        skull(ctx, 0.0, d.top + (level === 0 ? 0.36 : 0.235), 0.04);
      }

      /* 가마솥을 받치는 테와 가마솥 */
      const lip = (level === 2 ? 0.05 : 0.03) + out;
      artCylinder(ctx, level === 2 ? S : [W[0], W[1], W[2]], 0, d.top, d.top + 0.07, d.rTop + lip, d.rTop + out + 0.004, { topFill: level === 2 ? S[2] : W[2] });
      if (level === 2) {
        for (let i = 0; i < 5; i++) {
          const a = Math.PI * (0.12 + i * 0.19);
          const x = Math.cos(a) * (d.rTop + lip);
          const yy = d.top + Math.sin(a) * (d.rTop + lip) * K;
          artPoly(ctx, ART.bone[0], [x - 0.025, yy + 0.01, x + Math.cos(a) * 0.05, yy - 0.12, x + 0.025, yy + 0.01], ART.LW * 0.7);
        }
      }
      const py = d.top - 0.2;
      ctx.beginPath();
      ctx.moveTo(-d.pot, py);
      ctx.bezierCurveTo(-d.pot * 1.25, py + 0.3, d.pot * 1.25, py + 0.3, d.pot, py);
      ctx.closePath();
      artFill(ctx, I[1]);
      ctx.beginPath();
      ctx.moveTo(-d.pot * 0.6, py + 0.03);
      ctx.bezierCurveTo(-d.pot * 0.9, py + 0.2, -d.pot * 0.2, py + 0.22, -d.pot * 0.1, py + 0.21);
      ctx.strokeStyle = I[0];
      ctx.lineWidth = 0.03;
      ctx.lineCap = 'round';
      ctx.stroke();
      artEllipse(ctx, level === 2 ? G[1] : I[0], 0, py, d.pot + 0.02, (d.pot + 0.02) * K);
      artEllipse(ctx, GOO[2], 0, py, d.pot - 0.02, (d.pot - 0.02) * K, ART.LW * 0.7);
      /* 흘러넘친 독 */
      artPoly(ctx, GOO[1], [d.pot * 0.5, py + 0.05, d.pot * 0.74, py + 0.04, d.pot * 0.66, py + 0.2, d.pot * 0.56, py + 0.14], ART.LW * 0.6);

      /* 발치의 버섯 */
      mushroom(ctx, -0.33, 0.4, 0.06, ART.red[1]);
      mushroom(ctx, -0.24, 0.42, 0.04, P[1]);
      if (level >= 1) mushroom(ctx, 0.3, 0.41, 0.05, GOO[2]);
      artIvy(ctx, [0.3, 0.18, 0.27, 0.06, 0.29, -0.06, 0.25, -0.17]);
    },

    top(ctx, level, aim, o) {
      const d = DIM[level];
      const t = o.t;
      const py = d.top - 0.2;
      const r = d.pot - 0.02;
      artGlow(ctx, 0, py, r * 2.2, '143,224,74', 0.32 + 0.12 * Math.sin(t * 3));
      artEllipse(ctx, GOO[1], 0, py, r, r * K, 0);
      artEllipse(ctx, GOO[0], -r * 0.25, py - r * K * 0.2, r * 0.45, r * K * 0.4, 0);
      /* 끓어오르는 방울 */
      for (let i = 0; i < 4 + level; i++) {
        const k = (t * 0.7 + i * 0.37) % 1;
        const x = Math.sin(i * 2.7) * r * 0.7;
        const y = py - k * (0.2 + level * 0.04);
        ctx.globalAlpha = 1 - k;
        artCircle(ctx, GOO[k < 0.5 ? 1 : 0], x + Math.sin(t * 3 + i) * 0.015, y, 0.022 + (1 - k) * 0.02, ART.LW * 0.6);
        ctx.globalAlpha = 1;
      }
      /* 독병을 던진 순간 튀는 독 */
      if (o.recoil > 0.3) {
        const k = (o.recoil - 0.3) / 0.7;
        for (const sx of [-1, 0, 1]) {
          artCircle(ctx, 'rgba(214,255,138,' + k + ')', sx * r * 0.7 * (1.3 - k), py - (1 - k) * 0.22 - Math.abs(sx) * 0.02, 0.035, 0);
        }
      }
    },
  };
})();
