# Changelog

## 2.1.0

### Added
- Editor rebuild: a select/transform tool with 8 resize handles and a rotate handle, Shift keep-ratio, Alt from-centre, 15° rotation snap, Alt-drag duplicate, snapping guides, marquee and shift multi-select, group scale/rotate, arrow nudge, align, and z-order
- Hi-DPI viewport with zoom toward the cursor, Space/middle-mouse pan, and fit/100%
- Inspector (numeric X/Y/W/H/R/opacity, styling, keyframe and easing), a layers panel (rename, drag reorder, opacity, blend, lock, hide, duplicate), and a keyframe timeline (scrub, draggable diamonds, auto-key, frame durations)
- Browser export: GIF, WebM (MediaRecorder), PNG, PNG sequence (.zip), sprite sheet + JSON
- Core: `geometry` (bounds, matrices, exact resize/rotate/scale, snapping), `ops` (atomic edit-op language), `HistoryStack` drag transactions, and `RenderOptions.viewTransform`
- CLI `edit` and `objects` commands; MCP `paint_edit_project` and `paint_list_objects`
- Expanded `window.paintStudio` API (`help()`, `apply`, transforms, keyframes, layers, selection, time, export)
- Unit tests for geometry/ops/history; Playwright e2e in CI
- Starter scene on first visit, shortcuts overlay, toasts

### Changed
- Removed the old canvas-resize drag handle and the fake "fill" tool. Canvas size is now set in the inspector.

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
