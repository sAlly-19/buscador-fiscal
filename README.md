# Buscador de NF-e e CT-e (SEFAZ DFe) - Aplicativo Desktop Windows

Aplicativo desktop profissional para Windows projetado para busca, sincronização, arquivamento local e gerenciamento de Documentos Fiscais Eletrônicos (**NF-e** e **CT-e**) através dos Web Services oficiais da SEFAZ (`NFeDistribuicaoDFe` e `CTeDistribuicaoDFe`).

---

## 🚀 Funcionalidades Principais

* **Multi-Empresa:** Cadastro e alternância rápida entre empresas com validação rigorosa de CNPJ (dígitos verificadores oficiais e prevenção de duplicidade).
* **Certificados Digitais ICP-Brasil:** Suporte nativo às stores `CurrentUser` e `LocalMachine` do Windows, incluindo certificados A1 e A3 com chave privada acessível.
* **Controle Rigoroso de NSU:** Uma única ação sincroniza NF-e e CT-e sequencialmente, mantendo estado e cooldown independentes por empresa, serviço e ambiente (homologação/produção).
* **Busca Local Rápida:** Filtro visual por período de datas, chave de acesso, número, série e emitente operando 100% sobre o banco SQLite local, sem consumir franquia da SEFAZ.
* **Armazenamento e Deduplicação:** Escrita atômica e caminhos sanitizados (`<Pasta>/<Empresa>/<Tipo>/<Ano>/<Mes>/<Chave>.<ext>`), com idempotência da chave dentro de cada empresa.
* **Download Individual e em Massa:** Exportação dos XMLs arquivados e de PDFs que já possuam arquivo físico associado, individualmente ou em ZIP sem sobrescrever arquivos existentes.
* **Interface Limpa e Focada:** Interface visual intuitiva sem dashboards ou gráficos desnecessários, com navegação em árvore por empresa e controle de seleção.

---

## 🛠️ Tecnologias

* **Desktop:** Electron (com `contextIsolation: true`, `nodeIntegration: false`, preload com API segura via `contextBridge`).
* **Front-end:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons.
* **Banco de Dados:** SQLite local via `sql.js`, persistido por substituição atômica e com foreign keys reativadas após cada exportação.
* **Testes Automatizados:** Vitest com suítes de testes unitários e de integração.

---

## 📦 Como Executar em Desenvolvimento

```powershell
# Instalar dependências
npm install

# Executar suíte de testes unitários
npm test

# Executar aplicação em modo de desenvolvimento
npm run dev
```

---

## 🏗️ Como Compilar para Produção

```powershell
# Compilar renderer (Vite) e main process (TypeScript)
npm run build

# Executar a versão de produção
npx electron .

# Gerar instalador NSIS para Windows
npm run dist:win
```
