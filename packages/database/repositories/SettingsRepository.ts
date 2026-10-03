import { DatabaseManager } from '../connection';
import { AppSettings } from '../../domain/types';

export class SettingsRepository {
  constructor(private db: DatabaseManager) {}

  public getSettings(): AppSettings {
    const rows = this.db.queryAll<{ key: string; value: string }>('SELECT key, value FROM app_settings;');
    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.key, r.value);
    }

    return {
      default_storage_path: map.get('default_storage_path') || '',
      sefaz_environment: (map.get('sefaz_environment') as any) || 'homologation',
      items_per_page: Number(map.get('items_per_page') || 50),
      log_level: (map.get('log_level') as any) || 'info',
    };
  }

  public updateSettings(partial: Partial<AppSettings>): AppSettings {
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
