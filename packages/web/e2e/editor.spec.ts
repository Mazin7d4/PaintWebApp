import { test, expect, type Page } from '@playwright/test';

type PS = {
  getProject(): { layers: { id: string; name: string; opacity: number; objects: { id: string; keyframes?: { t: number }[] }[] }[]; fps: number };
  addObject(o: unknown, layerId?: string): string;
  getTransform(id: string, t?: number): { x: number; y: number; scaleX: number; scaleY: number; rotation: number; opacity: number };
  getBounds(id: string, t?: number): { aabb: { x: number; y: number; w: number; h: number } };
  worldToScreen(p: { x: number; y: number }): { x: number; y: number };
  getSelection(): string[];
  select(ids: string[]): void;
  setZoom(z: number): void;
  getView(): { zoom: number; panX: number; panY: number };
  setKeyframe(id: string, t: number, tf?: unknown): void;
  setTime(ms: number): void;
  apply(ops: unknown[]): string[];
  exportGif(): Promise<Blob>;
  exportPngSequence(): Promise<Blob>;
  help(): string;
};
declare global {
  interface Window { paintStudio: PS }
}

const errors: string[] = [];

async function setup(page: Page): Promise<void> {
  errors.length = 0;
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/?blank');
  await page.waitForFunction(() => typeof window.paintStudio === 'object');
  await page.evaluate(() => {
    window.paintStudio.addObject({ id: 'box', type: 'shape', shape: 'rect', x: 200, y: 150, w: 200, h: 100, fill: { color: '#FFD600' } });
    window.paintStudio.addObject({ id: 'dot', type: 'shape', shape: 'ellipse', x: 600, y: 300, w: 80, h: 80, fill: { color: '#FF5A5F' } });
  });
}

const screen = (page: Page, x: number, y: number) => page.evaluate(([px, py]) => window.paintStudio.worldToScreen({ x: px, y: py }), [x, y] as const);
const tf = (page: Page, id: string) => page.evaluate((i) => window.paintStudio.getTransform(i), id);
const objCount = (page: Page) => page.evaluate(() => window.paintStudio.getProject().layers.reduce((n, l) => n + l.objects.length, 0));

async function dragWorld(page: Page, from: [number, number], to: [number, number], mods: string[] = []): Promise<void> {
  const a = await screen(page, ...from);
  const b = await screen(page, ...to);
  for (const m of mods) await page.keyboard.down(m);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(a.x + ((b.x - a.x) * i) / 8, a.y + ((b.y - a.y) * i) / 8);
  await page.mouse.up();
  for (const m of mods) await page.keyboard.up(m);
}

test.afterEach(() => {
  expect(errors).toEqual([]);
});

test('loads with starter example and exposes the agent API', async ({ page }) => {
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?fresh');
  await expect(page.getByText('PAINT STUDIO').first()).toBeVisible();
  const help = await page.evaluate(() => window.paintStudio.help());
  expect(help).toContain('apply(ops[])');
  const ids = await page.evaluate(() => window.paintStudio.getProject().layers.flatMap((l) => l.objects.map((o) => o.id)));
  expect(ids).toContain('ball');
});

test('click selects, drag moves, undo restores', async ({ page }) => {
  await setup(page);
  await dragWorld(page, [300, 200], [360, 260]);
  expect(await page.evaluate(() => window.paintStudio.getSelection())).toEqual(['box']);
  const t = await tf(page, 'box');
  expect(t.x).toBeCloseTo(60, 0);
  expect(t.y).toBeCloseTo(60, 0);
  await page.keyboard.press('Control+z');
  const u = await tf(page, 'box');
  expect(u.x).toBeCloseTo(0, 5);
  expect(u.y).toBeCloseTo(0, 5);
  await page.keyboard.press('Control+Shift+z');
  expect((await tf(page, 'box')).x).toBeCloseTo(60, 0);
});

test('resize from corner handle keeps the opposite corner fixed', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => window.paintStudio.select(['box']));
  await dragWorld(page, [400, 250], [500, 300]);
  const b = await page.evaluate(() => window.paintStudio.getBounds('box').aabb);
  expect(b.x).toBeCloseTo(200, 0);
  expect(b.y).toBeCloseTo(150, 0);
  expect(b.w).toBeCloseTo(300, 0);
  expect(b.h).toBeCloseTo(150, 0);
});

test('shift-resize keeps aspect ratio; alt scales from centre', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => window.paintStudio.select(['box']));
  await dragWorld(page, [400, 250], [600, 260], ['Shift']);
  let t = await tf(page, 'box');
  expect(t.scaleX).toBeCloseTo(t.scaleY, 3);
  expect(t.scaleX).toBeCloseTo(2, 1);
  await page.keyboard.press('Control+z');
  await dragWorld(page, [400, 200], [450, 200], ['Alt']);
  t = await tf(page, 'box');
  const b = await page.evaluate(() => window.paintStudio.getBounds('box').aabb);
  expect(b.x + b.w / 2).toBeCloseTo(300, 0);
  expect(b.w).toBeCloseTo(300, 0);
});

test('rotate handle rotates around the centre, shift snaps to 15°', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => window.paintStudio.select(['box']));
  const view = await page.evaluate(() => window.paintStudio.getView());
  const handleY = 150 - 26 / view.zoom; // rotate handle sits 26 css px above the top edge
  await dragWorld(page, [300, handleY], [480, 200], ['Shift']);
  const t = await tf(page, 'box');
  expect(Math.abs(t.rotation % 15)).toBeLessThan(0.001);
  expect(t.rotation).toBeGreaterThan(60);
  const b = await page.evaluate(() => window.paintStudio.getBounds('box').aabb);
  expect(b.x + b.w / 2).toBeCloseTo(300, 0);
  expect(b.y + b.h / 2).toBeCloseTo(200, 0);
});

test('pointer math stays exact after wheel zoom and space-drag pan', async ({ page }) => {
  await setup(page);
  const c = await screen(page, 300, 200);
  await page.mouse.move(c.x, c.y);
  await page.mouse.wheel(0, -400);
  const v1 = await page.evaluate(() => window.paintStudio.getView());
  expect(v1.zoom).toBeGreaterThan(1);
  const c2 = await screen(page, 300, 200);
  expect(Math.abs(c2.x - c.x)).toBeLessThan(1.5); // zoomed toward cursor
  await page.keyboard.down(' ');
  await page.mouse.down();
  await page.mouse.move(c.x - 150, c.y - 80, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up(' ');
  const v2 = await page.evaluate(() => window.paintStudio.getView());
  expect(v2.panX).toBeCloseTo(v1.panX - 150, 0);
  await dragWorld(page, [640, 340], [660, 360]);
  expect(await page.evaluate(() => window.paintStudio.getSelection())).toEqual(['dot']);
  expect((await tf(page, 'dot')).x).toBeCloseTo(20, 0);
});

test('marquee multi-select, arrow nudge, delete and duplicate', async ({ page }) => {
  await setup(page);
  await dragWorld(page, [100, 100], [900, 500]);
  expect((await page.evaluate(() => window.paintStudio.getSelection())).sort()).toEqual(['box', 'dot']);
  await page.keyboard.press('Shift+ArrowRight');
  expect((await tf(page, 'box')).x).toBe(10);
  expect((await tf(page, 'dot')).x).toBe(10);
  await page.keyboard.press('Control+d');
  expect(await objCount(page)).toBe(4);
  await page.keyboard.press('Delete');
  expect(await objCount(page)).toBe(2);
  await page.keyboard.press('Control+z');
  expect(await objCount(page)).toBe(4);
});

test('draws a pen stroke and shapes with tools', async ({ page }) => {
  await setup(page);
  await page.keyboard.press('b');
  await dragWorld(page, [100, 400], [300, 450]);
  await page.keyboard.press('r');
  await dragWorld(page, [700, 100], [800, 160]);
  const objs = await page.evaluate(() => window.paintStudio.getProject().layers[0].objects.map((o) => (o as unknown as { type: string }).type));
  expect(objs).toEqual(['shape', 'shape', 'stroke', 'shape']);
});

test('keyframes: transform writes keys when animated and diamonds drag to retime', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => {
    window.paintStudio.apply([{ op: 'setFrame', index: 0, duration: 1000 }]);
    window.paintStudio.setKeyframe('box', 0, { x: 0 });
    window.paintStudio.setKeyframe('box', 500, { x: 200 });
    window.paintStudio.select(['box']);
    window.paintStudio.setTime(250);
  });
  expect((await tf(page, 'box')).x).toBeCloseTo(100, 0);
  const diamond = page.locator('.key-row[data-object-id="box"] .diamond[data-t="500"]');
  await expect(diamond).toBeVisible();
  const bb = (await diamond.boundingBox())!;
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.mouse.down();
  await page.mouse.move(bb.x + bb.width / 2 + 120, bb.y + bb.height / 2, { steps: 6 });
  await page.mouse.up();
  const times = await page.evaluate(() => window.paintStudio.getProject().layers[0].objects[0].keyframes!.map((k) => k.t));
  expect(times[0]).toBe(0);
  expect(times[1]).toBeGreaterThan(500);
});

test('layers panel: rename, hide, lock and opacity are undoable', async ({ page }) => {
  await setup(page);
  await page.locator('#addLayerBtn').click();
  const row = page.locator('.layer').first();
  await row.locator('.name').dblclick();
  await page.keyboard.type('FX');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => window.paintStudio.getProject().layers[1].name)).toBe('FX');
  await page.locator('.layer').nth(1).locator('[data-act="lock"]').click();
  expect(await page.evaluate(() => (window.paintStudio.getProject().layers[0] as unknown as { locked: boolean }).locked)).toBe(true);
  await dragWorld(page, [300, 200], [360, 260]);
  expect((await tf(page, 'box')).x).toBe(0); // locked layer cannot be dragged
  await page.keyboard.press('Control+z');
  expect(await page.evaluate(() => (window.paintStudio.getProject().layers[0] as unknown as { locked: boolean }).locked)).toBeFalsy();
  const op = page.locator('[data-testid="layer-opacity"]');
  await op.fill('40');
  await op.dispatchEvent('change');
  const layers = await page.evaluate(() => window.paintStudio.getProject().layers.map((l) => l.opacity));
  expect(layers).toContain(0.4);
});

test('inspector edits numeric transform', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => window.paintStudio.select(['box']));
  const r = page.locator('[data-testid="insp-r"]');
  await r.fill('45');
  await r.press('Enter');
  expect((await tf(page, 'box')).rotation).toBeCloseTo(45, 3);
  const w = page.locator('[data-testid="insp-w"]');
  await w.fill('400');
  await w.press('Enter');
  expect((await tf(page, 'box')).scaleX).toBeCloseTo(2, 3);
});

test('exports GIF and PNG sequence from the browser', async ({ page }) => {
  await setup(page);
  const sizes = await page.evaluate(async () => {
    window.paintStudio.apply([{ op: 'setFrame', index: 0, duration: 250 }]);
    const gif = await window.paintStudio.exportGif();
    const zip = await window.paintStudio.exportPngSequence();
    const head = new Uint8Array(await gif.slice(0, 6).arrayBuffer());
    return { gif: gif.size, zip: zip.size, magic: String.fromCharCode(...head) };
  });
  expect(sizes.magic).toBe('GIF89a');
  expect(sizes.zip).toBeGreaterThan(100);
});
