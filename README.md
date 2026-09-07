# Christ the Redeemer · Three.js scene

**Live demo:** https://victorsodre.github.io/cristo-redentor-threejs/

An interactive, single-page Three.js scene of Christ the Redeemer above
Corcovado. Orbit with a mouse or touch, set the time of day from 0 to 24 hours,
run a complete day cycle, inspect live performance metrics, and copy a deep link
that restores the current view. The interface defaults to English and includes
a Brazilian Portuguese option.

The project uses no framework, bundler, or CDN at runtime. Three.js is vendored
under `public/vendor/`.

## Run locally

Viewing the scene requires no install:

```bash
node scripts/serve.mjs # http://127.0.0.1:5173
```

Use HTTP rather than `file://`; ES modules and WASM require it. Playwright is
only needed for the measurement scripts:

```bash
npm install
node scripts/capture.mjs --round=r3
node scripts/test-ui.mjs --round=r3
```

The scripts write deterministic viewpoints, comparison sheets, time-of-day
frames, UI checks, and measurements to `shots/<round>/`. `GAUNTLET.md` records
the historical scoring evidence. Each capture phase opens only one headless
browser at a time so GPU measurements remain meaningful.

## Historical measurements

The following results were measured on an iMac Pro (2017; Xeon W-2140B,
32 GB, Radeon Pro Vega 56) using Chromium 1228 headless with ANGLE Metal at
1920×1080 and DPR 1. They are historical evidence, not a performance promise
for other machines or browsers.

| target | recorded result |
|---|---|
| ≥55 fps at 1920×1080 | 144.3 fps mean; 3.10 ms median frame time; 14.50 ms p95 |
| ≥30 fps with 4× CPU throttling | 142.9 fps; 3.40 ms median frame time |
| first frame under 2 s on fast 4G, cold cache | 918 ms first frame; 1256 ms with statue |
| transferred data below 1.5 MB | 0.472 MB (495,301 bytes, gzip) |
| fewer than 30 draw calls | 11 |
| day cycle enabled | 126.7 fps mean; 3.10 ms median; 16.30 ms p95 |

The final recorded gauntlet score was 33/34 across two rounds. See
`GAUNTLET.md` for methodology, screenshots, and limits.

## Scene composition

| element | source |
|---|---|
| statue | third-party asset: `cristo-web-opt.glb`, 54,136 triangles, 144 KB, Draco |
| pedestal, overlook, guardrail, stairs | built in this project from merged primitives |
| Corcovado terrain to sea level | built in this project from a 44×128 polar grid and ridged noise |
| Guanabara Bay, Sugarloaf, hills | built in this project from noise-deformed domes |
| clouds, valley mist, sky, sun, stars | procedural shaders created for this scene |
| 1.75 m figures and city lights | built in this project |

The scene starts the GLB request in the document head, rebuilds shadows only
when the sun changes materially, and pauses `requestAnimationFrame` in hidden
tabs. `CREDITO.md` documents the model conversion and `ref/CREDITOS.md`
documents the reference images.

## Credit and licensing

The digital sculpture **“Christ the Redeemer (Cristo Redentor)”** is by
[Parlin Sitorus](https://sketchfab.com/3d-models/christ-the-redeemer-cristo-redentor-157dbdb9d8654651a5e5c9af7b412398)
under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). This project
simplifies and converts that asset for web delivery; it does not claim authorship
of the sculpture. Details are in `CREDITO.md`.

The six images in `ref/` are Wikimedia Commons references under CC BY-SA. They
are comparison material only and are not rendered in the scene. Three.js is
vendored under its MIT license.
