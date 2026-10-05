import fs from 'fs';
import path from 'path';
import { BrowserWindow, dialog, shell } from 'electron';
import {
  DocumentDownloadRequest,
  DocumentReference,
  DocumentSearchFilters,
  DocumentStoragePathRequest,
  DocumentType,
  DownloadBatchOptions,
  FiscalDocument,
} from '../../packages/domain/types';
import { ApplicationContext } from '../services';
import { isApprovedFolder, registerSecureHandler, requirePositiveInteger, requireString } from './security';
import { normalizePageSize } from '../../packages/domain/page-size';
import { isOwnIssuedNfeEvent } from '../../packages/domain/document-presentation';

async function resolveDestination(
  requested: unknown,
  title: string,
  configured: string,
  getMainWindow: () => BrowserWindow | null
): Promise<string | null> {
  if (typeof requested === 'string' && isApprovedFolder(requested, configured)) return path.resolve(requested);
  const win = getMainWindow();
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, { title, properties: ['openDirectory', 'createDirectory'] });
  return result.canceled || !result.filePaths[0] ? null : result.filePaths[0];
}

function availableName(folder: string, baseName: string): string {
  const safeBase = path.basename(baseName);
  let candidate = path.join(folder, safeBase);
  const parsed = path.parse(candidate);
  let suffix = 1;
  while (fs.existsSync(candidate)) candidate = path.join(parsed.dir, `${parsed.name} (${suffix++})${parsed.ext}`);
  return candidate;
}

function parseFilters(value: unknown): DocumentSearchFilters {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Filtros de pesquisa inválidos.');
  const raw = value as Partial<DocumentSearchFilters>;
  const companyId = requirePositiveInteger(raw.company_id, 'ID da empresa');
  const documentTypes = raw.document_types?.filter((type): type is DocumentType => type === 'NFE' || type === 'CTE');
  if (raw.document_types && documentTypes?.length !== raw.document_types.length) throw new Error('Tipo de documento inválido.');
  return {
    company_id: companyId,
    document_types: documentTypes,
    start_date: typeof raw.start_date === 'string' ? raw.start_date.slice(0, 10) : undefined,
    end_date: typeof raw.end_date === 'string' ? raw.end_date.slice(0, 10) : undefined,
    search_query: typeof raw.search_query === 'string' ? raw.search_query.slice(0, 200) : undefined,
    access_key: typeof raw.access_key === 'string' ? raw.access_key.slice(0, 100) : undefined,
    document_number: typeof raw.document_number === 'string' ? raw.document_number.slice(0, 50) : undefined,
    series: typeof raw.series === 'string' ? raw.series.slice(0, 20) : undefined,
    issuer_cnpj_or_name: typeof raw.issuer_cnpj_or_name === 'string' ? raw.issuer_cnpj_or_name.slice(0, 200) : undefined,
    xml_status: raw.xml_status === 'XML_DISPONIVEL' || raw.xml_status === 'XML_INDISPONIVEL' ? raw.xml_status : undefined,
    pdf_status: raw.pdf_status === 'PDF_DISPONIVEL' || raw.pdf_status === 'PDF_INDISPONIVEL' ? raw.pdf_status : undefined,
    page: Number.isSafeInteger(raw.page) ? Math.max(1, Number(raw.page)) : 1,
    page_size: normalizePageSize(raw.page_size),
  };
}

function requireActiveCompanyId(services: ApplicationContext, value: unknown): number {
  const companyId = requirePositiveInteger(value, 'ID da empresa');
  const activeCompany = services.companyService.getActive();
  if (!activeCompany || activeCompany.id !== companyId) {
    throw new Error('Operação não autorizada para a empresa ativa.');
  }
  return activeCompany.id;
}

function parseDocumentReference(value: unknown, services: ApplicationContext): DocumentReference {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Referência do documento inválida.');
  }
  const raw = value as Partial<DocumentReference>;
  return {
    company_id: requireActiveCompanyId(services, raw.company_id),
    document_id: requirePositiveInteger(raw.document_id, 'ID do documento'),
  };
}

export function registerDocumentHandlers(services: ApplicationContext, getMainWindow: () => BrowserWindow | null): void {
  registerSecureHandler('documents:search', getMainWindow, (_event, value) => {
    const filters = parseFilters(value);
    filters.company_id = requireActiveCompanyId(services, filters.company_id);
    services.reconciliationService.reconcileCompanyStorage(filters.company_id);
    return services.docRepo.search(filters);
  });
  registerSecureHandler('documents:getById', getMainWindow, (_event, value) => {
    const reference = parseDocumentReference(value, services);
    return services.docRepo.findById(reference.document_id, reference.company_id);
  });

  const downloadSingle = async (value: unknown, format: 'XML' | 'PDF') => {
    const reference = parseDocumentReference(value, services);
    const raw = value as Partial<DocumentDownloadRequest>;
    const doc = services.docRepo.findById(reference.document_id, reference.company_id);
    const company = services.companyService.getById(reference.company_id);
    const isEventOnlyPdf = format === 'PDF' && Boolean(doc && company && isOwnIssuedNfeEvent(
      doc.document_type,
      doc.schema_type,
      doc.access_key,
      company.cnpj,
    ));
    const source = isEventOnlyPdf ? undefined : format === 'XML' ? doc?.xml_path : doc?.pdf_path;
    if (!doc || !source || !fs.existsSync(source)) {
      return { success: false, error: `Arquivo ${format} não está disponível localmente.` };
    }
    const folder = await resolveDestination(raw.destination_folder, `Selecione a Pasta para Salvar o ${format}`,
      services.settingsRepo.getSettings().default_storage_path, getMainWindow);
    if (!folder) return { success: false, error: 'Operação cancelada.' };
    fs.mkdirSync(folder, { recursive: true });
    const target = availableName(folder, `${doc.access_key}.${format.toLowerCase()}`);
    fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
    services.db.execute(
      `INSERT INTO download_history (document_id, download_type, destination_path, success)
       VALUES (?, ?, ?, 1);`, [doc.id, format, target]
    );
    return { success: true, filePath: target };
  };

  registerSecureHandler('documents:downloadXml', getMainWindow, (_event, value) => downloadSingle(value, 'XML'));
  registerSecureHandler('documents:downloadPdf', getMainWindow, (_event, value) => downloadSingle(value, 'PDF'));
  registerSecureHandler('documents:downloadBatch', getMainWindow, async (_event, value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Opções de download inválidas.');
    const raw = value as Partial<DownloadBatchOptions>;
    const companyId = requireActiveCompanyId(services, raw.company_id);
    if (!Array.isArray(raw.document_ids) || raw.document_ids.length === 0 || raw.document_ids.length > 500) {
      throw new Error('Selecione entre 1 e 500 documentos.');
    }
    if (!raw.include_xml && !raw.include_pdf) throw new Error('Selecione XML e/ou PDF para o download.');
    const ids = [...new Set(raw.document_ids.map((id) => requirePositiveInteger(id, 'ID do documento')))];
    const docs = ids.map((id) => services.docRepo.findById(id, companyId)).filter((doc): doc is FiscalDocument => Boolean(doc));
    if (docs.length !== ids.length) throw new Error('Um ou mais documentos não foram encontrados.');
    const destination = await resolveDestination(raw.destination_folder, 'Selecione a Pasta para Salvar o ZIP',
      services.settingsRepo.getSettings().default_storage_path, getMainWindow);
    if (!destination) return { success: false, error: 'Operação cancelada.', copied_files_count: 0 };
    const company = services.companyService.getById(companyId);
    const files = docs.flatMap((doc) => {
      const result = [];
      if (raw.include_xml && doc.xml_path && fs.existsSync(doc.xml_path)) {
        result.push({ sourcePath: doc.xml_path, docType: doc.document_type, accessKey: doc.access_key, format: 'XML' as const });
      }
      const isEventOnly = Boolean(company && isOwnIssuedNfeEvent(
        doc.document_type,
        doc.schema_type,
        doc.access_key,
        company.cnpj,
      ));
      if (raw.include_pdf && !isEventOnly && doc.pdf_path && fs.existsSync(doc.pdf_path)) {
        result.push({ sourcePath: doc.pdf_path, docType: doc.document_type, accessKey: doc.access_key, format: 'PDF' as const });
      }
      return result;
    });
    const zip = await services.zipService.createBatchZip(company?.name || 'Empresa', destination, files);
    services.db.execute(
      `INSERT INTO download_history (document_id, download_type, destination_path, success)
       VALUES (NULL, 'ZIP', ?, 1);`, [zip.zipPath]
    );
    return { success: true, zip_path: zip.zipPath, copied_files_count: zip.filesCount };
  });
  registerSecureHandler('documents:openFileFolder', getMainWindow, (_event, value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const raw = value as Partial<DocumentStoragePathRequest>;
    const companyId = requireActiveCompanyId(services, raw.company_id);
    const filePath = requireString(raw.file_path, 'Caminho do arquivo', 4096);
    if (!services.docRepo.isKnownStoragePath(filePath, companyId) || !fs.existsSync(filePath)) return false;
    shell.showItemInFolder(filePath);
    return true;
  });
}
