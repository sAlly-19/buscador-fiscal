import React from 'react';
import { DocumentFilters, DocumentFiltersProps } from './DocumentFilters';
import { DocumentTable, DocumentTableProps } from '../DocumentTable/DocumentTable';

export type DocumentWorkspaceProps = DocumentFiltersProps & DocumentTableProps;

export const DocumentWorkspace: React.FC<DocumentWorkspaceProps> = (props) => {
  return (
    <div
      data-testid="document-workspace"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <DocumentFilters
        nsuStatus={props.nsuStatus}
        selectedDocTypes={props.selectedDocTypes}
        onToggleDocType={props.onToggleDocType}
        startDate={props.startDate}
        onStartDateChange={props.onStartDateChange}
        endDate={props.endDate}
        onEndDateChange={props.onEndDateChange}
        searchQuery={props.searchQuery}
        onSearchQueryChange={props.onSearchQueryChange}
        onSearchLocal={props.onSearchLocal}
        onResetNSU={props.onResetNSU}
      />
      <DocumentTable
        documents={props.documents}
        totalDocs={props.totalDocs}
        currentPage={props.currentPage}
        totalPages={props.totalPages}
        pageSize={props.pageSize}
        selectedDocIds={props.selectedDocIds}
        loadingDocs={props.loadingDocs}
        onToggleSelectAll={props.onToggleSelectAll}
        onToggleSelectDoc={props.onToggleSelectDoc}
        onViewDetails={props.onViewDetails}
        onDownloadXml={props.onDownloadXml}
        onDownloadPdf={props.onDownloadPdf}
        onPageChange={props.onPageChange}
        onPageSizeChange={props.onPageSizeChange}
      />
    </div>
  );
};

