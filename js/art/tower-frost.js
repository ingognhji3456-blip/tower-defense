'use strict';
/* 서리탑 — 꼭대기에 떠 있는 얼음 수정이 냉기를 뿜는다. 겨누지 않으므로 aim 은 쓰지 않는다.
   1단: 얼음 가시 왕관을 쓴 눈 덮인 돌 사당.  2단: 문양 띠와 메달을 두르고 집게발로 수정을 감싼 탑.
   3단: 얼음 갈비뼈 지붕, 눈꽃 걸개, 떠도는 얼음 고리를 갖춘 높은 첨탑. */
(function () {
  const S = ['#e6eef7', '#b6c6da', '#8297b4']; /* 푸른 기가 도는 돌 */
  const SD = [S[1], S[2], '#687d9c'];
  const IC = ART.ice;
  const ST = ART.steel;
  const G = ART.gold;
  const NAVY = ['#6f8fc4', '#46639c', '#2c4274'];
  const SNOW = '#f6fcff';
  const GLOW = '#8fe9ff';
  const K = ART.K;
  const BASE = 0.2;
  const DIM = [
    { top: -0.3, rTop: 0.24, rBot: 0.34 },
    { top: -0.48, rTop: 0.22, rBot: 0.34 },
    { top: -0.66, rTop: 0.21, rBot: 0.35 },
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

  /* 눈꽃 */
  function flake(ctx, x, y, s, color, w) {
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3 + Math.PI / 2;
      const c = Math.cos(a) * s;
      const d = Math.sin(a) * s;
      artLine(ctx, color, [x - c, y - d, x + c, y + d], w);
      for (const sg of [-1, 1]) {
        const px = x + c * 0.6 * sg;
        const py = y + d * 0.6 * sg;
        artLine(ctx, color, [px - d * 0.3, py + c * 0.3, px + c * 0.28 * sg, py + d * 0.28 * sg, px + d * 0.3, py - c * 0.3], w * 0.8);
      }
    }
  }

  /* 얼음 수정: 위아래로 뾰족한 보석 */
  function gem(ctx, x, y, w, hh) {
    const top = y - hh;
    const sh = y - hh * 0.3;
    const bot = y + hh;
    const mx = x - w * 0.28;
    const my = sh + hh * 0.16;
    artPoly(ctx, IC[1], [x, top, x - w, sh, x, bot, x + w, sh]);
    artPoly(ctx, IC[0], [x, top, x - w, sh, mx, my], 0);
    artPoly(ctx, IC[2], [mx, my, x, bot, x + w, sh], 0);
    artPoly(ctx, '#c4ecfb', [x - w, sh, x, bot, mx, my], 0);
    artLine(ctx, 'rgba(255,255,255,.8)', [x, top, mx, my, x, bot], 0.012);
    artLine(ctx, 'rgba(255,255,255,.5)', [x - w, sh, mx, my, x + w, sh], 0.01);
  }

  /* 땅이나 벽에서 자라난 얼음 덩이 */
  function iceGrowth(ctx, x, y, s, lean) {
    const spike = (dx, w, h, tones) => {
      const bx = x + dx * s;
      const tx = bx + (lean + dx * 0.6) * s * h;
      artPoly(ctx, tones[1], [bx - w * s, y, tx, y - h * s, bx + w * s, y]);
      artPoly(ctx, tones[0], [bx - w * s, y, tx, y - h * s, bx - w * 0.15 * s, y], 0);
    };
    spike(-0.5, 0.3, 0.9, [IC[1], IC[2]]);
    spike(0.5, 0.28, 0.75, [IC[1], IC[2]]);
    spike(0, 0.36, 1.5, [IC[0], IC[1]]);
  }

  /* 눈 더미 */
  function drift(ctx, x, y, w, h) {
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.bezierCurveTo(x - w * 0.7, y - h * 1.5, x + w * 0.5, y - h * 1.4, x + w, y);
    ctx.closePath();
    artFill(ctx, SNOW);
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5, y);
    ctx.bezierCurveTo(x, y - h * 0.5, x + w * 0.6, y - h * 0.6, x + w, y);
    ctx.closePath();
    artFill(ctx, '#cfe4f7', 0);
  }

  /* 탑머리를 빙 두른 얼음 가시 왕관 (뒤쪽부터 그려 겹침을 맞춘다) */
  function crown(ctx, y, r, n, size, half) {
    const list = [];
    for (let i = 0; i < n; i++) list.push(((i + 0.5) / n) * Math.PI * 2);
    list.sort((a, b) => Math.sin(a) - Math.sin(b));
    for (const a of list) {
      if (half === 'back' && Math.sin(a) > 0) continue;
      if (half === 'front' && Math.sin(a) <= 0) continue;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const bx = c * r;
      const by = y + s * r * K;
      const w = 0.04 + 0.02 * Math.abs(s);
      const tone = c < -0.3 ? IC[0] : c > 0.3 ? IC[2] : IC[1];
      artPoly(ctx, tone, [bx - w, by + 0.01, bx + c * size * 0.55, by - size * (0.8 + 0.25 * Math.abs(c)), bx + w, by + 0.01]);
      artLine(ctx, 'rgba(255,255,255,.7)', [bx - w * 0.3, by - 0.01, bx + c * size * 0.45, by - size * 0.7], 0.01);
    }
  }

  /* 테두리에 얹힌 눈과 고드름 */
  function snowCap(ctx, y, r, long) {
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * (0.1 + i * 0.16);
      const x = Math.cos(a) * r;
      const yy = y + Math.sin(a) * r * K;
      const len = (i % 2 ? 0.11 : 0.06) * (long ? 1.7 : 1);
      artPoly(ctx, i % 2 ? IC[1] : IC[2], [x - 0.022, yy, x + 0.022, yy, x, yy + len], ART.LW * 0.7);
    }
    artEllipse(ctx, SNOW, 0, y, r + 0.012, (r + 0.012) * K);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI * (0.2 + i * 0.2);
      artEllipse(ctx, SNOW, Math.cos(a) * r, y + Math.sin(a) * r * K + 0.012, 0.05, 0.035, ART.LW * 0.8);
    }
    artEllipse(ctx, SNOW, 0, y, r - 0.01, (r - 0.01) * K, 0);
    artEllipse(ctx, '#d6ebff', 0.03, y + 0.01, r * 0.62, r * 0.62 * K, 0);
  }

  /* 빛나는 문양을 새긴 띠 */
  function runeBand(ctx, y, r, tall) {
    hoop(ctx, y, r + 0.004, ART.OUT, tall + 0.03);
    hoop(ctx, y, r + 0.004, NAVY[1], tall);
    hoop(ctx, y - tall * 0.32, r + 0.004, NAVY[0], tall * 0.2);
    for (let k = -3; k <= 3; k++) {
      const a = Math.PI / 2 + k * 0.36;
      const x = Math.cos(a) * r;
      const yy = y + Math.sin(a) * r * K;
      const s = tall * 0.3;
      if (k % 2 === 0) artPoly(ctx, GLOW, [x, yy - s, x + s * 0.6, yy, x, yy + s, x - s * 0.6, yy], 0);
      else artLine(ctx, GLOW, [x - s * 0.5, yy + s * 0.6, x, yy - s * 0.7, x + s * 0.5, yy + s * 0.6], 0.013);
    }
  }

  /* 수정을 감싸는 휘어진 팔 */
  function arm(ctx, tones, pts, width) {
    artLine(ctx, ART.OUT, pts, width + ART.LW * 1.8);
    artLine(ctx, tones[1], pts, width);
    artLine(ctx, tones[0], pts.map((v) => v - width * 0.18), width * 0.3);
  }

  function sparkle(ctx, x, y, s, alpha) {
    ctx.globalAlpha = alpha;
    artPoly(ctx, '#ffffff', [x, y - s, x + s * 0.25, y - s * 0.25, x + s, y, x + s * 0.25, y + s * 0.25, x, y + s, x - s * 0.25, y + s * 0.25, x - s, y, x - s * 0.25, y - s * 0.25], 0);
    ctx.globalAlpha = 1;
  }

  TOWER_ART.frost = {
    body(ctx, level) {
      const d = DIM[level];
      const rAt = (y) => d.rTop + ((d.rBot - d.rTop) * (y - d.top)) / (BASE - d.top);
      artShadow(ctx, 0.07, 0.33, 0.47, 0.15);
      artCylinder(ctx, SD, 0, 0.27, 0.32, 0.44, 0.45, { topFill: S[1] });
      artCylinder(ctx, S, 0, 0.2, 0.27, 0.39, 0.4, { topFill: SNOW });
      /* 뒤쪽에 솟은 얼음 */
      iceGrowth(ctx, -0.36, 0.2, 0.11 + level * 0.02, -0.25);
      iceGrowth(ctx, 0.37, 0.21, 0.09 + level * 0.02, 0.25);
      artCylinder(ctx, S, 0, d.top, BASE, d.rTop, d.rBot, { top: false });

      const rows = level + 2;
      const step = (BASE - d.top) / (rows + 1);
      for (let i = 1; i <= rows; i++) {
        const y = BASE - step * i;
        hoop(ctx, y, rAt(y), 'rgba(40,50,80,.3)', 0.013);
        for (let k = -1; k <= 2; k++) {
          const a = Math.PI / 2 + (k - 0.5 + (i % 2) * 0.5) * 0.6;
          const x = Math.cos(a) * rAt(y);
          artLine(ctx, 'rgba(40,50,80,.22)', [x, y + Math.sin(a) * rAt(y) * K + 0.012, x, y + Math.sin(a) * rAt(y) * K + step - 0.012], 0.011);
        }
      }
      /* 벽에 낀 성에 */
      for (const [x, y, l] of [[-0.24, 0.02, 0.1], [-0.2, -0.12, 0.07], [0.2, 0.08, 0.06]]) {
        artLine(ctx, 'rgba(255,255,255,.75)', [x, y, x + 0.03, y - l, x + 0.07, y - l * 0.5], 0.012);
        artLine(ctx, 'rgba(255,255,255,.75)', [x + 0.03, y - l, x + 0.01, y - l * 1.5], 0.01);
      }

      /* 푸른 빛이 새는 아치문과 계단 */
      artPoly(ctx, S[0], [-0.13, 0.36, 0.13, 0.36, 0.11, 0.33, -0.11, 0.33], ART.LW * 0.8);
      ctx.beginPath();
      ctx.moveTo(-0.095, 0.335);
      ctx.lineTo(-0.095, 0.17);
      ctx.arc(0, 0.17, 0.095, Math.PI, 0);
      ctx.lineTo(0.095, 0.335);
      ctx.closePath();
      artFill(ctx, NAVY[2]);
      ctx.beginPath();
      ctx.moveTo(-0.062, 0.335);
      ctx.lineTo(-0.062, 0.18);
      ctx.arc(0, 0.18, 0.062, Math.PI, 0);
      ctx.lineTo(0.062, 0.335);
      ctx.closePath();
      artFill(ctx, GLOW, ART.LW * 0.7);
      artPoly(ctx, '#e9fbff', [-0.03, 0.335, -0.03, 0.2, 0, 0.15, 0.03, 0.2, 0.03, 0.335], 0);
      artPoly(ctx, IC[1], [0, 0.03, 0.03, 0.065, 0, 0.1, -0.03, 0.065], ART.LW * 0.7);

      /* 문양 띠 */
      const yb = d.top + (level === 0 ? 0.2 : 0.24);
      runeBand(ctx, yb, rAt(yb), 0.06);
      if (level >= 1) {
        /* 눈꽃 메달 */
        const ym = yb + 0.035 + rAt(yb) * K;
        artCircle(ctx, ST[1], 0, ym, 0.07);
        artCircle(ctx, NAVY[1], 0, ym, 0.05, ART.LW * 0.6);
        flake(ctx, 0, ym, 0.034, '#ffffff', 0.011);
        const yb2 = d.top + 0.44;
        hoop(ctx, yb2, rAt(yb2) + 0.004, ART.OUT, 0.05);
        hoop(ctx, yb2, rAt(yb2) + 0.004, ST[1], 0.026);
      }
      if (level === 2) {
        /* 눈꽃 걸개 */
        const y = d.top + 0.5;
        for (const sx of [-0.16, 0.16]) {
          artPoly(ctx, sx < 0 ? NAVY[0] : NAVY[1], [sx - 0.055, y, sx + 0.055, y, sx + 0.055, y + 0.2, sx, y + 0.25, sx - 0.055, y + 0.2]);
          artRect(ctx, ST[0], sx - 0.055, y, 0.11, 0.028, 0, ART.LW * 0.6);
          flake(ctx, sx, y + 0.12, 0.032, '#ffffff', 0.01);
        }
        /* 뒤쪽 갈비뼈 */
        arm(ctx, [IC[1], IC[2], IC[2]], [0, d.top - 0.02, 0, d.top - 0.92], 0.035);
      }

      /* 넓어지는 머리띠와 얼음 왕관(뒤쪽) */
      const lip = level === 2 ? 0.08 : level === 1 ? 0.055 : 0.04;
      hoop(ctx, d.top + 0.1, rAt(d.top + 0.1) + 0.002, 'rgba(40,50,80,.26)', 0.045);
      artCylinder(ctx, S, 0, d.top, d.top + 0.085, d.rTop + lip, d.rTop + 0.004, { top: false });
      crown(ctx, d.top, d.rTop + lip - 0.02, 8 + level * 2, 0.13 + level * 0.02, 'back');
      snowCap(ctx, d.top, d.rTop + lip, level === 2);

      if (level === 1) {
        /* 수정을 쥔 집게발과 매달린 얼음 추 */
        for (const sgn of [-1, 1]) {
          arm(ctx, sgn < 0 ? ST : [ST[1], ST[2], ST[2]], curve(sgn * 0.2, d.top, sgn * 0.44, d.top - 0.2, sgn * 0.2, d.top - 0.5, 8), 0.05);
          artCircle(ctx, G[1], sgn * 0.3, d.top - 0.13, 0.03, ART.LW * 0.7);
          artPoly(ctx, IC[1], [sgn * 0.2, d.top - 0.57, sgn * 0.245, d.top - 0.47, sgn * 0.15, d.top - 0.47], ART.LW * 0.7);
          artLine(ctx, ST[2], [sgn * 0.335, d.top - 0.24, sgn * 0.335, d.top - 0.13], 0.012);
          gem(ctx, sgn * 0.335, d.top - 0.08, 0.022, 0.05);
        }
      }
      if (level === 2) {
        /* 얼음 갈비뼈가 꼭대기에서 만나고, 마디마다 가시와 은 고리 */
        const apex = d.top - 0.92;
        for (const sgn of [-1, 1]) {
          const pts = curve(sgn * 0.26, d.top - 0.01, sgn * 0.52, d.top - 0.56, 0, apex, 10);
          for (const i of [4, 8, 12]) {
            artPoly(ctx, IC[1], [pts[i] - sgn * 0.01, pts[i + 1] - 0.03, pts[i] + sgn * 0.1, pts[i + 1] - 0.06, pts[i] - sgn * 0.01, pts[i + 1] + 0.03], ART.LW * 0.7);
          }
          arm(ctx, sgn < 0 ? [IC[0], IC[1], IC[2]] : [IC[1], IC[2], IC[2]], pts, 0.05);
          artCircle(ctx, ST[0], pts[6], pts[7], 0.034, ART.LW * 0.7);
          artCircle(ctx, ST[0], pts[14], pts[15], 0.03, ART.LW * 0.7);
        }
        artPoly(ctx, IC[0], [0, apex - 0.14, 0.05, apex - 0.01, 0, apex + 0.06, -0.05, apex - 0.01]);
        artCircle(ctx, G[1], 0, apex - 0.005, 0.02, 0);
      }

      /* 발치의 눈 더미와 얼음 */
      drift(ctx, -0.27, 0.4, 0.14, 0.07);
      drift(ctx, 0.3, 0.39, 0.11, 0.055);
      iceGrowth(ctx, 0.25, 0.37, 0.06 + level * 0.012, 0.15);
      if (level >= 1) iceGrowth(ctx, -0.3, 0.36, 0.05 + level * 0.012, -0.2);
    },

    top(ctx, level, aim, o) {
      const h = TOWERS.frost.levels[level].h;
      const t = o.t;
      const y = -h + Math.sin(t * 2.2) * 0.025;
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.1);
      const size = 1 + level * 0.22;
      artGlow(ctx, 0, y, 0.3 + level * 0.07, '150,228,255', 0.3 + pulse * 0.28);

      if (level === 2) {
        /* 수정을 도는 얼음 고리 (뒤쪽 반) */
        ctx.beginPath();
        ctx.ellipse(0, y + 0.02, 0.27, 0.085, Math.sin(t * 0.9) * 0.25, Math.PI, 0);
        ctx.strokeStyle = IC[2];
        ctx.lineWidth = 0.02;
        ctx.stroke();
      }
      const n = level + 2;
      const shard = (i, front) => {
        const a = t * 1.5 + (i * Math.PI * 2) / n;
        if (Math.sin(a) > 0 !== front) return;
        gem(ctx, Math.cos(a) * (0.25 + level * 0.035), y + 0.04 + Math.sin(a) * 0.08, 0.028, 0.06);
      };
      for (let i = 0; i < n; i++) shard(i, false);
      if (level >= 1) {
        gem(ctx, -0.1 * size, y + 0.07 * size, 0.045 * size, 0.1 * size);
        gem(ctx, 0.1 * size, y + 0.09 * size, 0.04 * size, 0.085 * size);
      }
      gem(ctx, 0, y, 0.085 * size, 0.2 * size);
      if (level === 2) {
        ctx.beginPath();
        ctx.ellipse(0, y + 0.02, 0.27, 0.085, Math.sin(t * 0.9) * 0.25, 0, Math.PI);
        ctx.strokeStyle = ART.OUT;
        ctx.lineWidth = 0.038;
        ctx.stroke();
        ctx.strokeStyle = IC[0];
        ctx.lineWidth = 0.018;
        ctx.stroke();
      }
      for (let i = 0; i < n; i++) shard(i, true);

      /* 반짝임과 흩날리는 눈 */
      sparkle(ctx, -0.05 * size, y - 0.09 * size, 0.035, 0.5 + pulse * 0.5);
      for (let i = 0; i < 4; i++) {
        const k = (t * 0.45 + i * 0.25) % 1;
        const x = Math.sin(i * 2.4 + t * 0.8) * (0.2 + i * 0.04);
        sparkle(ctx, x, y - 0.1 + k * 0.5, 0.018 + (i % 2) * 0.008, (1 - k) * 0.9);
      }
    },

    front(ctx, level) {
      const d = DIM[level];
      const lip = level === 2 ? 0.08 : level === 1 ? 0.055 : 0.04;
      crown(ctx, d.top, d.rTop + lip - 0.02, 8 + level * 2, 0.1 + level * 0.015, 'front');
    },
  };
})();
