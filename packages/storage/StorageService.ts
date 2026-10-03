import fs from 'fs';
import path from 'path';
import { sanitizeFilename, buildSafeDocumentPath } from './path-sanitizer';
import { Company, FiscalDocument } from '../domain/types';

export class StorageService {
  constructor(private defaultBasePath: string = path.resolve(process.cwd(), 'data', 'documents')) {
    if (!fs.existsSync(this.defaultBasePath)) {
      fs.mkdirSync(this.defaultBasePath, { recursive: true });
    }
  }

  public getCompanyStoragePath(company: Company): string {
    if (company.folder_path && company.folder_path.trim() !== '') {
      return path.resolve(company.folder_path);
    }
    const safeCompanyFolderName = `${company.cnpj}_${sanitizeFilename(company.name)}`;
    return path.join(this.defaultBasePath, safeCompanyFolderName);
  }

  /**
   * Salva o conteúdo XML de um documento fiscal eletrônico
   */
  public saveXml(
    company: Company,
    docType: 'NFe' | 'CTe',
    accessKey: string,
    xmlContent: string | Buffer,
    issueDate?: string
  ): string {
    const baseDir = this.getCompanyStoragePath(company);
    const dateObj = issueDate ? new Date(issueDate) : new Date();
    const year = String(dateObj.getFullYear() || new Date().getFullYear());
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const filename = `${accessKey}.xml`;

    const targetDir = path.join(baseDir, docType, year, month);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, filename);
    fs.writeFileSync(filePath, xmlContent, 'utf-8');

    return filePath;
  }

  /**
   * Salva o arquivo PDF do DANFE/DACTE
   */
  public savePdf(
    company: Company,
    docType: 'NFe' | 'CTe',
    accessKey: string,
    pdfBuffer: Buffer,
    issueDate?: string
  ): string {
    const baseDir = this.getCompanyStoragePath(company);
    const dateObj = issueDate ? new Date(issueDate) : new Date();
    const year = String(dateObj.getFullYear() || new Date().getFullYear());
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const filename = `${accessKey}.pdf`;

    const targetDir = path.join(baseDir, docType, year, month);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, filename);
    fs.writeFileSync(filePath, pdfBuffer);

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
    if (!filePath) return false;
    return fs.existsSync(filePath);
  }

  public deleteFile(filePath: string): boolean {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }
}
