import React, { useState, useEffect } from 'react';
import { X, Settings, Folder, AlertTriangle } from 'lucide-react';
import { AppSettings, SefazEnvironment } from '../../packages/domain/types';
import { DialogShell } from './ui/DialogShell';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [defaultFolder, setDefaultFolder] = useState('');
  const [env, setEnv] = useState<SefazEnvironment>('homologation');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const s = await window.fiscalApi?.settings.get();
      if (s) {
        setDefaultFolder(s.default_storage_path || '');
        setEnv(s.sefaz_environment || 'homologation');
      }
    } catch {
      // Ignora
    }
  };

  const handleSelectFolder = async () => {
    try {
      const folder = await window.fiscalApi?.settings.selectFolder('Pasta Padrão de Armazenamento');
      if (folder) {
        setDefaultFolder(folder);
      }
    } catch {
      // Ignora
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await window.fiscalApi?.settings.update({
        default_storage_path: defaultFolder,
        sefaz_environment: env,
      });
      if (updated) {
        onSaved(updated);
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      titleId="settings-modal-title"
      size="md"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-header)] px-5 py-3.5 select-none">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
          <Settings className="h-4 w-4 text-[var(--primary)]" />
          <span id="settings-modal-title">Configurações do Sistema</span>
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

      <div className="space-y-4 p-5 text-xs">
        <div>
          <label className="mb-2 block font-semibold text-[var(--text-primary)]">
            Ambiente de Conexão SEFAZ:
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label
              className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition ${
                env === 'homologation'
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-500 shadow-xs'
                  : 'border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:border-[var(--border-default)]'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                <input
                  type="radio"
                  name="sefaz_env"
                  checked={env === 'homologation'}
                  onChange={() => setEnv('homologation')}
                  className="text-amber-500 focus:ring-amber-500"
                />
                <span>Homologação</span>
              </div>
              <span className="text-[11px] text-[var(--text-muted)]">
                Ambiente de testes (sem validade jurídica fiscal).
              </span>
            </label>

            <label
              className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition ${
                env === 'production'
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500 shadow-xs'
                  : 'border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:border-[var(--border-default)]'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                <input
                  type="radio"
                  name="sefaz_env"
                  checked={env === 'production'}
                  onChange={() => setEnv('production')}
                  className="text-emerald-500 focus:ring-emerald-500"
                />
                <span>Produção</span>
              </div>
              <span className="text-[11px] text-[var(--text-muted)]">
                Ambiente oficial com valor fiscal e contábil.
              </span>
            </label>
          </div>
        </div>

        <div>
          <label className="mb-1 block font-semibold text-[var(--text-primary)]">
            Pasta Padrão de Armazenamento:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={defaultFolder}
              onChange={(e) => setDefaultFolder(e.target.value)}
              placeholder="Ex: C:\Documentos Fiscais"
              className="flex-1 rounded border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 font-mono text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
            <button
              type="button"
              onClick={handleSelectFolder}
              className="flex items-center gap-1.5 rounded border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus:outline-none"
            >
              <Folder className="h-4 w-4 text-[var(--primary)]" />
              <span>Alterar</span>
            </button>
          </div>
          <span className="mt-1 block text-[11px] text-[var(--text-muted)]">
            Local onde os arquivos XML e PDFs serão organizados por CNPJ e ano/mês.
          </span>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3 text-[11px] text-[var(--text-muted)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
          <span>
            Ao alternar entre Homologação e Produção, o NSU de cada empresa é preservado individualmente por ambiente.
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-header)] p-4 select-none">
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50"
        >
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </DialogShell>
  );
};
