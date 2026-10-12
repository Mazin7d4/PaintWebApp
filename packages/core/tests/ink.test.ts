import { describe, expect, it } from 'vitest';
import { isInk, parsePathPoints } from '../src/ink.js';

describe('ink path flattening', () => {
  it('parses absolute + relative commands and closes', () => {
    const s = parsePathPoints('M0,0 L10,0 l0,10 h-10 Z M20,20 C20,30 30,30 30,20');
    expect(s.length).toBe(2);
    expect(s[0].closed).toBe(true);
    expect(s[0].pts.at(-1)).toEqual({ x: 0, y: 10 });
    expect(s[1].closed).toBe(false);
    expect(s[1].pts.at(-1)!.x).toBeCloseTo(30);
  });
  it('detects ink stroke styles', () => {
    expect(isInk({ color: '#000', width: 2 })).toBe(false);
    expect(isInk({ color: '#000', width: 2, taper: 0.3 })).toBe(true);
  });
});
