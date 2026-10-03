import React from 'react';
import { Download } from 'lucide-react';

interface Props {
  selectedCount: number;
  totalOnPage: number;
  defaultStoragePath?: string;
  onOpenDownloadModal: () => void;
}

export const FooterDownloadBar: React.FC<Props> = ({ selectedCount, totalOnPage, defaultStoragePath, onOpenDownloadModal }) => (
  <footer className="h-14 px-5 border-t border-slate-200 bg-white flex items-center justify-between shrink-0 text-xs">
    <div className="text-slate-500 truncate pr-4">
      {selectedCount} de {totalOnPage} selecionado(s){defaultStoragePath ? ` · Destino padrão: ${defaultStoragePath}` : ''}
    </div>
    <button type="button" disabled={selectedCount === 0} onClick={onOpenDownloadModal}
      className="px-4 py-2 rounded bg-sky-600 text-white font-semibold flex items-center gap-2 disabled:opacity-40">
      <Download className="w-4 h-4" /> Baixar selecionados
    </button>
  </footer>
);
