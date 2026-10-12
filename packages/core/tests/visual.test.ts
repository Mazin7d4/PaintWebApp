// Visual regression: render a deterministic ink + cel + key-drawing scene and compare to a reference frame.
// Regenerate references with UPDATE_REF=1 npm test.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createEmptyProject, renderProjectToCanvas, type PaintProject } from '../src/index.js';

const napi = await import('@napi-rs/canvas').catch(() => null);
const g = globalThis as unknown as { Path2D?: unknown };
if (napi && typeof g.Path2D === 'undefined') g.Path2D = napi.Path2D;

function scene(): PaintProject {
  const p = createEmptyProject({ width: 256, height: 192, fps: 60 });
  p.background = '#3A3F55';
  const L = p.layers[0] as unknown as Record<string, unknown>;
  L.light = -60; L.rim = '#9FB4E8';
  L.objects = [
    { type: 'shape', shape: 'path', id: 'limb', x: 0, y: 0, pivot: { x: 0, y: 0 }, path: 'M40,40C90,20 140,60 120,120C110,160 60,170 50,130C40,100 30,70 40,40Z', fill: { color: '#20223A' }, cel: { shade: '#0A0A18', shadeDist: 10, rim: '#A9B8E6', rimDist: 3 }, stroke: { color: '#0B0A12', width: 5, taper: 0.2, weight: 0.75, boil: 0.5, boilMs: 125 } },
    { type: 'shape', shape: 'path', id: 'lock', x: 0, y: 0, pivot: { x: 0, y: 0 }, drawings: [
      { t: 0, path: 'M160,30C200,40 220,90 200,150C190,110 170,80 160,30Z', fill: { color: '#E6EAF2' }, stroke: { color: '#0B0A12', width: 3, taper: 0.6 } },
      { t: 100, path: 'M160,30C210,40 235,90 220,150C200,110 175,80 160,30Z' },
    ], cel: { shade: '#A3ABC4', shadeDist: 6 } },
  ] as unknown[];
  return p;
}
function diff(a: Uint8Array | Buffer, b: Uint8Array | Buffer) { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; }

describe.skipIf(!napi)('visual regression', () => {
  for (const t of [0, 150]) it(`ink/cel/key-drawing frame @${t}ms matches reference`, () => {
    const c = renderProjectToCanvas(scene(), (w, h) => napi!.createCanvas(w, h) as never, { timeMs: t }) as unknown as { getContext: (k: string) => { getImageData: (x: number, y: number, w: number, h: number) => { data: Uint8ClampedArray } }; toBuffer: (m: string) => Buffer };
    const raw = Buffer.from(c.getContext('2d').getImageData(0, 0, 256, 192).data);
    const ref = new URL(`./__ref__/ink-cel-${t}.rgba`, import.meta.url);
    if (process.env.UPDATE_REF || !existsSync(ref)) { writeFileSync(ref, raw); writeFileSync(new URL(`./__ref__/ink-cel-${t}.png`, import.meta.url), c.toBuffer('image/png')); }
    expect(diff(raw, readFileSync(ref))).toBeLessThan(0.5);
  });
});
