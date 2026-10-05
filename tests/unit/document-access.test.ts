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
  let createBatchZip: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    electronMock.handlers.clear();
    electronMock.dialog.showOpenDialog.mockReset();
    electronMock.shell.showItemInFolder.mockClear();
    db = await DatabaseManager.create(':memory:');
    companyRepo = new CompanyRepository(db);
    docRepo = new DocumentRepository(db);
    companyService = new CompanyService(companyRepo);
    temporaryFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'document-access-'));
    const settingsRepo = new SettingsRepository(db);
    settingsRepo.updateSettings({ default_storage_path: temporaryFolder });
    createBatchZip = vi.fn(async (_companyName: string, destination: string, files: unknown[]) => ({
      zipPath: path.join(destination, 'documentos.zip'),
      filesCount: files.length,
    }));

    registerDocumentHandlers({
      db,
      companyService,
      docRepo,
      settingsRepo,
      reconciliationService: { reconcileCompanyStorage: vi.fn() },
      zipService: { createBatchZip },
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

  const createDocument = (companyId: number, accessKey: string, xmlPath?: string, pdfPath?: string) => docRepo.upsert({
    company_id: companyId,
    document_type: 'NFE',
    nsu: '1',
    schema_type: 'procNFe',
    access_key: accessKey,
    xml_path: xmlPath,
    pdf_path: pdfPath,
    xml_status: xmlPath ? 'XML_DISPONIVEL' : 'XML_INDISPONIVEL',
    pdf_status: pdfPath ? 'PDF_DISPONIVEL' : 'PDF_INDISPONIVEL',
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

  it('trata ID estrangeiro como documento inexistente para a empresa ativa', async () => {
    const active = companyRepo.create({ name: 'Empresa Ativa', cnpj: '41.777.943/0001-02' });
    const inactive = companyRepo.create({ name: 'Empresa Inativa', cnpj: '37.305.384/0001-60' });
    const foreignDocument = createDocument(inactive.id, '35260937305384000160550010000000021000000002');

    const foreignResult = await invoke('documents:getById', {
      company_id: active.id,
      document_id: foreignDocument.id,
    });
    const missingResult = await invoke('documents:getById', {
      company_id: active.id,
      document_id: 999999,
    });

    expect(foreignResult).toBeNull();
    expect(foreignResult).toEqual(missingResult);
  });

  it('rejeita requisição obsoleta depois da troca de empresa ativa', async () => {
    const first = companyRepo.create({ name: 'Primeira Empresa', cnpj: '41.777.943/0001-02' });
    const second = companyRepo.create({ name: 'Segunda Empresa', cnpj: '37.305.384/0001-60' });
    const document = createDocument(first.id, '35260941777943000102550010000000011000000001');
    companyRepo.setActive(second.id);

    await expect(invoke('documents:getById', {
      company_id: first.id,
      document_id: document.id,
    })).rejects.toThrow(/empresa ativa/i);
  });

  it('rejeita pesquisa solicitada para empresa diferente da ativa', async () => {
    companyRepo.create({ name: 'Empresa Ativa', cnpj: '41.777.943/0001-02' });
    const inactive = companyRepo.create({ name: 'Empresa Inativa', cnpj: '37.305.384/0001-60' });

    await expect(invoke('documents:search', { company_id: inactive.id })).rejects.toThrow(/empresa ativa/i);
  });

  it('preserva tamanhos de pagina suportados no limite IPC e normaliza os demais', async () => {
    const active = companyRepo.create({ name: 'Empresa Ativa', cnpj: '41.777.943/0001-02' });

    for (const pageSize of [500, 1000]) {
      const result = await invoke('documents:search', {
        company_id: active.id,
        page_size: pageSize,
      }) as { page_size: number };
      expect(result.page_size).toBe(pageSize);
    }

    const invalid = await invoke('documents:search', {
      company_id: active.id,
      page_size: 25,
    }) as { page_size: number };
    expect(invalid.page_size).toBe(50);
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

  it('rejeita lote misto antes de selecionar destino ou criar ZIP', async () => {
    const active = companyRepo.create({ name: 'Empresa Ativa', cnpj: '41.777.943/0001-02' });
    const inactive = companyRepo.create({ name: 'Empresa Inativa', cnpj: '37.305.384/0001-60' });
    const activeXml = path.join(temporaryFolder, 'ativo.xml');
    const foreignXml = path.join(temporaryFolder, 'estrangeiro.xml');
    fs.writeFileSync(activeXml, '<nfe />');
    fs.writeFileSync(foreignXml, '<nfe />');
    const activeDocument = createDocument(active.id, '35260941777943000102550010000000011000000001', activeXml);
    const foreignDocument = createDocument(inactive.id, '35260937305384000160550010000000021000000002', foreignXml);

    await expect(invoke('documents:downloadBatch', {
      company_id: active.id,
      document_ids: [activeDocument.id, foreignDocument.id],
      include_xml: true,
      include_pdf: false,
      destination_folder: temporaryFolder,
    })).rejects.toThrow(/não foram encontrados/i);

    expect(electronMock.dialog.showOpenDialog).not.toHaveBeenCalled();
    expect(createBatchZip).not.toHaveBeenCalled();
    expect(db.queryOne<{ total: number }>('SELECT COUNT(*) AS total FROM download_history;')?.total).toBe(0);
  });

  it('preserva validação de lotes vazios, inválidos e acima do limite', async () => {
    const active = companyRepo.create({ name: 'Empresa Ativa', cnpj: '41.777.943/0001-02' });
    const common = {
      company_id: active.id,
      include_xml: true,
      include_pdf: false,
      destination_folder: temporaryFolder,
    };

    await expect(invoke('documents:downloadBatch', { ...common, document_ids: [] }))
      .rejects.toThrow(/entre 1 e 500/i);
    await expect(invoke('documents:downloadBatch', { ...common, document_ids: [0] }))
      .rejects.toThrow(/ID do documento inválido/i);
    await expect(invoke('documents:downloadBatch', {
      ...common,
      document_ids: Array.from({ length: 501 }, (_, index) => index + 1),
    })).rejects.toThrow(/entre 1 e 500/i);
    expect(createBatchZip).not.toHaveBeenCalled();
  });

  it('deduplica IDs válidos antes de criar o ZIP', async () => {
    const active = companyRepo.create({ name: 'Empresa Ativa', cnpj: '41.777.943/0001-02' });
    const xmlPath = path.join(temporaryFolder, 'ativo.xml');
    fs.writeFileSync(xmlPath, '<nfe />');
    const document = createDocument(active.id, '35260941777943000102550010000000011000000001', xmlPath);

    const result = await invoke('documents:downloadBatch', {
      company_id: active.id,
      document_ids: [document.id, document.id],
      include_xml: true,
      include_pdf: false,
      destination_folder: temporaryFolder,
    });

    expect(result).toMatchObject({ success: true, copied_files_count: 1 });
    expect(createBatchZip).toHaveBeenCalledOnce();
    expect(createBatchZip.mock.calls[0][2]).toHaveLength(1);
  });

  it('nao exporta PDF legado de evento NF-e proprio em download individual ou lote', async () => {
    const active = companyRepo.create({ name: 'Empresa Ativa', cnpj: '41.777.943/0001-02' });
    const xmlPath = path.join(temporaryFolder, 'evento.xml');
    const pdfPath = path.join(temporaryFolder, 'evento-legado.pdf');
    fs.writeFileSync(xmlPath, '<evento />');
    fs.writeFileSync(pdfPath, '%PDF legado');
    const event = docRepo.upsert({
      company_id: active.id,
      document_type: 'NFE',
      nsu: '1',
      schema_type: 'procEventoNFe_v1.00.xsd',
      access_key: '35260941777943000102550010000000011000000001',
      xml_path: xmlPath,
      pdf_path: pdfPath,
      xml_status: 'XML_DISPONIVEL',
      pdf_status: 'PDF_DISPONIVEL',
    });

    const individual = await invoke('documents:downloadPdf', {
      company_id: active.id,
      document_id: event.id,
      destination_folder: temporaryFolder,
    });
    expect(individual).toMatchObject({ success: false });

    const batch = await invoke('documents:downloadBatch', {
      company_id: active.id,
      document_ids: [event.id],
      include_xml: true,
      include_pdf: true,
      destination_folder: temporaryFolder,
    });

    expect(batch).toMatchObject({ success: true, copied_files_count: 1 });
    expect(createBatchZip.mock.calls[0][2]).toEqual([
      expect.objectContaining({ sourcePath: xmlPath, format: 'XML' }),
    ]);
    expect(db.queryAll('SELECT * FROM download_history WHERE download_type = \'PDF\';')).toHaveLength(0);
  });

  it('não exporta XML ou PDF estrangeiro nem grava histórico', async () => {
    const active = companyRepo.create({ name: 'Empresa Ativa', cnpj: '41.777.943/0001-02' });
    const inactive = companyRepo.create({ name: 'Empresa Inativa', cnpj: '37.305.384/0001-60' });
    const xmlPath = path.join(temporaryFolder, 'estrangeiro.xml');
    const pdfPath = path.join(temporaryFolder, 'estrangeiro.pdf');
    fs.writeFileSync(xmlPath, '<nfe />');
    fs.writeFileSync(pdfPath, '%PDF');
    const foreignDocument = createDocument(
      inactive.id,
      '35260937305384000160550010000000021000000002',
      xmlPath,
      pdfPath
    );

    for (const channel of ['documents:downloadXml', 'documents:downloadPdf']) {
      const foreignResult = await invoke(channel, {
        company_id: active.id,
        document_id: foreignDocument.id,
        destination_folder: temporaryFolder,
      });
      const missingResult = await invoke(channel, {
        company_id: active.id,
        document_id: 999999,
        destination_folder: temporaryFolder,
      });
      expect(foreignResult).toEqual(missingResult);
      expect(foreignResult).toMatchObject({ success: false });
    }

    expect(electronMock.dialog.showOpenDialog).not.toHaveBeenCalled();
    expect(db.queryOne<{ total: number }>('SELECT COUNT(*) AS total FROM download_history;')?.total).toBe(0);
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

  it('não abre XML ou PDF conhecido apenas por outra empresa', async () => {
    const active = companyRepo.create({ name: 'Empresa Ativa', cnpj: '41.777.943/0001-02' });
    const inactive = companyRepo.create({ name: 'Empresa Inativa', cnpj: '37.305.384/0001-60' });
    const xmlPath = path.join(temporaryFolder, 'estrangeiro.xml');
    const pdfPath = path.join(temporaryFolder, 'estrangeiro.pdf');
    fs.writeFileSync(xmlPath, '<nfe />');
    fs.writeFileSync(pdfPath, '%PDF');
    createDocument(inactive.id, '35260937305384000160550010000000021000000002', xmlPath, pdfPath);

    for (const filePath of [xmlPath, pdfPath]) {
      const foreignResult = await invoke('documents:openFileFolder', {
        company_id: active.id,
        file_path: filePath,
      });
      const missingResult = await invoke('documents:openFileFolder', {
        company_id: active.id,
        file_path: path.join(temporaryFolder, 'inexistente.xml'),
      });
      expect(foreignResult).toBe(false);
      expect(foreignResult).toBe(missingResult);
    }
    expect(electronMock.shell.showItemInFolder).not.toHaveBeenCalled();
  });
});
