import { P, W, H, layer, project, rect, ellipse, path, text, inkStroke, rig, resetIds, rng } from './lib.mjs';
import { hanaParts, taroParts, bubble, pop, during, heartD, sweatDrop } from './characters.mjs';
import { expr, rooftop, speedLines, focusLines, shake, tint, caption } from './kit.mjs';

export const hearts = (cx, cy, from, to, { n = 14, seed = 2, spread = 260, rise = 220, color = P.glint } = {}) => {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = cx + (r() - 0.5) * spread;
    const y = cy + (r() - 0.5) * 60;
    const s = 8 + r() * 12;
    const t0 = from + r() * Math.max(1, to - from - 900);
    out.push({ ...path(heartD(x, y, s), color, { stroke: P.ink, width: 2.5 }), pivot: { x, y }, keyframes: [
      { t: 0, transform: { opacity: 0 } }, { t: Math.round(t0), transform: { opacity: 0, y: 0, scaleX: 0.2, scaleY: 0.2 } },
      { t: Math.round(t0 + 200), transform: { opacity: 1, y: -rise * 0.2, scaleX: 1, scaleY: 1 }, easing: 'easeOutBack' },
      { t: Math.round(t0 + 900), transform: { opacity: 0, y: -rise, scaleX: 0.8, scaleY: 0.8, rotation: (r() - 0.5) * 40 }, easing: 'easeIn' },
    ] });
  }
  return out;
};

// ---------------------------------------------------------------- S0 TITLE
export function s0Title() {
  resetIds('s0_');
  const D = 5000;
  const bg = layer('BG', [rect(-20, -20, W + 40, H + 40, P.hair)], 0);
  const lines = focusLines(0, D, { color: '#FF9CC8', inner: 120, count: 40 });
  const title = [
    text('MY SENPAI', W / 2, 250, 150, P.white, { stroke: P.ink, width: 14, shadow: { color: P.hoodieShade, blur: 0, offsetX: 8, offsetY: 8 } }),
    text('IS MINE!!', W / 2, 400, 150, P.star, { stroke: P.ink, width: 14, shadow: { color: P.hoodieShade, blur: 0, offsetX: 8, offsetY: 8 } }),
  ].map((o, i) => ({ ...o, pivot: { x: W / 2, y: 320 }, keyframes: [
    { t: 0, transform: { opacity: 0, scaleX: 3, scaleY: 3, rotation: -8 } }, { t: 300 + i * 250, transform: { opacity: 0, scaleX: 3, scaleY: 3, rotation: -8 } },
    { t: 900 + i * 250, transform: { opacity: 1, scaleX: 1, scaleY: 1, rotation: -4 }, easing: 'easeOutElastic' },
    { t: 4600, transform: { opacity: 1, scaleX: 1.06, scaleY: 1.06, rotation: -4 } }, { t: D, transform: { opacity: 0, scaleX: 1.3, scaleY: 1.3, rotation: -4 }, easing: 'easeIn' },
  ] }));
  const sub = [
    { ...text('Episode 01: Operation Lunch Box', W / 2, 545, 44, P.ink, { font: 'Luckiest Guy, Bangers, sans-serif' }), keyframes: [{ t: 0, transform: { opacity: 0 } }, { t: 1800, transform: { opacity: 0, y: 20 } }, { t: 2200, transform: { opacity: 1, y: 0 }, easing: 'easeOutCubic' }, { t: 4700, transform: { opacity: 1 } }, { t: D, transform: { opacity: 0 } }] },
    inkStroke([[340, 590], [520, 582], [760, 592], [940, 584]], P.ink, 12, { writeOnMs: 700, delay: 2200 }),
  ];
  const fx = [...hearts(W / 2, 640, 600, 4800, { n: 22, spread: 1200, rise: 520, seed: 11, color: P.white })];
  return project('S0 Title', D, [bg, lines, layer('Hearts', fx, 0), layer('Title', [...title, ...sub], 0)], { background: P.hair });
}

// ---------------------------------------------------------------- S1 ESTABLISHING
export function s1Establish() {
  resetIds('s1_');
  const D = 9000;
  const bg = rooftop(7, { w: 1800 });
  const taro = rig(taroParts(), [{ t: 0, transform: { x: 980, y: 650, scaleX: 1.15, scaleY: 1.15 } }, { t: 4000, transform: { x: 980, y: 650, scaleX: 1.15, scaleY: 1.15 } }, { t: 4300, transform: { x: 980, y: 650, scaleX: 1.12, scaleY: 1.18 }, easing: 'easeOut' }, { t: 4600, transform: { x: 980, y: 650, scaleX: 1.15, scaleY: 1.15 }, easing: 'easeOut' }],
    expr(D, [{ from: 0, eyes: 'Open', mouth: 'Smile' }]));
  // Hana peeks out of the doorway: only her head, sliding sideways, then hiding again
  const pk = (x, r, t, e) => ({ t, transform: { x, y: 562, scaleX: 0.9, scaleY: 0.9, rotation: r }, ...(e ? { easing: e } : {}) });
  const peek = rig(hanaParts(), [pk(150, 0, 0), pk(150, 0, 5200), pk(175, 30, 5700, 'easeOutBack'), pk(175, 30, 8300), pk(150, 0, 8550, 'easeIn')],
    expr(D, [{ from: 0, to: 6200, eyes: 'Open', blush: true }, { from: 6200, eyes: 'Heart', blush: true, mouth: 'Smile' }]));
  const cam = [{ t: 0, camera: { x: 260, y: -420, zoom: 1.1 } }, { t: 4200, camera: { x: 160, y: 0, zoom: 1 }, easing: 'easeInOutCubic' }, { t: 7000, camera: { x: 120, y: 0, zoom: 1.04 }, easing: 'easeInOut' }, { t: D, camera: { x: 120, y: 0, zoom: 1.04 } }];
  const peekBubble = bubble(470, 250, 300, 90, 'Senpai~...', [330, 320], { from: 6200, to: 8300, size: 34 });
  return project('S1 Rooftop', D, [
    ...bg.layers.slice(0, -1), layer('Hana peek', peek), bg.layers.at(-1),
    layer('Taro', taro),
    layer('Peek FX', [...peekBubble, ...hearts(330, 330, 6300, 8200, { n: 8, spread: 160, rise: 140 })]),
    caption('SEIREN HIGH', 'Rooftop  -  lunch break', 4400, 8600),
  ], { cameraKeyframes: cam });
}

// ---------------------------------------------------------------- S2 INTRO + THE SNAP
export function s2Intro() {
  resetIds('s2_');
  const D = 20000;
  const bg = rooftop(21, { w: 1600, door: false });
  const hx = 450;
  const hanaTrack = [
    { t: 0, transform: { x: -300, y: 650, scaleX: 1.35, scaleY: 1.35, rotation: 12 } },
    { t: 500, transform: { x: hx + 30, y: 650, scaleX: 1.6, scaleY: 1.1, rotation: 6 }, easing: 'easeOutCubic' },
    { t: 700, transform: { x: hx, y: 650, scaleX: 1.25, scaleY: 1.45, rotation: -3 }, easing: 'easeOut' },
    { t: 950, transform: { x: hx, y: 650, scaleX: 1.35, scaleY: 1.35, rotation: 0 }, easing: 'easeOutBack' },
    // idle bounce while talking
    ...[2000, 2600, 3200, 3800, 4400].flatMap((t) => [{ t, transform: { x: hx, y: 650, scaleX: 1.35, scaleY: 1.35 } }, { t: t + 300, transform: { x: hx, y: 640, scaleX: 1.32, scaleY: 1.39 }, easing: 'easeInOut' }]),
    { t: 11400, transform: { x: hx, y: 650, scaleX: 1.35, scaleY: 1.35 } },
    { t: 11520, transform: { x: hx, y: 650, scaleX: 1.4, scaleY: 1.3 }, easing: 'easeOut' },
    { t: 11700, transform: { x: hx, y: 650, scaleX: 1.35, scaleY: 1.35 }, easing: 'easeOutBack' },
    { t: 16800, transform: { x: hx, y: 650, scaleX: 1.35, scaleY: 1.35 } },
    { t: 17000, transform: { x: hx, y: 630, scaleX: 1.3, scaleY: 1.42 }, easing: 'easeOut' },
    { t: 17300, transform: { x: hx, y: 650, scaleX: 1.35, scaleY: 1.35 }, easing: 'easeOutBounce' },
  ];
  const hana = rig(hanaParts(), hanaTrack, expr(D, [
    { from: 0, to: 2000, eyes: 'Happy', blush: true, bento: true },
    { from: 2000, to: 5400, eyes: 'Happy', blush: true, mouth: 'talk', bento: true },
    { from: 5400, to: 11500, eyes: 'Open', blush: true, bento: true },
    { from: 11500, to: 15600, eyes: 'Yan', shade: true, mouth: 'Grin', bento: true },
    { from: 15600, to: 17000, eyes: 'Yan', shade: true, mouth: 'Smile', bento: true },
    { from: 17000, to: 20000, eyes: 'Happy', blush: true, mouth: 'talk', bento: true },
  ]));
  const tx = 930;
  const taroTrack = [
    { t: 0, transform: { x: tx, y: 650, scaleX: 1.3, scaleY: 1.3 } },
    { t: 15600, transform: { x: tx, y: 650, scaleX: 1.3, scaleY: 1.3 } },
    { t: 15750, transform: { x: tx + 20, y: 600, scaleX: 1.2, scaleY: 1.45, rotation: 6 }, easing: 'easeOut' },
    { t: 16100, transform: { x: tx + 30, y: 650, scaleX: 1.38, scaleY: 1.22, rotation: 4 }, easing: 'easeIn' },
    { t: 16400, transform: { x: tx + 30, y: 650, scaleX: 1.3, scaleY: 1.3, rotation: 4 }, easing: 'easeOutBack' },
  ];
  const taro = rig(taroParts(), taroTrack, expr(D, [
    { from: 0, to: 5600, eyes: 'Open', mouth: 'Smile' },
    { from: 5600, to: 11400, eyes: 'Open', mouth: 'talk' },
    { from: 11400, to: 15600, eyes: 'Open', mouth: 'Smile' },
    { from: 15600, to: 17200, eyes: 'Shock', mouth: 'Wavy' },
    { from: 17200, eyes: 'Open', mouth: 'Wavy' },
  ]));
  const sweat = during(sweatDrop(tx + 90, 160, 1.4), 15700, D);
  const talk = [
    ...bubble(330, 120, 470, 120, 'Senpai~!\nI made you lunch!', [400, 210], { from: 1900, to: 5400, size: 36 }),
    ...bubble(950, 110, 470, 100, 'Oh cool, thanks Hana!', [930, 180], { from: 5600, to: 8400, size: 34 }),
    ...bubble(950, 110, 520, 120, 'Mika from 2-B\ngave me one too!', [930, 180], { from: 8500, to: 11400, size: 34 }),
    ...bubble(390, 130, 300, 100, '...Mika?', [430, 220], { from: 12400, to: 15500, size: 46, color: P.glint }),
    ...bubble(950, 100, 260, 90, 'W-what?', [940, 170], { from: 15800, to: 17000, size: 36 }),
    ...bubble(360, 115, 520, 120, 'Nothing~!\nEat MY lunch first~', [420, 210], { from: 17200, to: 20000, size: 36 }),
  ];
  const nameCard = caption('HANA', 'Devoted. VERY devoted.', 900, 4400, { y: 640, color: P.hair });
  const cam = [
    { t: 0, camera: { x: 0, y: 0, zoom: 1 } }, { t: 11450, camera: { x: 0, y: 0, zoom: 1 } },
    { t: 11650, camera: { x: -190, y: -60, zoom: 2.1 }, easing: 'easeOutCubic' },
    ...shake(11650, 12600, 12, { x: -190, y: -60, zoom: 2.1 }),
    { t: 15400, camera: { x: -190, y: -60, zoom: 2.25 }, easing: 'easeInOut' },
    { t: 15700, camera: { x: 0, y: 0, zoom: 1 }, easing: 'easeOutCubic' },
  ];
  const glint = { ...path('M0,-26 L6,-6 L26,0 L6,6 L0,26 L-6,6 L-26,0 L-6,-6 Z', P.white, { shadow: { color: P.glint, blur: 20, offsetX: 0, offsetY: 0 } }), x: 0, y: 0, pivot: { x: 0, y: 0 },
    keyframes: [{ t: 0, transform: { x: hx + 30, y: 326, opacity: 0, scaleX: 0, scaleY: 0 } }, { t: 11700, transform: { x: hx + 30, y: 326, opacity: 0, scaleX: 0, scaleY: 0 } }, { t: 11900, transform: { x: hx + 30, y: 326, opacity: 1, scaleX: 1.6, scaleY: 1.6, rotation: 45 }, easing: 'easeOutBack' }, { t: 12400, transform: { x: hx + 30, y: 326, opacity: 0, scaleX: 0.2, scaleY: 0.2, rotation: 90 } }] };
  return project('S2 Lunch', D, [
    ...bg.layers,
    tint(P.yan, [[0, 0], [11450, 0], [11600, 0.45], [15500, 0.45], [15700, 0]]),
    layer('Taro', [...taro, ...sweat]), layer('Hana', [...hana, glint]),
    layer('Hearts', hearts(hx, 300, 900, 5200, { n: 12 })),
    focusLines(11550, 12900, { color: P.ink, count: 56 }),
    layer('Bubbles', talk, 0), nameCard,
  ], { cameraKeyframes: cam });
}
