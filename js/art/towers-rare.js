'use strict';
/* 희귀 등급 탑 — 박격포탑, 작살탑, 표창탑, 얼음창탑, 북탑, 사냥꾼 오두막, 가시덩굴탑.
   무기의 회전축은 (0, -TOWERS[type].levels[level].h). */
(function () {
  const S = ART.stone;
  const W = ART.wood;
  const D = ART.darkwood;
  const I = ART.iron;
  const G = ART.gold;
  const R = ART.red;
  const GR = ART.green;
  const BL = ART.blue;
  const ST = ART.steel;
  const K = ART.K;
  const H = (type, level) => TOWERS[type].levels[level].h;

  /* ───── 박격포탑: 모래주머니를 두른 진지에서 포탄을 높이 쏘아 올린다 ───── */
  function sandbags(ctx, y, r, back) {
    for (let k = -3; k <= 3; k++) {
      const a = (back ? -Math.PI / 2 : Math.PI / 2) + k * 0.44;
      const x = Math.cos(a) * r;
      const yy = y + Math.sin(a) * r * K;
      artRect(ctx, back ? ART.sand[2] : k < 0 ? ART.sand[0] : ART.sand[1], x - 0.075, yy - 0.05, 0.15, 0.085, 0.035, ART.LW * 0.8);
      artLine(ctx, 'rgba(90,70,40,.4)', [x - 0.03, yy - 0.035, x - 0.03, yy + 0.02], 0.01);
    }
  }
  TOWER_ART.mortar = {
    body(ctx, level) {
      artPlinth(ctx, S, ART.sand[2]);
      if (level === 2) {
        /* 3단: 돌로 쌓은 낮은 벽 */
        artCylinder(ctx, S, 0, -0.06, 0.2, 0.34, 0.36, { topFill: '#5a5564' });
        artCourses(ctx, 0, -0.06, 0.2, 0.34, 0.36, 2);
        KIT.crenel(ctx, S, -0.06, 0.34, true);
        artLine(ctx, ART.OUT, [-0.3, -0.1, -0.3, -0.5], 0.026);
        artFlag(ctx, R, -0.3, -0.5, -0.2, 0.12, 0);
      } else {
        sandbags(ctx, 0.14, 0.33, true);
        if (level === 1) sandbags(ctx, 0.06, 0.31, true);
        artEllipse(ctx, '#6b5f4a', 0, 0.2, 0.3, 0.3 * K, 0);
      }
      /* 포탄 상자 */
      artRect(ctx, W[1], 0.27, 0.33, 0.15, 0.1, 0.01);
      artCircle(ctx, '#3a3440', 0.31, 0.32, 0.035, ART.LW * 0.7);
      artCircle(ctx, '#3a3440', 0.38, 0.32, 0.035, ART.LW * 0.7);
    },
    top(ctx, level, aim, o) {
      const h = H('mortar', level);
      const a = artAim(aim);
      const s = 1 + level * 0.14;
      const kick = o.recoil * 0.05;
      const bx = -a.fx * 0.05;
      const by = -h + 0.2 + kick;
      const mx = a.fx * 0.13 * s;
      const my = -h - 0.14 * s + a.fy * 0.1 + kick;
      /* 받침 다리 */
      artStroke(ctx, I[2], [mx * 0.6, (by + my) / 2, a.fx * 0.2 + a.sx * 0.12, 0.2 + a.sy * 0.1], 0.026);
      artStroke(ctx, I[2], [mx * 0.6, (by + my) / 2, a.fx * 0.2 - a.sx * 0.12, 0.2 - a.sy * 0.1], 0.026);
      const tube = artTube(ctx, [I[0], I[1], I[2]], bx, by, mx, my, 0.1 * s, 0.085 * s, 0.7, 0.3);
      artBand(ctx, level === 2 ? G : ST, bx + (mx - bx) * 0.3, by + (my - by) * 0.3, tube, 0.1 * s, 0.035);
      artBand(ctx, level === 2 ? G : ST, mx - (mx - bx) * 0.08, my - (my - by) * 0.08, tube, 0.09 * s, 0.03);
      artEllipse(ctx, '#2a2026', mx, my, 0.07 * s, 0.045 * s, ART.LW * 0.8);
      if (o.recoil > 0.4) {
        artGlow(ctx, mx, my - 0.06, 0.3, '255,190,90', o.recoil * 0.8);
        KIT.fire(ctx, mx, my, 0.06, 0.22 * o.recoil, o.t, ['#ff9226', '#fff1a8']);
      }
      if (o.recoil > 0.05) KIT.smoke(ctx, mx, my - 0.08, o.t, '#d9dbe2', 2);
    },
    front(ctx, level) {
      if (level === 2) KIT.crenel(ctx, S, -0.06, 0.34, false);
      else {
        if (level === 1) sandbags(ctx, 0.12, 0.34, false);
        sandbags(ctx, 0.2, 0.36, false);
      }
    },
  };

  /* ───── 작살탑: 밧줄 달린 작살로 적을 꿰어 붙잡는다 ───── */
  const HARP = [-0.5, -0.68, -0.86];
  TOWER_ART.harpoon = {
    body(ctx, level) {
      const top = HARP[level];
      const rope = '#e3c792';
      const rAt = KIT.round(ctx, {
        tones: level === 2 ? ['#ffffff', '#e8edf4', '#b9c3d4'] : [D[0], D[1], D[2]], top, rTop: 0.22, rBot: 0.32, staves: level < 2, rows: level === 2 ? 5 : 0,
        hoops: [[top + 0.08, rope, 0.035], [0.08, rope, 0.035]],
        door: D,
      });
      if (level >= 1) {
        /* 파란 띠 */
        const y = (top + KIT.BASE) / 2;
        artHoop(ctx, 0, y, rAt(y) + 0.004, BL[1], 0.09, true);
      }
      /* 구명 부표와 닻 */
      artCircle(ctx, R[1], 0.15, top + 0.3, 0.07);
      artCircle(ctx, level === 2 ? '#e8edf4' : D[1], 0.15, top + 0.3, 0.032, ART.LW * 0.7);
      artLine(ctx, '#ffffff', [0.15, top + 0.235, 0.15, top + 0.262], 0.03);
      artLine(ctx, '#ffffff', [0.15, top + 0.338, 0.15, top + 0.365], 0.03);
      artStroke(ctx, I[1], [-0.34, 0.26, -0.34, 0.42], 0.028);
      artStroke(ctx, I[1], [-0.42, 0.37, -0.34, 0.43, -0.26, 0.37], 0.028);
      artCircle(ctx, I[0], -0.34, 0.25, 0.028, ART.LW * 0.7);
      artLantern(ctx, -0.16, top + 0.3, 0.85);
      /* 마루와 밧줄 타래 */
      artCylinder(ctx, W, 0, top - 0.04, top + 0.03, 0.27, 0.23, { topFill: W[0] });
      for (const r of [0.07, 0.045]) artEllipse(ctx, rope, 0.14, top - 0.045, r, r * K, ART.LW * 0.7);
    },
    top(ctx, level, aim, o) {
      const h = H('harpoon', level);
      const a = artAim(aim);
      const s = 1 + level * 0.1;
      const P = (u, v) => [a.fx * u + a.sx * v, -h + a.fy * u + a.sy * v];
      artCylinder(ctx, [I[0], I[1], I[2]], 0, -h + 0.07, -h + 0.14, 0.08, 0.09, { topFill: I[0] });
      /* 개머리, 활대, 시위 */
      const back = P(-0.2 * s, 0);
      const front = P(0.2 * s, 0);
      artTube(ctx, level === 2 ? [BL[0], BL[1], BL[2]] : W, back[0], back[1], front[0], front[1], 0.05 * s, 0.045 * s, 0.6, 0.3);
      const l = P(0.1 * s, -0.2 * s);
      const r = P(0.1 * s, 0.2 * s);
      const mid = P(0.2 * s, 0);
      artStroke(ctx, ST[1], [l[0], l[1], mid[0], mid[1], r[0], r[1]], 0.032);
      const pull = P(0.2 * s - (1 - o.recoil) * 0.24 * s, 0);
      artLine(ctx, '#f6f0dc', [l[0], l[1], pull[0], pull[1], r[0], r[1]], 0.012);
      if (o.recoil < 0.5) {
        /* 미늘 달린 작살 */
        const tail = P(-0.06 * s, 0);
        const tip = P(0.4 * s, 0);
        artStroke(ctx, ST[1], [tail[0], tail[1] - 0.02, tip[0] - a.fx * 0.1, tip[1] - a.fy * 0.1 - 0.02], 0.026);
        const b0 = P(0.26 * s, -0.07);
        const b1 = P(0.26 * s, 0.07);
        artPoly(ctx, ST[0], [tip[0], tip[1] - 0.02, b0[0], b0[1] - 0.02, P(0.3 * s, 0)[0], P(0.3 * s, 0)[1] - 0.02, b1[0], b1[1] - 0.02], ART.LW * 0.8);
      }
    },
  };

  /* ───── 표창탑: 층층이 기와를 얹은 누각 꼭대기에서 표창이 돈다 ───── */
  const PLASTER = ['#f7f1e3', '#e2d9c6', '#b9af9a'];
  const TILE = ['#6a6478', '#454052', '#2c2935'];
  TOWER_ART.shuriken = {
    body(ctx, level) {
      artShadow(ctx, 0.07, 0.33, 0.47, 0.15);
      artBox(ctx, [S[1], S[1], S[2]], 0, 0.24, 0.32, 0.43, 0.45, { topFill: S[1] });
      const trim = level === 2 ? G[1] : R[1];
      /* 층: 아래에서 위로. 층마다 몸통과 그 위의 기와 */
      let bot = KIT.GROUND;
      let w = 0.32;
      for (let k = 0; k <= level; k++) {
        const top = k === 0 ? -0.3 : bot - 0.2;
        const wt = w - 0.03;
        artBox(ctx, PLASTER, 0, top, bot, wt, w, { top: false });
        /* 검은 나무 기둥과 붉은 들보 */
        for (const side of [-1, 1]) {
          artLine(ctx, D[2], [side * wt, top, side * w, bot], 0.03);
          artLine(ctx, R[2], [side * wt * 0.5, top + wt * K * 0.5 + 0.05, side * w * 0.5, bot + w * K * 0.5 - 0.02], 0.016);
        }
        artLine(ctx, D[2], [0, top + wt * K, 0, bot + w * K], 0.034);
        if (k === 0) {
          artPoly(ctx, D[1], [-0.2, 0.3, -0.2, 0.12, -0.1, 0.16, -0.1, 0.345]);
          KIT.slit(ctx, () => 0.3, -0.12, 1, 0.5, 0.12, '#ffd66b');
        } else {
          KIT.slit(ctx, () => wt, top + 0.04, -1, 0.5, 0.09, '#ffd66b');
        }
        const ey = top + 0.045;
        KIT.eaves(ctx, TILE, ey, wt + 0.13, 0.14, k === level ? 0.05 : wt - 0.07, trim);
        bot = ey - 0.14;
        w = wt - 0.07;
      }
      /* 꼭대기 기둥 */
      artStroke(ctx, D[1], [0, bot + 0.04, 0, -H('shuriken', level) + 0.02], 0.036);
      artLantern(ctx, -0.33, 0.12, 0.85);
      artLantern(ctx, 0.33, 0.12, 0.85);
    },
    top(ctx, level, aim, o) {
      const h = H('shuriken', level);
      const s = 0.2 + level * 0.03;
      const spin = o.t * (2 + o.recoil * 26);
      /* 네 갈래 표창: 비스듬히 누워 돈다 */
      const pts = [];
      for (let i = 0; i < 8; i++) {
        const r = i % 2 ? s * 0.34 : s;
        const q = spin + (i * Math.PI) / 4;
        pts.push(Math.cos(q) * r, -h + Math.sin(q) * r * 0.62);
      }
      artPoly(ctx, level === 2 ? G[0] : ST[0], pts);
      artPoly(ctx, level === 2 ? G[1] : ST[1], [pts[0], pts[1], pts[2], pts[3], 0, -h, pts[14], pts[15]], 0);
      artCircle(ctx, level === 2 ? R[1] : I[1], 0, -h, s * 0.2, ART.LW * 0.8);
      if (o.recoil > 0.3) artSparkle(ctx, Math.cos(aim) * s, -h + Math.sin(aim) * s * 0.62, 0.05, '#ffffff', o.recoil);
    },
  };

  /* ───── 얼음창탑: 얼어붙은 탑 위에서 얼음창을 쏜다 ───── */
  const FROSTED = ['#f6fcff', '#d2ebf8', '#9cc6e0'];
  const ICE = ART.ice;
  const ICI = [-0.5, -0.68, -0.86];
  /* 얼음 결정 한 덩이: (x, y) 는 뿌리, (dx, dy) 는 뻗는 방향과 길이 */
  function shard(ctx, x, y, dx, dy, w) {
    const l = Math.hypot(dx, dy);
    const nx = (-dy / l) * w;
    const ny = (dx / l) * w;
    artPoly(ctx, ICE[1], [x - nx, y - ny, x + dx * 0.55 - nx * 1.2, y + dy * 0.55 - ny * 1.2, x + dx, y + dy, x + dx * 0.55 + nx * 1.2, y + dy * 0.55 + ny * 1.2, x + nx, y + ny]);
    artPoly(ctx, ICE[0], [x - nx, y - ny, x + dx * 0.55 - nx * 1.2, y + dy * 0.55 - ny * 1.2, x + dx, y + dy, x, y], 0);
  }
  /* 꼭대기 테두리에 돋은 얼음 왕관. front = 앞쪽 것만 / 뒤쪽 것만 */
  function iceCrown(ctx, y, r, front) {
    for (let k = -2; k <= 2; k++) {
      const a = (front ? Math.PI / 2 : -Math.PI / 2) + k * 0.6;
      const x = Math.cos(a) * r;
      shard(ctx, x, y + Math.sin(a) * r * K + 0.01, Math.cos(a) * 0.07, -0.11 - (k % 2 ? 0 : 0.04), 0.03);
    }
  }
  TOWER_ART.icicle = {
    body(ctx, level) {
      const top = ICI[level];
      const rAt = KIT.round(ctx, {
        tones: FROSTED, top, rTop: 0.2, rBot: 0.31, rows: 3 + level, rgb: '60,110,160', plinth: FROSTED, plinthTop: '#ffffff',
        hoops: level >= 1 ? [[top + 0.1, level === 2 ? G[1] : BL[1], 0.035]] : [],
        door: BL, lit: '#bfeaff',
      });
      if (level === 2) KIT.banner(ctx, 0, top + 0.22, 0.085, 0.3, BL, (c, x, y) => KIT.sign.snow(c, x, y, 0.04));
      else KIT.sign.snow(ctx, 0, top + 0.3, 0.04, BL[1]);
      /* 처마에 매달린 고드름 */
      const lip = rAt(top) + 0.04;
      artCylinder(ctx, FROSTED, 0, top - 0.03, top + 0.04, lip, rAt(top), { topFill: '#ffffff' });
      for (let k = -2; k <= 2; k++) {
        const a = Math.PI / 2 + k * 0.5;
        const x = Math.cos(a) * lip;
        const y = top - 0.03 + Math.sin(a) * lip * K;
        artPoly(ctx, ICE[1], [x - 0.025, y, x, y + 0.09 + (k % 2 ? 0 : 0.04), x + 0.025, y], ART.LW * 0.6);
      }
      if (level >= 1) {
        /* 탑 어깨에서 자라난 얼음 결정 */
        const sy = top + 0.2;
        for (const sgn of [-1, 1]) {
          shard(ctx, sgn * rAt(sy), sy + 0.03, sgn * 0.2, -0.2, 0.04);
          shard(ctx, sgn * (rAt(sy) + 0.01), sy + 0.07, sgn * 0.21, -0.03, 0.032);
          if (level === 2) shard(ctx, sgn * rAt(sy + 0.3), sy + 0.34, sgn * 0.17, -0.12, 0.034);
        }
      }
      if (level === 2) iceCrown(ctx, top - 0.03, lip, false);
      /* 발치의 얼음 조각 */
      for (const [x, y, hh] of level === 2 ? [[-0.36, 0.4, 0.22], [0.36, 0.41, 0.19], [-0.27, 0.43, 0.12], [0.28, 0.44, 0.1]] : [[-0.36, 0.4, 0.14], [0.36, 0.41, 0.11], [-0.27, 0.43, 0.08]]) {
        artPoly(ctx, ICE[1], [x - 0.04, y, x - 0.01, y - hh, x + 0.04, y]);
        artPoly(ctx, ICE[0], [x - 0.04, y, x - 0.01, y - hh, x - 0.008, y], 0);
      }
      /* 받침 */
      artTube(ctx, [ST[0], ST[1], ST[2]], 0, top - 0.02, 0, -H('icicle', level) + 0.08, 0.035, 0.03, 0, 0);
    },
    top(ctx, level, aim, o) {
      const h = H('icicle', level);
      const a = artAim(aim);
      const s = 1 + level * 0.12;
      const P = (u, v) => [a.fx * u + a.sx * v, -h + a.fy * u + a.sy * v];
      artGlow(ctx, 0, -h, 0.3, '156,221,248', 0.3 + 0.1 * Math.sin(o.t * 3));
      /* 창을 쥔 갈퀴 */
      for (const sgn of [-1, 1]) {
        const p0 = P(-0.06, sgn * 0.07);
        const p1 = P(0.12 * s, sgn * 0.12 * s);
        artStroke(ctx, level === 2 ? G[1] : ST[1], [0, -h + 0.08, p0[0], p0[1] + 0.03, p1[0], p1[1]], 0.03);
      }
      if (o.recoil < 0.6) {
        /* 얼음창: 겨눈 쪽으로 뾰족하다 */
        const slide = -o.recoil * 0.12;
        const tip = P(0.34 * s + slide, 0);
        const tail = P(-0.2 * s + slide, 0);
        const l = P(-0.04 + slide, -0.065 * s);
        const r = P(-0.04 + slide, 0.065 * s);
        artPoly(ctx, ICE[1], [tip[0], tip[1], l[0], l[1] - 0.02, tail[0], tail[1], r[0], r[1] + 0.02]);
        artPoly(ctx, ICE[0], [tip[0], tip[1], l[0], l[1] - 0.02, tail[0], tail[1]], 0);
        artLine(ctx, '#ffffff', [tail[0], tail[1], tip[0], tip[1]], 0.012);
      }
      for (let i = 0; i < level; i++) {
        /* 떠도는 얼음 조각 */
        const q = o.t * 1.3 + i * Math.PI;
        const x = Math.cos(q) * 0.24;
        const y = -h + 0.06 + Math.sin(q) * 0.07;
        artPoly(ctx, ICE[1], [x, y - 0.06, x + 0.025, y, x, y + 0.06, x - 0.025, y], ART.LW * 0.6);
      }
    },
    front(ctx, level) {
      if (level === 2) iceCrown(ctx, ICI[level] - 0.03, 0.2 + 0.04, true);
    },
  };

  /* ───── 가시덩굴탑: 살아 있는 덩굴이 사거리 안의 적을 쉬지 않고 찌른다 ───── */
  const VINE = ['#8fd97f', '#4fa651', '#2f7239'];
  const PETAL = ['#ff9bc0', '#e8558c', '#a82c5c'];
  function thorns(ctx, pts, every) {
    for (let i = 2; i < pts.length - 2; i += every * 2) {
      const dx = pts[i + 2] - pts[i - 2];
      const dy = pts[i + 3] - pts[i - 1];
      const n = Math.hypot(dx, dy) || 1;
      const sgn = (i / 2) % 2 ? 1 : -1;
      const nx = (-dy / n) * sgn;
      const ny = (dx / n) * sgn;
      artPoly(ctx, '#e9dcb6', [pts[i] - (dx / n) * 0.02, pts[i + 1] - (dy / n) * 0.02, pts[i] + nx * 0.07, pts[i + 1] + ny * 0.07, pts[i] + (dx / n) * 0.02, pts[i + 1] + (dy / n) * 0.02], ART.LW * 0.6);
    }
  }
  TOWER_ART.thorn = {
    body(ctx, level) {
      const h = H('thorn', level);
      artShadow(ctx, 0.05, 0.33, 0.45, 0.14);
      /* 흙무더기와 뿌리 */
      artEllipse(ctx, '#7a5a3a', 0, 0.3, 0.42, 0.16);
      artEllipse(ctx, '#96704a', -0.04, 0.27, 0.3, 0.1, 0);
      for (const [x1, y1, cx, cy] of [[-0.44, 0.38, -0.3, 0.2], [0.44, 0.39, 0.3, 0.22], [-0.2, 0.46, -0.16, 0.3], [0.22, 0.46, 0.14, 0.32]]) {
        const pts = artCurve(0, 0.22, cx, cy, x1, y1, 8);
        artStroke(ctx, VINE[2], pts, 0.045);
        thorns(ctx, pts, 2);
      }
      /* 서로 감긴 두 줄기 */
      const n = 14;
      const a = [];
      const b = [];
      for (let i = 0; i <= n; i++) {
        const f = i / n;
        const y = 0.24 - f * (h + 0.16);
        const amp = 0.1 * (1 - f * 0.5);
        a.push(Math.sin(f * 7) * amp, y);
        b.push(-Math.sin(f * 7) * amp, y);
      }
      artStroke(ctx, VINE[2], b, 0.085 - level * 0.004);
      thorns(ctx, b, 2);
      artStroke(ctx, VINE[1], a, 0.095);
      artLine(ctx, VINE[0], a.map((v, i) => (i % 2 ? v : v - 0.02)), 0.02);
      thorns(ctx, a, 2);
      /* 잎 */
      const leaves = level === 0 ? [[-0.16, -0.06, -1]] : level === 1 ? [[-0.17, -0.1, -1], [0.17, -0.3, 1]] : [[-0.17, -0.1, -1], [0.17, -0.34, 1], [-0.16, -0.58, -1]];
      for (const [x, y, sgn] of leaves) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(sgn * 1.1);
        KIT.sign.leaf(ctx, 0, 0, 0.09, sgn < 0 ? VINE[0] : VINE[1]);
        ctx.restore();
      }
    },
    top(ctx, level, aim, o) {
      const h = H('thorn', level);
      const t = o.t;
      const s = 1 + level * 0.18;
      const open = 0.75 + 0.12 * Math.sin(t * 3) + o.recoil * 0.2;
      /* 휘젓는 덩굴손 */
      for (let i = 0; i < 2 + level; i++) {
        const q = (i / (2 + level)) * Math.PI * 2 + 0.6;
        const wav = Math.sin(t * (2 + o.recoil * 5) + i * 2) * 0.08;
        const pts = artCurve(0, -h + 0.14, Math.cos(q) * 0.2, -h + 0.02 + wav, Math.cos(q) * (0.36 + level * 0.04), -h + 0.2 + Math.sin(q) * 0.1 + wav, 8);
        artStroke(ctx, VINE[1], pts, 0.03);
        thorns(ctx, pts, 2);
      }
      /* 꽃받침과 꽃잎, 한가운데의 꽃술 */
      artGlow(ctx, 0, -h, 0.26 * s, '232,85,140', 0.22 + o.recoil * 0.15);
      for (let i = 0; i < 6; i++) {
        const q = (i * Math.PI) / 3 + 0.2;
        const px = Math.cos(q) * 0.11 * s * open;
        const py = -h + Math.sin(q) * 0.08 * s * open;
        artEllipse(ctx, i % 2 ? PETAL[1] : PETAL[0], px, py, 0.075 * s, 0.05 * s, ART.LW * 0.8, q);
      }
      artCircle(ctx, '#ffd23c', 0, -h, 0.055 * s);
      artCircle(ctx, '#fff6cf', -0.015, -h - 0.015, 0.02 * s, 0);
      if (level === 2) {
        /* 곁에 맺힌 봉오리 */
        for (const sgn of [-1, 1]) {
          artStroke(ctx, VINE[1], [sgn * 0.05, -h + 0.16, sgn * 0.2, -h + 0.02], 0.03);
          artEllipse(ctx, PETAL[1], sgn * 0.22, -h - 0.02, 0.05, 0.065, ART.LW * 0.8);
        }
      }
    },
  };
})();
