import * as THREE from 'three';

// Sol direcional com sombra de frustum apertado, luz de céu/solo, luar e os
// quatro refletores que iluminam a estátua de baixo à noite — como no real.
export function createLighting(scene) {
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -58;
  sun.shadow.camera.right = 58;
  sun.shadow.camera.top = 58;
  sun.shadow.camera.bottom = -58;
  sun.shadow.camera.near = 60;
  sun.shadow.camera.far = 620;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.35;
  sun.target.position.set(0, 6, 0);
  scene.add(sun, sun.target);

  const hemi = new THREE.HemisphereLight(0xa8c6e0, 0x34302a, 0.85);
  scene.add(hemi);

  const moon = new THREE.DirectionalLight(0x9fb8ff, 0);
  scene.add(moon);

  // Refletores do mirante: quatro focos apontando para o peito da estátua.
  const uplights = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
    const s = new THREE.SpotLight(0xd6e4ff, 0, 120, 0.52, 0.92, 1.25);
    s.position.set(Math.cos(a) * 14.5, -8.4, Math.sin(a) * 14.5);
    s.target.position.set(0, 19, 0);
    s.castShadow = false;
    scene.add(s, s.target);
    uplights.push(s);
  }

  const sunPos = new THREE.Vector3();

  function update(pal) {
    const above = THREE.MathUtils.smoothstep(pal.sunDir.y, -0.06, 0.03);
    sun.color.copy(pal.sun);
    sun.intensity = pal.sunI * above;
    sunPos.copy(pal.sunDir).multiplyScalar(300);
    sun.position.copy(sunPos).add(new THREE.Vector3(0, 6, 0));

    hemi.color.copy(pal.hemS);
    hemi.groundColor.copy(pal.hemG);
    hemi.intensity = pal.hemI;

    moon.position.copy(pal.moonDir).multiplyScalar(300);
    moon.intensity = 0.16 * pal.night * THREE.MathUtils.smoothstep(pal.moonDir.y, -0.02, 0.25);

    for (const s of uplights) s.intensity = 320 * pal.uplights;
  }

  return { sun, hemi, moon, uplights, update };
}
