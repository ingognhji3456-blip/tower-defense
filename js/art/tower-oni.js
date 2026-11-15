'use strict';
/* 야차 — 검붉은 귀기를 두른 영웅. 다른 영웅들과 같은 막대 인간이지만 머리에 뿔이 돋았고, 무기 없이 손톱으로 싸운다.
   손톱을 크게 휘둘러 땅을 가르는 귀참을 날린다: 내려 할퀴고, 되받아 올려 할퀴고, 세 번째는 두 손을 내뻗어 혼불을 푼다.
   (달려가는 귀참, 혼불, 귀염포의 줄기, 귀수는 렌더러가 전장에 따로 그린다.)
   1단: 작은 뿔 한 쌍, 분홍빛으로 빛나는 눈, 짧은 옷자락.
   2단: 송곳니 돋은 흰 가면을 쓰고 머리 뒤로 분홍 불꽃이 인다. 뿔과 손톱이 커지고 발밑에 귀기가 고인다.
   3단: 뿔과 갈기가 더 자라고 발치에 귀기가 인다. 때가 되면 스무 초 동안 큰 괴물로 변신한다:
        제 키의 몇 곱절이나 되는 귀신이 그 자리에서 솟는다. 타오르는 분홍 갈기와 네 개의 뿔, 송곳니 돋은 흰 가면,
        양 끝이 뾰족하게 선 검은 망토, 그리고 몸통만 한 붉은 두 손. 다리는 없고 몸 아래는 귀기가 되어 땅에 닿는다.
        가까운 손으로 내려찍고, 먼 손으로 올려 할퀴고, 두 손을 내밀어 혼불을 푼다. 발밑의 고리가 남은 시간을 알린다.

   body 는 발밑의 그림자와 귀기 자국(움직이지 않는 부분), top 은 야차 자신.
   top 의 aim 은 겨눈 적이 있는 쪽(화면 각도). o 에는 { recoil, flash, t } 말고도 다음 값이 들어올 수 있다.
     face    보는 쪽 (+1 오른쪽, -1 왼쪽)
     pose    { idle, th }: idle 이 1 이면 두 팔을 늘어뜨리고 쉰다. th 는 할퀴는 팔이 가리키는 각도(몸 기준).
     swing   { k, step }: 공격 중. k 는 진행(0 → 1), step 0 = 내려 할퀴기, 1 = 올려 할퀴기, 2 = 혼불 풀기
     next    다음에 할 공격: 그 공격이 시작될 자리에 팔을 두고 기다린다
     gest    지금 하는 몸짓: 'breath'(귀염포: 몸을 젖혀 기를 모았다가 내뿜는다),
             'beast'·'rage'(귀수를 부를 때와 변신할 때: 두 팔을 벌리고 포효한다)
     cast    그 몸짓이 남은 정도 (1 → 0)
     wind    귀염포에서 기를 모으는 구간의 비율 (0 ~ 1): 그 뒤로는 내뿜는다
     form    변신한 정도 (0 = 본모습 → 1 = 큰 괴물). 렌더러가 부드럽게 이어 준다
     gauge   발밑 고리가 찬 정도 (0 ~ 1): 변신한 동안에는 남은 시간, 아닐 때는 다음 변신이 준비된 정도
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
  const SCALE = [1.3, 1.42, 1.5];
  const W = [0.052, 0.054, 0.056]; /* 팔다리 굵기 */
  const LIMB = 0.16; /* 허벅지·정강이 길이 */
  const ARM = 0.14; /* 위팔·아래팔 길이 */
  const CLAW = [0.07, 0.09, 0.1]; /* 손톱 길이 */
  const TAIL = [0.16, 0.24, 0.27]; /* 옷자락 길이 */
  const HIGH = -1.75; /* 내려 할퀴기가 시작되는 자리: 겨눈 쪽에서 이만큼 위 */
  const LOW = 1.0; /* 내려 할퀴기가 끝나는 자리 */
  /* 변신한 큰 괴물의 치수 (타일 단위, 땅에 닿는 자리가 원점) */
  const GIANT = 1.15; /* 크기 */
  const G_SH = [0.56, -1.2]; /* 가까운 쪽 어깨: 먼 쪽은 x 를 뒤집는다 */
  const G_HEAD = [0.04, -1.64]; /* 머리 한가운데 */
  const G_ARM = 0.42; /* 위팔·아래팔 길이 */
  const G_REACH = 0.66; /* 어깨에서 손바닥까지 */
  const G_W = 0.2; /* 팔 굵기 */
  const G_HAND = 1.5; /* 손의 크기 */
  const G_IDLE = 1.15; /* 가까운 손이 늘어져 쉬는 각도 */
  const G_REST = 1.95; /* 먼 손이 늘어져 쉬는 각도 */
  const G_FAR = ['#a81542', '#e8d5c4']; /* 먼 쪽 팔과 손톱 */
  const HORN = '#33091a';
  const LILAC = '#ecd0ff';

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
    const form = level === 2 ? Math.max(0, Math.min(1, o.form || 0)) : 0; /* 변신한 정도 */
    const giant = form > 0.5; /* 절반을 넘기면 큰 괴물의 모습으로 바뀐다 */

    /* 귀염포: 몸을 젖혀 기를 모으다가(wind), 앞으로 숙이며 내뿜는다(blow) */
    const windEnd = o.wind == null ? 0.35 : o.wind;
    const breath = gest === 'breath' ? castK : 0;
    const blow = gest === 'breath' ? smooth((ck - windEnd) / 0.08) : 0;
    const roar = gest === 'beast' || gest === 'rage' ? castK : 0; /* 귀수를 부를 때와 변신할 때 포효한다 */

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
    const crouch = active * (0.03 + 0.05 * Math.max(0, fwd)) + power * 0.02;
    const lunge = active * (0.05 + 0.085 * Math.max(0, fwd)) + power * 0.02;
    const lean = active * (0.06 + 0.2 * fwd);
    const hip = [-lunge * 0.3, -0.3 + crouch + bob];
    const neck = [hip[0] + Math.sin(lean) * 0.3, hip[1] - Math.cos(lean) * 0.3];
    const tilt = lean - roar * 0.5 - breath * (1 - blow) * 0.3; /* 포효할 때와 기를 모을 때는 고개를 젖힌다 */
    const head = [neck[0] + Math.sin(tilt) * 0.115 + 0.012, neck[1] - Math.cos(tilt) * 0.115];
    const shF = [neck[0] + 0.012, neck[1] + 0.035];
    const shB = [neck[0] - 0.012, neck[1] + 0.035];
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
      s: SCALE[level] * (1 + 0.3 * smooth(form * 2)), /* 변신이 시작되면 본모습이 부풀다가 */
      gs: GIANT * (0.3 + 0.7 * smooth(form * 2 - 1)), /* 큰 괴물이 땅에서 솟는다 */
      giant, form,
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
    const palm = 0.036;
    if (glow > 0.05) artGlow(ctx, hx + ux * len * 0.5, hy + uy * len * 0.5, 0.12 + len, GLOW, 0.5 * glow);
    for (const off of [-0.6, 0, 0.6]) {
      const bx = hx + (-uy) * off * palm * 0.75;
      const by = hy + ux * off * palm * 0.75;
      const tx = bx + ux * len * (off ? 0.86 : 1) + (-uy) * off * len * 0.22;
      const ty = by + uy * len * (off ? 0.86 : 1) + ux * off * len * 0.22;
      const w = palm * 0.34;
      artPoly(ctx, BONE, [bx + (-uy) * w, by + ux * w, tx, ty, bx - (-uy) * w, by - ux * w], ART.LW * 0.7);
    }
    artCircle(ctx, front ? BODY[1] : BODY[2], hx, hy, palm, ART.LW);
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
    const n = level === 2 ? 3 : 2;
    const span = level === 2 ? 1.3 : 0.7;
    for (const [wide, tall, color] of [[1, 1, '#d81b4f'], [0.58, 0.68, '#ff7ab2']]) {
      for (let i = 0; i < n; i++) {
        const f = n === 1 ? 0.5 : i / (n - 1);
        const a = -Math.PI / 2 - 0.55 - span / 2 + span * f; /* 머리 위에서 뒤쪽으로 */
        const bx = hx + Math.cos(a) * 0.07;
        const by = hy + Math.sin(a) * 0.07;
        const hgt = (level === 2 ? 0.2 : 0.17) * (0.72 + 0.28 * Math.sin(f * Math.PI)) * tall * (0.9 + 0.1 * Math.sin(t * 7 + i * 1.9));
        const w = 0.055 * wide;
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
    const len = [0.075, 0.1, 0.125][level];
    for (const [ox, lean, tone] of [[-0.04, -0.4, '#e8d5c4'], [0.052, 0.32, BONE]]) {
      const bx = hx + ox;
      const by = hy - 0.085;
      const tx = bx + lean * len;
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
    const r = 0.1;
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
      artPoly(ctx, hot || level >= 2 ? '#ffffff' : HOT, [ex - ew * bigEye, ey - 0.022 * bigEye, ex + ew * bigEye, ey - 0.004 * bigEye, ex + ew * 0.75 * bigEye, ey + 0.018 * bigEye, ex - ew * 0.8 * bigEye, ey + 0.012 * bigEye], ART.LW * 0.5);
    }
  }

  /* 손톱이 지나간 자리의 세 줄기 빛 */
  function crescent(ctx, cx, cy, r, a0, a1, thick, alpha) {
    const span = a1 - a0;
    if (Math.abs(span) < 0.06) return;
    const n = Math.max(5, Math.ceil(Math.abs(span) / 0.16));
    const prof = (f) => Math.sin(Math.PI * Math.pow(f, 1.45));
    const layer = (out, th, color, ink) => {
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
      if (ink) {
        ctx.strokeStyle = ART.OUT;
        ctx.lineWidth = ART.LW * 1.3;
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.fill();
    };
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    layer(0.012, thick * 1.5, '#4a081e', true);
    layer(0.006, thick, '#d81b4f');
    layer(0, thick * 0.55, '#ff4f9a');
    layer(-0.004, thick * 0.24, '#ffffff');
    ctx.globalAlpha = 1;
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

  /* 발치에 이는 귀기 (3단) */
  function fire(ctx, level, p) {
    if (level < 2) return;
    const power = 0.25 + p.power * 0.3 + p.castK * 0.4;
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

  /* ───────── 변신한 큰 괴물 ─────────
     정면을 보고 솟아 있으며, 가까운 손(+x)과 먼 손(-x)을 따로 쓴다:
     가까운 손은 머리 위로 치켜들었다가 내려찍고, 먼 손은 늘어뜨렸다가 몸 앞을 가로질러 올려 할퀸다. */

  /* 손과 머리가 있을 자리를 정한다. 두 손의 각도는 뚝뚝 끊기지 않게 조금씩 따라가며,
     그 값은 렌더러가 탑마다 간직하는 몸짓 상태(o.pose)에 얹어 둔다. advance 가 참일 때만 시간을 흘린다. */
  function giantPose(p, o, advance) {
    const c = p.c;
    const step = p.sw ? p.sw.step : -1;
    const down = step === 0 ? Math.sin(p.k * Math.PI) : 0; /* 내려찍는 힘 */
    const up = step === 1 ? Math.sin(p.k * Math.PI) : 0; /* 올려 할퀴는 힘 */
    const wantN = step === 0 ? swingAngle(0, p.k, c) : step === 1 ? c + LOW : step === 2 ? 1.5 : guardAngle(o.next || 0, c);
    const wantF = step === 1 ? G_REST + (c + HIGH + 0.25 - G_REST) * smooth(p.k) : G_REST;
    const st = o.pose || null;
    let g = st && st.giant;
    if (!g) {
      g = { n: wantN, f: wantF, t: p.t };
      if (st) st.giant = g;
    }
    if (advance) {
      const q = 1 - Math.exp(-Math.max(0, Math.min(0.1, p.t - g.t)) * 10);
      g.t = p.t;
      g.n = step === 0 ? wantN : g.n + (wantN - g.n) * q;
      g.f = step === 1 ? wantF : g.f + (wantF - g.f) * q;
    }
    const psi = g.n + (G_IDLE - g.n) * p.idle;
    const phi = g.f + (G_REST - g.f) * p.idle;
    const wind = p.breath * (1 - p.blow); /* 귀염포: 기를 모으며 젖힌다 */
    const blow = p.breath * p.blow; /* 귀염포: 숙이며 내뿜는다 */
    const lean = down * 0.06 + up * 0.04 + p.push * 0.07 + blow * 0.14 - wind * 0.07;
    const bob = Math.sin(p.t * 2.2) * 0.015;
    const shN = [G_SH[0] + lean * 0.5, G_SH[1] + bob];
    const shF = [-G_SH[0] + lean * 0.5, G_SH[1] + bob];
    const rn = G_REACH + 0.2 * down;
    const rf = G_REACH + 0.24 * up;
    const q = {
      psi, phi, down, up, rn, rf, lean, bob, shN, shF,
      handN: [shN[0] + Math.cos(psi) * rn, shN[1] + Math.sin(psi) * rn],
      handF: [shF[0] + Math.cos(phi) * rf, shF[1] + Math.sin(phi) * rf],
      aimN: psi + 0.45, /* 손가락이 뻗는 쪽: 움직이는 쪽으로 앞서 나간다 */
      aimF: phi - 0.45,
      curlN: 0.55 - 0.3 * down,
      curlF: 0.55 - 0.3 * up,
      fanN: 0.14 + 0.1 * down,
      fanF: 0.14 + 0.1 * up,
    };
    /* 두 손을 함께 쓰는 몸짓 */
    const to = (w, hn, hf, an, af, curl, fan) => {
      if (w <= 0) return;
      q.handN = mix(q.handN, hn, w);
      q.handF = mix(q.handF, hf, w);
      q.aimN += (an - q.aimN) * w;
      q.aimF += (af - q.aimF) * w;
      q.curlN += (curl - q.curlN) * w;
      q.curlF += (curl - q.curlF) * w;
      q.fanN += (fan - q.fanN) * w;
      q.fanF += (fan - q.fanF) * w;
    };
    to(p.push, [0.98, -0.98], [0.2, -0.8], -0.25, -0.2, 0.05, 0.3); /* 혼불: 두 손바닥을 앞으로 */
    to(p.breath, [0.88, -0.52], [-0.88, -0.52], 0.95, Math.PI - 0.95, 0.5, 0.26); /* 귀염포: 두 손으로 땅을 짚는다 */
    to(p.roar, [0.96, -1.74], [-0.96, -1.74], -1.25, -Math.PI + 1.25, 0.2, 0.32); /* 포효: 두 손을 치켜든다 */
    q.head = {
      x: G_HEAD[0] + lean,
      y: G_HEAD[1] + bob - p.roar * 0.05 - wind * 0.06 + blow * 0.1,
      tilt: -p.roar * 0.3 - wind * 0.28 + blow * 0.32 + down * 0.1,
      open: Math.max(p.roar, blow, wind * 0.4, down * 0.5, up * 0.5),
    };
    return q;
  }

  /* 머리에 붙은 한 점(머리 기준)을 몸 기준 좌표로 */
  function onHead(h, x, y) {
    return [h.x + (x * Math.cos(h.tilt) - y * Math.sin(h.tilt)) * 1.12, h.y + (x * Math.sin(h.tilt) + y * Math.cos(h.tilt)) * 1.12];
  }

  /* 불꽃 한 가닥의 테두리: (bx, by) 에서 a 쪽으로 len 만큼 뻗고, 끝은 lift 만큼 위로 휜다 */
  function flamePath(ctx, bx, by, a, len, w, sway, lift) {
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(bx - sa * w, by + ca * w);
    ctx.quadraticCurveTo(bx + ca * len * 0.5 - sa * w * 1.35, by + sa * len * 0.5 + ca * w * 1.35, bx + ca * len - sa * sway, by + sa * len + ca * sway - lift);
    ctx.quadraticCurveTo(bx + ca * len * 0.45 + sa * w * 1.35, by + sa * len * 0.45 - ca * w * 1.35 - lift * 0.3, bx + sa * w, by - ca * w);
    ctx.closePath();
  }

  /* 머리 뒤에서 위로 타오르는 갈기: 검은 테두리 안에 진홍·분홍·흰빛이 겹겹이 든다 */
  function giantMane(ctx, hx, hy, t, flare) {
    const n = 9;
    const list = [];
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1);
      const a = -Math.PI / 2 + (f - 0.5) * 3.3 + Math.sin(t * 2.3 + i * 1.3) * 0.06;
      const len = (0.48 + 0.46 * Math.sin(f * Math.PI)) * (i % 2 ? 0.78 : 1) * flare * (0.9 + 0.1 * Math.sin(t * 6.5 + i * 1.9));
      list.push([hx + Math.cos(a) * 0.1, hy + Math.sin(a) * 0.1, a, len, Math.sin(t * 4 + i * 2.1) * 0.04, len * 0.34 * Math.abs(Math.cos(a))]);
    }
    /* 테두리를 먼저 모두 긋고 그 위를 덮으면, 겹친 불꽃들이 한 덩어리로 테두리를 두른다 */
    ctx.strokeStyle = ART.OUT;
    ctx.lineWidth = 0.065;
    ctx.lineJoin = 'round';
    for (const q of list) {
      flamePath(ctx, q[0], q[1], q[2], q[3], 0.17, q[4], q[5]);
      ctx.stroke();
    }
    for (const [long, wide, color] of [[1, 1, CRIM], [0.74, 0.66, HOT], [0.46, 0.36, PALE]]) {
      ctx.fillStyle = color;
      for (const q of list) {
        flamePath(ctx, q[0], q[1], q[2], q[3] * long, 0.17 * wide, q[4] * long, q[5] * long);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(hx, hy, 0.27 * wide, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* 어깨 뒤에서 피어올라 돌돌 말리는 연보랏빛 귀기 */
  function swirl(ctx, x, y, s, side, t, seed) {
    const cx = x + side * s * 0.55 + Math.sin(t * 1.4 + seed) * 0.05 * s;
    const cy = y - s * 1.05 + Math.sin(t * 1.9 + seed) * 0.03 * s;
    const a0 = Math.atan2(0.7, -side * 0.55);
    const pts = [x, y];
    const n = 20;
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const a = a0 + side * f * 4.7;
      const r = s * (0.89 * Math.pow(1 - f, 1.1) + 0.07);
      pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    artStroke(ctx, LILAC, pts, 0.05);
  }

  /* 몸 아래: 망토 밑으로 가늘어지며 땅에 닿는 검은 귀기 */
  function giantTail(ctx, t) {
    const left = [];
    const right = [];
    for (let i = 0; i <= 6; i++) {
      const f = i / 6;
      const y = -0.76 + 0.76 * f;
      const cx = Math.sin(t * 1.8 + f * 3.2) * 0.06 * f;
      const hw = 0.32 * Math.pow(1 - f, 0.8) + 0.05;
      left.push(cx - hw, y);
      right.unshift(cx + hw, y);
    }
    artPoly(ctx, '#33091a', left.concat(right));
  }

  /* 땅에서 이는 불길: 큰 괴물이 솟아난 자리 */
  function giantFire(ctx, t, power) {
    const flames = [];
    for (let i = 0; i < 5; i++) {
      const f = i / 4;
      flames.push([(f - 0.5) * 0.78, (0.5 + 0.5 * Math.sin(f * Math.PI)) * (0.24 + power * 0.22) * (0.88 + 0.12 * Math.sin(t * 6 + i * 1.9)), Math.sin(t * 3.1 + i * 1.3) * 0.04]);
    }
    for (const [pad, wide, tall, color] of [[0.035, 1, 1, ART.OUT], [0, 1, 1, CRIM], [0, 0.56, 0.6, PALE]]) {
      for (const q of flames) KIT.tongue(ctx, q[0], 0.05 + pad, 0.12 * wide + pad, q[1] * tall + pad * 2, q[2] * tall, color);
    }
  }

  /* 어깨를 넓게 덮은 검은 망토: 아랫단에 붉은 선을 둘렀다 */
  function giantCloak(ctx, q) {
    const x = q.lean * 0.5;
    const y = q.bob;
    const at = (pts) => pts.map((v, i) => v + (i % 2 ? y : x));
    const full = at([-0.74, -1.42, -0.26, -1.46, 0.26, -1.46, 0.74, -1.42, 0.72, -1.04, 0.44, -0.76, 0.02, -0.56, -0.44, -0.76, -0.72, -1.04]);
    artPoly(ctx, ROBE[2], full, 0);
    artPoly(ctx, ROBE[1], at([0.02, -1.46, 0.26, -1.46, 0.74, -1.42, 0.72, -1.04, 0.44, -0.76, 0.02, -0.56]), 0);
    artPath(ctx, full);
    ctx.strokeStyle = ART.OUT;
    ctx.lineWidth = ART.LW;
    ctx.lineJoin = 'round';
    ctx.stroke();
    artStroke(ctx, CRIM, at([-0.72, -1.04, -0.44, -0.76, 0.02, -0.56, 0.44, -0.76, 0.72, -1.04]), 0.045); /* 아랫단 */
    artStroke(ctx, CRIM, at([-0.26, -1.44, 0.02, -1.12, 0.3, -1.44]), 0.045); /* 깃 */
  }

  /* 어깨를 덮는 뾰족한 깃: 팔이 그 아래에서 뻗어 나온다 */
  function giantShoulders(ctx, q) {
    const x = q.lean * 0.5;
    const y = q.bob;
    for (const [s, tone] of [[-1, ROBE[1]], [1, ROBE[0]]]) {
      artPoly(ctx, tone, [x + s * 0.3, y - 1.49, x + s * 1.0, y - 1.56, x + s * 0.84, y - 1.1, x + s * 0.44, y - 1.16]);
    }
  }

  /* 굵은 팔: 팔꿈치는 늘 바깥으로 굽는다. 위팔은 검은 소매에 싸였고 아래팔은 붉다 */
  function giantArm(ctx, sh, hd, side, tone) {
    const dx = hd[0] - sh[0];
    const dy = hd[1] - sh[1];
    const n = Math.hypot(dx, dy) || 1;
    const half = Math.min(n, G_ARM * 2) / 2;
    const bend = Math.sqrt(Math.max(0, G_ARM * G_ARM - half * half));
    const px = side * 0.95;
    const py = 0.3;
    const along = (px * dx + py * dy) / n;
    const ex = sh[0] + dx / 2 + (px - (dx / n) * along) * bend;
    const ey = sh[1] + dy / 2 + (py - (dy / n) * along) * bend;
    artStroke(ctx, ROBE[2], [sh[0], sh[1], ex, ey], G_W);
    artStroke(ctx, tone, [ex, ey, hd[0], hd[1]], G_W);
  }

  /* 큰 손: 손바닥과 엄지, 네 손가락. 손가락 끝마다 흰 손톱이 길게 돋았다.
     aim = 손가락이 뻗는 쪽, flip = 손가락이 굽는 쪽(+1 시계, -1 반시계), curl = 굽은 정도, fan = 벌어진 정도 */
  function giantHand(ctx, P, aim, flip, curl, fan, tone, nail) {
    const z = G_HAND;
    const ux = Math.cos(aim) * z;
    const uy = Math.sin(aim) * z;
    const px = -uy;
    const py = ux;
    const w = 0.075 * z;
    const finger = (kx, ky, a, l1, l2, bend) => {
      const mx = kx + Math.cos(a) * l1 * z;
      const my = ky + Math.sin(a) * l1 * z;
      const b = a + bend;
      const nx = -Math.sin(b) * w * 0.5;
      const ny = Math.cos(b) * w * 0.5;
      artPoly(ctx, nail, [mx + nx, my + ny, mx + Math.cos(b) * l2 * z, my + Math.sin(b) * l2 * z, mx - nx, my - ny]);
      artStroke(ctx, tone, [kx, ky, mx, my], w);
    };
    /* 엄지: 손바닥 쪽에서 마주 굽는다 */
    finger(P[0] + px * flip * 0.13 - ux * 0.03, P[1] + py * flip * 0.13 - uy * 0.03, aim + flip * 0.95, 0.1, 0.13, -flip * curl * 0.8);
    const len = [0.14, 0.18, 0.18, 0.14];
    for (let i = 0; i < 4; i++) {
      const f = i - 1.5;
      finger(P[0] + px * f * 0.085 + ux * 0.08, P[1] + py * f * 0.085 + uy * 0.08, aim + f * fan, len[i], len[i] * 1.1, flip * curl * 1.1);
    }
    artCircle(ctx, tone, P[0], P[1], 0.15 * z);
  }

  /* 머리: 사방으로 뻗친 검은 뿔 여섯 개와 송곳니 돋은 흰 가면 */
  function giantFace(ctx, h, hot) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.tilt);
    ctx.scale(1.12, 1.12);
    /* 뿔: [밑동, 끝, 굽는 쪽으로 불룩한 정도] */
    for (const s of [-1, 1]) {
      for (const [bx, by, tx, ty, w] of [[0.09, -0.15, 0.2, -0.5, 0.05], [0.16, -0.07, 0.45, -0.3, 0.045], [0.18, 0.03, 0.43, 0.02, 0.04]]) {
        const dx = tx - bx;
        const dy = ty - by;
        const n = Math.hypot(dx, dy);
        const nx = (-dy / n) * w;
        const ny = (dx / n) * w;
        const x0 = s * bx + 0.01;
        ctx.beginPath();
        ctx.moveTo(x0 - s * nx, by - ny);
        ctx.quadraticCurveTo(x0 + s * (dx * 0.6 - nx * 0.4), by + dy * 0.6 - ny * 0.4, s * tx + 0.01, ty);
        ctx.quadraticCurveTo(x0 + s * (dx * 0.55 + nx * 2.2), by + dy * 0.55 + ny * 2.2, x0 + s * nx, by + ny);
        ctx.closePath();
        artFill(ctx, HORN);
      }
    }
    artCircle(ctx, BODY[1], 0, 0, 0.19);
    /* 가면 */
    ctx.beginPath();
    ctx.moveTo(-0.115, -0.09);
    ctx.quadraticCurveTo(0.03, -0.2, 0.175, -0.09);
    ctx.quadraticCurveTo(0.2, 0.02, 0.15, 0.1);
    ctx.lineTo(0.03, 0.2 + h.open * 0.05);
    ctx.lineTo(-0.09, 0.1);
    ctx.quadraticCurveTo(-0.14, 0.02, -0.115, -0.09);
    ctx.closePath();
    artFill(ctx, BONE);
    /* 치켜뜬 두 눈: 힘을 쓸 때는 희게 탄다 */
    const eye = hot ? '#ffffff' : HOT;
    artPoly(ctx, eye, [-0.085, -0.055, -0.015, -0.02, -0.025, 0.015, -0.08, -0.012], ART.LW * 0.8);
    artPoly(ctx, eye, [0.145, -0.055, 0.075, -0.02, 0.085, 0.015, 0.14, -0.012], ART.LW * 0.8);
    /* 벌린 입과 송곳니 */
    const drop = h.open;
    artPoly(ctx, '#2a0612', [-0.06, 0.07, 0.12, 0.07, 0.1, 0.115 + drop * 0.05, 0.03, 0.14 + drop * 0.07, -0.04, 0.115 + drop * 0.05], ART.LW * 0.6);
    for (const fx of [-0.035, 0.03, 0.095]) artPoly(ctx, BONE, [fx - 0.022, 0.07, fx + 0.022, 0.07, fx, 0.115], 0);
    ctx.restore();
  }

  function giant(ctx, p, o) {
    const q = giantPose(p, o, true);
    const t = p.t;
    const hot = p.power > 0.3 || p.castK > 0.4 || p.push > 0.3;
    artShadow(ctx, 0, 0.04, 0.8, 0.22);
    swirl(ctx, -0.86 + q.lean * 0.5, -1.44 + q.bob, 0.32, -1, t, 0);
    swirl(ctx, 0.88 + q.lean * 0.5, -1.46 + q.bob, 0.27, 1, t, 2.4);
    giantMane(ctx, q.head.x - 0.02, q.head.y - 0.02, t, 1 + p.roar * 0.3 + p.breath * 0.15 + p.power * 0.1);
    giantTail(ctx, t);
    giantFire(ctx, t, 0.5 + p.power * 0.3 + p.castK * 0.4);
    giantCloak(ctx, q);
    giantArm(ctx, q.shF, q.handF, -1, G_FAR[0]);
    giantArm(ctx, q.shN, q.handN, 1, CRIM);
    giantShoulders(ctx, q);
    giantFace(ctx, q.head, hot);
    giantHand(ctx, q.handF, q.aimF, -1, q.curlF, q.fanF, G_FAR[0], G_FAR[1]);
    giantHand(ctx, q.handN, q.aimN, 1, q.curlN, q.fanN, CRIM, BONE);

    /* 손톱이 지나간 자리의 세 줄기 빛 */
    if (p.sw && !p.volley) {
      const fade = Math.min(1, (1 - p.k) * 3.2 + 0.1);
      const near = p.sw.step === 0;
      const sh = near ? q.shN : q.shF;
      const a0 = near ? swingAngle(0, 0, p.c) : G_REST;
      const a1 = near ? q.psi : q.phi;
      const base = (near ? q.rn : q.rf) + 0.22;
      for (let i = 0; i < 3; i++) crescent(ctx, sh[0], sh[1], base + i * 0.17, a0 + (a1 - a0) * tailOf(p.k), a1, 0.24, fade);
    }
    if (p.volley && p.k < 0.5) {
      /* 두 손바닥 앞에 맺혔다가 풀려나는 혼불 */
      const g = smooth(p.k / 0.4);
      wisp(ctx, q.handN[0] + 0.34, q.handN[1] - 0.08, 0.06 + 0.06 * g, t, 0);
      wisp(ctx, q.handF[0] + 0.34, q.handF[1] - 0.06, 0.05 + 0.05 * g, t, 2);
    }
    if (p.breath > 0.05) {
      /* 입가에 모이는 귀기: 내뿜기 시작하면 줄기는 렌더러가 그린다 */
      const g = p.blow > 0 ? 1 : smooth(p.ck / (o.wind == null ? 0.35 : o.wind));
      const r = 0.05 + 0.1 * g + 0.012 * Math.sin(t * 22);
      const m = onHead(q.head, 0.06, 0.14);
      ctx.globalAlpha = Math.min(1, p.breath);
      artCircle(ctx, CRIM, m[0], m[1], r);
      artCircle(ctx, '#ffffff', m[0], m[1], r * 0.55, 0);
      ctx.globalAlpha = 1;
    }
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
      const big = p.giant;
      if (!big && o.pose && o.pose.giant) o.pose.giant = null; /* 본모습으로 돌아오면 큰 괴물의 몸짓은 잊는다 */
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

      if (level === 2 && o.gauge != null) {
        /* 발밑의 고리: 변신한 동안에는 남은 시간만큼, 아닐 때는 다음 변신이 준비된 만큼 찬다 */
        const R = 0.44 + smooth(p.form) * 0.24;
        const full = o.gauge >= 1 && !big;
        ctx.lineCap = 'round';
        for (const [w, color, part] of [[0.07, ART.OUT, 1], [0.04, '#5a1228', 1], [0.04, big ? '#ffffff' : full ? '#ff4f9a' : '#d81b4f', Math.max(0.001, o.gauge)]]) {
          ctx.beginPath();
          ctx.ellipse(0, 0.23, R, R * K, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * part);
          ctx.strokeStyle = color;
          ctx.lineWidth = w;
          ctx.stroke();
        }
      }
      if (p.form > 0.02 && p.form < 0.98) {
        /* 모습이 바뀌는 순간 몸에서 귀기가 번쩍인다 */
        artGlow(ctx, 0, -0.5, 1.3, GLOW, 0.8 * Math.sin(p.form * Math.PI));
      }
      ctx.save();
      ctx.translate(0, FEET);
      if (big) {
        ctx.scale(p.dir * p.gs, p.gs);
        giant(ctx, p, o);
        ctx.restore();
        return;
      }
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
      /* 허리띠 */
      artStroke(ctx, ROBE[0], [p.hip[0] - 0.035, p.hip[1] - 0.05, p.hip[0] + 0.04, p.hip[1] - 0.045], 0.026);
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
      const oo = o || { t: 0 };
      const p = pose(level, aim, oo);
      if (p.giant) {
        const m = onHead(giantPose(p, oo, false).head, 0.06, 0.14);
        return [p.dir * p.gs * m[0], FEET + p.gs * m[1]];
      }
      return [p.dir * p.s * (p.mouth[0] + 0.04), FEET + p.s * p.mouth[1]];
    },
  };
})();
