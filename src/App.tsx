import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Company, 
  FiscalDocument, 
  CertificateInfo, 
  AppSettings, 
  DocumentType,
  DownloadBatchResult
} from '../packages/domain/types';
import { AppShell } from './components/layout/AppShell';
import { AppHeader } from './components/layout/AppHeader';
import { FeedbackModalHost } from './components/feedback/FeedbackModalHost';
import { ConfirmDialog } from './components/feedback/ConfirmDialog';
import { CompanyList } from './components/Sidebar/CompanyList';
import { CertificateCard } from './components/Sidebar/CertificateCard';
import { FilterBar } from './components/FilterBar';
import { DocumentTable } from './components/DocumentTable/DocumentTable';
import { FooterDownloadBar } from './components/FooterDownloadBar';
import { CompanyModal } from './components/CompanyModal';
import { CertificateModal } from './components/CertificateModal';
import { SettingsModal } from './components/SettingsModal';
import { DownloadModal } from './components/DownloadModal';
import { SefazProgressModal } from './components/SefazProgressModal';
import { DocumentDetailsModal } from './components/DocumentDetailsModal';
import { presentAfterRefresh } from '../packages/domain/sync-result';
import { normalizePageSize, PageSize } from '../packages/domain/page-size';
import { changePageSize } from './features/documents/page-size-controller';
import { FeedbackInput, useUiStore } from './stores/ui.store';
import { feedbackFromError, feedbackFromSyncResult } from './features/feedback/feedback-adapters';

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function App() {
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const pushFeedback = useUiStore((state) => state.pushFeedback);
  const companyContextRequest = useRef(0);
  const documentSearchRequest = useRef(0);
  // Estados principais
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [companyCert, setCompanyCert] = useState<CertificateInfo | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [nsuStatus, setNsuStatus] = useState<{ nfeLastNSU: string; cteLastNSU: string }>({
    nfeLastNSU: '000000000000000',
    cteLastNSU: '000000000000000',
  });

  // Filtros locais
  const [selectedDocTypes, setSelectedDocTypes] = useState<{ nfe: boolean; cte: boolean }>({ nfe: true, cte: true });
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return formatLocalDate(d);
  });
  const [endDate, setEndDate] = useState(() => formatLocalDate(new Date()));
  const [searchQuery, setSearchQuery] = useState('');

  // Tabela e Paginação
  const [documents, setDocuments] = useState<FiscalDocument[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Modais
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [selectedDetailsDoc, setSelectedDetailsDoc] = useState<FiscalDocument | null>(null);
  const [pendingNsuReset, setPendingNsuReset] = useState<'NFE' | 'CTE' | null>(null);
  const [isResettingNsu, setIsResettingNsu] = useState(false);

  // Consulta SEFAZ e Feedback
  const [isSefazModalOpen, setIsSefazModalOpen] = useState(false);
  const [sefazProgressMsg, setSefazProgressMsg] = useState('');
  const [sefazProgressNSU, setSefazProgressNSU] = useState('');
  const [sefazReceivedCount, setSefazReceivedCount] = useState<number | undefined>(undefined);
  const [activeConsultType, setActiveConsultType] = useState<'NF-e' | 'CT-e'>('NF-e');

  // Carregamento inicial
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [allCompanies, active, curSettings] = await Promise.all([
        window.fiscalApi?.companies.list() || [],
        window.fiscalApi?.companies.getActive() || null,
        window.fiscalApi?.settings.get() || null,
      ]);

      setCompanies(allCompanies);
      setActiveCompany(active || allCompanies[0] || null);
      setSettings(curSettings);

      if (active || allCompanies[0]) {
        const target = active || allCompanies[0];
        loadCompanyContext(target, curSettings || undefined);
      }
    } catch (err: any) {
      pushFeedback(feedbackFromError('Falha ao iniciar o aplicativo', err, 'Falha ao inicializar dados locais.'));
    }
  };

  const loadCompanyContext = async (company: Company, settingsOverride?: AppSettings) => {
    const requestId = ++companyContextRequest.current;
    try {
      const [cert, status] = await Promise.all([
        window.fiscalApi?.certificates.getForCompany(company.id) || null,
        window.fiscalApi?.sefaz.getStatus(company.id) || { nfeLastNSU: '000000000000000', cteLastNSU: '000000000000000' },
      ]);
      if (requestId !== companyContextRequest.current) return;
      setCompanyCert(cert);
      setNsuStatus(status);
      await searchLocalDocuments(company.id, 1, undefined, settingsOverride?.items_per_page);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSelectCompany = async (companyId: number) => {
    try {
      const selected = await window.fiscalApi?.companies.selectActive(companyId);
      if (selected) {
        setActiveCompany(selected);
        setSelectedDocIds([]);
        loadCompanyContext(selected);
      }
    } catch (err: any) {
      pushFeedback(feedbackFromError('Falha ao selecionar empresa', err, 'Não foi possível selecionar a empresa.'));
    }
  };

  const searchLocalDocuments = useCallback(async (
    companyId?: number,
    page: number = 1,
    typeOverride?: { nfe: boolean; cte: boolean },
    pageSizeOverride?: number
  ) => {
    const targetCompanyId = companyId || activeCompany?.id;
    if (!targetCompanyId) return;
    const requestId = ++documentSearchRequest.current;

    setLoadingDocs(true);

    const docTypes: DocumentType[] = [];
    const effectiveTypes = typeOverride || selectedDocTypes;
    if (effectiveTypes.nfe) docTypes.push('NFE');
    if (effectiveTypes.cte) docTypes.push('CTE');

    try {
      const result = await window.fiscalApi?.documents.search({
        company_id: targetCompanyId,
        document_types: docTypes.length > 0 ? docTypes : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search_query: searchQuery || undefined,
        page,
        page_size: pageSizeOverride || settings?.items_per_page || 50,
      });

      if (result && requestId === documentSearchRequest.current) {
        setDocuments(result.items);
        setTotalDocs(result.total);
        setCurrentPage(result.page);
        setTotalPages(result.total_pages);
      }
    } catch (err: any) {
      if (requestId === documentSearchRequest.current) {
        pushFeedback(feedbackFromError('Falha ao buscar documentos', err, 'Falha ao buscar documentos locais.'));
      }
    } finally {
      if (requestId === documentSearchRequest.current) setLoadingDocs(false);
    }
  }, [activeCompany, selectedDocTypes, startDate, endDate, searchQuery, settings]);

  // Consulta SEFAZ Real
  const handleConsultSefaz = async () => {
    if (!activeCompany) return;
    if (!companyCert) {
      pushFeedback({
        kind: 'error',
        title: 'Certificado digital ausente',
        message: 'Nenhum certificado associado a esta empresa. Por favor, vincule um certificado na barra lateral.',
      });
      setIsCertModalOpen(true);
      return;
    }
    if (companyCert.is_expired) {
      pushFeedback({
        kind: 'error',
        title: 'Certificado digital expirado',
        message: 'O certificado associado a esta empresa está expirado. Selecione um certificado válido.',
      });
      return;
    }

    setActiveConsultType('NF-e');
    setIsSefazModalOpen(true);
    setSefazProgressMsg('Iniciando comunicação com a SEFAZ...');
    setSefazProgressNSU('');
    setSefazReceivedCount(undefined);

    // Escuta progresso do main process
    const unsubscribe = window.fiscalApi?.sefaz.onProgress((data) => {
      if (data.companyId === activeCompany.id) {
        const stage = data.documentType === 'NFE' ? 'NF-e' : 'CT-e';
        setActiveConsultType(stage);
        setSefazProgressMsg(`${stage}: ${data.message}`);
        if (data.currentNSU) setSefazProgressNSU(data.currentNSU);
        if (data.count !== undefined) setSefazReceivedCount(data.count);
      }
    });

    let finalFeedback: FeedbackInput;

    try {
      const result = await window.fiscalApi?.sefaz.consultDocuments(activeCompany.id);

      if (result) {
        finalFeedback = feedbackFromSyncResult(result);
      } else {
        finalFeedback = {
          kind: 'info',
          title: 'Sincronização finalizada',
          message: 'Consulta finalizada sem resultado.',
        };
      }
    } catch (err: any) {
      finalFeedback = feedbackFromError(
        'Erro na sincronização',
        err,
        'Falha na comunicação com a SEFAZ.',
      );
    } finally {
      unsubscribe?.();
      setIsSefazModalOpen(false);
      // Sempre atualiza o contexto da empresa (NSU, status e documentos) mesmo em caso de erro ou bloqueio
      await presentAfterRefresh(
        () => loadCompanyContext(activeCompany),
        finalFeedback!,
        pushFeedback
      );
    }
  };

  const handleCancelSefaz = async () => {
    if (activeCompany) {
      await window.fiscalApi?.sefaz.cancelQuery(activeCompany.id);
      setIsSefazModalOpen(false);
      pushFeedback({
        kind: 'info',
        title: 'Cancelamento solicitado',
        message: 'Solicitação de cancelamento enviada à SEFAZ.',
      });
    }
  };

  const handleResetNSU = (docType: 'NFE' | 'CTE') => {
    if (activeCompany) setPendingNsuReset(docType);
  };

  const handleConfirmResetNSU = async () => {
    if (!activeCompany || !pendingNsuReset) return;
    const docType = pendingNsuReset;
    const label = docType === 'NFE' ? 'NF-e' : 'CT-e';
    setIsResettingNsu(true);
    try {
      await window.fiscalApi?.sefaz.resetNSU(activeCompany.id, docType);
      await loadCompanyContext(activeCompany);
      pushFeedback({
        kind: 'success',
        title: `NSU de ${label} resetado`,
        message: `NSU de ${label} resetado com sucesso para 000000000000000. Agora você pode clicar em Sincronizar para nova busca.`,
      });
    } catch (err: any) {
      pushFeedback(feedbackFromError('Falha ao resetar NSU', err, 'Falha ao resetar NSU.'));
    } finally {
      setIsResettingNsu(false);
      setPendingNsuReset(null);
    }
  };

  // Downloads Individuais
  const handleDownloadXml = async (docId: number) => {
    if (!activeCompany) return;
    try {
      const res = await window.fiscalApi?.documents.downloadXml({
        company_id: activeCompany.id,
        document_id: docId,
      });
      if (res?.success) {
        pushFeedback({ kind: 'success', title: 'XML exportado', message: `XML exportado com sucesso para: ${res.filePath}` });
      } else if (res?.error && res.error !== 'Operação cancelada.') {
        pushFeedback(feedbackFromError('Falha ao exportar XML', res.error, 'Não foi possível exportar o XML.'));
      }
    } catch (err: any) {
      pushFeedback(feedbackFromError('Falha ao exportar XML', err, 'Não foi possível exportar o XML.'));
    }
  };

  const handleDownloadPdf = async (docId: number) => {
    if (!activeCompany) return;
    try {
      const res = await window.fiscalApi?.documents.downloadPdf({
        company_id: activeCompany.id,
        document_id: docId,
      });
      if (res?.success) {
        pushFeedback({ kind: 'success', title: 'PDF exportado', message: `PDF exportado com sucesso para: ${res.filePath}` });
      } else if (res?.error && res.error !== 'Operação cancelada.') {
        pushFeedback(feedbackFromError('Falha ao exportar PDF', res.error, 'Não foi possível exportar o PDF.'));
      }
    } catch (err: any) {
      pushFeedback(feedbackFromError('Falha ao exportar PDF', err, 'Não foi possível exportar o PDF.'));
    }
  };

  const handleOpenFolder = async (filePath: string) => {
    if (!activeCompany) return;
    await window.fiscalApi?.documents.openFileFolder({
      company_id: activeCompany.id,
      file_path: filePath,
    });
  };

  const toggleSelectDoc = (id: number) => {
    setSelectedDocIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDocIds.length === documents.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(documents.map(d => d.id));
    }
  };

  const handlePageSizeChange = async (size: PageSize) => {
    try {
      await changePageSize(
        size,
        async (value) => {
          const updated = await window.fiscalApi.settings.update(value);
          setSettings(updated);
          return updated;
        },
        async (selectedSize) => {
          setSelectedDocIds([]);
          await searchLocalDocuments(undefined, 1, undefined, selectedSize);
        },
      );
    } catch (err: any) {
      pushFeedback(feedbackFromError('Falha ao alterar paginação', err, 'Falha ao alterar itens por página.'));
    }
  };

  return (
    <AppShell
      header={(
        <AppHeader
          activeCompany={activeCompany}
          environment={settings?.sefaz_environment || 'homologation'}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onSynchronize={handleConsultSefaz}
          isSynchronizing={isSefazModalOpen}
        />
      )}
      sidebar={(
        <aside className="flex w-72 shrink-0 select-none flex-col justify-between border-r border-[var(--border-subtle)] bg-[var(--surface-sidebar)]">
          <CompanyList
            companies={companies}
            activeCompany={activeCompany}
            onSelectCompany={handleSelectCompany}
            onNewCompany={() => {
              setEditingCompany(null);
              setIsCompanyModalOpen(true);
            }}
            onFilterNFeOnly={(id) => {
              const types = { nfe: true, cte: false };
              setSelectedDocTypes(types);
              searchLocalDocuments(id, 1, types);
            }}
            onFilterCTeOnly={(id) => {
              const types = { nfe: false, cte: true };
              setSelectedDocTypes(types);
              searchLocalDocuments(id, 1, types);
            }}
            onFilterAllTypes={(id) => {
              const types = { nfe: true, cte: true };
              setSelectedDocTypes(types);
              searchLocalDocuments(id, 1, types);
            }}
          />

          <CertificateCard
            activeCompany={activeCompany}
            companyCert={companyCert}
            onOpenCertModal={() => setIsCertModalOpen(true)}
          />
        </aside>
      )}
      toolbar={(
        <>
        {/* CONTEÚDO PRINCIPAL: DOCUMENTOS E FILTROS */}
          <FilterBar
            nsuStatus={nsuStatus}
            selectedDocTypes={selectedDocTypes}
            onToggleDocType={(type, checked) => setSelectedDocTypes(prev => ({ ...prev, [type]: checked }))}
            startDate={startDate}
            onStartDateChange={setStartDate}
            endDate={endDate}
            onEndDateChange={setEndDate}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearchLocal={() => searchLocalDocuments()}
            onResetNSU={handleResetNSU}
          />
        </>
      )}
      content={(
          <DocumentTable
            documents={documents}
            totalDocs={totalDocs}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={normalizePageSize(settings?.items_per_page)}
            selectedDocIds={selectedDocIds}
            loadingDocs={loadingDocs}
            onToggleSelectAll={toggleSelectAll}
            onToggleSelectDoc={toggleSelectDoc}
            onViewDetails={(doc) => setSelectedDetailsDoc(doc)}
            onDownloadXml={handleDownloadXml}
            onDownloadPdf={handleDownloadPdf}
            onPageChange={(page) => searchLocalDocuments(undefined, page)}
            onPageSizeChange={(size) => void handlePageSizeChange(size)}
          />
      )}

      footer={(
        <FooterDownloadBar
          selectedCount={selectedDocIds.length}
          totalOnPage={documents.length}
          defaultStoragePath={settings?.default_storage_path}
          onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
        />
      )}
      overlays={(
        <>

      {/* MODAIS DA APLICAÇÃO */}
      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        editingCompany={editingCompany}
        onSave={async (data) => {
          if (editingCompany) {
            await window.fiscalApi.companies.update({ id: editingCompany.id, ...data });
          } else {
            await window.fiscalApi.companies.create(data);
          }
          loadInitialData();
        }}
      />

      <CertificateModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        company={activeCompany}
        onAssociated={() => {
          if (activeCompany) loadCompanyContext(activeCompany);
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSaved={(s) => {
          setSettings(s);
          if (activeCompany) void loadCompanyContext(activeCompany, s);
        }}
      />

      {activeCompany && (
        <DownloadModal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          companyId={activeCompany.id}
          selectedCount={selectedDocIds.length}
          selectedDocIds={selectedDocIds}
          defaultFolder={settings?.default_storage_path}
          onSuccess={(res: DownloadBatchResult) => {
            pushFeedback({
              kind: 'success',
              title: 'Lote exportado',
              message: `Arquivo ZIP com ${res.copied_files_count} documento(s) gerado com sucesso em: ${res.zip_path}`,
            });
            setSelectedDocIds([]);
          }}
        />
      )}

      <SefazProgressModal
        isOpen={isSefazModalOpen}
        companyName={activeCompany?.name || ''}
        docType={`NF-e e CT-e · etapa ${activeConsultType}`}
        currentNSU={sefazProgressNSU}
        message={sefazProgressMsg}
        receivedCount={sefazReceivedCount}
        onCancel={handleCancelSefaz}
      />

      <DocumentDetailsModal
        isOpen={Boolean(selectedDetailsDoc)}
        onClose={() => setSelectedDetailsDoc(null)}
        document={selectedDetailsDoc}
        onDownloadXml={handleDownloadXml}
        onDownloadPdf={handleDownloadPdf}
        onOpenFolder={handleOpenFolder}
      />
      <ConfirmDialog
        isOpen={Boolean(pendingNsuReset)}
        title={`Resetar NSU de ${pendingNsuReset === 'CTE' ? 'CT-e' : 'NF-e'}`}
        description={`Deseja resetar o contador de NSU de ${pendingNsuReset === 'CTE' ? 'CT-e' : 'NF-e'} para 000000000000000? Os documentos já salvos localmente serão preservados e a próxima consulta à SEFAZ buscará todo o histórico disponível desde o início.`}
        confirmLabel="Resetar NSU"
        variant="danger"
        isBusy={isResettingNsu}
        onConfirm={() => void handleConfirmResetNSU()}
        onCancel={() => {
          if (!isResettingNsu) setPendingNsuReset(null);
        }}
      />
      <FeedbackModalHost />
        </>
      )}
    />
  );
}
