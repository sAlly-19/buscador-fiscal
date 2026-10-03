# Certificados Digitais ICP-Brasil no Ambiente Windows

**Documento:** `docs/CERTIFICATES.md`  
**Data:** 03 de Outubro de 2026  

---

## 1. Princípio Fundamental de Segurança

O aplicativo adota a seguinte política estrita de segurança criptográfica:
1. **Nunca armazena senhas ou PINs.**
2. **Nunca grava ou copia chaves privadas para o banco de dados.**
3. **Não exige que o usuário localize arquivos `.pfx`/`.p12` toda vez.**
4. **Utiliza o repositório nativo de certificados do Windows (`Cert:\CurrentUser\My` e `Cert:\LocalMachine\My`).**

---

## 2. Como Funciona a Integração no Windows

### Certificados A1 e A3
* **Certificado A1 (Instalado no Windows):** Quando o usuário instala o certificado A1 no Windows pelo assistente padrão (`certmgr.msc`), a chave privada é gerenciada pelo CSP (Cryptographic Service Provider) ou KSP (Key Storage Provider - CNG) do Windows.
* **Certificado A3 (Cartão Inteligente ou Token USB):** A chave privada permanece fisicamente dentro do chip do dispositivo de hardware.

### O Mecanismo Bridge PowerShell / .NET
O Node.js convencional não acessa chaves privadas protegidas pelo CryptoAPI/CNG do Windows. Para resolver isso com robustez corporativa, o sistema utiliza o script `packages/certificates/windows-bridge.ps1`:
1. **Listagem:** Executa `Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.HasPrivateKey }`. Extrai metadados públicos:
   * Subject (Razão Social / Nome do Titular)
   * CNPJ ou CPF (extraído da extensão ou do CN)
   * Emissor (Autoridade Certificadora ICP-Brasil)
   * Data de Início e Expiração
   * Thumbprint (impressão digital SHA-1)
2. **Execução de Requisições mTLS:**
   * Quando uma chamada SOAP é disparada, o script localiza o certificado pelo `Thumbprint` no repositório do Windows:
     ```powershell
     $cert = Get-Item -Path "Cert:\CurrentUser\My\$Thumbprint"
     ```
   * Instancia uma requisição `HttpWebRequest` com `SecurityProtocol = Tls12` e anexa o certificado:
     ```powershell
     $request.ClientCertificates.Add($cert)
     ```
   * O handshake mTLS TLS 1.2 é negociado pelo próprio subsistema de segurança Schannel do Windows. Se for um cartão/token A3 que exija PIN, o próprio driver nativo do dispositivo exibe a janela padrão do Windows para digitação segura do PIN.
   * A chave privada **nunca** sai do hardware ou da proteção do sistema operacional.

---

## 3. Arquitetura da Interface `ICertificateProvider`

```typescript
export interface ICertificateProvider {
  listCertificates(): Promise<CertificateInfo[]>;
  getCertificate(thumbprint: string): Promise<CertificateInfo | null>;
  executeSoapRequest(options: SoapExecutionOptions): Promise<SoapExecutionResult>;
}
```

* **`WindowsStoreCertificateProvider`:** Provedor em produção para Windows.
* **`MockCertificateProvider`:** Provedor para testes unitários e de integração, garantindo que a suíte de testes rode mesmo sem cartões físicos conectados.
