import zlib from 'zlib';

/**
 * Descompacta o conteúdo de uma tag docZip da SEFAZ
 * O conteúdo original da SEFAZ é comprimido em GZIP e codificado em Base64
 */
export function decompressDocZip(base64Content: string): string {
  if (!base64Content) return '';
  const buffer = Buffer.from(base64Content.trim(), 'base64');
  const decompressed = zlib.gunzipSync(buffer);
  return decompressed.toString('utf-8');
}

/**
 * Compacta um XML em GZIP e codifica em Base64 (utilizado para Mocks e testes)
 */
export function compressToDocZip(xmlContent: string): string {
  const buffer = Buffer.from(xmlContent, 'utf-8');
  const compressed = zlib.gzipSync(buffer);
  return compressed.toString('base64');
}
