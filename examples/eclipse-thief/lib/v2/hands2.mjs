// Hand drawing library: palm + jointed finger chains (3 phalanges, per-finger curl), thumb, glove cuff.
// Presets: open, fist, grip, point, reach, splayed. Views: back, palm, side. Pure data -> drawable parts.
import { shape } from '../geom.mjs';
import { chainPath } from './chain.mjs';
import { LINE, CEL } from './ink.mjs';
const D = Math.PI / 180;
// per finger [index, middle, ring, pinky]: curl angles (deg) at each knuckle, spread (deg)
export const HAND_PRESETS = {
  open: { curl: [[8, 8, 4], [6, 8, 4], [8, 10, 6], [10, 12, 8]], spread: [-9, -2, 5, 12], thumb: [35, 10, 8] },
  relaxed: { curl: [[18, 22, 12], [24, 28, 14], [30, 32, 16], [34, 36, 18]], spread: [-6, -1, 4, 9], thumb: [25, 18, 10] },
  fist: { curl: [[92, 100, 70], [95, 100, 70], [95, 100, 70], [95, 100, 70]], spread: [-3, 0, 3, 6], thumb: [-15, 60, 40], fist: 1 },
  grip: { curl: [[78, 90, 50], [82, 92, 52], [84, 94, 54], [86, 96, 56]], spread: [-4, 0, 4, 8], thumb: [-5, 40, 30] },
  point: { curl: [[0, 4, 2], [95, 100, 70], [95, 100, 70], [95, 100, 70]], spread: [-2, 0, 3, 6], thumb: [-10, 55, 35] },
  reach: { curl: [[14, 16, 8], [16, 18, 10], [20, 22, 12], [24, 26, 14]], spread: [-14, -4, 6, 16], thumb: [50, 12, 8] },
  splayed: { curl: [[-6, 4, 2], [-4, 4, 2], [-2, 6, 4], [0, 8, 6]], spread: [-22, -7, 8, 24], thumb: [70, 0, 0] },
};
const FL = [[11, 7, 6], [12, 8, 6.5], [11, 7.5, 6], [9, 6, 5]]; // phalanx lengths
const FW = [3.1, 3.3, 3.1, 2.7];
/**
 * hand2({x,y,ang,s,side,preset,view,glove,skin,skinShade,gloveC,gloveShade,rim, size, k})
 * x,y = wrist; ang = direction wrist->knuckles (deg); side = +1 left hand / -1 right (mirrors thumb).
 */
export function hand2(o) {
  const P = HAND_PRESETS[o.preset] ?? HAND_PRESETS.relaxed;
  const s = o.s * (o.size ?? 1.05), side = o.side ?? 1, view = o.view ?? 'back';
  const ca = Math.cos(o.ang * D), sa = Math.sin(o.ang * D);
  const sx = view === 'side' ? 0.45 : 1; // across-hand squash in side view
  const flip = side * (view === 'palm' ? -1 : 1);
  const T = (u, v) => ({ x: o.x + (u * ca - v * flip * sx * sa) * s, y: o.y + (u * sa + v * flip * sx * ca) * s });
  const parts = [], k = o.k ?? 'h', z = o.z ?? 0;
  const skin = { fill: o.skin, cel: CEL(o.skinShade, s, { d: 3, rim: o.rim }) };
  const glove = { fill: o.gloveC ?? o.skin, cel: CEL(o.gloveShade ?? o.skinShade, s, { d: 3, rim: o.rim }) };
  // palm (fingerless glove covers it)
  const palm = [T(-2, -8), T(6, -9.5), T(15, -9), T(17, -3), T(17, 4), T(15, 9.5), T(6, 10), T(-2, 8)];
  // fingers: base along knuckle line u=15, v from -7 (index) to +7 (pinky)
  const fingers = [];
  for (let i = 0; i < 4; i++) {
    const v0 = -6.8 + i * 4.5;
    let a = P.spread[i] * D; let px = 15.5, py = v0;
    const pts = [{ u: px - 3, v: py }];
    pts.push({ u: px, v: py });
    for (let j = 0; j < 3; j++) {
      a += (P.curl[i][j] * D) * (view === 'palm' ? -1 : 1) * 0; // curl handled as foreshortening in back view
      const c = P.curl[i].slice(0, j + 1).reduce((m, x) => m + x, 0);
      // back view: curl folds finger toward the palm -> shortens projected length; side view: bends visibly
      const L = FL[i][j];
      if (view === 'side') { const ang = -c * D * 1; px += Math.cos(ang + a) * L; py += Math.sin(ang + a) * L * 0 + 0; pts.push({ u: px, v: py, w: Math.sin(-ang) * L }); }
      else { const proj = Math.cos(Math.min(170, c) * D); px += Math.cos(a) * L * proj; py += Math.sin(a) * L; pts.push({ u: px, v: py }); }
    }
    fingers.push(pts);
  }
  // side view: bend in the u/w plane — reuse w as v offset
  const fpaths = fingers.map((pts, i) => {
    let j = pts.map((q) => T(q.u, view === 'side' ? (q.w ?? 0) + (i - 1.5) * 1.2 : q.v));
    // drop zero-length segments (fully curled fists)
    j = j.filter((q, n) => n === 0 || Math.hypot(q.x - j[n - 1].x, q.y - j[n - 1].y) > 0.6 * s);
    if (j.length < 2) j = [T(14, pts[0].v), T(18, pts[0].v)];
    const r = FW[i];
    return chainPath(j, [[0, r, r], [0.5, r * 0.95, r * 0.95], [1, r * 0.82, r * 0.82]], { scale: s, n: 10 });
  });
  const fistBlock = P.fist ? [T(13, -9), T(21, -8.5), T(22.5, 0), T(21, 9), T(13, 10)] : null;
  // thumb from palm base
  const tb = P.thumb; let ta = (-38 + tb[0] * 0.6) * D; let tu = 6, tv = -8; const tj = [T(tu, tv + 2)];
  tj.push(T(tu, tv));
  for (let j = 0; j < 2; j++) { const L = [8, 6.5][j]; tu += Math.cos(ta) * L; tv += Math.sin(ta) * L * (view === 'side' ? 0.6 : 1); tj.push(T(tu, tv)); ta += (tb[j + 1]) * D; }
  const thumb = chainPath(tj, [[0, 4.4, 4.4], [0.45, 3.8, 3.8], [1, 3.1, 3.1]], { scale: s, n: 10 });
  const zf = view === 'palm' ? 0.02 : -0.02;
  if (fistBlock) parts.push({ k: k + 'fb', d: shape(fistBlock, 0.9), ...skin, stroke: LINE.outer(s * 0.6), z: z + 0.01 });
  fpaths.forEach((d, i) => parts.push({ k: k + 'f' + i, d, ...skin, stroke: LINE.inner(s * 0.85), z: z + zf + (fistBlock ? 0.012 : 0) - i * 0.001 }));
  parts.push({ k: k + 'palm', d: shape(palm, 0.9), ...glove, stroke: LINE.outer(s * 0.7), z: z });
  parts.push({ k: k + 'th', d: thumb, ...skin, stroke: LINE.inner(s * 0.85), z: z + (P.fist || view === 'palm' ? 0.03 : -0.03) });
  return parts;
}
