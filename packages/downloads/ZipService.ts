import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { sanitizeFilename } from '../storage/path-sanitizer';

export interface ZipFileInput {
  sourcePath: string;
  docType: 'NFE' | 'CTE';
  accessKey: string;
  format: 'XML' | 'PDF';
}

export interface ZipCreationResult {
  success: boolean;
  zipPath: string;
  filesCount: number;
  error?: string;
}

export class ZipService {
  /**
   * Compacta arquivos selecionados em um arquivo ZIP organizado nas pastas XML/ e PDF/
   * Nome do arquivo: <Empresa>_<Tipo>_<Ano-Mes>.zip
   */
  public async createBatchZip(
    companyName: string,
    destinationFolder: string,
    files: ZipFileInput[],
    zipBaseName?: string
  ): Promise<ZipCreationResult> {
    if (!fs.existsSync(destinationFolder)) {
      fs.mkdirSync(destinationFolder, { recursive: true });
    }

    const safeCompanyName = sanitizeFilename(companyName);
    const datePrefix = new Date().toISOString().substring(0, 7); // YYYY-MM
    const defaultName = `${safeCompanyName}_Documentos_${datePrefix}.zip`;
    const finalZipName = zipBaseName ? `${sanitizeFilename(zipBaseName)}.zip` : defaultName;
    const outputZipPath = path.join(destinationFolder, finalZipName);

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputZipPath);
      const archive = archiver('zip', {
        zlib: { level: 9 }, // Compressão máxima
      });

      let addedCount = 0;

      output.on('close', () => {
        resolve({
          success: true,
          zipPath: outputZipPath,
          filesCount: addedCount,
        });
      });

      archive.on('error', (err) => {
        reject(new Error(`Falha ao gerar arquivo ZIP: ${err.message}`));
      });

      archive.pipe(output);

      for (const item of files) {
        if (fs.existsSync(item.sourcePath)) {
          const extension = item.format === 'XML' ? '.xml' : '.pdf';
          const subfolder = item.format === 'XML' ? 'XML' : 'PDF';
          const internalName = `${subfolder}/${item.accessKey}${extension}`;

          archive.file(item.sourcePath, { name: internalName });
          addedCount++;
        }
      }

      archive.finalize();
    });
  }
}
