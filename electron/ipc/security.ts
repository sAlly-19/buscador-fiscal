import path from 'path';
import { BrowserWindow, IpcMainInvokeEvent, ipcMain } from 'electron';

type WindowGetter = () => BrowserWindow | null;
const approvedFolders = new Set<string>();

export function registerSecureHandler(
  channel: string,
  getMainWindow: WindowGetter,
  handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown
): void {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, async (event, ...args) => {
    const win = getMainWindow();
    if (!win || event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame) {
      throw new Error('Origem IPC não autorizada.');
    }
    return handler(event, ...args);
  });
}

export function requirePositiveInteger(value: unknown, label = 'identificador'): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) throw new Error(`${label} inválido.`);
  return Number(value);
}

export function requireString(value: unknown, label: string, maxLength = 500): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) throw new Error(`${label} inválido.`);
  return value.trim();
}

export function approveFolder(folder: string): string {
  const resolved = path.resolve(folder);
  approvedFolders.add(resolved.toLowerCase());
  return resolved;
}

export function isApprovedFolder(folder: string, configuredFolder?: string): boolean {
  if (!path.isAbsolute(folder)) return false;
  const resolved = path.resolve(folder).toLowerCase();
  const configured = configuredFolder?.trim() ? path.resolve(configuredFolder).toLowerCase() : '';
  return approvedFolders.has(resolved) || Boolean(configured && configured === resolved);
}
