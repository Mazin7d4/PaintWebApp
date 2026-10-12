// Pose library for RIN (facing right by default; mirror() flips to face left). Swappable key drawings.
export const POSE = {
  stand: { lean: 0, f: 0.35, aL1: 80, aL2: 100, aR1: 100, aR2: 80, lL1: 84, lL2: 92, lR1: 97, lR2: 90, ftL: 10, ftR: 10, squash: 1, coat: 0, hairX: 0, hairY: 0, handL: 'fist', handR: 'grip', dagAng: -70 },
  guard: { lean: 10, f: 0.5, aR1: 25, aR2: -35, dagAng: -20, aL1: 130, aL2: 170, handL: 'open', lL1: 55, lL2: 105, lR1: 125, lR2: 95, ftL: 5, ftR: 0, squash: 0.94, brow: -0.7, eye: 0.85 },
  crouch: { lean: 22, f: 0.5, aR1: 40, aR2: -10, dagAng: -10, aL1: 150, aL2: 110, lL1: 20, lL2: 130, lR1: 140, lR2: 70, ftL: 5, ftR: 5, squash: 0.88, coat: -15 },
  antic: { lean: 34, f: 0.55, aR1: 160, aR2: 120, dagAng: 150, aL1: 120, aL2: 90, lL1: 5, lL2: 140, lR1: 150, lR2: 60, ftL: 0, ftR: 10, squash: 0.82, coat: -10, hairY: 0.6, eye: 0.8, brow: -1 },
  leap: { lean: 40, f: 0.6, aR1: -20, aR2: -40, dagAng: -30, aL1: 170, aL2: 180, handL: 'open', lL1: 40, lL2: 100, lR1: 160, lR2: 180, ftL: 10, ftR: 190, squash: 1.08, coat: -70, coatOpen: 1, hairX: -1.4, hairY: 0.3, ribbonX: -1, ribbonY: 0.1, brow: -1, eye: 0.9, mouth: 0.3 },
  slash: { lean: 20, f: 0.7, aR1: -10, aR2: 20, dagAng: 40, aL1: 160, aL2: 200, handL: 'open', lL1: 50, lL2: 110, lR1: 140, lR2: 120, ftL: 0, ftR: 10, squash: 0.95, coat: -50, hairX: -1, brow: -1, eye: 0.75, mouth: 0.4 },
  follow: { lean: 25, f: 0.8, aR1: 60, aR2: 110, dagAng: 140, aL1: 200, aL2: 210, lL1: 45, lL2: 115, lR1: 135, lR2: 110, ftL: 0, ftR: 10, squash: 0.93, coat: 40, hairX: 1, brow: -1, eye: 0.75 },
  dodge: { lean: -28, f: 0.1, aR1: 200, aR2: 230, dagAng: 210, aL1: -30, aL2: -60, handL: 'open', lL1: 120, lL2: 70, lR1: 70, lR2: 110, ftL: 170, ftR: 10, squash: 0.95, coat: 60, coatOpen: 1, hairX: 1.3, hairY: -0.4, eye: 1.2, pupil: 0.6, brow: 0.8, mouth: 0.5 },
  block: { lean: -12, f: 0.6, aR1: -40, aR2: -100, dagAng: -150, aL1: 20, aL2: -50, handL: 'open', lL1: 60, lL2: 95, lR1: 130, lR2: 85, ftL: 0, ftR: 0, squash: 0.9, coat: 30, hairX: 0.8, brow: -0.6, eye: 0.7, mouth: 0.6 },
  thrown: { lean: -60, f: 0.3, aR1: 190, aR2: 170, dagAng: 200, aL1: -60, aL2: -40, lL1: -10, lL2: 20, lR1: 30, lR2: 70, ftL: 0, ftR: 0, squash: 1.05, coat: 80, coatOpen: 1, hairX: 1.6, hairY: 0.6, eye: 0.3, brow: 1, mouth: 0.7 },
  down: { lean: -85, f: 0.3, aR1: 170, aR2: 150, aL1: 20, aL2: 60, lL1: -5, lL2: 10, lR1: 10, lR2: 5, ftL: -80, ftR: -80, squash: 1, coat: 0, hairX: 0.6, hairY: 0.6, eye: 0.2 },
  kneel: { lean: 18, f: 0.35, aR1: 120, aR2: 140, aL1: 70, aL2: 100, lL1: 10, lL2: 100, lR1: 110, lR2: 160, ftL: 0, ftR: 180, squash: 0.9, coat: 0, eye: 0.8, brow: 0.3, mouth: 0.5 },
  rise: { lean: 8, f: 0.4, aR1: 110, aR2: 100, aL1: 75, aL2: 105, lL1: 60, lL2: 110, lR1: 110, lR2: 100, ftL: 0, ftR: 0, squash: 0.95, eye: 0.85, brow: -0.3, mouth: 0.4 },
  catch: { lean: -6, f: 0.4, aL1: -40, aL2: -70, handL: 'open', aR1: 120, aR2: 140, dagAng: 160, lL1: 80, lL2: 95, lR1: 100, lR2: 90, ftL: 0, ftR: 0, squash: 1, eye: 1.1, brow: 0.5, mouth: 0.25, core: 1, lookY: -0.6, hTilt: -14 },
  hold: { lean: 2, f: 0.35, aL1: 50, aL2: -30, handL: 'open', aR1: 105, aR2: 70, dagAng: -60, lL1: 82, lL2: 92, lR1: 98, lR2: 90, ftL: 0, ftR: 0, squash: 1, core: 1, eye: 0.7, brow: 0.6, smile: 0.4, lookX: 0.5, lookY: 0.3, hTilt: 6 },
};
/** Run cycle (facing right) as 4 drawings: contact, down, pass, up (repeat with legs swapped). */
export const RUN = [
  { lean: 18, lL1: 30, lL2: 70, lR1: 140, lR2: 120, ftL: 0, ftR: 60, aR1: 140, aR2: 60, aL1: 40, aL2: -20, squash: 1, hairX: -0.8, coat: -40 },
  { lean: 22, lL1: 70, lL2: 110, lR1: 120, lR2: 160, ftL: 0, ftR: 90, aR1: 120, aR2: 40, aL1: 60, aL2: 0, squash: 0.93, hairX: -0.6, hairY: 0.3, coat: -30 },
  { lean: 20, lL1: 100, lL2: 95, lR1: 60, lR2: 150, ftL: 0, ftR: 60, aR1: 90, aR2: 30, aL1: 90, aL2: 30, squash: 1, hairX: -0.8, coat: -45 },
  { lean: 16, lL1: 130, lL2: 120, lR1: 30, lR2: 90, ftL: 50, ftR: 0, aR1: 60, aR2: -10, aL1: 120, aL2: 50, squash: 1.04, hairX: -1, hairY: -0.2, coat: -50 },
];
export const swapLegs = (p) => ({ ...p, lL1: p.lR1, lL2: p.lR2, lR1: p.lL1, lR2: p.lL2, ftL: p.ftR, ftR: p.ftL, aL1: p.aR1, aL2: p.aR2, aR1: p.aL1, aR2: p.aL2 });
/** Mirror a right-facing pose to face left. */
export function mirror(p) {
  const o = { ...p };
  for (const k of ['lean', 'hTilt', 'spin']) if (k in o) o[k] = -o[k];
  for (const k of ['aL1', 'aL2', 'aR1', 'aR2', 'lL1', 'lL2', 'lR1', 'lR2', 'ftL', 'ftR', 'dagAng']) if (k in o) o[k] = 180 - o[k];
  for (const k of ['f', 'hairX', 'coat', 'ribbonX', 'lookX']) if (k in o) o[k] = -o[k];
  return o;
}
/** Key list helper: [[t, poseName|object, extra, on, ease]] */
export function keys(list) {
  return list.map(([t, pose, extra = {}, on = 2, ease = 'snap']) => ({ t, pose: { ...(typeof pose === 'string' ? POSE[pose] : pose), ...extra }, on, ease }));
}
