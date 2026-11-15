'use strict';
/* 야차 — 검붉은 귀기를 두른 영웅. 다른 영웅들과 같은 막대 인간이지만 머리에 뿔이 돋았고, 무기 없이 손톱으로 싸운다.
   손톱을 크게 휘둘러 땅을 가르는 귀참을 날린다: 내려 할퀴고, 되받아 올려 할퀴고, 세 번째는 두 손을 내뻗어 혼불을 푼다.
   (달려가는 귀참, 혼불, 귀염포의 줄기, 귀수는 렌더러가 전장에 따로 그린다.)
   1단: 작은 뿔 한 쌍, 분홍빛으로 빛나는 눈과 손톱, 짧은 옷자락.
   2단: 송곳니 돋은 흰 가면을 쓰고 머리 뒤로 분홍 불꽃이 인다. 뿔과 손톱이 커지고 발밑에 귀기가 고인다.
   3단: 큰 귀신으로 변신한다. 떡 벌어진 어깨와 굵은 팔, 큼직한 손톱, 타오르는 분홍 갈기, 크게 굽은 뿔.

   body 는 발밑의 그림자와 귀기 자국(움직이지 않는 부분), top 은 야차 자신.
   top 의 aim 은 겨눈 적이 있는 쪽(화면 각도). o 에는 { recoil, flash, t } 말고도 다음 값이 들어올 수 있다.
     face    보는 쪽 (+1 오른쪽, -1 왼쪽)
     pose    { idle, th }: idle 이 1 이면 두 팔을 늘어뜨리고 쉰다. th 는 할퀴는 팔이 가리키는 각도(몸 기준).
     swing   { k, step }: 공격 중. k 는 진행(0 → 1), step 0 = 내려 할퀴기, 1 = 올려 할퀴기, 2 = 혼불 풀기
     next    다음에 할 공격: 그 공격이 시작될 자리에 팔을 두고 기다린다
     gest    지금 하는 몸짓: 'breath'(귀염포: 몸을 젖혀 기를 모았다가 내뿜는다), 'beast'(귀수: 두 팔을 벌리고 포효한다)
     cast    그 몸짓이 남은 정도 (1 → 0)
     wind    귀염포에서 기를 모으는 구간의 비율 (0 ~ 1): 그 뒤로는 내뿜는다
     chargeB 다음 귀염포가 준비된 정도 (0 → 1): 입가의 불빛이 짙어진다
   mouth(level, aim, o) 는 귀염포가 뿜어져 나오는 입의 위치(타일 중심 기준)를 돌려준다. */
(function () {
  const BODY = ['#ff8fb5', '#6e1832', '#3d0d1e']; /* 몸: (쓰지 않음), 앞쪽 팔다리, 뒤쪽 팔다리 */
  const ROBE = ['#8c1a3c', '#4a0d22', '#280613'];
  const HOT = '#ff4f9a';
  const PALE = '#ffc2dc';
  const CRIM = '#d81b4f';
  const BONE = '#fff3ea';
  const GLOW = '255,79,154';
  const K = ART.K;
  const FEET = 0.2;
  const SCALE = [1.3, 1.42, 1.72];
  const W = [0.052, 0.054, 0.072]; /* 팔다리 굵기: 변신하면 굵어진다 */
  const LIMB = 0.16; /* 허벅지·정강이 길이 */
  const ARM = 0.14; /* 위팔·아래팔 길이 */
  const CLAW = [0.07, 0.09, 0.13]; /* 손톱 길이 */
  const TAIL = [0.16, 0.24, 0.3]; /* 옷자락 길이 */
  const HIGH = -1.75; /* 내려 할퀴기가 시작되는 자리: 겨눈 쪽에서 이만큼 위 */
  const LOW = 1.0; /* 내려 할퀴기가 끝나는 자리 */

  const smooth = (x) => {
    const k = Math.max(0, Math.min(1, x));
    return k * k * (3 - 2 * k);
  };
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

  /* 화면 각도 → 몸 기준으로 겨눈 쪽 */
  function center(aim, dir) {
    return Math.max(-0.55, Math.min(0.55, Math.atan2(Math.sin(aim) * ART.TILT, Math.cos(aim) * dir)));
  }

  function swingAngle(step, k, c) {
    const e = smooth(k);
    return step === 0 ? c + HIGH + (LOW - HIGH) * e : c + LOW + (HIGH - LOW) * e;
  }

  /* 다음 공격을 기다리는 동안 팔을 두는 각도. 혼불을 풀기 전에는 손을 허리께로 당겨 둔다 */
  function guardAngle(next, c) {
    return next === 0 ? c + HIGH : next === 1 ? c + LOW : 1.5;
  }

  const tailOf = (k) => Math.max(0, (k - 0.3) / 0.7) ** 2;

  function joint(a, b, len, side) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const n = Math.hypot(dx, dy) || 1;
    const d = Math.min(n, len * 2 - 0.001);
    const out = Math.sqrt(Math.max(0, len * len - (d / 2) * (d / 2))) * side;
    return [a[0] + dx / 2 + (dy / n) * out, a[1] + dy / 2 - (dx / n) * out];
  }

  /* 팔: 팔꿈치는 늘 같은 쪽으로만 접힌다 */
  function armTo(sh, hand) {
    const dx = hand[0] - sh[0];
    const dy = hand[1] - sh[1];
    const n = Math.hypot(dx, dy) || 1;
    const far = Math.max(n, 0.2);
    return { sh, el: joint(sh, [sh[0] + (dx / n) * far, sh[1] + (dy / n) * far], ARM, -1), hd: hand, dir: [dx / n, dy / n] };
  }

  /* 몸짓을 정한다. 모든 좌표는 "두 발 사이가 원점, 보는 쪽이 +x" 인 몸 기준 좌표(옆에서 본 모습). */
  function pose(level, aim, o) {
    const t = o.t || 0;
    const dir = o.face || (Math.cos(aim) >= 0 ? 1 : -1);
    const c = center(aim, dir);
    const cast = o.cast || 0;
    const gest = cast > 0 ? o.gest : null;
    const ck = 1 - cast; /* 몸짓의 진행: 0 → 1 */
    const castK = gest ? Math.min(1, ck * 8) * Math.min(1, cast * 6) : 0;
    const still = !o.pose && !o.swing && o.next == null && !o.gest;
    const idle = (o.pose ? o.pose.idle : still ? 1 : 0) * (1 - castK);
    const sw = o.swing || null;
    const k = sw ? Math.min(1, sw.k) : 0;
    const volley = !!sw && sw.step === 2;
    const power = sw && !volley ? Math.sin(k * Math.PI) : 0; /* 할퀴는 힘 */
    const push = volley ? smooth(k / 0.4) * (1 - smooth((k - 0.75) / 0.25)) : 0; /* 혼불을 내미는 정도 */
    const big = level === 2;

    /* 귀염포: 몸을 젖혀 기를 모으다가(wind), 앞으로 숙이며 내뿜는다(blow) */
    const windEnd = o.wind == null ? 0.35 : o.wind;
    const breath = gest === 'breath' ? castK : 0;
    const blow = gest === 'breath' ? smooth((ck - windEnd) / 0.08) : 0;
    const roar = gest === 'beast' ? castK : 0;

    /* 할퀴는 팔이 가리키는 쪽 */
    let th = o.pose && o.pose.th != null ? o.pose.th : sw && !volley ? swingAngle(sw.step, k, c) : guardAngle(o.next || 0, c);
    const turn = (to, by) => {
      let g = to;
      while (g - th > Math.PI) g -= Math.PI * 2;
      while (g - th < -Math.PI) g += Math.PI * 2;
      th += (g - th) * by;
    };
    if (volley) turn(c * 0.6 - 0.15, push); /* 혼불: 손바닥을 앞으로 */
    if (breath) turn(2.2 - blow * 0.4, breath); /* 귀염포: 두 팔을 뒤로 젖힌다 */
    if (roar) turn(0.95, roar); /* 귀수: 두 팔을 벌려 내린다 */
    turn(1.32, idle); /* 쉴 때: 늘어뜨린다 */
    const lead = sw && !volley ? (sw.step === 0 ? 1 : -1) * 0.25 * power : 0;

    const active = 1 - idle;
    const fwd = Math.max(-0.4, Math.sin(th - c + 0.25)) * (1 - breath) * (1 - roar) * (1 - push) + push * 0.35 + breath * (blow * 0.75 - (1 - blow) * 0.55) - roar * 0.35;
    const bob = Math.sin(t * 2.6) * 0.006;
    const hunch = big ? 0.16 : 0; /* 변신한 몸은 구부정하다 */
    const crouch = active * (0.03 + 0.05 * Math.max(0, fwd)) + power * 0.02 + (big ? 0.03 : 0);
    const lunge = active * (0.05 + 0.085 * Math.max(0, fwd)) + power * 0.02 + (big ? 0.03 : 0);
    const lean = hunch + active * (0.06 + 0.2 * fwd);
    const hip = [-lunge * 0.3, -0.3 + crouch + bob];
    const neck = [hip[0] + Math.sin(lean) * 0.3, hip[1] - Math.cos(lean) * 0.3];
    const tilt = lean - roar * 0.5 - breath * (1 - blow) * 0.3; /* 포효할 때와 기를 모을 때는 고개를 젖힌다 */
    const head = [neck[0] + Math.sin(tilt) * 0.115 + 0.012, neck[1] - Math.cos(tilt) * 0.115];
    const wide = big ? 0.05 : 0.012; /* 어깨너비 */
    const shF = [neck[0] + wide, neck[1] + 0.035];
    const shB = [neck[0] - wide, neck[1] + 0.035];
    const R = 0.2 + 0.07 * power + 0.05 * push;
    const handF = [shF[0] + Math.cos(th + lead) * R, shF[1] + Math.sin(th + lead) * R];
    /* 뒷손: 가슴께에서 받쳐 준다. 혼불·귀염포·포효 때는 앞손과 같은 쪽으로 간다 */
    const both = Math.max(push, breath, roar);
    const guardB = [shB[0] + 0.09 - idle * 0.12, shB[1] + 0.13 + idle * 0.07];
    /* 포효할 때는 뒷팔을 등 뒤로 벌리고, 혼불·귀염포 때는 앞팔과 나란히 둔다 */
    const mirror = roar > 0.5 ? [shB[0] - Math.cos(th) * R, shB[1] + Math.sin(th) * R] : [shB[0] + Math.cos(th + 0.22) * R, shB[1] + Math.sin(th + 0.22) * R];
    const handB = mix(guardB, mirror, both);
    const leg = (side) => {
      const foot = [side < 0 ? -0.085 - lunge : 0.085 + lunge * 1.25, 0];
      return { knee: joint(hip, foot, LIMB, 1), foot, toe: [foot[0] + 0.06, 0] };
    };
    /* 입: 얼굴 앞쪽 아래 */
    const mouth = [head[0] + 0.085, head[1] + 0.045];
    return {
      s: SCALE[level],
      dir, t, c, k, level, gest, ck, castK, idle, power, push, volley, sw, th, breath, blow, roar,
      hip, neck, head, shF, shB, mouth, reach: R,
      armF: armTo(shF, handF),
      armB: armTo(shB, handB),
      legB: leg(-1),
      legF: leg(1),
    };
  }

  function limb(ctx, level, pts, front) {
    artStroke(ctx, front ? BODY[1] : BODY[2], pts, W[level]);
  }

  /* 팔과 손톱. 손톱은 팔이 뻗는 쪽으로 세 갈래 돋는다 */
  function arm(ctx, level, a, front, glow) {
    limb(ctx, level, [a.sh[0], a.sh[1], a.el[0], a.el[1], a.hd[0], a.hd[1]], front);
    const hx = a.hd[0];
    const hy = a.hd[1];
    const ux = a.dir[0];
    const uy = a.dir[1];
    const len = CLAW[level];
    const palm = level === 2 ? 0.058 : 0.036;
    if (glow > 0.05) artGlow(ctx, hx + ux * len * 0.5, hy + uy * len * 0.5, 0.12 + len, GLOW, 0.5 * glow);
    for (const off of [-0.6, 0, 0.6]) {
      const bx = hx + (-uy) * off * palm * 0.75;
      const by = hy + ux * off * palm * 0.75;
      const tx = bx + ux * len * (off ? 0.86 : 1) + (-uy) * off * len * 0.22;
      const ty = by + uy * len * (off ? 0.86 : 1) + ux * off * len * 0.22;
      const w = palm * 0.34;
      artPoly(ctx, BONE, [bx + (-uy) * w, by + ux * w, tx, ty, bx - (-uy) * w, by - ux * w], ART.LW * 0.7);
    }
    artCircle(ctx, front ? (level === 2 ? CRIM : BODY[1]) : BODY[2], hx, hy, palm, ART.LW);
  }

  /* 나부끼는 옷자락 */
  function tail(ctx, level, p, x0, y0, phase, tone) {
    const n = 5;
    const seg = TAIL[level] / n;
    const lift = p.power * 0.8 + (1 - p.idle) * 0.3 + p.castK * 0.5;
    const mid = [];
    let x = x0;
    let y = y0;
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const ang = Math.PI - 1.15 + lift * 0.85 + Math.sin(p.t * 4.2 - f * 4 + phase) * 0.4 * (0.25 + f);
      mid.push([x, y, ang, 0.05 * (1 - f * 0.75)]);
      x += Math.cos(ang) * seg;
      y += Math.sin(ang) * seg;
    }
    const pts = [];
    for (const c of mid) pts.push(c[0] + Math.sin(c[2]) * c[3], c[1] - Math.cos(c[2]) * c[3]);
    for (let i = mid.length - 1; i >= 0; i--) pts.push(mid[i][0] - Math.sin(mid[i][2]) * mid[i][3], mid[i][1] + Math.cos(mid[i][2]) * mid[i][3]);
    artPoly(ctx, tone, pts, ART.LW * 0.8);
  }

  /* 머리 뒤로 이는 분홍 불꽃 갈기 (2단부터). 큼직한 불꽃 몇 가닥이 뒤로 휘날린다 */
  function mane(ctx, level, p) {
    if (level === 0) return;
    const t = p.t;
    const hx = p.head[0];
    const hy = p.head[1];
    const n = level === 2 ? 5 : 2;
    const span = level === 2 ? 2.2 : 0.7;
    for (const [wide, tall, color] of [[1, 1, '#d81b4f'], [0.58, 0.68, '#ff7ab2']]) {
      for (let i = 0; i < n; i++) {
        const f = n === 1 ? 0.5 : i / (n - 1);
        const a = -Math.PI / 2 - 0.55 - span / 2 + span * f; /* 머리 위에서 뒤쪽으로 */
        const bx = hx + Math.cos(a) * 0.07;
        const by = hy + Math.sin(a) * 0.07;
        const hgt = (level === 2 ? 0.27 : 0.17) * (0.72 + 0.28 * Math.sin(f * Math.PI)) * tall * (0.9 + 0.1 * Math.sin(t * 7 + i * 1.9));
        const w = (level === 2 ? 0.07 : 0.055) * wide;
        const tx = bx + Math.cos(a) * hgt + Math.sin(t * 4 + i) * 0.012;
        const ty = by + Math.sin(a) * hgt - hgt * 0.3;
        ctx.beginPath();
        ctx.moveTo(bx - Math.sin(a) * w, by + Math.cos(a) * w);
        ctx.quadraticCurveTo(bx + Math.cos(a) * hgt * 0.5 - Math.sin(a) * w * 1.3, by + Math.sin(a) * hgt * 0.5 + Math.cos(a) * w * 1.3, tx, ty);
        ctx.quadraticCurveTo(bx + Math.cos(a) * hgt * 0.45 + Math.sin(a) * w * 1.3, by + Math.sin(a) * hgt * 0.45 - Math.cos(a) * w * 1.3, bx + Math.sin(a) * w, by - Math.cos(a) * w);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      }
    }
  }

  /* 뿔 한 쌍: 단계가 오를수록 크게 굽는다 */
  function horns(ctx, level, p) {
    const hx = p.head[0];
    const hy = p.head[1];
    const len = [0.075, 0.1, 0.17][level];
    for (const [ox, lean, tone] of [[-0.04, -0.4, '#e8d5c4'], [0.052, 0.32, BONE]]) {
      const bx = hx + ox;
      const by = hy - 0.085;
      const tx = bx + lean * len + (level === 2 ? lean * 0.06 : 0);
      const ty = by - len;
      const w = 0.026 + level * 0.004;
      ctx.beginPath();
      ctx.moveTo(bx - w, by + 0.01);
      ctx.quadraticCurveTo(bx - w + lean * len * 0.2, by - len * 0.6, tx, ty);
      ctx.quadraticCurveTo(bx + w + lean * len * 0.7, by - len * 0.5, bx + w, by + 0.01);
      ctx.closePath();
      artFill(ctx, tone, ART.LW * 0.8);
    }
  }

  function head(ctx, level, p) {
    const hx = p.head[0];
    const hy = p.head[1];
    const r = level === 2 ? 0.108 : 0.1;
    horns(ctx, level, p);
    artCircle(ctx, BODY[1], hx, hy, r);
    const hot = p.power > 0.3 || p.castK > 0.4 || p.push > 0.3;
    if (level >= 1) {
      /* 송곳니 돋은 흰 가면: 얼굴 앞쪽을 덮는다 */
      ctx.beginPath();
      ctx.moveTo(hx - 0.012, hy - r * 0.78);
      ctx.quadraticCurveTo(hx + r * 1.02, hy - r * 0.8, hx + r * 0.98, hy + r * 0.12);
      ctx.quadraticCurveTo(hx + r * 0.9, hy + r * 0.72, hx + r * 0.3, hy + r * 0.86);
      ctx.quadraticCurveTo(hx - 0.01, hy + r * 0.4, hx - 0.012, hy - r * 0.78);
      ctx.closePath();
      artFill(ctx, BONE, ART.LW * 0.8);
      /* 벌린 입과 송곳니 */
      artPoly(ctx, '#2a0612', [hx + r * 0.3, hy + r * 0.34, hx + r * 0.92, hy + r * 0.26, hx + r * 0.84, hy + r * 0.58, hx + r * 0.36, hy + r * 0.66], 0);
      for (const fx of [0.44, 0.74]) artPoly(ctx, BONE, [hx + r * (fx - 0.07), hy + r * 0.32, hx + r * (fx + 0.07), hy + r * 0.3, hx + r * fx, hy + r * 0.56], 0);
    }
    /* 치켜뜬 두 눈: 분홍빛으로 탄다 */
    if (hot) artGlow(ctx, hx + 0.045, hy + 0.0, 0.1, GLOW, 0.6);
    const bigEye = hot ? 1.2 : 1;
    for (const [ex, ew] of [[hx + 0.014, 0.026], [hx + 0.068, 0.019]]) {
      const ey = hy - 0.006;
      artPoly(ctx, hot || level === 2 ? '#ffffff' : HOT, [ex - ew * bigEye, ey - 0.022 * bigEye, ex + ew * bigEye, ey - 0.004 * bigEye, ex + ew * 0.75 * bigEye, ey + 0.018 * bigEye, ex - ew * 0.8 * bigEye, ey + 0.012 * bigEye], ART.LW * 0.5);
    }
  }

  /* 손톱이 지나간 자리의 세 줄기 빛 */
  function crescent(ctx, cx, cy, r, a0, a1, thick, alpha) {
    const span = a1 - a0;
    if (Math.abs(span) < 0.06) return;
    const n = Math.max(5, Math.ceil(Math.abs(span) / 0.16));
    const prof = (f) => Math.sin(Math.PI * Math.pow(f, 1.45));
    const layer = (out, th, color) => {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = a0 + (span * i) / n;
        if (i) ctx.lineTo(cx + Math.cos(a) * (r + out), cy + Math.sin(a) * (r + out));
        else ctx.moveTo(cx + Math.cos(a) * (r + out), cy + Math.sin(a) * (r + out));
      }
      for (let i = n; i >= 0; i--) {
        const f = i / n;
        const a = a0 + span * f;
        const q = r + out - th * prof(f);
        ctx.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };
    layer(0.012, thick * 1.5, 'rgba(90,10,36,' + 0.7 * alpha + ')');
    layer(0.006, thick, 'rgba(216,27,79,' + 0.95 * alpha + ')');
    layer(0, thick * 0.55, 'rgba(255,79,154,' + alpha + ')');
    layer(-0.004, thick * 0.24, 'rgba(255,255,255,' + alpha + ')');
  }

  function trail(ctx, level, p) {
    if (!p.sw || p.volley) return;
    const k = p.k;
    const fade = Math.min(1, (1 - k) * 3.2 + 0.1);
    const a0 = swingAngle(p.sw.step, 0, p.c);
    const tl = a0 + (p.th - a0) * tailOf(k);
    const base = p.reach + CLAW[level] * 0.35;
    for (let i = 0; i < 3; i++) crescent(ctx, p.shF[0], p.shF[1], base + i * (0.075 + level * 0.015), tl, p.th, 0.085 + level * 0.02, fade);
  }

  /* 발치에 이는 귀기: 변신한 뒤에만 인다 */
  function fire(ctx, level, p) {
    if (level < 2) return;
    const power = 0.7 + p.power * 0.3 + p.castK * 0.4;
    for (const [wide, tall, color] of [[1, 1, 'rgba(216,27,79,.75)'], [0.55, 0.6, 'rgba(255,170,205,.9)']]) {
      for (let i = 0; i < 4; i++) {
        const f = i / 3;
        const x = p.hip[0] + (f - 0.5) * (0.3 + power * 0.12);
        const hgt = (0.4 + 0.6 * Math.sin(f * Math.PI)) * (0.12 + power * 0.2) * tall * (0.88 + 0.12 * Math.sin(p.t * 6 + i * 1.9));
        KIT.tongue(ctx, x, 0.03, (0.055 + power * 0.02) * wide, hgt, Math.sin(p.t * 3.1 + i * 1.3) * 0.03, color);
      }
    }
  }

  /* 손바닥에 맺히는 혼불 */
  function wisp(ctx, x, y, r, t, seed) {
    artGlow(ctx, x, y, r * 3, GLOW, 0.6);
    KIT.tongue(ctx, x, y + r, r * 0.95, r * 2.6 + Math.sin(t * 9 + seed) * r * 0.3, Math.sin(t * 5 + seed) * r * 0.3, 'rgba(216,27,79,.9)');
    artCircle(ctx, '#33091a', x, y, r, 0);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = HOT;
    ctx.lineWidth = 0.014;
    ctx.stroke();
    artCircle(ctx, '#ffffff', x - r * 0.3, y - r * 0.1, r * 0.2, 0);
    artCircle(ctx, '#ffffff', x + r * 0.3, y - r * 0.1, r * 0.2, 0);
  }

  TOWER_ART.oni = {
    center,
    swingAngle,
    guardAngle,

    /* 받침대는 없다. 발밑의 그림자와, 2단부터는 귀기가 고인 자국 */
    body(ctx, level) {
      artShadow(ctx, 0.04, 0.24, 0.26 + level * 0.05, 0.09 + level * 0.008);
      if (level === 0) return;
      const r = 0.34 + level * 0.05;
      ctx.beginPath();
      ctx.ellipse(0, 0.23, r, r * K, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(48,8,22,.42)';
      ctx.fill();
      /* 귀기가 고인 자리의 테두리: 3단은 두 겹 */
      ctx.beginPath();
      ctx.ellipse(0, 0.23, r * 0.94, r * 0.94 * K, 0, 0, Math.PI * 2);
      ctx.strokeStyle = level === 2 ? 'rgba(255,79,154,.9)' : 'rgba(216,27,79,.7)';
      ctx.lineWidth = 0.024;
      ctx.stroke();
      if (level === 2) {
        ctx.beginPath();
        ctx.ellipse(0, 0.23, r * 0.62, r * 0.62 * K, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(216,27,79,.8)';
        ctx.lineWidth = 0.018;
        ctx.stroke();
      }
    },

    top(ctx, level, aim, o) {
      const p = pose(level, aim, o);
      const t = p.t;
      const big = level === 2;
      /* 발밑에 고이는 귀기 */
      const lit = [0, 0.1, 0.22][level] + p.castK * 0.3 + p.power * 0.2;
      const gr = 0.3 + level * 0.06;
      ctx.beginPath();
      ctx.ellipse(0, 0.23, gr, gr * K, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + GLOW + ',' + Math.min(0.5, lit) + ')';
      ctx.fill();
      if (p.castK > 0) {
        ctx.strokeStyle = 'rgba(255,194,220,' + p.castK + ')';
        ctx.lineWidth = 0.03;
        ctx.beginPath();
        ctx.ellipse(0, 0.23, gr + p.ck * 0.3, (gr + p.ck * 0.3) * K, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(0, FEET);
      ctx.scale(p.dir * p.s, p.s);
      fire(ctx, level, p);
      mane(ctx, level, p);
      tail(ctx, level, p, p.hip[0] - 0.03, p.hip[1] - 0.06, 1.3, ROBE[2]);
      tail(ctx, level, p, p.hip[0] - 0.01, p.hip[1] - 0.075, 0, ROBE[1]);
      const glow = Math.max(p.power, p.push, p.castK * 0.7);
      arm(ctx, level, p.armB, false, glow * 0.6);
      limb(ctx, level, [p.hip[0], p.hip[1], p.legB.knee[0], p.legB.knee[1], p.legB.foot[0], p.legB.foot[1], p.legB.toe[0], p.legB.toe[1]], false);
      limb(ctx, level, [p.hip[0], p.hip[1], p.legF.knee[0], p.legF.knee[1], p.legF.foot[0], p.legF.foot[1], p.legF.toe[0], p.legF.toe[1]], true);
      limb(ctx, level, [p.neck[0], p.neck[1], p.hip[0], p.hip[1]], true);
      if (big) {
        /* 변신한 몸: 떡 벌어진 어깨에서 허리로 좁아지는 검은 옷과 붉은 깃 */
        const nx = p.neck[0];
        const ny = p.neck[1];
        artPoly(ctx, ROBE[2], [nx - 0.115, ny + 0.01, nx + 0.125, ny + 0.01, p.hip[0] + 0.075, p.hip[1] - 0.02, p.hip[0] - 0.07, p.hip[1] - 0.02]);
        artLine(ctx, CRIM, [nx - 0.055, ny + 0.03, (nx + p.hip[0]) / 2 + 0.01, (ny + p.hip[1]) / 2 - 0.01, nx + 0.075, ny + 0.03], 0.026);
      }
      /* 허리띠 */
      artStroke(ctx, big ? CRIM : ROBE[0], [p.hip[0] - 0.035 - (big ? 0.03 : 0), p.hip[1] - 0.05, p.hip[0] + 0.04 + (big ? 0.03 : 0), p.hip[1] - 0.045], 0.026);
      head(ctx, level, p);
      arm(ctx, level, p.armF, true, glow);
      trail(ctx, level, p);
      if (p.volley && p.k < 0.5) {
        /* 두 손바닥 위에 맺혔다가 풀려나는 혼불 */
        const g = smooth(p.k / 0.4);
        wisp(ctx, p.armF.hd[0] + 0.07, p.armF.hd[1] - 0.02, 0.025 + 0.03 * g, t, 0);
        wisp(ctx, p.armB.hd[0] + 0.06, p.armB.hd[1] - 0.03, 0.02 + 0.025 * g, t, 2);
      }
      if (p.breath > 0.05) {
        /* 입가에 모이는 귀기: 내뿜기 시작하면 줄기는 렌더러가 그린다 */
        const g = p.blow > 0 ? 1 : smooth(p.ck / (o.wind == null ? 0.35 : o.wind));
        const r = 0.03 + 0.06 * g + 0.008 * Math.sin(t * 22);
        artGlow(ctx, p.mouth[0] + 0.03, p.mouth[1], r * 3.4, GLOW, 0.85 * p.breath);
        artCircle(ctx, 'rgba(216,27,79,' + p.breath + ')', p.mouth[0] + 0.03, p.mouth[1], r, 0);
        artCircle(ctx, 'rgba(255,255,255,' + p.breath + ')', p.mouth[0] + 0.03, p.mouth[1], r * 0.55, 0);
      }
      ctx.restore();
    },

    /* 귀염포가 뿜어져 나오는 입의 위치 (타일 중심 기준, 타일 단위) */
    mouth(level, aim, o) {
      const p = pose(level, aim, o || { t: 0 });
      return [p.dir * p.s * (p.mouth[0] + 0.04), FEET + p.s * p.mouth[1]];
    },
  };
})();
