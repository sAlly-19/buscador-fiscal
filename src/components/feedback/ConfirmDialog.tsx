import React, { useRef } from 'react';
import { TriangleAlert } from 'lucide-react';
import { DialogShell } from '../ui/DialogShell';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  variant: 'default' | 'danger';
  isBusy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel,
  variant,
  isBusy,
  onConfirm,
  onCancel,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = 'confirmation-dialog-title';

  return (
    <DialogShell isOpen={isOpen} titleId={titleId} onClose={onCancel} initialFocusRef={cancelRef} size="sm">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <TriangleAlert className={`mt-0.5 h-5 w-5 ${variant === 'danger' ? 'text-rose-500' : 'text-amber-500'}`} />
          <div>
            <h2 id={titleId} className="text-sm font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary,#475569)]">{description}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button ref={cancelRef} type="button" onClick={onCancel} disabled={isBusy} className="rounded-lg border px-4 py-2 text-xs font-semibold disabled:opacity-50">Cancelar</button>
          <button type="button" onClick={onConfirm} disabled={isBusy} className={`rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 ${variant === 'danger' ? 'bg-rose-600' : 'bg-blue-600'}`}>
            {isBusy ? 'Aguarde...' : confirmLabel}
          </button>
        </div>
      </div>
    </DialogShell>
  );
};
