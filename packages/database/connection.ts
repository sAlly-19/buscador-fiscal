import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { INITIAL_SCHEMA_SQL } from './schema';

let sqlModulePromise: Promise<SqlJsStatic> | null = null;
let sqlModule: SqlJsStatic | null = null;

export async function getSqlModule(): Promise<SqlJsStatic> {
  if (sqlModule) return sqlModule;
  if (!sqlModulePromise) sqlModulePromise = initSqlJs();
  sqlModule = await sqlModulePromise;
  return sqlModule;
}

export class DatabaseManager {
  private db: SqlJsDatabase;
  private readonly SQL: SqlJsStatic;
  private readonly dbPath: string;
  private inTransaction = false;

  private constructor(SQL: SqlJsStatic, dbPath: string = ':memory:') {
    this.SQL = SQL;
    this.dbPath = dbPath;
    if (dbPath !== ':memory:' && fs.existsSync(dbPath)) {
      this.db = new SQL.Database(fs.readFileSync(dbPath));
    } else {
      if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      this.db = new SQL.Database();
    }
    this.configurePragmas();
    this.initSchema();
  }

  public static async create(dbPath: string = ':memory:'): Promise<DatabaseManager> {
    return new DatabaseManager(await getSqlModule(), dbPath);
  }

  private configurePragmas(): void {
    this.db.exec('PRAGMA foreign_keys = ON;');
  }

  private hasColumn(table: string, column: string): boolean {
    return this.queryAll<{ name: string }>(`PRAGMA table_info(${table});`).some((row) => row.name === column);
  }

  private initSchema(): void {
    this.db.run(INITIAL_SCHEMA_SQL);
    this.runMigrations();
    this.db.run(`UPDATE documents
      SET document_number = CAST(CAST(substr(access_key, 26, 9) AS INTEGER) AS TEXT),
          series = CAST(CAST(substr(access_key, 23, 3) AS INTEGER) AS TEXT)
      WHERE (document_number IS NULL OR document_number = '') AND LENGTH(access_key) = 44;`);
    this.persist();
  }

  private runMigrations(): void {
    this.db.exec('PRAGMA foreign_keys = OFF;');
    this.db.exec('BEGIN TRANSACTION;');
    try {
      if (!this.hasColumn('companies', 'uf')) {
        this.db.run("ALTER TABLE companies ADD COLUMN uf TEXT DEFAULT '35';");
      }
      if (!this.hasColumn('certificates', 'has_private_key')) {
        this.db.run('ALTER TABLE certificates ADD COLUMN has_private_key INTEGER NOT NULL DEFAULT 1;');
      }
      if (!this.hasColumn('certificates', 'extracted_cnpj')) {
        this.db.run('ALTER TABLE certificates ADD COLUMN extracted_cnpj TEXT;');
      }
      if (!this.hasColumn('certificates', 'extracted_cpf')) {
        this.db.run('ALTER TABLE certificates ADD COLUMN extracted_cpf TEXT;');
      }
      if (!this.hasColumn('distribution_state', 'environment')) this.migrateDistributionState();

      const documentSql = this.queryOne<{ sql: string }>(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'documents';"
      )?.sql || '';
      if (/access_key\s+TEXT\s+NOT\s+NULL\s+UNIQUE/i.test(documentSql)) this.migrateDocuments();

      if (!this.hasColumn('query_history', 'environment')) {
        this.db.run("ALTER TABLE query_history ADD COLUMN environment TEXT NOT NULL DEFAULT 'homologation';");
      }
      this.createDocumentIndexes();
      this.db.run('PRAGMA user_version = 2;');
      this.db.exec('COMMIT;');
    } catch (error) {
      this.db.exec('ROLLBACK;');
      throw new Error(`Falha ao migrar o banco de dados: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.configurePragmas();
    }
  }

  private migrateDistributionState(): void {
    this.db.run(`CREATE TABLE distribution_state_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL,
      document_type TEXT NOT NULL CHECK(document_type IN ('NFE', 'CTE')),
      environment TEXT NOT NULL CHECK(environment IN ('homologation', 'production')),
      last_nsu TEXT NOT NULL DEFAULT '000000000000000', max_nsu TEXT NOT NULL DEFAULT '000000000000000',
      last_query_at TEXT, status TEXT NOT NULL DEFAULT 'IDLE' CHECK(status IN ('IDLE', 'RUNNING', 'RATE_LIMITED', 'ERROR')),
      last_error TEXT, last_cstat INTEGER, next_query_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      UNIQUE(company_id, document_type, environment),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );`);
    this.db.run(`INSERT INTO distribution_state_v2 (
      id, company_id, document_type, environment, last_nsu, max_nsu, last_query_at, status, last_error, created_at, updated_at
    ) SELECT id, company_id, document_type,
      COALESCE((SELECT value FROM app_settings WHERE key = 'sefaz_environment'), 'homologation'),
      last_nsu, max_nsu, last_query_at, status, last_error, created_at, updated_at FROM distribution_state;`);
    this.db.run('DROP TABLE distribution_state;');
    this.db.run('ALTER TABLE distribution_state_v2 RENAME TO distribution_state;');
  }

  private migrateDocuments(): void {
    this.db.run(`CREATE TABLE documents_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL,
      document_type TEXT NOT NULL CHECK(document_type IN ('NFE', 'CTE')), nsu TEXT NOT NULL,
      schema_type TEXT NOT NULL, access_key TEXT NOT NULL, document_number TEXT, series TEXT, issue_date TEXT,
      received_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')), issuer_cnpj TEXT, issuer_name TEXT,
      recipient_cnpj TEXT, recipient_name TEXT, total_value REAL DEFAULT 0, xml_path TEXT, pdf_path TEXT,
      xml_status TEXT NOT NULL DEFAULT 'XML_DISPONIVEL' CHECK(xml_status IN ('XML_DISPONIVEL', 'XML_INDISPONIVEL')),
      pdf_status TEXT NOT NULL DEFAULT 'PDF_INDISPONIVEL' CHECK(pdf_status IN ('PDF_DISPONIVEL', 'PDF_INDISPONIVEL')),
      situacao_fiscal TEXT DEFAULT 'AUTORIZADA' CHECK(situacao_fiscal IN ('AUTORIZADA', 'CANCELADA', 'DENEGADA')),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      UNIQUE(company_id, access_key), FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );`);
    this.db.run('INSERT INTO documents_v2 SELECT * FROM documents;');
    this.db.run('DROP TABLE documents;');
    this.db.run('ALTER TABLE documents_v2 RENAME TO documents;');
  }

  private createDocumentIndexes(): void {
    const statements = [
      'CREATE INDEX IF NOT EXISTS idx_docs_company_id ON documents(company_id);',
      'CREATE INDEX IF NOT EXISTS idx_docs_access_key ON documents(access_key);',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_docs_company_access_key ON documents(company_id, access_key);',
      'CREATE INDEX IF NOT EXISTS idx_docs_nsu ON documents(nsu);',
      'CREATE INDEX IF NOT EXISTS idx_docs_issue_date ON documents(issue_date);',
      'CREATE INDEX IF NOT EXISTS idx_docs_issuer_cnpj ON documents(issuer_cnpj);',
      'CREATE INDEX IF NOT EXISTS idx_docs_recipient_cnpj ON documents(recipient_cnpj);',
      'CREATE INDEX IF NOT EXISTS idx_docs_document_type ON documents(document_type);',
    ];
    for (const statement of statements) this.db.run(statement);
  }

  private persist(): void {
    if (this.dbPath === ':memory:' || this.inTransaction) return;
    const data = this.db.export();
    this.configurePragmas();
    const tempPath = `${this.dbPath}.${process.pid}.${Date.now()}.tmp`;
    const fd = fs.openSync(tempPath, 'wx');
    try {
      fs.writeFileSync(fd, Buffer.from(data));
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    try {
      fs.renameSync(tempPath, this.dbPath);
    } catch (error) {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      throw error;
    }
  }

  public queryAll<T = unknown>(sql: string, params: unknown[] = []): T[] {
    const stmt = this.db.prepare(sql);
    try {
      if (params.length > 0) stmt.bind(params as any[]);
      const results: T[] = [];
      while (stmt.step()) results.push(stmt.getAsObject() as T);
      return results;
    } finally {
      stmt.free();
    }
  }

  public queryOne<T = unknown>(sql: string, params: unknown[] = []): T | null {
    const stmt = this.db.prepare(sql);
    try {
      if (params.length > 0) stmt.bind(params as any[]);
      return stmt.step() ? stmt.getAsObject() as T : null;
    } finally {
      stmt.free();
    }
  }

  public execute(sql: string, params: unknown[] = []): { changes: number; lastInsertRowid: number } {
    const snapshot = this.createPersistenceSnapshot();
    try {
      this.db.run(sql, params as any[]);
      const result = this.db.exec('SELECT changes() as changes, last_insert_rowid() as id;');
      const changes = Number(result[0]?.values[0]?.[0] || 0);
      const lastInsertRowid = Number(result[0]?.values[0]?.[1] || 0);
      this.persist();
      return { changes, lastInsertRowid };
    } catch (error) {
      if (snapshot) this.restoreSnapshot(snapshot);
      throw error;
    }
  }

  public transaction<T>(callback: () => T): T {
    if (this.inTransaction) return callback();
    const snapshot = this.createPersistenceSnapshot();
    this.inTransaction = true;
    this.db.exec('BEGIN TRANSACTION;');
    let committed = false;
    try {
      const result = callback();
      this.db.exec('COMMIT;');
      committed = true;
      this.inTransaction = false;
      this.persist();
      return result;
    } catch (error) {
      if (!committed) {
        try { this.db.exec('ROLLBACK;'); } finally { this.inTransaction = false; }
      } else {
        this.inTransaction = false;
        if (snapshot) this.restoreSnapshot(snapshot);
      }
      throw error;
    }
  }

  private createPersistenceSnapshot(): Uint8Array | null {
    if (this.dbPath === ':memory:' || this.inTransaction) return null;
    const snapshot = this.db.export();
    this.configurePragmas();
    return snapshot;
  }

  private restoreSnapshot(snapshot: Uint8Array): void {
    this.db.close();
    this.db = new this.SQL.Database(snapshot);
    this.configurePragmas();
  }

  public close(): void {
    this.persist();
    this.db.close();
  }
}

let defaultInstance: DatabaseManager | null = null;

export async function getDatabase(customPath?: string): Promise<DatabaseManager> {
  if (!defaultInstance || customPath) {
    const instance = await DatabaseManager.create(customPath || path.resolve(process.cwd(), 'data', 'fiscal_storage.db'));
    if (!customPath) defaultInstance = instance;
    return instance;
  }
  return defaultInstance;
}
