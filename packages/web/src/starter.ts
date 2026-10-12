import { createEmptyProject, strokeFromPolyline, type PaintProject, type StrokeObject } from '@paint-studio/core';

/** First-visit example: a squash-and-stretch ball, an ink swoosh and a title, all keyframed. */
export function starterProject(): PaintProject {
  const p = createEmptyProject({ name: 'Welcome to Paint Studio', width: 960, height: 540, fps: 24, style: 'inked-cartoon' });
  p.frames = [{ id: 'f_main', name: 'Shot 1', duration: 2000 }];
  const bg = p.layers[0];
  bg.name = 'Background';
  bg.objects.push(
    { type: 'shape', id: 'ground', shape: 'rect', x: 0, y: 430, w: 960, h: 110, fill: { color: '#1A1A1A' } },
    { type: 'shape', id: 'sun', shape: 'ellipse', x: 760, y: 60, w: 120, h: 120, fill: { color: '#FFD600' },
      keyframes: [{ t: 0, transform: { scaleX: 1, scaleY: 1 } }, { t: 1000, transform: { scaleX: 1.12, scaleY: 1.12 }, easing: 'easeInOut' }, { t: 2000, transform: { scaleX: 1, scaleY: 1 }, easing: 'easeInOut' }] },
  );
  const swoosh: StrokeObject = {
    type: 'stroke',
    id: 'swoosh',
    brush: { kind: 'ink', size: 10, color: '#1A1A1A', opacity: 1, taper: 0.4, smoothing: 3, pressureWidth: 0.5 },
    points: strokeFromPolyline([{ x: 120, y: 380 }, { x: 260, y: 330 }, { x: 420, y: 370 }, { x: 560, y: 310 }, { x: 700, y: 360 }]),
    writeOnMs: 900,
  };
  p.layers.push({ id: 'layer_fx', name: 'Ink', visible: true, opacity: 1, blendMode: 'source-over', objects: [swoosh] });
  p.layers.push({
    id: 'layer_char', name: 'Character', visible: true, opacity: 1, blendMode: 'source-over', objects: [
      { type: 'shape', id: 'ball', shape: 'ellipse', x: 400, y: 120, w: 110, h: 110, fill: { color: '#FF5A5F' }, stroke: { color: '#1A1A1A', width: 6 },
        keyframes: [
          { t: 0, transform: { y: -60, scaleX: 0.9, scaleY: 1.1 } },
          { t: 600, transform: { y: 200, scaleX: 0.9, scaleY: 1.1 }, easing: 'easeInCubic' },
          { t: 700, transform: { y: 222, scaleX: 1.35, scaleY: 0.65 }, easing: 'easeOut' },
          { t: 1300, transform: { y: -60, scaleX: 0.95, scaleY: 1.05 }, easing: 'easeOutCubic' },
          { t: 2000, transform: { y: -60, scaleX: 0.9, scaleY: 1.1 } },
        ] },
      { type: 'text', id: 'title', text: 'PAINT STUDIO', x: 60, y: 90, fontSize: 64, fontWeight: 800, fill: { color: '#1A1A1A' },
        keyframes: [{ t: 0, transform: { opacity: 0, x: -40 } }, { t: 500, transform: { opacity: 1, x: 0 }, easing: 'easeOutBack' }] },
    ],
  });
  p.meta = { description: 'Starter scene — select anything with V, drag the handles, scrub the timeline.', tags: ['starter'] };
  return p;
}
