import fs from 'fs';
import { DatabaseManager } from '../database/connection';
import { FiscalDocument } from '../domain/types';

export interface ReconciliationReport {
  checkedCount: number;
  missingXmlCount: number;
  missingPdfCount: number;
  repairedCount: number;
}

export class ReconciliationService {
  constructor(private db: DatabaseManager) {}

  /**
   * Reconcilia a integridade entre os registros no SQLite e os arquivos físicos no filesystem.
   * Se um arquivo foi movido ou excluído do disco, atualiza o status para INDISPONÍVEL
   * sem apagar os metadados do documento.
   */
  public reconcileCompanyStorage(companyId: number): ReconciliationReport {
    const docs = this.db.queryAll<FiscalDocument>(
      'SELECT id, xml_path, pdf_path, xml_status, pdf_status FROM documents WHERE company_id = ?;',
      [companyId]
    );

    let missingXmlCount = 0;
    let missingPdfCount = 0;
    let repairedCount = 0;

    this.db.transaction(() => {
      for (const doc of docs) {
        let shouldUpdate = false;
        let newXmlStatus = doc.xml_status;
        let newPdfStatus = doc.pdf_status;

        // Verifica integridade do XML
        if (doc.xml_status === 'XML_DISPONIVEL') {
          if (!doc.xml_path || !fs.existsSync(doc.xml_path)) {
            newXmlStatus = 'XML_INDISPONIVEL';
            missingXmlCount++;
            shouldUpdate = true;
          }
        } else if (doc.xml_status === 'XML_INDISPONIVEL' && doc.xml_path && fs.existsSync(doc.xml_path)) {
          // Arquivo reapareceu ou foi recuperado
          newXmlStatus = 'XML_DISPONIVEL';
          shouldUpdate = true;
        }

        // Verifica integridade do PDF
        if (doc.pdf_status === 'PDF_DISPONIVEL') {
          if (!doc.pdf_path || !fs.existsSync(doc.pdf_path)) {
            newPdfStatus = 'PDF_INDISPONIVEL';
            missingPdfCount++;
            shouldUpdate = true;
          }
        } else if (doc.pdf_status === 'PDF_INDISPONIVEL' && doc.pdf_path && fs.existsSync(doc.pdf_path)) {
          // PDF foi restaurado
          newPdfStatus = 'PDF_DISPONIVEL';
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          this.db.execute(
            `UPDATE documents 
             SET xml_status = ?, pdf_status = ?, updated_at = datetime('now', 'localtime')
             WHERE id = ?;`,
            [newXmlStatus, newPdfStatus, doc.id]
          );
          repairedCount++;
        }
      }
    });

    return {
      checkedCount: docs.length,
      missingXmlCount,
      missingPdfCount,
      repairedCount,
    };
  }
}
