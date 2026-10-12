// Key-pose animation baked into Paint Studio key drawings (ShapeObject.drawings).
// Poses are plain numeric objects; a draw function turns a pose into ordered parts.
// Inbetweens are generated on 1s/2s/3s (24 fps anime timing) — never per-frame tweening.
export const ON1 = 1000 / 24, ON2 = 1000 / 12, ON3 = 1000 / 8;
const E = {
  lin: (x) => x, in: (x) => x * x, out: (x) => 1 - (1 - x) ** 2, inOut: (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2),
  in3: (x) => x ** 3, out3: (x) => 1 - (1 - x) ** 3, out5: (x) => 1 - (1 - x) ** 5, hold: (x) => (x >= 1 ? 1 : 0),
  // anime spacing: favour the extremes (slow in/out of key, fast through breakdown)
  snap: (x) => 1 - (1 - x) ** 4,
};
let uid = 0;
export const nid = (p = 'o') => `${p}${(uid++).toString(36)}`;
export const resetUid = () => { uid = 0; };

export function blendPose(a, b, t) {
  const o = { ...a };
  for (const k of Object.keys(b)) {
    if (typeof a[k] === 'number' && typeof b[k] === 'number') o[k] = a[k] + (b[k] - a[k]) * t;
    else o[k] = t < 0.5 ? (a[k] ?? b[k]) : b[k];
  }
  return o;
}

/** Sample poses on the anime timing grid. keys: [{t, pose, on?:1|2|3, ease?}] (pose is merged onto the previous one). */
export function samplePoses(keys, endMs) {
  const full = []; let prev = {};
  for (const k of keys) { prev = { ...prev, ...k.pose }; full.push({ ...k, pose: prev }); }
  const out = [];
  for (let i = 0; i < full.length; i++) {
    const a = full[i], b = full[i + 1];
    const stop = b ? b.t : endMs;
    const step = ({ 1: ON1, 2: ON2, 3: ON3 })[(b?.on ?? a.on ?? 2)];
    for (let t = a.t; t < stop - 0.5; t += step) {
      const x = b ? (t - a.t) / (b.t - a.t) : 0;
      out.push({ t: Math.round(t * 100) / 100, pose: b ? blendPose(a.pose, b.pose, (E[b.ease ?? 'inOut'])(x)) : a.pose });
    }
  }
  return out;
}

const fillOf = (f) => (f == null ? undefined : typeof f === 'string' ? { color: f } : f);
const strokeOf = (s) => (s == null ? undefined : { ...(Array.isArray(s) ? {} : s), color: s.color ?? s[0], width: s.width ?? s[1], lineJoin: 'round', lineCap: 'round' });

/** Bake an animated character/effect into Paint Studio objects (one shape per part, swapping key drawings). */
export function bake(draw, keys, endMs, { show, prefix = 'p', extra = {} } = {}) {
  const samples = samplePoses(keys, endMs);
  const parts = new Map(); // key -> {z, drawings}
  samples.forEach(({ t, pose }) => {
    const ps = draw({ ...pose, time: t });
    const seen = new Set();
    ps.forEach((p, i) => {
      const key = p.k ?? `#${i}`;
      seen.add(key);
      if (!parts.has(key)) parts.set(key, { z: p.z ?? i, order: parts.size, drawings: [], last: null, blend: p.blend });
      const rec = parts.get(key);
      const sig = p.d + JSON.stringify(p.fill) + JSON.stringify(p.stroke) + (p.alpha ?? 1) + (p.cel ? JSON.stringify(p.cel) : '');
      if (sig !== rec.last) { rec.drawings.push({ t, path: p.d, fill: fillOf(p.fill), stroke: strokeOf(p.stroke), ...(p.cel ? { cel: p.cel } : {}), alpha: p.alpha }); rec.last = sig; }
    });
    for (const [key, rec] of parts) if (!seen.has(key) && rec.last !== '') { rec.drawings.push({ t, path: '' }); rec.last = ''; }
  });
  return [...parts.values()].sort((a, b) => a.z - b.z || a.order - b.order).map((rec) => {
    const o = { type: 'shape', shape: 'path', id: nid(prefix), x: 0, y: 0, pivot: { x: 0, y: 0 }, drawings: rec.drawings.map(({ alpha, ...d }) => d), ...extra };
    if (show) o.show = show;
    return o;
  });
}

/** Static drawing (backgrounds/props) to shape objects. */
export function still(parts, opts = {}) {
  return parts.map((p) => ({ type: 'shape', shape: 'path', id: nid(opts.prefix ?? 's'), x: 0, y: 0, pivot: { x: 0, y: 0 }, path: p.d, fill: fillOf(p.fill), stroke: strokeOf(p.stroke), ...(p.cel ? { cel: p.cel } : {}), ...(opts.show ? { show: opts.show } : {}), ...(p.extra ?? {}) }));
}
