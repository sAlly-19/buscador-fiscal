import { DatabaseManager } from '../../database/connection';
import { CompanyRepository } from '../../database/repositories/CompanyRepository';
import { CertificateRepository } from '../../database/repositories/CertificateRepository';
import { DistributionStateRepository } from '../../database/repositories/DistributionStateRepository';
import { DocumentRepository } from '../../database/repositories/DocumentRepository';
import { SettingsRepository } from '../../database/repositories/SettingsRepository';
import { StorageService } from '../../storage/StorageService';
import { IFiscalDistributionProvider } from '../providers/IFiscalDistributionProvider';
import { NFeParser } from '../nfe/NFeParser';
import { CTeParser } from '../cte/CTeParser';
import { DocumentType, SefazQueryResult } from '../../domain/types';
import { compareNSU } from '../../domain/nsu';
import { ParsedFiscalDocumentInfo } from '../types';

export class DistributionEngine {
  private nfeParser = new NFeParser();
  private cteParser = new CTeParser();
  private cancelledCompanies = new Set<number>();

  constructor(
    private db: DatabaseManager,
    private companyRepo: CompanyRepository,
    private certRepo: CertificateRepository,
    private distStateRepo: DistributionStateRepository,
    private docRepo: DocumentRepository,
    private settingsRepo: SettingsRepository,
    private storageService: StorageService,
    private fiscalProvider: IFiscalDistributionProvider
  ) {}

  public cancel(companyId: number): void {
    this.cancelledCompanies.add(companyId);
  }

  public async syncCompany(
    companyId: number,
    docType: DocumentType,
    onProgress?: (data: { message: string; currentNSU?: string; count?: number }) => void
  ): Promise<SefazQueryResult> {
    this.cancelledCompanies.delete(companyId);

    // 1. Validações preliminares
    const company = this.companyRepo.findById(companyId);
    if (!company) {
      throw new Error(`Empresa com ID ${companyId} não encontrada.`);
    }

    const cert = this.certRepo.getByCompanyId(companyId);
    if (!cert) {
      throw new Error(`Nenhum certificado digital associado à empresa '${company.name}'. Selecione um certificado nas configurações.`);
    }

    if (cert.is_expired) {
      throw new Error(`O certificado associado à empresa expirou em ${new Date(cert.valid_to).toLocaleDateString('pt-BR')}.`);
    }

    // 2. Estado de NSU e limites
    const state = this.distStateRepo.getOrCreate(companyId, docType);

    if (state.status === 'RATE_LIMITED' && state.last_query_at) {
      const lastQuery = new Date(state.last_query_at).getTime();
      const elapsedMinutes = (Date.now() - lastQuery) / (1000 * 60);
      if (elapsedMinutes < 60) {
        const remainingMin = Math.ceil(60 - elapsedMinutes);
        throw new Error(
          `A SEFAZ bloqueou temporariamente as consultas por Consumo Indevido (cStat 656). Aguarde ${remainingMin} minuto(s) antes de tentar novamente.`
        );
      }
    }

    const settings = this.settingsRepo.getSettings();
    let currentNSU = state.last_nsu;
    let totalDocsReceived = 0;
    let lastResponseCStat = 0;
    let lastResponseXMotivo = '';
    let maxNSU = state.max_nsu;

    this.distStateRepo.updateStatus(companyId, docType, 'RUNNING');

    try {
      onProgress?.({ message: `Iniciando consulta à SEFAZ... NSU Atual: ${currentNSU}`, currentNSU });

      // Executa a consulta
      const response = docType === 'NFE'
        ? await this.fiscalProvider.distributeNFe({
            cnpj: company.cnpj,
            ultNSU: currentNSU,
            environment: settings.sefaz_environment,
            thumbprint: cert.thumbprint,
          })
        : await this.fiscalProvider.distributeCTe({
            cnpj: company.cnpj,
            ultNSU: currentNSU,
            environment: settings.sefaz_environment,
            thumbprint: cert.thumbprint,
          });

      lastResponseCStat = response.cStat;
      lastResponseXMotivo = response.xMotivo;
      maxNSU = response.maxNSU;

      // Verificação de Cancelamento
      if (this.cancelledCompanies.has(companyId)) {
        this.distStateRepo.updateStatus(companyId, docType, 'IDLE');
        return {
          success: false,
          cStat: 0,
          xMotivo: 'Consulta cancelada pelo usuário.',
          ultNSU: currentNSU,
          maxNSU,
          documentsCount: 0,
          isComplete: false,
        };
      }

      // 3. Processamento conforme cStat da SEFAZ
      if (response.cStat === 138) {
        // Documentos localizados!
        const parsedDocs: ParsedFiscalDocumentInfo[] = [];

        for (const rawDoc of response.docs) {
          const parsed = docType === 'NFE'
            ? this.nfeParser.parseDocumentXml(rawDoc.xmlContent, rawDoc.nsu, rawDoc.schema)
            : this.cteParser.parseDocumentXml(rawDoc.xmlContent, rawDoc.nsu, rawDoc.schema);

          if (parsed) {
            parsedDocs.push(parsed);
          }
        }

        // TRANSAÇÃO ATÔMICA: Salva arquivos no disco e persiste metadados no SQLite
        this.db.transaction(() => {
          for (const doc of parsedDocs) {
            const savedPath = this.storageService.saveXml(
              company,
              docType === 'NFE' ? 'NFe' : 'CTe',
              doc.access_key,
              doc.rawXml,
              doc.issue_date
            );

            this.docRepo.upsert({
              company_id: company.id,
              document_type: doc.document_type,
              nsu: doc.nsu,
              schema_type: doc.schema_type,
              access_key: doc.access_key,
              document_number: doc.document_number,
              series: doc.series,
              issue_date: doc.issue_date,
              received_at: new Date().toISOString(),
              issuer_cnpj: doc.issuer_cnpj,
              issuer_name: doc.issuer_name,
              recipient_cnpj: doc.recipient_cnpj,
              recipient_name: doc.recipient_name,
              total_value: doc.total_value,
              xml_path: savedPath,
              xml_status: 'XML_DISPONIVEL',
              pdf_status: doc.pdf_status,
              situacao_fiscal: doc.situacao_fiscal,
            });
          }

          // Atualiza estado do NSU somente após o sucesso dos documentos
          this.distStateRepo.updateNSU(
            companyId,
            docType,
            response.ultNSU,
            response.maxNSU,
            'IDLE'
          );

          // Registra histórico
          this.db.execute(
            `INSERT INTO query_history (
              company_id, document_type, started_at, finished_at, 
              last_nsu_before, last_nsu_after, documents_received, status
            ) VALUES (?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'), ?, ?, ?, 'SUCCESS');`,
            [companyId, docType, currentNSU, response.ultNSU, parsedDocs.length]
          );
        });

        currentNSU = response.ultNSU;
        totalDocsReceived = parsedDocs.length;
        onProgress?.({
          message: `${parsedDocs.length} documento(s) recebido(s) e arquivado(s).`,
          currentNSU,
          count: parsedDocs.length,
        });
      } else if (response.cStat === 137) {
        // Nenhum documento localizado
        this.distStateRepo.updateNSU(
          companyId,
          docType,
          currentNSU,
          maxNSU,
          'IDLE'
        );

        this.db.execute(
          `INSERT INTO query_history (
            company_id, document_type, started_at, finished_at, 
            last_nsu_before, last_nsu_after, documents_received, status
          ) VALUES (?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'), ?, ?, 0, 'NO_DOCS');`,
          [companyId, docType, currentNSU, currentNSU]
        );
      } else if (response.cStat === 656) {
        // Consumo Indevido
        this.distStateRepo.updateStatus(companyId, docType, 'RATE_LIMITED', response.xMotivo);

        this.db.execute(
          `INSERT INTO query_history (
            company_id, document_type, started_at, finished_at, 
            last_nsu_before, last_nsu_after, documents_received, status, error_message
          ) VALUES (?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'), ?, ?, 0, 'RATE_LIMITED', ?);`,
          [companyId, docType, currentNSU, currentNSU, response.xMotivo]
        );

        throw new Error(`SEFAZ retornou Consumo Indevido (cStat 656): ${response.xMotivo}`);
      } else {
        // Outros erros ou rejeições fiscais
        this.distStateRepo.updateStatus(companyId, docType, 'ERROR', response.xMotivo);
        throw new Error(`A SEFAZ retornou uma rejeição (${response.cStat}): ${response.xMotivo}`);
      }

      const isComplete = compareNSU(currentNSU, maxNSU) >= 0;

      return {
        success: true,
        cStat: lastResponseCStat,
        xMotivo: lastResponseXMotivo,
        ultNSU: currentNSU,
        maxNSU,
        documentsCount: totalDocsReceived,
        isComplete,
      };
    } catch (error: any) {
      const currentState = this.distStateRepo.getOrCreate(companyId, docType);
      if (currentState.status !== 'RATE_LIMITED') {
        this.distStateRepo.updateStatus(companyId, docType, 'ERROR', error.message);
      }
      throw error;
    }
  }
}
