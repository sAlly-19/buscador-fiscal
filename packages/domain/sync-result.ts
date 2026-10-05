import { CombinedSefazQueryResult } from './types';
import { compareNSU } from './nsu';

export interface SyncResultPresentation {
  type: 'success' | 'info' | 'error';
  message: string;
}

export async function presentAfterRefresh<T>(
  refresh: () => Promise<void>,
  value: T,
  present: (value: T) => void
): Promise<void> {
  await refresh();
  present(value);
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
    !result.nfe.isComplete && result.nfe.success && compareNSU(result.nfe.ultNSU, result.nfe.maxNSU) < 0
      ? `NF-e: NSU ${result.nfe.ultNSU} de ${result.nfe.maxNSU}`
      : null,
    !result.cte.isComplete && result.cte.success && compareNSU(result.cte.ultNSU, result.cte.maxNSU) < 0
      ? `CT-e: NSU ${result.cte.ultNSU} de ${result.cte.maxNSU}`
      : null,
  ].filter((item): item is string => Boolean(item));

  const headline = hasTechnicalError
    ? 'Sincronização finalizada com erro.'
    : isComplete
      ? 'Sincronização concluída.'
      : pending.length > 0
        ? 'Sincronização parcial — ainda existem documentos pendentes.'
        : 'Sincronização não concluída.';
  const pendingMessage = pending.length > 0 ? ` Pendente: ${pending.join(' · ')}.` : '';

  return {
    type: hasTechnicalError ? 'error' : isComplete ? 'success' : 'info',
    message: `${headline} ${summarize('NF-e', result.nfe)}. ${summarize('CT-e', result.cte)}.${pendingMessage}`,
  };
}
