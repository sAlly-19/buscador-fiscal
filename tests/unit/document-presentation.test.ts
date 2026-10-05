import { describe, expect, it } from 'vitest';
import {
  deriveDocumentPresentation,
  isOwnIssuedNfeEvent,
} from '../../packages/domain/document-presentation';
import type { Company, FiscalDocument } from '../../packages/domain/types';

const company: Pick<Company, 'name' | 'cnpj'> = {
  name: 'SUPERMERCADO PRECO BAIXO TODO DIA',
  cnpj: '41573774000199',
};

function document(overrides: Partial<FiscalDocument> = {}): FiscalDocument {
  return {
    id: 1,
    company_id: 5,
    document_type: 'NFE',
    nsu: '000000000000001',
    schema_type: 'procEventoNFe_v1.00.xsd',
    access_key: '52260941573774000199550020000018021000130318',
    document_number: '1802',
    series: '2',
    issue_date: '2026-10-01T08:00:00-03:00',
    received_at: '2026-10-01T08:05:00-03:00',
    issuer_cnpj: '00000000000000',
    issuer_name: 'Ciencia da Operacao',
    total_value: 0,
    xml_path: 'C:/Docs/ciencia.xml',
    pdf_path: 'C:/Docs/nao-e-danfe.pdf',
    xml_status: 'XML_DISPONIVEL',
    pdf_status: 'PDF_DISPONIVEL',
    situacao_fiscal: 'AUTORIZADA',
    created_at: '2026-10-01 08:05:00',
    updated_at: '2026-10-01 08:05:00',
    ...overrides,
  };
}

describe('apresentacao de documentos fiscais', () => {
  it('apresenta evento NF-e de emissao propria como documento parcial de saida', () => {
    const result = deriveDocumentPresentation(document(), company);

    expect(result).toMatchObject({
      data_level: 'EVENT_ONLY',
      direction: 'OUTBOUND',
      date_kind: 'EVENT',
      issuer_name: 'SUPERMERCADO PRECO BAIXO TODO DIA',
      issuer_cnpj: '41573774000199',
      xml_path: 'C:/Docs/ciencia.xml',
      xml_status: 'XML_DISPONIVEL',
      pdf_status: 'PDF_INDISPONIVEL',
    });
    expect(result.total_value).toBeUndefined();
    expect(result.pdf_path).toBeUndefined();
  });

  it.each([
    ['evento NF-e de terceiro', 'NFE', 'procEventoNFe_v1.00.xsd', '52260941777943000102550020000018021000130318'],
    ['evento CT-e proprio', 'CTE', 'procEventoCTe_v3.00.xsd', '52260941573774000199570020000018021000130318'],
    ['chave malformada', 'NFE', 'procEventoNFe_v1.00.xsd', '41573774000199'],
  ] as const)('nao classifica %s como evento NF-e proprio', (_label, type, schema, key) => {
    expect(isOwnIssuedNfeEvent(type, schema, key, company.cnpj)).toBe(false);
  });

  it('classifica resumo e documento completo sem confundir a data com evento', () => {
    const summary = deriveDocumentPresentation(
      document({ schema_type: 'resNFe_v1.01.xsd', issuer_name: 'Fornecedor', total_value: 15 }),
      company,
    );
    const complete = deriveDocumentPresentation(
      document({ schema_type: 'procNFe_v4.00.xsd', issuer_name: 'Fornecedor', total_value: 25 }),
      company,
    );

    expect(summary).toMatchObject({ data_level: 'SUMMARY', direction: 'OUTBOUND', date_kind: 'ISSUE' });
    expect(complete).toMatchObject({ data_level: 'COMPLETE', direction: 'OUTBOUND', date_kind: 'ISSUE' });
    expect(complete.total_value).toBe(25);
  });
});
