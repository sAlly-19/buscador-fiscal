import { describeCombinedSyncResult } from '../../../packages/domain/sync-result';
import type { CombinedSefazQueryResult } from '../../../packages/domain/types';
import type { FeedbackInput } from '../../stores/ui.store';

function technicalText(error: unknown): string | undefined {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error === null || error === undefined) return undefined;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function feedbackFromError(title: string, error: unknown, fallback: string): FeedbackInput {
  return {
    kind: 'error',
    title,
    message: fallback,
    technicalDetails: technicalText(error),
  };
}

export function feedbackFromSyncResult(result: CombinedSefazQueryResult): FeedbackInput {
  const presentation = describeCombinedSyncResult(result);
  const titles = {
    success: 'Sincronização concluída',
    info: 'Sincronização parcial',
    warning: 'Sincronização adiada',
    error: 'Erro na sincronização',
  } as const;
  const technicalDetails = [
    result.nfe.error ? `NF-e: ${result.nfe.error}` : null,
    result.cte.error ? `CT-e: ${result.cte.error}` : null,
  ].filter((value): value is string => Boolean(value)).join('\n') || undefined;

  return {
    kind: presentation.type,
    title: titles[presentation.type],
    message: presentation.message,
    technicalDetails,
  };
}
