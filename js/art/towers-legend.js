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

  /* ───── 용의 탑: 탑 꼭대기에 깃든 용이 넓은 불길을 내뿜는다 ───── */
  const SCALE = ['#ff8a6b', '#d9412f', '#96231c'];
  const LAIR = ['#b9a6a6', '#8a7474', '#5d4a4c'];
  const DRAGON = [-0.44, -0.6, -0.76];
  TOWER_ART.dragon = {
    body(ctx, level) {
      const top = DRAGON[level];
      const rAt = KIT.round(ctx, {
        tones: LAIR, top, rTop: 0.24, rBot: 0.33, rows: 3 + level, plinth: LAIR,
        hoops: level >= 1 ? [[top + 0.12, level === 2 ? G[1] : R[1], 0.04]] : [],
        door: [R[0], R[1], R[2]], lit: '#ff9226',
      });
      if (level === 2) KIT.banner(ctx, 0, top + 0.22, 0.085, 0.3, R, (c, x, y) => KIT.sign.flame(c, x, y, 0.045));
      /* 그을린 창 */
      for (const x of [-0.14, 0.14]) {
        const y = top + 0.32 + (level === 2 ? 0.36 : 0);
        artRect(ctx, ART.OUT, x - 0.03, y, 0.06, 0.12, 0.03, 0);
        artRect(ctx, '#ff9226', x - 0.017, y + 0.015, 0.034, 0.09, 0.017, 0);
      }
      KIT.crenel(ctx, LAIR, top, rAt(top) + 0.04, true);
      artCylinder(ctx, LAIR, 0, top - 0.02, top + 0.05, rAt(top) + 0.045, rAt(top), { topFill: '#4a3a3c' });
      /* 뼈와 금화 */
      artStroke(ctx, BONE[0], [-0.42, 0.4, -0.3, 0.44], 0.03);
      KIT.sign.skull(ctx, -0.3, 0.38, 0.035);
      KIT.sign.coin(ctx, 0.34, 0.42, 0.03);
      KIT.sign.coin(ctx, 0.39, 0.39, 0.03);
      /* 탑을 감은 꼬리 */
      if (level >= 1) {
        const y = top + 0.26;
        artHoop(ctx, 0, y, rAt(y) + 0.02, SCALE[1], 0.07, true);
        artPoly(ctx, SCALE[2], [rAt(y) + 0.01, y - 0.02, rAt(y) + 0.14, y - 0.12, rAt(y) + 0.05, y + 0.03]);
      }
    },
    top(ctx, level, aim, o) {
      const h = H('dragon', level);
      const top = DRAGON[level];
      const t = o.t;
      const s = 1 + level * 0.14;
      const a = artAim(aim);
      const firing = o.recoil > 0.25;
      const Q = (u, v, up) => [a.fx * u + a.sx * v, -h + a.fy * u + a.sy * v - (up || 0)];
      /* 날개: 뒤에서 천천히 퍼덕인다 */
      const flap = Math.sin(t * 2.4) * 0.05 + (firing ? 0.06 : 0);
      for (const sgn of [-1, 1]) {
        const k = 0.3 + level * 0.07;
        const rx = sgn * 0.06;
        const ry = top - 0.1;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.quadraticCurveTo(rx + sgn * k * 0.5, ry - 0.34 - flap, rx + sgn * k * 1.35, ry - 0.3 - flap);
        ctx.quadraticCurveTo(rx + sgn * k * 1.25, ry - 0.14, rx + sgn * k * 1.1, ry - 0.02);
        ctx.quadraticCurveTo(rx + sgn * k * 0.95, ry - 0.1, rx + sgn * k * 0.75, ry + 0.04);
        ctx.quadraticCurveTo(rx + sgn * k * 0.55, ry - 0.06, rx + sgn * k * 0.36, ry + 0.07);
        ctx.closePath();
        artFill(ctx, sgn < 0 ? SCALE[1] : SCALE[2]);
        artLine(ctx, SCALE[0], [rx, ry, rx + sgn * k * 1.1, ry - 0.02], 0.012);
        artLine(ctx, SCALE[0], [rx, ry, rx + sgn * k * 0.75, ry + 0.04], 0.012);
      }
      /* 웅크린 몸통 */
      artEllipse(ctx, artRound(ctx, SCALE, 0, 0.2), 0, top - 0.06, 0.2 * s, 0.13 * s);
      artEllipse(ctx, '#ffd9a8', 0.0, top - 0.02, 0.11 * s, 0.07 * s, 0);
      const fire = () => {
        const m = Q(0.42 * s, 0, -0.03);
        if (!firing) {
          KIT.fire(ctx, m[0], m[1] + 0.02, 0.03, 0.09, t);
          return;
        }
        const len = 0.56 * s * (0.9 + 0.1 * Math.sin(t * 40));
        const sw = 0.2 * s;
        const q = (u, v) => [m[0] + a.fx * u + a.sx * v, m[1] + a.fy * u + a.sy * v];
        artGlow(ctx, m[0] + a.fx * len * 0.5, m[1] + a.fy * len * 0.5, len, '255,140,40', 0.45);
        artPoly(ctx, 'rgba(255,110,30,.9)', [...q(-0.02, 0), ...q(len * 0.5, sw), ...q(len, 0), ...q(len * 0.5, -sw)], 0);
        artPoly(ctx, '#ffd23c', [...q(-0.02, 0), ...q(len * 0.4, sw * 0.55), ...q(len * 0.8, 0), ...q(len * 0.4, -sw * 0.55)], 0);
        artPoly(ctx, '#fff6cf', [...q(-0.02, 0), ...q(len * 0.25, sw * 0.25), ...q(len * 0.5, 0), ...q(len * 0.25, -sw * 0.25)], 0);
      };
      const neck = () => {
        const b = Q(0.06 * s, 0);
        artStroke(ctx, SCALE[1], artCurve(0, top - 0.1, -a.fx * 0.1, (top - h) / 2 - 0.12, b[0], b[1], 10), 0.11 * s);
        artLine(ctx, '#ffd9a8', artCurve(0.02, top - 0.08, -a.fx * 0.08 + 0.03, (top - h) / 2 - 0.1, b[0] + 0.02, b[1] + 0.03, 10), 0.03 * s);
      };
      const head = () => {
        const b = Q(0.04 * s, 0);
        const tip = Q(0.4 * s, 0, firing ? 0.015 : 0);
        const j0 = Q(0.1 * s, 0, -0.05 * s);
        const j1 = Q(0.36 * s, 0, -(0.06 + (firing ? 0.06 : 0.02)) * s);
        artTube(ctx, [SCALE[1], SCALE[2], SCALE[2]], j0[0], j0[1], j1[0], j1[1], 0.05 * s, 0.03 * s, 0.5, 0.7);
        const tube = artTube(ctx, SCALE, b[0], b[1], tip[0], tip[1], 0.11 * s, 0.07 * s, 0.85, 0.6);
        if (Math.abs(a.fx) > 0.4) {
          for (const f of [0.55, 0.75, 0.92]) {
            const r = (0.11 + (0.07 - 0.11) * f) * s * 0.92;
            const x = b[0] + (tip[0] - b[0]) * f - tube.nx * r;
            const y = b[1] + (tip[1] - b[1]) * f - tube.ny * r;
            artPoly(ctx, BONE[0], [x - tube.ux * 0.02, y - tube.uy * 0.02, x + tube.ux * 0.02, y + tube.uy * 0.02, x - tube.nx * 0.045, y - tube.ny * 0.045 + 0.01], ART.LW * 0.6);
          }
        }
        for (const sgn of [-1, 1]) {
          const hb = Q(0.05 * s, sgn * 0.065 * s, 0.07 * s);
          const mid = Q(-0.03 * s, sgn * 0.09 * s, 0.16 * s);
          const ht = Q(-0.15 * s, sgn * 0.1 * s, 0.14 * s);
          artPoly(ctx, sgn < 0 ? BONE[0] : BONE[1], [hb[0] - 0.036, hb[1] + 0.012, mid[0] - 0.012, mid[1] - 0.012, ht[0], ht[1], mid[0] + 0.02, mid[1] + 0.028, hb[0] + 0.036, hb[1] + 0.012], ART.LW * 0.8);
          if (a.toward >= -0.2) {
            const e = Q(0.17 * s, sgn * 0.07 * s, 0.05 * s);
            artCircle(ctx, ART.OUT, e[0], e[1], 0.032 * s, 0);
            artCircle(ctx, firing ? '#fff6cf' : '#ffd23c', e[0], e[1], 0.021 * s, 0);
            artCircle(ctx, ART.OUT, e[0] + a.fx * 0.004, e[1], 0.008 * s, 0);
          }
        }
      };
      if (a.toward < -0.2) { fire(); head(); neck(); } else { neck(); head(); fire(); }
    },
    front(ctx, level) {
      const top = DRAGON[level];
      KIT.crenel(ctx, LAIR, top, 0.24 + 0.04, false);
    },
  };

  /* ───── 천둥신전: 기둥을 두른 신전 위의 먹구름이 벼락을 떨군다 ───── */
  const MARBLE = ['#ffffff', '#ece6da', '#c2b9a8'];
  const TEMPLE = [-0.36, -0.5, -0.62];
  function columns(ctx, y0, y1, r, back) {
    for (let k = -2; k <= 2; k++) {
      const a = (back ? -Math.PI / 2 : Math.PI / 2) + k * 0.62;
      const x = Math.cos(a) * r;
      const dy = Math.sin(a) * r * K;
      artCylinder(ctx, back ? [MARBLE[1], MARBLE[2], MARBLE[2]] : MARBLE, x, y0 + dy, y1 + dy, 0.036, 0.042, { top: false });
      if (!back) {
        artLine(ctx, 'rgba(120,105,80,.3)', [x - 0.012, y0 + dy + 0.02, x - 0.014, y1 + dy - 0.02], 0.01);
        artRect(ctx, MARBLE[0], x - 0.055, y1 + dy - 0.012, 0.11, 0.03, 0.006, ART.LW * 0.6);
      }
    }
  }
  TOWER_ART.storm = {
    body(ctx, level) {
      const top = TEMPLE[level];
      artPlinth(ctx, MARBLE, '#fff6cf');
      artCylinder(ctx, MARBLE, 0, 0.12, 0.2, 0.34, 0.37, { topFill: '#f3ead6' });
      columns(ctx, top, 0.12, 0.29, true);
      /* 한가운데의 제단 */
      artCylinder(ctx, [G[0], G[1], G[2]], 0, 0.02, 0.12, 0.09, 0.11, { topFill: G[0] });
      KIT.sign.bolt(ctx, 0, -0.05, 0.05, '#cba6ff');
    },
    top(ctx, level, aim, o) {
      const h = H('storm', level);
      const t = o.t;
      const s = 1 + level * 0.2;
      const y = -h + Math.sin(t * 1.4) * 0.02;
      /* 먹구름: 벼락을 떨굴 때 번쩍인다 */
      const flash = o.flash;
      artGlow(ctx, 0, y, 0.4 * s, '203,166,255', 0.2 + flash * 0.5);
      const tone = flash > 0.4 ? '#e6d4ff' : '#6b6478';
      for (const [dx, dy, r] of [[-0.19, 0.03, 0.11], [0.2, 0.04, 0.1], [-0.07, -0.04, 0.14], [0.09, -0.05, 0.13], [0, 0.05, 0.13]]) {
        artCircle(ctx, tone, dx * s, y + dy * s, r * s);
      }
      for (const [dx, dy, r] of [[-0.19, 0.03, 0.11], [0.2, 0.04, 0.1], [-0.07, -0.04, 0.14], [0.09, -0.05, 0.13], [0, 0.05, 0.13]]) {
        artCircle(ctx, tone, dx * s, y + dy * s, r * s - 0.02, 0);
      }
      artEllipse(ctx, flash > 0.4 ? '#ffffff' : '#8d869c', -0.06 * s, y - 0.07 * s, 0.1 * s, 0.05 * s, 0);
      if (flash > 0.25) {
        /* 구름에서 제단으로 내리치는 번개 */
        const pts = [0, y + 0.12 * s];
        for (let i = 1; i <= 4; i++) pts.push(Math.sin(t * 50 + i * 2) * 0.07, y + 0.12 * s + (i / 4) * (0.02 - y - 0.12 * s));
        artLine(ctx, 'rgba(203,166,255,' + flash + ')', pts, 0.05);
        artLine(ctx, 'rgba(255,255,255,' + flash + ')', pts, 0.018);
      }
    },
    front(ctx, level) {
      const top = TEMPLE[level];
      columns(ctx, top, 0.12, 0.29, false);
      /* 기둥이 받친 지붕 */
      artCylinder(ctx, MARBLE, 0, top - 0.08, top, 0.36, 0.33, { topFill: '#f3ead6' });
      artHoop(ctx, 0, top - 0.035, 0.345, level >= 1 ? G[1] : BL[1], 0.03, true);
      if (level === 2) {
        artDome(ctx, BL, 0, top - 0.08, 0.26, 0.17);
        artHoop(ctx, 0, top - 0.08, 0.265, G[1], 0.024, true);
      }
      /* 피뢰침 */
      const tip = top - (level === 2 ? 0.34 : 0.2);
      artLine(ctx, ART.OUT, [0, top - 0.08, 0, tip], 0.03);
      artLine(ctx, G[1], [0, top - 0.08, 0, tip], 0.014);
      artCircle(ctx, G[0], 0, tip, 0.022, ART.LW * 0.7);
    },
  };

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
      /* 발치의 수정 */
      for (const [x, y, hh] of [[-0.37, 0.4, 0.13], [0.37, 0.41, 0.1]]) {
        artPoly(ctx, P[1], [x - 0.035, y, x - 0.01, y - hh, x + 0.035, y]);
        artPoly(ctx, P[0], [x - 0.035, y, x - 0.01, y - hh, x - 0.008, y], 0);
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
      /* 뒤쪽 고리 → 구슬 → 앞쪽 고리 */
      const ring = (front) => {
        ctx.beginPath();
        ctx.ellipse(0, y, s * 1.9, s * 0.55, 0.3, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
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
      ring(false);
      artCircle(ctx, '#17121f', 0, y, s);
      artCircle(ctx, '#3a2a55', -s * 0.25, y - s * 0.25, s * 0.5, 0);
      artCircle(ctx, '#cba6ff', -s * 0.4, y - s * 0.4, s * 0.16, 0);
      ring(true);
    },
  };

  /* ───── 황금 금고: 골드를 벌고 이자를 붙여 준다 ───── */
  const VAULT = [-0.26, -0.34, -0.42];
  TOWER_ART.vault = {
    body(ctx, level) {
      const top = VAULT[level];
      const rAt = KIT.round(ctx, {
        tones: ART.sand, top, rTop: 0.3, rBot: 0.36, rows: 2 + level, rgb: '90,70,40', plinth: S, plinthTop: G[1],
        hoops: [[top + 0.07, G[1], 0.045], [0.1, G[1], 0.045]],
        door: false,
      });
      /* 둥근 금고문: 손잡이 바퀴 */
      artCircle(ctx, G[2], 0, 0.2, 0.15);
      artCircle(ctx, G[1], 0, 0.2, 0.125, ART.LW * 0.7);
      artCircle(ctx, G[0], -0.03, 0.17, 0.07, 0);
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
      artCylinder(ctx, [G[0], G[1], G[2]], 0, top - 0.04, top + 0.03, rAt(top) + 0.04, rAt(top), { topFill: G[2] });
      artDome(ctx, G, 0, top - 0.04, 0.27, 0.14 + level * 0.03);
      /* 금화 더미와 보물 상자 */
      const stack = (x, y, n) => {
        for (let i = 0; i < n; i++) artEllipse(ctx, i % 2 ? G[1] : G[0], x, y - i * 0.022, 0.04, 0.016, ART.LW * 0.6);
      };
      stack(-0.37, 0.43, 3 + level);
      stack(-0.28, 0.45, 2 + level);
      if (level >= 1) stack(0.37, 0.44, 3 + level);
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

  /* ───── 천문대: 둥근 지붕 틈으로 내민 망원경으로 운석을 불러 떨군다 ───── */
  const COPPER = ['#8fe0c8', '#4ba88f', '#2c6f60'];
  const OBSV = [-0.4, -0.56, -0.74];
  TOWER_ART.observatory = {
    body(ctx, level) {
      const top = OBSV[level];
      const rAt = KIT.round(ctx, {
        tones: S, top, rTop: 0.25, rBot: 0.33, rows: 3 + level,
        hoops: level >= 1 ? [[top + 0.1, level === 2 ? G[1] : COPPER[1], 0.035]] : [],
        door: D,
      });
      /* 별자리 판과 창 */
      KIT.sign.star(ctx, -0.12, top + 0.3, 0.035, G[0]);
      KIT.sign.moon(ctx, 0.12, top + 0.34, 0.04, G[0]);
      if (level === 2) KIT.sign.star(ctx, 0.02, top + 0.52, 0.03, '#ffffff');
      /* 둥근 지붕과 그 틈 */
      const dome = level === 2 ? G : COPPER;
      artCylinder(ctx, [dome[0], dome[1], dome[2]], 0, top - 0.03, top + 0.04, rAt(top) + 0.03, rAt(top), { topFill: dome[2] });
      artDome(ctx, dome, 0, top - 0.03, 0.26, 0.24);
      ctx.beginPath();
      ctx.moveTo(-0.045, top - 0.01);
      ctx.quadraticCurveTo(-0.05, top - 0.24, 0, top - 0.33);
      ctx.quadraticCurveTo(0.05, top - 0.24, 0.045, top - 0.01);
      ctx.closePath();
      artFill(ctx, '#2a2540');
      /* 별 지도를 든 받침대 */
      artStroke(ctx, D[1], [0.34, 0.42, 0.34, 0.28], 0.03);
      artCircle(ctx, BL[2], 0.34, 0.24, 0.06);
      artCircle(ctx, '#ffffff', 0.325, 0.23, 0.01, 0);
      artCircle(ctx, '#ffffff', 0.355, 0.255, 0.008, 0);
    },
    top(ctx, level, aim, o) {
      const h = H('observatory', level);
      const t = o.t;
      const a = artAim(aim);
      const s = 1 + level * 0.12;
      /* 망원경: 겨눈 쪽 하늘을 향해 비스듬히 선다 */
      const bx = -a.fx * 0.04;
      const by = -h + 0.03;
      const tx = a.fx * 0.2 * s;
      const ty = -h - 0.26 * s + a.fy * 0.1 - o.recoil * 0.02;
      const brass = level === 2 ? [COPPER[0], COPPER[1], COPPER[2]] : [G[0], G[1], G[2]];
      const tube = artTube(ctx, brass, bx, by, tx, ty, 0.06 * s, 0.075 * s, 0.6, 0);
      artBand(ctx, I, bx + (tx - bx) * 0.35, by + (ty - by) * 0.35, tube, 0.066 * s, 0.03);
      artBand(ctx, I, tx - (tx - bx) * 0.06, ty - (ty - by) * 0.06, tube, 0.078 * s, 0.03);
      artEllipse(ctx, '#9cddf8', tx, ty, 0.065 * s, 0.04 * s, ART.LW * 0.8);
      artEllipse(ctx, '#ffffff', tx - 0.02, ty - 0.008, 0.025 * s, 0.012 * s, 0);
      if (o.flash > 0.1) {
        artGlow(ctx, tx, ty - 0.05, 0.3, '255,190,90', o.flash * 0.8);
        artSparkle(ctx, tx, ty - 0.06, 0.08 * o.flash + 0.02, '#fff6cf', 1);
      }
      if (level === 2) {
        /* 둘레를 도는 별 */
        for (let i = 0; i < 3; i++) {
          const q = t * 0.9 + (i * Math.PI * 2) / 3;
          KIT.sign.star(ctx, Math.cos(q) * 0.36, -h - 0.02 + Math.sin(q) * 0.08, 0.03, i ? G[0] : '#ffffff');
        }
      }
    },
  };

  /* ───── 시계탑: 주변의 시간을 늦추고, 때맞춰 시간을 멈춘다 ───── */
  const SLATE = ['#dfe6f2', '#aab6cc', '#77839c'];
  const CLOCK = [-0.82, -1.0, -1.2];
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

  /* ───── 처형탑: 큰 낫이 가장 센 적을 내리치고, 다 죽어 가는 적을 처형한다 ───── */
  const GLOOM = ['#77708a', '#4a445c', '#2c2838'];
  const REAP = [-0.56, -0.74, -0.92];
  TOWER_ART.reaper = {
    body(ctx, level) {
      const top = REAP[level];
      const rAt = KIT.round(ctx, {
        tones: GLOOM, top, rTop: 0.18, rBot: 0.31, rows: 4 + level, plinth: GLOOM,
        hoops: level >= 1 ? [[top + 0.12, level === 2 ? G[1] : I[1], 0.03]] : [],
        door: [GLOOM[0], '#2a2434', '#1a1622'], lit: '#9a6bea',
      });
      /* 해골 걸개 */
      KIT.banner(ctx, 0, top + 0.24, 0.08, 0.3 + level * 0.04, ['#4a3a66', '#342848', '#20182e'], (c, x, y) => KIT.sign.skull(c, x, y - 0.02, 0.04));
      /* 뾰족한 가시 테 */
      const lip = rAt(top) + 0.035;
      artCylinder(ctx, GLOOM, 0, top - 0.03, top + 0.04, lip, rAt(top), { topFill: GLOOM[2] });
      for (let k = -2; k <= 2; k++) {
        const a = Math.PI / 2 + k * 0.55;
        const x = Math.cos(a) * lip;
        const y = top - 0.03 + Math.sin(a) * lip * K;
        artPoly(ctx, k < 0 ? GLOOM[0] : GLOOM[1], [x - 0.03, y + 0.01, x + Math.cos(a) * 0.05, y - 0.13, x + 0.03, y + 0.01], ART.LW * 0.7);
      }
      /* 묘비와 등불 */
      artArch(ctx, S[1], -0.36, 0.44, 0.05, 0.14);
      artLine(ctx, S[2], [-0.36, 0.34, -0.36, 0.4], 0.014);
      artLine(ctx, S[2], [-0.38, 0.36, -0.34, 0.36], 0.014);
      artStroke(ctx, I[1], [0.36, 0.44, 0.36, 0.2], 0.026);
      artCircle(ctx, I[2], 0.36, 0.18, 0.04, ART.LW * 0.7);
      /* 낫을 받치는 기둥 */
      artStroke(ctx, GLOOM[2], [0, top - 0.02, 0, -H('reaper', level) + 0.03], 0.05);
    },
    top(ctx, level, aim, o) {
      const h = H('reaper', level);
      const t = o.t;
      const s = 1 + level * 0.14;
      const dir = Math.cos(aim) >= 0 ? 1 : -1;
      KIT.fire(ctx, 0.36, 0.17, 0.025, 0.08, t, ['#9a6bea', '#e6d4ff']);
      /* 낫: 쉴 때는 높이 들려 있고, 내리치는 순간 겨눈 쪽으로 휘둘린다 */
      const swing = -0.9 + o.recoil * 2.0;
      ctx.save();
      ctx.translate(0, -h);
      ctx.scale(dir, 1);
      ctx.rotate(swing);
      artStroke(ctx, D[1], [0, 0.16 * s, 0, -0.42 * s], 0.04);
      ctx.beginPath();
      ctx.moveTo(-0.02, -0.4 * s);
      ctx.quadraticCurveTo(0.26 * s, -0.56 * s, 0.44 * s, -0.24 * s);
      ctx.quadraticCurveTo(0.24 * s, -0.42 * s, -0.02, -0.3 * s);
      ctx.closePath();
      artFill(ctx, level === 2 ? G[0] : ST[0]);
      ctx.beginPath();
      ctx.moveTo(0.0, -0.33 * s);
      ctx.quadraticCurveTo(0.24 * s, -0.44 * s, 0.42 * s, -0.25 * s);
      ctx.strokeStyle = level === 2 ? G[2] : ST[2];
      ctx.lineWidth = 0.018;
      ctx.stroke();
      artCircle(ctx, level === 2 ? G[1] : I[1], 0, -0.36 * s, 0.035, ART.LW * 0.8);
      ctx.restore();
      if (o.recoil > 0.3) artGlow(ctx, dir * 0.3, -h - 0.1, 0.36, '154,107,234', o.recoil * 0.6);
    },
  };

  /* ───── 마법사의 탑: 지붕 둘레를 도는 마법 구슬들이 적을 쫓아가 터진다 ───── */
  const ARCANE = ['#b9a8e6', '#7a68b8', '#4b3d80'];
  const HAT = ['#6f8fe6', '#3f5cb8', '#27397a'];
  const WIZ = [-0.5, -0.66, -0.84];
  TOWER_ART.wizard = {
    body(ctx, level) {
      const top = WIZ[level];
      const rAt = KIT.round(ctx, {
        tones: ARCANE, top, rTop: 0.19, rBot: 0.31, rows: 4 + level, rgb: '40,30,80',
        hoops: [[top + 0.1, G[1], 0.03]],
        door: [P[0], P[1], P[2]], lit: '#ffe9a8',
      });
      /* 빛나는 둥근 창 */
      for (const [x, y] of level === 0 ? [[0, -0.14]] : level === 1 ? [[0, -0.26], [0, -0.04]] : [[0, -0.42], [0, -0.2], [0, 0.0]]) {
        artCircle(ctx, G[2], x, y + rAt(y) * K, 0.05, ART.LW * 0.8);
        artCircle(ctx, '#ffe9a8', x, y + rAt(y) * K, 0.032, 0);
        artLine(ctx, G[2], [x - 0.032, y + rAt(y) * K, x + 0.032, y + rAt(y) * K], 0.01);
        artLine(ctx, G[2], [x, y + rAt(y) * K - 0.032, x, y + rAt(y) * K + 0.032], 0.01);
      }
      /* 처마와 뾰족 모자 지붕: 끝이 살짝 휘었다 */
      const lip = rAt(top) + 0.09;
      artCylinder(ctx, HAT, 0, top - 0.02, top + 0.05, lip, rAt(top) + 0.01, { topFill: HAT[2] });
      const tip = top - 0.5 - level * 0.03;
      ctx.beginPath();
      ctx.moveTo(-lip + 0.03, top - 0.02);
      ctx.quadraticCurveTo(-0.06, top - 0.28, 0.07, tip);
      ctx.quadraticCurveTo(0.08, top - 0.26, lip - 0.03, top - 0.02);
      ctx.ellipse(0, top - 0.02, lip - 0.03, (lip - 0.03) * K, 0, 0, Math.PI, false);
      ctx.closePath();
      artFill(ctx, artRound(ctx, HAT, 0, lip));
      artHoop(ctx, 0, top - 0.03, lip - 0.03, G[1], 0.03, true);
      KIT.sign.star(ctx, -0.07, top - 0.16, 0.035, G[0]);
      KIT.sign.star(ctx, 0.07, top - 0.1, 0.025, '#ffffff');
      KIT.sign.moon(ctx, 0.01, top - 0.26, 0.035, G[0]);
      artCircle(ctx, G[0], 0.07, tip, 0.03, ART.LW * 0.8);
      /* 발치의 책과 수정 */
      artRect(ctx, R[1], -0.42, 0.4, 0.12, 0.04, 0.006);
      artRect(ctx, BL[1], -0.4, 0.365, 0.11, 0.038, 0.006);
      artPoly(ctx, P[1], [0.33, 0.44, 0.36, 0.3, 0.41, 0.44]);
      artPoly(ctx, P[0], [0.33, 0.44, 0.36, 0.3, 0.365, 0.44], 0);
    },
    top(ctx, level, aim, o) {
      const h = H('wizard', level);
      const t = o.t;
      const n = TOWERS.wizard.levels[level].multi;
      /* 지붕 둘레를 도는 구슬: 뒤쪽 것은 작고 어둡다 */
      const list = [];
      for (let i = 0; i < n; i++) {
        const q = t * 1.5 + (i * Math.PI * 2) / n;
        list.push([Math.sin(q), Math.cos(q), i]);
      }
      list.sort((p, q) => p[0] - q[0]);
      for (const [depth, c] of list) {
        const x = c * (0.3 + level * 0.02);
        const y = -h + depth * 0.08 - o.recoil * 0.04;
        const r = 0.05 + depth * 0.012 + o.recoil * 0.015;
        artGlow(ctx, x, y, r * 3, '203,166,255', 0.45);
        artCircle(ctx, depth < 0 ? P[1] : P[0], x, y, r, ART.LW * 0.8);
        artCircle(ctx, '#ffffff', x - r * 0.3, y - r * 0.3, r * 0.35, 0);
      }
    },
  };
})();
