import { describe, expect, it } from 'vitest';
import {
  HistoryStack,
  applyOps,
  cameraMatrix,
  createEmptyProject,
  fullTransform,
  hitTestObject,
  localBounds,
  matApply,
  matInvert,
  objectMatrix,
  objectPivot,
  resizeTransform,
  rotateTransformAround,
  scaleTransformAround,
  snapRect,
  transformMatrix,
  worldCorners,
  type ShapeObject,
} from '../src/index.js';

const rect = (): ShapeObject => ({ type: 'shape', id: 'r1', shape: 'rect', x: 100, y: 100, w: 200, h: 100 });
const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

describe('geometry', () => {
  it('matrix matches pivoted transform and inverts', () => {
    const tf = fullTransform({ x: 10, y: -5, rotation: 30, scaleX: 2, scaleY: 0.5 });
    const m = transformMatrix(tf, { x: 50, y: 50 });
    const p = matApply(m, { x: 50, y: 50 });
    close(p.x, 60);
    close(p.y, 45);
    const back = matApply(matInvert(m), matApply(m, { x: 3, y: 7 }));
    close(back.x, 3);
    close(back.y, 7);
  });

  it('local bounds include stroke width', () => {
    const b = localBounds({ ...rect(), stroke: { color: '#000', width: 10 } });
    expect(b).toEqual({ x: 95, y: 95, w: 210, h: 110 });
  });

  it('resize from se handle keeps nw corner fixed', () => {
    const obj = rect();
    const start = fullTransform();
    const b = localBounds(obj);
    const next = resizeTransform(start, b, objectPivot(obj), 'se', { x: 500, y: 300 });
    close(next.scaleX, 2);
    close(next.scaleY, 2);
    const c = worldCorners({ ...obj, transform: next });
    close(c[0].x, 100);
    close(c[0].y, 100);
    close(c[2].x, 500);
    close(c[2].y, 300);
  });

  it('resize keeps aspect with shift and scales from centre with alt', () => {
    const obj = rect();
    const b = localBounds(obj);
    const aspect = resizeTransform(fullTransform(), b, objectPivot(obj), 'se', { x: 700, y: 210 }, { keepAspect: true });
    close(aspect.scaleX, aspect.scaleY);
    close(aspect.scaleX, 3);
    const centre = resizeTransform(fullTransform(), b, objectPivot(obj), 'e', { x: 400, y: 150 }, { fromCenter: true });
    close(centre.scaleX, 2);
    close(centre.scaleY, 1);
    const c = worldCorners({ ...obj, transform: centre });
    close((c[0].x + c[1].x) / 2, 200); // centre unchanged
  });

  it('resize is exact for rotated objects', () => {
    const obj = { ...rect(), transform: { rotation: 90 } };
    const start = fullTransform(obj.transform);
    const before = worldCorners(obj);
    // nw corner (anchor for se) must stay fixed while dragging se
    const next = resizeTransform(start, localBounds(obj), objectPivot(obj), 'se', { x: before[2].x - 50, y: before[2].y + 100 });
    const after = worldCorners({ ...obj, transform: next });
    close(after[0].x, before[0].x);
    close(after[0].y, before[0].y);
    close(next.rotation, 90);
    close(next.scaleX, 1.5); // local width grew by 100 along rotated x axis
    close(next.scaleY, 1.5);
  });

  it('rotates around arbitrary world centre', () => {
    const obj = { type: 'stroke' as const, id: 's', brush: { kind: 'ink' as const, size: 2, color: '#000', opacity: 1 }, points: [{ x: 10, y: 10 }, { x: 30, y: 10 }] };
    const centre = { x: 20, y: 10 };
    const next = rotateTransformAround(fullTransform(), objectPivot(obj), centre, 90);
    const m = transformMatrix(next, objectPivot(obj));
    const p = matApply(m, centre);
    close(p.x, 20);
    close(p.y, 10);
    const tip = matApply(m, { x: 30, y: 10 });
    close(tip.x, 20);
    close(tip.y, 20);
  });

  it('group scale keeps anchor fixed', () => {
    const obj = rect();
    const next = scaleTransformAround(fullTransform(), objectPivot(obj), { x: 100, y: 100 }, 2);
    const c = worldCorners({ ...obj, transform: next });
    close(c[0].x, 100);
    close(c[2].x, 500);
  });

  it('hit tests oriented bounds', () => {
    const obj = { ...rect(), transform: { rotation: 45 } };
    expect(hitTestObject(obj, { x: 200, y: 150 })).toBe(true);
    expect(hitTestObject(obj, { x: 110, y: 190 })).toBe(false);
  });

  it('snaps rect edges to targets', () => {
    const s = snapRect({ x: 97, y: 10, w: 50, h: 50 }, [100], [500], 5);
    expect(s.dx).toBe(3);
    expect(s.dy).toBe(0);
    expect(s.guidesX).toEqual([100]);
  });

  it('camera matrix is identity at default camera', () => {
    const p = createEmptyProject();
    const m = cameraMatrix(p);
    const pt = matApply(m, { x: 12, y: 34 });
    close(pt.x, 12);
    close(pt.y, 34);
  });

  it('objectMatrix uses keyframes at time', () => {
    const obj = { ...rect(), keyframes: [{ t: 0, transform: { x: 0 } }, { t: 1000, transform: { x: 100 } }] };
    close(objectMatrix(obj, 500)[4], 50);
  });
});

describe('ops', () => {
  it('applies a batch atomically and reports created ids', () => {
    const p = createEmptyProject();
    const layerId = p.layers[0].id;
    const { project, created } = applyOps(p, [
      { op: 'addObject', layerId, object: { type: 'shape', shape: 'ellipse', x: 0, y: 0, w: 10, h: 10, id: 'ball' } },
      { op: 'setKeyframe', id: 'ball', t: 0, transform: { y: 0 } },
      { op: 'setKeyframe', id: 'ball', t: 500, transform: { y: 200 }, easing: 'easeOutBounce' },
      { op: 'duplicateObject', id: 'ball', newId: 'ball2' },
      { op: 'setLayer', layerId, props: { name: 'Main', opacity: 2 } },
    ]);
    expect(created).toEqual(['ball', 'ball2']);
    expect(project.layers[0].name).toBe('Main');
    expect(project.layers[0].opacity).toBe(1);
    expect(project.layers[0].objects[0].keyframes).toHaveLength(2);
    expect(p.layers[0].objects).toHaveLength(0);
    expect(() => applyOps(p, [{ op: 'removeObject', id: 'nope' }])).toThrow(/op\[0\] removeObject/);
  });

  it('setTransform writes keyframes for animated objects', () => {
    const p = createEmptyProject();
    const { project } = applyOps(p, [
      { op: 'addObject', object: { type: 'shape', shape: 'rect', x: 0, y: 0, w: 10, h: 10, id: 'a' } },
      { op: 'setTransform', id: 'a', transform: { rotation: 45 } },
      { op: 'setTransform', id: 'a', transform: { x: 50 }, atMs: 250 },
      { op: 'setTransform', id: 'a', transform: { x: 80 } },
      { op: 'moveKeyframe', id: 'a', from: 250, to: 400 },
    ]);
    const a = project.layers[0].objects[0];
    expect(a.transform?.rotation).toBe(45);
    expect(a.keyframes?.map((k) => k.t)).toEqual([0, 400]);
  });
});

describe('history transactions', () => {
  it('coalesces a drag into one undo step and can cancel', () => {
    const h = new HistoryStack(createEmptyProject());
    h.begin();
    for (let i = 1; i <= 10; i++) h.update((d) => { d.width = 100 + i; });
    expect(h.end()).toBe(true);
    expect(h.project.width).toBe(110);
    h.undo();
    expect(h.project.width).toBe(1080);
    h.redo();
    h.begin();
    h.update((d) => { d.width = 5; });
    h.cancel();
    expect(h.project.width).toBe(110);
    h.begin();
    expect(h.end()).toBe(false);
    expect(h.canRedo()).toBe(false);
  });
});
