/**
 * Utilitários e regras para Número Sequencial Único (NSU) da SEFAZ
 * Conforme NT 2014.002 e NT 2015.002, o NSU é composto por 15 dígitos alinhados à esquerda com zeros.
 */

export const INITIAL_NSU = '000000000000000';

/**
 * Normaliza e formata um valor numérico ou string em um NSU de 15 dígitos
 */
export function formatNSU(value: string | number | bigint): string {
  if (value === undefined || value === null) {
    return INITIAL_NSU;
  }
  const clean = String(value).replace(/\D/g, '');
  if (!clean) return INITIAL_NSU;
  return clean.padStart(15, '0');
}

/**
 * Valida se a string é um NSU válido (exatamente 15 dígitos numéricos)
 */
export function isValidNSU(nsu: string): boolean {
  if (!nsu || typeof nsu !== 'string') return false;
  return /^\d{15}$/.test(nsu);
}

/**
 * Compara dois NSUs numericamente
 * Retorna:
 *  -1 se nsuA < nsuB
 *   0 se nsuA === nsuB
 *   1 se nsuA > nsuB
 */
export function compareNSU(nsuA: string, nsuB: string): number {
  const normA = formatNSU(nsuA);
  const normB = formatNSU(nsuB);
  
  const bigA = BigInt(normA);
  const bigB = BigInt(normB);

  if (bigA < bigB) return -1;
  if (bigA > bigB) return 1;
  return 0;
}

/**
 * Determina se a sincronização com a SEFAZ está completa (ultNSU >= maxNSU)
 */
export function isSyncComplete(ultNSU: string, maxNSU: string): boolean {
  const normUlt = formatNSU(ultNSU);
  const normMax = formatNSU(maxNSU);
  
  if (normMax === INITIAL_NSU) return true;
  return compareNSU(normUlt, normMax) >= 0;
}
