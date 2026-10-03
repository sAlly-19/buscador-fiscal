import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { DatabaseManager } from '../../packages/database/connection';
import { CompanyRepository } from '../../packages/database/repositories/CompanyRepository';
import { CertificateRepository } from '../../packages/database/repositories/CertificateRepository';
import { DistributionStateRepository } from '../../packages/database/repositories/DistributionStateRepository';
import { DocumentRepository } from '../../packages/database/repositories/DocumentRepository';
import { SettingsRepository } from '../../packages/database/repositories/SettingsRepository';
import { StorageService } from '../../packages/storage/StorageService';
import { MockFiscalDistributionProvider } from '../../packages/fiscal/providers/MockFiscalDistributionProvider';
import { DistributionEngine } from '../../packages/fiscal/services/DistributionEngine';

describe('Motor de Distribuição SEFAZ e Regras de NSU (Fases 6, 7, 8 e 9)', () => {
  let db: DatabaseManager;
  let companyRepo: CompanyRepository;
  let certRepo: CertificateRepository;
  let distStateRepo: DistributionStateRepository;
  let docRepo: DocumentRepository;
  let settingsRepo: SettingsRepository;
  let storageService: StorageService;
  let mockProvider: MockFiscalDistributionProvider;
  let engine: DistributionEngine;
  let tempStorageDir: string;
  let companyId: number;

  beforeEach(async () => {
    tempStorageDir = path.join(os.tmpdir(), `fiscal_test_storage_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
    fs.mkdirSync(tempStorageDir, { recursive: true });

    db = await DatabaseManager.create(':memory:');
    companyRepo = new CompanyRepository(db);
    certRepo = new CertificateRepository(db);
    distStateRepo = new DistributionStateRepository(db);
    docRepo = new DocumentRepository(db);
    settingsRepo = new SettingsRepository(db);
    storageService = new StorageService(tempStorageDir);
    mockProvider = new MockFiscalDistributionProvider();

    engine = new DistributionEngine(
      db,
      companyRepo,
      certRepo,
      distStateRepo,
      docRepo,
      settingsRepo,
      storageService,
      mockProvider
    );

    // Cria empresa e associa certificado mockado
    const company = companyRepo.create({
      name: 'Empresa Teste S/A',
      cnpj: '41.777.943/0001-02',
    });
    companyId = company.id;

    certRepo.associate(companyId, {
      subject: 'CN=Empresa Teste:41777943000102',
      issuer: 'AC Certifica',
      serial_number: '123456',
      thumbprint: 'E22923C34166FC304A236F6EECF2CB0F6F0AE0BF',
      valid_from: '2025-01-01',
      valid_to: '2028-01-01',
      provider: 'mock',
      has_private_key: true,
      is_expired: false,
    });
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(tempStorageDir)) {
      try {
        fs.rmSync(tempStorageDir, { recursive: true, force: true });
      } catch {
        // Ignora
      }
    }
  });

  it('deve executar primeira consulta de NF-e, receber documentos, salvar no disco e atualizar ultNSU de forma atômica', async () => {
    const initialState = distStateRepo.getOrCreate(companyId, 'NFE');
    expect(initialState.last_nsu).toBe('000000000000000');

    // 1. Primeira Consulta (lote individual)
    const result1 = await engine.syncCompany(companyId, 'NFE', undefined, { maxBatches: 1 });
    expect(result1.success).toBe(true);
    expect(result1.cStat).toBe(138);
    expect(result1.documentsCount).toBe(2);
    expect(result1.ultNSU).toBe('000000000000002');
    expect(result1.maxNSU).toBe('000000000000004');
    expect(result1.isComplete).toBe(false);

    // Confirma estado no banco
    const stateAfter1 = distStateRepo.getOrCreate(companyId, 'NFE');
    expect(stateAfter1.last_nsu).toBe('000000000000002');

    // Confirma que os 2 documentos estão no banco
    const docs = docRepo.search({ company_id: companyId });
    expect(docs.total).toBe(2);

    // Confirma que os arquivos XML físicos foram gravados no disco
    for (const doc of docs.items) {
      expect(doc.xml_path).toBeDefined();
      expect(fs.existsSync(doc.xml_path!)).toBe(true);
    }
  });

  it('deve realizar consulta subsequente até a sincronização completa (ultNSU == maxNSU)', async () => {
    // 1ª Consulta (lote 1)
    await engine.syncCompany(companyId, 'NFE', undefined, { maxBatches: 1 });

    // 2ª Consulta (avança de 002 para 004)
    const result2 = await engine.syncCompany(companyId, 'NFE', undefined, { maxBatches: 1 });
    expect(result2.documentsCount).toBe(1);
    expect(result2.ultNSU).toBe('000000000000004');
    expect(result2.isComplete).toBe(true); // Chegou no maxNSU!

    // 3ª Consulta (não há novos documentos)
    const result3 = await engine.syncCompany(companyId, 'NFE', undefined, { maxBatches: 1 });
    expect(result3.cStat).toBe(137);
    expect(result3.documentsCount).toBe(0);
    expect(result3.ultNSU).toBe('000000000000004'); // Mantém o último NSU intacto

    const cooldownResult = await engine.syncCompany(companyId, 'NFE');
    expect(cooldownResult.success).toBe(false);
    expect(cooldownResult.cStat).toBe(137);
    expect(cooldownResult.xMotivo).toMatch(/Nenhuma nova chamada foi enviada/);
  });

  it('deve sincronizar múltiplos lotes automaticamente até maxNSU em uma única chamada', async () => {
    // Chamada padrão multi-lote
    const result = await engine.syncCompany(companyId, 'NFE');
    expect(result.success).toBe(true);
    expect(result.documentsCount).toBe(3); // 2 do 1º lote + 1 do 2º lote
    expect(result.ultNSU).toBe('000000000000004');
    expect(result.maxNSU).toBe('000000000000004');
    expect(result.isComplete).toBe(true);

    const docs = docRepo.search({ company_id: companyId });
    expect(docs.total).toBe(3);
  });

  it('deve manter o NSU intacto caso ocorra falha de rede/SEFAZ', async () => {
    // 1ª Consulta com sucesso (lote 1)
    await engine.syncCompany(companyId, 'NFE', undefined, { maxBatches: 1 });
    const stateBefore = distStateRepo.getOrCreate(companyId, 'NFE');
    expect(stateBefore.last_nsu).toBe('000000000000002');

    // Força erro na próxima chamada
    mockProvider.setFailNext(true);

    await expect(engine.syncCompany(companyId, 'NFE', undefined, { maxBatches: 1 })).rejects.toThrow('Falha de conexão simulada');

    // Garante que o NSU NÃO avançou indevidamente
    const stateAfter = distStateRepo.getOrCreate(companyId, 'NFE');
    expect(stateAfter.last_nsu).toBe('000000000000002');
    expect(stateAfter.status).toBe('ERROR');
  });

  it('deve registrar bloqueio de consumo indevido (cStat 656) e impedir consultas consecutivas', async () => {
    mockProvider.setRateLimitNext(true);

    const firstResult = await engine.syncCompany(companyId, 'NFE');
    expect(firstResult.success).toBe(false);
    expect(firstResult.cStat).toBe(656);
    expect(firstResult.xMotivo).toMatch(/Consumo Indevido/);

    const state = distStateRepo.getOrCreate(companyId, 'NFE');
    expect(state.status).toBe('RATE_LIMITED');

    // Próxima tentativa imediata deve ser barrada pelo sistema local antes de chamar a SEFAZ
    const secondResult = await engine.syncCompany(companyId, 'NFE');
    expect(secondResult.success).toBe(false);
    expect(secondResult.cStat).toBe(656);
    expect(secondResult.xMotivo).toMatch(/Nenhuma nova chamada foi enviada/);
  });

  it('deve consultar CT-e de forma independente da NF-e', async () => {
    // Sincroniza NF-e (lote 1)
    await engine.syncCompany(companyId, 'NFE', undefined, { maxBatches: 1 });

    // Sincroniza CT-e
    const cteResult = await engine.syncCompany(companyId, 'CTE', undefined, { maxBatches: 1 });
    expect(cteResult.success).toBe(true);
    expect(cteResult.documentsCount).toBe(1);
    expect(cteResult.ultNSU).toBe('000000000000001');

    const nfeState = distStateRepo.getOrCreate(companyId, 'NFE');
    const cteState = distStateRepo.getOrCreate(companyId, 'CTE');

    // Estados de NSU são estritamente independentes
    expect(nfeState.last_nsu).toBe('000000000000002');
    expect(cteState.last_nsu).toBe('000000000000001');
  });
});
