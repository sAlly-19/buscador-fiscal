import { describe, expect, it } from 'vitest';
import {
  describeCombinedSyncResult,
  presentAfterRefresh,
} from '../../packages/domain/sync-result';
import { CombinedSefazQueryResult, SefazQueryResult } from '../../packages/domain/types';

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

describe('apresentação do resultado de sincronização', () => {
  it('apresenta o resultado somente depois que a atualização da lista terminar', async () => {
    let banner: string | null = 'mensagem anterior';
    await presentAfterRefresh(
      async () => { banner = null; },
      'Sincronização parcial',
      (message) => { banner = message; }
    );

    expect(banner).toBe('Sincronização parcial');
  });

  it('informa sincronização parcial quando ainda existem NSUs pendentes', () => {
    const combined: CombinedSefazQueryResult = {
      success: true,
      nfe: result({
        ultNSU: '000000000015537',
        maxNSU: '000000000015594',
        documentsCount: 1000,
        isComplete: false,
      }),
      cte: result({ documentsCount: 30 }),
      documentsCount: 1030,
    };

    const presentation = describeCombinedSyncResult(combined);

    expect(presentation.type).toBe('info');
    expect(presentation.message).toMatch(/Sincronização parcial/i);
    expect(presentation.message).toContain('NF-e: NSU 000000000015537 de 000000000015594');
  });

  it('informa conclusão somente quando NF-e e CT-e chegaram ao maxNSU', () => {
    const combined: CombinedSefazQueryResult = {
      success: true,
      nfe: result(),
      cte: result({ documentsCount: 3 }),
      documentsCount: 13,
    };

    const presentation = describeCombinedSyncResult(combined);

    expect(presentation.type).toBe('success');
    expect(presentation.message).toMatch(/Sincronização concluída/i);
    expect(presentation.message).not.toMatch(/parcial/i);
  });

  it('não afirma que há documentos pendentes quando a consulta foi adiada sem lacuna de NSU', () => {
    const combined: CombinedSefazQueryResult = {
      success: false,
      nfe: result({
        success: false,
        cStat: 656,
        xMotivo: 'Consumo indevido. Consulta temporariamente bloqueada.',
        isComplete: false,
        rateLimitedUntil: '2026-10-05T14:00:00.000Z',
      }),
      cte: result({
        success: false,
        cStat: 656,
        xMotivo: 'Consumo indevido. Consulta temporariamente bloqueada.',
        isComplete: false,
        rateLimitedUntil: '2026-10-05T14:00:00.000Z',
      }),
      documentsCount: 0,
    };

    const presentation = describeCombinedSyncResult(combined);

    expect(presentation.type).toBe('warning');
    expect(presentation.message).toMatch(/não concluída/i);
    expect(presentation.message).not.toMatch(/documentos pendentes/i);
    expect(presentation.message).not.toMatch(/Pendente:/i);
  });
});
