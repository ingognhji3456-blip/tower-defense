'use strict';
/* 지형지물 — 나무, 소나무, 바위, 연못(탑을 세울 수 없는 칸)과 괴수 굴, 성문. 원점은 타일 중심. */
(function () {
  const LEAF = ['#a6e36a', '#5fb648', '#3a8a3c'];
  const PINE = ['#5fbf7a', '#2f8f5a', '#1d6646'];
  const WOOD = ART.wood;
  const ROCK = ['#cfd4dc', '#9aa3b2', '#6c7587'];
  const WATER = ['#9be4ff', '#49b4ea', '#2b82c9'];
  const S = ART.stone;
  const SD = [S[1], S[2], '#69738a'];
  const BL = ART.blue;
  const G = ART.gold;
  const R = ART.red;
  const I = ART.iron;
  const K = ART.K;

  /* 여러 덩이를 하나의 윤곽으로 묶어 그린다: 먼저 어두운 테, 그다음 색 */
  function blobs(ctx, list) {
    for (const b of list) artEllipse(ctx, ART.OUT, b[0], b[1], b[2] + ART.LW, (b[3] || b[2]) + ART.LW, 0);
    for (const b of list) artEllipse(ctx, b[4], b[0], b[1], b[2], b[3] || b[2], 0);
  }

  TERRAIN_ART.deco.tree = function (ctx, seed) {
    const v = ((seed % 5) - 2) * 0.012;
    artShadow(ctx, 0.06, 0.36, 0.36, 0.12);
    /* 줄기와 뿌리 */
    artPoly(ctx, WOOD[1], [-0.13, 0.38, -0.07, 0.2, -0.06, -0.1, 0.07, -0.1, 0.08, 0.2, 0.15, 0.38, 0.04, 0.34, -0.03, 0.36]);
    artPoly(ctx, WOOD[0], [-0.07, 0.2, -0.06, -0.1, -0.01, -0.1, -0.02, 0.24], 0);
    artLine(ctx, WOOD[2], [0.03, 0.02, 0.035, 0.18], 0.014);
    /* 잎 뭉치 */
    blobs(ctx, [
      [-0.2 + v, -0.34, 0.2, 0.19, LEAF[2]],
      [0.22 + v, -0.36, 0.2, 0.19, LEAF[2]],
      [0.0, -0.3, 0.26, 0.2, LEAF[2]],
      [-0.1 + v, -0.56, 0.24, 0.22, LEAF[1]],
      [0.14 - v, -0.6, 0.22, 0.2, LEAF[1]],
      [0.02 + v, -0.78, 0.2, 0.18, LEAF[1]],
    ]);
    artEllipse(ctx, LEAF[0], -0.16 + v, -0.66, 0.13, 0.09, 0, -0.3);
    artEllipse(ctx, LEAF[0], 0.02 + v, -0.86, 0.11, 0.07, 0, -0.2);
    artEllipse(ctx, LEAF[0], -0.26 + v, -0.4, 0.08, 0.05, 0, -0.3);
    /* 열매 */
    const fruit = seed % 2 ? R[1] : '#ffb347';
    for (const [x, y] of [[0.16, -0.46], [-0.08, -0.36], [0.2, -0.7]]) artCircle(ctx, fruit, x + v, y, 0.034, ART.LW * 0.7);
  };

  TERRAIN_ART.deco.pine = function (ctx, seed) {
    const v = ((seed % 3) - 1) * 0.02;
    artShadow(ctx, 0.06, 0.36, 0.32, 0.11);
    artPoly(ctx, WOOD[2], [-0.06, 0.38, -0.045, 0.1, 0.045, 0.1, 0.06, 0.38]);
    const tier = (y, w, h) => {
      artPoly(ctx, PINE[1], [v * 0.5, y - h, -w, y, -w * 0.45, y - 0.03, 0, y + 0.05, w * 0.45, y - 0.03, w, y]);
      artPoly(ctx, PINE[2], [v * 0.5, y - h, 0.03, y + 0.05, w * 0.45, y - 0.03, w, y], 0);
      artPoly(ctx, PINE[0], [v * 0.5, y - h + 0.04, -w * 0.72, y - 0.04, -w * 0.36, y - 0.07], 0);
    };
    tier(0.2, 0.34, 0.44);
    tier(-0.08, 0.28, 0.42);
    tier(-0.34, 0.21, 0.4);
    tier(-0.58, 0.14, 0.36);
  };

  TERRAIN_ART.deco.rock = function (ctx, seed) {
    const v = ((seed % 4) - 1.5) * 0.015;
    artShadow(ctx, 0.05, 0.34, 0.42, 0.12);
    artPoly(ctx, ROCK[2], [0.1, 0.32, 0.12, 0.0, 0.26 + v, -0.12, 0.42, 0.04, 0.44, 0.32]);
    artPoly(ctx, ROCK[1], [0.12, 0.0, 0.26 + v, -0.12, 0.3, 0.02, 0.2, 0.1], 0);
    artPoly(ctx, ROCK[1], [-0.42, 0.34, -0.38, 0.02, -0.2 + v, -0.26, 0.08, -0.2, 0.22, 0.06, 0.2, 0.36]);
    artPoly(ctx, ROCK[0], [-0.38, 0.02, -0.2 + v, -0.26, 0.08, -0.2, -0.06, -0.04, -0.26, 0.06], 0);
    artPoly(ctx, ROCK[2], [0.08, -0.2, 0.22, 0.06, 0.2, 0.36, 0.04, 0.36, 0.0, 0.0], 0);
    artPoly(ctx, 'rgba(0,0,0,0)', [-0.42, 0.34, -0.38, 0.02, -0.2 + v, -0.26, 0.08, -0.2, 0.22, 0.06, 0.2, 0.36]);
    artLine(ctx, 'rgba(43,37,54,.45)', [-0.26, 0.06, -0.06, -0.04, 0.0, 0.0, 0.04, 0.36], 0.014);
    artPoly(ctx, ROCK[1], [-0.3, 0.4, -0.26, 0.24, -0.12, 0.2, -0.04, 0.4]);
    /* 이끼와 풀꽃 */
    artEllipse(ctx, LEAF[1], -0.2 + v, -0.2, 0.1, 0.045, ART.LW * 0.7, -0.5);
    artEllipse(ctx, LEAF[0], -0.22 + v, -0.22, 0.05, 0.02, 0, -0.5);
    artLine(ctx, LEAF[2], [0.3, 0.4, 0.28, 0.28, 0.33, 0.4, 0.36, 0.3, 0.37, 0.4], 0.016);
    artCircle(ctx, seed % 2 ? '#ffe36a' : '#ff9ec4', 0.36, 0.28, 0.03, ART.LW * 0.6);
  };

  TERRAIN_ART.deco.pond = function (ctx, seed) {
    const shore = () => {
      ctx.beginPath();
      ctx.moveTo(-0.44, 0.06);
      ctx.bezierCurveTo(-0.46, -0.22, -0.16, -0.32, 0.12, -0.28);
      ctx.bezierCurveTo(0.42, -0.26, 0.5, -0.02, 0.42, 0.18);
      ctx.bezierCurveTo(0.3, 0.42, -0.36, 0.42, -0.44, 0.06);
      ctx.closePath();
    };
    shore();
    artFill(ctx, '#d8c08a');
    ctx.save();
    ctx.translate(0, 0.02);
    ctx.scale(0.88, 0.86);
    shore();
    artFill(ctx, WATER[1], ART.LW * 0.9);
    ctx.save();
    shore();
    ctx.clip();
    ctx.fillStyle = WATER[2];
    ctx.fillRect(-0.6, 0.12, 1.2, 0.5);
    ctx.fillStyle = WATER[0];
    ctx.beginPath();
    ctx.ellipse(-0.1, -0.16, 0.2, 0.05, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
    artLine(ctx, 'rgba(255,255,255,.8)', [0.08, 0.14, 0.24, 0.14], 0.014);
    artLine(ctx, 'rgba(255,255,255,.8)', [-0.2, 0.22, -0.1, 0.22], 0.012);
    /* 연잎과 꽃 */
    artEllipse(ctx, LEAF[1], -0.16, 0.06, 0.085, 0.05, ART.LW * 0.7);
    artPoly(ctx, WATER[1], [-0.16, 0.06, -0.08, 0.04, -0.08, 0.085], 0);
    artEllipse(ctx, LEAF[1], 0.18, -0.06, 0.07, 0.04, ART.LW * 0.7);
    artCircle(ctx, seed % 2 ? '#ff9ec4' : '#ffffff', 0.19, -0.075, 0.03, ART.LW * 0.6);
    artCircle(ctx, G[1], 0.19, -0.075, 0.011, 0);
    /* 부들 */
    for (const [x, hgt] of [[-0.32, 0.36], [-0.25, 0.28], [0.36, 0.3]]) {
      artLine(ctx, ART.OUT, [x, 0.0, x + 0.01, -hgt], 0.03);
      artLine(ctx, LEAF[2], [x, 0.0, x + 0.01, -hgt], 0.014);
      artRect(ctx, WOOD[2], x - 0.012, -hgt - 0.02, 0.045, 0.11, 0.02, ART.LW * 0.7);
    }
    artCircle(ctx, ROCK[1], 0.36, 0.3, 0.05, ART.LW * 0.8);
    artCircle(ctx, ROCK[0], -0.36, 0.26, 0.04, ART.LW * 0.8);
  };

  /* 괴수 굴: 길이 시작되는 곳. 송곳니 같은 바위 사이 어둠 속에서 붉은 눈이 깜박인다. */
  TERRAIN_ART.cave = function (ctx, t) {
    const DK = ['#8b8597', '#5f596e', '#3d384c'];
    artShadow(ctx, 0.04, 0.34, 0.62, 0.16);
    /* 바위 언덕 */
    artPoly(ctx, DK[1], [-0.6, 0.38, -0.56, 0.0, -0.4, -0.34, -0.14, -0.6, 0.16, -0.64, 0.42, -0.4, 0.58, -0.04, 0.6, 0.38]);
    artPoly(ctx, DK[0], [-0.56, 0.0, -0.4, -0.34, -0.14, -0.6, 0.16, -0.64, 0.06, -0.46, -0.2, -0.38, -0.38, -0.1], 0);
    artPoly(ctx, DK[2], [0.42, -0.4, 0.58, -0.04, 0.6, 0.38, 0.4, 0.38, 0.38, -0.1], 0);
    artPoly(ctx, 'rgba(0,0,0,0)', [-0.6, 0.38, -0.56, 0.0, -0.4, -0.34, -0.14, -0.6, 0.16, -0.64, 0.42, -0.4, 0.58, -0.04, 0.6, 0.38]);
    /* 뿔처럼 솟은 바위 */
    artPoly(ctx, DK[1], [-0.44, -0.3, -0.52, -0.76, -0.26, -0.48]);
    artPoly(ctx, DK[2], [0.3, -0.5, 0.5, -0.82, 0.48, -0.36]);
    artPoly(ctx, DK[0], [-0.44, -0.3, -0.5, -0.7, -0.38, -0.44], 0);
    /* 굴 입구 */
    ctx.beginPath();
    ctx.moveTo(-0.36, 0.38);
    ctx.lineTo(-0.36, 0.02);
    ctx.bezierCurveTo(-0.34, -0.36, 0.34, -0.36, 0.36, 0.02);
    ctx.lineTo(0.36, 0.38);
    ctx.closePath();
    artFill(ctx, '#1b1426');
    artGlow(ctx, 0, 0.2, 0.34, '150,60,170', 0.35);
    /* 깜박이는 눈 */
    const blink = (t * 0.55) % 1 > 0.93 ? 0.15 : 1;
    const look = Math.sin(t * 0.8) * 0.03;
    for (const [x, y, s] of [[-0.12, -0.02, 1], [0.12, -0.02, 1], [-0.2, 0.2, 0.55], [-0.11, 0.2, 0.55]]) {
      artGlow(ctx, x + look, y, 0.09 * s, '255,70,50', 0.6);
      artEllipse(ctx, '#ff5a3a', x + look, y, 0.045 * s, 0.03 * s * blink, 0);
      artEllipse(ctx, '#ffe9a8', x + look + 0.01 * s, y, 0.015 * s, 0.022 * s * blink, 0);
    }
    /* 입구의 송곳니 바위 */
    for (const [x, len] of [[-0.24, 0.16], [-0.08, 0.22], [0.1, 0.2], [0.25, 0.14]]) {
      const y = -0.25 + Math.abs(x) * 0.5;
      artPoly(ctx, x < 0 ? DK[0] : DK[1], [x - 0.06, y, x + 0.06, y, x, y + len]);
    }
    artPoly(ctx, DK[0], [-0.44, 0.38, -0.36, 0.12, -0.26, 0.38]);
    artPoly(ctx, DK[2], [0.26, 0.38, 0.36, 0.14, 0.44, 0.38]);
    /* 뼈다귀와 해골 */
    artLine(ctx, ART.OUT, [-0.58, 0.44, -0.4, 0.4], 0.05);
    artLine(ctx, ART.bone[0], [-0.58, 0.44, -0.4, 0.4], 0.026);
    artCircle(ctx, ART.bone[0], 0.5, 0.4, 0.055);
    artCircle(ctx, ART.OUT, 0.48, 0.395, 0.014, 0);
    artCircle(ctx, ART.OUT, 0.52, 0.395, 0.014, 0);
    /* 보랏빛 수정 */
    artPoly(ctx, ART.purple[1], [0.5, 0.2, 0.56, -0.02, 0.62, 0.2]);
    artPoly(ctx, ART.purple[0], [0.5, 0.2, 0.56, -0.02, 0.57, 0.2], 0);
  };

  /* 성문: 지켜야 할 곳. 푸른 지붕의 두 망루와 쇠창살 문, 금 문장 걸개. alarm(1 → 0)이면 붉게 번쩍인다. */
  TERRAIN_ART.gate = function (ctx, t, alarm) {
    const al = alarm || 0;
    artShadow(ctx, 0.05, 0.36, 0.66, 0.16);
    const tower = (x, tones) => {
      artCylinder(ctx, tones, x, -0.52, 0.34, 0.15, 0.17, { top: false });
      for (const y of [-0.3, -0.06, 0.16]) {
        ctx.beginPath();
        ctx.ellipse(x, y, 0.158, 0.158 * K, 0, 0.15, Math.PI - 0.15);
        ctx.strokeStyle = 'rgba(43,37,54,.3)';
        ctx.lineWidth = 0.012;
        ctx.stroke();
      }
      artRect(ctx, ART.OUT, x - 0.016, -0.3, 0.032, 0.11, 0.016, 0);
      artCylinder(ctx, tones, x, -0.56, -0.48, 0.185, 0.155, { top: false });
      artCone(ctx, BL, x, -0.98, -0.55, 0.2);
      artCircle(ctx, G[1], x, -0.99, 0.025, ART.LW * 0.6);
    };
    /* 뒤쪽 성벽 */
    artRect(ctx, SD[1], -0.4, -0.46, 0.8, 0.82, 0);
    tower(-0.48, S);
    tower(0.48, SD);
    /* 문루 */
    artRect(ctx, S[1], -0.34, -0.5, 0.68, 0.88, 0);
    artRect(ctx, S[0], -0.34, -0.5, 0.22, 0.88, 0, 0);
    for (const y of [-0.3, -0.12]) artLine(ctx, 'rgba(43,37,54,.28)', [-0.33, y, 0.33, y], 0.012);
    for (const [x, y] of [[-0.2, -0.3], [0.08, -0.3], [-0.1, -0.12], [0.2, -0.12]]) artLine(ctx, 'rgba(43,37,54,.22)', [x, y - 0.17, x, y - 0.01], 0.01);
    /* 성가퀴 */
    for (let i = 0; i < 5; i++) artRect(ctx, i < 2 ? S[0] : S[1], -0.36 + i * 0.146, -0.62, 0.11, 0.13, 0.01);
    /* 아치문: 어두운 안쪽과 올려 둔 쇠창살 */
    ctx.beginPath();
    ctx.moveTo(-0.22, 0.38);
    ctx.lineTo(-0.22, 0.06);
    ctx.arc(0, 0.06, 0.22, Math.PI, 0);
    ctx.lineTo(0.22, 0.38);
    ctx.closePath();
    artFill(ctx, SD[2]);
    ctx.beginPath();
    ctx.moveTo(-0.17, 0.38);
    ctx.lineTo(-0.17, 0.06);
    ctx.arc(0, 0.06, 0.17, Math.PI, 0);
    ctx.lineTo(0.17, 0.38);
    ctx.closePath();
    artFill(ctx, '#201a2c', ART.LW * 0.8);
    if (al > 0) artGlow(ctx, 0, 0.16, 0.3, '255,70,50', 0.75 * al);
    else artGlow(ctx, 0, 0.2, 0.22, '255,200,120', 0.28);
    for (let i = -2; i <= 2; i++) {
      const x = i * 0.065;
      const top = 0.06 - Math.sqrt(Math.max(0, 0.17 * 0.17 - x * x));
      artLine(ctx, ART.OUT, [x, top, x, top + 0.12], 0.034);
      artLine(ctx, I[0], [x, top, x, top + 0.12], 0.016);
      artPoly(ctx, I[0], [x - 0.02, top + 0.11, x + 0.02, top + 0.11, x, top + 0.16], ART.LW * 0.5);
    }
    /* 금 문장 걸개 */
    for (const sx of [-0.27, 0.27]) {
      const w = Math.sin(t * 3 + sx * 5) * 0.012;
      artPoly(ctx, sx < 0 ? BL[0] : BL[1], [sx - 0.05, -0.42, sx + 0.05, -0.42, sx + 0.05 + w, -0.14, sx + w, -0.08, sx - 0.05 + w, -0.14]);
      artRect(ctx, G[1], sx - 0.05, -0.42, 0.1, 0.028, 0, ART.LW * 0.6);
      artPoly(ctx, G[1], [sx - 0.028 + w * 0.5, -0.32, sx + 0.028 + w * 0.5, -0.32, sx + 0.028 + w * 0.5, -0.24, sx + w * 0.5, -0.19, sx - 0.028 + w * 0.5, -0.24], ART.LW * 0.5);
    }
    /* 문 위의 방패 문장 */
    artPoly(ctx, BL[1], [-0.075, -0.4, 0.075, -0.4, 0.075, -0.28, 0, -0.2, -0.075, -0.28]);
    artPoly(ctx, G[1], [0, -0.37, 0.022, -0.32, 0.05, -0.32, 0.028, -0.29, 0.036, -0.25, 0, -0.27, -0.036, -0.25, -0.028, -0.29, -0.05, -0.32, -0.022, -0.32], ART.LW * 0.45);
    /* 깃발과 경보등 */
    for (const sx of [-0.48, 0.48]) {
      artLine(ctx, ART.OUT, [sx, -0.99, sx, -1.18], 0.03);
      artFlag(ctx, BL, sx, -1.17, sx < 0 ? -0.17 : 0.17, 0.1, t);
    }
    const lamp = al > 0 ? '#ff5a3a' : '#ffd66b';
    artGlow(ctx, 0, -0.7, 0.16 + al * 0.14, al > 0 ? '255,70,50' : '255,214,107', 0.5 + al * 0.4);
    artRect(ctx, I[1], -0.045, -0.66, 0.09, 0.04, 0.01);
    artRect(ctx, lamp, -0.035, -0.76, 0.07, 0.1, 0.02);
    artPoly(ctx, I[1], [-0.05, -0.76, 0, -0.83, 0.05, -0.76]);
  };
})();
