import { CombinedSefazQueryResult } from './types';

export interface SyncResultPresentation {
  type: 'success' | 'info' | 'error';
  message: string;
}

export function describeCombinedSyncResult(
  result: CombinedSefazQueryResult
): SyncResultPresentation {
  const summarize = (label: string, item: typeof result.nfe): string => item.success
    ? `${label}: ${item.documentsCount} documento(s), NSU ${item.ultNSU}`
    : `${label}: ${item.xMotivo}`;
  const hasTechnicalError = Boolean(result.nfe.error || result.cte.error);
  const isComplete = result.nfe.isComplete && result.cte.isComplete;
  const pending = [
    !result.nfe.isComplete && result.nfe.success
      ? `NF-e: NSU ${result.nfe.ultNSU} de ${result.nfe.maxNSU}`
      : null,
    !result.cte.isComplete && result.cte.success
      ? `CT-e: NSU ${result.cte.ultNSU} de ${result.cte.maxNSU}`
      : null,
  ].filter((item): item is string => Boolean(item));

  const headline = hasTechnicalError
    ? 'Sincronização finalizada com erro.'
    : isComplete
      ? 'Sincronização concluída.'
      : 'Sincronização parcial — ainda existem documentos pendentes.';
  const pendingMessage = pending.length > 0 ? ` Pendente: ${pending.join(' · ')}.` : '';

  return {
    type: hasTechnicalError ? 'error' : isComplete ? 'success' : 'info',
    message: `${headline} ${summarize('NF-e', result.nfe)}. ${summarize('CT-e', result.cte)}.${pendingMessage}`,
  };
}
