import { bake } from '../lib/anim.mjs';
import { drawRin } from '../lib/rin.mjs';
import { layer, project, rect } from '../lib/proj.mjs';
export function headTest() {
  const one = (pose) => bake(drawRin, [{ t: 0, pose }], 100);
  return project('head', 100, [layer('bg', [rect(0, 0, 1920, 1080, '#3A3F55')]), layer('c', [...one({ x: 520, y: 1700, s: 5.5, f: 0.15 }), ...one({ x: 1400, y: 1700, s: 5.5, f: 0.7, brow: -0.8, eye: 0.85 })])]);
}
