import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  planExportFrames,
  renderProjectToCanvas,
  renderProject,
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

export interface VideoOptions {
  fps?: number;
  /** Output scale relative to the project size (e.g. 0.5) */
  scale?: number;
  /** x264/vp9 quality (lower = better). Default 20 (mp4) / 32 (webm) */
  crf?: number;
  /** Render only this time range (ms) */
  fromMs?: number;
  toMs?: number;
  onProgress?: (done: number, total: number) => void;
}

/** Stream raw RGBA frames into ffmpeg → H.264 MP4 or VP9 WebM (silent, yuv420p). */
export async function renderVideo(project: PaintProject, outFile: string, opts: VideoOptions = {}): Promise<string> {
  const { spawn } = await import('node:child_process');
  const fps = opts.fps ?? project.fps;
  const scale = opts.scale ?? 1;
  const w = Math.round((project.width * scale) / 2) * 2;
  const h = Math.round((project.height * scale) / 2) * 2;
  await mkdir(path.dirname(path.resolve(outFile)), { recursive: true });
  const webm = outFile.toLowerCase().endsWith('.webm');
  const codec = webm
    ? ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(opts.crf ?? 32), '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4']
    : ['-c:v', 'libx264', '-preset', 'medium', '-crf', String(opts.crf ?? 20), '-movflags', '+faststart'];
  const args = [
    '-y', '-loglevel', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-r', String(fps), '-i', '-',
    '-an', ...codec, '-pix_fmt', 'yuv420p', '-r', String(fps), outFile,
  ];
  const ff = spawn(process.env.FFMPEG_PATH ?? 'ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const exited = new Promise<number>((resolve, reject) => {
    ff.on('error', (err) => reject(new Error(`ffmpeg not found or failed to start (${err.message}). Install ffmpeg or set FFMPEG_PATH.`)));
    ff.on('close', (code) => resolve(code ?? 1));
  });
  const canvas = nodeCanvasFactory(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  const plans = planExportFrames(project, fps).filter(
    (p) => p.timeMs >= (opts.fromMs ?? 0) && p.timeMs < (opts.toMs ?? Infinity),
  );
  for (let i = 0; i < plans.length; i++) {
    renderProject(ctx, project, { timeMs: plans[i].timeMs, viewTransform: [w / project.width, 0, 0, h / project.height, 0, 0] });
    const data = ctx.getImageData(0, 0, w, h).data;
    const ok = ff.stdin.write(Buffer.from(data.buffer, data.byteOffset, data.byteLength));
    if (!ok) await new Promise((r) => ff.stdin.once('drain', r));
    opts.onProgress?.(i + 1, plans.length);
  }
  ff.stdin.end();
  const code = await exited;
  if (code !== 0) throw new Error(`ffmpeg exited with code ${code}`);
  return outFile;
}

/** Losslessly concatenate videos with identical codec settings (ffmpeg concat demuxer). */
export async function concatVideos(inputs: string[], outFile: string): Promise<string> {
  const { spawn } = await import('node:child_process');
  const os = await import('node:os');
  const list = path.join(os.tmpdir(), `paint-studio-concat-${process.pid}.txt`);
  await writeFile(list, inputs.map((f) => `file '${path.resolve(f).replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  await mkdir(path.dirname(path.resolve(outFile)), { recursive: true });
  const code = await new Promise<number>((resolve, reject) => {
    const ff = spawn(process.env.FFMPEG_PATH ?? 'ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', outFile], { stdio: 'inherit' });
    ff.on('error', reject);
    ff.on('close', (c) => resolve(c ?? 1));
  });
  if (code !== 0) throw new Error(`ffmpeg concat exited with code ${code}`);
  return outFile;
}
