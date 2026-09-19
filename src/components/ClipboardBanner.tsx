import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';

export const YOUTUBE_URL_REGEX = /^(https?:\/\/)?((www|m|music)\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/|embed\/)|youtu\.be\/)[\w-]+/i;

export function isValidYouTubeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return YOUTUBE_URL_REGEX.test(url.trim());
}

interface ClipboardBannerProps {
  onAnalyze: (url: string) => void;
}

export const ClipboardBanner: React.FC<ClipboardBannerProps> = ({ onAnalyze }) => {
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const ignoredUrlRef = useRef<string | null>(null);

  const checkClipboard = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const trimmed = text.trim();
        if (isValidYouTubeUrl(trimmed) && trimmed !== ignoredUrlRef.current) {
          setDetectedUrl(trimmed);
          setIsVisible(true);
        }
      }
    } catch {
      // Ignorar errores por falta de permisos o ventana sin foco
    }
  }, []);

  useEffect(() => {
    // Verificación inicial
    checkClipboard();

    const handleFocus = () => {
      checkClipboard();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkClipboard();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkClipboard]);

  const handleActionClick = () => {
    if (!detectedUrl) return;
    ignoredUrlRef.current = detectedUrl;
    setIsVisible(false);
    onAnalyze(detectedUrl);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (detectedUrl) {
      ignoredUrlRef.current = detectedUrl;
    }
    setIsVisible(false);
  };

  if (!isVisible || !detectedUrl) return null;

  return (
    <div
      role="alert"
      className="fixed top-14 sm:top-16 inset-x-3 sm:inset-x-auto sm:right-6 max-w-lg z-50 animate-slideDown"
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-rose-500/40 shadow-2xl shadow-rose-950/40 text-white">
        <div className="flex items-center gap-2.5 min-w-0 pr-1">
          <span className="text-base select-none flex-shrink-0" role="img" aria-label="portapapeles">
            📋
          </span>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-200">
              Enlace de YouTube detectado:
            </span>
            <p className="text-[11px] text-rose-300 font-mono truncate max-w-xs sm:max-w-sm">
              {detectedUrl}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 justify-end">
          <button
            onClick={handleActionClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Analizar y Descargar con 1 Toque</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Ignorar"
            aria-label="Cerrar notificación de enlace"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
