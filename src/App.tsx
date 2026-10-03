import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  FolderTree, 
  Plus, 
  Settings, 
  Download, 
  Search, 
  RefreshCw, 
  FileText, 
  ChevronRight, 
  ChevronDown,
  CheckSquare,
  Square,
  Award,
  AlertCircle,
  Eye,
  CheckCircle2,
  FolderOpen
} from 'lucide-react';
import { 
  Company, 
  FiscalDocument, 
  CertificateInfo, 
  AppSettings, 
  DocumentType,
  DownloadBatchResult
} from '../packages/domain/types';
import { formatCNPJ } from '../packages/domain/cnpj';
import { CompanyModal } from './components/CompanyModal';
import { CertificateModal } from './components/CertificateModal';
import { SettingsModal } from './components/SettingsModal';
import { DownloadModal } from './components/DownloadModal';
import { SefazProgressModal } from './components/SefazProgressModal';
import { DocumentDetailsModal } from './components/DocumentDetailsModal';

export default function App() {
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
    return d.toISOString().substring(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().substring(0, 10));
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

  // Consulta SEFAZ e Feedback
  const [isSefazModalOpen, setIsSefazModalOpen] = useState(false);
  const [sefazProgressMsg, setSefazProgressMsg] = useState('');
  const [sefazProgressNSU, setSefazProgressNSU] = useState('');
  const [sefazReceivedCount, setSefazReceivedCount] = useState<number | undefined>(undefined);
  const [activeConsultType, setActiveConsultType] = useState<'NF-e' | 'CT-e'>('NF-e');
  const [bannerAlert, setBannerAlert] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(null);

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
        loadCompanyContext(target);
      }
    } catch (err: any) {
      setBannerAlert({ type: 'error', message: err.message || 'Falha ao inicializar dados locais.' });
    }
  };

  const loadCompanyContext = async (company: Company) => {
    try {
      const [cert, status] = await Promise.all([
        window.fiscalApi?.certificates.getForCompany(company.id) || null,
        window.fiscalApi?.sefaz.getStatus(company.id) || { nfeLastNSU: '000000000000000', cteLastNSU: '000000000000000' },
      ]);
      setCompanyCert(cert);
      setNsuStatus(status);
      searchLocalDocuments(company.id, 1);
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
      setBannerAlert({ type: 'error', message: err.message });
    }
  };

  const searchLocalDocuments = useCallback(async (companyId?: number, page: number = 1) => {
    const targetCompanyId = companyId || activeCompany?.id;
    if (!targetCompanyId) return;

    setLoadingDocs(true);
    setBannerAlert(null);

    const docTypes: DocumentType[] = [];
    if (selectedDocTypes.nfe) docTypes.push('NFE');
    if (selectedDocTypes.cte) docTypes.push('CTE');

    try {
      const result = await window.fiscalApi?.documents.search({
        company_id: targetCompanyId,
        document_types: docTypes.length > 0 ? docTypes : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        access_key: searchQuery || undefined,
        document_number: searchQuery || undefined,
        issuer_cnpj_or_name: searchQuery || undefined,
        page,
        page_size: settings?.items_per_page || 50,
      });

      if (result) {
        setDocuments(result.items);
        setTotalDocs(result.total);
        setCurrentPage(result.page);
        setTotalPages(result.total_pages);
      }
    } catch (err: any) {
      setBannerAlert({ type: 'error', message: err.message || 'Falha ao buscar documentos locais.' });
    } finally {
      setLoadingDocs(false);
    }
  }, [activeCompany, selectedDocTypes, startDate, endDate, searchQuery, settings]);

  // Consulta SEFAZ Real
  const handleConsultSefaz = async (type: 'NF-e' | 'CT-e') => {
    if (!activeCompany) return;
    if (!companyCert) {
      setBannerAlert({
        type: 'error',
        message: 'Nenhum certificado associado a esta empresa. Por favor, vincule um certificado na barra lateral.',
      });
      setIsCertModalOpen(true);
      return;
    }
    if (companyCert.is_expired) {
      setBannerAlert({
        type: 'error',
        message: 'O certificado associado a esta empresa está expirado. Selecione um certificado válido.',
      });
      return;
    }

    setActiveConsultType(type);
    setIsSefazModalOpen(true);
    setSefazProgressMsg('Iniciando comunicação com a SEFAZ...');
    setSefazProgressNSU('');
    setSefazReceivedCount(undefined);

    // Escuta progresso do main process
    const unsubscribe = window.fiscalApi?.sefaz.onProgress((data) => {
      if (data.companyId === activeCompany.id) {
        setSefazProgressMsg(data.message);
        if (data.currentNSU) setSefazProgressNSU(data.currentNSU);
        if (data.count !== undefined) setSefazReceivedCount(data.count);
      }
    });

    try {
      const result = type === 'NF-e'
        ? await window.fiscalApi?.sefaz.consultNFe(activeCompany.id)
        : await window.fiscalApi?.sefaz.consultCTe(activeCompany.id);

      if (result?.success) {
        setBannerAlert({
          type: 'success',
          message: `Consulta SEFAZ concluída: ${result.documentsCount} documento(s) recebido(s). NSU Atualizado para ${result.ultNSU}.`,
        });
      } else {
        setBannerAlert({
          type: 'info',
          message: result?.xMotivo || 'Consulta finalizada.',
        });
      }

      // Atualiza contexto
      loadCompanyContext(activeCompany);
    } catch (err: any) {
      setBannerAlert({
        type: 'error',
        message: err.message || 'Falha na comunicação com a SEFAZ.',
      });
    } finally {
      unsubscribe?.();
      setIsSefazModalOpen(false);
    }
  };

  const handleCancelSefaz = async () => {
    if (activeCompany) {
      await window.fiscalApi?.sefaz.cancelQuery(activeCompany.id);
      setIsSefazModalOpen(false);
      setBannerAlert({ type: 'info', message: 'Solicitação de cancelamento enviada à SEFAZ.' });
    }
  };

  // Downloads Individuais
  const handleDownloadXml = async (docId: number) => {
    try {
      const res = await window.fiscalApi?.documents.downloadXml(docId);
      if (res?.success) {
        setBannerAlert({ type: 'success', message: `XML exportado com sucesso para: ${res.filePath}` });
      } else if (res?.error && res.error !== 'Operação cancelada.') {
        setBannerAlert({ type: 'error', message: res.error });
      }
    } catch (err: any) {
      setBannerAlert({ type: 'error', message: err.message });
    }
  };

  const handleDownloadPdf = async (docId: number) => {
    try {
      const res = await window.fiscalApi?.documents.downloadPdf(docId);
      if (res?.success) {
        setBannerAlert({ type: 'success', message: `PDF exportado com sucesso para: ${res.filePath}` });
      } else if (res?.error && res.error !== 'Operação cancelada.') {
        setBannerAlert({ type: 'error', message: res.error });
      }
    } catch (err: any) {
      setBannerAlert({ type: 'error', message: err.message });
    }
  };

  const handleOpenFolder = async (filePath: string) => {
    await window.fiscalApi?.documents.openFileFolder(filePath);
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

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 font-sans text-slate-800 text-xs">
      {/* 1. HEADER SUPERIOR */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shadow-xs select-none">
        <div className="flex items-center space-x-3">
          <div className="bg-sky-600 text-white p-2 rounded-md font-bold text-sm tracking-wider flex items-center gap-1.5 shadow-xs">
            <FileText className="w-4 h-4" />
            <span>GESTOR FISCAL DFe</span>
          </div>

          {settings?.sefaz_environment === 'homologation' ? (
            <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800 border border-amber-300">
              AMBIENTE DE HOMOLOGAÇÃO
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              AMBIENTE DE PRODUÇÃO
            </span>
          )}
        </div>

        {/* Seletor Central da Empresa Ativa */}
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-slate-500" />
          <select 
            value={activeCompany?.id || ''}
            onChange={(e) => handleSelectCompany(Number(e.target.value))}
            className="bg-slate-50 border border-slate-300 text-slate-800 text-sm font-semibold rounded-md px-3 py-1.5 focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-xs cursor-pointer min-w-[280px]"
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({formatCNPJ(c.cnpj)})
              </option>
            ))}
          </select>
        </div>

        {/* Configurações */}
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
            title="Configurações do Sistema"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Banner de Feedback / Erros */}
      {bannerAlert && (
        <div className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
          bannerAlert.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : bannerAlert.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-sky-50 border-sky-200 text-sky-800'
        }`}>
          <div className="flex items-center gap-2">
            {bannerAlert.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            )}
            <span>{bannerAlert.message}</span>
          </div>
          <button 
            onClick={() => setBannerAlert(null)}
            className="font-bold hover:opacity-75 text-sm ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* 2. CORPO PRINCIPAL */}
      <div className="flex flex-1 overflow-hidden">
        {/* BARRA LATERAL ESQUERDA */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col justify-between select-none">
          <div className="p-3 border-b border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Empresas</span>
              <button 
                onClick={() => {
                  setEditingCompany(null);
                  setIsCompanyModalOpen(true);
                }}
                className="text-xs flex items-center gap-1 text-sky-600 hover:text-sky-800 font-semibold px-2 py-1 rounded hover:bg-sky-50 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova empresa</span>
              </button>
            </div>

            {/* Árvore de Empresas */}
            <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
              {companies.map(company => {
                const isActive = activeCompany?.id === company.id;
                return (
                  <div key={company.id} className="text-xs">
                    <button
                      onClick={() => handleSelectCompany(company.id)}
                      className={`w-full text-left px-2.5 py-2 rounded-md font-medium flex items-center justify-between transition ${
                        isActive 
                          ? 'bg-sky-50 text-sky-900 border border-sky-200 font-semibold' 
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Building2 className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                        <span className="truncate">{company.name}</span>
                      </div>
                      {isActive ? (
                        <ChevronDown className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      )}
                    </button>

                    {isActive && (
                      <div className="ml-5 mt-1 pl-2 border-l border-slate-200 space-y-1">
                        <div 
                          onClick={() => {
                            setSelectedDocTypes({ nfe: true, cte: false });
                            searchLocalDocuments(company.id);
                          }}
                          className="flex items-center gap-1.5 py-1 px-2 text-slate-700 hover:bg-slate-100 rounded cursor-pointer font-medium"
                        >
                          <FolderTree className="w-3 h-3 text-sky-500" />
                          <span>NF-e</span>
                        </div>
                        <div 
                          onClick={() => {
                            setSelectedDocTypes({ nfe: false, cte: true });
                            searchLocalDocuments(company.id);
                          }}
                          className="flex items-center gap-1.5 py-1 px-2 text-slate-700 hover:bg-slate-100 rounded cursor-pointer font-medium"
                        >
                          <FolderTree className="w-3 h-3 text-purple-500" />
                          <span>CT-e</span>
                        </div>
                        <div 
                          onClick={() => {
                            setSelectedDocTypes({ nfe: true, cte: true });
                            searchLocalDocuments(company.id);
                          }}
                          className="flex items-center gap-1.5 py-1 px-2 text-slate-500 hover:bg-slate-100 rounded cursor-pointer"
                        >
                          <span>└ Ver Todos</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rodapé da Sidebar: Info do Certificado da Empresa Ativa */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs">
            <div className="font-semibold text-slate-800 truncate">{activeCompany?.name}</div>
            <div className="text-slate-500 font-mono mt-0.5">CNPJ: {formatCNPJ(activeCompany?.cnpj || '')}</div>

            {companyCert ? (
              <div 
                onClick={() => setIsCertModalOpen(true)}
                className="mt-2 p-2 rounded bg-white border border-slate-200 hover:border-sky-300 transition cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Award className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="truncate font-semibold text-slate-700">Certificado Vinculado</span>
                </div>
                <span className="text-[10px] text-sky-600 font-bold hover:underline">Trocar</span>
              </div>
            ) : (
              <button
                onClick={() => setIsCertModalOpen(true)}
                className="mt-2 w-full p-2 rounded bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 transition font-semibold flex items-center justify-center gap-1.5 text-[11px]"
              >
                <Award className="w-4 h-4 text-amber-600" />
                <span>Associar Certificado</span>
              </button>
            )}
          </div>
        </aside>

        {/* CONTEÚDO PRINCIPAL: DOCUMENTOS E FILTROS */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {/* Painel Superior de Filtros */}
          <div className="p-4 bg-white border-b border-slate-200 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">Documentos Fiscais Eletrônicos</h2>
              <div className="text-xs text-slate-500 flex items-center gap-3">
                <div>
                  NSU NF-e: <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{nsuStatus.nfeLastNSU}</span>
                </div>
                <div>
                  CT-e: <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{nsuStatus.cteLastNSU}</span>
                </div>
              </div>
            </div>

            {/* Linha de Filtros */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {/* Seleção de Tipo */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded border border-slate-200">
                <label className="flex items-center gap-1 cursor-pointer px-2 py-1 rounded select-none font-semibold text-slate-700 hover:bg-white transition">
                  <input 
                    type="checkbox" 
                    checked={selectedDocTypes.nfe}
                    onChange={(e) => setSelectedDocTypes(prev => ({ ...prev, nfe: e.target.checked }))}
                    className="rounded text-sky-600" 
                  />
                  <span>NF-e</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer px-2 py-1 rounded select-none font-semibold text-slate-700 hover:bg-white transition">
                  <input 
                    type="checkbox" 
                    checked={selectedDocTypes.cte}
                    onChange={(e) => setSelectedDocTypes(prev => ({ ...prev, cte: e.target.checked }))}
                    className="rounded text-purple-600" 
                  />
                  <span>CT-e</span>
                </label>
              </div>

              {/* Período */}
              <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1.5 rounded border border-slate-200">
                <span className="font-semibold text-slate-600">Período:</span>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-0.5 text-slate-800 bg-white" 
                />
                <span className="text-slate-400">até</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-0.5 text-slate-800 bg-white" 
                />
              </div>

              {/* Pesquisa por Texto */}
              <div className="flex-1 min-w-[200px] max-w-[320px]">
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchLocalDocuments()}
                  placeholder="Buscar por Chave, Número ou Emitente..."
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" 
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-2 ml-auto">
                <button 
                  onClick={() => searchLocalDocuments()}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-3 py-1.5 rounded-md border border-slate-300 transition shadow-xs"
                >
                  <Search className="w-3.5 h-3.5 text-slate-600" />
                  <span>Buscar localmente</span>
                </button>

                <div className="flex items-center rounded-md shadow-xs">
                  <button 
                    onClick={() => handleConsultSefaz('NF-e')}
                    className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold px-3 py-1.5 rounded-l-md transition border-r border-sky-700"
                    title="Consultar distribuição de NF-e na SEFAZ"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Consultar SEFAZ (NF-e)</span>
                  </button>
                  <button 
                    onClick={() => handleConsultSefaz('CT-e')}
                    className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-2.5 py-1.5 rounded-r-md transition"
                    title="Consultar distribuição de CT-e na SEFAZ"
                  >
                    <span>CT-e</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* TABELA DE DOCUMENTOS */}
          <div className="flex-1 overflow-auto p-4">
            <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider select-none">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <button onClick={toggleSelectAll} className="text-slate-500 hover:text-slate-800">
                        {selectedDocIds.length > 0 && selectedDocIds.length === documents.length ? (
                          <CheckSquare className="w-4 h-4 text-sky-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Número / Série</th>
                    <th className="py-2.5 px-3">Emissão</th>
                    <th className="py-2.5 px-3">Emitente / CNPJ</th>
                    <th className="py-2.5 px-3">Valor</th>
                    <th className="py-2.5 px-3 text-center">Armazenamento</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingDocs ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-600 mb-2" />
                        <span>Carregando documentos locais...</span>
                      </td>
                    </tr>
                  ) : documents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-700">Nenhum documento encontrado para este filtro.</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Utilize o botão "Consultar SEFAZ" para buscar novos documentos fiscais no Ambiente Nacional.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => {
                      const isSelected = selectedDocIds.includes(doc.id);
                      const hasXml = doc.xml_status === 'XML_DISPONIVEL';
                      const hasPdf = doc.pdf_status === 'PDF_DISPONIVEL';
                      const formattedDate = doc.issue_date 
                        ? new Date(doc.issue_date).toLocaleDateString('pt-BR') 
                        : '-';
                      const formattedVal = doc.total_value 
                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(doc.total_value) 
                        : 'R$ 0,00';

                      return (
                        <tr 
                          key={doc.id}
                          className={`hover:bg-slate-50 transition cursor-pointer ${isSelected ? 'bg-sky-50/60' : ''}`}
                        >
                          <td className="py-2.5 px-3 text-center" onClick={() => toggleSelectDoc(doc.id)}>
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-sky-600 mx-auto" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 mx-auto" />
                            )}
                          </td>

                          <td className="py-2.5 px-3 font-semibold text-slate-800" onClick={() => setSelectedDetailsDoc(doc)}>
                            <span className={`px-2 py-0.5 rounded text-[11px] ${
                              doc.document_type === 'NFE' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {doc.document_type === 'NFE' ? 'NF-e' : 'CT-e'}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 font-mono font-medium text-slate-700" onClick={() => setSelectedDetailsDoc(doc)}>
                            {doc.document_number || 'Resumo'} <span className="text-slate-400">/ {doc.series || '-'}</span>
                          </td>

                          <td className="py-2.5 px-3 text-slate-600" onClick={() => setSelectedDetailsDoc(doc)}>
                            {formattedDate}
                          </td>

                          <td className="py-2.5 px-3" onClick={() => setSelectedDetailsDoc(doc)}>
                            <div className="font-medium text-slate-800 truncate max-w-[240px]">{doc.issuer_name || 'Emitente'}</div>
                            <div className="text-slate-400 font-mono text-[11px]">{formatCNPJ(doc.issuer_cnpj || '')}</div>
                          </td>

                          <td className="py-2.5 px-3 font-semibold text-slate-700" onClick={() => setSelectedDetailsDoc(doc)}>
                            {formattedVal}
                          </td>

                          <td className="py-2.5 px-3 text-center" onClick={() => setSelectedDetailsDoc(doc)}>
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
                              <span className={hasXml ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                                XML {hasXml ? '✓' : '✗'}
                              </span>
                              <span className="text-slate-300">|</span>
                              <span className={hasPdf ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                                PDF {hasPdf ? '✓' : '✗'}
                              </span>
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-right space-x-1">
                            <button 
                              onClick={() => setSelectedDetailsDoc(doc)}
                              className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200 transition"
                              title="Ver Detalhes do Documento"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDownloadXml(doc.id)}
                              disabled={!hasXml}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium text-[11px] border border-slate-300 transition disabled:opacity-40"
                              title="Baixar XML"
                            >
                              XML
                            </button>
                            <button 
                              onClick={() => handleDownloadPdf(doc.id)}
                              disabled={!hasPdf}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium text-[11px] border border-slate-300 transition disabled:opacity-40"
                              title="Baixar PDF"
                            >
                              PDF
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Paginação */}
              {totalDocs > 0 && (
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span>
                    Exibindo <strong>{documents.length}</strong> de <strong>{totalDocs}</strong> documentos
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => searchLocalDocuments(undefined, Math.max(1, currentPage - 1))}
                      disabled={currentPage <= 1}
                      className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition font-medium"
                    >
                      Anterior
                    </button>
                    <span className="px-2 font-semibold">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => searchLocalDocuments(undefined, Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage >= totalPages}
                      className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition font-medium"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* 3. BARRA INFERIOR DE DOWNLOAD */}
      <footer className="h-14 bg-white border-t border-slate-200 px-4 flex items-center justify-between shadow-xs select-none">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsDownloadModalOpen(true)}
            disabled={selectedDocIds.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-xs tracking-wider uppercase transition shadow-xs ${
              selectedDocIds.length > 0 
                ? 'bg-sky-600 hover:bg-sky-700 text-white cursor-pointer' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>DOWNLOAD SELECIONADOS</span>
          </button>
          <span className="text-xs text-slate-600 font-medium">
            <strong className="text-sky-700 font-bold">{selectedDocIds.length}</strong> de {documents.length} selecionados
          </span>
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span>Pasta padrão:</span>
          <span className="font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200 truncate max-w-[350px]">
            {settings?.default_storage_path || 'data/documents'}
          </span>
        </div>
      </footer>

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
        onSaved={(s) => setSettings(s)}
      />

      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        selectedCount={selectedDocIds.length}
        selectedDocIds={selectedDocIds}
        defaultFolder={settings?.default_storage_path}
        onSuccess={(res: DownloadBatchResult) => {
          setBannerAlert({
            type: 'success',
            message: `Arquivo ZIP com ${res.copied_files_count} documento(s) gerado com sucesso em: ${res.zip_path}`,
          });
          setSelectedDocIds([]);
        }}
      />

      <SefazProgressModal
        isOpen={isSefazModalOpen}
        companyName={activeCompany?.name || ''}
        docType={activeConsultType}
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
    </div>
  );
}
