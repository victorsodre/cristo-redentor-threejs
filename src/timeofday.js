import * as THREE from 'three';

// Eixos do mundo desta cena:
//   +Z = leste  (para onde o Cristo olha, e onde fica a Guanabara)
//   +X = norte  (por onde o sol passa — hemisfério sul)
//   +Y = cima
// O sol nasce em +Z às 6h, cruza o norte ao meio-dia e se põe em -Z às 18h.

const MAX_ELEVATION = THREE.MathUtils.degToRad(62);

// Chaves de cor por hora. Interpolação linear em espaço linear (Color converte de sRGB).
const KEYS = [
  { h: 0.0,  top: 0x030610, mid: 0x060b1a, hor: 0x0d1730, sun: 0x8fb2ff, sunI: 0.07,
    hemS: 0x16233f, hemG: 0x05070c, hemI: 0.16, fog: 0x0a1224, fogD: 0.000125,
    exp: 1.15, night: 1.0, hazeA: 0.35, cloudLit: 0x39476b, cloudDark: 0x0d1526, cover: 0.3 },

  { h: 5.0,  top: 0x071232, mid: 0x18254e, hor: 0x53415f, sun: 0x7d86c6, sunI: 0.14,
    hemS: 0x2a3a63, hemG: 0x0a0d14, hemI: 0.30, fog: 0x2c3050, fogD: 0.000165,
    exp: 1.10, night: 0.80, hazeA: 0.55, cloudLit: 0x5c5878, cloudDark: 0x1b2038, cover: 0.4 },

  { h: 6.0,  top: 0x1b3f7a, mid: 0x4d6ca0, hor: 0xf0a267, sun: 0xff9a52, sunI: 1.55,
    hemS: 0x6d86ad, hemG: 0x241d18, hemI: 0.95, fog: 0xc08a6a, fogD: 0.000205,
    exp: 1.02, night: 0.14, hazeA: 0.70, cloudLit: 0xfff2e2, cloudDark: 0x6f7093, cover: 0.48 },

  { h: 8.0,  top: 0x1e5aa8, mid: 0x5b8fc9, hor: 0xcfe0ef, sun: 0xffd9b0, sunI: 2.60,
    hemS: 0x93b6da, hemG: 0x2a2620, hemI: 0.85, fog: 0xb9cddd, fogD: 0.000112,
    exp: 0.95, night: 0.0, hazeA: 0.55, cloudLit: 0xfdfbf7, cloudDark: 0x8e9db0, cover: 0.22 },

  { h: 12.0, top: 0x14539f, mid: 0x3f7fc4, hor: 0xbcd5e9, sun: 0xfff4e2, sunI: 3.25,
    hemS: 0xa8c6e0, hemG: 0x34302a, hemI: 1.00, fog: 0xaec8dd, fogD: 0.000104,
    exp: 0.90, night: 0.0, hazeA: 0.45, cloudLit: 0xffffff, cloudDark: 0x93a4b8, cover: 0.12 },

  { h: 16.0, top: 0x1d5ba5, mid: 0x5d8dc5, hor: 0xdcd3c2, sun: 0xffe3bb, sunI: 2.35,
    hemS: 0x9fbcd8, hemG: 0x35301f, hemI: 1.05, fog: 0xc4cbc9, fogD: 0.000116,
    exp: 0.94, night: 0.0, hazeA: 0.55, cloudLit: 0xfdf3e6, cloudDark: 0x93a0ad, cover: 0.2 },

  { h: 17.5, top: 0x1d3f7d, mid: 0x6f86b4, hor: 0xffbe86, sun: 0xffb877, sunI: 1.45,
    hemS: 0xa9b8ca, hemG: 0x3a3020, hemI: 1.45, fog: 0xd9ae8c, fogD: 0.000124,
    exp: 1.00, night: 0.0, hazeA: 0.45, cloudLit: 0xfff6ea, cloudDark: 0x7b7398, cover: 0.38 },

  { h: 18.5, top: 0x15264f, mid: 0x3d4172, hor: 0xff8a5a, sun: 0xff7d4e, sunI: 0.52,
    hemS: 0x5a6690, hemG: 0x1a1620, hemI: 1.00, fog: 0x9c6a5e, fogD: 0.000125,
    exp: 1.05, night: 0.32, hazeA: 0.75, cloudLit: 0xffd9bc, cloudDark: 0x5b5878, cover: 0.4 },

  { h: 19.5, top: 0x0b1738, mid: 0x1c2551, hor: 0xa04c48, sun: 0x8c5a6a, sunI: 0.14,
    hemS: 0x39456e, hemG: 0x100e16, hemI: 0.26, fog: 0x4a3348, fogD: 0.000185,
    exp: 1.10, night: 0.78, hazeA: 0.70, cloudLit: 0x8a6a78, cloudDark: 0x241f36, cover: 0.36 },

  { h: 21.0, top: 0x040814, mid: 0x08101f, hor: 0x16233d, sun: 0x8fb2ff, sunI: 0.07,
    hemS: 0x16233f, hemG: 0x05070c, hemI: 0.16, fog: 0x0c1526, fogD: 0.000140,
    exp: 1.15, night: 1.0, hazeA: 0.40, cloudLit: 0x39476b, cloudDark: 0x0d1526, cover: 0.3 },

  { h: 24.0, top: 0x030610, mid: 0x060b1a, hor: 0x0d1730, sun: 0x8fb2ff, sunI: 0.07,
    hemS: 0x16233f, hemG: 0x05070c, hemI: 0.16, fog: 0x0a1224, fogD: 0.000125,
    exp: 1.15, night: 1.0, hazeA: 0.35, cloudLit: 0x39476b, cloudDark: 0x0d1526, cover: 0.3 },
];

const COLOR_FIELDS = ['top', 'mid', 'hor', 'sun', 'hemS', 'hemG', 'fog', 'cloudLit', 'cloudDark'];
const NUM_FIELDS = ['sunI', 'hemI', 'fogD', 'exp', 'night', 'hazeA', 'cover'];

// Pré-converte os hex para Color (linear) uma única vez.
const KEYC = KEYS.map((k) => {
  const o = { h: k.h };
  for (const f of COLOR_FIELDS) o[f] = new THREE.Color(k[f]);
  for (const f of NUM_FIELDS) o[f] = k[f];
  return o;
});

export function createPalette() {
  const p = {};
  for (const f of COLOR_FIELDS) p[f] = new THREE.Color();
  for (const f of NUM_FIELDS) p[f] = 0;
  p.sunDir = new THREE.Vector3();
  p.moonDir = new THREE.Vector3();
  p.sunVisible = 0;
  p.uplights = 0;
  p.city = 0;
  return p;
}

export function sunDirection(hour, out = new THREE.Vector3()) {
  const t = (hour - 6) / 12;             // 0 no nascer, 1 no poente
  const a = Math.PI * t;                 // 0 = leste (+Z), PI = oeste (-Z)
  const el = MAX_ELEVATION * Math.sin(Math.PI * t);
  const ce = Math.cos(el);
  return out.set(ce * Math.sin(a), Math.sin(el), ce * Math.cos(a)).normalize();
}

export function samplePalette(hour, out) {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < KEYC.length - 2 && KEYC[i + 1].h <= h) i++;
  const a = KEYC[i], b = KEYC[i + 1];
  const t = THREE.MathUtils.clamp((h - a.h) / (b.h - a.h), 0, 1);
  const s = t * t * (3 - 2 * t);         // suaviza a passagem entre chaves

  for (const f of COLOR_FIELDS) out[f].lerpColors(a[f], b[f], s);
  for (const f of NUM_FIELDS) out[f] = THREE.MathUtils.lerp(a[f], b[f], s);

  sunDirection(h, out.sunDir);
  out.moonDir.copy(out.sunDir).negate();
  out.sunVisible = THREE.MathUtils.smoothstep(out.sunDir.y, -0.035, 0.02);
  out.uplights = out.night;
  out.city = out.night;
  return out;
}

export function formatHour(h) {
  const hh = Math.floor(h) % 24;
  const mm = Math.round((h - Math.floor(h)) * 60);
  const m2 = mm === 60 ? 0 : mm;
  const h2 = mm === 60 ? (hh + 1) % 24 : hh;
  return `${String(h2).padStart(2, '0')}:${String(m2).padStart(2, '0')}`;
}
