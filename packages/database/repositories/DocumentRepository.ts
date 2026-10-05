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
      ON CONFLICT(company_id, access_key) DO UPDATE SET
        nsu = CASE WHEN excluded.nsu > documents.nsu THEN excluded.nsu ELSE documents.nsu END,
        schema_type = CASE
          WHEN documents.schema_type LIKE 'procNFe%' OR documents.schema_type LIKE 'procCTe%' THEN documents.schema_type
          WHEN excluded.schema_type LIKE 'procNFe%' OR excluded.schema_type LIKE 'procCTe%' THEN excluded.schema_type
          WHEN documents.schema_type LIKE '%Evento%' AND excluded.schema_type NOT LIKE '%Evento%' THEN excluded.schema_type
          ELSE COALESCE(documents.schema_type, excluded.schema_type)
        END,
        document_number = CASE
          WHEN (excluded.schema_type LIKE 'procNFe%' OR excluded.schema_type LIKE 'procCTe%') AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.document_number IS NOT NULL THEN excluded.document_number
          WHEN documents.schema_type LIKE '%Evento%' AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.document_number IS NOT NULL THEN excluded.document_number
          ELSE COALESCE(NULLIF(documents.document_number, ''), NULLIF(excluded.document_number, ''))
        END,
        series = CASE
          WHEN (excluded.schema_type LIKE 'procNFe%' OR excluded.schema_type LIKE 'procCTe%') AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.series IS NOT NULL THEN excluded.series
          WHEN documents.schema_type LIKE '%Evento%' AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.series IS NOT NULL THEN excluded.series
          ELSE COALESCE(NULLIF(documents.series, ''), NULLIF(excluded.series, ''))
        END,
        issue_date = CASE
          WHEN (excluded.schema_type LIKE 'procNFe%' OR excluded.schema_type LIKE 'procCTe%') AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.issue_date IS NOT NULL THEN excluded.issue_date
          WHEN documents.schema_type LIKE '%Evento%' AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.issue_date IS NOT NULL THEN excluded.issue_date
          ELSE COALESCE(NULLIF(documents.issue_date, ''), NULLIF(excluded.issue_date, ''))
        END,
        issuer_cnpj = CASE
          WHEN (excluded.schema_type LIKE 'procNFe%' OR excluded.schema_type LIKE 'procCTe%') AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.issuer_cnpj IS NOT NULL THEN excluded.issuer_cnpj
          WHEN documents.schema_type LIKE '%Evento%' AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.issuer_cnpj IS NOT NULL THEN excluded.issuer_cnpj
          ELSE COALESCE(NULLIF(documents.issuer_cnpj, ''), NULLIF(excluded.issuer_cnpj, ''))
        END,
        issuer_name = CASE
          WHEN (excluded.schema_type LIKE 'procNFe%' OR excluded.schema_type LIKE 'procCTe%') AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.issuer_name IS NOT NULL THEN excluded.issuer_name
          WHEN documents.schema_type LIKE '%Evento%' AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.issuer_name IS NOT NULL THEN excluded.issuer_name
          ELSE COALESCE(NULLIF(documents.issuer_name, ''), NULLIF(excluded.issuer_name, ''))
        END,
        recipient_cnpj = CASE
          WHEN (excluded.schema_type LIKE 'procNFe%' OR excluded.schema_type LIKE 'procCTe%') AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.recipient_cnpj IS NOT NULL THEN excluded.recipient_cnpj
          WHEN documents.schema_type LIKE '%Evento%' AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.recipient_cnpj IS NOT NULL THEN excluded.recipient_cnpj
          ELSE COALESCE(NULLIF(documents.recipient_cnpj, ''), NULLIF(excluded.recipient_cnpj, ''))
        END,
        recipient_name = CASE
          WHEN (excluded.schema_type LIKE 'procNFe%' OR excluded.schema_type LIKE 'procCTe%') AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.recipient_name IS NOT NULL THEN excluded.recipient_name
          WHEN documents.schema_type LIKE '%Evento%' AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.recipient_name IS NOT NULL THEN excluded.recipient_name
          ELSE COALESCE(NULLIF(documents.recipient_name, ''), NULLIF(excluded.recipient_name, ''))
        END,
        total_value = CASE
          WHEN (excluded.schema_type LIKE 'procNFe%' OR excluded.schema_type LIKE 'procCTe%') AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.total_value > 0 THEN excluded.total_value
          WHEN excluded.total_value > 0 THEN excluded.total_value
          ELSE documents.total_value
        END,
        xml_path = CASE
          WHEN (documents.schema_type LIKE 'procNFe%' OR documents.schema_type LIKE 'procCTe%') AND documents.schema_type NOT LIKE '%Evento%' AND documents.xml_path IS NOT NULL THEN documents.xml_path
          WHEN (excluded.schema_type LIKE 'procNFe%' OR excluded.schema_type LIKE 'procCTe%') AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.xml_path IS NOT NULL THEN excluded.xml_path
          WHEN documents.schema_type LIKE '%Evento%' AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.xml_path IS NOT NULL THEN excluded.xml_path
          ELSE COALESCE(documents.xml_path, excluded.xml_path)
        END,
        pdf_path = COALESCE(excluded.pdf_path, documents.pdf_path),
        xml_status = CASE
          WHEN documents.xml_status = 'XML_DISPONIVEL' OR excluded.xml_status = 'XML_DISPONIVEL' THEN 'XML_DISPONIVEL'
          ELSE 'XML_INDISPONIVEL'
        END,
        pdf_status = CASE
          WHEN documents.pdf_path IS NOT NULL OR excluded.pdf_path IS NOT NULL THEN 'PDF_DISPONIVEL'
          ELSE 'PDF_INDISPONIVEL'
        END,
        situacao_fiscal = CASE
          WHEN excluded.situacao_fiscal = 'CANCELADA' OR documents.situacao_fiscal = 'CANCELADA' THEN 'CANCELADA'
          WHEN excluded.situacao_fiscal = 'DENEGADA' OR documents.situacao_fiscal = 'DENEGADA' THEN 'DENEGADA'
          ELSE COALESCE(excluded.situacao_fiscal, documents.situacao_fiscal)
        END,
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
        doc.situacao_fiscal || 'AUTORIZADA',
      ]
    );

    return this.findByAccessKey(cleanKey, doc.company_id)!;
  }

  public findById(id: number, companyId: number): FiscalDocument | null {
    return this.db.queryOne<FiscalDocument>(
      'SELECT * FROM documents WHERE id = ? AND company_id = ?;',
      [id, companyId]
    );
  }

  public findByAccessKey(accessKey: string, companyId?: number): FiscalDocument | null {
    const cleanKey = sanitizeAccessKey(accessKey);
    return companyId === undefined
      ? this.db.queryOne<FiscalDocument>(
          'SELECT * FROM documents WHERE access_key = ? ORDER BY id LIMIT 1;',
          [cleanKey]
        )
      : this.db.queryOne<FiscalDocument>(
          'SELECT * FROM documents WHERE company_id = ? AND access_key = ?;',
          [companyId, cleanKey]
        );
  }

  public search(filters: DocumentSearchFilters): PaginatedResult<FiscalDocument> {
    const conditions: string[] = ['company_id = ?', "schema_type NOT LIKE '%Evento%'"];
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

    if (filters.search_query?.trim()) {
      const raw = filters.search_query.trim();
      const digits = sanitizeAccessKey(raw);
      const likeRaw = `%${raw}%`;
      const clauses = [
        'document_number LIKE ?',
        'series LIKE ?',
        'issuer_cnpj LIKE ?',
        'issuer_name LIKE ?',
        'recipient_cnpj LIKE ?',
        'recipient_name LIKE ?',
      ];
      params.push(likeRaw, likeRaw, likeRaw, likeRaw, likeRaw, likeRaw);
      if (digits) {
        clauses.push('access_key LIKE ?');
        params.push(`%${digits}%`);
      }
      conditions.push(`(${clauses.join(' OR ')})`);
    }

    if (filters.series) {
      conditions.push('series = ?');
      params.push(filters.series.trim());
    }
    if (filters.xml_status) {
      conditions.push('xml_status = ?');
      params.push(filters.xml_status);
    }
    if (filters.pdf_status) {
      conditions.push('pdf_status = ?');
      params.push(filters.pdf_status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Contagem total
    const countSql = `SELECT COUNT(*) as total FROM documents ${whereClause};`;
    const countRow = this.db.queryOne<{ total: number }>(countSql, params);
    const total = countRow?.total || 0;

    // Paginação
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(200, Math.max(1, Number(filters.page_size) || 50));
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

  public isKnownStoragePath(filePath: string, companyId: number): boolean {
    return Boolean(
      this.db.queryOne('SELECT id FROM documents WHERE company_id = ? AND (xml_path = ? OR pdf_path = ?) LIMIT 1;', [
        companyId,
        filePath,
        filePath,
      ])
    );
  }
}
