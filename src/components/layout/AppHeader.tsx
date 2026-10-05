import React from 'react';
import { Building2, Moon, RefreshCw, Settings, Sun } from 'lucide-react';
import type { Company, SefazEnvironment } from '../../../packages/domain/types';
import type { UiTheme } from '../../stores/ui.store';

interface AppHeaderProps {
  activeCompany: Pick<Company, 'name'> | null;
  environment: SefazEnvironment;
  theme: UiTheme;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onSynchronize: () => void;
  isSynchronizing?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeCompany,
  environment,
  theme,
  onToggleTheme,
  onOpenSettings,
  onSynchronize,
  isSynchronizing = false,
}) => (
  <header className="flex h-14 shrink-0 items-center gap-4 border-b border-[var(--border-subtle)] bg-[var(--surface-header)] px-4 shadow-sm">
    <div className="flex min-w-52 items-center gap-2.5">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-950/20">
        <Building2 className="h-4.5 w-4.5" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold">Buscador Fiscal</div>
        <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">NF-e e CT-e · SEFAZ</div>
      </div>
    </div>

    <div className="min-w-0 flex-1 border-l border-[var(--border-subtle)] pl-4">
      <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Empresa ativa</div>
      <div className="truncate text-sm font-medium" title={activeCompany?.name || undefined}>
        {activeCompany?.name || 'Nenhuma empresa ativa'}
      </div>
    </div>

    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
      environment === 'production'
        ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-500'
        : 'border-amber-500/35 bg-amber-500/10 text-amber-500'
    }`}>
      {environment === 'production' ? 'Produção' : 'Homologação'}
    </span>

    <button
      type="button"
      onClick={onSynchronize}
      disabled={isSynchronizing || !activeCompany}
      aria-label="Sincronizar com a SEFAZ"
      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <RefreshCw className={`h-4 w-4 ${isSynchronizing ? 'animate-spin' : ''}`} />
      Sincronizar
    </button>
    <button type="button" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'} className="rounded-lg border border-[var(--border-default)] p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
    <button type="button" onClick={onOpenSettings} aria-label="Configurações" className="rounded-lg border border-[var(--border-default)] p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">
      <Settings className="h-4 w-4" />
    </button>
  </header>
);
