import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseManager } from '../../packages/database/connection';
import { CompanyRepository } from '../../packages/database/repositories/CompanyRepository';
import { DistributionStateRepository } from '../../packages/database/repositories/DistributionStateRepository';

describe('Persistência segura do banco em disco', () => {
  const tempDirectories: string[] = [];

  afterEach(() => {
    for (const directory of tempDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
  });

  it('preserva dados, foreign keys e estados por ambiente após reabrir o arquivo', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fiscal-db-'));
    tempDirectories.push(directory);
    const dbPath = path.join(directory, 'storage.db');

    let db = await DatabaseManager.create(dbPath);
    const company = new CompanyRepository(db).create({ name: 'Empresa Persistida', cnpj: '41.777.943/0001-02' });
    new DistributionStateRepository(db).updateNSU(company.id, 'NFE', '8', '9', 'IDLE', undefined, 'production');
    db.close();

    db = await DatabaseManager.create(dbPath);
    expect(db.queryOne<{ foreign_keys: number }>('PRAGMA foreign_keys;')?.foreign_keys).toBe(1);
    expect(new CompanyRepository(db).findById(company.id)?.name).toBe('Empresa Persistida');
    expect(new DistributionStateRepository(db).getOrCreate(company.id, 'NFE', 'production').last_nsu)
      .toBe('000000000000008');
    expect(() => db.execute(
      `INSERT INTO distribution_state (company_id, document_type, environment, last_nsu, max_nsu, status)
       VALUES (99999, 'NFE', 'production', '000000000000000', '000000000000000', 'IDLE');`
    )).toThrow();
    db.close();
  });
});
