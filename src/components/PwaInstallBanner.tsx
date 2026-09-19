import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Si ya está ejecutándose como PWA standalone, no mostrar banner
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevenir el banner predeterminado del navegador
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!isDismissed) {
        setIsVisible(true);
      }
    };

    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isDismissed]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsVisible(false);
      }
    } catch {
      // Manejar cualquier error inesperado al invocar prompt
    } finally {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
  };

  if (!isVisible || !deferredPrompt) {
    return null;
  }

  return (
    <aside
      role="region"
      aria-label="Instalación de aplicación"
      className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-slate-900/95 backdrop-blur-md border border-slate-800/90 rounded-2xl p-3.5 sm:p-4 shadow-2xl shadow-black/60 flex items-center justify-between gap-3 animate-fadeIn"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-rose-600/20">
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
            Instalar PiMusic
          </span>
          <span className="text-[11px] text-slate-400 truncate">
            App nativa, acceso rápido y sin barras
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-95 text-white font-semibold text-xs shadow-md shadow-rose-600/30 transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar</span>
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Cerrar banner de instalación"
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
