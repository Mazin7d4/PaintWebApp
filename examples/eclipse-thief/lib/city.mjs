// Gothic city of the Dead Sun: procedural tower silhouettes, rail bridges, eclipse sky.
import { poly, polyline, rectP, ell, rng, lerp, smooth, burst, polar } from './geom.mjs';
import { archPts } from './env.mjs';

export function tower(r, x, base, w, h, col, win, litP = 0.04) {
  const parts = [];
  const spireH = h * (0.25 + r() * 0.35);
  const body = [{ x: x - w / 2, y: base }, { x: x - w / 2, y: base - h }, { x: x - w * 0.35, y: base - h }, { x: x, y: base - h - spireH }, { x: x + w * 0.35, y: base - h }, { x: x + w / 2, y: base - h }, { x: x + w / 2, y: base }];
  parts.push({ d: poly(body), fill: col });
  // pinnacles + buttress steps
  for (const sx of [-1, 1]) {
    const px = x + sx * w * 0.5;
    parts.push({ d: poly([{ x: px - w * 0.08, y: base - h + 10 }, { x: px, y: base - h - spireH * 0.4 }, { x: px + w * 0.08, y: base - h + 10 }]), fill: col });
    for (let k = 0; k < 3; k++) { const yy = base - h * (0.2 + k * 0.25); parts.push({ d: poly([{ x: px, y: yy }, { x: px + sx * w * 0.18, y: yy + h * 0.12 }, { x: px + sx * w * 0.18, y: yy + h * 0.25 }, { x: px, y: yy + h * 0.25 }]), fill: col }); }
  }
  // windows: thin lancets, a few dimly lit
  let dark = '', lit = '';
  const rows = Math.floor(h / 60), cols = Math.max(1, Math.floor(w / 34));
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const wx = x - w / 2 + (j + 0.5) * (w / cols) - 4, wy = base - h + 30 + i * 60;
    const d = poly(archPts(wx, wy + 26, 8, 26, 4));
    if (r() < litP) lit += d; else dark += d;
  }
  if (dark) parts.push({ d: dark, fill: win });
  if (lit) parts.push({ d: lit, fill: '#FFB34A' });
  return parts;
}
export function skylineLayer({ seed, n, x0, x1, base, hMin, hMax, wMin, wMax, col, win, litP = 0.03 }) {
  const r = rng(seed); let parts = [];
  for (let i = 0; i < n; i++) { const x = lerp(x0, x1, (i + r() * 0.6) / n); parts = parts.concat(tower(r, x, base, lerp(wMin, wMax, r()), lerp(hMin, hMax, r()), col, win, litP)); }
  parts.push({ d: rectP(x0 - 400, base, x1 - x0 + 800, 1200), fill: col });
  return parts;
}
/** Suspended rail bridge: a deck curve with hanging cables between two points. */
export function railBridge(a, b, sag, col, w = 10) {
  const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) + Math.sin(u * Math.PI) * sag }); }
  const deck = [...pts.map((p) => ({ x: p.x, y: p.y })), ...pts.slice().reverse().map((p) => ({ x: p.x, y: p.y + w }))];
  let cables = polyline(pts.map((p, i) => ({ x: p.x, y: p.y - 60 - Math.sin((i / 20) * Math.PI) * -sag * 0.2 - 0 })));
  for (let i = 2; i < 20; i += 2) cables += polyline([{ x: pts[i].x, y: pts[i].y }, { x: pts[i].x, y: pts[i].y - 60 + sag * 0.0 }]);
  return [{ d: poly(deck), fill: col }, { d: cables, stroke: { color: col, width: 3 } }];
}
export function eclipse(cx, cy, R) {
  const parts = [];
  parts.push({ d: ell(cx, cy, R * 3.2, R * 3.2), fill: { gradient: { type: 'radial', x0: cx, y0: cy, x1: cx + R * 3.2, y1: cy, stops: [{ offset: 0.3, color: 'rgba(255,190,90,0.35)' }, { offset: 1, color: 'rgba(120,60,140,0)' }] } } });
  parts.push({ d: burst(cx, cy, R * 1.05, R * 1.7, 28, 5), fill: { gradient: { type: 'radial', x0: cx, y0: cy, x1: cx + R * 1.7, y1: cy, stops: [{ offset: 0.6, color: 'rgba(255,220,150,0.85)' }, { offset: 1, color: 'rgba(255,150,40,0)' }] } } });
  parts.push({ d: ell(cx, cy, R * 1.04, R * 1.04), fill: '#FFE7B0' });
  parts.push({ d: ell(cx - R * 0.02, cy + R * 0.01, R, R), fill: '#05040A' });
  return parts;
}
