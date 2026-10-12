// Anime face kit v2: key drawings per view (front / 3-4 / side / back), eye/brow/mouth shapes, blush & cel.
import { poly, shape, S, smooth, polyline, ellPts, clip, qpts, strand, lerp, clamp } from '../geom.mjs';
import { C } from '../pal.mjs';
import { LINE, CEL } from './ink.mjs';

export const EXPR = {
  neutral: { eye: 0.92, pupil: 1, brow: 0, mouth: 0, smile: 0 },
  determination: { eye: 0.72, pupil: 0.95, brow: -1, mouth: 0.18, smile: -0.5, teeth: 1 },
  panic: { eye: 1.25, pupil: 0.5, brow: 1, mouth: 0.85, smile: -0.6, sweat: 1 },
  realization: { eye: 1.15, pupil: 0.7, brow: 0.35, mouth: 0.3, smile: -0.1, glint: 0.8 },
  tenderness: { eye: 0.45, pupil: 1, brow: 0.8, mouth: 0, smile: 0.9, tear: 0.7, blush: 1 },
  smile: { eye: 0.38, pupil: 1, brow: 0.3, mouth: 0.35, smile: 1, blush: 0.6, happy: 1 },
  shock: { eye: 1.3, pupil: 0.4, brow: 1, mouth: 0.55, smile: -0.2, round: 1 },
  calculation: { eye: 0.62, pupil: 0.9, brow: -0.7, mouth: 0, smile: 0.6, lookX: 0.6 },
};

/** Build an anime eye in local coords (centre cx,cy; w half-width; open 0..1.3; dir +1 outer corner to +x). */
function eye(parts, T, k, s, o) {
  const { cx, cy, w, open, dir, pupil = 1, lookX = 0, lookY = 0, irisC, glint = 0, lod = 0, profile = false, happy = 0 } = o;
  const h = 11 * open;
  if (happy > 0.5 || open < 0.14) {
    // closed / happy arc
    const arc = qpts({ x: cx - dir * w, y: cy + 1 }, { x: cx, y: cy - (happy > 0.5 ? 7 : -3) }, { x: cx + dir * w * 1.1, y: cy }, 8);
    parts.push({ k: k + 'lash', d: strand(arc.map(T), 3.6 * s, 1.2 * s), fill: C.lash, z: 1.4 });
    return;
  }
  const inner = profile ? { x: cx - dir * w * 0.25, y: cy + 1 } : { x: cx - dir * w, y: cy + 1.5 };
  const outer = { x: cx + dir * w * 1.05, y: cy - h * 0.2 };
  const top = qpts(inner, { x: cx - dir * w * 0.1, y: cy - h * 1.35 }, outer, 10);
  const bot = qpts(outer, { x: cx + dir * w * 0.2, y: cy + h * 0.95 }, inner, 8).slice(1, -1);
  const scl = [...top, ...bot];
  parts.push({ k: k + 'scl', d: poly(scl.map(T)), fill: C.sclera, z: 1 });
  const ix = cx + dir * (profile ? w * 0.35 : 0) + lookX * w * 0.35, iy = cy + lookY * 2.5 + 0.8;
  const iw = (profile ? 3.6 : 5.6) * (w / 9) * pupil, ih = 8.2 * pupil;
  const iris = clip(ellPts(ix, iy, iw, ih, 22), scl);
  const [d0, d1, d2] = irisC;
  if (iris.length > 2) {
    const a = T({ x: ix, y: iy - ih }), b = T({ x: ix, y: iy + ih });
    parts.push({ k: k + 'iris', d: poly(iris.map(T)), fill: { gradient: { type: 'linear', x0: a.x, y0: a.y, x1: b.x, y1: b.y, stops: [{ offset: 0, color: d0 }, { offset: 0.5, color: d1 }, { offset: 1, color: d2 }] } }, z: 1.1 });
    const ring = clip(ellPts(ix, iy, iw, ih, 22), scl);
    if (!lod) parts.push({ k: k + 'iring', d: poly(ring.map(T)), stroke: { color: d0, width: 0.9 * s }, z: 1.12 });
    const pu = clip(ellPts(ix, iy + 0.3, iw * 0.45, ih * 0.5, 14), scl);
    if (pu.length > 2) parts.push({ k: k + 'pup', d: poly(pu.map(T)), fill: C.lash, z: 1.2 });
    const hl = clip(ellPts(ix - dir * iw * 0.35, iy - ih * 0.45, iw * (lod ? 0.5 : 0.36), ih * (lod ? 0.36 : 0.26), 10), scl);
    if (hl.length > 2) parts.push({ k: k + 'hl', d: poly(hl.map(T)), fill: '#FFFFFF', z: 1.3 });
    if (!lod) { const hl2 = clip(ellPts(ix + dir * iw * 0.3, iy + ih * 0.45, iw * 0.18, ih * 0.12, 8), scl); if (hl2.length > 2) parts.push({ k: k + 'hl2', d: poly(hl2.map(T)), fill: { color: '#FFFFFF', opacity: 0.85 }, z: 1.3 }); }
    if (glint > 0) { const g = clip(ellPts(ix, iy + ih * 0.2, iw * 0.8 * glint, ih * 0.6 * glint, 14), scl); if (g.length > 2) parts.push({ k: k + 'gl', d: poly(g.map(T)), fill: { color: C.sun, opacity: 0.8 }, z: 1.25 }); }
  }
  // upper lid shadow on sclera
  parts.push({ k: k + 'lsh', d: poly([...top.map((p) => ({ x: p.x, y: p.y + 2.2 })), ...top.slice().reverse()].map(T)), fill: { color: '#8E80A8', opacity: 0.55 }, z: 1.15 });
  // upper lash: heavy, thickest at outer corner, flick
  const thick = top.map((p, i) => { const u = i / (top.length - 1); return { x: p.x, y: p.y - (0.8 + 3.2 * u ** 1.6) * (lod ? 1.3 : 1) }; });
  const flick = [{ x: outer.x + dir * 3.5, y: outer.y - 3.5 }, { x: outer.x + dir * 1, y: outer.y + 1.5 }];
  parts.push({ k: k + 'lash', d: shape([S(inner.x, inner.y), ...top.slice(1, -1), S(outer.x, outer.y), S(flick[1].x, flick[1].y), S(flick[0].x, flick[0].y), ...thick.slice(1).reverse()].map((p) => ({ ...T(p), sharp: p.sharp })), 0.6), fill: C.lash, z: 1.4 });
  if (!lod) {
    const lo = bot.slice(0, Math.ceil(bot.length * 0.55));
    parts.push({ k: k + 'low', d: polyline([outer, ...lo].map(T)), stroke: LINE.detail(s), z: 1.4 });
    const cr = qpts({ x: cx - dir * w * 0.6, y: cy - h * 1.2 - 3 }, { x: cx, y: cy - h * 1.5 - 4 }, { x: cx + dir * w * 0.8, y: cy - h * 0.8 - 3 }, 6);
    parts.push({ k: k + 'crease', d: polyline(cr.map(T)), stroke: LINE.detail(s * 0.8), z: 1.4 });
  }
}

/**
 * face2(h): h = {x,y,rot,s,yaw,view,mirror, eye,pupil,brow,mouth,smile,teeth,lookX,lookY,glint,blush,tear,sweat,scratch,happy,round, cfg}
 * cfg = {skin, skinShade, skinDeep, irisC:[dark,mid,lite], brow}
 */
export function face2(h) {
  const s = h.s, mir = h.mirror ? -1 : 1, view = h.view;
  const cs = Math.cos((h.rot ?? 0) * Math.PI / 180), sn = Math.sin((h.rot ?? 0) * Math.PI / 180);
  const T = (p) => ({ x: h.x + (p.x * mir * cs - p.y * sn) * s, y: h.y + (p.x * mir * sn + p.y * cs) * s });
  const cfg = h.cfg, parts = [];
  const lod = s < 1.25 ? 1 : 0;
  const ex = { ...EXPR.neutral, ...(h.expr ? EXPR[h.expr] : {}), ...h };
  const sk = { fill: cfg.skin, cel: CEL(cfg.skinShade, s, { shade2: cfg.skinDeep, d: 7, d2: 2.5, rim: h.rim }) };
  // ---- head silhouette per key drawing
  let F;
  if (view === 'front') F = [S(-26, -16), { x: -27, y: 0 }, { x: -24, y: 12 }, S(-17, 23), S(0, 34), S(17, 23), { x: 24, y: 12 }, { x: 27, y: 0 }, S(26, -16), { x: 14, y: -34 }, { x: -14, y: -34 }];
  else if (view === 'tq') F = [S(-30, -16), { x: -30, y: 4 }, S(-22, 22), { x: -6, y: 30 }, S(13, 34), { x: 20, y: 24 }, { x: 22, y: 14 }, S(26, 2), { x: 24, y: -10 }, { x: 16, y: -34 }, { x: -14, y: -38 }];
  else if (view === 'side') F = [S(-30, -10), { x: -26, y: 10 }, S(-10, 24), { x: 6, y: 33 }, S(22, 32), { x: 25, y: 26 }, S(23, 22), S(26, 19), S(23, 16), S(31, 12), { x: 25, y: 0 }, S(26, -6), { x: 22, y: -20 }, { x: 8, y: -36 }, { x: -20, y: -32 }];
  else F = [{ x: -28, y: -12 }, { x: -26, y: 14 }, { x: -14, y: 28 }, { x: 0, y: 32 }, { x: 14, y: 28 }, { x: 26, y: 14 }, { x: 28, y: -12 }, { x: 0, y: -38 }];
  if (view === 'back') return parts; // back of head is all hair (cap + locks)
  parts.push({ k: 'face', d: shape(F.map((p) => ({ ...T(p), sharp: p.sharp })), 0.85), ...sk, stroke: LINE.outer(s), z: 0 });
  // ear (tq/side) — mostly covered by hair
  if (view !== 'front') { const ec = view === 'side' ? { x: -6, y: 4 } : { x: -22, y: 4 }; parts.push({ k: 'ear', d: shape([ec, { x: ec.x + 5, y: ec.y - 7 }, { x: ec.x + 2, y: ec.y + 9 }, { x: ec.x - 4, y: ec.y + 2 }].map(T)), ...sk, stroke: LINE.inner(s), z: 0.2 }); }
  // forehead shadow under bangs (hard cel band)
  const bandY = -10;
  parts.push({ k: 'bangsh', d: poly([{ x: -28, y: bandY - 12 }, { x: 30, y: bandY - 12 }, { x: 30, y: bandY + 1 }, { x: 18, y: bandY + 6 }, { x: 8, y: bandY }, { x: -2, y: bandY + 7 }, { x: -12, y: bandY }, { x: -22, y: bandY + 6 }, { x: -28, y: bandY + 2 }].map(T)), fill: { color: cfg.skinShade, opacity: 0.9 }, z: 0.3 });
  // ---- eyes per view
  const irisC = cfg.irisC;
  const eo = clamp(ex.eye, 0, 1.35), common = { open: eo, pupil: ex.pupil, lookX: (ex.lookX ?? 0) * mir, lookY: ex.lookY ?? 0, irisC, glint: ex.glint ?? 0, lod, happy: ex.happy ?? 0 };
  const ey = 6;
  if (view === 'front') { eye(parts, T, 'eL', s, { cx: -12.5, cy: ey, w: 9, dir: -1, ...common }); eye(parts, T, 'eR', s, { cx: 12.5, cy: ey, w: 9, dir: 1, ...common }); }
  else if (view === 'tq') { eye(parts, T, 'eN', s, { cx: -4, cy: ey, w: 9.2, dir: -1, ...common }); eye(parts, T, 'eF', s, { cx: 17, cy: ey, w: 5.4, dir: 1, ...common }); }
  else eye(parts, T, 'eS', s, { cx: 17, cy: ey, w: 6.5, dir: 1, profile: true, ...common });
  // ---- brows (drawn over hair later via high z)
  const br = ex.brow ?? 0;
  const brow = (cx, w, dir, k) => { const inner = { x: cx - dir * w, y: ey - 13 - br * 3 }, outer = { x: cx + dir * w * 1.2, y: ey - 14.5 + br * 2.2 }; const m = { x: cx + dir * w * 0.1, y: Math.min(inner.y, outer.y) - 2 + (br < 0 ? 1.5 : 0) }; parts.push({ k, d: strand([inner, m, outer].map(T), 3 * s, 0.8 * s), fill: cfg.brow, z: 8 }); };
  if (view === 'front') { brow(-12.5, 8.5, -1, 'bL'); brow(12.5, 8.5, 1, 'bR'); } else if (view === 'tq') { brow(-4, 8.5, -1, 'bN'); brow(17, 5, 1, 'bF'); } else brow(17, 6, 1, 'bS');
  // ---- nose
  if (view === 'front') parts.push({ k: 'nose', d: polyline([{ x: 1, y: 13 }, { x: 2.5, y: 18 }, { x: -0.5, y: 18.6 }].map(T)), stroke: LINE.detail(s), z: 1 });
  else if (view === 'tq') parts.push({ k: 'nose', d: polyline([{ x: 22, y: 9 }, { x: 25.5, y: 16 }, { x: 21, y: 17.5 }].map(T)), stroke: LINE.detail(s), z: 1 });
  // ---- mouth
  const m = clamp(ex.mouth ?? 0, 0, 1), sm = ex.smile ?? 0;
  const mx = view === 'front' ? 0 : view === 'tq' ? 13 : 22, my = 25.5, mw = view === 'front' ? 6 : view === 'tq' ? 5 : 3;
  if (m < 0.08) {
    const c = qpts({ x: mx - mw, y: my - sm * 1.6 }, { x: mx, y: my + sm * 2.6 + (sm < 0 ? -1 : 0) }, { x: mx + mw, y: my - sm * 1.9 }, 6);
    parts.push({ k: 'mouth', d: polyline(c.map(T)), stroke: LINE.inner(s), z: 1 });
  } else {
    const ww = mw * (0.8 + m * 0.4) * (ex.round ? 0.6 : 1), hh = 1.5 + m * 8.5;
    const top = qpts({ x: mx - ww, y: my - sm * 1.2 }, { x: mx, y: my - 1 + (ex.round ? -2 : 0) }, { x: mx + ww, y: my - sm * 1.2 }, 6);
    const bot = qpts({ x: mx + ww, y: my - sm * 1.2 }, { x: mx + (view === 'front' ? 0 : -1), y: my + hh * (sm > 0.5 ? 1.5 : 1.7) }, { x: mx - ww, y: my - sm * 1.2 }, 7).slice(1, -1);
    const M = [...top, ...bot];
    parts.push({ k: 'mouth', d: poly(M.map(T)), fill: C.mouth, stroke: LINE.inner(s), z: 1 });
    if (ex.teeth) { const tt = clip([{ x: mx - ww, y: my - 4 }, { x: mx + ww, y: my - 4 }, { x: mx + ww, y: my + hh * 0.45 }, { x: mx - ww, y: my + hh * 0.45 }], M); if (tt.length > 2) parts.push({ k: 'teeth', d: poly(tt.map(T)), fill: '#F6F2F2', z: 1.05 }); }
    if (m > 0.35 && !ex.teeth) { const tg = clip(ellPts(mx, my + hh * 1.05, ww * 0.7, hh * 0.4, 12), M); if (tg.length > 2) parts.push({ k: 'tongue', d: poly(tg.map(T)), fill: C.tongue, z: 1.05 }); }
  }
  // ---- extras
  if (ex.blush) { const bx = view === 'front' ? [-17, 17] : view === 'tq' ? [-8, 20] : [16]; parts.push({ k: 'blush', d: bx.map((x) => [0, 1, 2].map((i) => poly([{ x: x - 5 + i * 3.5, y: 15 }, { x: x - 2.5 + i * 3.5, y: 12.5 }, { x: x - 3.5 + i * 3.5, y: 16.5 }].map(T))).join('')).join(''), fill: { color: C.blush, opacity: 0.85 * ex.blush }, z: 1.02 }); }
  if (ex.tear) { const tx = view === 'front' ? [-18, 18] : view === 'tq' ? [-10] : [18]; parts.push({ k: 'tear', d: tx.map((x) => smooth([{ x, y: 12 }, { x: x + 2.4, y: 17 + 8 * ex.tear }, { x: x - 2.4, y: 17 + 8 * ex.tear }].map(T))).join(''), fill: { color: '#C9EBFF', opacity: 0.95 }, stroke: LINE.color('#5E8FC0', s), z: 1.6 }); }
  if (ex.scratch) parts.push({ k: 'scratch', d: polyline([{ x: 13, y: -14 }, { x: 22, y: -19 }].map(T)) + polyline([{ x: 14, y: -10 }, { x: 21, y: -13 }].map(T)), stroke: LINE.color(C.scratch, s, 1.6), z: 9 });
  if (ex.sweat) parts.push({ k: 'sweat', d: smooth([{ x: 30, y: -14 }, { x: 35, y: -2 }, { x: 30, y: 2 }, { x: 26, y: -3 }].map(T)), fill: '#D4EEFF', stroke: LINE.inner(s), z: 9 });
  return parts;
}
