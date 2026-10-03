import { describe, it, expect } from 'vitest';
import { formatNSU, isValidNSU, compareNSU, isSyncComplete, INITIAL_NSU } from '../../packages/domain/nsu';

describe('Regras de NSU (Número Sequencial Único)', () => {
  it('deve formatar número em NSU com 15 dígitos alinhados à esquerda com zeros', () => {
    expect(formatNSU(1)).toBe('000000000000001');
    expect(formatNSU('123')).toBe('000000000000123');
    expect(formatNSU(0)).toBe('000000000000000');
    expect(formatNSU(INITIAL_NSU)).toBe('000000000000000');
  });

  it('deve validar se a string é um NSU válido', () => {
    expect(isValidNSU('000000000000001')).toBe(true);
    expect(isValidNSU('000000000012345')).toBe(true);
    expect(isValidNSU('12345')).toBe(false);
    expect(isValidNSU('00000000000000A')).toBe(false);
    expect(isValidNSU('')).toBe(false);
  });

  it('deve comparar dois NSUs numericamente de forma correta', () => {
    expect(compareNSU('000000000000010', '000000000000020')).toBe(-1);
    expect(compareNSU('000000000000020', '000000000000010')).toBe(1);
    expect(compareNSU('000000000000010', '000000000000010')).toBe(0);
  });

  it('deve identificar se a sincronização está completa', () => {
    // ultNSU >= maxNSU significa que todos os documentos foram baixados
    expect(isSyncComplete('000000000000100', '000000000000100')).toBe(true);
    expect(isSyncComplete('000000000000101', '000000000000100')).toBe(true);
    // ultNSU < maxNSU significa que há mais documentos pendentes
    expect(isSyncComplete('000000000000050', '000000000000100')).toBe(false);
  });
});
