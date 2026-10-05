// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  feedbackDuration,
  formatFeedbackForClipboard,
  useUiStore,
} from '../../src/stores/ui.store';

const STORAGE_KEY = 'buscador-fiscal-ui-v1';

describe('estado visual da aplicacao', () => {
  beforeEach(() => {
    localStorage.clear();
    useUiStore.setState({ theme: 'dark', feedbackQueue: [] });
  });

  it('usa tema escuro por padrao e persiste a escolha clara', () => {
    expect(useUiStore.getState().theme).toBe('dark');

    useUiStore.getState().setTheme('light');

    expect(useUiStore.getState().theme).toBe('light');
    expect(localStorage.getItem(STORAGE_KEY)).toContain('light');
  });

  it('hidrata tema claro e troca entre os dois temas', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { theme: 'light' }, version: 0 }));
    await useUiStore.persist.rehydrate();
    expect(useUiStore.getState().theme).toBe('light');

    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe('dark');
  });

  it('recupera tema persistido desconhecido como escuro', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { theme: 'sepia' }, version: 0 }));
    await useUiStore.persist.rehydrate();

    expect(useUiStore.getState().theme).toBe('dark');
  });

  it('define as duracoes por tipo sem temporizador para erro', () => {
    expect(feedbackDuration('success')).toBe(3000);
    expect(feedbackDuration('info')).toBe(5000);
    expect(feedbackDuration('warning')).toBe(5000);
    expect(feedbackDuration('error')).toBeNull();
  });

  it('mantem feedback em fila FIFO e expoe o proximo ao dispensar', () => {
    const firstId = useUiStore.getState().pushFeedback({ kind: 'info', title: 'Primeiro', message: 'A' });
    const secondId = useUiStore.getState().pushFeedback({ kind: 'error', title: 'Segundo', message: 'B' });

    expect(useUiStore.getState().feedbackQueue.map((item) => item.title)).toEqual(['Primeiro', 'Segundo']);
    useUiStore.getState().dismissFeedback(firstId);
    expect(useUiStore.getState().feedbackQueue[0]).toMatchObject({ id: secondId, title: 'Segundo' });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').state).not.toHaveProperty('feedbackQueue');
  });

  it('formata copia com ou sem detalhes tecnicos', () => {
    const base = {
      id: 'feedback-1',
      kind: 'error' as const,
      title: 'Falha ao sincronizar',
      message: 'Nao foi possivel concluir.',
      durationMs: null,
    };

    expect(formatFeedbackForClipboard(base)).toBe('Falha ao sincronizar\nNao foi possivel concluir.');
    expect(formatFeedbackForClipboard({ ...base, technicalDetails: 'EPERM: rename database.tmp' })).toBe(
      'Falha ao sincronizar\nNao foi possivel concluir.\n\nDetalhes técnicos:\nEPERM: rename database.tmp',
    );
  });
});
