// Close-up hand drawings (dedicated action drawings where the body rig is too coarse).
import { poly, shape, S, smooth, limb, polyline, polar, add, sub, mul, norm, perp, mix, lerp, ell, strand, D2R } from './geom.mjs';
import { C } from './pal.mjs';
const ink = (w) => ({ color: C.ink, width: w });
/** Right hand gripping the prism dagger, seen from the back of the hand. grip 0..1 tightens the fingers. */
export function drawGripCU(p) {
  const { x = 960, y = 560, s = 1, rot = -30, grip = 0, glint = 0, tremble = 0, time = 0 } = p;
  const parts = [];
  const ax = { x: Math.cos(rot * D2R), y: Math.sin(rot * D2R) }, ay = perp(ax);
  const jx = Math.sin(time / 21) * tremble * 3, jy = Math.cos(time / 17) * tremble * 3;
  const P = (u, v) => ({ x: x + jx + (ax.x * u + ay.x * v) * s, y: y + jy + (ax.y * u + ay.y * v) * s });
  // handle runs along +u axis
  parts.push({ k: 'handle', d: limb(P(-420, 0), P(140, 0), 46 * s, 46 * s), fill: C.handle, stroke: ink(5 * s), z: 0 });
  parts.push({ k: 'handleW', d: [...Array(7)].map((_, i) => polyline([P(-380 + i * 70, -44), P(-350 + i * 70, 44)])).join(''), stroke: { color: '#1E140D', width: 6 * s }, z: 0.1 });
  // guard + blade
  parts.push({ k: 'guard', d: poly([P(150, -120), P(200, -100), P(200, 100), P(150, 120), P(130, 0)]), fill: C.guard, stroke: ink(5 * s), z: 0.2 });
  parts.push({ k: 'guardS', d: poly([P(150, 20), P(200, 30), P(200, 100), P(150, 120)]), fill: C.goldShade, z: 0.21 });
  const sh = p.shatter ?? 0;
  if (sh <= 0) {
    parts.push({ k: 'blade', d: poly([P(200, -64), P(620, -44), P(800, 0), P(620, 44), P(200, 64)]), fill: C.prismMid, stroke: ink(5 * s), z: 0.3 });
    parts.push({ k: 'bladeF', d: poly([P(200, -64), P(620, -44), P(800, 0), P(200, 0)]), fill: C.prism, z: 0.31 });
    parts.push({ k: 'bladeD', d: poly([P(200, 30), P(620, 28), P(800, 0), P(620, 44), P(200, 64)]), fill: C.prismDeep, z: 0.32 });
    if (p.crack) parts.push({ k: 'crk', d: polyline([P(330, -60), P(380, -10), P(350, 20), P(420, 60)]) + polyline([P(380, -10), P(520, -20), P(560, 10)]), stroke: { color: '#FFFFFF', width: 6 * s * p.crack }, z: 0.33 });
  } else {
    // three shards fly apart (prism splinters)
    const shards = [[[200, -64], [380, -58], [350, 10], [200, 0]], [[380, -58], [620, -44], [800, 0], [560, 10], [350, 10]], [[200, 0], [350, 10], [560, 10], [620, 44], [200, 64]]];
    const vel = [[-60, -380, -40], [520, -260, 70], [180, 340, 110]];
    shards.forEach((q, i) => {
      const cx = q.reduce((a, v) => a + v[0], 0) / q.length, cy = q.reduce((a, v) => a + v[1], 0) / q.length;
      const [vu, vv, rr] = vel[i]; const ang = rr * sh * Math.PI / 180;
      const pts = q.map(([u, v]) => { const du = u - cx, dv = v - cy; return P(cx + vu * sh + du * Math.cos(ang) - dv * Math.sin(ang), cy + vv * sh + du * Math.sin(ang) + dv * Math.cos(ang)); });
      parts.push({ k: 'sh' + i, d: poly(pts), fill: i === 1 ? C.prism : C.prismMid, stroke: ink(5 * s), z: 0.3 + i * 0.01 });
    });
    parts.push({ k: 'stub', d: poly([P(200, -64), P(240, -40), P(225, 10), P(250, 50), P(200, 64)]), fill: C.prismDeep, stroke: ink(5 * s), z: 0.34 });
  }
  if (glint > 0) { const g = P(200 + glint * 560, -10); parts.push({ k: 'glint', d: poly([polar(g, -90, 70 * s), polar(g, 0, 16 * s), polar(g, 90, 70 * s), polar(g, 180, 16 * s)]) + poly([polar(g, 0, 90 * s), polar(g, 90, 12 * s), polar(g, 180, 90 * s), polar(g, -90, 12 * s)]), fill: '#FFFFFF', z: 0.4 }); }
  // back of hand (glove) — knuckles along the handle, wrist toward -u,+v
  const tight = grip;
  parts.push({ k: 'wrist', d: limb(P(-260, 330), P(-120, 120), 110 * s, 100 * s), fill: C.coat, stroke: ink(5 * s), z: 1 });
  parts.push({ k: 'cuff', d: limb(P(-215, 262), P(-175, 200), 118 * s, 112 * s), fill: C.gold, stroke: ink(4 * s), z: 1.1 });
  parts.push({ k: 'back', d: shape([P(-330, 40), P(-300, -90 + tight * 10), S(...xy(P(-60, -110 + tight * 12))), P(60, -80), P(80, 30), P(-40, 170), P(-260, 190)], 0.9), fill: C.glove, stroke: ink(5 * s), z: 2 });
  parts.push({ k: 'backS', d: poly([P(-330, 40), P(-260, 190), P(-40, 170), P(-120, 90)]), fill: C.gloveShade, z: 2.05 });
  parts.push({ k: 'tendon', d: [0, 1, 2, 3].map((i) => polyline([P(-230 + i * 5, 120 - i * 10), P(-300 + i * 85, -70 + tight * 8)])).join(''), stroke: { color: '#4A3830', width: 3 * s }, z: 2.1 });
  // fingers: 4 curled over the handle; tips (skin, fingerless) wrap toward the viewer as grip increases
  for (let i = 0; i < 4; i++) {
    const u0 = -290 + i * 88;
    const k0 = P(u0 + 20, -80 + tight * 8), k1 = P(u0 + 28, -20 + 40 * (1 - tight)), tip = P(u0 + 30 + tight * 6, 70 - 40 * tight);
    parts.push({ k: 'f' + i, d: limb(k0, k1, 42 * s, 40 * s), fill: C.glove, stroke: ink(5 * s), z: 3 + i * 0.01 });
    parts.push({ k: 'ft' + i, d: limb(k1, tip, 38 * s, 34 * s), fill: C.skin, stroke: ink(4.5 * s), z: 3.05 + i * 0.01 });
    parts.push({ k: 'fs' + i, d: poly([mix(k1, tip, 0.1), mix(k1, tip, 0.9), add(mix(k1, tip, 0.9), mul(ax, 26 * s)), add(mix(k1, tip, 0.1), mul(ax, 30 * s))]), fill: C.skinShade, z: 3.06 + i * 0.01 });
    parts.push({ k: 'kn' + i, d: polyline([add(k0, mul(ax, -20 * s)), add(k0, mul(ax, 22 * s))]), stroke: { color: '#5A463C', width: 4 * s }, z: 3.07 + i * 0.01 });
  }
  // thumb wraps over from below
  parts.push({ k: 'thumb', d: limb(P(-80, 160), P(30 + tight * 30, 60 - tight * 20), 46 * s, 36 * s), fill: C.glove, stroke: ink(5 * s), z: 3.5 });
  parts.push({ k: 'thumbT', d: limb(P(30 + tight * 30, 60 - tight * 20), P(110 + tight * 20, 20 - tight * 10), 36 * s, 30 * s), fill: C.skin, stroke: ink(4.5 * s), z: 3.55 });
  return parts;
}
const xy = (q) => [q.x, q.y];
