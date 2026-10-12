// Project/layer helpers for 1920x1080 @ 60 fps shots.
import { nid } from './anim.mjs';
export const W = 1920, H = 1080, FPS = 60;
export function layer(name, objects, opts = {}) {
  return { id: nid('L'), name, visible: true, opacity: opts.opacity ?? 1, blendMode: opts.blend ?? 'source-over', parallax: opts.parallax ?? 1, objects, ...(opts.show ? { show: opts.show } : {}), ...(opts.filter ? { filter: opts.filter } : {}), ...(opts.filterKeys ? { filterKeys: opts.filterKeys } : {}), ...(opts.stepMs ? { stepMs: opts.stepMs } : {}) };
}
export function project(name, durMs, layers, opts = {}) {
  return { version: 2, name, width: W, height: H, fps: FPS, background: opts.background ?? '#000000', palette: [], layers, frames: [{ id: 'f0', duration: durMs }], ...(opts.camera ? { cameraKeyframes: opts.camera } : {}), meta: { author: 'Eclipse Thief production kit', tags: ['eclipse-thief'] } };
}
export const rect = (x, y, w, h, fill, extra = {}) => ({ type: 'shape', shape: 'rect', id: nid('r'), x, y, w, h, fill: typeof fill === 'string' ? { color: fill } : fill, ...extra });
export const txt = (s, x, y, size, color, extra = {}) => ({ type: 'text', id: nid('t'), text: s, x, y, fontSize: size, fontFamily: extra.font ?? 'Cinzel, Bangers, serif', fill: { color }, align: 'center', baseline: 'middle', ...extra });
