import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { 
  CreateCompanyDTO, 
  UpdateCompanyDTO, 
  DocumentSearchFilters, 
  AppSettings, 
  DownloadBatchOptions 
} from '../../packages/domain/types';

contextBridge.exposeInMainWorld('fiscalApi', {
  companies: {
    list: () => ipcRenderer.invoke('companies:list'),
    create: (dto: CreateCompanyDTO) => ipcRenderer.invoke('companies:create', dto),
    update: (dto: UpdateCompanyDTO) => ipcRenderer.invoke('companies:update', dto),
    delete: (id: number) => ipcRenderer.invoke('companies:delete', id),
    selectActive: (id: number) => ipcRenderer.invoke('companies:selectActive', id),
    getActive: () => ipcRenderer.invoke('companies:getActive'),
  },
  certificates: {
    listAvailable: () => ipcRenderer.invoke('certificates:listAvailable'),
    getForCompany: (companyId: number) => ipcRenderer.invoke('certificates:getForCompany', companyId),
    associateToCompany: (companyId: number, thumbprint: string) => 
      ipcRenderer.invoke('certificates:associateToCompany', companyId, thumbprint),
  },
  documents: {
    search: (filters: DocumentSearchFilters) => ipcRenderer.invoke('documents:search', filters),
    getById: (id: number) => ipcRenderer.invoke('documents:getById', id),
    downloadXml: (id: number, destFolder?: string) => 
      ipcRenderer.invoke('documents:downloadXml', id, destFolder),
    downloadPdf: (id: number, destFolder?: string) => 
      ipcRenderer.invoke('documents:downloadPdf', id, destFolder),
    downloadBatch: (options: DownloadBatchOptions) => 
      ipcRenderer.invoke('documents:downloadBatch', options),
    openFileFolder: (filePath: string) => 
      ipcRenderer.invoke('documents:openFileFolder', filePath),
  },
  sefaz: {
    consultNFe: (companyId: number) => ipcRenderer.invoke('sefaz:consultNFe', companyId),
    consultCTe: (companyId: number) => ipcRenderer.invoke('sefaz:consultCTe', companyId),
    getStatus: (companyId: number) => ipcRenderer.invoke('sefaz:getStatus', companyId),
    cancelQuery: (companyId: number, docType?: 'NFE' | 'CTE') => ipcRenderer.invoke('sefaz:cancelQuery', companyId, docType),
    resetNSU: (companyId: number, docType: 'NFE' | 'CTE') => ipcRenderer.invoke('sefaz:resetNSU', companyId, docType),
    onProgress: (callback: (data: { companyId: number; message: string; currentNSU?: string; count?: number }) => void) => {
      const subscription = (_event: IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('sefaz:progress', subscription);
      return () => {
        ipcRenderer.removeListener('sefaz:progress', subscription);
      };
    },
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings: Partial<AppSettings>) => ipcRenderer.invoke('settings:update', settings),
    selectFolder: (title?: string) => ipcRenderer.invoke('settings:selectFolder', title),
  },
});
