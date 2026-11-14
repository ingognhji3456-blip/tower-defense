#!/usr/bin/env node
'use strict';
/* 그림 점검판을 PNG 로 뽑는다. Playwright(Chromium) 가 있어야 한다.

   node tools/art-preview.js tower cannon     → dist/art/tower-cannon-sheet.png (크게, 규격선 포함)
                                                dist/art/tower-cannon-game.png  (실제 게임 크기, 2배 선명도)
   node tools/art-preview.js enemy wolf
   node tools/art-preview.js terrain
   node tools/art-preview.js all              → dist/art/all-sheet.png (전부 모아 보기)
   node tools/art-preview.js all "" 이름       → dist/art/all-이름-sheet.png (여럿이 동시에 뽑을 때 겹치지 않게)

   칠해진 범위·그리기 시간·실행 오류를 함께 출력한다. */

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const [kind = 'all', id = '', tag = ''] = process.argv.slice(2);
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'dist', 'art');
const base = path.join(outDir, kind + (id ? '-' + id : '') + (tag ? '-' + tag : ''));

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 1 });
  const problems = [];
  page.on('pageerror', (e) => problems.push('오류: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|ERR_FILE_NOT_FOUND/.test(m.text())) problems.push('콘솔: ' + m.text());
  });
  await page.goto('file://' + path.join(root, 'tools', 'art-preview.html') + '?kind=' + kind + '&id=' + id);
  await page.waitForFunction(() => window.__done === true, null, { timeout: 30000 });
  const report = await page.evaluate(() => window.__report);

  await page.locator('#sheet').screenshot({ path: base + '-sheet.png' });
  console.log(path.relative(process.cwd(), base + '-sheet.png'));
  if (await page.locator('#game').count()) {
    /* 실제 크기 그림은 휴대폰 화면처럼 2배 선명도로 한 번 더 뽑는다 */
    const sharp = await browser.newPage({ viewport: { width: 800, height: 700 }, deviceScaleFactor: 2 });
    await sharp.goto('file://' + path.join(root, 'tools', 'art-preview.html') + '?kind=' + kind + '&id=' + id);
    await sharp.waitForFunction(() => window.__done === true, null, { timeout: 30000 });
    await sharp.locator('#game').screenshot({ path: base + '-game.png' });
    console.log(path.relative(process.cwd(), base + '-game.png'));
  }
  for (const line of report.lines) console.log(line);
  const all = problems.concat(report.errors.map((e) => '오류: ' + e));
  if (all.length) {
    console.log('── 문제 ' + all.length + '건 ──');
    for (const p of [...new Set(all)]) console.log(p);
    process.exitCode = 1;
  } else {
    console.log('실행 오류 없음');
  }
  await browser.close();
})();
