import { DatabaseManager } from '../connection';
import { AppSettings } from '../../domain/types';
import { isPageSize, normalizePageSize } from '../../domain/page-size';

export class SettingsRepository {
  constructor(private db: DatabaseManager) {}

  public getSettings(): AppSettings {
    const rows = this.db.queryAll<{ key: string; value: string }>('SELECT key, value FROM app_settings;');
    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.key, r.value);
    }

    const environment = map.get('sefaz_environment');
    const logLevel = map.get('log_level');
    const parsedPageSize = Number(map.get('items_per_page'));
    return {
      default_storage_path: map.get('default_storage_path') || '',
      sefaz_environment: environment === 'production' ? 'production' : 'homologation',
      items_per_page: normalizePageSize(parsedPageSize),
      log_level: logLevel === 'warn' || logLevel === 'error' || logLevel === 'debug' ? logLevel : 'info',
    };
  }

  public updateSettings(partial: Partial<AppSettings>): AppSettings {
    const allowedKeys = new Set<keyof AppSettings>([
      'default_storage_path', 'sefaz_environment', 'items_per_page', 'log_level'
    ]);
    for (const key of Object.keys(partial)) {
      if (!allowedKeys.has(key as keyof AppSettings)) throw new Error(`Configuração não permitida: ${key}`);
    }
    if (partial.sefaz_environment && !['homologation', 'production'].includes(partial.sefaz_environment)) {
      throw new Error('Ambiente SEFAZ inválido.');
    }
    if (partial.log_level && !['info', 'warn', 'error', 'debug'].includes(partial.log_level)) {
      throw new Error('Nível de log inválido.');
    }
    if (partial.items_per_page !== undefined && !isPageSize(partial.items_per_page)) {
      throw new Error('Itens por página deve ser 50, 100, 200, 500 ou 1000.');
    }
    if (partial.default_storage_path !== undefined && typeof partial.default_storage_path !== 'string') {
      throw new Error('Caminho de armazenamento inválido.');
    }
    this.db.transaction(() => {
      for (const [key, val] of Object.entries(partial)) {
        if (val !== undefined) {
          this.db.execute(
            `INSERT INTO app_settings (key, value, updated_at)
             VALUES (?, ?, datetime('now', 'localtime'))
             ON CONFLICT(key) DO UPDATE SET
               value = excluded.value,
               updated_at = datetime('now', 'localtime');`,
            [key, String(val)]
          );
        }
      }
    });

    return this.getSettings();
  }
}
