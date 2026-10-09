import {
  HistoryStack,
  STYLE_PRESETS,
  addFrame,
  addLayer,
  createEmptyProject,
  drawStroke,
  duplicateFrame,
  generateProjectFromPrompt,
  getStylePreset,
  renderProject,
  type BrushKind,
  type BrushSettings,
  type PaintProject,
  type StrokePoint,
  type StylePresetId,
  uid,
  validateProject,
} from '@paint-studio/core';

const canvas = document.getElementById('paintCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const stageWrapper = document.getElementById('stageWrapper')!;
const layersList = document.getElementById('layersList')!;
const framesTimeline = document.getElementById('framesTimeline')!;
const paletteDots = document.getElementById('paletteDots')!;
const styleSelect = document.getElementById('styleSelect') as HTMLSelectElement;
const colorPicker = document.getElementById('colorPicker') as HTMLInputElement;
const brushSize = document.getElementById('brushSize') as HTMLInputElement;
const brushSizeDisplay = document.getElementById('brushSizeDisplay')!;
const brushKind = document.getElementById('brushKind') as HTMLSelectElement;
const onionToggle = document.getElementById('onionToggle') as HTMLInputElement;
const gridToggle = document.getElementById('gridToggle') as HTMLInputElement;
const zoomRange = document.getElementById('zoomRange') as HTMLInputElement;
const zoomDisplay = document.getElementById('zoomDisplay')!;
const fpsInput = document.getElementById('fpsInput') as HTMLInputElement;
const loopMode = document.getElementById('loopMode') as HTMLSelectElement;
const resizeHandle = document.getElementById('resizeHandle')!;

let history = new HistoryStack(createEmptyProject({ name: 'Studio Session', style: 'inked-cartoon', width: 960, height: 540, fps: 12 }));
let activeLayerIndex = 0;
let currentFrameIndex = 0;
let currentTool = 'pen';
let zoom = 1;
let isDrawing = false;
let isResizing = false;
let resizeLastX = 0;
let resizeLastY = 0;
let resizeStartW = 0;
let resizeStartH = 0;
let resizeScaleX = 1;
let resizeScaleY = 1;
let strokePoints: StrokePoint[] = [];
let shapeStart: StrokePoint | null = null;
let isPlaying = false;
let playTimer: number | null = null;
let playTimeMs = 0;
let autosaveTimer: number | null = null;

const AUTOSAVE_KEY = 'paint-studio-v2-autosave';

function project(): PaintProject {
  return history.project;
}

function activeLayer() {
  return project().layers[activeLayerIndex] ?? project().layers[0];
}

function currentBrush(): BrushSettings {
  const preset = getStylePreset(project().style?.id);
  return {
    ...preset.defaultBrush,
    kind: brushKind.value as BrushKind,
    size: Number(brushSize.value),
    color: colorPicker.value,
    opacity: currentTool === 'eraser' ? 1 : preset.defaultBrush.opacity,
    blendMode: currentTool === 'eraser' ? 'destination-out' : 'source-over',
  };
}

function displaySize(): void {
  const p = project();
  canvas.width = p.width;
  canvas.height = p.height;
  const maxW = Math.min(window.innerWidth * 0.55, p.width);
  const maxH = Math.min(window.innerHeight * 0.55, p.height);
  const scale = Math.min(maxW / p.width, maxH / p.height) * zoom;
  const w = Math.max(120, p.width * scale);
  const h = Math.max(80, p.height * scale);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  stageWrapper.style.width = `${w}px`;
  stageWrapper.style.height = `${h}px`;
}

function paint(): void {
  const p = project();
  const timeMs = isPlaying
    ? playTimeMs
    : p.frames.slice(0, currentFrameIndex).reduce((s, f) => s + f.duration, 0);
  renderProject(ctx, p, {
    timeMs,
    onionSkin: onionToggle.checked && !isPlaying
      ? { prev: 1, next: 1, opacity: 0.18 }
      : undefined,
    imageSmoothing: getStylePreset(p.style?.id).imageSmoothing,
  });
  if (gridToggle.checked) {
    ctx.save();
    ctx.strokeStyle = 'rgba(26,26,26,0.12)';
    ctx.lineWidth = 1;
    const step = p.style?.id === 'pixel-art' ? 8 : 32;
    for (let x = 0; x <= p.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, p.height);
      ctx.stroke();
    }
    for (let y = 0; y <= p.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(p.width, y + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (isDrawing && strokePoints.length > 1 && (currentTool === 'pen' || currentTool === 'eraser')) {
    drawStroke(ctx, currentBrush(), strokePoints, 1);
  }
}

function scheduleAutosave(): void {
  if (autosaveTimer) window.clearTimeout(autosaveTimer);
  autosaveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(project()));
    } catch {
      /* ignore quota */
    }
  }, 400);
}

function refreshUi(): void {
  const p = project();
  fpsInput.value = String(p.fps);
  renderLayers();
  renderFrames();
  renderPalette();
  displaySize();
  paint();
  scheduleAutosave();
}

function renderPalette(): void {
  paletteDots.innerHTML = '';
  for (const c of project().palette) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `color-dot${c.hex.toLowerCase() === colorPicker.value.toLowerCase() ? ' active' : ''}`;
    btn.style.background = c.hex;
    btn.title = c.name ?? c.id;
    btn.addEventListener('click', () => {
      colorPicker.value = c.hex;
      renderPalette();
    });
    paletteDots.appendChild(btn);
  }
}

function renderLayers(): void {
  layersList.innerHTML = '';
  const layers = [...project().layers].reverse();
  layers.forEach((layer) => {
    const actualIdx = project().layers.indexOf(layer);
    const item = document.createElement('div');
    item.className = `layer-item${actualIdx === activeLayerIndex ? ' active' : ''}`;
    item.innerHTML = `<span>${layer.name}</span>
      <div class="layer-controls">
        <button type="button" class="icon-btn-small" data-act="vis">${layer.visible ? '👁' : '🙈'}</button>
        <button type="button" class="icon-btn-small" data-act="lock">${layer.locked ? '🔒' : '🔓'}</button>
      </div>`;
    item.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.dataset.act === 'vis') {
        history.commit((d) => {
          d.layers[actualIdx].visible = !d.layers[actualIdx].visible;
        });
        refreshUi();
        return;
      }
      if (t.dataset.act === 'lock') {
        history.commit((d) => {
          d.layers[actualIdx].locked = !d.layers[actualIdx].locked;
        });
        refreshUi();
        return;
      }
      activeLayerIndex = actualIdx;
      renderLayers();
    });
    layersList.appendChild(item);
  });
}

function renderFrames(): void {
  framesTimeline.innerHTML = '';
  project().frames.forEach((frame, idx) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = `frame-thumb${idx === currentFrameIndex ? ' active' : ''}`;
    thumb.textContent = `#${idx + 1}`;
    thumb.title = `${frame.name ?? 'Frame'} (${frame.duration}ms)`;
    thumb.addEventListener('click', () => {
      currentFrameIndex = idx;
      renderFrames();
      paint();
    });
    framesTimeline.appendChild(thumb);
  });
}

function pointerPos(e: PointerEvent | MouseEvent | TouchEvent): StrokePoint {
  const rect = canvas.getBoundingClientRect();
  const clientX = 'touches' in e && e.touches[0] ? e.touches[0].clientX : (e as MouseEvent).clientX;
  const clientY = 'touches' in e && e.touches[0] ? e.touches[0].clientY : (e as MouseEvent).clientY;
  const pressure = 'pressure' in e && (e as PointerEvent).pressure > 0 ? (e as PointerEvent).pressure : 0.5;
  return {
    x: ((clientX - rect.left) / rect.width) * project().width,
    y: ((clientY - rect.top) / rect.height) * project().height,
    p: pressure,
  };
}

function commitStroke(points: StrokePoint[]): void {
  if (points.length < 2) return;
  const layer = activeLayer();
  if (!layer || layer.locked) return;
  const brush = currentBrush();
  history.commit((d) => {
    d.layers[activeLayerIndex].objects.push({
      type: 'stroke',
      id: uid('stroke'),
      brush,
      points: points.map((pt) => ({ ...pt })),
    });
  });
}

function commitShape(a: StrokePoint, b: StrokePoint): void {
  const layer = activeLayer();
  if (!layer || layer.locked) return;
  history.commit((d) => {
    if (currentTool === 'line') {
      d.layers[activeLayerIndex].objects.push({
        type: 'shape',
        id: uid('shape'),
        shape: 'line',
        x: a.x,
        y: a.y,
        x2: b.x,
        y2: b.y,
        stroke: { color: colorPicker.value, width: Number(brushSize.value) },
      });
    } else if (currentTool === 'rect') {
      d.layers[activeLayerIndex].objects.push({
        type: 'shape',
        id: uid('shape'),
        shape: 'rect',
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        w: Math.abs(b.x - a.x),
        h: Math.abs(b.y - a.y),
        stroke: { color: colorPicker.value, width: Math.max(2, Number(brushSize.value) / 2) },
        fill: { color: colorPicker.value, opacity: 0.15 },
      });
    } else if (currentTool === 'ellipse') {
      d.layers[activeLayerIndex].objects.push({
        type: 'shape',
        id: uid('shape'),
        shape: 'ellipse',
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        w: Math.abs(b.x - a.x),
        h: Math.abs(b.y - a.y),
        stroke: { color: colorPicker.value, width: Math.max(2, Number(brushSize.value) / 2) },
        fill: { color: colorPicker.value, opacity: 0.15 },
      });
    }
  });
}

canvas.addEventListener('pointerdown', (e) => {
  if (isResizing) return;
  canvas.setPointerCapture(e.pointerId);
  const pos = pointerPos(e);
  if (currentTool === 'eyedropper') {
    const pixel = ctx.getImageData(Math.floor(pos.x), Math.floor(pos.y), 1, 1).data;
    colorPicker.value = `#${[pixel[0], pixel[1], pixel[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    renderPalette();
    return;
  }
  if (currentTool === 'fill') {
    history.commit((d) => {
      d.layers[activeLayerIndex].objects.unshift({
        type: 'shape',
        id: uid('fill'),
        shape: 'rect',
        x: 0,
        y: 0,
        w: d.width,
        h: d.height,
        fill: { color: colorPicker.value, opacity: 0.35 },
      });
    });
    refreshUi();
    return;
  }
  isDrawing = true;
  strokePoints = [pos];
  shapeStart = pos;
});

canvas.addEventListener('pointermove', (e) => {
  if (!isDrawing) return;
  const pos = pointerPos(e);
  if (currentTool === 'pen' || currentTool === 'eraser') {
    strokePoints.push(pos);
    paint();
  } else if (shapeStart && (currentTool === 'line' || currentTool === 'rect' || currentTool === 'ellipse')) {
    paint();
    ctx.save();
    ctx.strokeStyle = colorPicker.value;
    ctx.lineWidth = Number(brushSize.value);
    ctx.beginPath();
    if (currentTool === 'line') {
      ctx.moveTo(shapeStart.x, shapeStart.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (currentTool === 'rect') {
      ctx.strokeRect(shapeStart.x, shapeStart.y, pos.x - shapeStart.x, pos.y - shapeStart.y);
    } else {
      const rx = Math.abs(pos.x - shapeStart.x) / 2;
      const ry = Math.abs(pos.y - shapeStart.y) / 2;
      ctx.ellipse((shapeStart.x + pos.x) / 2, (shapeStart.y + pos.y) / 2, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
});

function endStroke(e: PointerEvent): void {
  if (!isDrawing) return;
  isDrawing = false;
  const pos = pointerPos(e);
  if (currentTool === 'pen' || currentTool === 'eraser') {
    strokePoints.push(pos);
    commitStroke(strokePoints);
  } else if (shapeStart) {
    commitShape(shapeStart, pos);
  }
  strokePoints = [];
  shapeStart = null;
  refreshUi();
}

canvas.addEventListener('pointerup', endStroke);
canvas.addEventListener('pointercancel', endStroke);

document.querySelectorAll<HTMLButtonElement>('.tool-btn[data-tool]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool-btn[data-tool]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentTool = btn.dataset.tool ?? 'pen';
  });
});

brushSize.addEventListener('input', () => {
  brushSizeDisplay.textContent = `${brushSize.value}px`;
});

zoomRange.addEventListener('input', () => {
  zoom = Number(zoomRange.value) / 100;
  zoomDisplay.textContent = `${zoomRange.value}%`;
  displaySize();
  paint();
});

onionToggle.addEventListener('change', () => paint());
gridToggle.addEventListener('change', () => paint());
colorPicker.addEventListener('input', () => renderPalette());

document.getElementById('undoBtn')!.addEventListener('click', () => {
  if (history.undo()) refreshUi();
});
document.getElementById('redoBtn')!.addEventListener('click', () => {
  if (history.redo()) refreshUi();
});

document.getElementById('clearBtn')!.addEventListener('click', () => {
  history.commit((d) => {
    d.layers[activeLayerIndex].objects = [];
  });
  refreshUi();
});

document.getElementById('addLayerBtn')!.addEventListener('click', () => {
  history.commit((d) => {
    addLayer(d);
  });
  activeLayerIndex = project().layers.length - 1;
  refreshUi();
});

document.getElementById('addFrameBtn')!.addEventListener('click', () => {
  history.commit((d) => {
    addFrame(d);
  });
  currentFrameIndex = project().frames.length - 1;
  refreshUi();
});

document.getElementById('dupFrameBtn')!.addEventListener('click', () => {
  history.commit((d) => {
    duplicateFrame(d, currentFrameIndex);
  });
  currentFrameIndex += 1;
  refreshUi();
});

document.getElementById('deleteFrameBtn')!.addEventListener('click', () => {
  if (project().frames.length <= 1) return;
  history.commit((d) => {
    d.frames.splice(currentFrameIndex, 1);
  });
  currentFrameIndex = Math.max(0, currentFrameIndex - 1);
  refreshUi();
});

fpsInput.addEventListener('change', () => {
  history.commit((d) => {
    d.fps = Math.max(1, Math.min(60, Number(fpsInput.value) || 12));
  });
});

function stopPlay(): void {
  isPlaying = false;
  if (playTimer) window.clearInterval(playTimer);
  playTimer = null;
  document.getElementById('playBtn')!.textContent = '▶ PLAY';
  paint();
}

document.getElementById('playBtn')!.addEventListener('click', () => {
  if (isPlaying) {
    stopPlay();
    return;
  }
  isPlaying = true;
  document.getElementById('playBtn')!.textContent = '⏸ PAUSE';
  playTimeMs = 0;
  const duration = project().frames.reduce((s, f) => s + f.duration, 0);
  playTimer = window.setInterval(() => {
    playTimeMs += 1000 / project().fps;
    if (playTimeMs >= duration) {
      if (loopMode.value === 'once') {
        stopPlay();
        return;
      }
      playTimeMs = 0;
    }
    currentFrameIndex = 0;
    let t = playTimeMs;
    for (let i = 0; i < project().frames.length; i++) {
      t -= project().frames[i].duration;
      if (t < 0) {
        currentFrameIndex = i;
        break;
      }
    }
    renderFrames();
    paint();
  }, 1000 / project().fps);
});

document.getElementById('saveProjectBtn')!.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(project(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${project().name.replace(/\s+/g, '-').toLowerCase()}.paint.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('exportPngBtn')!.addEventListener('click', () => {
  paint();
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `${project().name.replace(/\s+/g, '-').toLowerCase()}.png`;
  a.click();
});

document.getElementById('aiPromptForm')!.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('aiPrompt') as HTMLInputElement;
  const prompt = input.value.trim();
  if (!prompt) return;
  const generated = await generateProjectFromPrompt({
    prompt,
    provider: 'template',
    style: (styleSelect.value as StylePresetId) || undefined,
  });
  history = new HistoryStack(generated);
  activeLayerIndex = 0;
  currentFrameIndex = 0;
  styleSelect.value = generated.style?.id ?? 'inked-cartoon';
  refreshUi();
});

document.getElementById('openFile')!.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const text = await file.text();
  const data = JSON.parse(text) as unknown;
  const result = validateProject(data);
  if (!result.ok) {
    alert(result.errors.map((err) => err.message).join('\n'));
    return;
  }
  history = new HistoryStack(data as PaintProject);
  activeLayerIndex = 0;
  currentFrameIndex = 0;
  styleSelect.value = project().style?.id ?? 'inked-cartoon';
  refreshUi();
});

for (const [id, preset] of Object.entries(STYLE_PRESETS)) {
  const opt = document.createElement('option');
  opt.value = id;
  opt.textContent = preset.name;
  styleSelect.appendChild(opt);
}
styleSelect.value = project().style?.id ?? 'inked-cartoon';
styleSelect.addEventListener('change', () => {
  const id = styleSelect.value as StylePresetId;
  const preset = getStylePreset(id);
  history.commit((d) => {
    d.style = { id };
    d.background = preset.background;
    d.palette = preset.palette;
  });
  colorPicker.value = preset.defaultBrush.color;
  brushKind.value = preset.defaultBrush.kind;
  refreshUi();
});

resizeHandle.addEventListener('pointerdown', (e) => {
  isResizing = true;
  resizeLastX = e.clientX;
  resizeLastY = e.clientY;
  resizeStartW = project().width;
  resizeStartH = project().height;
  const rect = canvas.getBoundingClientRect();
  resizeScaleX = resizeStartW / Math.max(1, rect.width);
  resizeScaleY = resizeStartH / Math.max(1, rect.height);
  e.preventDefault();
  e.stopPropagation();
});
window.addEventListener('pointermove', (e) => {
  if (!isResizing) return;
  const totalDx = e.clientX - resizeLastX;
  const totalDy = e.clientY - resizeLastY;
  const p = project();
  p.width = Math.max(200, Math.round(resizeStartW + totalDx * resizeScaleX));
  p.height = Math.max(200, Math.round(resizeStartH + totalDy * resizeScaleY));
  displaySize();
  paint();
});
window.addEventListener('pointerup', () => {
  if (!isResizing) return;
  isResizing = false;
  const finalW = project().width;
  const finalH = project().height;
  const p = project();
  p.width = resizeStartW;
  p.height = resizeStartH;
  history.commit((d) => {
    d.width = finalW;
    d.height = finalH;
  });
  refreshUi();
});

window.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
  const key = e.key.toLowerCase();
  if ((e.metaKey || e.ctrlKey) && key === 'z') {
    e.preventDefault();
    if (e.shiftKey) history.redo();
    else history.undo();
    refreshUi();
    return;
  }
  const map: Record<string, string> = { p: 'pen', e: 'eraser', l: 'line', r: 'rect', o: 'ellipse', g: 'fill', i: 'eyedropper' };
  if (map[key]) {
    const btn = document.querySelector<HTMLButtonElement>(`.tool-btn[data-tool="${map[key]}"]`);
    btn?.click();
  }
  if (key === 'z' && !e.metaKey && !e.ctrlKey) document.getElementById('undoBtn')!.click();
  if (key === 'y') document.getElementById('redoBtn')!.click();
});

window.addEventListener('resize', () => {
  displaySize();
  paint();
});

// Expose agent API
(window as unknown as { paintStudio: unknown }).paintStudio = {
  getProject: () => structuredClone(project()),
  setProject: (p: PaintProject) => {
    const result = validateProject(p);
    if (!result.ok) throw new Error(result.errors.map((e) => e.message).join('; '));
    history = new HistoryStack(p);
    refreshUi();
  },
  undo: () => history.undo() && refreshUi(),
  redo: () => history.redo() && refreshUi(),
  render: () => paint(),
  exportJson: () => JSON.stringify(project(), null, 2),
};

try {
  const saved = localStorage.getItem(AUTOSAVE_KEY);
  if (saved) {
    const data = JSON.parse(saved) as unknown;
    if (validateProject(data).ok) history = new HistoryStack(data as PaintProject);
  }
} catch {
  /* ignore */
}

refreshUi();
