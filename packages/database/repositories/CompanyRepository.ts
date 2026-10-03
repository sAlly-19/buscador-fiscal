import { DatabaseManager } from '../connection';
import { Company, CreateCompanyDTO, UpdateCompanyDTO } from '../../domain/types';
import { sanitizeCNPJ } from '../../domain/cnpj';

export class CompanyRepository {
  constructor(private db: DatabaseManager) {}

  public listAll(): Company[] {
    const rows = this.db.queryAll<any>('SELECT * FROM companies ORDER BY name ASC;');
    return rows.map(r => ({
      ...r,
      is_active: Boolean(r.is_active),
    }));
  }

  public findById(id: number): Company | null {
    const row = this.db.queryOne<any>('SELECT * FROM companies WHERE id = ?;', [id]);
    if (!row) return null;
    return {
      ...row,
      is_active: Boolean(row.is_active),
    };
  }

  public findByCNPJ(cnpj: string): Company | null {
    const cleanCNPJ = sanitizeCNPJ(cnpj);
    const row = this.db.queryOne<any>('SELECT * FROM companies WHERE cnpj = ?;', [cleanCNPJ]);
    if (!row) return null;
    return {
      ...row,
      is_active: Boolean(row.is_active),
    };
  }

  public create(dto: CreateCompanyDTO): Company {
    const cleanCNPJ = sanitizeCNPJ(dto.cnpj);

    // Valida duplicidade
    const existing = this.findByCNPJ(cleanCNPJ);
    if (existing) {
      throw new Error(`Já existe uma empresa cadastrada com o CNPJ ${cleanCNPJ}.`);
    }

    // Se for a primeira empresa, torna ativa por padrão
    const total = this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM companies;');
    const isFirst = (total?.count || 0) === 0;

    const result = this.db.execute(
      `INSERT INTO companies (name, cnpj, folder_path, is_active)
       VALUES (?, ?, ?, ?);`,
      [dto.name.trim(), cleanCNPJ, dto.folder_path || null, isFirst ? 1 : 0]
    );

    const created = this.findById(result.lastInsertRowid);
    if (!created) {
      throw new Error('Falha ao recuperar empresa criada.');
    }
    return created;
  }

  public update(dto: UpdateCompanyDTO): Company {
    const existing = this.findById(dto.id);
    if (!existing) {
      throw new Error(`Empresa com id ${dto.id} não encontrada.`);
    }

    let cleanCNPJ = existing.cnpj;
    if (dto.cnpj) {
      cleanCNPJ = sanitizeCNPJ(dto.cnpj);
      const duplicate = this.findByCNPJ(cleanCNPJ);
      if (duplicate && duplicate.id !== dto.id) {
        throw new Error(`Outra empresa já utiliza o CNPJ ${cleanCNPJ}.`);
      }
    }

    this.db.execute(
      `UPDATE companies 
       SET name = ?, cnpj = ?, folder_path = ?, updated_at = datetime('now', 'localtime')
       WHERE id = ?;`,
      [
        dto.name ? dto.name.trim() : existing.name,
        cleanCNPJ,
        dto.folder_path !== undefined ? dto.folder_path : existing.folder_path,
        dto.id
      ]
    );

    return this.findById(dto.id)!;
  }

  public delete(id: number): boolean {
    const result = this.db.execute('DELETE FROM companies WHERE id = ?;', [id]);
    return result.changes > 0;
  }

  public getActive(): Company | null {
    const row = this.db.queryOne<any>('SELECT * FROM companies WHERE is_active = 1 LIMIT 1;');
    if (!row) {
      // Fallback para a primeira cadastrada se nenhuma estiver marcada
      const first = this.db.queryOne<any>('SELECT * FROM companies ORDER BY id ASC LIMIT 1;');
      if (!first) return null;
      this.setActive(first.id);
      return { ...first, is_active: true };
    }
    return { ...row, is_active: true };
  }

  public setActive(id: number): boolean {
    return this.db.transaction(() => {
      this.db.execute('UPDATE companies SET is_active = 0;');
      const result = this.db.execute('UPDATE companies SET is_active = 1 WHERE id = ?;', [id]);
      return result.changes > 0;
    });
  }
}
