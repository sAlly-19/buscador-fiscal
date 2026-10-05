import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isPageSize, PAGE_SIZE_OPTIONS, PageSize } from '../../../packages/domain/page-size';

interface Props {
  currentPage: number;
  totalPages: number;
  pageSize: PageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
}

export const Pagination: React.FC<Props> = ({ currentPage, totalPages, pageSize, onPageChange, onPageSizeChange }) => (
  <div className="flex items-center justify-between gap-3 px-4 py-3 border-t bg-white text-xs">
    <label className="flex items-center gap-2 text-slate-600">
      <span>Exibir por vez</span>
      <select
        aria-label="Exibir por vez"
        value={pageSize}
        onChange={(event) => {
          const value = Number(event.target.value);
          if (isPageSize(value)) onPageSizeChange(value);
        }}
        className="border border-slate-300 rounded px-2 py-1 bg-white font-medium text-slate-700"
      >
        {PAGE_SIZE_OPTIONS.map((option) => (
          <option key={option} value={option}>{option} arquivos</option>
        ))}
      </select>
    </label>
    <div className="flex items-center justify-end gap-3">
      <button type="button" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} className="p-1.5 border rounded disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
      <span>Página <b>{currentPage}</b> de <b>{Math.max(1, totalPages)}</b></span>
      <button type="button" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)} className="p-1.5 border rounded disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
    </div>
  </div>
);
