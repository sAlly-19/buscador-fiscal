import { BrowserWindow } from 'electron';
import { DocumentType } from '../../packages/domain/types';
import { ApplicationContext } from '../services';
import { registerSecureHandler, requirePositiveInteger } from './security';

function parseDocumentType(value: unknown): DocumentType {
  if (value !== 'NFE' && value !== 'CTE') throw new Error('Tipo de documento inválido.');
  return value;
}

export function registerSefazHandlers(services: ApplicationContext, getMainWindow: () => BrowserWindow | null): void {
  const consult = (docType: DocumentType, rawId: unknown) => {
    const companyId = requirePositiveInteger(rawId, 'ID da empresa');
    return services.distributionEngine.syncCompany(companyId, docType, (progress) => {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) win.webContents.send('sefaz:progress', { companyId, documentType: docType, ...progress });
    });
  };

  registerSecureHandler('sefaz:consultNFe', getMainWindow, (_event, id) => consult('NFE', id));
  registerSecureHandler('sefaz:consultCTe', getMainWindow, (_event, id) => consult('CTE', id));
  registerSecureHandler('sefaz:getStatus', getMainWindow, (_event, id) => {
    const companyId = requirePositiveInteger(id, 'ID da empresa');
    if (!services.companyService.getById(companyId)) throw new Error('Empresa não encontrada.');
    const environment = services.settingsRepo.getSettings().sefaz_environment;
    const nfe = services.distStateRepo.getOrCreate(companyId, 'NFE', environment);
    const cte = services.distStateRepo.getOrCreate(companyId, 'CTE', environment);
    return {
      nfeLastNSU: nfe.last_nsu,
      cteLastNSU: cte.last_nsu,
      isRunning: nfe.status === 'RUNNING' || cte.status === 'RUNNING',
      environment,
    };
  });
  registerSecureHandler('sefaz:cancelQuery', getMainWindow, (_event, id, rawType) => {
    const companyId = requirePositiveInteger(id, 'ID da empresa');
    const docType = rawType === undefined ? undefined : parseDocumentType(rawType);
    services.distributionEngine.cancel(companyId, docType);
    return true;
  });
  registerSecureHandler('sefaz:resetNSU', getMainWindow, (_event, id, rawType) => {
    services.distributionEngine.resetNSU(requirePositiveInteger(id, 'ID da empresa'), parseDocumentType(rawType));
    return true;
  });
}
