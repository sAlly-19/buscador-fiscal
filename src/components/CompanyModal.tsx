import React, { useState, useEffect } from 'react';
import { X, Building2, AlertCircle } from 'lucide-react';
import { Company } from '../../packages/domain/types';
import { formatCNPJ, isValidCNPJ, sanitizeCNPJ } from '../../packages/domain/cnpj';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; cnpj: string; folder_path?: string }) => Promise<void>;
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
  const [folderPath, setFolderPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingCompany) {
      setName(editingCompany.name);
      setCnpj(formatCNPJ(editingCompany.cnpj));
      setFolderPath(editingCompany.folder_path || '');
    } else {
      setName('');
      setCnpj('');
      setFolderPath('');
    }
    setError(null);
  }, [editingCompany, isOpen]);

  if (!isOpen) return null;

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = sanitizeCNPJ(raw);
    if (digits.length <= 14) {
      setCnpj(formatCNPJ(digits));
    }
  };

  const handleChooseFolder = async () => {
    try {
      const selected = await window.fiscalApi?.settings.selectFolder('Selecione a Pasta da Empresa');
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
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Building2 className="w-4 h-4 text-sky-600" />
            <span>{editingCompany ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}</span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-1 rounded hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Razão Social / Nome da Empresa: <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Minha Empresa Distribuidora Ltda"
              className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              autoFocus
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              CNPJ (apenas dígitos ou com pontuação): <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text"
              value={cnpj}
              onChange={handleCnpjChange}
              placeholder="00.000.000/0000-00"
              className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Pasta Específica para Documentos (Opcional):
            </label>
            <div className="flex gap-2">
              <input 
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="Padrão do sistema caso vazio"
                className="flex-1 border border-slate-300 rounded px-3 py-2 text-slate-800 text-[11px] focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              />
              <button
                type="button"
                onClick={handleChooseFolder}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-semibold text-slate-700 transition"
              >
                Escolher
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 transition font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-700 text-white font-semibold transition disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
