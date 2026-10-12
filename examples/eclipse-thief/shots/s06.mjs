// SCENE 06 — IMPOSSIBLE ENEMY (0:57–1:09)
import { bake, still, resetUid } from '../lib/anim.mjs';
import { drawRin } from '../lib/rin.mjs';
import { drawWarden } from '../lib/warden.mjs';
import { drawShard } from '../lib/props.mjs';
import { POSE, keys, mirror } from '../lib/poses.mjs';
import { cathedral } from '../lib/env.mjs';
import { layer, rect, W, H } from '../lib/proj.mjs';
import { shot } from '../lib/shot.mjs';
import { beam, glow, grade, ash, smoke, debris, bubble, focusLines, flash } from '../lib/fx.mjs';
import { C } from '../lib/pal.mjs';

const NIGHT = (k = 0.36) => grade('#1B2A66', 'multiply', [[0, k]], 'grade night');
const WSTAND = { s: 0.7, aL1: 100, aL2: 96, aR1: 80, aR2: 84, lL1: 96, lL2: 92, lR1: 84, lR2: 88, eye: 1 };
const breath = (t0, t1, base, amp = 1, period = 750) => { const o = []; for (let t = t0, i = 0; t < t1; t += period / 2, i++) o.push([t, base, { breath: i % 2 ? 0 : 3 * amp, aL1: base.aL1 + (i % 2 ? 0 : 2), hairY: i % 2 ? 0 : 0.15 }, 3, 'inOut']); return o; };

// 06a — she rises: scratched brow, heavy breathing, the Core in her hand.
export function s06a() {
  resetUid();
  const D = 2600;
  const b = { ...POSE.rise, x: 960, ground: 1560, s: 3.0, f: 0.3, core: 1, dagger: 2, scratch: 1, light: -1, brow: 0.2, eye: 0.7, mouth: 0.5, lookX: 0.4, coreR: 1.2 };
  const k0 = { ...POSE.kneel, x: 960, ground: 1560, s: 3.0, f: 0.3, core: 1, dagger: 2, scratch: 1, light: -1, eye: 0.5, mouth: 0.6, brow: 0.5, lean: 30, hTilt: 20, coreR: 1.2 };
  const rin = bake(drawRin, keys([
    [0, k0, {}, 3], [400, k0, { breath: 3, hairY: 0.2 }, 3, 'inOut'], [700, k0, {}, 3, 'inOut'],
    [1000, b, { lean: 20, hTilt: 10, eye: 0.6 }, 2, 'inOut'],
    ...breath(1300, D, { ...b, eye: 0.75, brow: -0.2 }),
  ]), D);
  return shot('06a rise', D, [layer('bg', [rect(-200, -200, W + 400, H + 400, '#0B0C1A'), glow(500, 300, 500, 'rgba(110,130,210,0.25)')], { parallax: 0.3 }), layer('rin', rin), layer('core glow', [glow(1180, 820, 650, 'rgba(255,170,60,0.35)')], { blend: 'screen' }), layer('dust', [ash({ x: 960, y: 1200, count: 40, speed: 400, spread: 100, life: 9000, size: 2.4, color: 'rgba(200,205,230,0.6)' })], { parallax: 0.9 })],
    { camera: [{ t: 0, camera: { x: 0, y: 140, zoom: 1.0 } }, { t: 1000, camera: { x: 0, y: 60, zoom: 1.0 }, easing: 'easeInOut' }, { t: D, camera: { x: 20, y: 40, zoom: 1.06 }, easing: 'easeInOut' }], post: [NIGHT(0.3)] });
}
// 06b — low angle: it advances.
export function s06b() {
  resetUid();
  const D = 1900, set = cathedral({});
  const step = (t, x, l) => ({ t, pose: { ...WSTAND, x, y: 1200, s: 1.45, lL1: l ? 70 : 100, lL2: l ? 95 : 90, lR1: l ? 95 : 70, lR2: 90, aL1: 110 + (l ? 6 : -6), aR1: 70 + (l ? 6 : -6), halo: t / 20, clawL: 0.6, clawR: 0.6 }, on: 3, ease: 'inOut' });
  const warden = bake(drawWarden, [step(0, 980, 0), step(600, 960, 1), step(1200, 940, 0), step(1800, 920, 1)], D);
  return shot('06b advance', D, [set.far, set.shafts, set.cols, set.floor, layer('warden', warden), layer('red', [glow(940, -150, 400, 'rgba(255,30,60,0.35)')], { blend: 'screen' }), set.fg],
    { camera: [{ t: 0, camera: { x: 0, y: -430, zoom: 0.98, rotation: 3 } }, { t: D, camera: { x: -20, y: -470, zoom: 1.03, rotation: 4 }, easing: 'easeInOut' }], post: [NIGHT(0.42), grade('#E0142E', 'soft-light', [[0, 0.18]])] });
}
// 06c — light hits a shard; an amber reflection crosses its wrist; armor fractures; it recoils.
export function s06c() {
  resetUid();
  const D = 2500, set = cathedral({});
  const wp = { ...WSTAND, x: 1450, y: 1010, s: 0.8, aL1: 160, aL2: 175, clawL: 0.8, armLk: 1.05, lean: -6 };
  const warden = bake(drawWarden, [
    { t: 0, pose: { ...wp }, on: 3 },
    { t: 900, pose: { ...wp, aL1: 165, aL2: 182 }, on: 3, ease: 'inOut' },
    { t: 1150, pose: { crackWrist: 1 }, on: 1, ease: 'hold' },
    { t: 1350, pose: { aL1: 110, aL2: 60, lean: 10, recoil: 1, crackWrist: 1, eye: 1 }, on: 1, ease: 'out5' },
    { t: D, pose: { aL1: 115, aL2: 70, lean: 8, recoil: 0.6 }, on: 2, ease: 'out' },
  ], D);
  const rin = bake(drawRin, keys([[0, POSE.kneel, { x: 420, ground: 1010, s: 0.85, core: 1, dagger: 2, scratch: 1, coreR: 1.4, eye: 0.7 }, 3], [1300, POSE.kneel, { x: 420, ground: 1010, s: 0.85, core: 1, dagger: 2, scratch: 1, coreR: 1.4, eye: 1.15, pupil: 0.7, lookX: 1 }, 1, 'out5']]), D);
  const shard = bake(drawShard, [{ t: 0, pose: { x: 900, y: 1000, s: 1.6, rot: -10, lit: 0 }, on: 2 }, { t: 700, pose: { lit: 0 }, ease: 'hold' }, { t: 800, pose: { lit: 1 }, on: 1, ease: 'out' }], D);
  const ray1 = beam(700, D, { a: { x: 520, y: 760 }, b: { x: 900, y: 995 }, width: 16, grow: 90, color: 'rgba(255,190,70,0.35)' });
  const ray2 = beam(820, 1500, { a: { x: 900, y: 995 }, b: { x: 1360, y: 520 }, width: 26, grow: 300, color: 'rgba(255,190,60,0.5)' });
  return shot('06c reflection', D, [set.far, set.shafts, set.cols, set.floor, layer('core light', [glow(520, 760, 400, 'rgba(255,180,70,0.4)')], { blend: 'screen' }), layer('rin', rin), layer('shard', shard), layer('warden', warden),
    layer('beams', [...ray1, ...ray2], { blend: 'screen' }), layer('sizzle', [...smoke(1150, 900, { c: { x: 1350, y: 520 }, n: 7, r0: 20, r1: 90, spread: 60, rise: 120, color: '#2A2030', shade: '#120C18' }), ...debris(1150, 600, { c: { x: 1350, y: 520 }, n: 10, speed: 600, spread: [-60, 60], size: [6, 16], gravity: 900, color: C.armorLite, shade: C.armor })]), flash(1150, { dur: 220, color: '#FFC860', peak: 0.6 }), set.fg],
    { camera: [{ t: 0, camera: { x: 0, y: -10, zoom: 1.0 } }, { t: 1100, camera: { x: 120, y: -40, zoom: 1.08 }, easing: 'easeInOut' }, { t: 1350, camera: { x: 160, y: -60, zoom: 1.14 }, easing: 'easeOutCubic' }, { t: D, camera: { x: 160, y: -60, zoom: 1.15 } }], post: [NIGHT(0.36)] });
}
// 06d — ECU: the amber reflection grows in her eye.
export function s06d() {
  resetUid();
  const D = 2100;
  const base = { ...POSE.hold, x: 440, y: 4250, s: 22, f: 0.15, dagger: 0, core: 0, light: -1, eye: 1.05, pupil: 0.8, brow: 0.4, lookX: 0.6, lookY: 0, glint: 0.05, scratch: 1 };
  const rin = bake(drawRin, keys([[0, base, {}, 3], [700, base, { glint: 0.3 }, 3, 'inOut'], [1500, base, { glint: 0.75, pupil: 0.9 }, 2, 'inOut'], [D, base, { glint: 1, pupil: 0.95, eye: 0.95 }, 2, 'inOut']]), D);
  return shot('06d eye', D, [layer('bg', [rect(-200, -200, W + 400, H + 400, '#2A2238')], { parallax: 0 }), layer('rin', rin)],
    { camera: [{ t: 0, camera: { x: 0, y: 0, zoom: 1.0 } }, { t: D, camera: { x: 20, y: 10, zoom: 1.12 }, easing: 'easeInOut' }], post: [NIGHT(0.25), grade('#FFB04A', 'soft-light', [[0, 0.05], [D, 0.4]])] });
}
// 06e — "The light..."
export function s06e() {
  resetUid();
  const D = 1800;
  const base = { ...POSE.hold, x: 900, y: 2050, s: 8.6, f: 0.35, dagger: 0, core: 0, light: -1, eye: 0.95, pupil: 0.85, brow: 0.3, lookX: 0.7, glint: 0.6, scratch: 1, mouth: 0.15, smile: 0 };
  const rin = bake(drawRin, keys([[0, base, {}, 3], [D, base, { lookY: 0.3, eye: 0.9 }, 3, 'inOut']]), D);
  return shot('06e thought', D, [layer('bg', [rect(-200, -200, W + 400, H + 400, '#161728'), glow(1600, 400, 600, 'rgba(255,170,60,0.3)')], { parallax: 0 }), layer('rin', rin), layer('bubble', bubble('The light...', 1420, 250, 250, D, { thought: true, w: 760, h: 230, size: 96, tail: { x: 1150, y: 470 }, font: 'Cinzel, serif' }), { parallax: 0 })],
    { camera: [{ t: 0, camera: { x: 0, y: 0, zoom: 1.0 } }, { t: D, camera: { x: 0, y: 0, zoom: 1.04 }, easing: 'easeInOut' }], post: [NIGHT(0.25)] });
}
// 06f — calculation: the expression turns.
export function s06f() {
  resetUid();
  const D = 1700;
  const base = { ...POSE.hold, x: 930, y: 2080, s: 9, f: 0.2, dagger: 0, core: 0, light: -1, eye: 0.95, pupil: 0.85, brow: 0.3, lookX: 0.5, glint: 0.6, scratch: 1, smile: 0 };
  const rin = bake(drawRin, keys([[0, base, {}, 3], [500, base, {}, 3, 'hold'], [700, base, { brow: -0.5, eye: 0.75, lookX: 0.8 }, 2, 'snap'], [1000, base, { brow: -0.7, eye: 0.62, smile: 0.55, lookX: 0.9, hTilt: -5 }, 2, 'inOut'], [D, base, { brow: -0.8, eye: 0.6, smile: 0.65, lookX: 0.9, hTilt: -6 }, 3]]), D);
  return shot('06f calculate', D, [layer('bg', [rect(-200, -200, W + 400, H + 400, '#141526'), glow(300, 800, 700, 'rgba(255,170,60,0.35)')], { parallax: 0 }), layer('rin', rin)],
    { camera: [{ t: 0, camera: { x: 0, y: 0, zoom: 1.0 } }, { t: D, camera: { x: 10, y: -30, zoom: 1.16 }, easing: 'easeInOut' }], post: [NIGHT(0.3), grade('#FFB04A', 'soft-light', [[0, 0.1], [D, 0.3]])] });
}
