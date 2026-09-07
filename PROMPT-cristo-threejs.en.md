# Christ the Redeemer · Three.js scene
## Execution prompt with a gauntlet loop (maximum three rounds)

> Faithful English translation of [PROMPT-cristo-threejs.md](PROMPT-cristo-threejs.md).
> The Portuguese original is retained unchanged as the historical authoring
> brief. This translation preserves its requirements, measurements, and file
> references; it does not update them to describe later implementation work.

Build an interactive web scene of Christ the Redeemer in Three.js. The work is
about **visual quality and measured optimization**, not a prototype. Read this
document before writing the first line.

## 0 · Governing rule

**Verify by rendering, never by reading.** A claim about the result needs a
screenshot or a measured number. If it was not captured, it is not known.

## 1 · What to build

A self-contained page of Christ the Redeemer above Corcovado, with camera
controls and a day-light cycle. A visitor should understand the setting in two
seconds and be able to orbit and explore without instruction.

It is neither a configurator nor a game. It is a visual work to explore.

## 2 · Supplied assets

These files were already converted and verified for Three.js:

| file | triangles | size | use |
|---|---:|---:|---|
| `cristo-web-opt.glb` | 54,136 | 144 KB | **use this** — Draco |
| `cristo-web.glb` | 70,000 | 1.7 MB | fallback without Draco |
| `cristo-full.glb` | 186,966 | 4.3 MB | do not use on the web |

The GLB is Y-up, rests on Y=0, is centered on X/Z, is scaled in real meters
(30 m high with a 28.81 m span), has smooth normals, and uses a
`MeshStandardMaterial` PBR material (roughness 0.92, metalness 0).

`cristo-web-opt.glb` uses `KHR_draco_mesh_compression` and requires a
configured `DRACOLoader`:

```js
const draco = new DRACOLoader();
draco.setDecoderPath('/draco/');
const loader = new GLTFLoader();
loader.setDRACOLoader(draco);
```

### Mandatory credit

The original authoring brief required the CC BY credit to appear **in the
interface**, not only in the README. Its original attribution wording is
preserved in [PROMPT-cristo-threejs.md](PROMPT-cristo-threejs.md); see the
current README and `CREDITO.md` for the corrected, source-linked attribution.

## 3 · Visual references

Six 1920 px-wide references were already downloaded in `ref/` and checked on
2026-08-18. Do not download them again; inspect them in place and compare every
round against them.

| file | observation |
|---|---|
| `ref/01-frente.jpg` | canonical front silhouette against dark forest |
| `ref/02-lateral.jpg` | thin side profile, full octagonal overlook, scale from people |
| `ref/03-contra-plongee.jpg` | base-level upward view in warm grazing light; scale and golden-hour material reference |
| `ref/04-sobre-nuvens.jpg` | cloud sea below the overlook with grazing sun; postcard view |
| `ref/05-golden-hour.jpg` | distant Guanabara/Sugarloaf/atmospheric haze; 17:30 light and background reference, not material reference |
| `ref/06-noite.jpg` | 21:00: blue-white uplighting, orange city-light line, blue-black night sky |

Authors, licenses, and Commons links are in `ref/CREDITOS.md`. The images are
CC BY-SA comparison references, not scene assets. If one becomes part of the
work, its credit becomes mandatory. If a file is missing or corrupt, run
`bash scripts/fetch-refs.sh`; it fetches only the missing asset and checks it
against `ref/MANIFEST.sha256`.

## 4 · Functional requirements

### Controls

- Use `OrbitControls` with `enableDamping = true` and `dampingFactor ≈ 0.05`.
- Clamp `minPolarAngle` / `maxPolarAngle` so the camera never sees beneath the
  ground.
- Clamp `minDistance` / `maxDistance` so the camera neither enters the statue
  nor disappears into infinity.
- Keep `enablePan = false`; unrestricted pan disorients the visitor.
- Support touch: pinch zoom and single-finger orbit.

### Auto-rotate

- Start after **four seconds without interaction**.
- Stop on the first touch, click, or scroll, then restart the timer.
- Use a calm speed: `autoRotateSpeed ≈ 0.4`.
- Provide an explicit interface toggle.

### Time of day

Provide a 0–24 h slider that truly changes directional light, light color, sky
color, and fog. Four distinct required moments:

| time | expected reading |
|---|---|
| 06:00 | sunrise, low warm light, cool shadows, cloud sea |
| 12:00 | high neutral sun, short shadow, Guanabara visible |
| 17:30 | warm grazing golden hour without orange clipping |
| 21:00 | blue night, city lights and white-blue statue uplight |

### Cycle mode

An explicit timelapse control keeps auto-rotate enabled and advances time at
**one hour per second**, completing the day in 24 seconds. It must visibly
toggle, immediately enable rotation, continue after normal orbit interaction,
and stop/freeze time when toggled off. Do not rebuild shadows every frame;
update on sun-position steps. Do not write the URL hash every frame; Safari
limits `replaceState` calls.

### HUD and deep link

The performance HUD is part of the piece, showing FPS, draw calls, triangles,
and transferred bytes. Camera state and time of day live in the URL hash with a
debounced writer. A shared link must restore the exact view.

## 5 · Scene priorities

Build, in order: the supplied statue; a credible pedestal and overlook; clouds
moving below Corcovado; Guanabara, Sugarloaf, and haze; a 1.75 m human scale
reference; and a time-consistent procedural sky. Do not sacrifice the first two
priorities for any later one. Use the supplied model as a third-party asset and
make authorship clear; procedural surrounding elements may be authored here.

## 6 · Capture, measurement, and scoring

Create a script that opens the page headlessly and captures the same fixed views
every round: front (`A-frente`), side (`B-lateral`), base (`C-base`), clouds
(`D-ambiente`), night (`E-noite`), and scale (`F-escala`). Capture sequentially:
open one browser, capture, close it, then proceed. Parallel headless browsers
compete for the GPU and invalidate FPS readings.

Measure under two documented conditions: native at 1920×1080 and 4× CPU
throttling. Record machine state before each round; do not compare rounds made
under materially different load without noting it. The development machine is
not representative of every visitor, so report results honestly.

### Rubric — score each item 0, 1, or 2

**0 = wrong · 1 = acceptable · 2 = good**

| # | criterion | how to verify |
|---|---|---|
| 1 | front silhouette matches reference | overlay `A-frente` and `01-frente.jpg` |
| 2 | correct side proportion | `B-lateral` versus `02-lateral.jpg` |
| 3 | material reads as matte stone, not plastic | visual inspection of four captures |
| 4 | lighting matches selected time | shadow direction versus sun position |
| 5 | warm golden hour without orange clipping | `C-base` versus `03`, `D-ambiente` versus `05` |
| 6 | scale is legible | human figure visible in `C-base` |
| 7 | convincing clouds without apparent loop | three spaced `D-ambiente` captures |
| 8 | no aliasing, z-fighting, or clipping | 200% edge zoom |
| 9 | ≥55 fps desktop at 1920×1080, no throttling | measured with machine state recorded |
| 10 | ≥30 fps with 4× CPU throttling | measured |
| 11 | first frame under 2 s on simulated 4G | measured |
| 12 | transfer below 1.5 MB | measured |
| 13 | fewer than 30 draw calls | measured |
| 14 | controls prevent ground/statue penetration | manual test |
| 15 | auto-rotate follows the specification | manual test |
| 16 | deep link restores the exact view | open copied URL in a new tab |
| 17 | CC BY credit is visible in the interface | inspection |
| 18 | cycle mode advances 1 h/s, keeps rotation, and freezes on toggle | measured; measure its FPS separately |

**Maximum: 36 points.** The maximum was 34 before item 18 was added.

### Stop conditions and round rule

- At least 32 points with no zero score: approved; stop before the third round.
  (The threshold was 30 when the maximum was 34.)
- After three rounds: stop and deliver an honest report.
- If any item from 9 to 13 is zero in round three: stop and document it as a
  failure rather than polishing the number.

After each round, write `GAUNTLET.md` with per-item score, changes, unresolved
issues, and reasons. In the next round, fix only items scoring 0 or 1; do not
refactor items already scoring 2.

## 7 · Constraints

- Use Three.js and no other heavy dependency; avoid a UI framework and complex
  bundling.
- No production CDN: dependencies must be local.
- No 4K texture; if needed, use at most a compressed 1024² texture.
- No expensive post-processing; use bloom only if the FPS budget remains after
  before/after measurement.
- Pause `requestAnimationFrame` while the tab is hidden.
- Never invent a number: every `GAUNTLET.md` value must come from measurement.

## 8 · Deliverables

The expected project includes `ref/` (six references, credits, manifest), the
three supplied GLBs, `CREDITO.md`, `scripts/fetch-refs.sh`, `index.html`, scene
source in `src/`, the optimized GLB and Draco decoder under `public/`, capture
scripts, `shots/r1` through `shots/r3`, `GAUNTLET.md`, and a README.

The README must include the final measured performance table and model credit.
Any target not met must remain visible in the table.

## 9 · Before saying the work is complete

Answer with evidence:

1. What was the final score and which items were below 2?
2. Which performance values were measured, on which machine and resolution?
3. What was tried and did not work?
4. What is third-party material and what was built for the scene?

If any answer lacks a screenshot or number, the work is not complete.
