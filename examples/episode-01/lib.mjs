// Shared building blocks for "SPARK! Episode 01". Pure functions -> Paint Studio objects.
import { sampleTransform } from '../../packages/core/dist/index.js';

export const W = 1280;
export const H = 720;
export const FPS = 60;

/** Limited anime palette (14 colours). */
export const P = {
  ink: '#1B1530', night: '#141029', skyTop: '#2B2350', skyMid: '#7A4C8C', skyLow: '#F28C6B', glow: '#FFD27A',
  cityFar: '#4A3C7E', cityMid: '#2E2560', roof: '#1F1A3A', rim: '#6B5CB0',
  skin: '#FFE3CF', skinShade: '#F2B49E', blush: '#FF8FA3',
  hair: '#FF7EB6', hairShade: '#D9558F', hairLite: '#FFC2DD',
  skyDay: '#6EC3F5', skyDay2: '#D6F0FF', cloud: '#FFFFFF', cloudShade: '#CFE6F7', sunset: '#FFB36B', door: '#A9B4C8', doorShade: '#7D879C',
  boyHair: '#3A2A22', boyHairLite: '#6B4E3D', blazer: '#2C3E73', blazerShade: '#1D2950', tie: '#E63946', yan: '#3A0F2E', glint: '#FF1E3C', sweat: '#8FD3FF',
  hoodie: '#FF5A5F', hoodieShade: '#C7364F', skirt: '#2A2A4A', skirtShade: '#1A1A33',
  star: '#FFD600', starLite: '#FFF6B0', white: '#FFFFFF', iris: '#2EC4B6', pupil: '#13314A', mouth: '#8A1F3D',
};
export const PALETTE = Object.entries(P).map(([id, hex]) => ({ id, hex, name: id }));

let counter = 0;
export const id = (p) => `${p}_${(++counter).toString(36)}`;
export function resetIds(prefix) { counter = 0; idPrefix = prefix; }
let idPrefix = '';
const oid = (p) => `${idPrefix}${id(p)}`;

/** Deterministic RNG so every render is identical. */
export function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff);
}

export function layer(name, objects, parallax = 1, extra = {}) {
  return { id: oid('layer'), name, visible: true, opacity: 1, blendMode: 'source-over', parallax, objects, ...extra };
}

export function project(name, durationMs, layers, extra = {}) {
  return {
    version: 2, name, width: W, height: H, fps: FPS, background: P.night,
    style: { id: 'inked-cartoon' }, palette: PALETTE, layers,
    frames: [{ id: 'shot', name, duration: durationMs }],
    camera: { x: 0, y: 0, zoom: 1 },
    meta: { author: 'Paint Studio agent', description: name, tags: ['episode-01', 'anime'] },
    ...extra,
  };
}

// --- primitives -------------------------------------------------------------
export const path = (d, fill, o = {}) => ({
  type: 'shape', id: oid('p'), shape: 'path', x: 0, y: 0, path: d,
  ...(fill ? { fill: { color: fill, ...(o.opacity != null ? { opacity: o.opacity } : {}) } } : {}),
  ...(o.stroke ? { stroke: { color: o.stroke, width: o.width ?? 4, lineJoin: 'round', lineCap: 'round' } } : {}),
  ...(o.shadow ? { shadow: o.shadow } : {}),
});
export const ellipse = (cx, cy, w, h, fill, o = {}) => ({
  type: 'shape', id: oid('e'), shape: 'ellipse', x: cx - w / 2, y: cy - h / 2, w, h,
  ...(fill ? { fill: { color: fill, ...(o.opacity != null ? { opacity: o.opacity } : {}) } } : {}),
  ...(o.stroke ? { stroke: { color: o.stroke, width: o.width ?? 4 } } : {}),
  ...(o.shadow ? { shadow: o.shadow } : {}),
});
export const rect = (x, y, w, h, fill, o = {}) => ({
  type: 'shape', id: oid('r'), shape: 'rect', x, y, w, h,
  ...(fill ? { fill: o.gradient ? { gradient: o.gradient } : { color: fill, ...(o.opacity != null ? { opacity: o.opacity } : {}) } } : {}),
  ...(o.stroke ? { stroke: { color: o.stroke, width: o.width ?? 3 } } : {}),
  ...(o.radius ? { cornerRadius: o.radius } : {}),
});
export const line = (x, y, x2, y2, color, width = 3) => ({ type: 'shape', id: oid('l'), shape: 'line', x, y, x2, y2, stroke: { color, width } });
export const text = (str, x, y, size, fill, o = {}) => ({
  type: 'text', id: oid('t'), text: str, x, y, fontSize: size, fontFamily: o.font ?? 'Bangers, Luckiest Guy, Impact, sans-serif',
  fontWeight: o.weight ?? 400, align: o.align ?? 'center', baseline: 'middle', fill: { color: fill },
  ...(o.stroke ? { stroke: { color: o.stroke, width: o.width ?? 8, lineJoin: 'round' } } : {}),
  ...(o.shadow ? { shadow: o.shadow } : {}),
});
/** Pressure-tapered ink brush stroke from a polyline, optional write-on. */
export function inkStroke(points, color = P.ink, size = 8, o = {}) {
  const n = points.length;
  return {
    type: 'stroke', id: oid('s'),
    brush: { kind: o.kind ?? 'ink', size, color, opacity: o.opacity ?? 1, taper: o.taper ?? 0.35, smoothing: 3, pressureWidth: 0.7 },
    points: points.map(([x, y], i) => ({ x, y, p: 0.25 + 0.75 * Math.sin((Math.PI * i) / Math.max(1, n - 1)) })),
    ...(o.writeOnMs ? { writeOnMs: o.writeOnMs, writeOnDelayMs: o.delay ?? 0 } : {}),
  };
}
/** Inked tube (limb): ink outline under a coloured core. */
export const tube = (d, color, w) => [path(d, null, { stroke: P.ink, width: w + 7 }), path(d, null, { stroke: color, width: w })];
/** Cel-shaded part: base fill, hard shadow shape, then ink outline on top. */
export const cel = (d, base, shadeD, shade, outline = 4) => [
  path(d, base), ...(shadeD ? [path(shadeD, shade)] : []), path(d, null, { stroke: P.ink, width: outline }),
];
export function starPoly(r1, r2, cx = 0, cy = 0, n = 5) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1;
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

// --- rigging ----------------------------------------------------------------
/**
 * Bind parts to one shared track (all share pivot 0,0 = the rig origin), so the
 * whole character squashes/rotates around its feet. `show` maps a tag to time
 * windows [[from,to],...] where that part is visible (anime-style swaps: blinks,
 * mouth shapes, run-cycle drawings on twos).
 */
export function rig(parts, track, show = {}) {
  const groupKfs = track.map((k) => ({ t: k.t, transform: { opacity: 1, ...k.transform }, ...(k.easing ? { easing: k.easing } : {}) }));
  // windows ending at the scene end stay open so the final frame (t = duration) keeps faces
  const end = Math.max(0, ...Object.values(show).flat().map(([, b]) => b));
  return parts.map(({ obj, tag }) => {
    const o = { ...obj, pivot: { x: 0, y: 0 } };
    const windows = tag ? show[tag] : null;
    if (!windows) {
      o.keyframes = groupKfs;
      return o;
    }
    const vis = (t) => windows.some(([a, b]) => t >= a && (t < b || b >= end));
    const times = new Set(groupKfs.map((k) => k.t));
    for (const [a, b] of windows) for (const t of b >= end ? [a - 1, a] : [a - 1, a, b - 1, b]) if (t >= 0) times.add(t);
    o.keyframes = [...times].sort((a, b) => a - b).map((t) => {
      const g = groupKfs.find((k) => k.t === t);
      const pose = sampleTransform(groupKfs, t);
      return { t, transform: { ...pose, opacity: vis(t) ? (pose.opacity ?? 1) : 0 }, ...(g?.easing ? { easing: g.easing } : {}) };
    });
    return o;
  });
}

/** Periodic on/off windows, e.g. run cycle drawing A every other 100ms. */
export function cycle(from, to, period, phase = 0, duty = 0.5) {
  const out = [];
  for (let t = from + phase * period; t < to; t += period) out.push([Math.round(t), Math.round(Math.min(to, t + period * duty))]);
  return out;
}
