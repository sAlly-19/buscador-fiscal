import fs from 'fs';
import path from 'path';
import { sanitizeFilename, buildSafeDocumentPath } from './path-sanitizer';
import { Company } from '../domain/types';

export interface PendingFileWrite {
  filePath: string;
  commit(): void;
  rollback(): void;
}

export class StorageService {
  constructor(private defaultBasePath: string = path.resolve(process.cwd(), 'data', 'documents')) {}

  public getCompanyStoragePath(company: Company, configuredBasePath?: string): string {
    if (company.folder_path?.trim()) return path.resolve(company.folder_path);
    const root = configuredBasePath?.trim() ? path.resolve(configuredBasePath) : this.defaultBasePath;
    return path.join(root, `${company.cnpj}_${sanitizeFilename(company.name)}`);
  }

  public saveXml(
    company: Company,
    docType: 'NFe' | 'CTe',
    accessKey: string,
    xmlContent: string | Buffer,
    issueDate?: string,
    schemaType?: string,
    configuredBasePath?: string
  ): string {
    const pending = this.saveXmlTransactional(
      company, docType, accessKey, xmlContent, issueDate, schemaType, configuredBasePath
    );
    pending.commit();
    return pending.filePath;
  }

  public saveXmlTransactional(
    company: Company,
    docType: 'NFe' | 'CTe',
    accessKey: string,
    xmlContent: string | Buffer,
    issueDate?: string,
    schemaType?: string,
    configuredBasePath?: string
  ): PendingFileWrite {
    const baseDir = this.getCompanyStoragePath(company, configuredBasePath);
    const { year, month } = this.getDateParts(issueDate);
    const cleanKey = sanitizeFilename(accessKey);
    if (!/^\d{44}$/.test(cleanKey)) throw new Error('Chave de acesso inválida para armazenamento.');

    const isEvent = Boolean(schemaType?.toLowerCase().includes('evento'));
    const cleanSchema = sanitizeFilename((schemaType || 'evento').replace(/\.xsd$/i, ''));
    const filename = isEvent ? `${cleanKey}-${cleanSchema}.xml` : `${cleanKey}.xml`;
    const filePath = buildSafeDocumentPath(baseDir, '', docType, year, month, filename);
    return this.atomicWrite(filePath, xmlContent);
  }

  public savePdf(
    company: Company,
    docType: 'NFe' | 'CTe',
    accessKey: string,
    pdfBuffer: Buffer,
    issueDate?: string,
    configuredBasePath?: string
  ): string {
    const baseDir = this.getCompanyStoragePath(company, configuredBasePath);
    const { year, month } = this.getDateParts(issueDate);
    const cleanKey = sanitizeFilename(accessKey);
    if (!/^\d{44}$/.test(cleanKey)) throw new Error('Chave de acesso inválida para armazenamento.');
    const filePath = buildSafeDocumentPath(baseDir, '', docType, year, month, `${cleanKey}.pdf`);
    const pending = this.atomicWrite(filePath, pdfBuffer);
    pending.commit();
    return filePath;
  }

  public readXml(filePath: string): string | null {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
  }

  public readPdf(filePath: string): Buffer | null {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath);
  }

  public fileExists(filePath?: string): boolean {
    return Boolean(filePath && fs.existsSync(filePath));
  }

  public deleteFile(filePath: string): boolean {
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    return true;
  }

  private getDateParts(issueDate?: string): { year: string; month: string } {
    const parsed = issueDate ? new Date(issueDate) : new Date();
    const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    return {
      year: String(date.getFullYear()),
      month: String(date.getMonth() + 1).padStart(2, '0'),
    };
  }

  private atomicWrite(filePath: string, content: string | Buffer): PendingFileWrite {
    const targetDir = path.dirname(filePath);
    fs.mkdirSync(targetDir, { recursive: true });

    const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath) : undefined;
    const tempPath = path.join(targetDir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
    const fd = fs.openSync(tempPath, 'wx');
    try {
      fs.writeFileSync(fd, content);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tempPath, filePath);

    let finished = false;
    return {
      filePath,
      commit: () => { finished = true; },
      rollback: () => {
        if (finished) return;
        if (previous === undefined) {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          return;
        }
        const restore = `${filePath}.${process.pid}.${Date.now()}.restore`;
        fs.writeFileSync(restore, previous);
        fs.renameSync(restore, filePath);
      },
    };
  }
}
