// RIN — pose -> key drawing. Skeleton with foreshortening, cel-shaded parts, hair/coat/ribbon secondary motion.
import { frame, poly, shape, S, smooth, strand, limb, limbShade, polar, add, sub, mul, norm, perp, mix, lerp, clamp, polyline, ell, D2R, rng } from './geom.mjs';
import { face } from './face.mjs';
import { C } from './pal.mjs';

export const RIN_BASE = {
  x: 960, y: 640, s: 1, lean: 0, f: 0.25, hTilt: 0, hTurn: 0,
  aL1: 80, aL2: 100, aR1: 100, aR2: 80, armLk: 1, armRk: 1, foreL: 1, foreR: 1,
  lL1: 84, lL2: 92, lR1: 97, lR2: 90, ftL: 15, ftR: 165, legLk: 1, legRk: 1,
  coat: 0, coatOpen: 0.3, hairX: 0, hairY: 0, ribbonX: -1, ribbonY: 0.2, ribbonAmp: 1,
  eye: 1, pupil: 1, lookX: 0, lookY: 0, brow: 0, mouth: 0, smile: 0, light: 1,
  scratch: 0, tear: 0, sweat: 0, blush: 0, glint: 0,
  dagger: 1, dagAng: -60, handL: 'fist', handR: 'grip', backArm: 'L', backLeg: 'L', core: 0, coreR: 1,
  breath: 0, squash: 1,
};

const inkW = (s, w) => ({ color: C.ink, width: w * s });

export function drawRin(p0) {
  const p = { ...RIN_BASE, ...p0 };
  if (p.spin) for (const k of ['lean', 'aL1', 'aL2', 'aR1', 'aR2', 'lL1', 'lL2', 'lR1', 'lR2', 'ftL', 'ftR', 'dagAng']) p[k] += p.spin;
  if (p.ground != null) {
    // foot contact: drop/raise the hip so the lowest boot touches the ground line
    const hwq = 25 * p.s * (1 - 0.45 * Math.min(1, Math.abs(p.f))) / Math.sqrt(p.squash ?? 1);
    let low = -1e9;
    for (const side of [1, -1]) {
      const a1 = side > 0 ? p.lL1 : p.lR1, a2 = side > 0 ? p.lL2 : p.lR2, k = side > 0 ? p.legLk : p.legRk;
      const R = { x: Math.cos(p.lean * D2R) * side * hwq * 0.62, y: Math.sin(p.lean * D2R) * side * hwq * 0.62 };
      const K = polar(R, a1, 112 * p.s * k), A = polar(K, a2, 106 * p.s * k);
      low = Math.max(low, A.y + 9 * p.s);
    }
    p.y = p.ground - low;
  }
  const s = p.s, f = clamp(p.f, -1, 1), af = Math.abs(f), t = (p.time ?? 0) / 1000;
  const parts = [];
  const push = (k, d, fill, stroke, z) => parts.push({ k, d, fill, stroke, z });
  const up = p.lean - 90;
  const H = { x: p.x, y: p.y };
  const across = { x: Math.cos(p.lean * D2R), y: Math.sin(p.lean * D2R) };
  const sq = p.squash; // landing compression: shortens torso, widens
  const SC = add(H, mul(polar({ x: 0, y: 0 }, up, 1), 118 * s * sq + p.breath * 2 * s));
  const N = add(H, mul(polar({ x: 0, y: 0 }, up, 1), 138 * s * sq + p.breath * 2 * s));
  const sw = 40 * s * (1 - 0.5 * af) / Math.sqrt(sq), hw = 25 * s * (1 - 0.45 * af) / Math.sqrt(sq);
  const shoulder = (side) => add(SC, mul(across, side * sw));
  const hipR = (side) => add(H, mul(across, side * hw * 0.62));
  // her LEFT is +side (viewer right when facing camera)
  const SLp = shoulder(1), SRp = shoulder(-1);
  const light = p.light, shadeSide = -light;
  // ---------- arms
  const arm = (side) => {
    const S0 = side > 0 ? SLp : SRp;
    const a1 = side > 0 ? p.aL1 : p.aR1, a2 = side > 0 ? p.aL2 : p.aR2, k = side > 0 ? p.armLk : p.armRk, fk = side > 0 ? p.foreL : p.foreR;
    const E = polar(S0, a1, 84 * s * k), W = polar(E, a2, 76 * s * k * fk);
    const Hn = polar(W, a2, 15 * s * k * fk);
    return { S0, E, W, Hn, a2, k: k * fk };
  };
  const drawArm = (side, z, pre) => {
    const A = arm(side);
    const r0 = 12.5 * s, r1 = 10 * s * Math.sqrt(A.k), r2 = 7.6 * s * A.k;
    push(pre + 'up', limb(A.S0, A.E, r0, r1, 0.08), C.coat, inkW(s, 2.8), z);
    push(pre + 'upS', limbShade(A.S0, A.E, r0, r1, shadeSide * side), C.coatShade, null, z + 0.05);
    push(pre + 'fo', limb(A.E, A.W, r1, r2, 0.1), C.coat, inkW(s, 2.6), z + 0.1);
    push(pre + 'foS', limbShade(A.E, A.W, r1, r2, shadeSide * side), C.coatShade, null, z + 0.15);
    // gold cuff
    const cuffA = mix(A.E, A.W, 0.82), cuffB = mix(A.E, A.W, 0.98);
    push(pre + 'cuff', limb(cuffA, cuffB, r2 * 1.25, r2 * 1.3), C.gold, inkW(s, 1.8), z + 0.2);
    // hand (fingerless glove): palm block + finger tips
    const hand = side > 0 ? p.handL : p.handR;
    const dir = norm(sub(A.Hn, A.W)), n = perp(dir);
    const hs = 1.15 * s * Math.max(0.7, A.k);
    const Wp = A.W;
    const Lp = (u, v) => ({ x: Wp.x + dir.x * u * hs + n.x * v * hs * side, y: Wp.y + dir.y * u * hs + n.y * v * hs * side });
    if (hand === 'open') {
      push(pre + 'hand', shape([S(...xyv(Lp(0, -7))), Lp(8, -9), Lp(14, -8), S(...xyv(Lp(26, -8))), Lp(27, -2), S(...xyv(Lp(27, 2))), Lp(26, 6), S(...xyv(Lp(19, 9))), Lp(12, 12), S(...xyv(Lp(9, 15))), Lp(6, 9), S(...xyv(Lp(0, 7)))]), C.skin, inkW(s, 2), z + 0.3);
      push(pre + 'glove', poly([Lp(-1, -7.5), Lp(13, -9), Lp(14, 7), Lp(-1, 7.5)]), C.glove, inkW(s, 2), z + 0.31);
      push(pre + 'fing', polyline([Lp(14, -3), Lp(26, -3)]) + polyline([Lp(14, 2), Lp(25, 2.5)]), null, { color: C.skinDeep, width: 1.1 * s }, z + 0.32);
    } else {
      push(pre + 'hand', shape([S(...xyv(Lp(-1, -8))), Lp(10, -10), S(...xyv(Lp(19, -8))), Lp(21, 0), S(...xyv(Lp(19, 8))), Lp(10, 10), S(...xyv(Lp(-1, 8)))]), C.glove, inkW(s, 2.2), z + 0.3);
      push(pre + 'fing', poly([Lp(13, -8), Lp(20, -7), Lp(21.5, 0), Lp(20, 7), Lp(13, 8)]), C.skin, inkW(s, 1.6), z + 0.31);
      push(pre + 'knuck', polyline([Lp(14, -3), Lp(20.5, -3)]) + polyline([Lp(14, 2.5), Lp(20.5, 2.5)]), null, { color: C.skinDeep, width: 1 * s }, z + 0.32);
    }
    return { A, Lp };
  };
  // ---------- legs
  const leg = (side) => {
    const R = hipR(side), a1 = side > 0 ? p.lL1 : p.lR1, a2 = side > 0 ? p.lL2 : p.lR2, k = side > 0 ? p.legLk : p.legRk;
    const K = polar(R, a1, 112 * s * k), A = polar(K, a2, 106 * s * k);
    const ft = side > 0 ? p.ftL : p.ftR;
    return { R, K, A, ft, k };
  };
  const drawLeg = (side, z, pre) => {
    const L = leg(side);
    const r0 = 16 * s, r1 = 11.5 * s, r2 = 8.5 * s;
    push(pre + 'th', limb(L.R, L.K, r0, r1, 0.1), C.pants, inkW(s, 2.8), z);
    push(pre + 'thS', limbShade(L.R, L.K, r0, r1, shadeSide * side), C.pantsShade, null, z + 0.05);
    push(pre + 'thR', limbShade(L.R, L.K, r0, r1, -shadeSide * side, 0.1), C.pantsRim, null, z + 0.06);
    push(pre + 'sh', limb(L.K, L.A, r1, r2, 0.05), C.pants, inkW(s, 2.6), z + 0.1);
    push(pre + 'shR', limbShade(L.K, L.A, r1, r2, -shadeSide * side, 0.1), C.pantsRim, null, z + 0.12);
    // boot: from mid shin + foot wedge
    const B0 = mix(L.K, L.A, 0.5);
    push(pre + 'boot', limb(B0, L.A, r2 * 1.18, r2 * 1.12), C.boot, inkW(s, 2.4), z + 0.2);
    const toe = polar(L.A, L.ft, 34 * s * L.k), heel = polar(L.A, L.ft + 180, 9 * s);
    const dn = perp(norm(sub(toe, heel)));
    const sole = (side) => 1;
    const fpts = [add(heel, mul(dn, -7 * s)), add(mix(heel, toe, 0.55), mul(dn, -9 * s)), add(toe, mul(dn, -3 * s)), S(...xyv(add(toe, mul(dn, 5 * s)))), S(...xyv(add(heel, mul(dn, 6 * s))))];
    if (dn.y < 0) fpts.forEach((q) => { const d = sub(q, L.A); q.x = L.A.x + d.x; q.y = L.A.y + d.y; });
    push(pre + 'foot', shape(fpts.map((q) => ({ ...q }))), C.boot, inkW(s, 2.4), z + 0.25);
    push(pre + 'sole', polyline([add(heel, mul(dn, 6 * s)), add(toe, mul(dn, 5 * s))]), null, { color: '#4A3A36', width: 2.4 * s }, z + 0.26);
    return L;
  };
  // ---------- ribbon (crimson, from LEFT wrist), driven by wind vector + time
  const ribbon = (z) => {
    const A = arm(1);
    const base = A.W;
    const pts = [base];
    let q = base;
    for (let i = 1; i <= 9; i++) {
      const w = Math.sin(t * 7 + i * 0.75) * 9 * s * p.ribbonAmp * (i / 9);
      const dx = p.ribbonX * 15 * s, dy = (p.ribbonY * 15 + 4) * s;
      const n = perp(norm({ x: dx, y: dy }));
      q = add(add(q, { x: dx, y: dy }), mul(n, w - (i > 1 ? Math.sin(t * 7 + (i - 1) * 0.75) * 9 * s * p.ribbonAmp * ((i - 1) / 9) : 0)));
      pts.push(q);
    }
    push('ribbon', strand(pts, 7 * s, 3 * s), C.ribbon, inkW(s, 1.8), z);
    push('ribbonS', strand(pts.slice(3).map((v, i) => add(v, mul({ x: 0, y: 1 }, 1.4 * s))), 3 * s, 1.5 * s), C.ribbonShade, null, z + 0.01);
  };
  // ---------- head + hair
  const headC = polar(N, up + p.hTilt * 0.3, 34 * s);
  const hrot = p.lean + p.hTilt;
  const hf = clamp(f + p.hTurn, -1, 1);
  const HL = frame(headC.x, headC.y, hrot, s, s);
  // Hair = structured locks (each a curved tapered clump). Back locks sit behind the face, bangs in front.
  const lock = (k, root, mid, tip, w, z, fill = C.hair) => {
    const lagT = { x: p.hairX * 9, y: p.hairY * 9 }, lagM = { x: p.hairX * 4, y: p.hairY * 4 };
    const pts = [HL(root[0], root[1]), add(HL(mid[0], mid[1]), lagM), add(HL(tip[0], tip[1]), lagT)];
    const dir = norm(sub(pts[2], pts[0])), n = perp(dir);
    const ww = w * s / 2;
    const d = shape([S(...xyv(add(pts[0], mul(n, ww)))), add(pts[1], mul(n, ww * 0.75)), S(...xyv(pts[2])), add(pts[1], mul(n, -ww * 0.55)), S(...xyv(add(pts[0], mul(n, -ww))))], 0.8);
    push(k, d, fill, inkW(s, 2.3), z);
  };
  const hair = (z) => {
    // dome behind everything
    push('hairDome', shape([HL(-31 - f * 4, 8), HL(-34 - f * 4, -14), HL(-24, -36), HL(-4, -45), HL(14, -43), HL(30 - f * 4, -30), HL(34 - f * 4, -8), HL(31 - f * 4, 10), HL(0, 4)], 0.9), C.hair, inkW(s, 2.8), z);
    // back/side locks: [root, mid, tip, width]
    const L = [
      [[-28, -14], [-36, 6], [-33, 30], 18], [[28, -14], [36, 6], [34, 28], 18], [[-22, 0], [-27, 22], [-21, 37], 14], [[22, 0], [27, 20], [21, 35], 14],
      [[-14, -40], [-28, -50], [-38, -44], 17], [[14, -40], [28, -51], [39, -45], 17], [[0, -44], [2, -54], [-7, -57], 15],
      [[-28, -26], [-40, -22], [-44, -8], 15], [[28, -26], [40, -20], [43, -6], 15],
    ].map(([r, m, t, w]) => [[r[0] - f * 5, r[1]], [m[0] - f * 7, m[1]], [t[0] - f * 8, t[1]], w]);
    L.forEach(([r, m, t, w], i) => lock('hb' + i, r, m, t, w, z + 0.01 * (i + 1)));
    push('hairBackS', poly([HL(-30, 0), HL(-32, 24), HL(-26, 10), HL(-22, 34), HL(-20, 2)]) + poly([HL(30, 0), HL(32, 22), HL(26, 8), HL(22, 32), HL(20, 2)]), C.hairShade, null, z + 0.2);
  };
  const bangs = (z) => {
    // locks fall from the crown over the forehead; the long one covers her RIGHT eye (viewer-left)
    const B = [
      [[-24, -34], [-29, -12], [-28, 10], 16], [[24, -34], [30, -12], [28, 8], 16],
      [[12, -40], [17, -18], [20, 0], 20], [[0, -42], [3, -20], [6, -4], 18], [[-12, -40], [-11, -16], [-8, 2], 16],
      [[-8, -40], [-22, -10], [-17, 22], 20],
    ];
    B.forEach(([r, m, t, w], i) => lock('bg' + i, r, [m[0] + f * 3, m[1]], [t[0] + f * 4, t[1]], w, z + 0.01 * i));
    push('bangsHL', poly([HL(-22, -30), HL(-8, -37), HL(8, -37), HL(20, -31), HL(16, -28), HL(8, -33), HL(-6, -33), HL(-18, -27)]), '#FFFFFF', null, z + 0.2);
  };
  // ---------- torso with cropped asymmetrical coat
  const torso = (z) => {
    const W0 = add(H, mul(polar({ x: 0, y: 0 }, up, 1), 46 * s * sq));
    const WL = add(W0, mul(across, hw * 0.95)), WR = add(W0, mul(across, -hw * 0.95));
    const HLp = add(H, mul(across, hw * 1.05)), HRp = add(H, mul(across, -hw * 1.05));
    // shirt / under-layer
    push('shirt', shape([S(...xyv(SRp)), S(...xyv(SLp)), WL, S(...xyv(HLp)), S(...xyv(HRp)), WR]), C.shirt, inkW(s, 2.8), z);
    // belt
    const B1 = add(H, mul(polar({ x: 0, y: 0 }, up, 1), 10 * s)), B2 = add(H, mul(polar({ x: 0, y: 0 }, up, 1), 2 * s));
    push('belt', poly([add(B1, mul(across, -hw * 1.06)), add(B1, mul(across, hw * 1.06)), add(B2, mul(across, hw * 1.08)), add(B2, mul(across, -hw * 1.08))]), '#3A2A22', inkW(s, 1.8), z + 0.05);
    push('buckle', poly([add(B1, mul(across, 2 * s)), add(B1, mul(across, 8 * s)), add(B2, mul(across, 8 * s)), add(B2, mul(across, 2 * s))]), C.gold, inkW(s, 1.2), z + 0.06);
    // coat panels (open at the front); left panel (her left, +across) has the LONG tail
    const gap = (4 + p.coatOpen * 10) * s;
    const dn = (lag, len) => polar({ x: 0, y: 0 }, 90 + p.lean * 0.5 + lag, len);
    const col = add(N, mul(across, 0));
    const lagL = p.coat, lagR = p.coat * 0.6;
    const tailL = add(add(WL, mul(across, 6 * s)), dn(lagL * 1.0, 150 * s)), tailLin = add(add(W0, mul(across, gap)), dn(lagL * 1.2, 112 * s));
    const tailR = add(add(WR, mul(across, -5 * s)), dn(lagR, 62 * s)), tailRin = add(add(W0, mul(across, -gap)), dn(lagR * 1.2, 40 * s));
    const panelL = [S(...xyv(add(col, mul(across, 6 * s)))), S(...xyv(add(SLp, { x: 0, y: -4 * s }))), add(SLp, mul(across, 4 * s)), mix(add(SLp, mul(across, 2 * s)), WL, 0.55), S(...xyv(add(WL, mul(across, 6 * s)))), S(...xyv(tailL)), mix(tailL, tailLin, 0.5), S(...xyv(tailLin)), S(...xyv(add(W0, mul(across, gap)))), S(...xyv(add(mix(N, W0, 0.45), mul(across, gap * 1.4 + 8 * s))))];
    const panelR = [S(...xyv(add(col, mul(across, -6 * s)))), S(...xyv(add(SRp, { x: 0, y: -4 * s }))), add(SRp, mul(across, -4 * s)), mix(add(SRp, mul(across, -2 * s)), WR, 0.55), S(...xyv(add(WR, mul(across, -5 * s)))), S(...xyv(tailR)), S(...xyv(tailRin)), S(...xyv(add(W0, mul(across, -gap)))), S(...xyv(add(mix(N, W0, 0.45), mul(across, -gap * 1.4 - 8 * s))))];
    // gold lining glimpses: inner edges of tails
    push('liningL', poly([add(W0, mul(across, gap)), tailLin, mix(tailL, tailLin, 0.45), add(mix(W0, tailL, 0.3), mul(across, -2 * s))]), C.gold, inkW(s, 1.8), z + 0.08);
    push('liningR', poly([add(W0, mul(across, -gap)), tailRin, mix(tailR, tailRin, 0.4)]), C.gold, inkW(s, 1.8), z + 0.08);
    push('coatL', shape(panelL, 0.7), C.coat, inkW(s, 3), z + 0.1);
    push('coatR', shape(panelR, 0.7), C.coat, inkW(s, 3), z + 0.1);
    const shPanel = shadeSide > 0 ? panelL : panelR;
    push('coatS', poly([shPanel[1], shPanel[3], shPanel[4], shPanel[5], mix(shPanel[5], shPanel[6], 0.5), mix(shPanel[3], shPanel[0], 0.4)]), C.coatShade, null, z + 0.12);
    push('coatRim', polyline([add(shoulder(-shadeSide), { x: 0, y: -3 * s }), mix(shoulder(-shadeSide), shadeSide > 0 ? WR : WL, 0.9)]), null, { color: C.coatRim, width: 2.2 * s }, z + 0.13);
    // high collar with gold edge
    const nk = polar(N, up, 16 * s);
    const cl = [add(N, mul(across, -16 * s)), add(nk, mul(across, -13 * s)), add(nk, mul(across, 13 * s)), add(N, mul(across, 16 * s)), add(polar(N, up, -10 * s), mul(across, 0))];
    push('collar', poly(cl), C.coat, inkW(s, 2.6), z + 0.3);
    push('collarG', polyline([cl[1], cl[2]]), null, { color: C.gold, width: 2.4 * s }, z + 0.31);
  };
  // ---------- dagger (prism blade) in RIGHT hand
  const dagger = (z) => {
    if (!p.dagger) return;
    const A = arm(-1);
    const dir = norm(sub(A.Hn, A.W)), n = perp(dir);
    const G = add(A.W, mul(dir, 10 * s));
    const bd = polar({ x: 0, y: 0 }, p.dagAng, 1);
    const bn = perp(bd);
    const tip = add(G, mul(bd, 78 * s)), b0 = add(G, mul(bd, 10 * s));
    push('dagH', limb(add(G, mul(bd, -16 * s)), add(G, mul(bd, 2 * s)), 3.4 * s, 3.4 * s), C.handle, inkW(s, 1.6), z);
    push('dagG', poly([add(b0, mul(bn, -11 * s)), add(b0, mul(bn, 11 * s)), add(G, mul(bn, 7 * s)), add(G, mul(bn, -7 * s))]), C.guard, inkW(s, 1.8), z + 0.01);
    if (p.dagger === 1) {
      push('dagB', poly([add(b0, mul(bn, -6 * s)), add(mix(b0, tip, 0.7), mul(bn, -5 * s)), tip, add(mix(b0, tip, 0.7), mul(bn, 5 * s)), add(b0, mul(bn, 6 * s))]), C.prismMid, inkW(s, 2), z + 0.02);
      push('dagBF', poly([add(b0, mul(bn, -6 * s)), add(mix(b0, tip, 0.7), mul(bn, -5 * s)), tip, b0]), C.prism, null, z + 0.03);
      push('dagBl', polyline([add(b0, mul(bd, 4 * s)), add(mix(b0, tip, 0.9), { x: 0, y: 0 })]), null, { color: '#FFFFFF', width: 1.4 * s }, z + 0.04);
    } else {
      push('dagB', poly([add(b0, mul(bn, -6 * s)), add(add(b0, mul(bd, 14 * s)), mul(bn, -5 * s)), add(add(b0, mul(bd, 22 * s)), mul(bn, 1 * s)), add(add(b0, mul(bd, 12 * s)), mul(bn, 6 * s)), add(b0, mul(bn, 6 * s))]), C.prismMid, inkW(s, 2), z + 0.02);
    }
  };
  // ---------- sun core (held in LEFT hand)
  const core = (z) => {
    if (!p.core) return;
    const A = arm(1);
    const c = add(A.Hn, mul(norm(sub(A.Hn, A.W)), 6 * s));
    const r = 15 * s * p.coreR;
    push('coreGlow', ell(c.x, c.y, r * 2.4, r * 2.4), { gradient: { type: 'radial', x0: c.x, y0: c.y, x1: c.x + r * 2.4, y1: c.y, stops: [{ offset: 0, color: 'rgba(255,220,140,0.9)' }, { offset: 1, color: 'rgba(255,170,40,0)' }] } }, null, z);
    push('core', ell(c.x, c.y, r, r), { gradient: { type: 'radial', x0: c.x - r * 0.3, y0: c.y - r * 0.3, x1: c.x + r, y1: c.y, stops: [{ offset: 0, color: '#FFFFFF' }, { offset: 0.35, color: C.sunCore }, { offset: 1, color: C.sun }] } }, { color: C.sunDeep, width: 2 * s }, z + 0.01);
  };

  // ---------- assemble in depth order
  const backA = p.backArm === 'L' ? 1 : -1, backL = p.backLeg === 'L' ? 1 : -1;
  hair(2);
  if (p.ribbonX > 0 === false || backA === 1) ribbon(3);
  drawArm(backA, 4, 'armB');
  if (backA === 1) core(3.9); else dagger(3.9);
  drawLeg(backL, 6, 'legB');
  torso(10);
  drawLeg(-backL, 8, 'legF');
  // neck
  push('neck', limb(N, polar(N, up, 22 * s), 7.5 * s, 7 * s), C.skin, inkW(s, 2.2), 9.5);
  push('neckS', limbShade(N, polar(N, up, 22 * s), 7.5 * s, 7 * s, 1, 0.6), C.skinShade, null, 9.6);
  parts.push(...face({ x: headC.x, y: headC.y, rot: hrot, s, f: hf, eye: p.eye, pupil: p.pupil, lookX: p.lookX, lookY: p.lookY, brow: p.brow, mouth: p.mouth, smile: p.smile, light: p.light, scratch: p.scratch, tear: p.tear, sweat: p.sweat, blush: p.blush, glint: p.glint, browZ: 7.5 }, 20, 'f'));
  bangs(26);
  drawArm(-backA, 30, 'armF');
  if (backA === 1) dagger(31); else core(31);
  if (backA !== 1) ribbon(32);
  return parts;
}
const xyv = (q) => [q.x, q.y];
