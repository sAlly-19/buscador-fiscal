import { IFiscalDistributionProvider, DistributeOptions } from './IFiscalDistributionProvider';
import { ICertificateProvider } from '../../certificates/ICertificateProvider';
import { SefazRawResponse } from '../types';
import { getNFeEndpoint, getCTeEndpoint } from '../endpoints';
import { EnvelopeBuilder } from '../soap/EnvelopeBuilder';
import { NFeParser } from '../nfe/NFeParser';
import { CTeParser } from '../cte/CTeParser';

export class SefazDistributionProvider implements IFiscalDistributionProvider {
  private nfeParser: NFeParser;
  private cteParser: CTeParser;

  constructor(private certProvider: ICertificateProvider) {
    this.nfeParser = new NFeParser();
    this.cteParser = new CTeParser();
  }

  public async distributeNFe(options: DistributeOptions): Promise<SefazRawResponse> {
    const endpoint = getNFeEndpoint(options.environment);
    const envelope = EnvelopeBuilder.buildNFeDistDFeEnvelope({
      tpAmb: options.environment === 'production' ? '1' : '2',
      cUFAutor: options.cUFAutor,
      cnpj: options.cnpj,
      ultNSU: options.ultNSU,
    });

    const result = await this.certProvider.executeSoapRequest({
      url: endpoint.url,
      soapAction: endpoint.action,
      soapEnvelope: envelope,
      thumbprint: options.thumbprint,
      timeoutSec: 60,
      signal: options.signal,
    });

    if (result.statusCode !== 200 || !result.responseBody) {
      throw new Error(`Falha de comunicação com a SEFAZ (HTTP ${result.statusCode}): ${result.error || result.responseBody}`);
    }

    return this.nfeParser.parseDistDFeResponse(result.responseBody);
  }

  public async distributeCTe(options: DistributeOptions): Promise<SefazRawResponse> {
    const endpoint = getCTeEndpoint(options.environment);
    const envelope = EnvelopeBuilder.buildCTeDistDFeEnvelope({
      tpAmb: options.environment === 'production' ? '1' : '2',
      cUFAutor: options.cUFAutor,
      cnpj: options.cnpj,
      ultNSU: options.ultNSU,
    });

    const result = await this.certProvider.executeSoapRequest({
      url: endpoint.url,
      soapAction: endpoint.action,
      soapEnvelope: envelope,
      thumbprint: options.thumbprint,
      timeoutSec: 60,
      signal: options.signal,
    });

    if (result.statusCode !== 200 || !result.responseBody) {
      throw new Error(`Falha de comunicação com a SEFAZ CT-e (HTTP ${result.statusCode}): ${result.error || result.responseBody}`);
    }

    return this.cteParser.parseDistDFeResponse(result.responseBody);
  }
}
