import { DatabaseManager } from '../connection';
import { DistributionState, DocumentType } from '../../domain/types';
import { formatNSU, INITIAL_NSU } from '../../domain/nsu';

export class DistributionStateRepository {
  constructor(private db: DatabaseManager) {}

  public getOrCreate(companyId: number, documentType: DocumentType): DistributionState {
    let row = this.db.queryOne<DistributionState>(
      'SELECT * FROM distribution_state WHERE company_id = ? AND document_type = ?;',
      [companyId, documentType]
    );

    if (!row) {
      this.db.execute(
        `INSERT OR IGNORE INTO distribution_state (company_id, document_type, last_nsu, max_nsu, status)
         VALUES (?, ?, ?, ?, 'IDLE');`,
        [companyId, documentType, INITIAL_NSU, INITIAL_NSU]
      );

      row = this.db.queryOne<DistributionState>(
        'SELECT * FROM distribution_state WHERE company_id = ? AND document_type = ?;',
        [companyId, documentType]
      );
    }

    return row!;
  }

  public updateStatus(
    companyId: number, 
    documentType: DocumentType, 
    status: DistributionState['status'],
    lastError?: string
  ): void {
    this.db.execute(
      `UPDATE distribution_state 
       SET status = ?, last_error = ?, updated_at = datetime('now', 'localtime')
       WHERE company_id = ? AND document_type = ?;`,
      [status, lastError || null, companyId, documentType]
    );
  }

  public updateNSU(
    companyId: number,
    documentType: DocumentType,
    lastNSU: string,
    maxNSU: string,
    status: DistributionState['status'] = 'IDLE',
    error?: string
  ): DistributionState {
    const formattedLast = formatNSU(lastNSU);
    const formattedMax = formatNSU(maxNSU);

    this.db.execute(
      `INSERT INTO distribution_state (
        company_id, document_type, last_nsu, max_nsu, last_query_at, status, last_error
      ) VALUES (?, ?, ?, ?, datetime('now', 'localtime'), ?, ?)
      ON CONFLICT(company_id, document_type) DO UPDATE SET
        last_nsu = excluded.last_nsu,
        max_nsu = excluded.max_nsu,
        last_query_at = excluded.last_query_at,
        status = excluded.status,
        last_error = excluded.last_error,
        updated_at = datetime('now', 'localtime');`,
      [companyId, documentType, formattedLast, formattedMax, status, error || null]
    );

    return this.getOrCreate(companyId, documentType);
  }
}
