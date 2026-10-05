import { 
  Company, 
  CreateCompanyDTO, 
  UpdateCompanyDTO, 
  CertificateInfo, 
  FiscalDocument, 
  DocumentDownloadRequest,
  DocumentReference,
  DocumentSearchFilters, 
  DocumentStoragePathRequest,
  PaginatedResult, 
  AppSettings, 
  CombinedSefazQueryResult,
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
    getById: (request: DocumentReference) => Promise<FiscalDocument | null>;
    downloadXml: (request: DocumentDownloadRequest) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    downloadPdf: (request: DocumentDownloadRequest) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    downloadBatch: (options: DownloadBatchOptions) => Promise<DownloadBatchResult>;
    openFileFolder: (request: DocumentStoragePathRequest) => Promise<boolean>;
  };
  sefaz: {
    consultDocuments: (companyId: number) => Promise<CombinedSefazQueryResult>;
    getStatus: (companyId: number) => Promise<{ nfeLastNSU: string; cteLastNSU: string; isRunning: boolean }>;
    cancelQuery: (companyId: number, docType?: 'NFE' | 'CTE') => Promise<boolean>;
    resetNSU: (companyId: number, docType: 'NFE' | 'CTE') => Promise<boolean>;
    onProgress: (callback: (data: { companyId: number; documentType: 'NFE' | 'CTE'; message: string; currentNSU?: string; count?: number }) => void) => () => void;
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
