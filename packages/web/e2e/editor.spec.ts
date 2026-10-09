import { test, expect } from '@playwright/test';

test('editor loads and exposes paintStudio API', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/');
  await expect(page.getByText('PAINT STUDIO')).toBeVisible();
  await expect(page.locator('#paintCanvas')).toBeVisible();
  const hasApi = await page.evaluate(() => typeof (window as unknown as { paintStudio?: unknown }).paintStudio === 'object');
  expect(hasApi).toBe(true);
  expect(errors).toEqual([]);
});

test('can draw and undo', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('#paintCanvas');
  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();
  if (!box) return;
  await page.mouse.move(box.x + 40, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 90);
  await page.mouse.up();
  const before = await page.evaluate(() => (window as unknown as { paintStudio: { getProject: () => { layers: { objects: unknown[] }[] } } }).paintStudio.getProject().layers[0].objects.length);
  expect(before).toBeGreaterThan(0);
  await page.locator('#undoBtn').click();
  const after = await page.evaluate(() => (window as unknown as { paintStudio: { getProject: () => { layers: { objects: unknown[] }[] } } }).paintStudio.getProject().layers[0].objects.length);
  expect(after).toBe(before - 1);
});
