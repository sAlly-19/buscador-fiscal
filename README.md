# Buscador de NF-e e CT-e (SEFAZ DFe) - Aplicativo Desktop Windows

Aplicativo desktop profissional para Windows projetado para busca, sincronização, arquivamento local e gerenciamento de Documentos Fiscais Eletrônicos (**NF-e** e **CT-e**) através dos Web Services oficiais da SEFAZ (`NFeDistribuicaoDFe` e `CTeDistribuicaoDFe`).

---

## 🚀 Funcionalidades Principais

* **Multi-Empresa:** Cadastro e alternância rápida entre empresas com validação rigorosa de CNPJ (dígitos verificadores oficiais e prevenção de duplicidade).
* **Certificados Digitais ICP-Brasil:** Suporte nativo a certificados instalados na máquina do usuário (`Cert:\CurrentUser\My`), tanto A1 quanto A3 (tokens e smartcards protegidos), sem requerer seleção repetida de arquivo PFX ou digitação frequente de senha.
* **Controle Rigoroso de NSU:** Sincronização de documentos fiscais respeitando estritamente o estado do NSU (15 dígitos) de forma transacional e independente para NF-e e CT-e. Prevenção de bloqueio por consumo indevido (`cStat 656`).
* **Busca Local Rápida:** Filtro visual por período de datas, chave de acesso, número, série e emitente operando 100% sobre o banco SQLite local, sem consumir franquia da SEFAZ.
* **Armazenamento e Deduplicação:** Arquivamento físico sanitizado no disco (`<Pasta>/<Empresa>/<Tipo>/<Ano>/<Mes>/<Chave>.<ext>`) e metadados no SQLite, com garantia de idempotência por chave de acesso (44 dígitos).
* **Download Individual e em Massa:** Exportação de XMLs e PDFs (DANFE/DACTE gerados localmente via Chromium) individualmente ou empacotados em arquivo ZIP estruturado.
* **Interface Limpa e Focada:** Interface visual intuitiva sem dashboards ou gráficos desnecessários, com navegação em árvore por empresa e controle de seleção.

---

## 🛠️ Tecnologias

* **Desktop:** Electron (com `contextIsolation: true`, `nodeIntegration: false`, preload com API segura via `contextBridge`).
* **Front-end:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons.
* **Banco de Dados:** SQLite local (WAL mode, foreign keys ativadas).
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
```
