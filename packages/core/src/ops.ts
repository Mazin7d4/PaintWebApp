import { uid } from './ids.js';
import { DEFAULT_TRANSFORM, addFrame, addLayer, findObject, reorderLayers } from './project.js';
import { objectTransformAt, upsertKeyframe } from './geometry.js';
import type { BlendMode, DrawObject, EasingName, Keyframe, Layer, PaintProject, Transform2D } from './types.js';

/** A DrawObject whose id is optional (auto-generated). */
export type DrawObjectInput = DrawObject extends infer T ? (T extends DrawObject ? Omit<T, 'id'> & { id?: string } : never) : never;

/**
 * Edit operations — a small, JSON-serialisable command language shared by the
 * editor (window.paintStudio.apply), the CLI (`paint-studio edit`) and the MCP
 * server (`paint_edit_project`). Every op mutates the project in place.
 */
export type EditOp =
  | { op: 'addLayer'; name?: string; id?: string }
  | { op: 'removeLayer'; layerId: string }
  | { op: 'setLayer'; layerId: string; props: Partial<Pick<Layer, 'name' | 'visible' | 'locked' | 'opacity'>> & { blendMode?: BlendMode } }
  | { op: 'moveLayer'; layerId: string; toIndex: number }
  | { op: 'addObject'; layerId?: string; object: DrawObjectInput }
  | { op: 'removeObject'; id: string }
  | { op: 'duplicateObject'; id: string; newId?: string; offset?: { x: number; y: number } }
  | { op: 'updateObject'; id: string; props: Record<string, unknown> }
  | { op: 'moveObject'; id: string; toLayerId?: string; toIndex?: number }
  | { op: 'setTransform'; id: string; transform: Partial<Transform2D>; /** when set, writes a keyframe at this time instead */ atMs?: number }
  | { op: 'translate'; id: string; dx: number; dy: number; atMs?: number }
  | { op: 'setKeyframe'; id: string; t: number; transform?: Partial<Transform2D>; easing?: EasingName }
  | { op: 'removeKeyframe'; id: string; t: number }
  | { op: 'moveKeyframe'; id: string; from: number; to: number }
  | { op: 'clearKeyframes'; id: string }
  | { op: 'setProject'; props: Partial<Pick<PaintProject, 'name' | 'width' | 'height' | 'fps' | 'background'>> }
  | { op: 'addFrame'; duration?: number; count?: number }
  | { op: 'removeFrame'; index: number }
  | { op: 'setFrame'; index: number; duration?: number; name?: string };

export interface ApplyResult {
  /** ids created by addLayer/addObject/duplicateObject, in order */
  created: string[];
}

function requireObject(project: PaintProject, id: string) {
  const found = findObject(project, id);
  if (!found) throw new Error(`Object not found: ${id}`);
  return found;
}

function requireLayer(project: PaintProject, layerId: string): Layer {
  const layer = project.layers.find((l) => l.id === layerId);
  if (!layer) throw new Error(`Layer not found: ${layerId}`);
  return layer;
}

/**
 * Set an object's transform. If the object is animated (has keyframes) or
 * `atMs` is given, the change is written as a keyframe so it stays animatable.
 */
export function setObjectTransform(project: PaintProject, id: string, transform: Partial<Transform2D>, atMs?: number): void {
  const { object } = requireObject(project, id);
  if (atMs != null || (object.keyframes && object.keyframes.length > 0)) {
    object.keyframes = upsertKeyframe(object.keyframes ?? [], Math.round(atMs ?? 0), transform);
  } else {
    object.transform = { ...(object.transform ?? {}), ...transform };
  }
}

export function applyOp(project: PaintProject, op: EditOp, result: ApplyResult = { created: [] }): ApplyResult {
  switch (op.op) {
    case 'addLayer': {
      const layer = addLayer(project, op.name);
      if (op.id) layer.id = op.id;
      result.created.push(layer.id);
      break;
    }
    case 'removeLayer': {
      if (project.layers.length <= 1) throw new Error('Cannot remove the last layer');
      project.layers = project.layers.filter((l) => l.id !== op.layerId);
      break;
    }
    case 'setLayer': {
      const layer = requireLayer(project, op.layerId);
      Object.assign(layer, op.props);
      if (layer.opacity != null) layer.opacity = Math.max(0, Math.min(1, layer.opacity));
      break;
    }
    case 'moveLayer': {
      const from = project.layers.findIndex((l) => l.id === op.layerId);
      if (from < 0) throw new Error(`Layer not found: ${op.layerId}`);
      reorderLayers(project, from, Math.max(0, Math.min(project.layers.length - 1, op.toIndex)));
      break;
    }
    case 'addObject': {
      const layer = op.layerId ? requireLayer(project, op.layerId) : project.layers[project.layers.length - 1];
      if (layer.locked) throw new Error(`Layer is locked: ${layer.id}`);
      const id = op.object.id ?? uid(op.object.type);
      if (findObject(project, id)) throw new Error(`Duplicate object id: ${id}`);
      layer.objects.push({ ...(op.object as DrawObject), id });
      result.created.push(id);
      break;
    }
    case 'removeObject': {
      const { layer, index } = requireObject(project, op.id);
      layer.objects.splice(index, 1);
      break;
    }
    case 'duplicateObject': {
      const { layer, object, index } = requireObject(project, op.id);
      const copy = structuredClone(object);
      copy.id = op.newId ?? uid(object.type);
      const off = op.offset ?? { x: 16, y: 16 };
      copy.transform = { ...(copy.transform ?? {}), x: (copy.transform?.x ?? 0) + off.x, y: (copy.transform?.y ?? 0) + off.y };
      if (copy.keyframes) {
        copy.keyframes = copy.keyframes.map((k) => ({
          ...k,
          transform: {
            ...k.transform,
            ...(k.transform.x != null ? { x: k.transform.x + off.x } : {}),
            ...(k.transform.y != null ? { y: k.transform.y + off.y } : {}),
          },
        }));
      }
      layer.objects.splice(index + 1, 0, copy);
      result.created.push(copy.id);
      break;
    }
    case 'updateObject': {
      const { object } = requireObject(project, op.id);
      const { id: _ignored, type: _type, ...rest } = op.props as { id?: unknown; type?: unknown };
      Object.assign(object, rest);
      break;
    }
    case 'moveObject': {
      const { layer, object, index } = requireObject(project, op.id);
      const target = op.toLayerId ? requireLayer(project, op.toLayerId) : layer;
      layer.objects.splice(index, 1);
      const to = op.toIndex == null ? target.objects.length : Math.max(0, Math.min(target.objects.length, op.toIndex));
      target.objects.splice(to, 0, object);
      break;
    }
    case 'setTransform':
      setObjectTransform(project, op.id, op.transform, op.atMs);
      break;
    case 'translate': {
      const { object } = requireObject(project, op.id);
      const tf = objectTransformAt(object, op.atMs ?? 0);
      setObjectTransform(project, op.id, { x: tf.x + op.dx, y: tf.y + op.dy }, op.atMs);
      break;
    }
    case 'setKeyframe': {
      const { object } = requireObject(project, op.id);
      const t = Math.max(0, Math.round(op.t));
      // default: capture the full current pose at that time
      const pose = op.transform ?? objectTransformAt(object, t);
      object.keyframes = upsertKeyframe(object.keyframes ?? [], t, pose, op.easing);
      break;
    }
    case 'removeKeyframe': {
      const { object } = requireObject(project, op.id);
      object.keyframes = (object.keyframes ?? []).filter((k) => Math.abs(k.t - op.t) >= 0.5);
      if (object.keyframes.length === 0) delete object.keyframes;
      break;
    }
    case 'moveKeyframe': {
      const { object } = requireObject(project, op.id);
      const kfs: Keyframe[] = object.keyframes ?? [];
      const k = kfs.find((x) => Math.abs(x.t - op.from) < 0.5);
      if (!k) throw new Error(`No keyframe at ${op.from}ms on ${op.id}`);
      const to = Math.max(0, Math.round(op.to));
      const rest = kfs.filter((x) => x !== k && Math.abs(x.t - to) >= 0.5);
      object.keyframes = [...rest, { ...k, t: to }].sort((a, b) => a.t - b.t);
      break;
    }
    case 'clearKeyframes': {
      const { object } = requireObject(project, op.id);
      const pose = objectTransformAt(object, 0);
      delete object.keyframes;
      object.transform = { ...DEFAULT_TRANSFORM, ...pose };
      break;
    }
    case 'setProject': {
      Object.assign(project, op.props);
      project.fps = Math.max(1, Math.min(120, Math.round(project.fps)));
      break;
    }
    case 'addFrame': {
      for (let i = 0; i < (op.count ?? 1); i++) result.created.push(addFrame(project, op.duration).id);
      break;
    }
    case 'removeFrame': {
      if (project.frames.length <= 1) throw new Error('Cannot remove the last frame');
      project.frames.splice(op.index, 1);
      break;
    }
    case 'setFrame': {
      const f = project.frames[op.index];
      if (!f) throw new Error(`No frame at index ${op.index}`);
      if (op.duration != null) f.duration = Math.max(1, Math.round(op.duration));
      if (op.name != null) f.name = op.name;
      break;
    }
    default:
      throw new Error(`Unknown op: ${(op as { op: string }).op}`);
  }
  return result;
}

/** Apply a list of ops atomically: on error the original project is untouched. */
export function applyOps(project: PaintProject, ops: EditOp[]): { project: PaintProject; created: string[] } {
  const draft = structuredClone(project);
  const result: ApplyResult = { created: [] };
  ops.forEach((op, i) => {
    try {
      applyOp(draft, op, result);
    } catch (err) {
      throw new Error(`op[${i}] ${op.op}: ${(err as Error).message}`);
    }
  });
  return { project: draft, created: result.created };
}

export const EDIT_OP_NAMES = [
  'addLayer', 'removeLayer', 'setLayer', 'moveLayer', 'addObject', 'removeObject', 'duplicateObject',
  'updateObject', 'moveObject', 'setTransform', 'translate', 'setKeyframe', 'removeKeyframe',
  'moveKeyframe', 'clearKeyframes', 'setProject', 'addFrame', 'removeFrame', 'setFrame',
] as const;
