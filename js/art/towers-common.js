'use strict';
/* 일반 등급 탑 — 창탑, 쌍궁탑, 가시덫탑, 횃불탑, 종탑, 감시탑, 끈끈이탑.
   나무와 돌로 지은 소박한 탑들이다. 무기의 회전축은 (0, -TOWERS[type].levels[level].h). */
(function () {
  const S = ART.stone;
  const W = ART.wood;
  const D = ART.darkwood;
  const I = ART.iron;
  const G = ART.gold;
  const R = ART.red;
  const GR = ART.green;
  const TH = ART.thatch;
  const K = ART.K;
  const H = (type, level) => TOWERS[type].levels[level].h;

  /* 가시 박힌 쇠공 */
  function spikeBall(ctx, x, y, r) {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + 0.3;
      artPoly(ctx, I[0], [x + Math.cos(a - 0.3) * r * 0.8, y + Math.sin(a - 0.3) * r * 0.8, x + Math.cos(a) * r * 1.7, y + Math.sin(a) * r * 1.7, x + Math.cos(a + 0.3) * r * 0.8, y + Math.sin(a + 0.3) * r * 0.8], ART.LW * 0.6);
    }
    artCircle(ctx, I[1], x, y, r, ART.LW * 0.8);
    artCircle(ctx, I[0], x - r * 0.3, y - r * 0.3, r * 0.35, 0);
  }

  /* 창 한 자루: (x0, y0) 자루 끝에서 (x1, y1) 날 끝까지 */
  function spear(ctx, x0, y0, x1, y1, tassel) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const n = Math.hypot(dx, dy) || 1;
    const ux = dx / n;
    const uy = dy / n;
    artStroke(ctx, W[1], [x0, y0, x1 - ux * 0.1, y1 - uy * 0.1], 0.026);
    artPoly(ctx, ART.steel[0], [x1, y1, x1 - ux * 0.13 - uy * 0.04, y1 - uy * 0.13 + ux * 0.04, x1 - ux * 0.13 + uy * 0.04, y1 - uy * 0.13 - ux * 0.04], ART.LW * 0.7);
    if (tassel) artCircle(ctx, tassel, x1 - ux * 0.15, y1 - uy * 0.15, 0.03, ART.LW * 0.6);
  }

  /* ───── 창탑: 말뚝을 두른 통나무 망루에서 창을 던진다 ───── */
  const SPEAR = [-0.42, -0.58, -0.76];
  TOWER_ART.spear = {
    body(ctx, level) {
      const top = SPEAR[level];
      let wAt;
      if (level === 2) {
        /* 3단: 아래는 돌, 위는 통나무 */
        const mid = -0.2;
        wAt = KIT.square(ctx, { tones: S, top: mid, wTop: 0.31, wBot: 0.36, rows: 3, door: D });
        artBox(ctx, W, 0, top, mid, 0.27, 0.31, { topFill: W[0] });
        for (const f of [0.34, 0.68]) {
          for (const side of [-1, 1]) artLine(ctx, 'rgba(40,20,10,.34)', [side * 0.27 * f, top + 0.27 * K * (1 - f) + 0.02, side * 0.31 * f, mid + 0.31 * K * (1 - f) - 0.01], 0.012);
        }
        artLine(ctx, G[1], [-0.31, mid, 0, mid + 0.31 * K, 0.31, mid], 0.026);
      } else {
        wAt = KIT.square(ctx, { tones: W, top, wTop: 0.27, wBot: 0.35, planks: true, door: D });
      }
      if (level >= 1) {
        /* 쇠테와 방패 */
        const y = top + 0.16;
        const w = (level === 2 ? 0.275 : wAt(y)) + 0.004;
        artLine(ctx, I[1], [-w, y, 0, y + w * K, w, y], 0.03);
        artShield(ctx, 0.15, top + 0.36, 0.05, R, G[1]);
      }
      /* 꼭대기를 두른 뾰족 말뚝 */
      for (const f of [-1, -0.5, 0, 0.5, 1]) {
        const x = f * 0.27;
        const y = top + (1 - Math.abs(f)) * 0.27 * K;
        artPoly(ctx, f < 0 ? W[0] : f > 0 ? W[2] : W[1], [x - 0.04, y + 0.03, x - 0.04, y - 0.06, x, y - 0.13, x + 0.04, y - 0.06, x + 0.04, y + 0.03]);
      }
      /* 기대어 세워 둔 창들 */
      spear(ctx, 0.3, 0.42, 0.4, -0.12, level === 2 ? R[1] : null);
      spear(ctx, 0.36, 0.43, 0.43, -0.02, null);
      if (level >= 1) spear(ctx, 0.42, 0.44, 0.46, 0.06, null);
      artLantern(ctx, -0.02, top + 0.34 + 0.27 * K, 0.85);
      if (level === 2) artFlag(ctx, R, -0.27, top - 0.34, -0.2, 0.12, 0), artLine(ctx, ART.OUT, [-0.27, top + 0.02, -0.27, top - 0.36], 0.026);
      /* 창을 얹는 받침대 */
      artStroke(ctx, D[1], [0, top + 0.02, 0, -H('spear', level) + 0.05], 0.05);
    },
    top(ctx, level, aim, o) {
      const h = H('spear', level);
      const a = artAim(aim);
      const s = 1 + level * 0.1;
      /* 갈고리 받침 */
      artStroke(ctx, D[0], [-a.sx * 0.07 * s, -h - a.sy * 0.07 * s + 0.03, 0, -h + 0.05, a.sx * 0.07 * s, -h + a.sy * 0.07 * s + 0.03], 0.034);
      if (o.recoil > 0.55) return; /* 막 던진 참이라 받침이 비어 있다 */
      const back = 0.24 * s + o.recoil * 0.2;
      const front = 0.34 * s - o.recoil * 0.2;
      spear(ctx, -a.fx * back, -h - a.fy * back, a.fx * front, -h + a.fy * front, level === 2 ? R[1] : level === 1 ? GR[1] : null);
    },
  };

  /* ───── 쌍궁탑: 망루 위에 활 여러 벌을 걸어 두고 한꺼번에 쏜다 ───── */
  const TWIN = [-0.56, -0.72, -0.9];
  function bow(ctx, x, y, a, size, pull, tone) {
    /* 활대와 시위: 겨눈 쪽으로 볼록하다 */
    const q = (u, v) => [x + a.fx * u + a.sx * v, y + a.fy * u + a.sy * v];
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const f = i / 8 - 0.5;
      pts.push(...q(size * (0.5 - f * f * 2.2), f * size * 2.4));
    }
    artStroke(ctx, tone, pts, 0.03);
    const nock = q(-pull * size * 0.9, 0);
    artLine(ctx, '#f6f0dc', [pts[0], pts[1], nock[0], nock[1], pts[16], pts[17]], 0.012);
    if (pull > 0.2) {
      const tip = q(size * 0.9, 0);
      artLine(ctx, ART.OUT, [nock[0], nock[1], tip[0], tip[1]], 0.028);
      artLine(ctx, '#f3e4bb', [nock[0], nock[1], tip[0], tip[1]], 0.012);
    }
  }
  TOWER_ART.twin = {
    body(ctx, level) {
      const y = TWIN[level];
      artShadow(ctx, 0.07, 0.33, 0.47, 0.15);
      artBox(ctx, [S[1], S[1], S[2]], 0, 0.24, 0.32, 0.43, 0.45, { topFill: S[1] });
      if (level === 2) {
        const mid = -0.3;
        KIT.square(ctx, { tones: S, top: mid, wTop: 0.3, wBot: 0.36, rows: 4, base: false, door: D });
        KIT.frame(ctx, y + 0.075, mid, 0.3, 0.3, W, D);
      } else {
        KIT.frame(ctx, y + 0.075, KIT.GROUND, 0.3, 0.37, W, D);
      }
      KIT.deck(ctx, y, 0.34, W);
      KIT.rail(ctx, y, 0.32, W, true);
      if (level >= 1) {
        /* 지붕을 받치는 뒤 기둥 */
        artStroke(ctx, D[1], [0, y - 0.32 * K, 0, y - 0.46], 0.04);
      }
      /* 화살통과 과녁 */
      artBarrel(ctx, 0.33, 0.41, 0.055, 0.12, W, I[1]);
      for (const dx of [-0.025, 0.02]) {
        artLine(ctx, '#e9dcb6', [0.33 + dx, 0.3, 0.33 + dx * 1.8, 0.16], 0.014);
        artPoly(ctx, level === 2 ? G[1] : GR[1], [0.33 + dx * 1.8 - 0.022, 0.19, 0.33 + dx * 1.8, 0.13, 0.33 + dx * 1.8 + 0.022, 0.19], ART.LW * 0.5);
      }
      artCircle(ctx, '#f3dc7c', -0.36, 0.33, 0.07);
      artCircle(ctx, R[1], -0.36, 0.33, 0.045, 0);
      artCircle(ctx, '#ffffff', -0.36, 0.33, 0.02, 0);
    },
    top(ctx, level, aim, o) {
      const h = H('twin', level);
      const a = artAim(aim);
      const pull = 1 - Math.min(1, o.recoil * 1.4);
      const tone = level === 2 ? D[0] : W[1];
      const spots = level === 2 ? [[-0.19, 0], [0.19, 0], [0, -0.12]] : [[-0.15, 0], [0.15, 0]];
      /* 뒤에 있는 활부터 */
      spots.sort((p, q) => p[1] - q[1]);
      for (const [x, dy] of spots) {
        artStroke(ctx, D[1], [x, -h + dy + 0.12, x, -h + dy], 0.03);
        bow(ctx, x, -h + dy, a, 0.1 + level * 0.01, pull, tone);
      }
    },
    front(ctx, level) {
      const y = TWIN[level];
      KIT.rail(ctx, y, 0.32, W, false);
      if (level === 0) return;
      /* 앞 기둥과 지붕: 2단은 이엉, 3단은 초록 기와 */
      artStroke(ctx, W[0], [-0.3, y - 0.11, -0.3, y - 0.42], 0.034);
      artStroke(ctx, W[2], [0.3, y - 0.11, 0.3, y - 0.42], 0.034);
      const base = y - 0.4;
      const rise = level === 2 ? 0.26 : 0.19;
      KIT.pyramid(ctx, level === 2 ? GR : TH, base - rise, base, 0.38, level === 2 ? G[1] : null);
      KIT.finial(ctx, 0, base - rise, level === 2 ? G[1] : W[0], 0.04);
    },
  };

  /* ───── 가시덫탑: 낮은 돌 작업장 위의 투석 팔이 가시 쇠공을 길에 던져 놓는다 ───── */
  const TRAP = [-0.3, -0.44, -0.6];
  TOWER_ART.trap = {
    body(ctx, level) {
      const top = TRAP[level];
      const band = level === 2 ? G[1] : I[1];
      KIT.round(ctx, {
        tones: S, top, rTop: 0.27, rBot: 0.35, rows: 2 + level,
        hoops: level >= 1 ? [[top + 0.1, band, 0.035]] : [],
        door: D,
      });
      /* 나무 마루 */
      artCylinder(ctx, W, 0, top - 0.04, top + 0.03, 0.3, 0.28, { topFill: W[0] });
      /* 가시 쇠공 더미 */
      spikeBall(ctx, -0.36, 0.37, 0.05);
      spikeBall(ctx, -0.27, 0.4, 0.042);
      if (level >= 1) spikeBall(ctx, 0.33, 0.39, 0.048);
      if (level === 2) {
        artLine(ctx, ART.OUT, [0.24, top - 0.02, 0.24, top - 0.36], 0.026);
        artFlag(ctx, R, 0.24, top - 0.36, 0.2, 0.12, 0);
      }
      /* 팔을 받치는 두 기둥 */
      const h = H('trap', level);
      artStroke(ctx, D[1], [-0.1, top - 0.03, -0.06, -h + 0.02], 0.045);
      artStroke(ctx, D[2], [0.1, top - 0.03, 0.06, -h + 0.02], 0.045);
    },
    top(ctx, level, aim, o) {
      const h = H('trap', level);
      const a = artAim(aim);
      const s = 1 + level * 0.12;
      /* 팔: 쉴 때는 뒤로 젖혀 있고, 던지는 순간 앞으로 넘어온다 */
      const swing = o.recoil; /* 1 → 0 */
      const lean = -0.75 + swing * 1.6;
      const len = 0.3 * s;
      const tipX = a.fx * Math.sin(lean) * len;
      const tipY = -h + a.fy * Math.sin(lean) * len - Math.cos(lean) * len;
      artStroke(ctx, W[1], [-a.fx * Math.sin(lean) * 0.08, -h + 0.03 + Math.cos(lean) * 0.03, tipX, tipY], 0.045);
      artCircle(ctx, I[1], 0, -h + 0.01, 0.04, ART.LW * 0.8);
      /* 끝의 바구니와, 아직 던지지 않은 쇠공 */
      artEllipse(ctx, D[1], tipX, tipY, 0.07 * s, 0.045 * s, ART.LW * 0.8);
      if (swing < 0.35) spikeBall(ctx, tipX, tipY - 0.035, 0.04 * s);
    },
  };

  /* ───── 횃불탑: 돌기둥 위의 화로에서 불씨를 던진다 ───── */
  const TORCH = [-0.5, -0.68, -0.86];
  TOWER_ART.torch = {
    body(ctx, level) {
      const top = TORCH[level];
      const band = level === 2 ? G[1] : I[1];
      KIT.round(ctx, {
        tones: S, top, rTop: 0.15, rBot: 0.27, rows: 3 + level,
        hoops: level >= 1 ? [[top + 0.14, band, 0.03], [0.06, band, 0.03]] : [[0.06, I[1], 0.03]],
        door: false,
      });
      /* 그을음 */
      const soot = ctx.createLinearGradient(0, top, 0, top + 0.26);
      soot.addColorStop(0, 'rgba(40,24,28,.45)');
      soot.addColorStop(1, 'rgba(40,24,28,0)');
      ctx.fillStyle = soot;
      ctx.fillRect(-0.19, top, 0.38, 0.26);
      if (level >= 1) {
        /* 벽에 꽂은 작은 횃불 */
        for (const sgn of [-1, 1]) {
          artStroke(ctx, D[1], [sgn * 0.2, -0.02, sgn * 0.3, -0.12], 0.03);
          artCircle(ctx, I[1], sgn * 0.3, -0.13, 0.035, ART.LW * 0.7);
        }
      }
      if (level === 2) KIT.sign.sun(ctx, 0, top + 0.36, 0.034, G[1]);
      /* 장작 */
      for (const [x, y] of [[-0.36, 0.41], [-0.28, 0.42], [-0.32, 0.36]]) {
        artCircle(ctx, W[1], x, y, 0.04, ART.LW * 0.8);
        artCircle(ctx, W[0], x, y, 0.022, 0);
      }
      /* 화로: 받침과 쇠 대접 */
      const h = H('torch', level);
      const r = 0.19 + level * 0.02;
      artCylinder(ctx, [I[0], I[1], I[2]], 0, top - 0.03, top + 0.03, 0.17, 0.15, { topFill: I[2] });
      ctx.beginPath();
      ctx.moveTo(-r, -h + 0.02);
      ctx.bezierCurveTo(-r * 1.1, -h + 0.2, r * 1.1, -h + 0.2, r, -h + 0.02);
      ctx.closePath();
      artFill(ctx, I[1]);
      artEllipse(ctx, level === 2 ? G[1] : I[0], 0, -h + 0.02, r + 0.015, (r + 0.015) * K);
      artEllipse(ctx, '#5a1a10', 0, -h + 0.02, r - 0.02, (r - 0.02) * K, ART.LW * 0.7);
      artEllipse(ctx, '#ff9226', 0, -h + 0.025, r - 0.05, (r - 0.05) * K, 0);
    },
    top(ctx, level, aim, o) {
      const h = H('torch', level);
      const t = o.t;
      const a = artAim(aim);
      const big = 1 + level * 0.18 + o.recoil * 0.35;
      artGlow(ctx, 0, -h - 0.08, 0.34 * big, '255,150,40', 0.3 + 0.08 * Math.sin(t * 6));
      for (const [dx, hh] of [[-0.07, 0.17], [0.07, 0.15], [0, 0.26]]) {
        KIT.fire(ctx, dx + a.fx * o.recoil * 0.05, -h + 0.03, 0.06 * big, hh * big, t + dx * 9);
      }
      if (level >= 1) {
        for (const sgn of [-1, 1]) KIT.fire(ctx, sgn * 0.3, -0.15, 0.03, 0.09, t + sgn);
      }
      /* 튀는 불티 */
      for (let i = 0; i < 3 + level; i++) {
        const k = (t * 0.8 + i * 0.31) % 1;
        ctx.globalAlpha = 1 - k;
        artCircle(ctx, '#ffd88f', Math.sin(i * 2.3 + t) * 0.1, -h - 0.1 - k * 0.3, 0.012, 0);
      }
      ctx.globalAlpha = 1;
    },
  };

  /* ───── 종탑: 지붕 밑에 매단 종을 울려 주변의 적을 멈춰 세운다 ───── */
  const BELL = [-0.2, -0.36, -0.52];
  TOWER_ART.bell = {
    body(ctx, level) {
      const y0 = BELL[level];
      const h = H('bell', level);
      KIT.square(ctx, { tones: level === 2 ? S : W, top: y0, wTop: 0.3, wBot: 0.36, rows: level === 2 ? 3 : 0, planks: level < 2, door: D, trim: level === 2 ? G[1] : null });
      if (level >= 1) KIT.slit(ctx, (y) => 0.3 + ((0.36 - 0.3) * (y - y0)) / (KIT.GROUND - y0), y0 + 0.14, 1, 0.5, 0.11, '#ffd66b');
      /* 뒤 기둥과 들보 */
      const roof = -h - 0.2;
      artStroke(ctx, D[2], [0, y0 - 0.3 * K, 0, roof], 0.04);
      artStroke(ctx, D[1], [-0.3, roof + 0.05, 0, roof + 0.05 - 0.3 * K, 0.3, roof + 0.05], 0.035);
      artIvy(ctx, [0.33, 0.2, 0.3, 0.08, 0.32, -0.04]);
    },
    top(ctx, level, aim, o) {
      const h = H('bell', level);
      const t = o.t;
      const s = 1 + level * 0.16;
      const swing = Math.sin(t * 16) * o.recoil * 0.3;
      const tone = level === 2 ? G : ['#f0c27a', '#c9903d', '#8d5f22'];
      ctx.save();
      ctx.translate(0, -h - 0.13);
      ctx.rotate(swing);
      /* 매단 줄, 종, 추 */
      artLine(ctx, ART.OUT, [0, -0.03, 0, 0.04], 0.03);
      artLine(ctx, D[0], [0.02 * Math.sin(t * 16) * o.recoil, 0.2 * s, 0, 0.3 * s], 0.022);
      artCircle(ctx, I[1], 0, 0.3 * s, 0.03 * s, ART.LW * 0.7);
      ctx.beginPath();
      ctx.moveTo(-0.045 * s, 0.03);
      ctx.bezierCurveTo(-0.13 * s, 0.05, -0.1 * s, 0.2 * s, -0.17 * s, 0.25 * s);
      ctx.lineTo(0.17 * s, 0.25 * s);
      ctx.bezierCurveTo(0.1 * s, 0.2 * s, 0.13 * s, 0.05, 0.045 * s, 0.03);
      ctx.closePath();
      artFill(ctx, artRound(ctx, tone, 0, 0.17 * s));
      artEllipse(ctx, tone[2], 0, 0.25 * s, 0.17 * s, 0.045 * s);
      artLine(ctx, tone[0], [-0.1 * s, 0.17 * s, 0.1 * s, 0.17 * s], 0.014);
      ctx.restore();
      if (o.recoil > 0.2) {
        /* 퍼져 나가는 종소리 */
        ctx.strokeStyle = 'rgba(255,226,126,' + o.recoil * 0.8 + ')';
        ctx.lineWidth = 0.016;
        for (const r of [0.26, 0.36]) {
          ctx.beginPath();
          ctx.arc(0, -h + 0.02, r + (1 - o.recoil) * 0.12, -0.5, 0.5);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, -h + 0.02, r + (1 - o.recoil) * 0.12, Math.PI - 0.5, Math.PI + 0.5);
          ctx.stroke();
        }
      }
    },
    front(ctx, level) {
      const y0 = BELL[level];
      const h = H('bell', level);
      const roof = -h - 0.2;
      artStroke(ctx, W[0], [-0.29, y0, -0.29, roof + 0.05], 0.045);
      artStroke(ctx, W[2], [0.29, y0, 0.29, roof + 0.05], 0.045);
      artStroke(ctx, W[1], [0, y0 + 0.3 * K, 0, roof + 0.05 + 0.3 * K], 0.05);
      const rise = [0.16, 0.18, 0.26][level];
      KIT.pyramid(ctx, level === 2 ? GR : R, roof - rise, roof + 0.04, 0.37, level >= 1 ? G[1] : null);
      if (level >= 1) KIT.finial(ctx, 0, roof - rise, level === 2 ? G[1] : I[0], 0.03);
    },
  };

  /* ───── 감시탑: 높다란 망대에서 멀리 내다보고 곁의 탑들에게 알려 준다 ───── */
  const WATCH = [-0.5, -0.68, -0.88];
  TOWER_ART.watch = {
    body(ctx, level) {
      const y = WATCH[level];
      artShadow(ctx, 0.07, 0.33, 0.44, 0.14);
      artBox(ctx, [S[1], S[1], S[2]], 0, 0.24, 0.32, 0.4, 0.42, { topFill: S[1] });
      KIT.frame(ctx, y + 0.07, KIT.GROUND, 0.2, 0.33, W, D);
      /* 사다리 */
      artLine(ctx, ART.OUT, [-0.27, 0.3, -0.17, y + 0.1], 0.03);
      artLine(ctx, ART.OUT, [-0.19, 0.33, -0.09, y + 0.13], 0.03);
      artLine(ctx, W[0], [-0.27, 0.3, -0.17, y + 0.1], 0.014);
      artLine(ctx, W[0], [-0.19, 0.33, -0.09, y + 0.13], 0.014);
      const n = 5 + level * 2;
      for (let i = 1; i < n; i++) {
        const f = i / n;
        artLine(ctx, W[0], [-0.27 + 0.1 * f, 0.3 + (y - 0.2) * f, -0.19 + 0.1 * f, 0.33 + (y - 0.2) * f], 0.016);
      }
      /* 망대: 낮은 벽을 두른 마루 */
      KIT.deck(ctx, y, 0.25, W, 0.06);
      artBox(ctx, [W[0], level === 2 ? R[1] : W[1], level === 2 ? R[2] : W[2]], 0, y - 0.11, y, 0.25, 0.24, { top: false });
      KIT.rail(ctx, y, 0.24, W, true, 0.13);
      if (level >= 1) artLantern(ctx, 0, y + 0.13 + 0.25 * K, 0.85);
      if (level === 2) {
        artShield(ctx, -0.12, y - 0.02, 0.04, ART.blue, G[1]);
        artShield(ctx, 0.12, y - 0.02, 0.04, ART.blue, G[1]);
      }
    },
    top(ctx, level, aim, o) {
      const y = WATCH[level];
      const h = H('watch', level);
      const a = artAim(aim + Math.sin(o.t * 0.7) * 0.5);
      /* 지붕을 받치는 기둥과 지붕, 깃발 */
      artStroke(ctx, D[1], [0, y - 0.25 * K, 0, -h - 0.16], 0.03);
      /* 망원경: 이리저리 살핀다 */
      artTube(ctx, [G[0], G[1], G[2]], -a.fx * 0.06, -h - a.fy * 0.06, a.fx * 0.17, -h + a.fy * 0.17, 0.028, 0.036, 0.5, 0);
      artTubeEnd(ctx, '#9cddf8', a.fx * 0.17, -h + a.fy * 0.17, 0.036, a.fx, a.fy, a.toward);
      artStroke(ctx, W[0], [-0.22, y - 0.11, -0.22, -h - 0.14], 0.03);
      artStroke(ctx, W[2], [0.22, y - 0.11, 0.22, -h - 0.14], 0.03);
      const base = -h - 0.13;
      KIT.pyramid(ctx, level === 2 ? ART.blue : level === 1 ? R : TH, base - 0.2, base, 0.3, level === 2 ? G[1] : null);
      artLine(ctx, ART.OUT, [0, base - 0.2, 0, base - 0.33], 0.024);
      artFlag(ctx, level === 2 ? G : R, 0, base - 0.33, 0.18, 0.1, o.t);
    },
  };

  /* ───── 끈끈이탑: 펄펄 끓는 역청 솥에서 덩어리를 떠 던진다 ───── */
  const TAR = [-0.34, -0.5, -0.68];
  TOWER_ART.tar = {
    body(ctx, level) {
      const top = TAR[level];
      const h = H('tar', level);
      const rAt = KIT.round(ctx, {
        tones: ART.sand, top, rTop: 0.25, rBot: 0.34, rows: 2 + level, rgb: '90,70,40',
        hoops: level >= 1 ? [[top + 0.1, level === 2 ? G[1] : I[1], 0.035]] : [],
        door: D,
      });
      /* 벽을 타고 흘러내린 역청 */
      for (const [x, len] of [[-0.14, 0.2], [0.02, 0.3], [0.15, 0.16]]) {
        const y = top + Math.sqrt(Math.max(0, 1 - (x / 0.25) ** 2)) * 0.25 * K;
        artStroke(ctx, '#2f2a33', [x, y, x, y + len], 0.04);
        artCircle(ctx, '#2f2a33', x, y + len + 0.01, 0.028, ART.LW * 0.6);
      }
      /* 역청 통 */
      artBarrel(ctx, -0.35, 0.42, 0.06, 0.14, D, I[1]);
      artEllipse(ctx, '#2f2a33', -0.35, 0.28, 0.045, 0.014, 0);
      if (level >= 1) artBarrel(ctx, 0.35, 0.43, 0.055, 0.12, D, level === 2 ? G[1] : I[1]);
      /* 솥을 받치는 테와 솥 */
      artCylinder(ctx, [I[0], I[1], I[2]], 0, top - 0.03, top + 0.04, rAt(top) + 0.03, rAt(top), { topFill: I[2] });
      artEllipse(ctx, '#ff9226', 0, top - 0.025, 0.17, 0.17 * K, 0);
      const r = 0.2 + level * 0.02;
      const py = -h + 0.08;
      ctx.beginPath();
      ctx.moveTo(-r, py);
      ctx.bezierCurveTo(-r * 1.25, py + 0.27, r * 1.25, py + 0.27, r, py);
      ctx.closePath();
      artFill(ctx, artRound(ctx, [I[0], I[1], I[2]], 0, r));
      artEllipse(ctx, level === 2 ? G[1] : I[0], 0, py, r + 0.02, (r + 0.02) * K);
      artEllipse(ctx, '#2f2a33', 0, py, r - 0.02, (r - 0.02) * K, ART.LW * 0.7);
    },
    top(ctx, level, aim, o) {
      const h = H('tar', level);
      const t = o.t;
      const r = 0.18 + level * 0.02;
      const py = -h + 0.08;
      /* 부글거리는 역청 */
      artEllipse(ctx, '#3b3540', -r * 0.25, py - r * K * 0.2, r * 0.45, r * K * 0.4, 0);
      for (let i = 0; i < 3 + level; i++) {
        const k = (t * 0.6 + i * 0.37) % 1;
        const x = Math.sin(i * 2.7) * r * 0.65;
        const br = 0.02 + Math.sin(k * Math.PI) * 0.025;
        artCircle(ctx, '#4a4350', x, py - 0.01 - k * 0.03, br, ART.LW * 0.5);
        artCircle(ctx, 'rgba(255,255,255,.35)', x - br * 0.3, py - 0.01 - k * 0.03 - br * 0.3, br * 0.3, 0);
      }
      KIT.smoke(ctx, 0.05, py - 0.08, t, '#8d94a4', 2);
      /* 국자 팔: 던지는 순간 겨눈 쪽으로 넘어간다 */
      const a = artAim(aim);
      const lean = -0.6 + o.recoil * 1.5;
      const len = 0.3 + level * 0.03;
      const x1 = a.fx * Math.sin(lean) * len;
      const y1 = py - 0.02 + a.fy * Math.sin(lean) * len - Math.cos(lean) * len;
      artStroke(ctx, W[1], [0, py + 0.02, x1, y1], 0.036);
      artEllipse(ctx, I[1], x1, y1, 0.06, 0.04, ART.LW * 0.8);
      if (o.recoil < 0.3) artEllipse(ctx, '#2f2a33', x1, y1 - 0.012, 0.045, 0.028, 0);
    },
  };
})();
