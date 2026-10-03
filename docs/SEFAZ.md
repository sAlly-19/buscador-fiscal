# Integração Web Services SEFAZ (NF-e e CT-e)

**Documento:** `docs/SEFAZ.md`  
**Data:** 03 de Outubro de 2026  

---

## 1. Web Services Oficiais Utilizados

A consulta e distribuição de documentos fiscais eletrônicos são realizadas através dos serviços centralizados do **Ambiente Nacional (AN)**:

1. **NF-e:** `NFeDistribuicaoDFe` (versão 1.01)
   * Produção: `https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx`
   * Homologação: `https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx`
   * SOAP Action: `http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse`

2. **CT-e:** `CTeDistribuicaoDFe` (versão 1.00)
   * Produção: `https://www1.cte.fazenda.gov.br/CTeDistribuicaoDFe/CTeDistribuicaoDFe.asmx`
   * Homologação: `https://hom1.cte.fazenda.gov.br/CTeDistribuicaoDFe/CTeDistribuicaoDFe.asmx`
   * SOAP Action: `http://www.portalfiscal.inf.br/cte/wsdl/CTeDistribuicaoDFe/cteDistDFeInteresse`

---

## 2. Regras de NSU (Número Sequencial Único)

* O NSU possui exatamente **15 dígitos** alinhados à esquerda com zeros (`000000000000001` a `999999999999999`).
* **Segregação Completa:** Cada empresa possui um controle de NSU independente para NF-e e outro para CT-e.
* **Algoritmo de Consulta:**
  1. A primeira consulta utiliza `ultNSU = '000000000000000'`.
  2. A SEFAZ retorna lote de até 50 documentos com status `cStat = 138`, informando o novo `ultNSU` e o `maxNSU`.
  3. Somente após a gravação atômica dos documentos no SQLite e no filesystem o `last_nsu` é atualizado no banco.
  4. Quando `ultNSU == maxNSU`, a sincronização com a SEFAZ está completa.

---

## 3. Códigos de Retorno (cStat)

| cStat | Significado | Comportamento da Aplicação |
| :---: | :--- | :--- |
| **138** | Documento(s) localizado(s) para o interessado | Descompacta `docZip`, grava XMLs no disco, insere metadados no SQLite e avança `last_nsu = ultNSU`. |
| **137** | Nenhum documento localizado | Atualiza data da última consulta e mantém o `last_nsu`. |
| **656** | Consumo Indevido | Bloqueia novas consultas locais por **1 hora** e exibe aviso amigável ao usuário. |
| **215** | Falha no schema XML | Erro de estrutura de mensagem. |
| **280..286** | Falhas de Certificado Digital | Certificado inválido, expirado ou revogado. |
