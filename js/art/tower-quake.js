'use strict';
/* 지진탑 — 큰 쇠망치를 끌어 올렸다가 땅을 내리쳐 주변을 흔든다.
   1단: 통나무 틀에 밧줄로 매단 쇠뭉치.
   2단: 쇠띠로 묶은 틀에 도르래와 사슬, 가시 돋친 망치. 옆에는 감는 바퀴.
   3단: 금테를 두른 강철 틀과 불빛이 새는 큰 망치. 받침돌의 금이 벌겋게 달아오른다. */
(function () {
  const S = ART.stone;
  const W = ART.wood;
  const D = ART.darkwood;
  const I = ART.iron;
  const ST = ART.steel;
  const G = ART.gold;
  const K = ART.K;
  const H = (level) => TOWERS.quake.levels[level].h;
  const Y0 = [-0.06, -0.12, -0.18]; /* 망치가 내리치는 받침돌 윗면 */
  const POST = 0.3;
  const beamY = (level) => -H(level) - 0.17;
  const LAVA = '#ff8a2a';

  const CRACKS = [
    [-0.02, 0.02, -0.12, -0.02, -0.21, 0.03],
    [0.03, 0.03, 0.14, 0.0, 0.22, 0.045],
    [0, 0.06, -0.035, 0.1, 0.04, 0.125],
    [-0.05, 0.04, -0.12, 0.08, -0.1, 0.11],
    [0.06, 0.05, 0.13, 0.085, 0.1, 0.115],
  ];

  TOWER_ART.quake = {
    body(ctx, level) {
      const y0 = Y0[level];
      const beam = beamY(level);
      KIT.square(ctx, { tones: S, top: y0, wTop: 0.35, wBot: 0.38, rows: level === 0 ? 1 : 2, door: false });
      if (level >= 1) {
        /* 모서리를 감싼 쇠판 */
        const c = level === 2 ? G : [I[0], I[1], I[2]];
        artPoly(ctx, c[1], [-0.07, y0 + 0.35 * K - 0.025, 0, y0 + 0.35 * K, 0, y0 + 0.35 * K + 0.16, -0.07, y0 + 0.35 * K + 0.135]);
        artPoly(ctx, c[2], [0.07, y0 + 0.35 * K - 0.025, 0, y0 + 0.35 * K, 0, y0 + 0.35 * K + 0.16, 0.07, y0 + 0.35 * K + 0.135]);
        for (const x of [-0.04, 0.04]) artCircle(ctx, level === 2 ? '#fff6cf' : ST[0], x, y0 + 0.35 * K + 0.06, 0.013, 0);
      }
      /* 내리친 자리의 금 */
      const n = 3 + level;
      for (let i = 0; i < n; i++) {
        const c = CRACKS[i];
        const pts = [c[0], y0 + c[1], c[2], y0 + c[3], c[4], y0 + c[5]];
        artLine(ctx, level === 2 ? '#7a2a10' : 'rgba(43,37,54,.6)', pts, level === 2 ? 0.03 : 0.016);
        if (level === 2) artLine(ctx, LAVA, pts, 0.014);
      }
      /* 돌무더기 */
      for (const [x, y, r] of [[-0.39, 0.4, 0.05], [-0.31, 0.44, 0.038], [0.39, 0.42, 0.042]]) artCircle(ctx, S[1], x, y, r, ART.LW * 0.8);

      /* 틀: 양 모서리의 기둥과 그 위를 가로지른 들보 */
      const post = level === 2 ? [ST[0], ST[1], ST[2]] : W;
      const band = level === 2 ? G[1] : I[1];
      artStroke(ctx, post[0], [-POST, y0, -POST, beam], 0.064);
      artStroke(ctx, post[2], [POST, y0, POST, beam], 0.064);
      if (level >= 1) {
        /* 버팀목 */
        artStroke(ctx, level === 2 ? ST[1] : D[0], [-POST, beam + 0.2, -0.12, beam], 0.036);
        artStroke(ctx, level === 2 ? ST[2] : D[1], [POST, beam + 0.2, 0.12, beam], 0.036);
        for (const sgn of [-1, 1]) {
          artLine(ctx, ART.OUT, [sgn * (POST + 0.044), y0 - 0.1, sgn * (POST - 0.044), y0 - 0.1], 0.062);
          artLine(ctx, band, [sgn * (POST + 0.036), y0 - 0.1, sgn * (POST - 0.036), y0 - 0.1], 0.034);
          artLine(ctx, ART.OUT, [sgn * (POST + 0.044), beam + 0.3, sgn * (POST - 0.044), beam + 0.3], 0.062);
          artLine(ctx, band, [sgn * (POST + 0.036), beam + 0.3, sgn * (POST - 0.036), beam + 0.3], 0.034);
        }
      }
      artStroke(ctx, level === 2 ? ST[1] : W[1], [-POST - 0.05, beam, POST + 0.05, beam], 0.08);
      artLine(ctx, level === 2 ? ST[0] : W[0], [-POST - 0.04, beam - 0.02, POST + 0.04, beam - 0.02], 0.02);
      for (const sgn of [-1, 1]) artCircle(ctx, band, sgn * POST, beam, 0.026, ART.LW * 0.7);
      if (level >= 1) {
        /* 들보 위의 도르래 */
        artCircle(ctx, level === 2 ? G[1] : I[1], 0, beam - 0.03, 0.075);
        artCircle(ctx, level === 2 ? G[2] : I[2], 0, beam - 0.03, 0.03, ART.LW * 0.7);
        /* 사슬을 감는 바퀴 */
        artStroke(ctx, D[1], [0.34, 0.3, 0.43, 0.42], 0.03);
        artCircle(ctx, W[1], 0.42, 0.26, 0.085);
        artCircle(ctx, D[1], 0.42, 0.26, 0.03, ART.LW * 0.7);
        for (let i = 0; i < 4; i++) {
          const q = (i * Math.PI) / 4 + 0.3;
          artLine(ctx, D[2], [0.42 - Math.cos(q) * 0.07, 0.26 - Math.sin(q) * 0.07, 0.42 + Math.cos(q) * 0.07, 0.26 + Math.sin(q) * 0.07], 0.014);
        }
      }
      if (level === 2) {
        /* 기둥머리의 금 장식 */
        for (const sgn of [-1, 1]) artPoly(ctx, G[1], [sgn * POST - 0.05, beam - 0.04, sgn * POST, beam - 0.13, sgn * POST + 0.05, beam - 0.04]);
      }
    },

    top(ctx, level, aim, o) {
      const h = H(level);
      const y0 = Y0[level];
      const beam = beamY(level);
      const t = o.t;
      const s = 1 + level * 0.16;
      const w = 0.15 * s;
      const hh = 0.22 * s;
      const load = o.load == null ? 1 : o.load;
      /* 내리친 직후에는 바닥에 붙어 있다가, 다음 공격을 준비하는 만큼 끌려 올라간다 */
      const lift = o.recoil > 0.5 ? 0 : Math.min(1, load * 1.25);
      const ease = lift * lift * (3 - 2 * lift);
      const rest = -h + 0.12 * s;
      const ground = y0 + w * K * 0.2;
      const bot = ground + (rest - ground) * ease;

      if (level === 2) artGlow(ctx, 0, y0 + 0.06, 0.3, '255,138,42', 0.2 + 0.12 * Math.sin(t * 3) + o.flash * 0.5);

      /* 밧줄 / 사슬 */
      const hang = [0, beam + 0.03, 0, bot - hh - 0.02];
      if (level === 0) {
        artStroke(ctx, '#d8c08a', hang, 0.03);
      } else {
        artLine(ctx, ART.OUT, hang, 0.05);
        ctx.setLineDash([0.04, 0.03]);
        artLine(ctx, level === 2 ? G[1] : ST[1], hang, 0.026);
        ctx.setLineDash([]);
      }
      /* 망치: 모서리를 앞에 둔 쇳덩이 */
      const top = bot - hh;
      if (level >= 1) {
        /* 밑면의 가시 */
        for (const [x, dy] of [[-w * 0.6, w * K * 0.4], [0, w * K], [w * 0.6, w * K * 0.4]]) {
          artPoly(ctx, ST[1], [x - 0.035, bot + dy - 0.01, x + 0.035, bot + dy - 0.01, x, bot + dy + 0.07]);
        }
      }
      artBox(ctx, [I[0], I[1], I[2]], 0, top, bot, w, w, { topFill: I[0] });
      const band = level === 2 ? G : ST;
      for (const f of [0.2, 0.8]) {
        const y = top + hh * f;
        artPoly(ctx, band[1], [-w - 0.012, y - 0.025, 0, y - 0.025 + w * K, 0, y + 0.025 + w * K, -w - 0.012, y + 0.025]);
        artPoly(ctx, band[2], [w + 0.012, y - 0.025, 0, y - 0.025 + w * K, 0, y + 0.025 + w * K, w + 0.012, y + 0.025]);
      }
      /* 고리 */
      artStroke(ctx, band[1], [-0.04, top - w * K * 0.2, 0, top - 0.06, 0.04, top - w * K * 0.2], 0.024);
      if (level >= 1) {
        const ex = -w * 0.5;
        const ey = top + hh * 0.5 + w * K * 0.5;
        if (level === 2) artGlow(ctx, ex, ey, 0.12, '255,138,42', 0.5 + 0.3 * Math.sin(t * 4));
        KIT.sign.bolt(ctx, ex, ey, 0.05 * s, level === 2 ? '#ffb347' : ST[0]);
      }
      if (o.recoil > 0.45) {
        /* 내리친 순간 튀는 흙먼지와 돌조각 */
        const k = (o.recoil - 0.45) / 0.55;
        ctx.globalAlpha = k;
        for (const sgn of [-1, 1]) {
          artCircle(ctx, '#c9aa72', sgn * (0.24 + (1 - k) * 0.2), y0 + 0.04 - (1 - k) * 0.12, 0.065, 0);
          artCircle(ctx, '#e3c792', sgn * (0.14 + (1 - k) * 0.14), y0 - (1 - k) * 0.2, 0.05, 0);
          artRect(ctx, S[1], sgn * (0.2 + (1 - k) * 0.26) - 0.02, y0 - 0.06 - Math.sin((1 - k) * Math.PI) * 0.22, 0.04, 0.04, 0.008, ART.LW * 0.6);
        }
        ctx.globalAlpha = 1;
      }
    },
  };
})();
