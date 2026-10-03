import { DatabaseManager } from '../connection';
import { FiscalDocument, DocumentSearchFilters, PaginatedResult } from '../../domain/types';
import { sanitizeAccessKey } from '../../domain/access-key';
import { formatNSU } from '../../domain/nsu';

export class DocumentRepository {
  constructor(private db: DatabaseManager) {}

  public upsert(doc: Omit<FiscalDocument, 'id' | 'created_at' | 'updated_at'>): FiscalDocument {
    const cleanKey = sanitizeAccessKey(doc.access_key);
    const cleanNSU = formatNSU(doc.nsu);

    this.db.execute(
      `INSERT INTO documents (
        company_id, document_type, nsu, schema_type, access_key,
        document_number, series, issue_date, received_at,
        issuer_cnpj, issuer_name, recipient_cnpj, recipient_name,
        total_value, xml_path, pdf_path, xml_status, pdf_status,
        situacao_fiscal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(access_key) DO UPDATE SET
        schema_type = CASE WHEN excluded.schema_type LIKE 'proc%' THEN excluded.schema_type ELSE documents.schema_type END,
        xml_path = COALESCE(excluded.xml_path, documents.xml_path),
        pdf_path = COALESCE(excluded.pdf_path, documents.pdf_path),
        xml_status = CASE WHEN excluded.xml_status = 'XML_DISPONIVEL' THEN excluded.xml_status ELSE documents.xml_status END,
        pdf_status = CASE WHEN excluded.pdf_status = 'PDF_DISPONIVEL' THEN excluded.pdf_status ELSE documents.pdf_status END,
        situacao_fiscal = COALESCE(excluded.situacao_fiscal, documents.situacao_fiscal),
        total_value = CASE WHEN excluded.total_value > 0 THEN excluded.total_value ELSE documents.total_value END,
        updated_at = datetime('now', 'localtime');`,
      [
        doc.company_id,
        doc.document_type,
        cleanNSU,
        doc.schema_type,
        cleanKey,
        doc.document_number || null,
        doc.series || null,
        doc.issue_date || null,
        doc.received_at || new Date().toISOString(),
        doc.issuer_cnpj || null,
        doc.issuer_name || null,
        doc.recipient_cnpj || null,
        doc.recipient_name || null,
        doc.total_value || 0,
        doc.xml_path || null,
        doc.pdf_path || null,
        doc.xml_status || 'XML_INDISPONIVEL',
        doc.pdf_status || 'PDF_INDISPONIVEL',
        doc.situacao_fiscal || 'AUTORIZADA'
      ]
    );

    return this.findByAccessKey(cleanKey)!;
  }

  public findById(id: number): FiscalDocument | null {
    return this.db.queryOne<FiscalDocument>('SELECT * FROM documents WHERE id = ?;', [id]);
  }

  public findByAccessKey(accessKey: string): FiscalDocument | null {
    const cleanKey = sanitizeAccessKey(accessKey);
    return this.db.queryOne<FiscalDocument>('SELECT * FROM documents WHERE access_key = ?;', [cleanKey]);
  }

  public search(filters: DocumentSearchFilters): PaginatedResult<FiscalDocument> {
    const conditions: string[] = ['company_id = ?'];
    const params: any[] = [filters.company_id];

    if (filters.document_types && filters.document_types.length > 0) {
      const placeholders = filters.document_types.map(() => '?').join(',');
      conditions.push(`document_type IN (${placeholders})`);
      params.push(...filters.document_types);
    }

    if (filters.start_date) {
      conditions.push('substr(issue_date, 1, 10) >= ?');
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      conditions.push('substr(issue_date, 1, 10) <= ?');
      params.push(filters.end_date);
    }

    if (filters.access_key) {
      conditions.push('access_key LIKE ?');
      params.push(`%${sanitizeAccessKey(filters.access_key)}%`);
    }

    if (filters.document_number) {
      conditions.push('document_number LIKE ?');
      params.push(`%${filters.document_number.trim()}%`);
    }

    if (filters.issuer_cnpj_or_name) {
      conditions.push('(issuer_cnpj LIKE ? OR issuer_name LIKE ?)');
      const term = `%${filters.issuer_cnpj_or_name.trim()}%`;
      params.push(term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Contagem total
    const countSql = `SELECT COUNT(*) as total FROM documents ${whereClause};`;
    const countRow = this.db.queryOne<{ total: number }>(countSql, params);
    const total = countRow?.total || 0;

    // Paginação
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(1, filters.page_size || 50);
    const offset = (page - 1) * pageSize;

    const dataSql = `
      SELECT * FROM documents 
      ${whereClause} 
      ORDER BY issue_date DESC, id DESC 
      LIMIT ? OFFSET ?;
    `;
    const items = this.db.queryAll<FiscalDocument>(dataSql, [...params, pageSize, offset]);

    return {
      items,
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize) || 1,
    };
  }

  public updateStoragePaths(id: number, xmlPath?: string, pdfPath?: string): void {
    this.db.execute(
      `UPDATE documents 
       SET xml_path = COALESCE(?, xml_path),
           pdf_path = COALESCE(?, pdf_path),
           xml_status = CASE WHEN ? IS NOT NULL THEN 'XML_DISPONIVEL' ELSE xml_status END,
           pdf_status = CASE WHEN ? IS NOT NULL THEN 'PDF_DISPONIVEL' ELSE pdf_status END,
           updated_at = datetime('now', 'localtime')
       WHERE id = ?;`,
      [xmlPath || null, pdfPath || null, xmlPath || null, pdfPath || null, id]
    );
  }
}
