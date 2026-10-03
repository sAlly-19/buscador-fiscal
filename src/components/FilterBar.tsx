import React from 'react';
import { RefreshCw, RotateCcw, Search } from 'lucide-react';

interface Props {
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
  onConsultSefaz: (type: 'NF-e' | 'CT-e') => void;
  onResetNSU: (type: 'NFE' | 'CTE') => void;
}

export const FilterBar: React.FC<Props> = (props) => (
  <section className="p-4 bg-white border-b border-slate-200 space-y-3 shrink-0 text-xs">
    <div className="flex flex-wrap items-end gap-3">
      <label className="font-medium">De<input type="date" value={props.startDate} onChange={(e) => props.onStartDateChange(e.target.value)} className="block mt-1 border rounded px-2 py-1.5" /></label>
      <label className="font-medium">Até<input type="date" value={props.endDate} onChange={(e) => props.onEndDateChange(e.target.value)} className="block mt-1 border rounded px-2 py-1.5" /></label>
      <label className="flex-1 min-w-56 font-medium">Busca
        <input value={props.searchQuery} onChange={(e) => props.onSearchQueryChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && props.onSearchLocal()}
          placeholder="Chave, número, série, CNPJ ou nome" className="block mt-1 w-full border rounded px-3 py-1.5" />
      </label>
      <label className="flex gap-1 items-center"><input type="checkbox" checked={props.selectedDocTypes.nfe} onChange={(e) => props.onToggleDocType('nfe', e.target.checked)} /> NF-e</label>
      <label className="flex gap-1 items-center"><input type="checkbox" checked={props.selectedDocTypes.cte} onChange={(e) => props.onToggleDocType('cte', e.target.checked)} /> CT-e</label>
      <button type="button" onClick={props.onSearchLocal} className="px-3 py-2 border rounded bg-slate-50 flex gap-1"><Search className="w-4 h-4" /> Buscar</button>
    </div>
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-slate-500 mr-auto">NSU NF-e: <b className="font-mono">{props.nsuStatus.nfeLastNSU}</b> · CT-e: <b className="font-mono">{props.nsuStatus.cteLastNSU}</b></span>
      <button type="button" onClick={() => props.onResetNSU('NFE')} className="p-2 border rounded" title="Resetar NSU de NF-e"><RotateCcw className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={() => props.onConsultSefaz('NF-e')} className="px-3 py-2 rounded bg-emerald-600 text-white flex gap-1"><RefreshCw className="w-4 h-4" /> Sincronizar NF-e</button>
      <button type="button" onClick={() => props.onResetNSU('CTE')} className="p-2 border rounded" title="Resetar NSU de CT-e"><RotateCcw className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={() => props.onConsultSefaz('CT-e')} className="px-3 py-2 rounded bg-indigo-600 text-white flex gap-1"><RefreshCw className="w-4 h-4" /> Sincronizar CT-e</button>
    </div>
  </section>
);
