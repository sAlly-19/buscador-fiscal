// @vitest-environment jsdom

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '../../src/components/layout/AppShell';
import { AppHeader } from '../../src/components/layout/AppHeader';
import { useUiStore } from '../../src/stores/ui.store';

describe('moldura do workspace fiscal', () => {
  beforeEach(() => {
    localStorage.clear();
    useUiStore.setState({ theme: 'dark', feedbackQueue: [] });
  });

  it('usa tema escuro por padrao e reage ao tema persistido', () => {
    render(
      <AppShell
        header={<div>Cabecalho</div>}
        sidebar={<div>Lateral</div>}
        toolbar={<div>Filtros</div>}
        content={<div>Conteudo</div>}
        footer={<div>Rodape</div>}
      />,
    );

    expect(screen.getByTestId('app-shell')).toHaveClass('theme-dark');
    act(() => useUiStore.getState().setTheme('light'));
    expect(screen.getByTestId('app-shell')).toHaveClass('theme-light');
    expect(localStorage.getItem('buscador-fiscal-ui-v1')).toContain('light');
  });

  it('mostra empresa truncavel, ambiente e encaminha os callbacks do header', async () => {
    const onToggleTheme = vi.fn();
    const onOpenSettings = vi.fn();
    const onSynchronize = vi.fn();
    const longName = 'SUPERMERCADO PRECO BAIXO TODO DIA COMERCIO DE ALIMENTOS LTDA';
    const user = userEvent.setup();
    const { rerender } = render(
      <AppHeader
        activeCompany={{ name: longName }}
        environment="production"
        theme="dark"
        onToggleTheme={onToggleTheme}
        onOpenSettings={onOpenSettings}
        onSynchronize={onSynchronize}
      />,
    );

    expect(screen.getByTitle(longName)).toHaveClass('truncate');
    expect(screen.getByText('Produção')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Alternar para tema claro' }));
    await user.click(screen.getByRole('button', { name: 'Configurações' }));
    await user.click(screen.getByRole('button', { name: 'Sincronizar com a SEFAZ' }));
    expect(onToggleTheme).toHaveBeenCalledOnce();
    expect(onOpenSettings).toHaveBeenCalledOnce();
    expect(onSynchronize).toHaveBeenCalledOnce();

    rerender(
      <AppHeader
        activeCompany={null}
        environment="homologation"
        theme="light"
        onToggleTheme={onToggleTheme}
        onOpenSettings={onOpenSettings}
        onSynchronize={onSynchronize}
      />,
    );
    expect(screen.getByText('Homologação')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma empresa ativa')).toBeInTheDocument();
  });
});
