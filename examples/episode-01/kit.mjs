// Scene kit: backgrounds, expressions, camera moves, anime FX.
import { P, W, H, rng, layer, rect, ellipse, path, line, text, inkStroke } from './lib.mjs';

/** Tag visibility windows from expression segments. */
export function expr(total, segs) {
  const tags = ['eyesOpen', 'eyesHappy', 'eyesYan', 'eyesHeart', 'eyesX', 'eyesShock', 'yanShade', 'blush', 'mouthSmile', 'mouthOpen', 'mouthGrin', 'mouthWavy', 'bento'];
  const show = Object.fromEntries(tags.map((t) => [t, []]));
  for (const s of segs) {
    const from = s.from;
    const to = s.to ?? total;
    show[`eyes${s.eyes ?? 'Open'}`].push([from, to]);
    if (s.shade) show.yanShade.push([from, to]);
    if (s.blush) show.blush.push([from, to]);
    if (s.bento) show.bento.push([from, to]);
    if (s.mouth === 'talk' || s.mouth === 'yell') {
      const base = s.mouth === 'yell' ? 'mouthOpen' : 'mouthSmile';
      for (let t = from; t < to; t += 240) {
        show.mouthOpen.push([t, Math.min(to, t + 120)]);
        if (base === 'mouthSmile') show.mouthSmile.push([Math.min(to, t + 120), Math.min(to, t + 240)]);
        else show.mouthGrin.push([Math.min(to, t + 120), Math.min(to, t + 240)]);
      }
    } else show[`mouth${s.mouth ?? 'Smile'}`].push([from, to]);
    // blinks every ~3.2s on normal open eyes
    if ((s.eyes ?? 'Open') === 'Open' && s.blink !== false) {
      const idx = show.eyesOpen.length - 1;
      const [a, b] = show.eyesOpen[idx];
      show.eyesOpen.splice(idx, 1);
      let cur = a;
      for (let t = a + 1400; t < b - 300; t += 3200) {
        show.eyesOpen.push([cur, t]);
        show.eyesHappy.push([t, t + 120]);
        cur = t + 120;
      }
      show.eyesOpen.push([cur, b]);
    }
  }
  return show;
}

/** Daytime school rooftop with 5 parallax planes. `w` = world width to cover camera pans. */
export function rooftop(seed = 7, { w = 2600, sky = 'day', door = true } = {}) {
  const r = rng(seed);
  const skyFill = sky === 'day'
    ? { type: 'linear', x0: 0, y0: 0, x1: 0, y1: H, stops: [{ offset: 0, color: P.skyDay }, { offset: 1, color: P.skyDay2 }] }
    : { type: 'linear', x0: 0, y0: 0, x1: 0, y1: H, stops: [{ offset: 0, color: P.skyMid }, { offset: 0.6, color: P.skyLow }, { offset: 1, color: P.sunset }] };
  const skyL = layer('Sky', [{ ...rect(-50, -50, W + 100, H + 100, 'x'), fill: { gradient: skyFill } }], 0);
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const cx = -200 + i * 420 + r() * 120;
    const cy = 60 + r() * 160;
    const s = 0.7 + r() * 0.6;
    const puffs = [[0, 0, 160, 70], [-60, 10, 110, 60], [60, 12, 120, 56], [10, -26, 110, 70]];
    for (const [dx, dy, ww, hh] of puffs) clouds.push(ellipse(cx + dx * s, cy + dy * s, ww * s, hh * s, sky === 'day' ? P.cloud : '#FFD9C2'));
    clouds.push(ellipse(cx, cy + 22 * s, 230 * s, 26 * s, sky === 'day' ? P.cloudShade : '#F2A88A'));
  }
  const cloudL = layer('Clouds', clouds.map((c) => ({ ...c, keyframes: [{ t: 0, transform: { x: 0 } }, { t: 120000, transform: { x: -600 } }] })), 0.12);
  const city = (k, color, baseY, minH, maxH, winColor) => {
    const objs = [];
    let x = -600;
    const pts = [`-600,${H + 400}`];
    while (x < w + 600) {
      const bw = 60 + r() * 120;
      const bh = minH + r() * (maxH - minH);
      pts.push(`${x.toFixed(0)},${(baseY - bh).toFixed(0)}`, `${(x + bw).toFixed(0)},${(baseY - bh).toFixed(0)}`);
      for (let wy = baseY - bh + 16; wy < baseY - 10; wy += 26) for (let wx = x + 10; wx < x + bw - 16; wx += 22) if (r() < 0.35) objs.push(rect(wx, wy, 10, 14, winColor, { opacity: 0.85 }));
      x += bw + 4;
    }
    pts.push(`${x.toFixed(0)},${H + 400}`);
    return layer(`City ${k}`, [path(`M${pts.join(' L')} Z`, color), ...objs], k);
  };
  const far = city(0.3, sky === 'day' ? '#A8C7E6' : '#B07A9E', 520, 80, 220, sky === 'day' ? '#D7E9FA' : P.glow);
  const mid = city(0.6, sky === 'day' ? '#7E9CC4' : '#6E4A7A', 560, 40, 150, sky === 'day' ? '#B8D3EE' : P.glow);
  // rooftop floor, fence, door hut
  const floor = [
    rect(-800, 560, w + 1600, 400, '#B9C2D3'), rect(-800, 560, w + 1600, 10, '#E6EBF3'),
    ...Array.from({ length: Math.ceil((w + 1600) / 160) }, (_, i) => line(-800 + i * 160, 572, -900 + i * 160 - 60, 760, '#A3ADC1', 3)),
  ];
  const fence = [];
  for (let x = -800; x < w + 800; x += 90) fence.push(line(x, 430, x, 562, '#5F6B85', 6));
  fence.push(line(-800, 432, w + 800, 432, '#5F6B85', 8), line(-800, 500, w + 800, 500, '#5F6B85', 3));
  for (let x = -800; x < w + 800; x += 30) fence.push(line(x, 432, x + 30, 500, '#8D97AD', 1.5), line(x + 30, 432, x, 500, '#8D97AD', 1.5));
  const hut = door ? [
    rect(-40, 250, 300, 312, P.door, { stroke: P.ink, width: 5 }), rect(150, 250, 110, 312, P.doorShade),
    rect(-60, 230, 340, 30, '#8A93A8', { stroke: P.ink, width: 5 }),
    rect(40, 330, 120, 232, '#55607A', { stroke: P.ink, width: 5 }), ellipse(140, 450, 12, 12, P.star, { stroke: P.ink, width: 3 }),
  ] : [];
  const ground = layer('Rooftop', [...floor, ...fence, ...hut], 1);
  return { layers: [skyL, cloudL, far, mid, ground] };
}

/** Screen-space anime speed lines (horizontal streaks) during [from,to). */
export function speedLines(from, to, { seed = 3, color = P.white, count = 16, dir = -1 } = {}) {
  const r = rng(seed);
  const objs = [];
  for (let i = 0; i < count; i++) {
    const y = 40 + r() * (H - 80);
    const len = 220 + r() * 420;
    const period = 260 + r() * 180;
    const kf = [{ t: 0, transform: { opacity: 0, x: 0 } }];
    if (from > 1) kf.push({ t: from - 1, transform: { opacity: 0, x: 0 } });
    for (let t = from + r() * period; t < to; t += period) {
      kf.push({ t: Math.round(t), transform: { opacity: 0.9, x: dir < 0 ? W + 200 : -len - 200 } });
      kf.push({ t: Math.round(Math.min(to - 1, t + period - 1)), transform: { opacity: 0.9, x: dir < 0 ? -len - 200 : W + 200 } });
    }
    kf.push({ t: to, transform: { opacity: 0, x: 0 } });
    objs.push({ ...line(0, y, len, y, color, 2 + r() * 5), keyframes: kf });
  }
  return layer('Speed lines', objs, 0);
}

/** Radial focus lines (anime impact frame), rotating slowly, visible in [from,to). */
export function focusLines(from, to, { color = P.ink, count = 48, seed = 9, inner = 230 } = {}) {
  const r = rng(seed);
  const cx = W / 2;
  const cy = H / 2;
  const objs = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + r() * 0.08;
    const w2 = 0.02 + r() * 0.025;
    const r0 = inner + r() * 120;
    const R = 900;
    objs.push(path(`M${cx + Math.cos(a - w2) * R},${cy + Math.sin(a - w2) * R} L${cx + Math.cos(a) * r0},${cy + Math.sin(a) * r0} L${cx + Math.cos(a + w2) * R},${cy + Math.sin(a + w2) * R} Z`, color));
  }
  return layer('Focus lines', objs.map((o) => ({ ...o, pivot: { x: cx, y: cy }, keyframes: [
    { t: 0, transform: { opacity: 0, rotation: 0 } }, ...(from > 1 ? [{ t: from - 1, transform: { opacity: 0, rotation: 0 } }] : []),
    { t: from, transform: { opacity: 1, rotation: 0, scaleX: 1.3, scaleY: 1.3 } },
    { t: from + 250, transform: { opacity: 1, rotation: 2, scaleX: 1, scaleY: 1 }, easing: 'easeOutCubic' },
    { t: to - 1, transform: { opacity: 1, rotation: 8, scaleX: 1, scaleY: 1 } }, { t: to, transform: { opacity: 0, rotation: 8 } },
  ] })), 0);
}

/** Camera shake keyframes appended between from..to. */
export function shake(from, to, amp = 14, base = { x: 0, y: 0, zoom: 1 }, seed = 5) {
  const r = rng(seed);
  const out = [];
  for (let t = from; t < to; t += 40) {
    const k = 1 - (t - from) / (to - from);
    out.push({ t, camera: { ...base, x: base.x + (r() - 0.5) * 2 * amp * k, y: base.y + (r() - 0.5) * 2 * amp * k } });
  }
  out.push({ t: to, camera: { ...base } });
  return out;
}

/** Full-screen tint/flash (screen-fixed) with opacity keyframes. */
export function tint(color, keys) {
  return layer(`Tint ${color}`, [{ ...rect(-20, -20, W + 40, H + 40, color), keyframes: keys.map(([t, o]) => ({ t, transform: { opacity: o } })) }], 0);
}

/** Anime caption card that slides in from the left with an ink write-on underline. */
export function caption(str, sub, from, to, { y = 92, color = P.hoodie } = {}) {
  const objs = [
    { ...path(`M-40,${y - 46} L560,${y - 46} L520,${y + 46} L-40,${y + 46} Z`, color, { stroke: P.ink, width: 5 }) },
    text(str, 40, y - 10, 46, P.white, { align: 'left', stroke: P.ink, width: 7 }),
    ...(sub ? [text(sub, 44, y + 28, 22, P.ink, { align: 'left', font: 'Luckiest Guy, Bangers, sans-serif' })] : []),
  ];
  const slid = objs.map((o) => ({ ...o, keyframes: [
    { t: 0, transform: { x: -700, opacity: 1 } }, { t: from, transform: { x: -700 } },
    { t: from + 450, transform: { x: 0 }, easing: 'easeOutBack' }, { t: to - 300, transform: { x: 0, opacity: 1 } },
    { t: to, transform: { x: -700, opacity: 1 }, easing: 'easeInCubic' },
  ] }));
  slid.push(inkStroke([[30, y + 52], [200, y + 46], [380, y + 54], [500, y + 48]], P.star, 10, { writeOnMs: 500, delay: from + 450 }));
  slid[slid.length - 1].keyframes = [{ t: 0, transform: { opacity: 1 } }, { t: to - 300, transform: { opacity: 1 } }, { t: to - 100, transform: { opacity: 0 } }];
  return layer('Caption', slid, 0);
}
export { inkStroke };
