import { useState, useEffect } from 'react';
import type { ToastMessage } from '@/types';
import { useToasts } from '@/lib/toast';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap: Record<ToastMessage['type'], string> = {
  success: 'border-emerald-500/40 text-emerald-400',
  error: 'border-red-500/40 text-red-400',
  info: 'border-accent-500/40 text-accent-400',
  warning: 'border-amber-500/40 text-amber-400',
};

export default function ToastContainer() {
  const [toasts, dismiss] = useToasts();

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-3 left-3 sm:left-auto sm:right-6 z-[100] flex flex-col gap-2.5 sm:max-w-sm sm:w-full pointer-events-none">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        return (
          <ToastItem
            key={toast.id}
            toast={toast}
            icon={Icon}
            colorClass={colorMap[toast.type]}
            onDismiss={() => dismiss(toast.id)}
          />
        );
      })}
    </div>
  );
}

function ToastItem({
  toast,
  icon: Icon,
  colorClass,
  onDismiss,
}: {
  toast: ToastMessage;
  icon: typeof CheckCircle2;
  colorClass: string;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className={`glass-strong border ${colorClass} rounded-xl px-4 py-3 flex items-start gap-3 pointer-events-auto transition-all duration-300 ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-surface-100 flex-1 leading-relaxed">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="text-surface-500 hover:text-surface-300 transition-colors flex-shrink-0"
        aria-label="Chiudi notifica"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
