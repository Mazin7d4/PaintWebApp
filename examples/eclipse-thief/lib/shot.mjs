// Shot template: background set + cast + fx + standard grade stack.
import { resetUid } from './anim.mjs';
import { project } from './proj.mjs';
import { vignette } from './fx.mjs';
export function shot(name, dur, layers, { camera, post = [], vig = 0.7, background = '#000000' } = {}) {
  return project(name, dur, [...layers, ...post, ...(vig ? [vignette(vig)] : [])], { camera, background });
}
export { resetUid };
