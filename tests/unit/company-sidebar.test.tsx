// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompanySidebar } from '../../src/components/layout/CompanySidebar';
import { FooterDownloadBar } from '../../src/components/FooterDownloadBar';
import { CertificateInfo, Company } from '../../packages/domain/types';

const mockCompany: Company = {
  id: 1,
  name: 'Empresa Alpha Logística e Transportes Internacionais LTDA',
  cnpj: '12345678000195',
  uf: '35',
  created_at: '2026-01-01T00:00:00Z',
};

const mockCompany2: Company = {
  id: 2,
  name: 'Empresa Beta',
  cnpj: '98765432000100',
  uf: '33',
  created_at: '2026-01-01T00:00:00Z',
};

const mockCertValid: CertificateInfo = {
  thumbprint: 'abc123thumbprint',
  subject: 'CN=EMPRESA ALPHA LTDA:12345678000195, OU=Certificado PJ A1, O=ICP-Brasil',
  issuer: 'AC Certisign',
  valid_from: '2026-01-01T00:00:00Z',
  valid_to: '2027-06-30T00:00:00Z',
  is_expired: false,
};

const mockCertExpired: CertificateInfo = {
  thumbprint: 'exp123thumbprint',
  subject: 'CN=EMPRESA EXPIRADA LTDA, OU=Certificado PJ A1',
  issuer: 'AC Serasa',
  valid_from: '2024-01-01T00:00:00Z',
  valid_to: '2025-01-01T00:00:00Z',
  is_expired: true,
};

describe('CompanySidebar e CertificateCard', () => {
  it('renderiza lista de empresas com truncamento e despacha selecao e nova empresa', async () => {
    const user = userEvent.setup();
    const onSelectCompany = vi.fn();
    const onNewCompany = vi.fn();
    const onFilterNFeOnly = vi.fn();
    const onFilterCTeOnly = vi.fn();
    const onFilterAllTypes = vi.fn();
    const onOpenCertModal = vi.fn();

    render(
      <div className="theme-dark">
        <CompanySidebar
          companies={[mockCompany, mockCompany2]}
          activeCompany={mockCompany}
          companyCert={mockCertValid}
          onSelectCompany={onSelectCompany}
          onNewCompany={onNewCompany}
          onFilterNFeOnly={onFilterNFeOnly}
          onFilterCTeOnly={onFilterCTeOnly}
          onFilterAllTypes={onFilterAllTypes}
          onOpenCertModal={onOpenCertModal}
        />
      </div>
    );

    // Titulo da secao e botao de nova empresa
    expect(screen.getByText(/Empresas/i)).toBeInTheDocument();
    const newBtn = screen.getByRole('button', { name: /Nova empresa/i });
    await user.click(newBtn);
    expect(onNewCompany).toHaveBeenCalledTimes(1);

    // Nome truncavel com tooltip do valor completo
    const nameEl = screen.getByTitle(mockCompany.name);
    expect(nameEl).toBeInTheDocument();
    expect(screen.getByText('12.345.678/0001-95 · SP')).toBeInTheDocument();

    // Selecao de outra empresa
    const company2Btn = screen.getByRole('button', { name: new RegExp(mockCompany2.name, 'i') });
    await user.click(company2Btn);
    expect(onSelectCompany).toHaveBeenCalledWith(2);

    // Filtros rapidos da empresa ativa
    const nfeFilterBtn = screen.getByRole('button', { name: /NF-e/i });
    await user.click(nfeFilterBtn);
    expect(onFilterNFeOnly).toHaveBeenCalledWith(1);

    const cteFilterBtn = screen.getByRole('button', { name: /CT-e/i });
    await user.click(cteFilterBtn);
    expect(onFilterCTeOnly).toHaveBeenCalledWith(1);

    const allFilterBtn = screen.getByRole('button', { name: /Todos os tipos/i });
    await user.click(allFilterBtn);
    expect(onFilterAllTypes).toHaveBeenCalledWith(1);
  });

  it('renderiza o card de certificado na hierarquia aprovada com certificado valido', async () => {
    const user = userEvent.setup();
    const onOpenCertModal = vi.fn();

    const { container } = render(
      <div className="theme-dark">
        <CompanySidebar
          companies={[mockCompany]}
          activeCompany={mockCompany}
          companyCert={mockCertValid}
          onSelectCompany={vi.fn()}
          onNewCompany={vi.fn()}
          onFilterNFeOnly={vi.fn()}
          onFilterCTeOnly={vi.fn()}
          onFilterAllTypes={vi.fn()}
          onOpenCertModal={onOpenCertModal}
        />
      </div>
    );

    // 1. Titulo
    expect(screen.getByText(/Certificado digital/i)).toBeInTheDocument();

    // 2. Status semantico
    expect(screen.getByText(/Válido/i)).toBeInTheDocument();

    // 3. Subject com tooltip
    const subjectEl = container.querySelector(`[title="${mockCertValid.subject}"]`);
    expect(subjectEl).toBeInTheDocument();

    // 4. Validade formatada
    const formattedValidTo = new Date(mockCertValid.valid_to).toLocaleDateString('pt-BR');
    expect(screen.getByText(new RegExp(`Validade:\\s*${formattedValidTo}`, 'i'))).toBeInTheDocument();

    // 5. Botao de acao de largura total
    const actionBtn = screen.getByRole('button', { name: /Alterar certificado/i });
    expect(actionBtn).toBeInTheDocument();
    await user.click(actionBtn);
    expect(onOpenCertModal).toHaveBeenCalledTimes(1);
  });

  it('exibe estado de certificado expirado e estado sem certificado', async () => {
    const { rerender } = render(
      <div className="theme-light">
        <CompanySidebar
          companies={[mockCompany]}
          activeCompany={mockCompany}
          companyCert={mockCertExpired}
          onSelectCompany={vi.fn()}
          onNewCompany={vi.fn()}
          onFilterNFeOnly={vi.fn()}
          onFilterCTeOnly={vi.fn()}
          onFilterAllTypes={vi.fn()}
          onOpenCertModal={vi.fn()}
        />
      </div>
    );

    expect(screen.getByText(/Expirado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Alterar certificado/i })).toBeInTheDocument();

    // Rerender sem certificado vinculado
    rerender(
      <div className="theme-light">
        <CompanySidebar
          companies={[mockCompany]}
          activeCompany={mockCompany}
          companyCert={null}
          onSelectCompany={vi.fn()}
          onNewCompany={vi.fn()}
          onFilterNFeOnly={vi.fn()}
          onFilterCTeOnly={vi.fn()}
          onFilterAllTypes={vi.fn()}
          onOpenCertModal={vi.fn()}
        />
      </div>
    );

    expect(screen.getByText(/Nenhum certificado associado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Associar certificado/i })).toBeInTheDocument();

    // Rerender sem empresa selecionada
    rerender(
      <div className="theme-light">
        <CompanySidebar
          companies={[]}
          activeCompany={null}
          companyCert={null}
          onSelectCompany={vi.fn()}
          onNewCompany={vi.fn()}
          onFilterNFeOnly={vi.fn()}
          onFilterCTeOnly={vi.fn()}
          onFilterAllTypes={vi.fn()}
          onOpenCertModal={vi.fn()}
        />
      </div>
    );

    expect(screen.getByText(/Selecione uma empresa/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Associar certificado/i })).toBeDisabled();
  });
});

describe('FooterDownloadBar', () => {
  it('apresenta contagem, destino e despacha abertura do modal de download', async () => {
    const user = userEvent.setup();
    const onOpenDownloadModal = vi.fn();

    render(
      <div className="theme-dark">
        <FooterDownloadBar
          selectedCount={3}
          totalOnPage={50}
          defaultStoragePath="C:/Fiscal/Documentos"
          onOpenDownloadModal={onOpenDownloadModal}
        />
      </div>
    );

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/de 50 selecionado\(s\)/i)).toBeInTheDocument();
    expect(screen.getByText(/C:\/Fiscal\/Documentos/i)).toBeInTheDocument();

    const downloadBtn = screen.getByRole('button', { name: /Baixar selecionados/i });
    expect(downloadBtn).not.toBeDisabled();
    await user.click(downloadBtn);
    expect(onOpenDownloadModal).toHaveBeenCalledTimes(1);
  });
});
