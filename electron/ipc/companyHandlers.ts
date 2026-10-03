import { BrowserWindow } from 'electron';
import { ApplicationContext } from '../services';
import { CreateCompanyDTO, UpdateCompanyDTO } from '../../packages/domain/types';
import { isApprovedFolder, registerSecureHandler, requirePositiveInteger } from './security';

export function registerCompanyHandlers(services: ApplicationContext, getMainWindow: () => BrowserWindow | null): void {
  registerSecureHandler('companies:list', getMainWindow, () => services.companyService.list());
  registerSecureHandler('companies:getActive', getMainWindow, () => services.companyService.getActive());
  registerSecureHandler('companies:create', getMainWindow, (_event, value) => {
    if (!value || typeof value !== 'object') throw new Error('Dados da empresa inválidos.');
    const dto = value as Partial<CreateCompanyDTO>;
    if (dto.folder_path && !isApprovedFolder(dto.folder_path)) throw new Error('Selecione a pasta da empresa pelo botão “Escolher”.');
    return services.companyService.create({
      name: typeof dto.name === 'string' ? dto.name : '',
      cnpj: typeof dto.cnpj === 'string' ? dto.cnpj : '',
      uf: typeof dto.uf === 'string' ? dto.uf : undefined,
      folder_path: typeof dto.folder_path === 'string' ? dto.folder_path : undefined,
    });
  });
  registerSecureHandler('companies:update', getMainWindow, (_event, value) => {
    if (!value || typeof value !== 'object') throw new Error('Dados da empresa inválidos.');
    const dto = value as Partial<UpdateCompanyDTO>;
    const companyId = requirePositiveInteger(dto.id, 'ID da empresa');
    const existing = services.companyService.getById(companyId);
    if (!existing) throw new Error('Empresa não encontrada.');
    if (dto.folder_path && !isApprovedFolder(dto.folder_path, existing.folder_path)) {
      throw new Error('Selecione a pasta da empresa pelo botão “Escolher”.');
    }
    return services.companyService.update({
      id: companyId,
      name: typeof dto.name === 'string' ? dto.name : undefined,
      cnpj: typeof dto.cnpj === 'string' ? dto.cnpj : undefined,
      uf: typeof dto.uf === 'string' ? dto.uf : undefined,
      folder_path: typeof dto.folder_path === 'string' ? dto.folder_path : undefined,
    });
  });
  registerSecureHandler('companies:delete', getMainWindow, (_event, id) =>
    services.companyService.delete(requirePositiveInteger(id, 'ID da empresa')));
  registerSecureHandler('companies:selectActive', getMainWindow, (_event, id) => {
    const companyId = requirePositiveInteger(id, 'ID da empresa');
    const selected = services.companyService.selectActive(companyId);
    if (!selected) throw new Error('Empresa não encontrada.');
    return selected;
  });
}
