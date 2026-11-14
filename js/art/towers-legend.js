'use strict';
/* 전설 등급 탑 — 용의 탑, 천둥신전, 중력탑, 황금 금고, 사령탑, 천문대, 시계탑, 처형탑, 마법사의 탑.
   무기의 회전축은 (0, -TOWERS[type].levels[level].h). */
(function () {
  const S = ART.stone;
  const W = ART.wood;
  const D = ART.darkwood;
  const I = ART.iron;
  const G = ART.gold;
  const R = ART.red;
  const BL = ART.blue;
  const P = ART.purple;
  const ST = ART.steel;
  const BONE = ART.bone;
  const K = ART.K;
  const H = (type, level) => TOWERS[type].levels[level].h;

  /* ───── 중력탑: 세 갈퀴가 떠받친 검은 구슬이 적을 끌어당긴다 ───── */
  const OBS = ['#6b6485', '#413a58', '#28233a'];
  const GRAV = [-0.2, -0.3, -0.4];
  TOWER_ART.gravity = {
    body(ctx, level) {
      const top = GRAV[level];
      const h = H('gravity', level);
      KIT.round(ctx, {
        tones: OBS, top, rTop: 0.28, rBot: 0.35, plinth: OBS, plinthTop: '#4c4466',
        hoops: [[top + 0.07, level === 2 ? G[1] : P[1], 0.03]],
        door: [P[0], P[1], P[2]], lit: '#cba6ff',
      });
      /* 윗면의 마법진 */
      for (const r of [0.22, 0.13]) {
        ctx.beginPath();
        ctx.ellipse(0, top, r, r * K, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(203,166,255,.9)';
        ctx.lineWidth = 0.014;
        ctx.stroke();
      }
      /* 뒤쪽 갈퀴 */
      const claw = (x0, cx, x1, tone) => {
        const pts = artCurve(x0, top - 0.02, cx, (top - h) / 2 - 0.04, x1, -h - 0.05, 12);
        artStroke(ctx, tone, pts, 0.05);
        artPoly(ctx, level === 2 ? G[1] : P[0], [x1 - 0.03, -h - 0.04, x1 + (x1 < 0 ? 0.05 : -0.05), -h - 0.13, x1 + 0.03, -h - 0.04], ART.LW * 0.7);
      };
      claw(0, 0.02, 0, OBS[2]);
      claw(-0.24, -0.44, -0.2 - level * 0.02, OBS[0]);
      claw(0.24, 0.44, 0.2 + level * 0.02, OBS[1]);
      if (level >= 1) {
        /* 몸통에 번진 보랏빛 금 */
        for (const [x, dx] of [[-0.17, -0.03], [0.05, 0.03], [0.2, -0.02]]) {
          const y = top + Math.sqrt(Math.max(0, 1 - (x / 0.28) ** 2)) * 0.28 * K + 0.04;
          const pts = [x, y, x + dx, y + 0.07, x - dx * 0.6, y + 0.13, x + dx * 0.5, y + 0.2];
          artLine(ctx, ART.OUT, pts, 0.034);
          artLine(ctx, '#cba6ff', pts, 0.014);
        }
      }
      if (level === 2) {
        /* 양옆의 새김 기둥 */
        for (const sgn of [-1, 1]) {
          const x = sgn * 0.39;
          artBox(ctx, OBS, x, 0.12, 0.4, 0.045, 0.06, { top: false });
          artPoly(ctx, G[1], [x, 0.03, x - 0.05, 0.12, x, 0.12 + 0.045 * K, x + 0.05, 0.12]);
          artLine(ctx, '#cba6ff', [x - 0.025, 0.2, x - 0.025, 0.3], 0.014);
        }
      } else {
        /* 발치의 수정 */
        for (const [x, y, hh] of [[-0.37, 0.4, 0.13], [0.37, 0.41, 0.1]]) {
          artPoly(ctx, P[1], [x - 0.035, y, x - 0.01, y - hh, x + 0.035, y]);
          artPoly(ctx, P[0], [x - 0.035, y, x - 0.01, y - hh, x - 0.008, y], 0);
        }
      }
    },
    top(ctx, level, aim, o) {
      const h = H('gravity', level);
      const t = o.t;
      const s = 0.13 + level * 0.025;
      const y = -h + Math.sin(t * 1.8) * 0.015;
      const pull = o.recoil;
      artGlow(ctx, 0, y, s * 3.4 + pull * 0.3, '154,107,234', 0.45 + pull * 0.3);
      /* 빨려드는 돌조각 */
      for (let i = 0; i < 4 + level * 2; i++) {
        const k = (t * (0.35 + pull * 1.5) + i * 0.21) % 1;
        const q = i * 2.3 + t * 0.6;
        const r = (1 - k) * (0.42 + level * 0.05);
        ctx.globalAlpha = k * 0.9 + 0.1;
        artRect(ctx, i % 2 ? OBS[0] : P[1], Math.cos(q) * r - 0.014, y + Math.sin(q) * r * 0.5 - 0.014, 0.028, 0.028, 0.005, ART.LW * 0.5);
      }
      ctx.globalAlpha = 1;
      /* 탑 둘레에 떠 있는 바위 (2단부터) */
      for (let i = 0; i < level * 2; i++) {
        const sgn = i % 2 ? 1 : -1;
        const x = sgn * (0.38 + (i > 1 ? 0.05 : 0));
        const yy = GRAV[level] + 0.02 - (i > 1 ? 0.24 : 0) + Math.sin(t * 1.5 + i * 1.9) * 0.03;
        const r = i > 1 ? 0.045 : 0.06;
        artPoly(ctx, OBS[1], [x - r, yy, x - r * 0.3, yy - r * 0.9, x + r * 0.8, yy - r * 0.5, x + r, yy + r * 0.4, x - r * 0.2, yy + r * 0.8]);
        artPoly(ctx, OBS[0], [x - r, yy, x - r * 0.3, yy - r * 0.9, x + r * 0.1, yy - r * 0.1], 0);
      }
      /* 뒤쪽 고리 → 구슬 → 앞쪽 고리 */
      const ring = (front, tilt, k) => {
        ctx.beginPath();
        ctx.ellipse(0, y, s * 1.9 * (k || 1), s * 0.55 * (k || 1), tilt == null ? 0.3 : tilt, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
        ctx.strokeStyle = ART.OUT;
        ctx.lineWidth = 0.045;
        ctx.stroke();
        ctx.strokeStyle = front ? '#e6d4ff' : P[1];
        ctx.lineWidth = 0.022;
        ctx.setLineDash([0.07, 0.04]);
        ctx.lineDashOffset = -t * 0.5;
        ctx.stroke();
        ctx.setLineDash([]);
      };
      if (level === 2) ring(false, -0.5, 1.25);
      ring(false);
      artCircle(ctx, '#17121f', 0, y, s);
      artCircle(ctx, '#3a2a55', -s * 0.25, y - s * 0.25, s * 0.5, 0);
      artCircle(ctx, '#cba6ff', -s * 0.4, y - s * 0.4, s * 0.16, 0);
      ring(true);
      if (level === 2) ring(true, -0.5, 1.25);
    },
  };

  /* ───── 황금 금고: 골드를 벌고 이자를 붙여 준다 ───── */
  const VAULT = [-0.26, -0.34, -0.42];
  TOWER_ART.vault = {
    body(ctx, level) {
      const top = VAULT[level];
      const rAt = KIT.round(ctx, {
        tones: ART.sand, top, rTop: 0.3, rBot: 0.36, rows: 2 + level, rgb: '90,70,40', plinth: S, plinthTop: G[1],
        hoops: [[top + 0.07, level === 0 ? I[1] : G[1], 0.045], [0.1, level === 0 ? I[1] : G[1], 0.045]],
        door: false,
      });
      /* 둥근 금고문: 손잡이 바퀴 */
      const dt = level === 0 ? [ST[0], ST[1], ST[2]] : G;
      artCircle(ctx, dt[2], 0, 0.2, 0.15);
      artCircle(ctx, dt[1], 0, 0.2, 0.125, ART.LW * 0.7);
      artCircle(ctx, dt[0], -0.03, 0.17, 0.07, 0);
      for (let i = 0; i < 4; i++) {
        const q = (i * Math.PI) / 4;
        artLine(ctx, I[2], [Math.cos(q) * -0.09, 0.2 + Math.sin(q) * -0.09, Math.cos(q) * 0.09, 0.2 + Math.sin(q) * 0.09], 0.02);
      }
      artCircle(ctx, I[1], 0, 0.2, 0.035, ART.LW * 0.7);
      for (let i = 0; i < 8; i++) {
        const q = (i * Math.PI) / 4 + 0.39;
        artCircle(ctx, '#fff6cf', Math.cos(q) * 0.138, 0.2 + Math.sin(q) * 0.138, 0.01, 0);
      }
      /* 지붕: 금빛 둥근 지붕 */
      if (level === 0) {
        /* 쇠 뚜껑 */
        artCylinder(ctx, [I[0], I[1], I[2]], 0, top - 0.04, top + 0.03, rAt(top) + 0.04, rAt(top), { topFill: I[0] });
        artCylinder(ctx, [ST[0], ST[1], ST[2]], 0, top - 0.09, top - 0.04, 0.16, 0.18, { topFill: ST[0] });
      } else {
        artCylinder(ctx, [G[0], G[1], G[2]], 0, top - 0.04, top + 0.03, rAt(top) + 0.04, rAt(top), { topFill: G[2] });
        artDome(ctx, G, 0, top - 0.04, 0.27, 0.14 + level * 0.04);
        if (level === 2) {
          /* 지붕을 두른 보석 */
          for (const [x, c] of [[-0.17, R[1]], [0, BL[1]], [0.17, R[1]]]) {
            artPoly(ctx, c, [x, top - 0.04, x + 0.03, top + 0.01 + (x ? 0 : 0.035), x, top + 0.06 + (x ? 0 : 0.035), x - 0.03, top + 0.01 + (x ? 0 : 0.035)], ART.LW * 0.7);
          }
        }
      }
      /* 금화 더미와 보물 상자 */
      const stack = (x, y, n) => {
        for (let i = 0; i < n; i++) artEllipse(ctx, i % 2 ? G[1] : G[0], x, y - i * 0.022, 0.04, 0.016, ART.LW * 0.6);
      };
      stack(-0.37, 0.43, level === 2 ? 11 : 3 + level);
      stack(-0.28, 0.45, level === 2 ? 6 : 2 + level);
      if (level >= 1) stack(0.37, 0.44, level === 2 ? 9 : 4);
      if (level === 2) {
        artRect(ctx, D[1], 0.22, 0.36, 0.13, 0.09, 0.01);
        artRect(ctx, G[1], 0.22, 0.385, 0.13, 0.02, 0, ART.LW * 0.5);
        artEllipse(ctx, G[0], 0.285, 0.36, 0.055, 0.02, ART.LW * 0.6);
      }
    },
    top(ctx, level, aim, o) {
      const h = H('vault', level);
      const t = o.t;
      const s = 0.09 + level * 0.015;
      const y = -h - 0.05 + Math.sin(t * 2.2) * 0.015 - o.flash * 0.06;
      artGlow(ctx, 0, y, 0.26 + o.flash * 0.2, '255,226,126', 0.4 + o.flash * 0.4);
      /* 빙글빙글 도는 금화 */
      const w = Math.abs(Math.cos(t * 2.4));
      artEllipse(ctx, G[2], 0, y, s * Math.max(0.16, w) + 0.012, s + 0.012);
      artEllipse(ctx, w > 0.3 ? G[0] : G[1], 0, y, s * Math.max(0.12, w), s, ART.LW * 0.6);
      if (w > 0.5) artLine(ctx, G[2], [0, y - s * 0.5, 0, y + s * 0.5], 0.02 * w);
      artSparkle(ctx, 0.14, y - 0.1, 0.035, '#ffffff', 0.5 + 0.5 * Math.sin(t * 5));
      artSparkle(ctx, -0.16, y + 0.06, 0.028, '#fff6cf', 0.5 + 0.5 * Math.sin(t * 4 + 2));
      if (level === 2) {
        /* 왕관 */
        const cy = y - s - 0.1;
        artPoly(ctx, G[1], [-0.07, cy + 0.05, -0.085, cy - 0.03, -0.04, cy + 0.005, 0, cy - 0.05, 0.04, cy + 0.005, 0.085, cy - 0.03, 0.07, cy + 0.05]);
        artCircle(ctx, R[1], 0, cy + 0.02, 0.014, 0);
      }
    },
  };

  /* ───── 사령탑: 높이 올린 깃발 아래 곁의 탑들이 더 세게 싸운다 ───── */
  const CIT = [-0.66, -0.86, -1.06];
  TOWER_ART.citadel = {
    body(ctx, level) {
      const top = CIT[level];
      const wAt = KIT.square(ctx, { tones: S, top, wTop: 0.27, wBot: 0.36, rows: 4 + level * 2, door: D, trim: level === 2 ? G[1] : null });
      /* 붉은 걸개 두 폭 */
      const hang = (side, tones) => {
        const y = top + 0.2;
        const w = wAt(y);
        const x0 = side * w * 0.25;
        const x1 = side * w * 0.75;
        const ya = y + w * K * 0.75;
        const yb = y + w * K * 0.25;
        const len = 0.3 + level * 0.07;
        const pts = side < 0 ? [x1, yb, x0, ya, x0, ya + len, (x0 + x1) / 2, (ya + yb) / 2 + len - 0.06, x1, yb + len] : [x0, ya, x1, yb, x1, yb + len, (x0 + x1) / 2, (ya + yb) / 2 + len - 0.06, x0, ya + len];
        artPoly(ctx, tones, pts);
        artLine(ctx, G[1], [pts[0], pts[1] + 0.03, pts[2], pts[3] + 0.03], 0.022);
        KIT.sign.star(ctx, (x0 + x1) / 2, (ya + yb) / 2 + len * 0.45, 0.04, G[0]);
      };
      hang(-1, R[1]);
      hang(1, R[2]);
      /* 성가퀴 */
      for (const f of [-1, -0.5, 0, 0.5, 1]) {
        const x = f * 0.29;
        const y = top + (1 - Math.abs(f)) * 0.29 * K;
        artRect(ctx, f < 0 ? S[0] : f > 0 ? S[2] : S[1], x - 0.05, y - 0.1, 0.1, 0.12, 0.01);
      }
      artLantern(ctx, -0.36, 0.14, 0.85);
      artLantern(ctx, 0.36, 0.14, 0.85);
      if (level >= 1) {
        artShield(ctx, 0.14, 0.02, 0.05, BL, G[1]);
      }
    },
    top(ctx, level, aim, o) {
      const top = CIT[level];
      const t = o.t;
      /* 깃대와 큰 깃발 */
      const tip = top - 0.5 - level * 0.03;
      artLine(ctx, ART.OUT, [0, top - 0.04, 0, tip], 0.036);
      artLine(ctx, level === 2 ? G[1] : W[0], [0, top - 0.04, 0, tip], 0.018);
      const wv = (f) => Math.sin(t * 4 - f * 4) * 0.03 * f;
      const len = 0.36 + level * 0.04;
      ctx.beginPath();
      ctx.moveTo(0, tip + 0.02);
      for (let i = 1; i <= 6; i++) ctx.lineTo((i / 6) * len, tip + 0.02 + wv(i / 6));
      ctx.lineTo(len - 0.08, tip + 0.12 + wv(0.8));
      ctx.lineTo(len, tip + 0.22 + wv(1));
      for (let i = 5; i >= 0; i--) ctx.lineTo((i / 6) * len, tip + 0.22 + wv(i / 6));
      ctx.closePath();
      artFill(ctx, level === 2 ? G[1] : R[1]);
      KIT.sign.star(ctx, len * 0.42, tip + 0.12 + wv(0.42), 0.05, level === 2 ? R[1] : G[0]);
      artCircle(ctx, G[0], 0, tip - 0.01, 0.03, ART.LW * 0.8);
      if (level >= 1) {
        /* 곁깃발 */
        for (const sgn of [-1, 1]) {
          artLine(ctx, ART.OUT, [sgn * 0.26, top - 0.06, sgn * 0.26, top - 0.3], 0.026);
          artFlag(ctx, sgn < 0 ? BL : R, sgn * 0.26, top - 0.3, sgn * 0.16, 0.1, t + sgn);
        }
      }
    },
  };

  /* ───── 시계탑: 주변의 시간을 늦추고, 때맞춰 시간을 멈춘다 ───── */
  const SLATE = ['#dfe6f2', '#aab6cc', '#77839c'];
  const CLOCK = [-0.82, -1.0, -1.2];
  function gear(ctx, x, y, r, tones) {
    for (let i = 0; i < 8; i++) {
      const q = (i * Math.PI) / 4;
      artRect(ctx, tones[1], x + Math.cos(q) * r - 0.02, y + Math.sin(q) * r - 0.02, 0.04, 0.04, 0.006, ART.LW * 0.8);
    }
    artCircle(ctx, tones[1], x, y, r);
    artCircle(ctx, tones[2], x, y, r * 0.4, ART.LW * 0.7);
  }
  TOWER_ART.clock = {
    body(ctx, level) {
      const top = CLOCK[level];
      const h = H('clock', level);
      const rAt = KIT.round(ctx, {
        tones: SLATE, top, rTop: 0.2, rBot: 0.31, rows: 5 + level * 2, rgb: '50,60,90',
        hoops: [[top + 0.1, level === 2 ? G[1] : BL[1], 0.035], [-h + 0.24 + level * 0.02, level === 2 ? G[1] : BL[1], 0.035]],
        door: BL, lit: '#ffe9a8',
      });
      /* 창 */
      for (const y of level === 0 ? [-0.1] : level === 1 ? [-0.24, -0.02] : [-0.4, -0.2, 0.0]) {
        artRect(ctx, ART.OUT, -0.03, y + rAt(y) * K - 0.06, 0.06, 0.12, 0.03, 0);
        artRect(ctx, '#ffe9a8', -0.017, y + rAt(y) * K - 0.045, 0.034, 0.09, 0.017, 0);
      }
      if (level >= 1) {
        /* 시계 밑의 난간 두른 마루 */
        const gy = -h + 0.3 + level * 0.02;
        const gr = rAt(gy) + 0.085;
        artCylinder(ctx, W, 0, gy, gy + 0.05, gr, gr - 0.03, { topFill: W[0] });
        for (let k = -2; k <= 2; k++) {
          const a = Math.PI / 2 + k * 0.6;
          artStroke(ctx, level === 2 ? G[1] : D[0], [Math.cos(a) * gr, gy + Math.sin(a) * gr * K, Math.cos(a) * gr, gy + Math.sin(a) * gr * K - 0.08], 0.024);
        }
        artHoop(ctx, 0, gy - 0.08, gr, level === 2 ? G[0] : W[1], 0.024, true);
        /* 발치의 톱니바퀴 */
        gear(ctx, 0.38, 0.38, 0.075, level === 2 ? G : [I[0], I[1], I[2]]);
        if (level === 2) gear(ctx, -0.39, 0.39, 0.06, G);
      }
      /* 시계판 */
      const r = 0.14 + level * 0.015;
      artCircle(ctx, level === 2 ? G[2] : BL[2], 0, -h, r + 0.03);
      artCircle(ctx, level === 2 ? G[1] : BL[1], 0, -h, r + 0.012, ART.LW * 0.7);
      artCircle(ctx, '#fffaf0', 0, -h, r - 0.012, ART.LW * 0.7);
      for (let i = 0; i < 12; i++) {
        const q = (i * Math.PI) / 6;
        const r0 = r * (i % 3 ? 0.72 : 0.62);
        artLine(ctx, ART.OUT, [Math.cos(q) * r0, -h + Math.sin(q) * r0, Math.cos(q) * (r - 0.03), -h + Math.sin(q) * (r - 0.03)], i % 3 ? 0.01 : 0.018);
      }
      /* 뾰족지붕 */
      artCylinder(ctx, SLATE, 0, top - 0.03, top + 0.04, rAt(top) + 0.045, rAt(top), { topFill: SLATE[2] });
      artCone(ctx, level === 2 ? [BL[0], BL[1], BL[2]] : ['#7d8bb0', '#4d5a80', '#313a58'], 0, top - 0.3, top - 0.03, rAt(top) + 0.05);
      KIT.finial(ctx, 0, top - 0.3, G[1], 0.05);
      if (level === 2) {
        /* 지붕 둘레의 작은 첨탑 */
        for (const sgn of [-1, 1]) {
          const x = sgn * (rAt(top) + 0.06);
          artCylinder(ctx, SLATE, x, top - 0.06, top + 0.05, 0.04, 0.04, { topFill: SLATE[2] });
          artCone(ctx, [BL[0], BL[1], BL[2]], x, top - 0.2, top - 0.05, 0.055);
          artCircle(ctx, G[0], x, top - 0.21, 0.018, ART.LW * 0.7);
        }
      }
      artLantern(ctx, -0.2, 0.2, 0.85);
      artLantern(ctx, 0.2, 0.2, 0.85);
    },
    top(ctx, level, aim, o) {
      const h = H('clock', level);
      const t = o.t;
      const r = 0.14 + level * 0.015;
      const fast = o.recoil > 0 ? 14 : 1;
      /* 시간이 멈출 때 시계판이 빛난다 */
      if (o.recoil > 0) artGlow(ctx, 0, -h, r * 3, '111,159,242', o.recoil * 0.8);
      const hand = (q, len, w) => {
        artLine(ctx, ART.OUT, [0, -h, Math.cos(q) * len, -h + Math.sin(q) * len], w);
      };
      hand(t * 0.15 * fast - 1.2, r * 0.5, 0.028);
      hand(t * 0.9 * fast, r * 0.78, 0.018);
      artCircle(ctx, G[1], 0, -h, 0.022, ART.LW * 0.6);
      /* 흔들리는 추 */
      const sw = Math.sin(t * 2.6) * 0.35;
      const py = -h + r + 0.05;
      artLine(ctx, ART.OUT, [0, py, Math.sin(sw) * 0.13, py + Math.cos(sw) * 0.13], 0.016);
      artCircle(ctx, G[1], Math.sin(sw) * 0.13, py + Math.cos(sw) * 0.13, 0.03, ART.LW * 0.7);
    },
  };

})();
