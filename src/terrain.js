import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fbm2, vnoise2 } from './noise.js';
import { FOG_EXP2 } from './glsl.js';

// Escala real: o mirante fica a ~710 m do nível do mar. O terreno é um disco
// polar em torno do Corcovado; onde a altura cruza o nível do mar, o plano de
// água aparece — é assim que a linha da costa e a Guanabara nascem sozinhas.

export const SEA_Y = -718;
const SUMMIT_R = 26;
const SEA_R = 1800;

function baseProfile(r) {
  const u = THREE.MathUtils.clamp((r - SUMMIT_R) / (SEA_R - SUMMIT_R), 0, 1);
  return -14.6 - (Math.abs(SEA_Y) - 14.6) * Math.pow(u, 0.36);
}

// Ruído "ridged": 1 - |2n-1| deixa cristas afiadas em vez de colinas macias.
// É o que dá cara de maciço da Tijuca, e não de campo de golfe.
function ridged(x, z, f, ox, oz) {
  return 1 - Math.abs(2 * fbm2(x * f + ox, z * f + oz, 3) - 1);
}

export function terrainHeight(x, z) {
  const r = Math.hypot(x, z);
  let y = baseProfile(r);

  // Três escalas de crista. A amplitude acompanha a resolução da malha polar:
  // detalhe fino só onde os anéis são densos, senão vira serrilhado.
  const s1 = THREE.MathUtils.smoothstep(r, 150, 2400);
  const s2 = THREE.MathUtils.smoothstep(r, 70, 800) * (1 - THREE.MathUtils.smoothstep(r, 3000, 6000));
  const s3 = THREE.MathUtils.smoothstep(r, 35, 220) * Math.exp(-r / 1100);
  y += (ridged(x, z, 0.0011, 17.3, 4.1) - 0.48) * 240 * s1;
  y += (ridged(x, z, 0.0042, 51.7, 88.2) - 0.48) * 90 * s2;
  y += (ridged(x, z, 0.017, 3.9, 27.4) - 0.48) * 22 * s3;

  // Relevo regional: morros e ilhas para além da encosta
  const far = THREE.MathUtils.smoothstep(r, 900, 2200);
  y += (fbm2(x * 0.00034 + 91.7, z * 0.00034 + 55.2, 4) - 0.46) * 620 * far;

  // A baía abre para leste (+Z): rebaixa o terreno desse lado
  const dirZ = r > 1 ? z / r : 0;
  y -= 300 * THREE.MathUtils.smoothstep(dirZ, 0.05, 0.85) * far;

  // Uma escarpa mínima na linha d'água, só para a costa não virar um platô
  // rente ao plano do mar. O z-fighting em si morre no polygonOffset da água.
  const d = y - SEA_Y;
  if (Math.abs(d) < 1.2) y = SEA_Y + (d >= 0 ? 1.2 : -1.2);

  return y;
}

function terrainColor(y, slope, x, z, out) {
  const rock = new THREE.Color(0x6a6155);
  const rockDark = new THREE.Color(0x453f37);
  const forest = new THREE.Color(0x16261a);
  const forestLit = new THREE.Color(0x25391f);
  const city = new THREE.Color(0x5c584e);
  const sand = new THREE.Color(0xb9a88c);
  const deep = new THREE.Color(0x1b2b33);

  const n = vnoise2(x * 0.004 + 2.7, z * 0.004 + 8.3);

  if (y < SEA_Y + 1) return out.copy(deep);

  // Faixa de praia / orla
  if (y < SEA_Y + 4) return out.copy(sand).lerp(city, 0.35 + n * 0.5);

  // Planície: cidade
  if (y < SEA_Y + 70) return out.copy(city).lerp(forest, Math.max(0, n - 0.45) * 1.3);

  // Encosta: mata, com rocha exposta onde é íngreme
  const n2 = vnoise2(x * 0.0009 + 41.2, z * 0.0009 + 17.6);
  out.copy(forest).lerp(forestLit, n * 0.55 + n2 * 0.55);
  const exposure = THREE.MathUtils.smoothstep(slope, 1.05, 1.9);
  out.lerp(n > 0.5 ? rock : rockDark, exposure * 0.85);

  // Topo do Corcovado: granito à mostra logo abaixo do mirante
  const summit = THREE.MathUtils.smoothstep(y, -130, -25);
  out.lerp(rock, summit * 0.42);
  return out;
}

export function createTerrain() {
  const RINGS = 44, SECTORS = 128;
  const R0 = SUMMIT_R, R1 = 9000;
  const pos = [], col = [], idx = [];
  const c = new THREE.Color();

  // Uma passada só de alturas; a inclinação sai das vizinhas na própria malha
  // (5x menos avaliações de ruído que refazer as derivadas ponto a ponto).
  const row = SECTORS + 1;
  const H = new Float32Array(RINGS * row);
  const RS = new Float32Array(RINGS);
  for (let i = 0; i < RINGS; i++) {
    RS[i] = R0 * Math.pow(R1 / R0, i / (RINGS - 1));
    for (let s = 0; s <= SECTORS; s++) {
      const th = (s / SECTORS) * Math.PI * 2;
      H[i * row + s] = terrainHeight(Math.cos(th) * RS[i], Math.sin(th) * RS[i]);
    }
  }
  for (let i = 0; i < RINGS; i++) {
    const r = RS[i];
    for (let s = 0; s <= SECTORS; s++) {
      const th = (s / SECTORS) * Math.PI * 2;
      const x = Math.cos(th) * r, z = Math.sin(th) * r;
      const y = H[i * row + s];
      pos.push(x, y, z);

      const i0 = Math.max(0, i - 1), i1 = Math.min(RINGS - 1, i + 1);
      const s0 = (s - 1 + SECTORS) % SECTORS, s1 = (s + 1) % SECTORS;
      const dr = (H[i1 * row + s] - H[i0 * row + s]) / Math.max(1e-3, RS[i1] - RS[i0]);
      const dt = (H[i * row + s1] - H[i * row + s0]) / Math.max(1e-3, 2 * r * Math.PI * 2 / SECTORS);
      terrainColor(y, Math.hypot(dr, dt), x, z, c);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < RINGS - 1; i++) {
    for (let s = 0; s < SECTORS; s++) {
      const a = i * row + s, b = a + 1, d = a + row, e = d + 1;
      idx.push(a, b, d, b, e, d);   // sentido anti-horário visto de cima
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 1.0, metalness: 0, flatShading: false,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.name = 'terreno';
  mesh.receiveShadow = false;
  mesh.castShadow = false;
  return mesh;
}

// Pão de Açúcar, Morro da Urca e alguns morros de silhueta característica.
// Ficam longe e em névoa: forma importa, detalhe não.
export function createMorros() {
  const domes = [
    { x: -1050, z: 5600, h: 396, r: 250, k: 1 },   // Pão de Açúcar
    { x: -1480, z: 5050, h: 224, r: 230, k: 1 },   // Morro da Urca
    { x: 1200,  z: 7400, h: 340, r: 480, k: 1 },   // serra de Niterói
    { x: 2400,  z: 6600, h: 300, r: 560, k: 1 },
    { x: -2900, z: 3100, h: 380, r: 380, k: 1 },   // Dois Irmãos, ao sul
    { x: -3450, z: 2300, h: 420, r: 420, k: 1 },
    { x: 3200,  z: 2200, h: 520, r: 900, k: 1 },   // serra ao norte
  ];
  const geos = [];
  const c = new THREE.Color();
  for (const d of domes) {
    const seg = 22, rings = 12;
    const g = new THREE.SphereGeometry(1, seg, rings, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const p = g.attributes.position;
    const colors = [];
    const base = terrainHeight(d.x, d.z);
    const foot = Math.min(base, SEA_Y) - 260;
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
      const rr = Math.hypot(px, pz);
      const shape = Math.pow(Math.max(0, 1 - Math.pow(Math.min(rr, 1), 2.6)), 0.62);
      const n = fbm2(px * 3.1 + d.x, pz * 3.1 + d.z, 3) - 0.5;
      const n2 = fbm2(px * 9.7 + d.z, pz * 9.7 + d.x, 2) - 0.5;
      const wx = px * d.r * (1 + n * 0.34 + n2 * 0.10);
      const wz = pz * d.r * (1 + n * 0.34 + n2 * 0.10);
      const wy = foot + (py > 0.001 ? (d.h + 260) * shape * (1 + n * 0.18 + n2 * 0.09) : 0);
      p.setXYZ(i, wx, wy, wz);
      // granito no alto, mata na base
      const t = THREE.MathUtils.clamp((wy - SEA_Y) / d.h, 0, 1);
      c.setHex(0x1f3320).lerp(new THREE.Color(0x5d554a), THREE.MathUtils.smoothstep(t, 0.25, 0.85));
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.deleteAttribute('uv');
    g.translate(d.x, 0, d.z);
    g.computeVertexNormals();
    geos.push(g);
  }
  const merged = mergeGeometries(geos, false);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 1, metalness: 0,
  }));
  mesh.name = 'morros';
  return mesh;
}

// A água não é um material PBR comum: sem mapa de ambiente ela ficaria preta.
// Aqui o céu é refletido analiticamente (Fresnel) e o caminho do sol é somado
// à parte — é o que faz a Guanabara ler ao entardecer.
export function createWater(fill) {
  const uniforms = {
    uDeep:    { value: new THREE.Color(0x16344c) },
    uSkyHor:  { value: new THREE.Color(0xbcd5e9) },
    uSkyTop:  { value: new THREE.Color(0x14539f) },
    uSunDir:  { value: new THREE.Vector3(0, 1, 0) },
    uSunCol:  { value: new THREE.Color(0xffffff) },
    uSunVis:  { value: 1 },
    uFogColor:{ value: new THREE.Color(0xaec8dd) },
    uFogDensity: { value: 0.00013 },
    uNight:   { value: 0 },
    ...fill.uniforms,          // inclui uTime, compartilhado com as nuvens
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, fog: false,
    polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 220,
    vertexShader: `
      varying vec3 vFillPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vFillPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform vec3 uDeep, uSkyHor, uSkyTop, uSunDir, uSunCol, uFogColor;
      uniform float uSunVis, uFogDensity, uNight;
      ${fill.HEAD}
      ${FOG_EXP2}
      void main() {
        vec3 toCam = cameraPosition - vFillPos;
        float dist = length(toCam);
        vec3 V = toCam / dist;

        // Fresnel: de frente a água é escura, de raspão vira espelho do céu
        float f = pow(1.0 - clamp(V.y, 0.0, 1.0), 5.0);
        vec3 skyc = mix(uSkyHor, uSkyTop, 0.22);
        vec3 col = mix(uDeep, skyc, clamp(0.10 + 0.90 * f, 0.0, 1.0));

        // caminho do sol, quebrado pela ondulação
        vec3 R = reflect(-V, vec3(0.0, 1.0, 0.0));
        float d = max(dot(R, uSunDir), 0.0);
        float ripple = vnoise2(vFillPos.xz * 0.0075 + vec2(uTime * 0.05, uTime * 0.031));
        col += uSunCol * (pow(d, 220.0) * 2.2 + pow(d, 12.0) * 0.16)
             * uSunVis * (0.45 + 1.05 * ripple);

        col = mix(col, uFogColor, fogFactorExp2(dist, uFogDensity));
        gl_FragColor = vec4(col, 1.0);
        ${fill.MIX}
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const g = new THREE.PlaneGeometry(26000, 26000, 1, 1);
  g.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, mat);
  mesh.position.y = SEA_Y;
  mesh.name = 'agua';
  mesh.renderOrder = -1;

  function update(pal) {
    uniforms.uSkyHor.value.copy(pal.hor);
    uniforms.uSkyTop.value.copy(pal.mid);
    uniforms.uSunDir.value.copy(pal.sunDir);
    uniforms.uSunCol.value.copy(pal.sun);
    uniforms.uSunVis.value = pal.sunVisible;
    uniforms.uFogColor.value.copy(pal.fog);
    uniforms.uFogDensity.value = pal.fogD;
    uniforms.uNight.value = pal.night;
    uniforms.uDeep.value.copy(pal.fog).multiplyScalar(0.10)
      .lerp(new THREE.Color(0x16344c), 0.75);
  }
  return { mesh, update };
}

// Luzes da cidade: pontos esparsos onde o terreno é baixo. Só acendem à noite.
export function createCityLights() {
  const pts = [], cols = [];
  const c = new THREE.Color();
  let tries = 0;
  while (pts.length < 2200 * 3 && tries < 26000) {
    tries++;
    const th = Math.random() * Math.PI * 2;
    const r = 1500 + Math.pow(Math.random(), 0.55) * 7000;
    const x = Math.cos(th) * r, z = Math.sin(th) * r;
    const y = terrainHeight(x, z);
    if (y < SEA_Y + 6 || y > SEA_Y + 190) continue;
    pts.push(x, y + 6, z);
    const warm = Math.random();
    c.setHSL(0.08 + warm * 0.03, 0.85, 0.55 + Math.random() * 0.25);
    if (Math.random() > 0.93) c.setHSL(0.55, 0.4, 0.75);   // algumas frias
    cols.push(c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const mat = new THREE.PointsMaterial({
    size: 16, sizeAttenuation: true, vertexColors: true,
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    fog: true,
  });
  const points = new THREE.Points(g, mat);
  points.name = 'luzes-cidade';
  points.frustumCulled = false;
  return points;
}
