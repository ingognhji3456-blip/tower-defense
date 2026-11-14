'use strict';
/* 북탑 — 큰북을 울려 곁의 탑들이 더 빨리 쏘게 한다.
   1단: 나무 무대 위, 엇건 다리에 올린 붉은 큰북.
   2단: 붉은 기둥에 기와지붕을 얹은 북 누각, 삼태극 무늬 북.
   3단: 두 겹 지붕과 금장식, 곁북 둘, 줄줄이 건 깃발. */
(function () {
  const S = ART.stone;
  const W = ART.wood;
  const D = ART.darkwood;
  const G = ART.gold;
  const R = ART.red;
  const BL = ART.blue;
  const K = ART.K;
  const LAC = ['#f47a62', '#cb3d2f', '#8e2320']; /* 붉은 옻칠 */
  const TILE = ['#6f6980', '#474255', '#2c2935'];
  const HIDE = ['#fffaf0', '#f3e7c8', '#d6c59a']; /* 북 가죽 */
  const DECK = [-0.2, -0.3, -0.4];
  const SIZE = [1, 1.14, 1.28];
  const H = (level) => TOWERS.drum.levels[level].h;

  /* 삼태극: 세 빛깔이 맞물려 도는 무늬. 세로로 긴 타원 면에 맞춰 가로를 눌러 그린다. */
  function tomoe(ctx, x, y, r, squash, colors) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(squash, 1);
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
      const b = a + (Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(0, 0, r, a, b, false);
      ctx.arc((Math.cos(b) * r) / 2, (Math.sin(b) * r) / 2, r / 2, b, b + Math.PI, false);
      ctx.arc((Math.cos(a) * r) / 2, (Math.sin(a) * r) / 2, r / 2, a + Math.PI, a, true);
      ctx.closePath();
      ctx.fillStyle = colors[i];
      ctx.fill();
      ctx.strokeStyle = ART.OUT;
      ctx.lineWidth = ART.LW * 0.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  /* 옆으로 누운 북: (x, y) 는 앞 가죽 면의 한가운데 */
  function drum(ctx, x, y, s, level) {
    const rx = 0.15 * s;
    const ry = 0.2 * s;
    const depth = 0.23 * s;
    const bx = x + depth;
    const by = y - 0.025 * s;
    const rim = level === 2 ? G : [D[0], D[1], D[2]];
    /* 뒤쪽 테 → 볼록한 북통 */
    artEllipse(ctx, LAC[2], bx, by, rx * 0.9, ry * 0.94);
    artEllipse(ctx, rim[2], bx + rx * 0.2, by, rx * 0.7, ry * 0.9, 0);
    ctx.beginPath();
    ctx.moveTo(x, y - ry);
    ctx.quadraticCurveTo(x + depth * 0.5, y - ry * 1.16, bx, by - ry * 0.94);
    ctx.lineTo(bx, by + ry * 0.94);
    ctx.quadraticCurveTo(x + depth * 0.5, y + ry * 1.14, x, y + ry);
    ctx.closePath();
    const lac = ctx.createLinearGradient(0, y - ry, 0, y + ry);
    lac.addColorStop(0, LAC[0]);
    lac.addColorStop(0.35, LAC[1]);
    lac.addColorStop(1, LAC[2]);
    artFill(ctx, lac);
    /* 통을 조인 줄: 두 테 사이를 지그재그로 오간다 */
    const zig = [];
    for (let i = 0; i <= 6; i++) {
      const f = i / 6;
      const yy = y - ry * 0.86 + f * ry * 1.72;
      zig.push(i % 2 ? bx - 0.012 : x + rx * 0.5 * Math.sqrt(Math.max(0, 1 - ((yy - y) / ry) ** 2)) + 0.02, yy - (i % 2 ? 0.025 * s : 0));
    }
    artLine(ctx, ART.OUT, zig, 0.022);
    artLine(ctx, '#f0e2bd', zig, 0.01);
    /* 앞 테, 가죽, 테를 따라 박은 못 */
    artEllipse(ctx, rim[1], x, y, rx + 0.024 * s, ry + 0.024 * s);
    artEllipse(ctx, HIDE[1], x, y, rx, ry, ART.LW * 0.8);
    artEllipse(ctx, HIDE[0], x - 0.03 * s, y - 0.045 * s, rx * 0.55, ry * 0.55, 0);
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 0.9, ry * 0.9, 0, 0.2, 1.4);
    ctx.strokeStyle = HIDE[2];
    ctx.lineWidth = 0.014;
    ctx.stroke();
    for (let i = 0; i < 14; i++) {
      const q = (i / 14) * Math.PI * 2;
      artCircle(ctx, level === 2 ? '#fff6cf' : G[1], x + Math.cos(q) * (rx + 0.012 * s), y + Math.sin(q) * (ry + 0.012 * s), 0.011 * s, 0);
    }
    if (level === 0) {
      artEllipse(ctx, LAC[1], x, y, rx * 0.3, ry * 0.3, ART.LW * 0.6);
      artEllipse(ctx, HIDE[0], x, y, rx * 0.12, ry * 0.12, 0);
    } else {
      tomoe(ctx, x, y, ry * 0.5, rx / ry, level === 2 ? [LAC[1], BL[1], G[1]] : [LAC[1], BL[1], LAC[0]]);
    }
  }

  /* 술 달린 매듭 */
  function tassel(ctx, x, y, len, c) {
    artLine(ctx, ART.OUT, [x, y, x, y + len * 0.4], 0.016);
    artCircle(ctx, G[1], x, y + len * 0.4, 0.02, ART.LW * 0.6);
    artPoly(ctx, c, [x - 0.022, y + len * 0.45, x + 0.022, y + len * 0.45, x + 0.03, y + len, x - 0.03, y + len], ART.LW * 0.7);
  }

  TOWER_ART.drum = {
    body(ctx, level) {
      const y = DECK[level];
      const h = H(level);
      const s = SIZE[level];
      artShadow(ctx, 0.07, 0.33, 0.47, 0.15);
      artBox(ctx, [S[1], S[1], S[2]], 0, 0.24, 0.32, 0.43, 0.45, { topFill: S[1] });
      /* 섬돌 */
      artPoly(ctx, S[0], [-0.3, 0.33, -0.16, 0.38, -0.16, 0.43, -0.3, 0.38], ART.LW * 0.8);
      artPoly(ctx, S[1], [-0.3, 0.28, -0.2, 0.315, -0.2, 0.36, -0.3, 0.325], ART.LW * 0.8);
      KIT.frame(ctx, y + 0.07, KIT.GROUND, 0.31, 0.36, W, D);
      KIT.deck(ctx, y, 0.35, W);
      /* 무대 가장자리의 붉은 띠와 금 못 */
      artLine(ctx, LAC[1], [-0.35, y + 0.04, 0, y + 0.04 + 0.35 * K, 0.35, y + 0.04], 0.03);
      for (const f of [-0.75, -0.25, 0.25, 0.75]) artCircle(ctx, G[1], f * 0.35, y + 0.04 + (1 - Math.abs(f)) * 0.35 * K, 0.012, 0);
      /* 걸개: 붉은 천에 금빛 무늬 */
      const len = 0.24 + level * 0.06;
      KIT.banner(ctx, -0.2, y + 0.11, 0.06, len, R, (c, x, yy) => artCircle(c, G[1], x, yy, 0.025, ART.LW * 0.5));
      KIT.banner(ctx, 0.2, y + 0.11, 0.06, len, [R[1], R[2], R[2]], (c, x, yy) => artCircle(c, G[2], x, yy, 0.025, ART.LW * 0.5));
      /* 뒤쪽 기둥 (2·3단의 누각) */
      if (level >= 1) {
        const roof = -h - 0.27 * s;
        artStroke(ctx, LAC[2], [0, y - 0.33 * K, 0, roof], 0.05);
        artLine(ctx, G[2], [-0.02, y - 0.33 * K - 0.03, 0.02, y - 0.33 * K - 0.03], 0.02);
      }
      /* 북을 받친 엇건 다리와 가로대 */
      artStroke(ctx, D[1], [-0.17 * s, y - 0.02, 0.09 * s, -h + 0.05 * s], 0.05);
      artStroke(ctx, D[0], [0.19 * s, y - 0.02, -0.07 * s, -h + 0.05 * s], 0.05);
      artStroke(ctx, W[1], [-0.12 * s, y - 0.1 * s, 0.14 * s, y - 0.1 * s], 0.03);
      artCircle(ctx, G[1], 0.01 * s, (y - h) / 2 - 0.02, 0.022, ART.LW * 0.6);
      drum(ctx, 0, -h, s, level);
      tassel(ctx, -0.12 * s, y - 0.1 * s, 0.1, LAC[1]);
      tassel(ctx, 0.14 * s, y - 0.1 * s, 0.1, level === 2 ? G[1] : LAC[1]);
      if (level === 2) {
        /* 무대 앞쪽의 곁북 둘 */
        for (const sgn of [-1, 1]) {
          const x = sgn * 0.26;
          const yy = y + 0.02 + 0.09 * K;
          artCylinder(ctx, LAC, x, yy - 0.1, yy - 0.01, 0.06, 0.055, { topFill: HIDE[1] });
          artHoop(ctx, x, yy - 0.085, 0.06, G[1], 0.014);
        }
      }
    },

    top(ctx, level, aim, o) {
      const h = H(level);
      const t = o.t;
      const s = SIZE[level];
      /* 번갈아 내리치는 북채: 끝에 붉은 천을 감았다 */
      for (const sgn of [-1, 1]) {
        const k = Math.max(0, Math.sin(t * 7 + (sgn > 0 ? 0 : Math.PI)));
        const hx = -0.03 * s + sgn * 0.04 * s;
        const hy = -h + sgn * 0.07 * s;
        const back = (1 - k) * 0.13;
        const x1 = hx - 0.06 * s - back;
        const y1 = hy - 0.02 * s - back * 0.7;
        const x0 = x1 - 0.24 * s;
        const y0 = y1 - 0.13 * s;
        artStroke(ctx, W[0], [x0, y0, x1, y1], 0.028);
        artStroke(ctx, LAC[1], [x0, y0, x0 + 0.05 * s, y0 + 0.027 * s], 0.034);
        artCircle(ctx, HIDE[0], x1, y1, 0.036, ART.LW * 0.8);
        if (k > 0.8) {
          /* 맞는 순간 가죽에서 퍼지는 떨림 */
          const f = (k - 0.8) * 5;
          ctx.strokeStyle = 'rgba(255,226,126,' + f + ')';
          ctx.lineWidth = 0.014;
          for (const m of [1.25, 1.55]) {
            ctx.beginPath();
            ctx.ellipse(0, -h, 0.15 * s * m, 0.2 * s * m, 0, Math.PI * 0.6, Math.PI * 1.4);
            ctx.stroke();
          }
          artSparkle(ctx, hx - 0.01, hy, 0.04 * f, '#ffffff', f);
        }
      }
    },

    /* 누각의 앞 기둥과 지붕: 북 위로 겹쳐 그린다 */
    front(ctx, level) {
      if (level === 0) return;
      const y = DECK[level];
      const s = SIZE[level];
      const roof = -H(level) - 0.27 * s;
      const trim = level === 2 ? G[1] : LAC[1];
      artStroke(ctx, LAC[0], [-0.32, y - 0.01, -0.32, roof + 0.04], 0.05);
      artStroke(ctx, LAC[2], [0.32, y - 0.01, 0.32, roof + 0.04], 0.05);
      for (const sgn of [-1, 1]) {
        artLine(ctx, G[1], [sgn * 0.345, y - 0.05, sgn * 0.295, y - 0.05], 0.022);
        artLine(ctx, G[1], [sgn * 0.345, roof + 0.1, sgn * 0.295, roof + 0.1], 0.022);
      }
      /* 들보와 처마 밑 장식 */
      artLine(ctx, ART.OUT, [-0.34, roof + 0.05, 0.34, roof + 0.05], 0.06);
      artLine(ctx, LAC[1], [-0.34, roof + 0.05, 0.34, roof + 0.05], 0.036);
      if (level === 2) {
        /* 처마에 줄줄이 건 깃발 */
        for (let i = 0; i < 6; i++) {
          const x = -0.27 + i * 0.108;
          artPoly(ctx, i % 2 ? G[1] : BL[1], [x - 0.03, roof + 0.075, x + 0.03, roof + 0.075, x, roof + 0.14], ART.LW * 0.6);
        }
      }
      KIT.eaves(ctx, TILE, roof + 0.04, 0.44, 0.17, level === 2 ? 0.2 : 0.06, trim);
      if (level === 2) {
        KIT.eaves(ctx, TILE, roof - 0.14, 0.27, 0.13, 0.05, trim);
        KIT.finial(ctx, 0, roof - 0.26, G[1], 0.04);
      } else {
        KIT.finial(ctx, 0, roof - 0.12, G[1], 0.03);
      }
      tassel(ctx, -0.44, roof + 0.03, 0.1, LAC[1]);
      tassel(ctx, 0.44, roof + 0.03, 0.1, LAC[1]);
    },
  };
})();
