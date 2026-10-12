// Line-weight rules for the v2 drawings (engine ink lines + cel shading).
import { C } from '../pal.mjs';
// line widths grow sub-linearly with scale so close-ups keep fine anime lines; boil is capped
const W = (s) => (s <= 1 ? s : s ** 0.5), B = (s) => Math.min(s, 1.4);
export const LINE = {
  outer: (s) => ({ color: C.ink, width: 3.4 * W(s), weight: 0.75, taper: 0.2, boil: 0.35 * B(s), boilMs: 125 }),
  inner: (s) => ({ color: C.ink, width: 1.8 * W(s), weight: 0.6, taper: 0.5, boil: 0.25 * B(s), boilMs: 125 }),
  detail: (s) => ({ color: C.ink, width: 1.2 * W(s), weight: 0.5, taper: 0.7, boil: 0.2 * B(s), boilMs: 125 }),
  color: (col, s, w = 1.4) => ({ color: col, width: w * W(s), weight: 0.4, taper: 0.6 }),
};
export const CEL = (shade, s, { shade2, rim = '#A9B8E6', d = 9, d2 = 3, rimD = 2.2 } = {}) => ({ shade, shadeDist: d * s, ...(shade2 ? { shade2, shade2Dist: d2 * s } : {}), rim, rimDist: rimD * s });
/** Pick the key drawing for a yaw angle (deg): returns {view, mirror}. */
export function viewOf(yaw) {
  let y = ((yaw % 360) + 540) % 360 - 180; // -180..180
  const mirror = y < 0; const a = Math.abs(y);
  const view = a < 22.5 ? 'front' : a < 67.5 ? 'tq' : a < 135 ? 'side' : 'back';
  return { view, mirror: view === 'front' || view === 'back' ? false : mirror };
}
