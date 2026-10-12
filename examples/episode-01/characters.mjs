// Character models: HANA (clingy yandere) and TARO (clueless senpai), plus props.
import { P, path, ellipse, tube, cel, starPoly, rig, text, rect } from './lib.mjs';

const T = (obj, tag) => ({ obj, tag });

/** Hana, origin at her feet, ~330px tall. Tags select swappable drawings. */
export function hanaParts({ arms = 'hold' } = {}) {
  const parts = [];
  const add = (objs, tag) => (Array.isArray(objs) ? objs : [objs]).forEach((o) => parts.push(T(o, tag)));
  // back hair + twin tails
  add(cel('M-64,-268 C-70,-336 70,-336 64,-268 L70,-150 L52,-176 L44,-150 L-44,-150 L-52,-176 L-70,-150 Z', P.hair, 'M20,-320 C60,-310 70,-280 64,-268 L70,-150 L52,-176 L44,-150 L30,-150 Z', P.hairShade), 'body');
  add(cel('M-62,-300 C-110,-290 -112,-200 -96,-150 L-84,-176 L-76,-140 C-80,-200 -74,-260 -56,-286 Z', P.hair, null, null), 'body');
  add(cel('M62,-300 C110,-290 112,-200 96,-150 L84,-176 L76,-140 C80,-200 74,-260 56,-286 Z', P.hair, 'M62,-300 C110,-290 112,-200 96,-150 L88,-170 C94,-220 90,-270 60,-292 Z', P.hairShade), 'body');
  // legs + shoes
  add(tube('M-16,-92 L-18,-14', P.skirt, 15), 'body');
  add(tube('M16,-92 L18,-14', P.skirt, 15), 'body');
  add(cel('M-36,-14 Q-36,-1 -18,0 L-4,0 Q-2,-15 -16,-19 Z', P.hoodie, null, null, 3.5), 'body');
  add(cel('M36,-14 Q36,-1 18,0 L4,0 Q2,-15 16,-19 Z', P.hoodie, null, null, 3.5), 'body');
  // skirt + top (sailor uniform)
  add(cel('M-40,-110 L40,-110 L58,-70 L-58,-70 Z', P.skirt, 'M12,-110 L40,-110 L58,-70 L28,-70 Z', P.skirtShade), 'body');
  add(cel('M-36,-184 Q0,-194 36,-184 L44,-104 Q0,-96 -44,-104 Z', P.white, 'M14,-188 Q30,-186 36,-184 L44,-104 Q30,-101 18,-100 Z', '#D9DCF0'), 'body');
  add(cel('M-34,-186 Q0,-170 34,-186 L28,-160 Q0,-146 -28,-160 Z', P.blazer, null, null, 3), 'body');
  add(cel('M-10,-156 L10,-156 L16,-128 L0,-138 L-16,-128 Z', P.hoodie, null, null, 3), 'body');
  // arms
  if (arms === 'hold') {
    add(tube('M-34,-178 Q-46,-140 -20,-128', P.white, 16), 'body');
    add(tube('M34,-178 Q46,-140 20,-128', P.white, 16), 'body');
    add(cel('M-34,-136 L34,-136 L30,-106 L-30,-106 Z', P.hoodie, 'M-34,-136 L34,-136 L33,-128 L-33,-128 Z', P.hoodieShade, 3.5), 'bento');
    add(path('M-34,-124 L34,-124', null, { stroke: P.star, width: 4 }), 'bento');
    add(ellipse(-20, -128, 12, 12, P.skin, { stroke: P.ink, width: 3 }), 'body');
    add(ellipse(20, -128, 12, 12, P.skin, { stroke: P.ink, width: 3 }), 'body');
  } else if (arms === 'cling') {
    add(tube('M34,-178 Q70,-160 96,-150', P.white, 16), 'body');
    add(tube('M-34,-178 Q20,-120 92,-138', P.white, 16), 'body');
    add(ellipse(98, -146, 13, 13, P.skin, { stroke: P.ink, width: 3 }), 'body');
  } else {
    // up: both hands on cheeks (kyaa~)
    add(tube('M-34,-178 Q-60,-200 -44,-226', P.white, 16), 'body');
    add(tube('M34,-178 Q60,-200 44,-226', P.white, 16), 'body');
  }
  // head
  add(cel('M-8,-198 L8,-198 L8,-182 L-8,-182 Z', P.skin, null, null, 3), 'body');
  add(cel('M-52,-262 C-52,-312 52,-312 52,-262 C52,-222 26,-200 0,-198 C-26,-200 -52,-222 -52,-262 Z', P.skin,
    'M-52,-262 L52,-262 L50,-250 L38,-258 L24,-246 L8,-258 L-6,-246 L-22,-258 L-36,-246 L-50,-258 Z', P.skinShade), 'body');
  if (arms === 'up') {
    add(ellipse(-46, -228, 14, 14, P.skin, { stroke: P.ink, width: 3 }), 'body');
    add(ellipse(46, -228, 14, 14, P.skin, { stroke: P.ink, width: 3 }), 'body');
  }
  // eyes: open (sparkly)
  for (const sx of [-1, 1]) {
    const cx = 22 * sx;
    add(ellipse(cx, -240, 22, 30, P.white, { stroke: P.ink, width: 2.5 }), 'eyesOpen');
    add(ellipse(cx + 2 * -sx * 0, -238, 16, 24, P.iris), 'eyesOpen');
    add(ellipse(cx, -235, 9, 13, P.pupil), 'eyesOpen');
    add(ellipse(cx - 3, -244, 6, 7, P.white), 'eyesOpen');
    add(ellipse(cx + 3, -231, 3, 3, P.white), 'eyesOpen');
    add(path(`M${cx - 13},-254 Q${cx},-264 ${cx + 13},-254`, null, { stroke: P.ink, width: 5 }), 'eyesOpen');
    // happy closed ^ ^
    add(path(`M${cx - 11},-236 Q${cx},-250 ${cx + 11},-236`, null, { stroke: P.ink, width: 4.5 }), 'eyesHappy');
    // yandere: tiny pupils + dead stare
    add(ellipse(cx, -240, 22, 26, P.white, { stroke: P.ink, width: 2.5 }), 'eyesYan');
    add(ellipse(cx, -239, 6, 8, P.glint, { shadow: { color: P.glint, blur: 14, offsetX: 0, offsetY: 0 } }), 'eyesYan');
    add(path(`M${cx - 13},-250 L${cx + 13},-252`, null, { stroke: P.ink, width: 5 }), 'eyesYan');
    // heart eyes
    add(path(heartD(cx, -240, 13), P.glint, { stroke: P.ink, width: 2.5 }), 'eyesHeart');
  }
  // yandere face shadow (dramatic band over upper face)
  add(path('M-52,-300 C-30,-312 30,-312 52,-300 L52,-238 Q0,-226 -52,-238 Z', P.yan, { opacity: 0.55 }), 'yanShade');
  add(path('M-40,-300 L-40,-232 M-24,-302 L-24,-230 M-8,-304 L-8,-228 M8,-304 L8,-228 M24,-302 L24,-230 M40,-300 L40,-232', null, { stroke: P.yan, width: 2 }), 'yanShade');
  // blush
  add(ellipse(-38, -222, 16, 7, P.blush, { opacity: 0.7 }), 'blush');
  add(ellipse(38, -222, 16, 7, P.blush, { opacity: 0.7 }), 'blush');
  add(path('M-44,-224 L-40,-219 M-36,-224 L-32,-219 M32,-224 L36,-219 M40,-224 L44,-219', null, { stroke: P.hoodieShade, width: 2 }), 'blush');
  // mouths
  add(path('M-7,-214 Q0,-208 7,-214', null, { stroke: P.ink, width: 3 }), 'mouthSmile');
  add(cel('M-10,-218 Q0,-198 10,-218 Z', P.mouth, null, null, 3), 'mouthOpen');
  add(cel('M-16,-216 Q0,-204 16,-216 Q0,-210 -16,-216 Z', P.white, null, null, 2.5), 'mouthGrin');
  add(path('M-8,-212 Q-4,-216 0,-212 Q4,-208 8,-212', null, { stroke: P.ink, width: 3 }), 'mouthWavy');
  // bangs + highlight + hair clip
  add(cel('M-60,-258 L-56,-292 C-40,-328 40,-328 58,-292 L60,-252 L48,-272 L38,-246 L24,-278 L8,-248 L-6,-280 L-22,-250 L-36,-276 L-48,-248 Z', P.hair,
    'M18,-322 C40,-316 52,-306 58,-292 L60,-252 L48,-272 L38,-246 L24,-278 Z', P.hairShade), 'body');
  add(path('M-34,-306 Q0,-320 34,-306 L28,-300 Q0,-312 -28,-300 Z', P.hairLite), 'body');
  add(path(heartD(-44, -292, 9), P.glint, { stroke: P.ink, width: 2.5 }), 'body');
  return parts;
}

/** Taro, origin at his feet, ~350px tall, blazer + messy hair + clueless face. */
export function taroParts({ arms = 'down' } = {}) {
  const parts = [];
  const add = (objs, tag) => (Array.isArray(objs) ? objs : [objs]).forEach((o) => parts.push(T(o, tag)));
  add(tube('M-18,-110 L-20,-14', P.blazerShade, 20), 'body');
  add(tube('M18,-110 L20,-14', P.blazerShade, 20), 'body');
  add(cel('M-40,-14 Q-40,0 -20,0 L-2,0 Q0,-16 -18,-20 Z', '#3B2A20', null, null, 3.5), 'body');
  add(cel('M40,-14 Q40,0 20,0 L2,0 Q0,-16 18,-20 Z', '#3B2A20', null, null, 3.5), 'body');
  add(cel('M-44,-208 Q0,-218 44,-208 L50,-104 Q0,-96 -50,-104 Z', P.blazer, 'M16,-212 Q34,-210 44,-208 L50,-104 Q34,-100 20,-99 Z', P.blazerShade), 'body');
  add(cel('M-16,-210 L16,-210 L0,-160 Z', P.white, null, null, 3), 'body');
  add(cel('M-5,-204 L5,-204 L8,-160 L0,-150 L-8,-160 Z', P.tie, null, null, 2.5), 'body');
  if (arms === 'down') {
    add(tube('M-44,-200 Q-58,-150 -54,-112', P.blazer, 18), 'body');
    add(tube('M44,-200 Q58,-150 54,-112', P.blazer, 18), 'body');
    add(ellipse(-54, -106, 15, 15, P.skin, { stroke: P.ink, width: 3 }), 'body');
    add(ellipse(54, -106, 15, 15, P.skin, { stroke: P.ink, width: 3 }), 'body');
  } else {
    // eating: right hand with chopsticks near mouth, left holds bento
    add(tube('M-44,-200 Q-60,-150 -30,-138', P.blazer, 18), 'body');
    add(cel('M-58,-146 L4,-146 L0,-120 L-54,-120 Z', '#7FD1AE', 'M-58,-146 L4,-146 L3,-138 L-57,-138 Z', '#4FA383', 3.5), 'body');
    add(tube('M44,-200 Q70,-170 34,-238', P.blazer, 18), 'body');
    add(ellipse(32, -240, 15, 15, P.skin, { stroke: P.ink, width: 3 }), 'body');
    add(path('M30,-246 L4,-262 M36,-244 L8,-266', null, { stroke: '#8B5A2B', width: 3 }), 'body');
  }
  add(cel('M-9,-222 L9,-222 L9,-206 L-9,-206 Z', P.skin, null, null, 3), 'body');
  add(cel('M-50,-282 C-50,-336 50,-336 50,-282 C50,-246 28,-224 0,-222 C-28,-224 -50,-246 -50,-282 Z', P.skin,
    'M-50,-286 L50,-286 L48,-272 L30,-280 L12,-268 L-6,-280 L-26,-268 L-48,-278 Z', P.skinShade), 'body');
  for (const sx of [-1, 1]) {
    const cx = 20 * sx;
    add(ellipse(cx, -262, 8, 16, P.ink), 'eyesOpen');
    add(ellipse(cx - 1, -266, 3, 4, P.white), 'eyesOpen');
    add(path(`M${cx - 10},-258 L${cx + 10},-266 M${cx - 10},-266 L${cx + 10},-258`, null, { stroke: P.ink, width: 4 }), 'eyesX');
    add(ellipse(cx, -262, 22, 22, P.white, { stroke: P.ink, width: 3 }), 'eyesShock');
    add(ellipse(cx, -262, 4, 4, P.ink), 'eyesShock');
  }
  add(path('M-7,-238 Q0,-234 7,-238', null, { stroke: P.ink, width: 3 }), 'mouthSmile');
  add(cel('M-9,-242 Q0,-226 9,-242 Z', P.mouth, null, null, 3), 'mouthOpen');
  add(path('M-10,-236 Q-5,-241 0,-236 Q5,-231 10,-236', null, { stroke: P.ink, width: 3 }), 'mouthWavy');
  add(cel('M-56,-280 L-60,-312 L-44,-306 L-46,-340 L-24,-326 L-14,-354 L4,-332 L22,-352 L28,-326 L50,-338 L46,-306 L62,-312 L56,-276 L42,-296 L30,-278 L16,-300 L0,-280 L-16,-300 L-30,-278 L-42,-296 Z', P.boyHair,
    'M22,-352 L28,-326 L50,-338 L46,-306 L62,-312 L56,-276 L42,-296 L30,-278 L16,-300 Z', '#24180F'), 'body');
  add(path('M-30,-334 Q-10,-344 10,-336', null, { stroke: P.boyHairLite, width: 5 }), 'body');
  return parts;
}

export function heartD(cx, cy, r) {
  return `M${cx},${cy + r} C${cx - r * 2},${cy - r * 0.2} ${cx - r},${cy - r * 1.6} ${cx},${cy - r * 0.6} C${cx + r},${cy - r * 1.6} ${cx + r * 2},${cy - r * 0.2} ${cx},${cy + r} Z`;
}
export const sweatDrop = (x, y, s = 1) => [path(`M${x},${y} C${x - 10 * s},${y + 16 * s} ${x - 8 * s},${y + 28 * s} ${x},${y + 28 * s} C${x + 8 * s},${y + 28 * s} ${x + 10 * s},${y + 16 * s} ${x},${y} Z`, P.sweat, { stroke: P.ink, width: 3 }), ellipse(x - 2 * s, y + 20 * s, 4 * s, 6 * s, P.white)];
export const angerMark = (x, y) => path(`M${x - 12},${y - 4} Q${x - 4},${y - 4} ${x - 4},${y - 12} M${x + 4},${y - 12} Q${x + 4},${y - 4} ${x + 12},${y - 4} M${x + 12},${y + 4} Q${x + 4},${y + 4} ${x + 4},${y + 12} M${x - 4},${y + 12} Q${x - 4},${y + 4} ${x - 12},${y + 4}`, null, { stroke: P.glint, width: 5 });

/** Speech bubble; `shout` gives a spiky burst. Pops in with easeOutBack, holds, pops out. */
export function bubble(x, y, w, h, str, tail, { from, to, size = 30, shout = false, color = P.ink, font } = {}) {
  const objs = [];
  if (shout) {
    const pts = [];
    const n = 22;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = i % 2 ? 1 : 1.18;
      pts.push(`${(x + Math.cos(a) * (w / 2) * r).toFixed(1)},${(y + Math.sin(a) * (h / 2) * r).toFixed(1)}`);
    }
    objs.push(path(`M${pts.join(' L')} Z`, P.white, { stroke: P.ink, width: 5 }));
  } else {
    objs.push(path(`M${x - 18},${y + h / 2 - 6} L${tail[0]},${tail[1]} L${x + 14},${y + h / 2 - 4} Z`, P.white, { stroke: P.ink, width: 4 }));
    objs.push(rect(x - w / 2, y - h / 2, w, h, P.white, { stroke: P.ink, width: 4, radius: Math.min(h / 2, 34) }));
    objs.push(path(`M${x - 18},${y + h / 2 - 8} L${x + 14},${y + h / 2 - 6}`, null, { stroke: P.white, width: 6 }));
  }
  const lines = str.split('\n');
  lines.forEach((ln, i) => objs.push(text(ln, x, y + (i - (lines.length - 1) / 2) * size * 1.1, size, color, { font })));
  return pop(objs, from, to, { x: tail?.[0] ?? x, y: tail?.[1] ?? y });
}

/** Pop-in/out visibility (scale + opacity) around a pivot. */
export function pop(objs, from, to, pivot) {
  return objs.map((o) => ({
    ...o,
    pivot,
    keyframes: [
      { t: 0, transform: { opacity: 0, scaleX: 0.4, scaleY: 0.4 } },
      ...(from > 1 ? [{ t: from - 1, transform: { opacity: 0, scaleX: 0.4, scaleY: 0.4 } }] : []),
      { t: from + 220, transform: { opacity: 1, scaleX: 1, scaleY: 1 }, easing: 'easeOutBack' },
      { t: to - 150, transform: { opacity: 1, scaleX: 1, scaleY: 1 } },
      { t: to, transform: { opacity: 0, scaleX: 0.85, scaleY: 0.85 }, easing: 'easeIn' },
    ],
  }));
}

/** Show objects only inside [from,to) (hard cut), no scaling. */
export function during(objs, from, to, extra = {}) {
  return objs.map((o) => ({
    ...o,
    keyframes: [
      { t: 0, transform: { opacity: 0, ...extra } },
      ...(from > 1 ? [{ t: from - 1, transform: { opacity: 0, ...extra } }] : []),
      { t: from, transform: { opacity: 1, ...extra } },
      { t: to - 1, transform: { opacity: 1, ...extra } },
      { t: to, transform: { opacity: 0, ...extra } },
    ],
  }));
}

export const kira = (x, y) => [path(starPoly(30, 13, x, y), P.star, { stroke: P.ink, width: 4, shadow: { color: P.glow, blur: 24, offsetX: 0, offsetY: 0 } })];
export { rig };
