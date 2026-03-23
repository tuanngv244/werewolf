'use client';

import { useEffect, useState } from 'react';
import { useToastStore, type GameToastItem } from '@/stores/toast-store';

const VARIANT_STYLES: Record<GameToastItem['variant'], string> = {
  info: 'bg-blue-900/80 border-blue-400/40 text-blue-100',
  danger: 'bg-red-900/80 border-red-400/40 text-red-100',
  success: 'bg-emerald-900/80 border-emerald-400/40 text-emerald-100',
  warning: 'bg-amber-900/80 border-amber-400/40 text-amber-100',
  witch: 'bg-purple-900/80 border-purple-400/50 text-purple-100',
};

const VARIANT_TITLE_COLORS: Record<GameToastItem['variant'], string> = {
  info: 'text-blue-200',
  danger: 'text-red-200',
  success: 'text-emerald-200',
  warning: 'text-amber-200',
  witch: 'text-purple-200',
};

function ToastItem({ toast, onDismiss }: { toast: GameToastItem; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 200);
  };

  return (
    <div
      className={`
        transition-all duration-200 ease-out
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}
      `}
    >
      <div
        className={`
          relative flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-lg shadow-2xl
          min-w-[280px] max-w-[360px]
          ${VARIANT_STYLES[toast.variant]}
        `}
      >
        <span className="text-2xl flex-shrink-0 mt-0.5">{toast.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${VARIANT_TITLE_COLORS[toast.variant]}`}>
            {toast.title}
          </p>
          <p className="text-sm mt-0.5 opacity-90">{toast.message}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity text-lg leading-none mt-0.5"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function GameToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-3 md:top-20 md:right-4 z-50 flex flex-col gap-2 pointer-events-auto">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
