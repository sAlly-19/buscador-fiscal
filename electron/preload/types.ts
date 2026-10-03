import { 
  Company, 
  CreateCompanyDTO, 
  UpdateCompanyDTO, 
  CertificateInfo, 
  FiscalDocument, 
  DocumentSearchFilters, 
  PaginatedResult, 
  AppSettings, 
  SefazQueryResult, 
  DownloadBatchOptions, 
  DownloadBatchResult 
} from '../../packages/domain/types';

export interface FiscalDesktopAPI {
  companies: {
    list: () => Promise<Company[]>;
    create: (dto: CreateCompanyDTO) => Promise<Company>;
    update: (dto: UpdateCompanyDTO) => Promise<Company>;
    delete: (id: number) => Promise<boolean>;
    selectActive: (id: number) => Promise<Company | null>;
    getActive: () => Promise<Company | null>;
  };
  certificates: {
    listAvailable: () => Promise<CertificateInfo[]>;
    getForCompany: (companyId: number) => Promise<CertificateInfo | null>;
    associateToCompany: (companyId: number, thumbprint: string) => Promise<boolean>;
  };
  documents: {
    search: (filters: DocumentSearchFilters) => Promise<PaginatedResult<FiscalDocument>>;
    getById: (id: number) => Promise<FiscalDocument | null>;
    downloadXml: (id: number, destFolder?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    downloadPdf: (id: number, destFolder?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    downloadBatch: (options: DownloadBatchOptions) => Promise<DownloadBatchResult>;
    openFileFolder: (filePath: string) => Promise<boolean>;
  };
  sefaz: {
    consultNFe: (companyId: number) => Promise<SefazQueryResult>;
    consultCTe: (companyId: number) => Promise<SefazQueryResult>;
    getStatus: (companyId: number) => Promise<{ nfeLastNSU: string; cteLastNSU: string; isRunning: boolean }>;
    cancelQuery: (companyId: number) => Promise<boolean>;
    onProgress: (callback: (data: { companyId: number; message: string; currentNSU?: string; count?: number }) => void) => () => void;
  };
  settings: {
    get: () => Promise<AppSettings>;
    update: (settings: Partial<AppSettings>) => Promise<AppSettings>;
    selectFolder: (title?: string) => Promise<string | null>;
  };
}

declare global {
  interface Window {
    fiscalApi: FiscalDesktopAPI;
  }
}
