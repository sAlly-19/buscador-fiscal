import React from 'react';
import { FileSearch, LoaderCircle } from 'lucide-react';
import { FiscalDocument } from '../../../packages/domain/types';
import { DocumentRow } from './DocumentRow';
import { Pagination } from './Pagination';

interface Props {
  documents: FiscalDocument[];
  totalDocs: number;
  currentPage: number;
  totalPages: number;
  selectedDocIds: number[];
  loadingDocs: boolean;
  onToggleSelectAll: () => void;
  onToggleSelectDoc: (id: number) => void;
  onViewDetails: (doc: FiscalDocument) => void;
  onDownloadXml: (id: number) => void;
  onDownloadPdf: (id: number) => void;
  onPageChange: (page: number) => void;
}

export const DocumentTable: React.FC<Props> = (props) => (
  <section className="flex-1 overflow-hidden flex flex-col">
    <div className="px-4 py-2 text-xs text-slate-500 bg-slate-50">{props.totalDocs} documento(s) encontrado(s)</div>
    <div className="flex-1 overflow-auto bg-white mx-4 mb-3 border rounded-lg">
      {props.loadingDocs ? (
        <div className="h-full min-h-52 flex items-center justify-center gap-2 text-slate-500"><LoaderCircle className="w-5 h-5 animate-spin" />Carregando documentos...</div>
      ) : props.documents.length === 0 ? (
        <div className="h-full min-h-52 flex flex-col items-center justify-center text-slate-400"><FileSearch className="w-9 h-9 mb-2" /><span className="text-sm">Nenhum documento encontrado.</span></div>
      ) : (
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-slate-100 text-[10px] uppercase text-slate-500 z-10"><tr>
            <th className="px-3 py-2 text-left"><input type="checkbox" checked={props.documents.length > 0 && props.selectedDocIds.length === props.documents.length} onChange={props.onToggleSelectAll} aria-label="Selecionar página" /></th>
            <th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Documento</th><th className="px-3 py-2 text-left">Emitente</th><th className="px-3 py-2 text-left">Emissão</th><th className="px-3 py-2 text-right">Valor</th><th className="px-3 py-2 text-left">Situação</th><th className="px-3 py-2 text-right">Ações</th>
          </tr></thead>
          <tbody>{props.documents.map((doc) => <DocumentRow key={doc.id} document={doc} selected={props.selectedDocIds.includes(doc.id)} onToggle={() => props.onToggleSelectDoc(doc.id)} onViewDetails={() => props.onViewDetails(doc)} onDownloadXml={() => props.onDownloadXml(doc.id)} onDownloadPdf={() => props.onDownloadPdf(doc.id)} />)}</tbody>
        </table>
      )}
    </div>
    <Pagination currentPage={props.currentPage} totalPages={props.totalPages} onPageChange={props.onPageChange} />
  </section>
);
