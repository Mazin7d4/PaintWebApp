# Changelog

## 2.0.0

### Added
- Shared TypeScript core (`@paint-studio/core`) used by the browser editor and CLI
- Versioned `.paint.json` project format + JSON Schema
- Brush engine: ink, pencil, marker, airbrush, charcoal, neon, watercolor with pressure, taper, smoothing
- Style presets: flat-vector, inked-cartoon, pixel-art, painterly, neon
- Keyframe tweening with easings, camera keyframes, write-on strokes, particles
- CLI (`paint-studio`): `create`, `check`, `info`, `render` (gif/png/png-sequence/spritesheet), `export-hyperframes`
- Black/yellow Vite editor with undo/redo, onion skin, layers, timeline, zoom, grid, import/export, autosave, `window.paintStudio` API
- Examples: bouncing ball, ink logo reveal, neon pulse
- AGENTS.md / llms.txt, CI, GitHub Pages workflow, MIT license

### Notes
- Builds on the conflict-fix branch that restores the black/yellow studio after PR #2 merge markers
- Draft GitHub Pages PRs #3/#4 are superseded by `.github/workflows/pages.yml` (not edited/closed)
