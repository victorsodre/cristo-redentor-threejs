// Captura os 4 ângulos fixos do gauntlet e mede desempenho.
//
// Regras de medição (do prompt):
//  · sequencial — um browser por vez, aberto e fechado; nunca em paralelo
//  · duas condições — nativa e CPU estrangulada em 4x via DevTools Protocol
//  · nenhum número inventado: tudo que sai daqui foi medido
//
// uso: node scripts/capture.mjs --round=r1 [--only=shots|perf]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || `=${d}`).split('=')[1];
const ROUND = arg('round', 'r1');
const ONLY = arg('only', 'tudo');
const PORT = 5173;
const OUT = path.join(ROOT, 'shots', ROUND);
fs.mkdirSync(OUT, { recursive: true });

// Os mesmos quatro ângulos em toda rodada — é o que torna as rodadas comparáveis.
const VIEWS = [
  { id: 'A-frente',   ref: '01-frente.jpg',        hour: 12,   az: 0.00, pol: 1.470, dist: 70,  fig: 1,
    nota: 'frontal, altura do peito' },
  { id: 'B-lateral',  ref: '02-lateral.jpg',       hour: 12,   az: 1.5708, pol: 1.470, dist: 70,  fig: 1,
    nota: '90 graus lateral' },
  { id: 'C-base',     ref: '03-contra-plongee.jpg', hour: 17.5, az: 0.35, pol: 2.105, dist: 38.3, fig: 1,
    nota: 'contra-plongee logo acima do parapeito, com o mirante no quadro' },
  { id: 'D-ambiente', ref: '04-sobre-nuvens.jpg',  hour: 17.5, az: -0.32, pol: 1.440, dist: 165, fig: 1,
    nota: 'tres quartos afastada, mar de nuvens e sol rasante' },
  { id: 'E-noite',    ref: '06-noite.jpg',         hour: 21,   az: 0.55, pol: 1.430, dist: 120, fig: 1,
    nota: 'extra: noite, estatua iluminada por baixo' },
  // A rubrica pede a figura humana visível em C-base. Com o alvo da órbita no
  // peito da estátua, um contra-plongée de verdade nunca alcança o piso do
  // mirante: o quadro inteiro fica acima da horizontal. Em vez de estragar a
  // C (que é a comparação com a 03), a escala se prova aqui.
  { id: 'F-escala',   ref: '02-lateral.jpg',       hour: 12,   az: 0.90, pol: 1.520, dist: 105, fig: 1,
    nota: 'prova de escala: figuras de 1,75 m no mirante, estatua inteira' },
];

const GPU_ARGS = [
  '--use-angle=metal',
  '--enable-gpu',
  '--ignore-gpu-blocklist',
  '--enable-zero-copy',
];
// Sem teto de vsync o frame mede o custo real de desenho — mas o mesmo flag
// satura a fila da GPU durante a carga e atrasa em ~3,6 s a compilação do
// shader da estátua (medido em A/B). Por isso ele entra só na prova de fps,
// nunca na de carga.
const SEM_VSYNC = '--disable-frame-rate-limit';

function log(...a) { console.log(...a); }

async function open({ cpu = 0, net = null, semVsync = false } = {}) {
  const browser = await chromium.launch({
    channel: 'chromium', args: semVsync ? [...GPU_ARGS, SEM_VSYNC] : GPU_ARGS });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const cdp = await context.newCDPSession(page);
  if (cpu) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  if (net) {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', net);
  }
  return { browser, page, errors, cdp };
}

async function waitReady(page, timeout = 90000) {
  await page.waitForFunction(() => window.__CRISTO && window.__CRISTO.ready, null, { timeout });
}

async function shots(url) {
  const results = [];
  for (const v of VIEWS) {
    const { browser, page, errors } = await open();
    await page.goto(`${url}/index.html#hour=${v.hour}&az=${v.az}&pol=${v.pol}&dist=${v.dist}&fig=${v.fig}&rot=0`,
      { waitUntil: 'load' });
    await waitReady(page);
    await page.evaluate((view) => {
      window.__CRISTO.setView(view);
      document.getElementById('hint').classList.add('off');   // a dica some sozinha em 9 s
    }, v);
    await page.waitForTimeout(900);              // nuvens e sombra assentam
    const abs = path.join(OUT, `${v.id}.png`);
    await page.screenshot({ path: abs });
    const m = await page.evaluate(() => window.__CRISTO.metrics());
    results.push({
      id: v.id,
      file: `shots/${ROUND}/${v.id}.png`,
      metrics: m,
      errors,
    });
    log(`  ${v.id.padEnd(11)} ok — ${m.calls} draw calls, ${m.triangles.toLocaleString('pt-BR')} tri` +
        (errors.length ? `  ERROS: ${errors.length}` : ''));
    if (errors.length) errors.slice(0, 4).forEach((e) => log('     ! ' + e.slice(0, 200)));
    await browser.close();                        // fecha antes do próximo
  }
  return results;
}

async function perfPass(url, label, opts, ciclo = false) {
  const { browser, page, errors } = await open({ ...opts, semVsync: true });
  const t0 = Date.now();
  await page.goto(`${url}/index.html#hour=17.5&az=2.35&pol=1.25&dist=190&fig=1&rot=0`, { waitUntil: 'load' });
  await waitReady(page);
  const load = await page.evaluate(() => window.__CRISTO.metrics());
  const bench = await page.evaluate(() => window.__CRISTO.cpuBench());
  await page.evaluate((c) => window.__CRISTO.setView({ rot: 1, ciclo: c }), ciclo);
  await page.waitForTimeout(500);
  const probe = await page.evaluate(() => window.__CRISTO.startProbe(10000));
  const after = await page.evaluate(() => window.__CRISTO.metrics());
  await browser.close();
  const out = {
    label,
    condicao: { ...opts, semVsync: true, ciclo },
    wallMs: Date.now() - t0,
    gl: load.renderer,
    firstFrameMs: load.firstFrameMs,
    firstFrameWithStatueMs: load.firstFrameWithStatueMs,
    transferredBytes: after.transferred,
    cpuBenchMs: bench.ms,
    ...probe,
    errors,
  };
  log(`  ${label}: ${out.avgFps.toFixed(1)} fps média · frame mediano ${out.medianFrameMs.toFixed(2)} ms` +
      ` · p95 ${out.p95FrameMs.toFixed(2)} ms · ${out.calls} calls · ${(out.transferredBytes / 1048576).toFixed(2)} MB`);
  log(`     GL: ${out.gl} · laço de calibração de CPU: ${out.cpuBenchMs.toFixed(0)} ms`);
  return out;
}

// Primeiro frame em 4G — browser novo, cache frio, rede emulada.
async function loadPass(url, label, net) {
  const { browser, page, errors } = await open({ net });
  await page.goto(`${url}/index.html#hour=12&az=0&pol=1.47&dist=70&fig=1&rot=0`, { waitUntil: 'commit' });
  await waitReady(page);
  const m = await page.evaluate(() => window.__CRISTO.metrics());
  await browser.close();
  const out = {
    label, rede: net,
    firstFrameMs: m.firstFrameMs,
    firstFrameWithStatueMs: m.firstFrameWithStatueMs,
    transferredBytes: m.transferred,
    errors,
  };
  log(`  ${label}: 1º frame ${out.firstFrameMs.toFixed(0)} ms · com a estátua ${out.firstFrameWithStatueMs.toFixed(0)} ms` +
      ` · ${(out.transferredBytes / 1048576).toFixed(3)} MB`);
  return out;
}

// Folha de comparação: captura ao lado da referência, mesmo tamanho.
async function compare(url) {
  const { browser, page } = await open();
  for (const v of VIEWS) {
    const q = new URLSearchParams({
      a: `/shots/${ROUND}/${v.id}.png`, b: `/ref/${v.ref}`,
      la: `captura ${ROUND} · ${v.id} · ${v.nota}`, lb: `referência · ${v.ref}`,
    });
    await page.goto(`${url}/scripts/compare.html?${q}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
    const el = await page.$('.row');
    await el.screenshot({ path: path.join(OUT, `cmp-${v.id}.png`) });
  }
  await browser.close();
  log('  folhas de comparação geradas');
}

// Os quatro marcos de hora, da mesma câmera: é a prova de que o controle move
// a luz de verdade, e não só o texto do relógio.
const MARCOS = [
  { h: 6,    id: '06h',   rot: '06h — amanhecer, sol rasante pelo leste' },
  { h: 12,   id: '12h',   rot: '12h — sol alto, sombra curta' },
  { h: 17.5, id: '17h30', rot: '17h30 — golden hour' },
  { h: 21,   id: '21h',   rot: '21h — noite, estátua iluminada por baixo' },
];
async function marcos(url) {
  const { browser, page } = await open();
  const files = [];
  for (const m of MARCOS) {
    // Trocar só o hash não recarrega a página: a vista tem de ser aplicada
    // pela API, senão as quatro capturas saem todas na mesma hora.
    await page.goto(`${url}/index.html#hour=${m.h}&az=0.42&pol=1.40&dist=150&fig=1&rot=0`, { waitUntil: 'load' });
    await waitReady(page);
    await page.evaluate((h) => {
      window.__CRISTO.setView({ hour: h, az: 0.42, pol: 1.40, dist: 150, fig: 1, rot: 0 });
      document.getElementById('hint').classList.add('off');
    }, m.h);
    await page.waitForTimeout(900);
    const f = `marco-${m.id}.png`;
    await page.screenshot({ path: path.join(OUT, f) });
    files.push(`i=${encodeURIComponent(`/shots/${ROUND}/${f}|${m.rot}`)}`);
  }
  await page.setViewportSize({ width: 1920, height: 1120 });
  await page.goto(`${url}/scripts/grade.html?${files.join('&')}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  await (await page.$('.g')).screenshot({ path: path.join(OUT, 'marcos-hora.png') });
  await browser.close();
  log('  marcos de hora gerados');
}

const server = await startServer(PORT);
log(`\n=== rodada ${ROUND} — servidor em ${server.url} ===\n`);
const anterior = fs.existsSync(path.join(OUT, 'metrics.json'))
  ? JSON.parse(fs.readFileSync(path.join(OUT, 'metrics.json'), 'utf8')) : {};
const report = { ...anterior, round: ROUND, quando: new Date().toISOString(), views: VIEWS };

// fases: tudo | shots | marcos | fps | rede
const roda = (fase) => ONLY === 'tudo' || ONLY === fase || (ONLY === 'perf' && (fase === 'fps' || fase === 'rede'));

try {
  if (roda('shots')) {
    log('[1] capturas (sequenciais)');
    report.shots = await shots(server.url);
    await compare(server.url);
  }
  if (roda('shots') || roda('marcos')) await marcos(server.url);
  if (roda('fps')) {
    log('\n[2] desempenho — condição nativa (1920x1080, sem estrangulamento)');
    report.nativa = await perfPass(server.url, 'nativa', {});
    log('\n[3] desempenho — CPU estrangulada 4x');
    report.estrangulada = await perfPass(server.url, 'cpu-4x', { cpu: 4 });
  }
  if (roda('ciclo')) {
    // Modo ciclo: giro ligado e hora andando 1 h/s. A sombra é refeita a cada
    // 0,15 h de sol (~7x por segundo), então o custo é maior — medido, não
    // estimado. As draw calls sobem porque o passe de sombra entra na conta.
    log('\n[5] desempenho no modo ciclo (giro + hora andando 1 h/s)');
    report.ciclo = await perfPass(server.url, 'ciclo-24h', {}, true);
  }
  if (roda('rede')) {
    log('\n[4] carga em 4G rápido (4 Mbps, 20 ms RTT), cache frio — 3 medições');
    const rede = { offline: false, downloadThroughput: (4 * 1024 * 1024) / 8,
      uploadThroughput: (3 * 1024 * 1024) / 8, latency: 20 };
    const passes = [];
    for (let i = 0; i < 3; i++) passes.push(await loadPass(server.url, `4g-rapido #${i + 1}`, rede));
    const med = (k) => passes.map((p) => p[k]).sort((a, b) => a - b)[1];
    report.rede4g = {
      medicoes: passes,
      medianaFirstFrameMs: med('firstFrameMs'),
      medianaFirstFrameWithStatueMs: med('firstFrameWithStatueMs'),
      transferredBytes: passes[0].transferredBytes,
    };
    log(`  mediana de 3: 1º frame ${report.rede4g.medianaFirstFrameMs.toFixed(0)} ms · ` +
        `com a estátua ${report.rede4g.medianaFirstFrameWithStatueMs.toFixed(0)} ms`);
  }
} finally {
  fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(report, null, 2));
  await server.close();
  log(`\nrelatório: shots/${ROUND}/metrics.json\n`);
}
