import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export interface BannerAlertData {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface Props { bannerAlert: BannerAlertData | null; onDismiss: () => void }

export const AlertBanner: React.FC<Props> = ({ bannerAlert, onDismiss }) => {
  if (!bannerAlert) return null;
  const styles = bannerAlert.type === 'error'
    ? 'bg-rose-50 border-rose-200 text-rose-800'
    : bannerAlert.type === 'success'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
      : 'bg-sky-50 border-sky-200 text-sky-800';
  const Icon = bannerAlert.type === 'error' ? AlertCircle : bannerAlert.type === 'success' ? CheckCircle2 : Info;
  return (
    <div className={`mx-4 mt-3 rounded-md border px-4 py-3 flex items-start gap-2 text-sm ${styles}`} role="status">
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <span className="flex-1">{bannerAlert.message}</span>
      <button type="button" onClick={onDismiss} aria-label="Fechar aviso"><X className="w-4 h-4" /></button>
    </div>
  );
};
