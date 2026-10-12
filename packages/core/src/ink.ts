/**
 * Hand-inked line rendering and cel shading for vector shapes.
 * - parsePathPoints: flatten an SVG path (M/L/H/V/C/S/Q/Z, abs + rel) into polylines.
 * - drawInkOutline: variable-width tapered "brush pen" outline with line-weight rules and line boil.
 * - drawCel: two-tone cel shadow + rim light from a light direction, via clip/even-odd masks.
 */
import type { CelStyle, StrokeStyle } from './types.js';

export interface Pt { x: number; y: number }
export interface SubPath { pts: Pt[]; closed: boolean }

export function parsePathPoints(d: string, curveSteps = 8): SubPath[] {
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const out: SubPath[] = [];
  let cur: SubPath | null = null;
  let x = 0, y = 0, sx = 0, sy = 0, cmd = '', i = 0;
  let lcx = 0, lcy = 0;
  const num = () => parseFloat(toks[i++]);
  const push = (px: number, py: number) => { if (!cur) { cur = { pts: [{ x, y }], closed: false }; out.push(cur); } cur.pts.push({ x: px, y: py }); x = px; y = py; };
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === 'Z') { if (cur) { cur.closed = true; x = sx; y = sy; } cur = null; continue; }
    if (C === 'M') { const nx = num() + (rel ? x : 0), ny = num() + (rel ? y : 0); x = sx = nx; y = sy = ny; cur = { pts: [{ x, y }], closed: false }; out.push(cur); cmd = rel ? 'l' : 'L'; continue; }
    if (C === 'L') { push(num() + (rel ? x : 0), num() + (rel ? y : 0)); continue; }
    if (C === 'H') { push(num() + (rel ? x : 0), y); continue; }
    if (C === 'V') { push(x, num() + (rel ? y : 0)); continue; }
    if (C === 'C' || C === 'S' || C === 'Q') {
      let c1x: number, c1y: number, c2x: number, c2y: number;
      const ox = rel ? x : 0, oy = rel ? y : 0;
      if (C === 'C') { c1x = num() + ox; c1y = num() + oy; c2x = num() + ox; c2y = num() + oy; }
      else if (C === 'S') { c1x = 2 * x - lcx; c1y = 2 * y - lcy; c2x = num() + ox; c2y = num() + oy; }
      else { const qx = num() + ox, qy = num() + oy; c1x = x + (2 / 3) * (qx - x); c1y = y + (2 / 3) * (qy - y); const ex0 = parseFloat(toks[i]) + ox, ey0 = parseFloat(toks[i + 1]) + oy; c2x = ex0 + (2 / 3) * (qx - ex0); c2y = ey0 + (2 / 3) * (qy - ey0); }
      const ex = num() + ox, ey = num() + oy;
      const x0 = x, y0 = y;
      const est = Math.hypot(c1x - x0, c1y - y0) + Math.hypot(c2x - c1x, c2y - c1y) + Math.hypot(ex - c2x, ey - c2y);
      const steps = Math.max(2, Math.min(32, Math.round(est / 5), curveSteps * 4));
      for (let k = 1; k <= steps; k++) {
        const t = k / steps, u = 1 - t;
        push(u * u * u * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex, u * u * u * y0 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey);
      }
      lcx = c2x; lcy = c2y;
      continue;
    }
    i++; // unsupported token: skip
  }
  return out.filter((s) => s.pts.length > 1);
}

function hash(n: number): number { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

/** True if the stroke style asks for inked (variable-width) rendering. */
export function isInk(s?: StrokeStyle): boolean { return !!s && (s.taper != null || s.weight != null || s.boil != null); }

export function drawInkOutline(ctx: CanvasRenderingContext2D, d: string, s: StrokeStyle, timeMs: number, lightDeg?: number): void {
  const subs = parsePathPoints(d);
  const base = s.width;
  const weight = s.weight ?? 0.6; // 0 = uniform, 1 = strong thick/thin
  const taper = s.taper ?? 0.25;
  const la = ((s.light ?? lightDeg ?? -60) * Math.PI) / 180;
  const L = { x: Math.cos(la), y: Math.sin(la) };
  const boil = s.boil ?? 0;
  const frame = boil ? Math.floor(timeMs / (s.boilMs ?? 125)) : 0;
  const seed = s.seed ?? 1;
  ctx.fillStyle = s.color;
  if (s.opacity != null) ctx.globalAlpha *= s.opacity;
  ctx.beginPath();
  subs.forEach((sp, si) => {
    let pts = sp.pts;
    if (sp.closed && pts.length > 2) { const a = pts[0], b = pts[pts.length - 1]; if (Math.hypot(a.x - b.x, a.y - b.y) > 0.01) pts = [...pts, a]; }
    const n = pts.length;
    if (boil) pts = pts.map((p, k) => ({ x: p.x + (hash(seed * 7 + si * 131 + k * 1.37 + frame * 17.1) - 0.5) * boil * 2, y: p.y + (hash(seed * 13 + si * 71 + k * 2.11 + frame * 9.7) - 0.5) * boil * 2 }));
    // orientation for outward normals of closed shapes
    let area = 0; for (let k = 0; k < n - 1; k++) area += pts[k].x * pts[k + 1].y - pts[k + 1].x * pts[k].y;
    const orient = area >= 0 ? 1 : -1;
    const cum: number[] = [0]; for (let k = 1; k < n; k++) cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
    const total = cum[n - 1] || 1;
    const w: number[] = [];
    for (let k = 0; k < n; k++) {
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(n - 1, k + 1)];
      let tx = b.x - a.x, ty = b.y - a.y; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const nx = ty * orient, ny = -tx * orient; // outward normal (screen coords, y down)
      // line-weight rule: edges facing away from the light are heavier
      const facing = -(nx * L.x + ny * L.y);
      let k1 = 1 + weight * 0.65 * facing;
      // hand pressure variation
      k1 *= 1 + weight * 0.18 * Math.sin(cum[k] * 0.045 + seed + si);
      if (!sp.closed && taper > 0) { const e = Math.min(cum[k], total - cum[k]) / (taper * total * 0.5 + 1e-6); k1 *= Math.min(1, 0.12 + 0.88 * Math.min(1, e)); }
      w.push(Math.max(0.15, base * k1) / 2);
    }
    for (let k = 0; k < n - 1; k++) {
      const a = pts[k], b = pts[k + 1];
      let tx = b.x - a.x, ty = b.y - a.y; const tl = Math.hypot(tx, ty); if (tl < 1e-6) continue; tx /= tl; ty /= tl;
      const nx = -ty, ny = tx;
      const q = [{ x: a.x + nx * w[k], y: a.y + ny * w[k] }, { x: b.x + nx * w[k + 1], y: b.y + ny * w[k + 1] }, { x: b.x - nx * w[k + 1], y: b.y - ny * w[k + 1] }, { x: a.x - nx * w[k], y: a.y - ny * w[k] }];
      const cr = (q[1].x - q[0].x) * (q[2].y - q[0].y) - (q[1].y - q[0].y) * (q[2].x - q[0].x);
      const ord = cr > 0 ? q : [q[0], q[3], q[2], q[1]];
      ctx.moveTo(ord[0].x, ord[0].y); for (let j = 1; j < 4; j++) ctx.lineTo(ord[j].x, ord[j].y); ctx.closePath();
    }
    for (let k = 0; k < n; k++) { ctx.moveTo(pts[k].x + w[k], pts[k].y); ctx.arc(pts[k].x, pts[k].y, w[k], 0, Math.PI * 2); }
  });
  ctx.fill('nonzero');
}

/** Cel shading inside a closed path: shadow (2 tones) on the side away from light, rim light on the lit edge. */
export function drawCel(ctx: CanvasRenderingContext2D, path: Path2D, cel: CelStyle, lightDeg?: number, rimOverride?: string): void {
  const la = ((cel.light ?? lightDeg ?? -60) * Math.PI) / 180;
  const L = { x: Math.cos(la), y: Math.sin(la) };
  const big = 1e5;
  const band = (dist: number, color: string, side: 1 | -1) => {
    ctx.save();
    ctx.clip(path);
    // region = shape minus (shape shifted toward the light by dist) => far side band (side=1); toward -L => lit rim (side=-1)
    const p2 = new Path2D();
    p2.rect(-big, -big, 2 * big, 2 * big);
    const m = new DOMMatrixShim(side * L.x * dist, side * L.y * dist);
    p2.addPath(path, m as unknown as DOMMatrix2DInit);
    ctx.clip(p2, 'evenodd');
    ctx.fillStyle = color;
    ctx.fillRect(-big, -big, 2 * big, 2 * big);
    ctx.restore();
  };
  if (cel.shade) band(cel.shadeDist ?? 10, cel.shade, 1);
  if (cel.shade2) band(cel.shade2Dist ?? 5, cel.shade2, 1);
  const rim = rimOverride ?? cel.rim;
  if (rim) band(cel.rimDist ?? 3, rim, -1);
}
class DOMMatrixShim { a = 1; b = 0; c = 0; d = 1; e: number; f: number; constructor(e: number, f: number) { this.e = e; this.f = f; } }
