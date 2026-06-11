import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { autoUpdater } from 'electron-updater';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// FIX: Disable Hardware Acceleration to prevent "Invisible Cursor" and Rendering Freezes in Windows
app.disableHardwareAcceleration();

let mainWindow;

function createWindow() {
  // 1. COMPLETELY REMOVE NATIVE MENU to stop Alt-key focus stealing
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#1a2a3a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'), // Unified filename after build
      backgroundThrottling: false
    },
    icon: path.join(__dirname, '../dist/favicon.ico'), 
  });

  // 2. HARDEN MENU SETTINGS
  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.setIgnoreMenuShortcuts(true);

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.focus();
  });

  // 3. SELF-HEAL WHEN WINDOW REGAINS FOCUS
  mainWindow.on('focus', () => {
    if (!mainWindow) return;
    mainWindow.setMenuBarVisibility(false);
    mainWindow.webContents.setIgnoreMenuShortcuts(true);
    mainWindow.webContents.focus();
    mainWindow.webContents.send('window-refocused');
  });

  // 4. RECOVER AFTER MINIMIZE/RESTORE
  mainWindow.on('restore', () => {
    if (!mainWindow) return;
    mainWindow.focus();
    mainWindow.webContents.focus();
    mainWindow.webContents.send('window-refocused');
  });

  mainWindow.webContents.on('responsive', () => {
    mainWindow.webContents.focus();
    mainWindow.webContents.send('window-refocused');
  });
}

// 5. GLOBAL APP FOCUS LOCK
app.on('browser-window-focus', (_event, win) => {
  if (!win) return;
  win.setMenuBarVisibility(false);
  win.webContents.setIgnoreMenuShortcuts(true);
  win.webContents.focus();
});

// --- AUTO UPDATER LOGIC ---
autoUpdater.autoDownload = false;

autoUpdater.on('update-available', (info) => {
  mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', () => {
  mainWindow.webContents.send('update-not-available');
});

autoUpdater.on('download-progress', (progress) => {
  mainWindow.webContents.send('download-progress', progress);
});

autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update-downloaded');
});

autoUpdater.on('error', (err) => {
  mainWindow.webContents.send('update-error', err.message);
});

ipcMain.on('check-for-updates', () => {
  autoUpdater.checkForUpdates();
});

ipcMain.on('download-update', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
});
// -------------------------

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
