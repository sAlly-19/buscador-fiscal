/**
 * Utilitários para validação e decomposição da Chave de Acesso DFe (44 dígitos)
 * Padrão Nacional: [cUF: 2][AAMM: 4][CNPJ: 14][mod: 2][serie: 3][nNF: 9][tpEmis: 1][cNF: 8][cDV: 1]
 */

export interface ParsedAccessKey {
  cUF: string;
  anoMes: string;
  cnpj: string;
  modelo: string;
  serie: string;
  numero: string;
  tipoEmissao: string;
  codigoNumerico: string;
  dv: string;
}

export function sanitizeAccessKey(key: string): string {
  if (!key) return '';
  return key.replace(/\D/g, '');
}

export function isValidAccessKey(key: string): boolean {
  const clean = sanitizeAccessKey(key);
  if (clean.length !== 44) return false;

  // Validação do dígito verificador (módulo 11 ponderado de 2 a 9)
  const base = clean.substring(0, 43);
  let weight = 2;
  let sum = 0;

  for (let i = base.length - 1; i >= 0; i--) {
    sum += Number(base[i]) * weight;
    weight++;
    if (weight > 9) weight = 2;
  }

  const remainder = sum % 11;
  const calculatedDV = remainder === 0 || remainder === 1 ? 0 : 11 - remainder;

  return calculatedDV === Number(clean[43]);
}

export function parseAccessKey(key: string): ParsedAccessKey | null {
  const clean = sanitizeAccessKey(key);
  if (clean.length !== 44) return null;

  return {
    cUF: clean.substring(0, 2),
    anoMes: clean.substring(2, 6),
    cnpj: clean.substring(6, 20),
    modelo: clean.substring(20, 22),
    serie: clean.substring(22, 25),
    numero: clean.substring(25, 34),
    tipoEmissao: clean.substring(34, 35),
    codigoNumerico: clean.substring(35, 43),
    dv: clean.substring(43, 44),
  };
}

export function formatAccessKey(key: string): string {
  const clean = sanitizeAccessKey(key);
  if (clean.length !== 44) return key;
  return clean.replace(/(\d{4})/g, '$1 ').trim();
}
