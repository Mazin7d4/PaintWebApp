import * as gifencNs from 'gifenc';
import { planExportFrames, renderProject, type PaintProject } from '@paint-studio/core';

type GifEnc = typeof import('gifenc');
// gifenc ships CJS + ESM builds with different export shapes; normalise both.
const gifMod = gifencNs as unknown as GifEnc & { default?: GifEnc };
const { GIFEncoder, quantize, applyPalette } = typeof gifMod.GIFEncoder === 'function' ? gifMod : (gifMod.default as GifEnc);

export type Progress = (fraction: number) => void;

function frameCanvas(project: PaintProject, scale: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(project.width * scale));
  canvas.height = Math.max(1, Math.round(project.height * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas unavailable');
  return { canvas, ctx };
}

function drawAt(ctx: CanvasRenderingContext2D, project: PaintProject, timeMs: number, scale: number): void {
  renderProject(ctx, project, { timeMs, viewTransform: [scale, 0, 0, scale, 0, 0] });
}

const tick = () => new Promise((r) => setTimeout(r, 0));

export async function exportGif(project: PaintProject, scale = 1, onProgress?: Progress): Promise<Blob> {
  const { canvas, ctx } = frameCanvas(project, scale);
  const plans = planExportFrames(project);
  const gif = GIFEncoder();
  for (let i = 0; i < plans.length; i++) {
    drawAt(ctx, project, plans[i].timeMs, scale);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, canvas.width, canvas.height, { palette, delay: Math.round(plans[i].durationMs) });
    onProgress?.((i + 1) / plans.length);
    if (i % 4 === 0) await tick();
  }
  gif.finish();
  return new Blob([gif.bytes() as BlobPart], { type: 'image/gif' });
}

export async function exportPng(project: PaintProject, timeMs: number, scale = 1): Promise<Blob> {
  const { canvas, ctx } = frameCanvas(project, scale);
  drawAt(ctx, project, timeMs, scale);
  return toBlob(canvas);
}

function toBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encoding failed'))), type));
}

export async function exportSpriteSheet(project: PaintProject, scale = 1, onProgress?: Progress): Promise<{ png: Blob; meta: object }> {
  const plans = planExportFrames(project);
  const cols = Math.ceil(Math.sqrt(plans.length));
  const rows = Math.ceil(plans.length / cols);
  const fw = Math.round(project.width * scale);
  const fh = Math.round(project.height * scale);
  const sheet = document.createElement('canvas');
  sheet.width = fw * cols;
  sheet.height = fh * rows;
  const sctx = sheet.getContext('2d')!;
  const { canvas, ctx } = frameCanvas(project, scale);
  const frames: { x: number; y: number; w: number; h: number; timeMs: number; durationMs: number }[] = [];
  for (let i = 0; i < plans.length; i++) {
    drawAt(ctx, project, plans[i].timeMs, scale);
    const x = (i % cols) * fw;
    const y = Math.floor(i / cols) * fh;
    sctx.drawImage(canvas, x, y);
    frames.push({ x, y, w: fw, h: fh, timeMs: plans[i].timeMs, durationMs: plans[i].durationMs });
    onProgress?.((i + 1) / plans.length);
  }
  return { png: await toBlob(sheet), meta: { image: 'spritesheet.png', fps: project.fps, columns: cols, rows, frames } };
}

export async function exportPngSequence(project: PaintProject, scale = 1, onProgress?: Progress): Promise<Blob> {
  const plans = planExportFrames(project);
  const { canvas, ctx } = frameCanvas(project, scale);
  const files: { name: string; data: Uint8Array }[] = [];
  for (let i = 0; i < plans.length; i++) {
    drawAt(ctx, project, plans[i].timeMs, scale);
    const blob = await toBlob(canvas);
    files.push({ name: `frame_${String(i).padStart(4, '0')}.png`, data: new Uint8Array(await blob.arrayBuffer()) });
    onProgress?.((i + 1) / plans.length);
  }
  return zipStore(files);
}

/** Real-time WebM capture with MediaRecorder (VP9 when available). */
export async function exportWebm(project: PaintProject, scale = 1, onProgress?: Progress): Promise<Blob> {
  if (typeof MediaRecorder === 'undefined') throw new Error('MediaRecorder is not supported in this browser');
  const { canvas, ctx } = frameCanvas(project, scale);
  const plans = planExportFrames(project);
  const stream = canvas.captureStream(project.fps);
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
  if (!mime) throw new Error('WebM recording is not supported in this browser');
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise<void>((r) => { rec.onstop = () => r(); });
  drawAt(ctx, project, 0, scale);
  rec.start();
  const start = performance.now();
  for (let i = 0; i < plans.length; i++) {
    drawAt(ctx, project, plans[i].timeMs, scale);
    onProgress?.((i + 1) / plans.length);
    const due = start + plans[i].timeMs + plans[i].durationMs;
    await new Promise((r) => setTimeout(r, Math.max(0, due - performance.now())));
  }
  rec.stop();
  stream.getTracks().forEach((t) => t.stop());
  await done;
  return new Blob(chunks, { type: 'video/webm' });
}

// --- minimal store-only ZIP writer (no compression; PNGs are already compressed) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zipStore(files: { name: string; data: Uint8Array }[]): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, f.data.length, true);
    local.setUint32(22, f.data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, f.data);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, f.data.length, true);
    cd.setUint32(24, f.data.length, true);
    cd.setUint16(28, name.length, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), name);
    offset += 30 + name.length + f.data.length;
  }
  const cdSize = central.reduce((s, p) => s + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)] as BlobPart[], { type: 'application/zip' });
}

export function download(blob: Blob, filename: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
