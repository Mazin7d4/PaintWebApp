// SCENE 01 — DEAD SUN (0:00–0:10)
import { bake, still, resetUid } from '../lib/anim.mjs';
import { drawRin } from '../lib/rin.mjs';
import { RUN, POSE, swapLegs } from '../lib/poses.mjs';
import { skylineLayer, railBridge, eclipse, tower } from '../lib/city.mjs';
import { layer, rect, W, H } from '../lib/proj.mjs';
import { shot } from '../lib/shot.mjs';
import { glow, grade, ash, beam } from '../lib/fx.mjs';
import { rng, rectP, poly } from '../lib/geom.mjs';

const SKY = () => layer('sky', [rect(-3000, -3000, 9000, 7000, { gradient: { type: 'linear', x0: 0, y0: -1500, x1: 0, y1: 1100, stops: [{ offset: 0, color: '#04040C' }, { offset: 0.55, color: '#141238' }, { offset: 0.8, color: '#2A2350' }, { offset: 1, color: '#3B3060' }] } })], { parallax: 0.05 });
const fog = (y, o, par) => layer('fog', [rect(-4000, y - 200, 10000, 400, { gradient: { type: 'linear', x0: 0, y0: y - 200, x1: 0, y1: y + 200, stops: [{ offset: 0, color: 'rgba(110,100,170,0)' }, { offset: 0.5, color: `rgba(110,100,170,${o})` }, { offset: 1, color: 'rgba(110,100,170,0)' }] } })], { parallax: par, blend: 'screen' });
function cityLayers() {
  const far = layer('city far', still(skylineLayer({ seed: 1, n: 26, x0: -2600, x1: 4600, base: 860, hMin: 200, hMax: 520, wMin: 60, wMax: 120, col: '#3A3462', win: '#2E2852', litP: 0.01 })), { parallax: 0.2 });
  const midParts = skylineLayer({ seed: 2, n: 18, x0: -2400, x1: 4400, base: 940, hMin: 300, hMax: 700, wMin: 90, wMax: 170, col: '#221E40', win: '#18152E', litP: 0.03 });
  // the cathedral: tallest spire, amber beam from its top
  const cath = tower(rng(9), 1180, 940, 230, 560, '#1A1733', '#100E22', 0.0);
  const mid = layer('city mid', still([...midParts, ...cath, ...railBridge({ x: -300, y: 420 }, { x: 640, y: 380 }, 90, '#221E40'), ...railBridge({ x: 1500, y: 360 }, { x: 2500, y: 430 }, 110, '#221E40')]), { parallax: 0.4 });
  const near = layer('city near', still([...skylineLayer({ seed: 3, n: 12, x0: -2200, x1: 4200, base: 1100, hMin: 350, hMax: 900, wMin: 150, wMax: 260, col: '#100E20', win: '#0A0916', litP: 0.02 }), ...railBridge({ x: -900, y: 470 }, { x: 900, y: 540 }, 140, '#100E20', 16)]), { parallax: 0.7 });
  return { far, mid, near };
}
const ASH = (par = 0.6) => layer('ash rising', [ash({ x: 960, y: 1400, count: 120, speed: 1700, spread: 160, life: 8000, size: 2.2, color: 'rgba(190,190,215,0.7)', seed: 3 }), ash({ x: 300, y: 1400, count: 60, speed: 1500, spread: 120, life: 9000, size: 3, color: 'rgba(160,160,190,0.6)', seed: 7 })], { parallax: par });

// 01a — black; a gold line; pull back to the eclipse.
export function s01a() {
  resetUid();
  const D = 3200;
  const ecl = layer('eclipse', still(eclipse(960, 380, 170)), { parallax: 1 });
  return shot('01a dead sun', D, [SKY(), ecl, ASH(0.3)],
    { camera: [{ t: 0, camera: { x: 160, y: -170, zoom: 14 } }, { t: 700, camera: { x: 160, y: -170, zoom: 14 } }, { t: 3000, camera: { x: 0, y: -40, zoom: 1.6 }, easing: 'easeInOutCubic' }, { t: D, camera: { x: 0, y: -30, zoom: 1.55 } }],
      post: [grade('#000000', 'source-over', [[0, 1], [500, 1], [1100, 0]], 'fade from black')], vig: 0.8 });
}
// 01b — the city: towers, rail bridges, ash drifting up, an amber beam from the cathedral.
export function s01b() {
  resetUid();
  const D = 4000;
  const { far, mid, near } = cityLayers();
  const ecl = layer('eclipse', still(eclipse(1300, 130, 110)), { parallax: 0.1 });
  const bm = layer('amber beam', beam(500, D, { a: { x: 1180, y: 250 }, b: { x: 1330, y: -1800 }, width: 26, grow: 900, color: 'rgba(255,180,60,0.55)' }), { parallax: 0.4, blend: 'screen' });
  const bglow = layer('beam glow', [{ ...glow(1180, 250, 300, 'rgba(255,170,50,0.6)'), keyframes: [{ t: 0, transform: { opacity: 0 } }, { t: 500, transform: { opacity: 0 } }, { t: 1200, transform: { opacity: 1 }, easing: 'easeOut' }] }], { parallax: 0.4, blend: 'screen' });
  return shot('01b city', D, [SKY(), ecl, far, fog(820, 0.35, 0.25), mid, bglow, bm, fog(900, 0.3, 0.5), near, ASH(0.8)],
    { camera: [{ t: 0, camera: { x: -500, y: -150, zoom: 1.0 } }, { t: 3000, camera: { x: 200, y: -120, zoom: 1.05 }, easing: 'easeInOut' }, { t: D, camera: { x: 520, y: 40, zoom: 1.6 }, easing: 'easeInCubic' }], post: [grade('#1B2A66', 'multiply', [[0, 0.2]])], vig: 0.75 });
}
// 01c — fast push; a tiny silhouette runs the rooftops and leaps a gap.
export function s01c() {
  resetUid();
  const D = 3000;
  const { far, mid, near } = cityLayers();
  const roofs = layer('rooftops', still([{ d: poly([{ x: -1200, y: 760 }, { x: 700, y: 760 }, { x: 760, y: 700 }, { x: 820, y: 760 }, { x: 900, y: 760 }, { x: 900, y: 1600 }, { x: -1200, y: 1600 }]), fill: '#07060E' }, { d: poly([{ x: 1150, y: 790 }, { x: 3600, y: 790 }, { x: 3600, y: 1600 }, { x: 1150, y: 1600 }]), fill: '#07060E' }, { d: rectP(1300, 640, 50, 150), fill: '#07060E' }, { d: rectP(2100, 600, 70, 190), fill: '#07060E' }]), { parallax: 1 });
  const run = [];
  let t = 0, x = -300;
  for (let i = 0; t < 1500; i++, t += 83.3) { const c = RUN[i % 4]; run.push({ t, pose: { ...POSE.stand, ...(Math.floor(i / 4) % 2 ? swapLegs(c) : c), x, ground: 760, s: 0.32, f: 0.7, sil: 1, dagger: 1, ribbonX: -1.2 }, on: 2, ease: 'lin' }); x += 50; }
  run.push({ t: 1500, pose: { ...POSE.stand, ...POSE.antic, x: x, ground: 760, s: 0.32, ribbonX: -1 }, on: 2, ease: 'lin' });
  run.push({ t: 1620, pose: { ...POSE.leap, x: x + 140, y: 600, s: 0.32 }, on: 1, ease: 'out' });
  run.push({ t: 2100, pose: { ...POSE.leap, x: x + 520, y: 640, s: 0.32 }, on: 2, ease: 'lin' });
  run.push({ t: 2300, pose: { ...POSE.crouch, x: x + 640, ground: 790, s: 0.32, squash: 0.8 }, on: 1, ease: 'in' });
  run.push({ t: D, pose: { ...POSE.guard, x: x + 700, ground: 790, s: 0.32 }, on: 2, ease: 'out' });
  const rin = bake(drawRin, run, D);
  rin.forEach((o) => o.drawings.forEach((d) => { if (d.fill) d.fill = { color: '#05040A' }; if (d.stroke) d.stroke = { ...d.stroke, color: '#05040A' }; }));
  const ecl = layer('eclipse', still(eclipse(1300, 130, 110)), { parallax: 0.1 });
  return shot('01c rooftops', D, [SKY(), ecl, far, fog(820, 0.35, 0.25), mid, layer('beam', beam(0, D, { a: { x: 1180, y: 250 }, b: { x: 1330, y: -1800 }, width: 26, grow: 1, color: 'rgba(255,180,60,0.55)' }), { parallax: 0.4, blend: 'screen' }), fog(900, 0.3, 0.5), near, layer('rim', [glow(1100, 500, 900, 'rgba(255,170,70,0.18)')], { parallax: 0.6, blend: 'screen' }), roofs, layer('rin', rin), ASH(1.1)],
    { camera: [{ t: 0, camera: { x: -900, y: 100, zoom: 1.5 } }, { t: 1500, camera: { x: -150, y: 80, zoom: 1.7 }, easing: 'easeIn' }, { t: 2300, camera: { x: 350, y: 60, zoom: 1.75 }, easing: 'easeOut' }, { t: D, camera: { x: 420, y: 40, zoom: 1.85 }, easing: 'easeOut' }], post: [grade('#1B2A66', 'multiply', [[0, 0.22]])], vig: 0.8 });
}

// 01d — title card.
import { txt } from '../lib/proj.mjs';
export function s01d() {
  resetUid();
  const D = 3000;
  const fade = (t0) => [{ t: 0, transform: { opacity: 0 } }, { t: t0, transform: { opacity: 0 } }, { t: t0 + 500, transform: { opacity: 1 }, easing: 'easeOut' }, { t: D - 400, transform: { opacity: 1 } }, { t: D, transform: { opacity: 0 } }];
  const title = [
    { ...txt('ECLIPSE  THIEF', 960, 470, 150, '#E9D9B0', { font: 'Cinzel, serif', fontWeight: 700, shadow: { color: 'rgba(255,170,60,0.8)', blur: 30, offsetX: 0, offsetY: 0 } }), keyframes: fade(200) },
    { ...txt('EPISODE 01  —  BORROWED DAWN', 960, 610, 46, '#B9BFD6', { font: 'Cinzel, serif' }), keyframes: fade(900) },
    { type: 'shape', shape: 'rect', id: 'tl', x: 560, y: 540, w: 800, h: 3, fill: { color: '#E0AA45' }, pivot: { x: 960, y: 541 }, keyframes: [{ t: 0, transform: { scaleX: 0 } }, { t: 500, transform: { scaleX: 0 } }, { t: 1300, transform: { scaleX: 1 }, easing: 'easeInOutCubic' }, { t: D - 400, transform: { scaleX: 1, opacity: 1 } }, { t: D, transform: { opacity: 0 } }] },
  ];
  return shot('01d title', D, [layer('bg', [rect(-100, -100, W + 200, H + 200, '#05040A')], { parallax: 0 }), layer('eclipse', still(eclipse(960, 540, 300)), { parallax: 0, filter: 'brightness(0.35)' }), layer('ash', [ash({ x: 960, y: 1200, count: 60, speed: 900, spread: 120, life: 9000, size: 2, color: 'rgba(255,200,120,0.5)', seed: 5 })], { parallax: 0 }), layer('title', title, { parallax: 0 })], { vig: 0.8 });
}
