import React from 'react';
import { Building2, FileStack, Plus } from 'lucide-react';
import { Company } from '../../../packages/domain/types';
import { formatCNPJ } from '../../../packages/domain/cnpj';
import { getUfAcronym } from '../../../packages/domain/uf';

export interface CompanyListProps {
  companies: Company[];
  activeCompany: Company | null;
  onSelectCompany: (id: number) => void;
  onNewCompany: () => void;
  onFilterNFeOnly: (id: number) => void;
  onFilterCTeOnly: (id: number) => void;
  onFilterAllTypes: (id: number) => void;
}

export const CompanyList: React.FC<CompanyListProps> = ({
  companies,
  activeCompany,
  onSelectCompany,
  onNewCompany,
  onFilterNFeOnly,
  onFilterCTeOnly,
  onFilterAllTypes,
}) => (
  <div className="flex-1 overflow-y-auto p-3">
    <div className="mb-3 flex items-center justify-between">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
        Empresas
      </span>
      <button
        type="button"
        onClick={onNewCompany}
        className="rounded border border-[var(--border-subtle)] bg-[var(--surface-card)] p-1 text-[var(--primary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--primary-hover)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
        aria-label="Nova empresa"
        title="Cadastrar nova empresa"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>

    {companies.length === 0 && (
      <p className="rounded border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3 text-xs text-[var(--text-muted)]">
        Cadastre uma empresa para começar.
      </p>
    )}

    <div className="space-y-1.5">
      {companies.map((company) => {
        const isActive = activeCompany?.id === company.id;
        return (
          <div
            key={company.id}
            className={`rounded-md border p-2.5 transition ${
              isActive
                ? 'border-[var(--primary)] bg-[var(--surface-selected)] text-[var(--text-primary)] shadow-xs'
                : 'border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            <button
              type="button"
              className="w-full text-left focus:outline-none"
              onClick={() => onSelectCompany(company.id)}
            >
              <div className="flex items-center gap-2">
                <Building2 className={`h-4 w-4 shrink-0 ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`} />
                <span
                  className="truncate text-xs font-semibold"
                  title={company.name}
                >
                  {company.name}
                </span>
              </div>
              <span className="mt-1 block text-[11px] text-[var(--text-muted)]">
                {formatCNPJ(company.cnpj)} · {getUfAcronym(company.uf)}
              </span>
            </button>

            {isActive && (
              <div className="mt-2.5 grid grid-cols-3 gap-1 border-t border-[var(--border-subtle)] pt-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => onFilterNFeOnly(company.id)}
                  className="rounded border border-[var(--border-subtle)] bg-[var(--surface-panel)] py-1 font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
                >
                  NF-e
                </button>
                <button
                  type="button"
                  onClick={() => onFilterCTeOnly(company.id)}
                  className="rounded border border-[var(--border-subtle)] bg-[var(--surface-panel)] py-1 font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
                >
                  CT-e
                </button>
                <button
                  type="button"
                  onClick={() => onFilterAllTypes(company.id)}
                  aria-label="Todos os tipos"
                  title="Todos os tipos"
                  className="flex items-center justify-center rounded border border-[var(--border-subtle)] bg-[var(--surface-panel)] py-1 font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
                >
                  <FileStack className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);
