// BENCHMARK (8 s): sprint to camera -> notice -> plant -> twist -> slide under shadow blade -> leap -> land
// -> extreme foreshortened fighting pose; hair/coat keep moving and settle (spring secondary + authored overshoot).
// Character drawings on 12/24 dps (ON2/ON1); camera + FX on 60.
import { bake, resetUid } from '../lib/anim.mjs';
import { drawRin } from '../lib/rin.mjs';
import { cathedral } from '../lib/env.mjs';
import { layer } from '../lib/proj.mjs';
import { shot } from '../lib/shot.mjs';
import { speedLines, impactFrame, debris, smoke, glow, grade, focusLines, slashArc } from '../lib/fx.mjs';
import { shape, S, polar, D2R } from '../lib/geom.mjs';
import { C } from '../lib/pal.mjs';

const RUNF = [ // front-view run toward camera: knees come at us (foreshortened thigh), arms pump
  { lL1: 92, lL2: 96, legLk: 0.62, lR1: 84, lR2: 92, legRk: 1, ftL: 75, ftR: 30, aL1: 110, aL2: 60, foreL: 0.55, aR1: 70, aR2: 110, foreR: 1, squash: 1, lean: -4 },
  { lL1: 90, lL2: 92, legLk: 0.85, lR1: 88, lR2: 86, legRk: 0.75, ftL: 60, ftR: 100, aL1: 100, aL2: 80, foreL: 0.8, aR1: 80, aR2: 100, foreR: 0.8, squash: 0.94, lean: 0 },
  { lL1: 96, lL2: 92, legLk: 1, lR1: 88, lR2: 84, legRk: 0.62, ftL: 150, ftR: 105, aL1: 110, aL2: 70, foreL: 1, aR1: 70, aR2: 120, foreR: 0.55, squash: 1, lean: 4 },
  { lL1: 92, lL2: 94, legLk: 0.75, lR1: 90, lR2: 88, legRk: 0.85, ftL: 80, ftR: 120, aL1: 100, aL2: 80, foreL: 0.8, aR1: 80, aR2: 100, foreR: 0.8, squash: 0.94, lean: 0 },
];
function drawBlade(p) {
  if (!p.on) return [];
  const c = { x: p.x, y: p.y }, a = p.ang, L = 620 * p.s;
  const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(polar(c, a + (u - 0.5) * 34, L * (0.55 + 0.45 * Math.sin(u * Math.PI)))); }
  const inner = []; for (let i = 10; i >= 0; i--) { const u = i / 10; inner.push(polar(c, a + (u - 0.5) * 30, L * (0.5 + 0.2 * Math.sin(u * Math.PI)))); }
  const arm = [polar(c, a + 180, 900), polar(c, a + 175, 40), polar(c, a + 185, 40)];
  return [
    { k: 'tend', d: shape([S(arm[0].x, arm[0].y - 50), arm[1], c, arm[2], S(arm[0].x, arm[0].y + 50)], 0.8), fill: C.void, stroke: { color: '#000', width: 4, taper: 0.4, weight: 0.6 }, z: 0 },
    { k: 'blade', d: shape([...pts, ...inner].map((q, i) => (i === 0 || i === 10 || i === 11 || i === 21 ? S(q.x, q.y) : q)), 0.8), fill: '#1C0712', stroke: { color: C.crimsonGlow, width: 9, taper: 0.7, weight: 0.5 }, z: 1 },
    { k: 'bglow', d: shape(pts, 0.8), fill: null, stroke: { color: 'rgba(255,46,77,0.35)', width: 30, lineCap: 'round' }, z: 0.5 },
  ];
}
export function sBench() {
  resetUid();
  const D = 8000, set = cathedral({});
  const k = [];
  // 0–2200 sprint toward camera (ON2 = 12 dps, hold 5 frames), growing in perspective
  let i = 0;
  for (let t = 0; t <= 2100; t += 167, i++) {
    const u = t / 2200;
    k.push({ t, pose: { ...RUNF[i % 4], x: 960 + Math.sin(u * 3) * 40, ground: 780 + u * 300, s: 0.85 + u * 0.95, f: 0, hTurn: 0, expr: 'determination', coat: 0, hairY: -0.3, ribbonX: -0.4, ribbonY: -0.6, dagger: 1, dagAng: 120, handL: 'fist', handR: 'grip', secLock: 0 }, on: 2, ease: 'lin' });
  }
  const g = 1075, s = 1.8;
  k.push(
    // notice: head snaps to the right (anticipation in the eyes first)
    { t: 2250, pose: { ...RUNF[1], x: 990, ground: g, s, hTurn: 0.45, eye: 1.25, pupil: 0.5, brow: 1, mouth: 0.4, smile: -0.3, lookX: 1, expr: undefined }, on: 1, ease: 'snap' },
    // plant: compress, foot wide
    { t: 2550, pose: { lL1: 70, lL2: 110, legLk: 1, lR1: 115, lR2: 82, legRk: 1, ftL: 0, ftR: 180, squash: 0.84, lean: -8, f: 0.25, aL1: 150, aL2: 120, foreL: 1, aR1: 40, aR2: 10, foreR: 1, hTurn: 0.3, eye: 1.05 }, on: 1, ease: 'snap' },
    // twist sideways (body turns to side view toward the blade)
    { t: 2800, pose: { f: 1, spin: 0, lean: 18, lL1: 40, lL2: 100, lR1: 140, lR2: 120, ftL: 0, ftR: 30, squash: 0.9, aL1: 190, aL2: 200, aR1: -10, aR2: 30, dagAng: -10, hTurn: 0, brow: -1, eye: 0.8, pupil: 1, mouth: 0.2 }, on: 1, ease: 'snap' },
    // slide: body low and leaning back, lead leg extended, blade passes overhead
    { t: 3050, pose: { x: 1020, ground: g, lean: -52, lL1: 2, lL2: 2, ftL: -80, lR1: 85, lR2: 175, ftR: 175, aL1: 130, aL2: 110, handL: 'splayed', aR1: -60, aR2: -40, dagAng: -60, squash: 1, coat: 70, hairX: 1.2, hairY: -0.4, eye: 0.9, mouth: 0.3 }, on: 1, ease: 'out3' },
    { t: 3800, pose: { x: 1240, lean: -46, coat: 60, hairX: 1 }, on: 2, ease: 'out' },
    // recover / anticipation crouch
    { t: 4150, pose: { x: 1260, lean: 24, f: 0.6, lL1: 25, lL2: 125, lR1: 140, lR2: 75, ftL: 5, ftR: 10, squash: 0.8, aL1: 160, aL2: 120, handL: 'open', aR1: 50, aR2: -10, dagAng: -20, coat: -10, hairX: 0, hairY: 0.5, brow: -1, eye: 0.7 }, on: 2, ease: 'snap' },
    // leap (1-frame stretch) + smear on the legs
    { t: 4350, pose: { y: 760, ground: undefined, x: 1220, lean: 38, s: 1.8, lL1: 40, lL2: 100, lR1: 160, lR2: 180, ftL: 10, ftR: 190, squash: 1.12, aL1: 170, aL2: 180, aR1: -20, aR2: -40, dagAng: -30, coat: -70, hairX: -1.2, hairY: 0.5, smearLegR: { a1: 140, a2: 75 }, smearLegL: { a1: 25, a2: 125 } }, on: 1, ease: 'snap' },
    { t: 4440, pose: { smearLegR: undefined, smearLegL: undefined, y: 560, x: 1140 }, on: 1, ease: 'out' },
    { t: 4900, pose: { y: 520, x: 1040, lean: 10, f: 0.3, lL1: 60, lL2: 120, lR1: 120, lR2: 150, squash: 1, coat: 30, hairY: 1.2, hairX: 0.3, s: 1.9 }, on: 2, ease: 'inOut' },
    // land: hard contact (1 frame), then recoil
    { t: 5250, pose: { y: undefined, ground: 1075, x: 980, s: 2.0, f: 0.15, lean: 20, lL1: 30, lL2: 130, lR1: 150, lR2: 60, ftL: 0, ftR: 180, squash: 0.72, aL1: 170, aL2: 140, aR1: 30, aR2: 60, dagAng: 60, coat: 40, hairY: -1, eye: 0.6 }, on: 1, ease: 'in3' },
    // rise into the extreme foreshortened fighting pose: dagger arm thrust at camera (forearm/hand foreshortened, big)
    { t: 5650, pose: { ground: 1330, s: 2.7, x: 930, f: 0.12, lean: 6, lL1: 42, lL2: 118, lR1: 138, lR2: 62, ftL: -10, ftR: 190, squash: 0.92, aR1: 165, aR2: 140, armRk: 0.5, foreR: 0.32, dagAng: -125, dagK: 0.7, handViewR: 'back', handR: 'grip', aL1: -15, aL2: -95, handL: 'open', backArm: 'L', coat: -30, hairX: -0.4, hairY: 0.3, expr: 'determination', eye: 0.72, brow: -1, mouth: 0.18, teeth: 1 }, on: 2, ease: 'snap' },
    // settle: authored overshoot on coat/hair, springs finish the rest
    { t: 6100, pose: { coat: 18, hairX: 0.25, hairY: -0.2, breath: 1 }, on: 2, ease: 'inOut' },
    { t: 6600, pose: { coat: -7, hairX: -0.1, hairY: 0.05, breath: -0.5 }, on: 2, ease: 'inOut' },
    { t: 7200, pose: { coat: 2, hairX: 0.03, hairY: 0, breath: 0.6 }, on: 3, ease: 'inOut' },
    { t: 7999, pose: { coat: 0, breath: 0 }, on: 3, ease: 'inOut' },
  );
  const rin = bake(drawRin, k, D, { prefix: 'rin' });
  const blade = bake(drawBlade, [
    { t: 0, pose: { on: 0, x: 2600, y: 520, ang: 200, s: 1.7 }, on: 1 },
    { t: 2200, pose: { on: 1, x: 2600, y: 520, ang: 196, s: 1.7 }, on: 1 },
    { t: 2900, pose: { x: 2350, y: 470, ang: 186 }, on: 1, ease: 'in' },
    { t: 3500, pose: { x: 1500, y: 420, ang: 176 }, on: 1, ease: 'in3' },
    { t: 3800, pose: { x: 700, y: 470, ang: 168 }, on: 1, ease: 'out' },
    { t: 4100, pose: { on: 0 }, on: 1, ease: 'hold' },
  ], D, { prefix: 'bl' });
  const cam = [
    { t: 0, camera: { x: 0, y: -60, zoom: 1.15 } },
    { t: 2200, camera: { x: 20, y: 40, zoom: 1.0 }, easing: 'easeInOut' },
    { t: 2550, camera: { x: 40, y: 50, zoom: 1.04 }, easing: 'easeOutCubic' },
    { t: 3800, camera: { x: 160, y: 40, zoom: 0.95 }, easing: 'easeInOut' },
    { t: 4900, camera: { x: 120, y: -60, zoom: 0.9 }, easing: 'easeInOut' },
    { t: 5250, camera: { x: 20, y: 30, zoom: 1.0 }, easing: 'easeInCubic' },
    { t: 5300, camera: { x: 10, y: 48, zoom: 1.03 } }, // recoil
    { t: 5450, camera: { x: 20, y: 30, zoom: 1.0 }, easing: 'easeOutCubic' },
    { t: 6300, camera: { x: 0, y: 40, zoom: 1.12 }, easing: 'easeOutCubic' }, // push in on the foreshortened pose
    { t: 8000, camera: { x: 0, y: 46, zoom: 1.16 }, easing: 'easeInOut' },
  ];
  return shot('bench', D, [set.far, set.shafts, set.cols, set.floor,
    layer('blade', blade),
    layer('slide dust', [...smoke(3050, 900, { c: { x: 1100, y: 1075 }, n: 8, r0: 20, r1: 110, spread: 260, rise: 40, color: '#3A3A4C', shade: '#22222E' })]),
    layer('rin', rin),
    layer('slash', slashArc(3300, 3700, { c: { x: 1300, y: 470 }, r: 520, a0: 30, a1: 170, width: 50, squashY: 0.25, color: '#120A18', edge: C.crimson }), {}),
    layer('speed', speedLines(4300, 4800, { angle: -60, count: 30, color: 'rgba(255,255,255,0.55)' }), { parallax: 0 }),
    layer('land', [...debris(5250, 700, { c: { x: 980, y: 1075 }, n: 14, speed: 800, spread: [200, 340], size: [8, 26] }), ...smoke(5250, 1200, { c: { x: 980, y: 1075 }, n: 10, r0: 40, r1: 200, spread: 400, rise: 50, color: '#3A3A4C', shade: '#22222E' })]),
    ...impactFrame(5250, { frames: 2, cx: 960, cy: 780, seed: 4 }),
    layer('focus', focusLines(5650, 8000, { cx: 960, cy: 600, inner: 520, count: 40, color: 'rgba(255,255,255,0.35)' }), { parallax: 0 }),
    set.fg], { camera: cam, post: [grade('#1B2A66', 'multiply', [[0, 0.3]], 'grade night')] });
}
