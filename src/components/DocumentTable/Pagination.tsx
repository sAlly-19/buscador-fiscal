import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props { currentPage: number; totalPages: number; onPageChange: (page: number) => void }

export const Pagination: React.FC<Props> = ({ currentPage, totalPages, onPageChange }) => (
  <div className="flex items-center justify-end gap-3 px-4 py-3 border-t bg-white text-xs">
    <button type="button" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} className="p-1.5 border rounded disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
    <span>Página <b>{currentPage}</b> de <b>{Math.max(1, totalPages)}</b></span>
    <button type="button" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)} className="p-1.5 border rounded disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
  </div>
);
