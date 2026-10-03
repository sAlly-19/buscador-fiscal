# Pesquisa Técnica Oficial: Integração SEFAZ (NF-e e CT-e) e Certificados Digitais Windows

**Documento:** `docs/SEFAZ_TECHNICAL_RESEARCH.md`  
**Autor:** Engenheiro de Software Sênior & Arquiteto de Sistemas  
**Data:** 03 de Outubro de 2026  
**Status:** Validação Concluída / Base Normativa Homologada  

---

## 1. Sumário Executivo

Este documento consolida a pesquisa técnica, fundamentação normativa e especificações oficiais vigentes para o desenvolvimento do aplicativo desktop Windows de busca, consulta, distribuição, armazenamento e gestão de **NF-e (Nota Fiscal Eletrônica - Modelo 55)** e **CT-e (Conhecimento de Transporte Eletrônico - Modelo 57)** via Web Services de Distribuição DFe da SEFAZ.

Todas as informações técnicas aqui documentadas foram checadas contra os Manuais de Orientação do Contribuinte (MOC) e as Notas Técnicas (NT) oficiais do Portal Nacional da NF-e e do CT-e.

---

## 2. NFeDistribuicaoDFe (Distribuição de DF-e de Interesse dos Atores da NF-e)

### 2.1 Base Normativa
* **Nota Técnica 2014.002 (versões 1.00 a 1.40):** Regulamenta o serviço de consulta a documentos fiscais eletrônicos disponibilizados pela SEFAZ para emitentes, destinatários, transportadores e terceiros autorizados.
* **MOC NF-e (Manual de Orientação do Contribuinte):** Anexo de Web Services e Padrão de Comunicação.

### 2.2 Endpoints Oficiais (Ambiente Nacional - AN)
O serviço `NFeDistribuicaoDFe` é centralizado exclusivamente no **Ambiente Nacional (AN)** da Receita Federal / SEFAZ, independentemente da UF da empresa consultante.

| Ambiente | URL do Web Service |
| :--- | :--- |
| **Produção** | `https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx` <br> *(ou `https://nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx`)* |
| **Homologação** | `https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx` |

### 2.3 Especificações SOAP e Protocolo
* **Protocolo de Rede:** HTTPS sobre TLS 1.2 obrigatório (cifras seguras aceitas pela SEFAZ).
* **Autenticação:** mTLS (Mutual Transport Layer Security) com Certificado Digital padrão ICP-Brasil (e-CNPJ ou e-CPF do autor).
* **Versão SOAP:** SOAP 1.2 (`http://www.w3.org/2003/05/soap-envelope`).
* **Content-Type HTTP:**
  ```http
  Content-Type: application/soap+xml; charset=utf-8; action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse"
  ```
* **Namespace WSDL:** `http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe`
* **Método WSDL:** `nfeDistDFeInteresse`
* **Nome do Elemento de Mensagem:** `nfeDadosMsg`

### 2.4 Estrutura do XML de Requisição (`distDFeInt`)
O XML enviado no corpo SOAP deve respeitar o schema `distDFeInt_v1.01.xsd` com namespace `http://www.portalfiscal.inf.br/nfe` e atributo `versao="1.01"`.

```xml
<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                 xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
                 xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
      <nfeDadosMsg>
        <distDFeInt versao="1.01" xmlns="http://www.portalfiscal.inf.br/nfe">
          <tpAmb>1</tpAmb> <!-- 1=Produção, 2=Homologação -->
          <cUFAutor>35</cUFAutor> <!-- Código IBGE da UF do autor (ex: 35=SP, 52=GO, etc.) -->
          <CNPJ>12345678000195</CNPJ> <!-- CNPJ consultante (somente dígitos) -->
          
          <!-- Opção A: Consulta progressiva por NSU -->
          <distNSU>
            <ultNSU>000000000000000</ultNSU>
          </distNSU>

          <!-- Opção B: Consulta pontual por NSU específico -->
          <!--
          <consNSU>
            <NSU>000000000000123</NSU>
          </consNSU>
          -->

          <!-- Opção C: Consulta pontual por Chave de Acesso -->
          <!--
          <consChNFe>
            <chNFe>35231012345678000195550010000123451000123456</chNFe>
          </consChNFe>
          -->
        </distDFeInt>
      </nfeDadosMsg>
    </nfeDistDFeInteresse>
  </soap12:Body>
</soap12:Envelope>
```

### 2.5 Estrutura da Resposta da SEFAZ (`retDistDFeInt`)
A resposta retorna no elemento `<retDistDFeInt versao="1.01">` com os seguintes campos:
* `<tpAmb>`: Ambiente processador (1=Produção, 2=Homologação).
* `<verAplic>`: Versão da aplicação do Web Service SEFAZ.
* `<cStat>`: Código de status da resposta (ex.: 138, 137, 656).
* `<xMotivo>`: Descrição literal do resultado do processamento.
* `<dhResp>`: Data e hora UTC do processamento na SEFAZ.
* `<ultNSU>`: Maior NSU incluído no lote retornado (15 dígitos).
* `<maxNSU>`: Maior NSU gerado na SEFAZ até o momento para o consultante (15 dígitos).
* `<loteDistDFeInt>`: Contém até **50 nós** `<docZip NSU="..." schema="...">` por requisição.
  * O conteúdo de `<docZip>` é o XML do documento ou evento **comprimido em GZIP e codificado em Base64**.

### 2.6 Schemas Contidos no `docZip` (NF-e)
1. **`resNFe_v1.01.xsd` (Resumo da NF-e):**
   * Retornado antes da Manifestação do Destinatário.
   * Contém apenas metadados básicos: Chave de acesso, CNPJ/CPF emitente, Razão Social emitente, Inscrição Estadual, Data de Emissão, Tipo da NF-e (Entrada/Saída), Valor Total, Digest Value, Data de Recebimento e Situação da NF-e (1=Autorizada, 2=Cancelada, 3=Denegada).
   * **NÃO contém** itens (`det`), alíquotas, tributos, transportadora ou cobrança.
2. **`procNFe_v4.00.xsd` (NF-e Completa Autorizada):**
   * Disponibilizado após Manifestação do Destinatário (ex.: Ciência da Emissão) ou se o consultante for o emitente/transportador.
   * Contém o XML integral (`nfeProc`) com o elemento `<NFe>` assinado e o protocolo de autorização `<protNFe>`.
3. **`resEvento_v1.01.xsd` (Resumo de Evento):**
   * Metadados do evento (ex.: cancelamento, carta de correção, manifestação).
4. **`procEventoNFe_v1.00.xsd` (Evento Completo):**
   * XML integral do evento processado (`procEventoNFe`).

---

## 3. CTeDistribuicaoDFe (Distribuição de DF-e de Interesse dos Atores do CT-e)

### 3.1 Base Normativa
* **Nota Técnica 2015.002:** Institui o Web Service `CTeDistribuicaoDFe` para permitir que emitentes, tomadores, remetentes, destinatários, expedidores e recebedores acessem seus CT-e.
* **MOC CT-e:** Manual de Padrões Técnicos do Conhecimento de Transporte Eletrônico.

### 3.2 Endpoints Oficiais (Ambiente Nacional / SVRS)
| Ambiente | URL do Web Service |
| :--- | :--- |
| **Produção** | `https://www1.cte.fazenda.gov.br/CTeDistribuicaoDFe/CTeDistribuicaoDFe.asmx` |
| **Homologação** | `https://hom1.cte.fazenda.gov.br/CTeDistribuicaoDFe/CTeDistribuicaoDFe.asmx` |

### 3.3 Especificações SOAP e Protocolo
* **Protocolo:** HTTPS / TLS 1.2 com mTLS ICP-Brasil.
* **Versão SOAP:** SOAP 1.2 (`http://www.w3.org/2003/05/soap-envelope`).
* **Content-Type HTTP:**
  ```http
  Content-Type: application/soap+xml; charset=utf-8; action="http://www.portalfiscal.inf.br/cte/wsdl/CTeDistribuicaoDFe/cteDistDFeInteresse"
  ```
* **Namespace WSDL:** `http://www.portalfiscal.inf.br/cte/wsdl/CTeDistribuicaoDFe`
* **Método WSDL:** `cteDistDFeInteresse`
* **cUFAutor:** `91` (Ambiente Nacional).
* **Versão do XML:** `1.00` (`distDFeInt_v1.00.xsd`, namespace `http://www.portalfiscal.inf.br/cte`).

### 3.4 Schemas Contidos no `docZip` (CT-e)
1. **`procCTe_v3.00.xsd` / `procCTe_v4.00.xsd`:** CT-e completo autorizado (`cteProc`).
2. **`resCTe_v1.00.xsd`:** Resumo de CT-e.
3. **`procEventoCTe_v1.00.xsd`:** Evento completo processado.

---

## 4. Regras Críticas de NSU e Limites de Consumo

### 4.1 Definição do NSU (Número Sequencial Único)
* O NSU é um sequencial numérico de **15 dígitos decimais**, alinhado à esquerda com zeros (`000000000000001` a `999999999999999`).
* É atribuído pela SEFAZ individualmente por ator (CNPJ) e por tipo de serviço (`NFE` e `CTE` possuem controles de NSU 100% independentes!).

### 4.2 Fluxo de Consulta e Estados de NSU
1. **Primeira Consulta:**
   * `ultNSU = "000000000000000"` (15 zeros).
   * A SEFAZ retorna os primeiros documentos disponíveis (até 50) e informa `ultNSU` (último do lote retornado) e `maxNSU` (maior já existente na SEFAZ).
2. **Consultas Subsequentes:**
   * Utilizar como parâmetro de entrada o `ultNSU` confirmado na resposta anterior.
   * Enquanto `ultNSU < maxNSU`, há mais documentos a receber.
3. **Sincronização Completa:**
   * Quando `ultNSU == maxNSU`, todos os documentos do ator foram recebidos.
   * Se for efetuada nova consulta neste estado, a SEFAZ retornará `cStat = 137` ("Nenhum documento localizado").

### 4.3 Tabela de Códigos de Status (cStat) Relevantes
| cStat | Descrição SEFAZ | Comportamento Obrigatório da Aplicação |
| :---: | :--- | :--- |
| **138** | Documento(s) localizado(s) para o interessado | Descompactar `docZip` (Base64 + GZip), parsear XMLs, persistir documentos no SQLite e salvar arquivos no filesystem. Somente após a persistência bem-sucedida, atualizar `last_nsu = ultNSU`. |
| **137** | Nenhum documento localizado para o interessado | Sincronização em dia. **NÃO consultar novamente de imediato**. Atualizar `last_query_at` e manter `last_nsu`. Respeitar intervalo mínimo de 1 hora antes de nova consulta automática. |
| **656** | Consumo Indevido | O cliente violou as regras de requisição (consultou repetidas vezes com `ultNSU == maxNSU` ou em intervalo inferior ao permitido). O IP/CNPJ foi temporariamente bloqueado pela SEFAZ por **1 hora**. A aplicação DEVE bloquear novas tentativas por 60 minutos e alertar o usuário com clareza. |
| **215** | Falha no schema XML | Erro de formatação do XML enviado. Investigar estrutura do payload. |
| **280..286** | Falha de Certificado Digital | Certificado inválido, revogado, expirado ou cadeia ICP-Brasil incompleta. |

### 4.4 Princípios de Idempotência e Transacionalidade
* **Nunca avançar NSU antes do commit:** O `last_nsu` no banco de dados só pode ser incrementado dentro da mesma transação atômica que grava os metadados dos documentos e confirma a gravação dos arquivos no filesystem.
* **Falha durante a consulta ou gravação:** Em caso de erro de rede, timeout ou erro de I/O, a transação sofre rollback. O `last_nsu` permanece intacto, permitindo nova tentativa idêntica sem perder nenhum documento.
* **Deduplicação de documentos:** A chave de acesso (`access_key`, 44 dígitos) é índice único (`UNIQUE`). Se um documento já existir no banco (por exemplo, ao reprocessar um NSU ou receber atualização de evento), os dados são atualizados com segurança (`UPSERT`), sem duplicar registros ou arquivos.

---

## 5. Certificados Digitais ICP-Brasil no Ambiente Windows

### 5.1 O Desafio Técnico com Node.js
* No Node.js convencional (`https.request` / `tls.connect`), a autenticação mTLS exige `key` (chave privada) e `cert` (certificado) em formato PEM/Buffer.
* Em ambiente corporativo Windows, os certificados ICP-Brasil (especialmente A3 em token/smartcard, e A1 instalados no Windows Certificate Store via CNG/CryptoAPI) **não permitem a extração da chave privada**. A chave privada reside no hardware criptográfico ou é protegida pelo sistema operacional.
* **Proibição Estrita:** O sistema não deve exigir arquivo PFX/P12 com senha a cada uso, nem deve tentar quebrar proteções de chaves privadas.

### 5.2 Solução Arquitetural: Windows Store Bridge Nativo
A plataforma Windows (10 e 11) dispõe nativamente do PowerShell 5.1 com .NET Framework 4.8 / CLR 4.0. O subsistema criptográfico do .NET (`System.Security.Cryptography.X509Certificates` e `System.Net.HttpWebRequest` / `HttpClient`) integra-se de forma direta e oficial à infraestrutura do Windows:
1. **Listagem e Leitura de Metadados:**
   * Acesso à store `Cert:\CurrentUser\My` (e `Cert:\LocalMachine\My`).
   * Extração segura de propriedades públicas: `Thumbprint`, `Subject`, `Issuer`, `NotBefore`, `NotAfter`, `HasPrivateKey`.
   * Parsing do `Subject` para identificação de CNPJ/CPF (formato padrão ICP-Brasil: `RAZÃO SOCIAL:CNPJ` ou `NOME:CPF`).
2. **Execução de Requisições mTLS com SEFAZ:**
   * O .NET localiza o certificado pelo `Thumbprint` diretamente na store do Windows.
   * Associa o `X509Certificate2` ao `ClientCertificates` da requisição HTTP TLS 1.2.
   * O Windows Schannel gerencia o handshake TLS diretamente com a chave privada no CNG/CSP do Windows ou no driver do token A3 (acionando a janela padrão de PIN do Windows quando necessário).
   * A chave privada **nunca** sai da proteção do hardware/OS e nunca é lida pelo Node.js.
3. **Design Pattern `ICertificateProvider`:**
   * Abstração desacoplada para permitir múltiplos provedores:
     * `WindowsStoreCertificateProvider`: Provedor padrão para Windows (A1 e A3 instalados).
     * `MockCertificateProvider`: Provedor para testes automatizados sem certificado real.
     * `PfxCertificateProvider` *(extensão futura)*: Provedor para arquivo local se desejado.

---

## 6. Documentos Auxiliares (DANFE e DACTE / PDF)

### 6.1 Fato Técnico Fundamental sobre a SEFAZ
* **A SEFAZ NÃO disponibiliza nem gera arquivos PDF/DANFE/DACTE.**
* Os Web Services de distribuição DFe fornecem **estritamente arquivos XML**.

### 6.2 Estratégia de Geração e Disponibilização de PDF
1. **Documento com XML Completo (`procNFe` ou `procCTe`):**
   * O sistema gera o DANFE / DACTE em PDF **localmente** a partir do XML completo armazenado.
   * **Implementação Técnica:** No ecossistema Electron, o motor Chromium interno dispõe da API `webContents.printToPDF()`. Utiliza-se um template HTML/CSS perfeitamente estilizado de acordo com o Manual do DANFE da Receita Federal (incluindo código de barras padrão Code-128 para a chave de 44 dígitos gerado via canvas/svg).
   * Isso proporciona precisão visual de 100%, suporte a paginação automática, geração rápida e zero dependência de APIs externas de terceiros ou custos de licenciamento.
2. **Documento Apenas com Resumo (`resNFe` ou `resCTe`):**
   * O resumo **não possui** itens, tributos detalhados ou base de cálculo. O DANFE regulamentar não pode ser emitido sem os itens da nota.
   * Estado do documento: `XML_DISPONIVEL` (resumo) e `PDF_INDISPONIVEL`.
   * A interface informa claramente que o documento é um Resumo e aguarda manifestação/distribuição do XML completo para viabilizar o DANFE.

---

## 7. Diferença Crítica: Consulta SEFAZ vs. Busca Local por Período

* **Busca Local:**
  * O usuário informa período (Data Inicial a Data Final), tipo de documento, emitente, chave de acesso, etc.
  * O filtro atua **exclusivamente sobre o banco de dados SQLite local**.
  * É instantâneo e não consome recursos nem franquia da SEFAZ.
* **Consulta SEFAZ:**
  * O serviço SEFAZ `NFeDistribuicaoDFe` **não aceita parâmetros de data ou período**. Ele opera estritamente pelo ponteiro de eventos `ultNSU`.
  * Quando o usuário solicita "Consultar SEFAZ", o sistema consulta os novos eventos fiscais atribuídos à empresa a partir do `last_nsu` persistido.
  * Os novos documentos recebidos são gravados no banco e passam a figurar imediatamente nos filtros locais por período.

---

## 8. Arquitetura de Armazenamento Físico e Sanitização

### 8.1 Separação SQLite vs. Filesystem
* **SQLite:** Armazena metadados estruturados, status de sincronização, NSUs, histórico e índices de busca rápida.
* **Filesystem:** Armazena os arquivos físicos originais (`.xml` e `.pdf`), organizados em estrutura de diretórios previsível e configurável pelo usuário.

### 8.2 Estrutura de Diretórios Padronizada
```text
<Pasta_Base_Documentos>/
    <CNPJ_Empresa>_<Razao_Social_Sanitizada>/
        NFe/
            <Ano>/
                <Mes>/
                    <ChaveDeAcesso>.xml
                    <ChaveDeAcesso>.pdf
        CTe/
            <Ano>/
                <Mes>/
                    <ChaveDeAcesso>.xml
                    <ChaveDeAcesso>.pdf
```

### 8.3 Sanitização de Caminhos e Segurança
* Prevenção de Path Traversal: Proibição de sequências como `../`, `..\`, caracteres especiais de sistema (`:`, `*`, `?`, `"`, `<`, `>`, `|`) e caminhos absolutos arbitrários.
* Nomes de arquivos padronizados pela **Chave de Acesso (44 dígitos numéricos)**, eliminando qualquer risco de colisão ou injeção em nomes de arquivos.
* Todas as operações de leitura e escrita de arquivos são validadas contra a pasta raiz configurada.

---

## 9. Conclusão da Pesquisa e Próximos Passos
Com as especificações normativas validadas, os endpoints comprovados, o comportamento de NSU mapeado e a viabilidade do mTLS via Windows Store confirmada na máquina do usuário, a base técnica está estabelecida para a elaboração do Plano de Implementação e execução da Fase 1.
