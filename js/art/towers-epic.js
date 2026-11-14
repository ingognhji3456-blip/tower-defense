'use strict';
/* 영웅 등급 탑 — 기관포탑, 레일건탑, 빙하탑, 지진탑, 저주탑, 벌집탑, 프리즘탑.
   무기의 회전축은 (0, -TOWERS[type].levels[level].h). */
(function () {
  const S = ART.stone;
  const W = ART.wood;
  const D = ART.darkwood;
  const I = ART.iron;
  const G = ART.gold;
  const R = ART.red;
  const ST = ART.steel;
  const P = ART.purple;
  const ICE = ART.ice;
  const K = ART.K;
  const H = (type, level) => TOWERS[type].levels[level].h;

  /* ───── 빙하탑: 얼음 봉우리가 때맞춰 한파를 터뜨려 주변을 얼린다 ───── */
  function shard(ctx, x, yb, w, hgt, lean) {
    const tx = x + lean;
    artPoly(ctx, ICE[1], [x - w, yb, tx - w * 0.2, yb - hgt * 0.7, tx, yb - hgt, x, yb + w * 0.3]);
    artPoly(ctx, ICE[2], [x + w, yb, tx + w * 0.25, yb - hgt * 0.66, tx, yb - hgt, x, yb + w * 0.3]);
    artPoly(ctx, ICE[0], [x - w, yb, tx - w * 0.2, yb - hgt * 0.7, tx - w * 0.05, yb - hgt * 0.72, x - w * 0.45, yb + w * 0.12], 0);
    artLine(ctx, 'rgba(255,255,255,.8)', [tx, yb - hgt, x, yb + w * 0.3], 0.011);
  }
  TOWER_ART.glacier = {
    body(ctx, level) {
      const h = H('glacier', level);
      artShadow(ctx, 0.06, 0.34, 0.47, 0.15);
      /* 눈 덮인 둔덕 */
      artEllipse(ctx, '#cfe9f7', 0, 0.3, 0.44, 0.17);
      artEllipse(ctx, '#ffffff', -0.04, 0.27, 0.33, 0.11, 0);
      const peak = h - 0.26;
      /* 뒤에서 앞으로: 곁봉우리들, 큰 봉우리, 앞의 작은 얼음 */
      if (level >= 1) {
        shard(ctx, -0.25, 0.22, 0.1, peak * 0.62, -0.04);
        shard(ctx, 0.26, 0.23, 0.1, peak * 0.55, 0.05);
      }
      if (level === 2) {
        shard(ctx, -0.13, 0.2, 0.1, peak * 0.86, -0.02);
        shard(ctx, 0.15, 0.2, 0.1, peak * 0.8, 0.03);
      }
      shard(ctx, 0, 0.26, 0.17 + level * 0.01, peak + 0.26, 0);
      shard(ctx, -0.3, 0.33, 0.085, 0.24, -0.05);
      shard(ctx, 0.3, 0.35, 0.08, 0.2, 0.05);
      shard(ctx, -0.12, 0.4, 0.06, 0.14, 0);
      /* 봉우리에 얹힌 눈 */
      artEllipse(ctx, '#ffffff', 0, -peak + 0.04, 0.06, 0.03, ART.LW * 0.6);
    },
    top(ctx, level, aim, o) {
      const h = H('glacier', level);
      const t = o.t;
      const s = 1 + level * 0.15;
      const y = -h - 0.04 + Math.sin(t * 2) * 0.015;
      artGlow(ctx, 0, y, 0.3 * s + o.recoil * 0.3, '156,221,248', 0.35 + o.recoil * 0.4);
      /* 떠 있는 눈꽃 결정: 천천히 돈다 */
      ctx.save();
      ctx.translate(0, y);
      ctx.rotate(t * 0.6);
      for (let i = 0; i < 6; i++) {
        const q = (i * Math.PI) / 3;
        const x = Math.cos(q) * 0.13 * s;
        const yy = Math.sin(q) * 0.13 * s;
        artLine(ctx, ART.OUT, [0, 0, x, yy], 0.045);
        artLine(ctx, ART.OUT, [x * 0.6 - yy * 0.25, yy * 0.6 + x * 0.25, x * 0.6, yy * 0.6, x * 0.6 + yy * 0.25, yy * 0.6 - x * 0.25], 0.04);
      }
      for (let i = 0; i < 6; i++) {
        const q = (i * Math.PI) / 3;
        const x = Math.cos(q) * 0.13 * s;
        const yy = Math.sin(q) * 0.13 * s;
        artLine(ctx, '#ffffff', [0, 0, x, yy], 0.02);
        artLine(ctx, ICE[1], [x * 0.6 - yy * 0.25, yy * 0.6 + x * 0.25, x * 0.6, yy * 0.6, x * 0.6 + yy * 0.25, yy * 0.6 - x * 0.25], 0.016);
      }
      artCircle(ctx, ICE[0], 0, 0, 0.035 * s, ART.LW * 0.7);
      ctx.restore();
      /* 흩날리는 눈 */
      for (let i = 0; i < 4 + level * 2; i++) {
        const k = (t * 0.4 + i * 0.23) % 1;
        ctx.globalAlpha = 1 - k;
        artCircle(ctx, '#ffffff', Math.sin(i * 2.1 + t * 0.7) * 0.34, -h + 0.1 + k * 0.5, 0.012, 0);
      }
      ctx.globalAlpha = 1;
    },
  };

  /* ───── 프리즘탑: 유리 프리즘이 광선을 여러 갈래로 가른다 ───── */
  const BRASS = ['#ffe6a0', '#d9a441', '#93661f'];
  const PRISM = [-0.56, -0.74, -0.94];
  TOWER_ART.prism = {
    body(ctx, level) {
      const top = PRISM[level];
      const h = H('prism', level);
      const rAt = KIT.round(ctx, {
        tones: ['#f3f6fb', '#cdd6e4', '#9aa6ba'], top, rTop: 0.18, rBot: 0.31, rows: 3 + level,
        hoops: [[top + 0.08, BRASS[1], 0.04], [0.1, BRASS[1], 0.04]],
        door: [BRASS[0], BRASS[1], BRASS[2]], lit: '#e8fbff',
      });
      /* 빛깔 유리창 */
      const glass = ['#ff7b7b', '#ffd66b', '#7fe08a', '#6fb8ff', '#cba6ff'];
      for (let i = 0; i < 3 + level; i++) {
        const y = top + 0.22 + i * 0.13;
        artCircle(ctx, BRASS[2], 0, y + rAt(y) * K, 0.045, ART.LW * 0.8);
        artCircle(ctx, glass[i % 5], 0, y + rAt(y) * K, 0.028, 0);
      }
      /* 빛을 모으는 거울 (2단부터, 3단은 두 층) */
      const mirror = (sgn, y) => {
        const x = sgn * (rAt(y) + 0.13);
        artStroke(ctx, BRASS[1], [sgn * rAt(y), y + 0.04, x, y - 0.02], 0.03);
        artEllipse(ctx, BRASS[1], x, y - 0.07, 0.062, 0.088, ART.LW, sgn * 0.35);
        artEllipse(ctx, '#bfeaff', x, y - 0.07, 0.042, 0.066, 0, sgn * 0.35);
        artEllipse(ctx, '#ffffff', x - 0.012, y - 0.09, 0.014, 0.026, 0, sgn * 0.35);
      };
      if (level >= 1) for (const sgn of [-1, 1]) mirror(sgn, top + 0.3);
      if (level === 2) {
        for (const sgn of [-1, 1]) mirror(sgn, top + 0.62);
        /* 발치의 빛깔 수정 */
        for (const [x, y, hh, c] of [[-0.38, 0.41, 0.2, 0], [-0.29, 0.44, 0.12, 2], [0.38, 0.42, 0.18, 3], [0.29, 0.45, 0.11, 4]]) {
          artPoly(ctx, glass[c], [x - 0.04, y, x - 0.01, y - hh, x + 0.04, y]);
          artPoly(ctx, '#ffffff', [x - 0.03, y - 0.01, x - 0.012, y - hh * 0.8, x - 0.008, y - 0.01], 0);
        }
      }
      /* 프리즘을 받치는 놋쇠 팔 */
      artCylinder(ctx, [BRASS[0], BRASS[1], BRASS[2]], 0, top - 0.04, top + 0.04, 0.23, 0.19, { topFill: BRASS[2] });
      for (const sgn of [-1, 1]) {
        const pts = artCurve(sgn * 0.19, top - 0.03, sgn * 0.36, (top - h) / 2, sgn * (0.2 + level * 0.02), -h + 0.08, 10);
        artStroke(ctx, sgn < 0 ? BRASS[1] : BRASS[2], pts, 0.04);
        artCircle(ctx, glass[sgn < 0 ? 0 : 3], pts[20], pts[21], 0.03, ART.LW * 0.7);
      }
    },
    top(ctx, level, aim, o) {
      const h = H('prism', level);
      const t = o.t;
      const s = 0.19 + level * 0.03;
      const y = -h - 0.03 + Math.sin(t * 2.2) * 0.012;
      artGlow(ctx, 0, y, s * 2.2, '203,236,255', 0.4 + o.recoil * 0.3);
      if (o.recoil > 0.2) {
        /* 겨눈 쪽으로 퍼지는 무지갯빛 */
        const a = artAim(aim);
        const hues = ['255,120,120', '255,214,120', '143,224,130', '120,190,255', '203,166,255'];
        hues.forEach((c, i) => {
          const off = (i - 2) * 0.16;
          artLine(ctx, 'rgba(' + c + ',' + o.recoil * 0.85 + ')', [a.fx * s * 0.5, y + a.fy * s * 0.5, a.fx * 0.5 + a.sx * off, y + a.fy * 0.5 + a.sy * off], 0.03);
        });
      }
      /* 세모 유리: 빛을 받아 반짝인다 */
      const tri = [0, y - s, -s * 0.9, y + s * 0.62, s * 0.9, y + s * 0.62];
      artPoly(ctx, 'rgba(214,246,255,.92)', tri);
      artPoly(ctx, 'rgba(255,255,255,.95)', [0, y - s, -s * 0.9, y + s * 0.62, -s * 0.2, y + s * 0.25], 0);
      artPoly(ctx, 'rgba(140,200,240,.75)', [0, y - s, s * 0.9, y + s * 0.62, s * 0.25, y + s * 0.3], 0);
      artLine(ctx, 'rgba(255,255,255,.9)', [0, y - s, 0, y + s * 0.62], 0.012);
      artPath(ctx, tri);
      ctx.strokeStyle = ART.OUT;
      ctx.lineWidth = ART.LW;
      ctx.stroke();
      artSparkle(ctx, -s * 0.4, y - s * 0.3, 0.035, '#ffffff', 0.6 + 0.4 * Math.sin(t * 4));
      if (level === 2) {
        /* 둘레를 도는 작은 프리즘 */
        for (let i = 0; i < 2; i++) {
          const q = t * 1.2 + i * Math.PI;
          const x = Math.cos(q) * 0.3;
          const yy = y + 0.05 + Math.sin(q) * 0.07;
          artPoly(ctx, 'rgba(214,246,255,.92)', [x, yy - 0.06, x - 0.05, yy + 0.04, x + 0.05, yy + 0.04], ART.LW * 0.7);
        }
      }
    },
  };
})();
