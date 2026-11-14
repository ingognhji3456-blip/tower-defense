#!/usr/bin/env node
'use strict';
/* index.html 과 css·js 를 파일 하나로 묶는다. 묶은 파일은 그것만 보내거나 올려도 그대로 실행된다.
   사용법: node tools/bundle.js [출력 경로] [--fragment]
   --fragment 는 <html>·<head>·<body> 껍데기 없이 내용만 낸다(껍데기를 따로 씌워 주는 곳에 올릴 때). */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const fragment = args.includes('--fragment');
const outFile = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(root, 'dist', 'tower-defense.html'));
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

let html = read('index.html');

const style = '<style>\n' + read('css/style.css') + '</style>';
html = html.replace(/<link rel="stylesheet" href="css\/[^"]+">/, () => style);

const sources = [];
html = html.replace(/<script src="(js\/[^"]+)"><\/script>\n?/g, (m, src) => {
  sources.push(read(src));
  return sources.length === 1 ? '<!--scripts-->' : '';
});
const script = '<script>\n' + sources.join('\n') + '</script>\n';
if (script.slice(8, -10).includes('</script')) throw new Error('스크립트 안에 </script 가 들어 있어 한 파일로 묶을 수 없습니다.');
html = html.replace('<!--scripts-->', () => script);

if (fragment) {
  const title = /<title>[^<]*<\/title>/.exec(html)[0];
  const fonts = /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/.exec(html)[0];
  const body = /<body>\n?([\s\S]*)<\/body>/.exec(html)[1];
  html = [title, '<meta name="claude:viewport-fit-sides" content="cover">', fonts, style, body].join('\n');
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, html);
console.log(path.relative(process.cwd(), outFile) + ' — ' + (Buffer.byteLength(html) / 1024).toFixed(1) + ' KB');
