// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentWorkspace } from '../../src/components/documents/DocumentWorkspace';
import { FiscalDocument } from '../../packages/domain/types';

function createMockDocument(id: number, overrides: Partial<FiscalDocument> = {}): FiscalDocument {
  return {
    id,
    company_id: 1,
    document_type: 'NFE',
    nsu: String(id).padStart(15, '0'),
    schema_type: 'procNFe_v4.00.xsd',
    access_key: `352601000000000000015500100000000${String(id).padStart(5, '0')}1000000001`,
    document_number: String(id),
    series: '1',
    issue_date: '2026-10-01T10:00:00Z',
    received_at: '2026-10-01T10:05:00Z',
    issuer_cnpj: '00000000000191',
    issuer_name: `Fornecedor ${id} LTDA`,
    total_value: 1500.5,
    xml_path: `C:/Docs/nfe-${id}.xml`,
    xml_status: 'XML_DISPONIVEL',
    pdf_status: 'PDF_DISPONIVEL',
    situacao_fiscal: 'AUTORIZADA',
    data_level: 'COMPLETE',
    direction: 'INBOUND',
    date_kind: 'ISSUE',
    created_at: '2026-10-01 10:05:00',
    updated_at: '2026-10-01 10:05:00',
    ...overrides,
  };
}

describe('DocumentWorkspace', () => {
  const baseProps = {
    nsuStatus: { nfeLastNSU: '000000000000123', cteLastNSU: '000000000000045' },
    selectedDocTypes: { nfe: true, cte: true },
    onToggleDocType: vi.fn(),
    startDate: '2026-09-01',
    onStartDateChange: vi.fn(),
    endDate: '2026-10-01',
    onEndDateChange: vi.fn(),
    searchQuery: '',
    onSearchQueryChange: vi.fn(),
    onSearchLocal: vi.fn(),
    onResetNSU: vi.fn(),

    documents: [
      createMockDocument(1),
      createMockDocument(2, {
        data_level: 'EVENT_ONLY',
        direction: 'OUTBOUND',
        date_kind: 'EVENT',
        total_value: undefined,
        schema_type: 'procEventoNFe_v1.00.xsd',
      }),
    ],
    totalDocs: 2,
    currentPage: 1,
    totalPages: 1,
    pageSize: 50 as const,
    selectedDocIds: [],
    loadingDocs: false,
    onToggleSelectAll: vi.fn(),
    onToggleSelectDoc: vi.fn(),
    onViewDetails: vi.fn(),
    onDownloadXml: vi.fn(),
    onDownloadPdf: vi.fn(),
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
  };

  it('renderiza filtros, explicacao local, badges parciais e controles de paginacao', async () => {
    const user = userEvent.setup();
    const onSearchLocal = vi.fn();
    const onToggleDocType = vi.fn();
    const onResetNSU = vi.fn();

    render(
      <div className="theme-dark">
        <DocumentWorkspace
          {...baseProps}
          onSearchLocal={onSearchLocal}
          onToggleDocType={onToggleDocType}
          onResetNSU={onResetNSU}
        />
      </div>
    );

    // 1. Explicacao de periodo local
    expect(screen.getByText(/Período exibido na base local/i)).toBeInTheDocument();

    // 2. Tecla Enter no campo de busca dispara onSearchLocal
    const searchInput = screen.getByPlaceholderText(/Chave, número, série, CNPJ ou nome/i);
    await user.type(searchInput, '{Enter}');
    expect(onSearchLocal).toHaveBeenCalledTimes(1);

    // 3. Toggles NF-e e CT-e
    const nfeCheckbox = screen.getByRole('checkbox', { name: /NF-e/i });
    await user.click(nfeCheckbox);
    expect(onToggleDocType).toHaveBeenCalledWith('nfe', false);

    // 4. Botoes de reset de NSU
    const resetNfeBtn = screen.getByTitle(/Resetar NSU de NF-e/i);
    await user.click(resetNfeBtn);
    expect(onResetNSU).toHaveBeenCalledWith('NFE');

    const resetCteBtn = screen.getByTitle(/Resetar NSU de CT-e/i);
    await user.click(resetCteBtn);
    expect(onResetNSU).toHaveBeenCalledWith('CTE');

    // 5. Sticky table headers
    const thead = document.querySelector('thead');
    expect(thead).toHaveClass('sticky');

    // 6. Coluna Data neutra
    expect(screen.getByRole('columnheader', { name: 'Data' })).toBeInTheDocument();

    // 7. Badge de dados parciais em linha com amber
    expect(screen.getByText('Dados parciais')).toBeInTheDocument();

    // 8. Seletor de tamanho de pagina no rodape a esquerda
    const pageSizeSelect = screen.getByLabelText('Exibir por vez');
    expect(pageSizeSelect).toBeInTheDocument();
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      '50 arquivos',
      '100 arquivos',
      '200 arquivos',
      '500 arquivos',
      '1000 arquivos',
    ]);
  });

  it('exibe estado de carregamento', () => {
    render(
      <div className="theme-dark">
        <DocumentWorkspace {...baseProps} loadingDocs={true} documents={[]} />
      </div>
    );

    expect(screen.getByText(/Carregando documentos.../i)).toBeInTheDocument();
  });

  it('exibe estado de lista vazia', () => {
    render(
      <div className="theme-dark">
        <DocumentWorkspace {...baseProps} loadingDocs={false} documents={[]} totalDocs={0} />
      </div>
    );

    expect(screen.getByText(/Nenhum documento encontrado/i)).toBeInTheDocument();
  });

  it('renderiza 1000 linhas densas sem erros de componente', () => {
    const thousandDocs = Array.from({ length: 1000 }, (_, idx) => createMockDocument(idx + 1));

    const { container } = render(
      <div className="theme-dark">
        <DocumentWorkspace
          {...baseProps}
          documents={thousandDocs}
          totalDocs={1000}
          pageSize={1000}
        />
      </div>
    );

    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1000);
  }, 20000);
});
