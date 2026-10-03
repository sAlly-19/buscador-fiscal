import { formatNSU } from '../../domain/nsu';
import { sanitizeCNPJ } from '../../domain/cnpj';

export interface NFeDistEnvelopeOptions {
  tpAmb: '1' | '2';
  cUFAutor?: string;
  cnpj: string;
  ultNSU: string;
}

export interface CTeDistEnvelopeOptions {
  tpAmb: '1' | '2';
  cnpj: string;
  ultNSU: string;
}

export class EnvelopeBuilder {
  /**
   * Constrói o envelope SOAP 1.2 oficial para NFeDistribuicaoDFe
   */
  public static buildNFeDistDFeEnvelope(options: NFeDistEnvelopeOptions): string {
    const cleanCNPJ = sanitizeCNPJ(options.cnpj);
    const nsu = formatNSU(options.ultNSU);
    const cUF = options.cUFAutor || '91';

    return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
      <nfeDadosMsg>
        <distDFeInt versao="1.01" xmlns="http://www.portalfiscal.inf.br/nfe">
          <tpAmb>${options.tpAmb}</tpAmb>
          <cUFAutor>${cUF}</cUFAutor>
          <CNPJ>${cleanCNPJ}</CNPJ>
          <distNSU>
            <ultNSU>${nsu}</ultNSU>
          </distNSU>
        </distDFeInt>
      </nfeDadosMsg>
    </nfeDistDFeInteresse>
  </soap12:Body>
</soap12:Envelope>`;
  }

  /**
   * Constrói o envelope SOAP 1.2 oficial para CTeDistribuicaoDFe
   */
  public static buildCTeDistDFeEnvelope(options: CTeDistEnvelopeOptions): string {
    const cleanCNPJ = sanitizeCNPJ(options.cnpj);
    const nsu = formatNSU(options.ultNSU);

    return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <cteDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/cte/wsdl/CTeDistribuicaoDFe">
      <cteDadosMsg>
        <distDFeInt versao="1.00" xmlns="http://www.portalfiscal.inf.br/cte">
          <tpAmb>${options.tpAmb}</tpAmb>
          <cUFAutor>91</cUFAutor>
          <CNPJ>${cleanCNPJ}</CNPJ>
          <distNSU>
            <ultNSU>${nsu}</ultNSU>
          </distNSU>
        </distDFeInt>
      </cteDadosMsg>
    </cteDistDFeInteresse>
  </soap12:Body>
</soap12:Envelope>`;
  }
}
