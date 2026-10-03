import fs from 'fs';
import { BrowserWindow, dialog } from 'electron';
import { AppSettings } from '../../packages/domain/types';
import { ApplicationContext } from '../services';
import { approveFolder, isApprovedFolder, registerSecureHandler } from './security';

export function registerSettingsHandlers(services: ApplicationContext, getMainWindow: () => BrowserWindow | null): void {
  registerSecureHandler('settings:get', getMainWindow, () => services.settingsRepo.getSettings());
  registerSecureHandler('settings:update', getMainWindow, (_event, value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Configurações inválidas.');
    const settings = value as Partial<AppSettings>;
    if (settings.default_storage_path?.trim()) {
      const currentPath = services.settingsRepo.getSettings().default_storage_path;
      if (!isApprovedFolder(settings.default_storage_path, currentPath)) {
        throw new Error('Selecione a pasta pelo botão “Escolher”.');
      }
      fs.mkdirSync(settings.default_storage_path, { recursive: true });
      settings.default_storage_path = approveFolder(settings.default_storage_path);
    }
    return services.settingsRepo.updateSettings(settings);
  });
  registerSecureHandler('settings:selectFolder', getMainWindow, async (_event, value) => {
    const win = getMainWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      title: typeof value === 'string' && value.length <= 120 ? value : 'Selecione a Pasta de Destino',
      properties: ['openDirectory', 'createDirectory'],
    });
    return result.canceled || !result.filePaths[0] ? null : approveFolder(result.filePaths[0]);
  });
}
