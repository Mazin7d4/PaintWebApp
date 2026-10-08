import { createCanvas as napiCreateCanvas } from '@napi-rs/canvas';
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
