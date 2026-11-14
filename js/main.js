'use strict';
/* 철벽 요새 — 화면 조작, 메뉴, 저장, 게임 루프 */

(function () {
  const $ = (id) => document.getElementById(id);
  const STEP = 1 / 60;
  const KEY = { settings: 'ironwall.settings', save: 'ironwall.save', best: 'ironwall.best' };

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
    stage: $('stage'), board: $('board'), toast: $('toast'), tray: $('tray'),
    lives: $('hud-lives'), statLives: $('stat-lives'), gold: $('hud-gold'), wave: $('hud-wave'), of: $('hud-of'),
    speed: $('btn-speed'), pause: $('btn-pause'), sound: $('btn-sound'), sound2: $('btn-sound2'), menuBtn: $('btn-menu'),
    waveLabel: $('wave-label'), chips: $('wave-chips'), remain: $('wave-remain'), auto: $('opt-auto'), start: $('btn-start'),
    placing: $('placing'), plcName: $('plc-name'), plcStats: $('plc-stats'), plcBlurb: $('plc-blurb'), cancel: $('btn-cancel'),
    shop: $('shop'),
    selected: $('selected'), selName: $('sel-name'), selLevel: $('sel-level'), selStats: $('sel-stats'),
    upgrade: $('btn-upgrade'), sell: $('btn-sell'), target: $('btn-target'), close: $('btn-close'),
    menu: $('menu'), maps: $('maps'), mapNote: $('map-note'), diffs: $('diffs'),
    resume: $('btn-resume'), cont: $('btn-continue'), fresh: $('btn-new'),
    result: $('result'), resEyebrow: $('result-eyebrow'), resTitle: $('result-title'), resText: $('result-text'),
    tallyWave: $('tally-wave'), tallyKills: $('tally-kills'), tallyLives: $('tally-lives'),
    home: $('btn-home'), endless: $('btn-endless'), retry: $('btn-retry'),
  };

  const app = {
    game: null,
    demo: true,
    renderer: new Renderer(el.board),
    paused: false,
    menuOpen: true,
    placing: null,
    hover: null,
    selected: null,
    acc: 0,
    time: 0,
    last: 0,
    autoWait: 0,
    demoWait: 0,
    resultAt: 0,
    confirmUntil: 0,
    toastTimer: 0,
    seen: {},
    cards: {},
    settings: Object.assign({ map: MAPS[0].id, diff: 'normal', sound: true, auto: false, speed: 1 }, store.get(KEY.settings, {})),
    best: store.get(KEY.best, {}) || {},
    save: store.get(KEY.save, null),
  };
  if (!MAPS.some((m) => m.id === app.settings.map)) app.settings.map = MAPS[0].id;
  if (!DIFFICULTY[app.settings.diff]) app.settings.diff = 'normal';
  if (![1, 2, 3].includes(app.settings.speed)) app.settings.speed = 1;

  const saveSettings = () => store.set(KEY.settings, app.settings);

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

  function statList(type, lv, next) {
    const f1 = (n) => String(Math.round(n * 10) / 10);
    const out = [];
    const add = (label, get, unit) => {
      const a = get(lv) + (unit || '');
      const b = next ? get(next) + (unit || '') : a;
      out.push({ label, value: a, next: b !== a ? b : null });
    };
    switch (type) {
      case 'frost':
        add('둔화', (l) => Math.round(l.slow * 100), '%');
        add('거리', (l) => f1(l.range));
        if (lv.vuln || (next && next.vuln)) add('받는 피해', (l) => '+' + Math.round((l.vuln || 0) * 100), '%');
        break;
      case 'rocket':
        add('피해', (l) => l.dmg + '×' + l.rockets);
        add('장전', (l) => f1(l.cd), '초');
        add('거리', (l) => f1(l.range));
        break;
      case 'tesla':
        add('피해', (l) => l.dmg);
        add('연쇄', (l) => l.chain);
        add('연사', (l) => f1(1 / l.cd));
        add('거리', (l) => f1(l.range));
        break;
      default:
        add('피해', (l) => l.dmg);
        add('연사', (l) => f1(1 / l.cd));
        add('거리', (l) => f1(l.range));
    }
    return out;
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

  /* ───── 상점·메뉴 만들기 ───── */

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
      cost.append(String(def.levels[0].cost));
      const unit = document.createElement('i');
      unit.textContent = 'G';
      cost.append(unit);
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

  function drawThumb(canvas, map) {
    const c = canvas.getContext('2d');
    const s = canvas.width / COLS;
    const dot = (x, y, r, fill) => {
      c.fillStyle = ART.OUT;
      c.beginPath();
      c.arc(x, y, r + 2, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = fill;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    };
    c.fillStyle = ART.grass[1];
    c.fillRect(0, 0, canvas.width, canvas.height);
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
    /* 보라 = 괴수 굴, 파랑 = 성문 */
    for (const w of map.paths) dot((w[0][0] + 0.5) * s, (w[0][1] + 0.5) * s, s * 0.5, ART.purple[1]);
    const end = map.paths[0][map.paths[0].length - 1];
    dot((end[0] + 0.5) * s, (end[1] + 0.5) * s, s * 0.55, ART.blue[0]);
  }

  function bestText(mapId) {
    const b = app.best[mapId + ':' + app.settings.diff];
    if (!b || !b.wave) return '기록 없음';
    return b.won ? (b.wave > FINAL_WAVE ? '지켜냄 · ' + b.wave + '웨이브' : '지켜냄') : '최고 ' + b.wave + '웨이브';
  }

  function buildMenu() {
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
        refreshMenu();
        if (app.demo) startDemo();
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
        refreshMenu();
      });
      el.diffs.append(b);
    }
  }

  function inRun() {
    return !app.demo && (app.game.phase === 'build' || app.game.phase === 'wave');
  }

  function refreshMenu() {
    for (const b of el.maps.children) {
      b.setAttribute('aria-checked', String(b.dataset.map === app.settings.map));
      b.lastChild.textContent = bestText(b.dataset.map);
    }
    for (const b of el.diffs.children) b.setAttribute('aria-checked', String(b.dataset.diff === app.settings.diff));
    const map = MAPS.find((m) => m.id === app.settings.map);
    const d = DIFFICULTY[app.settings.diff];
    el.mapNote.textContent = map.note + ' 골드 ' + d.gold + ', 목숨 ' + d.lives + '개로 시작합니다.';
    el.resume.hidden = !inRun();
    const s = app.save;
    const savedMap = s && MAPS.find((m) => m.id === s.map);
    el.cont.hidden = inRun() || !savedMap;
    if (savedMap) el.cont.textContent = '이어하기 · ' + savedMap.name + ' ' + (s.wave + 1) + '웨이브';
    el.fresh.textContent = app.confirmUntil > app.time ? '지금 판을 버리고 시작' : '새 게임';
    setSoundLabel();
  }

  function openMenu() {
    app.menuOpen = true;
    app.confirmUntil = 0;
    setPlacing(null);
    refreshMenu();
    el.menu.hidden = false;
  }

  function closeMenu() {
    app.menuOpen = false;
    el.menu.hidden = true;
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

  function setGame(game, demo) {
    app.game = game;
    app.demo = demo;
    app.acc = 0;
    app.autoWait = 0;
    app.demoWait = 0;
    app.resultAt = 0;
    app.selected = null;
    app.placing = null;
    app.seen = {};
    app.renderer.setGame(game);
    game.listener = (type, d) => {
      app.renderer.onEvent(type, d);
      if (app.demo) return;
      Sfx.onEvent(type, d);
      switch (type) {
        case 'wavestart':
          persist(game.snapshot);
          break;
        case 'waveclear':
          record(game, d.wave, false);
          if (game.phase === 'build') persist(game.serialize());
          break;
        case 'won':
          record(game, FINAL_WAVE, true);
          persist(null);
          app.resultAt = app.time + 1.4;
          break;
        case 'lost':
          record(game, game.wave - 1, false);
          persist(null);
          app.resultAt = app.time + 1.4;
          break;
      }
    };
    refreshPanels();
  }

  function newGame() {
    const game = new Game({ map: app.settings.map, diff: app.settings.diff, seed: (Math.random() * 2 ** 31) | 0 });
    setGame(game, false);
    app.paused = false;
    el.result.hidden = true;
    closeMenu();
    toast('탑을 골라 길가 빈 땅에 세운 뒤 시작을 누르세요.', 5000);
  }

  function loadGame(save) {
    const game = Game.fromSave(save);
    if (!game) {
      persist(null);
      refreshMenu();
      return false;
    }
    app.settings.map = game.map.id;
    app.settings.diff = game.diffId;
    setGame(game, false);
    app.paused = false;
    el.result.hidden = true;
    closeMenu();
    return true;
  }

  /* 시작 화면 뒤에서 저절로 돌아가는 시연 */
  function startDemo() {
    const game = new Game({ map: app.settings.map, diff: 'normal', seed: (Math.random() * 2 ** 31) | 0 });
    const plan = [['crossbow', 1], ['cannon', 1], ['frost', 0], ['tesla', 1], ['crossbow', 2], ['rocket', 0], ['cannon', 2], ['frost', 1], ['tesla', 0], ['rocket', 1]];
    for (const [type, level] of plan) {
      const range = TOWERS[type].levels[0].range;
      const spots = [];
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (game.canBuild(x, y)) spots.push({ x, y, score: game.coverage(x + 0.5, y + 0.5, range) });
        }
      }
      spots.sort((a, b) => b.score - a.score);
      const pick = spots[(Math.random() * Math.min(14, spots.length)) | 0];
      if (!pick) break;
      const t = game.addTower(type, pick.x, pick.y);
      t.level = level;
      t.lv = t.def.levels[level];
      t.fresh = false;
    }
    game.wave = 4 + ((Math.random() * 5) | 0);
    game.gold = 180;
    setGame(game, true);
  }

  /* ───── 선택·건설 ───── */

  function setPlacing(type) {
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
    if (app.demo || !g.inBounds(tile.x, tile.y)) return;
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
    if (app.demo) return;
    if (app.game.startWave()) {
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
    el.sound.setAttribute('aria-pressed', String(on));
    el.sound2.setAttribute('aria-pressed', String(on));
    el.sound2.textContent = on ? '소리 켜짐' : '소리 꺼짐';
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
    if (!t) return;
    const cost = app.game.upgradeCost(t);
    if (cost == null) return;
    if (!app.game.upgrade(t)) deny('골드가 ' + (cost - app.game.gold) + ' 모자랍니다.');
    refreshPanels();
  }

  function sellSelected() {
    const t = app.selected;
    if (!t) return;
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

  /* ───── 화면 갱신 ───── */

  function setText(node, key, value) {
    if (app.seen[key] === value) return false;
    app.seen[key] = value;
    node.textContent = value;
    return true;
  }

  function buildChips(wave) {
    el.chips.textContent = '';
    for (const { type, count } of wavePreview(wave)) {
      const def = ENEMIES[type];
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.title = def.name + ' — ' + def.trait;
      chip.setAttribute('aria-label', def.name + ' ' + count + '마리');
      const cv = document.createElement('canvas');
      cv.width = 64;
      cv.height = 64;
      const c = cv.getContext('2d');
      c.translate(31, 40);
      const s = 14.5 / def.r;
      c.scale(s, s);
      drawEnemySprite(c, type, def.r, 0.3, { seed: 1 });
      chip.append(cv, '×' + count);
      chip.addEventListener('click', () => toast(def.name + ' — ' + def.trait, 4200));
      el.chips.append(chip);
    }
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
      for (const type of TOWER_ORDER) app.cards[type].classList.toggle('poor', g.gold < TOWERS[type].levels[0].cost);
      if (app.selected) refreshPanels();
    }
    setText(el.wave, 'wave', String(g.wave));
    setText(el.of, 'of', g.endless ? '' : '/' + FINAL_WAVE);
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
        buildChips(g.wave + 1);
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

  function showResult() {
    const g = app.game;
    const won = g.phase === 'won';
    el.resEyebrow.textContent = won ? '승리' : '패배';
    el.resTitle.textContent = won ? '성을 지켜냈습니다' : '성문이 뚫렸습니다';
    el.resText.textContent = won
      ? g.map.name + '의 서른 웨이브를 모두 막아냈습니다. 무한 모드로 이어 가면 괴수가 끝없이 거세집니다.'
      : g.wave + '번째 웨이브에서 괴수 떼가 성문을 넘었습니다. 다음 웨이브에 누가 오는지 보고 탑을 섞어 보세요.';
    el.tallyWave.textContent = String(won ? g.wave : g.wave - 1);
    el.tallyKills.textContent = String(g.stats.kills);
    el.tallyLives.textContent = String(g.lives);
    el.endless.hidden = !won;
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

    el.start.addEventListener('click', startWave);
    el.speed.addEventListener('click', () => { Sfx.play('click'); setSpeed((app.settings.speed % 3) + 1); });
    el.pause.addEventListener('click', () => { Sfx.play('click'); togglePause(); });
    el.sound.addEventListener('click', toggleSound);
    el.sound2.addEventListener('click', toggleSound);
    el.menuBtn.addEventListener('click', () => { Sfx.play('click'); openMenu(); });
    el.auto.addEventListener('change', () => { app.settings.auto = el.auto.checked; app.autoWait = 0; saveSettings(); });
    el.cancel.addEventListener('click', () => setPlacing(null));
    el.close.addEventListener('click', () => select(null));
    el.upgrade.addEventListener('click', upgradeSelected);
    el.sell.addEventListener('click', sellSelected);
    el.target.addEventListener('click', cycleTarget);

    el.resume.addEventListener('click', closeMenu);
    el.cont.addEventListener('click', () => { Sfx.play('click'); loadGame(app.save); });
    el.fresh.addEventListener('click', () => {
      if (inRun() && (app.game.wave > 0 || app.game.towers.length) && app.confirmUntil <= app.time) {
        app.confirmUntil = app.time + 4;
        refreshMenu();
        return;
      }
      Sfx.play('click');
      newGame();
    });
    el.retry.addEventListener('click', () => {
      app.settings.map = app.game.map.id;
      app.settings.diff = app.game.diffId;
      newGame();
    });
    el.home.addEventListener('click', () => {
      el.result.hidden = true;
      startDemo();
      openMenu();
    });
    el.endless.addEventListener('click', () => {
      if (app.game.continueEndless()) {
        el.result.hidden = true;
        persist(app.game.serialize());
        toast('무한 모드입니다. 버틸 수 있는 데까지 버텨 보세요.', 4000);
      }
    });

    document.addEventListener('pointerdown', () => Sfx.unlock(), true);
    document.addEventListener('keydown', (e) => {
      Sfx.unlock();
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!el.result.hidden) return;
      if (app.menuOpen) {
        if (e.code === 'Escape' && inRun()) closeMenu();
        return;
      }
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
          else openMenu();
          break;
        case 'Space':
          if (onControl) return;
          e.preventDefault();
          if (app.game.phase === 'build') startWave();
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
    const g = app.game;
    const running = app.demo || (!app.paused && !app.menuOpen);

    if (running) {
      app.acc += dt * (app.demo ? 1 : app.settings.speed);
      let steps = 0;
      while (app.acc >= STEP && steps++ < 24) {
        g.update(STEP);
        app.acc -= STEP;
      }
      if (app.acc >= STEP) app.acc = 0;

      if (app.demo) {
        if (g.phase === 'build') {
          app.demoWait += dt;
          if (app.demoWait > 1.2) { app.demoWait = 0; g.startWave(); }
        } else if (g.phase !== 'wave' || g.wave > 16) {
          startDemo();
        }
      } else if (app.settings.auto && g.phase === 'build' && g.wave > 0) {
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
      if (app.menuOpen) refreshMenu();
    }
    if (app.selected && !app.game.towers.includes(app.selected)) select(null);

    refresh();
    app.renderer.draw({
      time: app.time,
      dt: running ? dt : 0,
      placing: app.demo ? null : app.placing,
      hover: app.hover,
      selected: app.demo ? null : app.selected,
      paused: app.paused && !app.menuOpen && !app.demo,
    });
  }

  /* 열어 둔 채로 새 판이 배포되어도 하던 판을 잃지 않도록 상태를 넘겨준다. */
  function hotState() {
    if (!inRun()) return {};
    return { save: app.game.phase === 'build' ? app.game.serialize() : app.game.snapshot };
  }

  function start(data) {
    buildShop();
    buildMenu();
    bindInput();
    Sfx.enabled = app.settings.sound;
    el.auto.checked = !!app.settings.auto;
    setSpeed(app.settings.speed);

    startDemo();
    if (!(data && data.save && loadGame(data.save))) openMenu();

    layout();
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
