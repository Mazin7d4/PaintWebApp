import { ease, lerp } from './easing.js';
import { DEFAULT_TRANSFORM } from './project.js';
import type {
  CameraKeyframe,
  CameraState,
  Keyframe,
  Transform2D,
} from './types.js';

function mergeTransform(base: Transform2D, partial?: Partial<Transform2D>): Transform2D {
  return { ...base, ...partial };
}

export function sampleTransform(keyframes: Keyframe[] | undefined, timeMs: number, base?: Partial<Transform2D>): Transform2D {
  const fallback = mergeTransform(DEFAULT_TRANSFORM, base);
  if (!keyframes || keyframes.length === 0) return fallback;

  const sorted = [...keyframes].sort((a, b) => a.t - b.t);
  if (timeMs <= sorted[0].t) return mergeTransform(fallback, sorted[0].transform);
  const last = sorted[sorted.length - 1];
  if (timeMs >= last.t) return mergeTransform(fallback, last.transform);

  let i = 0;
  while (i < sorted.length - 1 && sorted[i + 1].t < timeMs) i++;
  const a = sorted[i];
  const b = sorted[i + 1];
  const span = Math.max(1, b.t - a.t);
  const t = ease(b.easing ?? a.easing, (timeMs - a.t) / span);
  const ta = mergeTransform(fallback, a.transform);
  const tb = mergeTransform(fallback, b.transform);
  return {
    x: lerp(ta.x, tb.x, t),
    y: lerp(ta.y, tb.y, t),
    scaleX: lerp(ta.scaleX, tb.scaleX, t),
    scaleY: lerp(ta.scaleY, tb.scaleY, t),
    rotation: lerp(ta.rotation, tb.rotation, t),
    opacity: lerp(ta.opacity, tb.opacity, t),
  };
}

export function sampleCamera(
  base: CameraState | undefined,
  keyframes: CameraKeyframe[] | undefined,
  timeMs: number,
): CameraState {
  const fallback: CameraState = base ?? { x: 0, y: 0, zoom: 1, rotation: 0 };
  if (!keyframes || keyframes.length === 0) return fallback;
  const sorted = [...keyframes].sort((a, b) => a.t - b.t);
  if (timeMs <= sorted[0].t) return { ...fallback, ...sorted[0].camera };
  const last = sorted[sorted.length - 1];
  if (timeMs >= last.t) return { ...fallback, ...last.camera };

  let i = 0;
  while (i < sorted.length - 1 && sorted[i + 1].t < timeMs) i++;
  const a = sorted[i];
  const b = sorted[i + 1];
  const span = Math.max(1, b.t - a.t);
  const t = ease(b.easing ?? a.easing, (timeMs - a.t) / span);
  const ca = { ...fallback, ...a.camera };
  const cb = { ...fallback, ...b.camera };
  return {
    x: lerp(ca.x, cb.x, t),
    y: lerp(ca.y, cb.y, t),
    zoom: lerp(ca.zoom, cb.zoom, t),
    rotation: lerp(ca.rotation ?? 0, cb.rotation ?? 0, t),
  };
}

/** Squash & stretch helper for agents */
export function squashStretch(amount: number, axis: 'x' | 'y' = 'y'): Partial<Transform2D> {
  const a = Math.max(0.05, amount);
  if (axis === 'y') return { scaleY: a, scaleX: 1 / Math.sqrt(a) };
  return { scaleX: a, scaleY: 1 / Math.sqrt(a) };
}
