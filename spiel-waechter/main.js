// Spiel-Waechter — Electron-Hauptprozess.
// Oeffnet nur ein Fenster mit der lokalen UI. Keine Netzwerk-Zugriffe,
// kein Node im Renderer (contextIsolation an, nodeIntegration aus).
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 920,
    height: 760,
    minWidth: 600,
    minHeight: 560,
    backgroundColor: '#fffbf5',
    title: 'Spiel-Wächter',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.removeMenu();
  win.loadFile(path.join(__dirname, 'index.html'));

  // Externe Links (Hilfe-Hotlines) im System-Browser oeffnen, nicht in der App.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
