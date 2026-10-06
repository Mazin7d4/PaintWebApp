// --- Paint Studio Pro Engine ---
const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');
const stageWrapper = document.getElementById('stageWrapper');
const templateSelect = document.getElementById('templateSelect');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const brushSizeDisplay = document.getElementById('brushSizeDisplay');
const sfxToggle = document.getElementById('sfxToggle');
const layersList = document.getElementById('layersList');
const addLayerBtn = document.getElementById('addLayerBtn');
const framesTimeline = document.getElementById('framesTimeline');
const addFrameBtn = document.getElementById('addFrameBtn');
const deleteFrameBtn = document.getElementById('deleteFrameBtn');
const playAnimBtn = document.getElementById('playAnimBtn');
const fpsInput = document.getElementById('fpsInput');
const toggleCliBtn = document.getElementById('toggleCliBtn');
const closeCliBtn = document.getElementById('closeCliBtn');
const cliDrawer = document.getElementById('cliDrawer');
const cliOutput = document.getElementById('cliOutput');
const cliInput = document.getElementById('cliInput');
const saveButton = document.getElementById('saveButton');
const clearButton = document.getElementById('clearButton');
const toolBtns = document.querySelectorAll('.tool-btn[data-tool]');
const colorDots = document.querySelectorAll('.color-dot');

// Sound Effects Synthesizer using Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSFX(freq = 440, type = 'sine', duration = 0.08) {
    if (!sfxToggle || !sfxToggle.checked) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
}

// State
let currentTool = 'pen';
let isDrawing = false;
let startX = 0, startY = 0;
let snapshotData = null;

let canvasDimensions = { width: 900, height: 600 };
let activeLayerIndex = 0;
let currentFrameIndex = 0;
let isPlaying = false;
let animationInterval = null;

// Multi-layer & Frame Data Structure
// frames = [ { layers: [ { name: "Layer 1", visible: true, canvas: HTMLCanvasElement } ] } ]
let frames = [];

function createLayerCanvas(width, height) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const cCtx = c.getContext('2d');
    cCtx.fillStyle = '#FFFFFF';
    // First layer gets white background
    return c;
}

function initStudio() {
    setCanvasDimensions(900, 600);
    createNewFrame();
    renderAll();
}

function setCanvasDimensions(w, h) {
    canvasDimensions.width = w;
    canvasDimensions.height = h;
    canvas.width = w;
    canvas.height = h;

    // Constrain visual stage display size
    const maxW = window.innerWidth * 0.55;
    const maxH = window.innerHeight * 0.55;
    const aspect = w / h;

    let displayW = w;
    let displayH = h;
    if (displayW > maxW) {
        displayW = maxW;
        displayH = displayW / aspect;
    }
    if (displayH > maxH) {
        displayH = maxH;
        displayW = displayH * aspect;
    }

    stageWrapper.style.width = `${displayW}px`;
    stageWrapper.style.height = `${displayH}px`;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;

    // Resize existing layers
    frames.forEach(frame => {
        frame.layers.forEach(layer => {
            const temp = document.createElement('canvas');
            temp.width = layer.canvas.width;
            temp.height = layer.canvas.height;
            temp.getContext('2d').drawImage(layer.canvas, 0, 0);

            layer.canvas.width = w;
            layer.canvas.height = h;
            layer.canvas.getContext('2d').drawImage(temp, 0, 0);
        });
    });

    renderAll();
}

// Preset Selector
templateSelect.addEventListener('change', (e) => {
    playSFX(520, 'triangle');
    switch (e.target.value) {
        case 'youtube':
            setCanvasDimensions(1920, 1080);
            break;
        case 'shorts':
            setCanvasDimensions(1080, 1920);
            break;
        case 'insta':
            setCanvasDimensions(1080, 1080);
            break;
        case 'banner':
            setCanvasDimensions(1200, 400);
            break;
        default:
            setCanvasDimensions(900, 600);
            break;
    }
});

// Frame & Layer Management
function createNewFrame() {
    const newLayers = [];
    const layer1 = {
        name: 'Background',
        visible: true,
        canvas: createLayerCanvas(canvasDimensions.width, canvasDimensions.height)
    };
    // Fill white
    const lCtx = layer1.canvas.getContext('2d');
    lCtx.fillStyle = '#FFFFFF';
    lCtx.fillRect(0, 0, canvasDimensions.width, canvasDimensions.height);

    newLayers.push(layer1);
    frames.push({ layers: newLayers });
    currentFrameIndex = frames.length - 1;
    activeLayerIndex = 0;

    updateTimelineUI();
    updateLayersUI();
}

function updateLayersUI() {
    layersList.innerHTML = '';
    const currentFrame = frames[currentFrameIndex];
    if (!currentFrame) return;

    currentFrame.layers.slice().reverse().forEach((layer, revIdx) => {
        const actualIdx = currentFrame.layers.length - 1 - revIdx;
        const item = document.createElement('div');
        item.className = `layer-item ${actualIdx === activeLayerIndex ? 'active' : ''}`;
        item.innerHTML = `
            <span>${layer.name}</span>
            <div class="layer-controls">
                <button class="icon-btn-small toggle-vis">${layer.visible ? '👁️' : '🙈'}</button>
                <button class="icon-btn-small del-layer">🗑️</button>
            </div>
        `;

        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('toggle-vis')) {
                layer.visible = !layer.visible;
                playSFX(600, 'sine');
                renderAll();
                updateLayersUI();
                return;
            }
            if (e.target.classList.contains('del-layer')) {
                if (currentFrame.layers.length > 1) {
                    currentFrame.layers.splice(actualIdx, 1);
                    activeLayerIndex = Math.max(0, actualIdx - 1);
                    playSFX(300, 'sawtooth');
                    renderAll();
                    updateLayersUI();
                }
                return;
            }
            activeLayerIndex = actualIdx;
            playSFX(480, 'square');
            updateLayersUI();
        });

        layersList.appendChild(item);
    });
}

addLayerBtn.addEventListener('click', () => {
    const currentFrame = frames[currentFrameIndex];
    if (!currentFrame) return;
    const newLayer = {
        name: `Layer ${currentFrame.layers.length + 1}`,
        visible: true,
        canvas: document.createElement('canvas')
    };
    newLayer.canvas.width = canvasDimensions.width;
    newLayer.canvas.height = canvasDimensions.height;
    currentFrame.layers.push(newLayer);
    activeLayerIndex = currentFrame.layers.length - 1;
    playSFX(700, 'triangle');
    updateLayersUI();
    renderAll();
});

// Timeline UI
function updateTimelineUI() {
    framesTimeline.innerHTML = '';
    frames.forEach((frame, idx) => {
        const thumb = document.createElement('div');
        thumb.className = `frame-thumb ${idx === currentFrameIndex ? 'active' : ''}`;
        thumb.textContent = `#${idx + 1}`;
        thumb.addEventListener('click', () => {
            currentFrameIndex = idx;
            activeLayerIndex = 0;
            playSFX(500, 'sine');
            updateTimelineUI();
            updateLayersUI();
            renderAll();
        });
        framesTimeline.appendChild(thumb);
    });
}

addFrameBtn.addEventListener('click', () => {
    createNewFrame();
    playSFX(800, 'triangle');
    renderAll();
});

deleteFrameBtn.addEventListener('click', () => {
    if (frames.length > 1) {
        frames.splice(currentFrameIndex, 1);
        currentFrameIndex = Math.max(0, currentFrameIndex - 1);
        playSFX(250, 'sawtooth');
        updateTimelineUI();
        updateLayersUI();
        renderAll();
    }
});

// Animation Playback Engine
playAnimBtn.addEventListener('click', () => {
    if (isPlaying) {
        stopAnimation();
    } else {
        startAnimation();
    }
});

function startAnimation() {
    if (frames.length <= 1) return;
    isPlaying = true;
    playAnimBtn.innerHTML = '<span>⏸ PAUSE</span>';
    const fps = parseInt(fpsInput.value, 10) || 12;
    const interval = 1000 / fps;

    animationInterval = setInterval(() => {
        currentFrameIndex = (currentFrameIndex + 1) % frames.length;
        updateTimelineUI();
        updateLayersUI();
        renderAll();
    }, interval);
}

function stopAnimation() {
    isPlaying = false;
    playAnimBtn.innerHTML = '<span>▶ PLAY</span>';
    if (animationInterval) clearInterval(animationInterval);
}

// Render Composition Engine
function renderAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const currentFrame = frames[currentFrameIndex];
    if (!currentFrame) return;

    currentFrame.layers.forEach(layer => {
        if (layer.visible) {
            ctx.drawImage(layer.canvas, 0, 0);
        }
    });
}

function getActiveLayerCtx() {
    const currentFrame = frames[currentFrameIndex];
    if (!currentFrame || !currentFrame.layers[activeLayerIndex]) return null;
    return currentFrame.layers[activeLayerIndex].canvas.getContext('2d');
}

// Interactive Drawing Logic
function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function startDrawing(e) {
    const layerCtx = getActiveLayerCtx();
    if (!layerCtx) return;

    isDrawing = true;
    const pos = getPointerPos(e);
    startX = pos.x;
    startY = pos.y;

    layerCtx.lineWidth = brushSize.value;
    layerCtx.lineCap = 'round';
    layerCtx.lineJoin = 'round';

    if (currentTool === 'eraser') {
        layerCtx.globalCompositeOperation = 'destination-out';
    } else {
        layerCtx.globalCompositeOperation = 'source-over';
        layerCtx.strokeStyle = colorPicker.value;
        layerCtx.fillStyle = colorPicker.value;
    }

    if (currentTool === 'pen' || currentTool === 'eraser') {
        layerCtx.beginPath();
        layerCtx.moveTo(startX, startY);
    } else {
        // Save snapshot for shapes
        snapshotData = layerCtx.getImageData(0, 0, canvasDimensions.width, canvasDimensions.height);
    }
}

function draw(e) {
    if (!isDrawing) return;
    const layerCtx = getActiveLayerCtx();
    if (!layerCtx) return;

    const pos = getPointerPos(e);

    if (currentTool === 'pen' || currentTool === 'eraser') {
        layerCtx.lineTo(pos.x, pos.y);
        layerCtx.stroke();
        renderAll();
    } else {
        // Restore snapshot before drawing preview shape
        layerCtx.putImageData(snapshotData, 0, 0);
        layerCtx.beginPath();

        if (currentTool === 'line') {
            layerCtx.moveTo(startX, startY);
            layerCtx.lineTo(pos.x, pos.y);
            layerCtx.stroke();
        } else if (currentTool === 'rect') {
            const w = pos.x - startX;
            const h = pos.y - startY;
            layerCtx.strokeRect(startX, startY, w, h);
        } else if (currentTool === 'circle') {
            const radius = Math.sqrt(Math.pow(pos.x - startX, 2) + Math.pow(pos.y - startY, 2));
            layerCtx.arc(startX, startY, radius, 0, 2 * Math.PI);
            layerCtx.stroke();
        }
        renderAll();
    }
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    renderAll();
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e); }, { passive: false });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); }, { passive: false });
canvas.addEventListener('touchend', stopDrawing);

// Tools Selection
toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTool = btn.getAttribute('data-tool');
        playSFX(650, 'sine');
    });
});

// Color Swatches
colorDots.forEach(dot => {
    dot.addEventListener('click', () => {
        colorDots.forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        const col = dot.getAttribute('data-color');
        colorPicker.value = col;
        playSFX(750, 'triangle');
    });
});

colorPicker.addEventListener('input', (e) => {
    colorDots.forEach(d => d.classList.remove('active'));
});

// Brush Size
brushSize.addEventListener('input', (e) => {
    brushSizeDisplay.textContent = `${e.target.value}px`;
});

// Clear
clearButton.addEventListener('click', () => {
    const layerCtx = getActiveLayerCtx();
    if (layerCtx) {
        layerCtx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);
        if (activeLayerIndex === 0) {
            layerCtx.fillStyle = '#FFFFFF';
            layerCtx.fillRect(0, 0, canvasDimensions.width, canvasDimensions.height);
        }
        playSFX(200, 'sawtooth');
        renderAll();
    }
});

// Export Render
saveButton.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `paint-studio-render-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    playSFX(900, 'sine');
});

// AI CLI Drawer Toggle
toggleCliBtn.addEventListener('click', () => {
    cliDrawer.classList.toggle('open');
    playSFX(500, 'square');
});
closeCliBtn.addEventListener('click', () => {
    cliDrawer.classList.remove('open');
});

// --- Headless / Scriptable AI CLI Engine ---
window.PaintStudioCLI = {
    getCanvasState: function() {
        return {
            dimensions: canvasDimensions,
            frameCount: frames.length,
            currentFrame: currentFrameIndex,
            activeLayer: activeLayerIndex,
            fps: parseInt(fpsInput.value, 10)
        };
    },
    selectTemplate: function(presetName) {
        templateSelect.value = presetName;
        templateSelect.dispatchEvent(new Event('change'));
        this.log(`Template set to ${presetName}`);
    },
    addLayer: function(name = 'AI Layer') {
        const currentFrame = frames[currentFrameIndex];
        const newLayer = {
            name: name,
            visible: true,
            canvas: document.createElement('canvas')
        };
        newLayer.canvas.width = canvasDimensions.width;
        newLayer.canvas.height = canvasDimensions.height;
        currentFrame.layers.push(newLayer);
        activeLayerIndex = currentFrame.layers.length - 1;
        updateLayersUI();
        renderAll();
        this.log(`Added layer: ${name}`);
    },
    draw: function(opts = {}) {
        const layerCtx = getActiveLayerCtx();
        if (!layerCtx) return;

        layerCtx.lineWidth = opts.size || 8;
        layerCtx.strokeStyle = opts.color || '#1A1A1A';
        layerCtx.fillStyle = opts.color || '#1A1A1A';
        layerCtx.lineCap = 'round';

        if (opts.path && Array.isArray(opts.path) && opts.path.length > 0) {
            layerCtx.beginPath();
            layerCtx.moveTo(opts.path[0].x, opts.path[0].y);
            for (let i = 1; i < opts.path.length; i++) {
                layerCtx.lineTo(opts.path[i].x, opts.path[i].y);
            }
            layerCtx.stroke();
        } else if (opts.shape === 'rect') {
            layerCtx.fillRect(opts.x || 0, opts.y || 0, opts.w || 100, opts.h || 100);
        } else if (opts.shape === 'circle') {
            layerCtx.beginPath();
            layerCtx.arc(opts.x || 100, opts.y || 100, opts.r || 50, 0, Math.PI * 2);
            layerCtx.fill();
        }
        renderAll();
        this.log(`Executed draw command.`);
    },
    addFrame: function() {
        createNewFrame();
        this.log(`Added new animation frame.`);
    },
    setFPS: function(fps) {
        fpsInput.value = fps;
        this.log(`FPS set to ${fps}`);
    },
    playAnimation: function() {
        startAnimation();
        this.log(`Started animation playback.`);
    },
    log: function(msg) {
        if (cliOutput) {
            cliOutput.innerHTML += `<br>> ${msg}`;
            cliOutput.scrollTop = cliOutput.scrollHeight;
        }
    }
};

// CLI Console Input Event
cliInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const cmd = cliInput.value.trim();
        cliInput.value = '';
        if (!cmd) return;

        PaintStudioCLI.log(`$ ${cmd}`);

        if (cmd.startsWith('select ')) {
            const preset = cmd.split(' ')[1];
            PaintStudioCLI.selectTemplate(preset);
        } else if (cmd === 'add layer') {
            PaintStudioCLI.addLayer();
        } else if (cmd === 'add frame') {
            PaintStudioCLI.addFrame();
        } else if (cmd === 'play') {
            PaintStudioCLI.playAnimation();
        } else if (cmd.startsWith('draw line')) {
            PaintStudioCLI.draw({
                path: [{x: 50, y: 50}, {x: 300, y: 300}],
                color: '#FAD400',
                size: 10
            });
        } else {
            try {
                eval(cmd);
            } catch (err) {
                PaintStudioCLI.log(`Error: ${err.message}`);
            }
        }
    }
});

// Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
    if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
    }
    const key = e.key.toLowerCase();
    if (key === 'p') {
        document.querySelector('[data-tool="pen"]').click();
    } else if (key === 'e') {
        document.querySelector('[data-tool="eraser"]').click();
    } else if (key === 'l') {
        document.querySelector('[data-tool="line"]').click();
    } else if (key === 'r') {
        document.querySelector('[data-tool="rect"]').click();
    } else if (key === 'c') {
        document.querySelector('[data-tool="circle"]').click();
    }
});

// Initialize Studio
initStudio();
