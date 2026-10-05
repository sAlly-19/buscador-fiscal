import { XMLParser } from 'fast-xml-parser';
import { decompressDocZip } from '../utils/compression';
import { SefazRawResponse, DocZipItem, ParsedFiscalDocumentInfo } from '../types';
import { formatNSU } from '../../domain/nsu';
import { sanitizeAccessKey, parseAccessKey } from '../../domain/access-key';

export class CTeParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: true,
      parseTagValue: false,
    });
  }

  public parseDistDFeResponse(soapXml: string): SefazRawResponse {
    const parsed = this.parser.parse(soapXml);

    let ret = parsed.retDistDFeInt;
    if (
      !ret &&
      parsed.Envelope?.Body?.cteDistDFeInteresseResponse?.cteDistDFeInteresseResult?.retDistDFeInt
    ) {
      ret =
        parsed.Envelope.Body.cteDistDFeInteresseResponse.cteDistDFeInteresseResult.retDistDFeInt;
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
          `Falha no Web Service CT-e da SEFAZ (SOAP Fault ${faultCode}): ${faultString} ${detail}`.trim()
        );
      }
      throw new Error('Estrutura retDistDFeInt não encontrada na resposta do CT-e.');
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
            `Falha ao descompactar docZip do CT-e (NSU ${nsu}, schema ${schema || 'desconhecido'}): ${reason}`
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

  public parseDocumentXml(
    xml: string,
    nsu: string,
    schema: string
  ): ParsedFiscalDocumentInfo | null {
    const parsed = this.parser.parse(xml);

    // Caso 1: CT-e Completo Autorizado (cteProc ou CTe)
    if (parsed.cteProc || parsed.CTe) {
      const cte = parsed.cteProc?.CTe || parsed.CTe;
      const prot = parsed.cteProc?.protCTe?.infProt;
      const infCte = cte?.infCte;

      if (!infCte) return null;

      const rawKey = prot?.chCTe || infCte['@_Id']?.replace(/^CTe/, '');
      const access_key = sanitizeAccessKey(rawKey || '');
      if (access_key.length !== 44)
        throw new Error(`Chave de acesso de CT-e inválida no NSU ${nsu}.`);
      const keyInfo = parseAccessKey(access_key);

      const ide = infCte.ide || {};
      const emit = infCte.emit || {};
      const dest = infCte.dest || {};
      const vPrest = infCte.vPrest || {};

      const docNumber = ide.nCT
        ? String(ide.nCT)
        : keyInfo
          ? String(Number(keyInfo.numero))
          : undefined;
      const series =
        ide.serie !== undefined && ide.serie !== null && ide.serie !== ''
          ? String(ide.serie)
          : keyInfo
            ? String(Number(keyInfo.serie))
            : undefined;

      const protocolStatus = prot?.cStat ? Number(prot.cStat) : 100;
      const fiscalStatus: 'AUTORIZADA' | 'DENEGADA' = [110, 301, 302, 303].includes(protocolStatus)
        ? 'DENEGADA'
        : 'AUTORIZADA';

      return {
        document_type: 'CTE',
        nsu: formatNSU(nsu),
        schema_type: schema || 'procCTe_v3.00.xsd',
        access_key,
        document_number: docNumber,
        series,
        issue_date: String(ide.dhEmi || ''),
        issuer_cnpj: String(emit.CNPJ || emit.CPF || ''),
        issuer_name: String(emit.xNome || ''),
        recipient_cnpj: String(dest.CNPJ || dest.CPF || ''),
        recipient_name: String(dest.xNome || ''),
        total_value: Number(vPrest.vTPrest || vPrest.vRec || 0),
        xml_status: 'XML_DISPONIVEL',
        pdf_status: 'PDF_INDISPONIVEL',
        situacao_fiscal: fiscalStatus,
        rawXml: xml,
      };
    }

    // Caso 2: Resumo de CT-e (resCTe)
    if (parsed.resCTe) {
      const res = parsed.resCTe;
      const access_key = sanitizeAccessKey(res.chCTe || '');
      if (access_key.length !== 44)
        throw new Error(`Chave de acesso de CT-e inválida no resumo do NSU ${nsu}.`);
      const keyInfo = parseAccessKey(access_key);

      const docNumber = keyInfo ? String(Number(keyInfo.numero)) : undefined;
      const series = keyInfo ? String(Number(keyInfo.serie)) : undefined;

      return {
        document_type: 'CTE',
        nsu: formatNSU(nsu),
        schema_type: schema || 'resCTe_v1.00.xsd',
        access_key,
        document_number: docNumber,
        series,
        issue_date: String(res.dhEmi || ''),
        issuer_cnpj: String(res.CNPJ || res.CPF || ''),
        issuer_name: String(res.xNome || ''),
        recipient_cnpj: undefined,
        recipient_name: undefined,
        total_value: Number(res.vNF || res.vTPrest || 0),
        xml_status: 'XML_DISPONIVEL',
        pdf_status: 'PDF_INDISPONIVEL',
        situacao_fiscal: Number(res.cSitCTe) === 2 ? 'CANCELADA' : 'AUTORIZADA',
        rawXml: xml,
      };
    }

    // Caso 3: Evento completo ou resumo de evento de CT-e (ex: cancelamento)
    if (parsed.procEventoCTe || parsed.eventoCTe || parsed.resEventoCTe || parsed.evento) {
      const evento =
        parsed.procEventoCTe?.eventoCTe ||
        parsed.procEventoCTe?.evento ||
        parsed.eventoCTe ||
        parsed.evento;
      const infEvento = evento?.infEvento || parsed.resEventoCTe;

      if (infEvento) {
        const tpEvento = String(infEvento.tpEvento || '');
        const chCTe = sanitizeAccessKey(infEvento.chCTe || '');
        if (chCTe && chCTe.length !== 44)
          throw new Error(`Chave de acesso de CT-e inválida no evento do NSU ${nsu}.`);
        const keyInfo = parseAccessKey(chCTe);

        if (chCTe) {
          const isCancelamento = tpEvento === '110111';
          const docNumber = keyInfo ? String(Number(keyInfo.numero)) : undefined;
          const series = keyInfo ? String(Number(keyInfo.serie)) : undefined;

          return {
            document_type: 'CTE',
            nsu: formatNSU(nsu),
            schema_type:
              schema ||
              (parsed.resEventoCTe ? 'resEventoCTe_v1.00.xsd' : 'procEventoCTe_v4.00.xsd'),
            access_key: chCTe,
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
