// Hand-authored effects as baked key drawings: speed lines, impact frames, smears, debris, smoke, beams, glow, grade.
import { poly, shape, S, smooth, polyline, ell, ellPts, rectP, rng, lerp, polar, burst, mix, strand, add, sub, mul, norm, perp, clamp } from './geom.mjs';
import { bake, still, nid, ON1, ON2 } from './anim.mjs';
import { layer, rect, W, H } from './proj.mjs';
import { C } from './pal.mjs';

/** Radial focus/speed lines, redrawn every drawing (on 1s/2s) — screen-space. */
export function focusLines(from, to, { cx = W / 2, cy = H / 2, inner = 380, color = '#FFFFFF', count = 70, on = 1, seed = 1, width = 1 } = {}) {
  const keys = [{ t: from, pose: { k: 0 }, on }, { t: to, pose: { k: 1 }, on }];
  const draw = ({ time }) => {
    const r = rng(seed + Math.floor(time / (on === 1 ? ON1 : ON2)));
    let d = '';
    for (let i = 0; i < count; i++) {
      const a = r() * 360, w = (1.5 + r() * 5) * width, r0 = inner * (0.8 + r() * 0.6);
      const p0 = polar({ x: cx, y: cy }, a, r0), p1 = polar({ x: cx, y: cy }, a - w * 0.25, 1600), p2 = polar({ x: cx, y: cy }, a + w * 0.25, 1600);
      d += poly([p0, p1, p2]);
    }
    return [{ k: 'fl', d, fill: color }];
  };
  return bake(draw, keys, to, { show: [[from, to]], prefix: 'fl' });
}
/** Parallel speed lines (direction angle deg) screen-space. */
export function speedLines(from, to, { angle = 0, color = 'rgba(255,255,255,0.85)', count = 40, seed = 3, on = 1, band = [0, H] } = {}) {
  const draw = ({ time }) => {
    const r = rng(seed + Math.floor(time / ON1));
    let d = '';
    const dir = polar({ x: 0, y: 0 }, angle, 1), n = perp(dir);
    for (let i = 0; i < count; i++) {
      const c = { x: W / 2 + (r() - 0.5) * 2400 * n.x + (r() - 0.5) * 2400 * dir.x, y: lerp(band[0], band[1], r()) };
      const L = 300 + r() * 900, w = 1 + r() * 4;
      d += poly([add(c, mul(dir, -L / 2)), add(add(c, mul(dir, L / 2)), mul(n, w)), add(add(c, mul(dir, L / 2)), mul(n, -w))]);
    }
    return [{ k: 'sl', d, fill: color }];
  };
  return bake(draw, [{ t: from, pose: {}, on }, { t: to, pose: {}, on }], to, { show: [[from, to]], prefix: 'sl' });
}
/** Impact frame: full-screen invert (difference) + jagged burst, for n frames at 60fps. Returns a screen layer. */
export function impactFrame(at, { frames = 2, cx = W / 2, cy = H / 2, seed = 5, gold = false } = {}) {
  const dur = (frames * 1000) / 60;
  const objs = [
    { ...rect(-100, -100, W + 200, H + 200, '#FFFFFF'), show: [[at, at + dur]] },
  ];
  const burstL = layer('impact burst', still([{ d: burst(cx, cy, 120, 900, 16, seed), fill: gold ? C.sun : '#000000' }], { show: [[at, at + dur]] }), { parallax: 0 });
  return [layer('impact invert', objs, { parallax: 0, blend: 'difference', show: [[at, at + dur]] }), burstL];
}
/** Flash: white/gold full-screen fade. */
export function flash(at, { dur = 300, color = '#FFFFFF', peak = 1 } = {}) {
  return layer('flash', [{ ...rect(-100, -100, W + 200, H + 200, color), keyframes: [{ t: 0, transform: { opacity: 0 } }, { t: at - 1, transform: { opacity: 0 } }, { t: at, transform: { opacity: peak }, easing: 'step' }, { t: at + dur, transform: { opacity: 0 }, easing: 'easeOutCubic' }] }], { parallax: 0, blend: 'screen' });
}
/** Blade streak / smear arc: crescent from angle a0 to a1 around c, radius r, drawn over [from,to]. */
export function slashArc(from, to, { c, r = 300, a0 = -120, a1 = 40, width = 70, color = '#FFFFFF', edge = C.prism, squashY = 0.5, rot = 0 } = {}) {
  const draw = ({ time }) => {
    const u = clamp((time - from) / (to - from), 0, 1);
    const head = lerp(a0, a1, Math.min(1, u * 1.8)), tail = lerp(a0, a1, Math.max(0, u * 1.8 - 0.8));
    if (head - tail < 1) return [];
    const outer = [], inner = [];
    for (let i = 0; i <= 16; i++) {
      const a = lerp(tail, head, i / 16), k = Math.sin((i / 16) * Math.PI) ** 0.6;
      const P = (rr) => { const q = polar({ x: 0, y: 0 }, a, rr); const cr = Math.cos(rot * Math.PI / 180), sr = Math.sin(rot * Math.PI / 180); const y = q.y * squashY; return { x: c.x + q.x * cr - y * sr, y: c.y + q.x * sr + y * cr }; };
      outer.push(P(r + width * 0.5 * k)); inner.push(P(r - width * 0.5 * k));
    }
    return [{ k: 'arc', d: poly([...outer, ...inner.reverse()]), fill: color, stroke: { color: edge, width: 4 } }];
  };
  return bake(draw, [{ t: from, pose: {}, on: 1 }, { t: to, pose: {}, on: 1 }], to + 1, { show: [[from, to + 60]], prefix: 'sa' });
}
/** Angular debris burst with ballistic paths (on 1s). */
export function debris(from, dur, { c, n = 18, speed = 900, spread = [200, 340], size = [14, 46], gravity = 1600, color = C.stone, shade = C.stoneDark, seed = 9 } = {}) {
  const r = rng(seed);
  const chunks = Array.from({ length: n }, () => ({ a: lerp(spread[0], spread[1], r()), v: speed * (0.4 + r() * 0.8), sz: lerp(size[0], size[1], r()), spin: (r() - 0.5) * 900, sides: 3 + Math.floor(r() * 3), ph: r() * 360, delay: r() * 60 }));
  const draw = ({ time }) => {
    const tt = (time - from) / 1000;
    if (tt < 0 || tt > dur / 1000) return [];
    return chunks.map((ch, i) => {
      const t2 = Math.max(0, tt - ch.delay / 1000);
      const p = { x: c.x + Math.cos(ch.a * Math.PI / 180) * ch.v * t2, y: c.y + Math.sin(ch.a * Math.PI / 180) * ch.v * t2 + 0.5 * gravity * t2 * t2 };
      const pts = []; for (let k = 0; k < ch.sides; k++) pts.push(polar(p, ch.ph + ch.spin * t2 + (k * 360) / ch.sides + (k % 2) * 17, ch.sz * (k % 2 ? 0.6 : 1)));
      return { k: 'd' + i, d: poly(pts), fill: i % 3 ? color : shade, stroke: { color: C.ink, width: 2.5 } };
    });
  };
  return bake(draw, [{ t: from, pose: {}, on: 1 }, { t: from + dur, pose: {}, on: 1 }], from + dur, { show: [[from, from + dur]], prefix: 'db' });
}
/** Smoke puffs (angular cel smoke), expanding & fading, on 2s. */
export function smoke(from, dur, { c, n = 8, r0 = 40, r1 = 160, color = '#2A2838', shade = '#14121E', rise = 120, seed = 4, spread = 140 } = {}) {
  const r = rng(seed);
  const puffs = Array.from({ length: n }, () => ({ dx: (r() - 0.5) * spread * 2, dy: (r() - 0.5) * spread, s: 0.6 + r() * 0.6, ph: r() * 10 }));
  const draw = ({ time }) => {
    const u = (time - from) / dur;
    if (u < 0 || u > 1) return [];
    return puffs.flatMap((p, i) => {
      const rr = lerp(r0, r1, Math.sqrt(u)) * p.s, cx = c.x + p.dx * (0.4 + u), cy = c.y + p.dy - rise * u;
      const pts = []; for (let k = 0; k < 9; k++) pts.push(polar({ x: cx, y: cy }, k * 40 + p.ph * 20, rr * (k % 2 ? 0.82 : 1)));
      return [{ k: 'p' + i, d: smooth(pts, true, 0.7), fill: { color, opacity: 1 - u }, stroke: { color: C.ink, width: 2 * (1 - u) } }, { k: 'q' + i, d: poly([pts[0], pts[2], pts[3], pts[4]]), fill: { color: shade, opacity: 1 - u } }];
    });
  };
  return bake(draw, [{ t: from, pose: {}, on: 2 }, { t: from + dur, pose: {}, on: 2 }], from + dur, { show: [[from, from + dur]], prefix: 'sm' });
}
/** Light beam from a to b (gold), with hot core; grow 0..1 over [from, from+grow]. */
export function beam(from, to, { a, b, width = 40, grow = 120, color = 'rgba(255,190,60,0.55)', core = '#FFF4D0' } = {}) {
  const draw = ({ time }) => {
    const u = clamp((time - from) / grow, 0, 1);
    if (time < from || time > to) return [];
    const e = mix(a, b, u), n = perp(norm(sub(b, a)));
    const fl = 1 + Math.sin(time / 30) * 0.08;
    const wide = poly([add(a, mul(n, width * 0.3)), add(e, mul(n, width * fl)), add(e, mul(n, -width * fl)), add(a, mul(n, -width * 0.3))]);
    const hot = poly([add(a, mul(n, width * 0.1)), add(e, mul(n, width * 0.28)), add(e, mul(n, -width * 0.28)), add(a, mul(n, -width * 0.1))]);
    return [{ k: 'w', d: wide, fill: color }, { k: 'h', d: hot, fill: core }, { k: 'tip', d: ell(e.x, e.y, width * 1.3 * fl, width * 1.3 * fl), fill: { gradient: { type: 'radial', x0: e.x, y0: e.y, x1: e.x + width * 1.3, y1: e.y, stops: [{ offset: 0, color: 'rgba(255,245,210,0.95)' }, { offset: 1, color: 'rgba(255,180,60,0)' }] } } }];
  };
  return bake(draw, [{ t: from, pose: {}, on: 1 }, { t: to, pose: {}, on: 1 }], to, { show: [[from, to]], prefix: 'bm' });
}
/** Soft radial glow (static or keyed with keyframes on the object). */
export function glow(x, y, r, color = 'rgba(255,190,80,0.6)', extra = {}) {
  return { type: 'shape', shape: 'ellipse', id: nid('g'), x: x - r, y: y - r, w: r * 2, h: r * 2, fill: { gradient: { type: 'radial', x0: x, y0: y, x1: x + r, y1: y, stops: [{ offset: 0, color }, { offset: 1, color: 'rgba(0,0,0,0)' }] } }, ...extra };
}
/** Color grade overlay: keyed opacity of a full-screen color in a blend mode. keys: [[t, opacity]] */
export function grade(color, blend, keys, name = 'grade') {
  const kf = keys.map(([t, o], i) => ({ t, transform: { opacity: o }, easing: i ? 'easeInOut' : undefined }));
  return layer(name, [{ ...rect(-200, -200, W + 400, H + 400, color), keyframes: kf }], { parallax: 0, blend });
}
export function vignette(strength = 0.75) {
  return layer('vignette', [{ type: 'shape', shape: 'rect', id: nid('v'), x: -100, y: -100, w: W + 200, h: H + 200, fill: { gradient: { type: 'radial', x0: W / 2, y0: H / 2, x1: W / 2 + 1250, y1: H / 2, stops: [{ offset: 0.45, color: 'rgba(0,0,0,0)' }, { offset: 1, color: `rgba(0,0,0,${strength})` }] } } }], { parallax: 0 });
}
/** Letterbox bars (cinematic 2.39:1 crop in a 16:9 frame). */
export function letterbox(h = 90) { return layer('letterbox', [rect(-10, -10, W + 20, h + 10, '#000'), rect(-10, H - h, W + 20, h + 10, '#000')], { parallax: 0 }); }
/** Rising ash / drifting dust via core particle emitters (smooth at 60). */
export function ash({ x = W / 2, y = H + 50, count = 60, color = 'rgba(200,205,225,0.7)', speed = 900, spread = 40, life = 6000, size = 2.6, seed = 2, gravity = 0, angle = -90 } = {}) {
  return { type: 'particles', id: nid('ash'), x, y, count, life, spread, speed, size, color, gravity, seed, transform: { rotation: angle + 90 }, pivot: { x, y } };
}
/** Shadow sweep: a dark shape crossing the frame (e.g. something passing overhead). */
export function shadowSweep(from, to, { y0 = -200, y1 = 1300, color = 'rgba(5,4,10,0.85)' } = {}) {
  const draw = ({ time }) => { const u = clamp((time - from) / (to - from), 0, 1); const x = lerp(-1400, W + 300, u); return [{ k: 's', d: poly([{ x, y: y0 }, { x: x + 900, y: y0 }, { x: x + 1300, y: y1 }, { x: x + 300, y: y1 }]), fill: color }]; };
  return bake(draw, [{ t: from, pose: {}, on: 2 }, { t: to, pose: {}, on: 2 }], to, { show: [[from, to]], prefix: 'ss' });
}
/** Crack lines radiating on a surface (grow on 1s). */
export function cracks(from, { c, n = 9, len = 400, squashY = 0.3, color = C.ink, glow: g = null, seed = 7, grow = 160 } = {}) {
  const r = rng(seed);
  const rays = Array.from({ length: n }, () => { const a = r() * 360; const segs = []; let p = { x: 0, y: 0 }; for (let k = 0; k < 4; k++) { p = polar(p, a + (r() - 0.5) * 50, len * (0.15 + r() * 0.2)); segs.push({ ...p }); } return segs; });
  const draw = ({ time }) => {
    const u = clamp((time - from) / grow, 0, 1);
    const d = rays.map((segs) => polyline([{ x: c.x, y: c.y }, ...segs.slice(0, Math.max(1, Math.ceil(u * 4))).map((q) => ({ x: c.x + q.x, y: c.y + q.y * squashY }))])).join('');
    return [...(g ? [{ k: 'g', d, stroke: { color: g, width: 9 } }] : []), { k: 'c', d, stroke: { color, width: 4 } }];
  };
  return bake(draw, [{ t: from, pose: {}, on: 1 }, { t: from + grow + 50, pose: {}, on: 1 }], from + grow + 60, { prefix: 'ck', show: [[from, 1e9]] });
}
/** Speech / thought bubble in screen space. */
export function bubble(str, x, y, from, to, { size = 46, thought = false, w = 520, h = 130, tail = null, font = 'Cinzel, serif', color = '#0B0A12', fill = '#F4F1EA' } = {}) {
  const o = [];
  const pts = []; for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; const wob = thought ? 1 + 0.06 * Math.cos(i * 2.2) : 1; pts.push({ x: x + Math.cos(a) * w / 2 * wob, y: y + Math.sin(a) * h / 2 * wob }); }
  const kf = [{ t: 0, transform: { opacity: 0, scaleX: 0.6, scaleY: 0.6 } }, { t: from, transform: { opacity: 0, scaleX: 0.6, scaleY: 0.6 } }, { t: from + 160, transform: { opacity: 1, scaleX: 1, scaleY: 1 }, easing: 'easeOutBack' }, { t: to - 200, transform: { opacity: 1, scaleX: 1, scaleY: 1 } }, { t: to, transform: { opacity: 0, scaleX: 1, scaleY: 1 } }];
  const base = { type: 'shape', shape: 'path', x: 0, y: 0, pivot: { x, y }, keyframes: kf };
  if (tail && !thought) o.push({ ...base, id: nid('bt'), path: poly([{ x: x - 30, y: y + h / 2 - 10 }, tail, { x: x + 20, y: y + h / 2 - 8 }]), fill: { color: fill }, stroke: { color, width: 4 } });
  if (tail && thought) [0.35, 0.65, 0.9].forEach((k, i) => o.push({ ...base, id: nid('bt'), path: ell(lerp(x, tail.x, k), lerp(y + h / 2, tail.y, k), 16 - i * 4, 12 - i * 3), fill: { color: fill }, stroke: { color, width: 3 } }));
  o.push({ ...base, id: nid('bb'), path: smooth(pts), fill: { color: fill }, stroke: { color, width: 4 } });
  o.push({ type: 'text', id: nid('bx'), text: str, x, y: y + 2, fontSize: size, fontFamily: font, fill: { color }, align: 'center', baseline: 'middle', pivot: { x, y }, keyframes: kf, fontWeight: 700 });
  return o;
}
