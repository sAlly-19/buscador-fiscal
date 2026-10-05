import React from 'react';
import { X, FileText, Download, FolderOpen } from 'lucide-react';
import { FiscalDocument } from '../../packages/domain/types';
import { formatCNPJ } from '../../packages/domain/cnpj';
import { formatAccessKey } from '../../packages/domain/access-key';
import { isEventOnlyDocument } from '../../packages/domain/document-presentation';
import { DialogShell } from './ui/DialogShell';

interface DocumentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: FiscalDocument | null;
  onDownloadXml: (id: number) => void;
  onDownloadPdf: (id: number) => void;
  onOpenFolder: (path: string) => void;
}

export const DocumentDetailsModal: React.FC<DocumentDetailsModalProps> = ({
  isOpen,
  onClose,
  document,
  onDownloadXml,
  onDownloadPdf,
  onOpenFolder,
}) => {
  if (!document) return null;

  const isEventOnly = isEventOnlyDocument(document);
  const hasXml = document.xml_status === 'XML_DISPONIVEL' && Boolean(document.xml_path);
  const hasPdf = !isEventOnly && document.pdf_status === 'PDF_DISPONIVEL' && Boolean(document.pdf_path);
  const typeLabel = document.document_type === 'NFE' ? 'NF-e' : 'CT-e';
  const displayType = isEventOnly && document.direction === 'OUTBOUND' ? `${typeLabel} · Saída` : typeLabel;
  const pdfButtonLabel = isEventOnly
    ? 'PDF indisponível'
    : document.document_type === 'CTE'
      ? 'Baixar DACTE (PDF)'
      : 'Baixar DANFE (PDF)';
  const xmlButtonLabel = isEventOnly ? 'Baixar XML do evento' : 'Baixar XML Completo';

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      titleId="doc-details-title"
      size="lg"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-header)] px-5 py-3.5 select-none">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
          <FileText className="h-4 w-4 text-[var(--primary)]" />
          <span id="doc-details-title">
            Detalhes do Documento Fiscal ({document.document_type})
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar detalhes"
          className="rounded p-1 text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto p-5 text-xs">
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-header)] p-3">
          <div>
            <span className="block text-[11px] text-[var(--text-muted)]">Tipo de Documento:</span>
            <strong className="text-sm font-bold text-[var(--text-primary)]">{displayType}</strong>
            {isEventOnly && (
              <span className="ml-2 rounded-full bg-[var(--warning)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--warning)]">
                Dados parciais
              </span>
            )}
          </div>
          <div>
            <span className="block text-[11px] text-[var(--text-muted)]">Número / Série:</span>
            <strong className="font-mono text-[var(--text-primary)]">
              {document.document_number || 'Pendente (Resumo)'} / {document.series || '-'}
            </strong>
          </div>
          <div>
            <span className="block text-[11px] text-[var(--text-muted)]">
              {isEventOnly ? 'Data do evento:' : 'Data de Emissão:'}
            </span>
            <span className="font-medium text-[var(--text-secondary)]">
              {document.issue_date ? new Date(document.issue_date).toLocaleDateString('pt-BR') : '-'}
            </span>
          </div>
          <div>
            <span className="block text-[11px] text-[var(--text-muted)]">Valor Total:</span>
            <strong className="font-bold text-[var(--success)]">
              {isEventOnly
                ? '—'
                : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(document.total_value || 0)}
            </strong>
          </div>
        </div>

        <div>
          <span className="mb-1 block text-[11px] text-[var(--text-muted)]">Chave de Acesso (44 dígitos):</span>
          <div className="break-all select-all rounded border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-2 font-mono text-[11px] text-[var(--text-primary)]">
            {formatAccessKey(document.access_key)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="block text-[11px] text-[var(--text-muted)]">Emitente:</span>
            <div className="truncate font-semibold text-[var(--text-primary)]">{document.issuer_name || '-'}</div>
            <div className="font-mono text-[11px] text-[var(--text-muted)]">{formatCNPJ(document.issuer_cnpj || '')}</div>
          </div>

          <div>
            <span className="block text-[11px] text-[var(--text-muted)]">Destinatário:</span>
            <div className="truncate font-semibold text-[var(--text-primary)]">{document.recipient_name || '-'}</div>
            <div className="font-mono text-[11px] text-[var(--text-muted)]">{formatCNPJ(document.recipient_cnpj || '')}</div>
          </div>
        </div>

        <div className="border-t border-[var(--border-subtle)] pt-3">
          <span className="mb-2 block text-[11px] font-semibold text-[var(--text-muted)]">Situação dos Arquivos Físicos:</span>
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`flex items-center justify-between rounded border p-2.5 ${
                hasXml
                  ? 'border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]'
                  : 'border-[var(--border-subtle)] bg-[var(--surface-header)] text-[var(--text-muted)]'
              }`}
            >
              <span>{isEventOnly ? 'XML do evento' : 'Arquivo XML'}</span>
              <span className="font-bold">{hasXml ? '✓ DISPONÍVEL' : '✗ INDISPONÍVEL'}</span>
            </div>

            <div
              className={`flex items-center justify-between rounded border p-2.5 ${
                hasPdf
                  ? 'border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]'
                  : 'border-[var(--border-subtle)] bg-[var(--surface-header)] text-[var(--text-muted)]'
              }`}
            >
              <span>Documento PDF</span>
              <span className="font-bold">{hasPdf ? '✓ DISPONÍVEL' : '✗ INDISPONÍVEL'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface-header)] p-4">
        <div>
          {document.xml_path && (
            <button
              type="button"
              onClick={() => onOpenFolder(document.xml_path!)}
              className="flex items-center gap-1.5 rounded border border-[var(--border-default)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] cursor-pointer"
            >
              <FolderOpen className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              <span>Mostrar na Pasta</span>
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onDownloadXml(document.id)}
            disabled={!hasXml}
            className="flex items-center gap-1.5 rounded border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-1.5 font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{xmlButtonLabel}</span>
          </button>

          <button
            type="button"
            onClick={() => onDownloadPdf(document.id)}
            disabled={!hasPdf}
            className="flex items-center gap-1.5 rounded bg-[var(--primary)] px-3 py-1.5 font-semibold text-white transition hover:bg-[var(--primary)]/90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{pdfButtonLabel}</span>
          </button>
        </div>
      </div>
    </DialogShell>
  );
};
