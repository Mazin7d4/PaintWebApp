import { bake } from '../lib/anim.mjs';
import { cathedral, drawCage } from '../lib/env.mjs';
import { drawWarden } from '../lib/warden.mjs';
import { drawRin } from '../lib/rin.mjs';
import { layer, project, txt } from '../lib/proj.mjs';
import { C } from '../lib/pal.mjs';
export function envSheet() {
  const set = cathedral({});
  return project('Cathedral', 100, [set.far, set.shafts, set.cols, layer('warden', bake(drawWarden, [{ t: 0, pose: { x: 1500, y: 300, s: 0.45, aL1: 95, aR1: 85, sil: 1 } }], 100), { parallax: 0.8 }), set.floor,
    layer('cage', bake(drawCage, [{ t: 0, pose: { x: 960, y: 800, s: 1 } }], 100)), layer('rin', bake(drawRin, [{ t: 0, pose: { x: 600, y: 860, s: 0.75, f: 0.5 } }], 100)), set.fg,
    layer('t', [txt('ENV: Cathedral of the Dead Sun — interior (night grade)', 960, 1040, 30, C.silver)], { parallax: 0 })], { background: '#000000' });
}
