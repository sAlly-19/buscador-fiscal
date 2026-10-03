import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { ICertificateProvider, SoapExecutionOptions, SoapExecutionResult } from './ICertificateProvider';
import { CertificateInfo } from '../domain/types';

export class WindowsStoreCertificateProvider implements ICertificateProvider {
  private scriptPath: string;

  constructor(customScriptPath?: string) {
    if (customScriptPath && fs.existsSync(customScriptPath)) {
      this.scriptPath = customScriptPath;
    } else {
      const candidates = [
        path.resolve(__dirname, 'windows-bridge.ps1'),
        path.resolve(__dirname, '../packages/certificates/windows-bridge.ps1'),
        path.resolve(__dirname, '../../packages/certificates/windows-bridge.ps1'),
        path.resolve(process.cwd(), 'packages/certificates/windows-bridge.ps1'),
        path.join((process as any).resourcesPath || '', 'packages/certificates/windows-bridge.ps1'),
      ];
      const found = candidates.find(c => fs.existsSync(c));
      this.scriptPath = found || path.resolve(__dirname, 'windows-bridge.ps1');
    }
  }

  public async listCertificates(): Promise<CertificateInfo[]> {
    const rawOutput = await this.runPowerShell(['-Action', 'list']);
    if (!rawOutput || rawOutput.trim() === '') {
      return [];
    }

    try {
      const parsed = this.parseJsonOutput<any>(rawOutput);
      const array = Array.isArray(parsed) ? parsed : [parsed];

      return array.map((item: any) => ({
        subject: item.Subject,
        issuer: item.Issuer,
        serial_number: item.SerialNumber,
        thumbprint: item.Thumbprint,
        valid_from: item.ValidFrom,
        valid_to: item.ValidTo,
        provider: 'windows_store',
        has_private_key: Boolean(item.HasPrivateKey),
        is_expired: Boolean(item.IsExpired),
        extracted_cnpj: item.CNPJ || undefined,
        extracted_cpf: item.CPF || undefined,
      }));
    } catch (e: any) {
      throw new Error(`Falha ao converter lista de certificados do Windows: ${e.message}`);
    }
  }

  public async getCertificate(thumbprint: string): Promise<CertificateInfo | null> {
    const list = await this.listCertificates();
    const cleanThumb = thumbprint.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
    if (!/^[A-F0-9]{40,64}$/.test(cleanThumb)) return null;
    return list.find(c => c.thumbprint.toUpperCase() === cleanThumb) || null;
  }

  public async executeSoapRequest(options: SoapExecutionOptions): Promise<SoapExecutionResult> {
    const cleanThumbprint = options.thumbprint.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
    if (!/^[A-F0-9]{40,64}$/.test(cleanThumbprint)) throw new Error('Thumbprint de certificado inválido.');
    if (!/^https:\/\//i.test(options.url)) throw new Error('A URL do serviço SEFAZ deve usar HTTPS.');
    const tempFile = path.join(
      os.tmpdir(), 
      `sefaz_envelope_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.xml`
    );

    try {
      fs.writeFileSync(tempFile, options.soapEnvelope, 'utf-8');

      const args = [
        '-Action', 'request',
        '-Thumbprint', cleanThumbprint,
        '-Url', options.url,
        '-SoapAction', options.soapAction,
        '-EnvelopeFile', tempFile,
        '-TimeoutSec', String(options.timeoutSec || 30)
      ];

      const rawOutput = await this.runPowerShell(args, options.signal);
      const parsed = this.parseJsonOutput<any>(rawOutput);

      return {
        statusCode: parsed.StatusCode || 500,
        responseBody: parsed.ResponseBody || '',
        error: parsed.Error || undefined,
      };
    } finally {
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch {
          // Ignora falha de limpeza temporária
        }
      }
    }
  }

  private parseJsonOutput<T>(raw: string): T {
    const trimmed = raw.trim();
    try {
      return JSON.parse(trimmed);
    } catch (initialErr) {
      const firstBrace = trimmed.indexOf('{');
      const firstBracket = trimmed.indexOf('[');
      let start = -1;
      let end = -1;

      if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        start = firstBrace;
        end = trimmed.lastIndexOf('}');
      } else if (firstBracket !== -1) {
        start = firstBracket;
        end = trimmed.lastIndexOf(']');
      }

      if (start !== -1 && end !== -1 && end > start) {
        const candidate = trimmed.substring(start, end + 1);
        return JSON.parse(candidate);
      }

      throw initialErr;
    }
  }

  private runPowerShell(args: string[], signal?: AbortSignal): Promise<string> {
    return new Promise((resolve, reject) => {
      const fullArgs = [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', this.scriptPath,
        ...args
      ];

      const proc = spawn('powershell.exe', fullArgs, {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        signal,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.setEncoding('utf-8');
      proc.stdout.on('data', chunk => {
        stdout += chunk;
      });

      proc.stderr.setEncoding('utf-8');
      proc.stderr.on('data', chunk => {
        stderr += chunk;
      });

      proc.on('close', code => {
        if (code !== 0 && !stdout.trim()) {
          reject(new Error(`Erro no bridge do Windows PowerShell (code ${code}): ${stderr}`));
        } else {
          resolve(stdout);
        }
      });

      proc.on('error', err => {
        if (signal?.aborted) {
          reject(new Error('Consulta cancelada pelo usuário.'));
          return;
        }
        reject(new Error(`Falha ao iniciar processo do Windows PowerShell: ${err.message}`));
      });
    });
  }
}
