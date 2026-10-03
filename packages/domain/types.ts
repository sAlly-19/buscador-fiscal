export type DocumentType = 'NFE' | 'CTE';

export type SefazEnvironment = 'homologation' | 'production';

export type FiscalDocumentStatus = 'AUTORIZADA' | 'CANCELADA' | 'DENEGADA';

export type StorageStatus = 
  | 'RECEBIDO' 
  | 'ARMAZENADO' 
  | 'XML_DISPONIVEL' 
  | 'PDF_DISPONIVEL' 
  | 'XML_INDISPONIVEL' 
  | 'PDF_INDISPONIVEL' 
  | 'ERRO';

export interface Company {
  id: number;
  name: string;
  cnpj: string; // apenas dígitos (14 chars)
  folder_path?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCompanyDTO {
  name: string;
  cnpj: string;
  folder_path?: string;
}

export interface UpdateCompanyDTO {
  id: number;
  name?: string;
  cnpj?: string;
  folder_path?: string;
}

export interface CertificateInfo {
  id?: number;
  company_id?: number;
  subject: string;
  issuer: string;
  serial_number: string;
  thumbprint: string;
  valid_from: string;
  valid_to: string;
  provider: 'windows_store' | 'mock' | 'file';
  has_private_key: boolean;
  is_expired: boolean;
  extracted_cnpj?: string;
  extracted_cpf?: string;
}

export interface DistributionState {
  id: number;
  company_id: number;
  document_type: DocumentType;
  last_nsu: string; // 15 dígitos
  max_nsu: string;  // 15 dígitos
  last_query_at?: string;
  status: 'IDLE' | 'RUNNING' | 'RATE_LIMITED' | 'ERROR';
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export interface FiscalDocument {
  id: number;
  company_id: number;
  document_type: DocumentType;
  nsu: string;
  schema_type: string; // resNFe, procNFe, resCTe, procCTe, etc.
  access_key: string;  // 44 dígitos
  document_number?: string;
  series?: string;
  issue_date?: string;
  received_at: string;
  issuer_cnpj?: string;
  issuer_name?: string;
  recipient_cnpj?: string;
  recipient_name?: string;
  total_value?: number;
  xml_path?: string;
  pdf_path?: string;
  xml_status: 'XML_DISPONIVEL' | 'XML_INDISPONIVEL';
  pdf_status: 'PDF_DISPONIVEL' | 'PDF_INDISPONIVEL';
  situacao_fiscal?: FiscalDocumentStatus;
  created_at: string;
  updated_at: string;
}

export interface DocumentSearchFilters {
  company_id: number;
  document_types?: DocumentType[];
  start_date?: string;
  end_date?: string;
  access_key?: string;
  document_number?: string;
  series?: string;
  issuer_cnpj_or_name?: string;
  xml_status?: string;
  pdf_status?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AppSettings {
  default_storage_path: string;
  sefaz_environment: SefazEnvironment;
  items_per_page: number;
  log_level: 'info' | 'warn' | 'error' | 'debug';
}

export interface SefazQueryResult {
  success: boolean;
  cStat: number;
  xMotivo: string;
  ultNSU: string;
  maxNSU: string;
  documentsCount: number;
  isComplete: boolean;
  rateLimitedUntil?: string;
  error?: string;
}

export interface DownloadBatchOptions {
  document_ids: number[];
  include_xml: boolean;
  include_pdf: boolean;
  destination_folder: string;
}

export interface DownloadBatchResult {
  success: boolean;
  zip_path?: string;
  copied_files_count: number;
  error?: string;
}
