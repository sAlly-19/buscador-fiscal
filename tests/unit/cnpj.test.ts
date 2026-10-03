import { describe, it, expect } from 'vitest';
import { isValidCNPJ, sanitizeCNPJ, formatCNPJ } from '../../packages/domain/cnpj';

describe('Validador de CNPJ', () => {
  it('deve sanitizar CNPJ removendo pontuação e caracteres não numéricos', () => {
    expect(sanitizeCNPJ('12.345.678/0001-90')).toBe('12345678000190');
    expect(sanitizeCNPJ('12345678000190')).toBe('12345678000190');
    expect(sanitizeCNPJ('abc12-345/678')).toBe('12345678');
  });

  it('deve formatar CNPJ com máscara padrão', () => {
    expect(formatCNPJ('12345678000190')).toBe('12.345.678/0001-90');
    expect(formatCNPJ('12.345.678/0001-90')).toBe('12.345.678/0001-90');
  });

  it('deve validar CNPJs reais e matematicamente válidos', () => {
    // CNPJs reais com dígitos verificadores corretos
    expect(isValidCNPJ('41.777.943/0001-02')).toBe(true);
    expect(isValidCNPJ('37.305.384/0001-60')).toBe(true);
    expect(isValidCNPJ('10.335.090/0001-25')).toBe(true);
  });

  it('deve rejeitar CNPJs com tamanho incorreto', () => {
    expect(isValidCNPJ('123')).toBe(false);
    expect(isValidCNPJ('1234567800019')).toBe(false);
    expect(isValidCNPJ('123456780001900')).toBe(false);
  });

  it('deve rejeitar sequências de dígitos repetidos', () => {
    expect(isValidCNPJ('00000000000000')).toBe(false);
    expect(isValidCNPJ('11111111111111')).toBe(false);
    expect(isValidCNPJ('99999999999999')).toBe(false);
  });

  it('deve rejeitar CNPJs com dígitos verificadores incorretos', () => {
    expect(isValidCNPJ('41.777.943/0001-99')).toBe(false);
    expect(isValidCNPJ('37.305.384/0001-00')).toBe(false);
  });
});
