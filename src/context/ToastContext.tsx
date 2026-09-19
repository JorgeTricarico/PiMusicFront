import React, { createContext, useContext, useState, useCallback, useId } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, Loader2, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, description?: string, duration?: number) => string;
  dismissToast: (id: string) => void;
  toast: {
    success: (title: string, description?: string, duration?: number) => string;
    error: (title: string, description?: string, duration?: number) => string;
    info: (title: string, description?: string, duration?: number) => string;
    warning: (title: string, description?: string, duration?: number) => string;
    loading: (title: string, description?: string) => string;
    dismiss: (id: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idPrefix = useId();

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, description?: string, duration: number = 4000) => {
      const id = `${idPrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = { id, type, title, description, duration };

      setToasts((prev) => [...prev.slice(-3), newToast]); // Mantener máximo 4 visibles

      if (duration > 0 && type !== 'loading') {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast, idPrefix]
  );

  const toastMethods = {
    success: (title: string, description?: string, duration?: number) =>
      showToast('success', title, description, duration),
    error: (title: string, description?: string, duration?: number) =>
      showToast('error', title, description, duration ?? 5500),
    info: (title: string, description?: string, duration?: number) =>
      showToast('info', title, description, duration),
    warning: (title: string, description?: string, duration?: number) =>
      showToast('warning', title, description, duration),
    loading: (title: string, description?: string) =>
      showToast('loading', title, description, 0),
    dismiss: dismissToast,
  };

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, toast: toastMethods }}>
      {children}

      {/* Contenedor de Toasts Flotante (Esquina superior derecha/centro en móvil) */}
      <div
        className="fixed top-3 sm:top-5 right-3 sm:right-5 left-3 sm:left-auto z-50 flex flex-col gap-2.5 max-w-sm sm:w-96 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all animate-fadeIn ${
              t.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/40 text-slate-100 shadow-emerald-950/30'
                : t.type === 'error'
                ? 'bg-slate-900/95 border-rose-500/40 text-slate-100 shadow-rose-950/30'
                : t.type === 'warning'
                ? 'bg-slate-900/95 border-amber-500/40 text-slate-100 shadow-amber-950/30'
                : t.type === 'loading'
                ? 'bg-slate-900/95 border-rose-500/40 text-slate-100 shadow-rose-950/20'
                : 'bg-slate-900/95 border-sky-500/40 text-slate-100 shadow-sky-950/30'
            }`}
          >
            {/* Ícono según estado */}
            <div className="flex-shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {t.type === 'loading' && <Loader2 className="w-5 h-5 text-rose-400 animate-spin" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-sky-400" />}
            </div>

            {/* Contenido del Toast */}
            <div className="flex-1 min-w-0 pr-1">
              <h5 className="text-xs sm:text-sm font-semibold text-white leading-tight">
                {t.title}
              </h5>
              {t.description && (
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed">
                  {t.description}
                </p>
              )}
            </div>

            {/* Botón cerrar */}
            <button
              onClick={() => dismissToast(t.id)}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors flex-shrink-0"
              aria-label="Cerrar notificación"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast debe ser usado dentro de un ToastProvider');
  }
  return ctx;
}
