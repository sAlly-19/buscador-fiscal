import React from 'react';
import { RefreshCw, StopCircle } from 'lucide-react';
import { DialogShell } from './ui/DialogShell';

interface SefazProgressModalProps {
  isOpen: boolean;
  companyName: string;
  docType: string;
  currentNSU?: string;
  message: string;
  receivedCount?: number;
  onCancel: () => void;
}

export const SefazProgressModal: React.FC<SefazProgressModalProps> = ({
  isOpen,
  companyName,
  docType,
  currentNSU,
  message,
  receivedCount,
  onCancel,
}) => {
  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onCancel}
      titleId="sefaz-progress-title"
      size="md"
      closeOnBackdrop={false}
      closeOnEscape={false}
    >
      <div className="p-6 text-center text-xs">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </div>

        <h3 id="sefaz-progress-title" className="mb-1 text-base font-bold text-[var(--text-primary)]">
          Consultando Distribuição SEFAZ...
        </h3>
        <p className="mb-4 text-[var(--text-muted)]">
          Conectando ao Web Service oficial do Ambiente Nacional via mTLS
        </p>

        <div className="mb-6 space-y-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-header)] p-3 text-left">
          <div className="flex justify-between">
            <span className="font-medium text-[var(--text-muted)]">Empresa:</span>
            <span className="font-semibold text-[var(--text-primary)]">{companyName}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-[var(--text-muted)]">Serviço:</span>
            <span className="font-semibold text-[var(--primary)]">{docType}</span>
          </div>
          {currentNSU && (
            <div className="flex justify-between">
              <span className="font-medium text-[var(--text-muted)]">NSU Atual:</span>
              <span className="font-mono font-semibold text-[var(--text-primary)]">{currentNSU}</span>
            </div>
          )}
          {receivedCount !== undefined && receivedCount > 0 && (
            <div className="mt-1.5 flex justify-between border-t border-[var(--border-subtle)] pt-1.5">
              <span className="font-medium text-[var(--text-muted)]">Documentos Recebidos:</span>
              <span className="font-bold text-[var(--success)]">{receivedCount}</span>
            </div>
          )}
          <div className="rounded border border-[var(--primary)]/20 bg-[var(--primary)]/10 p-2 text-[11px] italic text-[var(--primary)]">
            {message || 'Aguardando resposta do servidor da SEFAZ...'}
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[var(--danger)]/40 py-2.5 font-semibold text-[var(--danger)] transition hover:bg-[var(--danger)]/10"
        >
          <StopCircle className="h-4 w-4" />
          <span>CANCELAR CONSULTA</span>
        </button>
      </div>
    </DialogShell>
  );
};
