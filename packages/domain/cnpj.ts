/**
 * Utilitários de Validação e Formatação de CNPJ de acordo com a Receita Federal do Brasil
 */

/**
 * Remove caracteres não numéricos do CNPJ
 */
export function sanitizeCNPJ(cnpj: string): string {
  if (!cnpj) return '';
  return cnpj.replace(/\D/g, '');
}

/**
 * Formata CNPJ numérico de 14 dígitos para visualização: 00.000.000/0000-00
 */
export function formatCNPJ(cnpj: string): string {
  const digits = sanitizeCNPJ(cnpj);
  if (digits.length !== 14) return cnpj;
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

/**
 * Validação dos dígitos verificadores do CNPJ (algoritmo Módulo 11 oficial)
 */
export function isValidCNPJ(cnpj: string): boolean {
  const digits = sanitizeCNPJ(cnpj);

  if (digits.length !== 14) {
    return false;
  }

  // Elimina sequências conhecidas de dígitos repetidos
  if (/^(\d)\1{13}$/.test(digits)) {
    return false;
  }

  // Validação do 1º dígito verificador
  let size = 12;
  let numbers = digits.substring(0, size);
  let pos = size - 7;
  let sum = 0;

  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--;
    if (pos < 2) {
      pos = 9;
    }
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number(digits.charAt(12))) {
    return false;
  }

  // Validação do 2º dígito verificador
  size = 13;
  numbers = digits.substring(0, size);
  pos = size - 7;
  sum = 0;

  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--;
    if (pos < 2) {
      pos = 9;
    }
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number(digits.charAt(13))) {
    return false;
  }

  return true;
}
