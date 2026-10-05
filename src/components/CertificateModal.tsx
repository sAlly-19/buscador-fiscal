import React, { useState, useEffect } from 'react';
import { X, Award, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { CertificateInfo, Company } from '../../packages/domain/types';
import { formatCNPJ } from '../../packages/domain/cnpj';
import { DialogShell } from './ui/DialogShell';

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

  return (
    <DialogShell
      isOpen={isOpen && Boolean(company)}
      onClose={onClose}
      titleId="certificate-modal-title"
      size="lg"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-header)] px-5 py-3.5 select-none">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
          <Award className="h-4 w-4 text-[var(--primary)]" />
          <span id="certificate-modal-title">Certificados Digitais (Windows Certificate Store)</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="rounded p-1 text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {company && (
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-2.5 text-xs text-[var(--text-secondary)] select-none">
          <div className="truncate pr-4">
            Empresa Ativa: <strong className="font-semibold text-[var(--text-primary)]">{company.name}</strong>{' '}
            <span className="font-mono text-[var(--text-muted)]">({formatCNPJ(company.cnpj)})</span>
          </div>
          <button
            type="button"
            onClick={loadCertificates}
            disabled={loading}
            className="flex items-center gap-1 font-semibold text-[var(--primary)] transition hover:text-[var(--primary-hover)] focus:outline-none disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar lista</span>
          </button>
        </div>
      )}

      {message && (
        <div
          className={`m-4 flex items-center gap-2 rounded-md border p-3 text-xs ${
            message.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-500'
          }`}
        >
          {message.type === 'success' ? (
            <ShieldCheck className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto p-4 text-xs">
        {loading ? (
          <div className="py-8 text-center text-[var(--text-muted)]">
            <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-[var(--primary)]" />
            <span>Verificando repositório de certificados do Windows...</span>
          </div>
        ) : certs.length === 0 ? (
          <div className="py-8 text-center text-[var(--text-muted)]">
            <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-[var(--warning)]" />
            <p className="font-semibold text-[var(--text-primary)]">
              Nenhum certificado com chave privada encontrado.
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              Instale o certificado A1 no Windows ou conecte o token A3 compatível com ICP-Brasil.
            </p>
          </div>
        ) : (
          certs.map((cert) => {
            const isSelected = selectedThumbprint === cert.thumbprint;
            const matchesCompany = company && cert.extracted_cnpj === company.cnpj;
            const formattedExp = new Date(cert.valid_to).toLocaleDateString('pt-BR');

            return (
              <div
                key={cert.thumbprint}
                onClick={() => setSelectedThumbprint(cert.thumbprint)}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                  isSelected
                    ? 'border-[var(--primary)] bg-[var(--surface-selected)] shadow-xs'
                    : 'border-[var(--border-subtle)] bg-[var(--surface-card)] hover:border-[var(--border-default)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <input
                  type="radio"
                  name="certificate"
                  checked={isSelected}
                  onChange={() => setSelectedThumbprint(cert.thumbprint)}
                  className="mt-1 text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-[var(--text-primary)]" title={cert.subject}>
                      {cert.subject}
                    </span>
                    {cert.is_expired ? (
                      <span className="shrink-0 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-500">
                        EXPIRADO
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                        VÁLIDO até {formattedExp}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--text-secondary)]">
                    <span>
                      Emissor: <strong className="text-[var(--text-primary)]">{cert.issuer}</strong>
                    </span>
                    {cert.extracted_cnpj && (
                      <span>
                        CNPJ:{' '}
                        <strong
                          className={`font-mono ${
                            matchesCompany ? 'text-[var(--success)] font-bold' : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {formatCNPJ(cert.extracted_cnpj)} {matchesCompany && '★ (Empresa Atual)'}
                        </strong>
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[10px] text-[var(--text-muted)]">
                    Thumbprint: {cert.thumbprint}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface-header)] p-4 text-xs select-none">
        <span className="text-[11px] text-[var(--text-muted)]">
          {certs.length} certificado(s) detectado(s) no sistema
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2 font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleAssociate}
            disabled={!selectedThumbprint || isAssociating}
            className="rounded bg-[var(--primary)] px-4 py-2 font-semibold text-white shadow-xs transition hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50"
          >
            {isAssociating ? 'Vinculando...' : 'Vincular à Empresa'}
          </button>
        </div>
      </div>
    </DialogShell>
  );
};
