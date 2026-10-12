// Shot template: background set + cast + fx + standard grade stack.
import { resetUid } from './anim.mjs';
import { project } from './proj.mjs';
import { vignette } from './fx.mjs';
export function shot(name, dur, layers, { camera, post = [], vig = 0.7, background = '#000000' } = {}) {
  if (process.env.ECLIPSE_V1 !== '1') {
    // v2 lighting: character layers get a light direction (toward the Sun Core when present) + rim colour
    const core = layers.find((l) => l?.name === 'core light')?.objects?.[0];
    const cx = core ? core.x + core.w / 2 : null, cy = core ? core.y + core.h / 2 : null;
    for (const l of layers) if (l && /rin|warden|hand|sora|cast/i.test(l.name ?? '') && l.light == null) {
      l.light = core ? Math.round(Math.atan2(cy - 540, cx - 960) * 180 / Math.PI) : -60;
      l.rim = core ? '#FFC060' : '#9FB4E8';
    }
  }
  return project(name, dur, [...layers, ...post, ...(vig ? [vignette(vig)] : [])], { camera, background });
}
export { resetUid };
