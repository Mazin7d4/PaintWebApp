# Contributing to Paint Studio

Thanks for helping build an agent-friendly animation studio.

## Development

```bash
npm install
npm run build
npm test
npm run dev          # editor at http://127.0.0.1:5173
npx paint-studio check examples/bouncing-ball.paint.json
npx paint-studio render examples/ink-logo-reveal.paint.json -o examples/out/logo.gif
```

## Project layout

- `packages/core` — shared engine, format, brushes, renderer
- `packages/cli` — Node CLI (`paint-studio`)
- `packages/web` — Vite black/yellow editor
- `examples/` — agent-authored `.paint.json` demos
- `schemas/` — JSON Schema for the project format

## Guidelines

1. Keep the core framework-agnostic (no DOM APIs inside render math except optional `Path2D`).
2. Prefer additive, validated project JSON that coding agents can write.
3. Add unit tests for core changes; render an example GIF when changing brushes/renderer.
4. Preserve the bold black/yellow visual language in the editor.
5. Do not vendor Apache-2.0 Hyperframes source — depend or interop via HTML export.

## Pull requests

- Run `npm run check` before opening a PR
- Include screenshots for editor UI changes and GIFs for renderer/CLI changes
