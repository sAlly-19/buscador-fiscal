import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const electronMock = vi.hoisted(() => {
  const handlers = new Map<string, (event: unknown, ...args: unknown[]) => Promise<unknown>>();
  const webContents = { mainFrame: {} };
  return {
    handlers,
    webContents,
    ipcMain: {
      removeHandler: vi.fn((channel: string) => handlers.delete(channel)),
      handle: vi.fn((channel: string, handler: (event: unknown, ...args: unknown[]) => Promise<unknown>) => {
        handlers.set(channel, handler);
      }),
    },
    dialog: { showOpenDialog: vi.fn() },
    shell: { showItemInFolder: vi.fn() },
  };
});

vi.mock('electron', () => ({
  BrowserWindow: class {},
  ipcMain: electronMock.ipcMain,
  dialog: electronMock.dialog,
  shell: electronMock.shell,
}));

import { registerDocumentHandlers } from '../../electron/ipc/documentHandlers';
import { ApplicationContext } from '../../electron/services';
import { DatabaseManager } from '../../packages/database/connection';
import { CompanyRepository } from '../../packages/database/repositories/CompanyRepository';
import { DocumentRepository } from '../../packages/database/repositories/DocumentRepository';
import { SettingsRepository } from '../../packages/database/repositories/SettingsRepository';
import { CompanyService } from '../../packages/domain/services/CompanyService';

describe('autorização de documentos pela empresa ativa', () => {
  let db: DatabaseManager;
  let companyRepo: CompanyRepository;
  let docRepo: DocumentRepository;
  let companyService: CompanyService;
  let temporaryFolder: string;

  beforeEach(async () => {
    electronMock.handlers.clear();
    electronMock.shell.showItemInFolder.mockClear();
    db = await DatabaseManager.create(':memory:');
    companyRepo = new CompanyRepository(db);
    docRepo = new DocumentRepository(db);
    companyService = new CompanyService(companyRepo);
    temporaryFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'document-access-'));

    registerDocumentHandlers({
      db,
      companyService,
      docRepo,
      settingsRepo: new SettingsRepository(db),
      reconciliationService: { reconcileCompanyStorage: vi.fn() },
      zipService: { createBatchZip: vi.fn() },
    } as unknown as ApplicationContext, () => ({ webContents: electronMock.webContents }) as never);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(temporaryFolder, { recursive: true, force: true });
  });

  const invoke = (channel: string, ...args: unknown[]) => {
    const handler = electronMock.handlers.get(channel);
    if (!handler) throw new Error(`Handler ${channel} não registrado.`);
    return handler({
      sender: electronMock.webContents,
      senderFrame: electronMock.webContents.mainFrame,
    }, ...args);
  };

  const createDocument = (companyId: number, accessKey: string, xmlPath?: string) => docRepo.upsert({
    company_id: companyId,
    document_type: 'NFE',
    nsu: '1',
    schema_type: 'procNFe',
    access_key: accessKey,
    xml_path: xmlPath,
    xml_status: xmlPath ? 'XML_DISPONIVEL' : 'XML_INDISPONIVEL',
    pdf_status: 'PDF_INDISPONIVEL',
  });

  it('retorna documento da empresa ativa usando referência composta', async () => {
    const active = companyRepo.create({ name: 'Empresa Ativa', cnpj: '41.777.943/0001-02' });
    const document = createDocument(active.id, '35260941777943000102550010000000011000000001');

    const result = await invoke('documents:getById', {
      company_id: active.id,
      document_id: document.id,
    });

    expect(result).toMatchObject({ id: document.id, company_id: active.id });
  });

  it('rejeita referência de documento de empresa inativa', async () => {
    companyRepo.create({ name: 'Empresa Ativa', cnpj: '41.777.943/0001-02' });
    const inactive = companyRepo.create({ name: 'Empresa Inativa', cnpj: '37.305.384/0001-60' });
    const document = createDocument(inactive.id, '35260937305384000160550010000000021000000002');

    await expect(invoke('documents:getById', {
      company_id: inactive.id,
      document_id: document.id,
    })).rejects.toThrow(/empresa ativa/i);
  });

  it('rejeita pesquisa solicitada para empresa diferente da ativa', async () => {
    companyRepo.create({ name: 'Empresa Ativa', cnpj: '41.777.943/0001-02' });
    const inactive = companyRepo.create({ name: 'Empresa Inativa', cnpj: '37.305.384/0001-60' });

    await expect(invoke('documents:search', { company_id: inactive.id })).rejects.toThrow(/empresa ativa/i);
  });

  it('rejeita lote solicitado para empresa diferente da ativa antes de consultar documentos', async () => {
    companyRepo.create({ name: 'Empresa Ativa', cnpj: '41.777.943/0001-02' });
    const inactive = companyRepo.create({ name: 'Empresa Inativa', cnpj: '37.305.384/0001-60' });
    const document = createDocument(inactive.id, '35260937305384000160550010000000021000000002');

    await expect(invoke('documents:downloadBatch', {
      company_id: inactive.id,
      document_ids: [document.id],
      include_xml: true,
      include_pdf: false,
      destination_folder: temporaryFolder,
    })).rejects.toThrow(/empresa ativa/i);
  });

  it('abre somente caminho conhecido da empresa ativa', async () => {
    const active = companyRepo.create({ name: 'Empresa Ativa', cnpj: '41.777.943/0001-02' });
    const xmlPath = path.join(temporaryFolder, 'documento.xml');
    fs.writeFileSync(xmlPath, '<nfe />');
    createDocument(active.id, '35260941777943000102550010000000011000000001', xmlPath);

    const result = await invoke('documents:openFileFolder', {
      company_id: active.id,
      file_path: xmlPath,
    });

    expect(result).toBe(true);
    expect(electronMock.shell.showItemInFolder).toHaveBeenCalledWith(xmlPath);
  });
});
