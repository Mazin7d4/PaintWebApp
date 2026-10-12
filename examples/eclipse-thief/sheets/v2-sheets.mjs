import { bake } from '../lib/anim.mjs';
import { layer, project, rect, txt } from '../lib/proj.mjs';
import { drawRin2, drawSora2 } from '../lib/v2/person.mjs';
import { POSE } from '../lib/poses.mjs';
const one = (fn, pose, pre) => bake(fn, [{ t: 0, pose }], 50, { prefix: pre });
const BG = (c = '#4A5070') => layer('bg', [rect(0, 0, 1920, 1080, c), rect(0, 940, 1920, 4, '#6A7090')]);
export function turnaround() {
  const o = [];
  [[0, 'FRONT'], [0.5, '3/4'], [1, 'SIDE'], [2, 'BACK']].forEach(([f, n], i) => {
    o.push(...one(drawRin2, { x: 230 + i * 330, ground: 940, s: 1.55, f, aL1: 95, aL2: 92, aR1: 85, aR2: 88, lL1: 86, lL2: 90, lR1: 94, lR2: 90, ftL: f >= 1.5 ? 180 : 0, ftR: f >= 1.5 ? 180 : 0, dagger: 0, handL: 'relaxed', handR: 'relaxed', ribbonY: 1, ribbonX: -0.2 }, 'r' + i), txt(n, 230 + i * 330, 1000, 34, '#fff'));
  });
  [[0, 'FRONT'], [0.5, '3/4'], [1, 'SIDE'], [2, 'BACK']].forEach(([f, n], i) => o.push(...one(drawSora2, { x: 1460 + i * 130, ground: 940, s: 1.15, f, aL1: 95, aL2: 92, aR1: 85, aR2: 88, lL1: 86, lL2: 90, lR1: 94, lR2: 90, ftL: f >= 1.5 ? 180 : 0, ftR: f >= 1.5 ? 180 : 0, handL: 'relaxed', handR: 'relaxed', expr: 'smile' }, 's' + i)));
  return project('turn', 100, [BG(), layer('c', o, { light: -55 })]);
}
export function actionSheet() {
  const names = ['antic', 'leapSlash', 'twist', 'dodge', 'block', 'thrown', 'slide', 'reach'];
  const o = [];
  names.forEach((n, i) => { const x = 240 + (i % 4) * 470, y = 470 + Math.floor(i / 4) * 470; o.push(...one(drawRin2, { ...POSE[n], x, y: y - 120, s: 0.95 }, 'a' + i), txt(n, x, y + 30, 30, '#fff')); });
  return project('act', 100, [BG(), layer('c', o, { light: -55 })]);
}

import { hand2, HAND_PRESETS } from '../lib/v2/hands2.mjs';
import { still } from '../lib/anim.mjs';
import { C } from '../lib/pal.mjs';
export function handsSheet() {
  const o = [];
  Object.keys(HAND_PRESETS).forEach((pr, i) => {
    const x0 = 140 + i * 255;
    o.push(txt(pr, x0 + 40, 90, 30, '#fff'));
    [['back', -90], ['back', -30], ['palm', -90], ['side', -60], ['side', 0]].forEach(([v, a], j) => o.push(...still(hand2({ x: x0, y: 260 + j * 175, preset: pr, view: v, ang: a, s: 3.4, side: 1, skin: C.skin, skinShade: C.skinShade, gloveC: C.glove, gloveShade: C.gloveShade }))));
  });
  ['back -90', 'back -30', 'palm', 'side', 'side 0'].forEach((n, j) => o.push(txt(n, 50, 200 + j * 175, 20, '#aab', { align: 'left' })));
  return project('hands', 100, [BG(), layer('c', o, { light: -55 })]);
}
export function checkFace() {
  // full-res QA: face front / 3-4 / side at close-up scale + hair silhouette
  const o = [];
  [[0, 'determination'], [45, 'realization'], [90, 'neutral']].forEach(([yaw, e], i) => o.push(...one(drawRin2, { x: 330 + i * 640, y: 1500, s: 5, f: yaw / 90, expr: e, dagger: 0, aL1: 95, aL2: 92, aR1: 85, aR2: 88, secLock: 1 }, 'cf' + i)));
  return project('cface', 100, [BG('#3C4260'), layer('c', o, { light: -55, rim: '#9FB4E8' })]);
}
export function checkBody() {
  // elbows/knees at hard bends, foot contact on ground line, foreshortened reach
  const o = [];
  o.push(...one(drawRin2, { ...POSE.crouch, x: 330, ground: 980, s: 1.9, secLock: 1 }, 'b0'));
  o.push(...one(drawRin2, { ...POSE.kneel, x: 930, ground: 980, s: 1.9, secLock: 1 }, 'b1'));
  o.push(...one(drawRin2, { ...POSE.reach, x: 1540, ground: 1160, s: 2.3, secLock: 1 }, 'b2'));
  return project('cbody', 100, [BG(), layer('c', o, { light: -55 })]);
}
export function checkSora() {
  const o = [];
  [[0, 'smile'], [0.5, 'panic'], [1, 'tenderness']].forEach(([f, e], i) => o.push(...one(drawSora2, { x: 330 + i * 640, ground: 1000, s: 2.6, f, expr: e, aL1: 95, aL2: 92, aR1: 85, aR2: 88, handL: 'relaxed', handR: 'relaxed', secLock: 1 }, 'sc' + i)));
  return project('csora', 100, [BG(), layer('c', o, { light: -55 })]);
}
