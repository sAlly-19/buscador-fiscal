import { ICertificateProvider, SoapExecutionOptions, SoapExecutionResult } from './ICertificateProvider';
import { CertificateInfo } from '../domain/types';

export class MockCertificateProvider implements ICertificateProvider {
  private mockCerts: CertificateInfo[] = [
    {
      subject: 'CN=EMPRESA DE TESTE LTDA:41777943000102, OU=Certificado PJ A1, O=ICP-Brasil, C=BR',
      issuer: 'CN=AC CERTIFICA MINAS v5, O=ICP-Brasil, C=BR',
      serial_number: '1234567890ABCDEF',
      thumbprint: 'E22923C34166FC304A236F6EECF2CB0F6F0AE0BF',
      valid_from: '2025-01-01T00:00:00.000Z',
      valid_to: '2027-01-01T00:00:00.000Z',
      provider: 'mock',
      has_private_key: true,
      is_expired: false,
      extracted_cnpj: '41777943000102',
    },
    {
      subject: 'CN=EMPRESA EXPIRADA S/A:37305384000160, OU=Certificado PJ A1, O=ICP-Brasil, C=BR',
      issuer: 'CN=AC SOLUTI Multipla v5, O=ICP-Brasil, C=BR',
      serial_number: '9876543210FEDCBA',
      thumbprint: '6472ACFB067F55B4670C23D562269B3EEE736DC9',
      valid_from: '2023-01-01T00:00:00.000Z',
      valid_to: '2024-01-01T00:00:00.000Z',
      provider: 'mock',
      has_private_key: true,
      is_expired: true,
      extracted_cnpj: '37305384000160',
    }
  ];

  public async listCertificates(): Promise<CertificateInfo[]> {
    return this.mockCerts;
  }

  public async getCertificate(thumbprint: string): Promise<CertificateInfo | null> {
    const cleanThumb = thumbprint.toUpperCase();
    return this.mockCerts.find(c => c.thumbprint.toUpperCase() === cleanThumb) || null;
  }

  public async executeSoapRequest(_options: SoapExecutionOptions): Promise<SoapExecutionResult> {
    // Retorna resposta mockada com sucesso
    return {
      statusCode: 200,
      responseBody: `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body><retDistDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01"><cStat>137</cStat><xMotivo>Nenhum documento localizado</xMotivo></retDistDFeInt></soap:Body></soap:Envelope>`,
    };
  }
}
