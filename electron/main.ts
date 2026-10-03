import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { initializeServices, ApplicationContext } from './services';
import { 
  CreateCompanyDTO, 
  UpdateCompanyDTO, 
  DocumentSearchFilters, 
  AppSettings, 
  DownloadBatchOptions 
} from '../packages/domain/types';

let mainWindow: BrowserWindow | null = null;
let services: ApplicationContext;

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'Buscador NF-e / CT-e - Gestor Fiscal Desktop SEFAZ',
    webPreferences: {
      preload: path.join(__dirname, 'preload', 'index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Necessário no Windows para mTLS e preload robusto
    },
    autoHideMenuBar: true,
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpcHandlers() {
  // 1. EMPRESAS
  ipcMain.handle('companies:list', async () => {
    return services.companyService.list();
  });

  ipcMain.handle('companies:create', async (_event, dto: CreateCompanyDTO) => {
    return services.companyService.create(dto);
  });

  ipcMain.handle('companies:update', async (_event, dto: UpdateCompanyDTO) => {
    return services.companyService.update(dto);
  });

  ipcMain.handle('companies:delete', async (_event, id: number) => {
    return services.companyService.delete(id);
  });

  ipcMain.handle('companies:selectActive', async (_event, id: number) => {
    return services.companyService.selectActive(id);
  });

  ipcMain.handle('companies:getActive', async () => {
    return services.companyService.getActive();
  });

  // 2. CERTIFICADOS
  ipcMain.handle('certificates:listAvailable', async () => {
    return services.certProvider.listCertificates();
  });

  ipcMain.handle('certificates:getForCompany', async (_event, companyId: number) => {
    return services.certRepo.getByCompanyId(companyId);
  });

  ipcMain.handle('certificates:associateToCompany', async (_event, companyId: number, thumbprint: string) => {
    const cert = await services.certProvider.getCertificate(thumbprint);
    if (!cert) {
      throw new Error(`Certificado com Thumbprint '${thumbprint}' não foi localizado.`);
    }
    services.certRepo.associate(companyId, cert);
    return true;
  });

  // 3. DOCUMENTOS E BUSCA LOCAL
  ipcMain.handle('documents:search', async (_event, filters: DocumentSearchFilters) => {
    return services.docRepo.search(filters);
  });

  ipcMain.handle('documents:getById', async (_event, id: number) => {
    return services.docRepo.findById(id);
  });

  // Download individual de XML
  ipcMain.handle('documents:downloadXml', async (_event, id: number, customDestFolder?: string) => {
    const doc = services.docRepo.findById(id);
    if (!doc || !doc.xml_path || !fs.existsSync(doc.xml_path)) {
      return { success: false, error: 'Arquivo XML não está disponível localmente.' };
    }

    let targetFolder = customDestFolder;
    if (!targetFolder && mainWindow) {
      const res = await dialog.showOpenDialog(mainWindow, {
        title: 'Selecione a Pasta para Salvar o XML',
        properties: ['openDirectory', 'createDirectory'],
      });
      if (res.canceled || res.filePaths.length === 0) {
        return { success: false, error: 'Operação cancelada.' };
      }
      targetFolder = res.filePaths[0];
    }

    if (!targetFolder) return { success: false, error: 'Pasta de destino não informada.' };

    const targetFile = path.join(targetFolder, `${doc.access_key}.xml`);
    fs.copyFileSync(doc.xml_path, targetFile);

    return { success: true, filePath: targetFile };
  });

  // Download individual de PDF
  ipcMain.handle('documents:downloadPdf', async (_event, id: number, customDestFolder?: string) => {
    const doc = services.docRepo.findById(id);
    if (!doc || !doc.pdf_path || !fs.existsSync(doc.pdf_path)) {
      return { success: false, error: 'Documento auxiliar PDF não está disponível para esta nota.' };
    }

    let targetFolder = customDestFolder;
    if (!targetFolder && mainWindow) {
      const res = await dialog.showOpenDialog(mainWindow, {
        title: 'Selecione a Pasta para Salvar o PDF',
        properties: ['openDirectory', 'createDirectory'],
      });
      if (res.canceled || res.filePaths.length === 0) {
        return { success: false, error: 'Operação cancelada.' };
      }
      targetFolder = res.filePaths[0];
    }

    if (!targetFolder) return { success: false, error: 'Pasta de destino não informada.' };

    const targetFile = path.join(targetFolder, `${doc.access_key}.pdf`);
    fs.copyFileSync(doc.pdf_path, targetFile);

    return { success: true, filePath: targetFile };
  });

  // Download em Massa (ZIP)
  ipcMain.handle('documents:downloadBatch', async (_event, options: DownloadBatchOptions) => {
    const docs = [];
    for (const id of options.document_ids) {
      const doc = services.docRepo.findById(id);
      if (doc) docs.push(doc);
    }

    if (docs.length === 0) {
      return { success: false, error: 'Nenhum documento selecionado para download.', copied_files_count: 0 };
    }

    const company = services.companyService.getById(docs[0].company_id);
    const companyName = company ? company.name : 'Empresa';

    const zipFiles: any[] = [];
    for (const doc of docs) {
      if (options.include_xml && doc.xml_path && fs.existsSync(doc.xml_path)) {
        zipFiles.push({
          sourcePath: doc.xml_path,
          docType: doc.document_type,
          accessKey: doc.access_key,
          format: 'XML',
        });
      }
      if (options.include_pdf && doc.pdf_path && fs.existsSync(doc.pdf_path)) {
        zipFiles.push({
          sourcePath: doc.pdf_path,
          docType: doc.document_type,
          accessKey: doc.access_key,
          format: 'PDF',
        });
      }
    }

    const zipRes = await services.zipService.createBatchZip(companyName, options.destination_folder, zipFiles);
    return {
      success: zipRes.success,
      zip_path: zipRes.zipPath,
      copied_files_count: zipRes.filesCount,
      error: zipRes.error,
    };
  });

  ipcMain.handle('documents:openFileFolder', async (_event, filePath: string) => {
    if (!filePath || !fs.existsSync(filePath)) return false;
    shell.showItemInFolder(filePath);
    return true;
  });

  // 4. CONSULTA SEFAZ
  ipcMain.handle('sefaz:consultNFe', async (_event, companyId: number) => {
    return services.distributionEngine.syncCompany(companyId, 'NFE', (prog) => {
      mainWindow?.webContents.send('sefaz:progress', { companyId, ...prog });
    });
  });

  ipcMain.handle('sefaz:consultCTe', async (_event, companyId: number) => {
    return services.distributionEngine.syncCompany(companyId, 'CTE', (prog) => {
      mainWindow?.webContents.send('sefaz:progress', { companyId, ...prog });
    });
  });

  ipcMain.handle('sefaz:getStatus', async (_event, companyId: number) => {
    const nfe = services.distStateRepo.getOrCreate(companyId, 'NFE');
    const cte = services.distStateRepo.getOrCreate(companyId, 'CTE');
    return {
      nfeLastNSU: nfe.last_nsu,
      cteLastNSU: cte.last_nsu,
      isRunning: nfe.status === 'RUNNING' || cte.status === 'RUNNING',
    };
  });

  ipcMain.handle('sefaz:cancelQuery', async (_event, companyId: number) => {
    services.distributionEngine.cancel(companyId);
    return true;
  });

  // 5. CONFIGURAÇÕES
  ipcMain.handle('settings:get', async () => {
    return services.settingsRepo.getSettings();
  });

  ipcMain.handle('settings:update', async (_event, newSettings: Partial<AppSettings>) => {
    return services.settingsRepo.updateSettings(newSettings);
  });

  ipcMain.handle('settings:selectFolder', async (_event, title?: string) => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: title || 'Selecione a Pasta de Destino',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });
}

// Lifecycle
app.whenReady().then(() => {
  const dataDir = isDev 
    ? path.resolve(process.cwd(), 'data') 
    : path.join(app.getPath('userData'), 'data');

  services = initializeServices(dataDir);
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
