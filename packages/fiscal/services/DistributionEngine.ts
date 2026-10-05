import { DatabaseManager } from '../../database/connection';
import { CompanyRepository } from '../../database/repositories/CompanyRepository';
import { CertificateRepository } from '../../database/repositories/CertificateRepository';
import { DistributionStateRepository } from '../../database/repositories/DistributionStateRepository';
import { DocumentRepository } from '../../database/repositories/DocumentRepository';
import { SettingsRepository } from '../../database/repositories/SettingsRepository';
import { PendingFileWrite, StorageService } from '../../storage/StorageService';
import { IFiscalDistributionProvider } from '../providers/IFiscalDistributionProvider';
import { NFeParser } from '../nfe/NFeParser';
import { CTeParser } from '../cte/CTeParser';
import { CombinedSefazQueryResult, DocumentType, SefazEnvironment, SefazQueryResult } from '../../domain/types';
import { compareNSU } from '../../domain/nsu';
import { ParsedFiscalDocumentInfo } from '../types';

type ProgressCallback = (data: { message: string; currentNSU?: string; count?: number }) => void;
type CombinedProgressCallback = (data: {
  documentType: DocumentType;
  message: string;
  currentNSU?: string;
  count?: number;
}) => void;

export class DistributionEngine {
  private nfeParser = new NFeParser();
  private cteParser = new CTeParser();
  private activeQueries = new Map<string, AbortController>();

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

  public cancel(companyId: number, docType?: DocumentType): void {
    for (const [key, controller] of this.activeQueries) {
      if (key.startsWith(`${companyId}:`) && (!docType || key.includes(`:${docType}:`))) controller.abort();
    }
  }

  public async syncCompanyDocuments(
    companyId: number,
    onProgress?: CombinedProgressCallback,
    options?: { maxBatches?: number }
  ): Promise<CombinedSefazQueryResult> {
    const run = async (documentType: DocumentType): Promise<SefazQueryResult> => {
      try {
        return await this.syncCompany(
          companyId,
          documentType,
          (progress) => onProgress?.({ documentType, ...progress }),
          options
        );
      } catch (error) {
        const environment = this.settingsRepo.getSettings().sefaz_environment;
        const state = this.distStateRepo.getOrCreate(companyId, documentType, environment);
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          cStat: state.last_cstat || 0,
          xMotivo: message,
          ultNSU: state.last_nsu,
          maxNSU: state.max_nsu,
          documentsCount: 0,
          isComplete: false,
          error: message,
        };
      }
    };

    const nfe = await run('NFE');
    const cte = !nfe.success && nfe.cStat === 0 && /cancelada/i.test(nfe.xMotivo)
      ? this.cancelledResult(companyId, 'CTE')
      : await run('CTE');

    return {
      success: nfe.success && cte.success,
      nfe,
      cte,
      documentsCount: nfe.documentsCount + cte.documentsCount,
    };
  }

  public async syncCompany(
    companyId: number,
    docType: DocumentType,
    onProgress?: ProgressCallback,
    options?: { maxBatches?: number }
  ): Promise<SefazQueryResult> {
    const settings = this.settingsRepo.getSettings();
    const environment = settings.sefaz_environment;
    const operationKey = `${companyId}:${docType}:${environment}`;
    if (this.activeQueries.has(operationKey)) {
      throw new Error(`Já existe uma sincronização de ${docType} em andamento para esta empresa e ambiente.`);
    }

    const company = this.companyRepo.findById(companyId);
    if (!company) throw new Error(`Empresa com ID ${companyId} não encontrada.`);
    const cert = this.certRepo.getByCompanyId(companyId);
    if (!cert) throw new Error(`Nenhum certificado digital associado à empresa '${company.name}'.`);
    if (!cert.has_private_key) throw new Error('O certificado associado não possui chave privada acessível.');
    if (cert.is_expired || new Date(cert.valid_to).getTime() <= Date.now()) {
      throw new Error(`O certificado associado à empresa expirou em ${this.formatDate(cert.valid_to)}.`);
    }

    const state = this.distStateRepo.getOrCreate(companyId, docType, environment);
    if (state.next_query_at && new Date(state.next_query_at).getTime() > Date.now()) {
      const remaining = Math.max(1, Math.ceil((new Date(state.next_query_at).getTime() - Date.now()) / 60000));
      const prefix = state.last_cstat === 656
        ? 'A SEFAZ bloqueou temporariamente as consultas por Consumo Indevido.'
        : 'A consulta está no intervalo obrigatório após uma resposta sem documentos.';
      return {
        success: false,
        cStat: state.last_cstat || 0,
        xMotivo: `${prefix} Nenhuma nova chamada foi enviada. Tente novamente em ${remaining} minuto(s), às ${this.formatDateTime(state.next_query_at)}.`,
        ultNSU: state.last_nsu,
        maxNSU: state.max_nsu,
        documentsCount: 0,
        isComplete: false,
        rateLimitedUntil: state.next_query_at,
      };
    }

    const controller = new AbortController();
    this.activeQueries.set(operationKey, controller);
    const startedAt = new Date().toISOString();
    const initialNSU = state.last_nsu;
    let currentNSU = state.last_nsu;
    let maxNSU = state.max_nsu;
    let totalDocsReceived = 0;
    let lastCStat = 0;
    let lastReason = '';
    let finalHistoryStatus = 'SUCCESS';
    let finalError: string | undefined;
    const maxBatches = Math.max(1, Math.min(options?.maxBatches ?? 20, 100));

    this.distStateRepo.updateStatus(companyId, docType, 'RUNNING', undefined, environment);
    try {
      for (let batchCount = 0; batchCount < maxBatches; batchCount++) {
        this.throwIfAborted(controller.signal);
        onProgress?.({
          message: batchCount === 0
            ? `Iniciando consulta à SEFAZ no NSU ${currentNSU}...`
            : `Consultando próximo lote: NSU ${currentNSU} de ${maxNSU}...`,
          currentNSU,
          count: totalDocsReceived,
        });

        const request = {
          cnpj: company.cnpj,
          ultNSU: currentNSU,
          environment,
          thumbprint: cert.thumbprint,
          cUFAutor: company.uf,
          signal: controller.signal,
        };
        const response = docType === 'NFE'
          ? await this.fiscalProvider.distributeNFe(request)
          : await this.fiscalProvider.distributeCTe(request);
        this.throwIfAborted(controller.signal);

        lastCStat = response.cStat;
        lastReason = response.xMotivo;
        maxNSU = response.maxNSU;

        if (response.cStat === 138) {
          if (response.docs.length === 0) throw new Error('A SEFAZ retornou cStat 138 sem documentos no lote. O NSU foi preservado.');
          const parsedDocs = response.docs.map((rawDoc) => {
            const parsed = docType === 'NFE'
              ? this.nfeParser.parseDocumentXml(rawDoc.xmlContent, rawDoc.nsu, rawDoc.schema)
              : this.cteParser.parseDocumentXml(rawDoc.xmlContent, rawDoc.nsu, rawDoc.schema);
            if (!parsed) throw new Error(`Schema fiscal não reconhecido (${rawDoc.schema}, NSU ${rawDoc.nsu}). O NSU foi preservado.`);
            return parsed;
          });

          this.persistBatch(companyId, docType, environment, company, parsedDocs, response.ultNSU,
            response.maxNSU, settings.default_storage_path);
          const previousNSU = currentNSU;
          currentNSU = response.ultNSU;
          totalDocsReceived += parsedDocs.length;

          onProgress?.({
            message: `Lote processado: ${parsedDocs.length} documento(s). NSU ${currentNSU} de ${maxNSU}.`,
            currentNSU,
            count: totalDocsReceived,
          });
          if (compareNSU(currentNSU, maxNSU) >= 0 || compareNSU(currentNSU, previousNSU) <= 0) break;
          if (batchCount + 1 < maxBatches) await this.delay(1200, controller.signal);
          continue;
        }

        if (response.cStat === 137) {
          const nextQueryAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
          this.distStateRepo.updateNSU(companyId, docType, currentNSU, response.maxNSU, 'IDLE', undefined,
            environment, 137, nextQueryAt);
          finalHistoryStatus = 'NO_DOCS';
          onProgress?.({
            message: totalDocsReceived > 0
              ? `Sincronização concluída: ${totalDocsReceived} documento(s) arquivado(s).`
              : 'Nenhum documento novo localizado. A próxima consulta será liberada em uma hora.',
            currentNSU,
            count: totalDocsReceived,
          });
          break;
        }

        if (response.cStat === 656) {
          const nextQueryAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
          this.distStateRepo.updateStatus(companyId, docType, 'RATE_LIMITED', response.xMotivo,
            environment, 656, nextQueryAt);
          finalHistoryStatus = 'RATE_LIMITED';
          finalError = response.xMotivo;
          return {
            success: false,
            cStat: 656,
            xMotivo: `SEFAZ retornou Consumo Indevido: ${response.xMotivo}. O NSU local foi preservado. Esse limite vale para o CNPJ, inclusive consultas feitas por outros sistemas. Tente novamente após ${this.formatDateTime(nextQueryAt)}.`,
            ultNSU: currentNSU,
            maxNSU,
            documentsCount: totalDocsReceived,
            isComplete: false,
            rateLimitedUntil: nextQueryAt,
          };
        }

        finalHistoryStatus = 'ERROR';
        throw new Error(response.cStat === 589
          ? `A SEFAZ rejeitou o NSU informado (cStat 589): ${response.xMotivo}. Use “Resetar NSU” apenas se necessário.`
          : `A SEFAZ retornou uma rejeição (${response.cStat}): ${response.xMotivo}`);
      }

      const latestState = this.distStateRepo.getOrCreate(companyId, docType, environment);
      if (latestState.status === 'RUNNING') {
        this.distStateRepo.updateStatus(companyId, docType, 'IDLE', undefined, environment, lastCStat);
      }
      return {
        success: true,
        cStat: lastCStat,
        xMotivo: lastReason,
        ultNSU: currentNSU,
        maxNSU,
        documentsCount: totalDocsReceived,
        isComplete: compareNSU(currentNSU, maxNSU) >= 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      finalError = message;
      if (controller.signal.aborted) {
        finalHistoryStatus = 'CANCELLED';
        this.distStateRepo.updateStatus(companyId, docType, 'IDLE', undefined, environment);
        return {
          success: false,
          cStat: 0,
          xMotivo: 'Consulta cancelada pelo usuário.',
          ultNSU: currentNSU,
          maxNSU,
          documentsCount: totalDocsReceived,
          isComplete: false,
        };
      }
      const latestState = this.distStateRepo.getOrCreate(companyId, docType, environment);
      if (latestState.status !== 'RATE_LIMITED') {
        finalHistoryStatus = 'ERROR';
        this.distStateRepo.updateStatus(companyId, docType, 'ERROR', message, environment, lastCStat || undefined);
      }
      throw error;
    } finally {
      try {
        this.recordHistory(companyId, docType, environment, startedAt, initialNSU, currentNSU,
          totalDocsReceived, finalHistoryStatus, finalError);
      } finally {
        this.activeQueries.delete(operationKey);
      }
    }
  }

  public resetNSU(companyId: number, docType: DocumentType): void {
    const environment = this.settingsRepo.getSettings().sefaz_environment;
    if (this.activeQueries.has(`${companyId}:${docType}:${environment}`)) {
      throw new Error('Cancele a sincronização em andamento antes de resetar o NSU.');
    }
    this.distStateRepo.resetNSU(companyId, docType, environment);
  }

  private persistBatch(
    companyId: number,
    docType: DocumentType,
    environment: SefazEnvironment,
    company: NonNullable<ReturnType<CompanyRepository['findById']>>,
    documents: ParsedFiscalDocumentInfo[],
    lastNSU: string,
    maxNSU: string,
    configuredBasePath: string
  ): void {
    const pendingWrites: PendingFileWrite[] = [];
    try {
      this.db.transaction(() => {
        for (const doc of documents) {
          const pending = this.storageService.saveXmlTransactional(
            company, docType === 'NFE' ? 'NFe' : 'CTe', doc.access_key, doc.rawXml,
            doc.issue_date, doc.schema_type, configuredBasePath
          );
          pendingWrites.push(pending);
          this.docRepo.upsert({
            company_id: companyId,
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
            xml_path: pending.filePath,
            xml_status: 'XML_DISPONIVEL',
            pdf_status: 'PDF_INDISPONIVEL',
            situacao_fiscal: doc.situacao_fiscal,
          });
        }
        this.distStateRepo.updateNSU(companyId, docType, lastNSU, maxNSU, 'IDLE', undefined,
          environment, 138);
      });
      pendingWrites.forEach((write) => write.commit());
    } catch (error) {
      for (const write of pendingWrites.reverse()) {
        try { write.rollback(); } catch { /* preserva o erro original */ }
      }
      throw error;
    }
  }

  private recordHistory(
    companyId: number,
    docType: DocumentType,
    environment: SefazEnvironment,
    startedAt: string,
    beforeNSU: string,
    afterNSU: string,
    count: number,
    status: string,
    error?: string
  ): void {
    this.db.execute(
      `INSERT INTO query_history (
        company_id, document_type, environment, started_at, finished_at,
        last_nsu_before, last_nsu_after, documents_received, status, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [companyId, docType, environment, startedAt, new Date().toISOString(), beforeNSU,
        afterNSU, count, status, error || null]
    );
  }

  private throwIfAborted(signal: AbortSignal): void {
    if (signal.aborted) throw new Error('Consulta cancelada pelo usuário.');
  }

  private delay(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        clearTimeout(timer);
        reject(new Error('Consulta cancelada pelo usuário.'));
      };
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  private formatDate(value: string): string {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('pt-BR');
  }

  private formatDateTime(value: string): string {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('pt-BR');
  }

  private cancelledResult(companyId: number, documentType: DocumentType): SefazQueryResult {
    const environment = this.settingsRepo.getSettings().sefaz_environment;
    const state = this.distStateRepo.getOrCreate(companyId, documentType, environment);
    return {
      success: false,
      cStat: 0,
      xMotivo: 'Consulta cancelada pelo usuário antes desta etapa.',
      ultNSU: state.last_nsu,
      maxNSU: state.max_nsu,
      documentsCount: 0,
      isComplete: false,
    };
  }
}
