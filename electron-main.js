const { app, BrowserWindow, ipcMain, shell, screen } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

// Start embedded Express server
require('./index');

const SERVER_PORT = process.env.PORT || 3000;
const OVERLAY_W = 380;
const OVERLAY_H = 230;

let mainWin;
let overlayWin;

function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 1240,
    height: 860,
    webPreferences: {
      preload: path.join(__dirname, 'public', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'AI 생산성 작업 관리자',
    backgroundColor: '#ffffff',
  });

  // Retry until Express is ready
  function tryLoad(attempts = 0) {
    mainWin.loadURL(`http://localhost:${SERVER_PORT}`).catch(() => {
      if (attempts < 15) setTimeout(() => tryLoad(attempts + 1), 400);
    });
  }
  tryLoad();
}

function createOverlayWindow() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  overlayWin = new BrowserWindow({
    width: OVERLAY_W,
    height: OVERLAY_H,
    x: width - OVERLAY_W - 20,
    y: 20,
    alwaysOnTop: true,
    transparent: true,
    frame: false,
    resizable: false,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'public', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: '작업 패널',
  });
  overlayWin.loadFile(path.join(__dirname, 'public', 'overlay.html'));
}

app.whenReady().then(() => {
  setTimeout(() => {
    createMainWindow();
    createOverlayWindow();
  }, 800);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      createOverlayWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Main window → overlay: task state update
ipcMain.on('tasks-updated', (event, data) => {
  if (overlayWin && !overlayWin.isDestroyed()) {
    overlayWin.webContents.send('tasks-updated', data);
  }
});

// Overlay → main window: user marked a task done
ipcMain.on('task-complete', (event, data) => {
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send('task-complete', data);
  }
});

// Launch app/URL natively (replaces local_launcher.js on port 4321)
ipcMain.handle('launch-command', async (_event, { command, type }) => {
  try {
    const isUrl = /^https?:\/\//i.test(command);
    if (isUrl || type === 'browser') {
      const url = isUrl ? command : `https://www.google.com/search?q=${encodeURIComponent(command)}`;
      await shell.openExternal(url);
    } else {
      spawn(command, [], { detached: true, shell: true, stdio: 'ignore' }).unref();
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
