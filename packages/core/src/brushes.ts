import type { BrushSettings, StrokePoint } from './types.js';

/** Chaikin corner-cutting for stroke smoothing (agent strokes look polished). */
export function smoothStroke(points: StrokePoint[], passes = 2): StrokePoint[] {
  if (points.length < 3 || passes <= 0) return points.slice();
  let pts = points.slice();
  for (let p = 0; p < passes; p++) {
    if (pts.length < 3) break;
    const next: StrokePoint[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      next.push({
        x: 0.75 * a.x + 0.25 * b.x,
        y: 0.75 * a.y + 0.25 * b.y,
        p: (a.p ?? 0.5) * 0.75 + (b.p ?? 0.5) * 0.25,
        v: ((a.v ?? 0) + (b.v ?? 0)) / 2,
      });
      next.push({
        x: 0.25 * a.x + 0.75 * b.x,
        y: 0.25 * a.y + 0.75 * b.y,
        p: (a.p ?? 0.5) * 0.25 + (b.p ?? 0.5) * 0.75,
        v: ((a.v ?? 0) + (b.v ?? 0)) / 2,
      });
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  return pts;
}

function dist(a: StrokePoint, b: StrokePoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

/** Resample stroke by spacing for stamp-based brushes */
export function resampleStroke(points: StrokePoint[], spacing: number): StrokePoint[] {
  if (points.length === 0) return [];
  if (spacing <= 0.5) return points.slice();
  const out: StrokePoint[] = [points[0]];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const d = dist(a, b);
    if (d === 0) continue;
    let pos = spacing - carry;
    while (pos <= d) {
      const t = pos / d;
      out.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        p: (a.p ?? 0.5) + ((b.p ?? 0.5) - (a.p ?? 0.5)) * t,
        v: (a.v ?? 0) + ((b.v ?? 0) - (a.v ?? 0)) * t,
      });
      pos += spacing;
    }
    carry = d - (pos - spacing);
  }
  const last = points[points.length - 1];
  const prev = out[out.length - 1];
  if (!prev || dist(prev, last) > 0.1) out.push(last);
  return out;
}

function taperFactor(index: number, count: number, taper: number): number {
  if (taper <= 0 || count < 2) return 1;
  const edge = Math.max(1, Math.floor(count * taper));
  const fromStart = index < edge ? index / edge : 1;
  const fromEnd = index > count - 1 - edge ? (count - 1 - index) / edge : 1;
  return Math.max(0.05, Math.min(fromStart, fromEnd));
}

function pointWidth(brush: BrushSettings, point: StrokePoint, taperMul: number): number {
  const pressure = point.p ?? 0.5;
  const pw = brush.pressureWidth ?? 0.5;
  const vel = point.v ?? 0;
  const velMul = 1 / (1 + vel * 0.002);
  const pressureMul = 1 - pw + pw * (0.25 + pressure * 0.75);
  return Math.max(0.5, brush.size * pressureMul * velMul * taperMul);
}

function pointOpacity(brush: BrushSettings, point: StrokePoint): number {
  const pressure = point.p ?? 0.5;
  const po = brush.pressureOpacity ?? 0;
  return brush.opacity * (1 - po + po * pressure);
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Render an expressive stroke onto a 2D context.
 * Shared by browser editor and headless @napi-rs/canvas.
 */
export function drawStroke(
  ctx: CanvasRenderingContext2D,
  brush: BrushSettings,
  rawPoints: StrokePoint[],
  reveal = 1,
): void {
  if (rawPoints.length === 0) return;
  const visibleCount = Math.max(1, Math.floor(rawPoints.length * Math.min(1, Math.max(0, reveal))));
  const sliced = rawPoints.slice(0, visibleCount);
  const smoothed = smoothStroke(sliced, brush.smoothing ?? 0);
  const spacing = (brush.spacing ?? (brush.kind === 'airbrush' || brush.kind === 'charcoal' || brush.kind === 'watercolor' ? 0.25 : 0.12)) * brush.size;
  const points = resampleStroke(smoothed, Math.max(1, spacing));
  if (points.length === 0) return;

  ctx.save();
  ctx.globalCompositeOperation = brush.blendMode ?? 'source-over';

  if (brush.kind === 'neon') {
    // Glow pass
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const taperMul = taperFactor(i, points.length, brush.taper ?? 0.2);
      const w = pointWidth(brush, pt, taperMul) * 2.2;
      const alpha = pointOpacity(brush, pt) * 0.35;
      const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, w);
      grad.addColorStop(0, hexToRgba(brush.color, alpha));
      grad.addColorStop(1, hexToRgba(brush.color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, w, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (brush.kind === 'airbrush' || brush.kind === 'watercolor' || brush.kind === 'charcoal') {
    const soft = brush.softness ?? 0.6;
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const taperMul = taperFactor(i, points.length, brush.taper ?? 0.15);
      const w = pointWidth(brush, pt, taperMul) * (1 + soft);
      const alpha = pointOpacity(brush, pt) * (brush.kind === 'watercolor' ? 0.22 : brush.kind === 'charcoal' ? 0.28 : 0.18);
      // deterministic texture speckles from index
      const jitter = brush.kind === 'charcoal' ? ((i * 17) % 7) - 3 : ((i * 13) % 5) - 2;
      const gx = pt.x + jitter * soft;
      const gy = pt.y - jitter * soft * 0.5;
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, w);
      grad.addColorStop(0, hexToRgba(brush.color, alpha));
      grad.addColorStop(1, hexToRgba(brush.color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(gx, gy, w, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Connected tapered ribbon (ink / pencil / marker / neon core)
    ctx.lineCap = brush.kind === 'marker' ? 'square' : 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const taperMul = taperFactor(i, points.length, brush.taper ?? 0.2);
      const w = pointWidth(brush, b, taperMul) * (brush.kind === 'pencil' ? 0.7 : brush.kind === 'marker' ? 1.35 : 1);
      const alpha = pointOpacity(brush, b) * (brush.kind === 'pencil' ? 0.75 : 1);
      ctx.strokeStyle = hexToRgba(brush.color, alpha);
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/** Build a pressure-varied stroke along a polyline — handy for agents. */
export function strokeFromPolyline(
  points: Array<{ x: number; y: number }>,
  opts?: { pressureStart?: number; pressureMid?: number; pressureEnd?: number },
): StrokePoint[] {
  if (points.length === 0) return [];
  const ps = opts?.pressureStart ?? 0.25;
  const pm = opts?.pressureMid ?? 1;
  const pe = opts?.pressureEnd ?? 0.2;
  return points.map((pt, i) => {
    const t = points.length === 1 ? 0.5 : i / (points.length - 1);
    const p = t < 0.5 ? ps + (pm - ps) * (t * 2) : pm + (pe - pm) * ((t - 0.5) * 2);
    return { x: pt.x, y: pt.y, p, v: 0 };
  });
}

/** Arc / bezier helper for logo reveals */
export function sampleCubicBezier(
  p0: StrokePoint,
  p1: StrokePoint,
  p2: StrokePoint,
  p3: StrokePoint,
  segments = 32,
): StrokePoint[] {
  const out: StrokePoint[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const u = 1 - t;
    const x = u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x;
    const y = u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y;
    const p = u * u * u * (p0.p ?? 0.5) + 3 * u * u * t * (p1.p ?? 0.8) + 3 * u * t * t * (p2.p ?? 0.8) + t * t * t * (p3.p ?? 0.3);
    out.push({ x, y, p });
  }
  return out;
}
