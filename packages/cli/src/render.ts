import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  planExportFrames,
  renderProjectToCanvas,
  type PaintProject,
} from '@paint-studio/core';
import gifenc from 'gifenc';
import { canvasToPngBuffer, canvasToRgba, nodeCanvasFactory } from './canvas.js';

const { GIFEncoder, quantize, applyPalette } = gifenc as unknown as {
  GIFEncoder: typeof import('gifenc').GIFEncoder;
  quantize: typeof import('gifenc').quantize;
  applyPalette: typeof import('gifenc').applyPalette;
};

export async function renderPngSequence(
  project: PaintProject,
  outDir: string,
  fps = project.fps,
): Promise<string[]> {
  await mkdir(outDir, { recursive: true });
  const plans = planExportFrames(project, fps);
  const files: string[] = [];
  for (let i = 0; i < plans.length; i++) {
    const canvas = renderProjectToCanvas(project, nodeCanvasFactory, { timeMs: plans[i].timeMs });
    const file = path.join(outDir, `frame-${String(i).padStart(4, '0')}.png`);
    await writeFile(file, canvasToPngBuffer(canvas));
    files.push(file);
  }
  return files;
}

export async function renderGif(
  project: PaintProject,
  outFile: string,
  fps = project.fps,
): Promise<string> {
  await mkdir(path.dirname(outFile), { recursive: true });
  const plans = planExportFrames(project, fps);
  const gif = GIFEncoder();
  const delay = Math.max(1, Math.round(100 / fps)); // gifenc uses centiseconds? actually ms/10 in some libs — gifenc delay is in ms/10? 
  // gifenc writeFrame delay is in milliseconds according to readme... check: delay in centiseconds for GIF spec. gifenc docs: delay in hundredths of a second.
  const delayCs = Math.max(1, Math.round(100 / fps));

  for (const plan of plans) {
    const canvas = renderProjectToCanvas(project, nodeCanvasFactory, { timeMs: plan.timeMs });
    const rgba = canvasToRgba(canvas);
    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);
    gif.writeFrame(index, project.width, project.height, { palette, delay: delayCs });
  }
  gif.finish();
  const bytes = gif.bytes();
  await writeFile(outFile, Buffer.from(bytes));
  void delay;
  return outFile;
}

export async function renderSpriteSheet(
  project: PaintProject,
  outFile: string,
  fps = project.fps,
  columns = 4,
): Promise<string> {
  await mkdir(path.dirname(outFile), { recursive: true });
  const plans = planExportFrames(project, fps);
  const cols = Math.max(1, columns);
  const rows = Math.ceil(plans.length / cols);
  const sheet = nodeCanvasFactory(project.width * cols, project.height * rows);
  const ctx = sheet.getContext('2d');
  if (!ctx) throw new Error('no context');
  for (let i = 0; i < plans.length; i++) {
    const frame = renderProjectToCanvas(project, nodeCanvasFactory, { timeMs: plans[i].timeMs });
    const x = (i % cols) * project.width;
    const y = Math.floor(i / cols) * project.height;
    ctx.drawImage(frame as unknown as CanvasImageSource, x, y);
  }
  await writeFile(outFile, canvasToPngBuffer(sheet));
  return outFile;
}

export async function renderStill(
  project: PaintProject,
  outFile: string,
  timeMs = 0,
): Promise<string> {
  await mkdir(path.dirname(outFile), { recursive: true });
  const canvas = renderProjectToCanvas(project, nodeCanvasFactory, { timeMs });
  await writeFile(outFile, canvasToPngBuffer(canvas));
  return outFile;
}
