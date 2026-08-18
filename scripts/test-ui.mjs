// Testes de interface e controle — itens 8, 14, 15 e 16 da rubrica.
// Nada aqui é opinião: cada item vira um par (esperado, medido).
//
// uso: node scripts/test-ui.mjs --round=r1
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || `=${d}`).split('=')[1];
const ROUND = arg('round', 'r1');
const OUT = path.join(ROOT, 'shots', ROUND);
fs.mkdirSync(OUT, { recursive: true });

const DECK_Y = -9.2;               // piso do mirante, igual ao src/site.js
const results = [];
function check(nome, ok, detalhe) {
  results.push({ nome, ok, detalhe });
  console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${nome} — ${detalhe}`);
}

const server = await startServer(5174);
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=metal', '--enable-gpu'] });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1,
  permissions: ['clipboard-read', 'clipboard-write'],
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${server.url}/index.html#hour=12&az=0.4&pol=1.3&dist=96&fig=1&rot=1`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__CRISTO && window.__CRISTO.ready, null, { timeout: 60000 });

console.log('\n[14] controles: chão e pedestal');
// aproxima ao máximo e só então força a câmera para baixo: é o pior caso,
// perto do pedestal e olhando de baixo
await page.mouse.move(720, 450);
for (let i = 0; i < 40; i++) await page.mouse.wheel(0, -240);
await page.waitForTimeout(400);
await page.mouse.down();
for (let i = 0; i < 30; i++) await page.mouse.move(720, 450 - i * 60);   // arrasta para cima = câmera desce
await page.mouse.up();
await page.waitForTimeout(700);
let m = await page.evaluate(() => window.__CRISTO.metrics());
check('câmera nunca desce do piso do mirante', m.camera[1] >= DECK_Y + 1.4,
  `y = ${m.camera[1].toFixed(2)} m (piso ${DECK_Y}, mínimo esperado ${(DECK_Y + 1.6).toFixed(1)})`);
let hr = Math.hypot(m.camera[0], m.camera[2]);
check('câmera nunca entra no pedestal', !(m.camera[1] < 2 && hr < 11),
  `raio horizontal ${hr.toFixed(1)} m a y = ${m.camera[1].toFixed(1)} m (pedestal tem 8 m de raio)`);

m = await page.evaluate(() => window.__CRISTO.metrics());
check('distância mínima respeitada', m.spherical.dist >= 21.9,
  `${m.spherical.dist.toFixed(1)} m do centro da estátua (mínimo 22)`);

console.log('\n[15] auto-rotate');
await page.evaluate(() => window.__CRISTO.setView({ az: 0.4, pol: 1.3, dist: 96, rot: 1 }));
await page.mouse.move(700, 400);
await page.mouse.down(); await page.mouse.up();       // interação: zera o ocioso
const az0 = (await page.evaluate(() => window.__CRISTO.metrics())).spherical.az;
await page.waitForTimeout(2500);
const az2s = (await page.evaluate(() => window.__CRISTO.metrics())).spherical.az;
check('parado antes de 4 s de ociosidade', Math.abs(az2s - az0) < 0.01,
  `azimute variou ${(az2s - az0).toFixed(4)} rad em 2,5 s`);
await page.waitForTimeout(3200);
const az6s = (await page.evaluate(() => window.__CRISTO.metrics())).spherical.az;
check('liga sozinho depois de 4 s', Math.abs(az6s - az2s) > 0.02,
  `azimute variou ${(az6s - az2s).toFixed(4)} rad entre 2,5 s e 5,7 s`);
await page.mouse.move(700, 400); await page.mouse.down(); await page.mouse.up();
await page.waitForTimeout(1000);          // o amortecimento tem um rabo de inércia, por projeto
const azA = (await page.evaluate(() => window.__CRISTO.metrics())).spherical.az;
await page.waitForTimeout(1200);
const azB = (await page.evaluate(() => window.__CRISTO.metrics())).spherical.az;
check('desliga ao primeiro clique', Math.abs(azB - azA) < 0.004,
  `parado 1 s depois do clique: azimute variou ${(azB - azA).toFixed(4)} rad em 1,2 s ` +
  `(auto-rotate anda ~0,050 rad no mesmo tempo)`);
await page.click('#rot');
await page.waitForTimeout(5200);
const azC = (await page.evaluate(() => window.__CRISTO.metrics())).spherical.az;
await page.waitForTimeout(1500);
const azD = (await page.evaluate(() => window.__CRISTO.metrics())).spherical.az;
check('botão desliga de vez', Math.abs(azD - azC) < 0.01,
  `com o botão desligado, azimute variou ${(azD - azC).toFixed(4)} rad em 1,5 s`);
await page.click('#rot');   // volta ao padrão

console.log('\n[ciclo] hora andando 1 h/s com o giro ligado');
await page.evaluate(() => window.__CRISTO.setView({ az: 0.4, pol: 1.4, dist: 150, hour: 5, ciclo: 1 }));
await page.waitForTimeout(300);
const c0 = await page.evaluate(() => window.__CRISTO.metrics());
await page.waitForTimeout(3000);
const c1 = await page.evaluate(() => window.__CRISTO.metrics());
const andou = ((c1.hour - c0.hour) + 24) % 24;
check('a hora anda ~1 h por segundo', andou > 2.6 && andou < 3.4,
  `${andou.toFixed(2)} h em 3,0 s (hora ${c0.hour.toFixed(2)} → ${c1.hour.toFixed(2)})`);
check('o giro continua no ciclo', Math.abs(c1.spherical.az - c0.spherical.az) > 0.05 && c1.ciclo,
  `azimute variou ${(c1.spherical.az - c0.spherical.az).toFixed(3)} rad, ciclo=${c1.ciclo}`);
await page.click('#ciclo');
await page.waitForTimeout(1200);
const c2 = await page.evaluate(() => window.__CRISTO.metrics());
await page.waitForTimeout(1200);
const c3 = await page.evaluate(() => window.__CRISTO.metrics());
check('o botão para o ciclo e a hora congela', Math.abs(c3.hour - c2.hour) < 0.02 && !c3.ciclo,
  `hora ${c2.hour.toFixed(2)} → ${c3.hour.toFixed(2)} em 1,2 s, ciclo=${c3.ciclo}`);

console.log('\n[16] link profundo');
await page.evaluate(() => window.__CRISTO.setView({ az: 1.234, pol: 1.111, dist: 143.5, hour: 17.5, fig: 0, rot: 0, ciclo: 0 }));
await page.waitForTimeout(900);
await page.click('#link');
const copiado = await page.evaluate(() => navigator.clipboard.readText());
const origem = await page.evaluate(() => window.__CRISTO.metrics());
const page2 = await context.newPage();
await page2.goto(copiado, { waitUntil: 'load' });
await page2.waitForFunction(() => window.__CRISTO && window.__CRISTO.ready, null, { timeout: 60000 });
await page2.waitForTimeout(500);
const destino = await page2.evaluate(() => window.__CRISTO.metrics());
const dCam = Math.hypot(...origem.camera.map((v, i) => v - destino.camera[i]));
check('link copiado restaura a câmera', dCam < 0.5,
  `${copiado.split('#')[1]} → diferença de ${dCam.toFixed(3)} m na posição da câmera`);
check('link restaura hora e toggles', origem.hour === destino.hour && origem.figuras === destino.figuras,
  `hora ${origem.hour} → ${destino.hour}; figuras ${origem.figuras} → ${destino.figuras}`);
await page2.close();

console.log('\n[restrição] aba oculta pausa o rAF');
const f0 = (await page.evaluate(() => window.__CRISTO.metrics())).frames;
await page.evaluate(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  document.dispatchEvent(new Event('visibilitychange'));
});
await page.waitForTimeout(1200);
const f1 = (await page.evaluate(() => window.__CRISTO.metrics())).frames;
check('nada de rAF com a aba oculta', f1 - f0 <= 1, `${f1 - f0} frames desenhados em 1,2 s de aba oculta`);
await page.evaluate(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  document.dispatchEvent(new Event('visibilitychange'));
});
await page.waitForTimeout(600);
const f2 = (await page.evaluate(() => window.__CRISTO.metrics())).frames;
check('volta a desenhar ao reaparecer', f2 - f1 > 5, `${f2 - f1} frames em 0,6 s depois de voltar`);

console.log('\n[toque] um dedo orbita, dois dedos dão zoom (iPhone 14 Pro)');
const tctx = await browser.newContext({
  viewport: { width: 393, height: 852 }, deviceScaleFactor: 3,
  hasTouch: true, isMobile: true,
});
const tpage = await tctx.newPage();
await tpage.goto(`${server.url}/index.html#hour=12&az=0.4&pol=1.3&dist=96&fig=1&rot=0`, { waitUntil: 'load' });
await tpage.waitForFunction(() => window.__CRISTO && window.__CRISTO.ready, null, { timeout: 60000 });
const tcdp = await tctx.newCDPSession(tpage);
const toque = (type, pts) => tcdp.send('Input.dispatchTouchEvent', {
  type, touchPoints: pts.map((p) => ({ x: p[0], y: p[1], radiusX: 8, radiusY: 8, force: 1 })) });

// um dedo: órbita
const antesAz = (await tpage.evaluate(() => window.__CRISTO.metrics())).spherical;
await toque('touchStart', [[200, 400]]);
for (let i = 1; i <= 8; i++) await toque('touchMove', [[200 + i * 14, 400]]);
await toque('touchEnd', []);
await tpage.waitForTimeout(600);
const depoisAz = (await tpage.evaluate(() => window.__CRISTO.metrics())).spherical;
check('um dedo orbita', Math.abs(depoisAz.az - antesAz.az) > 0.05,
  `azimute ${antesAz.az.toFixed(3)} → ${depoisAz.az.toFixed(3)} rad`);

// dois dedos: pinça = zoom
const antesD = (await tpage.evaluate(() => window.__CRISTO.metrics())).spherical.dist;
await toque('touchStart', [[150, 400], [250, 400]]);
for (let i = 1; i <= 8; i++) await toque('touchMove', [[150 - i * 10, 400], [250 + i * 10, 400]]);
await toque('touchEnd', []);
await tpage.waitForTimeout(700);
const depoisD = (await tpage.evaluate(() => window.__CRISTO.metrics())).spherical.dist;
check('pinça aproxima', depoisD < antesD - 2,
  `distância ${antesD.toFixed(1)} → ${depoisD.toFixed(1)} m`);
await tpage.screenshot({ path: path.join(OUT, 'mobile-393x852.png') });
await tctx.close();

console.log('\n[8] recortes a 200% para inspeção de serrilhado');
const zoom = await context.newPage();
await zoom.setViewportSize({ width: 1920, height: 1080 });
await zoom.goto(`${server.url}/index.html#hour=12&az=0.2&pol=1.42&dist=52&fig=1&rot=0`, { waitUntil: 'load' });
await zoom.waitForFunction(() => window.__CRISTO && window.__CRISTO.ready, null, { timeout: 60000 });
await zoom.waitForTimeout(1200);
await zoom.screenshot({ path: path.join(OUT, 'zoom-borda-braco.png'), clip: { x: 640, y: 250, width: 480, height: 270 } });
await zoom.goto(`${server.url}/index.html#hour=17.5&az=0.9&pol=1.9&dist=40&fig=1&rot=0`, { waitUntil: 'load' });
await zoom.waitForFunction(() => window.__CRISTO && window.__CRISTO.ready, null, { timeout: 60000 });
await zoom.waitForTimeout(1200);
await zoom.screenshot({ path: path.join(OUT, 'zoom-pedestal.png'), clip: { x: 700, y: 500, width: 480, height: 270 } });
console.log('  recortes salvos');
await zoom.close();

check('sem erro de página durante os testes', errors.length === 0, errors.length ? errors[0].slice(0, 160) : 'nenhum');

fs.writeFileSync(path.join(OUT, 'test-ui.json'), JSON.stringify({ round: ROUND, results }, null, 2));
const falhas = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - falhas}/${results.length} verificações passaram\n`);
await browser.close();
await server.close();
