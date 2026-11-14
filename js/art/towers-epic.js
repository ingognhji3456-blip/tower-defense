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

  /* ───── 기관포탑: 쇠로 두른 포탑 위에서 여러 총열이 돌며 쉴 새 없이 쏜다 ───── */
  const GAT = [-0.44, -0.6, -0.76];
  TOWER_ART.gatling = {
    body(ctx, level) {
      const top = GAT[level];
      const band = level === 2 ? G : ST;
      const rAt = KIT.round(ctx, {
        tones: [I[0], I[1], I[2]], top, rTop: 0.24, rBot: 0.33, plinth: S,
        hoops: [[top + 0.08, band[1], 0.04], [(top + KIT.BASE) / 2, band[1], 0.04], [0.1, band[1], 0.04]],
        door: [I[0], '#2f3542', '#20242e'],
      });
      /* 대갈못 */
      for (const y of [top + 0.08, (top + KIT.BASE) / 2, 0.1]) {
        for (let k = -2; k <= 2; k++) {
          const a = Math.PI / 2 + k * 0.5;
          artCircle(ctx, band[0], Math.cos(a) * rAt(y), y + Math.sin(a) * rAt(y) * K, 0.012, 0);
        }
      }
      /* 탄약 상자와 탄띠 */
      artRect(ctx, ART.green[2], 0.26, 0.3, 0.17, 0.13, 0.012);
      artRect(ctx, ART.green[1], 0.275, 0.315, 0.06, 0.1, 0.008, 0);
      artStroke(ctx, G[1], artCurve(0.34, 0.3, 0.42, 0.0, 0.2, top - 0.02, 10), 0.03);
      /* 회전대 */
      artCylinder(ctx, [ST[0], ST[1], ST[2]], 0, top - 0.06, top + 0.02, 0.19, 0.22, { topFill: ST[1] });
    },
    top(ctx, level, aim, o) {
      const h = H('gatling', level);
      const a = artAim(aim);
      const s = 1 + level * 0.1;
      const n = 3 + level + (level === 2 ? 1 : 0);
      const spin = o.t * (1.5 + o.recoil * 24);
      const Q = (u, v, up) => [a.fx * u + a.sx * v, -h + a.fy * u + a.sy * v - (up || 0)];
      const away = a.toward < -0.2;
      const housing = () => {
        const b = Q(-0.16 * s, 0);
        const f = Q(0.08 * s, 0);
        artTube(ctx, level === 2 ? G : [ST[0], ST[1], ST[2]], b[0], b[1], f[0], f[1], 0.1 * s, 0.09 * s, 0.8, 0.5);
      };
      const barrels = () => {
        const list = [];
        for (let i = 0; i < n; i++) {
          const q = spin + (i * Math.PI * 2) / n;
          list.push([Math.sin(q), Math.cos(q)]);
        }
        list.sort((p, q) => p[0] - q[0]);
        for (const [up, v] of list) {
          const b = Q(0.06 * s, v * 0.045 * s, up * 0.04 * s);
          const f = Q(0.4 * s - o.recoil * 0.02, v * 0.045 * s, up * 0.04 * s);
          artTube(ctx, [I[0], I[1], I[2]], b[0], b[1], f[0], f[1], 0.022 * s, 0.02 * s, 0, 0);
        }
        const ring = Q(0.3 * s, 0);
        artTube(ctx, [ST[0], ST[1], ST[2]], ring[0] - a.fx * 0.02, ring[1] - a.fy * 0.02, ring[0] + a.fx * 0.02, ring[1] + a.fy * 0.02, 0.075 * s, 0.075 * s, 0, 0);
        if (o.recoil > 0.3) {
          const m = Q(0.44 * s, 0);
          artGlow(ctx, m[0], m[1], 0.2, '255,220,120', o.recoil * 0.9);
          artSparkle(ctx, m[0], m[1], 0.09 * o.recoil + 0.03, '#fff6cf', 1);
        }
      };
      if (away) { barrels(); housing(); } else { housing(); barrels(); }
    },
  };

  /* ───── 레일건탑: 두 줄 레일 사이에 전기를 모아 사거리 끝까지 꿰뚫는다 ───── */
  const DARK = ['#98a2b8', '#606a82', '#3b4256'];
  const RAIL = [-0.52, -0.7, -0.88];
  TOWER_ART.railgun = {
    body(ctx, level) {
      const top = RAIL[level];
      const wAt = KIT.square(ctx, { tones: DARK, top, wTop: 0.25, wBot: 0.34, base: [I[0], I[1], I[2]], door: [I[0], '#2f3542', '#20242e'], trim: level === 2 ? G[1] : '#7fe0ff' });
      /* 빛나는 틈 */
      const n = 2 + level;
      for (let i = 0; i < n; i++) {
        const y = top + 0.12 + i * 0.16;
        KIT.slit(ctx, wAt, y, -1, 0.55, 0.09, '#7fe0ff');
        KIT.slit(ctx, wAt, y, 1, 0.55, 0.09, '#4fb6e0');
      }
      /* 축전기 */
      for (const sgn of [-1, 1]) {
        artCylinder(ctx, [ST[0], ST[1], ST[2]], sgn * 0.37, 0.2, 0.42, 0.055, 0.055, { topFill: '#7fe0ff' });
        if (level >= 1) artCylinder(ctx, [G[0], G[1], G[2]], sgn * 0.37, 0.27, 0.31, 0.06, 0.06, { top: false });
      }
      artBox(ctx, [ST[0], ST[1], ST[2]], 0, top - 0.06, top + 0.02, 0.17, 0.2, { topFill: ST[0] });
    },
    top(ctx, level, aim, o) {
      const h = H('railgun', level);
      const a = artAim(aim);
      const s = 1 + level * 0.12;
      const charge = 1 - o.recoil;
      const Q = (u, v, up) => [a.fx * u + a.sx * v, -h + a.fy * u + a.sy * v - (up || 0)];
      const kick = -o.recoil * 0.05;
      const pr = artPrism(ctx, [ST[0], ST[1], ST[2]], -a.fx * 0.08 + a.fx * kick, -h - 0.04 + a.fy * kick, 0.15 * s, 0.1 * s, 0.09, aim, level === 2 ? G[1] : ST[0]);
      const glow = () => {
        const b = Q(0.02 + kick, 0, 0.02);
        const f = Q(0.5 * s + kick, 0, 0.02);
        artLine(ctx, 'rgba(127,224,255,' + (0.25 + charge * 0.6) + ')', [b[0], b[1], f[0], f[1]], 0.05 * s);
        if (o.recoil > 0.5) {
          artLine(ctx, '#ffffff', [b[0], b[1], f[0], f[1]], 0.06 * s);
          artGlow(ctx, f[0], f[1], 0.3, '156,221,248', o.recoil);
        }
      };
      const rail = (sgn) => {
        const b = Q(-0.02 + kick, sgn * 0.06 * s, 0.02);
        const f = Q(0.52 * s + kick, sgn * 0.045 * s, 0.02);
        const tube = artTube(ctx, DARK, b[0], b[1], f[0], f[1], 0.03 * s, 0.022 * s, 0.3, 0.3);
        for (const k of [0.3, 0.6, 0.88]) artBand(ctx, level === 2 ? G : ST, b[0] + (f[0] - b[0]) * k, b[1] + (f[1] - b[1]) * k, tube, 0.034 * s, 0.022);
      };
      /* 뒤쪽 레일 → 사이의 전기 → 앞쪽 레일 */
      const first = a.sy >= 0 ? -1 : 1;
      rail(first);
      glow();
      rail(-first);
      void pr;
    },
  };

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

  /* ───── 지진탑: 큰 쇠망치를 들어 올렸다가 땅을 내리친다 ───── */
  const QUAKE = [-0.1, -0.14, -0.18];
  TOWER_ART.quake = {
    body(ctx, level) {
      const y0 = QUAKE[level];
      const h = H('quake', level);
      KIT.square(ctx, { tones: S, top: y0, wTop: 0.34, wBot: 0.38, rows: 1, door: false });
      /* 내리친 자리의 금 */
      for (const [x0, y, x1, y1, x2, y2] of [[-0.02, y0 + 0.02, -0.12, y0 - 0.02, -0.2, y0 + 0.03], [0.03, y0 + 0.03, 0.14, y0 + 0.0, 0.2, y0 + 0.05], [0, y0 + 0.06, -0.03, y0 + 0.1, 0.04, y0 + 0.12]]) {
        artLine(ctx, 'rgba(43,37,54,.55)', [x0, y, x1, y1, x2, y2], 0.014);
      }
      /* 뒤 기둥과 들보 */
      const beam = -h - 0.16;
      artStroke(ctx, D[2], [0, y0 - 0.34 * K, 0, beam], 0.05);
      artStroke(ctx, D[1], [-0.28, beam + 0.06, 0, beam + 0.06 - 0.28 * K, 0.28, beam + 0.06], 0.045);
      /* 돌무더기 */
      for (const [x, y, r] of [[-0.38, 0.4, 0.05], [-0.3, 0.43, 0.04], [0.37, 0.41, 0.045]]) artCircle(ctx, S[1], x, y, r, ART.LW * 0.8);
    },
    top(ctx, level, aim, o) {
      const h = H('quake', level);
      const y0 = QUAKE[level];
      const s = 1 + level * 0.16;
      /* 쉴 때는 높이 들려 있고, 내리치는 순간 바닥까지 떨어진다 */
      const fall = o.recoil > 0.55 ? 1 : o.recoil / 0.55;
      const headBot = -h + 0.12 * s + fall * (y0 + h - 0.14 * s);
      const beam = -h - 0.16;
      const w = 0.17 * s;
      const hh = 0.24 * s;
      artStroke(ctx, W[1], [0, beam + 0.02, 0, headBot - hh + 0.02], 0.055);
      const iron = [I[0], I[1], I[2]];
      artRect(ctx, iron[1], -w, headBot - hh, w * 2, hh, 0.02);
      artRect(ctx, iron[0], -w + 0.012, headBot - hh + 0.012, w * 0.6, hh - 0.024, 0.012, 0);
      artRect(ctx, iron[2], w * 0.45, headBot - hh + 0.012, w * 0.5, hh - 0.024, 0.012, 0);
      const band = level === 2 ? G : ST;
      for (const f of [0.22, 0.78]) artRect(ctx, band[1], -w - 0.012, headBot - hh + hh * f - 0.022, w * 2 + 0.024, 0.044, 0.008, ART.LW * 0.7);
      if (level >= 1) KIT.sign.bolt(ctx, 0, headBot - hh / 2, 0.05 * s, level === 2 ? G[0] : ST[0]);
      if (o.recoil > 0.45) {
        /* 내리친 순간 튀는 흙먼지 */
        const k = (o.recoil - 0.45) / 0.55;
        for (const sgn of [-1, 1]) {
          ctx.globalAlpha = k;
          artCircle(ctx, '#c9aa72', sgn * (0.24 + (1 - k) * 0.2), y0 + 0.02 - (1 - k) * 0.12, 0.06, 0);
          artCircle(ctx, '#e3c792', sgn * (0.14 + (1 - k) * 0.14), y0 - 0.02 - (1 - k) * 0.2, 0.045, 0);
        }
        ctx.globalAlpha = 1;
      }
    },
    front(ctx, level) {
      const y0 = QUAKE[level];
      const beam = -H('quake', level) - 0.16;
      artStroke(ctx, W[0], [-0.28, y0, -0.28, beam + 0.06], 0.055);
      artStroke(ctx, W[2], [0.28, y0, 0.28, beam + 0.06], 0.055);
      const band = level === 2 ? G[1] : I[1];
      for (const sgn of [-1, 1]) {
        artLine(ctx, band, [sgn * 0.31, y0 - 0.1, sgn * 0.25, y0 - 0.1], 0.03);
        artLine(ctx, band, [sgn * 0.31, beam + 0.2, sgn * 0.25, beam + 0.2], 0.03);
      }
    },
  };

  /* ───── 저주탑: 해골을 박은 검은 돌기둥이 주변의 적을 저주한다 ───── */
  const GRIM = ['#8a7ea6', '#574b73', '#352b4a'];
  const CURSE = [-0.6, -0.78, -0.96];
  TOWER_ART.curse = {
    body(ctx, level) {
      const top = CURSE[level];
      const wAt = KIT.square(ctx, { tones: GRIM, top, wTop: 0.13, wBot: 0.3, base: GRIM, door: false });
      /* 뾰족한 머리 */
      artPoly(ctx, GRIM[1], [0, top - 0.14, -0.13, top, 0, top + 0.13 * K]);
      artPoly(ctx, GRIM[2], [0, top - 0.14, 0, top + 0.13 * K, 0.13, top]);
      /* 빛나는 새김글 */
      for (let i = 0; i < 3 + level; i++) {
        const y = top + 0.2 + i * 0.15;
        const w = wAt(y);
        const x = -w * 0.5;
        const yy = y + w * K * 0.5;
        artLine(ctx, '#cba6ff', [x - 0.04, yy - 0.03, x + 0.03, yy - 0.012, x - 0.03, yy + 0.02, x + 0.04, yy + 0.04], 0.014);
      }
      /* 해골 */
      KIT.sign.skull(ctx, 0.1, top + 0.36, 0.055);
      if (level === 2) {
        KIT.sign.skull(ctx, 0.15, top + 0.62, 0.045);
        KIT.sign.skull(ctx, -0.02, top + 0.2 + 0.1, 0.04);
      }
      /* 발치의 뼈와 촛불 */
      artStroke(ctx, ART.bone[0], [-0.4, 0.4, -0.28, 0.44], 0.03);
      artStroke(ctx, ART.bone[0], [-0.38, 0.45, -0.3, 0.39], 0.03);
      for (const x of level === 0 ? [0.34] : [0.3, 0.38]) artRect(ctx, ART.bone[0], x - 0.02, 0.34, 0.04, 0.09, 0.008, ART.LW * 0.7);
      if (level >= 1) {
        /* 양옆으로 솟은 뿔 */
        for (const sgn of [-1, 1]) {
          const pts = artCurve(sgn * 0.14, top + 0.12, sgn * 0.36, top + 0.06, sgn * 0.3, top - 0.16, 8);
          artStroke(ctx, sgn < 0 ? GRIM[0] : GRIM[2], pts, 0.045);
        }
      }
    },
    top(ctx, level, aim, o) {
      const h = H('curse', level);
      const t = o.t;
      const s = 1 + level * 0.18;
      const y = -h - 0.06 + Math.sin(t * 1.8) * 0.02;
      artGlow(ctx, 0, y, 0.3 * s, '154,107,234', 0.45 + 0.1 * Math.sin(t * 3));
      /* 피어오르는 보랏빛 불 */
      for (const x of level === 0 ? [0.34] : [0.3, 0.38]) KIT.fire(ctx, x, 0.345, 0.022, 0.08, t + x * 9, ['#9a6bea', '#e6d4ff']);
      for (let i = 0; i < 3 + level; i++) {
        const k = (t * 0.5 + i * 0.29) % 1;
        ctx.globalAlpha = (1 - k) * 0.8;
        artCircle(ctx, '#cba6ff', Math.sin(i * 2.6 + t) * 0.2, -h + 0.3 - k * 0.5, 0.016, 0);
      }
      ctx.globalAlpha = 1;
      /* 떠 있는 눈: 겨눈 쪽을 본다 */
      artEllipse(ctx, '#ffffff', 0, y, 0.12 * s, 0.075 * s);
      artCircle(ctx, P[1], Math.cos(aim) * 0.04 * s, y + Math.sin(aim) * 0.02 * s, 0.05 * s, ART.LW * 0.7);
      artCircle(ctx, ART.OUT, Math.cos(aim) * 0.05 * s, y + Math.sin(aim) * 0.025 * s, 0.022 * s, 0);
      artCircle(ctx, '#ffffff', Math.cos(aim) * 0.04 * s - 0.015, y - 0.02, 0.012, 0);
    },
  };

  /* ───── 벌집탑: 그루터기 위의 큰 벌집에서 벌 떼가 날아간다 ───── */
  const HONEY = ['#ffe69a', '#f2b53a', '#b87a1a'];
  TOWER_ART.hive = {
    body(ctx, level) {
      const h = H('hive', level);
      artShadow(ctx, 0.06, 0.34, 0.46, 0.15);
      /* 그루터기와 뿌리 */
      for (const [x, y] of [[-0.36, 0.4], [0.36, 0.41], [-0.16, 0.45], [0.2, 0.45]]) artStroke(ctx, D[1], [x * 0.5, 0.3, x, y], 0.06);
      artCylinder(ctx, [W[1], D[0], D[2]], 0, 0.02, 0.34, 0.3, 0.34, { topFill: W[0] });
      for (const r of [0.22, 0.13]) {
        ctx.beginPath();
        ctx.ellipse(0, 0.02, r, r * K, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(90,50,25,.5)';
        ctx.lineWidth = 0.012;
        ctx.stroke();
      }
      /* 층층이 쌓인 벌집: 아래에서 위로 */
      const tiers = 4 + level;
      const hgt = h + 0.2;
      for (let i = 0; i < tiers; i++) {
        const f = (i + 0.5) / tiers;
        const y = 0.0 - f * hgt + 0.05;
        const r = (0.12 + 0.16 * Math.sin(Math.min(1, f * 1.15) * Math.PI) ** 0.7) * (1 + level * 0.05);
        artEllipse(ctx, artRound(ctx, HONEY, 0, r), 0, y, r, (hgt / tiers) * 0.78);
      }
      /* 드나드는 구멍 */
      artEllipse(ctx, '#3a2412', 0.02, -h + 0.02, 0.06, 0.075);
      /* 흘러내린 꿀 */
      for (const [x, y, len] of [[-0.14, -0.05, 0.12], [0.16, -0.14, 0.16], [-0.04, 0.02, 0.08]]) {
        artStroke(ctx, '#ffca4a', [x, y, x, y + len], 0.036);
        artCircle(ctx, '#ffca4a', x, y + len + 0.008, 0.026, ART.LW * 0.6);
      }
      if (level >= 1) {
        /* 꿀단지 */
        artBarrel(ctx, 0.36, 0.43, 0.055, 0.11, [HONEY[0], HONEY[1], HONEY[2]], level === 2 ? G[1] : D[1]);
      }
      if (level === 2) KIT.sign.star(ctx, 0, -h - 0.22, 0.05, G[0]);
    },
    top(ctx, level, aim, o) {
      const h = H('hive', level);
      const t = o.t;
      /* 벌집 둘레를 맴도는 벌들 */
      const n = 4 + level * 2;
      for (let i = 0; i < n; i++) {
        const q = t * (1.6 + (i % 3) * 0.4) + i * 2.1;
        const rx = 0.3 + (i % 2) * 0.08 + o.recoil * 0.08;
        const x = Math.cos(q) * rx;
        const y = -h + 0.1 + Math.sin(q * 1.3) * 0.2 - (i % 3) * 0.08;
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        ctx.beginPath();
        ctx.ellipse(x, y - 0.03, 0.03, 0.016 + 0.01 * Math.sin(t * 60 + i), 0, 0, Math.PI * 2);
        ctx.fill();
        artEllipse(ctx, '#f6bd22', x, y, 0.03, 0.022, ART.LW * 0.6);
        artLine(ctx, ART.OUT, [x, y - 0.02, x, y + 0.02], 0.01);
      }
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
