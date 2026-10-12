import { bake } from '../lib/anim.mjs';
import { drawWarden } from '../lib/warden.mjs';
import { drawRin } from '../lib/rin.mjs';
import { layer, project, rect, txt } from '../lib/proj.mjs';
import { C } from '../lib/pal.mjs';
const one = (fn, pose) => bake(fn, [{ t: 0, pose }], 100);
export function wardenSheet() {
  return project('Warden sheet', 100, [
    layer('bg', [rect(0, 0, 1920, 1080, '#2E3044'), rect(0, 0, 1920, 6, C.crimson), rect(0, 1074, 1920, 6, C.crimson)]),
    layer('c', [...one(drawWarden, { x: 520, y: 1010, s: 0.62 }), ...one(drawWarden, { x: 1180, y: 1010, s: 0.62, eye: 1, lean: 8, aL1: 20, aL2: -10, clawL: 1, aR1: 150, aR2: 120, halo: 15 }), ...one(drawRin, { x: 1650, y: 820, s: 0.95, f: 0.3 })]),
    layer('t', [txt('THE WARDEN  —  model sheet', 960, 45, 44, C.silver), txt('dormant (slit closed)', 520, 1040, 26, C.crimson), txt('awake: eye open, claws spread, halo turning', 1180, 1040, 26, C.crimson), txt('scale: Rin', 1650, 1040, 26, C.gold)]),
  ]);
}
