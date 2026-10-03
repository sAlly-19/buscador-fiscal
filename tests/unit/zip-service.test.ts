import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { ZipService } from '../../packages/downloads/ZipService';

describe('Serviço de Compactação ZIP (Fase 11)', () => {
  const zipService = new ZipService();
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `zip_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignora
      }
    }
  });

  it('deve gerar arquivo ZIP contendo estrutura separada de XML e PDF', async () => {
    // Cria arquivos temporários de teste
    const xmlFile1 = path.join(tempDir, 'nota1.xml');
    const xmlFile2 = path.join(tempDir, 'nota2.xml');
    const pdfFile1 = path.join(tempDir, 'nota1.pdf');

    fs.writeFileSync(xmlFile1, '<nfeProc>teste 1</nfeProc>');
    fs.writeFileSync(xmlFile2, '<nfeProc>teste 2</nfeProc>');
    fs.writeFileSync(pdfFile1, '%PDF-1.4 mock content');

    const result = await zipService.createBatchZip(
      'Empresa Teste',
      tempDir,
      [
        { sourcePath: xmlFile1, docType: 'NFE', accessKey: '3526090001', format: 'XML' },
        { sourcePath: xmlFile2, docType: 'NFE', accessKey: '3526090002', format: 'XML' },
        { sourcePath: pdfFile1, docType: 'NFE', accessKey: '3526090001', format: 'PDF' },
      ],
      'Lote_Notas_Fiscais'
    );

    expect(result.success).toBe(true);
    expect(result.filesCount).toBe(3);
    expect(fs.existsSync(result.zipPath)).toBe(true);
    expect(result.zipPath).toContain('Lote_Notas_Fiscais.zip');
  });
});
