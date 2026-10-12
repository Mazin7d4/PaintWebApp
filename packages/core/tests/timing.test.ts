import { describe, expect, it } from 'vitest';
import { ease } from '../src/easing.js';
import { isShown, quantizeTime } from '../src/renderer.js';

describe('anime timing helpers', () => {
  it('quantizes to 2s at 24fps', () => {
    expect(quantizeTime(100, 1000 / 12)).toBeCloseTo(1000 / 12);
    expect(quantizeTime(160, 1000 / 12)).toBeCloseTo(1000 / 12);
    expect(quantizeTime(170, 1000 / 12)).toBeCloseTo(2000 / 12);
    expect(quantizeTime(170)).toBe(170);
  });
  it('show windows are half-open', () => {
    expect(isShown(undefined, 5)).toBe(true);
    expect(isShown([[0, 10]], 10)).toBe(false);
    expect(isShown([[0, 10], [20, 30]], 25)).toBe(true);
  });
  it('step easing holds', () => {
    expect(ease('step', 0.99)).toBe(0);
    expect(ease('step', 1)).toBe(1);
  });
});
