import React from 'react';
import { X, FileText, Download, FolderOpen } from 'lucide-react';
import { FiscalDocument } from '../../packages/domain/types';
import { formatCNPJ } from '../../packages/domain/cnpj';
import { formatAccessKey } from '../../packages/domain/access-key';

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
  if (!isOpen || !document) return null;

  const hasXml = document.xml_status === 'XML_DISPONIVEL' && Boolean(document.xml_path);
  const hasPdf = document.pdf_status === 'PDF_DISPONIVEL' && Boolean(document.pdf_path);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <FileText className="w-4 h-4 text-sky-600" />
            <span>Detalhes do Documento Fiscal ({document.document_type})</span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-1 rounded hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-500 block text-[11px]">Tipo de Documento:</span>
              <strong className="text-slate-800 text-sm font-bold">{document.document_type}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Número / Série:</span>
              <strong className="text-slate-800 font-mono">
                {document.document_number || 'Pendente (Resumo)'} / {document.series || '-'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Data de Emissão:</span>
              <span className="text-slate-700 font-medium">
                {document.issue_date ? new Date(document.issue_date).toLocaleDateString('pt-BR') : '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Valor Total:</span>
              <strong className="text-emerald-700 font-bold">
                {document.total_value 
                  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(document.total_value) 
                  : 'R$ 0,00'}
              </strong>
            </div>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] mb-1">Chave de Acesso (44 dígitos):</span>
            <div className="p-2 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] text-slate-800 select-all break-all">
              {formatAccessKey(document.access_key)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-500 block text-[11px]">Emitente:</span>
              <div className="font-semibold text-slate-800 truncate">{document.issuer_name || '-'}</div>
              <div className="font-mono text-[11px] text-slate-500">{formatCNPJ(document.issuer_cnpj || '')}</div>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Destinatário:</span>
              <div className="font-semibold text-slate-800 truncate">{document.recipient_name || '-'}</div>
              <div className="font-mono text-[11px] text-slate-500">{formatCNPJ(document.recipient_cnpj || '')}</div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <span className="text-slate-500 block text-[11px] mb-2 font-semibold">Situação dos Arquivos Físicos:</span>
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-2.5 rounded border flex items-center justify-between ${
                hasXml ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <span>Arquivo XML</span>
                <span className="font-bold">{hasXml ? '✓ DISPONÍVEL' : '✗ INDISPONÍVEL'}</span>
              </div>

              <div className={`p-2.5 rounded border flex items-center justify-between ${
                hasPdf ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <span>Documento PDF</span>
                <span className="font-bold">{hasPdf ? '✓ DISPONÍVEL' : '✗ INDISPONÍVEL'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            {document.xml_path && (
              <button
                type="button"
                onClick={() => onOpenFolder(document.xml_path!)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-200 transition font-medium text-xs"
              >
                <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                <span>Mostrar na Pasta</span>
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onDownloadXml(document.id)}
              disabled={!hasXml}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-semibold text-slate-700 transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar XML</span>
            </button>

            <button
              onClick={() => onDownloadPdf(document.id)}
              disabled={!hasPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded font-semibold transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
