import { describe, expect, it } from 'vitest';
import {
  isPageSize,
  normalizePageSize,
  PAGE_SIZE_OPTIONS,
} from '../../packages/domain/page-size';

describe('regras de tamanho de pagina', () => {
  it('aceita somente os cinco tamanhos suportados', () => {
    expect(PAGE_SIZE_OPTIONS).toEqual([50, 100, 200, 500, 1000]);
    expect(PAGE_SIZE_OPTIONS.every(isPageSize)).toBe(true);
  });

  it.each([25, 0, 2000, 50.5, '100', undefined, null])(
    'rejeita e normaliza %j para o fallback 50',
    (value) => {
      expect(isPageSize(value)).toBe(false);
      expect(normalizePageSize(value)).toBe(50);
    },
  );

  it('preserva um tamanho permitido', () => {
    expect(normalizePageSize(500)).toBe(500);
  });
});
