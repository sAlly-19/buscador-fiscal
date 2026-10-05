import React from 'react';
import { RotateCcw, Search } from 'lucide-react';

export interface DocumentFiltersProps {
  nsuStatus: { nfeLastNSU: string; cteLastNSU: string };
  selectedDocTypes: { nfe: boolean; cte: boolean };
  onToggleDocType: (type: 'nfe' | 'cte', checked: boolean) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchLocal: () => void;
  onResetNSU: (type: 'NFE' | 'CTE') => void;
}

export const DocumentFilters: React.FC<DocumentFiltersProps> = ({
  nsuStatus,
  selectedDocTypes,
  onToggleDocType,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  searchQuery,
  onSearchQueryChange,
  onSearchLocal,
  onResetNSU,
}) => (
  <section
    data-testid="document-filters"
    className="shrink-0 space-y-2.5 border-b border-[var(--border-subtle)] bg-[var(--surface-panel)] p-3.5 text-xs select-none"
  >
    <div className="text-[11px] text-[var(--text-muted)]">
      Período exibido na base local. A sincronização com a SEFAZ é incremental por NSU e não aceita filtro por data.
    </div>

    <div className="flex flex-wrap items-end gap-2.5">
      <label className="font-medium text-[var(--text-secondary)]">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Exibir de</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="mt-1 block rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
        />
      </label>

      <label className="font-medium text-[var(--text-secondary)]">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Exibir até</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="mt-1 block rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
        />
      </label>

      <label className="min-w-64 flex-1 font-medium text-[var(--text-secondary)]">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Busca</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearchLocal()}
          placeholder="Chave, número, série, CNPJ ou nome"
          className="mt-1 block w-full rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-2.5 py-1 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
        />
      </label>

      <div className="flex items-center gap-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={selectedDocTypes.nfe}
            onChange={(e) => onToggleDocType('nfe', e.target.checked)}
            className="rounded border-[var(--border-default)] text-[var(--primary)] focus:ring-[var(--primary)]"
          />
          <span>NF-e</span>
        </label>
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={selectedDocTypes.cte}
            onChange={(e) => onToggleDocType('cte', e.target.checked)}
            className="rounded border-[var(--border-default)] text-[var(--primary)] focus:ring-[var(--primary)]"
          />
          <span>CT-e</span>
        </label>
      </div>

      <button
        type="button"
        onClick={onSearchLocal}
        className="flex items-center gap-1.5 rounded border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
      >
        <Search className="h-3.5 w-3.5 text-[var(--primary)]" />
        <span>Buscar</span>
      </button>
    </div>

    <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-2 text-[11px] text-[var(--text-muted)]">
      <span className="mr-auto">
        NSU NF-e: <b className="font-mono font-bold text-[var(--text-primary)]">{nsuStatus.nfeLastNSU}</b>
        <span className="mx-2 text-[var(--border-strong)]">·</span>
        CT-e: <b className="font-mono font-bold text-[var(--text-primary)]">{nsuStatus.cteLastNSU}</b>
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onResetNSU('NFE')}
          title="Resetar NSU de NF-e"
          aria-label="Resetar NSU de NF-e"
          className="flex items-center gap-1 rounded border border-[var(--border-subtle)] bg-[var(--surface-card)] p-1 text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none"
        >
          <RotateCcw className="h-3 w-3" />
          <span className="text-[10px] font-medium">Reset NF-e</span>
        </button>

        <button
          type="button"
          onClick={() => onResetNSU('CTE')}
          title="Resetar NSU de CT-e"
          aria-label="Resetar NSU de CT-e"
          className="flex items-center gap-1 rounded border border-[var(--border-subtle)] bg-[var(--surface-card)] p-1 text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none"
        >
          <RotateCcw className="h-3 w-3" />
          <span className="text-[10px] font-medium">Reset CT-e</span>
        </button>
      </div>
    </div>
  </section>
);

