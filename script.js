/**
 * ANTIGRAVITY ANIMATION STATION - CORE JAVASCRIPT
 */

// ==========================================================================
// 1. STATE & INITIALIZATION
// ==========================================================================

class Frame {
  constructor(width = 800, height = 450) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    
    // Transparent by default
    this.ctx.clearRect(0, 0, width, height);
    
    // History stacks for undo/redo
    this.undoStack = [];
    this.redoStack = [];
    
    // Store initial empty state
    this.saveState();
  }

  saveState() {
    const data = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.undoStack.push(data);
    this.redoStack = []; // Clear redo stack on new action
    
    // Limit history stack size to 30 states to conserve memory
    if (this.undoStack.length > 30) {
      this.undoStack.shift();
    }
  }

  undo() {
    if (this.undoStack.length > 1) {
      const current = this.undoStack.pop();
      this.redoStack.push(current);
      const prev = this.undoStack[this.undoStack.length - 1];
      this.ctx.putImageData(prev, 0, 0);
      return true;
    }
    return false;
  }

  redo() {
    if (this.redoStack.length > 0) {
      const next = this.redoStack.pop();
      this.undoStack.push(next);
      this.ctx.putImageData(next, 0, 0);
      return true;
    }
    return false;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.saveState();
  }

  duplicate() {
    const newFrame = new Frame(this.canvas.width, this.canvas.height);
    newFrame.ctx.drawImage(this.canvas, 0, 0);
    // Overwrite the initial empty state in undoStack
    newFrame.undoStack = [newFrame.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)];
    return newFrame;
  }
}

// Global Application State
const state = {
  frames: [],
  currentFrameIndex: 0,
  
  // Drawing configurations
  activeTool: 'pencil', // pencil, brush, eraser, bucket, line, rect, circle
  currentColor: '#8b5cf6', // Violet
  brushSize: 8,
  brushOpacity: 1.0,
  
  // Playback settings
  isPlaying: false,
  fps: 8,
  isLooping: true,
  playbackInterval: null,
  
  // Onion skin settings
  isOnionSkinActive: true,
  onionOpacity: 35,
  onionDirection: 'prev', // prev, both
  
  // Canvas configuration
  projectRatio: '16:9', // '16:9' or '9:16'
  showGrid: false,
  canvasBgColor: '#ffffff', // White by default
  
  // Temp drawing variables
  isDrawing: false,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  tempImageData: null,
  
  // Color palette colors
  paletteColors: [
    '#000000', // Black
    '#ffffff', // White
    '#4b5563', // Grey
    '#ef4444', // Red
    '#f97316', // Orange
    '#f59e0b', // Yellow
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#d946ef', // Fuchsia
    '#ec4899'  // Pink
  ]
};

// UI Elements Cache
let drawingCanvas, ctx;
let onionSkinCanvas, onionCtx;
let canvasContainer;

// ==========================================================================
// 2. LIFECYCLE & EVENT BINDINGS
// ==========================================================================

window.addEventListener('DOMContentLoaded', () => {
  initDOMReferences();
  initColorsPalette();
  
  // Set initial canvas sizes matching 16:9 Landscape default
  drawingCanvas.width = 800;
  drawingCanvas.height = 450;
  onionSkinCanvas.width = 800;
  onionSkinCanvas.height = 450;
  document.body.classList.add('ratio-16-9');
  
  // Initialize with a single blank frame
  state.frames.push(new Frame());
  state.currentFrameIndex = 0;
  
  setupCanvasEvents();
  setupUIEvents();
  setupKeyboardShortcuts();
  
  // Draw initial scene
  syncCanvasWithActiveFrame();
  drawTimeline();
  
  // Initialize onboarding flow for new users and donations
  initOnboarding();
  initSupportModal();

  // Attempt orientation lock to landscape on mobile layout upon first interaction
  const tryLockOrientation = () => {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').then(() => {
        console.log("Landscape mode locked successfully.");
      }).catch(err => {
        console.log("Auto landscape orientation lock skipped (requires fullscreen): ", err);
      });
    }
  };
  window.addEventListener('click', tryLockOrientation, { once: true });
  window.addEventListener('touchstart', tryLockOrientation, { once: true });
});

function initDOMReferences() {
  drawingCanvas = document.getElementById('drawing-canvas');
  ctx = drawingCanvas.getContext('2d');
  
  onionSkinCanvas = document.getElementById('onion-skin-canvas');
  onionCtx = onionSkinCanvas.getContext('2d');
  
  canvasContainer = document.getElementById('canvas-container');
}

function initColorsPalette() {
  const container = document.getElementById('palette-colors');
  container.innerHTML = '';
  
  state.paletteColors.forEach(color => {
    const swatch = document.createElement('button');
    swatch.className = 'color-swatch';
    swatch.style.backgroundColor = color;
    swatch.title = color;
    if (color === state.currentColor) swatch.classList.add('active');
    
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      selectColor(color);
    });
    
    container.appendChild(swatch);
  });
  
  // Sync custom color picker preview
  const picker = document.getElementById('color-picker');
  const preview = document.getElementById('color-preview-node');
  picker.value = state.currentColor;
  preview.style.backgroundColor = state.currentColor;
}

function selectColor(color) {
  state.currentColor = color;
  const picker = document.getElementById('color-picker');
  const preview = document.getElementById('color-preview-node');
  picker.value = color;
  preview.style.backgroundColor = color;
}

// Helper to get exact canvas coordinates from mouse events
function getMouseCoordinates(e) {
  const rect = drawingCanvas.getBoundingClientRect();
  
  // Handle touch events
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  
  return {
    x: Math.round((clientX - rect.left) * (drawingCanvas.width / rect.width)),
    y: Math.round((clientY - rect.top) * (drawingCanvas.height / rect.height))
  };
}

// ==========================================================================
// 3. CANVAS DRAWING LOGIC & BRUSHES
// ==========================================================================

function setupCanvasEvents() {
  const startDrawing = (e) => {
    if (state.isPlaying) return;
    e.preventDefault();
    
    state.isDrawing = true;
    const pos = getMouseCoordinates(e);
    state.startX = pos.x;
    state.startY = pos.y;
    state.lastX = pos.x;
    state.lastY = pos.y;
    
    // Save current frame image state for live shape previews
    state.tempImageData = ctx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
    
    if (state.activeTool === 'pencil' || state.activeTool === 'brush' || state.activeTool === 'eraser') {
      drawSegment(state.startX, state.startY, pos.x, pos.y);
    } else if (state.activeTool === 'bucket') {
      floodFillActiveFrame(pos.x, pos.y);
      commitActiveFrameChange();
      state.isDrawing = false;
    }
  };

  const drawMove = (e) => {
    if (!state.isDrawing) return;
    e.preventDefault();
    
    const pos = getMouseCoordinates(e);
    
    // Update cursor coordinates badge
    document.getElementById('badge-cursor-coords').textContent = `${pos.x}, ${pos.y}`;
    
    if (state.activeTool === 'pencil' || state.activeTool === 'brush' || state.activeTool === 'eraser') {
      drawSegment(state.lastX, state.lastY, pos.x, pos.y);
      state.lastX = pos.x;
      state.lastY = pos.y;
    } else {
      // Shape preview - clear to original image and redraw shape
      ctx.putImageData(state.tempImageData, 0, 0);
      drawShapePreview(state.startX, state.startY, pos.x, pos.y);
    }
  };

  const endDrawing = (e) => {
    if (!state.isDrawing) return;
    e.preventDefault();
    state.isDrawing = false;
    
    // Finalize shape
    if (state.activeTool !== 'pencil' && state.activeTool !== 'brush' && state.activeTool !== 'eraser' && state.activeTool !== 'bucket') {
      const pos = getMouseCoordinates(e);
      ctx.putImageData(state.tempImageData, 0, 0);
      drawShapePreview(state.startX, state.startY, pos.x, pos.y);
    }
    
    commitActiveFrameChange();
  };

  // Bind Mouse Events
  drawingCanvas.addEventListener('mousedown', startDrawing);
  window.addEventListener('mousemove', drawMove);
  window.addEventListener('mouseup', endDrawing);
  
  // Bind Touch Events
  drawingCanvas.addEventListener('touchstart', startDrawing, { passive: false });
  window.addEventListener('touchmove', drawMove, { passive: false });
  window.addEventListener('touchend', endDrawing, { passive: false });
  
  // Track cursor without drawing
  drawingCanvas.addEventListener('mousemove', (e) => {
    const pos = getMouseCoordinates(e);
    document.getElementById('badge-cursor-coords').textContent = `${pos.x}, ${pos.y}`;
  });
}

function configureBrush() {
  ctx.strokeStyle = state.currentColor;
  ctx.fillStyle = state.currentColor;
  ctx.lineWidth = state.brushSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = state.brushOpacity;
  
  if (state.activeTool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
  } else {
    ctx.globalCompositeOperation = 'source-over';
  }
}

function drawSegment(x1, y1, x2, y2) {
  configureBrush();
  
  // For single dots
  if (x1 === x2 && y1 === y2) {
    ctx.beginPath();
    ctx.arc(x1, y1, state.brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawShapePreview(x1, y1, x2, y2) {
  configureBrush();
  ctx.fillStyle = 'transparent'; // No fill for shapes preview, stroke outline only
  
  if (state.activeTool === 'line') {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  } else if (state.activeTool === 'rect') {
    ctx.beginPath();
    ctx.rect(x1, y1, x2 - x1, y2 - y1);
    ctx.stroke();
  } else if (state.activeTool === 'circle') {
    const rx = Math.abs(x2 - x1) / 2;
    const ry = Math.abs(y2 - y1) / 2;
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    
    ctx.beginPath();
    if (typeof ctx.ellipse === 'function') {
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    } else {
      // Fallback if browser doesn't support ctx.ellipse
      const r = Math.max(rx, ry);
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
    ctx.stroke();
  }
}

// Flood Fill Algorithm (Stack Based)
function floodFillActiveFrame(startX, startY) {
  const width = drawingCanvas.width;
  const height = drawingCanvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Convert current color to RGBA
  const fillRGB = hexToRgb(state.currentColor);
  const fillAlpha = Math.round(state.brushOpacity * 255);
  const fillColorRgba = [fillRGB.r, fillRGB.g, fillRGB.b, fillAlpha];

  const targetIdx = (startY * width + startX) * 4;
  const targetRgba = [data[targetIdx], data[targetIdx+1], data[targetIdx+2], data[targetIdx+3]];

  // If clicked color matches fill color, skip to prevent infinite loops
  if (colorsMatch(targetRgba, fillColorRgba)) return;

  const stack = [[startX, startY]];
  
  while (stack.length > 0) {
    const [cx, cy] = stack.pop();
    const idx = (cy * width + cx) * 4;
    const currentRgba = [data[idx], data[idx+1], data[idx+2], data[idx+3]];
    
    if (colorsMatch(currentRgba, targetRgba)) {
      data[idx] = fillColorRgba[0];
      data[idx+1] = fillColorRgba[1];
      data[idx+2] = fillColorRgba[2];
      data[idx+3] = fillColorRgba[3];
      
      if (cx > 0) stack.push([cx - 1, cy]);
      if (cx < width - 1) stack.push([cx + 1, cy]);
      if (cy > 0) stack.push([cx, cy - 1]);
      if (cy < height - 1) stack.push([cx, cy + 1]);
    }
  }
  
  ctx.putImageData(imgData, 0, 0);
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function colorsMatch(c1, c2, tolerance = 10) {
  return Math.abs(c1[0] - c2[0]) <= tolerance &&
         Math.abs(c1[1] - c2[1]) <= tolerance &&
         Math.abs(c1[2] - c2[2]) <= tolerance &&
         Math.abs(c1[3] - c2[3]) <= tolerance;
}

// Synchronize drawing screen and update frame lists
function commitActiveFrameChange() {
  const activeFrame = state.frames[state.currentFrameIndex];
  activeFrame.ctx.clearRect(0, 0, activeFrame.canvas.width, activeFrame.canvas.height);
  activeFrame.ctx.drawImage(drawingCanvas, 0, 0);
  activeFrame.saveState();
  
  updateUndoRedoButtons();
  updateOnionSkin();
  updateFrameThumbnail(state.currentFrameIndex);
}

// Undo & Redo operations
function undoStroke() {
  if (state.isPlaying) return;
  const activeFrame = state.frames[state.currentFrameIndex];
  if (activeFrame.undo()) {
    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    ctx.drawImage(activeFrame.canvas, 0, 0);
    updateUndoRedoButtons();
    updateOnionSkin();
    updateFrameThumbnail(state.currentFrameIndex);
  }
}

function redoStroke() {
  if (state.isPlaying) return;
  const activeFrame = state.frames[state.currentFrameIndex];
  if (activeFrame.redo()) {
    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    ctx.drawImage(activeFrame.canvas, 0, 0);
    updateUndoRedoButtons();
    updateOnionSkin();
    updateFrameThumbnail(state.currentFrameIndex);
  }
}

function updateUndoRedoButtons() {
  const activeFrame = state.frames[state.currentFrameIndex];
  document.getElementById('btn-undo').disabled = activeFrame.undoStack.length <= 1;
  document.getElementById('btn-redo').disabled = activeFrame.redoStack.length === 0;
}

// ==========================================================================
// 4. ONION SKINNING LOGIC
// ==========================================================================

function updateOnionSkin() {
  onionCtx.clearRect(0, 0, onionSkinCanvas.width, onionSkinCanvas.height);
  
  // Hide onion skin during active animation playback
  if (!state.isOnionSkinActive || state.isPlaying) return;

  const alpha = state.onionOpacity / 100;

  // Previous Frame
  if (state.currentFrameIndex > 0) {
    onionCtx.save();
    onionCtx.globalAlpha = alpha;
    onionCtx.drawImage(state.frames[state.currentFrameIndex - 1].canvas, 0, 0);
    onionCtx.restore();
  }

  // Next Frame (if enabled)
  if (state.onionDirection === 'both' && state.currentFrameIndex < state.frames.length - 1) {
    onionCtx.save();
    // Next frame is drawn slightly more transparent (60% of previous frame's opacity)
    onionCtx.globalAlpha = alpha * 0.6;
    onionCtx.drawImage(state.frames[state.currentFrameIndex + 1].canvas, 0, 0);
    onionCtx.restore();
  }
}

// ==========================================================================
// 5. FRAME & TIMELINE MANAGEMENT
// ==========================================================================

function syncCanvasWithActiveFrame() {
  const activeFrame = state.frames[state.currentFrameIndex];
  
  // Load drawings into primary editor canvas
  ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
  ctx.drawImage(activeFrame.canvas, 0, 0);
  
  // Render Onion skin guides
  updateOnionSkin();
  
  // Reset navigation status labels
  document.getElementById('badge-active-frame').textContent = `Frame: ${state.currentFrameIndex + 1} / ${state.frames.length}`;
  updateUndoRedoButtons();
  
  // Highlight active thumbnail in ribbon
  document.querySelectorAll('.frame-card').forEach((card, idx) => {
    if (idx === state.currentFrameIndex) {
      card.classList.add('active');
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else {
      card.classList.remove('active');
    }
  });
}

function selectFrame(index) {
  if (index < 0 || index >= state.frames.length) return;
  state.currentFrameIndex = index;
  syncCanvasWithActiveFrame();
}

function addNewFrame(insertAt = -1) {
  const newFrame = new Frame();
  
  if (insertAt === -1) {
    state.frames.push(newFrame);
    state.currentFrameIndex = state.frames.length - 1;
  } else {
    state.frames.splice(insertAt, 0, newFrame);
    state.currentFrameIndex = insertAt;
  }
  
  syncCanvasWithActiveFrame();
  drawTimeline();
}

function duplicateCurrentFrame() {
  const currentFrame = state.frames[state.currentFrameIndex];
  const duplicatedFrame = currentFrame.duplicate();
  
  state.frames.splice(state.currentFrameIndex + 1, 0, duplicatedFrame);
  state.currentFrameIndex += 1;
  
  syncCanvasWithActiveFrame();
  drawTimeline();
}

function deleteFrame(index) {
  if (state.frames.length <= 1) {
    // Cannot delete the only frame - clear it instead
    state.frames[0].clear();
    syncCanvasWithActiveFrame();
    drawTimeline();
    return;
  }
  
  state.frames.splice(index, 1);
  
  // Set active pointer to safety bounds
  if (state.currentFrameIndex >= state.frames.length) {
    state.currentFrameIndex = state.frames.length - 1;
  } else if (state.currentFrameIndex > index) {
    state.currentFrameIndex -= 1;
  }
  
  syncCanvasWithActiveFrame();
  drawTimeline();
}

function copyPreviousFrameToCurrent() {
  if (state.currentFrameIndex === 0) return; // No previous frame exists
  
  const currentFrame = state.frames[state.currentFrameIndex];
  const previousFrame = state.frames[state.currentFrameIndex - 1];
  
  currentFrame.ctx.clearRect(0, 0, currentFrame.canvas.width, currentFrame.canvas.height);
  currentFrame.ctx.drawImage(previousFrame.canvas, 0, 0);
  currentFrame.saveState();
  
  syncCanvasWithActiveFrame();
  drawTimeline();
}

function moveFrame(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= state.frames.length) return;
  
  // Swap elements in state
  const temp = state.frames[index];
  state.frames[index] = state.frames[targetIndex];
  state.frames[targetIndex] = temp;
  
  // Keep focus on the swapped frame
  state.currentFrameIndex = targetIndex;
  
  syncCanvasWithActiveFrame();
  drawTimeline();
}

// Redraw entire timeline ribbon
function drawTimeline() {
  const reel = document.getElementById('timeline-frames');
  reel.innerHTML = '';
  
  state.frames.forEach((frame, idx) => {
    const card = document.createElement('div');
    card.className = `frame-card ${idx === state.currentFrameIndex ? 'active' : ''}`;
    
    // Tiny preview canvas
    const previewCanvas = document.createElement('canvas');
    previewCanvas.className = 'frame-card-canvas';
    previewCanvas.width = 70;
    previewCanvas.height = 40;
    const pCtx = previewCanvas.getContext('2d');
    
    // Draw white background then the offscreen frame
    pCtx.fillStyle = '#ffffff';
    pCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    pCtx.drawImage(frame.canvas, 0, 0, previewCanvas.width, previewCanvas.height);
    
    card.appendChild(previewCanvas);
    
    // Badge index
    const badge = document.createElement('div');
    badge.className = 'frame-card-badge';
    badge.textContent = idx + 1;
    card.appendChild(badge);
    
    // Hover controls (Delete, Duplicate, Move)
    const actions = document.createElement('div');
    actions.className = 'frame-card-actions';
    
    // Move Left button
    if (idx > 0) {
      const btnMoveLeft = document.createElement('button');
      btnMoveLeft.className = 'frame-action-btn';
      btnMoveLeft.title = 'Move Left';
      btnMoveLeft.innerHTML = '&larr;';
      btnMoveLeft.addEventListener('click', (e) => {
        e.stopPropagation();
        moveFrame(idx, -1);
      });
      actions.appendChild(btnMoveLeft);
    }
    
    // Duplicate button
    const btnDuplicate = document.createElement('button');
    btnDuplicate.className = 'frame-action-btn';
    btnDuplicate.title = 'Duplicate Frame';
    btnDuplicate.innerHTML = '+';
    btnDuplicate.addEventListener('click', (e) => {
      e.stopPropagation();
      state.currentFrameIndex = idx;
      duplicateCurrentFrame();
    });
    actions.appendChild(btnDuplicate);
    
    // Delete button
    const btnDelete = document.createElement('button');
    btnDelete.className = 'frame-action-btn delete';
    btnDelete.title = 'Delete Frame';
    btnDelete.innerHTML = '&times;';
    btnDelete.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteFrame(idx);
    });
    actions.appendChild(btnDelete);
    
    // Move Right button
    if (idx < state.frames.length - 1) {
      const btnMoveRight = document.createElement('button');
      btnMoveRight.className = 'frame-action-btn';
      btnMoveRight.title = 'Move Right';
      btnMoveRight.innerHTML = '&rarr;';
      btnMoveRight.addEventListener('click', (e) => {
        e.stopPropagation();
        moveFrame(idx, 1);
      });
      actions.appendChild(btnMoveRight);
    }
    
    card.appendChild(actions);
    
    // Card select frame binding
    card.addEventListener('click', () => {
      selectFrame(idx);
    });
    
    reel.appendChild(card);
    
    // Draw insertion divider placeholder between cards
    if (idx < state.frames.length - 1) {
      const insertBtn = document.createElement('button');
      insertBtn.className = 'btn-timeline-insert-here';
      insertBtn.title = 'Insert Frame Here';
      insertBtn.innerHTML = '+';
      insertBtn.addEventListener('click', () => {
        addNewFrame(idx + 1);
      });
      reel.appendChild(insertBtn);
    }
  });
}

// Redraw thumbnail on active card only to keep interface smooth
function updateFrameThumbnail(index) {
  const cards = document.querySelectorAll('.frame-card');
  if (cards[index]) {
    const canvas = cards[index].querySelector('canvas');
    if (canvas) {
      const pCtx = canvas.getContext('2d');
      pCtx.fillStyle = '#ffffff';
      pCtx.fillRect(0, 0, canvas.width, canvas.height);
      pCtx.drawImage(state.frames[index].canvas, 0, 0, canvas.width, canvas.height);
    }
  }
}

// ==========================================================================
// 6. PLAYBACK CONTROLS
// ==========================================================================

function playAnimation() {
  if (state.isPlaying) return;
  state.isPlaying = true;
  
  // Swap icons
  document.getElementById('icon-play').style.display = 'none';
  document.getElementById('icon-pause').style.display = 'block';
  
  // Onion skins must be hidden when animated
  updateOnionSkin();
  
  const frameTime = 1000 / state.fps;
  
  state.playbackInterval = setInterval(() => {
    let nextIdx = state.currentFrameIndex + 1;
    if (nextIdx >= state.frames.length) {
      if (state.isLooping) {
        nextIdx = 0;
      } else {
        pauseAnimation();
        return;
      }
    }
    
    state.currentFrameIndex = nextIdx;
    syncCanvasWithActiveFrame();
  }, frameTime);
}

function pauseAnimation() {
  if (!state.isPlaying) return;
  state.isPlaying = false;
  
  // Swap icons back
  document.getElementById('icon-play').style.display = 'block';
  document.getElementById('icon-pause').style.display = 'none';
  
  clearInterval(state.playbackInterval);
  state.playbackInterval = null;
  
  // Restore onion guides
  updateOnionSkin();
}

function togglePlayback() {
  if (state.isPlaying) {
    pauseAnimation();
  } else {
    playAnimation();
  }
}

function changePlaybackFPS(newFps) {
  state.fps = parseInt(newFps);
  document.getElementById('fps-val').textContent = `${state.fps} frames/s`;
  
  // Highlight matching preset button
  document.querySelectorAll('.preset-badge').forEach(badge => {
    if (parseInt(badge.getAttribute('data-fps')) === state.fps) {
      badge.classList.add('active');
    } else {
      badge.classList.remove('active');
    }
  });

  // Re-initialize interval timer if actively playing
  if (state.isPlaying) {
    pauseAnimation();
    playAnimation();
  }
}

// ==========================================================================
// 7. VIDEO & GIF EXPORT ENGINE
// ==========================================================================

// native canvas MediaRecorder compiling WebM/MP4
// native canvas MediaRecorder compiling WebM/MP4
// native canvas MediaRecorder compiling WebM/MP4
async function exportToVideoFormat(targetRatio = '16:9') {
  pauseAnimation();
  
  // Length limit validation check (Max 15 minutes = 900 seconds)
  const durationSec = state.frames.length / state.fps;
  if (durationSec > 900) {
    const mins = Math.floor(durationSec / 60);
    const secs = Math.round(durationSec % 60);
    alert(`Export blocked! Your project is ${mins}m ${secs}s long. The maximum allowed export length is 15 minutes (900 seconds). Please delete some frames or increase playback speed (FPS).`);
    return;
  }
  
  // Require Rewarded Video Ad watch completion
  showRewardAd(() => {
    startVideoRender(targetRatio);
  });
}

async function startVideoRender(targetRatio) {
  openModal(document.getElementById('modal-exporting'));
  updateExportProgressBar(0);
  document.getElementById('exporting-message').textContent = 'Initializing canvas stream recorder...';
  
  try {
    const exportCanvas = document.createElement('canvas');
    if (targetRatio === '9:16') {
      exportCanvas.width = 1080;
      exportCanvas.height = 1920;
    } else {
      exportCanvas.width = 1920;
      exportCanvas.height = 1080;
    }
    const exportCtx = exportCanvas.getContext('2d');
    
    // Capture stream from export canvas
    const stream = exportCanvas.captureStream(state.fps);
    
    // Prioritize MP4 H.264 codecs
    let mimeType = 'video/mp4;codecs=h264';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/mp4;codecs=avc1';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/mp4';
    
    // Fallback to WebM options
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=h264';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
    
    console.log("Selected Export MIME Type: ", mimeType);
    
    let mediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 }); // 5 Mbps for high-quality 1080p
    } catch (err) {
      console.warn("Falling back to default browser MediaRecorder settings: ", err);
      mediaRecorder = new MediaRecorder(stream);
    }
    
    const chunks = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    
    const exportPromise = new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: mediaRecorder.mimeType });
        resolve({ blob: videoBlob, type: mediaRecorder.mimeType });
      };
    });
    
    mediaRecorder.start();
    
    // Draw all frames one by one sequentially
    const frameDelay = 1000 / state.fps;
    for (let i = 0; i < state.frames.length; i++) {
      document.getElementById('exporting-message').textContent = `Drawing frame ${i + 1} of ${state.frames.length} (1080p)...`;
      
      // Paint background
      const bg = state.canvasBgColor === 'transparent' ? '#ffffff' : state.canvasBgColor;
      exportCtx.fillStyle = bg;
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      
      // Draw canvas drawing scaled and centered (contain fit)
      const frameCanvas = state.frames[i].canvas;
      const scale = Math.min(exportCanvas.width / frameCanvas.width, exportCanvas.height / frameCanvas.height);
      const dx = (exportCanvas.width - frameCanvas.width * scale) / 2;
      const dy = (exportCanvas.height - frameCanvas.height * scale) / 2;
      
      exportCtx.drawImage(
        frameCanvas,
        0, 0, frameCanvas.width, frameCanvas.height,
        dx, dy, frameCanvas.width * scale, frameCanvas.height * scale
      );
      
      // Progress indicator
      updateExportProgressBar(Math.round((i / state.frames.length) * 100));
      
      // Wait for a frame tick
      await new Promise(r => setTimeout(r, frameDelay));
    }
    
    // Finish stream
    updateExportProgressBar(100);
    document.getElementById('exporting-message').textContent = 'Encoding video file...';
    
    setTimeout(() => {
      mediaRecorder.stop();
    }, 300);
    
    const result = await exportPromise;
    closeModal(document.getElementById('modal-exporting'));
    
    // Show download modal
    const videoUrl = URL.createObjectURL(result.blob);
    showDownloadDialog(videoUrl, 'video', result.type);
    
  } catch (error) {
    console.error("Export Video failed: ", error);
    closeModal(document.getElementById('modal-exporting'));
    alert("Export video failed. Your browser may lack HTML5 Canvas Capture or H.264 encoder support.");
  }
}

// Animated GIF compiler using gifshot
function exportToGifFormat() {
  pauseAnimation();
  
  // Length limit validation check (Max 15 minutes = 900 seconds)
  const durationSec = state.frames.length / state.fps;
  if (durationSec > 900) {
    const mins = Math.floor(durationSec / 60);
    const secs = Math.round(durationSec % 60);
    alert(`Export blocked! Your project is ${mins}m ${secs}s long. The maximum allowed export length is 15 minutes (900 seconds). Please delete some frames or increase playback speed (FPS).`);
    return;
  }
  
  if (typeof gifshot === 'undefined') {
    alert("GIF library is loading or blocked by your browser extensions. Please try WebM export instead!");
    return;
  }
  
  // Require Rewarded Video Ad watch completion
  showRewardAd(() => {
    startGifRender();
  });
}

function startGifRender() {
  openModal(document.getElementById('modal-exporting'));
  updateExportProgressBar(0);
  document.getElementById('exporting-message').textContent = 'Collecting frame images...';
  
  // Extract offscreen images to dataURLs, filling transparency with solid backgrounds
  const frameImages = [];
  const bg = state.canvasBgColor === 'transparent' ? '#ffffff' : state.canvasBgColor;
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 800;
  tempCanvas.height = 500;
  const tempCtx = tempCanvas.getContext('2d');
  
  state.frames.forEach(frame => {
    tempCtx.fillStyle = bg;
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(frame.canvas, 0, 0);
    frameImages.push(tempCanvas.toDataURL('image/png'));
  });
  
  document.getElementById('exporting-message').textContent = 'Creating GIF frames (takes a few seconds)...';
  updateExportProgressBar(40);
  
  gifshot.createGIF({
    images: frameImages,
    gifWidth: 800,
    gifHeight: 500,
    interval: 1 / state.fps, // Seconds per frame
    numFrames: state.frames.length,
    sampleInterval: 8,
    numWorkers: 2
  }, function(obj) {
    if (!obj.error) {
      updateExportProgressBar(100);
      closeModal(document.getElementById('modal-exporting'));
      showDownloadDialog(obj.image, 'gif', 'image/gif');
    } else {
      closeModal(document.getElementById('modal-exporting'));
      alert("GIF generation failed: " + obj.error);
    }
  });
}

// Rewarded Video Ad Controller (Simulated for Web + Cordova/AdMob Hook support)
function showRewardAd(onAdComplete) {
  // Cordova Wrapper Hook (If wrapped for Google Play Store using cordova-plugin-admob-plus)
  if (window.AdMob) {
    console.log("Cordova AdMob SDK detected. Loading mobile rewarded video ad...");
    
    // Standard rewarded ad trigger event bindings
    const onRewardedAdDismiss = () => {
      document.removeEventListener('admob.rewarded.dismiss', onRewardedAdDismiss);
      // ad completed, reward user
      onAdComplete();
    };
    document.addEventListener('admob.rewarded.dismiss', onRewardedAdDismiss);
    
    // Trigger showing the ad
    if (window.AdMob.showRewarded) {
      window.AdMob.showRewarded();
    } else if (window.admob && window.admob.rewarded) {
      window.admob.rewarded.show();
    } else {
      // Fallback
      onAdComplete();
    }
    return;
  }
  
  // Simulated Web Video Ad
  const modal = document.getElementById('modal-reward-ad');
  const counterBadge = document.getElementById('ad-counter-badge');
  const progressBar = document.getElementById('ad-progress-line');
  const statusMsg = document.getElementById('ad-status-message');
  const skipBtn = document.getElementById('btn-skip-ad');
  
  openModal(modal);
  
  let timeLeft = 15;
  counterBadge.textContent = `${timeLeft}s`;
  progressBar.style.transition = 'none';
  progressBar.style.width = '100%';
  statusMsg.textContent = 'Ad playing... Please wait.';
  skipBtn.textContent = 'Skip Ad';
  skipBtn.disabled = false;
  
  // Force layout reflow
  progressBar.offsetHeight;
  
  // Shrink progress bar over 15 seconds
  progressBar.style.transition = 'width 15s linear';
  progressBar.style.width = '0%';
  
  let adInterval;
  
  const cleanupAd = () => {
    clearInterval(adInterval);
    closeModal(modal);
  };
  
  skipBtn.onclick = () => {
    cleanupAd();
    alert("Ad skipped! You must watch the Sponsored video to unlock your video download.");
  };
  
  adInterval = setInterval(() => {
    timeLeft--;
    counterBadge.textContent = `${timeLeft}s`;
    
    if (timeLeft <= 0) {
      clearInterval(adInterval);
      statusMsg.textContent = 'Reward unlocked! Starting export...';
      counterBadge.textContent = 'Unlocked!';
      skipBtn.textContent = 'Close';
      skipBtn.disabled = true;
      
      setTimeout(() => {
        cleanupAd();
        onAdComplete(); // Execute rendering
      }, 1000);
    }
  }, 1000);
}

function updateExportProgressBar(percent) {
  document.getElementById('exporting-progress-bar').style.width = `${percent}%`;
}

function showDownloadDialog(fileUrl, fileType, mimeType) {
  const modal = document.getElementById('modal-download');
  const videoPreview = document.getElementById('export-video-preview');
  const gifPreview = document.getElementById('export-gif-preview');
  const downloadButton = document.getElementById('btn-download-file');
  const extensionInput = document.getElementById('input-filename');
  
  // Setup Preview Display
  if (fileType === 'video') {
    videoPreview.src = fileUrl;
    videoPreview.classList.remove('hidden');
    gifPreview.classList.add('hidden');
    
    // Choose appropriate file suffix based on mime
    const isMp4 = mimeType.includes('mp4');
    const suffix = isMp4 ? 'mp4' : 'webm';
    
    downloadButton.onclick = () => {
      triggerDownload(fileUrl, `${extensionInput.value}.${suffix}`);
    };
  } else {
    gifPreview.src = fileUrl;
    gifPreview.classList.remove('hidden');
    videoPreview.classList.add('hidden');
    
    downloadButton.onclick = () => {
      triggerDownload(fileUrl, `${extensionInput.value}.gif`);
    };
  }
  
  openModal(modal);
}

function triggerDownload(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==========================================================================
// 8. LOCAL STORAGE PROJECT PERSISTENCE
// ==========================================================================

function saveProjectToLocalStorage() {
  try {
    const dataToSave = {
      fps: state.fps,
      bgColor: state.canvasBgColor,
      frameWidth: drawingCanvas.width,
      frameHeight: drawingCanvas.height,
      drawings: state.frames.map(f => f.canvas.toDataURL('image/png'))
    };
    
    localStorage.setItem('antigravity_animation_project', JSON.stringify(dataToSave));
    alert("Project saved successfully inside browser local storage!");
  } catch (err) {
    console.error("Local Storage Save failed:", err);
    alert("Save failed! Project is too large for browser Local Storage. Export a video to save work!");
  }
}

async function loadProjectFromLocalStorage() {
  const rawData = localStorage.getItem('antigravity_animation_project');
  if (!rawData) {
    alert("No saved projects found in this browser.");
    return;
  }
  
  if (state.isPlaying) pauseAnimation();
  
  try {
    const project = JSON.parse(rawData);
    
    // Reset state values
    changePlaybackFPS(project.fps);
    setCanvasBackground(project.bgColor);
    
    state.frames = [];
    
    // Recreate frame list from image dataURLs
    for (let i = 0; i < project.drawings.length; i++) {
      const newFrame = new Frame(project.frameWidth, project.frameHeight);
      
      // Load drawing on offscreen canvas
      await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          newFrame.ctx.drawImage(img, 0, 0);
          newFrame.undoStack = [newFrame.ctx.getImageData(0, 0, project.frameWidth, project.frameHeight)];
          resolve();
        };
        img.src = project.drawings[i];
      });
      
      state.frames.push(newFrame);
    }
    
    state.currentFrameIndex = 0;
    syncCanvasWithActiveFrame();
    drawTimeline();
    
    alert("Project loaded successfully!");
  } catch (err) {
    console.error("Load project failed:", err);
    alert("Error occurred while parsing saved data.");
  }
}

function clearAllProjectContent() {
  if (state.isPlaying) pauseAnimation();
  
  // Create frame with correct current dimensions
  const newWidth = state.projectRatio === '9:16' ? 450 : 800;
  const newHeight = state.projectRatio === '9:16' ? 800 : 450;
  state.frames = [new Frame(newWidth, newHeight)];
  state.currentFrameIndex = 0;
  
  syncCanvasWithActiveFrame();
  drawTimeline();
  
  closeModal(document.getElementById('modal-confirm-clear'));
}

function changeProjectRatio(ratio) {
  if (state.isPlaying) pauseAnimation();
  
  state.projectRatio = ratio;
  
  // Set class on body for layout shifts
  document.body.classList.remove('ratio-16-9', 'ratio-9-16');
  document.body.classList.add(`ratio-${ratio.replace(':', '-')}`);
  
  const newWidth = ratio === '9:16' ? 450 : 800;
  const newHeight = ratio === '9:16' ? 800 : 450;
  
  // Resize primary canvases
  drawingCanvas.width = newWidth;
  drawingCanvas.height = newHeight;
  onionSkinCanvas.width = newWidth;
  onionSkinCanvas.height = newHeight;
  
  // Dynamically resize all frames and fit drawing content
  state.frames.forEach(frame => {
    // Create an offscreen buffer canvas to hold drawings
    const buffer = document.createElement('canvas');
    buffer.width = frame.canvas.width;
    buffer.height = frame.canvas.height;
    buffer.getContext('2d').drawImage(frame.canvas, 0, 0);
    
    // Resize frame canvas
    frame.canvas.width = newWidth;
    frame.canvas.height = newHeight;
    frame.ctx = frame.canvas.getContext('2d');
    frame.ctx.clearRect(0, 0, newWidth, newHeight);
    
    // Draw old drawing centered and fitted
    const scale = Math.min(newWidth / buffer.width, newHeight / buffer.height);
    const dx = (newWidth - buffer.width * scale) / 2;
    const dy = (newHeight - buffer.height * scale) / 2;
    
    frame.ctx.drawImage(
      buffer, 
      0, 0, buffer.width, buffer.height, 
      dx, dy, buffer.width * scale, buffer.height * scale
    );
    
    // Reset undo history stack for new dimensions
    frame.undoStack = [frame.ctx.getImageData(0, 0, newWidth, newHeight)];
    frame.redoStack = [];
  });
  
  // Sync editor display
  syncCanvasWithActiveFrame();
  drawTimeline();
}

// ==========================================================================
// 9. UI CONTROL DELEGATION & SLIDERS
// ==========================================================================


function setupUIEvents() {
  // Tool switching
  const toolIds = [
    { id: 'tool-pencil', name: 'pencil' },
    { id: 'tool-brush', name: 'brush' },
    { id: 'tool-eraser', name: 'eraser' },
    { id: 'tool-bucket', name: 'bucket' },
    { id: 'tool-line', name: 'line' },
    { id: 'tool-rect', name: 'rect' },
    { id: 'tool-circle', name: 'circle' }
  ];
  
  toolIds.forEach(t => {
    const el = document.getElementById(t.id);
    el.addEventListener('click', () => {
      document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
      el.classList.add('active');
      state.activeTool = t.name;
      
      // Update badge
      document.getElementById('badge-active-tool').textContent = `Tool: ${el.querySelector('span').textContent}`;
    });
  });

  // Brush Size Sliders
  const sizeSlider = document.getElementById('slider-brush-size');
  sizeSlider.addEventListener('input', (e) => {
    state.brushSize = parseInt(e.target.value);
    document.getElementById('brush-size-val').textContent = `${state.brushSize}px`;
  });

  // Brush Opacity Slider
  const opacitySlider = document.getElementById('slider-brush-opacity');
  opacitySlider.addEventListener('input', (e) => {
    state.brushOpacity = parseFloat(e.target.value) / 100;
    document.getElementById('brush-opacity-val').textContent = `${e.target.value}%`;
  });

  // Custom Color Picker
  const customColorInput = document.getElementById('color-picker');
  customColorInput.addEventListener('input', (e) => {
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    selectColor(e.target.value);
  });

  // Undo / Redo Click Bindings
  document.getElementById('btn-undo').addEventListener('click', undoStroke);
  document.getElementById('btn-redo').addEventListener('click', redoStroke);

  // Playback Navigation Control Buttons
  document.getElementById('btn-playback-first').addEventListener('click', () => {
    if (state.isPlaying) pauseAnimation();
    selectFrame(0);
  });
  document.getElementById('btn-playback-prev').addEventListener('click', () => {
    if (state.isPlaying) pauseAnimation();
    selectFrame(state.currentFrameIndex - 1);
  });
  document.getElementById('btn-playback-play').addEventListener('click', togglePlayback);
  document.getElementById('btn-playback-next').addEventListener('click', () => {
    if (state.isPlaying) pauseAnimation();
    selectFrame(state.currentFrameIndex + 1);
  });
  document.getElementById('btn-playback-last').addEventListener('click', () => {
    if (state.isPlaying) pauseAnimation();
    selectFrame(state.frames.length - 1);
  });

  // Loop toggle
  const loopToggle = document.getElementById('checkbox-loop');
  loopToggle.addEventListener('change', (e) => {
    state.isLooping = e.target.checked;
  });

  // Timeline commands
  document.getElementById('btn-timeline-add').addEventListener('click', () => {
    addNewFrame();
  });
  document.getElementById('btn-timeline-duplicate').addEventListener('click', () => {
    duplicateCurrentFrame();
  });
  document.getElementById('btn-timeline-copy-prev').addEventListener('click', () => {
    copyPreviousFrameToCurrent();
  });

  // Speed controls
  const fpsSlider = document.getElementById('slider-fps');
  fpsSlider.addEventListener('input', (e) => {
    changePlaybackFPS(e.target.value);
  });
  document.querySelectorAll('.preset-badge').forEach(badge => {
    badge.addEventListener('click', () => {
      const val = badge.getAttribute('data-fps');
      fpsSlider.value = val;
      changePlaybackFPS(val);
    });
  });

  // Onion Skin Active Toggle
  const onionSkinToggle = document.getElementById('checkbox-onion-skin');
  onionSkinToggle.addEventListener('change', (e) => {
    state.isOnionSkinActive = e.target.checked;
    updateOnionSkin();
  });

  // Onion Opacity Slider
  const onionOpacitySlider = document.getElementById('slider-onion-opacity');
  onionOpacitySlider.addEventListener('input', (e) => {
    state.onionOpacity = parseInt(e.target.value);
    document.getElementById('onion-opacity-val').textContent = `${state.onionOpacity}%`;
    updateOnionSkin();
  });

  // Onion Direction Selector
  const onionDirSelector = document.getElementById('onion-direction');
  onionDirSelector.addEventListener('change', (e) => {
    state.onionDirection = e.target.value;
    updateOnionSkin();
  });

  // Drawing Grid Overlay Toggle
  const gridToggle = document.getElementById('checkbox-grid');
  const gridOverlay = document.getElementById('grid-overlay');
  gridToggle.addEventListener('change', (e) => {
    state.showGrid = e.target.checked;
    if (state.showGrid) {
      gridOverlay.classList.remove('hidden');
    } else {
      gridOverlay.classList.add('hidden');
    }
  });

  // Canvas background selector buttons
  document.querySelectorAll('.bg-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.bg-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      setCanvasBackground(opt.getAttribute('data-bg'));
    });
  });

  // Theme Toggle Button
  const btnTheme = document.getElementById('btn-toggle-theme');
  const sunIcon = document.getElementById('theme-icon-sun');
  const moonIcon = document.getElementById('theme-icon-moon');
  btnTheme.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-theme');
    document.body.classList.toggle('light-theme', !isDark);
    if (isDark) {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    } else {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    }
  });

  // Export Dialog trigger menus
  const exportBtn = document.getElementById('btn-export-trigger');
  const exportMenu = document.getElementById('export-dropdown');
  exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportMenu.classList.toggle('show');
  });
  window.addEventListener('click', () => {
    exportMenu.classList.remove('show');
  });

  document.getElementById('btn-export-video-16-9').addEventListener('click', () => exportToVideoFormat('16:9'));
  document.getElementById('btn-export-video-9-16').addEventListener('click', () => exportToVideoFormat('9:16'));
  document.getElementById('btn-export-gif').addEventListener('click', exportToGifFormat);

  // Aspect Ratio Selection Change
  document.getElementById('project-aspect-ratio').addEventListener('change', (e) => {
    changeProjectRatio(e.target.value);
  });

  // Clear Canvas Dialog triggers
  document.getElementById('btn-clear-all').addEventListener('click', () => {
    openModal(document.getElementById('modal-confirm-clear'));
  });
  document.getElementById('btn-confirm-clear-yes').addEventListener('click', clearAllProjectContent);

  // Local storage save/load buttons
  document.getElementById('btn-save-project').addEventListener('click', saveProjectToLocalStorage);
  document.getElementById('btn-load-project').addEventListener('click', loadProjectFromLocalStorage);

  // Help Welcome Trigger
  document.getElementById('btn-show-help').addEventListener('click', () => {
    openModal(document.getElementById('modal-help'));
  });

  // Modal Closures
  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      closeActiveModals();
    });
  });
  
  // Close modals on clicking overlay background
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && overlay.id !== 'modal-reward-ad') {
        closeActiveModals();
      }
    });
  });
}

function setCanvasBackground(bg) {
  state.canvasBgColor = bg;
  
  if (bg === 'transparent') {
    canvasContainer.style.background = '';
    canvasContainer.classList.add('checkered-icon');
  } else {
    canvasContainer.style.backgroundColor = bg;
    canvasContainer.classList.remove('checkered-icon');
  }
}

// Modal handling
function openModal(el) {
  if (!el) return;
  el.classList.add('show');
}

function closeModal(el) {
  if (!el) return;
  el.classList.remove('show');
}

function closeActiveModals() {
  // Prevent closing the reward ad modal via keyboard ESC or close buttons
  const adModal = document.getElementById('modal-reward-ad');
  if (adModal && adModal.classList.contains('show')) {
    return;
  }
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show'));
}

// ==========================================================================
// 10. KEYBOARD SHORTCUTS HANDLERS
// ==========================================================================

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // If user typing inside input boxes, skip shortcuts
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }
    
    const key = e.key;
    const ctrl = e.ctrlKey || e.metaKey;
    
    // Spacebar: Play / Pause
    if (key === ' ') {
      e.preventDefault();
      togglePlayback();
    }
    
    // Left Arrow / ArrowRight: Frame Navigation
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      e.preventDefault();
      if (state.isPlaying) pauseAnimation();
      selectFrame(state.currentFrameIndex - 1);
    }
    if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      e.preventDefault();
      if (state.isPlaying) pauseAnimation();
      selectFrame(state.currentFrameIndex + 1);
    }
    
    // Ctrl + Z / Ctrl + Y: Undo / Redo
    if (ctrl && (key === 'z' || key === 'Z')) {
      e.preventDefault();
      undoStroke();
    }
    if (ctrl && (key === 'y' || key === 'Y')) {
      e.preventDefault();
      redoStroke();
    }

    // Ctrl + D: Duplicate Frame
    if (ctrl && (key === 'd' || key === 'D')) {
      e.preventDefault();
      duplicateCurrentFrame();
    }
    
    // Brush sizing shortcut keys: [ and ]
    if (key === '[') {
      e.preventDefault();
      const slider = document.getElementById('slider-brush-size');
      const newVal = Math.max(1, state.brushSize - 2);
      slider.value = newVal;
      state.brushSize = newVal;
      document.getElementById('brush-size-val').textContent = `${newVal}px`;
    }
    if (key === ']') {
      e.preventDefault();
      const slider = document.getElementById('slider-brush-size');
      const newVal = Math.min(100, state.brushSize + 2);
      slider.value = newVal;
      state.brushSize = newVal;
      document.getElementById('brush-size-val').textContent = `${newVal}px`;
    }
    
    // ESC key: close active dialogues
    if (key === 'Escape') {
      e.preventDefault();
      closeActiveModals();
    }
    
    // F: Flood Fill shortcut
    if (key === 'f' || key === 'F') {
      // Toggle to bucket tool
      document.getElementById('tool-bucket').click();
    }
  });
}

// Onboarding Slider logic
let currentOnboardingSlideIndex = 0;

function initOnboarding() {
  const modal = document.getElementById('modal-onboarding');
  const prevBtn = document.getElementById('btn-onboarding-prev');
  const nextBtn = document.getElementById('btn-onboarding-next');
  const dots = document.querySelectorAll('.onboarding-dot');
  const slides = document.querySelectorAll('.onboarding-slide');
  const supportBtn = document.getElementById('btn-support');
  const closeBtn = document.getElementById('btn-close-onboarding');

  if (!modal || !nextBtn) return;

  function showSlide(index) {
    currentOnboardingSlideIndex = index;
    
    // Toggle slides visibility
    slides.forEach((slide, idx) => {
      slide.style.display = idx === index ? 'block' : 'none';
      slide.classList.toggle('active', idx === index);
    });

    // Toggle dots active class
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === index);
    });

    // Handle Back Button visibility
    if (index === 0) {
      prevBtn.style.visibility = 'hidden';
    } else {
      prevBtn.style.visibility = 'visible';
    }

    // Handle Next/Complete Button text
    if (index === slides.length - 1) {
      nextBtn.textContent = 'Start Animating! 🚀';
    } else {
      nextBtn.textContent = 'Next';
    }
  }

  // Next Slide Click
  nextBtn.addEventListener('click', () => {
    if (currentOnboardingSlideIndex < slides.length - 1) {
      showSlide(currentOnboardingSlideIndex + 1);
    } else {
      // Completed onboarding
      localStorage.setItem('stickman_onboarding_completed', 'true');
      closeModal(modal);
    }
  });

  // Prev Slide Click
  prevBtn.addEventListener('click', () => {
    if (currentOnboardingSlideIndex > 0) {
      showSlide(currentOnboardingSlideIndex - 1);
    }
  });

  // Dots Click
  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      const targetIndex = parseInt(dot.getAttribute('data-slide-index'), 10);
      showSlide(targetIndex);
    });
  });

  // Heart Support Button: opens the dedicated support modal
  if (supportBtn) {
    supportBtn.addEventListener('click', () => {
      openModal(document.getElementById('modal-support'));
    });
  }

  // Close Onboarding sets completed storage flag as well so it doesn't pop up again
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      localStorage.setItem('stickman_onboarding_completed', 'true');
      closeModal(modal);
    });
  }

  // Auto-launch check on first load
  const completedFlag = localStorage.getItem('stickman_onboarding_completed');
  if (!completedFlag) {
    setTimeout(() => {
      openModal(modal);
      showSlide(0);
    }, 800); // Small delay to wow user on load
  }
}

// ==========================================================================
// Support / Appreciation Modal Logic
// ==========================================================================

function initSupportModal() {
  const modal = document.getElementById('modal-support');
  const closeBtn = document.getElementById('btn-close-support');
  const laterBtn = document.getElementById('btn-support-later');
  const copyBtn = document.getElementById('btn-copy-upi');
  const copyText = document.getElementById('upi-copy-text');

  if (!modal) return;

  // Close via X button
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeModal(modal));
  }

  // Close via "Maybe Later"
  if (laterBtn) {
    laterBtn.addEventListener('click', () => closeModal(modal));
  }

  // Copy UPI ID to clipboard
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const upiId = '8791321313@upi';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(upiId).then(() => {
          copyBtn.classList.add('copied');
          if (copyText) copyText.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            if (copyText) copyText.textContent = 'Copy';
          }, 2000);
        }).catch(() => {
          // Fallback for environments without clipboard API
          const el = document.createElement('textarea');
          el.value = upiId;
          document.body.appendChild(el);
          el.select();
          document.execCommand('copy');
          document.body.removeChild(el);
          copyBtn.classList.add('copied');
          if (copyText) copyText.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            if (copyText) copyText.textContent = 'Copy';
          }, 2000);
        });
      }
    });
  }
}
