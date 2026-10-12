import { bake } from '../lib/anim.mjs';
import { drawRin } from '../lib/rin.mjs';
import { layer, project, rect, txt } from '../lib/proj.mjs';
import { C } from '../lib/pal.mjs';
const one = (pose) => bake(drawRin, [{ t: 0, pose }], 100);
const frameBg = [rect(0, 0, 1920, 1080, '#3A3F55'), rect(0, 0, 1920, 6, C.gold), rect(0, 1074, 1920, 6, C.gold)];
export function rinSheet() {
  const poses = [
    ['FRONT', { x: 300, y: 600, s: 1.45, f: 0 }],
    ['3/4  (dagger ready)', { x: 820, y: 600, s: 1.45, f: 0.45, aR1: 70, aR2: 20, dagAng: -40, hTilt: -4, brow: -0.6 }],
    ['ACTION: low guard', { x: 1420, y: 640, s: 1.45, f: 0.3, lean: 14, lL1: 40, lL2: 110, lR1: 120, lR2: 70, ftR: 180, aR1: 20, aR2: -20, dagAng: -10, aL1: 150, aL2: 170, handL: 'open', coat: -40, hairX: -1, ribbonX: -1, brow: -0.9, eye: 0.8, squash: 0.9 }],
  ];
  const objs = poses.flatMap(([, p]) => one(p));
  const labels = [txt('RIN  —  model sheet  (19)', 960, 50, 46, C.silver), ...poses.map(([n, p]) => txt(n, p.x, 1030, 30, C.gold)), txt('silver-white hair, long over right eye · amber eyes · cropped asymmetric coat w/ gold lining · crimson ribbon on LEFT wrist · prism dagger', 960, 95, 22, C.silver, { font: 'sans-serif' })];
  return project('Rin sheet', 100, [layer('bg', frameBg), layer('chars', objs), layer('labels', labels)]);
}
export function rinFaces() {
  const heads = [
    ['NEUTRAL', {}], ['DETERMINATION', { brow: -0.9, smile: -0.4, eye: 0.8 }], ['PANIC', { brow: 0.9, eye: 1.25, pupil: 0.55, mouth: 0.85, sweat: 1 }],
    ['REALIZATION', { brow: 0.2, eye: 1.15, pupil: 0.75, mouth: 0.3, glint: 0.9 }], ['CALCULATION', { brow: -0.5, eye: 0.62, smile: 0.6, lookX: 0.6 }], ['TENDERNESS', { brow: 0.7, eye: 0.45, smile: 0.9, tear: 0.7, blush: 1 }],
  ];
  const row = (r) => heads.slice(r * 3, r * 3 + 3).flatMap(([, e], j) => one({ x: 330 + j * 630, y: 880 + r * 500, s: 3.1, f: 0.25, scratch: r * 3 + j === 4 ? 1 : 0, dagger: 0, ...e }));
  const labels = heads.map(([n], i) => txt(n, 330 + (i % 3) * 630, 515 + Math.floor(i / 3) * 525, 30, C.gold));
  return project('Rin faces', 100, [layer('bg', frameBg), layer('row1', row(0)), layer('m1', [rect(0, 480, 1920, 600, '#3A3F55')]), layer('row2', row(1)), layer('m2', [rect(0, 1010, 1920, 70, '#3A3F55')]), layer('labels', [txt('RIN — expressions', 960, 40, 40, C.silver), ...labels])]);
}
