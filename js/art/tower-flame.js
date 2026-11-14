'use strict';
/* 화염탑 — 아궁이가 이글거리는 벽돌 가마 위에서 놋쇠 용머리가 불길을 내뿜는다.
   1단: 굴뚝 달린 둥근 벽돌 가마.  2단: 쇠테를 두르고 기름통과 구리 배관을 단 가마.
   3단: 금테와 불꽃 걸개, 불 뿜는 굴뚝 둘을 단 높은 가마와 금빛 용머리. */
(function () {
  const BR = ['#eda888', '#c9694a', '#8f4130']; /* 붉은 벽돌 */
  const I = ART.iron;
  const C = ['#f6ae72', '#cb763d', '#8b4a22']; /* 구리·놋쇠 */
  const G = ART.gold;
  const S = ['#a9a3ad', '#807a88', '#5b5564']; /* 그을린 돌 */
  const BONE = ART.bone;
  const K = ART.K;
  const BASE = 0.2;
  const MOUTH = 0.335; /* 아궁이 바닥 */
  const DIM = [
    { top: -0.46, rTop: 0.215, rBot: 0.35 },
    { top: -0.62, rTop: 0.215, rBot: 0.36 },
    { top: -0.78, rTop: 0.22, rBot: 0.37 },
  ];
  /* 가마는 목이 좁고 어깨에서 넓어지는 병 모양이다 */
  const rAt = (d, y) => {
    const f = Math.max(0, Math.min(1, (y - d.top) / (BASE - d.top)));
    return d.rTop + (d.rBot - d.rTop) * (1 - (1 - f) * (1 - f));
  };

  /* 불꽃 한 가닥. (x, yb) 는 밑동 가운데, lean 은 끝이 옆으로 쏠린 정도 */
  function tongue(ctx, x, yb, w, hgt, lean, fill) {
    ctx.beginPath();
    ctx.moveTo(x - w, yb);
    ctx.quadraticCurveTo(x - w * 1.15, yb - hgt * 0.5, x + lean, yb - hgt);
    ctx.quadraticCurveTo(x + w * 1.15, yb - hgt * 0.45, x + w, yb);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  /* 불꽃 문양 */
  function emblem(ctx, x, y, s) {
    tongue(ctx, x, y + s, s * 0.62, s * 2, s * 0.12, ART.OUT);
    tongue(ctx, x, y + s * 0.92, s * 0.5, s * 1.72, s * 0.1, '#ff8a2a');
    tongue(ctx, x, y + s * 0.9, s * 0.26, s * 0.95, 0, '#ffe27e');
  }

  function kiln(ctx, d) {
    const n = 10;
    ctx.beginPath();
    ctx.moveTo(-d.rTop, d.top);
    for (let i = 1; i <= n; i++) {
      const y = d.top + ((BASE - d.top) * i) / n;
      ctx.lineTo(-rAt(d, y), y);
    }
    ctx.ellipse(0, BASE, d.rBot, d.rBot * K, 0, Math.PI, 0, true);
    for (let i = n - 1; i >= 0; i--) {
      const y = d.top + ((BASE - d.top) * i) / n;
      ctx.lineTo(rAt(d, y), y);
    }
    ctx.ellipse(0, d.top, d.rTop, d.rTop * K, 0, 0, Math.PI, false);
    ctx.closePath();
    artFill(ctx, artRound(ctx, BR, 0, d.rBot));
    /* 벽돌 켜와 금 */
    const rows = 5 + (d === DIM[0] ? 0 : d === DIM[1] ? 2 : 4);
    const step = (BASE - d.top) / (rows + 1);
    for (let i = 1; i <= rows; i++) {
      const y = BASE - step * i;
      artHoop(ctx, 0, y, rAt(d, y), 'rgba(80,28,16,.36)', 0.013);
      for (let k = -2; k <= 2; k++) {
        const a = Math.PI / 2 + (k + (i % 2) * 0.5) * 0.5;
        const r0 = rAt(d, y);
        const r1 = rAt(d, y + step);
        artLine(ctx, 'rgba(80,28,16,.26)', [Math.cos(a) * r0, y + Math.sin(a) * r0 * K + 0.012, Math.cos(a) * r1, y + step + Math.sin(a) * r1 * K - 0.012], 0.011);
      }
    }
    /* 목 언저리의 그을음 */
    const soot = ctx.createLinearGradient(0, d.top, 0, d.top + 0.3);
    soot.addColorStop(0, 'rgba(40,24,28,.5)');
    soot.addColorStop(1, 'rgba(40,24,28,0)');
    ctx.beginPath();
    ctx.moveTo(-d.rTop, d.top);
    for (let i = 1; i <= 5; i++) ctx.lineTo(-rAt(d, d.top + i * 0.06), d.top + i * 0.06);
    for (let i = 5; i >= 0; i--) ctx.lineTo(rAt(d, d.top + i * 0.06), d.top + i * 0.06);
    ctx.closePath();
    ctx.fillStyle = soot;
    ctx.fill();
  }

  function chimney(ctx, x, yTop, yBot, dark) {
    const tones = dark ? [BR[1], BR[2], BR[2]] : BR;
    artCylinder(ctx, tones, x, yTop, yBot, 0.058, 0.07, { topFill: '#2a2026' });
    for (const f of [0.35, 0.7]) artHoop(ctx, x, yTop + (yBot - yTop) * f, 0.064, 'rgba(80,28,16,.4)', 0.012);
    artCylinder(ctx, [I[0], I[1], I[2]], x, yTop - 0.025, yTop + 0.035, 0.078, 0.07, { topFill: '#2a2026' });
  }

  function chimneys(level) {
    const d = DIM[level];
    return level === 2 ? [[-0.2, d.top - 0.42], [0.2, d.top - 0.33]] : [[-0.19, d.top - 0.3 - level * 0.05]];
  }

  /* 둥근 불구멍 */
  function vent(ctx, x, y) {
    artCircle(ctx, I[2], x, y, 0.05);
    artCircle(ctx, '#ff8a2a', x, y, 0.032, 0);
    artCircle(ctx, '#ffe27e', x, y + 0.008, 0.017, 0);
    artLine(ctx, I[2], [x - 0.032, y, x + 0.032, y], 0.012);
    artLine(ctx, I[2], [x, y - 0.032, x, y + 0.032], 0.012);
  }

  TOWER_ART.flame = {
    body(ctx, level) {
      const d = DIM[level];
      const band = level === 2 ? G : I;
      artPlinth(ctx, S, S[0]);
      for (const [x, y] of chimneys(level)) chimney(ctx, x, y, d.top + 0.1, x > 0);
      kiln(ctx, d);

      /* 테: 2단은 쇠, 3단은 금 */
      if (level >= 1) {
        for (const y of [d.top + 0.1, (d.top + BASE) / 2 - 0.02]) {
          artHoop(ctx, 0, y, rAt(d, y) + 0.004, band[1], 0.04, true);
          artHoop(ctx, 0, y - 0.012, rAt(d, y) + 0.004, band[0], 0.012);
          for (let k = -2; k <= 2; k++) {
            const a = Math.PI / 2 + k * 0.52;
            artCircle(ctx, level === 2 ? '#fff6cf' : ART.steel[0], Math.cos(a) * rAt(d, y), y + Math.sin(a) * rAt(d, y) * K, 0.011, 0);
          }
        }
      }

      /* 아궁이: 쇠틀 안에서 불이 이글거린다(불꽃은 top 이 그린다) */
      artArch(ctx, I[2], 0, MOUTH, 0.125, 0.265);
      artArch(ctx, I[0], 0, MOUTH, 0.107, 0.243, ART.LW * 0.6);
      const fire = ctx.createLinearGradient(0, MOUTH - 0.22, 0, MOUTH);
      fire.addColorStop(0, '#4a1408');
      fire.addColorStop(0.45, '#d8431a');
      fire.addColorStop(0.8, '#ff9a2a');
      fire.addColorStop(1, '#ffe27e');
      artArch(ctx, fire, 0, MOUTH, 0.085, 0.215, ART.LW * 0.8);
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * (1 + (i + 0.5) / 5);
        artCircle(ctx, ART.steel[0], Math.cos(a) * 0.116, MOUTH - 0.14 + Math.sin(a) * 0.116, 0.01, 0);
      }

      /* 불꽃 문양: 1·2단은 쇠 명판, 3단은 걸개 */
      if (level === 2) {
        const y = d.top + 0.26;
        artPoly(ctx, '#3a2a30', [-0.09, y, 0.09, y, 0.09, y + 0.25, 0, y + 0.32, -0.09, y + 0.25]);
        artPoly(ctx, '#4d3a42', [-0.09, y, -0.035, y, -0.035, y + 0.295, -0.09, y + 0.25], 0);
        artRect(ctx, G[1], -0.09, y, 0.18, 0.032, 0, ART.LW * 0.6);
        artLine(ctx, G[1], [-0.075, y + 0.24, 0, y + 0.3, 0.075, y + 0.24], 0.014);
        emblem(ctx, 0.003, y + 0.15, 0.045);
        vent(ctx, -0.2, d.top + 0.42);
        vent(ctx, 0.2, d.top + 0.42);
      } else {
        const y = d.top + (level === 0 ? 0.26 : 0.31);
        artRect(ctx, I[1], -0.075, y - 0.075, 0.15, 0.15, 0.03);
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) artCircle(ctx, ART.steel[0], sx * 0.055, y + sy * 0.055, 0.009, 0);
        emblem(ctx, 0, y + 0.004, 0.036);
        if (level === 1) {
          vent(ctx, -0.21, d.top + 0.34);
          vent(ctx, 0.21, d.top + 0.34);
        }
      }

      /* 기름통과 구리 배관 */
      if (level >= 1) {
        artBarrel(ctx, 0.37, 0.43, 0.068, 0.17, ART.red, level === 2 ? G[1] : I[2]);
        emblem(ctx, 0.37, 0.345, 0.022);
        const px = 0.37;
        artTube(ctx, C, px, 0.25, px, d.top + 0.16, 0.022, 0.022, 0, 0);
        artTube(ctx, C, px, d.top + 0.16, rAt(d, d.top + 0.08) - 0.02, d.top + 0.08, 0.022, 0.022, 0.6, 0);
        artCircle(ctx, C[0], px, d.top + 0.16, 0.032, ART.LW * 0.7);
        artCircle(ctx, I[1], px, (d.top + 0.6) / 2, 0.03, ART.LW * 0.7);
      }
      /* 장작 더미 */
      for (const [x, y] of [[-0.4, 0.42], [-0.31, 0.43], [-0.355, 0.36]]) {
        artCircle(ctx, ART.wood[1], x, y, 0.045, ART.LW * 0.8);
        artCircle(ctx, ART.wood[0], x, y, 0.026, 0);
        artCircle(ctx, ART.wood[2], x, y, 0.009, 0);
      }
      if (level === 0) {
        /* 석탄 바구니 */
        artPoly(ctx, ART.darkwood[1], [0.29, 0.36, 0.43, 0.36, 0.41, 0.45, 0.31, 0.45]);
        for (const [x, y] of [[0.33, 0.35], [0.39, 0.35], [0.36, 0.32]]) artCircle(ctx, '#3a3440', x, y, 0.03, ART.LW * 0.7);
        artCircle(ctx, '#ff8a2a', 0.365, 0.33, 0.01, 0);
      }

      /* 목을 조인 쇠 갓과 그 속의 불씨 */
      const cr = d.rTop + 0.04;
      artCylinder(ctx, level === 2 ? [G[0], G[1], G[2]] : [I[0], I[1], I[2]], 0, d.top - 0.05, d.top + 0.035, cr, d.rTop + 0.012, { topFill: '#33262a' });
      artEllipse(ctx, '#ff8a2a', 0, d.top - 0.05, cr * 0.78, cr * 0.78 * K, 0);
      artEllipse(ctx, '#ffd23c', 0, d.top - 0.045, cr * 0.52, cr * 0.52 * K, 0);
    },

    top(ctx, level, aim, o) {
      const d = DIM[level];
      const h = TOWERS.flame.levels[level].h;
      const t = o.t;
      const s = 1 + level * 0.1;
      const metal = level === 2 ? G : C;
      const firing = o.recoil > 0.25;
      const y0 = -h;

      /* 아궁이 속에서 넘실대는 불 */
      for (let i = 0; i < 3; i++) {
        const ph = t * (6 + i * 1.7) + i * 2.1;
        const x = (i - 1) * 0.045;
        const hgt = (i === 1 ? 0.17 : 0.12) + 0.03 * Math.sin(ph) + (firing ? 0.02 : 0);
        tongue(ctx, x, MOUTH - 0.01, 0.036, hgt, Math.sin(ph * 0.6) * 0.02, '#ff7a1a');
        tongue(ctx, x, MOUTH - 0.01, 0.02, hgt * 0.62, Math.sin(ph * 0.6) * 0.012, '#ffe27e');
      }

      /* 굴뚝: 연기, 3단은 불길까지 */
      for (const [cx, cy] of chimneys(level)) {
        for (let i = 0; i < 3; i++) {
          const k = (t * 0.5 + i / 3 + cx) % 1;
          ctx.globalAlpha = (1 - k) * 0.5;
          artCircle(ctx, '#d9dbe2', cx + Math.sin(k * 5 + i) * 0.03 + k * 0.05, cy - 0.08 - k * 0.3, 0.035 + k * 0.05, 0);
          ctx.globalAlpha = 1;
        }
        if (level === 2) {
          const f = 0.09 + 0.03 * Math.sin(t * 9 + cx * 20);
          tongue(ctx, cx, cy - 0.01, 0.042, f + 0.03, Math.sin(t * 5 + cx) * 0.02, '#ff7a1a');
          tongue(ctx, cx, cy - 0.01, 0.024, f * 0.7, 0, '#ffe27e');
        } else {
          artCircle(ctx, '#ffb347', cx + Math.sin(t * 3) * 0.02, cy - 0.05 - ((t * 0.4) % 1) * 0.12, 0.012, 0);
        }
      }

      /* 회전대 */
      artCylinder(ctx, [I[0], I[1], I[2]], 0, y0 + 0.08, y0 + 0.155, 0.105, 0.12, { topFill: I[0] });

      /* ── 용머리 ── */
      const a = artAim(aim);
      const away = a.toward < -0.2;
      const P = (u, v, up) => [a.fx * u + a.sx * v, y0 + a.fy * u + a.sy * v - (up || 0)];
      const open = firing ? 1 : 0.3 + 0.12 * Math.sin(t * 3);
      const A = P(-0.14 * s, 0, -0.035);
      const B = P(0.07 * s, 0);
      const T = P(0.36 * s, 0, firing ? 0.015 : 0);
      const J0 = P(0.1 * s, 0, -0.05 * s);
      const J1 = P(0.33 * s, 0, -(0.065 + open * 0.05) * s);
      const M = P(0.38 * s, 0, -0.035 * s);

      const fire = () => {
        if (!firing) {
          /* 입가에서 깜빡이는 불씨 */
          const f = 0.075 + 0.02 * Math.sin(t * 18);
          tongue(ctx, M[0], M[1] + 0.02, 0.032, f + 0.02, a.fx * 0.03, '#ff7a1a');
          tongue(ctx, M[0], M[1] + 0.02, 0.018, f * 0.65, a.fx * 0.02, '#ffe27e');
          return;
        }
        const fl = 0.9 + 0.1 * Math.sin(t * 40);
        const len = 0.5 * s * fl;
        const sw = 0.15 * s;
        const q = (u, v) => [M[0] + a.fx * u + a.sx * v, M[1] + a.fy * u + a.sy * v];
        artGlow(ctx, M[0] + a.fx * len * 0.5, M[1] + a.fy * len * 0.5, len * 0.9, '255,140,40', 0.45);
        artPoly(ctx, 'rgba(255,110,30,.9)', [...q(-0.02, 0), ...q(len * 0.45, sw), ...q(len, 0), ...q(len * 0.45, -sw)], 0);
        artPoly(ctx, '#ffd23c', [...q(-0.02, 0), ...q(len * 0.38, sw * 0.55), ...q(len * 0.8, 0), ...q(len * 0.38, -sw * 0.55)], 0);
        artPoly(ctx, '#fff6cf', [...q(-0.02, 0), ...q(len * 0.25, sw * 0.25), ...q(len * 0.5, 0), ...q(len * 0.25, -sw * 0.25)], 0);
      };
      const neck = () => {
        const tube = artTube(ctx, metal, A[0], A[1], B[0], B[1], 0.066 * s, 0.076 * s, 0.75, 0);
        artBand(ctx, I, A[0] + (B[0] - A[0]) * 0.45, A[1] + (B[1] - A[1]) * 0.45, tube, 0.08 * s, 0.034);
        /* 등줄기의 지느러미 */
        for (const f of [0.15, 0.75]) {
          const x = A[0] + (B[0] - A[0]) * f;
          const y = A[1] + (B[1] - A[1]) * f - 0.06 * s;
          artPoly(ctx, level === 2 ? ART.red[1] : I[0], [x - 0.032, y + 0.012, x - a.fx * 0.035, y - 0.05 * s, x + 0.032, y + 0.012], ART.LW * 0.7);
        }
      };
      const jaw = () => {
        artTube(ctx, [metal[1], metal[2], metal[2]], J0[0], J0[1], J1[0], J1[1], 0.05 * s, 0.03 * s, 0.5, 0.7);
      };
      const head = () => {
        const tube = artTube(ctx, metal, B[0], B[1], T[0], T[1], 0.105 * s, 0.068 * s, 0.85, 0);
        artBand(ctx, level === 2 ? ART.red : I, B[0] + (T[0] - B[0]) * 0.08, B[1] + (T[1] - B[1]) * 0.08, tube, 0.108 * s, 0.028);
        if (Math.abs(a.fx) > 0.4) {
          /* 윗니 */
          for (const f of [0.5, 0.7, 0.9]) {
            const r = (0.105 + (0.068 - 0.105) * f) * s * 0.92;
            const x = B[0] + (T[0] - B[0]) * f - tube.nx * r;
            const y = B[1] + (T[1] - B[1]) * f - tube.ny * r;
            artPoly(ctx, BONE[0], [x - tube.ux * 0.02, y - tube.uy * 0.02, x + tube.ux * 0.02, y + tube.uy * 0.02, x - tube.nx * 0.045, y - tube.ny * 0.045 + 0.01], ART.LW * 0.6);
          }
        }
        /* 콧구멍 */
        const nx = T[0] - tube.ux * 0.05 * s + tube.nx * 0.03 * s;
        const ny = T[1] - tube.uy * 0.05 * s + tube.ny * 0.03 * s;
        artCircle(ctx, ART.OUT, nx, ny, 0.012, 0);
      };
      const horns = () => {
        for (const sgn of [-1, 1]) {
          /* 뒤로 휘어 넘어간 굵은 뿔 */
          const b = P(0.05 * s, sgn * 0.062 * s, 0.065 * s);
          const mid = P(-0.02 * s, sgn * 0.085 * s, 0.14 * s);
          const tip = P(-0.12 * s, sgn * 0.095 * s, 0.13 * s);
          artPoly(ctx, sgn < 0 ? BONE[0] : BONE[1], [b[0] - 0.036, b[1] + 0.012, mid[0] - 0.012, mid[1] - 0.012, tip[0], tip[1], mid[0] + 0.02, mid[1] + 0.028, b[0] + 0.036, b[1] + 0.012], ART.LW * 0.8);
        }
      };
      const eyes = () => {
        for (const sgn of [-1, 1]) {
          const e = P(0.15 * s, sgn * 0.066 * s, 0.05 * s);
          artCircle(ctx, ART.OUT, e[0], e[1], 0.03 * s, 0);
          artCircle(ctx, firing ? '#fff6cf' : '#ffd23c', e[0], e[1], 0.02 * s, 0);
          artCircle(ctx, '#c2371e', e[0] + a.fx * 0.004, e[1], 0.009 * s, 0);
        }
      };

      if (away) {
        fire();
        jaw();
        head();
        horns();
        neck();
      } else {
        neck();
        jaw();
        head();
        horns();
        eyes();
        artTubeEnd(ctx, '#3a1a14', T[0] + a.fx * 0.004, T[1] + a.fy * 0.004, 0.064 * s, a.fx, a.fy, a.toward);
        fire();
      }
    },

    /* 아궁이 앞의 쇠살: 불꽃 위에 겹쳐 그린다 */
    front(ctx) {
      for (const x of [-0.045, 0, 0.045]) {
        artLine(ctx, ART.OUT, [x, MOUTH - 0.095, x, MOUTH - 0.005], 0.026);
        artLine(ctx, I[0], [x, MOUTH - 0.095, x, MOUTH - 0.005], 0.012);
      }
      artLine(ctx, ART.OUT, [-0.085, MOUTH - 0.1, 0.085, MOUTH - 0.1], 0.03);
      artLine(ctx, I[0], [-0.085, MOUTH - 0.1, 0.085, MOUTH - 0.1], 0.014);
      artPoly(ctx, S[0], [-0.15, 0.365, 0.15, 0.365, 0.13, 0.335, -0.13, 0.335], ART.LW * 0.8);
    },
  };
})();
