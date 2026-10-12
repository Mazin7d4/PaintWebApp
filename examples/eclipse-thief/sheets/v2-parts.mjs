import { still } from '../lib/anim.mjs';
import { layer, project, rect, txt } from '../lib/proj.mjs';
import { face2, EXPR } from '../lib/v2/face2.mjs';
import { hair2, makeLocks, RIN_HAIR, SORA_HAIR } from '../lib/v2/hair2.mjs';
import { hand2, HAND_PRESETS } from '../lib/v2/hands2.mjs';
import { viewOf } from '../lib/v2/ink.mjs';
import { C } from '../lib/pal.mjs';
export const RIN_FACE = { skin: C.skin, skinShade: C.skinShade, skinDeep: C.skinDeep, irisC: [C.irisDark, C.iris, C.irisLite], brow: '#7E8396', hair: C.silver, hairShade: '#8C93AE', hairDeep: '#5E6280', hairHi: '#FFFFFF', R: 34 };
export const SORA_FACE = { skin: '#F4D9C4', skinShade: '#C08E8E', skinDeep: '#93636E', irisC: ['#1E3A66', '#3E7CC4', '#9CD0FF'], brow: '#2A2230', hair: '#3A2E3E', hairShade: '#241B2A', hairDeep: '#140E18', hairHi: '#8C7AA0', R: 34 };
export function headParts(o, cfg, style) {
  const { view, mirror } = viewOf(o.yaw);
  const h = hair2({ ...o, cfg }, makeLocks(style));
  const f = face2({ ...o, view, mirror, cfg });
  return [...h.back, ...f, ...h.front];
}
export function partsSheet() {
  const objs = [];
  const yaws = [0, 45, 90, 180];
  yaws.forEach((yaw, i) => objs.push(...still(headParts({ x: 240 + i * 440, y: 260, s: 3.2, yaw }, RIN_FACE, RIN_HAIR))));
  yaws.forEach((yaw, i) => objs.push(...still(headParts({ x: 240 + i * 440, y: 640, s: 2.6, yaw, expr: 'smile' }, SORA_FACE, SORA_HAIR))));
  Object.keys(HAND_PRESETS).forEach((pr, i) => ['back', 'palm', 'side'].forEach((v, j) => objs.push(...still(hand2({ x: 90 + i * 262 + j * 80, y: 960 - j * 70, preset: pr, view: v, ang: -90, s: 2.2, side: 1, skin: C.skin, skinShade: C.skinShade, gloveC: C.glove, gloveShade: '#1A1624' })))));
  return project('parts', 100, [layer('bg', [rect(0, 0, 1920, 1080, '#4A5070')]), layer('c', objs, { light: -60 })]);
}
export function exprSheet() {
  const objs = [];
  Object.keys(EXPR).forEach((e, i) => { const x = 140 + (i % 4) * 440, y = 230 + Math.floor(i / 4) * 470; objs.push(...still(headParts({ x, y, s: 3, yaw: i % 2 ? 30 : 0, expr: e }, RIN_FACE, RIN_HAIR)), txt(e, x, y + 190, 40, '#fff')); });
  return project('expr', 100, [layer('bg', [rect(0, 0, 1920, 1080, '#4A5070')]), layer('c', objs, { light: -60 })]);
}
