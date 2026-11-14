'use strict';
/* 저주탑 — 검은 돌기둥 위에 뜬 눈이 주변의 적을 저주한다.
   1단: 해골 하나를 박은 낮은 비석과 촛불.
   2단: 기둥이 높아지고 양옆으로 뿔이 솟아 눈을 떠받든다.
   3단: 뿔 사이에 돌 고리가 걸리고 발치의 화로에서 보랏빛 불이 탄다. 눈 둘레를 새김돌이 돈다. */
(function () {
  const I = ART.iron;
  const P = ART.purple;
  const BONE = ART.bone;
  const K = ART.K;
  const H = (level) => TOWERS.curse.levels[level].h;
  const GRIM = ['#8a7ea6', '#574b73', '#352b4a'];
  const RUNE = '#cba6ff';
  const TOP = [-0.6, -0.78, -0.96]; /* 기둥 몸통의 윗면(머릿돌 밑) */
  const PED = 0.06; /* 받침돌 윗면 */
  const eyeY = (level) => -H(level) - 0.06;

  /* 눈구멍이 빛나는 해골 */
  function skull(ctx, x, y, s) {
    KIT.sign.skull(ctx, x, y, s);
    artCircle(ctx, RUNE, x - s * 0.38, y + s * 0.05, s * 0.12, 0);
    artCircle(ctx, RUNE, x + s * 0.38, y + s * 0.05, s * 0.12, 0);
  }

  /* 기둥을 두른 빛나는 띠 */
  function band(ctx, y, w) {
    artLine(ctx, ART.OUT, [-w, y, 0, y + w * K, w, y], 0.044);
    artLine(ctx, RUNE, [-w, y, 0, y + w * K, w, y], 0.018);
  }

  /* 화로 */
  function brazier(ctx, x, y) {
    artStroke(ctx, I[1], [x, y, x, y - 0.1], 0.03);
    artPoly(ctx, I[1], [x - 0.065, y - 0.16, x + 0.065, y - 0.16, x + 0.035, y - 0.09, x - 0.035, y - 0.09]);
  }

  TOWER_ART.curse = {
    body(ctx, level) {
      const top = TOP[level];
      const ey = eyeY(level);
      const wAt = (y) => 0.13 + ((0.22 - 0.13) * (y - top)) / (PED - top);
      /* 받침돌 */
      KIT.square(ctx, { tones: GRIM, top: PED, wTop: 0.3, wBot: 0.34, base: GRIM, door: false });
      /* 발치의 뼈 */
      artStroke(ctx, BONE[0], [-0.41, 0.4, -0.28, 0.44], 0.032);
      artStroke(ctx, BONE[0], [-0.39, 0.45, -0.3, 0.39], 0.032);

      if (level >= 1) {
        /* 양옆으로 솟은 뿔: 끝은 뼈 */
        for (const sgn of [-1, 1]) {
          const pts = artCurve(sgn * 0.14, top + 0.16, sgn * 0.42, top + 0.1, sgn * 0.33, top - 0.2, 8);
          artStroke(ctx, sgn < 0 ? GRIM[0] : GRIM[2], pts, 0.06);
          artStroke(ctx, BONE[0], pts.slice(-6), 0.04);
        }
      }
      if (level === 2) {
        /* 눈을 두른 돌 고리 */
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, ey, 0.25, 0, Math.PI * 2);
        ctx.strokeStyle = ART.OUT;
        ctx.lineWidth = 0.105;
        ctx.stroke();
        ctx.strokeStyle = GRIM[1];
        ctx.lineWidth = 0.05;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, ey, 0.262, Math.PI * 0.85, Math.PI * 1.55);
        ctx.strokeStyle = GRIM[0];
        ctx.lineWidth = 0.02;
        ctx.stroke();
        for (const q of [-Math.PI / 2, -0.35, Math.PI + 0.35]) artCircle(ctx, RUNE, Math.cos(q) * 0.25, ey + Math.sin(q) * 0.25, 0.03, ART.LW * 0.7);
      }

      /* 기둥과 뾰족한 머릿돌 */
      artBox(ctx, GRIM, 0, top, PED, 0.13, 0.22, { top: false });
      artPoly(ctx, GRIM[0], [0, top - 0.15, -0.14, top, 0, top + 0.14 * K]);
      artPoly(ctx, GRIM[2], [0, top - 0.15, 0, top + 0.14 * K, 0.14, top]);
      /* 띠와 새김글 */
      const n = level + 1;
      for (let i = 0; i < n; i++) {
        const y = top + ((PED - top) * (i + 1)) / (n + 1);
        band(ctx, y, wAt(y));
        const gy = y - ((PED - top) / (n + 1)) * 0.5;
        const gw = wAt(gy);
        const gx = -gw * 0.5;
        const gyy = gy + gw * K * 0.5;
        artLine(ctx, RUNE, [gx, gyy - 0.045, gx, gyy + 0.045], 0.016);
        artLine(ctx, RUNE, [gx - 0.03, gyy - 0.025, gx, gyy + 0.005, gx + 0.03, gyy - 0.015], 0.016);
      }
      /* 모서리에 박은 해골 */
      skull(ctx, 0, PED + 0.3 * K + 0.02, 0.06);
      if (level >= 1) skull(ctx, 0, top + (PED - top) * 0.72 + 0.03, 0.05);
      if (level === 2) skull(ctx, 0, top + (PED - top) * 0.3 + 0.02, 0.045);

      if (level === 2) {
        brazier(ctx, -0.37, 0.36);
        brazier(ctx, 0.38, 0.38);
      } else {
        /* 촛불 */
        for (const x of level === 0 ? [0.35] : [0.3, 0.39]) artRect(ctx, BONE[0], x - 0.022, 0.33, 0.044, 0.1, 0.008, ART.LW * 0.8);
      }
    },

    top(ctx, level, aim, o) {
      const t = o.t;
      const s = 1 + level * 0.18;
      const y = eyeY(level) + Math.sin(t * 1.8) * 0.02;
      const purple = ['#9a6bea', '#e6d4ff'];
      artGlow(ctx, 0, y, 0.3 * s, '154,107,234', 0.4 + 0.1 * Math.sin(t * 3));
      /* 보랏빛 불 */
      if (level === 2) {
        KIT.fire(ctx, -0.37, 0.2, 0.045, 0.15, t, purple);
        KIT.fire(ctx, 0.38, 0.22, 0.045, 0.15, t + 1.3, purple);
      } else {
        for (const x of level === 0 ? [0.35] : [0.3, 0.39]) KIT.fire(ctx, x, 0.335, 0.024, 0.085, t + x * 9, purple);
      }
      /* 피어오르는 저주 */
      for (let i = 0; i < 3 + level; i++) {
        const k = (t * 0.5 + i * 0.29) % 1;
        ctx.globalAlpha = (1 - k) * 0.8;
        artCircle(ctx, RUNE, Math.sin(i * 2.6 + t) * 0.2, y + 0.4 - k * 0.5, 0.02, 0);
      }
      ctx.globalAlpha = 1;

      /* 눈 둘레를 도는 새김돌 (3단) */
      const stones = [];
      if (level === 2) {
        for (let i = 0; i < 3; i++) {
          const q = t * 1.2 + (i * Math.PI * 2) / 3;
          stones.push([Math.cos(q) * 0.4, y + Math.sin(q) * 0.11, Math.sin(q)]);
        }
      }
      const stone = ([x, yy]) => {
        artPoly(ctx, GRIM[1], [x, yy - 0.055, x + 0.035, yy, x, yy + 0.055, x - 0.035, yy]);
        artLine(ctx, RUNE, [x, yy - 0.025, x, yy + 0.025], 0.014);
      };
      for (const st of stones) if (st[2] < 0) stone(st);

      /* 떠 있는 눈: 겨눈 쪽을 보고, 이따금 깜빡인다 */
      const rx = 0.125 * s;
      const ry = 0.08 * s;
      if (t % 3.7 < 0.14) {
        artEllipse(ctx, GRIM[1], 0, y, rx, ry);
        artLine(ctx, ART.OUT, [-rx * 0.7, y + ry * 0.2, rx * 0.7, y + ry * 0.2], 0.022);
      } else {
        artEllipse(ctx, '#ffffff', 0, y, rx, ry);
        const ix = Math.cos(aim) * 0.04 * s;
        const iy = y + Math.sin(aim) * 0.02 * s;
        artCircle(ctx, P[1], ix, iy, 0.052 * s, ART.LW * 0.8);
        artEllipse(ctx, ART.OUT, ix * 1.2, y + (iy - y) * 1.2, 0.014 * s, 0.034 * s, 0);
        artCircle(ctx, '#ffffff', ix - 0.018 * s, iy - 0.02 * s, 0.013 * s, 0);
        /* 윗눈꺼풀 */
        ctx.beginPath();
        ctx.ellipse(0, y, rx, ry, 0, Math.PI, Math.PI * 2);
        ctx.quadraticCurveTo(0, y - ry * 0.75, -rx, y);
        artFill(ctx, GRIM[1]);
      }
      for (const st of stones) if (st[2] >= 0) stone(st);
    },
  };
})();
