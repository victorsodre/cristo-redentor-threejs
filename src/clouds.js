import * as THREE from 'three';
import { HASH_NOISE_2D, FOG_EXP2, CLOUD_FBM } from './glsl.js';

// Mar de nuvens abaixo do mirante. Duas lâminas em alturas, escalas e
// velocidades diferentes: a deriva é contínua e as camadas não repetem juntas,
// então não há loop perceptível. O relevo do topo vem do gradiente do próprio
// ruído — sem ele a lâmina lê como placa de papel.
const VERT = /* glsl */`
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FRAG = /* glsl */`
  varying vec3 vWorld;
  uniform vec3 uLit, uDark, uSunDir, uSunCol, uFogColor;
  uniform float uTime, uCover, uScale, uFogDensity, uOpacity, uSunVis, uFade, uFadeStart, uFadeEnd;
  ${HASH_NOISE_2D}
  ${FOG_EXP2}
  ${CLOUD_FBM}

  void main() {
    vec2 p = cloudUv(vWorld, uScale);      // deriva lenta e contínua do banco

    float d = cloudFbm(p);
    float a = smoothstep(uCover, uCover + 0.34, d);
    if (a <= 0.003) discard;

    // duas amostras extras dão a normal do topo da nuvem
    float e = 0.055;
    float gx = cloudFbm(p + vec2(e, 0.0)) - d;
    float gz = cloudFbm(p + vec2(0.0, e)) - d;
    vec3 nrm = normalize(vec3(-gx * 11.0, e, -gz * 11.0));

    // Nuvem espalha muito: mesmo a face que não olha o sol volta clara. Por
    // isso a resposta é comprimida (pow 0.45) e a base já é alta — com uma
    // curva de terreno (ndl linear) o banco lia como duna.
    float ndl = max(dot(nrm, uSunDir), 0.0);
    float ceu = 0.5 + 0.5 * nrm.y;
    vec3 col = mix(uDark, uLit, 0.55 + 0.45 * pow(ndl, 0.42));
    col = mix(col, uDark, (1.0 - ceu) * 0.25);
    col += uSunCol * pow(ndl, 6.0) * 0.45 * uSunVis;

    // distância: esmaece antes da borda da lâmina e entra na névoa
    float dist = length(vWorld - cameraPosition);
    float edge = 1.0 - smoothstep(uFadeStart, uFadeEnd, length(vWorld.xz));
    col = mix(col, uFogColor, fogFactorExp2(dist, uFogDensity));

    gl_FragColor = vec4(col, a * uOpacity * edge * uFade);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function layer(y, scale, opacity, size, fadeStart, fadeEnd) {
  const uniforms = {
    uLit: { value: new THREE.Color(0xffffff) },
    uDark: { value: new THREE.Color(0x93a4b8) },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunCol: { value: new THREE.Color(0xffffff) },
    uFogColor: { value: new THREE.Color(0xaec8dd) },
    uFogDensity: { value: 0.00013 },
    uTime: { value: 0 },
    uCover: { value: 0.5 },
    uScale: { value: scale },
    uOpacity: { value: opacity },
    uSunVis: { value: 1 },
    uFade: { value: 1 },
    uFadeStart: { value: fadeStart },
    uFadeEnd: { value: fadeEnd },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  const g = new THREE.PlaneGeometry(size, size, 1, 1);
  g.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, mat);
  mesh.position.y = y;
  mesh.renderOrder = 6;
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}

export function createClouds() {
  // lâmina de cima (a mesma altura do preenchimento de vale) e lâmina baixa,
  // mais larga e mais lenta — dá paralaxe sem custo de geometria
  const a = layer(-330, 0.00075, 0.97, 13000, 4200, 8200);
  const b = layer(-520, 0.00038, 0.45, 16000, 2600, 5600);
  a.mesh.name = 'nuvens-alta';
  b.mesh.name = 'nuvens-baixa';

  const group = new THREE.Group();
  group.add(a.mesh, b.mesh);

  function update(pal, t) {
    for (const [i, l] of [a, b].entries()) {
      const u = l.uniforms;
      u.uTime.value = t * (i === 0 ? 1.0 : 0.55);
      u.uLit.value.copy(pal.cloudLit);
      u.uDark.value.copy(pal.cloudDark);
      u.uSunDir.value.copy(pal.sunDir);
      u.uSunCol.value.copy(pal.sun);
      u.uSunVis.value = pal.sunVisible;
      u.uFogColor.value.copy(pal.fog);
      u.uFogDensity.value = pal.fogD;
      u.uCover.value = 1.0 - pal.cover;
    }
  }
  return { group, update };
}
