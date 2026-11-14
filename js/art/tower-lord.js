'use strict';
/* 심연의 군주 — 건물이 아니라 전장에 직접 서는 영웅. 둥근 머리에 선으로 된 몸, 곧 막대 인간(졸라맨)이다.
   장식은 없다. 불꽃빛 몸, 빛나는 두 눈, 끝자락이 타들어 가는 검은 망토가 전부다.
   두 손에서 뿜는 굵은 광선을 부채꼴로 휘두르고, 발을 굴러 화염파를 퍼뜨린다.
   1단: 허리까지 오는 짧은 망토.
   2단: 무릎까지 오는 망토, 발밑의 그을린 땅과 몸 둘레에 이는 작은 불길.
   3단: 발끝까지 내려오는 망토, 온몸을 감싸는 큰 불길과 머리 위의 불꽃. 땅에서 살짝 떠 있다.

   body 는 발밑의 그림자와 그을린 자국(움직이지 않는 부분), top 은 군주 자신.
   top 의 o 에는 { recoil, flash, t } 말고도 다음 값이 들어올 수 있다.
     charge  쏘기 직전 두 손에 불을 모으는 정도 (0 → 1): 무릎을 굽히고 두 팔을 겨눈다
     gest    지금 하는 몸짓: 'shock'(화염파: 움츠렸다가 두 팔을 벌리며 터뜨린다),
             'pillar'(불기둥: 몸을 숙여 땅을 내리친다), 'meteor'(유성우: 두 팔을 하늘로 뻗는다)
     cast    그 몸짓이 남은 정도 (1 → 0)
   hands(level, aim, o) 는 쏘는 동안 두 손의 위치(타일 중심 기준)를 돌려준다 — 광선이 거기서 나간다. */
(function () {
  const BODY = ['#ffd88f', '#ff9226', '#d6600b']; /* 몸: 밝은 곳, 앞쪽 팔다리, 뒤쪽 팔다리 */
  const CAPE = ['#5b566f', '#2f2b3d', '#1a1824']; /* 망토 겉감 */
  const INNER = ['#5a3626', '#3d241b', '#291712']; /* 망토 안감: 그을린 적갈색 */
  const EYE = '#fff6cf';
  const GLOW = '255,150,40';
  const K = ART.K;
  const FEET = 0.2;
  const SCALE = [1.3, 1.42, 1.56];
  const W = 0.052; /* 팔다리 굵기 */
  const LIMB = 0.16; /* 허벅지·정강이 길이 */
  const ARM = 0.14; /* 위팔·아래팔 길이 */

  /* 불꽃 한 가닥. (x, yb) 는 밑동 가운데, lean 은 끝이 옆으로 쏠린 정도 */
  function tongue(ctx, x, yb, w, hgt, lean, fill) {
    ctx.beginPath();
    ctx.moveTo(x - w, yb);
    ctx.quadraticCurveTo(x - w * 1.2, yb - hgt * 0.5, x + lean, yb - hgt);
    ctx.quadraticCurveTo(x + w * 1.2, yb - hgt * 0.45, x + w, yb);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  /* 두 뼈로 된 팔다리: 뿌리와 끝을 정하면 관절이 side 쪽으로 꺾인다 */
  function joint(a, b, len, side) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const n = Math.hypot(dx, dy) || 1;
    const d = Math.min(n, len * 2 - 0.001);
    const out = Math.sqrt(Math.max(0, len * len - (d / 2) * (d / 2))) * side;
    return [a[0] + dx / 2 + (dy / n) * out, a[1] + dy / 2 - (dx / n) * out];
  }

  /* 몸짓을 정한다. 모든 좌표는 "두 발 사이가 원점, 보는 쪽이 +x" 인 몸 기준 좌표.
     o.pose = { aim, fire } 가 오면(렌더러가 프레임마다 부드럽게 이어 준 값) 그것을 쓰고,
     없으면 recoil·charge 에서 바로 구한다. o.face 는 보는 쪽(+1 오른쪽, -1 왼쪽)을 고정한다. */
  function pose(level, aim, o) {
    const t = o.t || 0;
    const cast = o.cast || 0;
    const castK = Math.min(1, (1 - cast) * 6) * Math.min(1, cast * 3.5);
    const gest = o.gest || 'shock';
    const fire = o.pose ? o.pose.fire : o.recoil > 0 ? Math.min(1, o.recoil * 1.5) : 0;
    const aimK = (o.pose ? Math.max(o.pose.aim, fire) : Math.max(o.charge || 0, fire)) * (1 - castK);
    const dir = o.face || (Math.cos(aim) >= 0 ? 1 : -1);
    /* 겨누는 방향을 몸 기준으로: 광선을 휘두르다 머리 위·등 뒤로 넘어가도 몸을 뒤집지 않고 팔만 따라간다 */
    const thA = Math.atan2(Math.sin(aim) * ART.TILT, Math.cos(aim) * dir);
    const float = level === 2;
    const bob = Math.sin(t * 2.6) * 0.006;
    const slam = gest === 'pillar' ? castK : 0;
    const sky = gest === 'meteor' ? castK : 0;
    /* 화염파는 두 박자다: 움츠렸다가(wind), 발을 구르며 두 팔을 벌려 터뜨린다(blast) */
    const burst = gest === 'shock' ? Math.max(0, Math.min(1, (1 - cast - 0.2) / 0.12)) : 0;
    const wind = gest === 'shock' ? castK * (1 - burst) : 0;
    const blast = gest === 'shock' ? castK * burst : 0;
    /* 겨눌 때는 다리를 벌리고 무릎을 굽혀 버티고, 쏘는 동안은 뒤로 젖혀진다. 불기둥은 몸을 숙여 땅을 내리친다. */
    const crouch = (float ? 0 : aimK * 0.05) + slam * (float ? 0.06 : 0.16) + wind * (float ? 0.05 : 0.13);
    const lunge = float ? 0 : aimK * 0.085 + slam * 0.07 + blast * 0.06;
    const lean = aimK * 0.14 - fire * 0.3 + slam * 0.5 - sky * 0.16 + wind * 0.3 - blast * 0.2;
    const hip = [-lunge * 0.3 - fire * 0.025, -0.3 + crouch + bob];
    const neck = [hip[0] + Math.sin(lean) * 0.3, hip[1] - Math.cos(lean) * 0.3];
    const head = [neck[0] + Math.sin(lean - sky * 0.25) * 0.115 + 0.012, neck[1] - Math.cos(lean - sky * 0.25) * 0.115];
    /* 몸짓마다 두 팔이 가는 곳 [뒤쪽 팔, 앞쪽 팔] */
    const reach = {
      shock: [Math.PI / 2 + 0.9 + burst * (Math.PI / 2 - 0.65), Math.PI / 2 - 0.9 - burst * (Math.PI / 2 - 0.65)],
      pillar: [Math.PI + 0.75, Math.PI / 2 - 0.4],
      meteor: [-Math.PI / 2 - 0.34, -Math.PI / 2 + 0.36],
    }[gest];
    const arm = (side) => {
      /* side: -1 = 몸 뒤쪽 팔, +1 = 앞쪽 팔 */
      const sh = [neck[0] + side * 0.012, neck[1] + 0.035];
      const rest = Math.PI / 2 + (side < 0 ? 0.4 : -0.34);
      let th = rest + (thA - side * 0.12 - rest) * aimK;
      let up = reach[side < 0 ? 0 : 1];
      /* 가까운 쪽으로 돌아가도록 각도를 맞춘다 */
      while (up - th > Math.PI) up -= Math.PI * 2;
      while (up - th < -Math.PI) up += Math.PI * 2;
      th += (up - th) * castK;
      const bend = (side < 0 ? -0.5 : 0.5) * (1 - aimK) * (1 - castK) + castK * 0.12 * side + wind * 0.75 * side;
      const len = ARM * (1 + fire * 0.06 + slam * 0.08);
      const el = [sh[0] + Math.cos(th + bend) * len, sh[1] + Math.sin(th + bend) * len];
      const hd = [el[0] + Math.cos(th - bend) * len, el[1] + Math.sin(th - bend) * len];
      return { sh, el, hd };
    };
    const leg = (side) => {
      const foot = float
        ? [side < 0 ? -0.05 + Math.sin(t * 2.2) * 0.008 : 0.06, side < 0 ? -0.04 : -0.005]
        : [side < 0 ? -0.085 - lunge : 0.085 + lunge * 1.2, 0];
      const toe = float ? [foot[0] + 0.04, foot[1] + 0.04] : [foot[0] + 0.06, foot[1]];
      return { knee: joint(hip, foot, LIMB, 1), foot, toe };
    };
    return {
      s: SCALE[level],
      dir,
      hover: float ? 0.08 + 0.016 * Math.sin(t * 2.2) + sky * 0.07 - slam * 0.05 - wind * 0.04 + blast * 0.05 : sky * 0.015 + blast * 0.04,
      t, castK, fire, aimK, gest, slam, sky, wind, blast, hip, neck, head,
      armB: arm(-1),
      armF: arm(1),
      legB: leg(-1),
      legF: leg(1),
    };
  }

  /* 몸 둘레에 이는 불길: 단계가 오를수록 커진다 */
  function aura(ctx, level, p) {
    const power = [0, 0.5, 1][level] + p.fire * 0.2 + p.aimK * 0.12 + p.castK * 0.15 + p.blast * 0.5;
    if (power < 0.08) return;
    const n = level === 2 ? 7 : 5;
    const span = 0.12 + power * 0.1;
    for (const [alpha, wide, tall, color] of [[0.62, 1, 1, '255,104,24'], [0.8, 0.58, 0.64, '255,204,92']]) {
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1);
        const x = p.hip[0] + (f - 0.5) * span * 2;
        const hgt = (0.25 + 0.75 * Math.sin(f * Math.PI)) * (0.28 + power * 0.56) * tall * (0.86 + 0.14 * Math.sin(p.t * 7 + i * 1.9));
        tongue(ctx, x, 0.03, (0.05 + power * 0.025) * wide, hgt, Math.sin(p.t * 3.1 + i * 1.3) * 0.045, 'rgba(' + color + ',' + alpha + ')');
      }
    }
  }

  /* 피어오르는 불티 */
  function embers(ctx, level, p) {
    const n = 2 + level * 3 + (p.fire > 0 ? 3 : 0);
    for (let i = 0; i < n; i++) {
      const k = (p.t * (0.5 + (i % 3) * 0.13) + i * 0.29) % 1;
      const x = p.hip[0] + Math.sin(i * 2.4) * (0.12 + level * 0.07) + Math.sin(p.t * 2 + i) * 0.02;
      const y = -0.05 - k * (0.6 + level * 0.2);
      ctx.globalAlpha = (1 - k) * 0.95;
      artCircle(ctx, i % 2 ? '#ffd88f' : '#ff9226', x, y, 0.012 + (1 - k) * 0.008, 0);
    }
    ctx.globalAlpha = 1;
  }

  /* 망토: 목에서 뒤로 흘러내린다. 단계가 오를수록 길고 넓다. 끝자락은 타들어 가며 빛난다. */
  function cape(ctx, level, p) {
    const t = p.t;
    const flare = p.fire * 0.12 + p.castK * 0.1 + p.aimK * 0.03 + p.blast * 0.12;
    const nx = p.neck[0];
    const ny = p.neck[1];
    const hem = [-0.3, -0.12, 0.03][level] + p.fire * 0.02;
    const w = [0.15, 0.19, 0.21][level] + flare;
    const sway = (i) => Math.sin(t * 2 + i * 1.3) * (0.014 + flare * 0.05);
    /* 끝자락의 들쭉날쭉한 점들: 뒤(왼쪽)에서 앞(오른쪽)으로 */
    const teeth = level === 0 ? 4 : level === 1 ? 5 : 7;
    const x0 = -w - 0.09;
    const x1 = level === 0 ? -0.02 : 0.05 + flare * 0.7;
    const edge = [];
    for (let i = 0; i <= teeth; i++) {
      const f = i / teeth;
      edge.push(x0 + (x1 - x0) * f + sway(i), hem + (i % 2 ? 0.045 : -0.02) - Math.sin(f * Math.PI) * 0.015 + sway(i + 2) * 0.6);
    }
    ctx.beginPath();
    ctx.moveTo(nx - 0.05, ny + 0.02);
    ctx.quadraticCurveTo(-w - 0.13, ny + (hem - ny) * 0.42, edge[0], edge[1]);
    for (let i = 2; i < edge.length; i += 2) ctx.lineTo(edge[i], edge[i + 1]);
    ctx.quadraticCurveTo(x1 + 0.05, ny + (hem - ny) * 0.5, nx + 0.05, ny + 0.025);
    ctx.closePath();
    artFill(ctx, CAPE[1]);
    if (level >= 1) {
      /* 안감: 몸 뒤로 들여다보이는 쪽 */
      const mid = Math.floor(teeth * 0.55) * 2;
      ctx.beginPath();
      ctx.moveTo(nx - 0.03, ny + 0.07);
      ctx.lineTo(edge[mid], edge[mid + 1] - 0.02);
      for (let i = mid + 2; i < edge.length; i += 2) ctx.lineTo(edge[i], edge[i + 1] - 0.012);
      ctx.quadraticCurveTo(x1 + 0.035, ny + (hem - ny) * 0.5, nx + 0.035, ny + 0.06);
      ctx.closePath();
      ctx.fillStyle = INNER[1];
      ctx.fill();
    }
    /* 주름 */
    artLine(ctx, CAPE[0], artCurve(nx - 0.06, ny + 0.06, -w - 0.06, ny + (hem - ny) * 0.45, edge[0] + 0.035, edge[1] - 0.05, 8), 0.016);
    if (level >= 1) artLine(ctx, CAPE[2], artCurve(nx - 0.04, ny + 0.1, -w * 0.62, ny + (hem - ny) * 0.5, edge[4], edge[5] - 0.04, 8), 0.014);
    /* 타들어 가는 끝자락 */
    artLine(ctx, '#ff7a1a', edge, 0.024);
    artLine(ctx, '#ffd88f', edge, 0.009);
    for (let i = 0; i < teeth; i++) {
      const k = (t * 0.9 + i * 0.37) % 1;
      ctx.globalAlpha = 1 - k;
      artCircle(ctx, '#ffb347', edge[i * 2] + Math.sin(t * 3 + i) * 0.015, edge[i * 2 + 1] - k * 0.14, 0.011, 0);
    }
    ctx.globalAlpha = 1;
  }

  function limb(ctx, pts, front) {
    artStroke(ctx, front ? BODY[1] : BODY[2], pts, W);
    if (front) {
      /* 빛 받는 쪽 가장자리 */
      const hi = pts.map((v, i) => v + (i % 2 ? -0.012 : -0.01));
      artLine(ctx, BODY[0], hi.slice(0, 4), 0.012);
    }
  }

  function head(ctx, level, p) {
    const hx = p.head[0];
    const hy = p.head[1];
    const r = 0.1;
    const hot = p.fire > 0 || p.castK > 0.5;
    if (level === 2) {
      /* 머리 위로 타오르는 불꽃 */
      const f = 0.15 + 0.03 * Math.sin(p.t * 9);
      tongue(ctx, hx - 0.012, hy - 0.06, 0.07, f + 0.05, -0.05 + Math.sin(p.t * 4) * 0.02, '#ff7a1a');
      tongue(ctx, hx - 0.008, hy - 0.06, 0.042, f * 0.72, -0.03, '#ffd88f');
    }
    artCircle(ctx, BODY[1], hx, hy, r);
    artEllipse(ctx, BODY[0], hx - 0.03, hy - 0.04, 0.042, 0.03, 0, -0.5);
    ctx.beginPath();
    ctx.arc(hx, hy, r * 0.9, 0.1, 1.5);
    ctx.strokeStyle = BODY[2];
    ctx.lineWidth = 0.016;
    ctx.stroke();
    /* 얼굴은 없다. 치켜뜬 두 눈만 빛난다 */
    if (hot || level === 2) artGlow(ctx, hx + 0.04, hy + 0.005, 0.1, '255,246,207', hot ? 0.6 : 0.3);
    const big = hot ? 1.25 : 1;
    for (const [ex, ew] of [[hx + 0.008, 0.027], [hx + 0.066, 0.02]]) {
      const ey = hy + 0.008;
      artPoly(ctx, EYE, [ex - ew * big, ey - 0.024 * big, ex + ew * big, ey - 0.006 * big, ex + ew * 0.75 * big, ey + 0.022 * big, ex - ew * 0.8 * big, ey + 0.016 * big], ART.LW * 0.55);
    }
  }

  /* 손에 모이는 불 */
  function handGlow(ctx, p, a, seed) {
    const t = p.t;
    const k = Math.max(p.aimK, p.castK * 0.6);
    const r = 0.016 + k * 0.024 + p.fire * 0.03 + 0.004 * Math.sin(t * 9 + seed);
    artGlow(ctx, a.hd[0], a.hd[1], r * 3.4, GLOW, 0.3 + k * 0.25 + p.fire * 0.3);
    artCircle(ctx, 'rgba(255,190,90,.95)', a.hd[0], a.hd[1], r, 0);
    artCircle(ctx, '#ffffff', a.hd[0], a.hd[1], r * 0.55, 0);
    if (k > 0.3 && p.fire === 0) {
      /* 손으로 빨려드는 불티 */
      for (let i = 0; i < 3; i++) {
        const q = (t * 1.8 + i / 3 + seed) % 1;
        const ang = i * 2.1 + seed * 5 + t;
        ctx.globalAlpha = q;
        artCircle(ctx, '#ffe2a8', a.hd[0] + Math.cos(ang) * (1 - q) * 0.12, a.hd[1] + Math.sin(ang) * (1 - q) * 0.12, 0.009, 0);
        ctx.globalAlpha = 1;
      }
    }
  }

  TOWER_ART.lord = {
    /* 받침대는 없다. 발밑의 그림자와, 2단부터는 그을린 땅 */
    body(ctx, level) {
      artShadow(ctx, 0.04, 0.24, 0.26 + level * 0.03, 0.09);
      if (level === 0) return;
      const r = 0.34 + level * 0.04;
      ctx.beginPath();
      ctx.ellipse(0, 0.23, r, r * K, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(44,30,24,.4)';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 0.23, r * 0.62, r * 0.62 * K, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(30,20,18,.35)';
      ctx.fill();
      if (level === 2) {
        /* 갈라진 틈으로 불빛이 샌다 */
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9 + 0.3;
          const r0 = r * 0.3;
          const r1 = r * (0.75 + (i % 3) * 0.1);
          const mid = a + (i % 2 ? 0.14 : -0.14);
          const pts = [Math.cos(a) * r0, 0.23 + Math.sin(a) * r0 * K, Math.cos(mid) * (r0 + r1) / 2, 0.23 + Math.sin(mid) * ((r0 + r1) / 2) * K, Math.cos(a) * r1, 0.23 + Math.sin(a) * r1 * K];
          artLine(ctx, 'rgba(255,122,26,.9)', pts, 0.018);
          artLine(ctx, 'rgba(255,216,143,.9)', pts, 0.007);
        }
      }
    },

    top(ctx, level, aim, o) {
      const p = pose(level, aim, o);
      const t = p.t;
      /* 발밑에 고이는 불빛 */
      const lit = [0.12, 0.26, 0.4][level] + 0.06 * Math.sin(t * 2.4) + p.castK * 0.3 + p.fire * 0.25 + p.aimK * 0.1;
      const gr = 0.3 + level * 0.05;
      ctx.beginPath();
      ctx.ellipse(0, 0.23, gr, gr * K, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + GLOW + ',' + Math.min(0.6, lit) + ')';
      ctx.fill();
      if (p.castK > 0) {
        ctx.strokeStyle = 'rgba(255,216,143,' + p.castK + ')';
        ctx.lineWidth = 0.03;
        ctx.beginPath();
        ctx.ellipse(0, 0.23, gr + (1 - p.castK) * 0.25, (gr + (1 - p.castK) * 0.25) * K, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(0, FEET - p.hover);
      ctx.scale(p.dir * p.s, p.s);
      aura(ctx, level, p);
      cape(ctx, level, p);
      limb(ctx, [p.armB.sh[0], p.armB.sh[1], p.armB.el[0], p.armB.el[1], p.armB.hd[0], p.armB.hd[1]], false);
      artCircle(ctx, BODY[2], p.armB.hd[0], p.armB.hd[1], 0.036, ART.LW);
      limb(ctx, [p.hip[0], p.hip[1], p.legB.knee[0], p.legB.knee[1], p.legB.foot[0], p.legB.foot[1], p.legB.toe[0], p.legB.toe[1]], false);
      limb(ctx, [p.hip[0], p.hip[1], p.legF.knee[0], p.legF.knee[1], p.legF.foot[0], p.legF.foot[1], p.legF.toe[0], p.legF.toe[1]], true);
      limb(ctx, [p.neck[0], p.neck[1], p.hip[0], p.hip[1]], true);
      /* 망토를 여민 걸쇠 */
      artCircle(ctx, '#ffd88f', p.neck[0] + 0.004, p.neck[1] + 0.03, 0.026, ART.LW * 0.8);
      artCircle(ctx, '#ffffff', p.neck[0] - 0.004, p.neck[1] + 0.022, 0.009, 0);
      head(ctx, level, p);
      limb(ctx, [p.armF.sh[0], p.armF.sh[1], p.armF.el[0], p.armF.el[1], p.armF.hd[0], p.armF.hd[1]], true);
      artCircle(ctx, BODY[1], p.armF.hd[0], p.armF.hd[1], 0.036, ART.LW);
      handGlow(ctx, p, p.armB, 0.3);
      handGlow(ctx, p, p.armF, 0.7);
      embers(ctx, level, p);
      if (p.sky > 0) {
        /* 하늘로 뻗은 두 손 사이에서 불덩이가 자란다 */
        const x = (p.armB.hd[0] + p.armF.hd[0]) / 2;
        const y = Math.min(p.armB.hd[1], p.armF.hd[1]) - 0.07;
        artGlow(ctx, x, y, 0.2 * p.sky, GLOW, 0.7 * p.sky);
        artCircle(ctx, 'rgba(255,146,38,' + p.sky + ')', x, y, p.sky * (0.06 + 0.01 * Math.sin(t * 20)), 0);
        artCircle(ctx, 'rgba(255,246,207,' + p.sky + ')', x, y, 0.032 * p.sky, 0);
      }
      if (p.slam > 0.4) {
        /* 땅을 내리친 주먹에서 튀는 불꽃 */
        const x = p.armF.hd[0];
        const y = p.armF.hd[1];
        for (let i = 0; i < 4; i++) {
          const a = -Math.PI / 2 + (i - 1.5) * 0.5;
          artLine(ctx, 'rgba(255,216,143,' + p.slam + ')', [x + Math.cos(a) * 0.05, y + Math.sin(a) * 0.05, x + Math.cos(a) * (0.1 + p.slam * 0.06), y + Math.sin(a) * (0.1 + p.slam * 0.06)], 0.014);
        }
      }
      if (p.blast > 0.3) {
        /* 터져 나오는 순간 몸에서 뻗는 불빛 */
        const x = p.neck[0];
        const y = (p.neck[1] + p.hip[1]) / 2;
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4 + 0.2;
          artLine(ctx, 'rgba(255,216,143,' + p.blast * 0.9 + ')', [x + Math.cos(a) * 0.16, y + Math.sin(a) * 0.16, x + Math.cos(a) * (0.26 + p.blast * 0.1), y + Math.sin(a) * (0.26 + p.blast * 0.1)], 0.016);
        }
      }
      ctx.restore();
    },

    /* 쏘는 동안 두 손의 위치 (타일 중심 기준, 타일 단위) */
    hands(level, aim, o) {
      const p = pose(level, aim, o || { recoil: 1, t: 0 });
      const at = (h) => [p.dir * p.s * h[0], FEET - p.hover + p.s * h[1]];
      return [at(p.armB.hd), at(p.armF.hd)];
    },

  };
})();
