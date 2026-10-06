# Paint Studio Pro 🎨

A modern, high-contrast, multi-layer canvas animation studio and graphic design app built for high performance and AI automation.

[🚀 Open Live App on GitHub Pages](https://mazin7d4.github.io/PaintWebApp/)

---

## 🔥 Features & Capabilities

- **High-Contrast Black & Yellow Design System**: Bold geometric aesthetic inspired by modern graphic design guidelines (`#1A1A1A` deep black & `#FAD400` electric yellow).
- **Preset Canvas Templates**:
  - YouTube Video (16:9 - 1920x1080)
  - YouTube Shorts / Instagram Reels (9:16 - 1080x1920)
  - Instagram Post (1:1 - 1080x1080)
  - Twitter / Web Banner (3:1 - 1200x400)
  - Custom Desktop Studio
- **Multi-Layer Drawing Engine**: Add, reorder, toggle visibility, and draw on isolated canvas layers.
- **60 FPS Frame Animation Timeline**: Create frame-by-frame animations, adjust FPS playback speed, and loop playback seamlessly.
- **AI-Driven Scriptable CLI (`window.PaintStudioCLI`)**:
  - Programmable execution engine allowing AI agents to create drawings, switch layers, set keyframes, play animations, and export renders headlessly without screenshot dependency.
- **Built-in Interactive SFX**: Real-time synthesized Web Audio UI sound effects.

---

## 🛠️ Tech Stack

- **HTML5 Canvas** (2D Context Rendering & Layer Composition)
- **CSS3** (High-contrast Black/Yellow geometric design system)
- **Vanilla JS** (Zero dependencies, CLI engine & Web Audio SFX)

---

## 🤖 AI CLI Automation Interface

AI agents can execute commands directly in the browser context via `window.PaintStudioCLI`:

```js
// Select canvas preset
PaintStudioCLI.selectTemplate('shorts'); // 'youtube', 'shorts', 'insta', 'banner'

// Create a new layer
PaintStudioCLI.addLayer('Background Layer');

// Execute drawing command programmatically
PaintStudioCLI.draw({
  tool: 'pen',
  color: '#FAD400',
  size: 10,
  path: [{x: 50, y: 50}, {x: 100, y: 100}, {x: 200, y: 150}]
});

// Add animation frame & set FPS
PaintStudioCLI.addFrame();
PaintStudioCLI.setFPS(60);
PaintStudioCLI.playAnimation();

// Query current canvas state headlessly
console.log(PaintStudioCLI.getCanvasState());
```

---

## 🚀 GitHub Pages Deployment

This repository includes a GitHub Actions workflow that deploys this static site to GitHub Pages on every push to `main` and on manual `workflow_dispatch` runs.

One-time setup for repository administrators:
1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, set **Source** to **GitHub Actions** (if prompted).
3. Commit/merge to `main` (or run the workflow manually from the **Actions** tab).

After a successful workflow run, the site is published at:

`https://mazin7d4.github.io/PaintWebApp/`

Future pushes to `main` will redeploy automatically.
