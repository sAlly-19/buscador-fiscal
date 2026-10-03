# Guia de Desenvolvimento e Contribuição

**Documento:** `docs/DEVELOPMENT.md`  
**Data:** 03 de Outubro de 2026  

---

## 1. Ambiente de Desenvolvimento

* **Node.js:** Versão 20+ (testado e homologado no Node.js v26 com `node:sqlite` nativo).
* **Plataforma:** Windows 10/11 (PowerShell 5.1 com .NET Framework 4.8 embutido).
* **Linguagem:** TypeScript 5.7+ (Modo estrito ativado em todo o projeto).

---

## 2. Comandos Principais

```powershell
# Instalar dependências
npm install

# Executar a suíte de testes automatizados (Vitest)
npm test

# Executar testes em modo interativo (watch)
npm run test:watch

# Iniciar o ambiente de desenvolvimento desktop
npm run dev

# Compilar para produção (Vite + TypeScript do Electron)
npm run build

# Executar a versão compilada em modo de produção
npx electron .
```

---

## 3. Padrões de Código

* **Código Limpo:** Funções pequenas com responsabilidade única.
* **Tipagem Estrita:** Uso de `any` é proibido sem justificativa expressa.
* **Testes Automatizados:** Qualquer nova regra fiscal, validador ou rotina de persistência deve acompanhar teste em `tests/unit` ou `tests/integration`.
