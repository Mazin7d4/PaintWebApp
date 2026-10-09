import { describe, expect, it } from 'vitest';
import {
  createEmptyProject,
  validateProject,
  sampleTransform,
  smoothStroke,
  strokeFromPolyline,
  planExportFrames,
  HistoryStack,
  squashStretch,
  getStylePreset,
  projectDurationMs,
  ease,
} from '../src/index.js';

describe('project', () => {
  it('creates a valid empty project', () => {
    const p = createEmptyProject({ name: 'Test', style: 'neon', fps: 24 });
    const result = validateProject(p);
    expect(result.ok).toBe(true);
    expect(p.style?.id).toBe('neon');
    expect(p.layers).toHaveLength(1);
    expect(p.frames).toHaveLength(1);
  });

  it('rejects bad version', () => {
    const p = createEmptyProject();
    const result = validateProject({ ...p, version: 1 });
    expect(result.ok).toBe(false);
  });
});

describe('easing & tween', () => {
  it('ease linear endpoints', () => {
    expect(ease('linear', 0)).toBe(0);
    expect(ease('linear', 1)).toBe(1);
  });

  it('samples keyframes', () => {
    const tf = sampleTransform(
      [
        { t: 0, transform: { x: 0, y: 0 } },
        { t: 1000, transform: { x: 100, y: 50 }, easing: 'linear' },
      ],
      500,
    );
    expect(tf.x).toBeCloseTo(50, 5);
    expect(tf.y).toBeCloseTo(25, 5);
  });

  it('squashStretch preserves approximate area', () => {
    const s = squashStretch(0.5, 'y');
    expect(s.scaleY).toBe(0.5);
    expect(s.scaleX).toBeCloseTo(1 / Math.sqrt(0.5), 5);
  });
});

describe('brushes', () => {
  it('smooths polyline', () => {
    const pts = strokeFromPolyline([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ]);
    const smooth = smoothStroke(pts, 1);
    expect(smooth.length).toBeGreaterThan(pts.length);
  });
});

describe('export plan & history', () => {
  it('plans frames from duration', () => {
    const p = createEmptyProject({ fps: 10 });
    p.frames[0].duration = 500;
    const plans = planExportFrames(p, 10);
    expect(plans.length).toBe(5);
    expect(projectDurationMs(p)).toBe(500);
  });

  it('undo/redo works', () => {
    const p = createEmptyProject({ name: 'A' });
    const hist = new HistoryStack(p);
    hist.commit((d) => {
      d.name = 'B';
    });
    expect(hist.project.name).toBe('B');
    hist.undo();
    expect(hist.project.name).toBe('A');
    hist.redo();
    expect(hist.project.name).toBe('B');
  });
});

describe('styles', () => {
  it('has five presets', () => {
    expect(getStylePreset('inked-cartoon').defaultBrush.kind).toBe('ink');
    expect(getStylePreset('neon').background).toBe('#050505');
  });
});
