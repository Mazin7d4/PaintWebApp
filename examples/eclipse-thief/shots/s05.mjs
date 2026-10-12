// SCENE 05 — FIRST IMPACT (0:43–0:57)
import { bake, still, resetUid } from '../lib/anim.mjs';
import { drawRin } from '../lib/rin.mjs';
import { drawWarden } from '../lib/warden.mjs';
import { drawGripCU } from '../lib/hands.mjs';
import { drawCoatSweep, drawArch } from '../lib/props.mjs';
import { POSE, keys, mirror } from '../lib/poses.mjs';
import { cathedral } from '../lib/env.mjs';
import { layer, rect, txt, W, H } from '../lib/proj.mjs';
import { shot } from '../lib/shot.mjs';
import { focusLines, speedLines, impactFrame, flash, slashArc, debris, glow, grade, ash, smoke, cracks } from '../lib/fx.mjs';
import { C } from '../lib/pal.mjs';

const NIGHT = (k = 0.34) => grade('#1B2A66', 'multiply', [[0, k]], 'grade night');
const WSTAND = { s: 0.7, aL1: 100, aL2: 96, aR1: 80, aR2: 84, lL1: 96, lL2: 92, lR1: 84, lR2: 88, eye: 1, halo: 0 };
const camShake = (t0, t1, amp, base, seed = 1) => { const o = []; let a = seed; for (let t = t0; t < t1; t += 33) { a = (a * 9301 + 49297) % 233280; const r = a / 233280; const k = 1 - (t - t0) / (t1 - t0); o.push({ t, camera: { ...base, x: base.x + (r - 0.5) * amp * 2 * k, y: base.y + ((r * 7) % 1 - 0.5) * amp * 2 * k } }); } o.push({ t: t1, camera: base }); return o; };
const CORE = (x, y, r = 320) => layer('core light', [glow(x, y, r, 'rgba(255,180,70,0.4)')], { blend: 'screen' });

// 05a — its foot comes down; the floor cracks.
export function s05a() {
  resetUid();
  const D = 1000, set = cathedral({});
  const wp = { ...WSTAND, x: 980, y: 1030, s: 2.3, lL1: 60, lL2: 80, lR1: 110, lR2: 100 };
  const warden = bake(drawWarden, [
    { t: 0, pose: { ...wp, y: 700 }, on: 2 }, { t: 280, pose: { ...wp, y: 640 }, on: 2, ease: 'out' },
    { t: 400, pose: { ...wp, y: 1030 }, on: 1, ease: 'in3' }, { t: D, pose: { ...wp, y: 1030 }, on: 2 },
  ], D);
  return shot('05a stomp', D, [set.far, set.cols, set.floor, layer('cracks', cracks(400, { c: { x: 1060, y: 1035 }, n: 11, len: 900, squashY: 0.22, glow: 'rgba(255,40,70,0.6)' })), layer('warden', warden),
    layer('dust', [...smoke(400, 600, { c: { x: 1060, y: 1030 }, n: 9, r0: 30, r1: 170, spread: 380, rise: 60, color: '#3A3A4C', shade: '#22222E' }), ...debris(400, 600, { c: { x: 1060, y: 1030 }, n: 16, speed: 900, spread: [190, 350], size: [10, 34] })])],
    { camera: [{ t: 0, camera: { x: 80, y: 420, zoom: 1.4 } }, ...camShake(400, 700, 22, { x: 80, y: 420, zoom: 1.4 }), { t: D, camera: { x: 80, y: 420, zoom: 1.42 } }], post: [NIGHT()] });
}
// 05b — ECU: her eyes widen.
export function s05b() {
  resetUid();
  const D = 650;
  const base = { ...POSE.hold, x: 930, y: 2600, s: 12, f: 0.1, dagger: 0, core: 0, light: -1, eye: 0.85, brow: 0.2, smile: 0, glint: 0, lookY: 0 };
  const rin = bake(drawRin, keys([[0, base, {}, 1], [120, base, { eye: 1.3, pupil: 0.45, brow: 1, mouth: 0.15, hairY: -0.3 }, 1, 'out5'], [D, base, { eye: 1.3, pupil: 0.42, brow: 1, mouth: 0.2, hairY: 0 }, 2]]), D);
  return shot('05b eyes', D, [layer('bg', [rect(-100, -100, W + 200, H + 200, '#12122A')], { parallax: 0 }), layer('rin', rin), layer('fl', focusLines(100, D, { inner: 520, count: 50, color: 'rgba(255,255,255,0.8)' }), { parallax: 0 })],
    { camera: [{ t: 0, camera: { x: 0, y: 0, zoom: 1 } }, { t: 120, camera: { x: 0, y: 0, zoom: 1.08 }, easing: 'easeOutCubic' }], post: [NIGHT(0.2)] });
}
// 05c — the shadow arm lashes; she twists aside.
export function s05c() {
  resetUid();
  const D = 1300, set = cathedral({});
  const wp = { ...WSTAND, x: 520, y: 1010, s: 0.78 };
  const warden = bake(drawWarden, [
    { t: 0, pose: { ...wp, aR1: 200, aR2: 230, clawR: 0.8 }, on: 2 }, { t: 300, pose: { aR1: 215, aR2: 250, lean: -8 }, on: 2, ease: 'out' },
    { t: 420, pose: { aR1: 5, aR2: 10, armRk: 1.55, lean: 12, clawR: 1 }, on: 1, ease: 'out5' }, { t: 800, pose: { aR1: 15, aR2: 25, armRk: 1.5 }, on: 2, ease: 'inOut' }, { t: D, pose: { aR1: 60, aR2: 80, armRk: 1.1, lean: 4 }, on: 2, ease: 'inOut' },
  ], D);
  const rin = bake(drawRin, keys([
    [0, mirror(POSE.guard), { x: 1420, ground: 1000, s: 0.9, f: -0.5, core: 1, handL: 'open' }, 2],
    [330, mirror(POSE.guard), { x: 1420, ground: 1000, s: 0.9, f: -0.5, core: 1, eye: 1.2, pupil: 0.6 }, 2, 'hold'],
    [430, POSE.dodge, { x: 1480, y: 700, s: 0.9, core: 1 }, 1, 'out5'],
    [700, POSE.dodge, { x: 1530, y: 690, s: 0.9, core: 1, coat: 30, hairX: 0.8 }, 2, 'inOut'],
    [D, mirror(POSE.crouch), { x: 1560, ground: 1000, s: 0.9, core: 1, squash: 0.86 }, 1, 'in'],
  ]), D);
  const lash = slashArc(390, 520, { c: { x: 900, y: 600 }, r: 560, a0: -140, a1: -10, width: 120, color: '#05040A', edge: C.crimson, squashY: 0.55, rot: 18 });
  return shot('05c lash', D, [set.far, set.shafts, set.cols, set.floor, CORE(1440, 820), layer('warden', warden), layer('lash', lash), layer('rin', rin), layer('speed', speedLines(400, 600, { angle: 12, count: 40, color: 'rgba(255,255,255,0.7)' }), { parallax: 0 }), set.fg],
    { camera: [{ t: 0, camera: { x: 40, y: -30, zoom: 1.0 } }, { t: 400, camera: { x: 60, y: -30, zoom: 1.02 } }, { t: 520, camera: { x: 160, y: -30, zoom: 1.08 }, easing: 'easeOutCubic' }, { t: D, camera: { x: 180, y: -30, zoom: 1.1 }, easing: 'easeOut' }], post: [NIGHT()] });
}
// 05d — columns explode into angular debris; her coat whips across the lens.
export function s05d() {
  resetUid();
  const D = 1300, set = cathedral({});
  const col = still([{ d: 'M860,-500h220v1260h-220Z', fill: C.stoneDark, stroke: { color: C.ink, width: 5 } }, { d: 'M880,-500h40v1260h-40Z', fill: C.stone }], { show: [[0, 160]] });
  const stub = still([{ d: 'M860,520 L900,470 L950,510 L1010,460 L1080,500 L1080,760 L860,760 Z', fill: C.stoneDark, stroke: { color: C.ink, width: 5 } }, { d: 'M860,-500 L1080,-500 L1080,-60 L1020,-10 L960,-70 L900,-20 L860,-60 Z', fill: C.stoneDark, stroke: { color: C.ink, width: 5 } }], { show: [[160, D]] });
  const coat = bake(drawCoatSweep, [{ t: 0, pose: { u: 0 }, on: 1 }, { t: 620, pose: { u: 0 }, on: 1, ease: 'hold' }, { t: 1000, pose: { u: 1 }, on: 1, ease: 'lin' }], D);
  return shot('05d columns', D, [set.far, set.shafts, set.floor, layer('column', [...col, ...stub], { parallax: 0.9 }),
    layer('blast', [...debris(160, 1100, { c: { x: 970, y: 220 }, n: 26, speed: 1300, spread: [150, 390], size: [24, 80], gravity: 1500 }), ...smoke(160, 1000, { c: { x: 970, y: 240 }, n: 10, r0: 60, r1: 260, spread: 260, rise: 40, color: '#4A4A5E', shade: '#2A2A38' })], { parallax: 0.9 }),
    layer('impact', impactFrame(160, { frames: 2, cx: 970, cy: 240, seed: 3 }).flatMap((l) => l.objects), { parallax: 0 }),
    layer('coat fg', coat, { parallax: 0, filter: 'blur(3px)' })],
    { camera: [{ t: 0, camera: { x: 0, y: -60, zoom: 1.0 } }, ...camShake(170, 520, 16, { x: 0, y: -60, zoom: 1.0 }, 4), { t: D, camera: { x: 20, y: -70, zoom: 1.04 }, easing: 'easeOut' }], post: [NIGHT()] });
}
// 05e — over the shoulder: it is suddenly behind her.
export function s05e() {
  resetUid();
  const D = 1150, set = cathedral({});
  const warden = bake(drawWarden, [{ t: 0, pose: { ...WSTAND, x: 700, y: 1500, s: 1.25, eye: 1, aL1: 120, aR1: 60, aL2: 110, aR2: 70, clawL: 0.8, clawR: 0.8, halo: 0 }, on: 2 }, { t: D, pose: { halo: 20, aL1: 130, aR1: 50 }, on: 2 }], D);
  const rinBase = { ...mirror(POSE.guard), x: 1450, y: 1010, s: 3.0, f: 0.55, core: 1, dagger: 1, eye: 0.85, lookX: 0.6, brow: -0.5 };
  const rin = bake(drawRin, keys([[0, rinBase, {}, 2], [500, rinBase, {}, 2, 'hold'], [640, rinBase, { f: -0.1, lookX: -1, eye: 1.25, pupil: 0.5, brow: 1, mouth: 0.4, hairX: 0.5, sweat: 1 }, 1, 'out5'], [D, rinBase, { f: -0.15, lookX: -1, eye: 1.25, pupil: 0.45, brow: 1, mouth: 0.5, sweat: 1 }, 2]]), D);
  const appear = layer('warden', warden, { opacity: 1 });
  appear.objects.forEach((o) => { o.keyframes = [{ t: 0, transform: { opacity: 0 } }, { t: 80, transform: { opacity: 0 } }, { t: 250, transform: { opacity: 1 }, easing: 'step' }]; });
  return shot('05e behind', D, [set.far, set.cols, set.floor, layer('smoke', smoke(0, 700, { c: { x: 700, y: 700 }, n: 12, r0: 80, r1: 300, spread: 300, rise: 160 })), appear, layer('rin', rin, { filter: 'brightness(0.95)' })],
    { camera: [{ t: 0, camera: { x: 0, y: 40, zoom: 1.0 } }, { t: 600, camera: { x: 0, y: 40, zoom: 1.0 } }, { t: 760, camera: { x: -60, y: 20, zoom: 1.1 }, easing: 'easeOutCubic' }, { t: D, camera: { x: -70, y: 20, zoom: 1.12 } }], post: [NIGHT(0.4), grade('#E0142E', 'soft-light', [[0, 0], [600, 0], [700, 0.3]])] });
}
// 05f — she spins and cuts through its torso. One white frame.
export function s05f() {
  resetUid();
  const D = 1300, set = cathedral({});
  const warden = bake(drawWarden, [{ t: 0, pose: { ...WSTAND, x: 900, y: 1040, s: 0.85, aL1: 130, aR1: 50, clawL: 0.9, clawR: 0.9 }, on: 2 }, { t: 560, pose: { split: 0 }, on: 1, ease: 'hold' }, { t: D, pose: { split: 0.45, lean: -6 }, on: 1, ease: 'out3' }], D);
  const rin = bake(drawRin, keys([
    [0, mirror(POSE.antic), { x: 1300, ground: 1010, s: 0.95, core: 1 }, 2],
    [200, mirror(POSE.antic), { x: 1290, ground: 1010, s: 0.95, core: 1, squash: 0.8 }, 2, 'hold'],
    [330, POSE.follow, { x: 1150, ground: 1010, s: 0.95, core: 1, spin: -30, f: -0.6 }, 1, 'out5'],
    [450, mirror(POSE.slash), { x: 950, ground: 1010, s: 0.95, core: 1 }, 1, 'out5'],
    [560, mirror(POSE.follow), { x: 700, ground: 1010, s: 0.95, core: 1 }, 1, 'out'],
    [D, mirror(POSE.follow), { x: 640, ground: 1010, s: 0.95, core: 1, coat: -20, hairX: -0.4 }, 2, 'out'],
  ]), D);
  return shot('05f cut', D, [set.far, set.shafts, set.cols, set.floor, CORE(900, 900), layer('warden', warden), layer('rin', rin),
    layer('slash', slashArc(400, 560, { c: { x: 900, y: 640 }, r: 380, a0: -20, a1: 200, width: 90, squashY: 0.35, rot: -8, color: '#FFFFFF', edge: C.prism }), { blend: 'screen' }),
    ...impactFrame(470, { frames: 1, cx: 900, cy: 640, seed: 8 }), flash(470, { dur: 260 })],
    { camera: [{ t: 0, camera: { x: 120, y: 0, zoom: 1.12 } }, { t: 330, camera: { x: 80, y: 0, zoom: 1.15 }, easing: 'easeIn' }, { t: 560, camera: { x: -40, y: 0, zoom: 1.2 }, easing: 'easeOutCubic' }, { t: D, camera: { x: -60, y: 0, zoom: 1.18 }, easing: 'easeOut' }], post: [NIGHT()] });
}
// 05g — it splits into smoke… and reforms.
export function s05g() {
  resetUid();
  const D = 1700, set = cathedral({});
  const warden = bake(drawWarden, [
    { t: 0, pose: { ...WSTAND, x: 960, y: 1020, s: 0.8, split: 0.45, eye: 1 }, on: 2 },
    { t: 500, pose: { split: 0.9, eye: 0.2, lean: -10 }, on: 2, ease: 'out' },
    { t: 900, pose: { split: 0.9, eye: 0.2, lean: -10 }, on: 3, ease: 'hold' },
    { t: 1300, pose: { split: 0, eye: 1, lean: 0, aL1: 120, aR1: 60 }, on: 1, ease: 'in3' },
    { t: D, pose: { split: 0, eye: 1, aL1: 130, aR1: 50, clawL: 1, clawR: 1, halo: 30 }, on: 2, ease: 'out' },
  ], D);
  const rin = bake(drawRin, keys([[0, mirror(POSE.follow), { x: 420, ground: 1010, s: 0.9, core: 1 }, 2], [400, mirror(POSE.guard), { x: 420, ground: 1010, s: 0.9, core: 1, f: 0.5, lookX: 1, eye: 0.9 }, 2, 'inOut'], [1350, mirror(POSE.guard), { x: 420, ground: 1010, s: 0.9, core: 1, f: 0.5, lookX: 1, eye: 1.25, pupil: 0.5, brow: 1, mouth: 0.4 }, 1, 'out5'], [D, mirror(POSE.guard), { x: 410, ground: 1010, s: 0.9, core: 1, f: 0.5, lookX: 1, eye: 1.2, pupil: 0.5, brow: 1, mouth: 0.4 }, 2]]), D);
  const rinR = rin.map((o) => ({ ...o }));
  return shot('05g reform', D, [set.far, set.shafts, set.cols, set.floor, layer('warden', warden), layer('smoke', [...smoke(0, 1100, { c: { x: 960, y: 560 }, n: 14, r0: 50, r1: 220, spread: 260, rise: 80 }), ...smoke(1050, 600, { c: { x: 960, y: 560 }, n: 10, r0: 200, r1: 40, spread: 200, rise: -40, color: '#09080F', shade: '#000' })]), layer('rin', [...rinR.map((o) => ({ ...o, drawings: o.drawings.map((d) => ({ ...d })) }))].map((o) => o)), set.fg],
    { camera: [{ t: 0, camera: { x: -60, y: -40, zoom: 1.0 } }, { t: D, camera: { x: -20, y: -60, zoom: 1.08 }, easing: 'easeInOut' }], post: [NIGHT(), grade('#E0142E', 'soft-light', [[0, 0], [1250, 0], [1350, 0.3]])] });
}
// 05h — it retaliates; she blocks.
export function s05h() {
  resetUid();
  const D = 1000, set = cathedral({});
  const warden = bake(drawWarden, [
    { t: 0, pose: { ...WSTAND, x: 1250, y: 1040, s: 0.9, aL1: -100, aL2: -80, clawL: 1, lean: -6 }, on: 2 },
    { t: 250, pose: { aL1: -110, aL2: -95, lean: -10 }, on: 2, ease: 'out' },
    { t: 360, pose: { aL1: 175, aL2: 160, lean: 14, armLk: 1.15 }, on: 1, ease: 'out5' },
    { t: D, pose: { aL1: 172, aL2: 158, lean: 12, armLk: 1.15 }, on: 2 },
  ], D);
  const rin = bake(drawRin, keys([[0, POSE.guard, { x: 640, ground: 1010, s: 0.92, core: 1 }, 2], [260, POSE.block, { x: 640, ground: 1010, s: 0.92, core: 1 }, 1, 'out5'], [380, POSE.block, { x: 610, ground: 1010, s: 0.92, core: 1, squash: 0.84, eye: 0.5, brow: -1, mouth: 0.7 }, 1, 'out'], [D, POSE.block, { x: 600, ground: 1010, s: 0.92, core: 1, squash: 0.88, eye: 0.6, brow: -1, mouth: 0.5 }, 2]]), D);
  return shot('05h block', D, [set.far, set.cols, set.floor, CORE(560, 860), layer('warden', warden), layer('rin', rin), layer('spark', [...debris(370, 500, { c: { x: 690, y: 640 }, n: 14, speed: 1200, spread: [120, 300], size: [4, 10], gravity: 300, color: '#FFFFFF', shade: '#BFE6FF' })], { blend: 'screen' }), ...impactFrame(370, { frames: 2, cx: 690, cy: 640, seed: 11 })],
    { camera: [{ t: 0, camera: { x: -20, y: -20, zoom: 1.1 } }, ...camShake(370, 650, 14, { x: -20, y: -20, zoom: 1.16 }, 9), { t: D, camera: { x: -30, y: -20, zoom: 1.16 } }], post: [NIGHT()] });
}
// 05i — CRACK. The dagger shatters into three shards.
export function s05i() {
  resetUid();
  const D = 1200;
  const hand = bake(drawGripCU, [
    { t: 0, pose: { x: 820, y: 620, s: 1.1, rot: -36, grip: 1, tremble: 1, crack: 0 }, on: 1 },
    { t: 200, pose: { crack: 1 }, on: 1, ease: 'hold' },
    { t: 330, pose: { crack: 1, shatter: 0.02 }, on: 1, ease: 'hold' },
    { t: D, pose: { shatter: 1.6, tremble: 0.4 }, on: 1, ease: 'out3' },
  ], D);
  const sfx = [txt('CRACK', 1420, 300, 210, '#FFFFFF', { font: 'Bangers, sans-serif', stroke: { color: '#0B0A12', width: 14 }, keyframes: [{ t: 0, transform: { opacity: 0 } }, { t: 329, transform: { opacity: 0 } }, { t: 330, transform: { opacity: 1, scaleX: 1.4, scaleY: 1.4, rotation: -8 }, easing: 'step' }, { t: 520, transform: { opacity: 1, scaleX: 1, scaleY: 1, rotation: -8 }, easing: 'easeOutBack' }, { t: D, transform: { opacity: 1, scaleX: 1.04, scaleY: 1.04, rotation: -8 } }], pivot: { x: 1420, y: 300 } })];
  return shot('05i crack', D, [layer('bg', [rect(-100, -100, W + 200, H + 200, '#0E0D1E')], { parallax: 0 }), layer('fl', focusLines(330, D, { cx: 1100, cy: 450, inner: 300, count: 60, color: 'rgba(200,220,255,0.6)' }), { parallax: 0 }), layer('hand', hand), ...impactFrame(330, { frames: 2, cx: 1150, cy: 430, seed: 21 }), layer('sfx', sfx, { parallax: 0 })],
    { camera: [{ t: 0, camera: { x: 0, y: 0, zoom: 1.05 } }, ...camShake(330, 600, 18, { x: 0, y: 0, zoom: 1.05 }, 13)], post: [NIGHT(0.2)] });
}
// 05j — she's thrown through a stone arch and tumbles, still gripping the Core.
export function s05j() {
  resetUid();
  const D = 2100, set = cathedral({});
  const rin = bake(drawRin, keys([
    [0, POSE.thrown, { x: 500, y: 600, s: 0.8, core: 1, dagger: 2 }, 1],
    [250, POSE.thrown, { x: 980, y: 520, s: 0.8, core: 1, dagger: 2, spin: -40 }, 1, 'out'],
    [450, POSE.thrown, { x: 1350, y: 560, s: 0.8, core: 1, dagger: 2, spin: -150 }, 1, 'lin'],
    [650, POSE.thrown, { x: 1540, y: 820, s: 0.8, core: 1, dagger: 2, spin: -260 }, 1, 'in'],
    [800, POSE.down, { x: 1650, y: 930, s: 0.8, core: 1, dagger: 2, spin: -360 }, 1, 'out'],
    [1000, POSE.down, { x: 1740, y: 960, s: 0.8, core: 1, dagger: 2, spin: -360 }, 2, 'out'],
    [1500, POSE.down, { x: 1760, y: 962, s: 0.8, core: 1, dagger: 2, spin: -360, hairX: 0.2 }, 3, 'out'],
    [D, POSE.down, { x: 1760, y: 962, s: 0.8, core: 1, dagger: 2, spin: -360, eye: 0.3 }, 3, 'out'],
  ]), D);
  const arch = bake(drawArch, [{ t: 0, pose: { x: 1180, y: 1000, w: 380, h: 700, broken: 0 }, on: 1 }, { t: 330, pose: { broken: 1 }, on: 1, ease: 'hold' }], D);
  return shot('05j thrown', D, [set.far, set.shafts, set.cols, set.floor, layer('arch back', arch), layer('rin', rin),
    layer('rubble', [...debris(330, 1300, { c: { x: 1370, y: 320 }, n: 22, speed: 700, spread: [-40, 120], size: [16, 54], gravity: 1700 }), ...smoke(330, 900, { c: { x: 1370, y: 330 }, n: 8, r0: 40, r1: 180, spread: 160, rise: 20 }), ...smoke(800, 900, { c: { x: 1700, y: 960 }, n: 6, r0: 30, r1: 120, spread: 160, rise: 50 })]),
    layer('speed', speedLines(0, 650, { angle: 4, count: 36 }), { parallax: 0 }), set.fg],
    { camera: [{ t: 0, camera: { x: -200, y: -60, zoom: 1.0 } }, { t: 700, camera: { x: 260, y: -40, zoom: 1.0 }, easing: 'easeOutCubic' }, ...camShake(800, 1000, 10, { x: 280, y: -20, zoom: 1.02 }, 3), { t: D, camera: { x: 300, y: 0, zoom: 1.1 }, easing: 'easeInOut' }], post: [NIGHT()] });
}
