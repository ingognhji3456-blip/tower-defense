'use strict';
/* 벌집탑 — 켜켜이 쌓은 벌통에서 벌 떼가 날아가 쏘고 독을 남긴다.
   1단: 나무 통 받침 위의 작은 짚 벌통.
   2단: 돌 받침 위로 키운 벌통에 고깔 지붕을 씌웠다.
   3단: 높은 돌탑 위의 황금 여왕 벌통. 왕관을 쓰고 꿀이 흘러내린다. */
(function () {
  const S = ART.stone;
  const W = ART.wood;
  const D = ART.darkwood;
  const G = ART.gold;
  const TH = ART.thatch;
  const P = ART.purple;
  const I = ART.iron;
  const R = ART.red;
  const K = ART.K;
  const H = (level) => TOWERS.hive.levels[level].h;
  const HONEY = ['#ffd45a', '#f2a51e', '#b96d10'];
  /* base: 받침 윗면, r: 맨 아래 켜의 반지름, ring: 켜 하나의 높이, shape: 켜마다의 반지름 비 */
  const DIM = [
    { base: 0.02, r: 0.27, ring: 0.2, shape: [1, 0.9, 0.64] },
    { base: -0.1, r: 0.29, ring: 0.19, shape: [1, 0.96, 0.8, 0.56] },
    { base: -0.3, r: 0.3, ring: 0.2, shape: [1, 0.97, 0.82, 0.58] },
  ];
  const PITCH = 0.84; /* 켜가 서로 겹치는 정도 */

  /* 볼록한 벌통 한 켜 */
  function ring(ctx, tones, yTop, yBot, r) {
    const b = (yBot - yTop) / 2;
    const ym = (yTop + yBot) / 2;
    ctx.beginPath();
    ctx.moveTo(-r + b, yTop);
    ctx.arc(-r + b, ym, b, -Math.PI / 2, Math.PI / 2, true);
    ctx.ellipse(0, yBot, r - b, (r - b) * K, 0, Math.PI, 0, true);
    ctx.arc(r - b, ym, b, Math.PI / 2, -Math.PI / 2, true);
    ctx.closePath();
    artFill(ctx, artRound(ctx, tones, 0, r));
  }

  /* 켜 i 의 [윗면, 밑면, 반지름] */
  function tier(d, i) {
    const bot = d.base + 0.03 - i * d.ring * PITCH;
    return [bot - d.ring, bot, d.r * d.shape[i]];
  }

  /* 흘러내리는 꿀 */
  function drip(ctx, x, y, len) {
    artRect(ctx, HONEY[0], x - 0.022, y - 0.02, 0.044, len + 0.02, 0.022, ART.LW * 0.8);
    artCircle(ctx, '#fff6cf', x - 0.006, y + len - 0.028, 0.008, 0);
  }

  function hexagon(ctx, fill, x, y, r) {
    const pts = [];
    for (let i = 0; i < 6; i++) pts.push(x + Math.cos((i * Math.PI) / 3) * r, y + Math.sin((i * Math.PI) / 3) * r);
    artPoly(ctx, fill, pts, ART.LW * 0.8);
  }

  /* 꿀단지 */
  function jar(ctx, x, y, s) {
    artBarrel(ctx, x, y, 0.045 * s, 0.085 * s, HONEY, D[1]);
    artRect(ctx, W[1], x - 0.045 * s, y - 0.11 * s, 0.09 * s, 0.03 * s, 0.008, ART.LW * 0.7);
  }

  function crown(ctx, x, y, s) {
    artPoly(ctx, G[1], [x - s, y, x - s * 1.2, y - s * 0.95, x - s * 0.5, y - s * 0.5, x, y - s * 1.2, x + s * 0.5, y - s * 0.5, x + s * 1.2, y - s * 0.95, x + s, y]);
    artRect(ctx, G[0], x - s, y - s * 0.26, s * 2, s * 0.26, 0, ART.LW * 0.6);
    artCircle(ctx, R[1], x, y - s * 0.13, s * 0.11, ART.LW * 0.5);
    for (const dx of [-1.2, 0, 1.2]) artCircle(ctx, '#fff6cf', x + dx * s, y - (dx ? 0.95 : 1.2) * s, s * 0.11, ART.LW * 0.5);
  }

  function bee(ctx, x, y, s, flap, flip) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip ? -s : s, s);
    artEllipse(ctx, '#ffffff', 0.004, -0.036, 0.034, 0.014 + 0.016 * Math.abs(flap), ART.LW * 0.45);
    artEllipse(ctx, '#f6bd22', 0, 0, 0.044, 0.032, ART.LW * 0.8);
    ctx.fillStyle = ART.OUT;
    ctx.fillRect(-0.019, -0.03, 0.014, 0.06);
    ctx.fillRect(0.005, -0.03, 0.014, 0.06);
    ctx.beginPath();
    ctx.arc(0.036, -0.004, 0.018, 0, Math.PI * 2);
    ctx.moveTo(-0.042, -0.009);
    ctx.lineTo(-0.066, 0);
    ctx.lineTo(-0.042, 0.009);
    ctx.fill();
    ctx.restore();
  }

  TOWER_ART.hive = {
    body(ctx, level) {
      const d = DIM[level];
      const tones = level === 2 ? G : TH;
      const n = d.shape.length;
      if (level === 0) {
        /* 나무 통 받침 */
        KIT.round(ctx, { tones: W, top: d.base, rTop: 0.29, rBot: 0.31, staves: true, hoops: [[0.11, I[1], 0.032]], door: false, topFill: W[2] });
      } else if (level === 1) {
        KIT.round(ctx, { tones: S, top: d.base, rTop: 0.3, rBot: 0.345, rows: 2, door: D });
        artHoop(ctx, 0, d.base + 0.05, 0.31, W[1], 0.04, true);
      } else {
        KIT.round(ctx, { tones: S, top: d.base, rTop: 0.3, rBot: 0.345, rows: 4, door: D, lit: '#ffca4a', hoops: [[d.base + 0.05, G[1], 0.04], [0.12, G[1], 0.03]] });
        artGlow(ctx, 0, 0.26, 0.14, '255,202,74', 0.4);
        /* 여왕벌 걸개 */
        KIT.banner(ctx, 0, d.base + 0.1, 0.06, 0.2, P, (c, x, y) => {
          artEllipse(c, '#f6bd22', x, y, 0.03, 0.036, ART.LW * 0.6);
          artLine(c, ART.OUT, [x - 0.026, y - 0.006, x + 0.026, y - 0.006], 0.012);
          artLine(c, ART.OUT, [x - 0.022, y + 0.014, x + 0.022, y + 0.014], 0.012);
        });
      }

      /* 벌통: 아래 켜부터 쌓는다 */
      for (let i = 0; i < n; i++) {
        const [yt, yb, r] = tier(d, i);
        ring(ctx, tones, yt, yb, r);
      }
      const [topY, , topR] = tier(d, n - 1);
      artDome(ctx, tones, 0, topY + 0.03, topR - d.ring / 2 + 0.02, 0.07);

      /* 벌이 드나드는 구멍과 디딤널 */
      const [, b0, r0] = tier(d, 0);
      const fy = b0 + (r0 - d.ring / 2) * K;
      artArch(ctx, '#2b2536', 0, fy - 0.035, 0.05, 0.1);
      artRect(ctx, W[1], -0.085, fy - 0.04, 0.17, 0.03, 0.008);
      if (level >= 1) {
        const [t1, b1] = tier(d, 2);
        artCircle(ctx, '#2b2536', -0.1, (t1 + b1) / 2 + 0.02, 0.03);
      }
      /* 흘러내리는 꿀 */
      const [t2] = tier(d, 1);
      drip(ctx, 0.14, t2 + d.ring - 0.04, 0.07);
      if (level >= 1) drip(ctx, 0.19, t2 + d.ring - 0.045, 0.04);
      if (level === 2) {
        const [t3] = tier(d, 2);
        drip(ctx, -0.13, t3 + d.ring - 0.04, 0.09);
        drip(ctx, -0.18, t3 + d.ring - 0.045, 0.05);
        /* 불 밝힌 벌집 창 */
        const [t1, b1] = tier(d, 1);
        const y = (t1 + b1) / 2 + 0.035;
        hexagon(ctx, '#8a4a12', 0, y + 0.02, 0.042);
        hexagon(ctx, '#8a4a12', -0.075, y - 0.02, 0.042);
        hexagon(ctx, '#8a4a12', 0.075, y - 0.02, 0.042);
      }

      if (level === 0) {
        artCircle(ctx, D[1], 0, topY - 0.045, 0.035);
      } else if (level === 1) {
        /* 비를 가리는 고깔 지붕 */
        artCone(ctx, [D[0], D[1], D[2]], 0, topY - 0.24, topY + 0.02, topR + 0.03);
        KIT.finial(ctx, 0, topY - 0.23, G[1], 0.05);
      } else {
        crown(ctx, 0, topY - 0.04, 0.085);
      }

      /* 꿀단지 */
      jar(ctx, 0.37, 0.42, 1);
      if (level >= 1) jar(ctx, -0.37, 0.41, 0.9);
      if (level === 2) jar(ctx, 0.27, 0.45, 0.8);
    },

    top(ctx, level, aim, o) {
      const h = H(level);
      const t = o.t;
      const s = 1 + level * 0.12;
      /* 벌통 둘레를 맴도는 벌들. 쏘는 순간에는 겨눈 쪽으로 몰려 나간다 */
      const n = 3 + level;
      const push = o.recoil * 0.22;
      for (let i = 0; i < n; i++) {
        const q = t * (1.5 + (i % 3) * 0.35) + i * 2.1;
        const rx = 0.34 + (i % 2) * 0.09;
        const x = Math.cos(q) * rx + Math.cos(aim) * push;
        const y = -h * 0.6 + Math.sin(q * 1.3) * 0.24 - (i % 3) * 0.09 + Math.sin(aim) * push * 0.6;
        bee(ctx, x, y, s, Math.sin(t * 55 + i * 2), Math.sin(q) > 0);
      }
    },
  };
})();
