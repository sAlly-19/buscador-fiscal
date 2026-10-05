// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompanyModal } from '../../src/components/CompanyModal';
import { CertificateModal } from '../../src/components/CertificateModal';
import { SettingsModal } from '../../src/components/SettingsModal';
import { DownloadModal } from '../../src/components/DownloadModal';
import { SefazProgressModal } from '../../src/components/SefazProgressModal';
import { DocumentDetailsModal } from '../../src/components/DocumentDetailsModal';
import { CertificateInfo, Company, FiscalDocument } from '../../packages/domain/types';

const mockCompany: Company = {
  id: 1,
  name: 'Empresa Teste Operacional LTDA',
  cnpj: '12345678000195',
  uf: '35',
  folder_path: 'C:/Fiscal/EmpresaTeste',
  created_at: '2026-01-01',
};

const mockCert: CertificateInfo = {
  thumbprint: 'cert1234567890',
  subject: 'CN=EMPRESA TESTE OPERACIONAL LTDA:12345678000195, OU=Certificado Digital A1, O=ICP-Brasil',
  issuer: 'AC Certisign G7',
  valid_from: '2026-01-01',
  valid_to: '2027-01-01',
  is_expired: false,
  extracted_cnpj: '12345678000195',
};

const mockDoc: FiscalDocument = {
  id: 42,
  company_id: 1,
  document_type: 'NFE',
  nsu: '000000000000042',
  schema_type: 'procNFe_v4.00.xsd',
  access_key: '35260112345678000195550010000000421000000421',
  document_number: '42',
  series: '1',
  issue_date: '2026-10-01T12:00:00Z',
  received_at: '2026-10-01T12:05:00Z',
  issuer_cnpj: '99888777000166',
  issuer_name: 'Fornecedor de Equipamentos e Máquinas Pesadas LTDA',
  recipient_cnpj: '12345678000195',
  recipient_name: 'Empresa Teste Operacional LTDA',
  total_value: 8450.75,
  xml_path: 'C:/Fiscal/nfe-42.xml',
  xml_status: 'XML_DISPONIVEL',
  pdf_path: 'C:/Fiscal/danfe-42.pdf',
  pdf_status: 'PDF_DISPONIVEL',
  situacao_fiscal: 'AUTORIZADA',
  data_level: 'COMPLETE',
  direction: 'INBOUND',
  date_kind: 'ISSUE',
  created_at: '2026-10-01',
  updated_at: '2026-10-01',
};

describe('Diálogos operacionais na casca DialogShell compartilhada', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'fiscalApi', {
      configurable: true,
      value: {
        certificates: {
          listAvailable: vi.fn(async () => [mockCert]),
          getForCompany: vi.fn(async () => mockCert),
          associateToCompany: vi.fn(async () => ({ success: true })),
        },
        settings: {
          get: vi.fn(async () => ({
            default_storage_path: 'C:/Fiscal/Docs',
            sefaz_environment: 'homologation',
            items_per_page: 50,
          })),
          update: vi.fn(async (val) => ({ ...val })),
          selectFolder: vi.fn(async () => 'C:/NovaPasta'),
        },
        documents: {
          downloadBatch: vi.fn(async () => ({
            success: true,
            zip_path: 'C:/Fiscal/Lote.zip',
            total_xml: 1,
            total_pdf: 1,
          })),
        },
      },
    });
  });

  it('CompanyModal: renderiza via DialogShell, valida e cancela', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <CompanyModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        editingCompany={mockCompany}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Editar Empresa')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    await user.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('CertificateModal: renderiza via DialogShell, exibe certificado e vincula', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onAssociated = vi.fn();

    render(
      <CertificateModal
        isOpen
        onClose={onClose}
        company={mockCompany}
        onAssociated={onAssociated}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/Certificados Digitais/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(mockCert.subject)).toBeInTheDocument();
    });

    const linkBtn = screen.getByRole('button', { name: /Vincular à Empresa/i });
    expect(linkBtn).toBeEnabled();
    await user.click(linkBtn);

    await waitFor(() => {
      expect(onAssociated).toHaveBeenCalledTimes(1);
    });
  });

  it('SettingsModal: renderiza via DialogShell e salva alteracoes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSaved = vi.fn();

    render(<SettingsModal isOpen onClose={onClose} onSaved={onSaved} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/Configurações do Sistema/i)).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: /Salvar Alterações/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('DownloadModal: renderiza via DialogShell e dispara lote de download', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <DownloadModal
        isOpen
        onClose={onClose}
        companyId={1}
        selectedCount={1}
        selectedDocIds={[42]}
        defaultFolder="C:/Destino"
        onSuccess={onSuccess}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/Download em Massa/i)).toBeInTheDocument();

    const startBtn = screen.getByRole('button', { name: /Iniciar Download/i });
    await user.click(startBtn);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('SefazProgressModal: renderiza via DialogShell e exibe estado de sincronizacao e cancelamento', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <SefazProgressModal
        isOpen
        companyName="Empresa Teste"
        docType="NF-e"
        currentNSU="000000000000100"
        message="Sincronizando lote 2 da SEFAZ..."
        receivedCount={50}
        onCancel={onCancel}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/Consultando Distribuição SEFAZ/i)).toBeInTheDocument();
    expect(screen.getByText('000000000000100')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText(/Sincronizando lote 2 da SEFAZ/i)).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /CANCELAR CONSULTA/i });
    await user.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('DocumentDetailsModal: renderiza via DialogShell e aciona download de XML e PDF', async () => {
    const user = userEvent.setup();
    const onDownloadXml = vi.fn();
    const onDownloadPdf = vi.fn();
    const onOpenFolder = vi.fn();
    const onClose = vi.fn();

    render(
      <DocumentDetailsModal
        isOpen
        onClose={onClose}
        document={mockDoc}
        onDownloadXml={onDownloadXml}
        onDownloadPdf={onDownloadPdf}
        onOpenFolder={onOpenFolder}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/Detalhes do Documento Fiscal/i)).toBeInTheDocument();

    const xmlBtn = screen.getByRole('button', { name: /Baixar XML Completo/i });
    await user.click(xmlBtn);
    expect(onDownloadXml).toHaveBeenCalledWith(42);

    const pdfBtn = screen.getByRole('button', { name: /Baixar DANFE \(PDF\)/i });
    await user.click(pdfBtn);
    expect(onDownloadPdf).toHaveBeenCalledWith(42);
  });
});
