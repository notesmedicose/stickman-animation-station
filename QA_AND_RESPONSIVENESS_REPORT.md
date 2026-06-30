# QA & Responsiveness Report — STICKMAN Animation Station

> **Project:** STICKMAN Animation Station  
> **Files Analyzed:** `www/index.html`, `www/styles.css`, `www/script.js`  
> **Date:** 30 June 2026  
> **Objective:** Make the application fully responsive across all screen sizes (mobile, tablet, desktop) and fix UI/UX bugs.

---

## Table of Contents

1. [Critical Bugs & Issues](#1-critical-bugs--issues)
2. [Responsiveness Gaps](#2-responsiveness-gaps)
3. [CSS Fluid System Plan](#3-css-fluid-system-plan)
4. [JavaScript Dynamic Layout Engine](#4-javascript-dynamic-layout-engine)
5. [Touch & Mobile Improvements](#5-touch--mobile-improvements)
6. [Breakpoint Strategy](#6-breakpoint-strategy)
7. [Files to Modify](#7-files-to-modify)
8. [Testing Checklist](#8-testing-checklist)

---

## 1. Critical Bugs & Issues

### 1.1 Canvas Coordinate Mapping After Resize
- **File:** `www/script.js` — `getMouseCoordinates()` (line 226)
- **Issue:** The function uses `drawingCanvas.getBoundingClientRect()` and `drawingCanvas.width / rect.width` ratio. If the canvas is dynamically resized (CSS changes dimensions), the coordinate mapping may become inaccurate because the canvas internal resolution (`width`/`height` attributes) may not match the CSS display size.
- **Fix:** Ensure that whenever the canvas wrapper is resized, the canvas internal resolution is recalculated proportionally, OR the coordinate mapping accounts for any discrepancy.

### 1.2 No Window Resize / Orientation Change Handler
- **File:** `www/script.js`
- **Issue:** There is **no** `window.addEventListener('resize', ...)` or `window.addEventListener('orientationchange', ...)` listener. The layout is calculated only once on `DOMContentLoaded`. If the user rotates their device or resizes the browser window, the canvas and UI elements will not reflow.
- **Fix:** Add a debounced resize handler that recalculates canvas dimensions, sidebar positions, and updates the portrait-lock overlay.

### 1.3 Portrait Lock Overlay Too Aggressive
- **File:** `www/styles.css` (line 1326-1330)
- **Issue:** The portrait lock shows on **any** device < 900px in portrait orientation. This blocks tablets like iPad (768px portrait) which have enough width to use the app.
- **Fix:** Change threshold to only show on devices < 600px width in portrait, or use JS to check if the viewport is too narrow for the canvas to be usable (< 450px).

### 1.4 Export Dropdown Overflow
- **File:** `www/styles.css` (line 287-300)
- **Issue:** The export dropdown is positioned `right: 0` of the export button. On small screens, if the export button is near the right edge, the dropdown may overflow off-screen.
- **Fix:** On small viewports, anchor the dropdown to the left instead, or use `right: auto; left: 0` via a media query.

### 1.5 Header Button Overflow
- **File:** `www/index.html` (lines 54-126)
- **Issue:** The header contains ~15 buttons/controls. On screens narrower than 768px, these will overflow or get clipped. The existing CSS hides `.btn-text` but there are still too many icon-only buttons.
- **Fix:** Use a combination of:
  - Hiding less-used buttons on small screens (e.g., "Save", "Load", "Clear All" can go into a "More" dropdown)
  - Using `overflow-x: auto` on the header actions container
  - Reducing gap/padding further

### 1.6 Sidebar Width on Small Screens
- **File:** `www/styles.css` (line 337-356)
- **Issue:** Sidebars are fixed at 240px width. On screens < 480px, this takes up most of the viewport, leaving little room for the canvas behind the overlay.
- **Fix:** Use `width: clamp(180px, 40vw, 240px)` on tablets, and `width: 100vw; max-width: 320px` on phones with full-screen overlay.

### 1.7 Modal Width Overflow
- **File:** `www/styles.css` (lines 1109-1111, 1497, 1777)
- **Issue:** Modals have fixed widths (500px for general, 440px for support, 500px for onboarding). On screens < 500px, these overflow horizontally.
- **Fix:** Use `width: min(90vw, 500px)` or `width: clamp(300px, 80vw, 500px)` for all modals.

### 1.8 Onboarding Feature Grid on Small Screens
- **File:** `www/styles.css` (line 1828)
- **Issue:** The features grid uses `grid-template-columns: repeat(2, 1fr)`. On screens < 400px, each card becomes too narrow.
- **Fix:** Change to `repeat(auto-fit, minmax(140px, 1fr))` or switch to 1 column on small screens.

### 1.9 Canvas Aspect Ratio Calculations
- **File:** `www/styles.css` (lines 667-685, 2145-2160)
- **Issue:** The `min()` calculations for canvas dimensions use hardcoded values like `calc(100vh - 180px)` and `92vw`. These don't account for varying header/timeline heights across breakpoints.
- **Fix:** Use JS to dynamically calculate available space and set canvas dimensions, with CSS as fallback.

### 1.10 Timeline Frame Card Sizing
- **File:** `www/styles.css` (lines 980-982, 2135-2142)
- **Issue:** Frame cards are 80x50px on desktop, 55x34px on mobile. On very small screens (< 360px), even 55px may be too wide for 10+ frames.
- **Fix:** Use `width: clamp(40px, 10vw, 80px)` and `height: clamp(28px, 6vw, 50px)`.

---

## 2. Responsiveness Gaps

### 2.1 Missing Breakpoints
The app currently has only **one** media query at `(max-width: 900px), (max-height: 520px)`. Missing breakpoints:

| Device | Width Range | Issues |
|--------|------------|--------|
| Large Desktop (> 1440px) | > 1440px | Canvas doesn't scale up, sidebars look small |
| Desktop (1025-1440px) | 1025-1440px | Works but could use more space |
| Small Desktop / Large Tablet (901-1024px) | 901-1024px | Falls into mobile query, too aggressive |
| Tablet Landscape (768-900px) | 768-900px | Header may overflow, canvas could be larger |
| Tablet Portrait (600-768px) | 600-768px | Portrait lock may trigger incorrectly |
| Large Phone (480-600px) | 480-600px | Sidebars too wide, header crowded |
| Small Phone (360-480px) | 360-480px | Everything needs to shrink |
| Very Small Phone (< 360px) | < 360px | Minimal UI mode needed |

### 2.2 No Fluid Typography
- Font sizes use fixed `rem` values throughout. On large screens, text looks small. On small screens, text may overflow buttons.
- **Fix:** Use `clamp()` for all font sizes, e.g., `font-size: clamp(0.7rem, 1.2vw, 0.95rem)`.

### 2.3 No Viewport-Unit-Based Spacing
- Margins, paddings, and gaps use fixed pixel values. They don't scale with viewport size.
- **Fix:** Use `clamp()` or viewport units for spacing in key layout areas.

### 2.4 Canvas Doesn't Fill Available Space
- The canvas wrapper has `max-width: 900px` for 16:9 and `max-width: 380px` for 9:16. On larger screens, the canvas doesn't grow to use available space.
- **Fix:** Calculate optimal canvas size dynamically based on available viewport area.

---

## 3. CSS Fluid System Plan

Replace fixed values with fluid `clamp()` expressions across all components.

### 3.1 Header
```css
.main-header {
  height: clamp(36px, 5vh, 52px);
  padding: 0 clamp(8px, 2vw, 24px);
}
.header-logo h1 {
  font-size: clamp(0.85rem, 2vw, 1.25rem);
}
.header-actions {
  gap: clamp(4px, 1vw, 10px);
}
```

### 3.2 Workspace Container
```css
.workspace-container {
  height: calc(100vh - var(--header-height) - var(--timeline-height));
  padding: clamp(4px, 1vh, 12px);
}
```

### 3.3 Sidebars
```css
.sidebar-left, .sidebar-right {
  width: clamp(180px, 20vw, 260px);
  padding: clamp(8px, 1.5vh, 16px);
}
/* On small screens, override to full-width overlay */
@media (max-width: 600px) {
  .sidebar-left, .sidebar-right {
    width: 100vw;
    max-width: 320px;
  }
}
```

### 3.4 Canvas
```css
.canvas-status {
  max-width: min(90vw, clamp(400px, 60vw, 900px));
}
.status-badge {
  font-size: clamp(0.6rem, 1vw, 0.85rem);
  padding: clamp(3px, 0.6vh, 8px) clamp(6px, 1vw, 14px);
}
```

### 3.5 Timeline
```css
.timeline-container {
  height: clamp(50px, 8vh, 90px);
  padding: clamp(4px, 1vh, 12px) clamp(8px, 2vw, 20px);
  gap: clamp(6px, 1.5vw, 16px);
}
.frame-card {
  width: clamp(40px, 8vw, 80px);
  height: clamp(28px, 5vh, 50px);
}
```

### 3.6 Quick Controls
```css
.quick-controls {
  gap: clamp(4px, 1vw, 8px);
  padding: clamp(2px, 0.5vh, 6px) clamp(6px, 1.5vw, 14px);
}
.btn-control {
  width: clamp(20px, 3vw, 30px);
  height: clamp(20px, 3vw, 30px);
}
.btn-play-pause {
  width: clamp(26px, 4vw, 38px);
  height: clamp(26px, 4vw, 38px);
}
```

### 3.7 Modals
```css
.modal-card {
  width: min(92vw, clamp(320px, 50vw, 560px));
  max-height: 90vh;
}
.modal-header h2 {
  font-size: clamp(1rem, 2.5vw, 1.5rem);
}
.modal-body {
  padding: clamp(12px, 2vh, 24px);
}
```

### 3.8 Typography
```css
:root {
  --text-sm: clamp(0.65rem, 1vw, 0.8rem);
  --text-base: clamp(0.75rem, 1.2vw, 0.95rem);
  --text-lg: clamp(0.9rem, 1.8vw, 1.2rem);
  --text-xl: clamp(1.1rem, 2.5vw, 1.5rem);
  --text-2xl: clamp(1.3rem, 3vw, 1.8rem);
}
```

---

## 4. JavaScript Dynamic Layout Engine

### 4.1 New Function: `recalculateLayout()`

```javascript
// Debounced resize handler
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(recalculateLayout, 150);
});
window.addEventListener('orientationchange', () => {
  setTimeout(recalculateLayout, 300); // Wait for orientation to complete
});

function recalculateLayout() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  
  // 1. Get header & timeline heights
  const headerHeight = document.querySelector('.main-header').offsetHeight;
  const timelineHeight = document.querySelector('.timeline-container').offsetHeight;
  
  // 2. Calculate available space for canvas
  const availableHeight = vh - headerHeight - timelineHeight - 40; // 40px for status + controls + padding
  const availableWidth = vw - 40; // 20px padding on each side
  
  // 3. Calculate optimal canvas dimensions maintaining aspect ratio
  const aspectRatio = state.projectRatio === '16:9' ? 16/9 : 9/16;
  let canvasWidth, canvasHeight;
  
  if (availableWidth / availableHeight > aspectRatio) {
    // Height constrained
    canvasHeight = availableHeight;
    canvasWidth = canvasHeight * aspectRatio;
  } else {
    // Width constrained
    canvasWidth = availableWidth;
    canvasHeight = canvasWidth / aspectRatio;
  }
  
  // 4. Apply to canvas wrapper
  const wrapper = document.querySelector('.canvas-wrapper-outer');
  wrapper.style.width = `${canvasWidth}px`;
  wrapper.style.height = `${canvasHeight}px`;
  
  // 5. Update portrait lock
  const lockOverlay = document.getElementById('portrait-lock-overlay');
  if (vw < 500 && vh > vw) {
    lockOverlay.style.display = 'flex';
  } else {
    lockOverlay.style.display = 'none';
  }
  
  // 6. Adjust sidebar behavior based on width
  const sidebarLeft = document.getElementById('sidebar-left');
  const sidebarRight = document.getElementById('sidebar-right');
  if (vw < 600) {
    sidebarLeft.style.width = '100vw';
    sidebarRight.style.width = '100vw';
  } else if (vw < 1024) {
    sidebarLeft.style.width = '200px';
    sidebarRight.style.width = '200px';
  } else {
    sidebarLeft.style.width = 'clamp(180px, 20vw, 260px)';
    sidebarRight.style.width = 'clamp(180px, 20vw, 260px)';
  }
}
```

### 4.2 Integration Points
- Call `recalculateLayout()` at the end of `DOMContentLoaded`
- Call after `changeProjectRatio()` to recalculate for new aspect ratio
- Call after sidebar toggle (in case layout shifts)

---

## 5. Touch & Mobile Improvements

### 5.1 Prevent Canvas Scrolling / Zooming
```css
/* In styles.css */
.canvas-layer {
  touch-action: none; /* Prevent scroll/zoom on canvas */
}
body {
  touch-action: manipulation; /* Prevent double-tap zoom */
}
```

### 5.2 Improve Touch Drawing
```javascript
// In getMouseCoordinates() - already handles touches, but add:
drawingCanvas.addEventListener('touchstart', (e) => {
  e.preventDefault(); // Prevent default touch behavior
}, { passive: false });
```

### 5.3 Better Dropdown Positioning
```css
/* For small screens, flip export dropdown to left */
@media (max-width: 600px) {
  .dropdown-menu {
    right: auto;
    left: 0;
  }
}
```

### 5.4 Header Overflow Scroll
```css
.header-actions {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Hide scrollbar */
}
.header-actions::-webkit-scrollbar {
  display: none;
}
```

---

## 6. Breakpoint Strategy

Only **3 targeted breakpoints** needed beyond the fluid system:

| Breakpoint | Purpose |
|------------|---------|
| **< 600px** | Sidebars become full-width overlays, hide secondary header buttons, simplify timeline, flip dropdowns |
| **< 400px height** (landscape) | Ultra-compact mode: smaller header, minimal controls, hide non-essential UI |
| **> 1400px** | Allow canvas to scale up beyond 900px max, use larger sidebars |

The fluid `clamp()` system handles all intermediate sizes automatically.

---

## 7. Files to Modify

### `www/styles.css` (≈250 lines changed/added)
- Add CSS custom properties for fluid typography
- Replace fixed values with `clamp()` across all components
- Add 3 new media queries
- Add `touch-action` rules
- Fix portrait lock threshold
- Fix dropdown overflow
- Fix modal widths
- Fix onboarding grid

### `www/script.js` (≈80 lines added)
- Add `recalculateLayout()` function
- Add debounced resize listener
- Add orientation change listener
- Integrate layout recalculation into existing functions
- Add touch-action prevention

### `www/index.html` (≈5 lines changed)
- Possibly add a "More" dropdown container for overflow header buttons (optional)

---

## 8. Testing Checklist

### 8.1 Device Emulation (Chrome DevTools)
- [ ] iPhone SE (375x667)
- [ ] iPhone 12/13/14 (390x844)
- [ ] Samsung Galaxy S8+ (360x740)
- [ ] iPad Mini (768x1024)
- [ ] iPad Pro (1024x1366)
- [ ] Desktop 1366x768
- [ ] Desktop 1920x1080
- [ ] Desktop 2560x1440

### 8.2 Functional Testing
- [ ] Drawing with mouse at all screen sizes
- [ ] Drawing with touch at all screen sizes
- [ ] Tool switching (pencil, brush, eraser, bucket, line, rect, circle)
- [ ] Brush size/opacity sliders
- [ ] Color palette selection
- [ ] Undo / Redo
- [ ] Frame navigation (prev/next/first/last)
- [ ] Add / duplicate / delete / reorder frames
- [ ] Playback (play, pause, loop, FPS change)
- [ ] Onion skin toggle and opacity
- [ ] Grid overlay toggle
- [ ] Canvas background color change
- [ ] Aspect ratio change (16:9 ↔ 9:16)
- [ ] Project switching
- [ ] Save / Load to localStorage
- [ ] Export MP4 (16:9 and 9:16)
- [ ] Export GIF
- [ ] All 8 modals open/close correctly
- [ ] Onboarding flow
- [ ] Support modal
- [ ] Theme toggle (dark/light)
- [ ] Keyboard shortcuts

### 8.3 Responsive Testing
- [ ] Header buttons don't overflow
- [ ] Sidebars open/close correctly at all sizes
- [ ] Canvas fills available space without distortion
- [ ] Timeline is usable with many frames
- [ ] Modals are fully visible and scrollable
- [ ] Export dropdown doesn't overflow
- [ ] Portrait lock shows/hides correctly
- [ ] Orientation change recalculates layout
- [ ] Window resize recalculates layout
- [ ] No horizontal scrollbar on any screen size

### 8.4 Bug Regression
- [ ] Flood fill works correctly after resize
- [ ] Shape drawing (line/rect/circle) coordinates accurate
- [ ] Onion skin renders correctly after resize
- [ ] Frame thumbnails update correctly
- [ ] Undo/redo history preserved after resize
- [ ] Export renders at correct resolution regardless of display size

---

## Summary

The application has a solid foundation but lacks dynamic responsiveness. The current single-breakpoint approach is insufficient for the wide range of devices users may have. By implementing:

1. **CSS `clamp()` fluid system** — automatic scaling across all viewports
2. **JS dynamic layout engine** — real-time recalculation on resize/orientation change
3. **Touch improvements** — prevent unwanted scrolling/zooming
4. **3 targeted breakpoints** — handle extreme form factors

...the app will provide a smooth, usable experience on any device from a 320px phone to a 4K monitor, with the canvas always maintaining optimal size for animation work.