import path from 'path';
import fs from 'fs';
import { getDatabase } from '../packages/database/connection';
import { CompanyRepository } from '../packages/database/repositories/CompanyRepository';
import { CertificateRepository } from '../packages/database/repositories/CertificateRepository';
import { DistributionStateRepository } from '../packages/database/repositories/DistributionStateRepository';
import { DocumentRepository } from '../packages/database/repositories/DocumentRepository';
import { SettingsRepository } from '../packages/database/repositories/SettingsRepository';
import { CompanyService } from '../packages/domain/services/CompanyService';
import { StorageService } from '../packages/storage/StorageService';
import { ReconciliationService } from '../packages/storage/ReconciliationService';
import { WindowsStoreCertificateProvider } from '../packages/certificates/WindowsStoreCertificateProvider';
import { MockCertificateProvider } from '../packages/certificates/MockCertificateProvider';
import { ICertificateProvider } from '../packages/certificates/ICertificateProvider';
import { SefazDistributionProvider } from '../packages/fiscal/providers/SefazDistributionProvider';
import { MockFiscalDistributionProvider } from '../packages/fiscal/providers/MockFiscalDistributionProvider';
import { IFiscalDistributionProvider } from '../packages/fiscal/providers/IFiscalDistributionProvider';
import { DistributionEngine } from '../packages/fiscal/services/DistributionEngine';
import { ZipService } from '../packages/downloads/ZipService';

export interface ApplicationContext {
  companyService: CompanyService;
  certRepo: CertificateRepository;
  distStateRepo: DistributionStateRepository;
  docRepo: DocumentRepository;
  settingsRepo: SettingsRepository;
  storageService: StorageService;
  reconciliationService: ReconciliationService;
  certProvider: ICertificateProvider;
  fiscalProvider: IFiscalDistributionProvider;
  distributionEngine: DistributionEngine;
  zipService: ZipService;
}

export function initializeServices(userDataPath: string): ApplicationContext {
  const dbPath = path.join(userDataPath, 'fiscal_storage.db');
  const storageDir = path.join(userDataPath, 'documents');

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  const db = getDatabase(dbPath);
  const companyRepo = new CompanyRepository(db);
  const certRepo = new CertificateRepository(db);
  const distStateRepo = new DistributionStateRepository(db);
  const docRepo = new DocumentRepository(db);
  const settingsRepo = new SettingsRepository(db);
  const storageService = new StorageService(storageDir);
  const reconciliationService = new ReconciliationService(db);
  const zipService = new ZipService();
  const companyService = new CompanyService(companyRepo);

  // Seleciona provedor de certificados (Windows Store padrão, com fallback para Mock se não for Windows)
  const scriptPath = path.resolve(__dirname, '../packages/certificates/windows-bridge.ps1');
  const certProvider: ICertificateProvider = process.platform === 'win32'
    ? new WindowsStoreCertificateProvider(scriptPath)
    : new MockCertificateProvider();

  // Provedor fiscal SEFAZ oficial
  const fiscalProvider: IFiscalDistributionProvider = new SefazDistributionProvider(certProvider);

  const distributionEngine = new DistributionEngine(
    db,
    companyRepo,
    certRepo,
    distStateRepo,
    docRepo,
    settingsRepo,
    storageService,
    fiscalProvider
  );

  return {
    companyService,
    certRepo,
    distStateRepo,
    docRepo,
    settingsRepo,
    storageService,
    reconciliationService,
    certProvider,
    fiscalProvider,
    distributionEngine,
    zipService,
  };
}
