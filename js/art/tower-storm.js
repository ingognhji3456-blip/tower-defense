'use strict';
/* 천둥신전 — 기둥을 두른 신전 위의 먹구름이 벼락을 떨군다.
   1단: 낮은 기둥 위에 납작한 지붕돌을 얹은 제단.
   2단: 기둥을 올리고 푸른 고깔 지붕을 씌웠다. 양옆에 푸른 불 화로.
   3단: 금 갈빗대를 두른 둥근 지붕과 번개 장식. 지붕 가장자리의 침들 사이로 전기가 튄다. */
(function () {
  const G = ART.gold;
  const BL = ART.blue;
  const I = ART.iron;
  const K = ART.K;
  const H = (level) => TOWERS.storm.levels[level].h;
  const MARBLE = ['#ffffff', '#ece6da', '#c2b9a8'];
  const TOP = [-0.36, -0.5, -0.62]; /* 기둥머리 = 지붕돌 밑 */
  const SPARK = '#cba6ff';
  const RING = 0.29;

  function columns(ctx, level, back) {
    const y0 = TOP[level];
    const y1 = 0.12;
    for (let k = -2; k <= 2; k++) {
      if (!back && k === 0) continue; /* 앞 가운데는 비워 제단이 들여다보인다 */
      const a = (back ? -Math.PI / 2 : Math.PI / 2) + k * 0.62;
      const x = Math.cos(a) * RING;
      const dy = Math.sin(a) * RING * K;
      artCylinder(ctx, back ? [MARBLE[1], MARBLE[2], MARBLE[2]] : MARBLE, x, y0 + dy, y1 + dy, 0.038, 0.044, { top: false });
      if (!back) {
        /* 기둥머리와 주춧돌 */
        artRect(ctx, level === 2 ? G[1] : MARBLE[0], x - 0.058, y0 + dy - 0.005, 0.116, 0.036, 0.008, ART.LW * 0.7);
        artRect(ctx, MARBLE[0], x - 0.058, y1 + dy - 0.016, 0.116, 0.034, 0.008, ART.LW * 0.7);
      }
    }
  }

  /* 화로 */
  function brazier(ctx, x, y) {
    artStroke(ctx, I[1], [x, y, x, y - 0.1], 0.03);
    artPoly(ctx, G[1], [x - 0.065, y - 0.16, x + 0.065, y - 0.16, x + 0.035, y - 0.09, x - 0.035, y - 0.09]);
  }

  TOWER_ART.storm = {
    body(ctx, level) {
      artPlinth(ctx, MARBLE, '#fff6cf');
      artCylinder(ctx, MARBLE, 0, 0.12, 0.2, 0.34, 0.37, { topFill: '#f3ead6' });
      if (level === 2) artHoop(ctx, 0, 0.16, 0.357, G[1], 0.024, true);
      columns(ctx, level, true);
      /* 한가운데의 제단 */
      artCylinder(ctx, [G[0], G[1], G[2]], 0, 0.02, 0.12, 0.09, 0.11, { topFill: G[0] });
      if (level === 0) KIT.sign.bolt(ctx, 0, -0.05, 0.05, SPARK);
      if (level >= 1) {
        brazier(ctx, -0.39, 0.38);
        brazier(ctx, 0.39, 0.38);
      }
    },

    top(ctx, level, aim, o) {
      const h = H(level);
      const top = TOP[level];
      const t = o.t;
      const s = 1 + level * 0.2;
      const lift = level === 1 ? 0.1 : 0;
      const y = -h - lift + Math.sin(t * 1.4) * 0.02;
      const flash = o.flash;
      const blue = ['#4674d0', '#bfe0ff'];
      if (level >= 1) {
        KIT.fire(ctx, -0.39, 0.22, 0.045, 0.14, t, blue);
        KIT.fire(ctx, 0.39, 0.22, 0.045, 0.14, t + 1.4, blue);
        /* 제단 위에 뜬 번개 구슬 */
        const oy = -0.07 + Math.sin(t * 2.2) * 0.012;
        artGlow(ctx, 0, oy, 0.16, '203,166,255', 0.45 + flash * 0.4);
        artCircle(ctx, SPARK, 0, oy, 0.05 + level * 0.008);
        artCircle(ctx, '#ffffff', -0.015, oy - 0.015, 0.016, 0);
      }
      if (level === 2) {
        /* 지붕 가장자리의 침 사이로 튀는 전기 */
        const yy = top - 0.21;
        const pts = [-0.3, yy];
        for (let i = 1; i < 6; i++) pts.push(-0.3 + i * 0.1, yy - 0.03 + Math.sin(t * 30 + i * 2.3) * 0.035);
        pts.push(0.3, yy);
        if (Math.sin(t * 5) > 0.2 || flash > 0.2) {
          artLine(ctx, 'rgba(203,166,255,.9)', pts, 0.03);
          artLine(ctx, '#ffffff', pts, 0.012);
        }
      }
      /* 먹구름: 벼락을 떨굴 때 번쩍인다 */
      artGlow(ctx, 0, y, 0.4 * s, '203,166,255', 0.2 + flash * 0.5);
      const tone = flash > 0.4 ? '#e6d4ff' : '#6b6478';
      const puffs = [[-0.19, 0.03, 0.11], [0.2, 0.04, 0.1], [-0.07, -0.04, 0.14], [0.09, -0.05, 0.13], [0, 0.05, 0.13]];
      for (const [dx, dy, r] of puffs) artCircle(ctx, tone, dx * s, y + dy * s, r * s);
      for (const [dx, dy, r] of puffs) artCircle(ctx, tone, dx * s, y + dy * s, r * s - 0.02, 0);
      artEllipse(ctx, flash > 0.4 ? '#ffffff' : '#8d869c', -0.06 * s, y - 0.07 * s, 0.1 * s, 0.05 * s, 0);
      if (level >= 1 && flash <= 0.4) {
        /* 구름 속에서 번쩍이는 작은 번개 */
        const k = (t * 0.7) % 1;
        if (k < 0.12) KIT.sign.bolt(ctx, 0.05 * s, y + 0.01, 0.06 * s, '#fff6cf');
      }
      if (flash > 0.25) {
        /* 구름에서 내리치는 번개 */
        const y0 = y + 0.12 * s;
        const y1 = top - (level === 0 ? 0.2 : level === 1 ? 0.3 : 0.4);
        const pts = [0, y0];
        for (let i = 1; i <= 3; i++) pts.push(Math.sin(t * 50 + i * 2) * 0.06, y0 + (i / 3) * (y1 - y0));
        artLine(ctx, 'rgba(203,166,255,' + flash + ')', pts, 0.05);
        artLine(ctx, 'rgba(255,255,255,' + flash + ')', pts, 0.018);
      }
    },

    front(ctx, level) {
      const top = TOP[level];
      columns(ctx, level, false);
      /* 기둥이 받친 지붕돌 */
      artCylinder(ctx, MARBLE, 0, top - 0.08, top, 0.36, 0.33, { topFill: '#f3ead6' });
      artHoop(ctx, 0, top - 0.035, 0.345, level >= 1 ? G[1] : BL[1], 0.03, true);
      let tip = top - 0.2;
      if (level === 1) {
        /* 푸른 고깔 지붕 */
        artCone(ctx, BL, 0, top - 0.26, top - 0.07, 0.32);
        artHoop(ctx, 0, top - 0.145, 0.19, 'rgba(20,30,80,.45)', 0.016);
        tip = top - 0.34;
      } else if (level === 2) {
        /* 금 갈빗대를 두른 둥근 지붕 */
        artDome(ctx, BL, 0, top - 0.08, 0.31, 0.22);
        for (const sgn of [-1, 1]) artLine(ctx, G[1], artCurve(sgn * 0.17, top - 0.02, sgn * 0.15, top - 0.2, 0, top - 0.285, 8), 0.022);
        artLine(ctx, G[1], [0, top + 0.03, 0, top - 0.285], 0.022);
        artHoop(ctx, 0, top - 0.08, 0.315, G[1], 0.028, true);
        /* 가장자리의 침 */
        for (const sgn of [-1, 1]) {
          artLine(ctx, ART.OUT, [sgn * 0.3, top - 0.08, sgn * 0.3, top - 0.21], 0.03);
          artLine(ctx, G[1], [sgn * 0.3, top - 0.08, sgn * 0.3, top - 0.21], 0.014);
          artCircle(ctx, G[0], sgn * 0.3, top - 0.21, 0.022, ART.LW * 0.7);
        }
        tip = top - 0.4;
      }
      /* 피뢰침 */
      const base = level === 0 ? top - 0.08 : level === 1 ? top - 0.25 : top - 0.28;
      artLine(ctx, ART.OUT, [0, base, 0, tip], 0.034);
      artLine(ctx, G[1], [0, base, 0, tip], 0.016);
      if (level === 2) KIT.sign.bolt(ctx, 0, tip - 0.03, 0.07, G[0]);
      else artCircle(ctx, G[0], 0, tip, 0.024, ART.LW * 0.7);
    },
  };
})();
