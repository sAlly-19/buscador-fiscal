# Arquitetura do Sistema - Buscador NF-e / CT-e Desktop

**Documento:** `docs/ARCHITECTURE.md`  
**Data:** 03 de Outubro de 2026  
**Padrão:** Clean Architecture / Hexagonal / Processos Segregados Electron

---

## 1. Visão Geral

A aplicação foi concebida seguindo o princípio da estrita separação de responsabilidades e segurança por isolamento de processos (Process Sandboxing).

```mermaid
flowchart TD
    subgraph Renderer ["Renderer Process (React + Vite + Tailwind)"]
        UI["Componentes React (App, Modais, Tabelas)"]
        PreloadAPI["window.fiscalApi (Contrato Tipado)"]
    end

    subgraph IPC ["Isolamento IPC"]
        ContextBridge["Electron contextBridge"]
    end

    subgraph Main ["Electron Main Process"]
        IPCRegistry["IPC Handlers Registrados"]
        CompanyService["CompanyService"]
        DistributionEngine["DistributionEngine (NSU State Machine)"]
        StorageService["StorageService (Filesystem & Sanitizer)"]
        ZipService["ZipService"]
    end

    subgraph Infra ["Camada de Infraestrutura Local"]
        SQLite[("SQLite Local (DatabaseSync)\nWAL Mode + Foreign Keys")]
        Filesystem[("Filesystem Local\n<Docs>/<Empresa>/<Tipo>/<Ano>/<Mes>/")]
        WinBridge["Windows Store Certificate Bridge (PowerShell/.NET)"]
    end

    subgraph SEFAZ ["Web Services SEFAZ"]
        NFeWS["NFeDistribuicaoDFe (Ambiente Nacional)"]
        CTeWS["CTeDistribuicaoDFe (Ambiente Nacional)"]
    end

    UI --> PreloadAPI
    PreloadAPI --> ContextBridge
    ContextBridge --> IPCRegistry
    IPCRegistry --> CompanyService
    IPCRegistry --> DistributionEngine
    IPCRegistry --> StorageService
    IPCRegistry --> ZipService

    CompanyService --> SQLite
    DistributionEngine --> SQLite
    DistributionEngine --> StorageService
    DistributionEngine --> WinBridge
    StorageService --> Filesystem

    WinBridge -.->|TLS 1.2 mTLS| NFeWS
    WinBridge -.->|TLS 1.2 mTLS| CTeWS
```

---

## 2. Camadas do Sistema

1. **Domínio (`packages/domain`):**
   * Tipos puros, modelos e Value Objects: `CNPJ`, `NSU`, `AccessKey`, `DocumentType`.
   * Regras matemáticas puras: algoritmo Módulo 11 de validação de CNPJ, comparação de NSU de 15 dígitos com `BigInt`, validação de dígito verificador da Chave de Acesso (44 dígitos). Zero dependência de frameworks.

2. **Banco de Dados (`packages/database`):**
   * Conexão `DatabaseSync` com `PRAGMA journal_mode = WAL;` e `PRAGMA foreign_keys = ON;`.
   * Repositórios tipados: `CompanyRepository`, `CertificateRepository`, `DistributionStateRepository`, `DocumentRepository`, `SettingsRepository`.
   * Suporte a transações atômicas com rollback automático em caso de falha.

3. **Filesystem & Armazenamento (`packages/storage`):**
   * `PathSanitizer`: Prevenção contra Directory Traversal e caracteres proibidos no Windows.
   * `StorageService`: Organização de arquivos em `<Pasta>/<Empresa>/<Tipo>/<Ano>/<Mes>/<Chave>.<ext>`.
   * `ReconciliationService`: Verificação e reparo de consistência entre arquivos no disco e registros no banco.

4. **Certificados Digitais (`packages/certificates`):**
   * Interface desacoplada `ICertificateProvider`.
   * `WindowsStoreCertificateProvider`: Consome certificados diretamente do repositório `Cert:\CurrentUser\My` do Windows via bridge PowerShell/.NET (Schannel). Chaves privadas permanecem no hardware/KSP do Windows.
   * `MockCertificateProvider`: Provedor para testes automatizados offline.

5. **Fiscal & SEFAZ (`packages/fiscal`):**
   * `NFeParser` e `CTeParser`: Descompressão de lotes `docZip` (Base64 + GZIP) e normalização de `procNFe`, `resNFe`, `procCTe` e `resCTe`.
   * `DistributionEngine`: Orquestrador transacional que executa consultas, grava documentos, atualiza NSU no SQLite e respeita limites de taxa da SEFAZ.

6. **Interface do Usuário (`src/`):**
   * React 18 com TypeScript, Vite, Tailwind CSS e ícones Lucide.
   * Layout desktop sem dashboards ou gráficos: foco total em arquivo fiscal, listagem limpa, filtros rápidos e download.
