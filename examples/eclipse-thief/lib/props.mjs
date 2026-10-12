// Props: prism shards, foreground coat sweep, stone arch.
import { poly, shape, S, polar, add, mul, perp, norm, sub, rectP, strand, polyline, lerp } from './geom.mjs';
import { archPts } from './env.mjs';
import { C } from './pal.mjs';
const ink = (w) => ({ color: C.ink, width: w });
export function drawShard(p) {
  const { x, y, s = 1, rot = 0, lit = 0, k = 'shard' } = p;
  const P = (u, v) => { const a = rot * Math.PI / 180; return { x: x + (u * Math.cos(a) - v * Math.sin(a)) * s, y: y + (u * Math.sin(a) + v * Math.cos(a)) * s }; };
  const parts = [{ k, d: poly([P(-30, -8), P(10, -12), P(34, 0), P(6, 10), P(-26, 8)]), fill: lit ? '#FFF2C0' : C.prismMid, stroke: ink(2.5 * s), z: 0 },
    { k: k + 'f', d: poly([P(-30, -8), P(10, -12), P(34, 0), P(-4, 0)]), fill: lit ? '#FFFFFF' : C.prism, z: 0.1 }];
  if (lit) parts.push({ k: k + 'g', d: poly([P(0, -40 * lit), P(6, -6), P(44 * lit, 0), P(6, 6), P(0, 40 * lit), P(-6, 6), P(-44 * lit, 0), P(-6, -6)]), fill: '#FFFFFF', z: 0.2 });
  return parts;
}
/** Huge coat tail whipping across the lens (foreground). u: 0..1 sweep progress. */
export function drawCoatSweep(p) {
  const { u = 0, y = 540 } = p;
  if (u <= 0 || u >= 1) return [];
  const x = lerp(-1400, 2600, u), bend = Math.sin(u * Math.PI) * 300;
  const top = [{ x: x - 700, y: y - 900 }, { x: x - 200 + bend, y: y - 200 }, { x: x + 300 + bend * 1.4, y: y + 600 }, { x: x + 500 + bend, y: y + 1100 }];
  const bot = [{ x: x - 1500, y: y + 1100 }, { x: x - 1100, y: y + 500 }, { x: x - 1200, y: y - 900 }];
  const lining = [{ x: x + 300 + bend * 1.4, y: y + 600 }, { x: x + 500 + bend, y: y + 1100 }, { x: x + 330 + bend, y: y + 1100 }, { x: x + 170 + bend * 1.3, y: y + 600 }, { x: x - 250 + bend, y: y - 200 }];
  return [{ k: 'coat', d: shape([...top, ...bot].map((q, i) => (i === 0 || i === 3 || i === 4 ? S(q.x, q.y) : q)), 0.7), fill: C.coat, stroke: ink(8), z: 0 },
    { k: 'lining', d: poly(lining), fill: C.gold, stroke: ink(5), z: 0.1 },
    { k: 'fold', d: polyline([{ x: x - 400 + bend * 0.5, y: y - 500 }, { x: x - 300 + bend, y: y + 400 }, { x: x - 500 + bend, y: y + 1100 }]), stroke: { color: C.coatShade, width: 40 }, z: 0.05 }];
}
/** Stone arch (to be smashed through). broken 0..1 removes the keystone. */
export function drawArch(p) {
  const { x = 1400, y = 1000, w = 420, h = 760, broken = 0 } = p;
  const outer = archPts(x - 70, y, w + 140, h + 70), inner = archPts(x, y, w, h);
  const parts = [{ k: 'arch', d: poly(outer) + poly(inner.slice().reverse()), fill: C.stoneDark, stroke: ink(5), z: 0 },
    { k: 'archL', d: rectP(x - 70, y - h * 0.55, 34, h * 0.55), fill: C.stone, z: 0.1 }];
  if (broken) parts.push({ k: 'hole', d: poly([{ x: x + w / 2 - 160, y: y - h - 90 }, { x: x + w / 2 + 170, y: y - h - 90 }, { x: x + w / 2 + 120, y: y - h + 60 }, { x: x + w / 2 + 20, y: y - h + 10 }, { x: x + w / 2 - 110, y: y - h + 70 }]), fill: '#0A0A14', stroke: ink(4), z: 0.2 });
  return parts;
}
