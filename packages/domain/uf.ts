export interface UFInfo {
  code: string;
  acronym: string;
  name: string;
}

export const BRAZILIAN_UFS: UFInfo[] = [
  { code: '11', acronym: 'RO', name: 'Rondônia' },
  { code: '12', acronym: 'AC', name: 'Acre' },
  { code: '13', acronym: 'AM', name: 'Amazonas' },
  { code: '14', acronym: 'RR', name: 'Roraima' },
  { code: '15', acronym: 'PA', name: 'Pará' },
  { code: '16', acronym: 'AP', name: 'Amapá' },
  { code: '17', acronym: 'TO', name: 'Tocantins' },
  { code: '21', acronym: 'MA', name: 'Maranhão' },
  { code: '22', acronym: 'PI', name: 'Piauí' },
  { code: '23', acronym: 'CE', name: 'Ceará' },
  { code: '24', acronym: 'RN', name: 'Rio Grande do Norte' },
  { code: '25', acronym: 'PB', name: 'Paraíba' },
  { code: '26', acronym: 'PE', name: 'Pernambuco' },
  { code: '27', acronym: 'AL', name: 'Alagoas' },
  { code: '28', acronym: 'SE', name: 'Sergipe' },
  { code: '29', acronym: 'BA', name: 'Bahia' },
  { code: '31', acronym: 'MG', name: 'Minas Gerais' },
  { code: '32', acronym: 'ES', name: 'Espírito Santo' },
  { code: '33', acronym: 'RJ', name: 'Rio de Janeiro' },
  { code: '35', acronym: 'SP', name: 'São Paulo' },
  { code: '41', acronym: 'PR', name: 'Paraná' },
  { code: '42', acronym: 'SC', name: 'Santa Catarina' },
  { code: '43', acronym: 'RS', name: 'Rio Grande do Sul' },
  { code: '50', acronym: 'MS', name: 'Mato Grosso do Sul' },
  { code: '51', acronym: 'MT', name: 'Mato Grosso' },
  { code: '52', acronym: 'GO', name: 'Goiás' },
  { code: '53', acronym: 'DF', name: 'Distrito Federal' },
];

/**
 * Retorna o código IBGE oficial de 2 dígitos a partir da sigla ou do próprio código.
 * Se inválido ou ausente, retorna '35' (SP) como padrão.
 */
export function getUfCode(input?: string): string {
  if (!input) return '35';
  const clean = input.trim().toUpperCase();
  const found = BRAZILIAN_UFS.find(u => u.acronym === clean || u.code === clean);
  return found ? found.code : '35';
}

/**
 * Retorna a sigla da UF a partir da sigla ou do código IBGE.
 */
export function getUfAcronym(input?: string): string {
  if (!input) return 'SP';
  const clean = input.trim().toUpperCase();
  const found = BRAZILIAN_UFS.find(u => u.acronym === clean || u.code === clean);
  return found ? found.acronym : 'SP';
}

