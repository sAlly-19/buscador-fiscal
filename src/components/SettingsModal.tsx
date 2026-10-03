import React, { useState, useEffect } from 'react';
import { X, Settings, Folder, Save, AlertTriangle } from 'lucide-react';
import { AppSettings, SefazEnvironment } from '../../packages/domain/types';

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
  const [pageSize, setPageSize] = useState(50);
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
        setPageSize(s.items_per_page || 50);
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
        items_per_page: Number(pageSize),
      });
      if (updated) {
        onSaved(updated);
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Settings className="w-4 h-4 text-sky-600" />
            <span>Configurações do Sistema</span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-1 rounded hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Ambiente de Conexão SEFAZ:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`p-3 rounded border cursor-pointer flex flex-col gap-1 transition ${
                env === 'homologation' 
                  ? 'border-amber-400 bg-amber-50/70 text-amber-900 ring-1 ring-amber-400' 
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}>
                <div className="flex items-center gap-2 font-bold">
                  <input 
                    type="radio" 
                    name="sefaz_env"
                    checked={env === 'homologation'}
                    onChange={() => setEnv('homologation')}
                    className="text-amber-600" 
                  />
                  <span>HOMOLOGAÇÃO</span>
                </div>
                <span className="text-[10px] text-slate-500">
                  Ambiente de testes (sem validade fiscal real).
                </span>
              </label>

              <label className={`p-3 rounded border cursor-pointer flex flex-col gap-1 transition ${
                env === 'production' 
                  ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 ring-1 ring-emerald-500' 
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}>
                <div className="flex items-center gap-2 font-bold">
                  <input 
                    type="radio" 
                    name="sefaz_env"
                    checked={env === 'production'}
                    onChange={() => setEnv('production')}
                    className="text-emerald-600" 
                  />
                  <span>PRODUÇÃO</span>
                </div>
                <span className="text-[10px] text-slate-500">
                  Ambiente oficial da Receita Federal / SEFAZ.
                </span>
              </label>
            </div>
            {env === 'production' && (
              <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span>Atenção: As consultas em produção refletem no ambiente fiscal real da empresa.</span>
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Pasta Padrão dos Documentos Fiscais:
            </label>
            <div className="flex gap-2">
              <input 
                type="text"
                value={defaultFolder}
                onChange={(e) => setDefaultFolder(e.target.value)}
                placeholder="Ex: C:\Documentos Fiscais"
                className="flex-1 border border-slate-300 rounded px-3 py-2 text-slate-800 font-mono text-[11px] bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" 
              />
              <button 
                type="button"
                onClick={handleSelectFolder}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-semibold text-slate-700 flex items-center gap-1 transition"
              >
                <Folder className="w-3.5 h-3.5" />
                <span>Escolher</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Documentos por Página:
            </label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border border-slate-300 rounded px-3 py-2 text-slate-800 font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value={25}>25 documentos</option>
              <option value={50}>50 documentos</option>
              <option value={100}>100 documentos</option>
            </select>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 transition font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-sky-600 hover:bg-sky-700 text-white font-semibold transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
