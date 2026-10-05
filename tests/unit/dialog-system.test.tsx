// @vitest-environment jsdom

import React, { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DialogShell } from '../../src/components/ui/DialogShell';
import { FeedbackModalHost } from '../../src/components/feedback/FeedbackModalHost';
import { ConfirmDialog } from '../../src/components/feedback/ConfirmDialog';
import { useUiStore } from '../../src/stores/ui.store';

describe('sistema de dialogos', () => {
  beforeEach(() => {
    useUiStore.setState({ feedbackQueue: [], theme: 'dark' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rotula o dialogo, contem o foco, fecha com Escape e restaura o foco', () => {
    const onClose = vi.fn();
    const initialFocusRef = createRef<HTMLButtonElement>();
    const origin = document.createElement('button');
    origin.textContent = 'Origem';
    document.body.appendChild(origin);
    origin.focus();

    const { rerender } = render(
      <DialogShell isOpen titleId="dialog-title" onClose={onClose} initialFocusRef={initialFocusRef}>
        <h2 id="dialog-title">Titulo fiscal</h2>
        <button ref={initialFocusRef}>Primeiro</button>
        <button>Ultimo</button>
      </DialogShell>,
    );

    expect(screen.getByRole('dialog', { name: 'Titulo fiscal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Primeiro' })).toHaveFocus();
    screen.getByRole('button', { name: 'Ultimo' }).focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Primeiro' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();

    rerender(
      <DialogShell isOpen={false} titleId="dialog-title" onClose={onClose}>
        <h2 id="dialog-title">Titulo fiscal</h2>
      </DialogShell>,
    );
    expect(origin).toHaveFocus();
    origin.remove();
  });

  it('mantem fila e aplica 3s para sucesso e 5s para informacao', () => {
    vi.useFakeTimers();
    useUiStore.getState().pushFeedback({ kind: 'success', title: 'Concluido', message: 'Primeiro' });
    useUiStore.getState().pushFeedback({ kind: 'info', title: 'Informacao', message: 'Segundo' });
    render(<FeedbackModalHost />);

    expect(screen.getByRole('dialog', { name: 'Concluido' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByRole('dialog', { name: 'Informacao' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(4999));
    expect(screen.getByRole('dialog', { name: 'Informacao' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('nao fecha erro por tempo ou clique no fundo', () => {
    vi.useFakeTimers();
    useUiStore.getState().pushFeedback({ kind: 'error', title: 'Erro fiscal', message: 'Falhou' });
    render(<FeedbackModalHost />);

    act(() => vi.advanceTimersByTime(60_000));
    fireEvent.mouseDown(screen.getByTestId('dialog-backdrop'));
    expect(screen.getByRole('dialog', { name: 'Erro fiscal' })).toBeInTheDocument();
  });

  it('copia erro e apresenta confirmacao sem dispensar o dialogo', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    useUiStore.getState().pushFeedback({
      kind: 'error',
      title: 'Erro ao sincronizar',
      message: 'A operacao falhou.',
      technicalDetails: 'EPERM: rename database.tmp',
    });
    render(<FeedbackModalHost />);

    await userEvent.click(screen.getByRole('button', { name: 'Copiar erro' }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('EPERM: rename database.tmp'));
    expect(screen.getByText('Erro copiado.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Erro ao sincronizar' })).toBeInTheDocument();
  });

  it.each(['ausente', 'rejeitada'] as const)('mantem erro aberto quando a area de transferencia esta %s', async (mode) => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: mode === 'rejeitada' ? { writeText: vi.fn().mockRejectedValue(new Error('negado')) } : undefined,
    });
    useUiStore.getState().pushFeedback({ kind: 'error', title: 'Erro persistente', message: 'Falhou' });
    render(<FeedbackModalHost />);

    await userEvent.click(screen.getByRole('button', { name: 'Copiar erro' }));

    expect(await screen.findByText('Não foi possível copiar o erro.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Erro persistente' })).toBeInTheDocument();
  });

  it('confirma ou cancela sem possuir estado de negocio', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        isOpen
        title="Resetar NSU"
        description="Confirme a operacao"
        confirmLabel="Resetar"
        variant="danger"
        isBusy={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Resetar' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
