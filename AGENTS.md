# Paint Studio — Guide for Coding Agents

Paint Studio is an **agent-first animation studio**. You can author complete animations as `.paint.json` files and render them headlessly with the CLI — no browser required.

Live demo: https://mazin7d4.github.io/PaintWebApp/

## Quick agent loop (Hyperframes-inspired)

```bash
npx paint-studio generate "ink logo reveal for Paint Studio" -o shot.paint.json --provider template
npx paint-studio check shot.paint.json
npx paint-studio render shot.paint.json -o shot.gif --format gif
```

Or hand-author JSON:

```bash
npx paint-studio create shot.paint.json --name "Logo" --style inked-cartoon
npx paint-studio check shot.paint.json
npx paint-studio render shot.paint.json -o shot.gif
```

Commands: `create` · `check` · `generate` · `info` · `render` · `export-hyperframes`

### MCP tools

`paint_create_project` · `paint_check_project` · `paint_generate_animation` · `paint_render`

Run: `node packages/mcp-server/dist/server.js`

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

## Edit ops (one language for CLI, MCP and browser)

Instead of rewriting the whole JSON, apply small **edit ops**. A batch is atomic: if any op fails, nothing is written.

```bash
npx paint-studio objects shot.paint.json --time 500        # ids, world bounds, keyframe times
npx paint-studio edit shot.paint.json --ops ops.json       # or --op '{"op":"..."}' (repeatable), --dry-run, -o out.json
```

```json
[
  {"op":"addObject","layerId":"layer_1","object":{"id":"ball","type":"shape","shape":"ellipse","x":400,"y":100,"w":120,"h":120,"fill":{"color":"#FF5A5F"}}},
  {"op":"setKeyframe","id":"ball","t":0,"transform":{"y":0}},
  {"op":"setKeyframe","id":"ball","t":600,"transform":{"y":300,"scaleX":1.3,"scaleY":0.7},"easing":"easeInCubic"},
  {"op":"setTransform","id":"ball","transform":{"rotation":15}},
  {"op":"setLayer","layerId":"layer_1","props":{"name":"Hero","opacity":0.9}},
  {"op":"setFrame","index":0,"duration":1200}
]
```

Ops: `addLayer`, `removeLayer`, `setLayer`, `moveLayer`, `addObject`, `removeObject`, `duplicateObject`, `updateObject`, `moveObject` (z-order or another layer), `setTransform` (writes a keyframe when the object is animated or `atMs` is given), `translate`, `setKeyframe` (with no transform it captures the current pose), `removeKeyframe`, `moveKeyframe`, `clearKeyframes`, `setProject`, `addFrame`, `removeFrame`, `setFrame`.

MCP exposes the same ops as `paint_edit_project` ({file, ops}) and `paint_list_objects`.

### Transforms

`transform` = `{x, y, scaleX, scaleY, rotation (deg), opacity}`. `x`/`y` are offsets from the geometry's own coordinates. Rotation and scale pivot around the shape's centre (rect/ellipse), the anchor `x,y` (text, particles), or the origin (strokes). The editor compensates for this, so you can pick any pivot. Core helpers `resizeTransform`, `rotateTransformAround`, `scaleTransformAround`, `worldCorners` and `worldAabb` do the exact math if you need it.

## Browser API

When the editor is open (https://mazin7d4.github.io/PaintWebApp/ or `npm run dev`), run `paintStudio.help()` for the full list:

```js
const ps = window.paintStudio;
ps.apply([...ops])                    // same ops as the CLI; one undo step; returns created ids
ps.addObject({type:'text', text:'Hi', x:100, y:120, fontSize:64, fill:{color:'#1A1A1A'}})
ps.setKeyframe(id, 500, {x: 200}, 'easeOutBack'); ps.setTransform(id, {rotation: 30}, 500)
ps.getTransform(id, t); ps.getBounds(id, t); ps.listObjects()
ps.addLayer('FX'); ps.setLayer(layerId, {opacity: .5, locked: true}); ps.moveLayer(layerId, 0)
ps.select([id]); ps.setTime(750); ps.play(); ps.setTool('brush'); ps.setBrush({kind:'neon', size:12})
ps.worldToScreen({x, y})              // for Playwright mouse input on the canvas
await ps.exportGif(); await ps.exportWebm(); await ps.exportSpriteSheet(); ps.renderFrame(500)
ps.undo(); ps.redo(); ps.getProject(); ps.setProject(p)
```

Append `?blank` to the URL for an empty canvas, or `?fresh` to ignore autosave. The e2e tests in `packages/web/e2e` drive the editor this way.

## Hyperframes interop

`npx paint-studio export-hyperframes shot.paint.json -o shot.html` emits an HTML composition stub for downstream MP4 pipelines. We do **not** vendor Hyperframes (Apache-2.0); prefer depending on their package for video encode.

## Repo map

- `packages/core` — engine
- `packages/core` — `geometry.ts` (bounds, matrices, resize/rotate, snapping), `ops.ts` (edit ops), `history.ts` (undo + drag transactions)
- `packages/cli` — CLI (`create`, `check`, `info`, `objects`, `edit`, `render`, `generate`, `export-hyperframes`)
- `packages/mcp-server` — MCP tools
- `packages/web` — editor (`main.ts`, `exporters.ts`, `starter.ts`) + Playwright e2e
- `examples/` — reference animations
