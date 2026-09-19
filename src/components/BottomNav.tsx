import React from 'react';
import { Sparkles, Link2, Search, Settings, FolderDown } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'foryou' | 'search' | 'link' | 'library';
  setActiveTab: (tab: 'foryou' | 'search' | 'link' | 'library') => void;
  onOpenSettings: () => void;
  isBackendConnected: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  isBackendConnected,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl">
      <div className="grid grid-cols-5 gap-0.5 max-w-md mx-auto items-center">
        {/* Tab Enlace */}
        <button
          onClick={() => setActiveTab('link')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all active:scale-95 min-h-[50px] ${
            activeTab === 'link'
              ? 'text-rose-400 font-semibold bg-rose-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Link2 className={`w-5 h-5 ${activeTab === 'link' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-1">Enlace</span>
        </button>

        {/* Tab Buscar */}
        <button
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all active:scale-95 min-h-[50px] ${
            activeTab === 'search'
              ? 'text-rose-400 font-semibold bg-rose-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className={`w-5 h-5 ${activeTab === 'search' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-1">Buscar</span>
        </button>

        {/* Tab Para ti */}
        <button
          onClick={() => setActiveTab('foryou')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all active:scale-95 min-h-[50px] ${
            activeTab === 'foryou'
              ? 'text-rose-400 font-semibold bg-rose-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className={`w-5 h-5 ${activeTab === 'foryou' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-1">Para ti</span>
        </button>

        {/* Tab Biblioteca */}
        <button
          onClick={() => setActiveTab('library')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all active:scale-95 min-h-[50px] ${
            activeTab === 'library'
              ? 'text-amber-400 font-semibold bg-amber-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderDown className={`w-5 h-5 ${activeTab === 'library' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-1">Biblioteca</span>
        </button>

        {/* Botón Ajustes */}
        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-400 hover:text-slate-200 transition-all active:scale-95 min-h-[50px] relative"
        >
          <div className="relative">
            <Settings className="w-5 h-5 stroke-2" />
            <span
              className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-slate-950 ${
                isBackendConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </div>
          <span className="text-[10px] mt-1">Ajustes</span>
        </button>
      </div>
    </nav>
  );
};
