import { DatabaseManager } from '../connection';
import { CertificateInfo } from '../../domain/types';

export class CertificateRepository {
  constructor(private db: DatabaseManager) {}

  public getByCompanyId(companyId: number): CertificateInfo | null {
    const row = this.db.queryOne<any>('SELECT * FROM certificates WHERE company_id = ?;', [companyId]);
    if (!row) return null;

    const isExpired = new Date(row.valid_to) < new Date();
    return {
      ...row,
      has_private_key: true,
      is_expired: isExpired,
    };
  }

  public associate(companyId: number, cert: CertificateInfo): void {
    this.db.execute(
      `INSERT INTO certificates (company_id, subject, issuer, serial_number, thumbprint, valid_from, valid_to, provider)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(company_id) DO UPDATE SET
         subject = excluded.subject,
         issuer = excluded.issuer,
         serial_number = excluded.serial_number,
         thumbprint = excluded.thumbprint,
         valid_from = excluded.valid_from,
         valid_to = excluded.valid_to,
         provider = excluded.provider,
         updated_at = datetime('now', 'localtime');`,
      [
        companyId,
        cert.subject,
        cert.issuer,
        cert.serial_number || '',
        cert.thumbprint,
        cert.valid_from,
        cert.valid_to,
        cert.provider || 'windows_store'
      ]
    );
  }

  public remove(companyId: number): boolean {
    const result = this.db.execute('DELETE FROM certificates WHERE company_id = ?;', [companyId]);
    return result.changes > 0;
  }
}
