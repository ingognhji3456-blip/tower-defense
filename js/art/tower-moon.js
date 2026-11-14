'use strict';
/* 자월 — 보랏빛 큰 낫을 든 영웅. 화염파·홍련과 같은 막대 인간이지만 몸은 짙은 남보라이고, 머리 뒤에 달이 떠 있다.
   낫을 두 손으로 쥐고 크게 휘둘러 초승달 검기를 날린다: 내려 긋고, 되받아 올려 긋고, 세 번째는 한 바퀴 돌아 둘레를 벤다(원월).
   (날아가는 검기, 공허 구슬, 월식의 빛기둥은 렌더러가 전장에 따로 그린다.)
   1단: 날 가장자리만 빛나는 낫, 머리 뒤의 가는 초승달, 짧은 옷자락.
   2단: 보랏빛으로 달아오른 낫, 굵어진 초승달과 그 곁을 도는 공허 구슬, 발밑의 달무리.
   3단: 희게 타오르는 큰 낫, 달이 검게 가려진 월식의 고리, 발끝까지 오는 옷자락. 두 눈이 타오른다.

   body 는 발밑의 그림자와 달무리(움직이지 않는 부분), top 은 자월 자신.
   top 의 aim 은 겨눈 적이 있는 쪽(화면 각도). o 에는 { recoil, flash, t } 말고도 다음 값이 들어올 수 있다.
     face    보는 쪽 (+1 오른쪽, -1 왼쪽)
     pose    { idle, th }: idle 이 1 이면 낫을 땅에 짚고 쉰다. th 는 낫자루가 가리키는 각도(몸 기준).
             렌더러가 프레임마다 부드럽게 이어 준 값이다. 없으면 여기서 바로 구한다.
     swing   { k, step }: 휘두르는 중. k 는 진행(0 → 1), step 0 = 내려 긋기, 1 = 올려 긋기, 2 = 원월(한 바퀴)
     next    다음에 할 공격: 그 공격이 시작될 자리에 낫을 두고 기다린다
     gest    지금 하는 몸짓: 'orb'(공허 구슬: 손바닥에 모아 내던진다), 'eclipse'(월식: 낫을 치켜들었다가 땅을 내리찍는다)
     cast    그 몸짓이 남은 정도 (1 → 0)
     chargeO 다음 공허 구슬이 준비된 정도 (0 → 1): 달 곁을 도는 구슬이 다시 맺힌다
     chargeE 다음 월식이 준비된 정도 (0 → 1): 월식 고리의 테두리가 밝아진다 */
(function () {
  const BODY = ['#b9a6f0', '#5a4a94', '#352a63']; /* 몸: 빛 받는 가장자리, 앞쪽 팔다리, 뒤쪽 팔다리 */
  const ROBE = ['#6b4fb0', '#3d2a73', '#231647']; /* 옷자락 */
  const HOT = '#e040fb';
  const PALE = '#f8b7ff';
  const DARK = '#1a0e2e';
  const GLOW = '214,90,255';
  const K = ART.K;
  const FEET = 0.2;
  const SCALE = [1.3, 1.42, 1.56];
  const W = 0.052; /* 팔다리 굵기 */
  const LIMB = 0.16; /* 허벅지·정강이 길이 */
  const ARM = 0.14; /* 위팔·아래팔 길이 */
  const SHAFT = [0.6, 0.64, 0.7]; /* 낫자루 길이 */
  const EDGE = [0.25, 0.3, 0.36]; /* 낫날 길이 */
  const TAIL = [0.16, 0.26, 0.4]; /* 옷자락 길이 */
  const HIGH = -1.9; /* 내려 긋기가 시작되는 자리: 겨눈 쪽에서 이만큼 위(어깨 뒤로 치켜든다) */
  const LOW = 0.95; /* 내려 긋기가 끝나는 자리: 겨눈 쪽에서 이만큼 아래 */
  const BACK = Math.PI - 0.15; /* 원월 채비: 낫을 눕혀 등 뒤로 돌려 둔다 */
  const FLAT = 0.4; /* 땅과 나란히 도는 낫을 옆에서 볼 때의 납작함 */

  const smooth = (x) => {
    const k = Math.max(0, Math.min(1, x));
    return k * k * (3 - 2 * k);
  };
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

  /* 화면 각도 → 몸 기준으로 겨눈 쪽. 너무 위아래로는 꺾지 않는다 */
  function center(aim, dir) {
    return Math.max(-0.55, Math.min(0.55, Math.atan2(Math.sin(aim) * ART.TILT, Math.cos(aim) * dir)));
  }

  /* 내려 긋기(0)·올려 긋기(1) 동안 낫자루가 가리키는 각도. c 는 겨눈 쪽 */
  function swingAngle(step, k, c) {
    const e = smooth(k);
    return step === 0 ? c + HIGH + (LOW - HIGH) * e : c + LOW + (HIGH - LOW) * e;
  }

  /* 다음 공격을 기다리는 동안 낫을 두는 각도 */
  function guardAngle(next, c) {
    return next === 0 ? c + HIGH : next === 1 ? c + LOW : BACK;
  }

  /* 원월: 등 뒤에서 시작해 한 바퀴 돈다. 처음 절반은 몸 뒤쪽(화면 위쪽)을 지난다 */
  const spinAngle = (k) => Math.PI + Math.PI * 2 * smooth(k);

  /* 검기의 꼬리가 머리를 따라붙는 정도 */
  const tailOf = (k) => Math.max(0, (k - 0.3) / 0.7) ** 2;

  /* 두 뼈로 된 팔다리: 뿌리와 끝을 정하면 관절이 side 쪽으로 꺾인다 */
  function joint(a, b, len, side) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const n = Math.hypot(dx, dy) || 1;
    const d = Math.min(n, len * 2 - 0.001);
    const out = Math.sqrt(Math.max(0, len * len - (d / 2) * (d / 2))) * side;
    return [a[0] + dx / 2 + (dy / n) * out, a[1] + dy / 2 - (dx / n) * out];
  }

  /* 팔: 팔꿈치는 늘 같은 쪽으로만 접힌다. 손이 어깨에 너무 붙으면 팔이 접혀 보이므로 조금 떼어 계산한다 */
  function armTo(sh, hand) {
    const dx = hand[0] - sh[0];
    const dy = hand[1] - sh[1];
    const n = Math.hypot(dx, dy) || 1;
    const far = Math.max(n, 0.2);
    return { sh, el: joint(sh, [sh[0] + (dx / n) * far, sh[1] + (dy / n) * far], ARM, -1), hd: hand };
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
    /* 아무 값도 오지 않으면(카드·도감의 그림) 낫을 짚고 선 모습으로 그린다 */
    const still = !o.pose && !o.swing && o.next == null && !o.gest;
    const idle = (o.pose ? o.pose.idle : still ? 1 : 0) * (1 - castK);
    const sw = o.swing || null;
    const k = sw ? Math.min(1, sw.k) : 0;
    const power = sw ? Math.sin(k * Math.PI) : 0; /* 휘두르는 힘: 0 → 1 → 0 */
    const spin = !!sw && sw.step === 2;
    const len = SHAFT[level];

    /* 낫자루가 가리키는 쪽 */
    let th = o.pose && o.pose.th != null ? o.pose.th : sw && !spin ? swingAngle(sw.step, k, c) : guardAngle(o.next || 0, c);
    const orb = gest === 'orb' ? castK : 0;
    const ecl = gest === 'eclipse' ? castK : 0;
    /* 월식: 낫을 곧추세워 치켜들었다가(→ 0.36) 땅을 내리찍는다 */
    const drop = gest === 'eclipse' ? smooth((ck - 0.3) / 0.12) : 0;
    const turn = (to, by) => {
      let g = to;
      while (g - th > Math.PI) g -= Math.PI * 2;
      while (g - th < -Math.PI) g += Math.PI * 2;
      th += (g - th) * by;
    };
    if (orb) turn(2.45, orb); /* 구슬을 던질 때는 낫을 등 뒤로 뺀다 */
    if (ecl) turn(-Math.PI / 2 + 0.06, ecl);
    turn(-Math.PI / 2 + 0.07, idle); /* 쉴 때는 곧추세워 짚는다 */
    let dx = Math.cos(th);
    let dy = Math.sin(th);
    let phi = 0;
    if (spin) {
      phi = spinAngle(k);
      dx = Math.cos(phi);
      dy = Math.sin(phi) * FLAT + 0.08;
    }

    /* 낫이 앞 아래로 갈수록 몸을 숙이고 앞무릎을 굽혀 깊이 내디딘다 */
    const active = 1 - idle;
    const fwd = spin ? 0.3 : Math.max(-0.4, Math.sin(th - c + 0.3)) * (1 - orb) * (1 - ecl) + orb * 0.5 + ecl * drop * 0.6;
    const bob = Math.sin(t * 2.6) * 0.006;
    const crouch = active * (0.03 + 0.05 * Math.max(0, fwd)) + power * 0.02 + (spin ? power * 0.05 : 0);
    const lunge = active * (0.05 + 0.085 * Math.max(0, fwd)) + power * 0.02;
    const lean = active * (0.06 + 0.2 * fwd) + (spin ? power * 0.1 : 0);
    const hip = [-lunge * 0.3, -0.3 + crouch + bob];
    const neck = [hip[0] + Math.sin(lean) * 0.3, hip[1] - Math.cos(lean) * 0.3];
    const head = [neck[0] + Math.sin(lean) * 0.115 + 0.012, neck[1] - Math.cos(lean) * 0.115];
    const shF = [neck[0] + 0.012, neck[1] + 0.035];
    const shB = [neck[0] - 0.012, neck[1] + 0.035];

    /* 낫자루의 가운데(두 손 사이): 가슴 앞에서 낫이 향하는 쪽으로 나간 자리. 휘두를수록 멀리 뻗는다 */
    let pivot = [neck[0] + 0.03 + dx * (0.09 + 0.07 * power), neck[1] + 0.1 + dy * (0.09 + 0.07 * power) + (spin ? 0.04 : 0)];
    if (ecl) pivot = mix(pivot, [neck[0] + 0.13, neck[1] + 0.02 - 0.2 * (1 - drop) + 0.14 * drop], ecl);
    /* 쉴 때: 자루 끝을 발 앞 땅에 짚는다 */
    const rest = [0.16, -len * 0.36];
    pivot = mix(pivot, rest, idle);
    const butt = [pivot[0] - dx * len * 0.36, pivot[1] - dy * len * 0.36];
    const tip = [pivot[0] + dx * len * 0.64, pivot[1] + dy * len * 0.64];
    /* 두 손: 앞손은 날 쪽, 뒷손은 자루 끝 쪽을 쥔다. 쉴 때는 한 손만 얹고, 구슬을 던질 때는 앞손을 내뻗는다 */
    let handF = [pivot[0] + dx * 0.1, pivot[1] + dy * 0.1];
    let handB = [pivot[0] - dx * 0.11, pivot[1] - dy * 0.11];
    const palm = [shF[0] + 0.25, shF[1] + 0.02 - 0.03 * Math.sin(ck * Math.PI)];
    handF = mix(handF, palm, orb);
    handF = mix(handF, [pivot[0] + dx * len * 0.16, pivot[1] + dy * len * 0.16], idle);
    handB = mix(handB, [hip[0] - 0.045, hip[1] - 0.045], idle);
    const armF = armTo(shF, handF);
    const armB = armTo(shB, handB);
    if (spin) {
      armF.el = [(shF[0] + handF[0]) / 2, (shF[1] + handF[1]) / 2 + 0.012];
      armB.el = [(shB[0] + handB[0]) / 2, (shB[1] + handB[1]) / 2 + 0.012];
    }
    const leg = (side) => {
      const foot = [side < 0 ? -0.085 - lunge : 0.085 + lunge * 1.25, 0];
      return { knee: joint(hip, foot, LIMB, 1), foot, toe: [foot[0] + 0.06, 0] };
    };
    return {
      s: SCALE[level],
      dir, t, c, k, len, gest, ck, castK, idle, power, spin, phi, sw, th, dx, dy, orb, ecl, drop,
      hip, neck, head, shF, pivot, butt, tip, palm, armF, armB,
      legB: leg(-1),
      legF: leg(1),
    };
  }

  function limb(ctx, pts, front) {
    artStroke(ctx, front ? BODY[1] : BODY[2], pts, W);
    if (front) {
      /* 달빛 받는 가장자리 */
      const hi = pts.map((v, i) => v + (i % 2 ? -0.012 : -0.01));
      artLine(ctx, BODY[0], hi.slice(0, 4), 0.012);
    }
  }

  function arm(ctx, a, front) {
    limb(ctx, [a.sh[0], a.sh[1], a.el[0], a.el[1], a.hd[0], a.hd[1]], front);
    artCircle(ctx, front ? BODY[1] : BODY[2], a.hd[0], a.hd[1], front ? 0.034 : 0.032, ART.LW);
  }

  /* 나부끼는 옷자락: 허리 뒤에서 흘러내리며 가늘어진다. 끝은 보랏빛으로 빛난다 */
  function tail(ctx, level, p, x0, y0, phase, tone) {
    const n = 6;
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
    const end = mid[n];
    const pre = mid[n - 2];
    artLine(ctx, HOT, [pre[0], pre[1], end[0], end[1]], 0.014);
  }

  /* 머리 뒤에 뜬 달. 1단은 가는 초승달, 2단은 굵은 초승달과 곁을 도는 공허 구슬, 3단은 검게 가려진 월식의 고리 */
  function halo(ctx, level, p, o) {
    const t = p.t;
    const x = p.head[0] - 0.13;
    const y = p.head[1] - 0.16 + Math.sin(t * 1.8) * 0.01;
    const r = [0.15, 0.18, 0.21][level];
    const chargeE = o.chargeE == null ? 1 : o.chargeE;
    const chargeO = o.chargeO == null ? 1 : o.chargeO;
    artGlow(ctx, x, y, r * 2.1, GLOW, 0.28 + 0.1 * level + p.castK * 0.25);
    if (level === 2) {
      /* 월식: 검은 달과 타오르는 테두리. 월식이 준비될수록 밝다 */
      const lit = p.gest === 'eclipse' ? 1 : 0.45 + 0.55 * chargeE;
      artCircle(ctx, DARK, x, y, r * 0.86, 0);
      ctx.lineCap = 'round';
      for (const [w, color] of [[0.06, 'rgba(142,45,226,' + lit + ')'], [0.034, 'rgba(224,64,251,' + lit + ')'], [0.012, 'rgba(255,255,255,' + lit + ')']]) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.stroke();
      }
      /* 테두리에서 이는 불꽃 */
      for (let i = 0; i < 6; i++) {
        const a = t * 0.7 + (i * Math.PI) / 3;
        const f = 0.04 + 0.02 * Math.sin(t * 6 + i * 2);
        artPoly(ctx, 'rgba(248,183,255,' + 0.9 * lit + ')', [x + Math.cos(a - 0.12) * r, y + Math.sin(a - 0.12) * r, x + Math.cos(a) * (r + f), y + Math.sin(a) * (r + f), x + Math.cos(a + 0.12) * r, y + Math.sin(a + 0.12) * r], 0);
      }
    } else {
      /* 초승달: 바깥 원에서 안쪽으로 비켜난 원을 덜어 낸 모양 */
      const cut = level === 0 ? 0.42 : 0.56;
      ctx.beginPath();
      ctx.arc(x, y, r, 0.75, Math.PI * 2 - 0.75);
      ctx.arc(x + r * cut, y, r * (1 - cut * 0.42), Math.PI * 2 - 1.12, 1.12, true);
      ctx.closePath();
      artFill(ctx, level === 0 ? '#c9a7ff' : HOT, ART.LW * 0.8);
      ctx.beginPath();
      ctx.arc(x, y, r * 0.93, 1.3, Math.PI * 2 - 1.3);
      ctx.strokeStyle = PALE;
      ctx.lineWidth = 0.014;
      ctx.stroke();
    }
    if (level >= 1) {
      /* 달 곁을 도는 공허 구슬: 준비되면 또렷하고, 던지면 사라졌다가 다시 맺힌다 */
      const show = p.gest === 'orb' ? Math.max(0, 1 - p.ck * 4) : Math.min(1, chargeO * 1.5);
      if (show > 0.03) {
        const a = t * 1.7;
        const ox = x + Math.cos(a) * (r + 0.09);
        const oy = y + Math.sin(a) * (r + 0.09) * 0.6;
        const or = 0.042 * (0.6 + 0.4 * show);
        ctx.globalAlpha = show * (chargeO >= 1 ? 1 : 0.6);
        artGlow(ctx, ox, oy, or * 3, GLOW, 0.6);
        artCircle(ctx, DARK, ox, oy, or, 0);
        ctx.beginPath();
        ctx.arc(ox, oy, or, 0, Math.PI * 2);
        ctx.strokeStyle = HOT;
        ctx.lineWidth = 0.014;
        ctx.stroke();
        artCircle(ctx, PALE, ox - or * 0.3, oy - or * 0.35, or * 0.22, 0);
        ctx.globalAlpha = 1;
      }
    }
  }

  function head(ctx, level, p) {
    const hx = p.head[0];
    const hy = p.head[1];
    const r = 0.1;
    artCircle(ctx, BODY[1], hx, hy, r);
    ctx.beginPath();
    ctx.arc(hx, hy, r * 0.9, Math.PI * 0.95, Math.PI * 1.6);
    ctx.strokeStyle = BODY[0];
    ctx.lineWidth = 0.014;
    ctx.stroke();
    /* 얼굴은 없다. 치켜뜬 두 눈만 보랏빛으로 빛난다 */
    const hot = level === 2 || p.power > 0.3 || p.castK > 0.5;
    artGlow(ctx, hx + 0.04, hy + 0.02, 0.1, GLOW, hot ? 0.65 : 0.4);
    const big = hot ? 1.2 : 1;
    for (const [ex, ew] of [[hx + 0.01, 0.027], [hx + 0.066, 0.02]]) {
      const ey = hy + 0.018;
      artPoly(ctx, hot ? '#ffffff' : PALE, [ex - ew * big, ey - 0.022 * big, ex + ew * big, ey - 0.005 * big, ex + ew * 0.75 * big, ey + 0.02 * big, ex - ew * 0.8 * big, ey + 0.014 * big], ART.LW * 0.5);
    }
    if (level === 2) {
      /* 눈꼬리에서 흩날리는 불빛 */
      KIT.tongue(ctx, hx - 0.02, hy + 0.01, 0.018, 0.07 + 0.015 * Math.sin(p.t * 8), -0.05, 'rgba(224,64,251,.85)');
    }
  }

  /* 낫: 긴 자루와 초승달 모양의 날. 날은 자루 끝에서 휘두르는 쪽으로 굽는다 */
  function scythe(ctx, level, p) {
    const t = p.t;
    const dx = p.dx;
    const dy = p.dy;
    const n = Math.hypot(dx, dy) || 1;
    const ux = dx / n;
    const uy = dy / n;
    const nx = -uy; /* 날이 뻗는 쪽 */
    const ny = ux;
    const hx = p.tip[0];
    const hy = p.tip[1];
    const E = EDGE[level] * (0.55 + 0.45 * n);
    const heat = [0.3, 0.7, 1][level] + p.power * 0.3 + p.castK * 0.3;
    const at = (a, b) => [hx + ux * a + nx * b, hy + uy * a + ny * b];
    /* 날에서 이는 보랏빛 불길 (2단부터) */
    if (level >= 1) {
      artGlow(ctx, ...at(-0.04, E * 0.5), 0.16 + heat * 0.06, GLOW, 0.35 + 0.15 * heat);
      const flames = 2 + level;
      for (const [alpha, wide, tall, color] of [[0.75, 1, 1, '142,45,226'], [0.9, 0.55, 0.6, '248,183,255']]) {
        for (let i = 0; i < flames; i++) {
          const f = 0.25 + (0.7 * i) / Math.max(1, flames - 1);
          const q = at(-0.02 - f * 0.05, E * f);
          const hgt = (0.045 + heat * 0.07) * tall * (0.78 + 0.22 * Math.sin(t * 9 + i * 1.9));
          KIT.tongue(ctx, q[0], q[1] + 0.01, (0.02 + heat * 0.012) * wide, hgt, Math.sin(t * 4 + i * 1.4) * 0.02, 'rgba(' + color + ',' + alpha + ')');
        }
      }
    }
    /* 자루: 손잡이 감은 띠와 끝의 쇠고리 */
    artStroke(ctx, '#3a2f55', [p.butt[0], p.butt[1], hx, hy], 0.03);
    artLine(ctx, '#7d6bb5', [p.butt[0] + nx * 0.006, p.butt[1] + ny * 0.006, hx + nx * 0.006, hy + ny * 0.006], 0.008);
    artCircle(ctx, level === 2 ? ART.gold[1] : '#9a8bd0', p.butt[0], p.butt[1], 0.022, ART.LW * 0.7);
    for (const f of [0.3, 0.42]) {
      const q = [p.butt[0] + (hx - p.butt[0]) * f, p.butt[1] + (hy - p.butt[1]) * f];
      artStroke(ctx, HOT, [q[0] - nx * 0.018, q[1] - ny * 0.018, q[0] + nx * 0.018, q[1] + ny * 0.018], 0.014);
    }
    /* 날: 자루 끝에서 옆으로 뻗어 갈고리처럼 굽는다 */
    const root0 = at(0.03, -0.035);
    const root1 = at(-0.075, -0.02);
    const tipB = at(-0.16, E);
    const out = at(0.06, E * 0.55); /* 등(바깥쪽)의 굽이 */
    const inn = at(-0.07, E * 0.5); /* 날(안쪽)의 굽이 */
    ctx.beginPath();
    ctx.moveTo(root0[0], root0[1]);
    ctx.quadraticCurveTo(out[0], out[1], tipB[0], tipB[1]);
    ctx.quadraticCurveTo(inn[0], inn[1], root1[0], root1[1]);
    ctx.closePath();
    artFill(ctx, level === 0 ? '#cfc3f2' : level === 1 ? HOT : '#fdeaff');
    /* 날 안쪽의 빛나는 가장자리 */
    const e0 = at(-0.062, 0.02);
    artLine(ctx, level === 0 ? HOT : '#ffffff', [e0[0], e0[1], ...at(-0.085, E * 0.5), tipB[0], tipB[1]], level === 0 ? 0.012 : 0.014);
    if (level === 2) artLine(ctx, HOT, [...at(0.02, 0.02), ...at(0.035, E * 0.5), ...at(-0.1, E * 0.92)], 0.012);
    /* 자루와 날을 잇는 물림쇠 */
    artCircle(ctx, level === 2 ? ART.gold[1] : '#9a8bd0', hx, hy, 0.028, ART.LW * 0.8);
    artCircle(ctx, HOT, hx, hy, 0.012, 0);
  }

  /* 낫날이 지나간 자리의 초승달 빛. (cx, cy) 를 중심으로 a0(꼬리) → a1(머리).
     flat 이 1 보다 작으면 납작한 타원을 따라간다(원월). */
  function crescent(ctx, cx, cy, r, flat, a0, a1, thick, alpha, seed) {
    const span = a1 - a0;
    if (Math.abs(span) < 0.06) return;
    const n = Math.max(5, Math.ceil(Math.abs(span) / 0.16));
    const prof = (f) => Math.sin(Math.PI * Math.pow(f, 1.45));
    const layer = (out, th, color, ragged) => {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = a0 + (span * i) / n;
        const x = cx + Math.cos(a) * (r + out);
        const y = cy + Math.sin(a) * (r + out) * flat;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      for (let i = n; i >= 0; i--) {
        const f = i / n;
        const a = a0 + span * f;
        const wob = ragged ? 1 + 0.3 * Math.sin(i * 2.9 + seed) * Math.sin(f * Math.PI) : 1;
        const q = r + out - th * prof(f) * wob;
        ctx.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q * flat);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };
    layer(0.02, thick * 1.5, 'rgba(42,15,74,' + 0.6 * alpha + ')', true); /* 뒤에 끌리는 짙은 보라 */
    layer(0.012, thick, 'rgba(142,45,226,' + 0.92 * alpha + ')', true);
    layer(0, thick * 0.6, 'rgba(224,64,251,' + 0.96 * alpha + ')', false);
    layer(-0.006, thick * 0.28, 'rgba(248,183,255,' + alpha + ')', false);
    const pts = [];
    for (let i = Math.floor(n * 0.4); i <= n; i++) {
      const a = a0 + (span * i) / n;
      pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r * flat);
    }
    if (pts.length >= 4) artLine(ctx, 'rgba(255,255,255,' + alpha + ')', pts, 0.016);
  }

  /* 지금 긋는 공격의 빛. 원월은 몸 뒤를 지나는 쪽('back')과 앞을 지나는 쪽('front')을 나눠 그린다 */
  function trail(ctx, level, p, part) {
    if (!p.sw) return;
    const k = p.k;
    const fade = Math.min(1, (1 - k) * 3.2 + 0.1);
    const thick = 0.18 + level * 0.045;
    const reach = p.len * 0.64 + EDGE[level] * 0.45;
    const cx = p.pivot[0];
    const cy = p.pivot[1];
    if (p.spin) {
      const tl = Math.PI + (p.phi - Math.PI) * tailOf(k);
      const a0 = Math.max(tl, part === 'back' ? Math.PI : Math.PI * 2);
      const a1 = Math.min(p.phi, part === 'back' ? Math.PI * 2 : Math.PI * 3);
      if (a1 > a0) crescent(ctx, cx, cy + 0.1, reach, FLAT, a0, a1, thick * 1.3, fade, 1.7);
      return;
    }
    if (part === 'back') return;
    const a0 = swingAngle(p.sw.step, 0, p.c);
    crescent(ctx, cx, cy, reach, 1, a0 + (p.th - a0) * tailOf(k), p.th, thick, fade, p.sw.step * 2.3);
  }

  /* 발치에 이는 보랏빛 불길 (2단부터) */
  function fire(ctx, level, p) {
    const power = [0, 0.4, 0.8][level] + p.power * 0.3 + p.castK * 0.4;
    if (power < 0.1) return;
    const n = level === 2 ? 6 : 4;
    for (const [alpha, wide, tall, color] of [[0.6, 1, 1, '142,45,226'], [0.8, 0.56, 0.6, '248,183,255']]) {
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1);
        const x = p.hip[0] + (f - 0.5) * (0.26 + power * 0.14);
        const hgt = (0.3 + 0.7 * Math.sin(f * Math.PI)) * (0.1 + power * 0.2) * tall * (0.84 + 0.16 * Math.sin(p.t * 7 + i * 1.9));
        KIT.tongue(ctx, x, 0.03, (0.04 + power * 0.02) * wide, hgt, Math.sin(p.t * 3.1 + i * 1.3) * 0.035, 'rgba(' + color + ',' + alpha + ')');
      }
    }
  }

  /* 낫날에서 흩날리는 보랏빛 불티 */
  function motes(ctx, level, p) {
    const n = 2 + level * 2 + (p.power > 0 ? 2 : 0);
    for (let i = 0; i < n; i++) {
      const k = (p.t * (0.55 + (i % 3) * 0.15) + i * 0.29) % 1;
      const x = p.tip[0] + Math.sin(i * 2.4 + p.t * 2) * 0.09 - p.dy * 0.1;
      const y = p.tip[1] + Math.cos(i * 1.7) * 0.06 - k * (0.2 + level * 0.07) + p.dx * 0.1;
      ctx.globalAlpha = (1 - k) * 0.95;
      artCircle(ctx, i % 2 ? PALE : HOT, x, y, 0.011 + (1 - k) * 0.007, 0);
    }
    ctx.globalAlpha = 1;
  }

  TOWER_ART.moon = {
    /* 렌더러가 낫의 각도를 프레임마다 이어 주는 데 쓴다 */
    center,
    swingAngle,
    guardAngle,

    /* 받침대는 없다. 발밑의 그림자와, 2단부터는 달무리 */
    body(ctx, level) {
      artShadow(ctx, 0.04, 0.24, 0.26 + level * 0.03, 0.09);
      if (level === 0) return;
      const r = 0.34 + level * 0.04;
      ctx.beginPath();
      ctx.ellipse(0, 0.23, r, r * K, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(36,16,62,.4)';
      ctx.fill();
      /* 달무리: 2단은 한 겹, 3단은 두 겹에 초승달 무늬가 새겨진다 */
      for (const [f, w, color] of level === 2 ? [[0.95, 0.03, 'rgba(142,45,226,.9)'], [0.95, 0.012, 'rgba(248,183,255,.95)'], [0.62, 0.016, 'rgba(224,64,251,.8)']] : [[0.92, 0.022, 'rgba(142,45,226,.8)']]) {
        ctx.beginPath();
        ctx.ellipse(0, 0.23, r * f, r * f * K, 0, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.stroke();
      }
      if (level === 2) {
        for (let i = 0; i < 4; i++) {
          const a = 0.5 + (i * Math.PI) / 2;
          const x = Math.cos(a) * r * 0.78;
          const y = 0.23 + Math.sin(a) * r * 0.78 * K;
          ctx.beginPath();
          ctx.arc(x, y, 0.034, a + 0.9, a + Math.PI * 2 - 0.9);
          ctx.strokeStyle = 'rgba(248,183,255,.95)';
          ctx.lineWidth = 0.014;
          ctx.stroke();
        }
      }
    },

    top(ctx, level, aim, o) {
      const p = pose(level, aim, o);
      const t = p.t;
      /* 발밑에 고이는 달빛 */
      const lit = [0.06, 0.18, 0.3][level] + 0.05 * Math.sin(t * 2.4) + p.castK * 0.3 + p.power * 0.25;
      const gr = 0.3 + level * 0.05;
      ctx.beginPath();
      ctx.ellipse(0, 0.23, gr, gr * K, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + GLOW + ',' + Math.min(0.5, lit) + ')';
      ctx.fill();
      if (p.castK > 0) {
        ctx.strokeStyle = 'rgba(248,183,255,' + p.castK + ')';
        ctx.lineWidth = 0.03;
        ctx.beginPath();
        ctx.ellipse(0, 0.23, gr + p.ck * 0.25, (gr + p.ck * 0.25) * K, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(0, FEET);
      ctx.scale(p.dir * p.s, p.s);
      halo(ctx, level, p, o);
      fire(ctx, level, p);
      /* 옷자락 두 가닥 */
      tail(ctx, level, p, p.hip[0] - 0.03, p.hip[1] - 0.06, 1.3, ROBE[2]);
      tail(ctx, level, p, p.hip[0] - 0.01, p.hip[1] - 0.075, 0, ROBE[1]);
      /* 낫과 두 팔을 몸보다 먼저 그릴 때: 원월에서 낫이 몸 뒤쪽을 지날 때 */
      const far = p.spin && Math.sin(p.phi) < 0;
      trail(ctx, level, p, 'back');
      if (far) scythe(ctx, level, p);
      arm(ctx, p.armB, false);
      limb(ctx, [p.hip[0], p.hip[1], p.legB.knee[0], p.legB.knee[1], p.legB.foot[0], p.legB.foot[1], p.legB.toe[0], p.legB.toe[1]], false);
      limb(ctx, [p.hip[0], p.hip[1], p.legF.knee[0], p.legF.knee[1], p.legF.foot[0], p.legF.foot[1], p.legF.toe[0], p.legF.toe[1]], true);
      limb(ctx, [p.neck[0], p.neck[1], p.hip[0], p.hip[1]], true);
      /* 허리띠와 가슴의 달 장식 */
      artStroke(ctx, ROBE[0], [p.hip[0] - 0.03, p.hip[1] - 0.05, p.hip[0] + 0.035, p.hip[1] - 0.045], 0.024);
      artCircle(ctx, HOT, p.neck[0] + 0.006, p.neck[1] + 0.045, 0.02, ART.LW * 0.7);
      head(ctx, level, p);
      if (!far) scythe(ctx, level, p);
      arm(ctx, p.armF, true);
      trail(ctx, level, p, 'front');
      motes(ctx, level, p);
      if (p.orb > 0.05 && p.ck < 0.55) {
        /* 내뻗은 손바닥 위에 맺히는 공허 구슬 */
        const g = smooth(p.ck / 0.45);
        const x = p.palm[0] + 0.07;
        const y = p.palm[1] - 0.01;
        const r = 0.03 + 0.05 * g;
        artGlow(ctx, x, y, r * 3.2, GLOW, 0.7 * p.orb);
        artCircle(ctx, DARK, x, y, r, 0);
        ctx.lineCap = 'round';
        for (const [w, color] of [[0.022, HOT], [0.008, '#ffffff']]) {
          ctx.beginPath();
          ctx.arc(x, y, r, t * 9, t * 9 + 4.6);
          ctx.strokeStyle = color;
          ctx.lineWidth = w;
          ctx.stroke();
        }
      }
      if (p.ecl > 0.05) {
        /* 치켜든 낫날에 달빛이 모였다가, 내리찍는 순간 자루 끝에서 터진다 */
        const up = 1 - p.drop;
        if (up > 0.05) artGlow(ctx, p.tip[0], p.tip[1] + 0.05, 0.24 * up, GLOW, 0.8 * p.ecl * up);
        if (p.drop > 0.3) {
          artGlow(ctx, p.butt[0], p.butt[1], 0.2 * p.drop, GLOW, 0.8 * p.ecl);
          for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + (i - 2) * 0.5;
            artLine(ctx, 'rgba(248,183,255,' + p.ecl + ')', [p.butt[0] + Math.cos(a) * 0.04, p.butt[1] + Math.sin(a) * 0.04, p.butt[0] + Math.cos(a) * (0.1 + 0.05 * p.drop), p.butt[1] + Math.sin(a) * (0.1 + 0.05 * p.drop)], 0.014);
          }
        }
      }
      ctx.restore();
    },
  };
})();
