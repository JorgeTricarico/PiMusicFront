import React from 'react';
import { Download, Search, Link2, Settings, FolderDown, Sparkles, User, Keyboard } from 'lucide-react';

interface HeaderProps {
  activeTab: 'foryou' | 'search' | 'link' | 'library';
  setActiveTab: (tab: 'foryou' | 'search' | 'link' | 'library') => void;
  onOpenSettings: () => void;
  onOpenAccountModal?: () => void;
  onOpenShortcuts?: () => void;
  isBackendConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  onOpenAccountModal,
  onOpenShortcuts,
  isBackendConnected,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 transition-all">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Logo */}
        <div
          onClick={() => setActiveTab('link')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform">
            <Download className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">PiMusic</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-semibold border border-rose-500/20">
                App
              </span>
            </div>
            <p className="text-xs text-slate-400">Descarga y Streaming en Red Local</p>
          </div>
        </div>

        {/* Navigation Tabs (Visibles en Desktop / Tablet) */}
        <div className="hidden md:flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'link'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Pegar Enlace</span>
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'search'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Buscador</span>
          </button>
          <button
            onClick={() => setActiveTab('foryou')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'foryou'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Para ti</span>
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'library'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderDown className="w-4 h-4" />
            <span>Biblioteca</span>
          </button>
        </div>

        {/* Status, Account & Settings */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-slate-300">
              {isBackendConnected ? 'Servidor Conectado' : 'Conectando...'}
            </span>
          </div>

          {onOpenAccountModal && (
            <button
              onClick={onOpenAccountModal}
              title="Cuenta y Recomendaciones"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-rose-400 border border-slate-800 transition-all active:scale-95 flex items-center gap-1.5 text-xs font-semibold"
            >
              <User className="w-4 h-4" />
              <span className="hidden lg:inline">Cuenta</span>
            </button>
          )}

          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              data-testid="header-shortcuts-btn"
              title="Atajos de teclado (?)"
              aria-label="Atajos de teclado"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all active:scale-95 flex items-center gap-1.5 text-xs font-semibold"
            >
              <Keyboard className="w-4 h-4 text-slate-400" />
              <span className="hidden xl:inline">Atajos</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            title="Configuración de Red y Telemetría"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors active:scale-95"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
