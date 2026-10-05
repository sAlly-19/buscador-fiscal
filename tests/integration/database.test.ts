import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from '../../packages/database/connection';
import { CompanyRepository } from '../../packages/database/repositories/CompanyRepository';
import { DistributionStateRepository } from '../../packages/database/repositories/DistributionStateRepository';
import { DocumentRepository } from '../../packages/database/repositories/DocumentRepository';
import { SettingsRepository } from '../../packages/database/repositories/SettingsRepository';

describe('Integração do Banco de Dados SQLite (Fase 2)', () => {
  let db: DatabaseManager;
  let companyRepo: CompanyRepository;
  let distStateRepo: DistributionStateRepository;
  let docRepo: DocumentRepository;
  let settingsRepo: SettingsRepository;

  beforeEach(async () => {
    // Inicia banco isolado em memória para os testes
    db = await DatabaseManager.create(':memory:');
    companyRepo = new CompanyRepository(db);
    distStateRepo = new DistributionStateRepository(db);
    docRepo = new DocumentRepository(db);
    settingsRepo = new SettingsRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('Empresas (CompanyRepository)', () => {
    it('deve cadastrar uma nova empresa e torná-la ativa se for a primeira', () => {
      const company = companyRepo.create({
        name: 'Foscampos Ltda',
        cnpj: '41.777.943/0001-02',
      });

      expect(company.id).toBeDefined();
      expect(company.name).toBe('Foscampos Ltda');
      expect(company.cnpj).toBe('41777943000102'); // Apenas dígitos
      expect(company.is_active).toBe(true);
    });

    it('deve impedir cadastro de CNPJ duplicado', () => {
      companyRepo.create({
        name: 'Empresa Original',
        cnpj: '41.777.943/0001-02',
      });

      expect(() => {
        companyRepo.create({
          name: 'Empresa Duplicada',
          cnpj: '41777943000102',
        });
      }).toThrow(/Já existe uma empresa cadastrada com o CNPJ/);
    });

    it('deve permitir alternar empresa ativa sem deixar mais de uma ativa', () => {
      const c1 = companyRepo.create({ name: 'Empresa 1', cnpj: '41.777.943/0001-02' });
      const c2 = companyRepo.create({ name: 'Empresa 2', cnpj: '37.305.384/0001-60' });

      expect(companyRepo.getActive()?.id).toBe(c1.id);

      companyRepo.setActive(c2.id);

      expect(companyRepo.getActive()?.id).toBe(c2.id);
      expect(companyRepo.findById(c1.id)?.is_active).toBe(false);
      expect(companyRepo.findById(c2.id)?.is_active).toBe(true);
    });

    it('não deve desativar a empresa atual ao selecionar um ID inexistente', () => {
      const company = companyRepo.create({ name: 'Empresa 1', cnpj: '41.777.943/0001-02' });
      expect(companyRepo.setActive(999999)).toBe(false);
      expect(companyRepo.getActive()?.id).toBe(company.id);
    });
  });

  describe('Estado de Distribuição e NSU (DistributionStateRepository)', () => {
    it('deve inicializar estado de NSU com 15 zeros para empresa e serviço', () => {
      const company = companyRepo.create({ name: 'Empresa Teste', cnpj: '41.777.943/0001-02' });
      
      const nfeState = distStateRepo.getOrCreate(company.id, 'NFE');
      expect(nfeState.last_nsu).toBe('000000000000000');
      expect(nfeState.max_nsu).toBe('000000000000000');
      expect(nfeState.status).toBe('IDLE');

      const cteState = distStateRepo.getOrCreate(company.id, 'CTE');
      expect(cteState.last_nsu).toBe('000000000000000');
    });

    it('deve atualizar NSU de forma segregada entre NF-e e CT-e', () => {
      const company = companyRepo.create({ name: 'Empresa Teste', cnpj: '41.777.943/0001-02' });
      
      distStateRepo.updateNSU(company.id, 'NFE', '000000000000050', '000000000000100');
      distStateRepo.updateNSU(company.id, 'CTE', '000000000000012', '000000000000012');

      const nfeState = distStateRepo.getOrCreate(company.id, 'NFE');
      const cteState = distStateRepo.getOrCreate(company.id, 'CTE');

      expect(nfeState.last_nsu).toBe('000000000000050');
      expect(nfeState.max_nsu).toBe('000000000000100');

      expect(cteState.last_nsu).toBe('000000000000012');
      expect(cteState.max_nsu).toBe('000000000000012');
    });

    it('deve manter NSUs independentes entre homologação e produção', () => {
      const company = companyRepo.create({ name: 'Empresa Teste', cnpj: '41.777.943/0001-02' });
      distStateRepo.updateNSU(company.id, 'NFE', '10', '20', 'IDLE', undefined, 'homologation');
      distStateRepo.updateNSU(company.id, 'NFE', '30', '40', 'IDLE', undefined, 'production');
      expect(distStateRepo.getOrCreate(company.id, 'NFE', 'homologation').last_nsu).toBe('000000000000010');
      expect(distStateRepo.getOrCreate(company.id, 'NFE', 'production').last_nsu).toBe('000000000000030');
    });
  });

  describe('Documentos Fiscais e Deduplicação (DocumentRepository)', () => {
    it('não deve listar eventos de manifestação como documentos fiscais', () => {
      const company = companyRepo.create({ name: 'Empresa Teste', cnpj: '41.777.943/0001-02' });
      docRepo.upsert({
        company_id: company.id,
        document_type: 'NFE',
        nsu: '1',
        schema_type: 'procEventoNFe_v1.00.xsd',
        access_key: '52260941573774000199550020000018021000130318',
        document_number: '1802',
        issuer_name: 'Ciencia da Operacao',
        xml_path: 'C:/Docs/ciencia.xml',
        xml_status: 'XML_DISPONIVEL',
        pdf_status: 'PDF_INDISPONIVEL',
      });
      const summary = docRepo.upsert({
        company_id: company.id,
        document_type: 'NFE',
        nsu: '2',
        schema_type: 'resNFe_v1.01.xsd',
        access_key: '35260941777943000102550010000000011000000001',
        document_number: '1',
        issuer_name: 'Fornecedor Real',
        xml_path: 'C:/Docs/resumo.xml',
        xml_status: 'XML_DISPONIVEL',
        pdf_status: 'PDF_INDISPONIVEL',
      });

      const result = docRepo.search({ company_id: company.id });

      expect(result.total).toBe(1);
      expect(result.items.map((document) => document.id)).toEqual([summary.id]);
    });

    it('deve substituir placeholder de evento quando o resumo da NF-e chegar depois', () => {
      const company = companyRepo.create({ name: 'Empresa Teste', cnpj: '41.777.943/0001-02' });
      const accessKey = '52260941573774000199550020000018021000130318';
      const event = docRepo.upsert({
        company_id: company.id,
        document_type: 'NFE',
        nsu: '10',
        schema_type: 'procEventoNFe_v1.00.xsd',
        access_key: accessKey,
        document_number: '1802',
        series: '2',
        issue_date: '2026-10-01T08:00:00-03:00',
        issuer_cnpj: company.cnpj,
        issuer_name: 'Ciencia da Operacao',
        total_value: 0,
        xml_path: 'C:/Docs/ciencia.xml',
        xml_status: 'XML_DISPONIVEL',
        pdf_status: 'PDF_INDISPONIVEL',
      });

      const summary = docRepo.upsert({
        company_id: company.id,
        document_type: 'NFE',
        nsu: '11',
        schema_type: 'resNFe_v1.01.xsd',
        access_key: accessKey,
        document_number: '1802',
        series: '2',
        issue_date: '2026-09-30T12:00:00-03:00',
        issuer_cnpj: '41573774000199',
        issuer_name: 'SUPERMERCADO FORNECEDOR LTDA',
        total_value: 249.9,
        xml_path: 'C:/Docs/resumo.xml',
        xml_status: 'XML_DISPONIVEL',
        pdf_status: 'PDF_INDISPONIVEL',
      });

      expect(summary.id).toBe(event.id);
      expect(summary.schema_type).toBe('resNFe_v1.01.xsd');
      expect(summary.issue_date).toBe('2026-09-30T12:00:00-03:00');
      expect(summary.issuer_cnpj).toBe('41573774000199');
      expect(summary.issuer_name).toBe('SUPERMERCADO FORNECEDOR LTDA');
      expect(summary.total_value).toBe(249.9);
      expect(summary.xml_path).toBe('C:/Docs/resumo.xml');
      expect(docRepo.search({ company_id: company.id }).total).toBe(1);
    });

    it('deve buscar documento por ID somente dentro da empresa informada', () => {
      const owner = companyRepo.create({ name: 'Empresa Proprietária', cnpj: '41.777.943/0001-02' });
      const other = companyRepo.create({ name: 'Outra Empresa', cnpj: '37.305.384/0001-60' });
      const document = docRepo.upsert({
        company_id: owner.id,
        document_type: 'NFE',
        nsu: '1',
        schema_type: 'procNFe',
        access_key: '35260941777943000102550010000000011000000001',
        xml_path: 'C:/Docs/empresa-proprietaria.xml',
        xml_status: 'XML_DISPONIVEL',
        pdf_status: 'PDF_INDISPONIVEL',
      });

      expect(docRepo.findById(document.id, owner.id)?.id).toBe(document.id);
      expect(docRepo.findById(document.id, other.id)).toBeNull();
    });

    it('deve reconhecer caminho de storage somente dentro da empresa informada', () => {
      const owner = companyRepo.create({ name: 'Empresa Proprietária', cnpj: '41.777.943/0001-02' });
      const other = companyRepo.create({ name: 'Outra Empresa', cnpj: '37.305.384/0001-60' });
      const xmlPath = 'C:/Docs/empresa-proprietaria.xml';
      docRepo.upsert({
        company_id: owner.id,
        document_type: 'NFE',
        nsu: '1',
        schema_type: 'procNFe',
        access_key: '35260941777943000102550010000000011000000001',
        xml_path: xmlPath,
        xml_status: 'XML_DISPONIVEL',
        pdf_status: 'PDF_INDISPONIVEL',
      });

      expect(docRepo.isKnownStoragePath(xmlPath, owner.id)).toBe(true);
      expect(docRepo.isKnownStoragePath(xmlPath, other.id)).toBe(false);
    });

    it('deve permitir a mesma chave de acesso para empresas diferentes', () => {
      const first = companyRepo.create({ name: 'Empresa 1', cnpj: '41.777.943/0001-02' });
      const second = companyRepo.create({ name: 'Empresa 2', cnpj: '37.305.384/0001-60' });
      const accessKey = '35260941777943000102550010000123451000123456';
      for (const company of [first, second]) {
        docRepo.upsert({ company_id: company.id, document_type: 'NFE', nsu: '1', schema_type: 'resNFe',
          access_key: accessKey, received_at: new Date().toISOString(), xml_status: 'XML_DISPONIVEL', pdf_status: 'PDF_INDISPONIVEL' });
      }
      expect(docRepo.search({ company_id: first.id }).total).toBe(1);
      expect(docRepo.search({ company_id: second.id }).total).toBe(1);
    });
    it('deve gravar documento fiscal e não duplicar registro em caso de mesma chave de acesso', () => {
      const company = companyRepo.create({ name: 'Empresa Teste', cnpj: '41.777.943/0001-02' });
      const accessKey = '35260941777943000102550010000123451000123456';

      // 1. Recebimento inicial de Resumo (resNFe)
      docRepo.upsert({
        company_id: company.id,
        document_type: 'NFE',
        nsu: '000000000000001',
        schema_type: 'resNFe_v1.01.xsd',
        access_key: accessKey,
        document_number: '12345',
        series: '1',
        issue_date: '2026-09-10T10:00:00-03:00',
        received_at: new Date().toISOString(),
        issuer_cnpj: '12345678000190',
        issuer_name: 'Fornecedor A',
        total_value: 1500.00,
        xml_status: 'XML_DISPONIVEL',
        pdf_status: 'PDF_INDISPONIVEL',
      });

      // 2. Recebimento posterior do XML Completo (procNFe) para a MESMA chave
      docRepo.upsert({
        company_id: company.id,
        document_type: 'NFE',
        nsu: '000000000000005',
        schema_type: 'procNFe_v4.00.xsd',
        access_key: accessKey,
        document_number: '12345',
        series: '1',
        issue_date: '2026-09-10T10:00:00-03:00',
        received_at: new Date().toISOString(),
        issuer_cnpj: '12345678000190',
        issuer_name: 'Fornecedor A',
        total_value: 1500.00,
        xml_path: 'C:/Docs/nota.xml',
        pdf_path: 'C:/Docs/nota.pdf',
        xml_status: 'XML_DISPONIVEL',
        pdf_status: 'PDF_DISPONIVEL',
      });

      // Busca e garante que há apenas 1 documento no banco com dados atualizados
      const results = docRepo.search({ company_id: company.id });
      expect(results.total).toBe(1);
      expect(results.items[0].schema_type).toBe('procNFe_v4.00.xsd');
      expect(results.items[0].pdf_status).toBe('PDF_DISPONIVEL');
      expect(results.items[0].xml_path).toBe('C:/Docs/nota.xml');
    });

    it('deve enriquecer resumo com dados do procNFe e persistir cancelamento sem reverter para autorizada', () => {
      const company = companyRepo.create({ name: 'Empresa Teste', cnpj: '41.777.943/0001-02' });
      const accessKey = '52260702167542000189550010001993041173601369';

      // 1. Chega Resumo resNFe sem destinatário e sem caminhos de arquivo
      docRepo.upsert({
        company_id: company.id,
        document_type: 'NFE',
        nsu: '000000000000010',
        schema_type: 'resNFe_v1.01.xsd',
        access_key: accessKey,
        document_number: '199304',
        series: '1',
        issue_date: '2026-07-21T12:40:30-03:00',
        issuer_cnpj: '02167542000189',
        issuer_name: 'Fornecedor Combustível',
        total_value: 2331.00,
        situacao_fiscal: 'AUTORIZADA',
      });

      let doc = docRepo.findByAccessKey(accessKey);
      expect(doc?.document_number).toBe('199304');
      expect(doc?.recipient_cnpj).toBeNull();
      expect(doc?.schema_type).toBe('resNFe_v1.01.xsd');

      // 2. Chega XML Completo procNFe com destinatário e arquivo físico
      docRepo.upsert({
        company_id: company.id,
        document_type: 'NFE',
        nsu: '000000000000015',
        schema_type: 'procNFe_v4.00.xsd',
        access_key: accessKey,
        document_number: '199304',
        series: '1',
        issue_date: '2026-07-21T12:40:30-03:00',
        issuer_cnpj: '02167542000189',
        issuer_name: 'Fornecedor Combustível',
        recipient_cnpj: '41777943000102',
        recipient_name: 'Empresa Teste',
        total_value: 2331.00,
        xml_path: 'C:/XMLs/199304.xml',
        xml_status: 'XML_DISPONIVEL',
        pdf_status: 'PDF_DISPONIVEL',
        situacao_fiscal: 'AUTORIZADA',
      });

      doc = docRepo.findByAccessKey(accessKey);
      expect(doc?.schema_type).toBe('procNFe_v4.00.xsd');
      expect(doc?.recipient_cnpj).toBe('41777943000102');
      expect(doc?.recipient_name).toBe('Empresa Teste');
      expect(doc?.xml_path).toBe('C:/XMLs/199304.xml');

      // 3. Chega Evento de Cancelamento
      docRepo.upsert({
        company_id: company.id,
        document_type: 'NFE',
        nsu: '000000000000020',
        schema_type: 'procEventoNFe_v1.00.xsd',
        access_key: accessKey,
        document_number: '199304',
        series: '1',
        situacao_fiscal: 'CANCELADA',
      });

      doc = docRepo.findByAccessKey(accessKey);
      expect(doc?.situacao_fiscal).toBe('CANCELADA');
      // Garante que o schema_type NÃO foi rebaixado para procEventoNFe
      expect(doc?.schema_type).toBe('procNFe_v4.00.xsd');
      // Garante que o xml_path da procNFe original foi preservado
      expect(doc?.xml_path).toBe('C:/XMLs/199304.xml');

      // 4. Se um evento subsequente não cancelatório chegar, não deve reverter CANCELADA
      docRepo.upsert({
        company_id: company.id,
        document_type: 'NFE',
        nsu: '000000000000025',
        schema_type: 'resNFe_v1.01.xsd',
        access_key: accessKey,
        situacao_fiscal: 'AUTORIZADA',
      });

      doc = docRepo.findByAccessKey(accessKey);
      expect(doc?.situacao_fiscal).toBe('CANCELADA');
    });

    it('deve filtrar documentos locais por período e chave de acesso com paginação', () => {
      const company = companyRepo.create({ name: 'Empresa Teste', cnpj: '41.777.943/0001-02' });

      // Insere 3 documentos com datas distintas
      docRepo.upsert({
        company_id: company.id,
        document_type: 'NFE',
        nsu: '000000000000001',
        schema_type: 'procNFe',
        access_key: '35260941777943000102550010000000011000000001',
        issue_date: '2026-08-15',
        received_at: new Date().toISOString(),
        xml_status: 'XML_DISPONIVEL',
        pdf_status: 'PDF_INDISPONIVEL',
      });

      docRepo.upsert({
        company_id: company.id,
        document_type: 'NFE',
        nsu: '000000000000002',
        schema_type: 'procNFe',
        access_key: '35260941777943000102550010000000021000000002',
        issue_date: '2026-09-05',
        received_at: new Date().toISOString(),
        xml_status: 'XML_DISPONIVEL',
        pdf_status: 'PDF_INDISPONIVEL',
      });

      docRepo.upsert({
        company_id: company.id,
        document_type: 'CTE',
        nsu: '000000000000001',
        schema_type: 'procCTe',
        access_key: '35260941777943000102570010000000031000000003',
        issue_date: '2026-09-20',
        received_at: new Date().toISOString(),
        xml_status: 'XML_DISPONIVEL',
        pdf_status: 'PDF_INDISPONIVEL',
      });

      // Busca somente documentos de Setembro (2026-09)
      const resSept = docRepo.search({
        company_id: company.id,
        start_date: '2026-09-01',
        end_date: '2026-09-30',
      });

      expect(resSept.total).toBe(2);

      // Busca somente CT-e
      const resCTe = docRepo.search({
        company_id: company.id,
        document_types: ['CTE'],
      });

      expect(resCTe.total).toBe(1);
      expect(resCTe.items[0].document_type).toBe('CTE');
    });
  });

  describe('Integridade e Transacionalidade', () => {
    it('deve reverter alterações se uma falha ocorrer durante o processamento do lote', () => {
      const company = companyRepo.create({ name: 'Empresa Teste', cnpj: '41.777.943/0001-02' });

      expect(() => {
        db.transaction(() => {
          docRepo.upsert({
            company_id: company.id,
            document_type: 'NFE',
            nsu: '000000000000010',
            schema_type: 'procNFe',
            access_key: '35260941777943000102550010000000101000000010',
            received_at: new Date().toISOString(),
            xml_status: 'XML_DISPONIVEL',
            pdf_status: 'PDF_INDISPONIVEL',
          });

          // Simula uma falha inesperada durante a gravação antes de avançar NSU
          throw new Error('Falha de I/O de disco simulada');
        });
      }).toThrow('Falha de I/O de disco simulada');

      // Verifica se o documento NÃO foi persistido após o rollback
      const search = docRepo.search({ company_id: company.id });
      expect(search.total).toBe(0);
    });
  });

  describe('Configurações (SettingsRepository)', () => {
    it('deve carregar configurações padrão e permitir atualização', () => {
      const initial = settingsRepo.getSettings();
      expect(initial.sefaz_environment).toBe('homologation');
      expect(initial.items_per_page).toBe(50);

      const updated = settingsRepo.updateSettings({
        default_storage_path: 'C:\\Documentos Fiscais',
        items_per_page: 100,
      });

      expect(updated.default_storage_path).toBe('C:\\Documentos Fiscais');
      expect(updated.items_per_page).toBe(100);
      expect(updated.sefaz_environment).toBe('homologation'); // Preservado
    });
  });
});
