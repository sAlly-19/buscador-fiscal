import { sanitizeAccessKey } from './access-key';
import { sanitizeCNPJ } from './cnpj';
import type { Company, DocumentType, FiscalDocument } from './types';

const EVENT_SCHEMA_PATTERN = /Evento/i;
const COMPLETE_SCHEMA_PATTERN = /^(procNFe|procCTe)/i;

function issuerCnpjFromAccessKey(accessKey: string): string | undefined {
  const cleanKey = sanitizeAccessKey(accessKey);
  return cleanKey.length === 44 ? cleanKey.slice(6, 20) : undefined;
}

export function isOwnIssuedNfeEvent(
  documentType: DocumentType,
  schemaType: string,
  accessKey: string,
  companyCnpj: string,
): boolean {
  const issuerCnpj = issuerCnpjFromAccessKey(accessKey);
  return documentType === 'NFE'
    && EVENT_SCHEMA_PATTERN.test(schemaType)
    && issuerCnpj !== undefined
    && issuerCnpj === sanitizeCNPJ(companyCnpj);
}

export function isEventOnlyDocument(document: FiscalDocument): boolean {
  return document.data_level === 'EVENT_ONLY' || EVENT_SCHEMA_PATTERN.test(document.schema_type);
}

export function deriveDocumentPresentation(
  document: FiscalDocument,
  company: Pick<Company, 'name' | 'cnpj'>,
): FiscalDocument {
  const isEvent = EVENT_SCHEMA_PATTERN.test(document.schema_type);
  const issuerCnpj = issuerCnpjFromAccessKey(document.access_key);
  const isOutbound = issuerCnpj !== undefined && issuerCnpj === sanitizeCNPJ(company.cnpj);
  const dataLevel = isEvent
    ? 'EVENT_ONLY'
    : COMPLETE_SCHEMA_PATTERN.test(document.schema_type)
      ? 'COMPLETE'
      : 'SUMMARY';

  const presentation: FiscalDocument = {
    ...document,
    data_level: dataLevel,
    direction: isOutbound ? 'OUTBOUND' : 'INBOUND',
    date_kind: isEvent ? 'EVENT' : 'ISSUE',
  };

  if (!isOwnIssuedNfeEvent(
    document.document_type,
    document.schema_type,
    document.access_key,
    company.cnpj,
  )) {
    return presentation;
  }

  return {
    ...presentation,
    issuer_name: company.name,
    issuer_cnpj: sanitizeCNPJ(company.cnpj),
    total_value: undefined,
    pdf_path: undefined,
    pdf_status: 'PDF_INDISPONIVEL',
  };
}
