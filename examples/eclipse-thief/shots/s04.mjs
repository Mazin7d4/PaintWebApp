// SCENE 04 — THEFT (0:32–0:43)
import { bake, still, resetUid, ON1, ON2 } from '../lib/anim.mjs';
import { drawRin } from '../lib/rin.mjs';
import { drawWarden } from '../lib/warden.mjs';
import { drawGripCU } from '../lib/hands.mjs';
import { POSE, keys, mirror } from '../lib/poses.mjs';
import { cathedral, drawCage } from '../lib/env.mjs';
import { layer, rect, W, H } from '../lib/proj.mjs';
import { shot } from '../lib/shot.mjs';
import { focusLines, speedLines, impactFrame, flash, slashArc, debris, glow, grade, ash, shadowSweep, smoke } from '../lib/fx.mjs';
import { ell, rectP } from '../lib/geom.mjs';
import { C } from '../lib/pal.mjs';

export const NIGHT = (extra = []) => [grade('#1B2A66', 'multiply', [[0, 0.32]], 'grade night'), ...extra];
const haze = (o = 0.22) => layer('haze', [rect(-2000, 300, 6000, 700, { gradient: { type: 'linear', x0: 0, y0: 300, x1: 0, y1: 1000, stops: [{ offset: 0, color: 'rgba(90,100,150,0)' }, { offset: 0.6, color: `rgba(90,100,150,${o})` }, { offset: 1, color: 'rgba(90,100,150,0)' }] } })], { parallax: 0.8, blend: 'screen' });
const ashL = (n = 50) => layer('ash', [ash({ x: 960, y: 1300, count: n, speed: 1500, spread: 70, life: 7000, size: 2.4, seed: 4 }), ash({ x: 400, y: 1300, count: n / 2, speed: 1300, spread: 40, life: 8000, size: 1.8, seed: 9 })], { parallax: 0.85 });
const coreFloor = (x, y, r = 520, o = 0.5) => layer('core light', [glow(x, y, r, `rgba(255,180,70,${o})`)], { blend: 'screen' });

// 04a — wide, low: Rin circles the cage; the Warden hangs unseen in the dark above.
export function s04a() {
  resetUid();
  const D = 2600, set = cathedral({});
  const steps = [];
  for (let i = 0; i <= 6; i++) {
    const t = i * 400, x = 520 + i * 40;
    steps.push([t, 'guard', { x, ground: 975, s: 0.86, f: 0.55, lL1: i % 2 ? 70 : 55, lR1: i % 2 ? 110 : 125, lL2: i % 2 ? 95 : 105, hairX: i % 2 ? 0.25 : -0.15, coat: i % 2 ? -8 : 6, lookX: 0.6, time: t }, 3, 'inOut']);
  }
  const rin = bake(drawRin, keys(steps), D, { prefix: 'rin' });
  const cage = bake(drawCage, [{ t: 0, pose: { x: 1080, y: 900, s: 0.95 }, on: 2 }, { t: D, pose: { x: 1080, y: 900, s: 0.95 }, on: 2 }], D);
  const warden = bake(drawWarden, [{ t: 0, pose: { x: 1500, y: -520, s: 0.55, lean: 180, aL1: 95, aL2: 92, aR1: 85, aR2: 88, lL1: -85, lL2: -88, lR1: -95, lR2: -92, haloOn: 1, halo: 10 } }], D);
  return shot('04a circle', D, [set.far, set.shafts, layer('warden (unnoticed)', warden, { parallax: 0.9, opacity: 0.8, filter: 'brightness(0.55)' }), set.cols, haze(), set.floor, coreFloor(1080, 900), layer('cage', cage), layer('rin', rin), ashL(), set.fg],
    { camera: [{ t: 0, camera: { x: -220, y: 60, zoom: 1.05 } }, { t: D, camera: { x: 0, y: 30, zoom: 1.14 }, easing: 'easeInOut' }], post: NIGHT() });
}

// 04b — ECU: her fingers tighten on the prism dagger.
export function s04b() {
  resetUid();
  const D = 1300;
  const hand = bake(drawGripCU, [
    { t: 0, pose: { x: 900, y: 600, s: 1.05, rot: -24, grip: 0.15, tremble: 0, glint: 0 }, on: 2 },
    { t: 330, pose: { grip: 0.15 }, on: 2, ease: 'hold' },
    { t: 500, pose: { grip: 0.65, tremble: 0.5 }, on: 2, ease: 'snap' },
    { t: 700, pose: { grip: 1, tremble: 1, glint: 0.05 }, on: 1, ease: 'out' },
    { t: 1150, pose: { grip: 1, tremble: 1, glint: 1 }, on: 1, ease: 'inOut' },
  ], D);
  const bokeh = [glow(1500, 260, 260, 'rgba(255,180,70,0.55)'), glow(300, 880, 200, 'rgba(120,140,220,0.35)'), glow(1700, 760, 140, 'rgba(255,200,90,0.4)'), glow(200, 200, 160, 'rgba(120,140,220,0.25)')];
  return shot('04b grip', D, [layer('bg', [rect(-100, -100, W + 200, H + 200, '#0B0C1C')]), layer('bokeh', bokeh, { blend: 'screen', filter: 'blur(12px)' }), layer('hand', hand)],
    { camera: [{ t: 0, camera: { x: 0, y: 0, zoom: 1 } }, { t: D, camera: { x: 30, y: -10, zoom: 1.08 }, easing: 'easeOut' }], post: NIGHT() });
}

// 04c — the diagonal leap: anticipation, launch on 1s, slash, flash, cage splits.
export function s04c() {
  resetUid();
  const D = 1300, set = cathedral({});
  const rin = bake(drawRin, keys([
    [0, 'crouch', { x: 600, ground: 990, s: 0.95, f: 0.55 }, 2],
    [160, 'antic', { x: 610, ground: 990, s: 0.95 }, 2, 'snap'],
    [330, 'antic', { x: 612, ground: 990, s: 0.95, squash: 0.78 }, 2, 'hold'],
    [420, 'leap', { x: 760, y: 700, s: 0.95, squash: 1.18 }, 1, 'out'],
    [540, 'slash', { x: 950, y: 640, s: 0.95 }, 1, 'out'],
    [640, 'follow', { x: 1060, y: 660, s: 0.95 }, 1, 'out'],
    [900, 'follow', { x: 1150, y: 760, s: 0.95, coat: 70, hairX: 1.2 }, 2, 'in'],
  ]), D, { prefix: 'rin' });
  const cage = bake(drawCage, [{ t: 0, pose: { x: 1080, y: 900, s: 0.95, split: 0 }, on: 1 }, { t: 600, pose: { split: 0 }, on: 1, ease: 'hold' }, { t: 1300, pose: { split: 1, coreGlow: 1.6 }, on: 1, ease: 'out5' }], D);
  return shot('04c leap', D, [set.far, set.shafts, set.cols, haze(), set.floor, coreFloor(1080, 900, 600, 0.6), layer('cage', cage), layer('streak', slashArc(520, 640, { c: { x: 1060, y: 740 }, r: 230, a0: -150, a1: 60, width: 60, squashY: 0.8, rot: -30 }), { blend: 'screen' }), layer('rin', rin),
    layer('speed', speedLines(380, 560, { angle: -32, count: 46 }), { parallax: 0 }),
    layer('debris', debris(620, 650, { c: { x: 1080, y: 760 }, n: 14, speed: 800, spread: [180, 360], size: [8, 20], color: '#3C3F52', shade: '#22243A' })),
    set.fg, flash(600, { dur: 380, color: '#FFE2A0' })],
    { camera: [{ t: 0, camera: { x: -80, y: 40, zoom: 1.12, rotation: 0 } }, { t: 330, camera: { x: -90, y: 50, zoom: 1.16, rotation: 0 }, easing: 'easeIn' }, { t: 650, camera: { x: 60, y: -20, zoom: 1.1, rotation: -3 }, easing: 'easeOutCubic' }, { t: D, camera: { x: 80, y: -10, zoom: 1.06, rotation: -2 }, easing: 'easeOut' }],
      post: [grade('#1B2A66', 'multiply', [[0, 0.32], [600, 0.32], [700, 0.12], [D, 0.16]])] });
}

// 04d — she lands with the Sun Core; gold floods the nave. A beat of beauty.
export function s04d() {
  resetUid();
  const D = 2400, set = cathedral({});
  const rin = bake(drawRin, keys([
    [0, 'catch', { x: 920, ground: 1240, s: 1.9, squash: 0.84, eye: 1.15, pupil: 0.8, light: 1, lookY: -0.7, hairY: -0.6, coat: -20 }, 1],
    [120, 'catch', { x: 920, ground: 1240, s: 1.9, squash: 1.02, hairY: 0.4 }, 2, 'out'],
    [400, 'catch', { x: 920, ground: 1240, s: 1.9, squash: 1, hairY: 0, hairX: 0.2, coat: 10 }, 2, 'inOut'],
    [1300, 'hold', { x: 920, ground: 1240, s: 1.9, eye: 0.8, brow: 0.55, smile: 0.35, mouth: 0, glint: 0.7, hairX: -0.2, coat: -6, lookX: 0.4, lookY: 0.2 }, 3, 'inOut'],
    [2400, 'hold', { x: 920, ground: 1240, s: 1.9, eye: 0.75, glint: 0.9, hairX: 0.15, coat: 6 }, 3, 'inOut'],
  ]), D, { prefix: 'rin' });
  const gold = layer('gold dust', [ash({ x: 960, y: 1200, count: 70, speed: 700, spread: 110, life: 9000, size: 3, color: 'rgba(255,205,110,0.9)', seed: 12 }), ash({ x: 1300, y: 1200, count: 40, speed: 500, spread: 80, life: 9000, size: 2, color: 'rgba(255,230,160,0.8)', seed: 13 })], { parallax: 1, blend: 'screen' });
  const bloom = layer('bloom', [{ ...glow(1080, 300, 900, 'rgba(255,180,70,0.55)'), keyframes: [{ t: 0, transform: { opacity: 0.5 } }, { t: 500, transform: { opacity: 1 }, easing: 'easeOutCubic' }] }], { blend: 'screen', parallax: 1 });
  return shot('04d core', D, [set.far, set.shafts, set.cols, set.floor, bloom, layer('rin', rin), gold],
    { camera: [{ t: 0, camera: { x: 0, y: -120, zoom: 1.0 } }, { t: D, camera: { x: 30, y: -170, zoom: 1.12 }, easing: 'easeInOut' }],
      post: [grade('#1B2A66', 'multiply', [[0, 0.2], [600, 0.06]], 'grade night'), grade('#FFB04A', 'soft-light', [[0, 0.2], [700, 0.7]], 'grade gold')] });
}

// 04e — ECU: a giant shadow crosses her face; her eyes flick up.
export function s04e() {
  resetUid();
  const D = 1500;
  const base = { ...POSE.hold, x: 930, y: 2080, s: 9, f: 0.2, dagger: 0, core: 0, hTilt: 0, lookX: 0, lookY: 0.2, eye: 0.8, brow: 0.5, smile: 0.3, glint: 0.8, light: 1 };
  const rin = bake(drawRin, keys([
    [0, base, {}, 3],
    [600, base, { smile: 0 }, 2, 'inOut'],
    [820, base, { lookY: -1, lookX: 0.2, pupil: 0.7, eye: 1.15, brow: 0.9, smile: -0.3, glint: 0.2, hairX: 0.15 }, 1, 'snap'],
    [1500, base, { lookY: -1, lookX: 0.2, pupil: 0.62, eye: 1.2, brow: 1, smile: -0.4, glint: 0, mouth: 0.15 }, 2, 'inOut'],
  ]), D, { prefix: 'rin' });
  return shot('04e shadow', D, [layer('bg', [rect(-200, -200, W + 400, H + 400, '#2A2140'), glow(1500, 100, 800, 'rgba(255,170,60,0.5)')], { parallax: 0 }), layer('rin', rin), layer('shadow', shadowSweep(380, 1150, { color: 'rgba(4,3,10,0.88)' }), { parallax: 0 })],
    { camera: [{ t: 0, camera: { x: 0, y: 0, zoom: 1 } }, { t: D, camera: { x: 0, y: -20, zoom: 1.05 }, easing: 'easeInOut' }], post: [grade('#FFB04A', 'soft-light', [[0, 0.55], [800, 0.3]]), grade('#1B2A66', 'multiply', [[0, 0.05], [800, 0.35]])] });
}

// 04f — tilt up: the Warden hangs from the vault. The eye opens; the halo turns.
export function s04f() {
  resetUid();
  const D = 2600, set = cathedral({});
  const rin = bake(drawRin, keys([[0, 'hold', { x: 960, ground: 1010, s: 0.8, lookY: -1, hTilt: -18, eye: 1.15, pupil: 0.6, brow: 0.9 }, 3]]), D, { prefix: 'rin' });
  const wpose = { x: 960, y: -1500, s: 0.95, lean: 180, aL1: 100, aL2: 96, aR1: 80, aR2: 84, lL1: -85, lL2: -88, lR1: -95, lR2: -92, eye: 0, halo: 0 };
  const warden = bake(drawWarden, [
    { t: 0, pose: wpose, on: 3 }, { t: 1700, pose: { ...wpose }, on: 3, ease: 'hold' },
    { t: 1850, pose: { ...wpose, eye: 1, clawL: 0.6, clawR: 0.6 }, on: 1, ease: 'snap' },
    { t: D, pose: { ...wpose, eye: 1, halo: 95, clawL: 0.9, clawR: 0.9, aL1: 106, aR1: 74 }, on: 1, ease: 'in' },
  ], D);
  const redGlow = layer('red', [{ ...glow(960, -380, 500, 'rgba(255,30,60,0.45)'), keyframes: [{ t: 0, transform: { opacity: 0 } }, { t: 1800, transform: { opacity: 0 } }, { t: 1900, transform: { opacity: 1 }, easing: 'easeOut' }] }], { blend: 'screen' });
  return shot('04f tilt', D, [set.far, set.shafts, set.cols, set.floor, coreFloor(960, 900, 500, 0.45), layer('rin', rin), layer('warden', warden), redGlow, ashL(40)],
    { camera: [{ t: 0, camera: { x: 0, y: 80, zoom: 1.05 } }, { t: 300, camera: { x: 0, y: 80, zoom: 1.05 } }, { t: 1600, camera: { x: 0, y: -980, zoom: 1.0 }, easing: 'easeInOutCubic' }, { t: 1850, camera: { x: 0, y: -990, zoom: 1.0 } }, { t: D, camera: { x: 0, y: -1010, zoom: 1.12 }, easing: 'easeOut' }],
      post: [grade('#1B2A66', 'multiply', [[0, 0.3], [1700, 0.4]]), grade('#E0142E', 'soft-light', [[0, 0], [1800, 0], [1950, 0.35]])] });
}
