import {
  HistoryStack,
  STYLE_PRESETS,
  applyOps,
  cameraMatrix,
  createEmptyProject,
  drawStroke,
  findObject,
  frameIndexAtTime,
  generateProjectFromPrompt,
  getStylePreset,
  hitTestObject,
  localBounds,
  matApply,
  matInvert,
  matMul,
  objectMatrix,
  objectPivot,
  objectTransformAt,
  projectDurationMs,
  rectCorners,
  renderProject,
  resizeTransform,
  rotateTransformAround,
  scaleTransformAround,
  setObjectTransform,
  snapAngle,
  snapRect,
  timeAtFrameStart,
  uid,
  validateProject,
  worldAabb,
  worldCorners,
  type BrushKind,
  type BrushSettings,
  type DrawObject,
  type DrawObjectInput,
  type EasingName,
  type EditOp,
  type HandleId,
  type Mat2D,
  type PaintProject,
  type Rect,
  type StrokePoint,
  type StylePresetId,
  type Transform2D,
  type Vec2,
} from '@paint-studio/core';
import { download, exportGif, exportPng, exportPngSequence, exportSpriteSheet, exportWebm } from './exporters';
import { starterProject } from './starter';

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------
const $ = <T extends HTMLElement = HTMLElement>(id: string) => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`#${id} missing`);
  return found as T;
};
const canvas = $<HTMLCanvasElement>('paintCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
const stage = $('stage');
const optionsBar = $('optionsBar');
const inspector = $('inspector');
const inspectorTitle = $('inspectorTitle');
const layersList = $('layersList');
const layerProps = $('layerProps');
const trackScroll = $('trackScroll');
const trackArea = $('trackArea');
const trackLabels = $('trackLabels');
const ruler = $('ruler');
const frameRow = $('frameRow');
const keyRows = $('keyRows');
const playhead = $('playhead');
const timecode = $('timecode');
const fpsInput = $<HTMLInputElement>('fpsInput');
const frameDurInput = $<HTMLInputElement>('frameDurInput');
const styleSelect = $<HTMLSelectElement>('styleSelect');
const statusText = $('statusText');
const textEditor = $<HTMLInputElement>('textEditor');
const measureCtx = document.createElement('canvas').getContext('2d')!;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
type Tool = 'select' | 'brush' | 'eraser' | 'rect' | 'ellipse' | 'line' | 'text' | 'eyedropper' | 'hand';
const TOOLS: Tool[] = ['select', 'brush', 'eraser', 'rect', 'ellipse', 'line', 'text', 'eyedropper', 'hand'];
const AUTOSAVE_KEY = 'paint-studio-v2-autosave';
const PREFS_KEY = 'paint-studio-v2-prefs';

let history = new HistoryStack(createEmptyProject({ width: 960, height: 540 }));

const state = {
  tool: 'select' as Tool,
  selection: [] as string[],
  activeLayerId: '',
  timeMs: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
  playing: false,
  loop: true,
  autoKey: false,
  onion: false,
  grid: false,
  snap: true,
  brushKind: 'ink' as BrushKind,
  brushSize: 8,
  brushOpacity: 1,
  smoothing: 2,
  pressure: 0.6,
  color: '#1A1A1A',
  fillColor: '#FFD600',
  fillOn: true,
  strokeOn: true,
  strokeWidth: 4,
  cornerRadius: 0,
  fontSize: 48,
};

const project = (): PaintProject => history.project;
const measure = (text: string, font: string): number => {
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
};
const frameStep = () => 1000 / Math.max(1, project().fps);
const duration = () => Math.max(1, projectDurationMs(project()));

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------
function toast(msg: string, kind: 'info' | 'error' = 'info'): void {
  const t = document.createElement('div');
  t.className = `toast${kind === 'error' ? ' error' : ''}`;
  t.textContent = msg;
  $('toasts').appendChild(t);
  setTimeout(() => t.remove(), kind === 'error' ? 6000 : 3200);
}
window.addEventListener('error', (e) => toast(`Error: ${e.message}`, 'error'));
window.addEventListener('unhandledrejection', (e) => toast(`Error: ${(e.reason as Error)?.message ?? e.reason}`, 'error'));

function guard<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch (err) {
    toast((err as Error).message, 'error');
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Viewport (zoom / pan / hi-DPI)
// ---------------------------------------------------------------------------
let dpr = 1;
let cssW = 0;
let cssH = 0;

function viewMatrix(): Mat2D {
  return [state.zoom, 0, 0, state.zoom, state.panX, state.panY];
}
/** world (object space) -> CSS pixels of the stage canvas */
function worldToCssMatrix(): Mat2D {
  return matMul(viewMatrix(), cameraMatrix(project(), state.timeMs));
}
function cssToWorld(p: Vec2): Vec2 {
  return matApply(matInvert(worldToCssMatrix()), p);
}
function worldToCss(p: Vec2): Vec2 {
  return matApply(worldToCssMatrix(), p);
}
function eventCss(e: { clientX: number; clientY: number }): Vec2 {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function resizeCanvas(): void {
  const r = stage.getBoundingClientRect();
  dpr = window.devicePixelRatio || 1;
  const first = cssW === 0;
  cssW = r.width;
  cssH = r.height;
  canvas.width = Math.max(1, Math.round(cssW * dpr));
  canvas.height = Math.max(1, Math.round(cssH * dpr));
  if (first) fitView();
  requestRender();
}

function fitView(): void {
  const p = project();
  if (!cssW || !cssH) return;
  state.zoom = Math.max(0.05, Math.min((cssW - 80) / p.width, (cssH - 90) / p.height));
  state.panX = (cssW - p.width * state.zoom) / 2;
  state.panY = (cssH - 30 - p.height * state.zoom) / 2;
  updateZoomLabel();
  requestRender();
}

function zoomAt(css: Vec2, nextZoom: number): void {
  const z = Math.max(0.05, Math.min(32, nextZoom));
  state.panX = css.x - ((css.x - state.panX) * z) / state.zoom;
  state.panY = css.y - ((css.y - state.panY) * z) / state.zoom;
  state.zoom = z;
  updateZoomLabel();
  requestRender();
}

function updateZoomLabel(): void {
  $('zoomLabel').textContent = `${Math.round(state.zoom * 100)}%`;
}

// ---------------------------------------------------------------------------
// Objects / selection helpers
// ---------------------------------------------------------------------------
interface ObjRef { obj: DrawObject; layerId: string; locked: boolean; visible: boolean }
function allObjects(): ObjRef[] {
  const out: ObjRef[] = [];
  for (const l of project().layers) for (const o of l.objects) out.push({ obj: o, layerId: l.id, locked: !!l.locked, visible: l.visible });
  return out;
}

function getObj(id: string): DrawObject | undefined {
  return findObject(project(), id)?.object;
}

function activeLayer() {
  const p = project();
  return p.layers.find((l) => l.id === state.activeLayerId) ?? p.layers[p.layers.length - 1];
}

function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Precise hit: strokes/lines by distance to the path, others by oriented bounds. */
function hitObject(obj: DrawObject, world: Vec2, tolPx = 5): boolean {
  const tol = tolPx / state.zoom;
  if (!hitTestObject(obj, world, state.timeMs, tol, measure)) return false;
  const m = objectMatrix(obj, state.timeMs);
  const local = matApply(matInvert(m), world);
  const scale = Math.max(1e-6, Math.hypot(m[0], m[1]));
  if (obj.type === 'stroke') {
    const r = obj.brush.size / 2 + tol / scale;
    const pts = obj.points;
    if (pts.length === 1) return Math.hypot(local.x - pts[0].x, local.y - pts[0].y) <= r;
    for (let i = 1; i < pts.length; i++) if (distToSegment(local, pts[i - 1], pts[i]) <= r) return true;
    return false;
  }
  if (obj.type === 'shape' && obj.shape === 'line') {
    return distToSegment(local, { x: obj.x, y: obj.y }, { x: obj.x2 ?? obj.x, y: obj.y2 ?? obj.y }) <= (obj.stroke?.width ?? 2) / 2 + tol / scale;
  }
  return true;
}

function pickObject(world: Vec2): DrawObject | null {
  const layers = project().layers;
  for (let li = layers.length - 1; li >= 0; li--) {
    const l = layers[li];
    if (!l.visible || l.locked) continue;
    for (let oi = l.objects.length - 1; oi >= 0; oi--) {
      if (hitObject(l.objects[oi], world)) return l.objects[oi];
    }
  }
  return null;
}

function setSelection(ids: string[]): void {
  state.selection = [...new Set(ids.filter((id) => !!getObj(id)))];
  if (state.selection.length) {
    const found = findObject(project(), state.selection[state.selection.length - 1]);
    if (found) state.activeLayerId = found.layer.id;
  }
  refreshPanels();
}

function pruneSelection(): void {
  state.selection = state.selection.filter((id) => !!getObj(id));
}

/** Oriented frame of the selection in CSS px: corners nw, ne, se, sw. */
function selectionFrame(): { corners: Vec2[]; single: DrawObject | null } | null {
  const objs = state.selection.map(getObj).filter((o): o is DrawObject => !!o);
  if (objs.length === 0) return null;
  if (objs.length === 1) return { corners: worldCorners(objs[0], state.timeMs, measure).map(worldToCss), single: objs[0] };
  const pts = objs.flatMap((o) => worldCorners(o, state.timeMs, measure)).map(worldToCss);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { corners: rectCorners({ x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }), single: null };
}

function handlePoints(c: Vec2[]): Record<HandleId, Vec2> {
  const mid = (a: Vec2, b: Vec2) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  return { nw: c[0], n: mid(c[0], c[1]), ne: c[1], e: mid(c[1], c[2]), se: c[2], s: mid(c[2], c[3]), sw: c[3], w: mid(c[3], c[0]) };
}

function rotateHandlePoint(c: Vec2[]): Vec2 {
  const center = { x: (c[0].x + c[2].x) / 2, y: (c[0].y + c[2].y) / 2 };
  const top = { x: (c[0].x + c[1].x) / 2, y: (c[0].y + c[1].y) / 2 };
  let dx = top.x - center.x;
  let dy = top.y - center.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) { dx = 0; dy = -1; } else { dx /= len; dy /= len; }
  return { x: top.x + dx * 26, y: top.y + dy * 26 };
}

function pointInPoly(p: Vec2, poly: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

type HandleHit = { kind: 'resize'; handle: HandleId } | { kind: 'rotate' } | null;
function hitHandle(css: Vec2): HandleHit {
  const f = selectionFrame();
  if (!f) return null;
  const rp = rotateHandlePoint(f.corners);
  if (Math.hypot(css.x - rp.x, css.y - rp.y) <= 9) return { kind: 'rotate' };
  const hp = handlePoints(f.corners);
  for (const id of Object.keys(hp) as HandleId[]) {
    if (Math.hypot(css.x - hp[id].x, css.y - hp[id].y) <= 8) return { kind: 'resize', handle: id };
  }
  for (const id of ['nw', 'ne', 'se', 'sw'] as HandleId[]) {
    const d = Math.hypot(css.x - hp[id].x, css.y - hp[id].y);
    if (d > 8 && d <= 20 && !pointInPoly(css, f.corners)) return { kind: 'rotate' };
  }
  return null;
}

function cursorForHandle(h: HandleId): string {
  const f = selectionFrame();
  if (!f) return 'default';
  const hp = handlePoints(f.corners);
  const c = { x: (f.corners[0].x + f.corners[2].x) / 2, y: (f.corners[0].y + f.corners[2].y) / 2 };
  const ang = ((Math.atan2(hp[h].y - c.y, hp[h].x - c.x) * 180) / Math.PI + 360) % 180;
  return ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'][Math.round(ang / 45) % 4];
}

/** Write a transform for an object: keyframed when animated or auto-key is on. */
function writeTransform(draft: PaintProject, id: string, tf: Transform2D): void {
  const obj = findObject(draft, id)?.object;
  if (!obj) return;
  const animated = (obj.keyframes?.length ?? 0) > 0 || state.autoKey;
  setObjectTransform(draft, id, tf, animated ? Math.round(state.timeMs) : undefined);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
let renderQueued = false;
function requestRender(): void {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderNow(true);
  });
}

let guides: { x: number[]; y: number[] } = { x: [], y: [] };
let hoverId: string | null = null;

function renderNow(overlay: boolean): void {
  const p = project();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const vt: Mat2D = [dpr * state.zoom, 0, 0, dpr * state.zoom, dpr * state.panX, dpr * state.panY];
  ctx.setTransform(...vt);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(6 / state.zoom, 8 / state.zoom, p.width, p.height);
  renderProject(ctx, p, {
    timeMs: state.timeMs,
    viewTransform: vt,
    onionSkin: state.onion && !state.playing ? { prev: 1, next: 1, opacity: 0.2 } : undefined,
    imageSmoothing: getStylePreset(p.style?.id).imageSmoothing,
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  if (overlay) drawOverlay();
}

function setWorldTransform(): void {
  const m = worldToCssMatrix();
  ctx.setTransform(dpr * m[0], dpr * m[1], dpr * m[2], dpr * m[3], dpr * m[4], dpr * m[5]);
}

function drawOverlay(): void {
  const p = project();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.strokeStyle = 'rgba(255,214,0,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(state.panX - 0.5, state.panY - 0.5, p.width * state.zoom + 1, p.height * state.zoom + 1);
  if (state.grid) {
    const step = p.style?.id === 'pixel-art' ? 8 : 32;
    if (step * state.zoom >= 6) {
      ctx.strokeStyle = 'rgba(0,0,0,0.14)';
      ctx.beginPath();
      for (let x = 0; x <= p.width; x += step) {
        const sx = Math.round(state.panX + x * state.zoom) + 0.5;
        ctx.moveTo(sx, state.panY);
        ctx.lineTo(sx, state.panY + p.height * state.zoom);
      }
      for (let y = 0; y <= p.height; y += step) {
        const sy = Math.round(state.panY + y * state.zoom) + 0.5;
        ctx.moveTo(state.panX, sy);
        ctx.lineTo(state.panX + p.width * state.zoom, sy);
      }
      ctx.stroke();
    }
  }
  if (drag?.kind === 'draw' && drag.points.length > 0) {
    setWorldTransform();
    const brush = currentBrush();
    const preview: BrushSettings = state.tool === 'eraser' ? { ...brush, color: '#ffffff', opacity: 0.55, blendMode: 'source-over' } : brush;
    drawStroke(ctx, preview, drag.points, 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  if (drag?.kind === 'shape') {
    const obj = shapeFromDrag(drag.startWorld, drag.curWorld, drag.shift, drag.alt);
    if (obj) {
      const m = worldToCssMatrix();
      const tmp: PaintProject = { ...p, cameraKeyframes: undefined, camera: undefined, layers: [{ id: 'tmp', name: 'tmp', visible: true, opacity: 1, blendMode: 'source-over', objects: [obj] }] };
      ctx.save();
      renderProject(ctx, tmp, { timeMs: state.timeMs, viewTransform: [dpr * m[0], dpr * m[1], dpr * m[2], dpr * m[3], dpr * m[4], dpr * m[5]], transparent: true });
      ctx.restore();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }
  if (hoverId && !state.selection.includes(hoverId) && !drag) {
    const o = getObj(hoverId);
    if (o) strokePoly(worldCorners(o, state.timeMs, measure).map(worldToCss), 'rgba(255,214,0,0.6)', 1);
  }
  const f = selectionFrame();
  if (f) {
    if (!f.single) {
      for (const id of state.selection) {
        const o = getObj(id);
        if (o) strokePoly(worldCorners(o, state.timeMs, measure).map(worldToCss), 'rgba(255,214,0,0.45)', 1);
      }
    }
    strokePoly(f.corners, '#FFD600', 1.5);
    if (!drag || drag.kind === 'resize' || drag.kind === 'rotate') drawHandles(f.corners);
    if (drag && (drag.kind === 'move' || drag.kind === 'resize' || drag.kind === 'rotate') && f.single) drawReadout(f.single, f.corners[2], drag.kind);
  }
  if (guides.x.length || guides.y.length) {
    ctx.strokeStyle = '#FF3DCB';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const gx of guides.x) {
      const a = worldToCss({ x: gx, y: -1e5 });
      const b = worldToCss({ x: gx, y: 1e5 });
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    for (const gy of guides.y) {
      const a = worldToCss({ x: -1e5, y: gy });
      const b = worldToCss({ x: 1e5, y: gy });
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
  }
  if (drag?.kind === 'marquee') {
    const r = normRect(drag.startCss, drag.curCss);
    ctx.fillStyle = 'rgba(255,214,0,0.08)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = '#FFD600';
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w, r.h);
    ctx.setLineDash([]);
  }
}

function drawHandles(corners: Vec2[]): void {
  const hp = handlePoints(corners);
  const rp = rotateHandlePoint(corners);
  ctx.strokeStyle = '#FFD600';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(hp.n.x, hp.n.y);
  ctx.lineTo(rp.x, rp.y);
  ctx.stroke();
  ctx.fillStyle = '#FFD600';
  ctx.beginPath();
  ctx.arc(rp.x, rp.y, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.stroke();
  for (const id of Object.keys(hp) as HandleId[]) {
    const h = hp[id];
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.fillRect(h.x - 4.5, h.y - 4.5, 9, 9);
    ctx.strokeRect(h.x - 4.5, h.y - 4.5, 9, 9);
  }
}

function drawReadout(obj: DrawObject, at: Vec2, kind: string): void {
  const tf = objectTransformAt(obj, state.timeMs);
  const b = localBounds(obj, measure);
  const label = kind === 'rotate'
    ? `${Math.round(((tf.rotation % 360) + 360) % 360)}°`
    : kind === 'resize'
      ? `${Math.round(Math.abs(b.w * tf.scaleX))} × ${Math.round(Math.abs(b.h * tf.scaleY))}`
      : `x ${Math.round(tf.x)}  y ${Math.round(tf.y)}`;
  ctx.font = '600 11px "JetBrains Mono", monospace';
  const w = ctx.measureText(label).width + 10;
  ctx.fillStyle = '#FFD600';
  ctx.fillRect(at.x + 8, at.y + 8, w, 18);
  ctx.fillStyle = '#000';
  ctx.fillText(label, at.x + 13, at.y + 21);
}

function strokePoly(pts: Vec2[], color: string, width: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  pts.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
  ctx.closePath();
  ctx.stroke();
}

function normRect(a: Vec2, b: Vec2): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}

// ---------------------------------------------------------------------------
// Tools: brush / shapes / text
// ---------------------------------------------------------------------------
function currentBrush(): BrushSettings {
  const preset = getStylePreset(project().style?.id);
  const eraser = state.tool === 'eraser';
  return {
    ...preset.defaultBrush,
    kind: state.brushKind,
    size: state.brushSize,
    color: state.color,
    opacity: eraser ? 1 : state.brushOpacity,
    smoothing: state.smoothing,
    pressureWidth: state.pressure,
    blendMode: eraser ? 'destination-out' : 'source-over',
  };
}

function shapeFromDrag(a: Vec2, b0: Vec2, shift: boolean, alt: boolean): DrawObject | null {
  let b = { ...b0 };
  if (state.tool === 'line') {
    if (shift) {
      const ang = snapAngle((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI, 45) * (Math.PI / 180);
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      b = { x: a.x + Math.cos(ang) * len, y: a.y + Math.sin(ang) * len };
    }
    return { type: 'shape', id: 'preview', shape: 'line', x: a.x, y: a.y, x2: b.x, y2: b.y, stroke: { color: state.color, width: state.strokeWidth } };
  }
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  if (shift) {
    const s = Math.max(Math.abs(dx), Math.abs(dy));
    dx = Math.sign(dx || 1) * s;
    dy = Math.sign(dy || 1) * s;
  }
  let x = Math.min(a.x, a.x + dx);
  let y = Math.min(a.y, a.y + dy);
  let w = Math.abs(dx);
  let h = Math.abs(dy);
  if (alt) {
    x = a.x - w;
    y = a.y - h;
    w *= 2;
    h *= 2;
  }
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    type: 'shape',
    id: 'preview',
    shape: state.tool === 'ellipse' ? 'ellipse' : 'rect',
    x: r(x), y: r(y), w: r(w), h: r(h),
    ...(state.tool === 'rect' && state.cornerRadius > 0 ? { cornerRadius: state.cornerRadius } : {}),
    ...(state.fillOn ? { fill: { color: state.fillColor } } : {}),
    ...(state.strokeOn ? { stroke: { color: state.color, width: state.strokeWidth } } : {}),
  };
}

function ensureDrawableLayer(): string | null {
  const layer = activeLayer();
  if (!layer) return null;
  if (layer.locked) {
    toast(`Layer “${layer.name}” is locked`, 'error');
    return null;
  }
  if (!layer.visible) toast(`Layer “${layer.name}” is hidden`);
  return layer.id;
}

/** Apply edit ops as one undo step; returns created ids. */
function commit(ops: EditOp[], opts: { select?: boolean } = {}): string[] {
  const res = guard(() => {
    const { project: next, created } = applyOps(project(), ops);
    history.replace(next, true);
    return created;
  });
  pruneSelection();
  if (res && opts.select) setSelection(res.filter((id) => !!getObj(id)));
  else refreshPanels();
  scheduleAutosave();
  return res ?? [];
}

function withoutId(obj: DrawObject): DrawObjectInput {
  const copy = { ...obj } as Partial<DrawObject>;
  delete copy.id;
  return copy as DrawObjectInput;
}

function openTextEditor(world: Vec2, existing?: Extract<DrawObject, { type: 'text' }>): void {
  const css = worldToCss(existing ? { x: existing.x, y: existing.y } : world);
  const size = (existing?.fontSize ?? state.fontSize) * state.zoom;
  textEditor.hidden = false;
  textEditor.value = existing?.text ?? '';
  textEditor.style.left = `${css.x}px`;
  textEditor.style.top = `${css.y - size * 0.85}px`;
  textEditor.style.font = `700 ${Math.max(10, size)}px Plus Jakarta Sans, sans-serif`;
  textEditor.style.height = `${Math.max(16, size * 1.15)}px`;
  setTimeout(() => textEditor.focus(), 0);
  let done = false;
  const finish = (save: boolean) => {
    if (done) return;
    done = true;
    textEditor.hidden = true;
    const text = textEditor.value.trim();
    if (!save) return;
    if (existing) {
      if (!text) commit([{ op: 'removeObject', id: existing.id }]);
      else if (text !== existing.text) commit([{ op: 'updateObject', id: existing.id, props: { text } }]);
      return;
    }
    if (!text) return;
    const layerId = ensureDrawableLayer();
    if (!layerId) return;
    commit([{ op: 'addObject', layerId, object: { type: 'text', text, x: Math.round(world.x), y: Math.round(world.y), fontSize: state.fontSize, fontWeight: 800, fill: { color: state.color } } }], { select: true });
  };
  textEditor.onkeydown = (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') finish(true);
    if (e.key === 'Escape') finish(false);
  };
  textEditor.onblur = () => finish(true);
}

// ---------------------------------------------------------------------------
// Pointer interaction
// ---------------------------------------------------------------------------
type Drag =
  | { kind: 'move'; startWorld: Vec2; startTfs: Map<string, Transform2D>; startAabb: Rect; targetsX: number[]; targetsY: number[]; dupIds: Map<string, string> | null; moved: boolean }
  | { kind: 'resize'; handle: HandleId; single: boolean; startTfs: Map<string, Transform2D>; anchorWorld: Vec2; handleWorld: Vec2; centerWorld: Vec2 }
  | { kind: 'rotate'; centerWorld: Vec2; startAngle: number; startTfs: Map<string, Transform2D> }
  | { kind: 'marquee'; startCss: Vec2; curCss: Vec2; base: string[] }
  | { kind: 'pan'; startCss: Vec2; startPan: Vec2 }
  | { kind: 'draw'; points: StrokePoint[] }
  | { kind: 'shape'; startWorld: Vec2; curWorld: Vec2; shift: boolean; alt: boolean };

let drag: Drag | null = null;
let spaceDown = false;
let spaceUsed = false;

function startTransforms(ids: string[]): Map<string, Transform2D> {
  const m = new Map<string, Transform2D>();
  for (const id of ids) {
    const o = getObj(id);
    if (o) m.set(id, objectTransformAt(o, state.timeMs));
  }
  return m;
}

function selectionCenterWorld(): Vec2 {
  const f = selectionFrame();
  if (!f) return { x: 0, y: 0 };
  return cssToWorld({ x: (f.corners[0].x + f.corners[2].x) / 2, y: (f.corners[0].y + f.corners[2].y) / 2 });
}

function snapTargets(exclude: Set<string>): { xs: number[]; ys: number[] } {
  const p = project();
  const xs = [0, p.width / 2, p.width];
  const ys = [0, p.height / 2, p.height];
  for (const { obj, visible } of allObjects()) {
    if (exclude.has(obj.id) || !visible) continue;
    const r = worldAabb(obj, state.timeMs, measure);
    if (r.w > p.width * 1.5) continue;
    xs.push(r.x, r.x + r.w / 2, r.x + r.w);
    ys.push(r.y, r.y + r.h / 2, r.y + r.h);
  }
  return { xs, ys };
}

function selectionAabb(ids: string[]): Rect {
  const rects = ids.map(getObj).filter((o): o is DrawObject => !!o).map((o) => worldAabb(o, state.timeMs, measure));
  const xs = rects.flatMap((r) => [r.x, r.x + r.w]);
  const ys = rects.flatMap((r) => [r.y, r.y + r.h]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

function pressureOf(e: PointerEvent): number {
  if (e.pointerType === 'pen') return e.pressure > 0 ? e.pressure : 0.5;
  return 0.5;
}

const OPPOSITE: Record<HandleId, HandleId> = { nw: 'se', n: 's', ne: 'sw', e: 'w', se: 'nw', s: 'n', sw: 'ne', w: 'e' };

function onSelectDown(e: PointerEvent, css: Vec2, world: Vec2): void {
  const hh = hitHandle(css);
  if (hh?.kind === 'resize') {
    const f = selectionFrame()!;
    const hp = handlePoints(f.corners);
    history.begin();
    drag = {
      kind: 'resize',
      handle: hh.handle,
      single: !!f.single,
      startTfs: startTransforms(state.selection),
      anchorWorld: cssToWorld(hp[OPPOSITE[hh.handle]]),
      handleWorld: cssToWorld(hp[hh.handle]),
      centerWorld: selectionCenterWorld(),
    };
    return;
  }
  if (hh?.kind === 'rotate') {
    const c = selectionCenterWorld();
    history.begin();
    drag = { kind: 'rotate', centerWorld: c, startAngle: Math.atan2(world.y - c.y, world.x - c.x), startTfs: startTransforms(state.selection) };
    return;
  }
  const f = selectionFrame();
  const hit = pickObject(world);
  const insideGroup = !!f && !f.single && pointInPoly(css, f.corners) && !e.shiftKey;
  if (hit || insideGroup) {
    if (hit && !insideGroup) {
      if (e.shiftKey) {
        const has = state.selection.includes(hit.id);
        setSelection(has ? state.selection.filter((i) => i !== hit.id) : [...state.selection, hit.id]);
        if (has) return;
      } else if (!state.selection.includes(hit.id)) {
        setSelection([hit.id]);
      }
    }
    const ids = [...state.selection];
    const t = snapTargets(new Set(ids));
    history.begin();
    drag = {
      kind: 'move',
      startWorld: world,
      startTfs: startTransforms(ids),
      startAabb: selectionAabb(ids),
      targetsX: t.xs,
      targetsY: t.ys,
      dupIds: e.altKey ? new Map(ids.map((id) => [id, uid('copy')])) : null,
      moved: false,
    };
    return;
  }
  drag = { kind: 'marquee', startCss: css, curCss: css, base: e.shiftKey ? [...state.selection] : [] };
  if (!e.shiftKey) setSelection([]);
}

canvas.addEventListener('pointerdown', (e) => {
  if (e.button === 2) return;
  if (!textEditor.hidden) textEditor.blur();
  canvas.focus();
  if (state.playing) pause();
  const css = eventCss(e);
  const world = cssToWorld(css);
  canvas.setPointerCapture(e.pointerId);
  if (e.button === 1 || spaceDown || state.tool === 'hand') {
    spaceUsed = true;
    drag = { kind: 'pan', startCss: css, startPan: { x: state.panX, y: state.panY } };
    canvas.style.cursor = 'grabbing';
    return;
  }
  switch (state.tool) {
    case 'select':
      onSelectDown(e, css, world);
      return;
    case 'brush':
    case 'eraser':
      if (!ensureDrawableLayer()) return;
      drag = { kind: 'draw', points: [{ ...world, p: pressureOf(e) }] };
      requestRender();
      return;
    case 'rect':
    case 'ellipse':
    case 'line':
      if (!ensureDrawableLayer()) return;
      drag = { kind: 'shape', startWorld: world, curWorld: world, shift: e.shiftKey, alt: e.altKey };
      return;
    case 'text': {
      const hit = pickObject(world);
      e.preventDefault();
      openTextEditor(world, hit?.type === 'text' ? hit : undefined);
      return;
    }
    case 'eyedropper': {
      renderNow(false);
      const px = ctx.getImageData(Math.floor(css.x * dpr), Math.floor(css.y * dpr), 1, 1).data;
      const hex = `#${[px[0], px[1], px[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
      state.color = hex;
      state.fillColor = hex;
      requestRender();
      renderOptions();
      toast(`Picked ${hex}`);
      return;
    }
    default:
      return;
  }
});

function onDragMove(e: PointerEvent, css: Vec2, world: Vec2): void {
  if (!drag) return;
  switch (drag.kind) {
    case 'pan':
      state.panX = drag.startPan.x + css.x - drag.startCss.x;
      state.panY = drag.startPan.y + css.y - drag.startCss.y;
      break;
    case 'draw': {
      const events = typeof e.getCoalescedEvents === 'function' && e.getCoalescedEvents().length ? e.getCoalescedEvents() : [e];
      for (const ce of events) {
        const w = cssToWorld(eventCss(ce));
        const last = drag.points[drag.points.length - 1];
        if (Math.hypot(w.x - last.x, w.y - last.y) * state.zoom < 1.5) continue;
        drag.points.push({ ...w, p: pressureOf(ce) });
      }
      break;
    }
    case 'shape':
      drag.curWorld = world;
      drag.shift = e.shiftKey;
      drag.alt = e.altKey;
      break;
    case 'marquee': {
      drag.curCss = css;
      const r = normRect(drag.startCss, css);
      const hits = allObjects()
        .filter(({ visible, locked }) => visible && !locked)
        .filter(({ obj }) => {
          const pts = worldCorners(obj, state.timeMs, measure).map(worldToCss);
          const minX = Math.min(...pts.map((p) => p.x));
          const maxX = Math.max(...pts.map((p) => p.x));
          const minY = Math.min(...pts.map((p) => p.y));
          const maxY = Math.max(...pts.map((p) => p.y));
          return minX < r.x + r.w && maxX > r.x && minY < r.y + r.h && maxY > r.y;
        })
        .map(({ obj }) => obj.id);
      state.selection = [...new Set([...drag.base, ...hits])];
      break;
    }
    case 'move': {
      const d = drag;
      let dx = world.x - d.startWorld.x;
      let dy = world.y - d.startWorld.y;
      if (!d.moved && Math.hypot(dx, dy) * state.zoom < 3) return;
      d.moved = true;
      if (e.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0;
        else dx = 0;
      }
      guides = { x: [], y: [] };
      if (state.snap && !(e.ctrlKey || e.metaKey)) {
        const s = snapRect({ ...d.startAabb, x: d.startAabb.x + dx, y: d.startAabb.y + dy }, d.targetsX, d.targetsY, 6 / state.zoom);
        dx += s.dx;
        dy += s.dy;
        guides = { x: s.guidesX, y: s.guidesY };
      }
      history.update((draft) => {
        for (const [id, tf] of d.startTfs) {
          let target = id;
          if (d.dupIds) {
            const found = findObject(draft, id);
            if (!found) continue;
            const copy = structuredClone(found.object);
            copy.id = d.dupIds.get(id)!;
            found.layer.objects.splice(found.index + 1, 0, copy);
            target = copy.id;
          }
          writeTransform(draft, target, { ...tf, x: tf.x + dx, y: tf.y + dy });
        }
      });
      if (d.dupIds) state.selection = [...d.dupIds.values()];
      break;
    }
    case 'resize': {
      const d = drag;
      history.update((draft) => {
        if (d.single) {
          const [id, tf] = [...d.startTfs][0];
          const obj = findObject(draft, id)?.object;
          if (!obj) return;
          const next = resizeTransform(tf, localBounds(obj, measure), objectPivot(obj), d.handle, world, {
            keepAspect: e.shiftKey || obj.type === 'text',
            fromCenter: e.altKey,
          });
          writeTransform(draft, id, next);
          return;
        }
        const anchor = e.altKey ? d.centerWorld : d.anchorWorld;
        const hx = d.handleWorld.x - anchor.x;
        const hy = d.handleWorld.y - anchor.y;
        const k = Math.max(0.02, ((world.x - anchor.x) * hx + (world.y - anchor.y) * hy) / (hx * hx + hy * hy || 1));
        for (const [id, tf] of d.startTfs) {
          const obj = findObject(draft, id)?.object;
          if (obj) writeTransform(draft, id, scaleTransformAround(tf, objectPivot(obj), anchor, k));
        }
      });
      break;
    }
    case 'rotate': {
      const d = drag;
      let delta = ((Math.atan2(world.y - d.centerWorld.y, world.x - d.centerWorld.x) - d.startAngle) * 180) / Math.PI;
      if (e.shiftKey) {
        const base = d.startTfs.size === 1 ? [...d.startTfs.values()][0].rotation : 0;
        delta = snapAngle(base + delta) - base;
      }
      history.update((draft) => {
        for (const [id, tf] of d.startTfs) {
          const obj = findObject(draft, id)?.object;
          if (obj) writeTransform(draft, id, rotateTransformAround(tf, objectPivot(obj), d.centerWorld, delta));
        }
      });
      break;
    }
  }
  requestRender();
}

canvas.addEventListener('pointermove', (e) => {
  const css = eventCss(e);
  const world = cssToWorld(css);
  statusText.textContent = `${Math.round(world.x)}, ${Math.round(world.y)}  ·  ${project().width}×${project().height}`;
  if (drag) onDragMove(e, css, world);
  else updateHoverCursor(css, world);
});

function updateHoverCursor(css: Vec2, world: Vec2): void {
  let cursor: string;
  const prevHover = hoverId;
  hoverId = null;
  if (spaceDown || state.tool === 'hand') cursor = 'grab';
  else if (state.tool === 'select') {
    const hh = hitHandle(css);
    if (hh?.kind === 'resize') cursor = cursorForHandle(hh.handle);
    else if (hh?.kind === 'rotate') cursor = 'alias';
    else {
      const hit = pickObject(world);
      hoverId = hit?.id ?? null;
      cursor = hit ? 'move' : 'default';
    }
  } else if (state.tool === 'text') cursor = 'text';
  else if (state.tool === 'eyedropper') cursor = 'copy';
  else cursor = 'crosshair';
  canvas.style.cursor = cursor;
  if (prevHover !== hoverId) requestRender();
}

function endDrag(e: PointerEvent, cancelled = false): void {
  if (!drag) return;
  const d = drag;
  drag = null;
  guides = { x: [], y: [] };
  try { canvas.releasePointerCapture(e.pointerId); } catch { /* not captured */ }
  switch (d.kind) {
    case 'pan':
      canvas.style.cursor = spaceDown || state.tool === 'hand' ? 'grab' : 'default';
      break;
    case 'draw': {
      const layerId = cancelled ? null : ensureDrawableLayer();
      if (layerId) {
        const pts = d.points.length === 1 ? [d.points[0], { ...d.points[0], x: d.points[0].x + 0.01 }] : d.points;
        commit([{ op: 'addObject', layerId, object: { type: 'stroke', brush: currentBrush(), points: pts.map((p) => ({ x: +p.x.toFixed(2), y: +p.y.toFixed(2), p: +(p.p ?? 0.5).toFixed(3) })) } }]);
      }
      break;
    }
    case 'shape': {
      const obj = shapeFromDrag(d.startWorld, d.curWorld, d.shift, d.alt);
      const tiny = Math.hypot(d.curWorld.x - d.startWorld.x, d.curWorld.y - d.startWorld.y) * state.zoom < 3;
      const layerId = cancelled || tiny ? null : ensureDrawableLayer();
      if (obj && layerId) commit([{ op: 'addObject', layerId, object: withoutId(obj) }], { select: true });
      break;
    }
    case 'marquee':
      setSelection(state.selection);
      break;
    default:
      if (cancelled) history.cancel();
      else if (history.end()) scheduleAutosave();
      refreshPanels();
  }
  requestRender();
}
canvas.addEventListener('pointerup', (e) => endDrag(e));
canvas.addEventListener('pointercancel', (e) => endDrag(e, true));
canvas.addEventListener('lostpointercapture', (e) => { if (drag) endDrag(e); });
canvas.addEventListener('pointerleave', () => {
  if (hoverId && !drag) {
    hoverId = null;
    requestRender();
  }
});
canvas.addEventListener('dblclick', (e) => {
  const world = cssToWorld(eventCss(e));
  const hit = pickObject(world);
  if (hit?.type === 'text') openTextEditor(world, hit);
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const css = eventCss(e);
  if (e.shiftKey && !e.ctrlKey) {
    state.panX -= e.deltaY;
    requestRender();
    return;
  }
  // mouse wheel and trackpad pinch (ctrlKey) zoom toward the cursor
  const unit = e.deltaMode === 1 ? 0.05 : 0.0018;
  zoomAt(css, state.zoom * Math.exp(-e.deltaY * unit * (e.ctrlKey ? 4 : 1)));
}, { passive: false });

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
function setTool(tool: Tool): void {
  state.tool = tool;
  document.querySelectorAll<HTMLButtonElement>('.tool').forEach((b) => b.classList.toggle('on', b.dataset.tool === tool));
  canvas.style.cursor = tool === 'hand' ? 'grab' : tool === 'select' ? 'default' : tool === 'text' ? 'text' : 'crosshair';
  renderOptions();
  requestRender();
}

function deleteSelection(): void {
  if (!state.selection.length) return;
  commit(state.selection.map((id): EditOp => ({ op: 'removeObject', id })));
  setSelection([]);
}

function duplicateSelection(): void {
  if (!state.selection.length) return;
  setSelection(commit(state.selection.map((id): EditOp => ({ op: 'duplicateObject', id, offset: { x: 20, y: 20 } }))));
}

function nudge(dx: number, dy: number): void {
  if (!state.selection.length) return;
  const tfs = startTransforms(state.selection);
  guard(() => history.commit((draft) => {
    for (const [id, tf] of tfs) writeTransform(draft, id, { ...tf, x: tf.x + dx, y: tf.y + dy });
  }));
  afterChange();
}

function arrange(dir: 'front' | 'back' | 'forward' | 'backward'): void {
  const ops: EditOp[] = [];
  for (const id of state.selection) {
    const f = findObject(project(), id);
    if (!f) continue;
    const n = f.layer.objects.length;
    const to = dir === 'front' ? n - 1 : dir === 'back' ? 0 : dir === 'forward' ? Math.min(n - 1, f.index + 1) : Math.max(0, f.index - 1);
    ops.push({ op: 'moveObject', id, toIndex: to });
  }
  if (ops.length) commit(ops);
}

function align(edge: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom'): void {
  const ids = state.selection;
  if (!ids.length) return;
  const target = ids.length === 1 ? { x: 0, y: 0, w: project().width, h: project().height } : selectionAabb(ids);
  const tfs = startTransforms(ids);
  guard(() => history.commit((draft) => {
    for (const [id, tf] of tfs) {
      const o = findObject(draft, id)?.object;
      if (!o) continue;
      const r = worldAabb(o, state.timeMs, measure);
      let dx = 0;
      let dy = 0;
      if (edge === 'left') dx = target.x - r.x;
      if (edge === 'right') dx = target.x + target.w - (r.x + r.w);
      if (edge === 'hcenter') dx = target.x + target.w / 2 - (r.x + r.w / 2);
      if (edge === 'top') dy = target.y - r.y;
      if (edge === 'bottom') dy = target.y + target.h - (r.y + r.h);
      if (edge === 'vcenter') dy = target.y + target.h / 2 - (r.y + r.h / 2);
      writeTransform(draft, id, { ...tf, x: tf.x + dx, y: tf.y + dy });
    }
  }));
  afterChange();
}

function keyframeSelection(): void {
  if (!state.selection.length) {
    toast('Select an object to keyframe');
    return;
  }
  commit(state.selection.map((id): EditOp => ({ op: 'setKeyframe', id, t: Math.round(state.timeMs) })));
  toast(`Keyframe at ${Math.round(state.timeMs)}ms`);
}

function undo(): void {
  if (!history.inTransaction && history.undo()) afterChange();
}
function redo(): void {
  if (!history.inTransaction && history.redo()) afterChange();
}

function afterChange(): void {
  pruneSelection();
  state.timeMs = Math.min(state.timeMs, duration());
  refreshPanels();
  scheduleAutosave();
}

function loadProject(p: PaintProject, opts: { record?: boolean; fit?: boolean } = {}): void {
  const r = validateProject(p);
  if (!r.ok) throw new Error(`Invalid project: ${r.errors.map((e) => `${e.path} ${e.message}`).join('; ')}`);
  if (opts.record) history.replace(p, true);
  else history = new HistoryStack(p);
  state.selection = [];
  state.timeMs = 0;
  state.activeLayerId = p.layers[p.layers.length - 1].id;
  styleSelect.value = p.style?.id ?? 'inked-cartoon';
  if (opts.fit !== false) fitView();
  refreshPanels();
  scheduleAutosave();
}

// ---------------------------------------------------------------------------
// Playback / time
// ---------------------------------------------------------------------------
let rafId = 0;
let lastTick = 0;
function play(): void {
  if (state.playing) return;
  state.playing = true;
  if (state.timeMs >= duration() - 1) state.timeMs = 0;
  lastTick = performance.now();
  $('playBtn').textContent = '❚❚';
  const step = (now: number) => {
    if (!state.playing) return;
    state.timeMs += now - lastTick;
    lastTick = now;
    if (state.timeMs >= duration()) {
      if (state.loop) state.timeMs %= duration();
      else {
        state.timeMs = duration();
        pause();
        return;
      }
    }
    updateTimeUi();
    renderNow(true);
    rafId = requestAnimationFrame(step);
  };
  rafId = requestAnimationFrame(step);
}
function pause(): void {
  state.playing = false;
  cancelAnimationFrame(rafId);
  $('playBtn').textContent = '▶';
  refreshPanels();
}
function togglePlay(): void {
  if (state.playing) pause();
  else play();
}
function setTime(ms: number, snap = true): void {
  let t = Math.max(0, Math.min(duration(), ms));
  if (snap) t = Math.min(duration(), Math.round(t / frameStep()) * frameStep());
  state.timeMs = t;
  updateTimeUi();
  renderInspector();
  markDiamonds();
  requestRender();
}

function fmtTime(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = (ms % 60000) / 1000;
  return `${m}:${s.toFixed(3).padStart(6, '0')}`;
}

function currentFrameIndex(): number {
  return frameIndexAtTime(project(), Math.min(state.timeMs, duration() - 0.001));
}

function updateTimeUi(): void {
  const p = project();
  const fi = currentFrameIndex();
  timecode.textContent = `${fmtTime(state.timeMs)} · f${Math.round(state.timeMs / frameStep())} · #${fi + 1}/${p.frames.length}`;
  playhead.style.left = `${state.timeMs * pxPerMs()}px`;
  frameRow.querySelectorAll<HTMLElement>('.frame-cell').forEach((c, i) => c.classList.toggle('on', i === fi));
  if (document.activeElement !== frameDurInput) frameDurInput.value = String(p.frames[fi]?.duration ?? 0);
}

function markDiamonds(): void {
  keyRows.querySelectorAll<HTMLElement>('.diamond').forEach((d) => {
    const row = d.parentElement as HTMLElement;
    d.classList.toggle('on', state.selection.includes(row.dataset.objectId ?? '') && Math.abs(Number(d.dataset.t) - state.timeMs) < frameStep() / 2);
  });
}

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------
function refreshPanels(): void {
  const p = project();
  if (!p.layers.some((l) => l.id === state.activeLayerId)) state.activeLayerId = p.layers[p.layers.length - 1]?.id ?? '';
  $<HTMLButtonElement>('undoBtn').disabled = !history.canUndo();
  $<HTMLButtonElement>('redoBtn').disabled = !history.canRedo();
  if (document.activeElement !== fpsInput) fpsInput.value = String(p.fps);
  renderLayers();
  renderInspector();
  renderTimeline();
  requestRender();
}

function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, children: (Node | string)[] = []): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  Object.assign(e, props);
  e.append(...children);
  return e;
}

function numField(label: string, value: number, onCommit: (v: number) => void, opts: { step?: number; title?: string; testId?: string } = {}): HTMLElement {
  const input = h('input', { type: 'number', value: String(Math.round(value * 100) / 100), step: String(opts.step ?? 1) });
  if (opts.testId) input.dataset.testid = opts.testId;
  const commitVal = () => {
    const v = Number(input.value);
    if (Number.isFinite(v)) onCommit(v);
  };
  input.addEventListener('change', commitVal);
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') input.blur();
  });
  const lab = h('span', { textContent: label, title: opts.title ?? `${label} — drag to scrub` });
  lab.addEventListener('pointerdown', (e) => {
    const start = e.clientX;
    const v0 = Number(input.value) || 0;
    lab.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      input.value = String(Math.round((v0 + (ev.clientX - start) * (opts.step ?? 1) * (ev.shiftKey ? 10 : 1)) * 100) / 100);
    };
    const up = () => {
      lab.removeEventListener('pointermove', move);
      lab.removeEventListener('pointerup', up);
      if (Number(input.value) !== v0) commitVal();
    };
    lab.addEventListener('pointermove', move);
    lab.addEventListener('pointerup', up);
  });
  return h('label', { className: 'field' }, [lab, input]);
}

function toHex6(c: string): string {
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
  if (/^#[0-9a-f]{8}$/i.test(c)) return c.slice(0, 7);
  return '#000000';
}

function colorField(label: string, value: string, onCommit: (v: string) => void): HTMLElement {
  const input = h('input', { type: 'color', value: toHex6(value) });
  input.addEventListener('change', () => onCommit(input.value.toUpperCase()));
  return h('label', { className: 'field' }, [h('span', { textContent: label }), input, h('code', { textContent: toHex6(value).toUpperCase() })]);
}

function chip(text: string, onClick: () => void, title = '', on = false): HTMLButtonElement {
  const b = h('button', { type: 'button', className: `chip${on ? ' on' : ''}`, textContent: text, title });
  b.addEventListener('click', onClick);
  return b;
}

function textInput(value: string, onCommit: (v: string) => void): HTMLInputElement {
  const i = h('input', { type: 'text', value });
  i.addEventListener('keydown', (e) => e.stopPropagation());
  i.addEventListener('change', () => onCommit(i.value));
  return i;
}

function renderInspector(): void {
  if (inspector.contains(document.activeElement) && ['INPUT', 'SELECT'].includes(document.activeElement?.tagName ?? '')) return;
  inspector.innerHTML = '';
  const objs = state.selection.map(getObj).filter((o): o is DrawObject => !!o);
  if (objs.length === 0) return renderProjectInspector();
  if (objs.length > 1) {
    inspectorTitle.textContent = `${objs.length} objects`;
    inspector.append(
      h('div', { className: 'row-actions' }, [
        chip('⇤', () => align('left'), 'Align left'), chip('↔', () => align('hcenter'), 'Align centre'), chip('⇥', () => align('right'), 'Align right'),
        chip('⤒', () => align('top'), 'Align top'), chip('↕', () => align('vcenter'), 'Align middle'), chip('⤓', () => align('bottom'), 'Align bottom'),
      ]),
      h('div', { className: 'row-actions' }, [chip('◆ Key', keyframeSelection, 'Keyframe all at playhead (K)'), chip('Duplicate', duplicateSelection, 'Ctrl+D'), chip('Delete', deleteSelection, 'Del')]),
    );
    return;
  }
  const o = objs[0];
  inspectorTitle.textContent = `${o.type === 'shape' ? o.shape : o.type} · ${o.id}`;
  const tf = objectTransformAt(o, state.timeMs);
  const b = localBounds(o, measure);
  const c = worldCorners(o, state.timeMs, measure);
  const center = { x: (c[0].x + c[2].x) / 2, y: (c[0].y + c[2].y) / 2 };
  const pivot = objectPivot(o);
  const setTf = (next: Transform2D) => {
    guard(() => history.commit((d) => writeTransform(d, o.id, next)));
    afterChange();
  };
  const curW = Math.abs(b.w * tf.scaleX) || 1;
  const curH = Math.abs(b.h * tf.scaleY) || 1;
  inspector.append(
    h('div', { className: 'grid2' }, [
      numField('X', center.x, (v) => setTf({ ...tf, x: tf.x + v - center.x }), { testId: 'insp-x', title: 'Centre X' }),
      numField('Y', center.y, (v) => setTf({ ...tf, y: tf.y + v - center.y }), { testId: 'insp-y', title: 'Centre Y' }),
      numField('W', curW, (v) => v > 0 && setTf(scaleTransformAround(tf, pivot, center, v / curW, 1)), { testId: 'insp-w', title: 'Width' }),
      numField('H', curH, (v) => v > 0 && setTf(scaleTransformAround(tf, pivot, center, 1, v / curH)), { testId: 'insp-h', title: 'Height' }),
      numField('R', tf.rotation, (v) => setTf(rotateTransformAround(tf, pivot, center, v - tf.rotation)), { testId: 'insp-r', title: 'Rotation (deg)' }),
      numField('O', tf.opacity * 100, (v) => setTf({ ...tf, opacity: Math.max(0, Math.min(100, v)) / 100 }), { testId: 'insp-o', title: 'Opacity %' }),
    ]),
  );
  const style = h('div', { className: 'grid2' });
  style.style.marginTop = '6px';
  const upd = (props: Record<string, unknown>) => commit([{ op: 'updateObject', id: o.id, props }]);
  if (o.type === 'shape') {
    if (o.shape !== 'line') style.append(colorField('F', o.fill?.color ?? '#000000', (v) => upd({ fill: { ...(o.fill ?? {}), color: v } })));
    style.append(colorField('S', o.stroke?.color ?? '#000000', (v) => upd({ stroke: { ...(o.stroke ?? { width: 2 }), color: v } })));
    style.append(numField('SW', o.stroke?.width ?? 0, (v) => upd({ stroke: { ...(o.stroke ?? { color: '#000000' }), width: Math.max(0, v) } }), { title: 'Stroke width' }));
    if (o.shape === 'rect') style.append(numField('CR', o.cornerRadius ?? 0, (v) => upd({ cornerRadius: Math.max(0, v) }), { title: 'Corner radius' }));
  } else if (o.type === 'stroke') {
    style.append(colorField('C', o.brush.color, (v) => upd({ brush: { ...o.brush, color: v } })));
    style.append(numField('SZ', o.brush.size, (v) => upd({ brush: { ...o.brush, size: Math.max(0.5, v) } }), { title: 'Brush size' }));
    style.append(numField('WO', o.writeOnMs ?? 0, (v) => upd({ writeOnMs: v > 0 ? v : undefined }), { title: 'Write-on duration (ms): animates the stroke being drawn' }));
  } else if (o.type === 'text') {
    style.append(h('label', { className: 'field wide' }, [h('span', { textContent: 'TXT' }), textInput(o.text, (v) => upd({ text: v }))]));
    style.append(colorField('C', o.fill?.color ?? '#000000', (v) => upd({ fill: { ...(o.fill ?? {}), color: v } })));
    style.append(numField('PT', o.fontSize ?? 32, (v) => upd({ fontSize: Math.max(4, v) }), { title: 'Font size' }));
  }
  inspector.append(style);
  const kfs = o.keyframes ?? [];
  const here = kfs.find((k) => Math.abs(k.t - state.timeMs) < frameStep() / 2);
  const easeSel = h('select', { title: 'Easing into this keyframe', disabled: !here });
  for (const name of ['linear', 'easeIn', 'easeOut', 'easeInOut', 'easeInCubic', 'easeOutCubic', 'easeInOutCubic', 'easeOutBack', 'easeOutElastic', 'easeOutBounce']) {
    easeSel.append(h('option', { value: name, textContent: name }));
  }
  easeSel.value = here?.easing ?? 'linear';
  easeSel.addEventListener('change', () => here && commit([{ op: 'setKeyframe', id: o.id, t: here.t, transform: here.transform, easing: easeSel.value as EasingName }]));
  inspector.append(
    h('div', { className: 'row-actions' }, [
      chip(here ? '◆ Remove key' : '◇ Add key', () => (here ? commit([{ op: 'removeKeyframe', id: o.id, t: here.t }]) : keyframeSelection()), 'Toggle keyframe at playhead (K)', !!here),
      h('label', { className: 'field' }, [h('span', { textContent: 'EZ' }), easeSel]),
      ...(kfs.length ? [chip('Clear keys', () => commit([{ op: 'clearKeyframes', id: o.id }]), 'Remove all keyframes (keeps pose at 0)')] : []),
    ]),
    h('div', { className: 'row-actions' }, [
      chip('↑ Fwd', () => arrange('forward'), 'Bring forward (Ctrl+])'),
      chip('↓ Back', () => arrange('backward'), 'Send backward (Ctrl+[)'),
      chip('Duplicate', duplicateSelection, 'Ctrl+D'),
      chip('Delete', deleteSelection, 'Del'),
    ]),
  );
}

function renderProjectInspector(): void {
  const p = project();
  inspectorTitle.textContent = 'Project';
  inspector.append(
    h('div', { className: 'grid2' }, [
      h('label', { className: 'field wide' }, [h('span', { textContent: 'NAME' }), textInput(p.name, (v) => commit([{ op: 'setProject', props: { name: v || 'Untitled' } }]))]),
      numField('W', p.width, (v) => commit([{ op: 'setProject', props: { width: Math.max(16, Math.round(v)) } }]), { title: 'Canvas width' }),
      numField('H', p.height, (v) => commit([{ op: 'setProject', props: { height: Math.max(16, Math.round(v)) } }]), { title: 'Canvas height' }),
      colorField('BG', p.background, (v) => commit([{ op: 'setProject', props: { background: v } }])),
      numField('FPS', p.fps, (v) => commit([{ op: 'setProject', props: { fps: v } }])),
    ]),
    h('p', { className: 'empty', textContent: 'Select objects with V. Drag handles to scale, the yellow dot to rotate. Shift-click or drag a marquee for multi-select.' }),
  );
}

// layers --------------------------------------------------------------------
let dragLayerId: string | null = null;
function renderLayers(): void {
  const p = project();
  layersList.innerHTML = '';
  for (const layer of [...p.layers].reverse()) {
    const row = h('div', { className: `layer${layer.id === state.activeLayerId ? ' on' : ''}`, draggable: true });
    row.setAttribute('role', 'listitem');
    row.dataset.layerId = layer.id;
    const vis = h('button', { type: 'button', className: `icon-toggle${layer.visible ? '' : ' off'}`, textContent: '👁', title: layer.visible ? 'Hide layer' : 'Show layer' });
    vis.dataset.act = 'vis';
    const lock = h('button', { type: 'button', className: `icon-toggle${layer.locked ? '' : ' off'}`, textContent: layer.locked ? '🔒' : '🔓', title: layer.locked ? 'Unlock layer' : 'Lock layer' });
    lock.dataset.act = 'lock';
    const name = h('span', { className: 'name', textContent: layer.name, title: 'Double-click to rename' });
    row.append(h('span', { className: 'grip', textContent: '⋮⋮', title: 'Drag to reorder' }), vis, lock, name, h('span', { className: 'count', textContent: String(layer.objects.length) }));
    vis.addEventListener('click', (e) => {
      e.stopPropagation();
      commit([{ op: 'setLayer', layerId: layer.id, props: { visible: !layer.visible } }]);
    });
    lock.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!layer.locked) state.selection = state.selection.filter((id) => !layer.objects.some((o) => o.id === id));
      commit([{ op: 'setLayer', layerId: layer.id, props: { locked: !layer.locked } }]);
    });
    row.addEventListener('click', () => {
      state.activeLayerId = layer.id;
      layersList.querySelectorAll('.layer').forEach((r) => r.classList.toggle('on', r === row));
    });
    name.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const input = h('input', { type: 'text', value: layer.name });
      name.textContent = '';
      name.append(input);
      input.focus();
      input.select();
      let done = false;
      const finish = (save: boolean) => {
        if (done) return;
        done = true;
        const v = input.value.trim();
        if (save && v && v !== layer.name) commit([{ op: 'setLayer', layerId: layer.id, props: { name: v } }]);
        else renderLayers();
      };
      input.addEventListener('keydown', (ev) => {
        ev.stopPropagation();
        if (ev.key === 'Enter') finish(true);
        if (ev.key === 'Escape') finish(false);
      });
      input.addEventListener('blur', () => finish(true));
    });
    row.addEventListener('dragstart', (e) => {
      dragLayerId = layer.id;
      e.dataTransfer?.setData('text/plain', layer.id);
    });
    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      const r = row.getBoundingClientRect();
      const before = e.clientY < r.top + r.height / 2;
      row.classList.toggle('drop-before', before);
      row.classList.toggle('drop-after', !before);
    });
    row.addEventListener('dragleave', () => row.classList.remove('drop-before', 'drop-after'));
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      row.classList.remove('drop-before', 'drop-after');
      const src = dragLayerId ?? e.dataTransfer?.getData('text/plain');
      dragLayerId = null;
      if (!src || src === layer.id) return;
      const r = row.getBoundingClientRect();
      moveLayerRelative(src, layer.id, e.clientY < r.top + r.height / 2);
    });
    layersList.append(row);
  }
  layerProps.innerHTML = '';
  const al = activeLayer();
  if (!al) return;
  const op = h('input', { type: 'range', min: '0', max: '100', value: String(Math.round(al.opacity * 100)), title: 'Layer opacity' });
  op.dataset.testid = 'layer-opacity';
  op.addEventListener('change', () => commit([{ op: 'setLayer', layerId: al.id, props: { opacity: Number(op.value) / 100 } }]));
  const blend = h('select', { title: 'Blend mode' });
  for (const m of ['source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion']) {
    blend.append(h('option', { value: m, textContent: m === 'source-over' ? 'normal' : m }));
  }
  blend.value = al.blendMode;
  blend.addEventListener('change', () => commit([{ op: 'setLayer', layerId: al.id, props: { blendMode: blend.value as PaintProject['layers'][number]['blendMode'] } }]));
  layerProps.append(
    h('label', { className: 'field' }, [h('span', { textContent: 'OP' }), op, h('code', { textContent: `${Math.round(al.opacity * 100)}%` })]),
    h('label', { className: 'field' }, [h('span', { textContent: 'BL' }), blend]),
  );
}

/** Move a layer to sit visually above/below another (panel is top = last index). */
function moveLayerRelative(srcId: string, targetId: string, visuallyAbove: boolean): void {
  const ids = project().layers.map((l) => l.id).filter((id) => id !== srcId);
  const ti = ids.indexOf(targetId);
  if (ti < 0) return;
  ids.splice(visuallyAbove ? ti + 1 : ti, 0, srcId);
  commit([{ op: 'moveLayer', layerId: srcId, toIndex: ids.indexOf(srcId) }]);
}

// timeline ------------------------------------------------------------------
function pxPerMs(): number {
  const w = Math.max(200, trackScroll.clientWidth - 24);
  return Math.max(0.04, w / duration());
}

function renderTimeline(): void {
  const p = project();
  const ppm = pxPerMs();
  const total = duration();
  trackArea.style.width = `${total * ppm + 24}px`;
  ruler.innerHTML = '';
  const step = frameStep();
  let every = 1;
  while (step * every * ppm < 36) every *= 2;
  for (let i = 0; i * step <= total + 0.01; i += every) {
    const tick = h('div', { className: 'tick', textContent: String(i) });
    tick.style.left = `${i * step * ppm}px`;
    ruler.append(tick);
  }
  frameRow.innerHTML = '';
  p.frames.forEach((f, i) => {
    const c = h('div', { className: 'frame-cell', textContent: `#${i + 1} ${f.name ?? ''}`, title: `${f.name ?? 'Frame'}: ${f.duration}ms` });
    c.style.left = `${timeAtFrameStart(p, i) * ppm}px`;
    c.style.width = `${Math.max(4, f.duration * ppm - 2)}px`;
    frameRow.append(c);
  });
  keyRows.innerHTML = '';
  trackLabels.innerHTML = '';
  for (const layer of [...p.layers].reverse()) {
    for (const o of [...layer.objects].reverse()) {
      const sel = state.selection.includes(o.id);
      const kind = o.type === 'text' ? `“${o.text}”` : o.type === 'shape' ? o.shape : o.type;
      const label = h('div', { className: `track-label${sel ? ' on' : ''}`, textContent: `${kind} · ${o.id}`, title: `${layer.name} / ${o.id}` });
      label.addEventListener('click', (e) => setSelection(e.shiftKey ? [...state.selection, o.id] : [o.id]));
      trackLabels.append(label);
      const row = h('div', { className: `key-row${sel ? ' on' : ''}` });
      row.dataset.objectId = o.id;
      const kfs = [...(o.keyframes ?? [])].sort((a, b) => a.t - b.t);
      if (kfs.length > 1) {
        const span = h('div', { className: 'span' });
        span.style.left = `${kfs[0].t * ppm}px`;
        span.style.width = `${(kfs[kfs.length - 1].t - kfs[0].t) * ppm}px`;
        row.append(span);
      }
      for (const k of kfs) {
        const d = h('div', { className: 'diamond', title: `${k.t}ms ${k.easing ?? ''}: drag to retime (Shift = free), right-click to delete` });
        d.style.left = `${k.t * ppm}px`;
        d.dataset.t = String(k.t);
        bindDiamond(d, o.id, k.t);
        row.append(d);
      }
      keyRows.append(row);
    }
  }
  updateTimeUi();
  markDiamonds();
}

function bindDiamond(d: HTMLElement, id: string, t0: number): void {
  d.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    commit([{ op: 'removeKeyframe', id, t: t0 }]);
  });
  d.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    d.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    let moved = false;
    let lastT = t0;
    history.begin();
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      if (!moved && Math.abs(dx) < 3) return;
      moved = true;
      let t = t0 + dx / pxPerMs();
      if (!ev.shiftKey) t = Math.round(t / frameStep()) * frameStep();
      t = Math.max(0, Math.min(duration(), Math.round(t)));
      if (t === lastT) return;
      lastT = t;
      guard(() => history.update((draft) => {
        const { project: next } = applyOps(draft, [{ op: 'moveKeyframe', id, from: t0, to: t }]);
        draft.layers = next.layers;
      }));
      d.style.left = `${t * pxPerMs()}px`;
      state.timeMs = t;
      updateTimeUi();
      requestRender();
    };
    const up = () => {
      d.removeEventListener('pointermove', move);
      d.removeEventListener('pointerup', up);
      if (history.end()) scheduleAutosave();
      if (!moved) {
        state.selection = [id];
        state.timeMs = t0;
      }
      refreshPanels();
    };
    d.addEventListener('pointermove', move);
    d.addEventListener('pointerup', up);
  });
}

function scrubFromEvent(e: PointerEvent): void {
  const r = trackArea.getBoundingClientRect();
  setTime((e.clientX - r.left) / pxPerMs(), !e.shiftKey);
}
trackArea.addEventListener('pointerdown', (e) => {
  if ((e.target as HTMLElement).classList.contains('diamond')) return;
  if (state.playing) pause();
  trackArea.setPointerCapture(e.pointerId);
  scrubFromEvent(e);
  const move = (ev: PointerEvent) => scrubFromEvent(ev);
  const up = () => {
    trackArea.removeEventListener('pointermove', move);
    trackArea.removeEventListener('pointerup', up);
  };
  trackArea.addEventListener('pointermove', move);
  trackArea.addEventListener('pointerup', up);
});
trackScroll.addEventListener('scroll', () => {
  trackLabels.scrollTop = trackScroll.scrollTop;
});

// options bar ---------------------------------------------------------------
function renderOptions(): void {
  optionsBar.innerHTML = '';
  const add = (...nodes: Node[]) => optionsBar.append(...nodes);
  const opt = (label: string, ...children: (Node | string)[]) => h('label', { className: 'opt' }, [h('span', { textContent: label }), ...children]);
  const range = (min: number, max: number, step: number, value: number, onInput: (v: number) => void, fmt: (v: number) => string): Node[] => {
    const r = h('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(value) });
    const val = h('span', { className: 'val', textContent: fmt(value) });
    r.addEventListener('input', () => {
      onInput(Number(r.value));
      val.textContent = fmt(Number(r.value));
    });
    return [r, val];
  };
  const swatches = (onPick: (hex: string) => void, current: string) => {
    const wrap = h('span', { className: 'swatches' });
    for (const c of project().palette) {
      const b = h('button', { type: 'button', className: `swatch${c.hex.toLowerCase() === current.toLowerCase() ? ' on' : ''}`, title: c.name ?? c.hex });
      b.style.background = c.hex;
      b.addEventListener('click', () => {
        onPick(c.hex);
        renderOptions();
      });
      wrap.append(b);
    }
    return wrap;
  };
  const color = (value: string, onPick: (v: string) => void) => {
    const c = h('input', { type: 'color', value: toHex6(value) });
    c.addEventListener('input', () => onPick(c.value.toUpperCase()));
    return c;
  };
  const toggle = (label: string, on: boolean, onChange: (v: boolean) => void) => {
    const c = h('input', { type: 'checkbox', checked: on });
    c.addEventListener('change', () => onChange(c.checked));
    return h('label', { className: 'opt' }, [c, label]);
  };
  const hint = (html: string) => {
    const s = h('span', { className: 'opt-hint' });
    s.innerHTML = html;
    return s;
  };
  const t = state.tool;
  if (t === 'select') {
    add(hint('<b>Select</b> · drag to move · handles scale (<kbd>Shift</kbd> keep ratio, <kbd>Alt</kbd> from centre) · yellow dot rotates (<kbd>Shift</kbd> 15°) · <kbd>Alt</kbd>-drag duplicates · arrows nudge'));
  } else if (t === 'brush' || t === 'eraser') {
    const kind = h('select');
    for (const k of ['ink', 'pencil', 'marker', 'airbrush', 'charcoal', 'neon', 'watercolor']) kind.append(h('option', { value: k, textContent: k[0].toUpperCase() + k.slice(1) }));
    kind.value = state.brushKind;
    kind.dataset.testid = 'brush-kind';
    kind.addEventListener('change', () => {
      state.brushKind = kind.value as BrushKind;
    });
    add(opt('Brush', kind));
    add(opt('Size', ...range(1, 120, 1, state.brushSize, (v) => (state.brushSize = v), (v) => `${v}px`)));
    if (t === 'brush') {
      add(opt('Color', swatches((x) => (state.color = x), state.color), color(state.color, (v) => (state.color = v))));
      add(opt('Opacity', ...range(0.05, 1, 0.05, state.brushOpacity, (v) => (state.brushOpacity = v), (v) => `${Math.round(v * 100)}%`)));
    }
    add(opt('Smooth', ...range(0, 6, 1, state.smoothing, (v) => (state.smoothing = v), (v) => String(v))));
    add(opt('Pressure', ...range(0, 1, 0.05, state.pressure, (v) => (state.pressure = v), (v) => `${Math.round(v * 100)}%`)));
  } else if (t === 'rect' || t === 'ellipse') {
    add(toggle('Fill', state.fillOn, (v) => (state.fillOn = v)), color(state.fillColor, (v) => (state.fillColor = v)), swatches((x) => (state.fillColor = x), state.fillColor));
    add(toggle('Stroke', state.strokeOn, (v) => (state.strokeOn = v)), color(state.color, (v) => (state.color = v)));
    add(opt('Width', ...range(1, 40, 1, state.strokeWidth, (v) => (state.strokeWidth = v), (v) => `${v}px`)));
    if (t === 'rect') add(opt('Radius', ...range(0, 100, 1, state.cornerRadius, (v) => (state.cornerRadius = v), (v) => `${v}px`)));
    add(hint('<kbd>Shift</kbd> square · <kbd>Alt</kbd> from centre'));
  } else if (t === 'line') {
    add(opt('Color', swatches((x) => (state.color = x), state.color), color(state.color, (v) => (state.color = v))));
    add(opt('Width', ...range(1, 40, 1, state.strokeWidth, (v) => (state.strokeWidth = v), (v) => `${v}px`)));
    add(hint('<kbd>Shift</kbd> snaps to 45°'));
  } else if (t === 'text') {
    add(opt('Color', swatches((x) => (state.color = x), state.color), color(state.color, (v) => (state.color = v))));
    add(opt('Size', ...range(8, 200, 1, state.fontSize, (v) => (state.fontSize = v), (v) => `${v}px`)));
    add(hint('Click to place text · <kbd>Enter</kbd> commits · double-click text to edit'));
  } else if (t === 'eyedropper') {
    add(hint('Click the canvas to pick a colour for brush, stroke and fill'), color(state.color, (v) => (state.color = v)));
  } else {
    add(hint('Drag to pan · wheel zooms toward the cursor · hold <kbd>Space</kbd> with any tool to pan'));
  }
}

// ---------------------------------------------------------------------------
// Autosave
// ---------------------------------------------------------------------------
let autosaveTimer = 0;
function scheduleAutosave(): void {
  window.clearTimeout(autosaveTimer);
  autosaveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(project()));
      localStorage.setItem(PREFS_KEY, JSON.stringify({ onion: state.onion, grid: state.grid, snap: state.snap, loop: state.loop }));
    } catch {
      /* storage full or disabled */
    }
  }, 400);
}

// ---------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------
const SHORTCUTS: [string, string][] = [
  ['V', 'Select / transform'], ['B', 'Brush'], ['E', 'Eraser'], ['R', 'Rectangle'], ['O', 'Ellipse'], ['L', 'Line'], ['T', 'Text'], ['I', 'Eyedropper'], ['H', 'Hand (pan)'],
  ['Space', 'Play / pause (hold + drag to pan)'], ['Wheel', 'Zoom toward cursor'], ['Ctrl 0', 'Fit to screen'], ['Ctrl 1', 'Zoom 100%'], ['+ / −', 'Zoom in / out'],
  ['Ctrl Z', 'Undo'], ['Ctrl Shift Z / Ctrl Y', 'Redo'], ['Del', 'Delete selection'], ['Ctrl D', 'Duplicate'], ['Ctrl A', 'Select all'], ['Esc', 'Deselect'],
  ['Arrows', 'Nudge 1px (Shift 10px)'], ['Ctrl ] / [', 'Bring forward / send back'], ['K', 'Keyframe selection at playhead'], [', / .', 'Previous / next frame'],
  ['Home / End', 'Start / end'], ['[ / ]', 'Brush size'], ['Ctrl S', 'Save .paint.json'], ['Ctrl O', 'Open'], ['Ctrl E', 'Export'], ['?', 'This help'],
];

function isTyping(t: EventTarget | null): boolean {
  const node = t as HTMLElement | null;
  return !!node && (['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName) || node.isContentEditable);
}

const TOOL_KEYS: Record<string, Tool> = { v: 'select', b: 'brush', p: 'brush', e: 'eraser', r: 'rect', o: 'ellipse', l: 'line', t: 'text', i: 'eyedropper', h: 'hand' };

function onModKey(e: KeyboardEvent): void {
  const lk = e.key.toLowerCase();
  const center = { x: cssW / 2, y: cssH / 2 };
  const actions: Record<string, () => void> = {
    z: () => (e.shiftKey ? redo() : undo()),
    y: redo,
    d: duplicateSelection,
    a: () => setSelection(allObjects().filter((o) => o.visible && !o.locked).map((o) => o.obj.id)),
    s: saveJson,
    o: () => $<HTMLInputElement>('openFile').click(),
    e: () => $<HTMLDialogElement>('exportDialog').showModal(),
    '0': fitView,
    '1': () => zoomAt(center, 1),
    ']': () => arrange(e.shiftKey ? 'front' : 'forward'),
    '[': () => arrange(e.shiftKey ? 'back' : 'backward'),
  };
  const fn = actions[lk];
  if (fn) {
    e.preventDefault();
    fn();
  }
}

window.addEventListener('keydown', (e) => {
  if (isTyping(e.target)) return;
  if (e.key === ' ') {
    e.preventDefault();
    if (!e.repeat) {
      spaceDown = true;
      spaceUsed = false;
      canvas.style.cursor = 'grab';
    }
    return;
  }
  if (e.metaKey || e.ctrlKey) return onModKey(e);
  const lk = e.key.toLowerCase();
  if (TOOL_KEYS[lk] && !e.altKey) return setTool(TOOL_KEYS[lk]);
  const step = e.shiftKey ? 10 : 1;
  const center = { x: cssW / 2, y: cssH / 2 };
  switch (e.key) {
    case 'Delete':
    case 'Backspace': e.preventDefault(); deleteSelection(); break;
    case 'Escape': setSelection([]); break;
    case 'ArrowLeft': e.preventDefault(); nudge(-step, 0); break;
    case 'ArrowRight': e.preventDefault(); nudge(step, 0); break;
    case 'ArrowUp': e.preventDefault(); nudge(0, -step); break;
    case 'ArrowDown': e.preventDefault(); nudge(0, step); break;
    case 'k': case 'K': keyframeSelection(); break;
    case ',': setTime(state.timeMs - frameStep()); break;
    case '.': setTime(state.timeMs + frameStep()); break;
    case 'Home': setTime(0); break;
    case 'End': setTime(duration()); break;
    case '+': case '=': zoomAt(center, state.zoom * 1.25); break;
    case '-': case '_': zoomAt(center, state.zoom / 1.25); break;
    case '[': state.brushSize = Math.max(1, state.brushSize - 2); renderOptions(); break;
    case ']': state.brushSize = Math.min(120, state.brushSize + 2); renderOptions(); break;
    case '?': $<HTMLDialogElement>('helpDialog').showModal(); break;
  }
});
window.addEventListener('keyup', (e) => {
  if (e.key !== ' ') return;
  spaceDown = false;
  if (!spaceUsed && !isTyping(e.target)) togglePlay();
  canvas.style.cursor = state.tool === 'hand' ? 'grab' : 'default';
});
window.addEventListener('blur', () => { spaceDown = false; });

// ---------------------------------------------------------------------------
// File / export / AI
// ---------------------------------------------------------------------------
function slug(): string {
  return project().name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'paint-studio';
}
function saveJson(): void {
  download(new Blob([JSON.stringify(project(), null, 2)], { type: 'application/json' }), `${slug()}.paint.json`);
  toast('Saved .paint.json');
}

async function runExport(kind: string): Promise<void> {
  const scale = Number($<HTMLSelectElement>('exportScale').value) || 1;
  const bar = $('exportProgress');
  const fill = bar.firstElementChild as HTMLElement;
  bar.hidden = false;
  const prog = (f: number) => { fill.style.width = `${Math.round(f * 100)}%`; };
  try {
    const p = project();
    if (kind === 'gif') download(await exportGif(p, scale, prog), `${slug()}.gif`);
    else if (kind === 'webm') {
      toast('Recording WebM in real time…');
      download(await exportWebm(p, scale, prog), `${slug()}.webm`);
    } else if (kind === 'png') download(await exportPng(p, state.timeMs, scale), `${slug()}-${Math.round(state.timeMs)}ms.png`);
    else if (kind === 'sequence') download(await exportPngSequence(p, scale, prog), `${slug()}-frames.zip`);
    else if (kind === 'spritesheet') {
      const { png, meta } = await exportSpriteSheet(p, scale, prog);
      download(png, `${slug()}-spritesheet.png`);
      download(new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' }), `${slug()}-spritesheet.json`);
    } else if (kind === 'json') saveJson();
    toast(`Exported ${kind.toUpperCase()}`);
  } catch (err) {
    toast(`Export failed: ${(err as Error).message}`, 'error');
  } finally {
    bar.hidden = true;
    fill.style.width = '0';
  }
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------
const stageCenter = () => ({ x: cssW / 2, y: cssH / 2 });
const currentFrame = () => currentFrameIndex();
document.querySelectorAll<HTMLButtonElement>('.tool').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool as Tool)));
$('undoBtn').addEventListener('click', undo);
$('redoBtn').addEventListener('click', redo);
$('zoomInBtn').addEventListener('click', () => zoomAt(stageCenter(), state.zoom * 1.25));
$('zoomOutBtn').addEventListener('click', () => zoomAt(stageCenter(), state.zoom / 1.25));
$('zoomLabel').addEventListener('click', fitView);
$('playBtn').addEventListener('click', togglePlay);
$('firstBtn').addEventListener('click', () => setTime(0));
$('lastBtn').addEventListener('click', () => setTime(duration()));
$('prevBtn').addEventListener('click', () => setTime(state.timeMs - frameStep()));
$('nextBtn').addEventListener('click', () => setTime(state.timeMs + frameStep()));
$('loopBtn').addEventListener('click', () => {
  state.loop = !state.loop;
  $('loopBtn').classList.toggle('on', state.loop);
  scheduleAutosave();
});
$('autoKeyBtn').addEventListener('click', () => {
  state.autoKey = !state.autoKey;
  $('autoKeyBtn').classList.toggle('on', state.autoKey);
  toast(state.autoKey ? 'Auto-key on: transforms write keyframes at the playhead' : 'Auto-key off');
});
$('keyBtn').addEventListener('click', keyframeSelection);
fpsInput.addEventListener('change', () => commit([{ op: 'setProject', props: { fps: Number(fpsInput.value) || 12 } }]));
frameDurInput.addEventListener('change', () => commit([{ op: 'setFrame', index: currentFrame(), duration: Number(frameDurInput.value) || 1 }]));
$('addFrameBtn').addEventListener('click', () => {
  commit([{ op: 'addFrame' }]);
  setTime(timeAtFrameStart(project(), project().frames.length - 1), false);
});
$('dupFrameBtn').addEventListener('click', () => {
  const fi = currentFrame();
  guard(() => history.commit((d) => {
    const src = d.frames[fi];
    d.frames.splice(fi + 1, 0, { ...structuredClone(src), id: uid('frame'), name: `${src.name ?? 'Frame'} copy` });
  }));
  afterChange();
});
$('delFrameBtn').addEventListener('click', () => commit([{ op: 'removeFrame', index: currentFrame() }]));
$('addLayerBtn').addEventListener('click', () => {
  const [id] = commit([{ op: 'addLayer' }]);
  if (id) {
    state.activeLayerId = id;
    refreshPanels();
  }
});
$('dupLayerBtn').addEventListener('click', () => {
  const al = activeLayer();
  if (!al) return;
  let newId = '';
  guard(() => history.commit((d) => {
    const idx = d.layers.findIndex((l) => l.id === al.id);
    const copy = structuredClone(d.layers[idx]);
    copy.id = newId = uid('layer');
    copy.name = `${al.name} copy`;
    copy.objects = copy.objects.map((o) => ({ ...o, id: uid(o.type) }));
    d.layers.splice(idx + 1, 0, copy);
  }));
  if (newId) state.activeLayerId = newId;
  afterChange();
});
$('delLayerBtn').addEventListener('click', () => {
  const al = activeLayer();
  if (al) commit([{ op: 'removeLayer', layerId: al.id }]);
});
$('newBtn').addEventListener('click', () => {
  guard(() => loadProject(createEmptyProject({ name: 'Untitled', width: 960, height: 540, fps: 24, style: (styleSelect.value as StylePresetId) || 'inked-cartoon' }), { record: true }));
  toast('New project (Ctrl+Z to go back)');
});
$('saveBtn').addEventListener('click', saveJson);
$('exportBtn').addEventListener('click', () => $<HTMLDialogElement>('exportDialog').showModal());
document.querySelectorAll<HTMLButtonElement>('[data-export]').forEach((b) => b.addEventListener('click', () => void runExport(b.dataset.export ?? 'gif')));
document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach((b) => b.addEventListener('click', () => (b.closest('dialog') as HTMLDialogElement).close()));
$('helpBtn').addEventListener('click', () => $<HTMLDialogElement>('helpDialog').showModal());
$('helpGrid').append(...SHORTCUTS.map(([k, d]) => h('div', {}, [h('span', { textContent: d }), h('kbd', { textContent: k })])));

$('openFile').addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    loadProject(JSON.parse(await file.text()) as PaintProject, { record: true });
    toast(`Opened ${file.name}`);
  } catch (err) {
    toast(`Could not open ${file.name}: ${(err as Error).message}`, 'error');
  }
});

$('aiPromptForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = $<HTMLInputElement>('aiPrompt').value.trim();
  if (!prompt) {
    toast('Type a prompt first, e.g. “bouncing ball in neon”');
    return;
  }
  try {
    const generated = await generateProjectFromPrompt({ prompt, provider: 'template', style: (styleSelect.value as StylePresetId) || undefined });
    loadProject(generated, { record: true });
    toast('Generated: every object is editable. Ctrl+Z to undo.');
  } catch (err) {
    toast(`Generate failed: ${(err as Error).message}`, 'error');
  }
});

for (const [id, preset] of Object.entries(STYLE_PRESETS)) styleSelect.append(h('option', { value: id, textContent: preset.name }));
styleSelect.addEventListener('change', () => {
  const id = styleSelect.value as StylePresetId;
  const preset = getStylePreset(id);
  guard(() => history.commit((d) => {
    d.style = { id };
    d.background = preset.background;
    d.palette = preset.palette;
  }));
  state.color = preset.defaultBrush.color;
  state.brushKind = preset.defaultBrush.kind;
  renderOptions();
  afterChange();
});

new ResizeObserver(() => {
  resizeCanvas();
  renderTimeline();
}).observe(stage);

// ---------------------------------------------------------------------------
// Agent API: window.paintStudio
// ---------------------------------------------------------------------------
function applyAndRefresh(ops: EditOp[]): string[] {
  const { project: next, created } = applyOps(project(), ops);
  history.replace(next, true);
  pruneSelection();
  refreshPanels();
  scheduleAutosave();
  return created;
}

function requireObj(id: string): DrawObject {
  const o = getObj(id);
  if (!o) throw new Error(`Object not found: ${id}`);
  return o;
}

const api = {
  version: '2.1.0',
  help(): string {
    return [
      'window.paintStudio: drive the editor from code (Playwright, devtools, agents).',
      'Project:   getProject() setProject(p) newProject(opts) loadExample() exportJson()',
      'Edit:      apply(ops[]) -> created ids. One undo step; same ops as `paint-studio edit` and MCP paint_edit_project',
      'Objects:   addObject(obj, layerId?) updateObject(id, props) removeObject(id) duplicate(id) listObjects(t?)',
      'Transform: getTransform(id, t?) setTransform(id, partial, atMs?) translate(id, dx, dy, atMs?) getBounds(id, t?)',
      'Keys:      setKeyframe(id, t, partial?, easing?) removeKeyframe(id, t) moveKeyframe(id, from, to)',
      'Layers:    addLayer(name?) setLayer(id, props) moveLayer(id, toIndex) removeLayer(id) setActiveLayer(id)',
      'Select:    select(ids) getSelection() selectAll() clearSelection()',
      'Time:      setTime(ms) getTime() duration() play() pause() setFps(n)',
      'Tools:     setTool(name) setBrush({kind,size,color,opacity})',
      'View:      fit() setZoom(z) getView() worldToScreen(pt) screenToWorld(pt)',
      'History:   undo() redo() canUndo() canRedo()',
      'Export:    exportPng(t?) exportGif() exportWebm() exportSpriteSheet() exportPngSequence() -> Promise<Blob>; renderFrame(t) -> PNG data URL',
    ].join('\n');
  },
  getProject: () => structuredClone(project()),
  setProject: (p: PaintProject) => loadProject(structuredClone(p), { record: true }),
  newProject: (opts?: Parameters<typeof createEmptyProject>[0]) => loadProject(createEmptyProject(opts), { record: true }),
  loadExample: () => loadProject(starterProject(), { record: true }),
  exportJson: () => JSON.stringify(project(), null, 2),
  apply: (ops: EditOp[]) => applyAndRefresh(ops),
  addObject: (object: DrawObjectInput, layerId?: string) => applyAndRefresh([{ op: 'addObject', object, layerId: layerId ?? activeLayer()?.id }])[0],
  updateObject: (id: string, props: Record<string, unknown>) => void applyAndRefresh([{ op: 'updateObject', id, props }]),
  removeObject: (id: string) => void applyAndRefresh([{ op: 'removeObject', id }]),
  duplicate: (id: string) => applyAndRefresh([{ op: 'duplicateObject', id }])[0],
  listObjects: (t = state.timeMs) =>
    project().layers.flatMap((l) => l.objects.map((o) => ({ id: o.id, type: o.type, layerId: l.id, bounds: worldAabb(o, t, measure), keyframes: (o.keyframes ?? []).map((k) => k.t) }))),
  getTransform: (id: string, t = state.timeMs) => objectTransformAt(requireObj(id), t),
  setTransform: (id: string, transform: Partial<Transform2D>, atMs?: number) => void applyAndRefresh([{ op: 'setTransform', id, transform, ...(atMs != null ? { atMs } : {}) }]),
  translate: (id: string, dx: number, dy: number, atMs?: number) => void applyAndRefresh([{ op: 'translate', id, dx, dy, ...(atMs != null ? { atMs } : {}) }]),
  getBounds: (id: string, t = state.timeMs) => {
    const o = requireObj(id);
    return { aabb: worldAabb(o, t, measure), corners: worldCorners(o, t, measure) };
  },
  setKeyframe: (id: string, t: number, transform?: Partial<Transform2D>, easing?: EasingName) =>
    void applyAndRefresh([{ op: 'setKeyframe', id, t, ...(transform ? { transform } : {}), ...(easing ? { easing } : {}) }]),
  removeKeyframe: (id: string, t: number) => void applyAndRefresh([{ op: 'removeKeyframe', id, t }]),
  moveKeyframe: (id: string, from: number, to: number) => void applyAndRefresh([{ op: 'moveKeyframe', id, from, to }]),
  addLayer: (name?: string) => {
    const id = applyAndRefresh([{ op: 'addLayer', ...(name ? { name } : {}) }])[0];
    state.activeLayerId = id;
    refreshPanels();
    return id;
  },
  setLayer: (layerId: string, props: Extract<EditOp, { op: 'setLayer' }>['props']) => void applyAndRefresh([{ op: 'setLayer', layerId, props }]),
  moveLayer: (layerId: string, toIndex: number) => void applyAndRefresh([{ op: 'moveLayer', layerId, toIndex }]),
  removeLayer: (layerId: string) => void applyAndRefresh([{ op: 'removeLayer', layerId }]),
  setActiveLayer: (layerId: string) => {
    state.activeLayerId = layerId;
    refreshPanels();
  },
  select: (ids: string[]) => setSelection(ids),
  getSelection: () => [...state.selection],
  selectAll: () => setSelection(allObjects().map((o) => o.obj.id)),
  clearSelection: () => setSelection([]),
  setTime: (ms: number) => setTime(ms, false),
  getTime: () => state.timeMs,
  duration: () => duration(),
  play,
  pause,
  setFps: (fps: number) => void applyAndRefresh([{ op: 'setProject', props: { fps } }]),
  setTool: (t: Tool) => {
    if (!TOOLS.includes(t)) throw new Error(`Unknown tool ${t}. Tools: ${TOOLS.join(', ')}`);
    setTool(t);
  },
  setBrush: (b: Partial<{ kind: BrushKind; size: number; color: string; opacity: number }>) => {
    if (b.kind) state.brushKind = b.kind;
    if (b.size) state.brushSize = b.size;
    if (b.color) state.color = b.color;
    if (b.opacity != null) state.brushOpacity = b.opacity;
    renderOptions();
  },
  fit: fitView,
  setZoom: (z: number) => zoomAt(stageCenter(), z),
  getView: () => ({ zoom: state.zoom, panX: state.panX, panY: state.panY, dpr }),
  /** world -> page (client) coordinates, handy for Playwright mouse input */
  worldToScreen: (pt: Vec2) => {
    const c = worldToCss(pt);
    const r = canvas.getBoundingClientRect();
    return { x: c.x + r.left, y: c.y + r.top };
  },
  screenToWorld: (pt: Vec2) => {
    const r = canvas.getBoundingClientRect();
    return cssToWorld({ x: pt.x - r.left, y: pt.y - r.top });
  },
  undo,
  redo,
  canUndo: () => history.canUndo(),
  canRedo: () => history.canRedo(),
  render: () => renderNow(true),
  renderFrame: (t = state.timeMs) => {
    const c = document.createElement('canvas');
    c.width = project().width;
    c.height = project().height;
    renderProject(c.getContext('2d')!, project(), { timeMs: t });
    return c.toDataURL('image/png');
  },
  exportPng: (t = state.timeMs, scale = 1) => exportPng(project(), t, scale),
  exportGif: (scale = 1) => exportGif(project(), scale),
  exportWebm: (scale = 1) => exportWebm(project(), scale),
  exportSpriteSheet: (scale = 1) => exportSpriteSheet(project(), scale),
  exportPngSequence: (scale = 1) => exportPngSequence(project(), scale),
};
(window as unknown as { paintStudio: typeof api }).paintStudio = api;

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
function bindToggle(id: string, key: 'onion' | 'grid' | 'snap'): void {
  const c = $<HTMLInputElement>(id);
  c.checked = state[key];
  c.addEventListener('change', () => {
    state[key] = c.checked;
    scheduleAutosave();
    requestRender();
  });
}

function boot(): void {
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<typeof state>;
    state.onion = !!prefs.onion;
    state.grid = !!prefs.grid;
    state.snap = prefs.snap ?? true;
    state.loop = prefs.loop ?? true;
  } catch {
    /* ignore */
  }
  bindToggle('onionToggle', 'onion');
  bindToggle('gridToggle', 'grid');
  bindToggle('snapToggle', 'snap');
  $('loopBtn').classList.toggle('on', state.loop);
  const params = new URLSearchParams(location.search);
  let loaded = false;
  if (!params.has('fresh') && !params.has('blank')) {
    try {
      const data = JSON.parse(localStorage.getItem(AUTOSAVE_KEY) ?? 'null') as unknown;
      if (data && validateProject(data).ok) {
        history = new HistoryStack(data as PaintProject);
        loaded = true;
      }
    } catch {
      /* ignore corrupt autosave */
    }
  }
  if (!loaded) {
    history = new HistoryStack(params.has('blank') ? createEmptyProject({ width: 960, height: 540, fps: 24 }) : starterProject());
    if (!params.has('blank')) setTimeout(() => toast('Welcome! Press V and drag the ball, Space to play, ? for shortcuts.'), 300);
  }
  state.activeLayerId = project().layers[project().layers.length - 1].id;
  styleSelect.value = project().style?.id ?? 'inked-cartoon';
  setTool('select');
  resizeCanvas();
  refreshPanels();
}
boot();
