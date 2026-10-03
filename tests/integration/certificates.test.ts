import { describe, it, expect } from 'vitest';
import path from 'path';
import { WindowsStoreCertificateProvider } from '../../packages/certificates/WindowsStoreCertificateProvider';
import { MockCertificateProvider } from '../../packages/certificates/MockCertificateProvider';

describe('Provedores de Certificados Digitais (Fase 5)', () => {
  describe('MockCertificateProvider', () => {
    const mock = new MockCertificateProvider();

    it('deve listar certificados mockados e identificar expiração', async () => {
      const list = await mock.listCertificates();
      expect(list.length).toBe(2);

      const validCert = list.find(c => c.extracted_cnpj === '41777943000102');
      expect(validCert).toBeDefined();
      expect(validCert?.is_expired).toBe(false);
      expect(validCert?.has_private_key).toBe(true);

      const expiredCert = list.find(c => c.extracted_cnpj === '37305384000160');
      expect(expiredCert).toBeDefined();
      expect(expiredCert?.is_expired).toBe(true);
    });

    it('deve buscar certificado pelo thumbprint', async () => {
      const cert = await mock.getCertificate('E22923C34166FC304A236F6EECF2CB0F6F0AE0BF');
      expect(cert).not.toBeNull();
      expect(cert?.extracted_cnpj).toBe('41777943000102');
    });
  });

  describe('WindowsStoreCertificateProvider (Ambiente Real Windows)', () => {
    const scriptPath = path.resolve(__dirname, '../../packages/certificates/windows-bridge.ps1');
    const winProvider = new WindowsStoreCertificateProvider(scriptPath);

    it('deve listar certificados reais instalados na máquina sem erro', async () => {
      const list = await winProvider.listCertificates();
      expect(Array.isArray(list)).toBe(true);
      // Confirma que os certificados têm metadados públicos e NÃO têm chaves privadas expostas
      for (const cert of list) {
        expect(cert.thumbprint).toBeDefined();
        expect(cert.subject).toBeDefined();
        expect(cert.valid_from).toBeDefined();
        expect(cert.valid_to).toBeDefined();
        expect(cert.provider).toBe('windows_store');
        // Garante que nenhuma propriedade de senha ou chave secreta existe
        expect((cert as any).privateKey).toBeUndefined();
        expect((cert as any).password).toBeUndefined();
      }
    });
  });
});
