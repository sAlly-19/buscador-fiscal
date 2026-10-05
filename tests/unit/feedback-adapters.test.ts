import { describe, expect, it } from 'vitest';
import { feedbackFromError, feedbackFromSyncResult } from '../../src/features/feedback/feedback-adapters';
import { presentAfterRefresh } from '../../packages/domain/sync-result';
import type { CombinedSefazQueryResult, SefazQueryResult } from '../../packages/domain/types';

function result(overrides: Partial<SefazQueryResult> = {}): SefazQueryResult {
  return {
    success: true,
    cStat: 138,
    xMotivo: 'Documentos localizados',
    ultNSU: '000000000000020',
    maxNSU: '000000000000020',
    documentsCount: 10,
    isComplete: true,
    ...overrides,
  };
}

function combined(nfe: Partial<SefazQueryResult> = {}, cte: Partial<SefazQueryResult> = {}): CombinedSefazQueryResult {
  return {
    success: true,
    nfe: result(nfe),
    cte: result(cte),
    documentsCount: 20,
  };
}

describe('adaptadores de feedback', () => {
  it('mapeia sincronizacao completa e parcial preservando o resumo', () => {
    expect(feedbackFromSyncResult(combined())).toMatchObject({
      kind: 'success',
      title: 'Sincronização concluída',
      message: expect.stringMatching(/NF-e: 10 documento/),
    });

    expect(feedbackFromSyncResult(combined({
      isComplete: false,
      ultNSU: '000000000000010',
      maxNSU: '000000000000020',
    }))).toMatchObject({
      kind: 'info',
      title: 'Sincronização parcial',
      message: expect.stringMatching(/Pendente: NF-e/),
    });
  });

  it('mapeia bloqueio temporario como aviso e falha tecnica como erro copiavel', () => {
    const rateLimited = feedbackFromSyncResult(combined(
      { success: false, cStat: 656, xMotivo: 'Consumo indevido', isComplete: false, rateLimitedUntil: '2026-10-05T14:00:00Z' },
      { success: false, cStat: 656, xMotivo: 'Consumo indevido', isComplete: false, rateLimitedUntil: '2026-10-05T14:00:00Z' },
    ));
    expect(rateLimited).toMatchObject({ kind: 'warning', title: 'Sincronização adiada' });

    const failed = feedbackFromSyncResult(combined(
      { success: false, isComplete: false, error: 'EPERM: rename nfe.tmp' },
      { success: false, isComplete: false, error: 'timeout CT-e' },
    ));
    expect(failed).toMatchObject({ kind: 'error', title: 'Erro na sincronização' });
    expect(failed.technicalDetails).toContain('EPERM: rename nfe.tmp');
    expect(failed.technicalDetails).toContain('timeout CT-e');
  });

  it('normaliza Error, string e valor desconhecido com titulo humano', () => {
    expect(feedbackFromError('Falha ao buscar', new Error('banco indisponivel'), 'Busca nao concluida.')).toEqual({
      kind: 'error',
      title: 'Falha ao buscar',
      message: 'Busca nao concluida.',
      technicalDetails: 'banco indisponivel',
    });
    expect(feedbackFromError('Falha', 'texto tecnico', 'Operacao nao concluida.').technicalDetails).toBe('texto tecnico');
    expect(feedbackFromError('Falha', { code: 5 }, 'Operacao nao concluida.')).toMatchObject({
      message: 'Operacao nao concluida.',
      technicalDetails: '{"code":5}',
    });
  });

  it('publica feedback final somente depois de recarregar os documentos', async () => {
    const order: string[] = [];
    const feedback = feedbackFromSyncResult(combined());

    await presentAfterRefresh(
      async () => { order.push('reload'); },
      feedback,
      (value) => { order.push(`feedback:${value.kind}`); },
    );

    expect(order).toEqual(['reload', 'feedback:success']);
  });
});
