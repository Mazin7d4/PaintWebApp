import { P, W, H, layer, project, rect, ellipse, path, text, inkStroke, rig, resetIds, starPoly } from './lib.mjs';
import { hanaParts, taroParts, bubble, during, heartD, sweatDrop, angerMark } from './characters.mjs';
import { expr, rooftop, speedLines, focusLines, shake, tint, caption } from './kit.mjs';
import { hearts } from './scenes1.mjs';

const T = (t, x, y, s, extra = {}, easing) => ({ t, transform: { x, y, scaleX: s, scaleY: s, rotation: 0, opacity: 1, ...extra }, ...(easing ? { easing } : {}) });
const poof = (x, y, t) => [0, 1, 2, 3, 4, 5].map((i) => {
  const a = (i / 6) * Math.PI * 2;
  return { ...ellipse(x, y, 70, 60, P.white, { stroke: P.ink, width: 4 }), pivot: { x, y }, keyframes: [
    { t: 0, transform: { opacity: 0, scaleX: 0.1, scaleY: 0.1 } }, { t, transform: { opacity: 0, scaleX: 0.2, scaleY: 0.2 } },
    { t: t + 120, transform: { opacity: 1, scaleX: 1, scaleY: 1, x: Math.cos(a) * 40, y: Math.sin(a) * 40 }, easing: 'easeOut' },
    { t: t + 520, transform: { opacity: 0, scaleX: 1.4, scaleY: 1.4, x: Math.cos(a) * 90, y: Math.sin(a) * 90 }, easing: 'easeOut' }] };
});
const bentoBox = (color) => [rect(-38, -26, 76, 52, color, { stroke: P.ink, width: 4, radius: 8 }), rect(-38, -6, 76, 6, P.white), rect(-38, -26, 76, 14, P.white, { opacity: 0.25, radius: 8 })];

// ---------------------------------------------------------------- S3 GAGS
export function s3Gags() {
  resetIds('s3_');
  const D = 18000;
  const bg = rooftop(33, { w: 1600 });
  const hana = rig(hanaParts(), [
    T(0, 700, 650, 1.3, { opacity: 0 }), T(500, 700, 650, 1.3, { opacity: 0 }), T(520, 700, 650, 1.3), T(700, 700, 650, 1.3, { scaleY: 1.42, scaleX: 1.2 }, 'easeOut'), T(900, 700, 650, 1.3, {}, 'easeOutBack'),
    T(3000, 700, 650, 1.3), T(3150, 760, 650, 1.3, { rotation: 8 }, 'easeOut'), T(4800, 760, 650, 1.3, { rotation: 8 }),
    T(5000, 700, 650, 1.3, {}, 'easeOut'),
    T(5500, 700, 650, 1.3), T(5650, 690, 650, 1.3, { rotation: -12, scaleX: 1.4, scaleY: 1.2 }, 'easeOut'), T(5900, 700, 650, 1.3, { rotation: 6 }, 'easeOutBack'), T(6300, 700, 650, 1.3, {}, 'easeOut'),
    T(12000, 700, 650, 1.3), T(12020, 700, 650, 1.3, { opacity: 0 }), T(13000, 200, 650, 1.3, { opacity: 0 }), T(13020, 200, 650, 1.3), T(18000, 200, 650, 1.3),
  ], expr(D, [
    { from: 0, to: 1000, eyes: 'Happy', blush: true }, { from: 1000, to: 3000, eyes: 'Happy', blush: true, mouth: 'talk' },
    { from: 3000, to: 5500, eyes: 'Heart', blush: true, mouth: 'Open' }, { from: 5500, to: 9000, eyes: 'Yan', shade: true, mouth: 'Grin' },
    { from: 9000, to: 13000, eyes: 'Happy', mouth: 'Smile', blush: true }, { from: 13000, to: 15500, eyes: 'Yan', shade: true, mouth: 'talk' }, { from: 15500, eyes: 'Yan', shade: true, mouth: 'Grin' },
  ]));
  const taro = rig(taroParts(), [
    T(0, 1000, 650, 1.25), T(1000, 1000, 650, 1.25), T(1150, 1020, 620, 1.25, { scaleY: 1.4, scaleX: 1.15, rotation: 8 }, 'easeOut'), T(1400, 1010, 650, 1.25, { rotation: 5 }, 'easeOutBounce'),
    T(3100, 1010, 650, 1.25, { rotation: 5 }), T(3250, 1050, 650, 1.25, { rotation: 14 }, 'easeOut'), T(5000, 1000, 650, 1.25, {}, 'easeInOut'),
    T(10800, 1000, 650, 1.25), ...[0, 1, 2, 3].map((i) => T(11000 + i * 420, 1000 - (i + 1) * 120, i % 2 ? 650 : 638, 1.25, { rotation: i % 2 ? 3 : -3 }, 'easeInOut')),
    T(13000, 520, 650, 1.25), T(13300, 520, 650, 1.25), T(13450, 560, 440, 1.25, { scaleY: 1.55, scaleX: 1.05, rotation: 10 }, 'easeOutCubic'), T(14200, 600, 470, 1.25, { rotation: 12 }), T(14600, 640, 650, 1.25, { scaleY: 1.1, scaleX: 1.4 }, 'easeInCubic'), T(14900, 640, 650, 1.25, {}, 'easeOutBack'),
  ], expr(D, [
    { from: 0, to: 1000, eyes: 'Open', mouth: 'Smile' }, { from: 1000, to: 3000, eyes: 'Shock', mouth: 'Wavy' }, { from: 3000, to: 5500, eyes: 'Open', mouth: 'talk' },
    { from: 5500, to: 6700, eyes: 'Shock', mouth: 'Open' }, { from: 6700, to: 9200, eyes: 'X', mouth: 'yell' }, { from: 9200, to: 13300, eyes: 'Open', mouth: 'Wavy' },
    { from: 13300, to: 15000, eyes: 'X', mouth: 'yell' }, { from: 15000, eyes: 'Shock', mouth: 'Wavy' },
  ]));
  // Mika's bento: in Taro's hand, then yeeted to a sky twinkle
  const bento = bentoBox('#5DA9E9').map((o) => ({ ...o, pivot: { x: 0, y: 0 }, keyframes: [
    { t: 0, transform: { x: 1075, y: 470, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 } }, { t: 5500, transform: { x: 1075, y: 470 } },
    { t: 5650, transform: { x: 820, y: 430, rotation: -90 }, easing: 'easeOut' },
    { t: 7000, transform: { x: 1180, y: 40, rotation: 900, scaleX: 0.15, scaleY: 0.15, opacity: 1 }, easing: 'easeOutCubic' }, { t: 7050, transform: { x: 1180, y: 40, opacity: 0, scaleX: 0.1, scaleY: 0.1 } }] }));
  const twinkle = { ...path(starPoly(0, 0, 34, 10, 4), P.white, { shadow: { color: P.star, blur: 18, offsetX: 0, offsetY: 0 } }), pivot: { x: 0, y: 0 }, keyframes: [
    { t: 0, transform: { x: 1180, y: 40, opacity: 0, scaleX: 0, scaleY: 0 } }, { t: 7000, transform: { x: 1180, y: 40, opacity: 0, scaleX: 0, scaleY: 0 } },
    { t: 7200, transform: { x: 1180, y: 40, opacity: 1, scaleX: 1.5, scaleY: 1.5, rotation: 90 }, easing: 'easeOutBack' }, { t: 7800, transform: { x: 1180, y: 40, opacity: 0, scaleX: 0, scaleY: 0, rotation: 180 }, easing: 'easeIn' }] };
  const spoon = [ellipse(0, 0, 26, 18, '#F4A261', { stroke: P.ink, width: 3 }), rect(-60, -4, 48, 8, P.white, { stroke: P.ink, width: 3, radius: 4 })].map((o) => ({ ...o, pivot: { x: 0, y: 0 }, keyframes: [
    { t: 0, transform: { x: 870, y: 390, opacity: 0 } }, { t: 3000, transform: { x: 870, y: 390, opacity: 0 } }, { t: 3150, transform: { x: 940, y: 300, opacity: 1, rotation: -10 }, easing: 'easeOutBack' },
    { t: 4800, transform: { x: 950, y: 296, opacity: 1, rotation: -10 } }, { t: 5000, transform: { x: 870, y: 390, opacity: 0 } }] }));
  // chibi inset
  const chibiParts = rig(hanaParts({ arms: 'up' }), [T(0, 190, 690, 0.75, { opacity: 0 }), T(7800, 190, 690, 0.75, { opacity: 0 }), T(7820, 190, 760, 0.5, {}), T(8100, 190, 690, 0.8, { scaleX: 0.85, scaleY: 0.72 }, 'easeOutBack'), T(8400, 190, 690, 0.78, {}, 'easeOutBack'), T(10300, 190, 690, 0.78), T(10500, 190, 900, 0.78, {}, 'easeIn'), T(10520, 190, 900, 0.78, { opacity: 0 })],
    expr(D, [{ from: 0, eyes: 'Happy', blush: true, mouth: 'Open' }]));
  const insetBg = [{ ...ellipse(190, 560, 330, 330, P.hair, { stroke: P.ink, width: 6 }), pivot: { x: 190, y: 560 }, keyframes: [{ t: 0, transform: { opacity: 0, scaleX: 0, scaleY: 0 } }, { t: 7700, transform: { opacity: 0, scaleX: 0, scaleY: 0 } }, { t: 8000, transform: { opacity: 1, scaleX: 1, scaleY: 1 }, easing: 'easeOutBack' }, { t: 10300, transform: { opacity: 1, scaleX: 1, scaleY: 1 } }, { t: 10500, transform: { opacity: 0, scaleX: 0, scaleY: 0 }, easing: 'easeIn' }] }];
  const fx = [...poof(700, 450, 450), ...poof(700, 450, 11950), ...poof(200, 450, 12950), ...during(sweatDrop(1090, 220, 1.4), 1000, 5000), ...during(sweatDrop(700, 180, 1.6), 13300, D)];
  const talk = [
    ...bubble(470, 110, 340, 100, 'Say aaah~!', [640, 200], { from: 1000, to: 3200, size: 42 }),
    ...bubble(1000, 100, 470, 110, 'I-I can feed\nmyself...', [1010, 180], { from: 3300, to: 5400, size: 34 }),
    ...bubble(990, 110, 360, 110, 'MY LUNCH?!', [1010, 190], { from: 6800, to: 9300, size: 52, shout: true }),
    ...bubble(470, 300, 380, 100, 'Oops~ the wind!', [300, 380], { from: 8200, to: 10400, size: 38 }),
    ...bubble(440, 100, 520, 110, 'Going somewhere,\nSenpai~?', [250, 190], { from: 13300, to: 17800, size: 38, color: P.yan }),
  ];
  const cam = [{ t: 0, camera: { x: 0, y: 0, zoom: 1 } }, { t: 5500, camera: { x: 0, y: 0, zoom: 1 } }, { t: 6400, camera: { x: 180, y: -80, zoom: 1.15 }, easing: 'easeInOutCubic' }, { t: 7600, camera: { x: 0, y: 0, zoom: 1 }, easing: 'easeInOut' },
    { t: 13300, camera: { x: -150, y: 0, zoom: 1.1 }, easing: 'easeInOutCubic' }, ...shake(13350, 14000, 10, { x: -150, y: 0, zoom: 1.1 }), { t: 17000, camera: { x: -150, y: -40, zoom: 1.25 }, easing: 'easeInOut' }, { t: D, camera: { x: -150, y: -40, zoom: 1.25 } }];
  return project('S3 Gags', D, [
    ...bg.layers, tint(P.yan, [[0, 0], [13250, 0], [13400, 0.35], [D, 0.35]]),
    layer('Taro', [...taro, ...bento, twinkle]), layer('Hana', [...hana, ...spoon]),
    speedLines(5550, 6900, { angle: -30 }), speedLines(10900, 12700, { angle: 0 }),
    layer('Inset', [...insetBg, ...chibiParts], 0), layer('FX', fx), layer('Bubbles', talk, 0),
  ], { cameraKeyframes: cam });
}

const swapRig = (partsA, partsB, track, show, at) => {
  const add = (tr, on) => tr.map((k) => ({ ...k, transform: { ...k.transform, opacity: on(k.t) ? (k.transform.opacity ?? 1) : 0 } }));
  const times = [...new Set([...track.map((k) => k.t), at - 1, at])].sort((a, b) => a - b);
  const { sampleTransform } = globalThis.__st;
  const full = times.map((t) => { const k = track.find((q) => q.t === t); return { t, transform: { ...sampleTransform(track, t) }, ...(k?.easing ? { easing: k.easing } : {}) }; });
  return [...rig(partsA, add(full, (t) => t < at), show), ...rig(partsB, add(full, (t) => t >= at), show)];
};
import { sampleTransform } from '../../packages/core/dist/index.js';
globalThis.__st = { sampleTransform };

// ---------------------------------------------------------------- S4 CLIMAX
export function s4Climax() {
  resetIds('s4_');
  const D = 14000;
  const bg = rooftop(44, { w: 1600, sky: 'sunset', door: false });
  const hx = 420, tx = 940;
  const hana = swapRig(hanaParts(), hanaParts({ arms: 'up' }), [
    T(0, hx, 650, 1.35), T(4800, hx, 650, 1.35), T(5000, hx, 600, 1.35, { scaleX: 1.2, scaleY: 1.55 }, 'easeOut'), T(5300, hx, 650, 1.35, { scaleX: 1.5, scaleY: 1.2 }, 'easeIn'), T(5500, hx, 650, 1.35, {}, 'easeOutBack'),
    ...[0, 1, 2, 3, 4, 5].map((i) => T(5800 + i * 500, hx, i % 2 ? 650 : 625, 1.35, { rotation: i % 2 ? -4 : 4 }, 'easeInOut')),
  ], expr(D, [{ from: 0, to: 3300, eyes: 'Happy', blush: true }, { from: 3300, to: 5000, eyes: 'Yan', shade: true, mouth: 'Grin' }, { from: 5000, to: 9000, eyes: 'Yan', shade: true, mouth: 'yell', blush: true }, { from: 9000, eyes: 'Heart', blush: true, mouth: 'Grin' }]), 5000);
  const taroTrack = [T(0, tx, 650, 1.3), T(9000, tx, 650, 1.3), T(9150, tx + 60, 650, 1.3, { scaleX: 1.45, scaleY: 1.12, rotation: 10 }, 'easeOut'), ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => T(9300 + i * 120, tx + 60 + (i % 2 ? 6 : -6), 650, 1.3, { rotation: 10 })), T(D, tx + 60, 650, 1.3, { rotation: 10 })];
  const taro = rig(taroParts(), taroTrack, expr(D, [{ from: 0, to: 3300, eyes: 'Open', mouth: 'talk' }, { from: 3300, to: 9000, eyes: 'Shock', mouth: 'Wavy' }, { from: 9000, eyes: 'X', mouth: 'Wavy' }]));
  const eyeY = 650 - 1.35 * 245;
  const glint = (x, t) => ({ ...path(starPoly(0, 0, 30, 6, 4), P.white, { shadow: { color: P.glint, blur: 24, offsetX: 0, offsetY: 0 } }), pivot: { x: 0, y: 0 }, keyframes: [
    { t: 0, transform: { x, y: eyeY, opacity: 0, scaleX: 0, scaleY: 0 } }, { t, transform: { x, y: eyeY, opacity: 0, scaleX: 0, scaleY: 0 } },
    { t: t + 180, transform: { x, y: eyeY, opacity: 1, scaleX: 1.2, scaleY: 1.2, rotation: 45 }, easing: 'easeOutBack' }, { t: t + 900, transform: { x, y: eyeY, opacity: 0, scaleX: 0.2, scaleY: 0.2, rotation: 135 }, easing: 'easeIn' }] });
  const talk = [
    ...bubble(900, 110, 560, 120, 'Hana... aren\'t you a\nlittle... intense?', [930, 190], { from: 300, to: 3300, size: 36 }),
    ...bubble(W / 2, 120, 860, 170, 'INTENSE?!\nI just love you THIS MUCH!!', [460, 230], { from: 5100, to: 9000, size: 54, shout: true, color: P.glint }),
    ...bubble(1000, 120, 420, 100, 'S-so much love...', [990, 190], { from: 9300, to: 13800, size: 36 }),
  ];
  const cam = [{ t: 0, camera: { x: 0, y: 0, zoom: 1 } }, { t: 3300, camera: { x: 0, y: 0, zoom: 1 } }, { t: 3500, camera: { x: hx - 640, y: eyeY - 360, zoom: 3.2 }, easing: 'easeOutExpo' },
    ...shake(3500, 4300, 8, { x: hx - 640, y: eyeY - 360, zoom: 3.2 }), { t: 4900, camera: { x: hx - 640, y: eyeY - 360, zoom: 3.4 } },
    { t: 5100, camera: { x: 0, y: 0, zoom: 1 }, easing: 'easeOutCubic' }, ...shake(5100, 6200, 14, { x: 0, y: 0, zoom: 1 }), { t: D, camera: { x: 60, y: 0, zoom: 1.05 }, easing: 'easeInOut' }];
  return project('S4 Climax', D, [
    ...bg.layers, tint('#1A0820', [[0, 0.25], [3300, 0.25], [3450, 0.6], [5000, 0.6], [5200, 0.15], [D, 0.15]]),
    focusLines(3450, 5000, { color: P.glint, count: 60 }),
    layer('Taro', [...taro, ...during(sweatDrop(tx + 100, 170, 1.5), 3400, D), ...during(sweatDrop(tx - 10, 190, 1.1), 9100, D)]),
    layer('Hana', [...hana, glint(hx - 25, 3550), glint(hx + 30, 3650)]),
    layer('Hearts', [...hearts(hx, 380, 5100, 9200, { n: 40, spread: 600, rise: 420, seed: 9 }), ...hearts(tx, 260, 9300, 13800, { n: 10, spread: 200, rise: 160, seed: 4, color: P.hair })]),
    focusLines(5100, 6400, { color: P.white, count: 48 }),
    layer('Bubbles', talk, 0),
  ], { cameraKeyframes: cam });
}

// ---------------------------------------------------------------- S5 ENDING
export function s5Ending() {
  resetIds('s5_');
  const D = 14000;
  const bg = rooftop(55, { w: 1600, sky: 'sunset', door: false });
  const hx = 420, tx = 860;
  const hana = swapRig(hanaParts({ arms: 'up' }), hanaParts({ arms: 'cling' }), [
    T(0, hx, 650, 1.3, { opacity: 0 }), T(4190, hx, 650, 1.3, { opacity: 0 }), T(4200, hx, 650, 1.3), T(4400, hx, 590, 1.3, { scaleX: 1.15, scaleY: 1.5 }, 'easeOut'), T(4700, hx, 420, 1.3, { rotation: -10 }, 'easeOutCubic'), T(5000, hx, 650, 1.3, { scaleX: 1.5, scaleY: 1.15 }, 'easeInCubic'), T(5250, hx, 650, 1.3, {}, 'easeOutBack'),
    T(7600, hx, 650, 1.3), T(7900, tx - 150, 650, 1.3, { rotation: 8 }, 'easeInOutCubic'), T(8100, tx - 120, 650, 1.3, { rotation: 6 }, 'easeOutBack'), T(D, tx - 120, 650, 1.3, { rotation: 6 }),
  ], expr(D, [{ from: 0, to: 4200, eyes: 'Open', blush: true }, { from: 4200, to: 7600, eyes: 'Heart', blush: true, mouth: 'yell' }, { from: 7600, eyes: 'Happy', blush: true, mouth: 'Grin' }]), 7700);
  const hanaHold = rig(hanaParts(), [T(0, hx, 650, 1.3), T(4180, hx, 650, 1.3), T(4200, hx, 650, 1.3, { opacity: 0 })], expr(D, [{ from: 0, to: 2600, eyes: 'Open', blush: true }, { from: 2600, eyes: 'Heart', blush: true, mouth: 'Open' }]));
  const taro = rig(taroParts({ arms: 'eat' }), [T(0, tx, 650, 1.3), T(7800, tx, 650, 1.3), T(8000, tx + 20, 650, 1.3, { rotation: 10, scaleX: 1.4, scaleY: 1.2 }, 'easeOut'), T(8300, tx + 10, 650, 1.3, { rotation: 6 }, 'easeOutBack'), T(D, tx + 10, 650, 1.3, { rotation: 6 })],
    expr(D, [{ from: 0, to: 600, eyes: 'Open', mouth: 'Open' }, { from: 600, to: 3600, eyes: 'Happy', mouth: 'talk' }, { from: 3600, to: 7900, eyes: 'Shock', mouth: 'Wavy' }, { from: 7900, eyes: 'X', mouth: 'Wavy' }]));
  const talk = [
    ...bubble(920, 110, 560, 110, 'Well... your lunch\nIS really good.', [890, 190], { from: 600, to: 3800, size: 36 }),
    ...bubble(430, 100, 520, 140, 'KYAAA~!\nSENPAI!!', [430, 200], { from: 4300, to: 7600, size: 60, shout: true, color: P.hoodie }),
  ];
  const tbc = [
    { ...rect(0, 0, W, H, '#704214'), keyframes: [{ t: 0, transform: { opacity: 0 } }, { t: 10000, transform: { opacity: 0 } }, { t: 10400, transform: { opacity: 0.45 } }] },
    { ...text('TO BE CONTINUED...?', 880, 600, 64, '#F3E2C7', { stroke: '#3B2410', width: 8 }), pivot: { x: 880, y: 600 }, keyframes: [{ t: 0, transform: { opacity: 0, scaleX: 2, scaleY: 2 } }, { t: 10300, transform: { opacity: 0, scaleX: 2, scaleY: 2 } }, { t: 10700, transform: { opacity: 1, scaleX: 1, scaleY: 1 }, easing: 'easeOutBack' }] },
    inkStroke([[600, 650], [1170, 650]], '#3B2410', 10, { writeOnMs: 600, delay: 10800 }),
  ];
  const cam = [{ t: 0, camera: { x: 0, y: 0, zoom: 1 } }, { t: 4300, camera: { x: -120, y: -40, zoom: 1.15 }, easing: 'easeOutCubic' }, ...shake(4300, 5200, 8, { x: -120, y: -40, zoom: 1.15 }), { t: 7600, camera: { x: -100, y: -40, zoom: 1.15 } }, { t: 9500, camera: { x: 80, y: -30, zoom: 1.35 }, easing: 'easeInOutCubic' }, { t: D, camera: { x: 80, y: -30, zoom: 1.45 }, easing: 'easeInOut' }];
  return project('S5 Ending', D, [
    ...bg.layers, layer('Taro', [...taro, ...during(sweatDrop(tx + 100, 170, 1.5), 3700, D)]), layer('Hana', [...hanaHold, ...hana]),
    layer('Hearts', [...hearts(hx, 300, 4300, 7600, { n: 24, spread: 400, rise: 300, seed: 5 }), ...hearts(tx - 60, 280, 8000, D, { n: 18, spread: 300, rise: 200, seed: 6, color: P.hair })]),
    speedLines(7600, 8100, { angle: 0 }),
    layer('Bubbles', talk, 0), layer('TBC', tbc, 0),
  ], { cameraKeyframes: cam });
}

// ---------------------------------------------------------------- S6 END CARD
export function s6End() {
  resetIds('s6_');
  const D = 6000;
  const lines = [['MY SENPAI IS MINE!!', 70, P.hair], ['Ep.01  -  Operation Lunch Box', 36, P.white], ['', 20], ['Hana .... the girlfriend (self-appointed)', 30, P.hairLite], ['Taro .... the senpai (oblivious)', 30, P.sweat], ['Mika\'s bento .... low orbit', 30, P.star], ['', 20], ['Animated 100% procedurally with Paint Studio', 28, P.white], ['PaintWebApp  -  examples/episode-01', 24, '#9AA5C8']];
  let y = 150;
  const objs = lines.flatMap(([s, size, c], i) => { y += size * 1.35; if (!s) return []; const t0 = 300 + i * 350; return [{ ...text(s, W / 2, y, size, c, size > 50 ? { stroke: P.white, width: 3 } : {}), keyframes: [{ t: 0, transform: { opacity: 0, y: 20 } }, { t: t0, transform: { opacity: 0, y: 20 } }, { t: t0 + 400, transform: { opacity: 1, y: 0 }, easing: 'easeOutCubic' }, { t: 5600, transform: { opacity: 1, y: 0 } }, { t: D, transform: { opacity: 0, y: 0 } }] }]; });
  return project('S6 End card', D, [layer('BG', [rect(-20, -20, W + 40, H + 40, P.night)], 0), layer('Hearts', hearts(W / 2, 760, 0, D, { n: 30, spread: 1300, rise: 600, seed: 13, color: P.hair }), 0), layer('Credits', objs, 0)], { background: P.night });
}
