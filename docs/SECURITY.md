# Diretrizes de Segurança do Sistema

**Documento:** `docs/SECURITY.md`  
**Data:** 03 de Outubro de 2026  

---

## 1. Isolamento de Processos no Electron

* **`contextIsolation: true`:** O renderer React roda em um contexto JavaScript isolado do Node.js, impossibilitando que scripts maliciosos acessem APIs de sistema operacional.
* **`nodeIntegration: false`:** Acesso direto aos módulos `fs`, `child_process`, `net`, etc. é terminantemente proibido no renderer.
* **`contextBridge`:** Toda comunicação entre renderer e main process passa estritamente pela API tipada `window.fiscalApi`.
* **Content Security Policy (CSP):** Configurada no `index.html` para restringir origens de scripts, imagens e conexões.

---

## 2. Tratamento Criptográfico e Chaves Privadas

* Chaves privadas de certificados A1 e A3 **nunca são exportadas**, transmitidas pela rede para servidores terceiros ou gravadas no SQLite.
* Nenhuma senha ou PIN de certificado digital é armazenada em texto puro, memória persistente ou banco de dados.

---

## 3. Segurança no Sistema de Arquivos

* **Prevenção de Path Traversal:** A função `isSafeSubpath` e `sanitizeFilename` impedem que nomes de arquivos fornecidos externa ou internamente contenham sequências como `../`, `..\` ou caracteres ilegais no Windows (`< > : " / \ | ? *`).
* O nome dos arquivos é padronizado pela Chave de Acesso (44 dígitos numéricos), eliminando qualquer injeção em nomes de arquivos.
