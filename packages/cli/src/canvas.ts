import { createCanvas as napiCreateCanvas, GlobalFonts, Path2D as NapiPath2D } from '@napi-rs/canvas';

// The shared renderer uses the global Path2D for `path` shapes; Node has none, so provide napi's.
const g = globalThis as unknown as { Path2D?: unknown };
if (typeof g.Path2D === 'undefined') g.Path2D = NapiPath2D;

/** Register extra font files/dirs (PAINT_STUDIO_FONTS=dir1:dir2) for text objects. */
for (const dir of (process.env.PAINT_STUDIO_FONTS ?? '').split(':').filter(Boolean)) GlobalFonts.loadFontsFromDir(dir);
import type { CanvasFactory, CanvasLike } from '@paint-studio/core';

export const nodeCanvasFactory: CanvasFactory = (width, height) => {
  const canvas = napiCreateCanvas(width, height);
  return canvas as unknown as CanvasLike;
};

export function canvasToPngBuffer(canvas: CanvasLike): Buffer {
  // @napi-rs/canvas SKCanvas has encode/toBuffer
  const anyCanvas = canvas as unknown as { toBuffer: (mime: string) => Buffer };
  return anyCanvas.toBuffer('image/png');
}

export function canvasToRgba(canvas: CanvasLike): Uint8ClampedArray {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return img.data;
}
