import { DEFAULT_TRANSFORM } from './project.js';
import { sampleTransform } from './tween.js';
import type { DrawObject, Keyframe, Transform2D, Vec2 } from './types.js';

/** Axis-aligned rectangle in local (untransformed) object space. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 2D affine matrix [a, b, c, d, e, f] (same layout as canvas setTransform). */
export type Mat2D = [number, number, number, number, number, number];

export type TextMeasurer = (text: string, font: string) => number;

export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const HANDLE_IDS: HandleId[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

const DEG = Math.PI / 180;

function boundsOfPoints(points: Vec2[], pad = 0): Rect {
  if (points.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
}

function pathPoints(path: string): Vec2[] {
  const nums = (path.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []).map(Number);
  const pts: Vec2[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] });
  return pts;
}

/** Approximate text width when no DOM canvas is available (CLI / tests). */
export const approxTextMeasurer: TextMeasurer = (text, font) => {
  const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 32);
  return text.length * size * 0.58;
};

export function textFont(obj: Extract<DrawObject, { type: 'text' }>): string {
  return `${obj.fontWeight ?? 700} ${obj.fontSize ?? 32}px ${obj.fontFamily ?? 'Plus Jakarta Sans, system-ui, sans-serif'}`;
}

/** Local-space bounds of an object's geometry (before its transform). */
export function localBounds(obj: DrawObject, measure: TextMeasurer = approxTextMeasurer): Rect {
  switch (obj.type) {
    case 'stroke':
      return boundsOfPoints(obj.points, obj.brush.size / 2);
    case 'shape': {
      const pad = (obj.stroke?.width ?? 0) / 2;
      if (obj.shape === 'rect' || obj.shape === 'ellipse') {
        const x = Math.min(obj.x, obj.x + (obj.w ?? 0));
        const y = Math.min(obj.y, obj.y + (obj.h ?? 0));
        return { x: x - pad, y: y - pad, w: Math.abs(obj.w ?? 0) + pad * 2, h: Math.abs(obj.h ?? 0) + pad * 2 };
      }
      if (obj.shape === 'line') {
        return boundsOfPoints([{ x: obj.x, y: obj.y }, { x: obj.x2 ?? obj.x, y: obj.y2 ?? obj.y }], pad);
      }
      if (obj.shape === 'polygon') return boundsOfPoints(obj.points ?? [], pad);
      return boundsOfPoints(obj.path ? pathPoints(obj.path) : [], pad);
    }
    case 'text': {
      const size = obj.fontSize ?? 32;
      const w = measure(obj.text, textFont(obj));
      const align = obj.align ?? 'left';
      const x = align === 'center' ? obj.x - w / 2 : align === 'right' || align === 'end' ? obj.x - w : obj.x;
      const base = obj.baseline ?? 'alphabetic';
      const y = base === 'top' || base === 'hanging' ? obj.y : base === 'middle' ? obj.y - size / 2 : base === 'bottom' ? obj.y - size : obj.y - size * 0.8;
      return { x, y, w, h: size };
    }
    case 'particles': {
      const r = obj.speed + obj.size;
      return { x: obj.x - r, y: obj.y - r, w: r * 2, h: r * 2 + (obj.gravity ?? 120) };
    }
  }
}

/** Pivot the renderer uses for rotation/scale (kept in sync with renderer.ts). */
export function objectPivot(obj: DrawObject): Vec2 {
  if (obj.type === 'shape') return { x: obj.x + (obj.w ?? 0) / 2, y: obj.y + (obj.h ?? 0) / 2 };
  if (obj.type === 'stroke') return { x: 0, y: 0 };
  return { x: obj.x, y: obj.y };
}

/** Transform of the object at a time (keyframes override the base transform). */
export function objectTransformAt(obj: DrawObject, timeMs = 0): Transform2D {
  return sampleTransform(obj.keyframes, timeMs, obj.transform);
}

export function matMul(m: Mat2D, n: Mat2D): Mat2D {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export function matInvert(m: Mat2D): Mat2D {
  const det = m[0] * m[3] - m[1] * m[2] || 1e-12;
  return [
    m[3] / det,
    -m[1] / det,
    -m[2] / det,
    m[0] / det,
    (m[2] * m[5] - m[3] * m[4]) / det,
    (m[1] * m[4] - m[0] * m[5]) / det,
  ];
}

export function matApply(m: Mat2D, p: Vec2): Vec2 {
  return { x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] };
}

/** Local→world matrix for a transform + pivot (identical to renderer applyTransform). */
export function transformMatrix(tf: Transform2D, pivot: Vec2): Mat2D {
  const c = Math.cos(tf.rotation * DEG);
  const s = Math.sin(tf.rotation * DEG);
  const a = c * tf.scaleX;
  const b = s * tf.scaleX;
  const cc = -s * tf.scaleY;
  const d = c * tf.scaleY;
  const e = tf.x + pivot.x - (a * pivot.x + cc * pivot.y);
  const f = tf.y + pivot.y - (b * pivot.x + d * pivot.y);
  return [a, b, cc, d, e, f];
}

export function objectMatrix(obj: DrawObject, timeMs = 0): Mat2D {
  return transformMatrix(objectTransformAt(obj, timeMs), objectPivot(obj));
}

export function rectCorners(r: Rect): Vec2[] {
  return [
    { x: r.x, y: r.y },
    { x: r.x + r.w, y: r.y },
    { x: r.x + r.w, y: r.y + r.h },
    { x: r.x, y: r.y + r.h },
  ];
}

/** World-space corners (nw, ne, se, sw) of an object's oriented bounding box. */
export function worldCorners(obj: DrawObject, timeMs = 0, measure?: TextMeasurer): Vec2[] {
  const m = objectMatrix(obj, timeMs);
  return rectCorners(localBounds(obj, measure)).map((p) => matApply(m, p));
}

export function worldAabb(obj: DrawObject, timeMs = 0, measure?: TextMeasurer): Rect {
  return boundsOfPoints(worldCorners(obj, timeMs, measure));
}

export function unionRects(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  const pts = rects.flatMap(rectCorners);
  return boundsOfPoints(pts);
}

/** Is a world point inside the object's oriented bounds (with tolerance in world px)? */
export function hitTestObject(obj: DrawObject, p: Vec2, timeMs = 0, tolerance = 4, measure?: TextMeasurer): boolean {
  const m = objectMatrix(obj, timeMs);
  const local = matApply(matInvert(m), p);
  const r = localBounds(obj, measure);
  const sx = Math.hypot(m[0], m[1]) || 1;
  const sy = Math.hypot(m[2], m[3]) || 1;
  const tx = tolerance / sx;
  const ty = tolerance / sy;
  return local.x >= r.x - tx && local.x <= r.x + r.w + tx && local.y >= r.y - ty && local.y <= r.y + r.h + ty;
}

/** Local-space anchor point for a handle (0..1 within bounds). */
export function handleUnit(h: HandleId): Vec2 {
  const x = h.includes('w') ? 0 : h.includes('e') ? 1 : 0.5;
  const y = h.includes('n') ? 0 : h.includes('s') ? 1 : 0.5;
  return { x, y };
}

export interface ResizeOptions {
  /** Keep aspect ratio (Shift) */
  keepAspect?: boolean;
  /** Scale from the centre instead of the opposite handle (Alt) */
  fromCenter?: boolean;
  /** Minimum absolute scale */
  minScale?: number;
}

/**
 * Compute a new transform so that dragging `handle` to world point `pointer`
 * resizes the object while keeping the opposite handle (or the centre) fixed.
 * Exact for rotated objects: math happens in the object's rotated frame.
 */
export function resizeTransform(
  start: Transform2D,
  bounds: Rect,
  pivot: Vec2,
  handle: HandleId,
  pointer: Vec2,
  opts: ResizeOptions = {},
): Transform2D {
  const minScale = opts.minScale ?? 0.01;
  const u = handleUnit(handle);
  const anchorUnit = opts.fromCenter ? { x: 0.5, y: 0.5 } : { x: 1 - u.x, y: 1 - u.y };
  const anchorLocal = { x: bounds.x + anchorUnit.x * bounds.w, y: bounds.y + anchorUnit.y * bounds.h };
  const m0 = transformMatrix(start, pivot);
  const anchorWorld = matApply(m0, anchorLocal);
  const rad = start.rotation * DEG;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  // pointer relative to anchor, in the object's rotated frame
  const dx = pointer.x - anchorWorld.x;
  const dy = pointer.y - anchorWorld.y;
  const rx = dx * cos + dy * sin;
  const ry = -dx * sin + dy * cos;
  const factor = opts.fromCenter ? 2 : 1;
  let sx = start.scaleX;
  let sy = start.scaleY;
  const affectsX = u.x !== 0.5;
  const affectsY = u.y !== 0.5;
  const dirX = u.x === 1 ? 1 : -1;
  const dirY = u.y === 1 ? 1 : -1;
  if (affectsX && bounds.w > 0) sx = (rx * dirX * factor) / bounds.w;
  if (affectsY && bounds.h > 0) sy = (ry * dirY * factor) / bounds.h;
  if (opts.keepAspect) {
    const rX = sx / (start.scaleX || 1);
    const rY = sy / (start.scaleY || 1);
    let r: number;
    if (affectsX && affectsY) r = Math.abs(rX) > Math.abs(rY) ? rX : rY;
    else r = affectsX ? rX : rY;
    sx = start.scaleX * r;
    sy = start.scaleY * r;
  }
  const clamp = (v: number) => (Math.abs(v) < minScale ? (v < 0 ? -minScale : minScale) : v);
  sx = clamp(sx);
  sy = clamp(sy);
  const next: Transform2D = { ...start, scaleX: sx, scaleY: sy };
  // translate so the anchor stays put
  const m1 = transformMatrix(next, pivot);
  const moved = matApply(m1, anchorLocal);
  next.x += anchorWorld.x - moved.x;
  next.y += anchorWorld.y - moved.y;
  return next;
}

/** Rotate a transform by `deltaDeg` around a world-space centre. */
export function rotateTransformAround(start: Transform2D, pivot: Vec2, centerWorld: Vec2, deltaDeg: number): Transform2D {
  const m0 = transformMatrix(start, pivot);
  const centerLocal = matApply(matInvert(m0), centerWorld);
  const next: Transform2D = { ...start, rotation: start.rotation + deltaDeg };
  const moved = matApply(transformMatrix(next, pivot), centerLocal);
  next.x += centerWorld.x - moved.x;
  next.y += centerWorld.y - moved.y;
  return next;
}

/** Uniformly scale a transform by `k` around a world-space anchor (used for multi-select). */
export function scaleTransformAround(start: Transform2D, pivot: Vec2, anchorWorld: Vec2, kx: number, ky = kx): Transform2D {
  const m0 = transformMatrix(start, pivot);
  const anchorLocal = matApply(matInvert(m0), anchorWorld);
  const next: Transform2D = { ...start, scaleX: start.scaleX * kx, scaleY: start.scaleY * ky };
  // keep the anchor fixed, and move the object's centre proportionally
  const moved = matApply(transformMatrix(next, pivot), anchorLocal);
  next.x += anchorWorld.x - moved.x;
  next.y += anchorWorld.y - moved.y;
  return next;
}

export function snapAngle(deg: number, step = 15): number {
  return Math.round(deg / step) * step;
}

export interface SnapResult {
  dx: number;
  dy: number;
  guidesX: number[];
  guidesY: number[];
}

/**
 * Snap a moving rect to target edges/centres. Returns the corrected delta and
 * the guide lines that matched (world coordinates).
 */
export function snapRect(moving: Rect, targetsX: number[], targetsY: number[], threshold: number): SnapResult {
  const xs = [moving.x, moving.x + moving.w / 2, moving.x + moving.w];
  const ys = [moving.y, moving.y + moving.h / 2, moving.y + moving.h];
  let best = { d: threshold + 1, v: 0 };
  for (const x of xs) for (const t of targetsX) { const d = Math.abs(t - x); if (d < best.d) best = { d, v: t - x }; }
  let bestY = { d: threshold + 1, v: 0 };
  for (const y of ys) for (const t of targetsY) { const d = Math.abs(t - y); if (d < bestY.d) bestY = { d, v: t - y }; }
  const dx = best.d <= threshold ? best.v : 0;
  const dy = bestY.d <= threshold ? bestY.v : 0;
  const guidesX = best.d <= threshold ? targetsX.filter((t) => xs.some((x) => Math.abs(x + dx - t) < 0.5)) : [];
  const guidesY = bestY.d <= threshold ? targetsY.filter((t) => ys.some((y) => Math.abs(y + dy - t) < 0.5)) : [];
  return { dx, dy, guidesX, guidesY };
}

export function fullTransform(partial?: Partial<Transform2D>): Transform2D {
  return { ...DEFAULT_TRANSFORM, ...partial };
}

/** Insert or replace a keyframe at time t (merging transform fields). */
export function upsertKeyframe(keyframes: Keyframe[], t: number, transform: Partial<Transform2D>, easing?: Keyframe['easing']): Keyframe[] {
  const out = keyframes.map((k) => ({ ...k, transform: { ...k.transform } }));
  const existing = out.find((k) => Math.abs(k.t - t) < 0.5);
  if (existing) {
    existing.transform = { ...existing.transform, ...transform };
    if (easing) existing.easing = easing;
  } else {
    out.push({ t, transform: { ...transform }, ...(easing ? { easing } : {}) });
  }
  return out.sort((a, b) => a.t - b.t);
}

/** Camera matrix (project space → canvas space) at a time, mirroring renderProject. */
export function cameraMatrix(project: import('./types.js').PaintProject, timeMs = 0): Mat2D {
  const cam = sampleCameraState(project, timeMs);
  const w2 = project.width / 2;
  const h2 = project.height / 2;
  const r = (cam.rotation ?? 0) * DEG;
  const c = Math.cos(r) * cam.zoom;
  const s = Math.sin(r) * cam.zoom;
  // translate(w2,h2) · rotate · scale · translate(-w2-cx, -h2-cy)
  const tx = -w2 - cam.x;
  const ty = -h2 - cam.y;
  return [c, s, -s, c, w2 + c * tx - s * ty, h2 + s * tx + c * ty];
}

import { sampleCamera } from './tween.js';
function sampleCameraState(project: import('./types.js').PaintProject, timeMs: number) {
  return sampleCamera(project.camera, project.cameraKeyframes, timeMs);
}
