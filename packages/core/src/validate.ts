import type { PaintProject } from './types.js';

export interface ValidationIssue {
  level: 'error' | 'warning';
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function validateProject(input: unknown): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!input || typeof input !== 'object') {
    return { ok: false, errors: [{ level: 'error', path: '', message: 'Project must be a JSON object' }], warnings };
  }

  const p = input as Partial<PaintProject>;

  if (p.version !== 2) errors.push({ level: 'error', path: 'version', message: 'version must be 2' });
  if (!p.name || typeof p.name !== 'string') errors.push({ level: 'error', path: 'name', message: 'name is required' });
  if (!Number.isFinite(p.width) || (p.width as number) < 1) errors.push({ level: 'error', path: 'width', message: 'width must be >= 1' });
  if (!Number.isFinite(p.height) || (p.height as number) < 1) errors.push({ level: 'error', path: 'height', message: 'height must be >= 1' });
  if (!Number.isFinite(p.fps) || (p.fps as number) < 1 || (p.fps as number) > 120) {
    errors.push({ level: 'error', path: 'fps', message: 'fps must be between 1 and 120' });
  }
  if (!p.background || typeof p.background !== 'string') {
    errors.push({ level: 'error', path: 'background', message: 'background color is required' });
  } else if (!HEX.test(p.background) && !p.background.startsWith('rgb')) {
    warnings.push({ level: 'warning', path: 'background', message: 'background should be hex or rgb(a)' });
  }

  if (!Array.isArray(p.layers) || p.layers.length === 0) {
    errors.push({ level: 'error', path: 'layers', message: 'at least one layer is required' });
  } else {
    const ids = new Set<string>();
    p.layers.forEach((layer, i) => {
      if (!layer?.id) errors.push({ level: 'error', path: `layers[${i}].id`, message: 'layer id required' });
      else if (ids.has(layer.id)) errors.push({ level: 'error', path: `layers[${i}].id`, message: 'duplicate layer id' });
      else ids.add(layer.id);
      if (!Array.isArray(layer.objects)) {
        errors.push({ level: 'error', path: `layers[${i}].objects`, message: 'objects must be an array' });
      } else {
        layer.objects.forEach((obj, j) => {
          if (!obj?.id) errors.push({ level: 'error', path: `layers[${i}].objects[${j}].id`, message: 'object id required' });
          if (!obj?.type) errors.push({ level: 'error', path: `layers[${i}].objects[${j}].type`, message: 'object type required' });
          if (obj?.type === 'stroke') {
            const pts = (obj as { points?: unknown[] }).points;
            if (!Array.isArray(pts) || pts.length === 0) {
              warnings.push({ level: 'warning', path: `layers[${i}].objects[${j}].points`, message: 'stroke has no points' });
            }
          }
        });
      }
    });
  }

  if (!Array.isArray(p.frames) || p.frames.length === 0) {
    errors.push({ level: 'error', path: 'frames', message: 'at least one frame is required' });
  } else {
    p.frames.forEach((frame, i) => {
      if (!frame?.id) errors.push({ level: 'error', path: `frames[${i}].id`, message: 'frame id required' });
      if (!Number.isFinite(frame?.duration) || (frame?.duration as number) < 1) {
        errors.push({ level: 'error', path: `frames[${i}].duration`, message: 'duration must be >= 1 ms' });
      }
    });
  }

  if (!Array.isArray(p.palette)) {
    warnings.push({ level: 'warning', path: 'palette', message: 'palette missing — agents should include named colors' });
  }

  if ((p.width as number) > 4096 || (p.height as number) > 4096) {
    warnings.push({ level: 'warning', path: 'width/height', message: 'canvas larger than 4096 may be slow to render' });
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function assertValidProject(input: unknown): asserts input is PaintProject {
  const result = validateProject(input);
  if (!result.ok) {
    throw new Error(result.errors.map((e) => `${e.path}: ${e.message}`).join('; '));
  }
}
