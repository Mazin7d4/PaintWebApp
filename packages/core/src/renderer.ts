import { drawStroke } from './brushes.js';
import { frameIndexAtTime, projectDurationMs, timeAtFrameStart } from './project.js';
import { getStylePreset } from './styles.js';
import { sampleCamera, sampleTransform } from './tween.js';
import type {
  CanvasFactory,
  CanvasLike,
  DrawObject,
  PaintProject,
  ParticleEmitterObject,
  RenderOptions,
  ShapeObject,
  TextObject,
  Transform2D,
} from './types.js';

function applyTransform(ctx: CanvasRenderingContext2D, tf: Transform2D, pivotX = 0, pivotY = 0): void {
  ctx.translate(tf.x + pivotX, tf.y + pivotY);
  ctx.rotate((tf.rotation * Math.PI) / 180);
  ctx.scale(tf.scaleX, tf.scaleY);
  ctx.translate(-pivotX, -pivotY);
  ctx.globalAlpha *= Math.max(0, Math.min(1, tf.opacity));
}

function fillStyle(ctx: CanvasRenderingContext2D, fill: ShapeObject['fill'] | TextObject['fill']): void {
  if (!fill) return;
  if (fill.gradient) {
    const g = fill.gradient;
    const grad =
      g.type === 'radial'
        ? ctx.createRadialGradient(g.x0, g.y0, 0, g.x1, g.y1, Math.hypot(g.x1 - g.x0, g.y1 - g.y0) || 1)
        : ctx.createLinearGradient(g.x0, g.y0, g.x1, g.y1);
    for (const stop of g.stops) grad.addColorStop(stop.offset, stop.color);
    ctx.fillStyle = grad;
  } else if (fill.color) {
    ctx.fillStyle = fill.color;
  }
  if (fill.opacity != null) ctx.globalAlpha *= fill.opacity;
}

function strokeStyle(ctx: CanvasRenderingContext2D, stroke: ShapeObject['stroke']): void {
  if (!stroke) return;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineCap = stroke.lineCap ?? 'round';
  ctx.lineJoin = stroke.lineJoin ?? 'round';
  if (stroke.dash) ctx.setLineDash(stroke.dash);
  if (stroke.opacity != null) ctx.globalAlpha *= stroke.opacity;
}

function applyShadow(ctx: CanvasRenderingContext2D, shadow: ShapeObject['shadow']): void {
  if (!shadow) return;
  ctx.shadowColor = shadow.color;
  ctx.shadowBlur = shadow.blur;
  ctx.shadowOffsetX = shadow.offsetX;
  ctx.shadowOffsetY = shadow.offsetY;
}

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function drawShape(ctx: CanvasRenderingContext2D, obj: ShapeObject, timeMs: number): void {
  const tf = sampleTransform(obj.keyframes, timeMs, obj.transform);
  ctx.save();
  applyTransform(ctx, tf, (obj.x ?? 0) + (obj.w ?? 0) / 2, (obj.y ?? 0) + (obj.h ?? 0) / 2);
  applyShadow(ctx, obj.shadow);
  ctx.beginPath();
  if (obj.shape === 'rect') {
    const r = obj.cornerRadius ?? 0;
    if (r > 0 && typeof ctx.roundRect === 'function') ctx.roundRect(obj.x, obj.y, obj.w ?? 0, obj.h ?? 0, r);
    else ctx.rect(obj.x, obj.y, obj.w ?? 0, obj.h ?? 0);
  } else if (obj.shape === 'ellipse') {
    ctx.ellipse(
      obj.x + (obj.w ?? 0) / 2,
      obj.y + (obj.h ?? 0) / 2,
      Math.abs((obj.w ?? 0) / 2),
      Math.abs((obj.h ?? 0) / 2),
      0,
      0,
      Math.PI * 2,
    );
  } else if (obj.shape === 'line') {
    ctx.moveTo(obj.x, obj.y);
    ctx.lineTo(obj.x2 ?? obj.x, obj.y2 ?? obj.y);
  } else if (obj.shape === 'polygon' && obj.points) {
    obj.points.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
    ctx.closePath();
  } else if (obj.shape === 'path' && obj.path && typeof Path2D !== 'undefined') {
    const path = new Path2D(obj.path);
    if (obj.fill) {
      fillStyle(ctx, obj.fill);
      ctx.fill(path);
    }
    if (obj.stroke) {
      strokeStyle(ctx, obj.stroke);
      ctx.stroke(path);
    }
    ctx.restore();
    return;
  }
  if (obj.fill && obj.shape !== 'line') {
    fillStyle(ctx, obj.fill);
    ctx.fill();
  }
  if (obj.stroke) {
    strokeStyle(ctx, obj.stroke);
    ctx.stroke();
  }
  ctx.restore();
}

function drawText(ctx: CanvasRenderingContext2D, obj: TextObject, timeMs: number): void {
  const tf = sampleTransform(obj.keyframes, timeMs, obj.transform);
  ctx.save();
  applyTransform(ctx, tf, obj.x, obj.y);
  applyShadow(ctx, obj.shadow);
  const size = obj.fontSize ?? 32;
  const weight = obj.fontWeight ?? 700;
  const family = obj.fontFamily ?? 'Plus Jakarta Sans, system-ui, sans-serif';
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.textAlign = obj.align ?? 'left';
  ctx.textBaseline = obj.baseline ?? 'alphabetic';
  if (obj.fill) {
    fillStyle(ctx, obj.fill);
    ctx.fillText(obj.text, obj.x, obj.y);
  }
  if (obj.stroke) {
    strokeStyle(ctx, obj.stroke);
    ctx.strokeText(obj.text, obj.x, obj.y);
  }
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, obj: ParticleEmitterObject, timeMs: number): void {
  const tf = sampleTransform(obj.keyframes, timeMs, obj.transform);
  const rand = seededRandom(obj.seed ?? 1);
  ctx.save();
  applyTransform(ctx, tf, obj.x, obj.y);
  for (let i = 0; i < obj.count; i++) {
    const life = obj.life;
    const localT = ((timeMs / life) + rand()) % 1;
    const angle = (rand() - 0.5) * obj.spread * (Math.PI / 180);
    const spd = obj.speed * (0.5 + rand());
    const x = obj.x + Math.cos(angle) * spd * localT;
    const y = obj.y + Math.sin(angle) * spd * localT + (obj.gravity ?? 120) * localT * localT;
    const alpha = (1 - localT) * tf.opacity;
    const size = obj.size * (1 - localT * 0.5);
    ctx.fillStyle = obj.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawObject(ctx: CanvasRenderingContext2D, obj: DrawObject, timeMs: number): void {
  if (obj.type === 'stroke') {
    const tf = sampleTransform(obj.keyframes, timeMs, obj.transform);
    let reveal = obj.reveal ?? 1;
    if (obj.writeOnMs && obj.writeOnMs > 0) {
      reveal = Math.min(1, Math.max(0, timeMs / obj.writeOnMs));
    }
    ctx.save();
    applyTransform(ctx, tf);
    drawStroke(ctx, obj.brush, obj.points, reveal);
    ctx.restore();
  } else if (obj.type === 'shape') {
    drawShape(ctx, obj, timeMs);
  } else if (obj.type === 'text') {
    drawText(ctx, obj, timeMs);
  } else if (obj.type === 'particles') {
    drawParticles(ctx, obj, timeMs);
  }
}

function resolveTime(project: PaintProject, options?: RenderOptions): number {
  if (options?.timeMs != null) return options.timeMs;
  if (options?.frameIndex != null) return timeAtFrameStart(project, options.frameIndex);
  return 0;
}

/** Create an in-memory canvas via factory and render one frame. */
export function renderProjectToCanvas(
  project: PaintProject,
  createCanvas: CanvasFactory,
  options?: RenderOptions,
): CanvasLike {
  const canvas = createCanvas(project.width, project.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  renderProject(ctx, project, options);
  return canvas;
}

export function renderProject(
  ctx: CanvasRenderingContext2D,
  project: PaintProject,
  options?: RenderOptions,
): void {
  const timeMs = resolveTime(project, options);
  const style = getStylePreset(project.style?.id);
  const smoothing = options?.imageSmoothing ?? style.imageSmoothing;
  ctx.imageSmoothingEnabled = smoothing;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, project.width, project.height);
  ctx.fillStyle = project.background;
  ctx.fillRect(0, 0, project.width, project.height);

  const camera = options?.camera ?? sampleCamera(project.camera, project.cameraKeyframes, timeMs);
  ctx.save();
  ctx.translate(project.width / 2, project.height / 2);
  ctx.rotate(((camera.rotation ?? 0) * Math.PI) / 180);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-project.width / 2 - camera.x, -project.height / 2 - camera.y);

  // Onion skin (previous/next frame ghosts) — timeline editor aid
  if (options?.onionSkin) {
    const idx = frameIndexAtTime(project, timeMs);
    const { prev, next, opacity } = options.onionSkin;
    for (let d = prev; d >= 1; d--) {
      const fi = idx - d;
      if (fi < 0) continue;
      const t = timeAtFrameStart(project, fi);
      ctx.save();
      ctx.globalAlpha = opacity * (1 - (d - 1) / (prev + 1));
      paintLayers(ctx, project, t);
      ctx.restore();
    }
    for (let d = 1; d <= next; d++) {
      const fi = idx + d;
      if (fi >= project.frames.length) continue;
      const t = timeAtFrameStart(project, fi);
      ctx.save();
      ctx.globalAlpha = opacity * (1 - (d - 1) / (next + 1));
      paintLayers(ctx, project, t);
      ctx.restore();
    }
  }

  paintLayers(ctx, project, timeMs);
  ctx.restore();
}

function paintLayers(ctx: CanvasRenderingContext2D, project: PaintProject, timeMs: number): void {
  for (const layer of project.layers) {
    if (!layer.visible) continue;
    ctx.save();
    ctx.globalAlpha *= layer.opacity;
    ctx.globalCompositeOperation = layer.blendMode;
    for (const obj of layer.objects) {
      drawObject(ctx, obj, timeMs);
    }
    ctx.restore();
  }
}

export interface FrameRenderPlan {
  frameIndex: number;
  timeMs: number;
  durationMs: number;
}

/** Expand project timeline into discrete export frames at project.fps (or override). */
export function planExportFrames(project: PaintProject, fps = project.fps): FrameRenderPlan[] {
  const duration = projectDurationMs(project);
  const frameMs = 1000 / Math.max(1, fps);
  const plans: FrameRenderPlan[] = [];
  for (let t = 0, i = 0; t < duration; t += frameMs, i++) {
    plans.push({
      frameIndex: frameIndexAtTime(project, t),
      timeMs: t,
      durationMs: frameMs,
    });
  }
  if (plans.length === 0) {
    plans.push({ frameIndex: 0, timeMs: 0, durationMs: frameMs });
  }
  return plans;
}
