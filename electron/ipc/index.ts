import { BrowserWindow } from 'electron';
import { ApplicationContext } from '../services';
import { registerCompanyHandlers } from './companyHandlers';
import { registerCertificateHandlers } from './certificateHandlers';
import { registerDocumentHandlers } from './documentHandlers';
import { registerSefazHandlers } from './sefazHandlers';
import { registerSettingsHandlers } from './settingsHandlers';

export function registerAllIpcHandlers(services: ApplicationContext, getMainWindow: () => BrowserWindow | null): void {
  registerCompanyHandlers(services, getMainWindow);
  registerCertificateHandlers(services, getMainWindow);
  registerDocumentHandlers(services, getMainWindow);
  registerSefazHandlers(services, getMainWindow);
  registerSettingsHandlers(services, getMainWindow);
}
