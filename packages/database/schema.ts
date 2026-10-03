export const INITIAL_SCHEMA_SQL = `
-- Configurações globais de integridade
PRAGMA foreign_keys = ON;

-- 1. Tabela de Empresas
CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cnpj TEXT NOT NULL UNIQUE,
    folder_path TEXT,
    is_active INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 2. Tabela de Certificados Digitais Associados (Metadados públicos apenas)
CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    issuer TEXT NOT NULL,
    serial_number TEXT,
    thumbprint TEXT NOT NULL,
    valid_from TEXT NOT NULL,
    valid_to TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'windows_store',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- 3. Estado de Distribuição de NSU por Empresa e Tipo de Documento
CREATE TABLE IF NOT EXISTS distribution_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    document_type TEXT NOT NULL CHECK(document_type IN ('NFE', 'CTE')),
    last_nsu TEXT NOT NULL DEFAULT '000000000000000',
    max_nsu TEXT NOT NULL DEFAULT '000000000000000',
    last_query_at TEXT,
    status TEXT NOT NULL DEFAULT 'IDLE' CHECK(status IN ('IDLE', 'RUNNING', 'RATE_LIMITED', 'ERROR')),
    last_error TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    UNIQUE(company_id, document_type),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- 4. Tabela de Documentos Fiscais Recebidos e Armazenados
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    document_type TEXT NOT NULL CHECK(document_type IN ('NFE', 'CTE')),
    nsu TEXT NOT NULL,
    schema_type TEXT NOT NULL,
    access_key TEXT NOT NULL UNIQUE,
    document_number TEXT,
    series TEXT,
    issue_date TEXT,
    received_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    issuer_cnpj TEXT,
    issuer_name TEXT,
    recipient_cnpj TEXT,
    recipient_name TEXT,
    total_value REAL DEFAULT 0,
    xml_path TEXT,
    pdf_path TEXT,
    xml_status TEXT NOT NULL DEFAULT 'XML_DISPONIVEL' CHECK(xml_status IN ('XML_DISPONIVEL', 'XML_INDISPONIVEL')),
    pdf_status TEXT NOT NULL DEFAULT 'PDF_INDISPONIVEL' CHECK(pdf_status IN ('PDF_DISPONIVEL', 'PDF_INDISPONIVEL')),
    situacao_fiscal TEXT DEFAULT 'AUTORIZADA' CHECK(situacao_fiscal IN ('AUTORIZADA', 'CANCELADA', 'DENEGADA')),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Índices essenciais para consultas locais rápidas
CREATE INDEX IF NOT EXISTS idx_docs_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_docs_access_key ON documents(access_key);
CREATE INDEX IF NOT EXISTS idx_docs_nsu ON documents(nsu);
CREATE INDEX IF NOT EXISTS idx_docs_issue_date ON documents(issue_date);
CREATE INDEX IF NOT EXISTS idx_docs_issuer_cnpj ON documents(issuer_cnpj);
CREATE INDEX IF NOT EXISTS idx_docs_recipient_cnpj ON documents(recipient_cnpj);
CREATE INDEX IF NOT EXISTS idx_docs_document_type ON documents(document_type);

-- 5. Histórico de Consultas SEFAZ
CREATE TABLE IF NOT EXISTS query_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    document_type TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT NOT NULL,
    last_nsu_before TEXT NOT NULL,
    last_nsu_after TEXT NOT NULL,
    documents_received INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    error_message TEXT,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- 6. Histórico de Downloads
CREATE TABLE IF NOT EXISTS download_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER,
    download_type TEXT NOT NULL CHECK(download_type IN ('XML', 'PDF', 'ZIP')),
    destination_path TEXT NOT NULL,
    downloaded_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    success INTEGER NOT NULL DEFAULT 1,
    error_message TEXT,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
);

-- 7. Configurações Globais da Aplicação
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Inserção de configurações padrões se não existirem
INSERT OR IGNORE INTO app_settings (key, value) VALUES 
('default_storage_path', ''),
('sefaz_environment', 'homologation'),
('items_per_page', '50'),
('log_level', 'info');
`;
