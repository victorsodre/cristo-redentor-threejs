import * as THREE from 'three';
import { HASH_NOISE_2D, CLOUD_FBM } from './glsl.js';

// O mar de nuvens não é só a lâmina de cima: abaixo do topo da camada, o que
// estiver **debaixo de nuvem** dissolve na cor dela. Isso mata a aresta reta da
// interseção entre um plano e uma malha, e dá de graça a "névoa densa no vale".
// O buraco na névoa é o mesmo buraco da lâmina porque o ruído é o mesmo.
export const CLOUD_TOP = -330;
export const CLOUD_FADE = 240;   // altura, acima da lâmina, em que o terreno emerge da nuvem
export const CLOUD_SCALE = 0.00075;   // igual ao da lâmina de cima

export function createCloudFill() {
  const uniforms = {
    uCloudTop: { value: CLOUD_TOP },
    uCloudFade: { value: CLOUD_FADE },
    uCloudColor: { value: new THREE.Color(0xffffff) },
    uCloudFill: { value: 0.85 },
    uCloudScale: { value: CLOUD_SCALE },
    uCover: { value: 0.5 },
    uTime: { value: 0 },
  };

  const HEAD = /* glsl */`
    varying vec3 vFillPos;
    uniform float uCloudTop, uCloudFade, uCloudFill, uCloudScale, uCover, uTime;
    uniform vec3 uCloudColor;
    ${HASH_NOISE_2D}
    ${CLOUD_FBM}
  `;
  const MIX = /* glsl */`
    {
      float cd = cloudFbm(cloudUv(vFillPos, uCloudScale));
      float ca = smoothstep(uCover, uCover + 0.34, cd);
      // 1 abaixo da lâmina, some ao longo de uCloudFade metros acima dela:
      // é a faixa em que a crista do morro emerge do mar de nuvens
      float below = 1.0 - smoothstep(uCloudTop - 30.0, uCloudTop + uCloudFade, vFillPos.y);
      // A nuvem se acumula com a distância, como névoa de verdade: a encosta
      // logo abaixo do mirante continua escura, o morro a 2 km some no branco.
      float acum = smoothstep(120.0, 900.0, length(cameraPosition - vFillPos));
      // Quanto mais fundo abaixo da lâmina, mais nuvem no caminho: o que está
      // 300 m abaixo some de vez, o que raspa o topo ainda aparece.
      float fundo = clamp((uCloudTop - vFillPos.y) / 300.0, 0.0, 1.0);
      float f = uCloudFill * below * acum * (0.30 + 0.70 * fundo) * (0.55 + 0.45 * ca);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, uCloudColor, clamp(f, 0.0, 1.0));
    }
  `;

  function patch(material) {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = 'varying vec3 vFillPos;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n vFillPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = HEAD + shader.fragmentShader.replace(
        '#include <opaque_fragment>', '#include <opaque_fragment>\n' + MIX);
    };
    material.needsUpdate = true;
    return material;
  }

  function update(pal, t) {
    uniforms.uCloudColor.value.copy(pal.cloudLit).lerp(pal.fog, 0.45);
    // Resposta não linear: com pouca cobertura o vale fica limpo (dá para ver a
    // Guanabara ao meio-dia); com muita, vira mar de nuvens de verdade.
    uniforms.uCloudFill.value = Math.max(0, Math.min(0.97, 1.95 * pal.cover - 0.10));
    uniforms.uCover.value = 1.0 - pal.cover;
    uniforms.uTime.value = t;
  }

  return { uniforms, patch, update, HEAD, MIX };
}
