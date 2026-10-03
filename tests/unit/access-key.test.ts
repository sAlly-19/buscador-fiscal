import { describe, it, expect } from 'vitest';
import { 
  parseAccessKey, 
  sanitizeAccessKey, 
  formatAccessKey 
} from '../../packages/domain/access-key';

describe('Chave de Acesso DF-e (44 dígitos)', () => {
  // Chave de NF-e real válida emitida em SP
  // cUF: 35, AAMM: 2310, CNPJ: 41777943000102, mod: 55, serie: 001, nNF: 000012345, tpEmis: 1, cNF: 12345678, cDV: ?
  // Vamos usar uma chave com DV calculado:
  // Base 43: 3523104177794300010255001000012345112345678
  // DV cálculo:
  it('deve sanitizar chave removendo espaços e caracteres não numéricos', () => {
    expect(sanitizeAccessKey('3523 1041 7779 4300')).toBe('3523104177794300');
  });

  it('deve parsear os 44 dígitos nos componentes fiscais corretos', () => {
    const rawKey = '35231041777943000102550010000123451123456789';
    const parsed = parseAccessKey(rawKey);

    expect(parsed).not.toBeNull();
    expect(parsed?.cUF).toBe('35');
    expect(parsed?.anoMes).toBe('2310');
    expect(parsed?.cnpj).toBe('41777943000102');
    expect(parsed?.modelo).toBe('55');
    expect(parsed?.serie).toBe('001');
    expect(parsed?.numero).toBe('000012345');
    expect(parsed?.tipoEmissao).toBe('1');
    expect(parsed?.codigoNumerico).toBe('12345678');
    expect(parsed?.dv).toBe('9');
  });

  it('deve formatar chave em blocos de 4 dígitos', () => {
    const rawKey = '35231041777943000102550010000123451123456789';
    const formatted = formatAccessKey(rawKey);
    expect(formatted).toBe('3523 1041 7779 4300 0102 5500 1000 0123 4511 2345 6789');
  });
});
