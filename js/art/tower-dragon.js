'use strict';
/* 용의 탑 — 탑 꼭대기에 깃든 용이 넓은 불길을 내뿜는다.
   1단: 그을린 낮은 탑에 깃든 주황빛 새끼 용.
   2단: 탑을 꼬리로 감은 붉은 용. 등에 가시가 돋고 날개가 커졌다.
   3단: 금테 두른 높은 탑과 보물 더미. 금빛 뿔의 검붉은 용이 가슴에 불을 품는다. */
(function () {
  const G = ART.gold;
  const R = ART.red;
  const BONE = ART.bone;
  const K = ART.K;
  const H = (level) => TOWERS.dragon.levels[level].h;
  const LAIR = ['#b9a6a6', '#8a7474', '#5d4a4c'];
  const TOP = [-0.44, -0.6, -0.76];
  /* 단계마다 용의 비늘 색이 짙어진다 */
  const SCALES = [
    ['#ffb08a', '#ee6a3c', '#a83e22'],
    ['#ff8a6b', '#d9412f', '#96231c'],
    ['#f0694c', '#b8281f', '#6e1414'],
  ];
  const BELLY = ['#ffd9a8', '#ffd9a8', '#ffd45a'];
  const RIM = 0.28;

  /* 흉벽을 움켜쥔 앞발 */
  function paw(ctx, x, y, tones, claw) {
    artRect(ctx, tones[1], x - 0.05, y - 0.045, 0.1, 0.075, 0.03);
    for (const dx of [-0.03, 0, 0.03]) artPoly(ctx, claw, [x + dx - 0.013, y + 0.022, x + dx + 0.013, y + 0.022, x + dx, y + 0.07], ART.LW * 0.7);
  }

  TOWER_ART.dragon = {
    body(ctx, level) {
      const top = TOP[level];
      const sc = SCALES[level];
      const rAt = KIT.round(ctx, {
        tones: LAIR, top, rTop: 0.24, rBot: 0.33, rows: 3 + level, plinth: LAIR,
        hoops: level === 2 ? [[top + 0.12, G[1], 0.04], [0.1, G[1], 0.03]] : level === 1 ? [[top + 0.12, R[1], 0.04]] : [],
        door: [R[0], R[1], R[2]], lit: '#ff9226',
      });
      artGlow(ctx, 0, 0.26, 0.13, '255,146,38', 0.4);
      if (level === 2) KIT.banner(ctx, 0, top + 0.2, 0.085, 0.3, R, (c, x, y) => KIT.sign.flame(c, x, y, 0.045));
      /* 불빛이 새는 창과 그을음 */
      const wy = top + 0.3 + (level === 2 ? 0.36 : 0);
      for (const x of [-0.14, 0.14]) {
        artPoly(ctx, 'rgba(40,24,24,.45)', [x - 0.04, wy + 0.01, x + 0.04, wy + 0.01, x + 0.012, wy - 0.12, x - 0.02, wy - 0.09], 0);
        artRect(ctx, ART.OUT, x - 0.034, wy, 0.068, 0.13, 0.034, 0);
        artRect(ctx, '#ff9226', x - 0.019, wy + 0.016, 0.038, 0.098, 0.019, 0);
      }
      KIT.crenel(ctx, LAIR, top, RIM, true);
      artCylinder(ctx, LAIR, 0, top - 0.02, top + 0.05, RIM + 0.005, rAt(top), { topFill: '#4a3a3c' });
      /* 뼈와 해골 */
      artStroke(ctx, BONE[0], [-0.43, 0.4, -0.3, 0.44], 0.032);
      KIT.sign.skull(ctx, -0.31, 0.37, 0.04);
      /* 보물 */
      KIT.sign.coin(ctx, 0.34, 0.43, 0.032);
      KIT.sign.coin(ctx, 0.4, 0.39, 0.032);
      if (level >= 1) KIT.sign.coin(ctx, 0.29, 0.38, 0.032);
      if (level === 2) {
        artPile(ctx, 0.37, 0.33, 0.04, G);
        artPile(ctx, -0.4, 0.31, 0.034, G);
        artPoly(ctx, R[1], [0.26, 0.44, 0.285, 0.4, 0.31, 0.44, 0.285, 0.47], ART.LW * 0.7);
      }
      if (level >= 1) {
        /* 탑을 감은 꼬리 */
        const y = top + 0.27;
        const r = rAt(y) + 0.02;
        artHoop(ctx, 0, y, r, sc[1], 0.075, true);
        artHoop(ctx, 0, y + 0.02, r, BELLY[level], 0.016);
        for (const k of [-1, 0, 1]) {
          const a = Math.PI / 2 + k * 0.7;
          const x = Math.cos(a) * r;
          const yy = y + Math.sin(a) * r * K - 0.035;
          artPoly(ctx, sc[2], [x - 0.03, yy, x + 0.03, yy, x, yy - 0.06], ART.LW * 0.7);
        }
        artPoly(ctx, sc[2], [r - 0.01, y - 0.03, r + 0.15, y - 0.13, r + 0.1, y - 0.02, r + 0.14, y + 0.07, r - 0.01, y + 0.03]);
      }
    },

    top(ctx, level, aim, o) {
      const h = H(level);
      const top = TOP[level];
      const sc = SCALES[level];
      const horn = level === 2 ? [G[0], G[1]] : [BONE[0], BONE[1]];
      const t = o.t;
      const s = 1 + level * 0.14;
      const a = artAim(aim);
      const firing = o.recoil > 0.25;
      const Q = (u, v, up) => [a.fx * u + a.sx * v, -h + a.fy * u + a.sy * v - (up || 0)];

      /* 날개: 뒤에서 천천히 퍼덕인다. 단계가 오를수록 커진다 */
      const flap = Math.sin(t * 2.4) * 0.05 + (firing ? 0.06 : 0);
      for (const sgn of [-1, 1]) {
        const k = 0.28 + level * 0.075;
        const rx = sgn * 0.06;
        const ry = top - 0.1;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.quadraticCurveTo(rx + sgn * k * 0.5, ry - 0.34 - flap, rx + sgn * k * 1.35, ry - 0.3 - flap);
        ctx.quadraticCurveTo(rx + sgn * k * 1.25, ry - 0.14, rx + sgn * k * 1.1, ry - 0.02);
        ctx.quadraticCurveTo(rx + sgn * k * 0.95, ry - 0.1, rx + sgn * k * 0.75, ry + 0.04);
        ctx.quadraticCurveTo(rx + sgn * k * 0.55, ry - 0.06, rx + sgn * k * 0.36, ry + 0.07);
        ctx.closePath();
        artFill(ctx, sgn < 0 ? sc[1] : sc[2]);
        /* 날개 뼈 */
        const bone = level === 2 ? G[1] : sc[0];
        artLine(ctx, bone, artCurve(rx, ry, rx + sgn * k * 0.5, ry - 0.34 - flap, rx + sgn * k * 1.35, ry - 0.3 - flap, 8), 0.024);
        artLine(ctx, bone, [rx + sgn * k * 0.3, ry - 0.2 - flap * 0.6, rx + sgn * k * 1.1, ry - 0.02], 0.016);
        artLine(ctx, bone, [rx + sgn * k * 0.3, ry - 0.2 - flap * 0.6, rx + sgn * k * 0.75, ry + 0.04], 0.016);
        artCircle(ctx, horn[0], rx + sgn * k * 1.35, ry - 0.3 - flap, 0.022, ART.LW * 0.7);
      }

      /* 웅크린 몸통 */
      artEllipse(ctx, artRound(ctx, sc, 0, 0.2), 0, top - 0.06, 0.2 * s, 0.13 * s);
      artEllipse(ctx, BELLY[level], 0.0, top - 0.02, 0.11 * s, 0.07 * s, 0);
      if (level === 2) artGlow(ctx, 0, top - 0.03, 0.2, '255,170,60', 0.35 + 0.15 * Math.sin(t * 3) + (firing ? 0.3 : 0));

      const mouth = () => {
        const m = Q(0.42 * s, 0, -0.03);
        if (!firing) {
          KIT.fire(ctx, m[0], m[1] + 0.02, 0.03, 0.09, t);
          if (level >= 1) KIT.smoke(ctx, m[0], m[1] - 0.06, t, '#d9dbe2', 2);
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
        const pts = artCurve(0, top - 0.1, -a.fx * 0.1, (top - h) / 2 - 0.12, b[0], b[1], 10);
        if (level >= 1) {
          /* 목덜미의 가시: 목선에 가려 끝만 보인다 */
          for (const i of [3, 5, 7]) {
            const x = pts[i * 2];
            const y = pts[i * 2 + 1];
            let tx = pts[i * 2 + 2] - pts[i * 2 - 2];
            let ty = pts[i * 2 + 3] - pts[i * 2 - 1];
            const l = Math.hypot(tx, ty) || 1;
            tx /= l;
            ty /= l;
            let nx = -ty;
            let ny = tx;
            if (ny > 0 || (Math.abs(ny) < 0.2 && nx * a.fx > 0)) { nx = -nx; ny = -ny; }
            artPoly(ctx, sc[2], [x - tx * 0.04 * s, y - ty * 0.04 * s, x + tx * 0.04 * s, y + ty * 0.04 * s, x + nx * 0.125 * s, y + ny * 0.125 * s], ART.LW * 0.8);
          }
        }
        artStroke(ctx, sc[1], pts, 0.11 * s);
        artLine(ctx, BELLY[level], artCurve(0.02, top - 0.08, -a.fx * 0.08 + 0.03, (top - h) / 2 - 0.1, b[0] + 0.02, b[1] + 0.03, 10), 0.03 * s);
      };
      const head = () => {
        const b = Q(0.04 * s, 0);
        const tip = Q(0.4 * s, 0, firing ? 0.015 : 0);
        const j0 = Q(0.1 * s, 0, -0.05 * s);
        const j1 = Q(0.36 * s, 0, -(0.06 + (firing ? 0.06 : 0.02)) * s);
        artTube(ctx, [sc[1], sc[2], sc[2]], j0[0], j0[1], j1[0], j1[1], 0.05 * s, 0.03 * s, 0.5, 0.7);
        const tube = artTube(ctx, sc, b[0], b[1], tip[0], tip[1], 0.11 * s, 0.07 * s, 0.85, 0.6);
        if (Math.abs(a.fx) > 0.4) {
          for (const f of [0.55, 0.75, 0.92]) {
            const r = (0.11 + (0.07 - 0.11) * f) * s * 0.92;
            const x = b[0] + (tip[0] - b[0]) * f - tube.nx * r;
            const y = b[1] + (tip[1] - b[1]) * f - tube.ny * r;
            artPoly(ctx, BONE[0], [x - tube.ux * 0.02, y - tube.uy * 0.02, x + tube.ux * 0.02, y + tube.uy * 0.02, x - tube.nx * 0.045, y - tube.ny * 0.045 + 0.01], ART.LW * 0.6);
          }
        }
        /* 콧등 */
        const nose = Q(0.37 * s, 0, 0.05 * s);
        artCircle(ctx, sc[0], nose[0], nose[1], 0.028 * s, ART.LW * 0.7);
        for (const sgn of [-1, 1]) {
          const hb = Q(0.05 * s, sgn * 0.065 * s, 0.07 * s);
          const mid = Q(-0.03 * s, sgn * 0.09 * s, 0.16 * s);
          const ht = Q(-0.15 * s, sgn * 0.1 * s, 0.14 * s);
          artPoly(ctx, sgn < 0 ? horn[0] : horn[1], [hb[0] - 0.036, hb[1] + 0.012, mid[0] - 0.012, mid[1] - 0.012, ht[0], ht[1], mid[0] + 0.02, mid[1] + 0.028, hb[0] + 0.036, hb[1] + 0.012], ART.LW * 0.8);
          if (a.toward >= -0.2) {
            const e = Q(0.17 * s, sgn * 0.07 * s, 0.05 * s);
            artCircle(ctx, ART.OUT, e[0], e[1], 0.034 * s, 0);
            artCircle(ctx, firing ? '#fff6cf' : '#ffd23c', e[0], e[1], 0.022 * s, 0);
            artEllipse(ctx, ART.OUT, e[0] + a.fx * 0.004, e[1], 0.006 * s, 0.016 * s, 0);
          }
        }
      };
      if (a.toward < -0.2) { mouth(); head(); neck(); } else { neck(); head(); mouth(); }
    },

    front(ctx, level) {
      const top = TOP[level];
      const sc = SCALES[level];
      KIT.crenel(ctx, LAIR, top, RIM, false);
      if (level === 2) {
        /* 흉벽 머리의 금 */
        for (let k = -2; k <= 2; k++) {
          const a = Math.PI / 2 + k * 0.6;
          artRect(ctx, G[1], Math.cos(a) * RIM - 0.045, top + Math.sin(a) * RIM * K - 0.085, 0.09, 0.028, 0.008, ART.LW * 0.7);
        }
      }
      /* 흉벽 사이로 내민 앞발 */
      const claw = level === 2 ? G[0] : BONE[0];
      for (const sgn of [-1, 1]) paw(ctx, sgn * 0.085, top + RIM * K - 0.015, sc, claw);
    },
  };
})();
