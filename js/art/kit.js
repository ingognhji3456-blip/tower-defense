'use strict';
/* 탑 그림 조립 도구 — 여러 탑이 함께 쓰는 몸통·지붕·소품.
   좌표와 규격은 common.js 와 같다: 1 = 타일 한 칸, 원점은 타일 중심, 건물은 y ≈ +0.4 에 발을 딛고 위로 솟는다. */
const KIT = (function () {
  const K = ART.K;
  const BASE = 0.2; /* 둥근 기단의 윗면 */
  const GROUND = 0.24; /* 네모 받침의 윗면 */

  /* 둥근 탑 몸통: 기단 + 위로 좁아지는 원통.
     o = { tones, top, rTop, rBot, bot, plinth: tones|false, plinthTop, rows, rgb, staves, hoops: [[y, color, w]], door: tones|false, lit, topFill }
     돌려주는 값은 높이 y 에서의 반지름. */
  function round(ctx, o) {
    const rTop = o.rTop == null ? 0.22 : o.rTop;
    const rBot = o.rBot == null ? 0.33 : o.rBot;
    const bot = o.bot == null ? BASE : o.bot;
    const rAt = (y) => rTop + ((rBot - rTop) * (y - o.top)) / (bot - o.top);
    if (o.plinth !== false) artPlinth(ctx, o.plinth || ART.stone, o.plinthTop);
    artCylinder(ctx, o.tones, 0, o.top, bot, rTop, rBot, { topFill: o.topFill || o.tones[2] });
    if (o.rows) artCourses(ctx, 0, o.top, bot, rTop, rBot, o.rows, o.rgb);
    if (o.staves) {
      /* 통널 금 */
      for (let k = -3; k <= 3; k++) {
        const a = Math.PI / 2 + k * 0.38;
        artLine(ctx, 'rgba(30,16,8,.4)', [Math.cos(a) * rTop, o.top + Math.sin(a) * rTop * K, Math.cos(a) * rBot, bot + Math.sin(a) * rBot * K], 0.012);
      }
    }
    for (const [y, color, w] of o.hoops || []) artHoop(ctx, 0, y, rAt(y) + 0.004, color, w || 0.035, true);
    if (o.door !== false) door(ctx, o.door || ART.darkwood, o.lit);
    return rAt;
  }

  /* 둥근 탑 발치의 아치 문. lit 을 주면 안에서 빛이 샌다. */
  function door(ctx, tones, lit) {
    artArch(ctx, tones[2], 0, 0.335, 0.085, 0.22);
    artArch(ctx, lit || tones[1], 0, 0.335, 0.058, 0.19, ART.LW * 0.7);
    if (!lit) artCircle(ctx, ART.gold[1], 0.03, 0.25, 0.012, 0);
    artPoly(ctx, ART.stone[0], [-0.13, 0.36, 0.13, 0.36, 0.11, 0.33, -0.11, 0.33], ART.LW * 0.8);
  }

  /* 모서리를 앞에 둔 네모 탑 몸통.
     o = { tones, top, wTop, wBot, bot, base: tones|false, rows, planks, door: tones|false, trim: color, topFill }
     돌려주는 값은 높이 y 에서의 반너비. */
  function square(ctx, o) {
    const wTop = o.wTop == null ? 0.27 : o.wTop;
    const wBot = o.wBot == null ? 0.35 : o.wBot;
    const bot = o.bot == null ? GROUND : o.bot;
    const wAt = (y) => wTop + ((wBot - wTop) * (y - o.top)) / (bot - o.top);
    if (o.base !== false) {
      const b = o.base || ART.stone;
      artShadow(ctx, 0.07, 0.33, 0.47, 0.15);
      artBox(ctx, [b[1], b[1], b[2]], 0, 0.24, 0.32, 0.43, 0.45, { topFill: b[1] });
    }
    artBox(ctx, o.tones, 0, o.top, bot, wTop, wBot, { topFill: o.topFill || o.tones[0] });
    if (o.rows) {
      const step = (bot - o.top) / (o.rows + 1);
      for (let i = 1; i <= o.rows; i++) {
        const y = o.top + step * i;
        const w = wAt(y);
        artLine(ctx, 'rgba(43,37,54,.26)', [-w, y, 0, y + w * K, w, y], 0.012);
        for (let k = 0; k < 2; k++) {
          const f = (k + 0.6 + (i % 2) * 0.4) / 2.6;
          const yy = y + w * K * (1 - f);
          artLine(ctx, 'rgba(43,37,54,.18)', [-w * f, yy - step + 0.014, -w * f, yy - 0.012], 0.01);
          artLine(ctx, 'rgba(43,37,54,.18)', [w * f, yy - step + 0.014, w * f, yy - 0.012], 0.01);
        }
      }
    }
    if (o.planks) {
      /* 세로 널 금 */
      for (const f of [0.34, 0.68]) {
        for (const side of [-1, 1]) {
          artLine(ctx, 'rgba(40,20,10,.34)', [side * wTop * f, o.top + wTop * K * (1 - f) + 0.02, side * wBot * f, bot + wBot * K * (1 - f) - 0.02], 0.012);
        }
      }
    }
    if (o.trim) artLine(ctx, o.trim, [0, o.top + wTop * K + 0.02, 0, bot + wBot * K - 0.02], 0.02);
    if (o.door !== false) {
      const d = o.door || ART.darkwood;
      artPoly(ctx, d[1], [-0.21, 0.3, -0.21, 0.14, -0.15, 0.1, -0.09, 0.19, -0.09, 0.345]);
      artLine(ctx, d[2], [-0.15, 0.115, -0.15, 0.32], 0.012);
    }
    return wAt;
  }

  /* 네모 탑의 면 위에 난 창. side = -1 왼쪽 면 / +1 오른쪽 면, f = 가운데 모서리에서 바깥으로 0~1 */
  function slit(ctx, wAt, y, side, f, hgt, lit) {
    const w = wAt(y);
    const x = side * w * f;
    const yy = y + w * K * (1 - f);
    const dx = side * 0.055;
    const dy = -0.055 * K;
    artPoly(ctx, ART.OUT, [x - dx / 2, yy - dy / 2, x + dx / 2, yy + dy / 2, x + dx / 2, yy + dy / 2 + hgt, x - dx / 2, yy - dy / 2 + hgt], 0);
    if (lit) artPoly(ctx, lit, [x - dx * 0.28, yy - dy * 0.28 + 0.012, x + dx * 0.28, yy + dy * 0.28 + 0.012, x + dx * 0.28, yy + dy * 0.28 + hgt - 0.012, x - dx * 0.28, yy - dy * 0.28 + hgt - 0.012], 0);
  }

  /* 통나무 뼈대 망루: 뒤 기둥 → 가새 → 앞 기둥 */
  function frame(ctx, yTop, yBot, wTop, wBot, W, D) {
    const ym = (yTop + yBot) / 2;
    const wm = (wTop + wBot) / 2;
    artStroke(ctx, D[2], [0, yBot - wBot * K, 0, yTop - wTop * K], 0.045);
    artStroke(ctx, D[2], [-wm, ym, 0, ym - wm * K, wm, ym], 0.03);
    artStroke(ctx, D[0], [-wBot, yBot, 0, yTop + wTop * K], 0.036);
    artStroke(ctx, D[0], [0, yBot + wBot * K, -wTop, yTop], 0.036);
    artStroke(ctx, D[1], [wBot, yBot, 0, yTop + wTop * K], 0.036);
    artStroke(ctx, D[1], [0, yBot + wBot * K, wTop, yTop], 0.036);
    artStroke(ctx, W[1], [-wm, ym, 0, ym + wm * K, wm, ym], 0.036);
    artStroke(ctx, W[0], [-wBot, yBot, -wTop, yTop], 0.062);
    artStroke(ctx, W[2], [wBot, yBot, wTop, yTop], 0.062);
    artStroke(ctx, W[1], [0, yBot + wBot * K, 0, yTop + wTop * K], 0.068);
  }

  /* 네모 마루(모서리가 앞). y 는 윗면 높이. */
  function deck(ctx, y, w, tones, thick) {
    artBox(ctx, tones, 0, y, y + (thick || 0.075), w, w - 0.015, { topFill: tones[0] });
    for (const f of [-0.5, 0, 0.5]) {
      artLine(ctx, 'rgba(90,50,25,.4)', [f * w - w * 0.5, y - w * K * 0.5 + f * w * K, f * w + w * 0.5, y + w * K * 0.5 + f * w * K], 0.012);
    }
  }

  /* 마루 둘레의 난간. back 이 참이면 뒤쪽(무기 뒤)만, 거짓이면 앞쪽만 그린다. */
  function rail(ctx, y, w, tones, back, up) {
    const hgt = up || 0.11;
    const cy = back ? y - w * K : y + w * K;
    artStroke(ctx, back ? tones[2] : tones[1], [-w, y - hgt, 0, cy - hgt, w, y - hgt], 0.03);
    if (back) {
      artStroke(ctx, tones[2], [0, cy, 0, cy - hgt], 0.036);
      return;
    }
    artStroke(ctx, tones[0], [-w, y, -w, y - hgt - 0.01], 0.04);
    artStroke(ctx, tones[2], [w, y, w, y - hgt - 0.01], 0.04);
    artStroke(ctx, tones[1], [0, cy, 0, cy - hgt - 0.01], 0.044);
  }

  /* 네모뿔 지붕(모서리가 앞). */
  function pyramid(ctx, tones, tip, base, w, trim) {
    artPoly(ctx, tones[0], [0, tip, -w, base, 0, base + w * K]);
    artPoly(ctx, tones[2], [0, tip, 0, base + w * K, w, base]);
    for (const f of [0.35, 0.68]) {
      artLine(ctx, 'rgba(0,0,0,.2)', [0, tip, -w * f, base + w * K * (1 - f)], 0.012);
      artLine(ctx, 'rgba(0,0,0,.26)', [0, tip, w * f, base + w * K * (1 - f)], 0.012);
    }
    if (trim) artLine(ctx, trim, [-w, base, 0, base + w * K, w, base], 0.028);
  }

  /* 처마 끝이 들린 기와지붕 한 층(모서리가 앞). y = 처마 높이, w = 처마 반너비, hgt = 지붕 높이, wTop = 윗변 반너비 */
  function eaves(ctx, tones, y, w, hgt, wTop, trim) {
    const t = y - hgt;
    const wt = wTop == null ? w * 0.42 : wTop;
    /* 왼쪽 면 */
    ctx.beginPath();
    ctx.moveTo(-wt, t);
    ctx.quadraticCurveTo(-w * 0.72, y - hgt * 0.25, -w - 0.03, y - 0.035);
    ctx.lineTo(-w, y + 0.012);
    ctx.quadraticCurveTo(-w * 0.5, y + w * K * 0.5 + 0.03, 0, y + w * K + 0.012);
    ctx.lineTo(0, t + wt * K);
    ctx.closePath();
    artFill(ctx, tones[0]);
    /* 오른쪽 면 */
    ctx.beginPath();
    ctx.moveTo(wt, t);
    ctx.quadraticCurveTo(w * 0.72, y - hgt * 0.25, w + 0.03, y - 0.035);
    ctx.lineTo(w, y + 0.012);
    ctx.quadraticCurveTo(w * 0.5, y + w * K * 0.5 + 0.03, 0, y + w * K + 0.012);
    ctx.lineTo(0, t + wt * K);
    ctx.closePath();
    artFill(ctx, tones[2]);
    /* 기왓골 */
    for (const f of [0.38, 0.7]) {
      artLine(ctx, 'rgba(0,0,0,.22)', [-wt * f, t + wt * K * (1 - f) + 0.01, -w * f, y + w * K * (1 - f)], 0.011);
      artLine(ctx, 'rgba(0,0,0,.28)', [wt * f, t + wt * K * (1 - f) + 0.01, w * f, y + w * K * (1 - f)], 0.011);
    }
    if (trim) {
      artLine(ctx, trim, [-w - 0.03, y - 0.035, -w, y + 0.012], 0.022);
      artLine(ctx, trim, [w + 0.03, y - 0.035, w, y + 0.012], 0.022);
      artCircle(ctx, trim, 0, y + w * K + 0.012, 0.02, ART.LW * 0.5);
    }
  }

  /* 원뿔 지붕 위의 뾰족 장식과 공 */
  function finial(ctx, x, y, color, hgt) {
    artLine(ctx, ART.OUT, [x, y, x, y - (hgt || 0.09)], 0.036);
    artCircle(ctx, color, x, y - (hgt || 0.09) - 0.012, 0.034);
  }

  /* 둥근 탑 꼭대기의 성가퀴: 바깥으로 내민 테 위에 이가 돋는다. back = 뒤쪽 이만 / 앞쪽 이만 */
  function crenel(ctx, tones, y, r, back) {
    for (let k = -2; k <= 2; k++) {
      const a = (back ? -Math.PI / 2 : Math.PI / 2) + k * 0.6;
      const x = Math.cos(a) * r;
      const yy = y + Math.sin(a) * r * K;
      artRect(ctx, back ? tones[2] : k < 0 ? tones[0] : tones[1], x - 0.045, yy - 0.085, 0.09, 0.095, 0.01, ART.LW * 0.8);
    }
  }

  /* 벽에 드리운 걸개. emblem(ctx, x, y) 로 문장을 그린다. */
  function banner(ctx, x, y, w, hgt, tones, emblem) {
    artPoly(ctx, tones[1], [x - w, y, x + w, y, x + w, y + hgt * 0.78, x, y + hgt, x - w, y + hgt * 0.78]);
    artPoly(ctx, tones[0], [x - w, y, x - w * 0.35, y, x - w * 0.35, y + hgt * 0.92, x - w, y + hgt * 0.78], 0);
    artRect(ctx, ART.gold[1], x - w, y, w * 2, 0.03, 0, ART.LW * 0.6);
    if (emblem) emblem(ctx, x + 0.003, y + hgt * 0.45);
  }

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

  /* 타오르는 불: 겉불과 속불. c = [겉, 속] */
  function fire(ctx, x, yb, w, hgt, t, c) {
    const f = 0.86 + 0.14 * Math.sin(t * 9 + x * 20);
    tongue(ctx, x, yb, w, hgt * f, Math.sin(t * 5 + x * 9) * w * 0.4, (c && c[0]) || '#ff7a1a');
    tongue(ctx, x, yb, w * 0.56, hgt * f * 0.62, Math.sin(t * 5 + x * 9) * w * 0.2, (c && c[1]) || '#ffe27e');
  }

  /* 피어오르는 연기·김 */
  function smoke(ctx, x, y, t, color, n) {
    for (let i = 0; i < (n || 3); i++) {
      const k = (t * 0.5 + i / (n || 3) + x) % 1;
      ctx.globalAlpha = (1 - k) * 0.5;
      artCircle(ctx, color || '#d9dbe2', x + Math.sin(k * 5 + i) * 0.03 + k * 0.05, y - k * 0.3, 0.035 + k * 0.05, 0);
    }
    ctx.globalAlpha = 1;
  }

  /* 문장들: (ctx, x, y, s, color) */
  const sign = {
    skull(ctx, x, y, s) {
      artCircle(ctx, ART.bone[0], x, y, s, ART.LW * 0.6);
      artRect(ctx, ART.bone[0], x - s * 0.5, y + s * 0.5, s, s * 0.6, s * 0.1, ART.LW * 0.6);
      artCircle(ctx, ART.OUT, x - s * 0.38, y + s * 0.05, s * 0.26, 0);
      artCircle(ctx, ART.OUT, x + s * 0.38, y + s * 0.05, s * 0.26, 0);
    },
    flame(ctx, x, y, s) {
      tongue(ctx, x, y + s, s * 0.62, s * 2, s * 0.12, ART.OUT);
      tongue(ctx, x, y + s * 0.92, s * 0.5, s * 1.72, s * 0.1, '#ff8a2a');
      tongue(ctx, x, y + s * 0.9, s * 0.26, s * 0.95, 0, '#ffe27e');
    },
    bolt(ctx, x, y, s, c) {
      artPoly(ctx, c || ART.gold[0], [x + s * 0.3, y - s, x - s * 0.5, y + s * 0.1, x - s * 0.05, y + s * 0.1, x - s * 0.3, y + s, x + s * 0.5, y - s * 0.15, x + s * 0.05, y - s * 0.15], ART.LW * 0.5);
    },
    star(ctx, x, y, s, c) {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 ? s * 0.45 : s;
        pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      artPoly(ctx, c || ART.gold[0], pts, ART.LW * 0.5);
    },
    sun(ctx, x, y, s, c) {
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        artPoly(ctx, c || ART.gold[1], [x + Math.cos(a - 0.2) * s * 0.7, y + Math.sin(a - 0.2) * s * 0.7, x + Math.cos(a) * s * 1.5, y + Math.sin(a) * s * 1.5, x + Math.cos(a + 0.2) * s * 0.7, y + Math.sin(a + 0.2) * s * 0.7], ART.LW * 0.45);
      }
      artCircle(ctx, c || ART.gold[1], x, y, s * 0.75, ART.LW * 0.5);
    },
    snow(ctx, x, y, s, c) {
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        artLine(ctx, ART.OUT, [x - Math.cos(a) * s, y - Math.sin(a) * s, x + Math.cos(a) * s, y + Math.sin(a) * s], s * 0.5);
      }
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        artLine(ctx, c || '#ffffff', [x - Math.cos(a) * s, y - Math.sin(a) * s, x + Math.cos(a) * s, y + Math.sin(a) * s], s * 0.22);
      }
    },
    leaf(ctx, x, y, s, c) {
      ctx.beginPath();
      ctx.moveTo(x, y + s);
      ctx.quadraticCurveTo(x - s * 1.1, y, x, y - s);
      ctx.quadraticCurveTo(x + s * 1.1, y, x, y + s);
      artFill(ctx, c || ART.green[0], ART.LW * 0.5);
      artLine(ctx, ART.green[2], [x, y + s * 0.8, x, y - s * 0.7], s * 0.14);
    },
    coin(ctx, x, y, s) {
      artCircle(ctx, ART.gold[1], x, y, s, ART.LW * 0.6);
      artCircle(ctx, ART.gold[0], x - s * 0.15, y - s * 0.15, s * 0.55, 0);
      artLine(ctx, ART.gold[2], [x, y - s * 0.45, x, y + s * 0.45], s * 0.22);
    },
    eye(ctx, x, y, s, c) {
      artEllipse(ctx, '#ffffff', x, y, s, s * 0.6, ART.LW * 0.6);
      artCircle(ctx, c || ART.purple[1], x, y, s * 0.45, 0);
      artCircle(ctx, ART.OUT, x, y, s * 0.2, 0);
    },
    moon(ctx, x, y, s, c) {
      ctx.beginPath();
      ctx.arc(x, y, s, 0.6, Math.PI * 2 - 0.6);
      ctx.quadraticCurveTo(x - s * 0.1, y, x + s * 0.82, y + s * 0.56);
      artFill(ctx, c || ART.gold[0], ART.LW * 0.5);
    },
    cross(ctx, x, y, s, c) {
      artLine(ctx, ART.OUT, [x - s, y - s, x + s, y + s], s * 0.6);
      artLine(ctx, ART.OUT, [x + s, y - s, x - s, y + s], s * 0.6);
      artLine(ctx, c || ART.steel[0], [x - s, y - s, x + s, y + s], s * 0.3);
      artLine(ctx, c || ART.steel[0], [x + s, y - s, x - s, y + s], s * 0.3);
    },
  };

  return { BASE, GROUND, round, door, square, slit, frame, deck, rail, pyramid, eaves, finial, crenel, banner, tongue, fire, smoke, sign };
})();
