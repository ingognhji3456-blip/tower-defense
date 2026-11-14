'use strict';
/* 기관포탑 — 쇠로 두른 포탑 위에서 여러 총열이 돌며 쉴 새 없이 쏜다.
   1단: 모래주머니를 두른 낮은 쇠 포탑에 총열 넷.
   2단: 덧댄 장갑과 경고 줄무늬, 방패, 탐조등, 총열 다섯.
   3단: 금테를 두른 높은 포탑에 쌍열 기관포와 도는 탐지 접시. */
(function () {
  const S = ART.stone;
  const I = ART.iron;
  const ST = ART.steel;
  const G = ART.gold;
  const GR = ART.green;
  const K = ART.K;
  const BRASS = ['#ffe6a0', '#d9a441', '#93661f'];
  const TOP = [-0.44, -0.6, -0.76];
  const H = (level) => TOWERS.gatling.levels[level].h;

  TOWER_ART.gatling = {
    body(ctx, level) {
      const top = TOP[level];
      const band = level === 2 ? G : ST;
      const rAt = KIT.round(ctx, { tones: [I[0], I[1], I[2]], top, rTop: 0.24, rBot: 0.33, plinth: S, door: false });
      if (level >= 1) {
        /* 기단의 경고 줄무늬 */
        for (let k = -4; k <= 4; k++) {
          const a = Math.PI / 2 + k * 0.3;
          const x = Math.cos(a) * 0.445;
          const y = 0.3 + Math.sin(a) * 0.445 * K;
          artPoly(ctx, k % 2 ? '#2f3542' : '#ffd23c', [x - 0.034, y - 0.024, x + 0.034, y - 0.024, x + 0.034, y + 0.024, x - 0.034, y + 0.024], 0);
        }
      }
      /* 장갑판 이음매 */
      for (const k of [-2, -1, 1, 2]) {
        const a = Math.PI / 2 + k * 0.42;
        artLine(ctx, 'rgba(20,24,32,.5)', [Math.cos(a) * 0.24, top + Math.sin(a) * 0.24 * K + 0.03, Math.cos(a) * 0.33, KIT.BASE + Math.sin(a) * 0.33 * K - 0.02], 0.014);
      }
      /* 테와 대갈못 */
      const hoops = level === 0 ? [top + 0.08, 0.1] : [top + 0.08, (top + KIT.BASE) / 2, 0.1];
      for (const y of hoops) {
        artHoop(ctx, 0, y, rAt(y) + 0.004, band[1], 0.042, true);
        artHoop(ctx, 0, y - 0.012, rAt(y) + 0.004, band[0], 0.012);
        for (let k = -2; k <= 2; k++) {
          const a = Math.PI / 2 + k * 0.5;
          artCircle(ctx, level === 2 ? '#fff6cf' : ST[0], Math.cos(a) * rAt(y), y + Math.sin(a) * rAt(y) * K, 0.014, 0);
        }
      }
      if (level >= 1) {
        /* 덧댄 장갑: 아래쪽을 한 겹 더 두른다 */
        const y0 = (top + KIT.BASE) / 2 + 0.07;
        artCylinder(ctx, [ST[1], I[0], I[2]], 0, y0, KIT.BASE + 0.01, rAt(y0) + 0.025, 0.355, { top: false });
        for (const k of [-2, -1, 0, 1, 2]) {
          const a = Math.PI / 2 + k * 0.45;
          const r0 = rAt(y0) + 0.025;
          artLine(ctx, 'rgba(20,24,32,.55)', [Math.cos(a) * r0, y0 + Math.sin(a) * r0 * K + 0.02, Math.cos(a) * 0.355, KIT.BASE + Math.sin(a) * 0.355 * K], 0.014);
          artCircle(ctx, ST[0], Math.cos(a + 0.22) * (r0 + 0.01), y0 + 0.07 + Math.sin(a + 0.22) * r0 * K, 0.012, 0);
        }
      }
      /* 관측 틈과 붉은 등 */
      const sy = top + 0.2;
      artRect(ctx, '#15181f', -0.12, sy + rAt(sy) * K - 0.035, 0.24, 0.05, 0.02, ART.LW * 0.8);
      artCircle(ctx, '#ff5a3a', 0.07, sy + rAt(sy) * K - 0.01, 0.014, 0);
      /* 둥근 쇠문: 손잡이 바퀴 */
      artCircle(ctx, I[2], 0, 0.24, 0.1);
      artCircle(ctx, I[0], 0, 0.24, 0.08, ART.LW * 0.7);
      for (let i = 0; i < 3; i++) {
        const q = (i * Math.PI) / 3;
        artLine(ctx, I[2], [Math.cos(q) * -0.055, 0.24 + Math.sin(q) * -0.055, Math.cos(q) * 0.055, 0.24 + Math.sin(q) * 0.055], 0.016);
      }
      artCircle(ctx, ST[0], 0, 0.24, 0.022, ART.LW * 0.6);
      /* 탄약 상자와 탄띠 */
      artRect(ctx, GR[2], 0.26, 0.29, 0.18, 0.14, 0.012);
      artRect(ctx, GR[1], 0.275, 0.305, 0.06, 0.11, 0.008, 0);
      for (const x of [0.3, 0.345, 0.39]) artCircle(ctx, BRASS[1], x, 0.29, 0.018, ART.LW * 0.6);
      const belt = artCurve(0.35, 0.29, 0.46, 0.0, 0.2, top - 0.03, 8);
      artStroke(ctx, BRASS[1], belt, 0.046);
      for (let i = 2; i < belt.length - 2; i += 2) artLine(ctx, BRASS[2], [belt[i] - 0.02, belt[i + 1], belt[i] + 0.02, belt[i + 1]], 0.014);
      if (level >= 1) {
        /* 탐조등 */
        artStroke(ctx, I[1], [-0.3, 0.1, -0.36, -0.06], 0.026);
        artCircle(ctx, I[1], -0.37, -0.09, 0.055);
        artCircle(ctx, '#fff6cf', -0.385, -0.1, 0.035, ART.LW * 0.6);
        artGlow(ctx, -0.385, -0.1, 0.16, '255,246,207', 0.4);
      }
      if (level === 0) {
        /* 모래주머니 */
        for (const [x, y] of [[-0.4, 0.31], [-0.27, 0.38], [-0.13, 0.42], [-0.34, 0.25], [-0.2, 0.32]]) {
          artRect(ctx, ART.sand[1], x - 0.075, y - 0.035, 0.15, 0.075, 0.03);
          artRect(ctx, ART.sand[0], x - 0.055, y - 0.024, 0.07, 0.024, 0.012, 0);
        }
      }
      /* 회전대와 포가 */
      artCylinder(ctx, [ST[0], ST[1], ST[2]], 0, top - 0.06, top + 0.02, 0.2, 0.225, { topFill: ST[1] });
      artHoop(ctx, 0, top - 0.02, 0.212, band[1], 0.016);
      const h = H(level);
      artStroke(ctx, I[2], [-0.1, top - 0.07, -0.07, -h + 0.03], 0.05);
      artStroke(ctx, I[1], [0.1, top - 0.07, 0.07, -h + 0.03], 0.05);
      if (level === 2) {
        /* 붉은 경고등 */
        artGlow(ctx, 0.3, top - 0.03, 0.1, '255,90,58', 0.5);
        artStroke(ctx, I[1], [0.24, top + 0.06, 0.3, top - 0.01], 0.024);
        artCircle(ctx, '#ff5a3a', 0.3, top - 0.03, 0.03);
      }
    },

    top(ctx, level, aim, o) {
      const h = H(level);
      const a = artAim(aim);
      const t = o.t;
      const s = 1 + level * 0.1;
      const n = level === 0 ? 4 : level === 1 ? 5 : 3;
      const spin = t * (1.5 + o.recoil * 26);
      const Q = (u, v, up) => [a.fx * u + a.sx * v, -h + a.fy * u + a.sy * v - (up || 0)];
      const away = a.toward < -0.2;
      const gold = level === 2;
      if (gold) {
        /* 도는 탐지 접시 */
        const q = t * 1.6;
        const bx = -a.fx * 0.2;
        const by = -h - a.fy * 0.2 - 0.14;
        artLine(ctx, ART.OUT, [bx, by + 0.14, bx, by], 0.03);
        artEllipse(ctx, ST[1], bx, by, 0.07 * Math.max(0.25, Math.abs(Math.cos(q))), 0.055, ART.LW * 0.8);
        artCircle(ctx, '#ff5a3a', bx, by, 0.012, 0);
      }
      const housing = () => {
        const b = Q(-0.2 * s, 0);
        const f = Q(0.07 * s, 0);
        const tube = artTube(ctx, gold ? G : [ST[0], ST[1], ST[2]], b[0], b[1], f[0], f[1], 0.105 * s, 0.095 * s, 0.85, 0.5);
        artBand(ctx, I, b[0] + (f[0] - b[0]) * 0.5, b[1] + (f[1] - b[1]) * 0.5, tube, 0.11 * s, 0.03);
        /* 옆에 붙은 탄통 */
        const d0 = Q(-0.1 * s, 0.13 * s, -0.03);
        const d1 = Q(0.02 * s, 0.13 * s, -0.03);
        if (a.sy > -0.2) artTube(ctx, [GR[0], GR[1], GR[2]], d0[0], d0[1], d1[0], d1[1], 0.06 * s, 0.06 * s, 0.6, 0.6);
      };
      const bundle = (v0) => {
        const list = [];
        for (let i = 0; i < n; i++) {
          const q = spin + (i * Math.PI * 2) / n;
          list.push([Math.sin(q), Math.cos(q)]);
        }
        list.sort((p, q) => p[0] - q[0]);
        const len = 0.42 * s;
        for (const [up, v] of list) {
          const b = Q(0.06 * s, v0 + v * 0.045 * s, up * 0.04 * s);
          const f = Q(len - o.recoil * 0.02, v0 + v * 0.045 * s, up * 0.04 * s);
          artStroke(ctx, o.recoil > 0.2 && up > 0 ? '#c9805a' : up > 0 ? I[0] : I[1], [b[0], b[1], f[0], f[1]], 0.036 * s);
        }
        const ring = gold ? G : [ST[0], ST[1], ST[2]];
        if (level >= 1) {
          /* 총열 뿌리를 감싼 덮개 */
          const c0 = Q(0.07 * s, v0);
          const c1 = Q(0.22 * s, v0);
          artTube(ctx, ring, c0[0], c0[1], c1[0], c1[1], 0.086 * s, 0.082 * s, 0, 0);
        } else {
          const c = Q(0.2 * s, v0);
          artTube(ctx, ring, c[0] - a.fx * 0.018, c[1] - a.fy * 0.018, c[0] + a.fx * 0.018, c[1] + a.fy * 0.018, 0.076 * s, 0.076 * s, 0, 0);
        }
        const c = Q(0.36 * s, v0);
        artTube(ctx, ring, c[0] - a.fx * 0.018, c[1] - a.fy * 0.018, c[0] + a.fx * 0.018, c[1] + a.fy * 0.018, 0.076 * s, 0.076 * s, 0, 0);
        if (o.recoil > 0.3) {
          const m = Q(len + 0.04, v0);
          artGlow(ctx, m[0], m[1], 0.22, '255,220,120', o.recoil * 0.9);
          artSparkle(ctx, m[0], m[1], 0.1 * o.recoil + 0.03, '#fff6cf', 1);
        }
      };
      const guns = () => {
        if (gold) {
          /* 쌍열 */
          bundle(-0.085 * s);
          bundle(0.085 * s);
        } else {
          bundle(0);
        }
      };
      if (away) { guns(); housing(); } else { housing(); guns(); }
      if (o.recoil > 0.15) {
        /* 튀어 나가는 탄피 */
        for (let i = 0; i < 3; i++) {
          const k = (t * 9 + i * 0.33) % 1;
          const p = Q(-0.05 * s, -0.12 * s - k * 0.2, 0.03 + Math.sin(k * Math.PI) * 0.16);
          ctx.globalAlpha = 1 - k;
          artRect(ctx, BRASS[1], p[0] - 0.012, p[1] - 0.02, 0.024, 0.04, 0.006, ART.LW * 0.5);
        }
        ctx.globalAlpha = 1;
      }
    },
  };
})();
