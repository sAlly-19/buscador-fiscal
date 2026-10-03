export interface DocZipItem {
  nsu: string;
  schema: string;
  xmlContent: string;
}

export interface SefazRawResponse {
  tpAmb: string;
  verAplic: string;
  cStat: number;
  xMotivo: string;
  dhResp: string;
  ultNSU: string;
  maxNSU: string;
  docs: DocZipItem[];
}

export interface ParsedFiscalDocumentInfo {
  document_type: 'NFE' | 'CTE';
  nsu: string;
  schema_type: string;
  access_key: string;
  document_number?: string;
  series?: string;
  issue_date?: string;
  issuer_cnpj?: string;
  issuer_name?: string;
  recipient_cnpj?: string;
  recipient_name?: string;
  total_value?: number;
  xml_status: 'XML_DISPONIVEL' | 'XML_INDISPONIVEL';
  pdf_status: 'PDF_DISPONIVEL' | 'PDF_INDISPONIVEL';
  situacao_fiscal?: 'AUTORIZADA' | 'CANCELADA' | 'DENEGADA';
  rawXml: string;
}
