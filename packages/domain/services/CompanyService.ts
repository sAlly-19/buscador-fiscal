import { CompanyRepository } from '../../database/repositories/CompanyRepository';
import { Company, CreateCompanyDTO, UpdateCompanyDTO } from '../types';
import { isValidCNPJ, sanitizeCNPJ } from '../cnpj';

export class CompanyService {
  constructor(private repo: CompanyRepository) {}

  public list(): Company[] {
    return this.repo.listAll();
  }

  public getById(id: number): Company | null {
    return this.repo.findById(id);
  }

  public getActive(): Company | null {
    return this.repo.getActive();
  }

  public selectActive(id: number): Company | null {
    this.repo.setActive(id);
    return this.repo.findById(id);
  }

  public create(dto: CreateCompanyDTO): Company {
    if (!dto.name || dto.name.trim().length < 2) {
      throw new Error('A Razão Social/Nome da empresa é obrigatório (mínimo 2 caracteres).');
    }

    const cleanCNPJ = sanitizeCNPJ(dto.cnpj);
    if (!isValidCNPJ(cleanCNPJ)) {
      throw new Error(`O CNPJ '${dto.cnpj}' informado não é válido perante as regras da Receita Federal.`);
    }

    return this.repo.create({
      name: dto.name.trim(),
      cnpj: cleanCNPJ,
      uf: dto.uf,
      folder_path: dto.folder_path,
    });
  }

  public update(dto: UpdateCompanyDTO): Company {
    if (dto.name !== undefined && dto.name.trim().length < 2) {
      throw new Error('A Razão Social/Nome da empresa não pode ficar em branco.');
    }

    if (dto.cnpj !== undefined) {
      const cleanCNPJ = sanitizeCNPJ(dto.cnpj);
      if (!isValidCNPJ(cleanCNPJ)) {
        throw new Error(`O CNPJ '${dto.cnpj}' informado não é válido.`);
      }
      dto.cnpj = cleanCNPJ;
    }

    return this.repo.update(dto);
  }

  public delete(id: number): boolean {
    const existing = this.repo.findById(id);
    if (!existing) {
      throw new Error('Empresa não encontrada para exclusão.');
    }

    const deleted = this.repo.delete(id);

    // Se a empresa deletada era a ativa, define outra como ativa se houver
    if (existing.is_active) {
      const remaining = this.repo.listAll();
      if (remaining.length > 0) {
        this.repo.setActive(remaining[0].id);
      }
    }

    return deleted;
  }
}
