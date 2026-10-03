import React, { useState } from 'react';
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
  Square
} from 'lucide-react';

interface MockCompany {
  id: number;
  name: string;
  cnpj: string;
}

export default function App() {
  const [companies] = useState<MockCompany[]>([
    { id: 1, name: 'Empresa A - Foscampos', cnpj: '41.777.943/0001-02' },
    { id: 2, name: 'Empresa B - Superfertil', cnpj: '37.305.384/0001-60' },
  ]);
  const [activeCompanyId, setActiveCompanyId] = useState<number>(1);
  const [selectedDocTypes, setSelectedDocTypes] = useState<{ nfe: boolean; cte: boolean }>({ nfe: true, cte: true });
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2026-09-30');
  const [selectedDocs, setSelectedDocs] = useState<number[]>([1, 3]);

  const activeCompany = companies.find(c => c.id === activeCompanyId) || companies[0];

  const mockDocuments = [
    {
      id: 1,
      type: 'NF-e',
      number: '00012345',
      series: '1',
      date: '10/09/2026',
      issuer: 'Empresa Fornecedora XYZ Ltda',
      cnpj: '12.345.678/0001-90',
      value: 'R$ 14.520,00',
      xml: true,
      pdf: true,
      key: '35260912345678000190550010000123451000123456'
    },
    {
      id: 2,
      type: 'NF-e',
      number: '00012346',
      series: '1',
      date: '15/09/2026',
      issuer: 'Distribuidora Central do Brasil',
      cnpj: '98.765.432/0001-10',
      value: 'R$ 3.840,50',
      xml: true,
      pdf: false,
      key: '35260998765432000110550010000123461000123457'
    },
    {
      id: 3,
      type: 'CT-e',
      number: '00005432',
      series: '2',
      date: '20/09/2026',
      issuer: 'Transportes Rápidos TransBrasil',
      cnpj: '11.222.333/0001-44',
      value: 'R$ 1.250,00',
      xml: true,
      pdf: true,
      key: '35260911222333000144570020000054321000054321'
    }
  ];

  const toggleSelectDoc = (id: number) => {
    setSelectedDocs(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDocs.length === mockDocuments.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(mockDocuments.map(d => d.id));
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 font-sans text-slate-800">
      {/* 1. TOPO DA APLICAÇÃO */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shadow-sm select-none">
        <div className="flex items-center space-x-3">
          <div className="bg-sky-600 text-white p-2 rounded font-bold text-sm tracking-wider flex items-center gap-1.5 shadow-sm">
            <FileText className="w-4 h-4" />
            <span>GESTOR FISCAL DFe</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            HOMOLOGAÇÃO
          </span>
        </div>

        {/* Seletor Central de Empresa Ativa */}
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-slate-500" />
          <select 
            value={activeCompanyId}
            onChange={(e) => setActiveCompanyId(Number(e.target.value))}
            className="bg-slate-50 border border-slate-300 text-slate-800 text-sm font-semibold rounded-md px-3 py-1.5 focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-sm cursor-pointer"
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.cnpj})
              </option>
            ))}
          </select>
        </div>

        {/* Configurações */}
        <div className="flex items-center space-x-2">
          <button 
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
            title="Configurações do Sistema"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. CORPO PRINCIPAL */}
      <div className="flex flex-1 overflow-hidden">
        {/* BARRA LATERAL ESQUERDA: EMPRESAS E ESTRUTURA */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col justify-between">
          <div className="p-3 border-b border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Empresas</span>
              <button 
                className="text-xs flex items-center gap-1 text-sky-600 hover:text-sky-800 font-semibold px-2 py-1 rounded hover:bg-sky-50 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova empresa</span>
              </button>
            </div>

            {/* Árvore de Empresas */}
            <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-180px)] pr-1">
              {companies.map(company => {
                const isActive = company.id === activeCompanyId;
                return (
                  <div key={company.id} className="text-xs">
                    <button
                      onClick={() => setActiveCompanyId(company.id)}
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
                      {isActive ? <ChevronDown className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                    </button>

                    {isActive && (
                      <div className="ml-5 mt-1 pl-2 border-l border-slate-200 space-y-1">
                        <div className="flex items-center gap-1.5 py-1 px-2 text-slate-700 hover:bg-slate-100 rounded cursor-pointer font-medium">
                          <FolderTree className="w-3 h-3 text-sky-500" />
                          <span>NF-e (2026)</span>
                        </div>
                        <div className="flex items-center gap-1.5 py-1 px-2 text-slate-700 hover:bg-slate-100 rounded cursor-pointer font-medium">
                          <FolderTree className="w-3 h-3 text-sky-500" />
                          <span>CT-e (2026)</span>
                        </div>
                        <div className="flex items-center gap-1.5 py-1 px-2 text-slate-500 hover:bg-slate-100 rounded cursor-pointer">
                          <span>└ Arquivo Local</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rodapé da Sidebar: Info da Empresa */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
            <div className="font-semibold text-slate-800 truncate">{activeCompany.name}</div>
            <div className="text-slate-500 font-mono mt-0.5">CNPJ: {activeCompany.cnpj}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              Certificado A1 Vinculado
            </div>
          </div>
        </aside>

        {/* ÁREA CENTRAL DE DOCUMENTOS */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {/* Painel de Filtros e Ações */}
          <div className="p-4 bg-white border-b border-slate-200 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">Documentos Fiscais</h2>
              <div className="text-xs text-slate-500">
                NSU NF-e: <span className="font-mono font-semibold text-slate-700">000000000000042</span> | CT-e: <span className="font-mono font-semibold text-slate-700">000000000000010</span>
              </div>
            </div>

            {/* Linha de Filtros */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              {/* Seleção de Tipo */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Tipo:</span>
                <label className="flex items-center gap-1.5 cursor-pointer bg-slate-100 px-2 py-1 rounded border border-slate-300">
                  <input 
                    type="checkbox" 
                    checked={selectedDocTypes.nfe}
                    onChange={(e) => setSelectedDocTypes(prev => ({ ...prev, nfe: e.target.checked }))}
                    className="rounded text-sky-600" 
                  />
                  <span>NF-e</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer bg-slate-100 px-2 py-1 rounded border border-slate-300">
                  <input 
                    type="checkbox" 
                    checked={selectedDocTypes.cte}
                    onChange={(e) => setSelectedDocTypes(prev => ({ ...prev, cte: e.target.checked }))}
                    className="rounded text-sky-600" 
                  />
                  <span>CT-e</span>
                </label>
              </div>

              {/* Período */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Período:</span>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-slate-800 bg-white" 
                />
                <span className="text-slate-400">até</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-slate-800 bg-white" 
                />
              </div>

              {/* Botões Principais */}
              <div className="flex items-center gap-2 ml-auto">
                <button 
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-3 py-1.5 rounded-md border border-slate-300 transition shadow-xs"
                >
                  <Search className="w-3.5 h-3.5 text-slate-600" />
                  <span>Buscar localmente</span>
                </button>
                <button 
                  className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold px-3 py-1.5 rounded-md transition shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Consultar SEFAZ</span>
                </button>
              </div>
            </div>
          </div>

          {/* TABELA DE DOCUMENTOS */}
          <div className="flex-1 overflow-auto p-4">
            <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <button onClick={toggleSelectAll} className="text-slate-500 hover:text-slate-800">
                        {selectedDocs.length === mockDocuments.length ? (
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
                  {mockDocuments.map((doc) => {
                    const isSelected = selectedDocs.includes(doc.id);
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
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          <span className={`px-2 py-0.5 rounded text-[11px] ${doc.type === 'NF-e' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                            {doc.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                          {doc.number} <span className="text-slate-400">/ {doc.series}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{doc.date}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-800">{doc.issuer}</div>
                          <div className="text-slate-400 font-mono text-[11px]">{doc.cnpj}</div>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">{doc.value}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
                            <span className={doc.xml ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                              XML {doc.xml ? '✓' : '✗'}
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className={doc.pdf ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                              PDF {doc.pdf ? '✓' : '✗'}
                            </span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-1.5">
                          <button 
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium text-[11px] border border-slate-300 transition"
                            title="Baixar XML"
                          >
                            XML
                          </button>
                          <button 
                            disabled={!doc.pdf}
                            className={`px-2 py-1 rounded font-medium text-[11px] border transition ${
                              doc.pdf 
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 cursor-pointer' 
                                : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                            }`}
                            title="Baixar PDF / Documento Auxiliar"
                          >
                            PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* 3. BARRA INFERIOR DE DOWNLOAD */}
      <footer className="h-14 bg-white border-t border-slate-200 px-4 flex items-center justify-between shadow-xs select-none">
        <div className="flex items-center space-x-3">
          <button 
            disabled={selectedDocs.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-xs tracking-wider uppercase transition shadow-xs ${
              selectedDocs.length > 0 
                ? 'bg-sky-600 hover:bg-sky-700 text-white cursor-pointer' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>DOWNLOAD SELECIONADOS</span>
          </button>
          <span className="text-xs text-slate-600 font-medium">
            <strong className="text-sky-700 font-bold">{selectedDocs.length}</strong> de {mockDocuments.length} selecionados
          </span>
        </div>

        <div className="text-xs text-slate-500">
          Pasta padrão: <span className="font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">D:\Documentos Fiscais</span>
        </div>
      </footer>
    </div>
  );
}
