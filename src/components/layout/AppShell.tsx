import React from 'react';
import { useUiStore } from '../../stores/ui.store';

export interface AppShellProps {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  toolbar: React.ReactNode;
  content: React.ReactNode;
  footer: React.ReactNode;
  overlays?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ header, sidebar, toolbar, content, footer, overlays }) => {
  const theme = useUiStore((state) => state.theme);

  return (
    <div
      data-testid="app-shell"
      className={`theme-${theme} flex h-screen flex-col overflow-hidden bg-[var(--surface-app)] font-sans text-[var(--text-primary)] antialiased`}
    >
      {header}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {sidebar}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--surface-workspace)]">
          {toolbar}
          {content}
        </main>
      </div>
      {footer}
      {overlays}
    </div>
  );
};
