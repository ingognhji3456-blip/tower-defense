'use strict';
/* 철벽 요새 — 로비·스테이지 선택·도감 같은 화면, 게임 조작, 저장, 게임 루프 */

(function () {
  const $ = (id) => document.getElementById(id);
  const STEP = 1 / 60;
  const KEY = { settings: 'ironwall.settings', save: 'ironwall.save', best: 'ironwall.best', progress: 'ironwall.progress' };
  const CHALLENGE_UNLOCK = 5; /* 이 스테이지를 깨면 도전 모드가 열린다 */

  /* 저장소는 막혀 있을 수 있다(사생활 보호 창 등). 없어도 게임은 돌아가야 한다. */
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (err) {
        return fallback;
      }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* 저장 없이 계속 */ }
    },
    del(key) {
      try { localStorage.removeItem(key); } catch (err) { /* 저장 없이 계속 */ }
    },
  };

  const el = {
    app: $('app'), stage: $('stage'), board: $('board'), toast: $('toast'), tray: $('tray'),
    lives: $('hud-lives'), statLives: $('stat-lives'), gold: $('hud-gold'), wave: $('hud-wave'), of: $('hud-of'), hudStage: $('hud-stage'),
    speed: $('btn-speed'), pause: $('btn-pause'), menuBtn: $('btn-menu'),
    waveLabel: $('wave-label'), chips: $('wave-chips'), remain: $('wave-remain'), auto: $('opt-auto'), start: $('btn-start'),
    placing: $('placing'), plcName: $('plc-name'), plcStats: $('plc-stats'), plcBlurb: $('plc-blurb'), cancel: $('btn-cancel'),
    shop: $('shop'),
    selected: $('selected'), selName: $('sel-name'), selLevel: $('sel-level'), selStats: $('sel-stats'),
    upgrade: $('btn-upgrade'), sell: $('btn-sell'), target: $('btn-target'), close: $('btn-close'),

    lobby: $('lobby'), backdrop: $('backdrop'), hero: $('hero'), lobbyProgress: $('lobby-progress'), play: $('btn-play'), cont: $('btn-continue'),
    challengeBtn: $('btn-challenge'), codexBtn: $('btn-codex'), lobbyHint: $('lobby-hint'),
    stages: $('stages'), stagesBack: $('btn-stages-back'), stagesTotal: $('stages-total'), stageGrid: $('stage-grid'),
    stageThumb: $('stage-thumb'), stageNo: $('stage-no'), stageName: $('stage-name'), stageMeta: $('stage-meta'),
    stageEnemies: $('stage-enemies'), stageNote: $('stage-note'), stageStart: $('btn-stage-start'),
    challenge: $('challenge'), challengeBack: $('btn-challenge-back'), maps: $('maps'), mapNote: $('map-note'), diffs: $('diffs'), challengeStart: $('btn-challenge-start'),
    codex: $('codex'), codexBack: $('btn-codex-back'), codexTowers: $('codex-towers'), codexEnemies: $('codex-enemies'),
    pauseSheet: $('pause'), pauseEyebrow: $('pause-eyebrow'), pauseTitle: $('pause-title'), resume: $('btn-resume'), restart: $('btn-restart'), quit: $('btn-quit'),
    result: $('result'), resEyebrow: $('result-eyebrow'), resTitle: $('result-title'), resStars: $('result-stars'), resText: $('result-text'),
    tallyWave: $('tally-wave'), tallyKills: $('tally-kills'), tallyLives: $('tally-lives'),
    home: $('btn-home'), endless: $('btn-endless'), retry: $('btn-retry'), next: $('btn-next'),
  };

  const app = {
    screen: 'lobby', /* lobby | stages | challenge | codex | game */
    game: null,
    renderer: new Renderer(el.board),
    paused: false,
    menuOpen: false,
    placing: null,
    hover: null,
    selected: null,
    acc: 0,
    time: 0,
    last: 0,
    autoWait: 0,
    resultAt: 0,
    confirmUntil: 0,
    toastTimer: 0,
    seen: {},
    cards: {},
    pick: 1,
    settings: Object.assign({ map: MAPS[0].id, diff: 'normal', sound: true, auto: false, speed: 1 }, store.get(KEY.settings, {})),
    best: store.get(KEY.best, {}) || {},
    progress: store.get(KEY.progress, {}) || {},
    save: store.get(KEY.save, null),
  };
  if (!MAPS.some((m) => m.id === app.settings.map)) app.settings.map = MAPS[0].id;
  if (!DIFFICULTY[app.settings.diff]) app.settings.diff = 'normal';
  if (![1, 2, 3].includes(app.settings.speed)) app.settings.speed = 1;
  if (!app.progress.stars || typeof app.progress.stars !== 'object') app.progress.stars = {};

  const saveSettings = () => store.set(KEY.settings, app.settings);

  /* ───── 진행도 ───── */

  const starsOf = (id) => Math.max(0, Math.min(3, app.progress.stars[id] | 0));
  const unlocked = (id) => id === 1 || starsOf(id - 1) > 0;
  const totalStars = () => STAGES.reduce((n, st) => n + starsOf(st.id), 0);
  const clearedCount = () => STAGES.filter((st) => starsOf(st.id) > 0).length;
  const frontier = () => (STAGES.find((st) => starsOf(st.id) === 0) || STAGES[STAGES.length - 1]).id;
  const unlockStage = (type) => (STAGES.find((st) => st.towers.includes(type)) || STAGES[0]).id;
  const firstSeen = (type) => (STAGES.find((st) => st.enemies.includes(type)) || STAGES[0]).id;
  const challengeOpen = () => starsOf(CHALLENGE_UNLOCK) > 0;
  const starText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

  /* 받침에 맞는 조사를 붙인다: josa('늑대', '을', '를') → '늑대를' */
  function josa(word, withFinal, without) {
    const code = word.charCodeAt(word.length - 1) - 0xac00;
    const final = code >= 0 && code <= 11171 ? code % 28 !== 0 : false;
    return word + (final ? withFinal : without);
  }

  /* ───── 알림 ───── */

  function toast(text, ms) {
    el.toast.textContent = text;
    el.toast.hidden = false;
    clearTimeout(app.toastTimer);
    app.toastTimer = setTimeout(() => { el.toast.hidden = true; }, ms || 2800);
  }

  function deny(text) {
    Sfx.play('deny');
    toast(text);
  }

  /* ───── 능력치 표기 ───── */

  function statDefs(type) {
    const f1 = (n) => String(Math.round(n * 10) / 10);
    switch (type) {
      case 'frost':
        return [
          ['둔화', (l) => Math.round(l.slow * 100) + '%'],
          ['거리', (l) => f1(l.range)],
          ['받는 피해', (l) => (l.vuln ? '+' + Math.round(l.vuln * 100) + '%' : '—')],
        ];
      case 'rocket':
        return [['피해', (l) => l.dmg + '×' + l.rockets], ['장전', (l) => f1(l.cd) + '초'], ['거리', (l) => f1(l.range)]];
      case 'tesla':
        return [['피해', (l) => String(l.dmg)], ['연쇄', (l) => String(l.chain)], ['연사', (l) => f1(1 / l.cd)], ['거리', (l) => f1(l.range)]];
      default:
        return [['피해', (l) => String(l.dmg)], ['연사', (l) => f1(1 / l.cd)], ['거리', (l) => f1(l.range)]];
    }
  }

  function statList(type, lv, next) {
    return statDefs(type)
      .map(([label, get]) => {
        const a = get(lv);
        const b = next ? get(next) : a;
        return { label, value: a, next: b !== a ? b : null };
      })
      .filter((s) => s.value !== '—' || s.next);
  }

  function fillStats(node, list) {
    node.textContent = '';
    for (const s of list) {
      const span = document.createElement('span');
      const label = document.createElement('i');
      label.textContent = s.label;
      span.append(label, s.value);
      if (s.next) {
        const em = document.createElement('em');
        em.textContent = '▸' + s.next;
        span.append(em);
      }
      node.append(span);
    }
  }

  /* ───── 작은 그림들 ───── */

  /* 적 그림이 든 단추. label 은 '×8' 같은 덧붙임 글, onInfo 는 눌렀을 때 설명을 보여 줄 곳. */
  function enemyChip(type, label, onInfo) {
    const def = ENEMIES[type];
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.title = def.name + ' — ' + def.trait;
    chip.setAttribute('aria-label', def.name + (label ? ' ' + label : ''));
    const cv = document.createElement('canvas');
    cv.width = 64;
    cv.height = 64;
    const c = cv.getContext('2d');
    c.translate(31, 40);
    const s = 14.5 / def.r;
    c.scale(s, s);
    drawEnemySprite(c, type, def.r, 0.3, { seed: 1 });
    chip.append(cv);
    if (label) chip.append(label);
    chip.addEventListener('click', () => onInfo(def.name + ' — ' + def.trait));
    return chip;
  }

  function drawThumb(canvas, map) {
    const c = canvas.getContext('2d');
    const s = canvas.width / COLS;
    const dot = (x, y, r, fill) => {
      c.fillStyle = ART.OUT;
      c.beginPath();
      c.arc(x, y, r + Math.max(1.5, s * 0.07), 0, Math.PI * 2);
      c.fill();
      c.fillStyle = fill;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    };
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        c.fillStyle = ART.grass[(x + y) % 2];
        c.fillRect(x * s, y * s, s + 0.5, s + 0.5);
      }
    }
    c.lineJoin = 'round';
    c.lineCap = 'round';
    for (const [color, width] of [[ART.pathEdge, 0.95], [ART.path, 0.62]]) {
      c.strokeStyle = color;
      c.lineWidth = s * width;
      for (const w of map.paths) {
        c.beginPath();
        w.forEach(([x, y], i) => (i ? c.lineTo((x + 0.5) * s, (y + 0.5) * s) : c.moveTo((x + 0.5) * s, (y + 0.5) * s)));
        c.stroke();
      }
    }
    for (const [kind, x, y] of map.deco) {
      c.fillStyle = kind === 'pond' ? '#49b4ea' : kind === 'rock' ? '#9aa3b2' : '#3a8a3c';
      c.beginPath();
      c.arc((x + 0.5) * s, (y + 0.5) * s, s * 0.3, 0, Math.PI * 2);
      c.fill();
    }
    /* 보라 = 괴수 굴, 파랑 = 성문 */
    for (const w of map.paths) dot((w[0][0] + 0.5) * s, (w[0][1] + 0.5) * s, s * 0.5, ART.purple[1]);
    const end = map.paths[0][map.paths[0].length - 1];
    dot((end[0] + 0.5) * s, (end[1] + 0.5) * s, s * 0.55, ART.blue[0]);
  }

  /* ───── 화면 전환 ───── */

  const SCREENS = { lobby: el.lobby, stages: el.stages, challenge: el.challenge, codex: el.codex };

  function show(name) {
    app.screen = name;
    el.app.hidden = name !== 'game';
    el.backdrop.hidden = name === 'game';
    if (name === 'game') scene.r.release();
    for (const k of Object.keys(SCREENS)) {
      SCREENS[k].hidden = k !== name;
      if (k === name) SCREENS[k].scrollTop = 0;
    }
    if (name !== 'game') {
      el.pauseSheet.hidden = true;
      el.result.hidden = true;
      app.menuOpen = false;
    }
    if (name === 'lobby') refreshLobby();
    else if (name === 'stages') refreshStages();
    else if (name === 'challenge') refreshChallenge();
    else if (name === 'game') layout();
  }

  /* ───── 로비 ───── */

  function refreshLobby() {
    el.lobbyProgress.textContent = '';
    const pill = (text, cls) => {
      const p = document.createElement('span');
      p.className = 'pill' + (cls ? ' ' + cls : '');
      p.textContent = text;
      el.lobbyProgress.append(p);
    };
    pill('★ ' + totalStars() + ' / ' + STAGES.length * 3, 'gold');
    pill('스테이지 ' + clearedCount() + ' / ' + STAGES.length);
    el.play.textContent = clearedCount() === 0 ? '게임 시작' : '스테이지 선택';

    const s = app.save;
    const ok = s && s.v === 3 && MAPS.some((m) => m.id === s.map);
    el.cont.hidden = !ok;
    if (ok) {
      const where = s.stage != null ? '스테이지 ' + s.stage : '도전 ' + MAPS.find((m) => m.id === s.map).name;
      el.cont.textContent = '이어하기 · ' + where + ' · 웨이브 ' + (s.wave + 1);
    }
    el.challengeBtn.disabled = !challengeOpen();
    el.lobbyHint.textContent = challengeOpen() ? '' : '도전 모드는 스테이지 ' + CHALLENGE_UNLOCK + '를 깨면 열립니다.';
    setSoundLabel();
  }

  /* ───── 로비 뒤로 흐르는 전투 장면 ─────
     진짜 게임을 한 판 돌리면서, 카메라가 길을 따라 미끄러지듯 지나가며 일부만 가까이서 비춘다.
     몇 초마다 화면이 어두워졌다 밝아지며 다른 곳(가끔은 다른 전장)으로 넘어간다. */
  const scene = { r: new Renderer(el.hero), game: null, shot: null, count: 0, acc: 0, mapAt: (Math.random() * 7) | 0, snap: true };
  const SCENE_MAPS = ['gubi', 'twin', 'snake', 'zigzag', 'ssang', 'cross'];
  const SCENE_WAVES = [10, 18]; /* 시연에 돌려 쓰는 도전 모드 웨이브 범위 */

  function sceneStep(dt) {
    const g = scene.game;
    g.lives = 999;
    if (g.phase === 'build') {
      if (g.wave >= SCENE_WAVES[1]) g.wave = SCENE_WAVES[0] - 1;
      g.startWave();
    } else if (g.phase === 'wave' && g.qi >= g.queue.length) {
      /* 길이 비지 않도록, 다 나오면 곧바로 다음 웨이브를 잇는다 */
      g.wave = g.wave >= SCENE_WAVES[1] ? SCENE_WAVES[0] : g.wave + 1;
      g.queue = scheduleFrom(g.groups(g.wave));
      g.qi = 0;
      g.waveTime = -1;
    }
    g.update(dt);
  }

  /* 길을 따라 여러 단계의 탑을 흩어 세운 시연용 전장 */
  function sceneGame() {
    const g = new Game({ map: SCENE_MAPS[scene.mapAt++ % SCENE_MAPS.length], diff: 'normal', seed: (Math.random() * 2 ** 31) | 0 });
    const kinds = ['crossbow', 'cannon', 'tesla', 'crossbow', 'frost', 'rocket', 'cannon', 'tesla'];
    const tmp = {};
    let n = 0;
    for (const p of g.paths) {
      const count = Math.round(p.length / 3);
      for (let i = 0; i < count; i++) {
        p.at(((i + 0.5) / count) * p.length, tmp);
        let best = null;
        let bestD = 9;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const x = Math.floor(tmp.x) + dx;
            const y = Math.floor(tmp.y) + dy;
            if (!g.canBuild(x, y)) continue;
            /* 가까운 칸을 고르되, 한 줄로 늘어서지 않게 조금씩 흩는다 */
            const d = Math.hypot(x + 0.5 - tmp.x, y + 0.5 - tmp.y) + ((x * 7 + y * 13 + i * 5) % 5) * 0.22;
            if (d < bestD) { bestD = d; best = { x, y }; }
          }
        }
        if (!best) continue;
        const t = g.addTower(kinds[n % kinds.length], best.x, best.y);
        /* 굴 가까이는 낮은 단계, 성문 쪽으로 갈수록 높은 단계: 괴수가 길 곳곳에서 쓰러진다 */
        t.level = Math.min(2, Math.floor((i / count) * 3));
        t.lv = t.def.levels[t.level];
        t.fresh = false;
        n++;
      }
    }
    g.wave = SCENE_WAVES[0] - 1;
    g.lives = 999;
    g.listener = (type, d) => {
      if (type !== 'wavestart' && type !== 'waveclear') scene.r.onEvent(type, d);
    };
    scene.game = g;
    scene.r.setGame(g);
    /* 길에 이미 괴수가 가득하도록 미리 얼마간 돌려 둔다 */
    for (let i = 0; i < 60 * 22; i++) sceneStep(STEP);
    scene.r.reset();
  }

  function nextShot() {
    if (!scene.game || scene.count % 3 === 0) sceneGame();
    scene.count++;
    const g = scene.game;
    const p = g.paths[scene.count % g.paths.length];
    /* 괴수가 있는 곳 가운데 한 군데를 골라 그 가까이에서 시작한다 */
    const here = g.enemies.filter((e) => e.path === p).map((e) => e.dist).sort((a, b) => a - b);
    const mid = here.length ? here[Math.floor(here.length * (0.1 + Math.random() * 0.8))] : 2;
    const span = Math.min(p.length - 1, 4 + Math.random() * 2.5);
    const forward = Math.random() < 0.65;
    const d0 = Math.max(0.5, Math.min(p.length - 0.5 - span, mid - (forward ? 1.2 : span - 1.2)));
    const d1 = d0 + span;
    scene.shot = { p, a: forward ? d0 : d1, b: forward ? d1 : d0, t: 0, dur: 6.5 + Math.random() * 2.5 };
    scene.snap = true;
  }

  function sceneTick(dt) {
    const vw = el.hero.clientWidth;
    const vh = el.hero.clientHeight;
    if (vw < 40 || vh < 40) return;
    const r = scene.r;
    /* 화면 높이에 타일 예닐곱 칸이 들어오는 가까운 거리 */
    const wide = vw > vh && vw > 720;
    const ts = Math.round(wide ? Math.max(92, vh / 7.2) : Math.min(vh / 6.2, vw / 4.6));
    r.setView(vw, vh, ts, Math.min(window.devicePixelRatio || 1, 220 / ts));
    if (!scene.shot) nextShot();

    scene.acc += dt;
    let steps = 0;
    while (scene.acc >= STEP && steps++ < 6) {
      sceneStep(STEP);
      scene.acc -= STEP;
    }
    if (scene.acc >= STEP) scene.acc = 0;

    const s = scene.shot;
    s.t += dt;
    const k = Math.min(1, s.t / s.dur);
    const f = s.p.at(s.a + (s.b - s.a) * k, {});
    /* 넓은 화면의 로비에서는 왼쪽에 글이 있으니 장면의 중심을 오른쪽으로, 좁은 화면에서는 위쪽으로 둔다.
       지도 밖으로도 풀밭과 숲이 이어지므로 카메라는 가장자리에서 멈추지 않는다. */
    const fx = wide && app.screen === 'lobby' ? 0.66 : 0.5;
    const fy = wide ? 0.56 : app.screen === 'lobby' ? 0.34 : 0.5;
    const cx = f.x * ts - vw * fx;
    const cy = Math.max(-ts * 0.3, Math.min(r.h + ts * 2 - vh, f.y * ts + r.pad - vh * fy));
    if (scene.snap) {
      r.cam.x = cx;
      r.cam.y = cy;
      scene.snap = false;
    } else {
      const q = 1 - Math.exp(-dt * 2.4);
      r.cam.x += (cx - r.cam.x) * q;
      r.cam.y += (cy - r.cam.y) * q;
    }
    r.draw({ time: app.time, dt, placing: null, hover: null, selected: null, paused: false });

    /* 장면이 바뀔 때 어두워졌다 밝아진다 */
    const fade = Math.max(1 - s.t / 0.7, (s.t - (s.dur - 0.7)) / 0.7, 0);
    if (fade > 0) {
      const c = r.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = 'rgba(27,33,50,' + Math.min(1, fade) + ')';
      c.fillRect(0, 0, el.hero.width, el.hero.height);
    }
    if (s.t >= s.dur) nextShot();
  }

  /* ───── 스테이지 선택 ───── */

  function buildStageGrid() {
    for (const st of STAGES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'stage-tile';
      b.setAttribute('role', 'radio');
      b.dataset.stage = String(st.id);
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = String(st.id);
      const stars = document.createElement('span');
      stars.className = 'tile-stars';
      b.append(num, stars);
      b.addEventListener('click', () => {
        Sfx.play('click');
        app.pick = st.id;
        refreshStages();
      });
      el.stageGrid.append(b);
    }
  }

  function refreshStages() {
    if (!unlocked(app.pick)) app.pick = frontier();
    el.stagesTotal.textContent = '★ ' + totalStars() + ' / ' + STAGES.length * 3;
    for (const b of el.stageGrid.children) {
      const id = Number(b.dataset.stage);
      const open = unlocked(id);
      b.disabled = !open;
      b.classList.toggle('locked', !open);
      b.classList.toggle('done', starsOf(id) > 0);
      b.setAttribute('aria-checked', String(id === app.pick));
      b.setAttribute('aria-label', '스테이지 ' + id + (open ? ', 별 ' + starsOf(id) + '개' : ', 잠김'));
      b.title = open ? STAGES[id - 1].name : '앞 스테이지를 깨면 열립니다';
      b.lastChild.textContent = open ? starText(starsOf(id)) : '잠김';
    }
    const st = STAGES.find((s) => s.id === app.pick);
    const map = MAPS.find((m) => m.id === st.map);
    drawThumb(el.stageThumb, map);
    el.stageNo.textContent = '스테이지 ' + st.id + (starsOf(st.id) ? ' · ' + starText(starsOf(st.id)) : '');
    el.stageName.textContent = st.name;
    el.stageMeta.textContent = map.name + ' · 웨이브 ' + st.waves.length + ' · 시작 골드 ' + st.gold + ' · 목숨 ' + st.lives;
    const news = [];
    if (st.newTowers.length) news.push('새 탑: ' + st.newTowers.map((t) => TOWERS[t].name).join(', '));
    if (st.newEnemies.length && st.id > 1) news.push('새 괴수: ' + st.newEnemies.map((t) => ENEMIES[t].name).join(', '));
    const base = (news.length ? news.join(' · ') + '. ' : '') + map.note;
    el.stageNote.textContent = base;
    el.stageEnemies.textContent = '';
    for (const type of st.enemies) el.stageEnemies.append(enemyChip(type, '', (text) => { el.stageNote.textContent = text; }));
    el.stageStart.textContent = starsOf(st.id) ? '다시 도전' : '시작';
  }

  /* ───── 도전 모드 ───── */

  function bestText(mapId) {
    const b = app.best[mapId + ':' + app.settings.diff];
    if (!b || !b.wave) return '기록 없음';
    return b.won ? (b.wave > FINAL_WAVE ? '지켜냄 · ' + b.wave : '지켜냄') : '최고 ' + b.wave;
  }

  function buildChallenge() {
    for (const map of MAPS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'map-btn';
      b.setAttribute('role', 'radio');
      b.dataset.map = map.id;
      const cv = document.createElement('canvas');
      cv.width = 240;
      cv.height = 150;
      drawThumb(cv, map);
      const name = document.createElement('strong');
      name.textContent = map.name;
      const best = document.createElement('span');
      b.append(cv, name, best);
      b.addEventListener('click', () => {
        Sfx.play('click');
        app.settings.map = map.id;
        saveSettings();
        refreshChallenge();
      });
      el.maps.append(b);
    }
    for (const id of Object.keys(DIFFICULTY)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.dataset.diff = id;
      b.textContent = DIFFICULTY[id].name;
      b.addEventListener('click', () => {
        Sfx.play('click');
        app.settings.diff = id;
        saveSettings();
        refreshChallenge();
      });
      el.diffs.append(b);
    }
  }

  function refreshChallenge() {
    for (const b of el.maps.children) {
      b.setAttribute('aria-checked', String(b.dataset.map === app.settings.map));
      b.lastChild.textContent = bestText(b.dataset.map);
    }
    for (const b of el.diffs.children) b.setAttribute('aria-checked', String(b.dataset.diff === app.settings.diff));
    const map = MAPS.find((m) => m.id === app.settings.map);
    const d = DIFFICULTY[app.settings.diff];
    el.mapNote.textContent = map.note + ' 골드 ' + d.gold + ', 목숨 ' + d.lives + '개로 시작합니다.';
  }

  /* ───── 도감 ───── */

  function buildCodex() {
    for (const type of TOWER_ORDER) {
      const def = TOWERS[type];
      const card = document.createElement('article');
      card.className = 'codex-card';
      const cv = document.createElement('canvas');
      cv.width = 420;
      cv.height = 236;
      const c = cv.getContext('2d');
      for (let lv = 0; lv < 3; lv++) {
        c.save();
        c.translate(72 + lv * 138, 182);
        c.scale(100, 100);
        drawTowerSprite(c, type, lv, 0.55, { t: 0.4 });
        c.restore();
      }
      const body = document.createElement('div');
      const h = document.createElement('h4');
      h.textContent = def.name;
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = def.levels.map((l) => l.cost).join(' · ') + ' G';
      h.append(tag);
      const p = document.createElement('p');
      p.textContent = def.blurb;
      const stats = document.createElement('p');
      stats.className = 'codex-stats';
      for (const [label, get] of statDefs(type)) {
        const s = document.createElement('span');
        const i = document.createElement('i');
        i.textContent = label;
        s.append(i, def.levels.map(get).join(' → '));
        stats.append(s);
      }
      const from = document.createElement('p');
      from.className = 'codex-from';
      from.textContent = unlockStage(type) === 1 ? '처음부터 쓸 수 있습니다.' : '스테이지 ' + unlockStage(type) + '부터 쓸 수 있습니다.';
      body.append(h, p, stats, from);
      card.append(cv, body);
      el.codexTowers.append(card);
    }
    for (const type of Object.keys(ENEMIES)) {
      const def = ENEMIES[type];
      const card = document.createElement('article');
      card.className = 'codex-card enemy';
      const cv = document.createElement('canvas');
      cv.width = 240;
      cv.height = 190;
      const c = cv.getContext('2d');
      c.fillStyle = ART.path;
      c.fillRect(0, 0, 240, 190);
      const s = (def.boss ? 44 : 50) / def.r;
      c.translate(def.tail ? 150 : 114, 118);
      c.scale(s, s);
      const art = ENEMY_ART[type];
      if (def.tail && art.segment) {
        for (let n = 3; n >= 1; n--) {
          c.save();
          c.translate(-n * def.tail.gap, 0);
          art.segment(c, def.r, n, def.tail.n, 0.3);
          c.restore();
        }
      }
      drawEnemySprite(c, type, def.r, 0.3, { seed: 2 });
      const body = document.createElement('div');
      const h = document.createElement('h4');
      h.textContent = def.name;
      const tags = [];
      if (def.boss) tags.push('우두머리');
      if (def.speed >= 1.3 && !def.boss) tags.push('빠름');
      if (def.armor > 0) tags.push('갑옷');
      if (def.phys < 1) tags.push('회피');
      for (const text of tags) {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = text;
        h.append(tag);
      }
      const p = document.createElement('p');
      p.textContent = def.trait;
      const from = document.createElement('p');
      from.className = 'codex-from';
      from.textContent = '스테이지 ' + firstSeen(type) + '에서 처음 나옵니다. 놓치면 목숨 ' + (def.lives > 20 ? '전부' : def.lives + '개') + '를 잃습니다.';
      body.append(h, p, from);
      card.append(cv, body);
      el.codexEnemies.append(card);
    }
  }

  /* ───── 게임 시작·저장 ───── */

  function persist(data) {
    app.save = data;
    if (data) store.set(KEY.save, data);
    else store.del(KEY.save);
  }

  function record(game, wave, won) {
    const key = game.map.id + ':' + game.diffId;
    const cur = app.best[key] || { wave: 0, won: false };
    if (wave > cur.wave || (won && !cur.won)) {
      app.best[key] = { wave: Math.max(wave, cur.wave), won: won || cur.won };
      store.set(KEY.best, app.best);
    }
  }

  function onGameEvent(type, d) {
    const game = app.game;
    if (!game) return;
    app.renderer.onEvent(type, d);
    Sfx.onEvent(type, d);
    switch (type) {
      case 'wavestart':
        persist(game.snapshot);
        break;
      case 'waveclear':
        if (!game.stage) record(game, d.wave, false);
        if (game.phase === 'build') persist(game.serialize());
        break;
      case 'won':
        if (game.stage) {
          const got = game.stars();
          if (got > starsOf(game.stage.id)) {
            app.progress.stars[game.stage.id] = got;
            store.set(KEY.progress, app.progress);
          }
        } else {
          record(game, FINAL_WAVE, true);
        }
        persist(null);
        app.resultAt = app.time + 1.4;
        break;
      case 'lost':
        if (!game.stage) record(game, game.wave - 1, false);
        persist(null);
        app.resultAt = app.time + 1.4;
        break;
    }
  }

  function begin(game) {
    app.game = game;
    app.acc = 0;
    app.autoWait = 0;
    app.resultAt = 0;
    app.confirmUntil = 0;
    app.selected = null;
    app.placing = null;
    app.seen = {};
    app.menuOpen = false;
    el.pauseSheet.hidden = true;
    el.result.hidden = true;
    if (app.paused) togglePause();
    app.renderer.setGame(game);
    game.listener = onGameEvent;
    el.hudStage.textContent = game.stage ? '스테이지 ' + game.stage.id + ' · ' : '도전 · ';
    refreshShopLocks();
    refreshPanels();
    show('game');
  }

  function startStage(id) {
    const st = STAGES.find((s) => s.id === id);
    if (!st || !unlocked(id)) return;
    begin(new Game({ stage: id, seed: (Math.random() * 2 ** 31) | 0 }));
    app.renderer.banner = { title: '스테이지 ' + id, sub: st.name, life: 2.6, max: 2.6 };
    const news = [];
    if (st.newTowers.length) news.push('새 탑 ' + josa(st.newTowers.map((t) => TOWERS[t].name).join(', '), '을', '를') + ' 쓸 수 있습니다.');
    if (st.newEnemies.length && id > 1) news.push('새 괴수 ' + josa(st.newEnemies.map((t) => ENEMIES[t].name).join(', '), '이', '가') + ' 나옵니다.');
    toast(news.length ? news.join(' ') : '탑을 골라 길가 빈 땅에 세운 뒤 시작을 누르세요.', 6000);
  }

  function startChallenge(mapId, diffId) {
    begin(new Game({ map: mapId || app.settings.map, diff: diffId || app.settings.diff, seed: (Math.random() * 2 ** 31) | 0 }));
    toast('서른 웨이브를 버텨 보세요.', 4000);
  }

  function loadGame(save) {
    const game = Game.fromSave(save);
    if (!game) {
      persist(null);
      return false;
    }
    begin(game);
    return true;
  }

  function restart() {
    const g = app.game;
    if (!g) return;
    if (g.stage) startStage(g.stage.id);
    else startChallenge(g.map.id, g.diffId);
  }

  /* 하던 판을 접고 로비로. 웨이브 사이였다면 지금 상태를, 싸우던 중이면 그 웨이브 시작 전 상태를 남긴다. */
  function quit() {
    const g = app.game;
    if (g && (g.phase === 'build' || g.phase === 'wave')) persist(g.phase === 'build' ? g.serialize() : g.snapshot);
    app.game = null;
    show('lobby');
  }

  /* ───── 상점 ───── */

  function buildShop() {
    TOWER_ORDER.forEach((type, i) => {
      const def = TOWERS[type];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card';
      card.setAttribute('aria-pressed', 'false');
      card.title = def.blurb;
      const ico = document.createElement('canvas');
      ico.className = 'card-ico';
      ico.width = 96;
      ico.height = 112;
      const c = ico.getContext('2d');
      c.translate(47, 80);
      c.scale(62, 62);
      drawTowerSprite(c, type, 0, 0.5, { t: 0.4 });
      const nm = document.createElement('span');
      nm.className = 'card-nm';
      nm.textContent = def.name;
      const cost = document.createElement('span');
      cost.className = 'card-cost';
      const key = document.createElement('span');
      key.className = 'card-key';
      key.textContent = String(i + 1);
      card.append(ico, nm, cost, key);
      card.addEventListener('click', () => {
        Sfx.play('click');
        setPlacing(app.placing === type ? null : type);
      });
      el.shop.append(card);
      app.cards[type] = card;
    });
  }

  /* 이 판에서 쓸 수 없는 탑은 잠가 둔다. */
  function refreshShopLocks() {
    const g = app.game;
    for (const type of TOWER_ORDER) {
      const card = app.cards[type];
      const open = !g || g.allowed.includes(type);
      card.disabled = !open;
      card.classList.toggle('locked', !open);
      const cost = card.querySelector('.card-cost');
      cost.textContent = '';
      if (open) {
        cost.append(String(TOWERS[type].levels[0].cost));
        const unit = document.createElement('i');
        unit.textContent = 'G';
        cost.append(unit);
      } else {
        cost.textContent = '스테이지 ' + unlockStage(type);
      }
    }
  }

  /* ───── 선택·건설 ───── */

  function setPlacing(type) {
    const g = app.game;
    if (type && (!g || !g.allowed.includes(type))) return;
    app.placing = type;
    if (type) app.selected = null;
    refreshPanels();
  }

  function select(tower) {
    app.selected = tower;
    if (tower) app.placing = null;
    refreshPanels();
  }

  function tap(tile, keep) {
    const g = app.game;
    if (!g || !g.inBounds(tile.x, tile.y)) return;
    if (!app.placing) {
      select(g.towerAt(tile.x, tile.y));
      return;
    }
    const cost = TOWERS[app.placing].levels[0].cost;
    if (!g.canBuild(tile.x, tile.y)) {
      const there = g.towerAt(tile.x, tile.y);
      if (there) select(there);
      else deny(g.tile(tile.x, tile.y) === TILE_PATH ? '길 위에는 세울 수 없습니다.' : '여기에는 세울 수 없습니다.');
      return;
    }
    if (g.phase === 'lost' || g.phase === 'won') return;
    if (g.gold < cost) {
      deny('골드가 ' + (cost - g.gold) + ' 모자랍니다.');
      return;
    }
    g.build(app.placing, tile.x, tile.y);
    if (!(keep && g.gold >= cost)) setPlacing(null);
  }

  function startWave() {
    const g = app.game;
    if (!g) return;
    if (g.startWave()) {
      app.autoWait = 0;
      if (app.paused) togglePause();
    }
  }

  function togglePause() {
    app.paused = !app.paused;
    el.pause.classList.toggle('on', app.paused);
    el.pause.setAttribute('aria-pressed', String(app.paused));
  }

  function setSpeed(n) {
    app.settings.speed = n;
    el.speed.textContent = n + '×';
    el.speed.classList.toggle('on', n > 1);
    saveSettings();
  }

  function setSoundLabel() {
    const on = app.settings.sound;
    for (const b of document.querySelectorAll('.sound-toggle')) {
      b.setAttribute('aria-pressed', String(on));
      if (!b.classList.contains('icon-btn')) b.textContent = on ? '소리 켜짐' : '소리 꺼짐';
    }
  }

  function toggleSound() {
    app.settings.sound = !app.settings.sound;
    Sfx.setEnabled(app.settings.sound);
    saveSettings();
    setSoundLabel();
    Sfx.play('click');
  }

  function upgradeSelected() {
    const t = app.selected;
    if (!t || !app.game) return;
    const cost = app.game.upgradeCost(t);
    if (cost == null) return;
    if (!app.game.upgrade(t)) deny('골드가 ' + (cost - app.game.gold) + ' 모자랍니다.');
    refreshPanels();
  }

  function sellSelected() {
    const t = app.selected;
    if (!t || !app.game) return;
    app.game.sell(t);
    select(null);
  }

  function cycleTarget() {
    const t = app.selected;
    if (!t || t.def.kind === 'aura') return;
    const i = TARGET_MODES.findIndex((m) => m.id === t.mode);
    t.mode = TARGET_MODES[(i + 1) % TARGET_MODES.length].id;
    Sfx.play('click');
    refreshPanels();
  }

  /* ───── 게임 화면 갱신 ───── */

  function setText(node, key, value) {
    if (app.seen[key] === value) return false;
    app.seen[key] = value;
    node.textContent = value;
    return true;
  }

  function refreshPanels() {
    const g = app.game;
    el.tray.classList.toggle('is-placing', !!app.placing);
    el.tray.classList.toggle('is-selected', !!app.selected);
    el.placing.hidden = !app.placing;
    el.selected.hidden = !app.selected;
    for (const type of TOWER_ORDER) app.cards[type].setAttribute('aria-pressed', String(app.placing === type));
    if (app.placing) {
      const def = TOWERS[app.placing];
      el.plcName.textContent = def.name;
      fillStats(el.plcStats, statList(app.placing, def.levels[0], null));
      el.plcBlurb.textContent = def.blurb;
    }
    const t = app.selected;
    if (t && g) {
      const next = t.def.levels[t.level + 1] || null;
      el.selName.textContent = t.def.name;
      el.selLevel.textContent = t.level + 1 + '단';
      fillStats(el.selStats, statList(t.type, t.lv, next));
      if (next) {
        el.upgrade.textContent = '강화 ' + next.cost + 'G';
        el.upgrade.disabled = g.gold < next.cost;
      } else {
        el.upgrade.textContent = '최고 단계';
        el.upgrade.disabled = true;
      }
      el.sell.textContent = (t.fresh ? '무르기 +' : '판매 +') + g.sellValue(t) + 'G';
      el.target.hidden = t.def.kind === 'aura';
      el.target.textContent = '조준 · ' + TARGET_MODES.find((m) => m.id === t.mode).name;
    }
  }

  function refresh() {
    const g = app.game;
    setText(el.lives, 'lives', String(g.lives));
    if (setText(el.gold, 'gold', String(g.gold))) {
      for (const type of TOWER_ORDER) app.cards[type].classList.toggle('poor', g.allowed.includes(type) && g.gold < TOWERS[type].levels[0].cost);
      if (app.selected) refreshPanels();
    }
    setText(el.wave, 'wave', String(g.wave));
    setText(el.of, 'of', g.endless ? '' : '/' + g.finalWave);
    el.statLives.classList.toggle('low', g.lives <= 5);

    const waving = g.phase === 'wave';
    if (waving) {
      setText(el.waveLabel, 'wlabel', '웨이브 ' + g.wave);
      setText(el.remain, 'remain', '남은 적 ' + g.enemiesLeft());
    } else {
      setText(el.waveLabel, 'wlabel', '다음');
      const key = 'chips' + (g.wave + 1);
      if (app.seen.chips !== key) {
        app.seen.chips = key;
        el.chips.textContent = '';
        for (const { type, count } of g.preview(g.wave + 1)) el.chips.append(enemyChip(type, '×' + count, (text) => toast(text, 4200)));
      }
    }
    const mode = waving ? 'wave' : g.phase;
    if (app.seen.mode !== mode) {
      app.seen.mode = mode;
      el.chips.hidden = waving;
      el.remain.hidden = !waving;
      el.start.disabled = g.phase !== 'build';
      if (app.selected) refreshPanels();
    }
  }

  /* ───── 일시정지 메뉴·결과 ───── */

  function openPause() {
    const g = app.game;
    if (!g) return;
    app.menuOpen = true;
    app.confirmUntil = 0;
    setPlacing(null);
    el.pauseEyebrow.textContent = g.stage ? '스테이지 ' + g.stage.id + ' · ' + g.stage.name : '도전 모드 · ' + g.map.name;
    el.restart.textContent = '처음부터 다시';
    setSoundLabel();
    el.pauseSheet.hidden = false;
  }

  function closePause() {
    app.menuOpen = false;
    el.pauseSheet.hidden = true;
  }

  function showResult() {
    const g = app.game;
    if (!g) return;
    const won = g.phase === 'won';
    const st = g.stage;
    const last = st && st.id === STAGES[STAGES.length - 1].id;
    el.resStars.hidden = !(st && won);
    if (st && won) {
      const n = g.stars();
      [...el.resStars.children].forEach((s, i) => s.classList.toggle('on', i < n));
    }
    if (st) {
      el.resEyebrow.textContent = '스테이지 ' + st.id + ' · ' + st.name;
      el.resTitle.textContent = won ? '성문을 지켜냈습니다' : '성문이 뚫렸습니다';
      el.resText.textContent = won
        ? last
          ? '열두 전장을 모두 지켜냈습니다. 별 셋을 다 모으거나 도전 모드에서 더 버텨 보세요.'
          : g.stars() === 3
            ? '거의 놓치지 않고 막아냈습니다. 다음 스테이지가 열렸습니다.'
            : '다음 스테이지가 열렸습니다. 목숨을 ' + (g.maxLives - 2) + '개 이상 지키면 별 셋입니다.'
        : g.wave + '번째 웨이브에서 괴수 떼가 성문을 넘었습니다. 다음 웨이브에 누가 오는지 보고 탑을 섞어 보세요.';
    } else {
      el.resEyebrow.textContent = '도전 모드 · ' + g.map.name;
      el.resTitle.textContent = won ? '성을 지켜냈습니다' : '성문이 뚫렸습니다';
      el.resText.textContent = won
        ? '서른 웨이브를 모두 막아냈습니다. 무한 모드로 이어 가면 괴수가 끝없이 거세집니다.'
        : g.wave + '번째 웨이브에서 괴수 떼가 성문을 넘었습니다.';
    }
    el.tallyWave.textContent = String(won ? g.wave : g.wave - 1);
    el.tallyKills.textContent = String(g.stats.kills);
    el.tallyLives.textContent = String(g.lives);
    el.home.textContent = st ? '스테이지 선택' : '로비로';
    el.endless.hidden = !(won && !st);
    el.next.hidden = !(won && st && !last);
    el.retry.classList.toggle('primary', !won);
    setPlacing(null);
    select(null);
    el.result.hidden = false;
  }

  /* ───── 입력 ───── */

  function boardTile(e) {
    const r = el.board.getBoundingClientRect();
    return app.renderer.tileAt(e.clientX - r.left, e.clientY - r.top);
  }

  function bindInput() {
    const b = el.board;
    b.addEventListener('pointermove', (e) => { app.hover = boardTile(e); });
    b.addEventListener('pointerdown', (e) => {
      app.hover = boardTile(e);
      if (e.pointerType !== 'mouse' && b.setPointerCapture) {
        try { b.setPointerCapture(e.pointerId); } catch (err) { /* 잡지 못해도 무방 */ }
      }
    });
    b.addEventListener('pointerup', (e) => {
      if (e.button > 0) return;
      tap(boardTile(e), e.shiftKey);
      if (e.pointerType !== 'mouse') app.hover = null;
    });
    b.addEventListener('pointerleave', () => { app.hover = null; });
    b.addEventListener('pointercancel', () => { app.hover = null; });
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (app.placing) setPlacing(null);
      else select(null);
    });

    const click = (node, fn) => node.addEventListener('click', () => { Sfx.play('click'); fn(); });

    /* 게임 화면 */
    el.start.addEventListener('click', startWave);
    click(el.speed, () => setSpeed((app.settings.speed % 3) + 1));
    click(el.pause, togglePause);
    click(el.menuBtn, openPause);
    el.auto.addEventListener('change', () => { app.settings.auto = el.auto.checked; app.autoWait = 0; saveSettings(); });
    el.cancel.addEventListener('click', () => setPlacing(null));
    el.close.addEventListener('click', () => select(null));
    el.upgrade.addEventListener('click', upgradeSelected);
    el.sell.addEventListener('click', sellSelected);
    el.target.addEventListener('click', cycleTarget);
    for (const node of document.querySelectorAll('.sound-toggle')) node.addEventListener('click', toggleSound);

    /* 로비와 그 아래 화면들 */
    click(el.play, () => { app.pick = frontier(); show('stages'); });
    click(el.cont, () => { if (!loadGame(app.save)) refreshLobby(); });
    click(el.challengeBtn, () => show('challenge'));
    click(el.codexBtn, () => show('codex'));
    click(el.stagesBack, () => show('lobby'));
    click(el.challengeBack, () => show('lobby'));
    click(el.codexBack, () => show('lobby'));
    click(el.stageStart, () => startStage(app.pick));
    click(el.challengeStart, () => startChallenge());

    /* 일시정지 메뉴 */
    click(el.resume, closePause);
    el.restart.addEventListener('click', () => {
      if (app.confirmUntil <= app.time) {
        app.confirmUntil = app.time + 4;
        el.restart.textContent = '한 번 더 누르면 처음부터';
        return;
      }
      Sfx.play('click');
      restart();
    });
    click(el.quit, quit);

    /* 결과 */
    click(el.retry, restart);
    click(el.home, () => {
      const g = app.game;
      app.game = null;
      if (g && g.stage) {
        app.pick = g.phase === 'won' && unlocked(g.stage.id + 1) && g.stage.id < STAGES.length ? g.stage.id + 1 : g.stage.id;
        show('stages');
      } else {
        show('lobby');
      }
    });
    click(el.next, () => { if (app.game && app.game.stage) startStage(app.game.stage.id + 1); });
    click(el.endless, () => {
      if (app.game && app.game.continueEndless()) {
        el.result.hidden = true;
        persist(app.game.serialize());
        toast('무한 모드입니다. 버틸 수 있는 데까지 버텨 보세요.', 4000);
      }
    });

    document.addEventListener('pointerdown', () => Sfx.unlock(), true);
    document.addEventListener('keydown', (e) => {
      Sfx.unlock();
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (app.screen !== 'game') {
        if (e.code === 'Escape' && app.screen !== 'lobby') show('lobby');
        return;
      }
      if (!el.result.hidden) return;
      if (app.menuOpen) {
        if (e.code === 'Escape') closePause();
        return;
      }
      const g = app.game;
      const onControl = /^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
      const digit = /^Digit([1-5])$/.exec(e.code);
      if (digit) {
        const type = TOWER_ORDER[Number(digit[1]) - 1];
        setPlacing(app.placing === type ? null : type);
        return;
      }
      switch (e.code) {
        case 'Escape':
          if (app.placing) setPlacing(null);
          else if (app.selected) select(null);
          else openPause();
          break;
        case 'Space':
          if (onControl) return;
          e.preventDefault();
          if (g.phase === 'build') startWave();
          else togglePause();
          break;
        case 'KeyP': togglePause(); break;
        case 'KeyF': setSpeed((app.settings.speed % 3) + 1); break;
        case 'KeyU': upgradeSelected(); break;
        case 'KeyX': sellSelected(); break;
        case 'KeyT': cycleTarget(); break;
      }
    });
  }

  /* ───── 배치와 루프 ───── */

  function layout() {
    const w = el.stage.clientWidth;
    const h = el.stage.clientHeight;
    if (w < 20 || h < 20) return;
    app.renderer.resize(w, h);
    el.board.style.left = Math.max(0, Math.floor((w - app.renderer.w) / 2)) + 'px';
    el.board.style.top = Math.max(0, Math.floor((h - app.renderer.h) / 2)) + 'px';
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, Math.max(0, (now - app.last) / 1000) || 0);
    app.last = now;
    app.time += dt;

    if (app.screen !== 'game') sceneTick(dt);
    const g = app.game;
    if (!g || app.screen !== 'game') return;

    const running = !app.paused && !app.menuOpen && el.result.hidden;
    if (running) {
      app.acc += dt * app.settings.speed;
      let steps = 0;
      while (app.acc >= STEP && steps++ < 24) {
        g.update(STEP);
        app.acc -= STEP;
      }
      if (app.acc >= STEP) app.acc = 0;

      if (app.settings.auto && g.phase === 'build' && g.wave > 0) {
        app.autoWait += dt;
        if (app.autoWait >= 2) startWave();
      } else {
        app.autoWait = 0;
      }
    }

    if (app.resultAt && app.time >= app.resultAt) {
      app.resultAt = 0;
      showResult();
    }
    if (app.confirmUntil && app.time >= app.confirmUntil) {
      app.confirmUntil = 0;
      el.restart.textContent = '처음부터 다시';
    }
    if (app.selected && !g.towers.includes(app.selected)) select(null);

    refresh();
    app.renderer.draw({
      time: app.time,
      dt: running ? dt : 0,
      placing: app.placing,
      hover: app.hover,
      selected: app.selected,
      paused: app.paused && !app.menuOpen,
    });
  }

  /* 열어 둔 채로 새 판이 배포되어도 하던 판을 잃지 않도록 상태를 넘겨준다. */
  function hotState() {
    const g = app.game;
    if (!g || (g.phase !== 'build' && g.phase !== 'wave')) return {};
    return { save: g.phase === 'build' ? g.serialize() : g.snapshot };
  }

  function start(data) {
    buildShop();
    buildStageGrid();
    buildChallenge();
    buildCodex();
    bindInput();
    Sfx.enabled = app.settings.sound;
    el.auto.checked = !!app.settings.auto;
    setSpeed(app.settings.speed);

    if (!(data && data.save && loadGame(data.save))) show('lobby');

    if (typeof ResizeObserver === 'function') new ResizeObserver(layout).observe(el.stage);
    window.addEventListener('resize', layout);
    requestAnimationFrame((now) => {
      app.last = now;
      frame(now);
    });
  }

  window.td = app;

  const hot = window.claude && window.claude.hot;
  try {
    if (hot && hot.snapshot) hot.snapshot(hotState);
  } catch (err) { /* 미리보기 밖에서는 없어도 된다 */ }
  if (hot && hot.ready) hot.ready(start);
  else start((hot && hot.data) || {});
})();
