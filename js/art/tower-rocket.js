'use strict';
/* 로켓탑 — 네모난 포대 위에서 로켓 다발을 쏘아 올린다.
   1단: 벽돌 포대와 4연장 발사대.  2단: 쇠판을 덧댄 포대와 6연장.  3단: 철갑 보루와 8연장, 신호 깃대. */
(function () {
  const B = ART.sand;
  const I = ART.iron;
  const O = ART.orange;
  const D = ART.darkwood;
  const ST = ART.steel;
  const K = ART.K;
  const GROUND = 0.24;
  const DIM = [
    { top: -0.5, wTop: 0.3, wBot: 0.37, lanes: 2 },
    { top: -0.68, wTop: 0.3, wBot: 0.38, lanes: 3 },
    { top: -0.86, wTop: 0.31, wBot: 0.39, lanes: 4 },
  ];

  const wAt = (d, y) => d.wTop + ((d.wBot - d.wTop) * (y - d.top)) / (GROUND - d.top);

  function courses(ctx, d, n) {
    const step = (GROUND - d.top) / (n + 1);
    for (let i = 1; i <= n; i++) {
      const y = d.top + step * i;
      const w = wAt(d, y);
      artLine(ctx, 'rgba(70,45,20,.3)', [-w, y, 0, y + w * K, w, y], 0.012);
      for (let k = 0; k < 2; k++) {
        const f = (k + 0.6 + (i % 2) * 0.4) / 2.6;
        const yy = y + w * K * (1 - f);
        artLine(ctx, 'rgba(70,45,20,.22)', [-w * f, yy - step + 0.014, -w * f, yy - 0.012], 0.01);
        artLine(ctx, 'rgba(70,45,20,.22)', [w * f, yy - step + 0.014, w * f, yy - 0.012], 0.01);
      }
    }
  }

  /* 벽면을 따라 비스듬히 두르는 띠. y 는 바깥 모서리에서의 높이. */
  function belt(ctx, d, y, hgt, left, right) {
    const w = wAt(d, y) + 0.004;
    artPoly(ctx, left, [-w, y, 0, y + w * K, 0, y + w * K + hgt, -w, y + hgt]);
    artPoly(ctx, right, [w, y, 0, y + w * K, 0, y + w * K + hgt, w, y + hgt]);
  }

  /* 주황·검정 빗금 띠 */
  function hazard(ctx, d, y, hgt) {
    belt(ctx, d, y, hgt, O[1], O[2]);
    const w = wAt(d, y);
    for (let i = 0; i < 3; i++) {
      const f0 = (i + 0.15) / 3;
      const f1 = (i + 0.6) / 3;
      artPoly(ctx, ART.OUT, [-w * (1 - f0), y + w * K * f0, -w * (1 - f1), y + w * K * f1, -w * (1 - f1) - 0.03, y + w * K * f1 + hgt, -w * (1 - f0) - 0.03, y + w * K * f0 + hgt], 0);
      artPoly(ctx, ART.OUT, [w * (1 - f0), y + w * K * f0, w * (1 - f1), y + w * K * f1, w * (1 - f1) + 0.03, y + w * K * f1 + hgt, w * (1 - f0) + 0.03, y + w * K * f0 + hgt], 0);
    }
  }

  function rivets(ctx, d, y) {
    const w = wAt(d, y);
    for (const f of [0.2, 0.5, 0.8]) {
      artCircle(ctx, ST[0], -w * f, y + w * K * (1 - f), 0.012, 0);
      artCircle(ctx, ST[2], w * f, y + w * K * (1 - f), 0.012, 0);
    }
  }

  TOWER_ART.rocket = {
    body(ctx, level) {
      const d = DIM[level];
      artShadow(ctx, 0.07, 0.33, 0.47, 0.15);
      artBox(ctx, [I[0], I[1], I[2]], 0, 0.24, 0.32, 0.44, 0.46, { topFill: I[0] });
      artBox(ctx, B, 0, d.top, GROUND, d.wTop, d.wBot, { topFill: '#7a6548' });
      courses(ctx, d, 3 + level * 2);

      /* 철문 */
      artPoly(ctx, I[1], [0.09, 0.345, 0.09, 0.17, 0.15, 0.1, 0.21, 0.13, 0.21, 0.3]);
      artLine(ctx, I[2], [0.15, 0.115, 0.15, 0.32], 0.012);
      artCircle(ctx, O[1], 0.12, 0.24, 0.012, 0);
      /* 환기구 */
      artPoly(ctx, ART.OUT, [-0.2, d.top + 0.22, -0.11, d.top + 0.252, -0.11, d.top + 0.31, -0.2, d.top + 0.278], 0);

      if (level === 0) {
        belt(ctx, d, d.top + 0.3, 0.05, O[1], O[2]);
      } else {
        hazard(ctx, d, d.top + 0.34, 0.075);
        /* 모서리에 덧댄 쇠판 */
        const yb = GROUND;
        const wb = d.wBot;
        artPoly(ctx, I[0], [-0.05, d.top + d.wTop * K - 0.018 + 0.1, 0, d.top + d.wTop * K + 0.1, 0, yb + wb * K, -0.06, yb + wb * K - 0.022]);
        artPoly(ctx, I[2], [0.05, d.top + d.wTop * K - 0.018 + 0.1, 0, d.top + d.wTop * K + 0.1, 0, yb + wb * K, 0.06, yb + wb * K - 0.022]);
        for (let i = 0; i < 3 + level; i++) artCircle(ctx, ST[0], -0.028, d.top + 0.3 + i * 0.17, 0.011, 0);
      }
      if (level === 2) {
        /* 윗부분을 감싼 철갑 */
        belt(ctx, d, d.top + 0.05, 0.2, I[0], I[2]);
        rivets(ctx, d, d.top + 0.09);
        rivets(ctx, d, d.top + 0.21);
        /* 배기관 */
        artTube(ctx, I, -0.4, d.top + 0.52, -0.4, d.top + 0.2, 0.035, 0.035, 0, 0.5);
        artTubeEnd(ctx, '#17131d', -0.4, d.top + 0.2, 0.026, 0, 1, 0.5);
        artTube(ctx, [I[1], I[2], I[2]], 0.4, d.top + 0.52, 0.4, d.top + 0.2, 0.035, 0.035, 0, 0.5);
        artTubeEnd(ctx, '#17131d', 0.4, d.top + 0.2, 0.026, 0, 1, 0.5);
      }

      /* 꾸밈: 경고판, 로켓 상자, 화약통, 등불, 눈금판 */
      artPoly(ctx, '#ffd23c', [-0.16, 0.14, -0.1, 0.03, -0.04, 0.16]);
      artLine(ctx, ART.OUT, [-0.1, 0.075, -0.1, 0.115], 0.02);
      artCircle(ctx, ART.OUT, -0.1, 0.14, 0.011, 0);
      /* 로켓을 담은 나무 상자 */
      for (const [dx, tip] of [[-0.04, 0], [0.0, -0.02], [0.04, 0]]) {
        artTube(ctx, O, -0.32 + dx, 0.34, -0.32 + dx, 0.2 + tip, 0.022, 0.008, 0, 0.9);
      }
      artPoly(ctx, D[0], [-0.41, 0.3, -0.23, 0.3, -0.23, 0.43, -0.41, 0.43]);
      artLine(ctx, D[2], [-0.41, 0.365, -0.23, 0.365], 0.014);
      artLine(ctx, D[2], [-0.32, 0.3, -0.32, 0.43], 0.014);
      artBarrel(ctx, 0.33, 0.42, 0.065, 0.14, O, I[2]);
      artPoly(ctx, '#ffd23c', [0.3, 0.33, 0.33, 0.37, 0.36, 0.33, 0.33, 0.3], ART.LW * 0.5);
      artLantern(ctx, 0.24, 0.02, 0.9);
      if (level >= 1) {
        /* 눈금판과 배관 */
        artCircle(ctx, I[0], -0.2, d.top + 0.52, 0.045);
        artCircle(ctx, '#fbf6ea', -0.2, d.top + 0.52, 0.03, ART.LW * 0.5);
        artLine(ctx, '#d8432f', [-0.2, d.top + 0.52, -0.185, d.top + 0.5], 0.012);
        artTube(ctx, ['#f6ae72', '#cb763d', '#8b4a22'], 0.2, d.top + 0.5, 0.2, d.top + 0.75, 0.022, 0.022, 0, 0);
      }
      if (level === 2) {
        /* 주황 걸개 */
        const y = d.top + 0.42;
        artPoly(ctx, O[1], [-0.25, y, -0.11, y + 0.05, -0.11, y + 0.27, -0.18, y + 0.29, -0.25, y + 0.22]);
        artLine(ctx, ART.gold[1], [-0.25, y + 0.025, -0.11, y + 0.075], 0.022);
        artPoly(ctx, '#fff6cf', [-0.18, y + 0.11, -0.155, y + 0.16, -0.18, y + 0.21, -0.205, y + 0.16], ART.LW * 0.5);
      }

      /* 발사 마루와 쇠 난간 */
      const w = d.wTop + 0.05;
      artBox(ctx, level === 0 ? ART.wood : [ST[0], I[0], I[1]], 0, d.top, d.top + 0.07, w, d.wTop + 0.01, { topFill: level === 0 ? ART.wood[0] : ST[1] });
      artStroke(ctx, I[2], [-w + 0.02, d.top - 0.09, 0, d.top - w * K - 0.09, w - 0.02, d.top - 0.09], 0.024);
      artStroke(ctx, I[2], [0, d.top - w * K, 0, d.top - w * K - 0.1], 0.03);
    },

    top(ctx, level, aim, o) {
      const d = DIM[level];
      const h = TOWERS.rocket.levels[level].h;
      if (level === 2) {
        /* 신호 깃대 */
        const fx = 0;
        const fy = d.top - (d.wTop + 0.05) * K - 0.08;
        artLine(ctx, ART.OUT, [fx, fy, fx, fy - 0.52], 0.036);
        artLine(ctx, ST[1], [fx, fy, fx, fy - 0.52], 0.016);
        artFlag(ctx, O, fx, fy - 0.5, 0.22, 0.14, o.t);
        artCircle(ctx, (o.t * 1.5) % 1 < 0.5 ? '#ff5a3a' : '#7a2a20', fx, fy - 0.53, 0.026, ART.LW * 0.7);
      }

      const a = artAim(aim);
      const y0 = -h;
      const lanes = d.lanes;
      const hw = 0.045 + lanes * 0.042;
      const hl = 0.17 + level * 0.015;
      const hgt = 0.15;
      const kick = o.recoil * 0.05;
      const cx = -a.fx * kick;
      const cy = y0 - a.fy * kick;
      const loaded = o.recoil < 0.3;
      const P0 = (u, v, down) => [cx + a.fx * u + a.sx * v, cy + a.fy * u + a.sy * v + (down || 0)];
      const lane = (i) => ((i + 0.5) / lanes - 0.5) * 2 * (hw - 0.012);
      const away = a.toward < 0;

      /* 받침 기둥 */
      artTube(ctx, I, 0, y0 + 0.24, 0, y0 + 0.1, 0.05, 0.05, 0, 0);

      const noses = () => {
        if (!loaded) return;
        for (const row of [hgt * 0.72, hgt * 0.28]) {
          for (let i = 0; i < lanes; i++) {
            const p = P0(hl - 0.01, lane(i), row);
            const q = P0(hl + 0.075, lane(i), row);
            artTube(ctx, O, p[0], p[1], q[0], q[1], 0.03, 0.012, 0, 0.9);
          }
        }
      };
      const smoke = () => {
        if (o.recoil <= 0.05) return;
        const k = o.recoil;
        for (let i = 0; i < 3; i++) {
          const p = P0(-hl - 0.06 - i * 0.07 * (1.2 - k), (i - 1) * 0.05, hgt * 0.5);
          artCircle(ctx, 'rgba(235,235,240,' + k * 0.75 + ')', p[0], p[1] - (1 - k) * 0.08, 0.05 + i * 0.022 + (1 - k) * 0.03, 0);
        }
        if (k > 0.5) {
          const p = P0(-hl - 0.03, 0, hgt * 0.5);
          artCircle(ctx, 'rgba(255,170,70,' + (k - 0.5) * 2 + ')', p[0], p[1], 0.06, 0);
        }
      };

      if (away) noses();
      else smoke();
      const pr = artPrism(ctx, level === 0 ? D : I, cx, cy, hl, hw, hgt, aim, level === 0 ? D[0] : I[0]);
      /* 윗면: 통 사이 금과 주황 띠 */
      for (let i = 1; i < lanes; i++) {
        const v = ((i / lanes) - 0.5) * 2 * (hw - 0.012);
        const p = pr.P(-hl + 0.02, v);
        const q = pr.P(hl - 0.02, v);
        artLine(ctx, 'rgba(20,16,26,.55)', [p[0], p[1], q[0], q[1]], 0.014);
      }
      const s0 = pr.P(-hl * 0.45, -hw);
      const s1 = pr.P(-hl * 0.45, hw);
      const s2 = pr.P(-hl * 0.15, hw);
      const s3 = pr.P(-hl * 0.15, -hw);
      artPoly(ctx, O[1], [s0[0], s0[1], s1[0], s1[1], s2[0], s2[1], s3[0], s3[1]], ART.LW * 0.6);
      if (a.fy > 0.02) {
        /* 앞면이 보일 때: 발사구 */
        for (const row of [hgt * 0.72, hgt * 0.28]) {
          for (let i = 0; i < lanes; i++) {
            const p = P0(hl, lane(i), row);
            artTubeEnd(ctx, '#17131d', p[0], p[1], 0.03, a.fx, a.fy, Math.max(0.35, a.toward));
          }
        }
      }
      if (away) smoke();
      else noses();
    },
  };
})();
