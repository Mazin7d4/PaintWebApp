// 3D-projected clumped hair locks: locks live on a head sphere, are rotated by yaw and depth-sorted
// in front of / behind the face. Each lock = tapered clump with cel shadow, ink line, highlight; per-lock lag.
import { shape, S, strand, rng, clamp } from '../geom.mjs';
import { LINE, CEL } from './ink.mjs';
const D = Math.PI / 180;

/** Lock specs: {th, ph, len, w, out, curl, kink} th: 0=front, +90 = character's left (screen +x at yaw 0). */
export function makeLocks(style) {
  const r = rng(style.seed ?? 7), L = [];
  const J = (a) => (r() - 0.5) * 2 * a;
  for (const ring of style.rings) for (let th = ring.from; th <= ring.to + 1e-6; th += ring.step) {
    L.push({ th: th + J(ring.jit ?? 6), ph: ring.ph + J(4), len: ring.len * (1 + J(0.14)), w: ring.w * (1 + J(0.12)), out: ring.out, curl: J(ring.curl ?? 0.3), kink: ring.kink ?? 0, lag: ring.lag ?? 1 });
  }
  for (const x of style.extra ?? []) L.push({ curl: 0, kink: 0, lag: 1.2, ...x });
  return L;
}

/** h = {x,y,rot,s,yaw,hairX,hairY,time,cfg:{hair,hairShade,hairDeep,hairHi,R}} returns {back:[parts], front:[parts], cap} */
export function hair2(h, locks) {
  const s = h.s, cfg = h.cfg, R = cfg.R ?? 34, cy0 = cfg.cy ?? -8;
  const cs = Math.cos((h.rot ?? 0) * D), sn = Math.sin((h.rot ?? 0) * D);
  const T = (p) => ({ x: h.x + (p.x * cs - p.y * sn) * s, y: h.y + (p.x * sn + p.y * cs) * s });
  const cy = Math.cos(h.yaw * D), sy = Math.sin(h.yaw * D);
  const P = (v) => ({ x: v.x * cy + v.z * sy, y: v.y, z: -v.x * sy + v.z * cy });
  const t = (h.time ?? 0) / 1000;
  const back = [], front = [];
  const st = { fill: cfg.hair, cel: CEL(cfg.hairShade, s, { d: 6, rim: h.rim }) };
  // skull cap behind face (back mass of hair)
  const cap = []; for (let i = 0; i <= 24; i++) { const a = Math.PI + (i / 24) * Math.PI; cap.push({ x: Math.cos(a) * (R + 3), y: cy0 + Math.sin(a) * (R + 4) }); }
  cap.push({ x: R * 0.98, y: cy0 + 22 }, { x: -R * 0.98, y: cy0 + 22 });
  back.push({ k: 'hcap', d: shape(cap.map(T), 0.9), ...st, stroke: LINE.outer(s), z: -2 });
  locks.forEach((L, i) => {
    const th = L.th * D, ph = L.ph * D;
    const n = { x: Math.sin(ph) * Math.sin(th), y: -Math.cos(ph), z: Math.sin(ph) * Math.cos(th) };
    const root = { x: n.x * R, y: cy0 + n.y * R, z: n.z * R };
    const g = { x: 0, y: 1, z: 0 };
    const dir = { x: n.x * L.out + g.x * (1 - L.out), y: n.y * L.out + g.y * (1 - L.out), z: n.z * L.out + g.z * (1 - L.out) };
    const dl = Math.hypot(dir.x, dir.y, dir.z); dir.x /= dl; dir.y /= dl; dir.z /= dl;
    // hug: push mid outward so locks follow the skull, not stick out like a mane
    const hug = clamp(1 - L.ph / 120, 0, 1) * R * 0.35;
    const wob = Math.sin(t * 5.3 + i * 1.7) * 2.2 * L.lag;
    const sway = { x: (h.hairX ?? 0) * L.lag * 14 + wob, y: (h.hairY ?? 0) * L.lag * 10, z: 0 };
    const mid = { x: root.x + dir.x * L.len * 0.5 + n.x * hug + sway.x * 0.35, y: root.y + dir.y * L.len * 0.5 + n.y * hug * 0.3 + sway.y * 0.35, z: root.z + dir.z * L.len * 0.5 + n.z * hug };
    const side = { x: Math.cos(th), y: 0, z: -Math.sin(th) }; // tangent around head
    const tip = { x: root.x + dir.x * L.len + side.x * L.curl * 10 + sway.x + n.x * hug * 0.6, y: root.y + dir.y * L.len + sway.y, z: root.z + dir.z * L.len + side.z * L.curl * 10 + n.z * hug * 0.6 };
    const pr = P(root), pm = P(mid), pt = P(tip);
    const zAvg = (pr.z + pm.z) / 2;
    // screen-space width: lock seen edge-on when side ⟂ view
    const ps = P(side); const wf = 0.35 + 0.65 * Math.min(1, Math.hypot(ps.x, ps.y));
    const w = L.w * wf;
    const dx = pt.x - pr.x, dy = pt.y - pr.y, ln = Math.hypot(dx, dy) || 1, nx = -dy / ln, ny = dx / ln;
    const kink = L.kink * 5;
    const pts = [
      { x: pr.x - nx * w * 0.5 - dx * 0.2, y: pr.y - ny * w * 0.5 - dy * 0.2 },
      { x: pm.x - nx * w * 0.42 + nx * kink, y: pm.y - ny * w * 0.42 + ny * kink },
      S(pt.x, pt.y),
      { x: pm.x + nx * w * 0.36 + nx * kink, y: pm.y + ny * w * 0.36 + ny * kink },
      { x: pr.x + nx * w * 0.5 - dx * 0.2, y: pr.y + ny * w * 0.5 - dy * 0.2 },
    ];
    const isFront = zAvg > -R * 0.15 && !(L.back);
    const key = `hl${i}${isFront ? 'f' : 'b'}`;
    const part = { k: key, d: shape(pts.map((p) => ({ ...T(p), sharp: p.sharp })), 0.9), ...st, stroke: LINE.inner(s * 1.15), z: isFront ? 5 + zAvg / 100 : -3 + zAvg / 100 };
    (isFront ? front : back).push(part);
    // angel-ring highlight on lit, camera-facing upper locks
    if (pr.z > R * 0.2 && L.ph < 70) {
      const a = 0.38, b = 0.55, hx = (u) => ({ x: pr.x + dx * u, y: pr.y + dy * u });
      const p1 = hx(a), p2 = hx(b);
      const hl = [{ x: p1.x - nx * w * 0.32, y: p1.y - ny * w * 0.32 }, { x: (p1.x + p2.x) / 2 - nx * w * 0.05, y: (p1.y + p2.y) / 2 - ny * w * 0.05 }, { x: p2.x - nx * w * 0.2, y: p2.y - ny * w * 0.2 }, { x: (p1.x + p2.x) / 2 - nx * w * 0.3, y: (p1.y + p2.y) / 2 - ny * w * 0.3 }];
      (isFront ? front : back).push({ k: key + 'h', d: shape(hl.map(T), 0.5), fill: cfg.hairHi, z: part.z + 0.001 });
    }
  });
  return { back, front };
}

export const RIN_HAIR = {
  seed: 11,
  rings: [
    { ph: 24, from: -150, to: 180, step: 40, len: 28, w: 28, out: 0.28, lag: 0.6 },              // crown tufts
    { ph: 58, from: 60, to: 300, step: 28, len: 36, w: 26, out: 0.16, curl: 0.5, lag: 0.9 },       // sides/back mid
    { ph: 86, from: 70, to: 290, step: 24, len: 34, w: 22, out: 0.12, curl: 0.6, kink: 0.5, lag: 1.2 }, // nape layer
    { ph: 44, from: -55, to: 55, step: 22, len: 29, w: 22, out: 0.04, curl: 0.25, lag: 0.7 },     // bangs
  ],
  extra: [
    { th: -22, ph: 40, len: 56, w: 16, out: 0.02, curl: 0.25, kink: -0.6, lag: 1.4 }, // the long lock over her right eye
    { th: 75, ph: 70, len: 44, w: 15, out: 0.05, curl: -0.3, lag: 1.1 },   // side lock left
    { th: -75, ph: 70, len: 44, w: 15, out: 0.05, curl: 0.3, lag: 1.1 },   // side lock right
    { th: 10, ph: 8, len: 18, w: 7, out: 0.8, curl: 0.9, lag: 1.5 },        // ahoge
  ],
};
export const SORA_HAIR = {
  seed: 5,
  rings: [
    { ph: 25, from: -150, to: 180, step: 40, len: 22, w: 22, out: 0.45, lag: 0.5 },
    { ph: 62, from: 60, to: 300, step: 30, len: 26, w: 22, out: 0.22, curl: 0.3, lag: 0.8 },
    { ph: 48, from: -50, to: 50, step: 20, len: 28, w: 20, out: 0.03, curl: 0.15, lag: 0.6 },
  ],
  extra: [{ th: 20, ph: 6, len: 15, w: 8, out: 0.9, curl: -0.6, lag: 1.4 }],
};
