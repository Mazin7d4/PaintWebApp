// Geometry + path building for code-drawn key drawings (reusable across episodes).
export const D2R = Math.PI / 180;
export const r1 = (n) => Math.round(n * 10) / 10;
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function rng(seed = 1) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
export const pt = (x, y) => ({ x, y });
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a, k) => ({ x: a.x * k, y: a.y * k });
export const len = (a) => Math.hypot(a.x, a.y);
export const norm = (a) => { const l = len(a) || 1; return { x: a.x / l, y: a.y / l }; };
export const perp = (a) => ({ x: -a.y, y: a.x });
export const polar = (o, ang, r) => ({ x: o.x + Math.cos(ang * D2R) * r, y: o.y + Math.sin(ang * D2R) * r });
export const mix = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

/** Affine frame: origin, rotation (deg), scale x/y. Maps local points to world. */
export function frame(ox, oy, rot = 0, sx = 1, sy = sx) {
  const c = Math.cos(rot * D2R), s = Math.sin(rot * D2R);
  return (x, y) => ({ x: ox + (x * sx) * c - (y * sy) * s, y: oy + (x * sx) * s + (y * sy) * c });
}

/** Closed polygon through points (straight segments). */
export function poly(pts) {
  return 'M' + pts.map((p) => `${r1(p.x)},${r1(p.y)}`).join('L') + 'Z';
}
export function polyline(pts) { return 'M' + pts.map((p) => `${r1(p.x)},${r1(p.y)}`).join('L'); }

/** Smooth closed curve through points (Catmull-Rom -> cubic Bezier). tension 0..1 */
export function smooth(pts, closed = true, tension = 1) {
  const n = pts.length;
  if (n < 3) return poly(pts);
  const g = (i) => pts[closed ? (i + n) % n : clamp(i, 0, n - 1)];
  let d = `M${r1(pts[0].x)},${r1(pts[0].y)}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const k = tension / 6;
    const c1 = { x: p1.x + (p2.x - p0.x) * k, y: p1.y + (p2.y - p0.y) * k };
    const c2 = { x: p2.x - (p3.x - p1.x) * k, y: p2.y - (p3.y - p1.y) * k };
    d += `C${r1(c1.x)},${r1(c1.y)} ${r1(c2.x)},${r1(c2.y)} ${r1(p2.x)},${r1(p2.y)}`;
  }
  return closed ? d + 'Z' : d;
}
/** Mixed path: points with optional sharp flag ({x,y,sharp}) — smooth except at sharp corners. */
export function shape(pts, tension = 1) {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const p1 = pts[i], p2 = pts[(i + 1) % n];
    if (i === 0) d += `M${r1(p1.x)},${r1(p1.y)}`;
    const p0 = pts[(i - 1 + n) % n], p3 = pts[(i + 2) % n];
    const k = tension / 6;
    const c1 = p1.sharp ? p1 : { x: p1.x + (p2.x - p0.x) * k, y: p1.y + (p2.y - p0.y) * k };
    const c2 = p2.sharp ? p2 : { x: p2.x - (p3.x - p1.x) * k, y: p2.y - (p3.y - p1.y) * k };
    d += `C${r1(c1.x)},${r1(c1.y)} ${r1(c2.x)},${r1(c2.y)} ${r1(p2.x)},${r1(p2.y)}`;
  }
  return d + 'Z';
}
export const S = (x, y) => ({ x, y, sharp: true });

/** Tapered limb outline from a to b with radii ra, rb (rounded ends) as point list. */
export function limbPts(a, b, ra, rb, bulge = 0) {
  const dir = norm(sub(b, a)), n = perp(dir);
  const m = mix(a, b, 0.4);
  const rm = lerp(ra, rb, 0.4) * (1 + bulge);
  const pts = [];
  for (let k = 0; k <= 4; k++) { const ang = 90 + k * 45; pts.push(polarDir(a, dir, ang, ra)); }
  pts.push(add(m, mul(n, -rm)));
  for (let k = 0; k <= 4; k++) { const ang = -90 + k * 45; pts.push(polarDir(b, dir, ang, rb)); }
  pts.push(add(m, mul(n, rm)));
  return pts;
}
function polarDir(o, dir, angDeg, r) {
  const base = Math.atan2(dir.y, dir.x) + angDeg * D2R;
  return { x: o.x + Math.cos(base) * r, y: o.y + Math.sin(base) * r };
}
export function limb(a, b, ra, rb, bulge = 0) { return smooth(limbPts(a, b, ra, rb, bulge)); }
/** Cel shade strip inside a limb, on side `side` (+1/-1 of the a->b normal). Angular, not soft. */
export function limbShade(a, b, ra, rb, side = 1, k = 0.42) {
  const dir = norm(sub(b, a)), n = mul(perp(dir), side);
  const a1 = add(a, mul(n, ra * 0.98)), b1 = add(b, mul(n, rb * 0.98));
  const a2 = add(a, mul(n, ra * (1 - 2 * k))), b2 = add(mix(a, b, 0.92), mul(n, rb * (1 - 2 * k * 0.7)));
  return poly([a1, b1, b2, a2]);
}
/** Tapered ribbon/strand along a polyline: width w0 -> w1. */
export function strand(pts, w0, w1 = 0) {
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)];
    const n = perp(norm(sub(q, o)));
    const w = lerp(w0, w1, i / (pts.length - 1)) / 2;
    L.push(add(p, mul(n, w))); R.push(add(p, mul(n, -w)));
  }
  return smooth([...L, ...R.reverse()], true, 0.8);
}
/** Ellipse path (for use inside drawings). */
export function ell(cx, cy, rx, ry, rot = 0) {
  const pts = [];
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; const c = Math.cos(rot * D2R), s = Math.sin(rot * D2R); const x = Math.cos(a) * rx, y = Math.sin(a) * ry; pts.push({ x: cx + x * c - y * s, y: cy + x * s + y * c }); }
  return smooth(pts);
}
export function rectP(x, y, w, h) { return `M${r1(x)},${r1(y)}h${r1(w)}v${r1(h)}h${r1(-w)}Z`; }
/** Jagged star/burst polygon. */
export function burst(cx, cy, r0, r1_, n, seed = 1, rot = 0) {
  const r = rng(seed); const pts = [];
  for (let i = 0; i < n * 2; i++) { const a = rot + (i / (n * 2)) * 360 + (r() - 0.5) * (180 / n); const rr = i % 2 ? r0 * (0.7 + r() * 0.5) : r1_ * (0.75 + r() * 0.5); pts.push(polar({ x: cx, y: cy }, a, rr)); }
  return poly(pts);
}

/** Polygon sampling of a path-less shape: convert ellipse to points. */
export function ellPts(cx, cy, rx, ry, n = 20, rot = 0) {
  const out = []; const c = Math.cos(rot * D2R), s = Math.sin(rot * D2R);
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const x = Math.cos(a) * rx, y = Math.sin(a) * ry; out.push({ x: cx + x * c - y * s, y: cy + x * s + y * c }); }
  return out;
}
/** Sutherland–Hodgman: clip subject polygon by convex clip polygon. */
export function clip(subject, clipper) {
  let out = subject;
  const area = clipper.reduce((s, p, i) => { const q = clipper[(i + 1) % clipper.length]; return s + p.x * q.y - q.x * p.y; }, 0);
  const sgn = area > 0 ? 1 : -1;
  for (let i = 0; i < clipper.length; i++) {
    const A = clipper[i], B = clipper[(i + 1) % clipper.length];
    const inside = (p) => sgn * ((B.x - A.x) * (p.y - A.y) - (B.y - A.y) * (p.x - A.x)) >= 0;
    const inter = (p, q) => { const a1 = B.y - A.y, b1 = A.x - B.x, c1 = a1 * A.x + b1 * A.y; const a2 = q.y - p.y, b2 = p.x - q.x, c2 = a2 * p.x + b2 * p.y; const det = a1 * b2 - a2 * b1 || 1e-9; return { x: (b2 * c1 - b1 * c2) / det, y: (a1 * c2 - a2 * c1) / det }; };
    const input = out; out = [];
    for (let j = 0; j < input.length; j++) {
      const P = input[j], Q = input[(j + 1) % input.length];
      if (inside(Q)) { if (!inside(P)) out.push(inter(P, Q)); out.push(Q); } else if (inside(P)) out.push(inter(P, Q));
    }
    if (!out.length) break;
  }
  return out;
}
/** Quadratic bezier sampled into points. */
export function qpts(a, c, b, n = 8) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n; o.push({ x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x, y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y }); } return o; }
