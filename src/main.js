import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createSky } from './sky.js';
import { createTerrain, createMorros, createWater, createCityLights } from './terrain.js';
import { createMonumentBase, createCanopy, createPeople, DECK_Y } from './site.js';
import { createClouds } from './clouds.js';
import { createCloudFill } from './cloudfill.js';
import { loadStatue } from './statue.js';
import { createLighting } from './lighting.js';
import { createHud } from './hud.js';
import { createPalette, samplePalette, formatHour } from './timeofday.js';
import { readState, serialize, createWriter } from './state.js';

const TARGET = new THREE.Vector3(0, 13, 0);
const EYE_MIN_Y = DECK_Y + 1.6;      // altura de olho de quem está no mirante
const KEEP_OUT_R = 11.5;             // raio horizontal mínimo: não entra no pedestal
const IDLE_TO_ROTATE = 4.0;

const state = readState();
const writeHash = createWriter();
const timings = { firstFrame: 0, statueReady: 0, firstFrameWithStatue: 0, worldReady: 0, sceneComplete: 0 };
let frameCount = 0;

// ---------------------------------------------------------------- interface
const ui = {
  hour: document.getElementById('hour'),
  clock: document.getElementById('clock'),
  rot: document.getElementById('rot'),
  ciclo: document.getElementById('ciclo'),
  fig: document.getElementById('fig'),
  link: document.getElementById('link'),
  toast: document.getElementById('toast'),
  hint: document.getElementById('hint'),
  loader: document.getElementById('loader'),
  loaderFill: document.getElementById('loader-fill'),
  loaderTxt: document.getElementById('loader-txt'),
};

// O GLB sai na frente de tudo: a rede corre enquanto a CPU monta a cena.
const statuePromise = loadStatue((e) => {
  if (e.lengthComputable) ui.loaderFill.style.width = `${Math.round((e.loaded / e.total) * 100)}%`;
});

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, stencil: false, powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;   // a sombra só recalcula quando o sol muda

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xaec8dd, 0.00013);
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 1.5, 24000);

// ---------------------------------------------------------------- controles
const controls = new OrbitControls(camera, canvas);
controls.target.copy(TARGET);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.minDistance = 22;
controls.maxDistance = 460;
controls.minPolarAngle = 0.20;
controls.maxPolarAngle = Math.PI * 0.995;   // o limite real vem de clampCamera()
controls.autoRotate = false;
controls.autoRotateSpeed = 0.4;
controls.zoomSpeed = 0.8;
controls.rotateSpeed = 0.85;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };

const sphTmp = new THREE.Spherical();
const offTmp = new THREE.Vector3();

function applyView(az, pol, dist) {
  camera.position.setFromSpherical(new THREE.Spherical(dist, pol, az)).add(controls.target);
  camera.lookAt(controls.target);
  controls.update();
}

function clampCamera() {
  offTmp.copy(camera.position).sub(controls.target);
  sphTmp.setFromVector3(offTmp);
  let changed = false;

  // 1) nunca ver por baixo do chão: a câmera não desce do piso do mirante
  const maxPhiFloor = Math.acos(THREE.MathUtils.clamp(
    (EYE_MIN_Y - controls.target.y) / sphTmp.radius, -1, 1));
  if (sphTmp.phi > maxPhiFloor) { sphTmp.phi = maxPhiFloor; changed = true; }

  // 2) nunca entrar no pedestal nem na estátua
  if (sphTmp.phi > Math.PI / 2 && sphTmp.radius * Math.sin(sphTmp.phi) < KEEP_OUT_R) {
    sphTmp.phi = Math.PI - Math.asin(THREE.MathUtils.clamp(KEEP_OUT_R / sphTmp.radius, 0, 1));
    changed = true;
  }
  if (changed) {
    camera.position.setFromSpherical(sphTmp).add(controls.target);
    camera.lookAt(controls.target);
  }
}

applyView(state.az, state.pol, state.dist);

// ---------------------------------------------------------------- cena mínima
// Só o necessário para o primeiro frame sair rápido: céu, luz e o mirante.
const sky = createSky();
scene.add(sky.mesh);
const lighting = createLighting(scene);
const clouds = createClouds();
const cloudFill = createCloudFill();
const base = createMonumentBase();
scene.add(base, clouds.group);

const pal = createPalette();
let statue = null;
let water = null;
let cityLights = null;
let people = null;
let cloudTime = 0;
let cicloOn = !!state.ciclo;
let horaDaSombra = state.hour;
const CICLO_H_POR_S = 1;      // 1 hora de sol por segundo — o dia inteiro em 24 s

function applyHour(h, comSombra = true) {
  samplePalette(h, pal);
  lighting.update(pal);
  scene.fog.color.copy(pal.fog);
  scene.fog.density = pal.fogD;
  renderer.toneMappingExposure = pal.exp;
  if (water) water.update(pal);
  if (cityLights) cityLights.material.opacity = pal.city;
  clouds.update(pal, cloudTime);
  cloudFill.update(pal, cloudTime);
  // O mapa de sombra é caro (2048², 54 k triângulos). Fora do ciclo ele é
  // refeito quando o sol muda; dentro do ciclo, no máximo a cada 0,15 h de sol.
  if (comSombra) { renderer.shadowMap.needsUpdate = true; horaDaSombra = h; }
}
applyHour(state.hour);

// ---------------------------------------------------------------- mundo pesado
// Construído em fatias depois do primeiro frame: o visitante vê a cena nascer
// em vez de encarar tela preta enquanto a CPU gera terreno.
function buildWorld() {
  const steps = [
    () => { const t = createTerrain(); cloudFill.patch(t.material); scene.add(t); },
    () => {
      const m = createMorros(); cloudFill.patch(m.material); scene.add(m);
      water = createWater(cloudFill); scene.add(water.mesh);
    },
    () => { const c = createCanopy(); cloudFill.patch(c.material); scene.add(c); },
    () => { people = createPeople(); people.visible = !!state.fig; scene.add(people); },
    () => { cityLights = createCityLights(); scene.add(cityLights); },
    () => {
      applyHour(state.hour);
      renderer.shadowMap.needsUpdate = true;
      timings.worldReady = performance.now();
    },
  ];
  let i = 0;
  const next = () => {
    if (i >= steps.length) return;
    steps[i++]();
    setTimeout(next, 0);        // um passo por macrotarefa: o loop segue rodando
  };
  next();
}

// ---------------------------------------------------------------- interações
let rotPref = !!state.rot;
// Link que já vem com ciclo=1 não deve esperar os 4 s de ociosidade para girar.
let idle = state.ciclo ? IDLE_TO_ROTATE + 1 : 0;

ui.hour.value = String(state.hour);
ui.clock.textContent = formatHour(state.hour);
ui.rot.setAttribute('aria-pressed', String(rotPref));
ui.fig.setAttribute('aria-pressed', String(!!state.fig));
ui.ciclo.setAttribute('aria-pressed', String(cicloOn));

function setHour(h) {
  state.hour = h;
  ui.hour.value = String(h);
  ui.clock.textContent = formatHour(h);
  applyHour(h);
  writeHash(state);
}
ui.hour.addEventListener('input', () => { setHour(parseFloat(ui.hour.value)); markInteraction(); });
for (const b of document.querySelectorAll('.presets button')) {
  b.addEventListener('click', () => { setHour(parseFloat(b.dataset.hour)); markInteraction(); });
}
ui.rot.addEventListener('click', () => {
  rotPref = !rotPref;
  state.rot = rotPref ? 1 : 0;
  ui.rot.setAttribute('aria-pressed', String(rotPref));
  controls.autoRotate = rotPref && idle > IDLE_TO_ROTATE;
  writeHash(state);
});
ui.fig.addEventListener('click', () => {
  state.fig = state.fig ? 0 : 1;
  if (people) people.visible = !!state.fig;
  ui.fig.setAttribute('aria-pressed', String(!!state.fig));
  writeHash(state);
});
// Modo ciclo: mantém o giro e faz a hora andar sozinha.
function setCiclo(on) {
  cicloOn = on;
  state.ciclo = on ? 1 : 0;
  ui.ciclo.setAttribute('aria-pressed', String(on));
  if (on) {
    rotPref = true;
    state.rot = 1;
    ui.rot.setAttribute('aria-pressed', 'true');
    controls.autoRotate = true;
    idle = IDLE_TO_ROTATE + 1;      // o giro entra na hora, sem esperar os 4 s
  }
  writeHash(state);
}
ui.ciclo.addEventListener('click', () => setCiclo(!cicloOn));

ui.link.addEventListener('click', async () => {
  const url = location.origin + location.pathname + serialize(state);
  try { await navigator.clipboard.writeText(url); }
  catch { window.prompt('Copie o link desta vista:', url); return; }
  ui.toast.classList.add('on');
  setTimeout(() => ui.toast.classList.remove('on'), 1400);
});

function markInteraction() {
  idle = 0;
  controls.autoRotate = false;
  ui.hint.classList.add('off');
}
for (const ev of ['pointerdown', 'wheel', 'touchstart', 'keydown']) {
  window.addEventListener(ev, markInteraction, { passive: true });
}
setTimeout(() => ui.hint.classList.add('off'), 9000);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
});

// ---------------------------------------------------------------- loop
const hud = createHud(renderer);
const timer = new THREE.Timer();
let running = true;
let rafId = 0;
let probe = null;

function tick(ts) {
  // Guarda no próprio loop, e não só no evento: o frame que já estava agendado
  // quando a aba sumiu morre aqui, sem desenhar e sem reagendar.
  if (document.hidden) { running = false; return; }
  rafId = requestAnimationFrame(tick);
  timer.update(ts);
  const dt = Math.min(timer.getDelta(), 0.1);
  cloudTime += dt;

  idle += dt;
  if (rotPref && idle > IDLE_TO_ROTATE) controls.autoRotate = true;

  if (cicloOn) {
    const h = (state.hour + dt * CICLO_H_POR_S) % 24;
    state.hour = h;
    ui.hour.value = String(h.toFixed(2));
    ui.clock.textContent = formatHour(h);
    let dh = Math.abs(h - horaDaSombra);
    if (dh > 12) dh = 24 - dh;                    // vira a meia-noite
    applyHour(h, dh > 0.15);
  }

  controls.update();
  clampCamera();
  clouds.update(pal, cloudTime);
  cloudFill.uniforms.uTime.value = cloudTime;
  sky.update(pal, camera, cloudTime);

  renderer.render(scene, camera);
  frameCount++;

  if (!timings.firstFrame) timings.firstFrame = performance.now();
  if (statue && !timings.firstFrameWithStatue) timings.firstFrameWithStatue = performance.now();
  if (statue && timings.worldReady && !timings.sceneComplete) timings.sceneComplete = performance.now();

  hud.frame(dt);
  if (probe) {
    probe.samples.push(dt);
    probe.calls = renderer.info.render.calls;
    probe.triangles = renderer.info.render.triangles;
  }

  offTmp.copy(camera.position).sub(controls.target);
  sphTmp.setFromVector3(offTmp);
  state.az = sphTmp.theta; state.pol = sphTmp.phi; state.dist = sphTmp.radius;
  writeHash(state, cicloOn ? 2000 : 350);
}

document.addEventListener('visibilitychange', () => {
  // Aba oculta: nada de requestAnimationFrame rodando à toa.
  if (document.hidden && running) { cancelAnimationFrame(rafId); running = false; }
  else if (!document.hidden && !running) { running = true; timer.reset(); rafId = requestAnimationFrame(tick); }
});

rafId = requestAnimationFrame(tick);
// O mundo pesado só começa depois que a estátua entra na cena: nada de terreno
// segurando a fila do main thread enquanto o GLB espera para ser adicionado.
let worldStarted = false;
function startWorld() { if (!worldStarted) { worldStarted = true; setTimeout(buildWorld, 0); } }
setTimeout(startWorld, 2500);   // rede lenta ou GLB quebrado não podem travar a cena

// ---------------------------------------------------------------- estátua
statuePromise.then(({ root }) => {
  statue = root;
  scene.add(statue);
  renderer.shadowMap.needsUpdate = true;
  timings.statueReady = performance.now();
  startWorld();
  ui.loaderFill.style.width = '100%';
  ui.loader.classList.add('off');
  setTimeout(() => { ui.loader.style.display = 'none'; }, 600);
}).catch((err) => {
  console.error(err);
  startWorld();
  ui.loaderTxt.textContent = 'falhou ao carregar o modelo — veja o console';
});

// ---------------------------------------------------------------- captura
// API mínima para o script de captura: vistas determinísticas e medição.
window.__SCENE = scene;   // gancho de inspeção
window.__FILL = cloudFill;
window.__CRISTO = {
  get ready() { return !!(statue && timings.sceneComplete); },
  timings,
  setView({ az, pol, dist, hour, fig, rot, ciclo }) {
    if (ciclo !== undefined) setCiclo(!!ciclo);
    if (hour !== undefined) setHour(hour);
    if (fig !== undefined) { state.fig = fig ? 1 : 0; if (people) people.visible = !!fig; }
    if (rot !== undefined) { rotPref = !!rot; controls.autoRotate = !!rot; idle = rot ? 99 : 0; }
    if (az !== undefined) applyView(az, pol, dist);
    clampCamera();
    controls.update();
  },
  startProbe(ms) {
    probe = { samples: [], calls: 0, triangles: 0 };
    return new Promise((resolve) => setTimeout(() => {
      const s = probe.samples.slice(3);            // descarta a largada
      const sorted = [...s].sort((a, b) => a - b);
      const mean = s.reduce((a, b) => a + b, 0) / s.length;
      resolve({
        frames: s.length,
        avgFps: 1 / mean,
        medianFrameMs: sorted[Math.floor(sorted.length / 2)] * 1000,
        p95FrameMs: sorted[Math.floor(sorted.length * 0.95)] * 1000,
        worstFrameMs: sorted[sorted.length - 1] * 1000,
        calls: probe.calls,
        triangles: probe.triangles,
      });
      probe = null;
    }, ms));
  },
  // Calibração de CPU: um laço fixo, sempre o mesmo. Serve para provar que o
  // estrangulamento do DevTools Protocol foi de fato aplicado na medição.
  cpuBench() {
    const t0 = performance.now();
    let acc = 0;
    for (let i = 0; i < 4_000_000; i++) acc += Math.sqrt(i % 977) * 1.0000001;
    return { ms: performance.now() - t0, acc };
  },
  metrics() {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      programs: renderer.info.programs.length,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      transferred: hud.transferred(),
      frames: frameCount,
      autoRotate: controls.autoRotate,
      camera: camera.position.toArray().map((v) => +v.toFixed(3)),
      spherical: { az: +state.az.toFixed(4), pol: +state.pol.toFixed(4), dist: +state.dist.toFixed(2) },
      hour: state.hour, figuras: !!(people && people.visible),
      ciclo: cicloOn, hash: location.hash,
      timings: { ...timings },
      firstFrameMs: timings.firstFrame,
      firstFrameWithStatueMs: timings.firstFrameWithStatue,
      sceneCompleteMs: timings.sceneComplete,
      renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'desconhecido',
    };
  },
};
