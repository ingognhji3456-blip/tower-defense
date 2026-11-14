'use strict';
/* 철벽 요새 — 로비·스테이지 선택·뽑기·탑 편성 같은 화면, 게임 조작, 저장, 게임 루프 */

(function () {
  const $ = (id) => document.getElementById(id);
  const STEP = 1 / 60;
  const KEY = {
    settings: 'ironwall.settings', save: 'ironwall.save', best: 'ironwall.best',
    progress: 'ironwall.progress', profile: 'ironwall.profile',
  };
  const CHALLENGE_UNLOCK = 5; /* 이 스테이지를 깨면 도전 모드가 열린다 */
  const GEMS = { clear: 100, star: 20, replay: 10, challenge: 15, challengeWin: 100 };

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
    app: $('app'), board: $('board'), hud: $('hud'), toast: $('toast'), tray: $('tray'),
    lives: $('hud-lives'), statLives: $('stat-lives'), gold: $('hud-gold'), wave: $('hud-wave'), of: $('hud-of'), hudStage: $('hud-stage'),
    speed: $('btn-speed'), pause: $('btn-pause'), menuBtn: $('btn-menu'),
    waveLabel: $('wave-label'), chips: $('wave-chips'), remain: $('wave-remain'), auto: $('opt-auto'), start: $('btn-start'),
    placing: $('placing'), plcName: $('plc-name'), plcStats: $('plc-stats'), plcBlurb: $('plc-blurb'), cancel: $('btn-cancel'),
    shop: $('shop'),
    selected: $('selected'), selName: $('sel-name'), selLevel: $('sel-level'), selStats: $('sel-stats'),
    upgrade: $('btn-upgrade'), sell: $('btn-sell'), target: $('btn-target'), close: $('btn-close'),

    backdrop: $('backdrop'), hero: $('hero'),
    lobby: $('lobby'), lobbyProgress: $('lobby-progress'), play: $('btn-play'), cont: $('btn-continue'),
    gachaBtn: $('btn-gacha'), invBtn: $('btn-inventory'), challengeBtn: $('btn-challenge'), codexBtn: $('btn-codex'), lobbyHint: $('lobby-hint'),

    stages: $('stages'), stagesBack: $('btn-stages-back'), stagesTotal: $('stages-total'),
    trail: $('trail'), trailLine: $('trail-line'), trailPath: $('trail-path'), trailDone: $('trail-done'), stageGrid: $('stage-grid'),
    stageThumb: $('stage-thumb'), stageNo: $('stage-no'), stageName: $('stage-name'), stageMeta: $('stage-meta'),
    stageEnemies: $('stage-enemies'), stageNote: $('stage-note'), stageSquad: $('stage-squad'), squadEdit: $('btn-squad-edit'), stageStart: $('btn-stage-start'),

    gacha: $('gacha'), gachaBack: $('btn-gacha-back'), gachaGems: $('gacha-gems'), gachaStage: $('gacha-stage'), chest: $('chest'), pullCards: $('pull-cards'),
    pull1: $('btn-pull1'), pull5: $('btn-pull5'), odds: $('gacha-odds'),

    inventory: $('inventory'), invBack: $('btn-inv-back'), invGems: $('inv-gems'), invCount: $('inv-count'), invSlots: $('inv-slots'), invGrid: $('inv-grid'),
    invArt: $('inv-art'), invName: $('inv-name'), invBlurb: $('inv-blurb'), invStats: $('inv-stats'), invRank: $('inv-rank'), equip: $('btn-equip'),

    challenge: $('challenge'), challengeBack: $('btn-challenge-back'), maps: $('maps'), mapNote: $('map-note'), diffs: $('diffs'), challengeStart: $('btn-challenge-start'),
    codex: $('codex'), codexBack: $('btn-codex-back'), codexTowers: $('codex-towers'), codexEnemies: $('codex-enemies'),

    pauseSheet: $('pause'), pauseEyebrow: $('pause-eyebrow'), resume: $('btn-resume'), restart: $('btn-restart'), quit: $('btn-quit'),
    result: $('result'), resEyebrow: $('result-eyebrow'), resTitle: $('result-title'), resStars: $('result-stars'), resText: $('result-text'), resGems: $('result-gems'),
    tallyWave: $('tally-wave'), tallyKills: $('tally-kills'), tallyLives: $('tally-lives'),
    home: $('btn-home'), endless: $('btn-endless'), retry: $('btn-retry'), next: $('btn-next'),
  };

  const app = {
    screen: 'lobby', /* lobby | stages | gacha | inventory | challenge | codex | game */
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
    invPick: null,
    invFrom: 'lobby',
    pulling: false,
    chestOpen: 0,
    chestWant: 0,
    lastGems: 0,
    settings: Object.assign({ map: MAPS[0].id, diff: 'normal', sound: true, auto: false, speed: 1 }, store.get(KEY.settings, {})),
    best: store.get(KEY.best, {}) || {},
    progress: store.get(KEY.progress, {}) || {},
    profile: null,
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
  const firstSeen = (type) => (STAGES.find((st) => st.enemies.includes(type)) || STAGES[0]).id;
  const challengeOpen = () => starsOf(CHALLENGE_UNLOCK) > 0;
  const starText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

  /* ───── 가진 탑과 편성 ───── */

  const lent = new Set(); /* 시험용으로 빌려준(뽑지 않은) 탑 */

  function loadProfile() {
    let p = store.get(KEY.profile, null);
    if (!p || typeof p !== 'object' || !p.owned || typeof p.owned !== 'object') {
      p = { gems: STARTER.gems, owned: {}, loadout: STARTER.towers.slice(), pulls: 0, dry: 0 };
      /* 뽑기가 생기기 전에 딴 별에도 보석을 쳐 준다 */
      for (const st of STAGES) if (starsOf(st.id)) p.gems += GEMS.clear + GEMS.star * starsOf(st.id);
    }
    const owned = {};
    for (const t of STARTER.towers) owned[t] = 0;
    for (const t of Object.keys(p.owned)) if (TOWERS[t]) owned[t] = Math.max(0, Math.min(MAX_RANK, p.owned[t] | 0));
    if (UNLOCK_ALL) {
      for (const t of TOWER_ORDER) {
        if (!(t in owned)) { owned[t] = 0; lent.add(t); }
      }
    }
    p.owned = owned;
    p.loadout = [...new Set(Array.isArray(p.loadout) ? p.loadout : [])].filter((t) => t in owned).slice(0, LOADOUT_MAX);
    p.gems = Math.max(0, p.gems | 0);
    p.pulls = Math.max(0, p.pulls | 0);
    p.dry = Math.max(0, p.dry | 0);
    return p;
  }
  app.profile = loadProfile();
  const saveProfile = () => {
    /* 빌려준 탑은 저장하지 않는다 */
    const owned = {};
    for (const t of Object.keys(app.profile.owned)) {
      if (!lent.has(t)) owned[t] = app.profile.owned[t];
    }
    store.set(KEY.profile, Object.assign({}, app.profile, { owned }));
  };
  const owns = (type) => type in app.profile.owned;
  const earned = (type) => owns(type) && !lent.has(type); /* 빌린 것이 아니라 정말로 얻은 탑 */
  const rankOf = (type) => app.profile.owned[type] | 0;
  const ranksFor = (list) => Object.fromEntries(list.map((t) => [t, rankOf(t)]));

  function addGems(n) {
    app.profile.gems += n;
    saveProfile();
  }

  /* '보석 123' 처럼 보석 그림과 수를 함께 넣는다 */
  function gemText(node, text) {
    node.textContent = '';
    const i = document.createElement('i');
    i.className = 'gem';
    node.append(i, text);
  }

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

  /* 탑마다 보여 줄 능력치: 그 탑의 단계 수치에 들어 있는 것만 고른다 */
  function statDefs(type) {
    const def = TOWERS[type];
    const f1 = (n) => String(Math.round(n * 10) / 10);
    const pct = (n) => Math.round(n * 100) + '%';
    const has = (k) => def.levels.some((l) => l[k]);
    if (def.mech === 'lord') {
      return [
        ['휩쓸기', (l) => f1(l.dmg)],
        ['충격파', (l) => f1(l.shock)],
        ['불기둥', (l) => (l.pillar ? (l.pillars > 1 ? l.pillars + '×' : '') + f1(l.pillar) : '—')],
        ['유성우', (l) => (l.meteor ? l.meteors + '×' + f1(l.meteor) : '—')],
        ['거리', (l) => f1(l.range)],
      ];
    }
    if (def.mech === 'moon') {
      return [
        ['검기', (l) => f1(l.dmg)],
        ['원월', (l) => f1(l.dmg * l.finish)],
        ['공허 구슬', (l) => (l.orb ? '초당 ' + f1(l.orbDps) + ' + ' + f1(l.orb) : '—')],
        ['월식', (l) => (l.eclipse ? f1(l.eclipse) : '—')],
        ['연사', (l) => f1(1 / l.cd)],
        ['거리', (l) => f1(l.range)],
      ];
    }
    if (def.mech === 'blade') {
      return [
        ['베기', (l) => f1(l.dmg)],
        ['회전 베기', (l) => f1(l.dmg * l.finish)],
        ['화상', (l) => '초당 ' + f1(l.dot)],
        ['십자 베기', (l) => (l.cross ? f1(l.cross) : '—')],
        ['화염검', (l) => (l.sword ? l.swords + '×' + f1(l.sword) : '—')],
        ['연사', (l) => f1(1 / l.cd)],
        ['거리', (l) => f1(l.range)],
      ];
    }
    const out = [];
    const many = (l) => (l.rockets ? '×' + l.rockets : l.multi > 1 ? '×' + l.multi : l.count > 1 ? '×' + l.count : '');
    if (has('dps')) out.push(['초당 피해', (l) => f1(l.dps) + (def.mech === 'beam' && !l.split ? '~' + f1(l.dps * 3) : '')]);
    if (has('dmg')) out.push(['피해', (l) => f1(l.dmg) + many(l)]);
    if (has('dot')) out.push([def.dotKind === 'burn' ? '화상' : '독', (l) => '초당 ' + f1(l.dot)]);
    if (has('income')) out.push(['수입', (l) => l.income + '골드'], ['간격', (l) => l.every + '초']);
    if (has('interest')) out.push(['이자', (l) => pct(l.interest)]);
    if (has('amp')) out.push(['곁의 탑 피해', (l) => '+' + pct(l.amp)]);
    if (has('haste')) out.push(['곁의 탑 연사', (l) => '+' + pct(l.haste)]);
    if (has('reach')) out.push(['곁의 탑 사거리', (l) => '+' + pct(l.reach)]);
    if (has('slow')) out.push(['둔화', (l) => pct(l.slow)]);
    if (has('vuln')) out.push(['받는 피해', (l) => (l.vuln ? '+' + pct(l.vuln) : '—')]);
    if (has('stun')) out.push([def.skin === 'ice' ? '빙결' : '기절', (l) => f1(l.stun) + '초']);
    if (has('shred')) out.push(['껍질 깎기', (l) => f1(l.shredMax || l.shred)]);
    if (has('kb')) out.push(['끌어당김', (l) => f1(l.kb) + '칸']);
    if (has('exec')) out.push(['처형', (l) => pct(l.exec) + ' 이하']);
    if (has('bounty')) out.push(['현상금', (l) => '+' + l.bounty]);
    if (has('chain')) out.push(['연쇄', (l) => String(l.chain)]);
    if (has('bounce')) out.push(['튕김', (l) => String(l.bounce)]);
    if (has('through')) out.push(['관통', (l) => String(l.through)]);
    if (has('split')) out.push(['갈래', (l) => String(l.split)]);
    if (has('traps')) out.push(['덫', (l) => l.traps + '개']);
    if (has('cd')) out.push(def.levels[0].cd >= 1.5 ? ['장전', (l) => f1(l.cd) + '초'] : ['연사', (l) => f1(1 / l.cd)]);
    if (has('every') && !has('income')) out.push(['간격', (l) => f1(l.every) + '초']);
    if (has('range')) out.push(['거리', (l) => f1(l.range)]);
    return out;
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

  /* 캔버스 한가운데에 탑을 가득 차게 그린다 */
  function paintTower(cv, type, level) {
    const c = cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    const up = [1.25, 1.5, 1.8][level];
    const down = 0.55;
    const k = Math.min(cv.width / 1.16, cv.height / (up + down));
    c.translate(cv.width / 2 - 0.03 * k, (cv.height - (up + down) * k) / 2 + up * k);
    c.scale(k, k);
    drawTowerSprite(c, type, level, 0.55, { t: 0.4, charge: 1 });
  }

  function towerCanvas(type, level, w, h) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    paintTower(cv, type, level);
    return cv;
  }

  /* 적 그림이 든 단추. label 은 '×8' 같은 덧붙임 글, onInfo 는 눌렀을 때 설명을 보여 줄 곳. */
  function enemyChip(type, label, onInfo) {
    const def = ENEMIES[type];
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.title = def.name + ' — ' + def.trait;
    chip.setAttribute('aria-label', def.name + (label ? ' ' + label : ''));
    const cv = document.createElement('canvas');
    cv.width = 96;
    cv.height = 96;
    const c = cv.getContext('2d');
    c.translate(46, 60);
    const s = (def.boss ? 20 : 24) / def.r;
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

  function rarityTag(type) {
    const r = TOWERS[type].rarity;
    const tag = document.createElement('span');
    tag.className = 'tag r-' + r;
    tag.textContent = RARITY[r].name;
    return tag;
  }

  /* ───── 화면 전환 ───── */

  const SCREENS = { lobby: el.lobby, stages: el.stages, gacha: el.gacha, inventory: el.inventory, challenge: el.challenge, codex: el.codex };

  function show(name) {
    app.screen = name;
    el.app.hidden = name !== 'game';
    el.backdrop.hidden = name === 'game';
    for (const k of Object.keys(SCREENS)) {
      SCREENS[k].hidden = k !== name;
      if (k === name) SCREENS[k].scrollTop = 0;
    }
    if (name !== 'game') {
      el.pauseSheet.hidden = true;
      el.result.hidden = true;
      app.menuOpen = false;
    } else {
      scene.r.release();
    }
    if (name === 'lobby') refreshLobby();
    else if (name === 'stages') refreshStages();
    else if (name === 'gacha') refreshGacha();
    else if (name === 'inventory') refreshInventory();
    else if (name === 'challenge') refreshChallenge();
    else if (name === 'game') layout();
  }

  /* ───── 로비 ───── */

  function refreshLobby() {
    el.lobbyProgress.textContent = '';
    const pill = (text, cls, gem) => {
      const p = document.createElement('span');
      p.className = 'pill' + (cls ? ' ' + cls : '');
      if (gem) gemText(p, text);
      else p.textContent = text;
      el.lobbyProgress.append(p);
    };
    pill('★ ' + totalStars() + ' / ' + STAGES.length * 3, 'gold');
    pill('스테이지 ' + clearedCount() + ' / ' + STAGES.length);
    pill(String(app.profile.gems), '', true);
    el.play.textContent = clearedCount() === 0 ? '게임 시작' : '스테이지 선택';

    const s = app.save;
    const ok = s && s.v === 4 && MAPS.some((m) => m.id === s.map);
    el.cont.hidden = !ok;
    if (ok) {
      const where = s.stage != null ? '스테이지 ' + s.stage : '도전 ' + MAPS.find((m) => m.id === s.map).name;
      el.cont.textContent = '이어하기 · ' + where + ' · 웨이브 ' + (s.wave + 1);
    }
    el.gachaBtn.classList.toggle('dot', app.profile.gems >= PULL_COST);
    el.challengeBtn.disabled = !challengeOpen();
    el.lobbyHint.textContent = [
      lent.size ? '시험 모드: 모든 탑이 열려 있습니다. 탑 편성에서 골라 쓰세요.' : '',
      challengeOpen() ? '' : '도전 모드는 스테이지 ' + CHALLENGE_UNLOCK + '를 깨면 열립니다.',
    ].filter(Boolean).join(' ');
    setSoundLabel();
  }

  /* ───── 로비 뒤로 흐르는 전투 장면 ─────
     진짜 게임을 한 판 돌리면서, 카메라가 길을 따라 미끄러지듯 지나가며 일부만 가까이서 비춘다.
     몇 초마다 화면이 어두워졌다 밝아지며 다른 곳(가끔은 다른 전장)으로 넘어간다. */
  const scene = { r: new Renderer(el.hero), game: null, shot: null, count: 0, acc: 0, mapAt: (Math.random() * 6) | 0, snap: true };
  scene.r.clean = true;
  const SCENE_MAPS = ['gubi', 'knot', 'snake', 'maze', 'ssang', 'cross'];
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

  /* 길을 따라 여러 탑을 흩어 세운 시연용 전장 */
  function sceneGame() {
    const g = new Game({ map: SCENE_MAPS[scene.mapAt++ % SCENE_MAPS.length], diff: 'normal', seed: (Math.random() * 2 ** 31) | 0 });
    const kinds = TOWER_ORDER.filter((t) => TOWER_ART[t] && !['income', 'buff'].includes(TOWERS[t].mech) && !TOWERS[t].unique);
    const tmp = {};
    let n = (Math.random() * kinds.length) | 0;
    for (const p of g.paths) {
      const count = Math.round(p.length / 3.4);
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
        const t = g.addTower(kinds[n++ % kinds.length], best.x, best.y);
        /* 굴 가까이는 낮은 단계, 성문 쪽으로 갈수록 높은 단계: 괴수가 길 곳곳에서 쓰러진다 */
        g.setLevel(t, Math.min(2, Math.floor((i / count) * 3)));
        t.fresh = false;
      }
    }
    g.wave = SCENE_WAVES[0] - 1;
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

  /* ───── 스테이지 선택: 길을 따라 놓인 스테이지들 ───── */

  const TRAIL_COLS = 4;

  function buildStageTrail() {
    STAGES.forEach((st, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'node ' + (i % 2 ? 'down' : 'up');
      b.setAttribute('role', 'radio');
      b.dataset.stage = String(st.id);
      /* 줄마다 방향을 바꿔 길이 굽이치게 한다 */
      const row = Math.floor(i / TRAIL_COLS);
      const col = row % 2 ? TRAIL_COLS - 1 - (i % TRAIL_COLS) : i % TRAIL_COLS;
      b.style.gridRow = String(row + 1);
      b.style.gridColumn = String(col + 1);
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = String(st.id);
      const stars = document.createElement('span');
      stars.className = 'node-stars';
      b.append(num, stars);
      b.addEventListener('click', () => {
        Sfx.play('click');
        app.pick = st.id;
        refreshStages();
      });
      el.stageGrid.append(b);
    });
  }

  /* 스테이지들을 잇는 길을 그린다. 깬 곳까지는 금빛 점선이 덧그려진다. */
  function drawTrail() {
    if (app.screen !== 'stages') return;
    const box = el.trail.getBoundingClientRect();
    if (box.width < 10) return;
    const pts = [...el.stageGrid.children].map((n) => {
      const r = n.getBoundingClientRect();
      return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
    });
    const path = (list) => list.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ');
    el.trailLine.setAttribute('viewBox', '0 0 ' + box.width.toFixed(1) + ' ' + box.height.toFixed(1));
    el.trailPath.setAttribute('d', path(pts));
    el.trailDone.setAttribute('d', path(pts.slice(0, Math.max(1, Math.min(pts.length, clearedCount() + 1)))));
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
    const news = st.newEnemies.length && st.id > 1 ? '새 괴수: ' + st.newEnemies.map((t) => ENEMIES[t].name).join(', ') + '. ' : '';
    el.stageNote.textContent = news + map.note;
    el.stageEnemies.textContent = '';
    for (const type of st.enemies) el.stageEnemies.append(enemyChip(type, '', (text) => { el.stageNote.textContent = text; }));
    el.stageSquad.textContent = '';
    if (app.profile.loadout.length) {
      for (const type of app.profile.loadout) {
        const cv = towerCanvas(type, 0, 78, 92);
        cv.title = TOWERS[type].name;
        el.stageSquad.append(cv);
      }
    } else {
      const none = document.createElement('span');
      none.className = 'none';
      none.textContent = '데려갈 탑을 골라 주세요';
      el.stageSquad.append(none);
    }
    el.stageStart.disabled = !app.profile.loadout.length;
    el.stageStart.textContent = starsOf(st.id) ? '다시 도전' : '시작';
    requestAnimationFrame(drawTrail);
  }

  /* ───── 뽑기 ───── */

  /* 한 번 뽑는다. 처음 몇 번과, 이미 가진 탑이 잇달아 나온 뒤에는 새 탑을 보장한다. */
  function pullOnce() {
    const p = app.profile;
    const pick = (list) => {
      let total = 0;
      const ws = list.map((t) => {
        const r = TOWERS[t].rarity;
        const w = RARITY[r].weight / TOWER_ORDER.filter((o) => TOWERS[o].rarity === r).length;
        total += w;
        return w;
      });
      let roll = Math.random() * total;
      for (let i = 0; i < list.length; i++) {
        roll -= ws[i];
        if (roll <= 0) return list[i];
      }
      return list[list.length - 1];
    };
    const missing = TOWER_ORDER.filter((t) => !earned(t));
    const sure = missing.length && (p.pulls < STARTER.sure || p.dry >= 2);
    const type = pick(sure ? missing : TOWER_ORDER);
    p.pulls++;
    if (!earned(type)) {
      lent.delete(type); /* 빌려 쓰던 탑이라면 이제 내 것 */
      p.owned[type] = 0;
      p.dry = 0;
      if (p.loadout.length < LOADOUT_MAX && !p.loadout.includes(type)) p.loadout.push(type);
      return { type, kind: 'new' };
    }
    p.dry++;
    if (p.owned[type] < MAX_RANK) {
      p.owned[type]++;
      return { type, kind: 'rank', rank: p.owned[type] };
    }
    p.gems += DUPE_GEMS;
    return { type, kind: 'gems' };
  }

  function pullCard(res, delay) {
    const def = TOWERS[res.type];
    const card = document.createElement('div');
    card.className = 'pull-card r-' + def.rarity + (res.kind === 'new' ? ' new' : '');
    card.style.animationDelay = delay + 'ms';
    const name = document.createElement('strong');
    name.textContent = def.name;
    const rar = document.createElement('span');
    rar.className = 'rar';
    rar.textContent = RARITY[def.rarity].name;
    const got = document.createElement('span');
    got.className = 'got';
    if (res.kind === 'new') got.textContent = '새 탑!';
    else if (res.kind === 'rank') got.textContent = '등급 +' + res.rank;
    else gemText(got, '+' + DUPE_GEMS);
    card.append(towerCanvas(res.type, 2, 200, 240), name, rar, got);
    return card;
  }

  function pull(n) {
    const cost = n === 1 ? PULL_COST : PULL5_COST;
    if (app.pulling) return;
    if (app.profile.gems < cost) {
      deny('보석이 ' + (cost - app.profile.gems) + '개 모자랍니다. 스테이지를 깨면 보석을 얻습니다.');
      return;
    }
    app.profile.gems -= cost;
    const results = [];
    for (let i = 0; i < n; i++) results.push(pullOnce());
    saveProfile();
    app.pulling = true;
    app.chestWant = 0;
    el.pullCards.textContent = '';
    el.gachaStage.classList.remove('dealt');
    el.chest.classList.remove('shake');
    void el.chest.offsetWidth; /* 흔들림을 처음부터 다시 */
    el.chest.classList.add('shake');
    Sfx.play('pull');
    refreshGacha();
    setTimeout(() => {
      app.chestWant = 1;
      el.gachaStage.classList.toggle('dealt', results.length > 1);
      results.forEach((res, i) => {
        const at = 250 + i * 300;
        el.pullCards.append(pullCard(res, at));
        const top = ['legend', 'mythic'].includes(TOWERS[res.type].rarity);
        setTimeout(() => Sfx.play(top || res.kind === 'new' ? 'jackpot' : 'reveal'), at);
      });
      setTimeout(() => {
        app.pulling = false;
        refreshGacha();
      }, 300 + results.length * 300);
    }, 650);
  }

  function refreshGacha() {
    gemText(el.gachaGems, String(app.profile.gems));
    const label = (node, text, cost) => {
      node.textContent = text;
      const c = document.createElement('span');
      c.className = 'cost';
      gemText(c, String(cost));
      node.append(c);
    };
    label(el.pull1, '1회 뽑기', PULL_COST);
    label(el.pull5, '5회 뽑기', PULL5_COST);
    el.pull1.disabled = app.pulling;
    el.pull5.disabled = app.pulling;
    const odds = Object.keys(RARITY).map((r) => RARITY[r].name + ' ' + RARITY[r].weight + '%').join(' · ');
    const left = TOWER_ORDER.filter((t) => !earned(t)).length;
    el.odds.textContent = '확률 — ' + odds + '. 이미 가진 탑이 나오면 그 탑의 등급이 오르고(최대 +' + MAX_RANK + ', 등급마다 위력 +' + Math.round(RANK_BONUS * 100) + '%), 등급이 가득 찬 탑은 보석 '
      + DUPE_GEMS + '개로 돌려받습니다. 가진 탑이 두 번 잇달아 나오면 다음에는 새 탑이 나옵니다. ' + (left ? '아직 얻지 못한 탑 ' + left + '종.' : '모든 탑을 얻었습니다.');
  }

  function drawChest() {
    const cv = el.chest;
    const c = cv.getContext('2d');
    app.chestOpen += (app.chestWant - app.chestOpen) * 0.16;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.translate(cv.width / 2, cv.height * 0.92);
    c.scale(cv.width * 0.62, cv.width * 0.62);
    UI_ART.chest(c, app.chestOpen, app.time);
  }

  /* ───── 탑 편성(인벤토리) ───── */

  function towerCard(type, opts) {
    const def = TOWERS[type];
    const have = owns(type);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'tcard r-' + def.rarity + (have ? '' : ' locked');
    card.setAttribute('aria-pressed', String(app.invPick === type && !opts.slot));
    const name = document.createElement('strong');
    name.textContent = def.name;
    const rar = document.createElement('span');
    rar.className = 'rar r-' + def.rarity;
    rar.textContent = have ? RARITY[def.rarity].name : '미보유';
    rar.style.color = have ? RARITY[def.rarity].color : '';
    card.append(towerCanvas(type, opts.slot ? 0 : 2, 150, 180), name, rar);
    if (have && rankOf(type)) {
      const b = document.createElement('span');
      b.className = 'badge';
      b.textContent = '+' + rankOf(type);
      card.append(b);
    }
    if (!opts.slot && app.profile.loadout.includes(type)) {
      const b = document.createElement('span');
      b.className = 'badge use';
      b.textContent = '출전';
      card.append(b);
    }
    card.addEventListener('click', () => {
      Sfx.play('click');
      app.invPick = type;
      refreshInventory();
    });
    return card;
  }

  function refreshInventory() {
    const p = app.profile;
    if (!app.invPick || !TOWERS[app.invPick]) app.invPick = p.loadout[0] || TOWER_ORDER[0];
    gemText(el.invGems, String(p.gems));
    el.invBack.textContent = app.invFrom === 'stages' ? '← 스테이지' : '← 로비';
    el.invCount.textContent = p.loadout.length + ' / ' + LOADOUT_MAX;

    el.invSlots.textContent = '';
    for (let i = 0; i < LOADOUT_MAX; i++) {
      const type = p.loadout[i];
      if (type) {
        el.invSlots.append(towerCard(type, { slot: true }));
      } else {
        const empty = document.createElement('div');
        empty.className = 'tcard empty';
        empty.textContent = '빈 자리';
        el.invSlots.append(empty);
      }
    }
    el.invGrid.textContent = '';
    for (const type of TOWER_ORDER) el.invGrid.append(towerCard(type, {}));

    /* 고른 탑의 자세한 정보 */
    const type = app.invPick;
    const def = TOWERS[type];
    const have = owns(type);
    const rank = rankOf(type);
    const c = el.invArt.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, el.invArt.width, el.invArt.height);
    for (let lv = 0; lv < 3; lv++) {
      c.save();
      c.translate(el.invArt.width * (0.19 + lv * 0.31), el.invArt.height * 0.76);
      c.scale(122, 122);
      drawTowerSprite(c, type, lv, 0.55, { t: 0.4, charge: 1 });
      c.restore();
    }
    el.invName.textContent = def.name;
    el.invName.append(rarityTag(type));
    if (rank) {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = '등급 +' + rank;
      el.invName.append(tag);
    }
    el.invBlurb.textContent = def.blurb + ' 값 ' + def.levels.map((l) => l.cost).join(' · ') + ' 골드.';
    el.invStats.textContent = '';
    for (const [label, get] of statDefs(type)) {
      const s = document.createElement('span');
      const i = document.createElement('i');
      i.textContent = label;
      s.append(i, [0, 1, 2].map((lv) => get(towerStats(type, lv, rank))).join(' → '));
      el.invStats.append(s);
    }
    el.invRank.textContent = !have
      ? '아직 얻지 못한 탑입니다. 뽑기에서 얻을 수 있습니다.'
      : rank >= MAX_RANK
        ? '등급이 가득 찼습니다(+' + MAX_RANK + '). 위력 +' + Math.round(RANK_BONUS * rank * 100) + '%.'
        : rank
          ? '등급 +' + rank + ' — 위력 +' + Math.round(RANK_BONUS * rank * 100) + '%. 뽑기에서 또 나오면 더 오릅니다.'
          : '뽑기에서 같은 탑이 또 나오면 등급이 올라 더 강해집니다.';
    const on = p.loadout.includes(type);
    el.equip.disabled = !have || (!on && p.loadout.length >= LOADOUT_MAX);
    el.equip.classList.toggle('primary', have && !on);
    el.equip.textContent = !have ? '미보유' : on ? '출전에서 빼기' : p.loadout.length >= LOADOUT_MAX ? '자리가 없습니다 — 먼저 하나를 빼세요' : '출전시키기';
  }

  function toggleEquip() {
    const p = app.profile;
    const type = app.invPick;
    if (!owns(type)) return;
    const i = p.loadout.indexOf(type);
    if (i >= 0) p.loadout.splice(i, 1);
    else if (p.loadout.length < LOADOUT_MAX) p.loadout.push(type);
    else return;
    Sfx.play('equip');
    saveProfile();
    refreshInventory();
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
      cv.width = 270;
      cv.height = 165;
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
    el.mapNote.textContent = map.note + ' 골드 ' + d.gold + ', 목숨 ' + d.lives + '개로 시작합니다. 다섯 웨이브를 넘길 때마다 보석 ' + GEMS.challenge + '개를 얻습니다.';
    el.challengeStart.disabled = !app.profile.loadout.length;
  }

  /* ───── 도감 ───── */

  function buildCodex() {
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
        drawTowerSprite(c, type, lv, 0.55, { t: 0.4, charge: 1 });
        c.restore();
      }
      const body = document.createElement('div');
      const h = document.createElement('h4');
      h.textContent = def.name;
      h.append(rarityTag(type));
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
      body.append(h, p, stats);
      card.append(cv, body);
      el.codexTowers.append(card);
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
        if (!game.stage) {
          record(game, d.wave, false);
          if (d.wave % 5 === 0) {
            addGems(GEMS.challenge);
            app.lastGems += GEMS.challenge;
            toast('보석 ' + GEMS.challenge + '개를 얻었습니다.');
          }
        }
        if (game.phase === 'build') persist(game.serialize());
        break;
      case 'won':
        if (game.stage) {
          const id = game.stage.id;
          const old = starsOf(id);
          const got = game.stars();
          let gems = old ? 0 : GEMS.clear;
          if (got > old) {
            gems += GEMS.star * (got - old);
            app.progress.stars[id] = got;
            store.set(KEY.progress, app.progress);
          }
          if (!gems) gems = GEMS.replay;
          addGems(gems);
          app.lastGems = gems;
        } else {
          record(game, FINAL_WAVE, true);
          addGems(GEMS.challengeWin);
          app.lastGems += GEMS.challengeWin;
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
    app.lastGems = 0;
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
    buildShop(game);
    refreshPanels();
    show('game');
  }

  function squad() {
    const loadout = app.profile.loadout.slice();
    return { loadout, ranks: ranksFor(loadout) };
  }

  function startStage(id) {
    const st = STAGES.find((s) => s.id === id);
    if (!st || !unlocked(id) || !app.profile.loadout.length) return;
    begin(new Game(Object.assign({ stage: id, seed: (Math.random() * 2 ** 31) | 0 }, squad())));
    app.renderer.banner = { title: '스테이지 ' + id, sub: st.name, life: 2.6, max: 2.6 };
    const news = st.newEnemies.length && id > 1 ? '새 괴수 ' + josa(st.newEnemies.map((t) => ENEMIES[t].name).join(', '), '이', '가') + ' 나옵니다. ' : '';
    toast(news + '아래에서 탑을 골라 길가 빈 땅에 세운 뒤 시작을 누르세요.', 6000);
  }

  function startChallenge(mapId, diffId) {
    if (!app.profile.loadout.length) return;
    begin(new Game(Object.assign({ map: mapId || app.settings.map, diff: diffId || app.settings.diff, seed: (Math.random() * 2 ** 31) | 0 }, squad())));
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

  /* ───── 건설 서랍: 이번 판에 데려온 탑들 ───── */

  function buildShop(game) {
    el.shop.textContent = '';
    app.cards = {};
    for (let i = 0; i < LOADOUT_MAX; i++) {
      const type = game.allowed[i];
      if (!type) {
        const empty = document.createElement('div');
        empty.className = 'card empty';
        empty.textContent = '빈 자리';
        el.shop.append(empty);
        continue;
      }
      const def = TOWERS[type];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card r-' + def.rarity;
      card.setAttribute('aria-pressed', 'false');
      card.title = def.blurb;
      const ico = towerCanvas(type, 0, 108, 126);
      ico.className = 'card-ico';
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
    }
  }

  /* 하나만 세울 수 있는 탑이 이미 서 있는가 */
  function placedUnique(type) {
    return !!TOWERS[type].unique && app.game.towers.some((t) => t.type === type);
  }

  /* ───── 선택·건설 ───── */

  function setPlacing(type) {
    const g = app.game;
    if (type && (!g || !g.allowed.includes(type))) return;
    if (type && placedUnique(type)) {
      deny(josa(TOWERS[type].name, '은', '는') + ' 한 판에 하나만 세울 수 있습니다.');
      return;
    }
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
    if (!g || !g.inBounds(tile.x, tile.y)) {
      if (g && !app.placing) select(null);
      return;
    }
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
    const built = g.build(app.placing, tile.x, tile.y);
    if (!built || !(keep && g.gold >= cost) || placedUnique(app.placing)) setPlacing(null);
    app.seen.gold = null;
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
    else if (t.def.learn && t.def.learn[t.level]) toast(t.def.name + ' — 새 공격 「' + t.def.learn[t.level] + '」 습득!', 3200);
    refreshPanels();
  }

  function sellSelected() {
    const t = app.selected;
    if (!t || !app.game) return;
    app.game.sell(t);
    app.seen.gold = null;
    select(null);
  }

  /* 누구를 먼저 노릴지 고를 수 있는 탑인가 */
  const aims = (t) => t.lv.range > 0 && !['aura', 'buff', 'income', 'nova', 'trap', 'strike'].includes(t.def.mech);

  function cycleTarget() {
    const t = app.selected;
    if (!t || !aims(t)) return;
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
    for (const type of Object.keys(app.cards)) app.cards[type].setAttribute('aria-pressed', String(app.placing === type));
    if (app.placing && g) {
      const def = TOWERS[app.placing];
      el.plcName.textContent = def.name;
      fillStats(el.plcStats, statList(app.placing, g.lvOf(app.placing, 0), null));
      el.plcBlurb.textContent = def.blurb;
    }
    const t = app.selected;
    if (t && g) {
      const next = t.def.levels[t.level + 1] ? g.lvOf(t.type, t.level + 1) : null;
      el.selName.textContent = t.def.name;
      el.selLevel.textContent = t.level + 1 + '단';
      const stats = statList(t.type, t.lv, next);
      const learn = next && t.def.learn ? t.def.learn[t.level + 1] : null;
      if (learn) stats.unshift({ label: '새 공격', value: '', next: learn });
      fillStats(el.selStats, stats);
      if (next) {
        el.upgrade.textContent = (learn ? '강화 · ' + learn + ' ' : '강화 ') + next.cost + 'G';
        el.upgrade.disabled = g.gold < next.cost;
      } else {
        el.upgrade.textContent = '최고 단계';
        el.upgrade.disabled = true;
      }
      el.sell.textContent = (t.fresh ? '무르기 +' : '판매 +') + g.sellValue(t) + 'G';
      el.target.hidden = !aims(t);
      el.target.textContent = '조준 · ' + TARGET_MODES.find((m) => m.id === t.mode).name;
    }
  }

  function refresh() {
    const g = app.game;
    setText(el.lives, 'lives', String(g.lives));
    if (setText(el.gold, 'gold', String(g.gold))) {
      for (const type of Object.keys(app.cards)) {
        /* toggle 의 둘째 값이 undefined 면 켜짐·꺼짐이 뒤집히므로 반드시 참·거짓으로 넘긴다 */
        app.cards[type].classList.toggle('poor', Boolean(g.gold < TOWERS[type].levels[0].cost || placedUnique(type)));
      }
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
        : g.wave + '번째 웨이브에서 괴수 떼가 성문을 넘었습니다. 뽑기로 새 탑을 얻거나 편성을 바꿔 다시 도전해 보세요.';
    } else {
      el.resEyebrow.textContent = '도전 모드 · ' + g.map.name;
      el.resTitle.textContent = won ? '성을 지켜냈습니다' : '성문이 뚫렸습니다';
      el.resText.textContent = won
        ? '서른 웨이브를 모두 막아냈습니다. 무한 모드로 이어 가면 괴수가 끝없이 거세집니다.'
        : g.wave + '번째 웨이브에서 괴수 떼가 성문을 넘었습니다.';
    }
    el.resGems.hidden = !app.lastGems;
    if (app.lastGems) gemText(el.resGems, '보석 +' + app.lastGems);
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
    click(el.gachaBtn, () => show('gacha'));
    click(el.invBtn, () => { app.invFrom = 'lobby'; show('inventory'); });
    click(el.challengeBtn, () => show('challenge'));
    click(el.codexBtn, () => show('codex'));
    click(el.stagesBack, () => show('lobby'));
    click(el.gachaBack, () => show('lobby'));
    click(el.invBack, () => show(app.invFrom));
    click(el.challengeBack, () => show('lobby'));
    click(el.codexBack, () => show('lobby'));
    click(el.squadEdit, () => { app.invFrom = 'stages'; show('inventory'); });
    click(el.stageStart, () => startStage(app.pick));
    click(el.challengeStart, () => startChallenge());
    el.pull1.addEventListener('click', () => pull(1));
    el.pull5.addEventListener('click', () => pull(5));
    el.equip.addEventListener('click', toggleEquip);

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
        if (e.code === 'Escape' && app.screen !== 'lobby') show(app.screen === 'inventory' ? app.invFrom : 'lobby');
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
        const type = g.allowed[Number(digit[1]) - 1];
        if (type) setPlacing(app.placing === type ? null : type);
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

  /* 전장은 화면 전체를 덮는다. 상황판 아래, 건설 서랍 위의 자리에 지도가 들어가도록 맞춘다. */
  function layout() {
    if (app.screen === 'stages') drawTrail();
    if (app.screen !== 'game') return;
    const w = el.app.clientWidth;
    const h = el.app.clientHeight;
    if (w < 40 || h < 40) return;
    const box = el.app.getBoundingClientRect();
    const top = el.hud.getBoundingClientRect().bottom - box.top + 4;
    const bottom = box.bottom - el.tray.getBoundingClientRect().top + 6;
    app.renderer.fit(w, h, { top, bottom, side: 4 });
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, Math.max(0, (now - app.last) / 1000) || 0);
    app.last = now;
    app.time += dt;

    if (app.screen !== 'game') {
      sceneTick(dt);
      if (app.screen === 'gacha') drawChest();
      return;
    }
    const g = app.game;
    if (!g) return;

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
    buildStageTrail();
    buildChallenge();
    buildCodex();
    bindInput();
    Sfx.enabled = app.settings.sound;
    el.auto.checked = !!app.settings.auto;
    setSpeed(app.settings.speed);

    if (!(data && data.save && loadGame(data.save))) show('lobby');

    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(layout);
      ro.observe(el.app);
      ro.observe(el.tray);
      ro.observe(el.trail);
    }
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
