'use strict';
/* 홍련 — 불꽃 검을 든 영웅. 화염파와 같은 막대 인간이지만 몸은 희고, 붉은 머리띠 자락이 길게 나부낀다.
   길 가까이에 서서 다가온 적을 연달아 벤다: 머리 위에서 내려 베고, 되받아 올려 베고, 한 바퀴 돌며 벤다.
   칼은 한 손으로 쥐고 팔을 뻗어 크게 휘두른다. 칼끝이 지나간 자리에는 초승달 모양 불꽃이 남는다.
   (사거리 끝까지 번지는 큰 검기는 렌더러가 전장에 따로 그린다.)
   1단: 날 가장자리만 달아오른 강철 검, 짧은 머리띠 자락.
   2단: 불길에 싸인 달군 검, 길어진 자락, 발밑의 그을린 칼자국과 작은 불길.
   3단: 희게 달아오른 큰 검, 발끝까지 오는 자락, 등 뒤에 떠 있는 화염검 세 자루. 두 눈이 불빛으로 빛난다.

   body 는 발밑의 그림자와 그을린 자국(움직이지 않는 부분), top 은 홍련 자신.
   top 의 aim 은 겨눈 적이 있는 쪽(화면 각도). o 에는 { recoil, flash, t } 말고도 다음 값이 들어올 수 있다.
     face    보는 쪽 (+1 오른쪽, -1 왼쪽)
     pose    { idle, th }: idle 이 1 이면 칼을 어깨에 걸치고 쉰다. th 는 칼이 가리키는 각도(몸 기준).
             렌더러가 프레임마다 부드럽게 이어 준 값이다. 없으면 여기서 바로 구한다.
     swing   { k, step }: 베는 중. k 는 진행(0 → 1), step 0 = 내려 베기, 1 = 올려 베기, 2 = 회전 베기
     next    다음에 할 베기: 그 베기가 시작될 자리에 칼을 두고 기다린다
     gest    지금 하는 몸짓: 'cross'(십자 베기: 치켜들었다가 두 번 긋는다), 'swords'(화염검 낙하: 칼을 하늘로 든다)
     cast    그 몸짓이 남은 정도 (1 → 0)
     charge  다음 화염검 낙하가 준비된 정도 (0 → 1): 등 뒤의 화염검이 다시 나타나 밝아진다
     chargeX 다음 십자 베기가 준비된 정도 (0 → 1): 머리 위의 십자 불꽃이 다시 맺혀 밝아진다

   익힌 공격은 몸에 드러난다: 2단부터 머리 위에 십자 불꽃이 뜨고 발밑에 엇갈린 칼자국이 남으며,
   3단에서는 등 뒤에 화염검 세 자루가 뜨고 발밑에 그 자리를 새긴 고리가 둘린다. */
(function () {
  const BODY = ['#ffffff', '#f3ecdf', '#c9bfae']; /* 몸: 밝은 곳, 앞쪽 팔다리, 뒤쪽 팔다리 */
  const SCARF = ['#ff7a5c', '#d8382c', '#8a1c1c'];
  const STEEL = ART.steel;
  const G = ART.gold;
  const GLOW = '255,150,40';
  const K = ART.K;
  const FEET = 0.2;
  const SCALE = [1.3, 1.42, 1.56];
  const W = 0.052; /* 팔다리 굵기 */
  const LIMB = 0.16; /* 허벅지·정강이 길이 */
  const ARM = 0.14; /* 위팔·아래팔 길이 */
  const BLADE = [0.36, 0.41, 0.47]; /* 칼날 길이 */
  const TAIL = [0.2, 0.31, 0.44]; /* 머리띠 자락 길이 */
  const HIGH = -1.78; /* 내려 베기가 시작되는 자리: 겨눈 쪽에서 이만큼 위(머리 위로 치켜든다) */
  const LOW = 1.0; /* 내려 베기가 끝나는 자리: 겨눈 쪽에서 이만큼 아래(칼끝이 땅에 닿을 듯) */
  const REST = -2.45; /* 쉴 때: 칼등을 어깨에 걸친다 */
  const BACK = Math.PI - 0.12; /* 회전 베기 채비: 칼을 눕혀 등 뒤로 돌려 둔다 */
  const FLAT = 0.4; /* 땅과 나란히 도는 칼을 옆에서 볼 때의 납작함 */

  const smooth = (x) => {
    const k = Math.max(0, Math.min(1, x));
    return k * k * (3 - 2 * k);
  };

  /* 화면 각도 → 몸 기준으로 겨눈 쪽. 너무 위아래로는 꺾지 않는다 */
  function center(aim, dir) {
    return Math.max(-0.6, Math.min(0.6, Math.atan2(Math.sin(aim) * ART.TILT, Math.cos(aim) * dir)));
  }

  /* 내려 베기(0)·올려 베기(1) 동안 칼이 가리키는 각도. c 는 겨눈 쪽 */
  function swingAngle(step, k, c) {
    const e = smooth(k);
    return step === 0 ? c + HIGH + (LOW - HIGH) * e : c + LOW + (HIGH - LOW) * e;
  }

  /* 다음 베기를 기다리는 동안 칼을 두는 각도 */
  function guardAngle(next, c) {
    return next === 0 ? c + HIGH : next === 1 ? c + LOW : BACK;
  }

  /* 회전 베기: 등 뒤에서 시작해 한 바퀴 돈다. 처음 절반은 몸 뒤쪽(화면 위쪽)을 지난다 */
  const spinAngle = (k) => Math.PI + Math.PI * 2 * smooth(k);

  /* 검기의 꼬리가 머리를 따라붙는 정도: 늦게 출발해 끝에서 따라잡는다 */
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

  /* 팔: 팔꿈치는 늘 같은 쪽으로만 접힌다(팔을 들면 앞으로, 내리면 뒤로). 손이 어깨에 너무 붙으면 팔이 접혀 보이므로 조금 떼어 놓는다 */
  function armTo(sh, hand) {
    const dx = hand[0] - sh[0];
    const dy = hand[1] - sh[1];
    const n = Math.hypot(dx, dy) || 1;
    const far = Math.max(n, 0.19);
    const hd = [sh[0] + (dx / n) * far, sh[1] + (dy / n) * far];
    return { sh, el: joint(sh, hd, ARM, -1), hd: hand };
  }

  /* 십자 베기: 치켜들었다가(→ 0.3) 내려 긋고(→ 0.48), 되올려(→ 0.56) 한 번 더 긋는다(→ 0.72) */
  function crossAngle(k) {
    const seg = (a, b, k0, k1) => a + (b - a) * smooth((k - k0) / (k1 - k0));
    if (k < 0.3) return seg(-0.8, -2.2, 0, 0.3);
    if (k < 0.48) return seg(-2.2, 0.9, 0.3, 0.48);
    if (k < 0.56) return seg(0.9, -1.5, 0.48, 0.56);
    if (k < 0.72) return seg(-1.5, 1.0, 0.56, 0.72);
    return 1.0;
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
    /* 아무 값도 오지 않으면(카드·도감의 그림) 칼을 어깨에 걸친 모습으로 그린다 */
    const still = !o.pose && !o.swing && o.next == null && !o.gest;
    const idle = (o.pose ? o.pose.idle : still ? 1 : 0) * (1 - castK);
    const sw = o.swing || null;
    const k = sw ? Math.min(1, sw.k) : 0;
    const power = sw ? Math.sin(k * Math.PI) : 0; /* 휘두르는 힘: 0 → 1 → 0 */
    const spin = !!sw && sw.step === 2;
    const len = BLADE[level];

    /* 칼이 가리키는 쪽(d)과 팔이 뻗는 쪽(a) */
    let th = o.pose && o.pose.th != null ? o.pose.th : sw && !spin ? swingAngle(sw.step, k, c) : guardAngle(o.next || 0, c);
    if (gest) {
      /* 몸짓하는 동안의 칼: 가까운 쪽으로 돌아가도록 각도를 맞춘다 */
      let g = gest === 'cross' ? crossAngle(ck) : -Math.PI / 2 + 0.1;
      while (g - th > Math.PI) g -= Math.PI * 2;
      while (g - th < -Math.PI) g += Math.PI * 2;
      th += (g - th) * castK;
    }
    /* 쉴 때는 칼등을 어깨에 걸친다 */
    let rest = REST;
    while (rest - th > Math.PI) rest -= Math.PI * 2;
    while (rest - th < -Math.PI) rest += Math.PI * 2;
    th += (rest - th) * idle;
    let dx = Math.cos(th);
    let dy = Math.sin(th);
    let ax = dx;
    let ay = dy;
    let phi = 0;
    if (spin) {
      phi = spinAngle(k);
      dx = ax = Math.cos(phi);
      dy = ay = Math.sin(phi) * FLAT + 0.1;
    } else if (sw) {
      /* 팔이 칼보다 앞서 나가고 칼이 채찍처럼 따라온다 */
      const lead = (sw.step === 0 ? 1 : -1) * 0.3 * power;
      ax = Math.cos(th + lead);
      ay = Math.sin(th + lead);
    }

    /* 칼이 앞 아래로 갈수록 몸을 숙이고 앞무릎을 굽혀 깊이 내디딘다 */
    const active = 1 - idle;
    const fwd = spin ? 0.3 : Math.max(-0.4, Math.sin(th - c + 0.25));
    const bob = Math.sin(t * 2.6) * 0.006;
    const crouch = active * (0.03 + 0.055 * Math.max(0, fwd)) + power * 0.02 + (spin ? power * 0.05 : 0);
    const lunge = active * (0.05 + 0.09 * Math.max(0, fwd)) + power * 0.02;
    const lean = active * (0.07 + 0.2 * fwd) + (spin ? power * 0.1 : 0);
    const hip = [-lunge * 0.3, -0.3 + crouch + bob];
    const neck = [hip[0] + Math.sin(lean) * 0.3, hip[1] - Math.cos(lean) * 0.3];
    const head = [neck[0] + Math.sin(lean) * 0.115 + 0.012, neck[1] - Math.cos(lean) * 0.115];
    const shF = [neck[0] + 0.012, neck[1] + 0.035];
    const shB = [neck[0] - 0.012, neck[1] + 0.035];
    /* 칼 쥔 손: 어깨에서 뻗는다. 휘두를수록 팔이 곧게 펴진다. 쉴 때는 가슴 앞에서 칼자루를 쥔다 */
    const R = 0.215 + 0.05 * power + 0.04 * castK;
    const hold = [neck[0] + 0.1, neck[1] + 0.14];
    const out = [shF[0] + ax * R, shF[1] + ay * R + (spin ? 0.05 : 0)];
    const hilt = [out[0] + (hold[0] - out[0]) * idle, out[1] + (hold[1] - out[1]) * idle];
    const tip = [hilt[0] + dx * (len + 0.05), hilt[1] + dy * (len + 0.05)];
    /* 빈손: 뒤로 뻗어 균형을 잡는다. 쉴 때는 허리에 얹는다 */
    const away = [shB[0] - 0.15 - ax * 0.06, shB[1] + 0.17 - ay * 0.06];
    const onHip = [hip[0] - 0.04, hip[1] - 0.045];
    let free = [away[0] + (onHip[0] - away[0]) * idle, away[1] + (onHip[1] - away[1]) * idle];
    if (gest === 'swords') free = [free[0] + (neck[0] - 0.22 - free[0]) * castK, free[1] + (neck[1] + 0.1 - free[1]) * castK];
    const armF = armTo(shF, hilt);
    if (spin) armF.el = [(shF[0] + hilt[0]) / 2, (shF[1] + hilt[1]) / 2 + 0.012]; /* 눕혀 도는 팔은 곧게 */
    const leg = (side) => {
      const foot = [side < 0 ? -0.085 - lunge : 0.085 + lunge * 1.25, 0];
      return { knee: joint(hip, foot, LIMB, 1), foot, toe: [foot[0] + 0.06, 0] };
    };
    return {
      s: SCALE[level],
      dir, t, c, k, len, gest, ck, castK, idle, power, spin, phi, sw, th, dx, dy, hip, neck, head, shF, hilt, tip,
      reach: R + 0.05 + len, /* 어깨에서 칼끝까지 */
      armF,
      armB: armTo(shB, free),
      legB: leg(-1),
      legF: leg(1),
    };
  }

  function limb(ctx, pts, front) {
    artStroke(ctx, front ? BODY[1] : BODY[2], pts, W);
    if (front) {
      const hi = pts.map((v, i) => v + (i % 2 ? -0.012 : -0.01));
      artLine(ctx, BODY[0], hi.slice(0, 4), 0.012);
    }
  }

  /* 나부끼는 머리띠 자락: 뿌리에서 뒤로 흘러가며 가늘어진다 */
  function tail(ctx, level, p, x0, y0, phase, tone) {
    const n = 6;
    const seg = TAIL[level] / n;
    const lift = p.power * 0.7 + (1 - p.idle) * 0.25 + p.castK * 0.4;
    const mid = [];
    let x = x0;
    let y = y0;
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const ang = Math.PI - 0.55 + lift * 0.9 + Math.sin(p.t * 4.6 - f * 4.2 + phase) * 0.42 * (0.25 + f);
      mid.push([x, y, ang, 0.034 * (1 - f * 0.7)]);
      x += Math.cos(ang) * seg;
      y += Math.sin(ang) * seg;
    }
    const pts = [];
    for (const c of mid) pts.push(c[0] + Math.sin(c[2]) * c[3], c[1] - Math.cos(c[2]) * c[3]);
    for (let i = mid.length - 1; i >= 0; i--) pts.push(mid[i][0] - Math.sin(mid[i][2]) * mid[i][3], mid[i][1] + Math.cos(mid[i][2]) * mid[i][3]);
    artPoly(ctx, tone, pts, ART.LW * 0.8);
  }

  function head(ctx, level, p) {
    const hx = p.head[0];
    const hy = p.head[1];
    const r = 0.1;
    artCircle(ctx, BODY[1], hx, hy, r);
    artEllipse(ctx, BODY[0], hx - 0.03, hy - 0.04, 0.042, 0.03, 0, -0.5);
    ctx.beginPath();
    ctx.arc(hx, hy, r * 0.9, 0.1, 1.5);
    ctx.strokeStyle = BODY[2];
    ctx.lineWidth = 0.016;
    ctx.stroke();
    /* 이마를 동여맨 붉은 머리띠와 매듭 */
    artStroke(ctx, SCARF[1], [hx - 0.094, hy - 0.022, hx - 0.02, hy - 0.05, hx + 0.092, hy - 0.04], 0.03);
    artLine(ctx, SCARF[0], [hx - 0.07, hy - 0.04, hx - 0.01, hy - 0.058], 0.01);
    artCircle(ctx, SCARF[2], hx - 0.096, hy - 0.02, 0.024, ART.LW * 0.8);
    /* 치켜뜬 두 눈. 3단에서는 불빛으로 타오른다 */
    const hot = level === 2 || p.power > 0.3 || p.castK > 0.5;
    if (hot) artGlow(ctx, hx + 0.04, hy + 0.02, 0.09, GLOW, level === 2 ? 0.55 : 0.35);
    for (const [ex, ew] of [[hx + 0.01, 0.026], [hx + 0.066, 0.019]]) {
      const ey = hy + 0.022;
      artPoly(ctx, hot ? '#ffb347' : ART.OUT, [ex - ew, ey - 0.02, ex + ew, ey - 0.004, ex + ew * 0.75, ey + 0.02, ex - ew * 0.8, ey + 0.014], hot ? ART.LW * 0.55 : 0);
    }
  }

  /* 칼: 손잡이, 코등이, 날. 단계가 오를수록 달아올라 불길이 커진다 */
  function sword(ctx, level, p) {
    const t = p.t;
    const hx = p.hilt[0];
    const hy = p.hilt[1];
    const dx = p.dx;
    const dy = p.dy;
    const n = Math.hypot(dx, dy) || 1;
    const px = -dy / n; /* 날의 너비 쪽 */
    const py = dx / n;
    const gx = hx + dx * 0.05;
    const gy = hy + dy * 0.05;
    const tx = p.tip[0];
    const ty = p.tip[1];
    const hw = 0.023 + level * 0.004;
    const at = (f, side) => [gx + (tx - gx) * f + px * hw * side, gy + (ty - gy) * f + py * hw * side];
    const heat = [0.35, 0.75, 1][level] + p.power * 0.3 + p.castK * 0.3;

    /* 날을 타고 오르는 불길 */
    const flames = 2 + level * 2;
    for (const [alpha, wide, tall, color] of [[0.75, 1, 1, '255,104,24'], [0.9, 0.55, 0.62, '255,214,110']]) {
      for (let i = 0; i < flames; i++) {
        const f = 0.3 + (0.68 * i) / Math.max(1, flames - 1);
        const x = gx + (tx - gx) * f;
        const y = gy + (ty - gy) * f;
        const hgt = (0.05 + heat * 0.085) * tall * (0.78 + 0.22 * Math.sin(t * 9 + i * 1.9));
        KIT.tongue(ctx, x, y + 0.01, (0.022 + heat * 0.014) * wide, hgt, Math.sin(t * 4 + i * 1.4) * 0.02 - dx * 0.03, 'rgba(' + color + ',' + alpha + ')');
      }
    }
    if (level >= 1) artGlow(ctx, (gx + tx) / 2, (gy + ty) / 2, 0.14 + heat * 0.06, GLOW, 0.3 + 0.12 * heat);

    /* 손잡이와 코등이 */
    artStroke(ctx, '#48291a', [hx - dx * 0.045, hy - dy * 0.045, gx, gy], 0.026);
    artCircle(ctx, G[1], hx - dx * 0.05, hy - dy * 0.05, 0.017, ART.LW * 0.7);
    artStroke(ctx, G[1], [gx - px * 0.05, gy - py * 0.05, gx + px * 0.05, gy + py * 0.05], 0.026);
    /* 날 */
    const fill = level === 0 ? STEEL[0] : level === 1 ? '#ffd45a' : '#fff6cf';
    artPoly(ctx, fill, [...at(0, -1), ...at(0.8, -0.9), tx, ty, ...at(0.8, 0.9), ...at(0, 1)]);
    if (level === 0) {
      /* 달아오른 날 가장자리 */
      artLine(ctx, '#ff9226', [...at(0.06, 0.55), ...at(0.8, 0.5), tx - dx * 0.03, ty - dy * 0.03], 0.012);
      artLine(ctx, '#ffffff', [...at(0.1, -0.4), ...at(0.7, -0.35)], 0.008);
    } else {
      artLine(ctx, level === 2 ? '#ffffff' : '#fff6cf', [gx + dx * 0.03, gy + dy * 0.03, tx - dx * 0.06, ty - dy * 0.06], 0.012);
      artLine(ctx, '#ff9226', [...at(0.05, 0.75), ...at(0.8, 0.68)], 0.01);
    }
  }

  /* 칼끝이 지나간 자리의 초승달 불꽃. (cx, cy) 를 중심으로 a0(꼬리) → a1(머리).
     flat 이 1 보다 작으면 납작한 타원을 따라간다(회전 베기). 가운데가 두껍고 양 끝이 뾰족하며 바깥 테두리가 가장 밝다. */
  function crescent(ctx, cx, cy, r, flat, a0, a1, thick, alpha, seed) {
    const span = a1 - a0;
    if (Math.abs(span) < 0.06) return;
    const n = Math.max(5, Math.ceil(Math.abs(span) / 0.16));
    const prof = (f) => Math.sin(Math.PI * Math.pow(f, 1.45)); /* 머리 가까이가 가장 두껍다 */
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
    layer(0.02, thick * 1.5, 'rgba(122,26,14,' + 0.5 * alpha + ')', true); /* 뒤에 끌리는 검붉은 불길 */
    layer(0.012, thick, 'rgba(232,85,42,' + 0.9 * alpha + ')', true);
    layer(0, thick * 0.62, 'rgba(255,170,60,' + 0.95 * alpha + ')', false);
    layer(-0.006, thick * 0.3, 'rgba(255,241,168,' + alpha + ')', false);
    /* 가장 뜨거운 바깥 날 */
    const pts = [];
    for (let i = Math.floor(n * 0.4); i <= n; i++) {
      const a = a0 + (span * i) / n;
      pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r * flat);
    }
    if (pts.length >= 4) artLine(ctx, 'rgba(255,255,255,' + alpha + ')', pts, 0.016);
  }

  /* 지금 긋는 베기의 불꽃. 회전 베기는 몸 뒤를 지나는 쪽('back')과 앞을 지나는 쪽('front')을 나눠 그린다 */
  function trail(ctx, level, p, part) {
    if (!p.sw) return;
    const k = p.k;
    const fade = Math.min(1, (1 - k) * 3.2 + 0.1);
    const thick = 0.17 + level * 0.045;
    const cx = p.shF[0];
    const cy = p.shF[1];
    if (p.spin) {
      const tl = Math.PI + (p.phi - Math.PI) * tailOf(k);
      /* 몸 뒤를 지나는 구간: π ~ 2π, 앞을 지나는 구간: 2π ~ 3π */
      const a0 = Math.max(tl, part === 'back' ? Math.PI : Math.PI * 2);
      const a1 = Math.min(p.phi, part === 'back' ? Math.PI * 2 : Math.PI * 3);
      if (a1 > a0) crescent(ctx, cx, cy + 0.15, p.reach, FLAT, a0, a1, thick * 1.25, fade, 1.7);
      return;
    }
    if (part === 'back') return;
    const a0 = swingAngle(p.sw.step, 0, p.c);
    crescent(ctx, cx, cy, p.reach, 1, a0 + (p.th - a0) * tailOf(k), p.th, thick, fade, p.sw.step * 2.3);
  }

  /* 등 뒤에 떠 있는 화염검 (3단). 화염검 낙하를 쓰면 하늘로 솟구쳤다가, 다시 준비되면서 나타난다 */
  function wings(ctx, p, charge) {
    const rise = p.gest === 'swords' ? p.ck : 0;
    const show = p.gest === 'swords' ? Math.max(0, 1 - rise * 2.6) : Math.min(1, charge * 2.5);
    if (show <= 0.02) return;
    const ready = charge >= 1 ? 1 : 0.6;
    ctx.globalAlpha = show * ready;
    artGlow(ctx, -0.24, -0.5 - rise, 0.3, GLOW, 0.4);
    for (let i = 0; i < 3; i++) {
      const bob = Math.sin(p.t * 2.2 + i * 1.7) * 0.012;
      const x = -0.13 - i * 0.105;
      const y = -0.7 + i * 0.1 + bob - rise * (1 + i * 0.2);
      const lean = 0.5 - i * 0.2; /* 끝이 몸 쪽으로 기운다 */
      const ux = Math.sin(lean);
      const uy = Math.cos(lean);
      const L = 0.27;
      const hw = 0.028;
      ctx.globalAlpha = show * ready;
      KIT.tongue(ctx, x, y + 0.01, 0.04, 0.12 + 0.03 * Math.sin(p.t * 9 + i), -ux * 0.04, 'rgba(255,104,24,.85)');
      KIT.tongue(ctx, x, y + 0.01, 0.022, 0.07 + 0.02 * Math.sin(p.t * 9 + i), -ux * 0.02, 'rgba(255,214,110,.9)');
      artPoly(ctx, '#ffd45a', [x - uy * hw, y + ux * hw, x + ux * L * 0.75 - uy * hw * 0.9, y + uy * L * 0.75 + ux * hw * 0.9, x + ux * L, y + uy * L, x + ux * L * 0.75 + uy * hw * 0.9, y + uy * L * 0.75 - ux * hw * 0.9, x + uy * hw, y - ux * hw], ART.LW * 0.8);
      artLine(ctx, '#ffffff', [x + ux * 0.02, y + uy * 0.02, x + ux * L * 0.8, y + uy * L * 0.8], 0.01);
      artStroke(ctx, G[1], [x - uy * 0.04, y + ux * 0.04, x + uy * 0.04, y - ux * 0.04], 0.02);
    }
    ctx.globalAlpha = 1;
  }

  /* 머리 위에 떠 있는 십자 불꽃 (2단부터). 십자 베기가 준비되면 밝게 타오르고, 쓰는 순간 날아가 사라졌다가 다시 맺힌다 */
  function sigil(ctx, p, charge) {
    const using = p.gest === 'cross';
    const show = using ? Math.max(0, 1 - p.ck * 3.2) : Math.min(1, charge * 1.6);
    if (show <= 0.03) return;
    const ready = charge >= 1;
    const x = p.head[0] + 0.02;
    const y = p.head[1] - 0.3 + Math.sin(p.t * 2.4) * 0.012;
    const s = (0.09 + (ready ? 0.01 * Math.sin(p.t * 8) : 0)) * (0.6 + 0.4 * show);
    ctx.globalAlpha = show * (ready ? 1 : 0.55);
    artGlow(ctx, x, y, s * 2.8, GLOW, ready ? 0.7 : 0.35);
    for (const sgn of [1, -1]) {
      const ux = Math.cos(sgn * 0.82);
      const uy = Math.sin(sgn * 0.82);
      for (const [w, color, lw] of [[0.5, '#e8552a', ART.LW * 0.7], [0.3, '#ffb347', 0], [0.12, '#fff6cf', 0]]) {
        artPoly(ctx, color, [x - ux * s * 1.5, y - uy * s * 1.5, x - uy * s * w, y + ux * s * w, x + ux * s * 1.5, y + uy * s * 1.5, x + uy * s * w, y - ux * s * w], lw);
      }
    }
    if (ready) artSparkle(ctx, x, y, s * 0.9, '#ffffff', 0.7 + 0.3 * Math.sin(p.t * 10));
    ctx.globalAlpha = 1;
  }

  /* 발치에 이는 불길 (2단부터) */
  function fire(ctx, level, p) {
    const power = [0, 0.45, 0.8][level] + p.power * 0.3 + p.castK * 0.3;
    if (power < 0.1) return;
    const n = level === 2 ? 6 : 4;
    for (const [alpha, wide, tall, color] of [[0.6, 1, 1, '255,104,24'], [0.8, 0.56, 0.6, '255,204,92']]) {
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1);
        const x = p.hip[0] + (f - 0.5) * (0.26 + power * 0.14);
        const hgt = (0.3 + 0.7 * Math.sin(f * Math.PI)) * (0.1 + power * 0.2) * tall * (0.84 + 0.16 * Math.sin(p.t * 7 + i * 1.9));
        KIT.tongue(ctx, x, 0.03, (0.04 + power * 0.02) * wide, hgt, Math.sin(p.t * 3.1 + i * 1.3) * 0.035, 'rgba(' + color + ',' + alpha + ')');
      }
    }
  }

  /* 칼끝에서 흩날리는 불티 */
  function embers(ctx, level, p) {
    const n = 2 + level * 2 + (p.power > 0 ? 2 : 0);
    for (let i = 0; i < n; i++) {
      const k = (p.t * (0.6 + (i % 3) * 0.15) + i * 0.29) % 1;
      const f = 0.4 + (i % 4) * 0.2;
      const x = p.hilt[0] + (p.tip[0] - p.hilt[0]) * f + Math.sin(i * 2.4 + p.t * 2) * 0.03;
      const y = p.hilt[1] + (p.tip[1] - p.hilt[1]) * f - k * (0.22 + level * 0.08);
      ctx.globalAlpha = (1 - k) * 0.95;
      artCircle(ctx, i % 2 ? '#ffd88f' : '#ff9226', x, y, 0.011 + (1 - k) * 0.007, 0);
    }
    ctx.globalAlpha = 1;
  }

  function arm(ctx, a, front) {
    limb(ctx, [a.sh[0], a.sh[1], a.el[0], a.el[1], a.hd[0], a.hd[1]], front);
    artCircle(ctx, front ? BODY[1] : BODY[2], a.hd[0], a.hd[1], front ? 0.034 : 0.032, ART.LW);
  }

  TOWER_ART.blade = {
    /* 렌더러가 칼의 각도를 프레임마다 이어 주는 데 쓴다 */
    center,
    swingAngle,
    guardAngle,
    REST,

    /* 받침대는 없다. 발밑의 그림자와, 2단부터는 그을린 칼자국 */
    body(ctx, level) {
      artShadow(ctx, 0.04, 0.24, 0.26 + level * 0.03, 0.09);
      if (level === 0) return;
      const r = 0.34 + level * 0.04;
      ctx.beginPath();
      ctx.ellipse(0, 0.23, r, r * K, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(44,30,24,.36)';
      ctx.fill();
      if (level === 2) {
        /* 화염검 세 자루의 자리를 새긴 고리 */
        ctx.beginPath();
        ctx.ellipse(0, 0.23, r * 0.92, r * 0.92 * K, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(30,18,14,.75)';
        ctx.lineWidth = 0.04;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,146,38,.9)';
        ctx.lineWidth = 0.018;
        ctx.stroke();
        for (const a of [-2.5, -1.57, -0.64]) {
          const x = Math.cos(a) * r * 0.92;
          const y = 0.23 + Math.sin(a) * r * 0.92 * K;
          artPoly(ctx, '#ffd45a', [x, y - 0.045, x + 0.022, y, x, y + 0.03, x - 0.022, y], ART.LW * 0.6);
        }
      }
      /* 십자 베기를 익힌 자리: 엇갈린 칼자국에서 불빛이 샌다 (3단은 더 밝다) */
      const cuts = [[-0.27, 0.17, 0.27, 0.29], [-0.25, 0.3, 0.26, 0.16]];
      for (const c of cuts) {
        const pts = [c[0], c[1], (c[0] + c[2]) / 2, (c[1] + c[3]) / 2 + 0.012, c[2], c[3]];
        artLine(ctx, 'rgba(30,18,14,.8)', pts, 0.034);
        artLine(ctx, level === 2 ? 'rgba(255,146,38,.95)' : 'rgba(255,122,26,.7)', pts, 0.016);
        if (level === 2) artLine(ctx, 'rgba(255,241,168,.9)', pts, 0.006);
      }
    },

    top(ctx, level, aim, o) {
      const p = pose(level, aim, o);
      const t = p.t;
      /* 발밑에 고이는 불빛 */
      const lit = [0.06, 0.18, 0.3][level] + 0.05 * Math.sin(t * 2.4) + p.castK * 0.3 + p.power * 0.25;
      const gr = 0.3 + level * 0.05;
      ctx.beginPath();
      ctx.ellipse(0, 0.23, gr, gr * K, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + GLOW + ',' + Math.min(0.55, lit) + ')';
      ctx.fill();
      if (p.castK > 0) {
        ctx.strokeStyle = 'rgba(255,216,143,' + p.castK + ')';
        ctx.lineWidth = 0.03;
        ctx.beginPath();
        ctx.ellipse(0, 0.23, gr + p.ck * 0.25, (gr + p.ck * 0.25) * K, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(0, FEET);
      ctx.scale(p.dir * p.s, p.s);
      if (level === 2) wings(ctx, p, o.charge == null ? 1 : o.charge);
      if (level >= 1) sigil(ctx, p, o.chargeX == null ? 1 : o.chargeX);
      fire(ctx, level, p);
      /* 머리띠 자락 두 가닥 */
      tail(ctx, level, p, p.head[0] - 0.1, p.head[1] - 0.01, 1.3, SCARF[1]);
      tail(ctx, level, p, p.head[0] - 0.1, p.head[1] - 0.035, 0, SCARF[0]);
      /* 칼과 칼 쥔 팔을 몸보다 먼저 그릴 때: 회전 베기에서 칼이 몸 뒤쪽을 지날 때, 손을 머리 위로 치켜들었을 때, 칼등을 어깨에 걸쳤을 때 */
      const far = p.spin && Math.sin(p.phi) < 0;
      const raised = p.hilt[1] < p.head[1] + 0.04;
      trail(ctx, level, p, 'back');
      if (far) {
        sword(ctx, level, p);
        arm(ctx, p.armF, true);
      }
      arm(ctx, p.armB, false);
      limb(ctx, [p.hip[0], p.hip[1], p.legB.knee[0], p.legB.knee[1], p.legB.foot[0], p.legB.foot[1], p.legB.toe[0], p.legB.toe[1]], false);
      limb(ctx, [p.hip[0], p.hip[1], p.legF.knee[0], p.legF.knee[1], p.legF.foot[0], p.legF.foot[1], p.legF.toe[0], p.legF.toe[1]], true);
      limb(ctx, [p.neck[0], p.neck[1], p.hip[0], p.hip[1]], true);
      /* 허리띠 */
      artStroke(ctx, SCARF[1], [p.hip[0] - 0.03, p.hip[1] - 0.05, p.hip[0] + 0.035, p.hip[1] - 0.045], 0.022);
      if (!far && (raised || p.idle > 0.5)) {
        sword(ctx, level, p);
        if (raised) arm(ctx, p.armF, true);
      }
      head(ctx, level, p);
      if (!far && !raised) {
        if (p.idle <= 0.5) sword(ctx, level, p);
        arm(ctx, p.armF, true);
      }
      trail(ctx, level, p, 'front');
      embers(ctx, level, p);
      if (p.gest === 'swords' && p.castK > 0.2) {
        /* 하늘로 든 칼끝에 불빛이 모인다 */
        artGlow(ctx, p.tip[0], p.tip[1], 0.22 * p.castK, GLOW, 0.75 * p.castK);
        artSparkle(ctx, p.tip[0], p.tip[1], 0.07 * p.castK + 0.01 * Math.sin(t * 20), '#fff6cf', 1);
      }
      ctx.restore();
    },
  };
})();
