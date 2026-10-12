import { bake } from '../lib/anim.mjs';
import { drawRin } from '../lib/rin.mjs';
import { POSE, RUN } from '../lib/poses.mjs';
import { layer, project, rect, txt } from '../lib/proj.mjs';
import { C } from '../lib/pal.mjs';
export function poseSheet() {
  const names = ['guard', 'crouch', 'antic', 'leap', 'slash', 'follow', 'dodge', 'block', 'thrown', 'kneel', 'rise', 'catch'];
  const objs = names.flatMap((n, i) => bake(drawRin, [{ t: 0, pose: { ...POSE.stand, ...POSE[n], x: 170 + (i % 6) * 310, ground: 470 + Math.floor(i / 6) * 470, s: 0.78, time: 500 } }], 100));
  const lab = names.map((n, i) => txt(n.toUpperCase(), 170 + (i % 6) * 310, 500 + Math.floor(i / 6) * 470, 24, C.gold));
  return project('poses', 100, [layer('bg', [rect(0, 0, 1920, 1080, '#3A3F55'), rect(0, 470, 1920, 2, '#666'), rect(0, 940, 1920, 2, '#666')]), layer('c', objs), layer('t', [...lab, txt('RIN — key pose library (action keys)', 960, 1040, 30, C.silver)])]);
}
