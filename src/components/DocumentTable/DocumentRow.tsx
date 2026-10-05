import React from 'react';
import { Download, Eye, FileText } from 'lucide-react';
import { FiscalDocument } from '../../../packages/domain/types';
import { isEventOnlyDocument } from '../../../packages/domain/document-presentation';

interface Props {
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

export const DocumentRow: React.FC<Props> = ({ document: doc, selected, onToggle, onViewDetails, onDownloadXml, onDownloadPdf }) => {
  const isEventOnly = isEventOnlyDocument(doc);
  const typeLabel = doc.document_type === 'NFE' ? 'NF-e' : 'CT-e';
  const displayType = isEventOnly && doc.direction === 'OUTBOUND' ? `${typeLabel} · Saída` : typeLabel;
  const displayTotal = isEventOnly
    ? '—'
    : Number(doc.total_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return <tr className="border-b border-slate-100 hover:bg-slate-50 text-xs">
    <td className="px-3 py-2"><input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Selecionar ${doc.access_key}`} /></td>
    <td className="px-3 py-2 font-semibold">{displayType}</td>
    <td className="px-3 py-2"><div className="font-medium">{doc.document_number || '—'}</div><div className="text-slate-400">Série {doc.series || '—'}</div></td>
    <td className="px-3 py-2 max-w-52"><div className="truncate" title={doc.issuer_name}>{doc.issuer_name || '—'}</div><div className="text-slate-400 font-mono">{doc.issuer_cnpj || ''}</div></td>
    <td className="px-3 py-2 whitespace-nowrap">{displayDate(doc.issue_date)}</td>
    <td className="px-3 py-2 text-right whitespace-nowrap">{displayTotal}</td>
    <td className="px-3 py-2">{isEventOnly ? (
      <span className="rounded-full px-2 py-1 text-[10px] bg-sky-100 text-sky-700">Dados parciais</span>
    ) : (
      <span className={`rounded-full px-2 py-1 text-[10px] ${doc.situacao_fiscal === 'CANCELADA' ? 'bg-rose-100 text-rose-700' : doc.situacao_fiscal === 'DENEGADA' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{doc.situacao_fiscal || 'AUTORIZADA'}</span>
    )}</td>
    <td className="px-3 py-2"><div className="flex gap-1 justify-end">
      <button type="button" onClick={onViewDetails} className="p-1.5 border rounded" title="Detalhes"><Eye className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={onDownloadXml} disabled={doc.xml_status !== 'XML_DISPONIVEL'} className="p-1.5 border rounded disabled:opacity-30" title={isEventOnly ? 'Baixar XML do evento' : 'Baixar XML'}><FileText className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={onDownloadPdf} disabled={isEventOnly || doc.pdf_status !== 'PDF_DISPONIVEL'} className="p-1.5 border rounded disabled:opacity-30" title={isEventOnly ? 'PDF indisponível para dados parciais' : 'Baixar PDF'}><Download className="w-3.5 h-3.5" /></button>
    </div></td>
  </tr>
};
