import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { INITIAL_SCHEMA_SQL } from './schema';

export class DatabaseManager {
  private db: DatabaseSync;
  private inTransaction: boolean = false;

  constructor(dbPath: string = ':memory:') {
    if (dbPath !== ':memory:') {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new DatabaseSync(dbPath);
    this.configurePragmas();
    this.initSchema();
  }

  private configurePragmas(): void {
    // Ativa WAL mode para concorrência e integridade rápida
    try {
      this.db.exec('PRAGMA journal_mode = WAL;');
    } catch {
      // Em memória pode não suportar WAL, não afeta funcionamento
    }
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec('PRAGMA synchronous = NORMAL;');
  }

  private initSchema(): void {
    this.db.exec(INITIAL_SCHEMA_SQL);
  }

  public queryAll<T = any>(sql: string, params: any[] = []): T[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  public queryOne<T = any>(sql: string, params: any[] = []): T | null {
    const stmt = this.db.prepare(sql);
    const result = stmt.get(...params);
    return (result as T) || null;
  }

  public execute(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
    const stmt = this.db.prepare(sql);
    const info = stmt.run(...params);
    return {
      changes: Number(info.changes),
      lastInsertRowid: Number(info.lastInsertRowid),
    };
  }

  /**
   * Executa uma função dentro de uma transação atômica
   * Se ocorrer erro, faz ROLLBACK automático e relança o erro
   */
  public transaction<T>(callback: () => T): T {
    if (this.inTransaction) {
      // Já está em transação, apenas executa
      return callback();
    }

    this.db.exec('BEGIN TRANSACTION;');
    this.inTransaction = true;

    try {
      const result = callback();
      this.db.exec('COMMIT;');
      this.inTransaction = false;
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK;');
      this.inTransaction = false;
      throw error;
    }
  }

  public close(): void {
    this.db.close();
  }
}

// Instância singleton padrão para o aplicativo
let defaultInstance: DatabaseManager | null = null;

export function getDatabase(customPath?: string): DatabaseManager {
  if (!defaultInstance || customPath) {
    const dbPath = customPath || path.resolve(process.cwd(), 'data', 'fiscal_storage.db');
    const instance = new DatabaseManager(dbPath);
    if (!customPath) {
      defaultInstance = instance;
    }
    return instance;
  }
  return defaultInstance;
}
