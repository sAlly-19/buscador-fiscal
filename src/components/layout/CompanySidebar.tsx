import React from 'react';
import { Company, CertificateInfo } from '../../../packages/domain/types';
import { CompanyList } from '../Sidebar/CompanyList';
import { CertificateCard } from '../Sidebar/CertificateCard';

export interface CompanySidebarProps {
  companies: Company[];
  activeCompany: Company | null;
  companyCert: CertificateInfo | null;
  onSelectCompany: (id: number) => void;
  onNewCompany: () => void;
  onFilterNFeOnly: (id: number) => void;
  onFilterCTeOnly: (id: number) => void;
  onFilterAllTypes: (id: number) => void;
  onOpenCertModal: () => void;
}

export const CompanySidebar: React.FC<CompanySidebarProps> = ({
  companies,
  activeCompany,
  companyCert,
  onSelectCompany,
  onNewCompany,
  onFilterNFeOnly,
  onFilterCTeOnly,
  onFilterAllTypes,
  onOpenCertModal,
}) => {
  return (
    <aside
      data-testid="company-sidebar"
      className="flex w-72 shrink-0 select-none flex-col justify-between border-r border-[var(--border-subtle)] bg-[var(--surface-sidebar)]"
    >
      <CompanyList
        companies={companies}
        activeCompany={activeCompany}
        onSelectCompany={onSelectCompany}
        onNewCompany={onNewCompany}
        onFilterNFeOnly={onFilterNFeOnly}
        onFilterCTeOnly={onFilterCTeOnly}
        onFilterAllTypes={onFilterAllTypes}
      />
      <CertificateCard
        activeCompany={activeCompany}
        companyCert={companyCert}
        onOpenCertModal={onOpenCertModal}
      />
    </aside>
  );
};
