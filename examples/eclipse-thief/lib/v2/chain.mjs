// Spine/chain deformation: a smooth Catmull-Rom spine through joints, offset by an anatomical
// radius profile (separate left/right so calves, deltoids and chests bulge on one side).
// Bending a joint bends the whole silhouette smoothly — no capsule seams.
import { r1 } from '../geom.mjs';

const lerp = (a, b, t) => a + (b - a) * t;
export function spine(joints, n = 28) {
  const pts = [];
  const g = (i) => joints[Math.max(0, Math.min(joints.length - 1, i))];
  const segs = joints.length - 1;
  for (let k = 0; k <= n; k++) {
    const u = (k / n) * segs, i = Math.min(segs - 1, Math.floor(u)), t = u - i;
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const t2 = t * t, t3 = t2 * t;
    pts.push({
      x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    });
  }
  return pts;
}
/** profile: [[u, rLeft, rRight], ...] with u in 0..1 along the chain. */
export function profileAt(profile, u) {
  for (let i = 0; i < profile.length - 1; i++) {
    const [ua, la, ra] = profile[i], [ub, lb, rb] = profile[i + 1];
    if (u <= ub) { const t = (u - ua) / (ub - ua || 1); const e = t * t * (3 - 2 * t); return [lerp(la, lb, e), lerp(ra, rb, e)]; }
  }
  const l = profile[profile.length - 1]; return [l[1], l[2]];
}
/** Returns {left, right, sp} contour point lists for a chain. scale multiplies radii; zGrow (0..1) widens toward the end (foreshortening toward camera). */
export function chainContours(joints, profile, { scale = 1, zGrow = 0, n = 28 } = {}) {
  const sp = spine(joints, n);
  const L = [], R = [];
  for (let k = 0; k <= n; k++) {
    const a = sp[Math.max(0, k - 1)], b = sp[Math.min(n, k + 1)];
    let tx = b.x - a.x, ty = b.y - a.y; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const nx = -ty, ny = tx;
    const u = k / n;
    const [rl, rr] = profileAt(profile, u);
    const z = 1 + zGrow * u * u * 1.6;
    L.push({ x: sp[k].x + nx * rl * scale * z, y: sp[k].y + ny * rl * scale * z });
    R.push({ x: sp[k].x - nx * rr * scale * z, y: sp[k].y - ny * rr * scale * z });
  }
  return { L, R, sp };
}
function smoothClosed(pts) {
  const n = pts.length; let d = `M${r1(pts[0].x)},${r1(pts[0].y)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += `C${r1(p1.x + (p2.x - p0.x) / 6)},${r1(p1.y + (p2.y - p0.y) / 6)} ${r1(p2.x - (p3.x - p1.x) / 6)},${r1(p2.y - (p3.y - p1.y) / 6)} ${r1(p2.x)},${r1(p2.y)}`;
  }
  return d + 'Z';
}
/** Closed limb path with rounded caps. */
export function chainPath(joints, profile, opts = {}) {
  const { L, R, sp } = chainContours(joints, profile, opts);
  const capPts = (c, from, to, dir) => { const out = []; const a0 = Math.atan2(from.y - c.y, from.x - c.x), a1 = Math.atan2(to.y - c.y, to.x - c.x); let da = a1 - a0; if (dir > 0 && da < 0) da += Math.PI * 2; if (dir < 0 && da > 0) da -= Math.PI * 2; const r = (Math.hypot(from.x - c.x, from.y - c.y) + Math.hypot(to.x - c.x, to.y - c.y)) / 2; for (let k = 1; k < 4; k++) { const a = a0 + (da * k) / 4; out.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r }); } return out; };
  const n = sp.length - 1;
  const endCap = opts.capEnd === false ? [] : capPts(sp[n], L[n], R[n], -1);
  const startCap = opts.capStart === false ? [] : capPts(sp[0], R[0], L[0], -1);
  return smoothClosed([...L, ...endCap, ...R.slice().reverse(), ...startCap]);
}
/** A strip on one side of a chain (for cel/rim accents that follow the bend). side: 1 = left contour, -1 = right. */
export function chainStrip(joints, profile, side, k = 0.45, opts = {}) {
  const { L, R, sp } = chainContours(joints, profile, opts);
  const edge = side > 0 ? L : R;
  const inner = edge.map((p, i) => ({ x: sp[i].x + (p.x - sp[i].x) * (1 - k), y: sp[i].y + (p.y - sp[i].y) * (1 - k) }));
  return smoothClosed([...edge, ...inner.reverse()]);
}
