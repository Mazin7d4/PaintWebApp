import { uid } from './ids.js';
import { getStylePreset } from './styles.js';
import type {
  DrawObject,
  Frame,
  Layer,
  PaintProject,
  StylePresetId,
  Transform2D,
} from './types.js';

export const DEFAULT_TRANSFORM: Transform2D = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  opacity: 1,
};

export function createEmptyProject(opts?: {
  name?: string;
  width?: number;
  height?: number;
  fps?: number;
  style?: StylePresetId;
}): PaintProject {
  const style = getStylePreset(opts?.style ?? 'inked-cartoon');
  const layer: Layer = {
    id: uid('layer'),
    name: 'Layer 1',
    visible: true,
    opacity: 1,
    blendMode: 'source-over',
    objects: [],
  };
  const frame: Frame = {
    id: uid('frame'),
    name: 'Frame 1',
    duration: Math.round(1000 / (opts?.fps ?? 12)),
  };
  return {
    version: 2,
    name: opts?.name ?? 'Untitled',
    width: opts?.width ?? 1080,
    height: opts?.height ?? 720,
    fps: opts?.fps ?? 12,
    background: style.background,
    style: { id: style.id, palette: style.palette.map((c) => c.hex) },
    palette: style.palette,
    layers: [layer],
    frames: [frame],
    camera: { x: 0, y: 0, zoom: 1 },
    meta: {
      created: new Date().toISOString(),
      description: `Paint Studio project using ${style.name} style`,
    },
  };
}

export function cloneProject(project: PaintProject): PaintProject {
  return structuredClone(project);
}

export function projectDurationMs(project: PaintProject): number {
  return project.frames.reduce((sum, f) => sum + Math.max(1, f.duration), 0);
}

export function frameIndexAtTime(project: PaintProject, timeMs: number): number {
  const total = projectDurationMs(project);
  if (total <= 0 || project.frames.length === 0) return 0;
  let t = ((timeMs % total) + total) % total;
  for (let i = 0; i < project.frames.length; i++) {
    t -= project.frames[i].duration;
    if (t < 0) return i;
  }
  return project.frames.length - 1;
}

export function timeAtFrameStart(project: PaintProject, frameIndex: number): number {
  let t = 0;
  for (let i = 0; i < frameIndex && i < project.frames.length; i++) {
    t += project.frames[i].duration;
  }
  return t;
}

export function addLayer(project: PaintProject, name?: string): Layer {
  const layer: Layer = {
    id: uid('layer'),
    name: name ?? `Layer ${project.layers.length + 1}`,
    visible: true,
    opacity: 1,
    blendMode: 'source-over',
    objects: [],
  };
  project.layers.push(layer);
  return layer;
}

export function addFrame(project: PaintProject, duration?: number): Frame {
  const frame: Frame = {
    id: uid('frame'),
    name: `Frame ${project.frames.length + 1}`,
    duration: duration ?? Math.round(1000 / project.fps),
  };
  project.frames.push(frame);
  return frame;
}

export function duplicateFrame(project: PaintProject, index: number): Frame {
  const src = project.frames[index];
  if (!src) throw new Error(`No frame at index ${index}`);
  const frame = { ...structuredClone(src), id: uid('frame'), name: `${src.name ?? 'Frame'} copy` };
  project.frames.splice(index + 1, 0, frame);
  return frame;
}

export function reorderFrames(project: PaintProject, from: number, to: number): void {
  if (from < 0 || to < 0 || from >= project.frames.length || to >= project.frames.length) return;
  const [item] = project.frames.splice(from, 1);
  project.frames.splice(to, 0, item);
}

export function reorderLayers(project: PaintProject, from: number, to: number): void {
  if (from < 0 || to < 0 || from >= project.layers.length || to >= project.layers.length) return;
  const [item] = project.layers.splice(from, 1);
  project.layers.splice(to, 0, item);
}

export function findObject(project: PaintProject, objectId: string): { layer: Layer; object: DrawObject; index: number } | null {
  for (const layer of project.layers) {
    const index = layer.objects.findIndex((o) => o.id === objectId);
    if (index >= 0) return { layer, object: layer.objects[index], index };
  }
  return null;
}

export function addObject(project: PaintProject, layerId: string, object: DrawObject): void {
  const layer = project.layers.find((l) => l.id === layerId);
  if (!layer) throw new Error(`Layer not found: ${layerId}`);
  if (layer.locked) throw new Error(`Layer is locked: ${layerId}`);
  layer.objects.push(object);
}
