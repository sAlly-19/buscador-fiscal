import { IFiscalDistributionProvider, DistributeOptions } from './IFiscalDistributionProvider';
import { SefazRawResponse, DocZipItem } from '../types';
import { formatNSU, compareNSU } from '../../domain/nsu';

export class MockFiscalDistributionProvider implements IFiscalDistributionProvider {
  private shouldFailNext: boolean = false;
  private shouldRateLimitNext: boolean = false;

  public setFailNext(fail: boolean) {
    this.shouldFailNext = fail;
  }

  public setRateLimitNext(limit: boolean) {
    this.shouldRateLimitNext = limit;
  }

  public async distributeNFe(options: DistributeOptions): Promise<SefazRawResponse> {
    if (this.shouldFailNext) {
      this.shouldFailNext = false;
      throw new Error('Falha de conexão simulada com o Web Service da SEFAZ.');
    }

    if (this.shouldRateLimitNext) {
      this.shouldRateLimitNext = false;
      return {
        tpAmb: '2',
        verAplic: 'MOCK_1.0',
        cStat: 656,
        xMotivo: 'Rejeicao: Consumo Indevido (deve aguardar 1 hora)',
        dhResp: new Date().toISOString(),
        ultNSU: options.ultNSU,
        maxNSU: options.ultNSU,
        docs: [],
      };
    }

    const currentNSU = formatNSU(options.ultNSU);

    // Cenário 1: Primeira consulta a partir do zero
    if (currentNSU === '000000000000000') {
      const docs: DocZipItem[] = [
        {
          nsu: '000000000000001',
          schema: 'resNFe_v1.01.xsd',
          xmlContent: `<resNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01"><chNFe>35260941777943000102550010000001011000000101</chNFe><CNPJ>12345678000190</CNPJ><xNome>Fornecedor Alpha Ltda</xNome><dhEmi>2026-09-10T14:30:00-03:00</dhEmi><tpNF>1</tpNF><vNF>1850.50</vNF><cSitNFe>1</cSitNFe></resNFe>`,
        },
        {
          nsu: '000000000000002',
          schema: 'procNFe_v4.00.xsd',
          xmlContent: `<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><NFe><infNFe Id="NFe35260941777943000102550010000001021000000102" versao="4.00"><ide><cUF>35</cUF><nNF>102</nNF><serie>1</serie><dhEmi>2026-09-15T09:00:00-03:00</dhEmi><tpNF>1</tpNF></ide><emit><CNPJ>98765432000110</CNPJ><xNome>Distribuidora Beta S/A</xNome></emit><dest><CNPJ>${options.cnpj}</CNPJ><xNome>Empresa Destinataria</xNome></dest><total><ICMSTot><vNF>4500.00</vNF></ICMSTot></total></infNFe></NFe><protNFe versao="4.00"><infProt><chNFe>35260941777943000102550010000001021000000102</chNFe><dhRecbto>2026-09-15T09:05:00-03:00</dhRecbto><nProt>135260000123456</nProt><cStat>100</cStat></infProt></protNFe></nfeProc>`,
        }
      ];

      return {
        tpAmb: '2',
        verAplic: 'MOCK_1.0',
        cStat: 138,
        xMotivo: 'Documento(s) localizado(s) para o interessado',
        dhResp: new Date().toISOString(),
        ultNSU: '000000000000002',
        maxNSU: '000000000000004',
        docs,
      };
    }

    // Cenário 2: Consulta subsequente (segundo lote até o fim)
    if (compareNSU(currentNSU, '000000000000002') === 0) {
      const docs: DocZipItem[] = [
        {
          nsu: '000000000000003',
          schema: 'procNFe_v4.00.xsd',
          xmlContent: `<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><NFe><infNFe Id="NFe35260941777943000102550010000001031000000103" versao="4.00"><ide><cUF>35</cUF><nNF>103</nNF><serie>1</serie><dhEmi>2026-09-22T16:00:00-03:00</dhEmi><tpNF>1</tpNF></ide><emit><CNPJ>55667788000199</emit><xNome>Comercial Gama Eireli</xNome></emit><dest><CNPJ>${options.cnpj}</CNPJ><xNome>Empresa Destinataria</xNome></dest><total><ICMSTot><vNF>920.00</vNF></ICMSTot></total></infNFe></NFe><protNFe versao="4.00"><infProt><chNFe>35260941777943000102550010000001031000000103</chNFe><dhRecbto>2026-09-22T16:02:00-03:00</dhRecbto><nProt>135260000123457</nProt><cStat>100</cStat></infProt></protNFe></nfeProc>`,
        }
      ];

      return {
        tpAmb: '2',
        verAplic: 'MOCK_1.0',
        cStat: 138,
        xMotivo: 'Documento(s) localizado(s) para o interessado',
        dhResp: new Date().toISOString(),
        ultNSU: '000000000000004',
        maxNSU: '000000000000004',
        docs,
      };
    }

    // Cenário 3: Sincronização completa (nenhum novo documento)
    return {
      tpAmb: '2',
      verAplic: 'MOCK_1.0',
      cStat: 137,
      xMotivo: 'Nenhum documento localizado para o interessado',
      dhResp: new Date().toISOString(),
      ultNSU: currentNSU,
      maxNSU: currentNSU,
      docs: [],
    };
  }

  public async distributeCTe(options: DistributeOptions): Promise<SefazRawResponse> {
    const currentNSU = formatNSU(options.ultNSU);

    if (currentNSU === '000000000000000') {
      const docs: DocZipItem[] = [
        {
          nsu: '000000000000001',
          schema: 'procCTe_v3.00.xsd',
          xmlContent: `<cteProc xmlns="http://www.portalfiscal.inf.br/cte" versao="3.00"><CTe><infCte Id="CTe35260941777943000102570010000005011000000501" versao="3.00"><ide><cUF>35</cUF><nCT>501</nCT><serie>1</serie><dhEmi>2026-09-18T11:20:00-03:00</dhEmi></ide><emit><CNPJ>11222333000144</CNPJ><xNome>Transportadora Veloz Ltda</xNome></emit><dest><CNPJ>${options.cnpj}</CNPJ><xNome>Destinatario CTe</xNome></dest><vPrest><vTPrest>750.00</vTPrest><vRec>750.00</vRec></vPrest></infCte></CTe><protCTe versao="3.00"><infProt><chCTe>35260941777943000102570010000005011000000501</chCTe><cStat>100</cStat></infProt></protCTe></cteProc>`,
        }
      ];

      return {
        tpAmb: '2',
        verAplic: 'MOCK_CTE_1.0',
        cStat: 138,
        xMotivo: 'Documento(s) localizado(s) para o interessado',
        dhResp: new Date().toISOString(),
        ultNSU: '000000000000001',
        maxNSU: '000000000000001',
        docs,
      };
    }

    return {
      tpAmb: '2',
      verAplic: 'MOCK_CTE_1.0',
      cStat: 137,
      xMotivo: 'Nenhum documento localizado para o interessado',
      dhResp: new Date().toISOString(),
      ultNSU: currentNSU,
      maxNSU: currentNSU,
      docs: [],
    };
  }
}
