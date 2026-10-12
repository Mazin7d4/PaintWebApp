// v2 character drawer (Rin, Sora): same pose API as v1 drawRin, rebuilt with
// organic chain limbs (2-bone, IK option, joint volume), per-view torso construction, engine cel + ink lines,
// face/hair/hand kits, deterministic spring secondary motion, and authored smears.
import { shape, S, strand, polar, add, sub, mul, norm, perp, mix, lerp, clamp, polyline, ell, D2R, poly } from '../geom.mjs';
import { C } from '../pal.mjs';
import { chainPath } from './chain.mjs';
import { LINE, CEL, viewOf } from './ink.mjs';
import { face2, EXPR } from './face2.mjs';
import { hair2, makeLocks, RIN_HAIR, SORA_HAIR } from './hair2.mjs';
import { hand2 } from './hands2.mjs';
import { RIN_BASE } from '../rin.mjs';

export const RIN_CFG = {
  name: 'rin', hairStyle: RIN_HAIR, coatTails: true,
  face: { skin: C.skin, skinShade: C.skinShade, skinDeep: C.skinDeep, irisC: [C.irisDark, C.iris, C.irisLite], brow: '#8A90A6', hair: C.hair, hairShade: C.hairShade, hairDeep: C.hairDeep, hairHi: '#FFFFFF', R: 34 },
  coat: C.coat, coatShade: C.coatShade, coatDeep: '#0A0A18', lining: C.gold, liningShade: C.goldShade, shirt: C.shirt, shirtShade: C.shirtShade,
  pants: C.pants, pantsShade: C.pantsShade, boot: C.boot, bootShade: C.bootShade, glove: C.glove, gloveShade: C.gloveShade,
  prop: { limb: 1, torso: 1, head: 1.14, width: 1 },
};
export const SORA_CFG = {
  name: 'sora', hairStyle: SORA_HAIR, coatTails: false, scarf: true,
  face: { skin: '#F4D9C4', skinShade: '#C08E8E', skinDeep: '#93636E', irisC: ['#1E3A66', '#3E7CC4', '#9CD0FF'], brow: '#2A2230', hair: '#3A2E3E', hairShade: '#241B2A', hairDeep: '#140E18', hairHi: '#8C7AA0', R: 34 },
  coat: C.jacket, coatShade: '#2E3140', coatDeep: '#1C1E28', lining: C.scarf, liningShade: C.scarfShade, shirt: '#D8D2C4', shirtShade: '#A49C8C',
  pants: '#3A3442', pantsShade: '#221E28', boot: '#5A3E2C', bootShade: '#2E1E14', glove: '#F4D9C4', gloveShade: '#C08E8E',
  prop: { limb: 0.74, torso: 0.78, head: 1.3, width: 0.86 },
};

// ---------- profiles (radii in px at s=1): [u, rLeft, rRight]
const ARM = [[0, 14.5, 14.5], [0.18, 15, 13.5], [0.46, 10.8, 10.8], [0.55, 10.2, 10.2], [0.7, 11.2, 10.4], [1, 8, 8]];
const LEG = [[0, 19, 19], [0.2, 18.5, 17], [0.48, 12.5, 12], [0.52, 12, 12], [0.66, 14, 11.5], [0.9, 9, 9], [1, 8.5, 8.5]];

/** 2-bone IK: returns [a1, a2] (deg) for root->target with segment lengths l1,l2; bend = +1/-1 picks the elbow side. */
export function ik2(root, target, l1, l2, bend = 1) {
  const dx = target.x - root.x, dy = target.y - root.y; const d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
  const base = Math.atan2(dy, dx);
  const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const a1 = base - bend * a;
  const E = { x: root.x + Math.cos(a1) * l1, y: root.y + Math.sin(a1) * l1 };
  const a2 = Math.atan2(target.y - E.y, target.x - E.x);
  return [a1 / D2R, a2 / D2R];
}

// ---------- deterministic spring secondary motion (fixed timestep, reset when a new bake starts)
const SPR = new Map();
function secondary(p, cfg) {
  const t = (p.time ?? 0) / 1000;
  let st = SPR.get(cfg.name);
  if (!st || t < st.t - 1e-6 || t - st.t > 1) st = { t, px: p.x, py: p.y, vx: 0, vy: 0, h: { x: 0, y: 0, vx: 0, vy: 0 }, c: { x: 0, vx: 0 } };
  const dt = t - st.t;
  const steps = Math.max(0, Math.round(dt * 240));
  const vx = dt > 0 ? (p.x - st.px) / dt : st.vx, vy = dt > 0 ? (p.y - st.py) / dt : st.vy;
  const ax = dt > 0 ? (vx - st.vx) / dt : 0, ay = dt > 0 ? (vy - st.vy) / dt : 0;
  const sc = 1 / Math.max(0.3, p.s);
  for (let i = 0; i < steps; i++) {
    const h = 1 / 240;
    // hair: drag opposite velocity + inertia opposite acceleration
    const tx = clamp((-vx * 0.0012 - ax * 0.00006) * sc, -1.6, 1.6), ty = clamp((-vy * 0.0010 - ay * 0.00005) * sc, -1, 1);
    st.h.vx += (90 * (tx - st.h.x) - 9 * st.h.vx) * h; st.h.vy += (90 * (ty - st.h.y) - 9 * st.h.vy) * h;
    st.h.x += st.h.vx * h; st.h.y += st.h.vy * h;
    const tc = clamp((-vx * 0.05 - ax * 0.003) * sc, -80, 80);
    st.c.vx += (60 * (tc - st.c.x) - 7 * st.c.vx) * h; st.c.x += st.c.vx * h;
  }
  Object.assign(st, { t, px: p.x, py: p.y, vx, vy });
  SPR.set(cfg.name, st);
  const w = 1 - clamp(p.secLock ?? 0, 0, 1); // art-directed override: key poses can lock secondary motion
  return { hx: st.h.x * w, hy: st.h.y * w, coat: st.c.x * w };
}

export function drawPerson(p0, cfg = RIN_CFG) {
  const p = { ...RIN_BASE, ...(p0.expr ? EXPR[p0.expr] : {}), ...p0 };
  if (p.spin) for (const k of ['lean', 'aL1', 'aL2', 'aR1', 'aR2', 'lL1', 'lL2', 'lR1', 'lR2', 'ftL', 'ftR', 'dagAng']) p[k] += p.spin;
  const PR = cfg.prop, s = p.s, lim = PR.limb;
  const yaw = clamp(p.f, -2, 2) * 90, cyaw = Math.abs(Math.cos(yaw * D2R)), back = Math.abs(yaw) > 112;
  const LA1 = 84 * lim, LA2 = 76 * lim, LL1 = 112 * lim, LL2 = 106 * lim;
  const sq = p.squash ?? 1;
  const hwq = 25 * s * PR.width * (0.55 + 0.45 * cyaw) / Math.sqrt(sq);
  if (p.ground != null) {
    let low = -1e9;
    for (const side of [1, -1]) {
      const a1 = side > 0 ? p.lL1 : p.lR1, a2 = side > 0 ? p.lL2 : p.lR2, k = side > 0 ? p.legLk : p.legRk;
      const R = { x: Math.cos(p.lean * D2R) * side * hwq * 0.62, y: Math.sin(p.lean * D2R) * side * hwq * 0.62 };
      const K = polar(R, a1, LL1 * s * k), A = polar(K, a2, LL2 * s * k);
      low = Math.max(low, A.y + 10 * s);
    }
    p.y = p.ground - low;
  }
  const sec = secondary(p, cfg);
  p.hairX = (p.hairX ?? 0) + sec.hx; p.hairY = (p.hairY ?? 0) + sec.hy; p.coat = (p.coat ?? 0) + sec.coat; p.ribbonX = (p.ribbonX ?? -1) + sec.hx * 0.5;
  const t = (p.time ?? 0) / 1000;
  const parts = [];
  const push = (k, d, fill, stroke, z, cel, extra) => parts.push({ k, d, fill, stroke, z, ...(cel ? { cel } : {}), ...(extra ?? {}) });
  const cel = (shade, opts) => CEL(shade, s, { rim: p.rim, ...opts });
  const up = p.lean - 90, H = { x: p.x, y: p.y };
  const across = { x: Math.cos(p.lean * D2R), y: Math.sin(p.lean * D2R) }, upv = polar({ x: 0, y: 0 }, up, 1);
  const T = (u, v) => ({ x: H.x + across.x * u * s + upv.x * v * s, y: H.y + across.y * u * s + upv.y * v * s }); // torso space
  const TH = PR.torso * sq;
  const SC = add(H, mul(upv, (118 * TH + p.breath * 2) * s)), N = add(H, mul(upv, (138 * TH + p.breath * 2) * s));
  const sw = 40 * s * PR.width * (0.5 + 0.5 * cyaw) / Math.sqrt(sq), hw = hwq;
  const dirF = Math.sign(yaw || 1) * Math.min(1, Math.abs(Math.sin(yaw * D2R))) * (back ? -1 : 1); // chest-forward offset
  const shoulder = (side) => add(add(SC, mul(across, side * sw)), mul(across, -dirF * 4 * s));
  const hipR = (side) => add(H, mul(across, side * hw * 0.62));
  // IK targets (optional): handLT/handRT/footLT/footRT {x,y} in screen space
  const L1 = LA1 * s, L2 = LA2 * s;
  for (const [side, key] of [[1, 'L'], [-1, 'R']]) {
    const ht = p['hand' + key + 'T']; if (ht) { const sh = shoulder(side); const [a1, a2] = ik2(sh, ht, L1 * p['arm' + key + 'k'], L2 * p['arm' + key + 'k'], p['bend' + key] ?? -side); p['a' + key + '1'] = a1; p['a' + key + '2'] = a2; }
    const ft = p['foot' + key + 'T']; if (ft) { const R = hipR(side); const [a1, a2] = ik2(R, ft, LL1 * s, LL2 * s, p['kbend' + key] ?? 1); p['l' + key + '1'] = a1; p['l' + key + '2'] = a2; }
  }
  const ink = (k = 1) => LINE.outer(s * k), inner = (k = 1) => LINE.inner(s * k);
  // ---------- arms (organic chain: deltoid, elbow, forearm bulge, wrist; volume kept at sharp bends)
  const arm = (side, a1o, a2o) => {
    const S0 = side > 0 ? shoulder(1) : shoulder(-1);
    const a1 = a1o ?? (side > 0 ? p.aL1 : p.aR1), a2 = a2o ?? (side > 0 ? p.aL2 : p.aR2), k = side > 0 ? p.armLk : p.armRk, fk = side > 0 ? p.foreL : p.foreR;
    const E = polar(S0, a1, LA1 * s * k), W = polar(E, a2, LA2 * s * k * fk);
    return { S0, E, W, a1, a2, k: k * fk, fk, bend: ((a2 - a1 + 540) % 360) - 180 };
  };
  const limbProfile = (base, bend, joint = 0.5, gain = 0.22) => {
    // joint volume preservation: outer side of a sharp bend bulges, inner side pinches slightly
    const b = clamp(Math.abs(bend) / 120, 0, 1), sgn = Math.sign(bend);
    return base.map(([u, l, r]) => { const w = Math.max(0, 1 - Math.abs(u - joint) / 0.18); const out = 1 + gain * b * w, inn = 1 - 0.12 * b * w; return [u, l * (sgn > 0 ? inn : out), r * (sgn > 0 ? out : inn)]; });
  };
  const drawArm = (side, z, pre) => {
    const A = arm(side);
    const zG = clamp((1 - A.fk) * 1.1, 0, 1.2);
    const prof = limbProfile(ARM.map(([u, l, r]) => [u, l * PR.width, r * PR.width]), A.bend);
    const mid = mix(A.E, A.W, 0.5);
    const sleeve = chainPath([A.S0, mix(A.S0, A.E, 0.5), A.E, mid, A.W], prof, { scale: s, zGrow: zG });
    // smear: ghost drawings of the limb between the previous and current angles (authored, 1-2 frames)
    const sm = p['smear' + (side > 0 ? 'L' : 'R')];
    if (sm) for (let i = 1; i <= 3; i++) { const u = i / 4; const G = arm(side, lerp(sm.a1, A.a1, u), lerp(sm.a2, A.a2, u)); push(pre + 'sm' + i, chainPath([G.S0, G.E, G.W], prof, { scale: s * (0.8 + u * 0.2) }), { color: cfg.coat, opacity: 0.25 + u * 0.2 }, null, z - 0.05 + i * 0.001); }
    push(pre + 'sl', sleeve, cfg.coat, ink(), z, cel(cfg.coatShade, { shade2: cfg.coatDeep }));
    // gold cuff
    const cA = mix(A.E, A.W, 0.8), cB = mix(A.E, A.W, 0.97), r = 8.4 * s * PR.width * (1 + zG * 0.9);
    push(pre + 'cuff', chainPath([cA, cB], [[0, r / s, r / s], [1, r / s * 1.05, r / s * 1.05]], { scale: s, capStart: true }), cfg.lining, inner(), z + 0.02, cel(cfg.liningShade, { d: 3 }));
    const hand = side > 0 ? p.handL : p.handR;
    const preset = hand === 'grip' ? 'grip' : hand ?? 'relaxed';
    parts.push(...hand2({ x: A.W.x, y: A.W.y, ang: A.a2 + (p['wrist' + (side > 0 ? 'L' : 'R')] ?? 0), s: s * 1.25 * (1 + zG * 1.1) * PR.width, side: side * (back ? -1 : 1) * (Math.sign(yaw) || 1), preset, view: p['handView' + (side > 0 ? 'L' : 'R')] ?? (Math.abs(yaw) > 60 ? 'side' : 'back'), skin: cfg.face.skin, skinShade: cfg.face.skinShade, gloveC: cfg.glove, gloveShade: cfg.gloveShade, rim: p.rim, k: pre + 'h', z: z + 0.04 }));
    return A;
  };
  // ---------- legs
  const leg = (side) => {
    const R = hipR(side), a1 = side > 0 ? p.lL1 : p.lR1, a2 = side > 0 ? p.lL2 : p.lR2, k = side > 0 ? p.legLk : p.legRk;
    const K = polar(R, a1, LL1 * s * k), A = polar(K, a2, LL2 * s * k);
    return { R, K, A, ft: side > 0 ? p.ftL : p.ftR, k, a1, a2, bend: ((a2 - a1 + 540) % 360) - 180 };
  };
  const drawLeg = (side, z, pre) => {
    const L = leg(side);
    const zG = clamp((1 - L.k) * 1.1, 0, 1.2);
    // calf bulges to the back of the leg: back = opposite the facing direction
    const fs = Math.sign(yaw || 1);
    const prof = limbProfile(LEG.map(([u, l, r]) => [u, l * PR.width, r * PR.width]), L.bend, 0.5, 0.2);
    const sm = p['smearLeg' + (side > 0 ? 'L' : 'R')];
    if (sm) for (let i = 1; i <= 3; i++) { const u = i / 4; const R = L.R, K = polar(R, lerp(sm.a1, L.a1, u), LL1 * s * L.k), A = polar(K, lerp(sm.a2, L.a2, u), LL2 * s * L.k); push(pre + 'sm' + i, chainPath([R, K, A], prof, { scale: s }), { color: cfg.pants, opacity: 0.22 + u * 0.2 }, null, z - 0.05 + i * 0.001); }
    const R0 = add(L.R, mul(upv, 6 * s));
    push(pre + 'leg', chainPath([R0, mix(L.R, L.K, 0.5), L.K, mix(L.K, L.A, 0.5), L.A], prof, { scale: s, zGrow: zG }), cfg.pants, ink(), z, cel(cfg.pantsShade));
    // boot shaft (mid-shin to ankle) + foot wedge
    const b0 = mix(L.K, L.A, 0.42), rb = 10.5 * PR.width * (1 + zG);
    push(pre + 'boot', chainPath([b0, mix(b0, L.A, 0.5), L.A], [[0, rb + 1, rb + 1], [0.6, rb * 0.95, rb * 0.95], [1, rb * 0.9, rb * 0.9]], { scale: s }), cfg.boot, ink(), z + 0.1, cel(cfg.bootShade, { d: 4 }));
    const fl = 32 * lim * (back ? 0.7 : 0.55 + 0.45 * Math.abs(Math.sin(yaw * D2R))) * (1 + zG * 0.5);
    const toe = polar(L.A, L.ft, fl * s), heel = polar(L.A, L.ft + 180, 9 * s * lim);
    let dn = perp(norm(sub(toe, heel))); if (dn.y < 0) dn = mul(dn, -1);
    const fp = [S(heel.x - dn.x * 8 * s, heel.y - dn.y * 8 * s), add(mix(heel, toe, 0.55), mul(dn, -10 * s)), add(toe, mul(dn, -2 * s)), S(toe.x + dn.x * 5 * s, toe.y + dn.y * 5 * s), S(heel.x + dn.x * 6 * s, heel.y + dn.y * 6 * s)];
    push(pre + 'foot', shape(fp, 0.9), cfg.boot, ink(), z + 0.12, cel(cfg.bootShade, { d: 3 }));
    push(pre + 'sole', polyline([add(heel, mul(dn, 6 * s)), add(toe, mul(dn, 5 * s))]), null, { ...LINE.color('#5A4A44', s, 2.4) }, z + 0.13);
    return L;
  };
  // ---------- ribbon (from LEFT wrist)
  const ribbon = (z) => {
    if (!cfg.coatTails) return;
    const A = arm(1); const pts = [A.W]; let q = A.W, prevW = 0;
    for (let i = 1; i <= 10; i++) {
      const w = Math.sin(t * 7 + i * 0.75) * 9 * s * p.ribbonAmp * (i / 10);
      const d = { x: p.ribbonX * 14 * s, y: (p.ribbonY * 14 + 4) * s }; const n = perp(norm(d));
      q = add(add(q, d), mul(n, w - prevW)); prevW = w; pts.push(q);
    }
    push('ribbon', strand(pts, 7 * s, 2 * s), C.ribbon, inner(), z, cel(C.ribbonShade, { d: 3 }));
  };
  // ---------- torso: per-view construction (front/side profiles blended continuously by yaw)
  const torso = (z) => {
    const fw = PR.width * (0.55 + 0.45 * cyaw), side = Math.abs(Math.sin(yaw * D2R)), fd = Math.sign(yaw || 1);
    // levels v (up from hip) with half-widths; side profile adds chest forward / lumbar curve
    const lv = [[0, 27], [20, 24], [46, 20.5], [70, 25], [92, 30], [112, 38], [124, 30]].map(([v, w]) => [v * TH, w]);
    const fwd = [0, 0, -2, 2, 6, 3, -2], bck = [5, 3, -3, -1, 2, 2, -2];
    const Lc = lv.map(([v, w], i) => T(fd * (w * fw + side * (fd > 0 ? fwd[i] : bck[i])), v));
    const Rc = lv.map(([v, w], i) => T(-fd * (w * fw + side * (fd > 0 ? bck[i] : fwd[i])), v));
    push('shirt', shape([...Lc.map((q, i) => (i === 0 || i === Lc.length - 1 ? S(q.x, q.y) : q)), ...Rc.reverse().map((q, i) => (i === 0 || i === Rc.length - 1 ? S(q.x, q.y) : q))], 0.8), cfg.shirt, ink(), z, cel(cfg.shirtShade));
    // belt
    const bw = 27 * fw + 2;
    push('belt', poly([T(-bw, 12), T(bw, 12), T(bw + 0.5, 3), T(-bw - 0.5, 3)]), '#3A2A22', inner(), z + 0.05, cel('#1E140F', { d: 2 }));
    if (!back) push('buckle', poly([T(fd * 2, 12.5), T(fd * 9, 12.5), T(fd * 9, 2.5), T(fd * 2, 2.5)]), C.gold, LINE.detail(s), z + 0.06);
    // coat panels: open front, long LEFT tail; tails driven by p.coat (lag/spring)
    const gap = (4 + p.coatOpen * 10) / fw, cw = (w) => w * fw;
    const dn = (lag, len) => mul(polar({ x: 0, y: 0 }, 90 + p.lean * 0.5 + lag, 1), len * s);
    const W0 = T(0, 46 * TH);
    const sideX = (sgn, v, w) => T(sgn * cw(w), v * TH);
    const tl = cfg.coatTails ? 1 : 0.32;
    const tailL = add(sideX(1, 46, 27), dn(p.coat * 1.0, 150 * tl * TH)), tailLm = add(sideX(1, 46, 25), dn(p.coat * 0.55, 75 * tl * TH));
    const tailLin = add(T(gap, 46 * TH), dn(p.coat * 1.2, 112 * tl * TH));
    const tailR = add(sideX(-1, 46, 27), dn(p.coat * 0.6, 62 * tl * TH)), tailRin = add(T(-gap, 46 * TH), dn(p.coat * 0.7, 40 * tl * TH));
    const SLp = shoulder(1), SRp = shoulder(-1);
    if (back) {
      const nk = add(N, mul(upv, 14 * s));
      push('collarB', shape([S(...xy(add(N, mul(across, -17 * s)))), S(...xy(add(nk, mul(across, -15 * s)))), S(...xy(add(nk, mul(across, 15 * s)))), S(...xy(add(N, mul(across, 17 * s))))], 0.8), cfg.coat, ink(), z + 0.2, cel(cfg.coatShade));
      push('coatB', shape([S(...xy(SLp)), sideX(1, 70, 29), S(...xy(sideX(1, 46, 27))), S(...xy(tailL)), mix(tailL, tailR, 0.5), S(...xy(tailR)), S(...xy(sideX(-1, 46, 27))), sideX(-1, 70, 29), S(...xy(SRp)), T(0, 136 * TH)], 0.7), cfg.coat, ink(), z + 0.1, cel(cfg.coatShade, { shade2: cfg.coatDeep }));
      return;
    }
    push('liningL', shape([S(...xy(T(gap, 46 * TH))), S(...xy(tailLin)), mix(tailL, tailLin, 0.45), S(...xy(sideX(1, 40, 18)))], 0.6), cfg.lining, inner(), z + 0.08, cel(cfg.liningShade, { d: 4 }));
    push('liningR', shape([S(...xy(T(-gap, 46 * TH))), S(...xy(tailRin)), S(...xy(mix(tailR, tailRin, 0.4)))], 0.6), cfg.lining, inner(), z + 0.08, cel(cfg.liningShade, { d: 4 }));
    const panelL = [S(...xy(T(6, 136 * TH))), S(...xy(add(SLp, mul(upv, 4 * s)))), add(SLp, mul(across, 5 * s)), sideX(1, 76, 28), S(...xy(sideX(1, 46, 27))), tailLm, S(...xy(tailL)), mix(tailL, tailLin, 0.5), S(...xy(tailLin)), S(...xy(T(gap, 46 * TH))), S(...xy(T(gap * 1.4 + 8, 90 * TH)))];
    const panelR = [S(...xy(T(-6, 136 * TH))), S(...xy(add(SRp, mul(upv, 4 * s)))), add(SRp, mul(across, -5 * s)), sideX(-1, 76, 28), S(...xy(sideX(-1, 46, 27))), S(...xy(tailR)), S(...xy(tailRin)), S(...xy(T(-gap, 46 * TH))), S(...xy(T(-gap * 1.4 - 8, 90 * TH)))];
    const zl = fd > 0 ? 0.1 : 0.11, zr = fd > 0 ? 0.11 : 0.1;
    push('coatL', shape(panelL, 0.7), cfg.coat, ink(), z + zl, cel(cfg.coatShade, { shade2: cfg.coatDeep }));
    push('coatR', shape(panelR, 0.7), cfg.coat, ink(), z + zr, cel(cfg.coatShade, { shade2: cfg.coatDeep }));
    // fold lines (tapered accents) on the long tail
    push('folds', polyline([mix(sideX(1, 46, 24), tailL, 0.15), mix(sideX(1, 46, 24), tailL, 0.8)]) + polyline([mix(T(gap + 6, 46 * TH), tailLin, 0.2), mix(T(gap + 6, 46 * TH), tailL, 0.7)]), null, LINE.detail(s), z + 0.12);
    if (cfg.scarf) {
      const nk = add(N, mul(upv, 2 * s));
      push('scarf', shape([T(-24, 128 * TH), T(0, 122 * TH), T(24, 128 * TH), add(nk, mul(across, 14 * s)), add(nk, mul(across, -14 * s))], 0.9), cfg.lining, ink(), z + 0.3, cel(cfg.liningShade, { d: 4 }));
      const tail = add(T(-14 * fd, 120 * TH), dn(p.coat * 0.9 + 10, 46));
      push('scarfT', shape([S(...xy(T(-18 * fd, 124 * TH))), S(...xy(T(-6 * fd, 122 * TH))), S(...xy(tail)), S(...xy(add(tail, mul(across, -8 * s * fd))))], 0.8), cfg.lining, ink(), z + 0.29, cel(cfg.liningShade, { d: 4 }));
    } else {
      const nk = add(N, mul(upv, 16 * s));
      const cl = [add(N, mul(across, -16 * s)), add(nk, mul(across, -13 * s)), add(nk, mul(across, 13 * s)), add(N, mul(across, 16 * s)), add(N, mul(upv, -10 * s))];
      push('collar', shape([S(...xy(cl[0])), S(...xy(cl[1])), S(...xy(cl[2])), S(...xy(cl[3])), cl[4]], 0.8), cfg.coat, ink(), z + 0.3, cel(cfg.coatShade));
      push('collarG', polyline([cl[1], cl[2]]), null, LINE.color(C.gold, s, 2.4), z + 0.31);
    }
  };
  const dagger = (z) => {
    if (!p.dagger || !cfg.coatTails) return;
    const A = arm(-1), dir = norm(sub(A.W, A.E));
    const G = add(A.W, mul(dir, 11 * s * (1 + clamp((1 - A.fk) * 1.1, 0, 1.2))));
    const bd = polar({ x: 0, y: 0 }, p.dagAng, 1), bn = perp(bd);
    const tip = add(G, mul(bd, 78 * s * (p.dagK ?? 1))), b0 = add(G, mul(bd, 10 * s));
    push('dagH', chainPath([add(G, mul(bd, -16 * s)), add(G, mul(bd, 2 * s))], [[0, 3.4, 3.4], [1, 3.4, 3.4]], { scale: s }), C.handle, inner(), z);
    push('dagG', poly([add(b0, mul(bn, -11 * s)), add(b0, mul(bn, 11 * s)), add(G, mul(bn, 7 * s)), add(G, mul(bn, -7 * s))]), C.guard, inner(), z + 0.01);
    if (p.dagger === 1) {
      push('dagB', poly([add(b0, mul(bn, -6 * s)), add(mix(b0, tip, 0.7), mul(bn, -5 * s)), tip, add(mix(b0, tip, 0.7), mul(bn, 5 * s)), add(b0, mul(bn, 6 * s))]), C.prismMid, ink(0.8), z + 0.02);
      push('dagBF', poly([add(b0, mul(bn, -6 * s)), add(mix(b0, tip, 0.7), mul(bn, -5 * s)), tip, b0]), C.prism, null, z + 0.03);
      push('dagBl', polyline([add(b0, mul(bd, 4 * s)), mix(b0, tip, 0.9)]), null, LINE.color('#FFFFFF', s, 1.4), z + 0.04);
    } else push('dagB', poly([add(b0, mul(bn, -6 * s)), add(add(b0, mul(bd, 14 * s)), mul(bn, -5 * s)), add(add(b0, mul(bd, 22 * s)), mul(bn, 1 * s)), add(add(b0, mul(bd, 12 * s)), mul(bn, 6 * s)), add(b0, mul(bn, 6 * s))]), C.prismMid, ink(0.8), z + 0.02);
  };
  const core = (z) => {
    if (!p.core) return;
    const A = arm(1), c = add(A.W, mul(norm(sub(A.W, A.E)), 20 * s)), r = 15 * s * p.coreR;
    push('coreGlow', ell(c.x, c.y, r * 2.4, r * 2.4), { gradient: { type: 'radial', x0: c.x, y0: c.y, x1: c.x + r * 2.4, y1: c.y, stops: [{ offset: 0, color: 'rgba(255,220,140,0.9)' }, { offset: 1, color: 'rgba(255,170,40,0)' }] } }, null, z);
    push('core', ell(c.x, c.y, r, r), { gradient: { type: 'radial', x0: c.x - r * 0.3, y0: c.y - r * 0.3, x1: c.x + r, y1: c.y, stops: [{ offset: 0, color: '#FFFFFF' }, { offset: 0.35, color: C.sunCore }, { offset: 1, color: C.sun }] } }, LINE.color(C.sunDeep, s, 2), z + 0.01);
  };
  // ---------- head
  const hs = s * PR.head;
  const headC = polar(add(N, mul(upv, 4 * s)), up + p.hTilt * 0.3, 30 * hs);
  const hrot = p.lean + p.hTilt, hyaw = clamp(yaw + (p.hTurn ?? 0) * 90, -180, 180);
  const { view, mirror } = viewOf(hyaw);
  const ho = { x: headC.x, y: headC.y, rot: hrot, s: hs, yaw: hyaw, time: p.time, hairX: p.hairX, hairY: p.hairY, rim: p.rim };
  const hair = hair2({ ...ho, cfg: cfg.face }, makeLocks(cfg.hairStyle));
  const fz = (arr, base) => arr.map((q) => ({ ...q, k: 'hd' + q.k, z: base + (q.z ?? 0) * 0.01 }));
  // ---------- assemble in depth order
  const backA = back ? (p.backArm === 'L' ? -1 : 1) : p.backArm === 'L' ? 1 : -1, backL = p.backLeg === 'L' ? 1 : -1;
  parts.push(...fz(hair.back, 2));
  if (backA === 1) ribbon(3);
  drawArm(backA, 4, 'armB');
  if (backA === 1) core(3.9); else dagger(3.9);
  drawLeg(backL, 6, 'legB');
  drawLeg(-backL, 8, 'legF');
  torso(10);
  const nt = polar(N, up, 22 * s);
  push('neck', chainPath([add(N, mul(upv, -6 * s)), nt], [[0, 8, 8], [1, 7, 7]], { scale: s * PR.width }), cfg.face.skin, inner(), 9.5, cel(cfg.face.skinShade, { d: 5 }));
  parts.push(...fz(face2({ ...ho, view, mirror, cfg: cfg.face, ...pick(p) }), 20));
  parts.push(...fz(hair.front, 26));
  if (!back) { drawArm(-backA, 30, 'armF'); if (backA === 1) dagger(31); else core(31); if (backA !== 1) ribbon(32); }
  else { drawArm(-backA, 1.5, 'armF'); }
  return parts;
}
const xy = (q) => [q.x, q.y];
const pick = (p) => { const o = {}; for (const k of ['eye', 'pupil', 'lookX', 'lookY', 'brow', 'mouth', 'smile', 'teeth', 'glint', 'blush', 'tear', 'sweat', 'scratch', 'happy', 'round']) if (p[k] != null) o[k] = p[k]; return o; };
export const drawRin2 = (p) => drawPerson(p, RIN_CFG);
export const drawSora2 = (p) => drawPerson(p, SORA_CFG);
