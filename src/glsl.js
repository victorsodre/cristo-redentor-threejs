// Trechos GLSL compartilhados. Sem textura: todo detalhe é procedural.

export const HASH_NOISE_2D = /* glsl */`
float hash21(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise2(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
`;

export const HASH_NOISE_3D = /* glsl */`
float hash13(vec3 p3){
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise3(vec3 p){
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x),
        mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x),
        mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}
`;

// Névoa exponencial ao quadrado, igual à do three (FogExp2), para os shaders próprios.
export const FOG_EXP2 = /* glsl */`
float fogFactorExp2(float dist, float density){
  float d = density * dist;
  return 1.0 - clamp(exp2(-d * d * 1.442695), 0.0, 1.0);
}
`;

// fbm do banco de nuvens. Depende de `uTime`. Usado pela lâmina (clouds.js) e
// pelo preenchimento de vale (cloudfill.js) — tem de ser o mesmo ruído nos dois.
export const CLOUD_FBM = /* glsl */`
// Octaves em "billow" (1 - |2n-1|): topo arredondado, tipo couve-flor. Com
// ruído de valor puro o banco de nuvens lia como duna de areia.
float billow(vec2 p) { return 1.0 - abs(2.0 * vnoise2(p) - 1.0); }
float cloudFbm(vec2 p) {
  float v = 0.0;
  v += 0.5000 * billow(p);
  v += 0.2500 * billow(p * 2.03 + vec2(uTime * 0.021, -uTime * 0.013));
  v += 0.1250 * billow(p * 4.11 - vec2(uTime * 0.017, uTime * 0.029));
  v += 0.0625 * billow(p * 8.07 + vec2(-uTime * 0.033, uTime * 0.011));
  return v / 0.9375;
}
vec2 cloudUv(vec3 world, float scale) {
  return world.xz * scale + vec2(uTime * 0.0016, uTime * 0.0009);
}
`;
