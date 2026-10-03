import path from 'path';

/**
 * Sanitiza um nome de arquivo ou pasta removendo caracteres ilegais para o sistema de arquivos do Windows
 * Caracteres proibidos no Windows: < > : " / \ | ? * e caracteres de controle (ASCII 0-31)
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return '';

  // Remove qualquer prefixo de directory traversal (ex: ../ ou ..\)
  let clean = filename.replace(/^(\.\.[\/\\])+/, '');

  return clean
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') // Substitui caracteres proibidos e separadores por underscore
    .replace(/\.{2,}/g, '.')                // Previne múltiplos pontos consecutivos
    .replace(/^\.+|\.+$/g, '')              // Remove pontos no início e no fim
    .trim()
    .substring(0, 255);                     // Limite máximo de comprimento de nome de arquivo
}

/**
 * Valida se o caminho final de destino reside estritamente dentro do diretório base permitido,
 * prevenindo qualquer ataque de Path Traversal (Directory Traversal)
 */
export function isSafeSubpath(baseDir: string, targetPath: string): boolean {
  if (!baseDir || !targetPath) return false;

  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);

  // Deve iniciar exatamente com o diretório base mais o separador de diretório
  return resolvedTarget === resolvedBase || resolvedTarget.startsWith(resolvedBase + path.sep);
}

/**
 * Monta e valida um caminho seguro para armazenamento de documentos fiscais
 * Estrutura: <baseDir>/<companyFolder>/<docType>/<year>/<month>/<accessKey>.<extension>
 */
export function buildSafeDocumentPath(
  baseDir: string,
  companyFolder: string,
  docType: 'NFe' | 'CTe',
  year: string,
  month: string,
  filename: string
): string {
  const safeCompany = sanitizeFilename(companyFolder);
  const safeDocType = docType === 'NFe' ? 'NFe' : 'CTe';
  const safeYear = sanitizeFilename(year);
  const safeMonth = sanitizeFilename(month);
  const safeFilename = sanitizeFilename(filename);

  const fullPath = path.join(baseDir, safeCompany, safeDocType, safeYear, safeMonth, safeFilename);

  if (!isSafeSubpath(baseDir, fullPath)) {
    throw new Error(`Tentativa de violação de diretório seguro detectada: ${fullPath}`);
  }

  return fullPath;
}
