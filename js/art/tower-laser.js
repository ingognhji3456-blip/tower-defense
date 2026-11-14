'use strict';
/* 광선탑 — 흰 대리석 탑이 끌어올린 빛을 큰 태양석에 모아, 돋보기(렌즈)로 겨눠 쏜다.
   1단: 금 반사 접시 위에 태양석과 렌즈 하나를 올린 대리석 단.
   2단: 태양석을 감싸는 금 갈퀴와 렌즈 둘을 단 탑.
   3단: 태양 걸개와 첨탑, 금 고리, 떠도는 조각을 거느린 높은 탑. */
(function () {
  const M = ['#ffffff', '#ece6da', '#c2b9a8']; /* 대리석 */
  const G = ART.gold;
  const R = ['#ffd27a', '#ff7a3a', '#c2371e']; /* 태양석 */
  const K = ART.K;
  const BASE = 0.2;
  /* w·hh: 태양석의 반너비·반높이, lens: 렌즈 반지름 */
  const DIM = [
    { top: -0.5, rTop: 0.2, rBot: 0.32, w: 0.085, hh: 0.16, lens: 0.075 },
    { top: -0.68, rTop: 0.195, rBot: 0.33, w: 0.1, hh: 0.185, lens: 0.085 },
    { top: -0.88, rTop: 0.195, rBot: 0.34, w: 0.115, hh: 0.21, lens: 0.095 },
  ];
  const dish = (d, level) => d.rTop + 0.1 + level * 0.02;

  /* 태양 문장 */
  function sun(ctx, x, y, s, fill) {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      artPoly(ctx, fill, [x + Math.cos(a - 0.2) * s * 0.7, y + Math.sin(a - 0.2) * s * 0.7, x + Math.cos(a) * s * 1.5, y + Math.sin(a) * s * 1.5, x + Math.cos(a + 0.2) * s * 0.7, y + Math.sin(a + 0.2) * s * 0.7], ART.LW * 0.45);
    }
    artCircle(ctx, fill, x, y, s * 0.75, ART.LW * 0.5);
  }

  /* 깎은 면이 보이는 태양석 */
  function gem(ctx, x, y, w, hh, lw) {
    const g = y - hh * 0.3; /* 허리선 */
    const outline = [x, y - hh, x - w, g, x, y + hh, x + w, g];
    artPoly(ctx, R[1], outline, lw);
    artPoly(ctx, R[0], [x, y - hh, x - w, g, x - w * 0.25, g + hh * 0.09], 0);
    artPoly(ctx, '#ffe9b0', [x, y - hh, x - w * 0.25, g + hh * 0.09, x + w * 0.35, g + hh * 0.09], 0);
    artPoly(ctx, '#e25a2c', [x - w * 0.25, g + hh * 0.09, x + w * 0.35, g + hh * 0.09, x, y + hh], 0);
    artPoly(ctx, R[2], [x + w * 0.35, g + hh * 0.09, x + w, g, x, y + hh], 0);
    artLine(ctx, 'rgba(255,255,255,.75)', [x - w, g, x - w * 0.25, g + hh * 0.09, x + w * 0.35, g + hh * 0.09, x + w, g], 0.01);
    artPath(ctx, outline);
    ctx.strokeStyle = ART.OUT;
    ctx.lineWidth = lw == null ? ART.LW : lw;
    ctx.stroke();
  }

  /* 탑 몸통을 타고 오르는 빛의 창 */
  const SLITS = [0.03, -0.09, -0.21, -0.33];
  function slit(ctx, y) {
    artRect(ctx, ART.OUT, -0.034, y - 0.05, 0.068, 0.1, 0.03, 0);
    artRect(ctx, '#ff9d3a', -0.02, y - 0.037, 0.04, 0.074, 0.02, 0);
    artRect(ctx, '#ffe9a8', -0.009, y - 0.028, 0.018, 0.056, 0.009, 0);
  }

  TOWER_ART.laser = {
    body(ctx, level) {
      const d = DIM[level];
      const h = TOWERS.laser.levels[level].h;
      const rAt = (y) => d.rTop + ((d.rBot - d.rTop) * (y - d.top)) / (BASE - d.top);
      artPlinth(ctx, M, '#fff6cf');
      /* 기단의 금 장식 */
      for (let k = -2; k <= 2; k++) {
        const a = Math.PI / 2 + k * 0.5;
        const x = Math.cos(a) * 0.42;
        const y = 0.285 + Math.sin(a) * 0.42 * K;
        artPoly(ctx, G[1], [x, y - 0.02, x + 0.02, y, x, y + 0.02, x - 0.02, y], ART.LW * 0.4);
      }
      /* 3단: 태양석 뒤로 솟은 첨탑 */
      if (level === 2) {
        artStroke(ctx, G[2], [0, d.top - 0.02, 0, -h - d.hh - 0.13], 0.03);
        sun(ctx, 0, -h - d.hh - 0.17, 0.034, G[0]);
      }
      artCylinder(ctx, M, 0, d.top, BASE, d.rTop, d.rBot, { topFill: M[1] });
      /* 세로 홈(기둥 무늬) */
      for (const k of [-2, -1, 1, 2]) {
        const a = Math.PI / 2 + k * 0.42;
        artLine(ctx, 'rgba(120,105,80,.3)', [Math.cos(a) * d.rTop, d.top + Math.sin(a) * d.rTop * K + 0.06, Math.cos(a) * d.rBot, BASE + Math.sin(a) * d.rBot * K - 0.04], 0.014);
      }
      /* 금테 */
      const ring = (y, w) => {
        artHoop(ctx, 0, y, rAt(y) + 0.004, G[1], w, true);
        artHoop(ctx, 0, y - w * 0.3, rAt(y) + 0.004, G[0], w * 0.3);
      };
      ring(BASE - 0.04, 0.04);
      ring(d.top + 0.09, 0.04);
      /* 금 문 */
      artArch(ctx, G[2], 0, 0.335, 0.085, 0.22);
      artArch(ctx, '#fff1b8', 0, 0.335, 0.056, 0.19, ART.LW * 0.7);
      artArch(ctx, '#ffffff', 0, 0.335, 0.026, 0.15, 0);
      artPoly(ctx, M[0], [-0.13, 0.36, 0.13, 0.36, 0.11, 0.33, -0.11, 0.33], ART.LW * 0.8);
      /* 빛의 창과 태양 문장 */
      const slits = level === 0 ? 3 : 4;
      for (let i = 0; i < slits; i++) slit(ctx, SLITS[i]);
      if (level === 2) {
        const y = d.top + 0.2;
        artPoly(ctx, R[1], [-0.085, y, 0.085, y, 0.085, y + 0.22, 0, y + 0.29, -0.085, y + 0.22]);
        artPoly(ctx, R[0], [-0.085, y, -0.03, y, -0.03, y + 0.265, -0.085, y + 0.22], 0);
        artRect(ctx, G[1], -0.085, y, 0.17, 0.03, 0, ART.LW * 0.6);
        sun(ctx, 0.003, y + 0.13, 0.034, G[0]);
      } else if (level === 1) {
        sun(ctx, 0, d.top + 0.225, 0.03, G[1]);
      }
      artLantern(ctx, -0.19, 0.2, 0.9);
      artLantern(ctx, 0.19, 0.2, 0.9);
      /* 기단 둘레의 작은 수정 */
      gem(ctx, -0.34, 0.3, 0.035, 0.08, ART.LW * 0.8);
      gem(ctx, 0.35, 0.31, 0.03, 0.07, ART.LW * 0.8);

      /* 꼭대기의 금 반사 접시: 빛을 받아 안쪽이 환하다 */
      const dr = dish(d, level);
      const dy = d.top - 0.075;
      artCylinder(ctx, [G[0], G[1], G[2]], 0, dy, d.top + 0.05, dr, d.rTop + 0.01, { topFill: G[2] });
      artEllipse(ctx, '#ffd768', 0, dy + 0.004, dr * 0.8, dr * 0.8 * K, 0);
      artEllipse(ctx, '#fff3c4', -dr * 0.1, dy + 0.002, dr * 0.5, dr * 0.5 * K, 0);
      if (level >= 1) {
        for (let k = -2; k <= 2; k++) {
          const a = Math.PI / 2 + k * 0.55;
          artCircle(ctx, R[1], Math.cos(a) * (dr - 0.012), dy + 0.03 + Math.sin(a) * (dr - 0.012) * K, 0.018, ART.LW * 0.6);
        }
      }
      /* 태양석 받침 */
      artTube(ctx, G, 0, dy + 0.01, 0, -h + d.hh + 0.07, 0.04, 0.024, 0, 0);
      /* 2단부터: 태양석을 감싸 빛을 모으는 금 갈퀴 */
      if (level >= 1) {
        for (const sgn of [-1, 1]) {
          const tones = sgn < 0 ? G : [G[1], G[2], G[2]];
          const tipY = -h - d.hh * (level === 2 ? 0.75 : 0.45);
          const pts = artCurve(sgn * (dr - 0.03), dy, sgn * (dr + 0.17), (dy + tipY) / 2 + 0.03, sgn * (d.w + 0.085), tipY, 12);
          artStroke(ctx, tones[1], pts, 0.048);
          artLine(ctx, tones[0], pts.map((v) => v - 0.009), 0.013);
          artPoly(ctx, '#fff6cf', [sgn * (d.w + 0.085), tipY - 0.085, sgn * (d.w + 0.085) + 0.05, tipY + 0.012, sgn * (d.w + 0.085) - 0.05, tipY + 0.012], ART.LW * 0.7);
          artCircle(ctx, R[1], pts[12], pts[13], 0.028, ART.LW * 0.7);
        }
      }
    },

    top(ctx, level, aim, o) {
      const d = DIM[level];
      const h = TOWERS.laser.levels[level].h;
      const t = o.t;
      const y = -h + Math.sin(t * 2.4) * 0.012;
      const on = o.recoil > 0.2;
      const pulse = 0.5 + 0.5 * Math.sin(t * 4);
      const a = artAim(aim);
      const ang = Math.atan2(a.fy, a.fx);

      /* 몸통을 타고 오르는 빛 */
      const run = (t * (on ? 1.6 : 0.7)) % 1;
      const slits = level === 0 ? 3 : 4;
      for (let i = 0; i < slits; i++) {
        const k = 1 - Math.min(1, Math.abs(run * (slits + 1) - 0.5 - i));
        if (k <= 0) continue;
        ctx.globalAlpha = k;
        artRect(ctx, '#ffffff', -0.02, SLITS[i] - 0.037, 0.04, 0.074, 0.02, 0);
        ctx.globalAlpha = 1;
      }

      artGlow(ctx, 0, y, d.hh * (2.1 + (on ? 0.9 : 0)), '255,170,70', 0.36 + pulse * 0.12 + (on ? 0.28 : 0));

      /* 금 고리와 떠도는 조각 (3단은 고리, 2단부터 조각) */
      const shard = (i, front) => {
        const sa = t * 1.4 + (i * Math.PI * 2) / Math.max(1, level);
        if (Math.sin(sa) > 0 !== front) return;
        gem(ctx, Math.cos(sa) * (d.w + 0.2), y + d.hh * 0.75 + Math.sin(sa) * 0.05, 0.022, 0.05, ART.LW * 0.7);
      };
      const halo = (front) => {
        ctx.beginPath();
        ctx.ellipse(0, y - d.hh * 0.1, d.w * 1.75, d.w * 0.55, Math.sin(t * 1.1) * 0.25, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
        if (front) {
          ctx.strokeStyle = ART.OUT;
          ctx.lineWidth = 0.04;
          ctx.stroke();
        }
        ctx.strokeStyle = front ? G[1] : G[2];
        ctx.lineWidth = 0.02;
        ctx.stroke();
      };

      /* 겨누는 쪽에 선 렌즈. dist = 태양석에서 떨어진 거리 */
      const lens = (dist, r) => {
        const lx = a.fx * dist;
        const ly = y + a.fy * dist;
        const rx = Math.max(r * 0.26, r * 0.85 * Math.abs(a.toward));
        /* 렌즈를 받친 금 팔 */
        artStroke(ctx, G[1], artCurve(0, y + d.hh + 0.07, lx * 0.75, y + d.hh + 0.11, lx, ly + r * 0.95, 8), 0.026);
        artEllipse(ctx, G[1], lx, ly, rx + 0.024, r + 0.024, ART.LW, ang);
        artEllipse(ctx, on ? '#ffffff' : '#d9f6ff', lx, ly, rx, r, ART.LW * 0.6, ang);
        artEllipse(ctx, on ? '#fff3c4' : '#9cdcf5', lx + a.fx * 0.004, ly + r * 0.18, rx * 0.72, r * 0.6, 0, ang);
        artEllipse(ctx, '#ffffff', lx - rx * 0.25, ly - r * 0.42, rx * 0.3, r * 0.2, 0, ang);
      };
      const lenses = () => {
        const near = d.w + 0.12;
        if (a.toward < 0) {
          if (level >= 1) lens(near + 0.15, d.lens * 0.66);
          lens(near, d.lens);
        } else {
          lens(near, d.lens);
          if (level >= 1) lens(near + 0.15, d.lens * 0.66);
        }
      };
      /* 쏘는 동안 태양석에서 렌즈를 지나 뻗는 빛줄기 */
      const core = () => {
        if (!on) return;
        const far = d.w + 0.12 + (level >= 1 ? 0.24 : 0.1);
        artLine(ctx, 'rgba(255,190,90,.55)', [0, y, a.fx * far, y + a.fy * far], 0.09);
        artLine(ctx, '#ffffff', [0, y, a.fx * far, y + a.fy * far], 0.034);
      };

      const away = a.toward < 0;
      for (let i = 0; i < level; i++) shard(i, false);
      if (level === 2) halo(false);
      if (away) {
        lenses();
        core();
      }
      gem(ctx, 0, y, d.w, d.hh);
      if (on) artEllipse(ctx, 'rgba(255,255,255,.7)', 0, y - d.hh * 0.1, d.w * 0.5, d.hh * 0.5, 0);
      if (!away) {
        core();
        lenses();
      }
      if (level === 2) halo(true);
      for (let i = 0; i < level; i++) shard(i, true);
      artSparkle(ctx, -d.w * 0.55, y - d.hh * 0.72, 0.034, '#ffffff', 0.5 + pulse * 0.5);
      if (on) {
        const far = d.w + 0.12 + (level >= 1 ? 0.15 : 0);
        artSparkle(ctx, a.fx * far, y + a.fy * far, 0.07, '#ffffff', 0.9);
      }
    },
  };
})();
