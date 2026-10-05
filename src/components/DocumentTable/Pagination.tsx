import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isPageSize, PAGE_SIZE_OPTIONS, PageSize } from '../../../packages/domain/page-size';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: PageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => (
  <div
    data-testid="pagination-bar"
    className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-panel)] px-4 py-2 text-xs select-none"
  >
    <label className="flex items-center gap-2 text-[var(--text-secondary)]">
      <span className="text-[11px] font-medium text-[var(--text-muted)]">Exibir por vez</span>
      <select
        aria-label="Exibir por vez"
        value={pageSize}
        onChange={(event) => {
          const value = Number(event.target.value);
          if (isPageSize(value)) onPageSizeChange(value);
        }}
        className="rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1 text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
      >
        {PAGE_SIZE_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option} arquivos
          </option>
        ))}
      </select>
    </label>

    <div className="flex items-center justify-end gap-3 text-[var(--text-secondary)]">
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="rounded border border-[var(--border-default)] bg-[var(--surface-card)] p-1 text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <span className="text-xs">
        Página <b className="font-semibold text-[var(--text-primary)]">{currentPage}</b> de{' '}
        <b className="font-semibold text-[var(--text-primary)]">{Math.max(1, totalPages)}</b>
      </span>

      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="rounded border border-[var(--border-default)] bg-[var(--surface-card)] p-1 text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Próxima página"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  </div>
);
