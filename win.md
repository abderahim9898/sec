# Windows packaging guide (EXE)

This project is a Vite-based React SPA with an optional Node server build. Below are three proven ways to ship a Windows .exe installer.

## Option A — Electron (recommended for desktop UX)

Prerequisites:
- Node.js 18+
- Git

1) Install tooling

npm i -D electron electron-builder concurrently wait-on

2) Build the web app

npm run build

3) Create Electron entry (electron/main.js)

const { app, BrowserWindow } = require('electron');
const path = require('path');
function createWindow() {
  const win = new BrowserWindow({ width: 1200, height: 800 });
  // Load local build output
  win.loadFile(path.join(__dirname, '../dist/index.html'));
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

4) Add package.json fields

{
  "main": "electron/main.js",
  "build": {
    "appId": "com.yourcompany.aromaherbes",
    "productName": "AromaHerbes",
    "directories": { "buildResources": "build" },
    "files": [
      "dist/**",
      "electron/**"
    ],
    "win": { "target": ["nsis"], "icon": "build/icon.ico" },
    "nsis": { "oneClick": true }
  },
  "scripts": {
    "electron:dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "npm run build && electron-builder -w"
  }
}

5) Build Windows installer

npm run electron:build

Output: dist/AromaHerbes Setup x.y.z.exe (NSIS installer) and a portable .exe.

Notes:
- If you prefer loading a remote URL (hosted app), replace loadFile with win.loadURL('https://your-domain').
- Firebase works normally inside Electron (uses the network).

## Option B — Tauri (small EXE size)

Prerequisites:
- Rust toolchain (rustup)
- Microsoft C++ Build Tools / VS Build Tools

1) Install CLI

npm i -D @tauri-apps/cli

2) Initialize Tauri

npx tauri init
- When prompted, set distDir to: dist
- Dev path: http://localhost:5173

3) Build web, then package

npm run build
npx tauri build

Output: src-tauri/target/release/bundle/msi/*.msi and *.exe.

## Option C — Package the Node server with pkg (serves SPA)

This repo already has a pkg config stub. This produces a single Windows .exe that runs a local server and serves the built SPA.

Prerequisites:
- Node.js 18+

1) Install pkg

npm i -D pkg

2) Build client and server

npm run build:client
npm run build:server

3) Package

npx pkg dist/server/node-build.mjs --targets node18-win-x64 --output AromaHerbes.exe

Run AromaHerbes.exe (it will start the server). Open the printed URL in your browser.

Notes:
- If pkg complains about ESM, create a small launcher file (launcher.cjs) that requires the built server, and package that instead.
- This option is headless (runs in browser). Use Electron/Tauri for a native window and installer.

## Choosing an option
- Need native window + installer + auto-update: Electron
- Need smallest footprint: Tauri
- Just a single binary to host the SPA locally: pkg

## Common tips
- Code signing (optional) improves SmartScreen trust.
- For auto-update, prefer Electron (electron-updater) or Tauri updater.
- Ensure Firebase domains are reachable on target machines (firewalls/proxies).
