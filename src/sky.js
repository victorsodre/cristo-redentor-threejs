import * as THREE from 'three';
import { HASH_NOISE_3D } from './glsl.js';

// Céu procedural: gradiente por altura + disco solar + halo + banda de névoa
// no horizonte + estrelas à noite. Nada de skybox fotográfico.
export function createSky() {
  const uniforms = {
    uTop:     { value: new THREE.Color(0x14539f) },
    uMid:     { value: new THREE.Color(0x3f7fc4) },
    uHorizon: { value: new THREE.Color(0xbcd5e9) },
    uGround:  { value: new THREE.Color(0x2b2f33) },
    uSunDir:  { value: new THREE.Vector3(0, 1, 0) },
    uSunCol:  { value: new THREE.Color(0xfff4e2) },
    uSunVis:  { value: 1 },
    uNight:   { value: 0 },
    uHaze:    { value: 0.45 },
    uTime:    { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthTest: false,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vDir;
      uniform vec3 uTop, uMid, uHorizon, uGround, uSunCol, uSunDir;
      uniform float uSunVis, uNight, uHaze, uTime;
      ${HASH_NOISE_3D}

      vec3 hash33(vec3 p){
        return vec3(hash13(p), hash13(p + 19.19), hash13(p + 47.77));
      }

      void main() {
        vec3 dir = normalize(vDir);
        float y = dir.y;

        // Gradiente principal
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.24, y));
        col = mix(col, uTop, smoothstep(0.16, 0.68, y));
        // Abaixo da linha do horizonte o céu escurece para o tom do vale
        col = mix(col, uGround, smoothstep(0.0, -0.18, y));

        // Estrelas — só valem acima do horizonte e à noite
        if (uNight > 0.02) {
          vec3 p = dir * 260.0;
          vec3 id = floor(p);
          vec3 f = fract(p);
          vec3 rnd = hash33(id);
          float d = length(f - rnd);
          float pick = step(0.90, hash13(id + 3.7));
          float mag = 0.35 + 0.65 * hash13(id + 8.1);
          float tw = 0.75 + 0.25 * sin(uTime * (1.2 + 2.4 * rnd.x) + rnd.y * 6.28);
          float star = smoothstep(0.16, 0.0, d) * pick * mag * tw;
          col += vec3(0.85, 0.90, 1.0) * star * uNight * smoothstep(0.02, 0.22, y);
        }

        // Halo e disco do sol
        float sd = max(dot(dir, uSunDir), 0.0);
        float glow = pow(sd, 900.0) * 3.2 + pow(sd, 90.0) * 0.35 + pow(sd, 8.0) * 0.10;
        float disc = smoothstep(0.99976, 0.99990, sd);
        col += uSunCol * (glow + disc * 6.0) * uSunVis;

        // Névoa junto ao horizonte (perspectiva aérea do Rio)
        col = mix(col, uHorizon, exp(-max(y, 0.0) * 11.0) * uHaze);

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(4000, 40, 24), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;   // desenhado antes de tudo, sem teste de profundidade
  mesh.matrixAutoUpdate = false;

  function update(pal, camera, time) {
    uniforms.uTop.value.copy(pal.top);
    uniforms.uMid.value.copy(pal.mid);
    uniforms.uHorizon.value.copy(pal.hor);
    uniforms.uGround.value.copy(pal.fog).multiplyScalar(0.55);
    uniforms.uSunDir.value.copy(pal.sunDir);
    uniforms.uSunCol.value.copy(pal.sun);
    uniforms.uSunVis.value = pal.sunVisible;
    uniforms.uNight.value = pal.night;
    uniforms.uHaze.value = pal.hazeA;
    uniforms.uTime.value = time;
    // A cúpula acompanha a câmera: o céu nunca "acaba".
    mesh.position.copy(camera.position);
    mesh.updateMatrix();
  }

  return { mesh, update, material };
}
