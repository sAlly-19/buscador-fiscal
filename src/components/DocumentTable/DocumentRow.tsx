import React from 'react';
import { Download, Eye, FileText } from 'lucide-react';
import { FiscalDocument } from '../../../packages/domain/types';
import { isEventOnlyDocument } from '../../../packages/domain/document-presentation';

export interface DocumentRowProps {
  document: FiscalDocument;
  selected: boolean;
  onToggle: () => void;
  onViewDetails: () => void;
  onDownloadXml: () => void;
  onDownloadPdf: () => void;
}

function displayDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : date.toLocaleDateString('pt-BR');
}

export const DocumentRow: React.FC<DocumentRowProps> = ({
  document: doc,
  selected,
  onToggle,
  onViewDetails,
  onDownloadXml,
  onDownloadPdf,
}) => {
  const isEventOnly = isEventOnlyDocument(doc);
  const typeLabel = doc.document_type === 'NFE' ? 'NF-e' : 'CT-e';
  const displayType = isEventOnly && doc.direction === 'OUTBOUND' ? `${typeLabel} · Saída` : typeLabel;
  const displayTotal = isEventOnly
    ? '—'
    : Number(doc.total_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <tr
      className={`border-b border-[var(--border-subtle)] text-xs transition ${
        selected ? 'bg-[var(--surface-selected)]' : 'hover:bg-[var(--surface-hover)]'
      }`}
    >
      <td className="w-10 px-3 py-1.5 text-center">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Selecionar ${doc.access_key}`}
          className="rounded border-[var(--border-default)] text-[var(--primary)] focus:ring-[var(--primary)]"
        />
      </td>

      <td className="px-3 py-1.5 whitespace-nowrap font-semibold text-[var(--text-primary)]">
        {displayType}
      </td>

      <td className="px-3 py-1.5">
        <div className="font-mono font-medium text-[var(--text-primary)]">{doc.document_number || '—'}</div>
        <div className="text-[10px] text-[var(--text-muted)]">Série {doc.series || '—'}</div>
      </td>

      <td className="max-w-56 px-3 py-1.5">
        <div className="truncate font-medium text-[var(--text-primary)]" title={doc.issuer_name}>
          {doc.issuer_name || '—'}
        </div>
        <div className="font-mono text-[10px] text-[var(--text-muted)]">{doc.issuer_cnpj || ''}</div>
      </td>

      <td className="px-3 py-1.5 whitespace-nowrap text-[var(--text-secondary)]">
        <div>{displayDate(doc.issue_date)}</div>
        {doc.date_kind === 'EVENT' && (
          <div className="text-[10px] font-semibold text-[var(--primary)]">Evento</div>
        )}
      </td>

      <td className="px-3 py-1.5 text-right font-mono font-semibold whitespace-nowrap text-[var(--text-primary)]">
        {displayTotal}
      </td>

      <td className="px-3 py-1.5 whitespace-nowrap">
        {isEventOnly ? (
          <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
            Dados parciais
          </span>
        ) : doc.situacao_fiscal === 'CANCELADA' ? (
          <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-500">
            {doc.situacao_fiscal}
          </span>
        ) : doc.situacao_fiscal === 'DENEGADA' ? (
          <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
            {doc.situacao_fiscal}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
            {doc.situacao_fiscal || 'AUTORIZADA'}
          </span>
        )}
      </td>

      <td className="px-3 py-1.5 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={onViewDetails}
            className="rounded border border-[var(--border-subtle)] bg-[var(--surface-card)] p-1 text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none"
            title="Ver Detalhes do Documento"
            aria-label="Ver detalhes"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onDownloadXml}
            disabled={doc.xml_status !== 'XML_DISPONIVEL'}
            className="rounded border border-[var(--border-subtle)] bg-[var(--surface-card)] p-1 text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-30"
            title={isEventOnly ? 'Baixar XML do evento' : 'Baixar XML'}
            aria-label="Baixar XML"
          >
            <FileText className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={isEventOnly || doc.pdf_status !== 'PDF_DISPONIVEL'}
            className="rounded border border-[var(--border-subtle)] bg-[var(--surface-card)] p-1 text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-30"
            title={isEventOnly ? 'PDF indisponível para dados parciais' : 'Baixar PDF'}
            aria-label="Baixar PDF"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};
