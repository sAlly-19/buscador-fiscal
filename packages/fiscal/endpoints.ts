import { SefazEnvironment } from '../domain/types';

export const SEFAZ_ENDPOINTS = {
  nfe: {
    production: {
      url: 'https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
      action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse',
    },
    homologation: {
      url: 'https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
      action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse',
    },
  },
  cte: {
    production: {
      url: 'https://www1.cte.fazenda.gov.br/CTeDistribuicaoDFe/CTeDistribuicaoDFe.asmx',
      action: 'http://www.portalfiscal.inf.br/cte/wsdl/CTeDistribuicaoDFe/cteDistDFeInteresse',
    },
    homologation: {
      url: 'https://hom1.cte.fazenda.gov.br/CTeDistribuicaoDFe/CTeDistribuicaoDFe.asmx',
      action: 'http://www.portalfiscal.inf.br/cte/wsdl/CTeDistribuicaoDFe/cteDistDFeInteresse',
    },
  },
};

export function getNFeEndpoint(env: SefazEnvironment) {
  return env === 'production' ? SEFAZ_ENDPOINTS.nfe.production : SEFAZ_ENDPOINTS.nfe.homologation;
}

export function getCTeEndpoint(env: SefazEnvironment) {
  return env === 'production' ? SEFAZ_ENDPOINTS.cte.production : SEFAZ_ENDPOINTS.cte.homologation;
}
