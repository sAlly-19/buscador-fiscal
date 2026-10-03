import { app, BrowserWindow, dialog, session } from 'electron';
import path from 'path';
import { initializeServices, ApplicationContext } from './services';
import { registerAllIpcHandlers } from './ipc';

let mainWindow: BrowserWindow | null = null;
let services: ApplicationContext | undefined;
let databaseClosed = false;

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'Buscador NF-e / CT-e - Gestor Fiscal Desktop SEFAZ',
    webPreferences: {
      preload: path.join(__dirname, 'preload', 'index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    autoHideMenuBar: true,
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    let allowed = false;
    if (isDev) {
      try {
        const devOrigin = new URL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173').origin;
        allowed = new URL(url).origin === devOrigin;
      } catch {
        allowed = false;
      }
    }
    if (!allowed) event.preventDefault();
  });

  if (isDev) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173');
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.whenReady().then(async () => {
  const dataDir = isDev 
    ? path.resolve(process.cwd(), 'data') 
    : path.join(app.getPath('userData'), 'data');

  services = await initializeServices(dataDir);
  registerAllIpcHandlers(services, () => mainWindow);
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch((error: unknown) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  dialog.showErrorBox('Falha ao iniciar o Buscador Fiscal', message);
  app.quit();
});
}

app.on('before-quit', () => {
  if (!databaseClosed && services) {
    services.db.close();
    databaseClosed = true;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
