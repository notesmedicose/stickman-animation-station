# 🎨 Stickman Animation Station

**Stickman Animation Station** is a premium, lightweight, and fully client-side frame-by-frame 2D vector animation studio. Designed for simplicity and speed, this app is fully optimized for launching on mobile (Google Play Store) or using directly in web browsers.

## ✨ Features
*   **Vector Drawing Tools**: Built-in Pencil, Brush, Eraser, Flood Fill, Straight Line, Ellipse (Oval/Disc), and Rectangle shape tools.
*   **Onion Skinning**: Visualize adjacent drawings in the background with customizable ghost opacity (defaults to 35%) and range settings (previous frame only or both previous and next).
*   **High-Definition Exports**: Export finished animations in high-fidelity **1080p MP4** (supporting 16:9 Landscape and 9:16 Portrait layouts) or **Animated GIF** formats.
*   **Export Speeds**: Playback and render outputs up to **30 FPS**.
*   **Play Store Ready**:
    *   Responsive orientation locks forcing Landscape mode on mobile viewports.
    *   Simulated Rewarded Ad modal loops gating video exports (with pre-built integration callbacks for Cordova/Capacitor AdMob SDKs).
*   **Auto-Save & Projects**: Local project saving and restoration in browser local storage.

## 🛠️ Tech Stack
*   **Core**: HTML5, Vanilla JavaScript, CSS3
*   **Libraries**: [Gifshot](https://github.com/yahoo/gifshot) (embedded CDN for in-browser GIF compiling)
*   **Canvas Capture**: Native browser MediaRecorder APIs for high-resolution video streams.

## 🚀 Running Locally
Simply clone the repository and open `index.html` in any web browser!
```bash
# Clone the repository
git clone https://github.com/notesmedicose/stickman-animation-station.git

# Open the project
cd stickman-animation-station
start index.html
```

## 📱 Mobile Packaging (Google Play Store)
You can wrap this application easily using Apache Cordova or Capacitor:
1. Initialize Cordova in the directory.
2. Place these source files inside the `www/` folder.
3. Configure target orientation: `<preference name="Orientation" value="landscape" />`.
4. Install `cordova-plugin-admob-plus` or similar and the real rewarded ad SDK handles will bind to the window automatically.
