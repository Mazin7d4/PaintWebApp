// Environments: gothic cathedral interior (2.5D layered), cage + sun core prop.
import { poly, shape, S, smooth, polyline, ell, ellPts, rectP, rng, lerp, polar, burst, mix } from './geom.mjs';
import { still, bake } from './anim.mjs';
import { layer } from './proj.mjs';
import { C } from './pal.mjs';

const ink = (w) => ({ color: C.ink, width: w });
/** Pointed gothic arch outline (x,y = bottom-left, w,h). */
export function archPts(x, y, w, h, n = 10) {
  const rise = w * 0.866, spring = y - Math.max(0, h - rise);
  const L = [{ x, y }, { x, y: spring }];
  for (let i = 1; i <= n; i++) { const a = Math.PI - (i / n) * (Math.PI / 3); L.push({ x: x + w + Math.cos(a) * w, y: spring - Math.sin(a) * w }); }
  const R = L.map((q) => ({ x: 2 * x + w - q.x, y: q.y })).reverse().slice(1);
  return [...L, ...R];
}
const arch = (x, y, w, h) => poly(archPts(x, y, w, h));

/** Far wall with tall lancet windows lit by moonlight (or sun when lit=1). */
export function farWall({ x0 = -800, x1 = 2700, floorY = 700, lit = 0, seed = 1 } = {}) {
  const parts = [];
  parts.push({ d: rectP(x0, -600, x1 - x0, floorY + 700), fill: { gradient: { type: 'linear', x0: 0, y0: -600, x1: 0, y1: floorY, stops: [{ offset: 0, color: '#05050C' }, { offset: 1, color: '#151628' }] } } });
  for (let i = 0; i < 7; i++) {
    const cx = x0 + 250 + i * ((x1 - x0 - 500) / 6), w = 120, h = 520, y = floorY - 140;
    parts.push({ d: arch(cx - w / 2 - 22, y + 22, w + 44, h + 44), fill: '#0C0C18', stroke: ink(3) });
    parts.push({ d: arch(cx - w / 2, y, w, h), fill: { gradient: { type: 'linear', x0: cx, y0: y - h, x1: cx, y1: y, stops: lit ? [{ offset: 0, color: '#FFE2A0' }, { offset: 1, color: '#E08A20' }] : [{ offset: 0, color: '#B8C6E8' }, { offset: 1, color: '#3A4670' }] } }, stroke: ink(3) });
    // mullions / tracery
    parts.push({ d: polyline([{ x: cx, y }, { x: cx, y: y - h * 0.86 }]) + polyline([{ x: cx - w / 2, y: y - h * 0.4 }, { x: cx + w / 2, y: y - h * 0.4 }]) + polyline([{ x: cx - w / 2, y: y - h * 0.7 }, { x: cx + w / 2, y: y - h * 0.7 }]), stroke: { color: '#11121E', width: 7 } });
    if (i === 3) { // the broken window (entry): jagged hole
      parts.push({ d: burst(cx, y - h * 0.45, 40, 66, 7, 4), fill: '#0C0C18', stroke: { color: '#DCE6FF', width: 3 } });
    }
  }
  // rose window high center
  const rc = { x: (x0 + x1) / 2, y: floorY - 860 };
  parts.push({ d: ell(rc.x, rc.y, 190, 190), fill: '#0C0C18', stroke: ink(4) });
  parts.push({ d: ell(rc.x, rc.y, 160, 160), fill: lit ? '#F5B94A' : '#4A5A8A', stroke: ink(3) });
  for (let k = 0; k < 12; k++) { const a = k * 30; parts.push({ d: polyline([polar(rc, a, 30), polar(rc, a, 160)]), stroke: { color: '#0C0C18', width: 8 } }); }
  parts.push({ d: ell(rc.x, rc.y, 40, 40), fill: '#0C0C18' });
  // floor line + base molding
  parts.push({ d: rectP(x0, floorY - 140, x1 - x0, 26), fill: '#1A1B2A', stroke: ink(3) });
  return parts;
}
/** Row of gothic piers with ribbed vault arcs between them. */
export function columns({ xs, floorY = 700, top = -500, w = 110, color = C.stoneDark, lite = C.stone, rim = C.moon } = {}) {
  const parts = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i], b = xs[i + 1];
    parts.push({ d: polyline([{ x: a, y: top + 400 }, { x: (a + b) / 2, y: top + 120 }, { x: b, y: top + 400 }]), stroke: { color, width: 34 } });
    parts.push({ d: polyline([{ x: a, y: top + 400 }, { x: (a + b) / 2, y: top + 120 }, { x: b, y: top + 400 }]), stroke: { color: C.ink, width: 3 } });
  }
  for (const x of xs) {
    parts.push({ d: rectP(x - w / 2, top, w, floorY - top), fill: color, stroke: ink(4) });
    parts.push({ d: rectP(x - w / 2 + 10, top, 16, floorY - top), fill: lite });
    parts.push({ d: rectP(x + w / 2 - 14, top, 8, floorY - top), fill: { color: rim, opacity: 0.6 } });
    parts.push({ d: rectP(x - w / 2 - 18, floorY - 60, w + 36, 60), fill: color, stroke: ink(4) });
    parts.push({ d: rectP(x - w / 2 - 12, top + 380, w + 24, 34), fill: color, stroke: ink(3) });
  }
  return parts;
}
/** Perspective stone floor (tiles converge to vanishing point). */
export function floor({ x0 = -1200, x1 = 3100, y0 = 700, y1 = 1500, vp = { x: 960, y: 200 }, cols = 26, rows = 9, color = '#2A2C3A' } = {}) {
  const parts = [{ d: rectP(x0, y0, x1 - x0, y1 - y0), fill: { gradient: { type: 'linear', x0: 0, y0, x1: 0, y1, stops: [{ offset: 0, color: '#141522' }, { offset: 1, color }] } } }];
  let d = '';
  for (let i = 0; i <= cols; i++) { const xb = lerp(x0 - 2000, x1 + 2000, i / cols); const u = (y0 - vp.y) / (y1 - vp.y); d += polyline([{ x: vp.x + (xb - vp.x) * u, y: y0 }, { x: xb, y: y1 }]); }
  for (let j = 1; j <= rows; j++) { const y = y0 + (y1 - y0) * (j / rows) ** 1.8; d += polyline([{ x: x0, y }, { x: x1, y }]); }
  parts.push({ d, stroke: { color: '#0A0A12', width: 3 } });
  return parts;
}
/** Cage around the sun core. split 0..1 opens it into two halves. */
export function drawCage(p) {
  const { x = 960, y = 640, s = 1, split = 0, core = 1, coreGlow = 1, time = 0 } = p;
  const parts = [];
  const pulse = 1 + Math.sin(time / 160) * 0.04;
  // dais
  parts.push({ k: 'dais', d: smooth([{ x: x - 170 * s, y: y + 10 * s }, { x: x - 150 * s, y: y + 50 * s }, { x: x + 150 * s, y: y + 50 * s }, { x: x + 170 * s, y: y + 10 * s }, { x: x, y: y - 8 * s }]), fill: C.stoneDark, stroke: ink(3 * s), z: 0 });
  if (core) {
    const cy = y - 150 * s;
    parts.push({ k: 'glow', d: ell(x, cy, 230 * s * coreGlow * pulse, 230 * s * coreGlow * pulse), fill: { gradient: { type: 'radial', x0: x, y0: cy, x1: x + 230 * s * coreGlow, y1: cy, stops: [{ offset: 0, color: 'rgba(255,214,120,0.75)' }, { offset: 0.4, color: 'rgba(255,170,40,0.25)' }, { offset: 1, color: 'rgba(255,150,30,0)' }] } }, z: 1 });
    parts.push({ k: 'core', d: ell(x, cy, 46 * s * pulse, 46 * s * pulse), fill: { gradient: { type: 'radial', x0: x - 14 * s, y0: cy - 14 * s, x1: x + 46 * s, y1: cy, stops: [{ offset: 0, color: '#FFFFFF' }, { offset: 0.4, color: C.sunCore }, { offset: 1, color: C.sun }] } }, stroke: { color: C.sunDeep, width: 3 * s }, z: 2 });
  }
  for (const side of [-1, 1]) {
    const ox = side * split * 220 * s, oy = split * split * 160 * s, rot = side * split * 18;
    const P = (px, py) => { const a = rot * Math.PI / 180; const dx = px - x, dy = py - (y - 150 * s); return { x: x + ox + dx * Math.cos(a) - dy * Math.sin(a), y: y - 150 * s + oy + dx * Math.sin(a) + dy * Math.cos(a) }; };
    let bars = '';
    for (let b = 0; b < 5; b++) {
      const u = (b + 0.5) / 5, bx = side * 110 * s * Math.sin(u * Math.PI / 2);
      const pts = []; for (let k = 0; k <= 10; k++) { const v = k / 10; const yy = y - 300 * s + v * 290 * s; const bulge = Math.sin(v * Math.PI); pts.push(P(x + bx * (0.25 + 0.75 * bulge), yy)); }
      bars += polyline(pts);
    }
    parts.push({ k: 'bars' + side, d: bars, stroke: { color: C.ink, width: 11 * s }, z: 3 });
    parts.push({ k: 'barsL' + side, d: bars, stroke: { color: '#3C3F52', width: 6 * s }, z: 3.1 });
    const ring = (yy, rw) => { const pts = []; for (let k = 0; k <= 12; k++) { const a = Math.PI / 2 + side * (k / 12) * Math.PI; pts.push(P(x + Math.cos(a) * 0 + side * Math.abs(Math.sin((k / 12) * Math.PI)) * rw * 0 + side * (k / 12) * 0 + Math.cos(Math.PI / 2 - side * (k / 12) * Math.PI / 2) * rw * side * 0 + side * rw * Math.sin((k / 12) * Math.PI / 2), yy)); } return polyline(pts); };
    parts.push({ k: 'ring' + side, d: polyline([P(x, y - 225 * s), P(x + side * 115 * s, y - 225 * s)]) + polyline([P(x, y - 80 * s), P(x + side * 115 * s, y - 80 * s)]), stroke: { color: '#5A5E74', width: 9 * s }, z: 3.2 });
    parts.push({ k: 'cap' + side, d: poly([P(x, y - 330 * s), P(x + side * 60 * s, y - 300 * s), P(x + side * 30 * s, y - 280 * s), P(x, y - 290 * s)]), fill: '#2A2C3C', stroke: ink(3 * s), z: 3.3 });
    parts.push({ k: 'gear' + side, d: burst(P(x + side * 95 * s, y - 160 * s).x, P(x + side * 95 * s, y - 160 * s).y, 18 * s, 26 * s, 8, 2, time / 30 * side), fill: '#4A4E64', stroke: ink(2 * s), z: 3.4 });
  }
  // chain to ceiling
  parts.push({ k: 'chain', d: polyline([{ x, y: -2000 }, { x, y: y - 330 * s }]), stroke: { color: '#22243A', width: 10 * s }, z: -1 });
  return parts;
}
/** Moon shafts / sun shafts: soft diagonal beams (use on a 'screen' layer). */
export function shafts({ xs, top = -400, bottom = 1200, w = 140, skew = 300, color = 'rgba(160,185,255,0.18)' }) {
  return xs.map((x) => ({ d: poly([{ x, y: top }, { x: x + w, y: top }, { x: x + w + skew + w * 0.8, y: bottom }, { x: x + skew - w * 0.3, y: bottom }]), fill: { gradient: { type: 'linear', x0: x, y0: top, x1: x + skew, y1: bottom, stops: [{ offset: 0, color }, { offset: 1, color: 'rgba(0,0,0,0)' }] } } }));
}
/** Full cathedral set as layers (far wall, shafts, columns, floor, foreground piers). */
export function cathedral({ lit = 0, fgBlur = 'blur(5px)', fgXs = [-260, 2200], show } = {}) {
  const o = show ? { show } : {};
  return {
    far: layer('far wall', still(farWall({ lit })), { parallax: 0.35, ...o }),
    shafts: layer('shafts', still(shafts({ xs: [120, 700, 1300, 1900], color: lit ? 'rgba(255,190,90,0.22)' : 'rgba(150,175,255,0.16)' })), { parallax: 0.45, blend: 'screen', ...o }),
    cols: layer('columns', still(columns({ xs: [-700, -150, 400, 1520, 2070, 2620], floorY: 720 })), { parallax: 0.7, ...o }),
    floor: layer('floor', still(floor({})), { parallax: 1, ...o }),
    fg: layer('fg piers', still(fgXs.map((x) => ({ d: rectP(x, -800, 230, 2600), fill: '#07070E', stroke: ink(4) }))), { parallax: 1.6, filter: fgBlur, ...o }),
  };
}
