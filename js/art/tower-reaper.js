'use strict';
/* 처형탑 — 탑 위의 사신이 큰 낫으로 가장 센 적을 내리치고, 다 죽어 가는 적을 처형한다.
   1단: 낮은 검은 돌탑과 묘비. 작은 사신이 쇠낫을 든다.
   2단: 가시 테를 두르고 해골 걸개를 내건 탑.
   3단: 금테와 보랏빛 창, 화로를 단 높은 탑. 사신이 금빛 낫을 든다. */
(function () {
  const S = ART.stone;
  const D = ART.darkwood;
  const I = ART.iron;
  const ST = ART.steel;
  const G = ART.gold;
  const BONE = ART.bone;
  const K = ART.K;
  const H = (level) => TOWERS.reaper.levels[level].h;
  const GLOOM = ['#77708a', '#4a445c', '#2c2838'];
  const SOUL = '#cba6ff';
  const TOP = [-0.44, -0.62, -0.8]; /* 사신이 딛고 선 탑 윗면 */
  const RTOP = [0.24, 0.22, 0.21];
  const FIRE = ['#9a6bea', '#e6d4ff'];

  function grave(ctx, x, y, s) {
    artArch(ctx, S[1], x, y, 0.05 * s, 0.14 * s);
    artLine(ctx, S[2], [x, y - 0.11 * s, x, y - 0.04 * s], 0.016);
    artLine(ctx, S[2], [x - 0.024 * s, y - 0.085 * s, x + 0.024 * s, y - 0.085 * s], 0.016);
  }

  /* 탑 테두리의 가시. front = 앞쪽 것만 / 뒤쪽 것만 */
  function spikes(ctx, level, front) {
    const top = TOP[level];
    const lip = RTOP[level] + 0.04;
    const tone = level === 2 ? G : GLOOM;
    for (let k = -2; k <= 2; k++) {
      const a = (front ? Math.PI / 2 : -Math.PI / 2) + k * 0.6;
      const x = Math.cos(a) * lip;
      const y = top - 0.03 + Math.sin(a) * lip * K;
      artPoly(ctx, front ? (k < 0 ? tone[0] : tone[1]) : tone[2], [x - 0.035, y + 0.015, x + Math.cos(a) * 0.04, y - 0.14, x + 0.035, y + 0.015], ART.LW * 0.8);
    }
  }

  TOWER_ART.reaper = {
    body(ctx, level) {
      const top = TOP[level];
      const hoops = level === 2 ? [[top + 0.14, G[1], 0.034], [0.1, G[1], 0.03]] : level === 1 ? [[top + 0.14, I[1], 0.034]] : [];
      const rAt = KIT.round(ctx, {
        tones: GLOOM, top, rTop: RTOP[level], rBot: 0.31, rows: 2 + level * 2, plinth: GLOOM, hoops,
        door: [GLOOM[0], '#2a2434', '#1a1622'], lit: '#9a6bea',
      });
      if (level >= 1) {
        /* 해골 걸개 */
        KIT.banner(ctx, 0, top + 0.22, 0.085, 0.3, ['#4a3a66', '#342848', '#20182e'], (c, x, y) => KIT.sign.skull(c, x, y - 0.02, 0.042));
      }
      if (level === 2) {
        /* 보랏빛이 새는 뾰족 창 */
        for (const x of [-0.16, 0.16]) {
          const y = top + 0.5 + rAt(top + 0.5) * K * 0.72;
          artArch(ctx, '#1a1622', x, y, 0.04, 0.15);
          artArch(ctx, '#9a6bea', x, y - 0.012, 0.02, 0.115, 0);
        }
      }
      /* 테두리 */
      const lip = RTOP[level] + 0.04;
      artCylinder(ctx, GLOOM, 0, top - 0.03, top + 0.04, lip, RTOP[level], { topFill: GLOOM[2] });
      if (level >= 1) spikes(ctx, level, false);

      /* 묘비 */
      grave(ctx, -0.37, 0.45, 1);
      if (level >= 1) grave(ctx, -0.27, 0.48, 0.75);
      if (level === 2) {
        /* 벽에 내단 화로 */
        for (const sgn of [-1, 1]) {
          const x = sgn * 0.36;
          artStroke(ctx, I[1], [sgn * 0.24, top + 0.36, x, top + 0.33], 0.03);
          artPoly(ctx, I[1], [x - 0.06, top + 0.26, x + 0.06, top + 0.26, x + 0.035, top + 0.33, x - 0.035, top + 0.33]);
        }
      } else {
        /* 등불 기둥 */
        artStroke(ctx, I[1], [0.37, 0.44, 0.37, 0.2], 0.03);
        artCircle(ctx, I[2], 0.37, 0.18, 0.042, ART.LW * 0.8);
      }
    },

    top(ctx, level, aim, o) {
      const h = H(level);
      const top = TOP[level];
      const t = o.t;
      const s = 1 + level * 0.14;
      const gold = level === 2;
      const dir = Math.cos(aim) >= 0 ? 1 : -1;
      if (gold) {
        KIT.fire(ctx, -0.36, top + 0.27, 0.045, 0.15, t, FIRE);
        KIT.fire(ctx, 0.36, top + 0.27, 0.045, 0.15, t + 1.7, FIRE);
      } else {
        KIT.fire(ctx, 0.37, 0.17, 0.026, 0.085, t, FIRE);
      }

      /* 사신: 누더기 망토와 두건, 빛나는 두 눈 */
      const bob = Math.sin(t * 2) * 0.012;
      const fy = top + 0.03;
      const hy = -h - 0.16 * s + bob;
      if (gold) artGlow(ctx, 0, (fy + hy) / 2, 0.36, '154,107,234', 0.3 + 0.1 * Math.sin(t * 3));
      ctx.save();
      ctx.scale(dir, 1);
      const CL = ['#7b68a8', '#55447c', '#392c58'];
      const k = s * 1.2;
      artPoly(ctx, CL[1], [
        -0.14 * k, fy, -0.09 * k, fy - 0.045, -0.045 * k, fy + 0.012, 0, fy - 0.04, 0.05 * k, fy + 0.012, 0.1 * k, fy - 0.045, 0.15 * k, fy,
        0.12 * k, hy + 0.2 * k, 0.09 * k, hy + 0.07 * k, 0.02 * k, hy, -0.065 * k, hy + 0.06 * k, -0.105 * k, hy + 0.19 * k,
      ]);
      artPoly(ctx, CL[0], [-0.105 * k, fy - 0.035, -0.05 * k, fy - 0.02, -0.035 * k, hy + 0.2 * k, -0.09 * k, hy + 0.2 * k], 0);
      artPoly(ctx, CL[2], [0.06 * k, fy - 0.02, 0.12 * k, fy - 0.03, 0.1 * k, hy + 0.22 * k, 0.07 * k, hy + 0.22 * k], 0);
      artEllipse(ctx, '#15121c', 0.03 * k, hy + 0.1 * k, 0.06 * k, 0.07 * k, ART.LW * 0.8);
      artCircle(ctx, gold ? G[0] : SOUL, 0.01 * k, hy + 0.1 * k, 0.017 * k, 0);
      artCircle(ctx, gold ? G[0] : SOUL, 0.056 * k, hy + 0.1 * k, 0.017 * k, 0);
      if (gold) artLine(ctx, G[1], [-0.055 * k, hy + 0.07 * k, 0.02 * k, hy + 0.012 * k, 0.085 * k, hy + 0.08 * k], 0.018);
      ctx.restore();

      /* 낫: 쉴 때는 높이 들려 있고, 내리치는 순간 겨눈 쪽으로 휘둘린다 */
      const swing = -0.9 + o.recoil * 2.0;
      const z = s * 0.9; /* 낫의 크기 */
      const px = dir * 0.09 * s;
      artStroke(ctx, '#55447c', [dir * 0.03 * s, hy + 0.24 * s, px, -h], 0.05 * s);
      ctx.save();
      ctx.translate(px, -h);
      ctx.scale(dir, 1);
      ctx.rotate(swing);
      artStroke(ctx, D[1], [0, 0.16 * z, 0, -0.42 * z], 0.04);
      ctx.beginPath();
      ctx.moveTo(-0.02, -0.4 * z);
      ctx.quadraticCurveTo(0.26 * z, -0.56 * z, 0.44 * z, -0.24 * z);
      ctx.quadraticCurveTo(0.24 * z, -0.42 * z, -0.02, -0.3 * z);
      ctx.closePath();
      artFill(ctx, gold ? G[0] : ST[0]);
      artCircle(ctx, gold ? G[1] : I[1], 0, -0.36 * z, 0.036, ART.LW * 0.8);
      artCircle(ctx, BONE[0], 0, 0, 0.03 * z, ART.LW * 0.8);
      ctx.restore();
      if (o.recoil > 0.3) artGlow(ctx, dir * 0.32, -h - 0.1, 0.36, '154,107,234', o.recoil * 0.6);
    },

    front(ctx, level) {
      if (level >= 1) spikes(ctx, level, true);
    },
  };
})();
