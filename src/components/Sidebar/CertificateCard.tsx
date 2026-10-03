import React from 'react';
import { KeyRound, ShieldAlert, ShieldCheck } from 'lucide-react';
import { CertificateInfo, Company } from '../../../packages/domain/types';

interface Props {
  activeCompany: Company | null;
  companyCert: CertificateInfo | null;
  onOpenCertModal: () => void;
}

export const CertificateCard: React.FC<Props> = ({ activeCompany, companyCert, onOpenCertModal }) => {
  const valid = companyCert && !companyCert.is_expired;
  return (
    <div className="m-3 p-3 border rounded-lg bg-slate-50 text-xs">
      <div className="font-bold flex items-center gap-2 mb-2"><KeyRound className="w-4 h-4" />Certificado digital</div>
      {!activeCompany ? <p className="text-slate-500">Selecione uma empresa.</p> : companyCert ? (
        <div className="space-y-1">
          <p className={`flex items-center gap-1 font-semibold ${valid ? 'text-emerald-700' : 'text-rose-700'}`}>
            {valid ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}{valid ? 'Válido' : 'Expirado'}
          </p>
          <p className="truncate" title={companyCert.subject}>{companyCert.subject}</p>
          <p className="text-slate-500">Validade: {new Date(companyCert.valid_to).toLocaleDateString('pt-BR')}</p>
        </div>
      ) : <p className="text-amber-700">Nenhum certificado associado.</p>}
      <button type="button" disabled={!activeCompany} onClick={onOpenCertModal} className="w-full mt-3 border rounded py-2 bg-white font-semibold disabled:opacity-40">
        {companyCert ? 'Alterar certificado' : 'Associar certificado'}
      </button>
    </div>
  );
};
