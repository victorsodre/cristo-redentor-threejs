import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fbm2 } from './noise.js';
import { terrainHeight } from './terrain.js';

// Alturas (metros, com a base da estátua em y = 0):
//   0      topo do pedestal — onde a estátua se apoia
//  -8.0    base do pedestal
//  -9.2    piso do mirante (onde as pessoas ficam)
// -11.4    laje do mirante
// -14.6    plataforma inferior
export const PEDESTAL_BOTTOM = -8.0;
export const DECK_Y = -9.2;
export const DECK_R = 26;
export const LOWER_Y = -14.6;

const OCTA = Math.PI / 8;   // gira o octógono para as faces olharem os eixos

function octaPrism(rTop, rBottom, h, yTop, hex) {
  const g = new THREE.CylinderGeometry(rTop, rBottom, h, 8, 1, false, OCTA);
  g.translate(0, yTop - h / 2, 0);
  return paint(g, hex);
}

function box(w, h, d, x, y, z, hex, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return paint(g, hex);
}

function paint(g, hex) {
  // Tudo sai daqui sem índice e sem uv: só assim as peças (cilindro indexado,
  // extrusão não indexada) podem virar uma malha só, num draw call.
  const geo = g.index ? g.toNonIndexed() : g;
  const c = new THREE.Color(hex);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  geo.deleteAttribute('uv');
  return geo;
}

function octaRing(rOuter, rInner, h, yBottom, hex) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= 8; i++) {
    const a = OCTA + (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * rOuter, y = Math.sin(a) * rOuter;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  const hole = new THREE.Path();
  for (let i = 0; i <= 8; i++) {
    const a = OCTA + (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * rInner, y = Math.sin(a) * rInner;
    if (i === 0) hole.moveTo(x, y); else hole.lineTo(x, y);
  }
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, yBottom + h, 0);
  return paint(g, hex);
}

// Pedestal + mirante + parapeito + escadaria, tudo numa malha só (1 draw call).
export function createMonumentBase() {
  const STONE_DARK = 0x2f2b26;   // pedestal, granito escuro
  const STONE_MID = 0x4a453d;
  const DECK = 0x6d6558;         // piso do mirante
  const RAIL = 0x585045;

  const parts = [
    // pedestal (o "trono" escuro sob a estátua)
    octaPrism(7.0, 8.0, 8.0, 0, STONE_DARK),
    // faixa de base do pedestal, já sobre o piso
    octaPrism(9.4, 9.9, 1.2, PEDESTAL_BOTTOM, STONE_MID),
    // laje do mirante
    octaPrism(DECK_R, DECK_R - 0.6, DECK_Y - LOWER_Y + 3.2, DECK_Y, DECK),
    // plataforma inferior
    octaPrism(34, 33, 3.4, LOWER_Y, STONE_MID),
    // parapeito do mirante
    octaRing(DECK_R - 0.2, DECK_R - 1.5, 1.05, DECK_Y, RAIL),
    // corrimão superior do parapeito
    octaRing(DECK_R + 0.05, DECK_R - 1.75, 0.16, DECK_Y + 1.05, 0x6f6659),
  ];

  // Escadaria a oeste (-Z), como quem sobe do estacionamento
  const steps = 11;
  for (let i = 0; i < steps; i++) {
    const y = DECK_Y - (i + 1) * ((DECK_Y - LOWER_Y) / steps);
    const w = 12 + i * 0.5;
    parts.push(box(w, 0.9, 1.5, 0, y + 0.45, -(DECK_R + i * 1.5 - 1), STONE_MID));
  }

  const g = mergeGeometries(parts, false);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.94, metalness: 0,
  }));
  mesh.name = 'pedestal-mirante';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// Copas de mata atlântica em volta do cume — dão a silhueta serrilhada
// que aparece na referência 01.
export function createCanopy() {
  const proto = new THREE.IcosahedronGeometry(1, 0);
  proto.deleteAttribute('uv');
  const N = 900;
  const mat = new THREE.MeshStandardMaterial({ color: 0x33502a, roughness: 1, metalness: 0, flatShading: true });
  const inst = new THREE.InstancedMesh(proto, mat, N);
  inst.name = 'copas';
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const col = new THREE.Color();
  let placed = 0, guard = 0;
  while (placed < N && guard < 14000) {
    guard++;
    const th = Math.random() * Math.PI * 2;
    const r = 30 + Math.pow(Math.random(), 0.75) * 620;
    const x = Math.cos(th) * r, z = Math.sin(th) * r;
    const y = terrainHeight(x, z);
    if (y > LOWER_Y - 2) continue;           // não invade a plataforma
    const size = 3.4 + Math.random() * 6.2 + r * 0.006;
    p.set(x, y + size * 0.55, z);
    q.setFromEuler(new THREE.Euler(Math.random() * 0.4, Math.random() * 6.28, Math.random() * 0.4));
    s.set(size * (0.8 + Math.random() * 0.5), size * (0.55 + Math.random() * 0.4), size * (0.8 + Math.random() * 0.5));
    m.compose(p, q, s);
    inst.setMatrixAt(placed, m);
    const t = fbm2(x * 0.02, z * 0.02, 2);
    col.setHex(0x24401d).lerp(new THREE.Color(0x486b34), t);
    inst.setColorAt(placed, col);
    placed++;
  }
  inst.count = placed;
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  inst.castShadow = false;
  inst.receiveShadow = false;
  return inst;
}

// Figura humana de 1,75 m — a régua de escala da cena.
function humanGeometry() {
  const parts = [];
  const torso = new THREE.CapsuleGeometry(0.17, 0.44, 3, 8); torso.translate(0, 1.28, 0);
  const head = new THREE.SphereGeometry(0.115, 8, 6); head.translate(0, 1.66, 0);
  const legL = new THREE.CapsuleGeometry(0.085, 0.62, 3, 6); legL.translate(-0.10, 0.50, 0);
  const legR = new THREE.CapsuleGeometry(0.085, 0.62, 3, 6); legR.translate(0.10, 0.50, 0);
  const armL = new THREE.CapsuleGeometry(0.062, 0.50, 3, 6); armL.translate(-0.25, 1.25, 0);
  const armR = new THREE.CapsuleGeometry(0.062, 0.50, 3, 6); armR.translate(0.25, 1.25, 0);
  for (const g of [torso, head, legL, legR, armL, armR]) { g.deleteAttribute('uv'); parts.push(g); }
  return mergeGeometries(parts, false);
}

export function createPeople() {
  const geo = humanGeometry();
  const N = 9;
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0 });
  const inst = new THREE.InstancedMesh(geo, mat, N);
  inst.name = 'escala-humana';
  const spots = [
    [6.5, 0.0, 12.5], [9.0, 0.0, 9.5], [-7.0, 0.0, 13.5], [13.0, 0.0, 2.0],
    [0.0, 0.0, 15.5], [-12.0, 0.0, 8.0], [3.0, 0.0, 19.0], [-3.5, 0.0, 12.0],
    [11.5, 0.0, -6.0],
  ];
  const shirts = [0xd7d2c8, 0x9fb0c4, 0xc98f6e, 0x8fa38b, 0xe0dcd4, 0x7d8fa8, 0xbfa88e, 0xcfd6dd, 0x9a8f86];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const [x, , z] = spots[i];
    p.set(x, DECK_Y, z);
    q.setFromEuler(new THREE.Euler(0, Math.atan2(-x, -z) + (Math.random() - 0.5) * 0.9, 0));
    m.compose(p, q, s);
    inst.setMatrixAt(i, m);
    inst.setColorAt(i, new THREE.Color(shirts[i]));
  }
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  inst.castShadow = true;
  inst.receiveShadow = true;
  return inst;
}
