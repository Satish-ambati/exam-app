const { app, BrowserWindow, BrowserView, ipcMain, globalShortcut, powerSaveBlocker } = require('electron');
const path = require('path');

let mainWindow;
let examBarWin;
let examView;
let powerSaveId;
let isExamMode = false;
let currentExamURL = '';
let focusLock = false; // prevent focus fight loop

const EXAM_BAR_HEIGHT = 48;

// ─── MAIN WINDOW ──────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    movable: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    closable: false,
    show: false,
    backgroundColor: '#08060E',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      devTools: false,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.on('devtools-opened', () => {
    mainWindow.webContents.closeDevTools();
  });

  // Only refocus once — prevent the blur/focus fight that causes blinking
  mainWindow.on('blur', () => {
    if (!isExamMode || focusLock) return;
    focusLock = true;
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.focus();
      focusLock = false;
    }, 150);
  });

  mainWindow.on('minimize', () => {
    if (isExamMode) mainWindow.restore();
  });

  mainWindow.on('leave-full-screen', () => {
    if (isExamMode) mainWindow.setFullScreen(true);
  });

  mainWindow.on('resize', () => {
    if (isExamMode) {
      resizeExamView();
      repositionExamBar();
    }
  });

  powerSaveId = powerSaveBlocker.start('prevent-display-sleep');
}

// ─── EXAM BAR WINDOW ──────────────────────────────────────────────────────────
function createExamBar(url) {
  const bounds = mainWindow.getBounds();

  examBarWin = new BrowserWindow({
    width: bounds.width,
    height: EXAM_BAR_HEIGHT,
    x: bounds.x,
    y: bounds.y,
    frame: false,
    transparent: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    skipTaskbar: true,        // ← NOT in taskbar, stops blinking
    alwaysOnTop: true,
    focusable: true,
    show: false,
    backgroundColor: '#08060E',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      devTools: false,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      spellcheck: false
    }
  });

  examBarWin.loadFile('exambar.html');
  examBarWin.once('ready-to-show', () => {
    examBarWin.showInactive();          // ← show WITHOUT stealing focus
    examBarWin.setAlwaysOnTop(true, 'screen-saver', 2);
    examBarWin.webContents.send('set-url', url);
  });

  examBarWin.webContents.on('devtools-opened', () => {
    examBarWin.webContents.closeDevTools();
  });

  // examBarWin blur: do NOT fight back for focus — main window handles it
  // This stops the two-window blink loop entirely
}

function repositionExamBar() {
  if (!examBarWin || examBarWin.isDestroyed()) return;
  const bounds = mainWindow.getBounds();
  examBarWin.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width, height: EXAM_BAR_HEIGHT });
}

function resizeExamView() {
  if (!examView || !mainWindow) return;
  const bounds = mainWindow.getBounds();
  examView.setBounds({
    x: 0,
    y: EXAM_BAR_HEIGHT,
    width: bounds.width,
    height: bounds.height - EXAM_BAR_HEIGHT
  });
}

// ─── APP READY ────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  const blocked = [
    'Alt+Tab', 'Alt+Shift+Tab', 'Alt+Escape',
    'Ctrl+Tab', 'Ctrl+Shift+Tab',
    'Super+D', 'Meta+D', 'Super+L', 'Meta+L',
    'Super+Tab', 'Meta+Tab', 'Super+E', 'Meta+E',
    'Super+R', 'Meta+R', 'Super+M', 'Meta+M',
    'Alt+F4', 'Ctrl+W', 'Ctrl+Q',
    'Ctrl+N', 'Ctrl+T',
    'Ctrl+Shift+I', 'Ctrl+Shift+J', 'Ctrl+Shift+C', 'F12',
    'Ctrl+R', 'F5', 'F11',
    'PrintScreen', 'Alt+PrintScreen',
    'Ctrl+L', 'Ctrl+U', 'Ctrl+P', 'Ctrl+S',
    'Ctrl+C', 'Ctrl+V', 'Ctrl+X', 'Ctrl+Z', 'Ctrl+A',
    'F1','F2','F3','F4','F6','F7','F8','F9','F10',
  ];
  blocked.forEach(s => { try { globalShortcut.register(s, () => {}); } catch(e) {} });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC ──────────────────────────────────────────────────────────────────────

ipcMain.on('minimize-app', () => {
  if (!isExamMode && mainWindow) mainWindow.minimize();
});

ipcMain.on('load-url', (event, url) => {
  isExamMode = true;
  currentExamURL = url;

  mainWindow.setKiosk(true);
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  mainWindow.focus();

  examView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
      spellcheck: false
    }
  });
  mainWindow.addBrowserView(examView);
  resizeExamView();
  examView.webContents.loadURL(url);
  examView.webContents.on('devtools-opened', () => examView.webContents.closeDevTools());

  createExamBar(url);
});

// Reload exam URL without closing
ipcMain.on('reload-exam', () => {
  if (examView && !examView.webContents.isDestroyed()) {
    examView.webContents.loadURL(currentExamURL);
  }
});

// Password-protected quit
ipcMain.on('quit-app', (event, password) => {
  if (password === 'admin@exam2024') {
    if (powerSaveId !== undefined) {
      try { powerSaveBlocker.stop(powerSaveId); } catch(e) {}
    }
    globalShortcut.unregisterAll();
    app.exit(0);
  } else {
    event.reply('quit-result', { success: false });
  }
});