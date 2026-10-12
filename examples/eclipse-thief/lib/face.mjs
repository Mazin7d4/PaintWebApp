// Reusable anime head: face shape, eyes (clipped iris/pupil/highlights), brows, nose, mouth, cel shade.
import { frame, poly, shape, S, smooth, ellPts, clip, polyline, strand, lerp, clamp, qpts } from './geom.mjs';
import { C } from './pal.mjs';

/**
 * h: {x,y,rot,s, f (turn -1..1), eye, pupil, lookX, lookY, brow, mouth, smile, light, tear, scratch, blush, sweat,
 *     irisC:[dark,mid,lite], skin, skinShade, jaw (0 soft..1 sharp), eyeScale, glint (0..1 reflection in eye)}
 * returns parts {k,d,fill,stroke,z}
 */
export function face(h, zf = 20, pre = 'f') {
  const s = h.s ?? 1, f = clamp(h.f ?? 0, -1, 1);
  const L = frame(h.x, h.y, h.rot ?? 0, s, s);
  const P = (x, y) => L(x, y);
  const parts = [];
  const ink = (w) => ({ color: C.ink, width: w * s });
  const skin = h.skin ?? C.skin, shade = h.skinShade ?? C.skinShade;
  const ax = Math.abs(f);
  // ---- face silhouette: far side compresses, chin shifts toward facing direction
  const kL = f > 0 ? 1 - 0.38 * f : 1, kR = f < 0 ? 1 + 0.38 * f : 1;
  const chin = 8 * f, jaw = h.jaw ?? 0.6;
  const fpts = [
    P(-25 * kL, -16), P(-26 * kL, -2), P(-24 * kL + (f > 0 ? 3 * f : 0), 10), S(...xy(P(-15 * kL + chin * 0.4, 24 + jaw * 2))), S(...xy(P(chin, 34))),
    S(...xy(P(15 * kR + chin * 0.4, 24 + jaw * 2))), P(24 * kR - (f < 0 ? -3 * f : 0), 10), P(26 * kR, -2), P(25 * kR, -16), P(14, -30), P(-14, -30),
  ];
  parts.push({ k: pre + 'face', d: shape(fpts), fill: skin, stroke: ink(2.6), z: zf });
  // cel shade: side away from light + under-bang band (angular)
  const lt = h.light ?? 1;
  const sx = -lt; // shadow side
  const shadePts = sx < 0
    ? [P(-25 * kL, -16), P(-26 * kL, -2), P(-24 * kL, 10), P(-15 * kL + chin * 0.4, 24), P(-6 + chin * 0.6, 31), P(-12 * kL, 14), P(-17 * kL, 2), P(-14 * kL, -12)]
    : [P(25 * kR, -16), P(26 * kR, -2), P(24 * kR, 10), P(15 * kR + chin * 0.4, 24), P(6 + chin * 0.6, 31), P(12 * kR, 14), P(17 * kR, 2), P(14 * kR, -12)];
  parts.push({ k: pre + 'fshade', d: poly(shadePts), fill: { color: shade, opacity: 0.85 }, z: zf + 0.1 });
  parts.push({ k: pre + 'bangshade', d: poly([P(-24 * kL, -10), P(-14, -4), P(-8, -8), P(2, -2), P(10, -7), P(18, -3), P(24 * kR, -9), P(24 * kR, -20), P(-24 * kL, -20)]), fill: { color: shade, opacity: 0.8 }, z: zf + 0.15 });
  // ---- eyes
  const es = (h.eyeScale ?? 1.22);
  const eye = clamp(h.eye ?? 1, 0, 1.3);
  const [irD, irM, irL] = h.irisC ?? [C.irisDark, C.iris, C.irisLite];
  for (const side of [-1, 1]) {
    const far = (side < 0 && f > 0) || (side > 0 && f < 0);
    const wk = (far ? 1 - 0.5 * ax : 1 - 0.1 * ax) * es;
    const ex = side * 12 * (side < 0 ? kL : kR) + f * 10, ey = 7;
    const w = 8.6 * wk, hh = 10.5 * eye * es;
    const inner = -side; // inner corner direction (toward nose)
    // sclera polygon (convex-ish)
    const top = qpts({ x: ex + inner * w, y: ey + 1 }, { x: ex, y: ey - hh * 1.25 }, { x: ex - inner * w * 1.05, y: ey - hh * 0.25 }, 8);
    const bot = qpts({ x: ex - inner * w * 1.05, y: ey - hh * 0.25 }, { x: ex - inner * w * 0.2, y: ey + hh * 0.95 }, { x: ex + inner * w, y: ey + 1 }, 6).slice(1, -1);
    const scl = [...top, ...bot];
    const sclW = scl.map((p) => P(p.x, p.y));
    if (eye > 0.12) {
      parts.push({ k: pre + 'scl' + side, d: poly(sclW), fill: C.sclera, z: zf + 1 });
      const ix = ex + (h.lookX ?? 0) * 3 * wk + f * 1.2, iy = ey + (h.lookY ?? 0) * 2.5 + 0.5;
      const pr = h.pupil ?? 1;
      const irisPts = ellPts(ix, iy, 5.4 * wk * pr, 7.6 * pr * es, 22);
      const ic = clip(irisPts, scl);
      if (ic.length > 2) {
        const g0 = P(ix, iy - 8), g1 = P(ix, iy + 8);
        parts.push({ k: pre + 'iris' + side, d: poly(ic.map((p) => P(p.x, p.y))), fill: { gradient: { type: 'linear', x0: g0.x, y0: g0.y, x1: g1.x, y1: g1.y, stops: [{ offset: 0, color: irD }, { offset: 0.45, color: irM }, { offset: 1, color: irL }] } }, stroke: { color: irD, width: 0.8 * s }, z: zf + 1.1 });
        const pc = clip(ellPts(ix, iy - 0.5, 2.4 * wk * pr, 3.6 * pr * es, 14), scl);
        if (pc.length > 2) parts.push({ k: pre + 'pup' + side, d: poly(pc.map((p) => P(p.x, p.y))), fill: C.lash, z: zf + 1.2 });
        const hl = clip(ellPts(ix - side * 1.6 + 1.5, iy - 3.2, 1.8 * wk, 2.2 * es, 10), scl);
        if (hl.length > 2) parts.push({ k: pre + 'hl' + side, d: poly(hl.map((p) => P(p.x, p.y))), fill: '#FFFFFF', z: zf + 1.3 });
        const hl2 = clip(ellPts(ix + 2, iy + 3.5, 1 * wk, 1 * es, 8), scl);
        if (hl2.length > 2) parts.push({ k: pre + 'hlb' + side, d: poly(hl2.map((p) => P(p.x, p.y))), fill: { color: '#FFFFFF', opacity: 0.8 }, z: zf + 1.3 });
        if (h.glint) { const gl = clip(ellPts(ix + 1, iy + 1, 4.6 * wk * h.glint, 5 * h.glint * es, 14), scl); if (gl.length > 2) parts.push({ k: pre + 'gl' + side, d: poly(gl.map((p) => P(p.x, p.y))), fill: { color: C.sun, opacity: 0.85 }, z: zf + 1.25 }); }
      }
      // upper lid shadow on sclera
      parts.push({ k: pre + 'lidsh' + side, d: poly(top.map((p) => P(p.x, p.y + 1.6)).concat(top.slice().reverse().map((p) => P(p.x, p.y)))), fill: { color: '#9C8CB0', opacity: 0.6 }, z: zf + 1.15 });
    }
    // lash line: thick at outer corner with flick
    const lashTop = eye > 0.12 ? top : qpts({ x: ex + inner * w, y: ey + 2 }, { x: ex, y: ey + 4 + (h.smile ?? 0) * -2 }, { x: ex - inner * w * 1.1, y: ey + 1 }, 6);
    const lashOuter = lashTop.map((p, i) => ({ x: p.x, y: p.y - (0.6 + 2.4 * (i / (lashTop.length - 1)) ** 1.5) }));
    const flick = { x: lashTop.at(-1).x - inner * 3.5, y: lashTop.at(-1).y - 2.5 };
    parts.push({ k: pre + 'lash' + side, d: poly([...lashTop, flick, ...lashOuter.reverse()].map((p) => P(p.x, p.y))), fill: C.lash, z: zf + 1.4 });
    if (eye > 0.12) parts.push({ k: pre + 'low' + side, d: polyline(bot.slice(1).map((p) => P(p.x, p.y))), stroke: { color: C.inkSoft, width: 1.1 * s }, z: zf + 1.4 });
    // brow
    const br = h.brow ?? 0; // -1 angry (inner down) .. +1 worried (inner up)
    const b0 = { x: ex + inner * w * 1.0, y: ey - 15 * es + (-br) * 3.2 * 1 }, b1 = { x: ex - inner * w * 1.2, y: ey - 16.5 * es + br * 2 };
    const bm = { x: (b0.x + b1.x) / 2, y: Math.min(b0.y, b1.y) - 1.5 };
    parts.push({ k: pre + 'brow' + side, d: strand([b0, bm, b1].map((p) => P(p.x, p.y)), 2.6 * s, 0.6 * s), fill: h.browC ?? C.hairDeep, z: zf + (h.browZ ?? 1.5) });
  }
  // nose: small angular tick
  const nx = f * 14;
  parts.push({ k: pre + 'nose', d: polyline([P(nx + 1.5 * (f >= 0 ? 1 : -1), 12), P(nx + 3 * (f >= 0 ? 1 : -1), 18), P(nx, 18.5)]), stroke: { color: C.skinDeep, width: 1.3 * s }, z: zf + 1.6 });
  // mouth
  const m = clamp(h.mouth ?? 0, 0, 1), sm = h.smile ?? 0, mx = f * 12;
  if (m < 0.08) {
    parts.push({ k: pre + 'mouth', d: polyline(qpts({ x: mx - 6, y: 26 - sm * 1.5 }, { x: mx, y: 26 + sm * 2.6 }, { x: mx + 5.5, y: 25.6 - sm * 1.8 }, 6).map((p) => P(p.x, p.y))), stroke: { color: C.ink, width: 1.6 * s }, z: zf + 1.7 });
  } else {
    const mw = 4.5 + m * 2.5, mh = 1.5 + m * 7.5;
    const pts = [...qpts({ x: mx - mw, y: 25.5 - sm }, { x: mx, y: 24.5 + sm * 1.5 }, { x: mx + mw, y: 25.5 - sm }, 5), ...qpts({ x: mx + mw, y: 25.5 - sm }, { x: mx + 0.5, y: 25 + mh * 1.6 }, { x: mx - mw, y: 25.5 - sm }, 6).slice(1, -1)];
    parts.push({ k: pre + 'mouth', d: poly(pts.map((p) => P(p.x, p.y))), fill: C.mouth, stroke: { color: C.ink, width: 1.4 * s }, z: zf + 1.7 });
    if (m > 0.4) parts.push({ k: pre + 'tongue', d: poly(clip(ellPts(mx, 25 + mh * 0.9, mw * 0.6, mh * 0.35, 10), pts).map((p) => P(p.x, p.y))), fill: C.tongue, z: zf + 1.75 });
  }
  if (h.blush) parts.push({ k: pre + 'blush', d: poly([P(-20 * kL + f * 6, 15), P(-11 * kL + f * 6, 13), P(-12 * kL + f * 6, 17)]) + poly([P(20 * kR + f * 6, 15), P(11 * kR + f * 6, 13), P(12 * kR + f * 6, 17)]), fill: { color: C.blush, opacity: 0.7 * h.blush }, z: zf + 1.05 });
  if (h.scratch) parts.push({ k: pre + 'scratch', d: polyline([P(14, -12), P(21, -16)]) + polyline([P(15, -9), P(20, -12)]), stroke: { color: C.scratch, width: 1.4 * s }, z: zf + 1.8 });
  if (h.tear) parts.push({ k: pre + 'tear', d: smooth([P(-17 + f * 7, 11), P(-15 + f * 7, 16 + 8 * h.tear), P(-19 + f * 7, 16 + 8 * h.tear)]) + smooth([P(17 + f * 7, 11), P(19 + f * 7, 16 + 8 * h.tear), P(15 + f * 7, 16 + 8 * h.tear)]), fill: { color: '#BFE6FF', opacity: 0.9 }, stroke: { color: '#5E8FC0', width: 0.9 * s }, z: zf + 1.9 });
  if (h.sweat) parts.push({ k: pre + 'sweat', d: smooth([P(27, -12), P(31, -2), P(27, 1), P(24, -3)]), fill: '#CFEAFF', stroke: ink(1.2), z: zf + 5 });
  return parts;
}
const xy = (p) => [p.x, p.y];
