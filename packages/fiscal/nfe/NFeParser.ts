import { XMLParser } from 'fast-xml-parser';
import { decompressDocZip } from '../utils/compression';
import { SefazRawResponse, DocZipItem, ParsedFiscalDocumentInfo } from '../types';
import { formatNSU } from '../../domain/nsu';
import { sanitizeAccessKey, parseAccessKey } from '../../domain/access-key';

export class NFeParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: true,
      parseTagValue: false,
    });
  }

  /**
   * Faz o parse do envelope SOAP de retorno retDistDFeInt da SEFAZ
   */
  public parseDistDFeResponse(soapXml: string): SefazRawResponse {
    const parsed = this.parser.parse(soapXml);

    // Navega pelo envelope SOAP até a tag retDistDFeInt
    let ret = parsed.retDistDFeInt;
    if (
      !ret &&
      parsed.Envelope?.Body?.nfeDistDFeInteresseResponse?.nfeDistDFeInteresseResult?.retDistDFeInt
    ) {
      ret =
        parsed.Envelope.Body.nfeDistDFeInteresseResponse.nfeDistDFeInteresseResult.retDistDFeInt;
    } else if (!ret && parsed.Envelope?.Body?.retDistDFeInt) {
      ret = parsed.Envelope.Body.retDistDFeInt;
    }

    if (!ret) {
      const fault = parsed.Envelope?.Body?.Fault || parsed.Fault;
      if (fault) {
        const faultCode = fault.faultcode || fault.Code?.Value || '';
        const faultString = fault.faultstring || fault.Reason?.Text || '';
        const detail =
          typeof fault.detail === 'string' ? fault.detail : JSON.stringify(fault.detail || '');
        throw new Error(
          `Falha no Web Service da SEFAZ (SOAP Fault ${faultCode}): ${faultString} ${detail}`.trim()
        );
      }
      throw new Error('Estrutura retDistDFeInt não encontrada na resposta da SEFAZ.');
    }

    const cStat = Number(ret.cStat);
    const xMotivo = String(ret.xMotivo || '');
    const ultNSU = formatNSU(ret.ultNSU || '0');
    const maxNSU = formatNSU(ret.maxNSU || '0');
    const tpAmb = String(ret.tpAmb || '1');
    const verAplic = String(ret.verAplic || '');
    const dhResp = String(ret.dhResp || new Date().toISOString());

    const docs: DocZipItem[] = [];

    if (ret.loteDistDFeInt?.docZip) {
      const rawList = Array.isArray(ret.loteDistDFeInt.docZip)
        ? ret.loteDistDFeInt.docZip
        : [ret.loteDistDFeInt.docZip];

      for (const item of rawList) {
        const nsu = formatNSU(item['@_NSU'] || '0');
        const schema = String(item['@_schema'] || '');
        const base64 = String(item['#text'] || item['#value'] || item || '');

        try {
          const xmlContent = decompressDocZip(base64);
          docs.push({ nsu, schema, xmlContent });
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          throw new Error(
            `Falha ao descompactar docZip da NF-e (NSU ${nsu}, schema ${schema || 'desconhecido'}): ${reason}`
          );
        }
      }
    }

    return {
      tpAmb,
      verAplic,
      cStat,
      xMotivo,
      dhResp,
      ultNSU,
      maxNSU,
      docs,
    };
  }

  /**
   * Normaliza um documento fiscal (resumo ou completo) extraindo metadados essenciais
   */
  public parseDocumentXml(
    xml: string,
    nsu: string,
    schema: string
  ): ParsedFiscalDocumentInfo | null {
    const parsed = this.parser.parse(xml);

    // Caso 1: NF-e Completa Autorizada (procNFe ou nfeProc)
    if (parsed.nfeProc || parsed.NFe) {
      const nfe = parsed.nfeProc?.NFe || parsed.NFe;
      const prot = parsed.nfeProc?.protNFe?.infProt;
      const infNFe = nfe?.infNFe;

      if (!infNFe) return null;

      const rawKey = prot?.chNFe || infNFe['@_Id']?.replace(/^NFe/, '');
      const access_key = sanitizeAccessKey(rawKey || '');
      if (access_key.length !== 44)
        throw new Error(`Chave de acesso de NF-e inválida no NSU ${nsu}.`);
      const keyInfo = parseAccessKey(access_key);

      const ide = infNFe.ide || {};
      const emit = infNFe.emit || {};
      const dest = infNFe.dest || {};
      const total = infNFe.total?.ICMSTot || {};

      const cStat = prot?.cStat ? Number(prot.cStat) : 100;
      let situacao: 'AUTORIZADA' | 'CANCELADA' | 'DENEGADA' = 'AUTORIZADA';
      if (cStat === 110 || cStat === 301 || cStat === 302 || cStat === 303) {
        situacao = 'DENEGADA';
      }

      const docNumber = ide.nNF
        ? String(ide.nNF)
        : keyInfo
          ? String(Number(keyInfo.numero))
          : undefined;
      const series =
        ide.serie !== undefined && ide.serie !== null && ide.serie !== ''
          ? String(ide.serie)
          : keyInfo
            ? String(Number(keyInfo.serie))
            : undefined;

      return {
        document_type: 'NFE',
        nsu: formatNSU(nsu),
        schema_type: schema || 'procNFe_v4.00.xsd',
        access_key,
        document_number: docNumber,
        series,
        issue_date: String(ide.dhEmi || ide.dEmi || ''),
        issuer_cnpj: String(emit.CNPJ || emit.CPF || ''),
        issuer_name: String(emit.xNome || ''),
        recipient_cnpj: String(dest.CNPJ || dest.CPF || ''),
        recipient_name: String(dest.xNome || ''),
        total_value: Number(total.vNF || 0),
        xml_status: 'XML_DISPONIVEL',
        pdf_status: 'PDF_INDISPONIVEL',
        situacao_fiscal: situacao,
        rawXml: xml,
      };
    }

    // Caso 2: Resumo de NF-e (resNFe)
    if (parsed.resNFe) {
      const res = parsed.resNFe;
      const access_key = sanitizeAccessKey(res.chNFe || '');
      if (access_key.length !== 44)
        throw new Error(`Chave de acesso de NF-e inválida no resumo do NSU ${nsu}.`);
      const keyInfo = parseAccessKey(access_key);

      let situacao: 'AUTORIZADA' | 'CANCELADA' | 'DENEGADA' = 'AUTORIZADA';
      const cSit = Number(res.cSitNFe);
      if (cSit === 2) situacao = 'CANCELADA';
      if (cSit === 3) situacao = 'DENEGADA';

      const docNumber = keyInfo ? String(Number(keyInfo.numero)) : undefined;
      const series = keyInfo ? String(Number(keyInfo.serie)) : undefined;

      return {
        document_type: 'NFE',
        nsu: formatNSU(nsu),
        schema_type: schema || 'resNFe_v1.01.xsd',
        access_key,
        document_number: docNumber,
        series,
        issue_date: String(res.dhEmi || ''),
        issuer_cnpj: String(res.CNPJ || res.CPF || ''),
        issuer_name: String(res.xNome || ''),
        recipient_cnpj: undefined,
        recipient_name: undefined,
        total_value: Number(res.vNF || 0),
        xml_status: 'XML_DISPONIVEL',
        pdf_status: 'PDF_INDISPONIVEL', // Resumo NÃO tem dados suficientes para DANFE
        situacao_fiscal: situacao,
        rawXml: xml,
      };
    }

    // Caso 3: Evento completo ou resumo de evento (ex: cancelamento)
    if (parsed.procEventoNFe || parsed.evento || parsed.resEvento) {
      const evento = parsed.procEventoNFe?.evento || parsed.evento;
      const infEvento = evento?.infEvento || parsed.resEvento;

      if (infEvento) {
        const tpEvento = String(infEvento.tpEvento || '');
        const chNFe = sanitizeAccessKey(infEvento.chNFe || '');
        if (chNFe && chNFe.length !== 44)
          throw new Error(`Chave de acesso de NF-e inválida no evento do NSU ${nsu}.`);
        const keyInfo = parseAccessKey(chNFe);

        if (chNFe) {
          const isCancelamento = tpEvento === '110111';
          const docNumber = keyInfo ? String(Number(keyInfo.numero)) : undefined;
          const series = keyInfo ? String(Number(keyInfo.serie)) : undefined;

          return {
            document_type: 'NFE',
            nsu: formatNSU(nsu),
            schema_type:
              schema || (parsed.resEvento ? 'resEvento_v1.01.xsd' : 'procEventoNFe_v1.00.xsd'),
            access_key: chNFe,
            document_number: docNumber,
            series,
            issue_date: String(infEvento.dhEvento || ''),
            issuer_cnpj: undefined,
            issuer_name: undefined,
            recipient_cnpj: undefined,
            recipient_name: undefined,
            total_value: 0,
            xml_status: 'XML_DISPONIVEL',
            pdf_status: 'PDF_INDISPONIVEL',
            situacao_fiscal: isCancelamento ? 'CANCELADA' : 'AUTORIZADA',
            rawXml: xml,
          };
        }
      }
    }

    return null;
  }
}
