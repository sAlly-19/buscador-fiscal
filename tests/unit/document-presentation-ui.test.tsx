// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DocumentRow } from '../../src/components/DocumentTable/DocumentRow';
import { DocumentDetailsModal } from '../../src/components/DocumentDetailsModal';
import { DocumentTable } from '../../src/components/DocumentTable/DocumentTable';
import type { FiscalDocument } from '../../packages/domain/types';

function fiscalDocument(overrides: Partial<FiscalDocument> = {}): FiscalDocument {
  return {
    id: 10,
    company_id: 5,
    document_type: 'NFE',
    nsu: '000000000000001',
    schema_type: 'procEventoNFe_v1.00.xsd',
    access_key: '52260941573774000199550020000018021000130318',
    document_number: '1802',
    series: '2',
    issue_date: '2026-10-01T12:00:00.000Z',
    received_at: '2026-10-01T12:05:00.000Z',
    issuer_cnpj: '41573774000199',
    issuer_name: 'SUPERMERCADO PRECO BAIXO TODO DIA',
    total_value: undefined,
    xml_path: 'C:/Docs/ciencia.xml',
    xml_status: 'XML_DISPONIVEL',
    pdf_status: 'PDF_INDISPONIVEL',
    situacao_fiscal: 'AUTORIZADA',
    data_level: 'EVENT_ONLY',
    direction: 'OUTBOUND',
    date_kind: 'EVENT',
    created_at: '2026-10-01 09:05:00',
    updated_at: '2026-10-01 09:05:00',
    ...overrides,
  };
}

const handlers = {
  onToggle: vi.fn(),
  onViewDetails: vi.fn(),
  onDownloadXml: vi.fn(),
  onDownloadPdf: vi.fn(),
};

describe('apresentacao visual de documentos parciais', () => {
  it('identifica uma NF-e de saida parcial e suas limitacoes na linha', () => {
    render(
      <table>
        <tbody>
          <DocumentRow document={fiscalDocument()} selected={false} {...handlers} />
        </tbody>
      </table>,
    );

    expect(screen.getByText('NF-e · Saída')).toBeInTheDocument();
    expect(screen.getByText('Dados parciais')).toBeInTheDocument();
    expect(screen.getByText('SUPERMERCADO PRECO BAIXO TODO DIA')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Evento')).toBeInTheDocument();
    expect(screen.getByTitle('Baixar XML do evento')).toBeEnabled();
    expect(screen.getByTitle('PDF indisponível para dados parciais')).toBeDisabled();
  });

  it('usa cabecalho de data neutro quando a tabela pode conter datas de evento', () => {
    render(
      <DocumentTable
        documents={[fiscalDocument()]}
        totalDocs={1}
        currentPage={1}
        totalPages={1}
        pageSize={50}
        selectedDocIds={[]}
        loadingDocs={false}
        onToggleSelectAll={vi.fn()}
        onToggleSelectDoc={vi.fn()}
        onViewDetails={vi.fn()}
        onDownloadXml={vi.fn()}
        onDownloadPdf={vi.fn()}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('columnheader', { name: 'Data' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Emissão' })).not.toBeInTheDocument();
  });

  it('explica no detalhe que a data e o XML pertencem ao evento', () => {
    render(
      <DocumentDetailsModal
        isOpen
        onClose={vi.fn()}
        document={fiscalDocument()}
        onDownloadXml={vi.fn()}
        onDownloadPdf={vi.fn()}
        onOpenFolder={vi.fn()}
      />,
    );

    expect(screen.getByText('NF-e · Saída')).toBeInTheDocument();
    expect(screen.getByText('Dados parciais')).toBeInTheDocument();
    expect(screen.getByText('Data do evento:')).toBeInTheDocument();
    expect(screen.getByText('XML do evento')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Baixar XML do evento' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'PDF indisponível' })).toBeDisabled();
  });

  it('mantem zero numerico de documento completo como valor monetario', () => {
    render(
      <table>
        <tbody>
          <DocumentRow
            document={fiscalDocument({
              schema_type: 'procNFe_v4.00.xsd',
              data_level: 'COMPLETE',
              direction: 'INBOUND',
              date_kind: 'ISSUE',
              total_value: 0,
            })}
            selected={false}
            {...handlers}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByText(/R\$\s*0,00/)).toBeInTheDocument();
  });
});
