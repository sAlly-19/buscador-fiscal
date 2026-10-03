import React from 'react';
import { Building2, FileStack, Plus } from 'lucide-react';
import { Company } from '../../../packages/domain/types';
import { formatCNPJ } from '../../../packages/domain/cnpj';

interface Props {
  companies: Company[];
  activeCompany: Company | null;
  onSelectCompany: (id: number) => void;
  onNewCompany: () => void;
  onFilterNFeOnly: (id: number) => void;
  onFilterCTeOnly: (id: number) => void;
  onFilterAllTypes: (id: number) => void;
}

export const CompanyList: React.FC<Props> = ({ companies, activeCompany, onSelectCompany, onNewCompany, onFilterNFeOnly, onFilterCTeOnly, onFilterAllTypes }) => (
  <div className="p-3 overflow-auto">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs uppercase tracking-wide font-bold text-slate-500">Empresas</span>
      <button type="button" onClick={onNewCompany} className="p-1.5 rounded bg-sky-50 text-sky-700" aria-label="Nova empresa"><Plus className="w-4 h-4" /></button>
    </div>
    {companies.length === 0 && <p className="text-xs text-slate-500 p-3 border rounded">Cadastre uma empresa para começar.</p>}
    <div className="space-y-2">
      {companies.map((company) => (
        <div key={company.id} className={`rounded border p-3 ${activeCompany?.id === company.id ? 'border-sky-400 bg-sky-50' : 'border-slate-200'}`}>
          <button type="button" className="w-full text-left" onClick={() => onSelectCompany(company.id)}>
            <span className="flex items-center gap-2 font-semibold text-sm"><Building2 className="w-4 h-4" />{company.name}</span>
            <span className="block text-[10px] text-slate-500 mt-1">{formatCNPJ(company.cnpj)} · {company.uf}</span>
          </button>
          {activeCompany?.id === company.id && (
            <div className="grid grid-cols-3 gap-1 mt-3 text-[10px]">
              <button type="button" onClick={() => onFilterNFeOnly(company.id)} className="border rounded py-1">NF-e</button>
              <button type="button" onClick={() => onFilterCTeOnly(company.id)} className="border rounded py-1">CT-e</button>
              <button type="button" onClick={() => onFilterAllTypes(company.id)} className="border rounded py-1 flex justify-center"><FileStack className="w-3 h-3" /></button>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);
