import { SefazEnvironment } from '../../domain/types';
import { SefazRawResponse } from '../types';

export interface DistributeOptions {
  cnpj: string;
  ultNSU: string;
  environment: SefazEnvironment;
  thumbprint: string;
  cUFAutor?: string;
}

export interface IFiscalDistributionProvider {
  distributeNFe(options: DistributeOptions): Promise<SefazRawResponse>;
  distributeCTe(options: DistributeOptions): Promise<SefazRawResponse>;
}
