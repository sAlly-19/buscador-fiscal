import React, { useState, useEffect } from 'react';
import { X, Building2, AlertCircle } from 'lucide-react';
import { Company } from '../../packages/domain/types';
import { formatCNPJ, isValidCNPJ, sanitizeCNPJ } from '../../packages/domain/cnpj';
import { BRAZILIAN_UFS, getUfAcronym } from '../../packages/domain/uf';
import { DialogShell } from './ui/DialogShell';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    cnpj: string;
    uf?: string;
    folder_path?: string;
  }) => Promise<void>;
  editingCompany?: Company | null;
}

export const CompanyModal: React.FC<CompanyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingCompany,
}) => {
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [uf, setUf] = useState('GO');
  const [folderPath, setFolderPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingCompany) {
      setName(editingCompany.name);
      setCnpj(formatCNPJ(editingCompany.cnpj));
      setUf(editingCompany.uf ? getUfAcronym(editingCompany.uf) : 'GO');
      setFolderPath(editingCompany.folder_path || '');
    } else {
      setName('');
      setCnpj('');
      setUf('GO');
      setFolderPath('');
    }
    setError(null);
  }, [editingCompany, isOpen]);

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = sanitizeCNPJ(raw);
    if (digits.length <= 14) {
      setCnpj(formatCNPJ(digits));
    }
  };

  const handleChooseFolder = async () => {
    try {
      const selected = await window.fiscalApi?.settings.selectFolder(
        'Selecione a Pasta da Empresa'
      );
      if (selected) {
        setFolderPath(selected);
      }
    } catch {
      // Fallback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Por favor, informe a Razão Social da empresa.');
      return;
    }

    const clean = sanitizeCNPJ(cnpj);
    if (!isValidCNPJ(clean)) {
      setError('CNPJ inválido de acordo com as regras da Receita Federal.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        cnpj: clean,
        uf,
        folder_path: folderPath.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar empresa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      titleId="company-modal-title"
      size="md"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-header)] px-5 py-3.5 select-none">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
          <Building2 className="h-4 w-4 text-[var(--primary)]" />
          <span id="company-modal-title">
            {editingCompany ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}
          </span>
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

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto p-5 text-xs">
        {error && (
          <div className="flex items-start gap-2 rounded-md border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3 text-[var(--danger)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="mb-1 block font-semibold text-[var(--text-primary)]">
            Razão Social / Nome da Empresa: <span className="text-[var(--danger)]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Minha Empresa Distribuidora Ltda"
            className="w-full rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="mb-1 block font-semibold text-[var(--text-primary)]">
              CNPJ: <span className="text-[var(--danger)]">*</span>
            </label>
            <input
              type="text"
              value={cnpj}
              onChange={handleCnpjChange}
              placeholder="00.000.000/0000-00"
              className="w-full rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-[var(--text-primary)]">
              UF (Estado): <span className="text-[var(--danger)]">*</span>
            </label>
            <select
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              className="w-full rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-2 font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            >
              {BRAZILIAN_UFS.map((u) => (
                <option key={u.code} value={u.acronym}>
                  {u.acronym}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block font-semibold text-[var(--text-primary)]">
            Pasta Específica para Documentos (Opcional):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="Padrão do sistema caso vazio"
              className="flex-1 rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
            <button
              type="button"
              onClick={handleChooseFolder}
              className="rounded border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus:outline-none"
            >
              Escolher
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2 font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-[var(--primary)] px-4 py-2 font-semibold text-white shadow-xs transition hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar Empresa'}
          </button>
        </div>
      </form>
    </DialogShell>
  );
};
