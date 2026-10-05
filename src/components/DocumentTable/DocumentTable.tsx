import React from 'react';
import { FileSearch, LoaderCircle } from 'lucide-react';
import { FiscalDocument } from '../../../packages/domain/types';
import { DocumentRow } from './DocumentRow';
import { Pagination } from './Pagination';
import { PageSize } from '../../../packages/domain/page-size';

export interface DocumentTableProps {
  documents: FiscalDocument[];
  totalDocs: number;
  currentPage: number;
  totalPages: number;
  pageSize: PageSize;
  selectedDocIds: number[];
  loadingDocs: boolean;
  onToggleSelectAll: () => void;
  onToggleSelectDoc: (id: number) => void;
  onViewDetails: (doc: FiscalDocument) => void;
  onDownloadXml: (id: number) => void;
  onDownloadPdf: (id: number) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  totalDocs,
  currentPage,
  totalPages,
  pageSize,
  selectedDocIds,
  loadingDocs,
  onToggleSelectAll,
  onToggleSelectDoc,
  onViewDetails,
  onDownloadXml,
  onDownloadPdf,
  onPageChange,
  onPageSizeChange,
}) => {
  const isAllSelected = documents.length > 0 && selectedDocIds.length === documents.length;

  return (
    <section
      data-testid="document-table-container"
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-panel)] px-4 py-1.5 text-xs text-[var(--text-muted)] select-none">
        <span>
          <strong className="font-semibold text-[var(--text-primary)]">{totalDocs}</strong> documento(s) encontrado(s)
        </span>
      </div>

      <div className="flex-1 overflow-auto bg-[var(--surface-workspace)]">
        {loadingDocs ? (
          <div className="flex h-full min-h-52 items-center justify-center gap-2 text-sm text-[var(--text-muted)]">
            <LoaderCircle className="h-5 w-5 animate-spin text-[var(--primary)]" />
            <span>Carregando documentos...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex h-full min-h-52 flex-col items-center justify-center text-[var(--text-muted)]">
            <FileSearch className="mb-2 h-9 w-9 text-[var(--border-strong)]" />
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              Nenhum documento encontrado.
            </span>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 border-b border-[var(--border-default)] bg-[var(--surface-panel)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] shadow-xs select-none">
              <tr>
                <th className="w-10 px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={onToggleSelectAll}
                    aria-label="Selecionar página"
                    className="rounded border-[var(--border-default)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                </th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Documento</th>
                <th className="px-3 py-2">Emitente</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2">Situação</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--surface-card)]">
              {documents.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  document={doc}
                  selected={selectedDocIds.includes(doc.id)}
                  onToggle={() => onToggleSelectDoc(doc.id)}
                  onViewDetails={() => onViewDetails(doc)}
                  onDownloadXml={() => onDownloadXml(doc.id)}
                  onDownloadPdf={() => onDownloadPdf(doc.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </section>
  );
};
