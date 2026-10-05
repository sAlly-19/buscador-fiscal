import { describe, it, expect } from 'vitest';
import { NFeParser } from '../../packages/fiscal/nfe/NFeParser';
import { CTeParser } from '../../packages/fiscal/cte/CTeParser';

describe('Parsers Fiscais (NFeParser e CTeParser)', () => {
  const nfeParser = new NFeParser();
  const cteParser = new CTeParser();

  describe('NFeParser', () => {
    it('deve extrair número e série a partir da chave de acesso no resumo (resNFe)', () => {
      // Chave: 52 2607 03673151000107 55 001 000073060 1 29116693 0
      // mod: 55, serie: 001 (1), nNF: 000073060 (73060)
      const xml = `<resNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
        <chNFe>52260703673151000107550010000730601291166930</chNFe>
        <CNPJ>03673151000107</CNPJ>
        <xNome>Posto Alpha</xNome>
        <dhEmi>2026-07-15T10:00:00-03:00</dhEmi>
        <vNF>150.00</vNF>
        <cSitNFe>1</cSitNFe>
      </resNFe>`;

      const parsed = nfeParser.parseDocumentXml(xml, '1', 'resNFe_v1.01.xsd');
      expect(parsed).not.toBeNull();
      expect(parsed?.document_number).toBe('73060');
      expect(parsed?.series).toBe('1');
      expect(parsed?.situacao_fiscal).toBe('AUTORIZADA');
      expect(parsed?.issuer_name).toBe('Posto Alpha');
      expect(parsed?.total_value).toBe(150.0);
    });

    it('deve extrair dados completos de procNFe autorizada', () => {
      const xml = `<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
        <NFe>
          <infNFe Id="NFe52260702167542000189550010001993041173601369" versao="4.00">
            <ide>
              <cUF>52</cUF>
              <serie>1</serie>
              <nNF>199304</nNF>
              <dhEmi>2026-07-21T12:40:30-03:00</dhEmi>
            </ide>
            <emit>
              <CNPJ>02167542000189</CNPJ>
              <xNome>Fornecedor de Combustível</xNome>
            </emit>
            <dest>
              <CNPJ>41777943000102</CNPJ>
              <xNome>Cliente Agro</xNome>
            </dest>
            <total>
              <ICMSTot><vNF>2331.00</vNF></ICMSTot>
            </total>
          </infNFe>
        </NFe>
        <protNFe versao="4.00">
          <infProt>
            <chNFe>52260702167542000189550010001993041173601369</chNFe>
            <cStat>100</cStat>
          </infProt>
        </protNFe>
      </nfeProc>`;

      const parsed = nfeParser.parseDocumentXml(xml, '2', 'procNFe_v4.00.xsd');
      expect(parsed).not.toBeNull();
      expect(parsed?.document_number).toBe('199304');
      expect(parsed?.series).toBe('1');
      expect(parsed?.recipient_cnpj).toBe('41777943000102');
      expect(parsed?.recipient_name).toBe('Cliente Agro');
      expect(parsed?.total_value).toBe(2331.0);
      expect(parsed?.situacao_fiscal).toBe('AUTORIZADA');
      // O parser apenas recebe XML; PDF só fica disponível após existir um arquivo físico.
      expect(parsed?.pdf_status).toBe('PDF_INDISPONIVEL');
    });

    it('deve identificar evento de cancelamento (tpEvento 110111) e marcar situacao_fiscal como CANCELADA', () => {
      const xml = `<procEventoNFe versao="1.00" xmlns="http://www.portalfiscal.inf.br/nfe">
        <evento versao="1.00">
          <infEvento Id="ID1101115226070216754200018955001000199304117360136901">
            <chNFe>52260702167542000189550010001993041173601369</chNFe>
            <dhEvento>2026-07-22T10:00:00-03:00</dhEvento>
            <tpEvento>110111</tpEvento>
            <nSeqEvento>1</nSeqEvento>
            <detEvento versao="1.00">
              <descEvento>Cancelamento</descEvento>
            </detEvento>
          </infEvento>
        </evento>
      </procEventoNFe>`;

      const parsed = nfeParser.parseDocumentXml(xml, '3', 'procEventoNFe_v1.00.xsd');
      expect(parsed).not.toBeNull();
      expect(parsed?.access_key).toBe('52260702167542000189550010001993041173601369');
      expect(parsed?.situacao_fiscal).toBe('CANCELADA');
      expect(parsed?.document_number).toBe('199304');
      expect(parsed?.series).toBe('1');
    });

    it('deve identificar resumo de evento de cancelamento (resEvento 110111)', () => {
      const xml = `<resEvento versao="1.00" xmlns="http://www.portalfiscal.inf.br/nfe">
        <chNFe>52260702167542000189550010001993041173601369</chNFe>
        <dhEvento>2026-07-22T10:00:00-03:00</dhEvento>
        <tpEvento>110111</tpEvento>
        <descEvento>Cancelamento</descEvento>
      </resEvento>`;

      const parsed = nfeParser.parseDocumentXml(xml, '4', 'resEvento_v1.01.xsd');
      expect(parsed).not.toBeNull();
      expect(parsed?.situacao_fiscal).toBe('CANCELADA');
    });

    it('não deve tratar Ciência da Operação como emitente da NF-e', () => {
      const xml = `<procEventoNFe versao="1.00" xmlns="http://www.portalfiscal.inf.br/nfe">
        <evento versao="1.00">
          <infEvento Id="ID2102105226094157377400019955002000001802100013031801">
            <CNPJ>41777943000102</CNPJ>
            <chNFe>52260941573774000199550020000018021000130318</chNFe>
            <dhEvento>2026-09-30T14:52:23-03:00</dhEvento>
            <tpEvento>210210</tpEvento>
            <detEvento versao="1.00"><descEvento>Ciencia da Operacao</descEvento></detEvento>
          </infEvento>
        </evento>
        <retEvento versao="1.00"><infEvento><xEvento>Ciencia da Operacao</xEvento></infEvento></retEvento>
      </procEventoNFe>`;

      const parsed = nfeParser.parseDocumentXml(xml, '5', 'procEventoNFe_v1.00.xsd');

      expect(parsed).not.toBeNull();
      expect(parsed?.schema_type).toBe('procEventoNFe_v1.00.xsd');
      expect(parsed?.issuer_name).toBeUndefined();
      expect(parsed?.issuer_cnpj).toBeUndefined();
    });

    it('deve lançar erro descritivo quando a SEFAZ retornar SOAP Fault', () => {
      const soapFault = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <soap:Fault>
            <faultcode>soap:Server</faultcode>
            <faultstring>Serviço Paralisado Momentaneamente</faultstring>
          </soap:Fault>
        </soap:Body>
      </soap:Envelope>`;

      expect(() => nfeParser.parseDistDFeResponse(soapFault)).toThrow(
        /Falha no Web Service da SEFAZ \(SOAP Fault soap:Server\): Serviço Paralisado Momentaneamente/
      );
    });

    it('deve rejeitar docZip corrompido sem permitir avanço silencioso do NSU', () => {
      const response = `<retDistDFeInt><tpAmb>2</tpAmb><cStat>138</cStat><xMotivo>OK</xMotivo>
        <ultNSU>1</ultNSU><maxNSU>1</maxNSU><loteDistDFeInt>
        <docZip NSU="1" schema="resNFe_v1.01.xsd">conteudo-invalido</docZip>
        </loteDistDFeInt></retDistDFeInt>`;
      expect(() => nfeParser.parseDistDFeResponse(response)).toThrow(/Falha ao descompactar docZip/);
    });
  });

  describe('CTeParser', () => {
    it('deve extrair número e série a partir da chave de acesso no resumo de CT-e (resCTe)', () => {
      // Chave CT-e mod 57: 52 2608 12345678000190 57 002 000008450 1 12345678 9
      const xml = `<resCTe xmlns="http://www.portalfiscal.inf.br/cte" versao="1.00">
        <chCTe>52260812345678000190570020000084501123456789</chCTe>
        <CNPJ>12345678000190</CNPJ>
        <xNome>Transportadora Rodoviária</xNome>
        <dhEmi>2026-08-10T08:00:00-03:00</dhEmi>
        <vTPrest>1200.00</vTPrest>
      </resCTe>`;

      const parsed = cteParser.parseDocumentXml(xml, '1', 'resCTe_v1.00.xsd');
      expect(parsed).not.toBeNull();
      expect(parsed?.document_number).toBe('8450');
      expect(parsed?.series).toBe('2');
      expect(parsed?.document_type).toBe('CTE');
      expect(parsed?.situacao_fiscal).toBe('AUTORIZADA');
    });

    it('não deve tratar a descrição de evento como emitente do CT-e', () => {
      const xml = `<procEventoCTe versao="4.00" xmlns="http://www.portalfiscal.inf.br/cte">
        <eventoCTe versao="4.00"><infEvento>
          <CNPJ>41777943000102</CNPJ>
          <chCTe>52260812345678000190570020000084501123456789</chCTe>
          <dhEvento>2026-09-30T14:52:23-03:00</dhEvento>
          <tpEvento>110110</tpEvento>
          <detEvento><descEvento>Evento de CT-e</descEvento></detEvento>
        </infEvento></eventoCTe>
      </procEventoCTe>`;

      const parsed = cteParser.parseDocumentXml(xml, '2', 'procEventoCTe_v4.00.xsd');

      expect(parsed).not.toBeNull();
      expect(parsed?.issuer_name).toBeUndefined();
      expect(parsed?.issuer_cnpj).toBeUndefined();
    });

    it('deve lançar erro descritivo quando o CT-e retornar SOAP Fault', () => {
      const soapFault = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <soap:Fault>
            <faultcode>soap:Client</faultcode>
            <faultstring>Certificado Transmissor Invalido</faultstring>
          </soap:Fault>
        </soap:Body>
      </soap:Envelope>`;

      expect(() => cteParser.parseDistDFeResponse(soapFault)).toThrow(
        /Falha no Web Service CT-e da SEFAZ \(SOAP Fault soap:Client\): Certificado Transmissor Invalido/
      );
    });
  });
});
