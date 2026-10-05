import React, { useState } from 'react';
import { X, Download, Folder, AlertCircle } from 'lucide-react';
import { DownloadBatchResult } from '../../packages/domain/types';
import { DialogShell } from './ui/DialogShell';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: number;
  selectedCount: number;
  selectedDocIds: number[];
  defaultFolder?: string;
  onSuccess: (result: DownloadBatchResult) => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  companyId,
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
        company_id: companyId,
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
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      titleId="download-modal-title"
      size="md"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-header)] px-5 py-3.5 select-none">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
          <Download className="h-4 w-4 text-[var(--primary)]" />
          <span id="download-modal-title">Download em Massa ({selectedCount} selecionados)</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="rounded p-1 text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 p-5 text-xs">
        {error && (
          <div className="flex items-start gap-2 rounded-md border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3 text-[var(--danger)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="mb-2 block font-semibold text-[var(--text-primary)]">
            Arquivos a Incluir no Pacote:
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 transition ${
                includeXml
                  ? 'border-[var(--primary)] bg-[var(--surface-selected)] text-[var(--text-primary)]'
                  : 'border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)]'
              }`}
            >
              <input
                type="checkbox"
                checked={includeXml}
                onChange={(e) => setIncludeXml(e.target.checked)}
                className="rounded border-[var(--border-default)] text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              <div>
                <span className="font-bold">Arquivos XML</span>
                <span className="block text-[10px] text-[var(--text-muted)]">Documentos oficiais em XML</span>
              </div>
            </label>

            <label
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 transition ${
                includePdf
                  ? 'border-[var(--primary)] bg-[var(--surface-selected)] text-[var(--text-primary)]'
                  : 'border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)]'
              }`}
            >
              <input
                type="checkbox"
                checked={includePdf}
                onChange={(e) => setIncludePdf(e.target.checked)}
                className="rounded border-[var(--border-default)] text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              <div>
                <span className="font-bold">Documentos PDF</span>
                <span className="block text-[10px] text-[var(--text-muted)]">DANFE e DACTE gerados</span>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label className="mb-1 block font-semibold text-[var(--text-primary)]">
            Pasta de Destino para o Arquivo ZIP:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={destinationFolder}
              onChange={(e) => setDestinationFolder(e.target.value)}
              className="flex-1 rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 font-mono text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
            <button
              type="button"
              onClick={handleSelectFolder}
              className="flex items-center gap-1.5 rounded border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus:outline-none"
            >
              <Folder className="h-4 w-4 text-[var(--primary)]" />
              <span>Alterar</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-header)] p-4 select-none">
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleStartDownload}
          disabled={isProcessing}
          className="rounded bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50"
        >
          {isProcessing ? 'Gerando Pacote...' : 'Iniciar Download'}
        </button>
      </div>
    </DialogShell>
  );
};
