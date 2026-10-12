// Upgrade legacy part lists (v1 Warden, close-up hands, props) to v2 ink lines + cel shading
// without redrawing them: strokes become tapered variable-width ink, flat fills get two-tone cel + rim.
import { rng, polyline } from '../geom.mjs';
const hex = (c) => { const m = /^#([0-9a-f]{6})$/i.exec(c); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const shadeOf = (c, k = 0.55, tint = [24, 16, 48]) => { const v = hex(c); if (!v) return null; return '#' + v.map((x, i) => Math.round(x * k + tint[i] * (1 - k) * 0.6).toString(16).padStart(2, '0')).join(''); };
export function inkify(parts, s, { armor = [], crackGlow = '#FF2E4D', cracks = true, boil = 0.3 } = {}) {
  const out = [];
  for (const p of parts) {
    const q = { ...p };
    if (q.stroke && typeof q.stroke === 'object' && !q.stroke.taper && (q.stroke.width ?? 0) >= 1.4 * s && /^#0|^#1/.test(q.stroke.color ?? '')) q.stroke = { ...q.stroke, weight: 0.7, taper: 0.25, boil: boil * s, boilMs: 125 };
    const f = typeof q.fill === 'string' ? q.fill : null;
    if (f && !q.cel && hex(f)) {
      const isArmor = armor.includes(f);
      q.cel = isArmor ? { shade: '#050509', shadeDist: 12 * s, shade2: '#000000', shade2Dist: 4 * s, rim: '#9AA0BC', rimDist: 3.2 * s } : { shade: shadeOf(f), shadeDist: 8 * s, rim: '#A9B8E6', rimDist: 2.2 * s };
      if (isArmor && cracks && /^(plate|paul|shin|aU)/.test(q.k ?? '')) {
        const nums = (q.d.match(/-?\d+\.?\d*/g) ?? []).map(Number); if (nums.length >= 4) {
          let cx = 0, cy = 0, n = nums.length >> 1; for (let i = 0; i < n; i++) { cx += nums[2 * i]; cy += nums[2 * i + 1]; } cx /= n; cy /= n;
          const r = rng([...(q.k)].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7)); const pts = [{ x: cx, y: cy }];
          const tx = nums[0], ty = nums[1]; for (let i = 1; i <= 4; i++) { const u = i / 4.6; pts.push({ x: cx + (tx - cx) * u + (r() - 0.5) * 10 * s, y: cy + (ty - cy) * u + (r() - 0.5) * 10 * s }); }
          out.push(q, { k: q.k + 'ck', d: polyline(pts), stroke: { color: '#000000', width: 2.2 * s, taper: 0.8, weight: 0.3 }, z: (q.z ?? 0) + 0.001 }, { k: q.k + 'ckh', d: polyline(pts.map((p) => ({ x: p.x + 1.4 * s, y: p.y + 1.4 * s }))), stroke: { color: '#7A80A0', width: 1 * s, taper: 0.8 }, z: (q.z ?? 0) + 0.0011 });
          continue;
        }
      }
    }
    out.push(q);
  }
  return out;
}
