import React, { useState, useEffect } from 'react';
import { X, Award, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { CertificateInfo, Company } from '../../packages/domain/types';
import { formatCNPJ } from '../../packages/domain/cnpj';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  onAssociated: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  company,
  onAssociated,
}) => {
  const [certs, setCerts] = useState<CertificateInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedThumbprint, setSelectedThumbprint] = useState<string>('');
  const [isAssociating, setIsAssociating] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen && company) {
      loadCertificates();
    }
  }, [isOpen, company]);

  const loadCertificates = async () => {
    if (!company) return;
    setLoading(true);
    setMessage(null);
    try {
      const [available, associated] = await Promise.all([
        window.fiscalApi?.certificates.listAvailable() || [],
        window.fiscalApi?.certificates.getForCompany(company.id) || null,
      ]);
      setCerts(available);
      if (associated) {
        setSelectedThumbprint(associated.thumbprint);
      } else {
        // Pré-seleciona certificado com mesmo CNPJ se houver
        const match = available.find(c => c.extracted_cnpj === company.cnpj && !c.is_expired);
        if (match) setSelectedThumbprint(match.thumbprint);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Falha ao carregar certificados do Windows.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAssociate = async () => {
    if (!company || !selectedThumbprint) return;
    setIsAssociating(true);
    setMessage(null);
    try {
      await window.fiscalApi?.certificates.associateToCompany(company.id, selectedThumbprint);
      setMessage({ type: 'success', text: 'Certificado digital vinculado à empresa com sucesso!' });
      onAssociated();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Falha ao associar certificado.' });
    } finally {
      setIsAssociating(false);
    }
  };

  if (!isOpen || !company) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Award className="w-4 h-4 text-sky-600" />
            <span>Certificados Digitais (Windows Certificate Store)</span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-1 rounded hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 bg-sky-50/70 border-b border-sky-100 text-xs text-sky-950 flex items-center justify-between">
          <div>
            Empresa Ativa: <strong>{company.name}</strong> ({formatCNPJ(company.cnpj)})
          </div>
          <button 
            onClick={loadCertificates}
            disabled={loading}
            className="flex items-center gap-1 font-semibold text-sky-700 hover:text-sky-900 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar lista</span>
          </button>
        </div>

        {message && (
          <div className={`m-4 p-3 rounded-md border text-xs flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {message.type === 'success' ? <ShieldCheck className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="p-4 overflow-y-auto flex-1 space-y-2 text-xs">
          {loading ? (
            <div className="text-center py-8 text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-600 mb-2" />
              <span>Verificando repositório de certificados do Windows...</span>
            </div>
          ) : certs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
              <p className="font-semibold text-slate-700">Nenhum certificado com chave privada encontrado.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Instale o certificado A1 no Windows ou conecte o token A3 compatível com ICP-Brasil.
              </p>
            </div>
          ) : (
            certs.map((cert) => {
              const isSelected = selectedThumbprint === cert.thumbprint;
              const matchesCompany = cert.extracted_cnpj === company.cnpj;
              const formattedExp = new Date(cert.valid_to).toLocaleDateString('pt-BR');

              return (
                <div 
                  key={cert.thumbprint}
                  onClick={() => setSelectedThumbprint(cert.thumbprint)}
                  className={`p-3 rounded-lg border transition cursor-pointer flex items-start gap-3 ${
                    isSelected 
                      ? 'border-sky-500 bg-sky-50/60 ring-1 ring-sky-500' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="certificate"
                    checked={isSelected}
                    onChange={() => setSelectedThumbprint(cert.thumbprint)}
                    className="mt-1 text-sky-600 focus:ring-sky-500" 
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800 truncate">{cert.subject}</span>
                      {cert.is_expired ? (
                        <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-rose-100 text-rose-800 border border-rose-300 flex-shrink-0">
                          EXPIRADO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 flex-shrink-0">
                          VÁLIDO até {formattedExp}
                        </span>
                      )}
                    </div>

                    <div className="text-slate-500 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                      <span>Emissor: <strong className="text-slate-700">{cert.issuer}</strong></span>
                      {cert.extracted_cnpj && (
                        <span>CNPJ: <strong className={`font-mono ${matchesCompany ? 'text-emerald-700' : 'text-slate-700'}`}>
                          {formatCNPJ(cert.extracted_cnpj)} {matchesCompany && '★ (Empresa Atual)'}
                        </strong></span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Thumbprint: {cert.thumbprint}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            {certs.length} certificado(s) detectado(s) no sistema
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 transition font-medium"
            >
              Fechar
            </button>
            <button
              onClick={handleAssociate}
              disabled={!selectedThumbprint || isAssociating}
              className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-700 text-white font-semibold transition disabled:opacity-50"
            >
              {isAssociating ? 'Vinculando...' : 'Vincular à Empresa'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
