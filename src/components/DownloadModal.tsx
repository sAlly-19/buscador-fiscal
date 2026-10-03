import React, { useState } from 'react';
import { X, Download, Folder, CheckCircle, AlertCircle } from 'lucide-react';
import { DownloadBatchResult } from '../../packages/domain/types';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  selectedDocIds: number[];
  defaultFolder?: string;
  onSuccess: (result: DownloadBatchResult) => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  selectedCount,
  selectedDocIds,
  defaultFolder,
  onSuccess,
}) => {
  const [includeXml, setIncludeXml] = useState(true);
  const [includePdf, setIncludePdf] = useState(true);
  const [destinationFolder, setDestinationFolder] = useState(defaultFolder || 'C:\\Documentos Fiscais');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectFolder = async () => {
    try {
      const folder = await window.fiscalApi?.settings.selectFolder('Selecione a Pasta de Destino do Download');
      if (folder) {
        setDestinationFolder(folder);
      }
    } catch {
      // Ignora
    }
  };

  const handleStartDownload = async () => {
    if (!includeXml && !includePdf) {
      setError('Selecione pelo menos um formato (XML ou PDF).');
      return;
    }
    if (!destinationFolder.trim()) {
      setError('Por favor, defina a pasta de destino.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await window.fiscalApi?.documents.downloadBatch({
        document_ids: selectedDocIds,
        include_xml: includeXml,
        include_pdf: includePdf,
        destination_folder: destinationFolder.trim(),
      });

      if (!result?.success) {
        setError(result?.error || 'Falha ao gerar lote de download.');
      } else {
        onSuccess(result);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Erro durante a exportação.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Download className="w-4 h-4 text-sky-600" />
            <span>Download em Massa ({selectedCount} selecionados)</span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-1 rounded hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-2">
              O que deseja baixar?
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded border border-slate-200 hover:bg-slate-50 transition">
                <input 
                  type="checkbox"
                  checked={includeXml}
                  onChange={(e) => setIncludeXml(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500" 
                />
                <span className="font-medium text-slate-800">Arquivos XML (Compactados em pasta XML/ no ZIP)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded border border-slate-200 hover:bg-slate-50 transition">
                <input 
                  type="checkbox"
                  checked={includePdf}
                  onChange={(e) => setIncludePdf(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500" 
                />
                <span className="font-medium text-slate-800">Documentos Auxiliares PDF (DANFE/DACTE na pasta PDF/)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Destino do Download:
            </label>
            <div className="flex gap-2">
              <input 
                type="text"
                value={destinationFolder}
                onChange={(e) => setDestinationFolder(e.target.value)}
                className="flex-1 border border-slate-300 rounded px-3 py-2 text-slate-800 text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white" 
              />
              <button 
                type="button"
                onClick={handleSelectFolder}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-semibold text-slate-700 flex items-center gap-1 transition"
              >
                <Folder className="w-3.5 h-3.5" />
                <span>Escolher pasta</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              O arquivo compactado .ZIP será gerado diretamente na pasta escolhida.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 transition font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleStartDownload}
            disabled={isProcessing || selectedCount === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-sky-600 hover:bg-sky-700 text-white font-semibold transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isProcessing ? 'Compactando...' : 'INICIAR DOWNLOAD'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
