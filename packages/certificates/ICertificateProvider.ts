import { CertificateInfo } from '../domain/types';

export interface SoapExecutionOptions {
  url: string;
  soapAction: string;
  soapEnvelope: string;
  thumbprint: string;
  timeoutSec?: number;
}

export interface SoapExecutionResult {
  statusCode: number;
  responseBody: string;
  error?: string;
}

export interface ICertificateProvider {
  /**
   * Lista todos os certificados válidos ou instalados no ambiente
   */
  listCertificates(): Promise<CertificateInfo[]>;

  /**
   * Obtém metadados públicos de um certificado específico pelo Thumbprint
   */
  getCertificate(thumbprint: string): Promise<CertificateInfo | null>;

  /**
   * Executa uma requisição SOAP utilizando autenticação mTLS (TLS 1.2 com o certificado selecionado)
   */
  executeSoapRequest(options: SoapExecutionOptions): Promise<SoapExecutionResult>;
}
