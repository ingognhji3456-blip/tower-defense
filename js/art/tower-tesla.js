'use strict';
/* 번개탑 — 구리 코일 위에 떠 있는 구슬이 번개를 뿜는다. 겨누지 않으므로 aim 은 쓰지 않는다.
   1단: 계기판과 보조 전극을 단 돌 받침에 코일과 구슬.  2단: 애자를 끼운 두 갈래 집전 뿔, 구리 배관, 보랏빛 수정.
   3단: 금장식 탑에 세 갈래 뿔, 번개 걸개, 구슬을 도는 금테와 수정 조각. */
(function () {
  const S = ART.stone;
  const SD = [S[1], S[2], '#69738a'];
  const C = ['#f6ae72', '#cb763d', '#8b4a22']; /* 구리 */
  const I = ART.iron;
  const G = ART.gold;
  const P = ART.purple;
  const WH = ['#ffffff', '#e4e8f2', '#b4bccd']; /* 사기 애자 */
  const K = ART.K;
  const BASE = 0.2;
  const DIM = [
    { top: -0.12, rTop: 0.27, rBot: 0.35, rings: 4, orb: 0.1 },
    { top: -0.3, rTop: 0.26, rBot: 0.36, rings: 5, orb: 0.12 },
    { top: -0.48, rTop: 0.26, rBot: 0.37, rings: 6, orb: 0.14 },
  ];

  function hoop(ctx, y, r, color, width) {
    ctx.beginPath();
    ctx.ellipse(0, y, r, r * K, 0, 0.1, Math.PI - 0.1);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function curve(x0, y0, cx, cy, x1, y1, n) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const u = 1 - t;
      pts.push(u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1);
    }
    return pts;
  }

  function crystal(ctx, x, y, w, hh, lean) {
    const tx = x + lean;
    artPoly(ctx, P[1], [tx, y - hh, x - w, y - hh * 0.2, x - w * 0.6, y + hh * 0.3, x + w * 0.6, y + hh * 0.3, x + w, y - hh * 0.2]);
    artPoly(ctx, P[0], [tx, y - hh, x - w, y - hh * 0.2, x - w * 0.6, y + hh * 0.3, x - w * 0.1, y], 0);
    artPoly(ctx, P[2], [tx, y - hh, x + w * 0.25, y, x + w * 0.6, y + hh * 0.3, x + w, y - hh * 0.2], 0);
    artLine(ctx, 'rgba(255,255,255,.7)', [tx, y - hh * 0.9, x - w * 0.1, y], 0.01);
  }

  /* 번개 문장 */
  function bolt(ctx, x, y, s, fill) {
    artPoly(ctx, fill, [x + 0.25 * s, y - s, x - 0.45 * s, y + 0.1 * s, x - 0.02 * s, y + 0.1 * s, x - 0.25 * s, y + s, x + 0.5 * s, y - 0.2 * s, x + 0.05 * s, y - 0.2 * s], ART.LW * 0.5);
  }

  /* 눈금판 */
  function gauge(ctx, x, y, r, ang) {
    artCircle(ctx, C[1], x, y, r);
    artCircle(ctx, '#fbf6ea', x, y, r * 0.7, ART.LW * 0.6);
    artLine(ctx, '#d8432f', [x, y, x + Math.cos(ang) * r * 0.55, y + Math.sin(ang) * r * 0.55], 0.014);
    artCircle(ctx, ART.OUT, x, y, r * 0.14, 0);
  }

  /* 사기 애자: 흰 원반 석 장 */
  function insulator(ctx, x, y, r) {
    for (let i = 0; i < 3; i++) artEllipse(ctx, i === 1 ? WH[1] : WH[0], x, y - i * r * 0.5, r * (1 - i * 0.12), r * 0.42 * (1 - i * 0.12), ART.LW * 0.7);
  }

  /* 굵은 전선 */
  function cable(ctx, pts) {
    artLine(ctx, ART.OUT, pts, 0.042);
    artLine(ctx, I[1], pts, 0.022);
  }

  const hash = (n) => {
    const v = Math.sin(n * 127.1) * 43758.5453;
    return v - Math.floor(v);
  };

  /* 지직거리는 번개 줄기 */
  function arc(ctx, x0, y0, x1, y1, seed, amp, width, alpha) {
    const len = Math.hypot(x1 - x0, y1 - y0) || 1e-6;
    const pts = [x0, y0];
    for (let i = 1; i < 4; i++) {
      const f = i / 4;
      const off = (hash(seed + i * 7.3) - 0.5) * amp;
      pts.push(x0 + (x1 - x0) * f - ((y1 - y0) / len) * off, y0 + (y1 - y0) * f + ((x1 - x0) / len) * off);
    }
    pts.push(x1, y1);
    ctx.globalAlpha = alpha;
    artLine(ctx, '#b98cff', pts, width * 2.4);
    artLine(ctx, '#ffffff', pts, width);
    ctx.globalAlpha = 1;
  }

  /* 번개가 튀는 전극 끝의 위치 (단계별) */
  function tips(level) {
    const d = DIM[level];
    const h = TOWERS.tesla.levels[level].h;
    if (level === 0) return [[-0.33, d.top - 0.2], [0.33, d.top - 0.2]];
    const list = [[-0.19, -h - 0.02], [0.19, -h - 0.02]];
    if (level === 2) list.push([0, -h - d.orb - 0.13]);
    return list;
  }

  TOWER_ART.tesla = {
    body(ctx, level) {
      const d = DIM[level];
      const h = TOWERS.tesla.levels[level].h;
      const rAt = (y) => d.rTop + ((d.rBot - d.rTop) * (y - d.top)) / (BASE - d.top);
      artShadow(ctx, 0.07, 0.33, 0.47, 0.15);
      artCylinder(ctx, SD, 0, 0.27, 0.32, 0.44, 0.45, { topFill: S[1] });
      artCylinder(ctx, S, 0, 0.2, 0.27, 0.39, 0.4, { topFill: S[0] });
      /* 기단 뒤쪽 수정 */
      crystal(ctx, -0.36, 0.2, 0.045 + level * 0.008, 0.15 + level * 0.03, -0.03);
      crystal(ctx, 0.37, 0.21, 0.04 + level * 0.008, 0.12 + level * 0.03, 0.03);
      artCylinder(ctx, S, 0, d.top, BASE, d.rTop, d.rBot, { topFill: '#8d97a9' });

      const rows = level + 1;
      const step = (BASE - d.top) / (rows + 1);
      for (let i = 1; i <= rows; i++) {
        const y = BASE - step * i;
        hoop(ctx, y, rAt(y), 'rgba(43,37,54,.3)', 0.013);
        for (let k = -1; k <= 2; k++) {
          const a = Math.PI / 2 + (k - 0.5 + (i % 2) * 0.5) * 0.6;
          const x = Math.cos(a) * rAt(y);
          artLine(ctx, 'rgba(43,37,54,.22)', [x, y + Math.sin(a) * rAt(y) * K + 0.012, x, y + Math.sin(a) * rAt(y) * K + step - 0.012], 0.011);
        }
      }

      /* 쇠문과 번개 문장, 계단 */
      artPoly(ctx, S[0], [-0.13, 0.36, 0.13, 0.36, 0.11, 0.33, -0.11, 0.33], ART.LW * 0.8);
      ctx.beginPath();
      ctx.moveTo(-0.085, 0.335);
      ctx.lineTo(-0.085, 0.19);
      ctx.arc(0, 0.19, 0.085, Math.PI, 0);
      ctx.lineTo(0.085, 0.335);
      ctx.closePath();
      artFill(ctx, C[2]);
      ctx.beginPath();
      ctx.moveTo(-0.057, 0.335);
      ctx.lineTo(-0.057, 0.195);
      ctx.arc(0, 0.195, 0.057, Math.PI, 0);
      ctx.lineTo(0.057, 0.335);
      ctx.closePath();
      artFill(ctx, I[1], ART.LW * 0.7);
      bolt(ctx, 0, 0.245, 0.05, G[1]);

      /* 눈금판 둘과 보랏빛 창 */
      const ym = (BASE + d.top) / 2 - 0.02;
      gauge(ctx, -0.17, ym + 0.05, 0.05, -2.2);
      gauge(ctx, 0.16, ym + 0.07, 0.042, -0.7);
      artCircle(ctx, ART.OUT, 0, ym - 0.03 + (level ? 0 : 0.02), 0.05, 0);
      artCircle(ctx, '#b98cff', 0, ym - 0.03 + (level ? 0 : 0.02), 0.034, 0);
      artCircle(ctx, '#f1e6ff', -0.01, ym - 0.04 + (level ? 0 : 0.02), 0.014, 0);

      /* 못 박은 구리(3단은 금) 테 */
      const band = level === 2 ? G : C;
      const ring = (y) => {
        hoop(ctx, y, rAt(y) + 0.004, ART.OUT, 0.062);
        hoop(ctx, y, rAt(y) + 0.004, band[1], 0.036);
        hoop(ctx, y - 0.01, rAt(y) + 0.004, band[0], 0.01);
        for (let k = -3; k <= 3; k++) {
          const a = Math.PI / 2 + k * 0.4;
          artCircle(ctx, band[2], Math.cos(a) * rAt(y), y + Math.sin(a) * rAt(y) * K, 0.011, 0);
        }
      };
      ring(d.top + 0.07);
      if (level >= 1) ring(BASE - 0.05);
      if (level === 2) {
        /* 금테 아래로 늘어진 톱니 장식 */
        const y = d.top + 0.105;
        for (let k = -3; k <= 3; k++) {
          const a = Math.PI / 2 + k * 0.3;
          const x = Math.cos(a) * rAt(y);
          const yy = y + Math.sin(a) * rAt(y) * K;
          artPoly(ctx, G[1], [x - 0.028, yy, x + 0.028, yy, x, yy + 0.05], ART.LW * 0.6);
        }
      }
      if (level >= 1) {
        /* 옆구리를 타고 오르는 구리 배관 */
        const px = -rAt(0.0) - 0.035;
        artTube(ctx, C, px, 0.24, px + 0.03, d.top + 0.1, 0.028, 0.028, 0, 0);
        artTube(ctx, C, px + 0.03, d.top + 0.1, px + 0.1, d.top + 0.02, 0.028, 0.028, 0.6, 0);
        artCircle(ctx, C[0], px + 0.03, d.top + 0.1, 0.034, ART.LW * 0.7);
      }

      /* 앞쪽 수정과 기단의 빛나는 문양 */
      crystal(ctx, -0.27, 0.34, 0.04, 0.1 + level * 0.02, -0.02);
      crystal(ctx, 0.29, 0.35, 0.035, 0.085 + level * 0.02, 0.02);
      if (level === 2) {
        for (const x of [-0.16, 0.16]) artPoly(ctx, '#d9b8ff', [x, 0.385, x + 0.025, 0.4, x, 0.415, x - 0.025, 0.4], ART.LW * 0.5);
        crystal(ctx, -0.2, 0.38, 0.03, 0.07, -0.01);
      }

      /* 1단: 양옆 보조 전극 */
      const orbY = -h;
      if (level === 0) {
        for (const sgn of [-1, 1]) {
          const x = sgn * 0.33;
          cable(ctx, curve(sgn * 0.12, d.top - 0.04, sgn * 0.26, d.top + 0.12, x, d.top + 0.02, 8));
          artTube(ctx, sgn < 0 ? C : [C[1], C[2], C[2]], x, d.top + 0.1, x, d.top - 0.14, 0.03, 0.022, 0, 0);
          insulator(ctx, x, d.top - 0.1, 0.045);
          artCircle(ctx, I[0], x, d.top - 0.2, 0.034);
        }
      }

      /* 뒤쪽 뿔 → 쇠막대와 코일 → 양옆 뿔 */
      const horn = (pts, tones) => {
        artStroke(ctx, tones[1], pts, 0.05);
        artLine(ctx, tones[0], pts.map((v) => v - 0.009), 0.014);
      };
      const tp = tips(level);
      if (level === 2) horn([0, d.top - 0.02, 0, tp[2][1]], [C[1], C[2], C[2]]);
      artTube(ctx, I, 0, d.top, 0, orbY + d.orb + 0.1, 0.035, 0.028, 0, 0);
      const coilTop = orbY + d.orb + 0.2;
      for (let i = 0; i < d.rings; i++) {
        const f = i / (d.rings - 1);
        const y = d.top - 0.03 + (coilTop - d.top + 0.03) * f;
        const r = 0.19 - f * 0.1;
        artCylinder(ctx, C, 0, y - 0.045, y, r, r + 0.008, { topFill: C[0] });
        artLine(ctx, 'rgba(255,240,220,.7)', [-r * 0.75, y - 0.02, -r * 0.45, y - 0.012], 0.012);
      }
      insulator(ctx, 0, orbY + d.orb + 0.12, 0.06);
      if (level >= 1) {
        for (const sgn of [-1, 1]) {
          const tones = sgn < 0 ? C : [C[1], C[2], C[2]];
          const pts = curve(sgn * 0.23, d.top - 0.01, sgn * 0.54, (d.top + tp[0][1]) / 2 - 0.02, sgn * 0.19, tp[0][1], 12);
          horn(pts, tones);
          /* 뿔에 끼운 애자와 끝의 전극 */
          artCircle(ctx, WH[0], pts[8], pts[9], 0.04, ART.LW * 0.8);
          artCircle(ctx, WH[1], pts[16], pts[17], 0.036, ART.LW * 0.8);
          artCircle(ctx, level === 2 ? G[1] : I[0], sgn * 0.19, tp[0][1], 0.038);
          artCircle(ctx, level === 2 ? G[0] : ART.steel[0], sgn * 0.19 - 0.01, tp[0][1] - 0.012, 0.014, 0);
          cable(ctx, curve(sgn * 0.23, d.top + 0.02, sgn * 0.3, d.top + 0.14, sgn * rAt(d.top + 0.1) * 0.92, d.top + 0.1 + 0.05, 6));
        }
        if (level === 2) {
          artCircle(ctx, G[1], tp[2][0], tp[2][1], 0.038);
          bolt(ctx, 0, tp[2][1] - 0.1, 0.055, G[0]);
        }
      }
      if (level === 2) {
        /* 번개 문장을 새긴 보라 걸개 */
        const y = d.top + 0.17;
        artPoly(ctx, P[1], [-0.085, y, 0.085, y, 0.085, y + 0.22, 0, y + 0.29, -0.085, y + 0.22]);
        artPoly(ctx, P[0], [-0.085, y, -0.03, y, -0.03, y + 0.265, -0.085, y + 0.22], 0);
        artRect(ctx, G[1], -0.085, y, 0.17, 0.03, 0, ART.LW * 0.6);
        bolt(ctx, 0.005, y + 0.14, 0.07, G[0]);
      }
    },

    top(ctx, level, aim, o) {
      const d = DIM[level];
      const h = TOWERS.tesla.levels[level].h;
      const t = o.t;
      const fl = o.flash;
      const y = -h + Math.sin(t * 2.6) * 0.012;
      const r = d.orb * (1 + fl * 0.18);
      const frame = Math.floor(t * 14);
      const pulse = 0.5 + 0.5 * Math.sin(t * 5);

      artGlow(ctx, 0, y, r * (2.5 + fl * 1.6), '190,140,255', 0.4 + pulse * 0.15 + fl * 0.4);

      /* 전극 끝과 구슬 사이를 오가는 번개 */
      const tp = tips(level);
      tp.forEach((p, i) => {
        const on = fl > 0.05 || hash(frame * 3.1 + i * 17) > (level === 0 ? 0.62 : 0.45);
        if (!on) return;
        const ex = p[0] === 0 ? 0 : Math.sign(p[0]) * r * 0.75;
        const ey = p[0] === 0 ? y - r * 0.75 : y + (level === 0 ? r * 0.4 : 0);
        arc(ctx, p[0], p[1], ex, ey, frame + i * 31, 0.07 + fl * 0.06, 0.012 + fl * 0.012, 0.75 + fl * 0.25);
      });

      /* 구슬을 도는 수정 조각과 금테 (뒤쪽) */
      const n = level;
      const shard = (i, front) => {
        const a = t * 1.7 + (i * Math.PI * 2) / Math.max(1, n) + 0.6;
        if (Math.sin(a) > 0 !== front) return;
        crystal(ctx, Math.cos(a) * (r * 2.1), y + 0.05 + Math.sin(a) * r * 0.6, 0.022, 0.06, 0);
      };
      for (let i = 0; i < n; i++) shard(i, false);
      if (level === 2) {
        ctx.beginPath();
        ctx.ellipse(0, y, r * 1.75, r * 0.55, Math.sin(t * 1.3) * 0.35, Math.PI, 0);
        ctx.strokeStyle = G[2];
        ctx.lineWidth = 0.022;
        ctx.stroke();
      }

      artCircle(ctx, P[2], 0, y, r);
      artCircle(ctx, P[1], -r * 0.1, y - r * 0.1, r * 0.82, 0);
      artCircle(ctx, P[0], -r * 0.22, y - r * 0.24, r * 0.55, 0);
      artCircle(ctx, '#f6eeff', -r * 0.34, y - r * 0.36, r * 0.24, 0);
      /* 구슬 속에서 일렁이는 번개 */
      arc(ctx, -r * 0.5, y + r * 0.2, r * 0.5, y - r * 0.1, frame * 0.5, r * 0.5, 0.008, 0.6);
      if (fl > 0) artCircle(ctx, 'rgba(255,255,255,' + Math.min(1, fl * 1.1) + ')', 0, y, r * 0.92, 0);

      if (level === 2) {
        ctx.beginPath();
        ctx.ellipse(0, y, r * 1.75, r * 0.55, Math.sin(t * 1.3) * 0.35, 0, Math.PI);
        ctx.strokeStyle = ART.OUT;
        ctx.lineWidth = 0.04;
        ctx.stroke();
        ctx.strokeStyle = G[1];
        ctx.lineWidth = 0.02;
        ctx.stroke();
      }
      for (let i = 0; i < n; i++) shard(i, true);
    },
  };
})();
