# Paint Studio — Guide for Coding Agents

Paint Studio is an **agent-first animation studio**. You can author complete animations as `.paint.json` files and render them headlessly with the CLI — no browser required.

Live demo: https://mazin7d4.github.io/PaintWebApp/

## Quick agent loop (Hyperframes-inspired)

```bash
npx paint-studio create shot.paint.json --name "Logo" --style inked-cartoon
# edit the JSON (or generate it)
npx paint-studio check shot.paint.json
npx paint-studio render shot.paint.json -o shot.gif --format gif
```

Commands: `create` · `check` · `info` · `render` · `export-hyperframes`

## Project format (v2)

See `schemas/paint-project.schema.json` and `@paint-studio/core`.

Minimum shape:

```json
{
  "version": 2,
  "name": "Demo",
  "width": 640,
  "height": 360,
  "fps": 24,
  "background": "#F7F1E3",
  "style": { "id": "inked-cartoon" },
  "palette": [{ "id": "ink", "hex": "#1A1A1A" }],
  "layers": [{ "id": "l1", "name": "Layer 1", "visible": true, "opacity": 1, "blendMode": "source-over", "objects": [] }],
  "frames": [{ "id": "f1", "duration": 1000 }]
}
```

### Object types

- **`stroke`** — expressive brush path (`points` with optional pressure `p`). Set `writeOnMs` for animated reveal.
- **`shape`** — `rect` | `ellipse` | `line` | `polygon` | `path` with fill/stroke/shadow + keyframes
- **`text`** — typography with keyframes
- **`particles`** — deterministic seeded particle emitter

### Keyframes

Animate `x,y,scaleX,scaleY,rotation,opacity` with easings: `linear`, `easeIn`, `easeOut`, `easeInOut`, `easeInCubic`, `easeOutCubic`, `easeInOutCubic`, `easeOutBack`, `easeOutElastic`, `easeOutBounce`.

Use squash & stretch via opposite `scaleX`/`scaleY` (see `examples/bouncing-ball.paint.json`).

## Art direction (how to look good)

1. **Pick a style preset first** — it sets background, palette, and default brush:
   - `flat-vector` — logos, UI motion, clean shapes
   - `inked-cartoon` — character / logo ink reveals (hero look)
   - `pixel-art` — snap coords to integers; small brush sizes
   - `painterly` — soft landscapes, parallax camera
   - `neon` — glow strokes + particles on black
2. **Stay on-palette** — use `palette[].hex` instead of random colors.
3. **Prefer strokes with pressure** — vary `p` from ~0.2 at ends to ~1.0 in the middle; enable `taper` and `smoothing` for ink.
4. **Animate with few keyframes** — easeOutBack / easeOutBounce for playful motion; camera zoom for drama.
5. **Write-on ink** — `writeOnMs` on strokes for logo reveals.
6. **Study examples** — `examples/ink-logo-reveal.paint.json`, `bouncing-ball.paint.json`, `neon-pulse.paint.json`.

## Browser API

When the editor is open:

```js
window.paintStudio.getProject()
window.paintStudio.setProject(project)
window.paintStudio.exportJson()
window.paintStudio.undo()
window.paintStudio.redo()
```

## Hyperframes interop

`npx paint-studio export-hyperframes shot.paint.json -o shot.html` emits an HTML composition stub for downstream MP4 pipelines. We do **not** vendor Hyperframes (Apache-2.0); prefer depending on their package for video encode.

## Repo map

- `packages/core` — engine
- `packages/cli` — CLI
- `packages/web` — editor
- `examples/` — reference animations
