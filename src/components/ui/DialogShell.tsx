import React, { RefObject, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useDialogFocus } from '../../hooks/useDialogFocus';

export interface DialogShellProps {
  isOpen: boolean;
  titleId: string;
  children: React.ReactNode;
  onClose: () => void;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export const DialogShell: React.FC<DialogShellProps> = ({
  isOpen,
  titleId,
  children,
  onClose,
  closeOnBackdrop = true,
  closeOnEscape = true,
  initialFocusRef,
  size = 'md',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  useDialogFocus(isOpen, dialogRef, initialFocusRef, closeOnEscape ? onClose : undefined);

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          data-testid="dialog-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.15 }}
          onMouseDown={(event) => {
            if (closeOnBackdrop && event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={`w-full ${sizeClasses[size]} overflow-hidden rounded-xl border border-[var(--border-default,#334155)] bg-[var(--surface-panel,#fff)] text-[var(--text-primary,#0f172a)] shadow-2xl`}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.99 }}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
