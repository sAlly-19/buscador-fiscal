// @vitest-environment jsdom

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { changePageSize } from '../../src/features/documents/page-size-controller';
import { Pagination } from '../../src/components/DocumentTable/Pagination';
import { SettingsModal } from '../../src/components/SettingsModal';
import type { AppSettings } from '../../packages/domain/types';

const settings: AppSettings = {
  default_storage_path: 'C:/Documentos',
  sefaz_environment: 'homologation',
  items_per_page: 50,
  log_level: 'info',
};

describe('tamanho de pagina na Home', () => {
  it('persiste a escolha antes de recarregar a primeira pagina', async () => {
    const order: string[] = [];
    const save = vi.fn(async () => {
      order.push('save');
      return { ...settings, items_per_page: 500 };
    });
    const reloadFirstPage = vi.fn(async (size: number) => {
      order.push(`reload:${size}`);
    });

    const result = await changePageSize(500, save, reloadFirstPage);

    expect(save).toHaveBeenCalledWith({ items_per_page: 500 });
    expect(reloadFirstPage).toHaveBeenCalledWith(500);
    expect(order).toEqual(['save', 'reload:500']);
    expect(result.items_per_page).toBe(500);
  });

  it('renderiza exatamente as cinco opcoes em arquivos e comunica a mudanca', async () => {
    const onPageSizeChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Pagination
        currentPage={1}
        totalPages={3}
        pageSize={50}
        onPageChange={vi.fn()}
        onPageSizeChange={onPageSizeChange}
      />,
    );

    const selector = screen.getByLabelText('Exibir por vez');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      '50 arquivos',
      '100 arquivos',
      '200 arquivos',
      '500 arquivos',
      '1000 arquivos',
    ]);

    await user.selectOptions(selector, '500');
    expect(onPageSizeChange).toHaveBeenCalledWith(500);
  });

  it('remove o campo de Configuracoes e nao o envia ao salvar', async () => {
    const update = vi.fn(async (partial: Partial<AppSettings>) => ({ ...settings, ...partial }));
    Object.defineProperty(window, 'fiscalApi', {
      configurable: true,
      value: {
        settings: {
          get: vi.fn(async () => settings),
          update,
          selectFolder: vi.fn(),
        },
      },
    });
    const user = userEvent.setup();
    render(<SettingsModal isOpen onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.queryByText(/Documentos por Página/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith({
      default_storage_path: 'C:/Documentos',
      sefaz_environment: 'homologation',
    });
    expect(update.mock.calls[0][0]).not.toHaveProperty('items_per_page');
  });
});
