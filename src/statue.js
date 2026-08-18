import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { HASH_NOISE_3D } from './glsl.js';

// A estátua é o único asset de terceiro da cena. O GLB vem com material PBR de
// esteatita (roughness 0.92); aqui só se acrescenta grão procedural — sem
// textura, sem custo de memória — para a pedra não ler como plástico.
export function loadStatue(onProgress) {
  const draco = new DRACOLoader();
  draco.setDecoderPath('./public/draco/');
  draco.preload();   // busca o decodificador em paralelo com o GLB, não depois

  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  // O <head> já disparou o download; aqui só se aproveita o que chegou.
  const bytes = window.__glb
    ? window.__glb
    : fetch('./public/cristo-web-opt.glb').then((r) => r.arrayBuffer());

  return new Promise((resolve, reject) => {
    const onLoaded = (gltf) => {
      const root = gltf.scene;
      let mesh = null;
      root.traverse((o) => { if (o.isMesh) mesh = o; });
      if (!mesh) { reject(new Error('GLB sem malha')); return; }

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.geometry.computeBoundingSphere();

      const mat = mesh.material;
      mat.roughness = 0.92;
      mat.metalness = 0.0;
      mat.envMapIntensity = 0.9;
      mat.onBeforeCompile = (shader) => {
        shader.vertexShader = 'varying vec3 vWPos;\n' + shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
        );
        shader.fragmentShader = 'varying vec3 vWPos;\n' + HASH_NOISE_3D + shader.fragmentShader
          .replace('#include <color_fragment>', `#include <color_fragment>
            float g1 = vnoise3(vWPos * 0.85);
            float g2 = vnoise3(vWPos * 4.7);
            float g3 = vnoise3(vWPos * 21.0);
            float mott = (g1 - 0.5) * 0.10 + (g2 - 0.5) * 0.065 + (g3 - 0.5) * 0.04;
            diffuseColor.rgb *= (1.0 + mott);
            // manchas levemente esverdeadas, como a esteatita envelhecida
            diffuseColor.rgb = mix(diffuseColor.rgb,
                                   diffuseColor.rgb * vec3(0.93, 0.97, 0.94),
                                   smoothstep(0.55, 0.90, g2));
            // escorrido de chuva: escurece a parte baixa do manto
            diffuseColor.rgb *= mix(0.90, 1.0, smoothstep(0.0, 13.0, vWPos.y));
          `)
          .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
            roughnessFactor = clamp(roughnessFactor + (vnoise3(vWPos * 6.5) - 0.5) * 0.17, 0.6, 1.0);
          `);
      };
      mat.needsUpdate = true;

      // Conferido no render: o GLB já nasce olhando para +Z, que nesta cena é
      // o leste — a direção da Guanabara, como o monumento real.
      root.name = 'cristo';

      const box = new THREE.Box3().setFromObject(root);
      resolve({ root, mesh, box, triangles: mesh.geometry.index
        ? mesh.geometry.index.count / 3
        : mesh.geometry.attributes.position.count / 3 });
    };

    bytes
      .then((buf) => {
        if (onProgress) onProgress({ lengthComputable: true, loaded: buf.byteLength, total: buf.byteLength });
        loader.parse(buf, '', onLoaded, reject);
      })
      .catch(reject);
  });
}
