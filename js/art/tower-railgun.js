'use strict';
/* 레일건탑 — 전기를 모았다가 한 줄로 꿰뚫는 탄을 쏜다.
   1단: 낮은 강철 몸통에 축전통 하나, 짧은 두 줄 포신.
   2단: 몸통을 올리고 축전통을 양쪽에 세웠다. 죔쇠를 늘린 긴 포신과 안테나.
   3단: 금테를 두른 높은 탑. 몸통을 감싼 전기 고리와 포신을 도는 빛 고리. */
(function () {
  const S = ART.stone;
  const I = ART.iron;
  const ST = ART.steel;
  const G = ART.gold;
  const K = ART.K;
  const H = (level) => TOWERS.railgun.levels[level].h;
  const TOP = [-0.52, -0.7, -0.88];
  const GLOW = '#7fe0ff';
  const SEAM = 'rgba(15,18,26,.55)';

  /* 전기를 모아 두는 통 */
  function tank(ctx, x, yBot, hgt, r, cap) {
    artCylinder(ctx, ST, x, yBot - hgt, yBot, r, r, { topFill: ST[0] });
    artRect(ctx, GLOW, x - r * 0.5, yBot - hgt * 0.8, r, hgt * 0.56, r * 0.4, ART.LW * 0.8);
    artRect(ctx, '#e8fbff', x - r * 0.3, yBot - hgt * 0.74, r * 0.25, hgt * 0.44, r * 0.12, 0);
    artCylinder(ctx, cap, x, yBot - hgt - 0.035, yBot - hgt, r * 0.55, r * 0.6, { topFill: cap[0] });
  }

  /* 몸통을 감싼 고리의 앞·뒤 절반 */
  function halo(ctx, y, r, front) {
    ctx.beginPath();
    ctx.ellipse(0, y, r, r * K, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
    ctx.lineCap = 'round';
    ctx.strokeStyle = ART.OUT;
    ctx.lineWidth = 0.075;
    ctx.stroke();
    ctx.strokeStyle = front ? GLOW : '#3f9fd0';
    ctx.lineWidth = 0.034;
    ctx.stroke();
  }

  TOWER_ART.railgun = {
    body(ctx, level) {
      const top = TOP[level];
      const h = H(level);
      const trim = level === 2 ? G : ST;
      if (level === 2) halo(ctx, -0.36, 0.47, false);
      const wAt = KIT.square(ctx, { tones: [I[0], I[1], I[2]], top, wTop: 0.25, wBot: 0.34, door: [ST[1], ST[1], I[2]], topFill: I[0] });
      /* 장갑판 이음매와 대갈못 */
      const seams = level === 0 ? [0.5] : level === 1 ? [0.36, 0.7] : [0.28, 0.54, 0.8];
      for (const f of seams) {
        const y = top + (KIT.GROUND - top) * f;
        const w = wAt(y);
        artLine(ctx, SEAM, [-w, y, 0, y + w * K, w, y], 0.016);
        for (const side of [-1, 1]) {
          for (const q of [0.2, 0.82]) artCircle(ctx, ST[1], side * w * q, y + w * K * (1 - q) - 0.035, 0.013, 0);
        }
      }
      /* 모서리를 타고 오르는 전기 도관 */
      artStroke(ctx, GLOW, [0, top + 0.25 * K + 0.035, 0, KIT.GROUND + 0.34 * K - 0.035], 0.022);
      if (level === 2) {
        artLine(ctx, G[1], [-wAt(top + 0.03), top + 0.03, 0, top + 0.03 + wAt(top + 0.03) * K, wAt(top + 0.03), top + 0.03], 0.03);
        artLine(ctx, G[1], [-0.335, 0.2, 0, 0.2 + 0.335 * K, 0.335, 0.2], 0.03);
      }
      /* 불 켜진 창 */
      const rows = level + 1;
      for (let i = 0; i < rows; i++) {
        const y = top + 0.1 + i * 0.2;
        KIT.slit(ctx, wAt, y, -1, 0.56, 0.1, GLOW);
        KIT.slit(ctx, wAt, y, 1, 0.56, 0.1, GLOW);
      }
      /* 축전통과 굵은 전선 */
      const hgt = 0.26 + level * 0.07;
      const cap = level === 2 ? G : [I[0], I[1], I[2]];
      if (level >= 1) {
        artStroke(ctx, '#2f3542', artCurve(-0.38, 0.36 - hgt, -0.42, top + 0.2, -0.22, top + 0.1, 8), 0.028);
        tank(ctx, -0.38, 0.37, hgt, 0.07, cap);
      }
      artStroke(ctx, '#2f3542', artCurve(0.38, 0.36 - hgt, 0.42, top + 0.2, 0.22, top + 0.1, 8), 0.028);
      tank(ctx, 0.38, 0.37, hgt, 0.07, cap);
      if (level === 2) halo(ctx, -0.36, 0.47, true);
      /* 포탑 받침 */
      artCylinder(ctx, [ST[0], ST[1], ST[2]], 0, -h + 0.1, top + 0.02, 0.12, 0.16, { topFill: ST[1] });
      artHoop(ctx, 0, top - 0.03, 0.15, trim[1], 0.02);
      if (level >= 1) {
        /* 안테나 */
        artStroke(ctx, I[1], [-0.2, top + 0.02, -0.2, top - 0.2], 0.018);
        artCircle(ctx, '#ff5a3a', -0.2, top - 0.22, 0.024, ART.LW * 0.7);
      }
    },

    top(ctx, level, aim, o) {
      const h = H(level);
      const a = artAim(aim);
      const t = o.t;
      const s = 1 + level * 0.12;
      const load = o.load == null ? 1 : o.load;
      const gold = level === 2;
      const Q = (u, v, up) => [a.fx * u + a.sx * v, -h + a.fy * u + a.sy * v - (up || 0)];
      const len = (0.4 + level * 0.07) * s;
      const power = Math.max(load, o.flash);

      /* 도관과 축전통이 숨 쉬듯 빛난다 */
      artGlow(ctx, 0, 0.1, 0.14, '127,224,255', 0.18 + 0.12 * Math.sin(t * 3));
      artGlow(ctx, 0.38, 0.2, 0.13, '127,224,255', 0.2 + 0.25 * load);
      if (level >= 1) artGlow(ctx, -0.38, 0.2, 0.13, '127,224,255', 0.2 + 0.25 * load);
      if (gold) artGlow(ctx, 0, -0.36 + 0.47 * K, 0.2, '127,224,255', 0.2 + 0.15 * Math.sin(t * 4));

      const block = () => {
        /* 전원부: 포신 뒤의 상자와 식히는 날개 */
        const c = Q(-0.1 * s, 0, 0.05);
        const pr = artPrism(ctx, gold ? G : [ST[0], ST[1], ST[2]], c[0], c[1], 0.13 * s, 0.11 * s, 0.1 * s, aim, gold ? G[0] : ST[0]);
        for (const u of [-0.06, 0, 0.06]) {
          const p = pr.P(u * s, -0.07 * s);
          const q = pr.P(u * s, 0.07 * s);
          artLine(ctx, I[2], [p[0], p[1], q[0], q[1]], 0.018);
        }
      };
      const rails = () => {
        /* 두 줄 포신과 그 사이를 흐르는 전기 */
        const kick = o.recoil * 0.04;
        const b = Q(0.0, 0);
        const f = Q(len - kick, 0);
        artLine(ctx, 'rgba(127,224,255,' + (0.25 + 0.75 * power) + ')', [b[0], b[1], f[0], f[1]], 0.04 * s);
        for (const v of [-0.055, 0.055]) {
          const p = Q(0.0, v * s);
          const q = Q(len - kick, v * s);
          artStroke(ctx, v < 0 ? ST[0] : ST[2], [p[0], p[1], q[0], q[1]], 0.034 * s);
        }
        /* 죔쇠 */
        const n = 2 + level;
        for (let i = 0; i < n; i++) {
          const u = len * (0.22 + (0.7 * i) / (n - 1 || 1)) - kick;
          const p = Q(u, -0.085 * s);
          const q = Q(u, 0.085 * s);
          artStroke(ctx, gold ? G[1] : I[0], [p[0], p[1], q[0], q[1]], 0.036 * s);
        }
        if (gold) {
          /* 포신을 감싸고 도는 빛 고리 */
          for (let i = 0; i < 2; i++) {
            const u = len * (0.4 + 0.42 * i);
            const r = 0.11 + 0.015 * Math.sin(t * 5 + i * 2);
            const pts = [];
            for (let k = 0; k <= 16; k++) {
              const q = (k / 16) * Math.PI * 2;
              const p = Q(u, Math.cos(q) * r, Math.sin(q) * r);
              pts.push(p[0], p[1]);
            }
            artLine(ctx, ART.OUT, pts, 0.036);
            artLine(ctx, GLOW, pts, 0.016);
          }
        }
        const m = Q(len + 0.03, 0);
        if (load > 0.5) artGlow(ctx, m[0], m[1], 0.1 + 0.08 * load, '127,224,255', (load - 0.5) * 1.2);
        if (o.flash > 0.05) {
          artGlow(ctx, m[0], m[1], 0.34, '190,240,255', o.flash);
          artSparkle(ctx, m[0], m[1], 0.16 * o.flash + 0.03, '#ffffff', 1);
        }
      };
      if (a.toward < -0.15) { rails(); block(); } else { block(); rails(); }
    },
  };
})();
