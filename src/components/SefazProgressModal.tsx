import React from 'react';
import { RefreshCw, StopCircle } from 'lucide-react';

interface SefazProgressModalProps {
  isOpen: boolean;
  companyName: string;
  docType: string;
  currentNSU?: string;
  message: string;
  receivedCount?: number;
  onCancel: () => void;
}

export const SefazProgressModal: React.FC<SefazProgressModalProps> = ({
  isOpen,
  companyName,
  docType,
  currentNSU,
  message,
  receivedCount,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-md p-6 text-center animate-in fade-in zoom-in-95 duration-150 text-xs">
        <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-4 text-sky-600">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>

        <h3 className="text-base font-bold text-slate-800 mb-1">
          Consultando Distribuição SEFAZ...
        </h3>
        <p className="text-slate-500 mb-4">
          Conectando ao Web Service oficial do Ambiente Nacional via mTLS
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-left space-y-2 mb-6">
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Empresa:</span>
            <span className="font-semibold text-slate-800">{companyName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Serviço:</span>
            <span className="font-semibold text-sky-700">{docType}</span>
          </div>
          {currentNSU && (
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">NSU Atual:</span>
              <span className="font-mono font-semibold text-slate-800">{currentNSU}</span>
            </div>
          )}
          {receivedCount !== undefined && receivedCount > 0 && (
            <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5">
              <span className="text-slate-500 font-medium">Documentos Recebidos:</span>
              <span className="font-bold text-emerald-700">{receivedCount}</span>
            </div>
          )}
          <div className="text-[11px] text-sky-800 bg-sky-50 p-2 rounded border border-sky-100 italic">
            {message || 'Aguardando resposta do servidor da SEFAZ...'}
          </div>
        </div>

        <button
          onClick={onCancel}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-md border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold transition"
        >
          <StopCircle className="w-4 h-4" />
          <span>CANCELAR CONSULTA</span>
        </button>
      </div>
    </div>
  );
};
