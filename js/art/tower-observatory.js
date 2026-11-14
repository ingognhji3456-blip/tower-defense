'use strict';
/* 천문대 — 둥근 지붕 틈으로 내민 망원경으로 운석을 불러 떨군다.
   1단: 낮은 돌탑에 구리 지붕과 작은 망원경.
   2단: 지붕 밑에 난간 두른 마루를 내고, 보조경을 단 긴 망원경으로 바꿨다.
   3단: 금빛 지붕의 높은 탑. 별자리 걸개와 혼천의, 지붕 둘레를 도는 행성. */
(function () {
  const S = ART.stone;
  const W = ART.wood;
  const D = ART.darkwood;
  const I = ART.iron;
  const G = ART.gold;
  const BL = ART.blue;
  const R = ART.red;
  const K = ART.K;
  const H = (level) => TOWERS.observatory.levels[level].h;
  const COPPER = ['#8fe0c8', '#4ba88f', '#2c6f60'];
  const TOP = [-0.4, -0.56, -0.74];
  const NIGHT = '#27397a';

  /* 밤하늘이 비치는 둥근 창 */
  function porthole(ctx, x, y, r) {
    artCircle(ctx, G[2], x, y, r);
    artCircle(ctx, NIGHT, x, y, r * 0.64, 0);
    artCircle(ctx, '#ffffff', x - r * 0.2, y - r * 0.15, r * 0.14, 0);
    artCircle(ctx, '#ffffff', x + r * 0.22, y + r * 0.2, r * 0.1, 0);
  }

  /* 혼천의: 받침대 위의 고리들. turn 으로 돌린다 */
  function armillary(ctx, x, y, turn) {
    artStroke(ctx, D[1], [x, y + 0.2, x, y + 0.07], 0.03);
    ctx.lineCap = 'round';
    for (const [rx, rot, c] of [[0.075, 0, G[1]], [0.075 * Math.max(0.2, Math.abs(Math.cos(turn))), 0.5, G[0]]]) {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, 0.075, rot, 0, Math.PI * 2);
      ctx.strokeStyle = ART.OUT;
      ctx.lineWidth = 0.04;
      ctx.stroke();
      ctx.strokeStyle = c;
      ctx.lineWidth = 0.018;
      ctx.stroke();
    }
    artCircle(ctx, BL[1], x, y, 0.028, ART.LW * 0.7);
  }

  TOWER_ART.observatory = {
    body(ctx, level) {
      const top = TOP[level];
      const dome = level === 2 ? G : COPPER;
      const hoops = level === 2 ? [[0.1, G[1], 0.03]] : [];
      const rAt = KIT.round(ctx, { tones: S, top, rTop: 0.25, rBot: 0.33, rows: 3 + level, hoops, door: D });
      /* 창과 별 장식 */
      const wins = level === 0 ? [-0.14] : level === 1 ? [-0.2] : [-0.4, -0.08];
      for (const y of wins) porthole(ctx, 0, y + rAt(y) * K, 0.055);
      KIT.sign.star(ctx, -0.15, top + 0.3, 0.038, G[0]);
      KIT.sign.moon(ctx, 0.15, top + 0.32, 0.042, G[0]);
      if (level === 2) {
        /* 별자리 걸개 */
        KIT.banner(ctx, 0.16, top + 0.52, 0.055, 0.2, BL, (c, x, y) => KIT.sign.star(c, x, y - 0.01, 0.03, '#ffffff'));
      }
      if (level >= 1) {
        /* 난간 두른 마루 */
        const gy = top + 0.07;
        const gr = rAt(gy) + 0.09;
        artCylinder(ctx, W, 0, gy, gy + 0.05, gr, gr - 0.03, { topFill: W[0] });
        for (let k = -2; k <= 2; k++) {
          const a = Math.PI / 2 + k * 0.6;
          const x = Math.cos(a) * gr;
          const y = gy + Math.sin(a) * gr * K;
          artStroke(ctx, level === 2 ? G[1] : D[0], [x, y, x, y - 0.085], 0.024);
        }
        artHoop(ctx, 0, gy - 0.085, gr, level === 2 ? G[0] : W[1], 0.024, true);
      }
      /* 둥근 지붕과 그 틈 */
      const r = 0.26 + level * 0.01;
      artCylinder(ctx, [dome[0], dome[1], dome[2]], 0, top - 0.03, top + 0.04, rAt(top) + 0.03, rAt(top), { topFill: dome[2] });
      artDome(ctx, dome, 0, top - 0.03, r, 0.24);
      if (level >= 1) artHoop(ctx, 0, top - 0.13, r * 0.9, dome[2], 0.02);
      ctx.beginPath();
      ctx.moveTo(-0.05, top - 0.005);
      ctx.quadraticCurveTo(-0.055, top - 0.24, 0, top - 0.33);
      ctx.quadraticCurveTo(0.055, top - 0.24, 0.05, top - 0.005);
      ctx.closePath();
      artFill(ctx, '#2a2540');
      artHoop(ctx, 0, top - 0.03, r, level === 2 ? '#fff6cf' : dome[0], 0.022, true);

      /* 별 지도를 든 받침대 */
      artStroke(ctx, D[1], [0.36, 0.43, 0.36, 0.28], 0.03);
      artCircle(ctx, BL[2], 0.36, 0.24, 0.065);
      artCircle(ctx, '#ffffff', 0.345, 0.225, 0.012, 0);
      artCircle(ctx, '#ffffff', 0.38, 0.255, 0.01, 0);
    },

    top(ctx, level, aim, o) {
      const h = H(level);
      const t = o.t;
      const a = artAim(aim);
      const s = 1 + level * 0.14;
      if (level === 2) {
        /* 혼천의가 천천히 돈다 */
        armillary(ctx, -0.37, 0.2, t * 0.8);
      }
      /* 지붕 둘레를 도는 행성 (3단): 뒤쪽 것부터 */
      const orbit = [];
      if (level === 2) {
        const tones = [[R[0], R[1]], [BL[0], BL[1]], [G[0], G[1]]];
        for (let i = 0; i < 3; i++) {
          const q = t * 0.9 + (i * Math.PI * 2) / 3;
          orbit.push([Math.cos(q) * 0.4, -h - 0.04 + Math.sin(q) * 0.1, Math.sin(q), tones[i], i === 2]);
        }
      }
      const planet = ([x, y, , c, ringed]) => {
        artCircle(ctx, c[1], x, y, 0.038);
        artCircle(ctx, c[0], x - 0.012, y - 0.012, 0.014, 0);
        if (ringed) artLine(ctx, '#fff6cf', [x - 0.06, y + 0.012, x + 0.06, y - 0.012], 0.014);
      };
      for (const p of orbit) if (p[2] < 0) planet(p);

      /* 망원경: 겨눈 쪽 하늘을 향해 비스듬히 선다 */
      const bx = -a.fx * 0.04;
      const by = -h + 0.03;
      const tx = a.fx * (0.2 + level * 0.02) * s;
      const ty = -h - (0.26 + level * 0.03) * s + a.fy * 0.1 - o.recoil * 0.02;
      const brass = level === 2 ? [COPPER[0], COPPER[1], COPPER[2]] : [G[0], G[1], G[2]];
      const mx = bx + (tx - bx) * 0.55;
      const my = by + (ty - by) * 0.55;
      /* 굵은 아래 통, 가는 위 통 */
      const tube = artTube(ctx, brass, bx, by, mx, my, 0.07 * s, 0.07 * s, 0.6, 0);
      artTube(ctx, brass, mx, my, tx, ty, 0.055 * s, 0.07 * s, 0, 0);
      artBand(ctx, I, mx, my, tube, 0.076 * s, 0.034);
      artBand(ctx, level === 2 ? G : I, tx - (tx - bx) * 0.05, ty - (ty - by) * 0.05, tube, 0.076 * s, 0.03);
      if (level >= 1) {
        /* 보조경 */
        const fx0 = bx + (tx - bx) * 0.3 + tube.nx * 0.085 * s;
        const fy0 = by + (ty - by) * 0.3 + tube.ny * 0.085 * s;
        const fx1 = bx + (tx - bx) * 0.75 + tube.nx * 0.085 * s;
        const fy1 = by + (ty - by) * 0.75 + tube.ny * 0.085 * s;
        artTube(ctx, [I[0], I[1], I[2]], fx0, fy0, fx1, fy1, 0.024 * s, 0.024 * s, 0.4, 0.4);
      }
      artEllipse(ctx, '#9cddf8', tx, ty, 0.062 * s, 0.04 * s, ART.LW * 0.8);
      artEllipse(ctx, '#ffffff', tx - 0.02, ty - 0.008, 0.024 * s, 0.012 * s, 0);
      if (o.flash > 0.1) {
        artGlow(ctx, tx, ty - 0.05, 0.3, '255,190,90', o.flash * 0.8);
        artSparkle(ctx, tx, ty - 0.06, 0.08 * o.flash + 0.02, '#fff6cf', 1);
      }
      for (const p of orbit) if (p[2] >= 0) planet(p);
    },
  };
})();
