const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const brushSizeDisplay = document.getElementById('brushSizeDisplay');
const brushPreviewDot = document.getElementById('brushPreviewDot');
const clearButton = document.getElementById('clearButton');
const saveButton = document.getElementById('saveButton');
const resizeHandle = document.getElementById('resizeHandle');
const swatches = document.querySelectorAll('.swatch');

canvas.width = window.innerWidth * 0.75;
canvas.height = window.innerHeight * 0.55;

let painting = false;
let resizing = false;
let lastX, lastY;

// Off-screen canvas to store the drawing history
const offScreenCanvas = document.createElement('canvas');
const offScreenCtx = offScreenCanvas.getContext('2d');
offScreenCanvas.width = canvas.width;
offScreenCanvas.height = canvas.height;

// Fill background with white so saved PNGs aren't transparent by default unless drawn over
function fillCanvasBackground(targetCtx, targetCanvas) {
    targetCtx.fillStyle = '#FFFFFF';
    targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
}

fillCanvasBackground(ctx, canvas);
fillCanvasBackground(offScreenCtx, offScreenCanvas);

function startPosition(e) {
    painting = true;
    draw(e);
}

function endPosition() {
    painting = false;
    ctx.beginPath();
    offScreenCtx.beginPath();
}

function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function draw(e) {
    if (!painting) return;

    const pos = getPointerPos(e);
    const size = brushSize.value;
    const color = colorPicker.value;

    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);

    // Draw to off-screen canvas
    offScreenCtx.lineWidth = size;
    offScreenCtx.lineCap = 'round';
    offScreenCtx.lineJoin = 'round';
    offScreenCtx.strokeStyle = color;
    offScreenCtx.lineTo(pos.x, pos.y);
    offScreenCtx.stroke();
    offScreenCtx.beginPath();
    offScreenCtx.moveTo(pos.x, pos.y);
}

// Update brush display badge and preview dot
function updateBrushPreview() {
    const val = brushSize.value;
    if (brushSizeDisplay) {
        brushSizeDisplay.textContent = `${val}px`;
    }
    brushSize.setAttribute('aria-valuenow', val);
    if (brushPreviewDot) {
        const previewSize = Math.max(4, Math.min(28, val * 0.7));
        brushPreviewDot.style.width = `${previewSize}px`;
        brushPreviewDot.style.height = `${previewSize}px`;
        brushPreviewDot.style.backgroundColor = colorPicker.value;
    }
}

// Synchronize active color swatches
function setActiveSwatch(selectedColor) {
    swatches.forEach(swatch => {
        const swatchColor = swatch.getAttribute('data-color').toUpperCase();
        if (swatchColor === selectedColor.toUpperCase()) {
            swatch.classList.add('active');
            swatch.setAttribute('aria-checked', 'true');
        } else {
            swatch.classList.remove('active');
            swatch.setAttribute('aria-checked', 'false');
        }
    });
}

// Color picker change event
colorPicker.addEventListener('input', (e) => {
    setActiveSwatch(e.target.value);
    updateBrushPreview();
});

// Swatches click event
swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
        const color = swatch.getAttribute('data-color');
        colorPicker.value = color;
        setActiveSwatch(color);
        updateBrushPreview();
    });
});

// Brush slider event
brushSize.addEventListener('input', updateBrushPreview);

// Canvas Mouse & Touch Listeners
canvas.addEventListener('mousedown', startPosition);
canvas.addEventListener('mouseup', endPosition);
canvas.addEventListener('mouseleave', endPosition);
canvas.addEventListener('mousemove', draw);

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startPosition(e);
}, { passive: false });

canvas.addEventListener('touchend', endPosition);
canvas.addEventListener('touchcancel', endPosition);
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    draw(e);
}, { passive: false });

// Clear canvas action
function handleClear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    offScreenCtx.clearRect(0, 0, offScreenCanvas.width, offScreenCanvas.height);
    fillCanvasBackground(ctx, canvas);
    fillCanvasBackground(offScreenCtx, offScreenCanvas);
}

clearButton.addEventListener('click', handleClear);

// Save canvas action
saveButton.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `artwork-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
});

// Resize Handle Logic
resizeHandle.addEventListener('mousedown', (e) => {
    resizing = true;
    lastX = e.clientX;
    lastY = e.clientY;
    e.preventDefault();
});

window.addEventListener('mousemove', (e) => {
    if (resizing) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;

        const newWidth = Math.max(canvas.width + dx, 200);
        const newHeight = Math.max(canvas.height + dy, 200);

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = Math.max(newWidth, offScreenCanvas.width);
        tempCanvas.height = Math.max(newHeight, offScreenCanvas.height);

        tempCtx.drawImage(offScreenCanvas, 0, 0);

        offScreenCanvas.width = tempCanvas.width;
        offScreenCanvas.height = tempCanvas.height;
        offScreenCtx.drawImage(tempCanvas, 0, 0);

        canvas.width = newWidth;
        canvas.height = newHeight;

        fillCanvasBackground(ctx, canvas);
        ctx.drawImage(offScreenCanvas, 0, 0);

        lastX = e.clientX;
        lastY = e.clientY;
    }
});

window.addEventListener('mouseup', () => {
    resizing = false;
});

// Keyboard Shortcuts ('C' for Clear, 'S' for Save)
window.addEventListener('keydown', (e) => {
    // Avoid triggering when user might be typing in an input
    if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
    }

    if (e.key === 'c' || e.key === 'C') {
        handleClear();
    } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        saveButton.click();
    }
});

// Initialize previews
updateBrushPreview();
