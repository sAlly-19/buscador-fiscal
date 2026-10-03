import { DatabaseManager } from '../connection';
import { DistributionState, DocumentType, SefazEnvironment } from '../../domain/types';
import { formatNSU, INITIAL_NSU } from '../../domain/nsu';

export class DistributionStateRepository {
  constructor(private db: DatabaseManager) {}

  public getOrCreate(
    companyId: number,
    documentType: DocumentType,
    environment: SefazEnvironment = 'homologation'
  ): DistributionState {
    let row = this.db.queryOne<DistributionState>(
      `SELECT * FROM distribution_state
       WHERE company_id = ? AND document_type = ? AND environment = ?;`,
      [companyId, documentType, environment]
    );

    if (!row) {
      this.db.execute(
        `INSERT OR IGNORE INTO distribution_state
          (company_id, document_type, environment, last_nsu, max_nsu, status)
         VALUES (?, ?, ?, ?, ?, 'IDLE');`,
        [companyId, documentType, environment, INITIAL_NSU, INITIAL_NSU]
      );
      row = this.db.queryOne<DistributionState>(
        `SELECT * FROM distribution_state
         WHERE company_id = ? AND document_type = ? AND environment = ?;`,
        [companyId, documentType, environment]
      );
    }

    if (!row) throw new Error('Não foi possível criar o estado de distribuição.');
    return row;
  }

  public updateStatus(
    companyId: number,
    documentType: DocumentType,
    status: DistributionState['status'],
    lastError?: string,
    environment: SefazEnvironment = 'homologation',
    lastCStat?: number,
    nextQueryAt?: string
  ): void {
    this.getOrCreate(companyId, documentType, environment);
    const now = new Date().toISOString();
    this.db.execute(
      `UPDATE distribution_state
       SET status = ?, last_error = ?, last_cstat = ?, next_query_at = ?,
           last_query_at = ?, updated_at = ?
       WHERE company_id = ? AND document_type = ? AND environment = ?;`,
      [status, lastError || null, lastCStat ?? null, nextQueryAt || null, now, now,
        companyId, documentType, environment]
    );
  }

  public updateNSU(
    companyId: number,
    documentType: DocumentType,
    lastNSU: string,
    maxNSU: string,
    status: DistributionState['status'] = 'IDLE',
    error?: string,
    environment: SefazEnvironment = 'homologation',
    lastCStat?: number,
    nextQueryAt?: string
  ): DistributionState {
    const now = new Date().toISOString();
    this.db.execute(
      `INSERT INTO distribution_state (
        company_id, document_type, environment, last_nsu, max_nsu,
        last_query_at, status, last_error, last_cstat, next_query_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(company_id, document_type, environment) DO UPDATE SET
        last_nsu = excluded.last_nsu,
        max_nsu = excluded.max_nsu,
        last_query_at = excluded.last_query_at,
        status = excluded.status,
        last_error = excluded.last_error,
        last_cstat = excluded.last_cstat,
        next_query_at = excluded.next_query_at,
        updated_at = excluded.last_query_at;`,
      [companyId, documentType, environment, formatNSU(lastNSU), formatNSU(maxNSU),
        now, status, error || null, lastCStat ?? null, nextQueryAt || null]
    );
    return this.getOrCreate(companyId, documentType, environment);
  }

  public resetNSU(
    companyId: number,
    documentType: DocumentType,
    environment: SefazEnvironment = 'homologation'
  ): DistributionState {
    this.getOrCreate(companyId, documentType, environment);
    this.db.execute(
      `UPDATE distribution_state
       SET last_nsu = ?, max_nsu = ?, status = 'IDLE', last_error = NULL,
           last_cstat = NULL, next_query_at = NULL, last_query_at = NULL,
           updated_at = ?
       WHERE company_id = ? AND document_type = ? AND environment = ?;`,
      [INITIAL_NSU, INITIAL_NSU, new Date().toISOString(), companyId, documentType, environment]
    );
    return this.getOrCreate(companyId, documentType, environment);
  }
}
