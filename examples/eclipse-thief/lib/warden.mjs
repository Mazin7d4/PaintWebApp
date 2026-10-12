// THE WARDEN — towering armored void. Pose -> key drawing.
import { frame, poly, shape, S, smooth, strand, limb, limbShade, polar, add, sub, mul, norm, perp, mix, lerp, clamp, polyline, ell, ellPts, D2R, rng } from './geom.mjs';
import { C } from './pal.mjs';

export const WARDEN_BASE = {
  x: 960, y: 1000, s: 1, lean: 0, hTilt: 0, eye: 0, halo: 0, haloOn: 1,
  aL1: 100, aL2: 95, aR1: 80, aR2: 85, armLk: 1, armRk: 1, clawL: 0.3, clawR: 0.3,
  lL1: 95, lL2: 92, lR1: 85, lR2: 88, crouch: 0,
  split: 0, dissolve: 0, crackWrist: 0, shoulderGone: 0, recoil: 0, glow: 0, sil: 0,
};
const xyv = (q) => [q.x, q.y];

export function drawWarden(p0) {
  const p = { ...WARDEN_BASE, ...p0 };
  const s = p.s, t = (p.time ?? 0) / 1000;
  const parts = [];
  const push = (k, d, fill, stroke, z) => { if (p.sil) { fill = fill ? C.void : null; stroke = stroke ? { color: C.void, width: stroke.width } : null; } parts.push({ k, d, fill, stroke, z }); };
  const inkW = (w) => ({ color: C.ink, width: w * s });
  const edge = (w) => ({ color: C.armorEdge, width: w * s });
  const up = p.lean - 90;
  const across = { x: Math.cos(p.lean * D2R), y: Math.sin(p.lean * D2R) };
  const legLen = 250 * (1 - p.crouch * 0.25);
  const Hp = polar({ x: p.x, y: p.y }, up, 500 * s * (1 - p.crouch * 0.3));
  const SC = polar(Hp, up, 330 * s), N = polar(Hp, up, 380 * s);
  const head = polar(N, up + p.hTilt * 0.4, 70 * s);
  const sp = p.split * 120 * s; // torso split offset (after the slash)
  const R = rng(3);
  // ---- smoke helper: wobbling jagged blob outline
  const smoke = (cx, cy, rx, ry, seed, n = 18, amp = 0.25) => {
    const r = rng(seed); const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 360, w = 1 + amp * Math.sin(t * 3 + i * 1.7 + seed) + (r() - 0.5) * amp;
      pts.push(polar({ x: cx, y: cy }, a, (i % 2 ? rx : ry) * w));
    }
    return smooth(pts, true, 0.9);
  };
  // ---- halo (behind the head): inverted ring, spikes pointing inward, rotating
  if (p.haloOn) {
    const hc = polar(head, up, 18 * s), rx = 165 * s, ry = 165 * s * 0.9;
    const ring = [...ellPts(hc.x, hc.y, rx, ry, 40, p.lean)];
    const inner = [...ellPts(hc.x, hc.y, rx * 0.9, ry * 0.9, 40, p.lean)].reverse();
    push('haloR', poly(ring) + poly(inner), C.halo, inkW(2.5), 1);
    const spikes = [];
    for (let i = 0; i < 12; i++) {
      const a = p.halo + i * 30;
      const o = polar(hc, a, rx * 0.95), tip = polar(hc, a, rx * (i % 3 === 0 ? 0.55 : 0.72));
      const n = perp(norm(sub(tip, o)));
      spikes.push(poly([add(o, mul(n, 9 * s)), tip, add(o, mul(n, -9 * s))]));
    }
    push('haloS', spikes.join(''), C.halo, inkW(2), 1.1);
    push('haloG', polyline(ellPts(hc.x, hc.y, rx * 0.95, ry * 0.95, 40).slice(26, 36)), null, { color: '#D8DCE8', width: 2.5 * s }, 1.2);
  }
  // ---- legs (thin armored, mostly under fabric)
  const leg = (side) => {
    const r0 = add(Hp, mul(across, side * 50 * s));
    const K = polar(r0, side > 0 ? p.lL1 : p.lR1, legLen * s), A = polar(K, side > 0 ? p.lL2 : p.lR2, 260 * s);
    push('leg' + side, limb(r0, K, 30 * s, 22 * s), C.void, inkW(3), 3);
    push('shin' + side, limb(K, A, 24 * s, 16 * s), C.armor, inkW(3), 3.1);
    push('shinE' + side, limbShade(K, A, 24 * s, 16 * s, side, 0.12), C.armorLite, null, 3.15);
    push('knee' + side, ell(K.x, K.y, 28 * s, 24 * s), C.armor, inkW(3), 3.2);
    const toe = polar(A, side > 0 ? 8 : 172, 110 * s);
    push('foot' + side, poly([polar(A, -150 + (side > 0 ? 0 : 120), 22 * s), toe, polar(A, 80, 16 * s), polar(A, side > 0 ? 160 : 20, 26 * s)]), C.armor, inkW(3), 3.3);
    return { A, toe };
  };
  leg(-1); leg(1);
  // ---- torn ceremonial fabric (hangs from waist, moves with time)
  for (let i = 0; i < 6; i++) {
    const u = (i - 2.5) / 2.5;
    const root = add(polar(Hp, up, 10 * s), mul(across, u * 70 * s));
    const sway = Math.sin(t * 1.6 + i) * 18 * s + p.recoil * -30 * s;
    const L = (300 + (i % 3) * 90) * s;
    const ga = Math.abs(p.lean) > 90 ? 90 : 90 + p.lean * 0.3;
    const pts = [root, add(polar(root, ga, L * 0.5), { x: sway * 0.5 + u * 20 * s, y: 0 }), add(polar(root, ga, L), { x: sway + u * 40 * s, y: 0 })];
    push('cloth' + i, strand(pts, 70 * s, 26 * s), i % 2 ? C.cloth : C.clothShade, inkW(2.5), 4 + i * 0.01);
    // tear notches
    push('clothT' + i, poly([pts[2], add(pts[2], { x: -16 * s, y: -40 * s }), add(pts[2], { x: 10 * s, y: -26 * s })]), C.void, null, 4.1 + i * 0.01);
  }
  // ---- torso: void core with segmented plates (split moves upper half sideways)
  const top = (q) => add(q, { x: sp, y: -sp * 0.15 });
  push('voidT', smoke(mix(Hp, SC, 0.5).x + sp * 0.5, mix(Hp, SC, 0.5).y, 120 * s, 190 * s, 11, 22, 0.18), C.void, null, 5);
  for (let b = 0; b < 4; b++) {
    const y0 = 70 + b * 62, y1 = y0 + 52, wd0 = 92 - b * 4 + (b === 3 ? 18 : 0), wd1 = wd0 - 8;
    const q = (yy, wd, side) => { const c = polar(Hp, up, yy * s); const v = add(c, mul(across, side * wd * s)); return b >= 2 ? top(v) : v; };
    const pl = [q(y0, wd0, -1), q(y0, wd0, 1), q(y1, wd1, 1), q(y1, wd1, -1)];
    push('plate' + b, poly(pl), C.armor, inkW(3), 6 + b * 0.01);
    push('plateE' + b, polyline([pl[3], pl[2]]), null, edge(2.4), 6.005 + b * 0.01);
    push('plateS' + b, poly([pl[0], mix(pl[0], pl[1], 0.35), mix(pl[3], pl[2], 0.25), pl[3]]), C.void, null, 6.006 + b * 0.01);
  }
  // pauldrons (layered)
  for (const side of [-1, 1]) {
    if (side > 0 && p.shoulderGone) continue;
    const sh = top(add(SC, mul(across, side * 110 * s)));
    for (let l = 0; l < 3; l++) {
      const c = polar(sh, up + 180, l * 24 * s);
      const pts = [add(c, mul(across, -side * 40 * s)), polar(add(c, mul(across, side * 30 * s)), up, 40 * s), add(c, mul(across, side * 86 * s)), polar(add(c, mul(across, side * 70 * s)), up + 180, 22 * s), polar(add(c, mul(across, -side * 30 * s)), up + 180, 26 * s)];
      push(`paul${side}_${l}`, poly(pts), C.armor, inkW(3), 9 + l * 0.01);
      push(`paulE${side}_${l}`, polyline([pts[0], pts[1], pts[2]]), null, edge(2.2), 9.005 + l * 0.01);
    }
  }
  if (p.shoulderGone) {
    const sh = top(add(SC, mul(across, 110 * s)));
    push('wound', smoke(sh.x, sh.y, 60 * s, 46 * s, 5, 14, 0.35), C.void, null, 9.5);
    push('woundG', smoke(sh.x, sh.y, 36 * s, 28 * s, 6, 10, 0.4), { color: C.sun, opacity: 0.9 * p.shoulderGone }, null, 9.6);
  }
  // ---- arms: very long, segmented, sharp fingers
  const arm = (side) => {
    const S0 = top(add(SC, mul(across, side * 120 * s)));
    const a1 = side > 0 ? p.aL1 : p.aR1, a2 = side > 0 ? p.aL2 : p.aR2, k = side > 0 ? p.armLk : p.armRk;
    const E = polar(S0, a1, 290 * s * k), Wr = polar(E, a2, 300 * s * k);
    push('aU' + side, limb(S0, E, 26 * s, 20 * s), C.void, inkW(3), 7);
    for (let g = 0; g < 4; g++) { const a = mix(S0, E, 0.12 + g * 0.21), b = mix(S0, E, 0.27 + g * 0.21); push(`aUp${side}_${g}`, limb(a, b, 25 * s, 22 * s), C.armor, inkW(2.6), 7.1 + g * 0.01); }
    push('aF' + side, limb(E, Wr, 20 * s, 15 * s), C.void, inkW(3), 7.3);
    for (let g = 0; g < 4; g++) { const a = mix(E, Wr, 0.1 + g * 0.22), b = mix(E, Wr, 0.26 + g * 0.22); push(`aFp${side}_${g}`, limb(a, b, 19 * s, 16 * s), C.armor, inkW(2.6), 7.4 + g * 0.01); }
    push('elb' + side, ell(E.x, E.y, 24 * s, 24 * s), C.armorLite, inkW(2.6), 7.35);
    // hand + claws
    const dir = norm(sub(Wr, E)), n = perp(dir);
    const claw = side > 0 ? p.clawL : p.clawR;
    const palm = add(Wr, mul(dir, 34 * s));
    push('palm' + side, poly([add(Wr, mul(n, 18 * s)), add(palm, mul(n, 26 * s)), add(palm, mul(n, -26 * s)), add(Wr, mul(n, -18 * s))]), C.armor, inkW(2.6), 7.8);
    for (let fgr = 0; fgr < 4; fgr++) {
      const off = (fgr - 1.5) * 15 * s;
      const baseAng = Math.atan2(dir.y, dir.x) / D2R + (fgr - 1.5) * (8 + claw * 22);
      const r0 = add(palm, mul(n, off));
      const j1 = polar(r0, baseAng, 50 * s), tip = polar(j1, baseAng + side * claw * 50, 62 * s);
      push(`f${side}_${fgr}`, shape([S(...xyv(add(r0, mul(n, 6 * s)))), j1, S(...xyv(tip)), S(...xyv(add(r0, mul(n, -6 * s))))], 0.5), C.armorLite, inkW(2), 7.9 + fgr * 0.01);
    }
    if (side > 0 && p.crackWrist) {
      const c = mix(E, Wr, 0.85);
      push('crack', polyline([polar(c, 20, 30 * s), c, polar(c, 200, 22 * s), polar(c, 230, 40 * s)]) + polyline([c, polar(c, 120, 26 * s)]), null, { color: C.sun, width: 3.5 * s * p.crackWrist }, 7.95);
    }
    return { S0, E, Wr, tip: polar(palm, Math.atan2(dir.y, dir.x) / D2R, 110 * s) };
  };
  const AL = arm(1), AR = arm(-1);
  // ---- head: black porcelain mask, one vertical slit eye, no mouth
  const HF = frame(head.x + sp, head.y - sp * 0.15, p.lean + p.hTilt, s, s);
  push('hood', shape([HF(-70, 40), HF(-76, -40), HF(-40, -92), HF(0, -104), HF(40, -92), HF(76, -40), HF(70, 40), HF(30, 70), HF(-30, 70)], 0.9), C.void, inkW(3), 10);
  push('mask', shape([S(...xyv(HF(-46, -60))), HF(-52, -10), HF(-42, 40), S(...xyv(HF(0, 76))), HF(42, 40), HF(52, -10), S(...xyv(HF(46, -60))), HF(0, -72)], 0.8), C.mask, inkW(3.4), 10.2);
  push('maskSpec', poly([HF(-34, -54), HF(-12, -62), HF(-30, -20), HF(-38, 10), HF(-42, -18)]), { color: C.maskLite, opacity: 0.9 }, null, 10.3);
  push('maskEdge', polyline([HF(-46, -60), HF(0, -72), HF(46, -60)]), null, edge(2.2), 10.31);
  const eo = clamp(p.eye, 0, 1);
  push('slit', poly([HF(0, -48), HF(3 + eo * 6, -10), HF(0, 28), HF(-3 - eo * 6, -10)]), eo > 0.05 ? C.crimson : '#1B1820', { color: C.ink, width: 2 * s }, 10.4);
  if (eo > 0.05) {
    push('slitCore', poly([HF(0, -36), HF(1.5 + eo * 2.5, -10), HF(0, 16), HF(-1.5 - eo * 2.5, -10)]), '#FFD6DC', null, 10.5);
    push('slitGlow', ell(HF(0, -10).x, HF(0, -10).y, 40 * s * eo, 70 * s * eo, p.lean), { gradient: { type: 'radial', x0: HF(0, -10).x, y0: HF(0, -10).y, x1: HF(0, -10).x + 70 * s, y1: HF(0, -10).y, stops: [{ offset: 0, color: 'rgba(255,40,70,0.55)' }, { offset: 1, color: 'rgba(255,20,50,0)' }] } }, null, 10.35);
  }
  // ---- dissolve: overlay drifting black particles (as one compound path)
  if (p.dissolve > 0) {
    const r = rng(17); let d = '';
    for (let i = 0; i < 70; i++) {
      const bx = p.x + (r() - 0.5) * 420 * s, by = p.y - r() * 1100 * s;
      const rise = p.dissolve * (200 + r() * 500) * s;
      const sz = (6 + r() * 16) * s * (1 - p.dissolve * 0.6);
      d += poly([{ x: bx, y: by - rise - sz }, { x: bx + sz, y: by - rise }, { x: bx, y: by - rise + sz * 0.6 }, { x: bx - sz * 0.7, y: by - rise }]);
    }
    push('dust', d, C.void, null, 20);
  }
  return parts;
}
