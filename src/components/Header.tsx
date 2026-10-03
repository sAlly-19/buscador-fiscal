import React from 'react';
import { Building2, Settings } from 'lucide-react';
import { AppSettings, Company } from '../../packages/domain/types';

interface Props {
  companies: Company[];
  activeCompany: Company | null;
  settings: AppSettings | null;
  onSelectCompany: (id: number) => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<Props> = ({ companies, activeCompany, settings, onSelectCompany, onOpenSettings }) => (
  <header className="h-16 bg-slate-900 text-white flex items-center gap-4 px-5 shadow-sm shrink-0">
    <div className="flex items-center gap-2 min-w-64">
      <Building2 className="w-6 h-6 text-sky-400" />
      <div><div className="font-bold">Buscador Fiscal</div><div className="text-[10px] text-slate-400">NF-e e CT-e · SEFAZ</div></div>
    </div>
    <select
      aria-label="Empresa ativa"
      value={activeCompany?.id ?? ''}
      onChange={(event) => onSelectCompany(Number(event.target.value))}
      className="max-w-xl flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
    >
      {companies.length === 0 && <option value="">Cadastre uma empresa</option>}
      {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
    </select>
    <span className="text-xs rounded-full bg-slate-800 px-3 py-1.5 text-slate-300">
      {settings?.sefaz_environment === 'production' ? 'Produção' : 'Homologação'}
    </span>
    <button type="button" onClick={onOpenSettings} className="p-2 rounded hover:bg-slate-800" aria-label="Configurações">
      <Settings className="w-5 h-5" />
    </button>
  </header>
);
