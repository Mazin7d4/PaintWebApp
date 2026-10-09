import { projectDurationMs } from './project.js';
import type { PaintProject } from './types.js';

/**
 * Lightweight Hyperframes interop (Apache-2.0 ecosystem).
 * We do NOT vendor Hyperframes code — we emit a simple HTML composition
 * agents can feed to `npx hyperframes` for MP4/WebM if desired.
 *
 * Pattern inspired by Hyperframes' agent-first loop: validate → preview → render.
 */
export function projectToHyperframesHtml(project: PaintProject): string {
  const durationSec = (projectDurationMs(project) / 1000).toFixed(3);
  const fps = project.fps;
  const json = JSON.stringify(project).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(project.name)} — Paint Studio → Hyperframes</title>
  <style>
    html, body { margin: 0; background: #000; overflow: hidden; }
    canvas { display: block; width: 100vw; height: 100vh; object-fit: contain; }
  </style>
</head>
<body>
  <!--
    Paint Studio Hyperframes export
    Duration: ${durationSec}s @ ${fps}fps
    Install: npm i -g hyperframes (Apache-2.0)
    Then render with your Hyperframes workflow / CLI.
  -->
  <canvas id="c" width="${project.width}" height="${project.height}"
    class="clip" data-start="0" data-duration="${durationSec}"></canvas>
  <script type="application/json" id="paint-project">${json}</script>
  <script type="module">
    // Host page expects @paint-studio/core to be bundled by the consumer,
    // or replace this stub with a pre-rendered frame sequence.
    const project = JSON.parse(document.getElementById('paint-project').textContent);
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    // Fallback: solid background + title card if core is not injected.
    ctx.fillStyle = project.background || '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FAD400';
    ctx.font = 'bold 48px system-ui';
    ctx.fillText(project.name || 'Paint Studio', 48, 96);
    ctx.font = '20px system-ui';
    ctx.fillStyle = '#fff';
    ctx.fillText('Embed @paint-studio/core renderer for full frames.', 48, 140);
  </script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface HyperframesInteropNote {
  adopted: string[];
  declined: string[];
}

export const HYPERFRAMES_INTEROP: HyperframesInteropNote = {
  adopted: [
    'Agent-first CLI loop: create → check/validate → render',
    'Striking README with rendered demo GIF and quick start for agents',
    'Skills/docs oriented to coding agents (AGENTS.md / llms.txt)',
    'Optional HTML composition export for downstream Hyperframes MP4 pipelines',
  ],
  declined: [
    'Depending on Puppeteer+ffmpeg as the primary renderer (we use @napi-rs/canvas + gifenc for deterministic, lightweight PNG/GIF)',
    'Vendoring Hyperframes source (Apache-2.0 — prefer package dependency / HTML interop instead of copying)',
    'Replacing our paint/brush document model with HTML/CSS compositions',
  ],
};
