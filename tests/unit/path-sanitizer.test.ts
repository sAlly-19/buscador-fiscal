import { describe, it, expect } from 'vitest';
import path from 'path';
import { 
  sanitizeFilename, 
  isSafeSubpath, 
  buildSafeDocumentPath 
} from '../../packages/storage/path-sanitizer';

describe('Sanitização e Segurança de Caminhos de Arquivo', () => {
  it('deve remover caracteres proibidos no Windows de nomes de arquivo', () => {
    expect(sanitizeFilename('nota:fiscal<123>*?.xml')).toBe('nota_fiscal_123___.xml');
    expect(sanitizeFilename('empresa/subpasta\\arquivo.pdf')).toBe('empresa_subpasta_arquivo.pdf');
    expect(sanitizeFilename('teste|com"aspas')).toBe('teste_com_aspas');
  });

  it('deve neutralizar tentativas de Directory Traversal em nomes de arquivo', () => {
    expect(sanitizeFilename('../../malicious.exe')).toBe('malicious.exe');
    expect(sanitizeFilename('..\\..\\malicious.xml')).toBe('malicious.xml');
  });

  it('deve validar se um subcaminho é seguro dentro do diretório base', () => {
    const base = path.resolve('C:/Documentos/Fiscais');
    const safeSub = path.resolve('C:/Documentos/Fiscais/EmpresaA/NFe/2026/09/nota.xml');
    const unsafeSub = path.resolve('C:/Documentos/Outro/arquivo.xml');
    const traversalSub = path.resolve('C:/Documentos/Fiscais/../../Windows/System32/cmd.exe');

    expect(isSafeSubpath(base, safeSub)).toBe(true);
    expect(isSafeSubpath(base, unsafeSub)).toBe(false);
    expect(isSafeSubpath(base, traversalSub)).toBe(false);
  });

  it('deve construir caminho seguro padronizado e lançar erro se houver violação', () => {
    const base = path.resolve('C:/Documentos/Fiscais');
    const safePath = buildSafeDocumentPath(
      base,
      '41777943000102_Empresa_A',
      'NFe',
      '2026',
      '09',
      '35260912345678000190550010000123451000123456.xml'
    );

    expect(isSafeSubpath(base, safePath)).toBe(true);
    expect(safePath).toContain('41777943000102_Empresa_A');
    expect(safePath).toContain('NFe');
  });
});
