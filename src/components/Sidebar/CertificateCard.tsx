import React from 'react';
import { KeyRound, ShieldAlert, ShieldCheck } from 'lucide-react';
import { CertificateInfo, Company } from '../../../packages/domain/types';

export interface CertificateCardProps {
  activeCompany: Company | null;
  companyCert: CertificateInfo | null;
  onOpenCertModal: () => void;
}

export const CertificateCard: React.FC<CertificateCardProps> = ({
  activeCompany,
  companyCert,
  onOpenCertModal,
}) => {
  const isValid = companyCert && !companyCert.is_expired;

  return (
    <div className="m-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3 text-xs shadow-xs">
      <div className="mb-2 flex items-center gap-2 font-bold text-[var(--text-primary)]">
        <KeyRound className="h-4 w-4 text-[var(--primary)]" />
        <span>Certificado digital</span>
      </div>

      {!activeCompany ? (
        <p className="text-[var(--text-muted)]">Selecione uma empresa.</p>
      ) : companyCert ? (
        <div className="space-y-1">
          <p
            className={`flex items-center gap-1 font-semibold ${
              isValid ? 'text-[var(--success)]' : 'text-[var(--danger)]'
            }`}
          >
            {isValid ? (
              <ShieldCheck className="h-4 w-4" />
            ) : (
              <ShieldAlert className="h-4 w-4" />
            )}
            <span>{isValid ? 'Válido' : 'Expirado'}</span>
          </p>
          <p
            className="truncate font-mono text-[11px] text-[var(--text-secondary)]"
            title={companyCert.subject}
          >
            {companyCert.subject}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            Validade: {new Date(companyCert.valid_to).toLocaleDateString('pt-BR')}
          </p>
        </div>
      ) : (
        <p className="text-[var(--warning)]">Nenhum certificado associado.</p>
      )}

      <button
        type="button"
        disabled={!activeCompany}
        onClick={onOpenCertModal}
        className="mt-3 w-full rounded border border-[var(--border-default)] bg-[var(--surface-panel)] py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {companyCert ? 'Alterar certificado' : 'Associar certificado'}
      </button>
    </div>
  );
};
