import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Clipboard, Info, TriangleAlert, X } from 'lucide-react';
import { DialogShell } from '../ui/DialogShell';
import { FeedbackItem, formatFeedbackForClipboard } from '../../stores/ui.store';

interface Props {
  item: FeedbackItem;
  onClose: () => void;
}

const icons = {
  success: CheckCircle2,
  info: Info,
  warning: TriangleAlert,
  error: AlertCircle,
};

export const FeedbackDialog: React.FC<Props> = ({ item, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const Icon = icons[item.kind];
  const titleId = `feedback-title-${item.id}`;

  useEffect(() => setCopyStatus('idle'), [item.id]);

  const copyError = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard indisponível');
      await navigator.clipboard.writeText(formatFeedbackForClipboard(item));
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  };

  return (
    <DialogShell
      isOpen
      titleId={titleId}
      onClose={onClose}
      closeOnBackdrop={item.kind !== 'error'}
      initialFocusRef={closeRef}
      size="md"
    >
      <div className="flex items-start gap-3 border-b border-[var(--border-subtle,#e2e8f0)] px-5 py-4">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--state-accent,#2563eb)]" />
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-sm font-semibold">{item.title}</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary,#475569)]">{item.message}</p>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar" className="rounded p-1 text-[var(--text-muted,#64748b)] hover:bg-[var(--surface-hover,#f1f5f9)]">
          <X className="h-4 w-4" />
        </button>
      </div>
      {item.technicalDetails && (
        <div className="px-5 pt-4">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted,#64748b)]">Detalhes técnicos</div>
          <pre className="max-h-52 select-text overflow-auto whitespace-pre-wrap break-all rounded-lg border border-[var(--border-subtle,#e2e8f0)] bg-[var(--surface-inset,#f8fafc)] p-3 font-mono text-[11px]">{item.technicalDetails}</pre>
        </div>
      )}
      <div className="flex min-h-16 items-center justify-between gap-3 px-5 py-4">
        <div role="status" className="text-xs text-[var(--text-secondary,#475569)]">
          {copyStatus === 'copied' && 'Erro copiado.'}
          {copyStatus === 'failed' && 'Não foi possível copiar o erro.'}
        </div>
        <div className="flex gap-2">
          {item.kind === 'error' && (
            <button type="button" onClick={copyError} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-default,#cbd5e1)] px-3 py-2 text-xs font-semibold">
              <Clipboard className="h-3.5 w-3.5" /> Copiar erro
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500">
            Fechar
          </button>
        </div>
      </div>
    </DialogShell>
  );
};
